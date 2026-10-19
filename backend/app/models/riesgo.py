from datetime import datetime
from typing import Optional

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    SmallInteger,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import FactorRiesgo, NivelRiesgo, pg_enum


class AnalisisRiesgo(Base):
    """Resultado de un cálculo de riesgo. Guardar uno nuevo solo cuando el resultado cambia."""

    __tablename__ = "analisis_riesgo"

    id: Mapped[int] = mapped_column(primary_key=True)
    proveedor_id: Mapped[int] = mapped_column(ForeignKey("proveedor.id", ondelete="CASCADE"))
    puntaje: Mapped[Optional[int]] = mapped_column(SmallInteger)  # nulo si no hay datos suficientes
    nivel: Mapped[NivelRiesgo] = mapped_column(pg_enum(NivelRiesgo, "nivel_riesgo"))
    calculado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    factores: Mapped[list["AnalisisRiesgoFactor"]] = relationship(
        cascade="all, delete-orphan", passive_deletes=True
    )

    __table_args__ = (
        Index("ix_analisis_riesgo_proveedor_calculado", "proveedor_id", "calculado_en"),
        CheckConstraint("puntaje IS NULL OR puntaje BETWEEN 0 AND 100", name="analisis_puntaje_rango"),
        CheckConstraint("(nivel = 'sin_datos') = (puntaje IS NULL)", name="analisis_sin_datos_coherente"),
    )


class AnalisisRiesgoFactor(Base):
    """Cuánto aportó cada factor a un análisis: de aquí sale la explicación del riesgo."""

    __tablename__ = "analisis_riesgo_factor"

    id: Mapped[int] = mapped_column(primary_key=True)
    analisis_riesgo_id: Mapped[int] = mapped_column(
        ForeignKey("analisis_riesgo.id", ondelete="CASCADE"), index=True
    )
    factor: Mapped[FactorRiesgo] = mapped_column(pg_enum(FactorRiesgo, "factor_riesgo"))
    puntos: Mapped[int] = mapped_column(SmallInteger)
    descripcion: Mapped[Optional[str]] = mapped_column(String(255))


class ParametroRiesgo(Base):
    """Puntos máximos de cada factor. Los umbrales bajo/medio/alto están en core/constantes.py."""

    __tablename__ = "parametro_riesgo"

    id: Mapped[int] = mapped_column(primary_key=True)
    factor: Mapped[FactorRiesgo] = mapped_column(pg_enum(FactorRiesgo, "factor_riesgo"))
    puntos_maximos: Mapped[int] = mapped_column(SmallInteger)

    __table_args__ = (UniqueConstraint("factor", name="uq_parametro_riesgo_factor"),)
