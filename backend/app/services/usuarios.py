"""Reglas de los usuarios que no dependen de la base de datos (por eso se prueban sin conectarse)."""
import re

ADMINISTRADOR = "administrador"  # Rol.administrador es un str: se compara por valor
MINIMO_CONTRASENA = 8
_PATRON_CORREO = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]{2,}$")


class ReglaUsuario(Exception):
    """Un cambio que las reglas del negocio no permiten. El mensaje se muestra tal cual al administrador."""


def validar_correo(texto: str) -> str:
    """Devuelve el correo limpio y en minúsculas, o lanza ValueError."""
    correo = texto.strip().lower()
    if not _PATRON_CORREO.match(correo):
        raise ValueError("El correo no es válido.")
    return correo


def validar_contrasena(texto: str) -> str | None:
    """Devuelve el motivo si la contraseña no sirve, o None si está bien."""
    if len(texto) < MINIMO_CONTRASENA:
        return f"La contraseña debe tener al menos {MINIMO_CONTRASENA} caracteres."
    if not any(c.isalpha() for c in texto):
        return "La contraseña debe incluir al menos una letra."
    if not any(c.isdigit() for c in texto):
        return "La contraseña debe incluir al menos un número."
    return None


def validar_cambio(
    *,
    actor_id: int,
    objetivo_id: int,
    objetivo_rol: str,
    objetivo_activo: bool,
    nuevo_rol: str | None,
    nuevo_activo: bool | None,
    admins_activos: int,
) -> None:
    """Lanza ReglaUsuario si el cambio dejaría la aplicación sin forma de administrarse."""
    es_uno_mismo = actor_id == objetivo_id
    cambia_rol = nuevo_rol is not None and nuevo_rol != objetivo_rol
    desactiva = nuevo_activo is False and objetivo_activo

    if es_uno_mismo and desactiva:
        raise ReglaUsuario("No puedes desactivar tu propia cuenta.")
    if es_uno_mismo and cambia_rol:
        raise ReglaUsuario("No puedes cambiar tu propio rol.")

    es_admin_activo = objetivo_rol == ADMINISTRADOR and objetivo_activo
    if es_admin_activo and (cambia_rol or desactiva) and admins_activos <= 1:
        raise ReglaUsuario("Debe quedar al menos un administrador activo.")
