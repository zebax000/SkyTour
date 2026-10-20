import os

# Debe ir antes de importar la aplicación: la configuración exige DATABASE_URL (no se conecta en estas pruebas)
os.environ.setdefault("DATABASE_URL", "postgresql://usuario:clave@localhost/pruebas")

import pytest

from app.core.config import settings


@pytest.fixture(autouse=True)
def clave_de_prueba(monkeypatch):
    monkeypatch.setattr(settings, "secret_key", "k" * 64)
