from datetime import date, datetime
from typing import Optional

from sqlalchemy import CheckConstraint, Date, DateTime, ForeignKey, Index, Integer, LargeBinary, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Documento(Base):
    __tablename__ = "documento"

    id: Mapped[int] = mapped_column(primary_key=True)
    proveedor_id: Mapped[int] = mapped_column(ForeignKey("proveedor.id", ondelete="CASCADE"))
    tipo: Mapped[str] = mapped_column(String(100))
    fecha_emision: Mapped[date] = mapped_column(Date)
    # El estado (vigente, por vencer, vencido) se calcula con esta fecha; no se guarda
    fecha_vencimiento: Mapped[date] = mapped_column(Date)
    archivo_url: Mapped[Optional[str]] = mapped_column(String(500))  # sin uso: los archivos van en documento_archivo
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    archivo: Mapped[Optional["DocumentoArchivo"]] = relationship(
        uselist=False, cascade="all, delete-orphan", passive_deletes=True, lazy="selectin"
    )

    __table_args__ = (
        Index("ix_documento_proveedor_id", "proveedor_id"),
        Index("ix_documento_fecha_vencimiento", "fecha_vencimiento"),
        CheckConstraint("fecha_vencimiento >= fecha_emision", name="documento_fechas_coherentes"),
    )


class DocumentoArchivo(Base):
    """El archivo subido (PDF, JPG o PNG de hasta 5 MB), guardado en la base de datos."""

    __tablename__ = "documento_archivo"

    documento_id: Mapped[int] = mapped_column(ForeignKey("documento.id", ondelete="CASCADE"), primary_key=True)
    nombre: Mapped[str] = mapped_column(String(255))
    tipo_mime: Mapped[str] = mapped_column(String(100))
    tamano: Mapped[int] = mapped_column(Integer)
    # deferred: solo se leen los bytes al descargar, no al listar
    datos: Mapped[bytes] = mapped_column(LargeBinary, deferred=True)

    __table_args__ = (CheckConstraint("tamano > 0", name="documento_archivo_tamano_positivo"),)
