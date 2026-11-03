import enum

from sqlalchemy import Enum as SAEnum


def pg_enum(clase: type[enum.Enum], nombre: str) -> SAEnum:
    """Enumeración nativa de PostgreSQL que guarda el valor (no el nombre) del enum."""
    return SAEnum(clase, name=nombre, values_callable=lambda e: [m.value for m in e])


class Rol(str, enum.Enum):
    administrador = "administrador"
    evaluador = "evaluador"
    consultor = "consultor"


class TipoProveedor(str, enum.Enum):
    hotel = "hotel"
    aerolinea = "aerolinea"
    transportador = "transportador"
    operador = "operador"
    guia = "guia"
    restaurante = "restaurante"
    aseguradora = "aseguradora"


class EstadoProveedor(str, enum.Enum):
    activo = "activo"
    en_seguimiento = "en_seguimiento"
    suspendido = "suspendido"
    inactivo = "inactivo"


class Moneda(str, enum.Enum):
    COP = "COP"
    USD = "USD"


class TipoIncidente(str, enum.Enum):
    incidente = "incidente"
    incumplimiento = "incumplimiento"


class Gravedad(str, enum.Enum):
    baja = "baja"
    media = "media"
    alta = "alta"
    critica = "critica"


class NivelRiesgo(str, enum.Enum):
    bajo = "bajo"
    medio = "medio"
    alto = "alto"
    sin_datos = "sin_datos"


class FactorRiesgo(str, enum.Enum):
    documentacion = "documentacion"
    calificacion = "calificacion"
    incidentes = "incidentes"
    incumplimientos = "incumplimientos"
    tarifas = "tarifas"
