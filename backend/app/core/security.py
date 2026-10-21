from datetime import UTC, datetime, timedelta
from typing import Any

import jwt
from pwdlib import PasswordHash

from app.core.config import settings

ALGORITMO = "HS256"  # único algoritmo aceptado: nunca se lee del token
SECRET_POR_DEFECTO = "cambia-esta-clave"

_hasher = PasswordHash.recommended()  # Argon2


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return _hasher.verify(password, password_hash)


# Hash falso para gastar el mismo tiempo cuando el correo no existe (evita adivinar cuentas por el tiempo)
HASH_FALSO = hash_password("contrasena-falsa-solo-para-igualar-tiempos")


def _clave() -> str:
    if settings.secret_key == SECRET_POR_DEFECTO:
        raise RuntimeError("SECRET_KEY sigue con el valor por defecto: genera una clave aleatoria en el .env.")
    return settings.secret_key


def create_access_token(user_id: int, rol: str, expires_minutes: int | None = None) -> str:
    """Crea un JWT firmado. Solo lleva datos no sensibles: id, rol (para la interfaz), emisión y vencimiento."""
    minutos = settings.access_token_expire_minutes if expires_minutes is None else expires_minutes
    ahora = datetime.now(UTC)
    payload: dict[str, Any] = {
        "sub": str(user_id),
        "rol": rol,
        "iat": ahora,
        "exp": ahora + timedelta(minutes=minutos),
    }
    return jwt.encode(payload, _clave(), algorithm=ALGORITMO)


def decode_access_token(token: str) -> dict[str, Any]:
    """Verifica firma y vencimiento. Lanza jwt.InvalidTokenError si algo no cuadra."""
    return jwt.decode(token, _clave(), algorithms=[ALGORITMO], options={"require": ["exp", "sub"]})
