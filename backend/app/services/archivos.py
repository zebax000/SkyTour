import base64
import binascii
from dataclasses import dataclass
from typing import Optional

from app.core.constantes import ARCHIVO_MAX_MB

MAX_BYTES = ARCHIVO_MAX_MB * 1024 * 1024

# El tipo se decide por el contenido real del archivo, no por lo que diga el nombre o el navegador
_FIRMAS = (
    (b"%PDF-", "application/pdf"),
    (b"\x89PNG\r\n\x1a\n", "image/png"),
    (b"\xff\xd8\xff", "image/jpeg"),
)
_EXTENSION = {"application/pdf": ".pdf", "image/png": ".png", "image/jpeg": ".jpg"}


class ArchivoInvalido(ValueError):
    """El archivo no cumple las reglas (tipo, tamaño o formato). El mensaje se muestra al usuario."""


@dataclass(frozen=True)
class ArchivoLeido:
    nombre: str
    tipo_mime: str
    datos: bytes


def detectar_tipo(datos: bytes) -> Optional[str]:
    for firma, tipo in _FIRMAS:
        if datos.startswith(firma):
            return tipo
    return None


def limpiar_nombre(nombre: str, tipo_mime: str) -> str:
    """Quita rutas y caracteres peligrosos, y fuerza la extensión que corresponde al contenido."""
    base = nombre.replace("\\", "/").split("/")[-1].strip()
    base = "".join(c for c in base if c.isprintable() and c not in '<>:"|?*')
    raiz = base.rsplit(".", 1)[0] if "." in base else base
    raiz = raiz.strip(" .")[:200] or "documento"
    return raiz + _EXTENSION[tipo_mime]


def leer_archivo(nombre: str, contenido_base64: str) -> ArchivoLeido:
    # Corte rápido antes de decodificar: base64 ocupa 4/3 del tamaño original
    if len(contenido_base64) > (MAX_BYTES * 4) // 3 + 8:
        raise ArchivoInvalido(f"El archivo supera el máximo de {ARCHIVO_MAX_MB} MB.")
    try:
        datos = base64.b64decode(contenido_base64, validate=True)
    except (binascii.Error, ValueError):
        raise ArchivoInvalido("El archivo no llegó completo o está dañado. Intenta subirlo de nuevo.")
    if not datos:
        raise ArchivoInvalido("El archivo está vacío.")
    if len(datos) > MAX_BYTES:
        raise ArchivoInvalido(f"El archivo supera el máximo de {ARCHIVO_MAX_MB} MB.")
    tipo = detectar_tipo(datos)
    if tipo is None:
        raise ArchivoInvalido("Solo se aceptan archivos PDF, JPG o PNG.")
    return ArchivoLeido(nombre=limpiar_nombre(nombre, tipo), tipo_mime=tipo, datos=datos)
