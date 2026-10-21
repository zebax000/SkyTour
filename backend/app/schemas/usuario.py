from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.enums import Rol
from app.services.usuarios import validar_contrasena, validar_correo


def _limpiar_nombre(valor: str) -> str:
    nombre = " ".join(valor.split())
    if len(nombre) < 2:
        raise ValueError("El nombre es demasiado corto.")
    return nombre


def _revisar_contrasena(valor: str) -> str:
    motivo = validar_contrasena(valor)
    if motivo:
        raise ValueError(motivo)
    return valor


class UsuarioAdminOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    correo: str
    rol: Rol
    activo: bool
    creado_en: datetime


class PaginaUsuarios(BaseModel):
    items: list[UsuarioAdminOut]
    total: int
    pagina: int
    tamano: int


class UsuarioCrear(BaseModel):
    nombre: str = Field(max_length=120)
    correo: str = Field(max_length=255)
    rol: Rol
    contrasena: str = Field(max_length=128)

    @field_validator("nombre")
    @classmethod
    def _nombre(cls, v: str) -> str:
        return _limpiar_nombre(v)

    @field_validator("correo")
    @classmethod
    def _correo(cls, v: str) -> str:
        return validar_correo(v)

    @field_validator("contrasena")
    @classmethod
    def _contrasena(cls, v: str) -> str:
        return _revisar_contrasena(v)


class UsuarioActualizar(BaseModel):
    """Solo cambia lo que se envía. Un valor nulo explícito no se acepta."""

    nombre: Optional[str] = Field(default=None, max_length=120)
    rol: Optional[Rol] = None
    activo: Optional[bool] = None

    @field_validator("nombre", "rol", "activo")
    @classmethod
    def _sin_nulos(cls, v):
        if v is None:
            raise ValueError("No puede ser nulo.")
        return v

    @field_validator("nombre")
    @classmethod
    def _nombre(cls, v: str) -> str:
        return _limpiar_nombre(v)


class ContrasenaNueva(BaseModel):
    contrasena: str = Field(max_length=128)

    @field_validator("contrasena")
    @classmethod
    def _contrasena(cls, v: str) -> str:
        return _revisar_contrasena(v)


class CambioContrasena(BaseModel):
    contrasena_actual: str = Field(min_length=1, max_length=128)
    contrasena_nueva: str = Field(max_length=128)

    @field_validator("contrasena_nueva")
    @classmethod
    def _nueva(cls, v: str) -> str:
        return _revisar_contrasena(v)
