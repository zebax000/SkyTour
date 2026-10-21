from typing import Optional

from pydantic import BaseModel

from app.models.enums import EstadoProveedor, NivelRiesgo, TipoProveedor


class FilaRanking(BaseModel):
    posicion: int
    id: int
    nombre: str
    tipo: TipoProveedor
    ciudad: str
    estado: EstadoProveedor
    calificacion: Optional[float] = None
    evaluaciones: int
    riesgo_nivel: Optional[NivelRiesgo] = None
    riesgo_puntaje: Optional[int] = None
    incidentes_abiertos: int
