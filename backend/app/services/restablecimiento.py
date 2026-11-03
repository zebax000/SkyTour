"""Funciones puras para los tokens de restablecimiento de contraseña (sin acceso a la base de datos)."""
import hashlib
import secrets
from datetime import UTC, datetime, timedelta

VIGENCIA_MINUTOS_POR_DEFECTO = 30


def generar_token() -> str:
    """Genera un token aleatorio URL-safe de 32 bytes."""
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    """Devuelve el hash SHA-256 en hexadecimal del token. Nunca se guarda el token en claro."""
    return hashlib.sha256((token or "").strip().encode("utf-8")).hexdigest()


def calcular_vencimiento(
    ahora: datetime | None = None,
    minutos: int = VIGENCIA_MINUTOS_POR_DEFECTO,
) -> datetime:
    base = ahora if ahora is not None else datetime.now(UTC)
    return base + timedelta(minutes=minutos)


def esta_vigente(vence_en: datetime, ahora: datetime | None = None) -> bool:
    referencia = ahora if ahora is not None else datetime.now(UTC)
    if vence_en.tzinfo is None:
        vence_en = vence_en.replace(tzinfo=UTC)
    if referencia.tzinfo is None:
        referencia = referencia.replace(tzinfo=UTC)
    return referencia < vence_en


def puede_usarse(registro, ahora: datetime | None = None) -> bool:
    """Un enlace solo sirve si existe, no ha sido usado y no ha vencido."""
    if registro is None:
        return False
    if getattr(registro, "usado_en", None) is not None:
        return False
    vence_en = getattr(registro, "vence_en", None)
    if vence_en is None:
        return False
    return esta_vigente(vence_en, ahora=ahora)


def construir_enlace_restablecimiento(frontend_url: str, token: str) -> str:
    base = frontend_url.rstrip("/")
    return f"{base}/restablecer-contrasena?token={token}"
