from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import EstadoProveedor, Moneda, TipoProveedor, pg_enum


class Proveedor(Base):
    __tablename__ = "proveedor"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(150))
    nit: Mapped[str] = mapped_column(String(30))
    tipo: Mapped[TipoProveedor] = mapped_column(pg_enum(TipoProveedor, "tipo_proveedor"))
    contacto_nombre: Mapped[Optional[str]] = mapped_column(String(120))
    contacto_correo: Mapped[Optional[str]] = mapped_column(String(255))
    contacto_telefono: Mapped[Optional[str]] = mapped_column(String(30))
    ciudad: Mapped[str] = mapped_column(String(100))
    estado: Mapped[EstadoProveedor] = mapped_column(
        pg_enum(EstadoProveedor, "estado_proveedor"),
        default=EstadoProveedor.activo,
        server_default=text("'activo'"),
    )
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Se borran junto con el proveedor (aunque lo normal es inactivarlo)
    servicios: Mapped[list["Servicio"]] = relationship(cascade="all, delete-orphan", passive_deletes=True)
    zonas: Mapped[list["ZonaCobertura"]] = relationship(cascade="all, delete-orphan", passive_deletes=True)
    documentos: Mapped[list["Documento"]] = relationship(cascade="all, delete-orphan", passive_deletes=True)
    analisis: Mapped[list["AnalisisRiesgo"]] = relationship(cascade="all, delete-orphan", passive_deletes=True)
    # Con historial: la base impide borrar un proveedor que ya tiene esto
    evaluaciones: Mapped[list["Evaluacion"]] = relationship()
    incidentes: Mapped[list["Incidente"]] = relationship()
    observaciones: Mapped[list["Observacion"]] = relationship()

    __table_args__ = (
        UniqueConstraint("nit", name="uq_proveedor_nit"),
        Index("ix_proveedor_tipo_ciudad", "tipo", "ciudad"),
        Index("ix_proveedor_estado", "estado"),
    )


class Servicio(Base):
    __tablename__ = "servicio"

    id: Mapped[int] = mapped_column(primary_key=True)
    proveedor_id: Mapped[int] = mapped_column(ForeignKey("proveedor.id", ondelete="CASCADE"), index=True)
    nombre: Mapped[str] = mapped_column(String(150))
    descripcion: Mapped[Optional[str]] = mapped_column(Text)

    tarifas: Mapped[list["Tarifa"]] = relationship(cascade="all, delete-orphan", passive_deletes=True)


class Tarifa(Base):
    __tablename__ = "tarifa"

    id: Mapped[int] = mapped_column(primary_key=True)
    servicio_id: Mapped[int] = mapped_column(ForeignKey("servicio.id", ondelete="CASCADE"), index=True)
    valor: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    moneda: Mapped[Moneda] = mapped_column(
        pg_enum(Moneda, "moneda"), default=Moneda.COP, server_default=text("'COP'")
    )
    vigente_desde: Mapped[date] = mapped_column(Date)
    vigente_hasta: Mapped[Optional[date]] = mapped_column(Date)

    __table_args__ = (
        CheckConstraint("valor >= 0", name="tarifa_valor_positivo"),
        CheckConstraint(
            "vigente_hasta IS NULL OR vigente_hasta >= vigente_desde", name="tarifa_vigencia_coherente"
        ),
    )


class ZonaCobertura(Base):
    __tablename__ = "zona_cobertura"

    id: Mapped[int] = mapped_column(primary_key=True)
    proveedor_id: Mapped[int] = mapped_column(ForeignKey("proveedor.id", ondelete="CASCADE"))
    ciudad_o_region: Mapped[str] = mapped_column(String(120))

    # La restricción única también sirve como índice por proveedor_id
    __table_args__ = (UniqueConstraint("proveedor_id", "ciudad_o_region", name="uq_zona_proveedor_ciudad"),)
