import math

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.core.security import HASH_FALSO, create_access_token, hash_password, verify_password
from app.models import Usuario
from app.schemas.auth import LoginIn, TokenOut, UsuarioOut
from app.schemas.usuario import CambioContrasena
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
    correo = datos.correo.strip().lower()
    # El límite se aplica al correo escrito, exista o no, para no revelar qué cuentas existen
    espera = limitador_login.segundos_bloqueado(correo)
    if espera > 0:
        raise _bloqueado(espera)
    usuario = db.scalar(select(Usuario).where(func.lower(Usuario.correo) == correo))
    # Siempre se verifica un hash, exista o no el usuario, para no revelar qué correos existen
    clave_ok = verify_password(datos.contrasena, usuario.contrasena_hash if usuario else HASH_FALSO)
    if usuario is None or not clave_ok or not usuario.activo:
        limitador_login.registrar_fallo(correo)
        # Mismo mensaje en todos los casos
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Correo o contraseña incorrectos.")
    limitador_login.reiniciar(correo)
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


# TODO(backend): el cierre de sesión es del lado del cliente (borrar el token); si se necesita revocar, agregar lista de tokens.
# TODO(backend): el límite de intentos vive en la memoria del servidor; con varias instancias hay que guardarlo en la base de datos.
