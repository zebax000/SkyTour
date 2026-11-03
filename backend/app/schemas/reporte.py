
from pydantic import BaseModel

from app.models.enums import EstadoProveedor, NivelRiesgo, TipoProveedor


class FilaRanking(BaseModel):
    posicion: int
    id: int
    nombre: str
    tipo: TipoProveedor
    ciudad: str
    estado: EstadoProveedor
    calificacion: float | None = None
    evaluaciones: int
    riesgo_nivel: NivelRiesgo | None = None
    riesgo_puntaje: int | None = None
    incidentes_abiertos: int
