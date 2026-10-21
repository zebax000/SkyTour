from datetime import datetime
from typing import Annotated

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    StringConstraints,
    computed_field,
    field_validator,
)

from app.models.enums import Gravedad, TipoIncidente
from app.schemas.proveedor import ProveedorConRiesgo
from app.services.calificacion import promedio_evaluacion

Calificacion = Annotated[int, Field(ge=1, le=5)]
Texto = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=2000)]


# ---------- Entrada ----------
class EvaluacionIn(BaseModel):
    calidad: Calificacion
    puntualidad: Calificacion
    cumplimiento: Calificacion
    precio: Calificacion
    comentario: Texto | None = None

    @field_validator("comentario", mode="before")
    @classmethod
    def _vacio_es_nulo(cls, valor):
        if isinstance(valor, str) and not valor.strip():
            return None
        return valor


class IncidenteIn(BaseModel):
    tipo: TipoIncidente
    gravedad: Gravedad
    descripcion: Texto


class CierreIn(BaseModel):
    comentario: Texto | None = None

    @field_validator("comentario", mode="before")
    @classmethod
    def _vacio_es_nulo(cls, valor):
        if isinstance(valor, str) and not valor.strip():
            return None
        return valor


class ObservacionIn(BaseModel):
    texto: Texto


# ---------- Salida ----------
class EvaluacionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    proveedor_id: int
    evaluador_id: int
    evaluador_nombre: str
    calidad: int
    puntualidad: int
    cumplimiento: int
    precio: int
    comentario: str | None
    fecha: datetime

    @computed_field  # type: ignore[prop-decorator]
    @property
    def promedio(self) -> float:
        return promedio_evaluacion(self.calidad, self.puntualidad, self.cumplimiento, self.precio)


class EvaluacionConProveedor(EvaluacionOut):
    proveedor_nombre: str


class EvaluacionesDeProveedor(BaseModel):
    promedio: float | None  # de las últimas 5; None si no hay evaluaciones
    en_promedio: int  # cuántas evaluaciones entraron en ese promedio
    total: int
    items: list[EvaluacionOut]


class PaginaEvaluaciones(BaseModel):
    items: list[EvaluacionConProveedor]
    total: int
    pagina: int
    tamano: int


class IncidenteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    proveedor_id: int
    registrado_por: int
    registrado_por_nombre: str
    tipo: TipoIncidente
    gravedad: Gravedad
    descripcion: str
    fecha: datetime
    resuelto: bool
    fecha_cierre: datetime | None
    comentario_cierre: str | None


class IncidenteConProveedor(IncidenteOut):
    proveedor_nombre: str


class PaginaIncidentes(BaseModel):
    items: list[IncidenteConProveedor]
    total: int
    pagina: int
    tamano: int


class ObservacionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    proveedor_id: int
    autor_id: int
    autor_nombre: str
    texto: str
    fecha: datetime


class ProveedorAtencion(ProveedorConRiesgo):
    incidentes_abiertos: int
    # Por qué aparece en la lista: "en_seguimiento" y/o "riesgo_alto"
    motivos: list[str] = []
