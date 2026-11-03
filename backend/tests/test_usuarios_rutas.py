from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from app.api.deps import get_current_user
from app.core.database import get_db
from app.main import app
from app.models import Rol
from app.services.limitador import limitador_login

NUEVO = {"nombre": "Ana Pérez", "correo": "ana@empresa.com", "rol": "evaluador", "contrasena": "Clave1234"}
RUTAS = [
    ("GET", "/usuarios", None),
    ("POST", "/usuarios", NUEVO),
    ("PATCH", "/usuarios/2", {"activo": False}),
    ("POST", "/usuarios/2/contrasena", {"contrasena": "Nueva1234"}),
]


def _base_falsa():
    yield None


@pytest.fixture(autouse=True)
def limpiar():
    limitador_login.vaciar()
    yield
    app.dependency_overrides.clear()
    limitador_login.vaciar()


def _cliente(rol):
    app.dependency_overrides[get_db] = _base_falsa
    if rol is not None:
        app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(rol=rol)
    return TestClient(app)


@pytest.mark.parametrize("metodo,ruta,cuerpo", RUTAS)
def test_sin_sesion_da_401(metodo, ruta, cuerpo):
    assert _cliente(None).request(metodo, ruta, json=cuerpo).status_code == 401


@pytest.mark.parametrize("rol", [Rol.evaluador, Rol.consultor])
@pytest.mark.parametrize("metodo,ruta,cuerpo", RUTAS)
def test_solo_el_administrador_gestiona_usuarios(rol, metodo, ruta, cuerpo):
    assert _cliente(rol).request(metodo, ruta, json=cuerpo).status_code == 403


def test_login_bloqueado_da_429_sin_tocar_la_base():
    for _ in range(5):
        limitador_login.registrar_fallo("ana@empresa.com")
    respuesta = _cliente(None).post("/auth/login", json={"correo": "ANA@empresa.com", "contrasena": "lo-que-sea"})
    assert respuesta.status_code == 429
    assert int(respuesta.headers["Retry-After"]) > 0


def test_cambiar_mi_contrasena_exige_sesion():
    cuerpo = {"contrasena_actual": "Vieja1234", "contrasena_nueva": "Nueva1234"}
    assert _cliente(None).post("/auth/contrasena", json=cuerpo).status_code == 401
