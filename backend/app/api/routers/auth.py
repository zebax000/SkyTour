from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.core.security import HASH_FALSO, create_access_token, verify_password
from app.models import Usuario
from app.schemas.auth import LoginIn, TokenOut, UsuarioOut

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenOut)
def login(datos: LoginIn, db: Session = Depends(get_db)) -> TokenOut:
    correo = datos.correo.strip().lower()
    usuario = db.scalar(select(Usuario).where(func.lower(Usuario.correo) == correo))
    # Siempre se verifica un hash, exista o no el usuario, para no revelar qué correos existen
    clave_ok = verify_password(datos.contrasena, usuario.contrasena_hash if usuario else HASH_FALSO)
    if usuario is None or not clave_ok or not usuario.activo:
        # Mismo mensaje en todos los casos
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Correo o contraseña incorrectos.")
    token = create_access_token(usuario.id, usuario.rol.value)
    return TokenOut(access_token=token, expires_in=settings.access_token_expire_minutes * 60)


@router.get("/me", response_model=UsuarioOut)
def me(usuario: Usuario = Depends(get_current_user)) -> Usuario:
    """El frontend lo usa para saber quién es el usuario y qué rol tiene."""
    return usuario


# TODO(backend): limitar intentos de login por IP o por correo (por ejemplo con slowapi).
# TODO(backend): el cierre de sesión es del lado del cliente (borrar el token); si se necesita revocar, agregar lista de tokens.
