from datetime import datetime

from sqlalchemy import (
    JSON,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import FactorRiesgo, NivelRiesgo, pg_enum


class AnalisisRiesgo(Base):
    """Resultado de riesgo y explicación asociada al análisis."""
    __tablename__ = "analisis_riesgo"

    id: Mapped[int] = mapped_column(primary_key=True)
    proveedor_id: Mapped[int] = mapped_column(ForeignKey("proveedor.id", ondelete="CASCADE"))
    puntaje: Mapped[int | None] = mapped_column(SmallInteger)
    nivel: Mapped[NivelRiesgo] = mapped_column(pg_enum(NivelRiesgo, "nivel_riesgo"))
    calculado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    explicacion_resumen: Mapped[str | None] = mapped_column(Text)
    explicacion_acciones: Mapped[dict | list | None] = mapped_column(JSON)
    explicacion_origen: Mapped[str | None] = mapped_column(String(20))
    explicacion_modelo: Mapped[str | None] = mapped_column(String(100))
    explicacion_generada_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    factores: Mapped[list["AnalisisRiesgoFactor"]] = relationship(
        cascade="all, delete-orphan", passive_deletes=True
    )

    __table_args__ = (
        Index("ix_analisis_riesgo_proveedor_calculado", "proveedor_id", "calculado_en"),
        CheckConstraint("puntaje IS NULL OR puntaje BETWEEN 0 AND 100", name="analisis_puntaje_rango"),
        CheckConstraint("(nivel = 'sin_datos') = (puntaje IS NULL)", name="analisis_sin_datos_coherente"),
    )


class AnalisisRiesgoFactor(Base):
    """Aporte de cada factor al análisis de riesgo."""
    __tablename__ = "analisis_riesgo_factor"

    id: Mapped[int] = mapped_column(primary_key=True)
    analisis_riesgo_id: Mapped[int] = mapped_column(
        ForeignKey("analisis_riesgo.id", ondelete="CASCADE"), index=True
    )
    factor: Mapped[FactorRiesgo] = mapped_column(pg_enum(FactorRiesgo, "factor_riesgo"))
    puntos: Mapped[int] = mapped_column(SmallInteger)
    descripcion: Mapped[str | None] = mapped_column(String(255))


class ParametroRiesgo(Base):
    """Puntos máximos de los factores de riesgo."""
    __tablename__ = "parametro_riesgo"

    id: Mapped[int] = mapped_column(primary_key=True)
    factor: Mapped[FactorRiesgo] = mapped_column(pg_enum(FactorRiesgo, "factor_riesgo"))
    puntos_maximos: Mapped[int] = mapped_column(SmallInteger)

    __table_args__ = (UniqueConstraint("factor", name="uq_parametro_riesgo_factor"),)
