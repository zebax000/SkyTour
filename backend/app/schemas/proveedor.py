from datetime import date, datetime
from decimal import Decimal
from typing import Annotated, Optional

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    StringConstraints,
    computed_field,
    field_validator,
    model_validator,
)

from app.models.enums import EstadoProveedor, Moneda, TipoProveedor
from app.services.vigencia import estado_tarifa

Texto = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]
Nombre = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=150)]
Nit = Annotated[str, StringConstraints(strip_whitespace=True, min_length=3, max_length=30)]
Ciudad = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]
Zona = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)]
Contacto = Annotated[str, StringConstraints(strip_whitespace=True, max_length=120)]
CorreoContacto = Annotated[str, StringConstraints(strip_whitespace=True, max_length=255)]
Telefono = Annotated[str, StringConstraints(strip_whitespace=True, max_length=30)]


# ---------- Entrada ----------
class TarifaIn(BaseModel):
    valor: Decimal = Field(ge=0, max_digits=14, decimal_places=2)
    moneda: Moneda = Moneda.COP
    vigente_desde: date
    vigente_hasta: Optional[date] = None

    @model_validator(mode="after")
    def _vigencia_coherente(self):
        if self.vigente_hasta is not None and self.vigente_hasta < self.vigente_desde:
            raise ValueError("vigente_hasta no puede ser anterior a vigente_desde")
        return self


class ServicioIn(BaseModel):
    nombre: Nombre
    descripcion: Optional[str] = None
    tarifas: list[TarifaIn] = []


class ZonaIn(BaseModel):
    ciudad_o_region: Zona


def _zonas_unicas(zonas: list[str]) -> list[str]:
    vistas: set[str] = set()
    limpias: list[str] = []
    for zona in zonas:
        clave = zona.strip().lower()
        if clave not in vistas:
            vistas.add(clave)
            limpias.append(zona.strip())
    return limpias


class ProveedorIn(BaseModel):
    nombre: Nombre
    nit: Nit
    tipo: TipoProveedor
    ciudad: Ciudad
    contacto_nombre: Optional[Contacto] = None
    contacto_correo: Optional[CorreoContacto] = None
    contacto_telefono: Optional[Telefono] = None
    servicios: list[ServicioIn] = []
    zonas: list[Zona] = []

    @field_validator("zonas")
    @classmethod
    def _sin_repetidas(cls, zonas: list[str]) -> list[str]:
        return _zonas_unicas(zonas)


class ProveedorUpdate(BaseModel):
    """Solo se cambian los campos que se envían. El estado se cambia en su propia ruta."""

    nombre: Optional[Nombre] = None
    nit: Optional[Nit] = None
    tipo: Optional[TipoProveedor] = None
    ciudad: Optional[Ciudad] = None
    contacto_nombre: Optional[Contacto] = None
    contacto_correo: Optional[CorreoContacto] = None
    contacto_telefono: Optional[Telefono] = None

    @field_validator("nombre", "nit", "tipo", "ciudad")
    @classmethod
    def _no_nulo(cls, valor):
        if valor is None:
            raise ValueError("Este campo no puede quedar vacío.")
        return valor


class EstadoIn(BaseModel):
    estado: EstadoProveedor


# ---------- Salida ----------
class TarifaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    valor: Decimal
    moneda: Moneda
    vigente_desde: date
    vigente_hasta: Optional[date]

    @computed_field  # type: ignore[prop-decorator]
    @property
    def estado_vigencia(self) -> str:
        return estado_tarifa(self.vigente_desde, self.vigente_hasta)


class ServicioOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    descripcion: Optional[str]
    tarifas: list[TarifaOut]


class ZonaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    ciudad_o_region: str


class ProveedorResumen(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    nit: str
    tipo: TipoProveedor
    ciudad: str
    estado: EstadoProveedor


class ProveedorDetalle(ProveedorResumen):
    contacto_nombre: Optional[str]
    contacto_correo: Optional[str]
    contacto_telefono: Optional[str]
    creado_en: datetime
    servicios: list[ServicioOut]
    zonas: list[ZonaOut]


class PaginaProveedores(BaseModel):
    items: list[ProveedorResumen]
    total: int
    pagina: int
    tamano: int
