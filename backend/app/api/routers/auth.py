import hashlib
import math
import secrets

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Response, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.core.security import (
    HASH_FALSO,
    create_access_token,
    hash_password,
    verify_password,
)
from app.models import Usuario
# Asegúrate de haber creado SolicitudRestablecimiento y RestablecimientoIn en app.schemas.auth
from app.schemas.auth import LoginIn, RestablecimientoIn, SolicitudRestablecimiento, TokenOut, UsuarioOut
from app.schemas.usuario import CambioContrasena
from app.services import correo, restablecimiento
from app.services.limitador import limitador_login

router = APIRouter(prefix="/auth", tags=["auth"])


def _bloqueado(segundos: int) -> HTTPException:
    minutos = max(1, math.ceil(segundos / 60))
    unidad = "minuto" if minutos == 1 else "minutos"
    return HTTPException(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        detail=f"Demasiados intentos fallidos. Intenta de nuevo en {minutos} {unidad}.",
        headers={"Retry-After": str(segundos)},
    )


@router.post("/login", response_model=TokenOut)
def login(datos: LoginIn, db: Session = Depends(get_db)) -> TokenOut:
    correo_str = datos.correo.strip().lower()
    # El límite se aplica al correo escrito, exista o no, para no revelar qué cuentas existen
    espera = limitador_login.segundos_bloqueado(correo_str)
    if espera > 0:
        raise _bloqueado(espera)
    usuario = db.scalar(select(Usuario).where(func.lower(Usuario.correo) == correo_str))
    # Siempre se verifica un hash, exista o no el usuario, para no revelar qué correos existen
    clave_ok = verify_password(datos.contrasena, usuario.contrasena_hash if usuario else HASH_FALSO)
    if usuario is None or not clave_ok or not usuario.activo:
        limitador_login.registrar_fallo(correo_str)
        # Mismo mensaje en todos los casos
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Correo o contraseña incorrectos.")
    limitador_login.reiniciar(correo_str)
    token = create_access_token(usuario.id, usuario.rol.value)
    return TokenOut(access_token=token, expires_in=settings.access_token_expire_minutes * 60)


@router.get("/me", response_model=UsuarioOut)
def me(usuario: Usuario = Depends(get_current_user)) -> Usuario:
    """El frontend lo usa para saber quién es el usuario y qué rol tiene."""
    return usuario


@router.post("/contrasena", status_code=status.HTTP_204_NO_CONTENT)
def cambiar_mi_contrasena(
    datos: CambioContrasena,
    usuario: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    """Cada usuario cambia su propia contraseña. Responde 400 (no 401) para no cerrar la sesión en el frontend."""
    clave_limite = f"contrasena:{usuario.id}"
    espera = limitador_login.segundos_bloqueado(clave_limite)
    if espera > 0:
        raise _bloqueado(espera)
    if not verify_password(datos.contrasena_actual, usuario.contrasena_hash):
        limitador_login.registrar_fallo(clave_limite)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="La contraseña actual no es correcta.")
    if datos.contrasena_actual == datos.contrasena_nueva:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="La contraseña nueva debe ser distinta de la actual."
        )
    usuario.contrasena_hash = hash_password(datos.contrasena_nueva)
    db.commit()
    limitador_login.reiniciar(clave_limite)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/olvide-contrasena")
def solicitar_recuperacion(
    datos: SolicitudRestablecimiento, 
    background_tasks: BackgroundTasks, 
    db: Session = Depends(get_db)
):
    """Envía el enlace de recuperación si el correo existe, respondiendo siempre lo mismo."""
    correo_str = datos.correo.strip().lower()
    
    # Aplicar límite para evitar enumeración y spam
    clave_limite = f"recuperacion:{correo_str}"
    espera = limitador_login.segundos_bloqueado(clave_limite)
    if espera > 0:
        raise _bloqueado(espera)

    usuario = db.scalar(select(Usuario).where(func.lower(Usuario.correo) == correo_str))
    
    if usuario and usuario.activo:
        token_plano = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(token_plano.encode()).hexdigest()
        
        # Guardar en la base de datos usando el servicio nuevo
        restablecimiento.crear_registro(db, usuario.id, token_hash)
        
        # Enviar correo en segundo plano
        background_tasks.add_task(correo.enviar_correo_recuperacion, usuario.correo, token_plano)
    else:
        # Registrar fallo en el limitador solo si la cuenta no existe/inactiva para frenar fuerza bruta
        limitador_login.registrar_fallo(clave_limite)
        
    # Siempre se devuelve el mismo mensaje, exista o no
    return {"mensaje": "Si el correo está registrado, te enviamos un enlace para restablecer la contraseña."}


@router.post("/restablecer-contrasena")
def restablecer_contrasena(datos: RestablecimientoIn, db: Session = Depends(get_db)):
    """Valida el token y establece la nueva contraseña."""
    token_hash = hashlib.sha256(datos.token.encode()).hexdigest()
    
    # Verificar la validez del token en la base de datos
    registro = restablecimiento.verificar_token(db, token_hash)
    
    if not registro:
        # Mensaje genérico sin importar por qué falló (inexistente, usado o vencido)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="El enlace es inválido o ha caducado."
        )
        
    usuario = db.get(Usuario, registro.usuario_id)
    if not usuario or not usuario.activo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="El enlace es inválido o ha caducado."
        )
        
    # Cambiar la contraseña
    usuario.contrasena_hash = hash_password(datos.contrasena_nueva)
    
    # Inutilizar el token
    restablecimiento.marcar_como_usado(db, registro)
    db.commit()
    
    # Limpiar el límite de intentos de login al recuperar con éxito
    limitador_login.reiniciar(usuario.correo)
    
    return {"mensaje": "Contraseña actualizada exitosamente."}


# TODO(backend): el cierre de sesión es del lado del cliente (borrar el token); si se necesita revocar, agregar lista de tokens.
# TODO(backend): el límite de intentos vive en la memoria del servidor; con varias instancias hay que guardarlo en la base de datos.