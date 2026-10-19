from datetime import datetime

from sqlalchemy import DateTime, Index, String, func, text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.enums import Rol, pg_enum


class Usuario(Base):
    __tablename__ = "usuario"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(120))
    correo: Mapped[str] = mapped_column(String(255))
    contrasena_hash: Mapped[str] = mapped_column(String(255))
    rol: Mapped[Rol] = mapped_column(pg_enum(Rol, "rol"))
    activo: Mapped[bool] = mapped_column(default=True, server_default=text("true"))
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


# Correo único sin importar mayúsculas: Ana@x.com y ana@x.com son la misma cuenta
Index("uq_usuario_correo_lower", func.lower(Usuario.correo), unique=True)
