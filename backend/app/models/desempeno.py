from datetime import datetime
from typing import Optional

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, SmallInteger, Text, func, text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.enums import Gravedad, TipoIncidente, pg_enum


class Evaluacion(Base):
    __tablename__ = "evaluacion"

    id: Mapped[int] = mapped_column(primary_key=True)
    proveedor_id: Mapped[int] = mapped_column(ForeignKey("proveedor.id", ondelete="RESTRICT"))
    evaluador_id: Mapped[int] = mapped_column(ForeignKey("usuario.id", ondelete="RESTRICT"))
    calidad: Mapped[int] = mapped_column(SmallInteger)
    puntualidad: Mapped[int] = mapped_column(SmallInteger)
    cumplimiento: Mapped[int] = mapped_column(SmallInteger)
    precio: Mapped[int] = mapped_column(SmallInteger)
    comentario: Mapped[Optional[str]] = mapped_column(Text)
    fecha: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_evaluacion_proveedor_fecha", "proveedor_id", "fecha"),
        Index("ix_evaluacion_evaluador_id", "evaluador_id"),
        CheckConstraint("calidad BETWEEN 1 AND 5", name="evaluacion_calidad_rango"),
        CheckConstraint("puntualidad BETWEEN 1 AND 5", name="evaluacion_puntualidad_rango"),
        CheckConstraint("cumplimiento BETWEEN 1 AND 5", name="evaluacion_cumplimiento_rango"),
        CheckConstraint("precio BETWEEN 1 AND 5", name="evaluacion_precio_rango"),
    )


class Incidente(Base):
    __tablename__ = "incidente"

    id: Mapped[int] = mapped_column(primary_key=True)
    proveedor_id: Mapped[int] = mapped_column(ForeignKey("proveedor.id", ondelete="RESTRICT"))
    registrado_por: Mapped[int] = mapped_column(ForeignKey("usuario.id", ondelete="RESTRICT"))
    tipo: Mapped[TipoIncidente] = mapped_column(pg_enum(TipoIncidente, "tipo_incidente"))
    gravedad: Mapped[Gravedad] = mapped_column(pg_enum(Gravedad, "gravedad"))
    descripcion: Mapped[str] = mapped_column(Text)
    fecha: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    resuelto: Mapped[bool] = mapped_column(default=False, server_default=text("false"))
    fecha_cierre: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    comentario_cierre: Mapped[Optional[str]] = mapped_column(Text)

    __table_args__ = (
        Index("ix_incidente_proveedor_fecha", "proveedor_id", "fecha"),
        Index("ix_incidente_registrado_por", "registrado_por"),
    )


class Observacion(Base):
    __tablename__ = "observacion"

    id: Mapped[int] = mapped_column(primary_key=True)
    proveedor_id: Mapped[int] = mapped_column(ForeignKey("proveedor.id", ondelete="RESTRICT"))
    autor_id: Mapped[int] = mapped_column(ForeignKey("usuario.id", ondelete="RESTRICT"))
    texto: Mapped[str] = mapped_column(Text)
    fecha: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_observacion_proveedor_fecha", "proveedor_id", "fecha"),
        Index("ix_observacion_autor_id", "autor_id"),
    )
