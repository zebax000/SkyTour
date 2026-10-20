import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models import Rol, Usuario

_bearer = HTTPBearer(auto_error=False)


def _no_autenticado() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Sesión no válida o vencida. Inicia sesión de nuevo.",
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_current_user(
    credenciales: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
) -> Usuario:
    """Usuario de la petición. El rol se lee de la base, no del token: un cambio de rol aplica de inmediato."""
    if credenciales is None:
        raise _no_autenticado()
    try:
        payload = decode_access_token(credenciales.credentials)
        user_id = int(payload["sub"])
    except (jwt.InvalidTokenError, ValueError):
        raise _no_autenticado()
    usuario = db.get(Usuario, user_id)
    if usuario is None or not usuario.activo:
        raise _no_autenticado()
    return usuario


def require_roles(*roles: Rol):
    """Uso: Depends(require_roles(Rol.administrador, Rol.evaluador)). Responde 403 si el rol no está permitido."""

    def verificar(usuario: Usuario = Depends(get_current_user)) -> Usuario:
        if usuario.rol not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes permiso para esta acción.")
        return usuario

    return verificar
