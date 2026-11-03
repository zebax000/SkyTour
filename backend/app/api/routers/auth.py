from collections.abc import Callable
from datetime import UTC, datetime
import math

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
from app.models import RestablecimientoContrasena, Usuario
from app.schemas.auth import LoginIn, TokenOut, UsuarioOut
from app.schemas.usuario import (
    CambioContrasena,
    RestablecimientoIn,
    SolicitudRestablecimiento,
)
from app.services.correo import enviar_correo_restablecimiento
from app.services.limitador import limitador_login
from app.services.restablecimiento import (
    calcular_vencimiento,
    construir_enlace_restablecimiento,
    generar_token,
    hash_token,
    puede_usarse,
)

router = APIRouter(prefix="/auth", tags=["auth"])

MENSAJE_SOLICITUD_RESTABLECIMIENTO = (
    "Si el correo está registrado, te enviamos un enlace para restablecer la contraseña."
)
MENSAJE_TOKEN_INVALIDO = (
    "El enlace de restablecimiento no es válido, ya fue utilizado o venció. Solicita uno nuevo."
)


def get_enviador_correo() -> Callable[[str, str, str, int], bool]:
    """Dependencia inyectable para sustituir el servicio de correo en las pruebas."""
    return enviar_correo_restablecimiento


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


@router.post("/olvide-contrasena")
def olvide_contrasena(
    datos: SolicitudRestablecimiento,
    tareas: BackgroundTasks,
    db: Session = Depends(get_db),
    enviar_correo_fn: Callable[[str, str, str, int], bool] = Depends(get_enviador_correo),
) -> dict[str, str]:
    """Responde siempre con el mismo mensaje para no revelar si el correo existe o si fue limitado."""
    correo = datos.correo
    clave_limite = f"olvide:{correo}"
    if limitador_login.segundos_bloqueado(clave_limite) > 0:
        return {"mensaje": MENSAJE_SOLICITUD_RESTABLECIMIENTO}
    limitador_login.registrar_fallo(clave_limite)

    token = generar_token()
    resumen_hash = hash_token(token)
    ahora = datetime.now(UTC)
    minutos = settings.reset_token_expire_minutes
    vence = calcular_vencimiento(ahora=ahora, minutos=minutos)

    usuario = db.scalar(select(Usuario).where(func.lower(Usuario.correo) == correo))
    if usuario is not None and usuario.activo:
        anteriores = list(
            db.scalars(
                select(RestablecimientoContrasena).where(
                    RestablecimientoContrasena.usuario_id == usuario.id,
                    RestablecimientoContrasena.usado_en.is_(None),
                )
            )
        )
        for previo in anteriores:
            previo.usado_en = ahora
        db.add(
            RestablecimientoContrasena(
                usuario_id=usuario.id,
                token_hash=resumen_hash,
                creado_en=ahora,
                vence_en=vence,
            )
        )
        db.commit()
        enlace = construir_enlace_restablecimiento(settings.frontend_url, token)
        tareas.add_task(enviar_correo_fn, usuario.correo, usuario.nombre, enlace, minutos)

    return {"mensaje": MENSAJE_SOLICITUD_RESTABLECIMIENTO}


@router.post("/restablecer-contrasena", status_code=status.HTTP_204_NO_CONTENT)
def restablecer_contrasena_con_token(
    datos: RestablecimientoIn,
    db: Session = Depends(get_db),
) -> Response:
    clave_limite = "restablecer:intentos"
    espera = limitador_login.segundos_bloqueado(clave_limite)
    if espera > 0:
        raise _bloqueado(espera)

    resumen_hash = hash_token(datos.token)
    ahora = datetime.now(UTC)
    registro = db.scalar(
        select(RestablecimientoContrasena).where(RestablecimientoContrasena.token_hash == resumen_hash)
    )
    if not puede_usarse(registro, ahora=ahora):
        limitador_login.registrar_fallo(clave_limite)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=MENSAJE_TOKEN_INVALIDO)

    usuario = db.get(Usuario, registro.usuario_id)
    if usuario is None or not usuario.activo:
        limitador_login.registrar_fallo(clave_limite)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=MENSAJE_TOKEN_INVALIDO)

    usuario.contrasena_hash = hash_password(datos.contrasena_nueva)
    registro.usado_en = ahora
    db.commit()
    limitador_login.reiniciar(usuario.correo)
    limitador_login.reiniciar(f"olvide:{usuario.correo}")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
