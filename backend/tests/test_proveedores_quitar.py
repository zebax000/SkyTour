from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from app.api.deps import get_current_user
from app.core.database import get_db
from app.main import app
from app.models import Rol


def _base_falsa():
    yield None


@pytest.fixture(autouse=True)
def limpiar_overrides():
    yield
    app.dependency_overrides.clear()


def _cliente(rol):
    app.dependency_overrides[get_db] = _base_falsa
    if rol is not None:
        app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(rol=rol)
    return TestClient(app)


RUTAS = ["/proveedores/1/servicios/1", "/proveedores/1/servicios/1/tarifas/1", "/proveedores/1/zonas/1"]


@pytest.mark.parametrize("ruta", RUTAS)
def test_quitar_sin_sesion_da_401(ruta):
    assert _cliente(None).delete(ruta).status_code == 401


@pytest.mark.parametrize("ruta", RUTAS)
@pytest.mark.parametrize("rol", [Rol.evaluador, Rol.consultor])
def test_solo_el_administrador_quita(ruta, rol):
    assert _cliente(rol).delete(ruta).status_code == 403
