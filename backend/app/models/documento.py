from datetime import date, datetime
from typing import Optional

from sqlalchemy import CheckConstraint, Date, DateTime, ForeignKey, Index, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Documento(Base):
    __tablename__ = "documento"

    id: Mapped[int] = mapped_column(primary_key=True)
    proveedor_id: Mapped[int] = mapped_column(ForeignKey("proveedor.id", ondelete="CASCADE"))
    tipo: Mapped[str] = mapped_column(String(100))
    fecha_emision: Mapped[date] = mapped_column(Date)
    # El estado (vigente, por vencer, vencido) se calcula con esta fecha; no se guarda
    fecha_vencimiento: Mapped[date] = mapped_column(Date)
    archivo_url: Mapped[Optional[str]] = mapped_column(String(500))
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_documento_proveedor_id", "proveedor_id"),
        Index("ix_documento_fecha_vencimiento", "fecha_vencimiento"),
        CheckConstraint("fecha_vencimiento >= fecha_emision", name="documento_fechas_coherentes"),
    )
