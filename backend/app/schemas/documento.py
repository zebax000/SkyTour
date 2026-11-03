from datetime import date, datetime
from typing import Annotated

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    StringConstraints,
    computed_field,
    field_validator,
    model_validator,
)

from app.services.vigencia import estado_documento, hoy

TipoDocumento = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]

<<<<<<< HEAD
CAMPOS_OPCIONALES_MAX = {
    "entidad_emisora": 200,
    "numero_documento": 100,
    "titular": 200,
    "identificacion_titular": 50,
    "lugar": 120,
    "objeto": 300,
    "resumen": 500,
}


def _normalizar_opcional(valor: str | None, max_largo: int) -> str | None:
    if valor is None:
        return None
    limpio = " ".join(valor.split())[:max_largo]
    return limpio or None


=======

# ---------- Entrada ----------
>>>>>>> origin/main
class ArchivoIn(BaseModel):
    nombre: str = Field(min_length=1, max_length=255)
    contenido_base64: str = Field(min_length=1)


class DocumentoIn(BaseModel):
    tipo: TipoDocumento
    fecha_emision: date
    fecha_vencimiento: date
<<<<<<< HEAD
    entidad_emisora: str | None = None
    numero_documento: str | None = None
    titular: str | None = None
    identificacion_titular: str | None = None
    lugar: str | None = None
    objeto: str | None = None
    resumen: str | None = None
    archivo: ArchivoIn

    @field_validator(
        "entidad_emisora",
        "numero_documento",
        "titular",
        "identificacion_titular",
        "lugar",
        "objeto",
        "resumen",
        mode="before",
    )
    @classmethod
    def _limpiar_opcional(cls, valor, info):
        if valor is None:
            return None
        return _normalizar_opcional(str(valor), CAMPOS_OPCIONALES_MAX[info.field_name])
=======
    archivo: ArchivoIn

    entidad_emisora: str | None = Field(None, max_length=200)
    numero_documento: str | None = Field(None, max_length=100)
    titular: str | None = Field(None, max_length=200)
    identificacion_titular: str | None = Field(None, max_length=50)
    lugar: str | None = Field(None, max_length=120)
    objeto: str | None = Field(None, max_length=300)
    resumen: str | None = Field(None, max_length=500)
>>>>>>> origin/main

    @model_validator(mode="after")
    def _fechas_coherentes(self):
        if self.fecha_vencimiento < self.fecha_emision:
            raise ValueError("La fecha de vencimiento no puede ser anterior a la de emisión.")
        return self


class DocumentoCambios(BaseModel):
<<<<<<< HEAD
    tipo: TipoDocumento | None = None
    fecha_emision: date | None = None
    fecha_vencimiento: date | None = None
    entidad_emisora: str | None = None
    numero_documento: str | None = None
    titular: str | None = None
    identificacion_titular: str | None = None
    lugar: str | None = None
    objeto: str | None = None
    resumen: str | None = None
    archivo: ArchivoIn | None = None

=======
    """Solo se cambia lo que se envía. Si llega un archivo, reemplaza al anterior."""

    tipo: TipoDocumento | None = None
    fecha_emision: date | None = None
    fecha_vencimiento: date | None = None
    archivo: ArchivoIn | None = None

    entidad_emisora: str | None = Field(None, max_length=200)
    numero_documento: str | None = Field(None, max_length=100)
    titular: str | None = Field(None, max_length=200)
    identificacion_titular: str | None = Field(None, max_length=50)
    lugar: str | None = Field(None, max_length=120)
    objeto: str | None = Field(None, max_length=300)
    resumen: str | None = Field(None, max_length=500)

>>>>>>> origin/main
    @field_validator("tipo", "fecha_emision", "fecha_vencimiento")
    @classmethod
    def _no_nulo(cls, valor):
        if valor is None:
            raise ValueError("Este campo no puede quedar vacío.")
        return valor

<<<<<<< HEAD
    @field_validator(
        "entidad_emisora",
        "numero_documento",
        "titular",
        "identificacion_titular",
        "lugar",
        "objeto",
        "resumen",
        mode="before",
    )
    @classmethod
    def _limpiar_opcional_cambios(cls, valor, info):
        if valor is None:
            return None
        return _normalizar_opcional(str(valor), CAMPOS_OPCIONALES_MAX[info.field_name])


class ExtraccionIn(BaseModel):
    archivo: ArchivoIn


=======

class ExtraccionIn(BaseModel):
    """Archivo cuyo tipo y fechas se quieren leer con IA. No se guarda."""

    archivo: ArchivoIn


# ---------- Salida ----------
>>>>>>> origin/main
class ArchivoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    nombre: str
    tipo_mime: str
    tamano: int


class DocumentoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    proveedor_id: int
    tipo: str
    fecha_emision: date
    fecha_vencimiento: date
<<<<<<< HEAD
=======
    
>>>>>>> origin/main
    entidad_emisora: str | None = None
    numero_documento: str | None = None
    titular: str | None = None
    identificacion_titular: str | None = None
    lugar: str | None = None
    objeto: str | None = None
    resumen: str | None = None
<<<<<<< HEAD
=======

>>>>>>> origin/main
    creado_en: datetime
    archivo: ArchivoOut | None

    @computed_field  # type: ignore[prop-decorator]
    @property
    def estado(self) -> str:
        return estado_documento(self.fecha_vencimiento)

    @computed_field  # type: ignore[prop-decorator]
    @property
    def dias_restantes(self) -> int:
        return (self.fecha_vencimiento - hoy()).days


class DocumentoConProveedor(DocumentoOut):
    proveedor_nombre: str


class PaginaDocumentos(BaseModel):
    items: list[DocumentoConProveedor]
    total: int
    pagina: int
    tamano: int


class ResumenDocumentos(BaseModel):
    vigentes: int
    por_vencer: int
    vencidos: int


class ExtraccionOut(BaseModel):
<<<<<<< HEAD
    origen: str
    tipo: str | None = None
    fecha_emision: date | None = None
    fecha_vencimiento: date | None = None
=======
    """Valores propuestos por la IA. Siempre los revisa una persona antes de guardar."""

    origen: str  # "gemini" o "ninguno"
    tipo: str | None = None
    fecha_emision: date | None = None
    fecha_vencimiento: date | None = None
    
>>>>>>> origin/main
    entidad_emisora: str | None = None
    numero_documento: str | None = None
    titular: str | None = None
    identificacion_titular: str | None = None
    lugar: str | None = None
    objeto: str | None = None
    resumen: str | None = None
<<<<<<< HEAD
=======

>>>>>>> origin/main
    modelo: str | None = None
    modelo_solicitado: str | None = None
    motivo: str | None = None
    advertencia: str | None = None