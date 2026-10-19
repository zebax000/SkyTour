from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import settings


def _normalizar(url: str) -> str:
    # Neon entrega postgresql://; SQLAlchemy necesita indicar el driver psycopg
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+psycopg://", 1)
    return url


DATABASE_URL = _normalizar(settings.database_url)


class Base(DeclarativeBase):
    """Clase base de todos los modelos (tablas)."""


engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_db():
    """Dependencia de FastAPI: una sesión por petición, siempre se cierra."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
