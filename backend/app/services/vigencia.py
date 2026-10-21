from datetime import date, datetime
from zoneinfo import ZoneInfo

from app.core.constantes import DIAS_POR_VENCER, ZONA_HORARIA


def hoy() -> date:
    """La fecha de hoy en Colombia (el servidor corre en UTC)."""
    return datetime.now(ZoneInfo(ZONA_HORARIA)).date()


def estado_tarifa(vigente_desde: date, vigente_hasta: date | None, fecha: date | None = None) -> str:
    """'futura', 'vigente' o 'vencida'. Sin fecha final, la tarifa sigue vigente."""
    fecha = fecha or hoy()
    if vigente_desde > fecha:
        return "futura"
    if vigente_hasta is not None and vigente_hasta < fecha:
        return "vencida"
    return "vigente"


def estado_documento(fecha_vencimiento: date, fecha: date | None = None) -> str:
    """'vigente' (más de 30 días), 'por_vencer' (30 días o menos) o 'vencido' (la fecha ya pasó)."""
    fecha = fecha or hoy()
    dias = (fecha_vencimiento - fecha).days
    if dias < 0:
        return "vencido"
    if dias <= DIAS_POR_VENCER:
        return "por_vencer"
    return "vigente"
