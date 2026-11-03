from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import Rol


class LoginIn(BaseModel):
    correo: str = Field(min_length=3, max_length=255)
    contrasena: str = Field(min_length=1, max_length=128)


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int  # segundos


class UsuarioOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    correo: str
    rol: Rol
