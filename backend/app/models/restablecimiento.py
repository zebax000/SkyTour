from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from app.core.database import Base

class RestablecimientoContrasena(Base):
    __tablename__ = "restablecimiento_contrasena"
    
    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuario.id", ondelete="CASCADE"), index=True)
    token_hash = Column(String(64), unique=True, index=True)
    creado_en = Column(DateTime(timezone=True))
    vence_en = Column(DateTime(timezone=True))
    usado_en = Column(DateTime(timezone=True), nullable=True)