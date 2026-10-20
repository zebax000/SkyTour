from datetime import date
from decimal import Decimal
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.api.deps import get_current_user
from app.core.database import get_db
from app.main import app
from app.models import EstadoProveedor, Rol
from app.schemas.proveedor import ProveedorIn, ProveedorUpdate, TarifaIn
from app.services.proveedores import puede_cambiar_estado

A, S = EstadoProveedor.activo, EstadoProveedor.en_seguimiento
SUSP, INAC = EstadoProveedor.suspendido, EstadoProveedor.inactivo


# ---------- Reglas de estado ----------
@pytest.mark.parametrize("actual", list(EstadoProveedor))
@pytest.mark.parametrize("nuevo", list(EstadoProveedor))
def test_administrador_cambia_cualquier_estado(actual, nuevo):
    assert puede_cambiar_estado(Rol.administrador, actual, nuevo)


@pytest.mark.parametrize("actual,nuevo", [(A, S), (S, A)])
def test_evaluador_marca_y_quita_seguimiento(actual, nuevo):
    assert puede_cambiar_estado(Rol.evaluador, actual, nuevo)


@pytest.mark.parametrize("actual,nuevo", [(A, SUSP), (A, INAC), (SUSP, A), (INAC, S), (S, SUSP)])
def test_evaluador_no_suspende_ni_inactiva_ni_reactiva(actual, nuevo):
    assert not puede_cambiar_estado(Rol.evaluador, actual, nuevo)


def test_consultor_no_cambia_estados():
    assert not puede_cambiar_estado(Rol.consultor, A, S)


# ---------- Validación de datos ----------
def test_tarifa_valida():
    t = TarifaIn(valor=Decimal("120000"), vigente_desde=date(2026, 1, 1), vigente_hasta=date(2026, 12, 31))
    assert t.moneda.value == "COP"


def test_tarifa_negativa_se_rechaza():
    with pytest.raises(ValidationError):
        TarifaIn(valor=Decimal("-1"), vigente_desde=date(2026, 1, 1))


def test_tarifa_con_vigencia_al_reves_se_rechaza():
    with pytest.raises(ValidationError):
        TarifaIn(valor=Decimal("10"), vigente_desde=date(2026, 5, 1), vigente_hasta=date(2026, 4, 1))


def test_zonas_repetidas_se_limpian():
    p = ProveedorIn(nombre="X", nit="123-4", tipo="hotel", ciudad="Cali", zonas=["Cali", "cali ", " Bogotá"])
    assert p.zonas == ["Cali", "Bogotá"]


def test_nit_vacio_se_rechaza():
    with pytest.raises(ValidationError):
        ProveedorIn(nombre="X", nit="  ", tipo="hotel", ciudad="Cali")


def test_actualizar_no_acepta_nombre_nulo():
    with pytest.raises(ValidationError):
        ProveedorUpdate(nombre=None)


def test_actualizar_solo_trae_lo_enviado():
    assert ProveedorUpdate(ciudad="Cali").model_dump(exclude_unset=True) == {"ciudad": "Cali"}


# ---------- Permisos de las rutas (sin base de datos) ----------
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


NUEVO = {"nombre": "Hotel Prueba", "nit": "900-1", "tipo": "hotel", "ciudad": "Cali"}


def test_listar_sin_sesion_da_401():
    assert _cliente(None).get("/proveedores").status_code == 401


@pytest.mark.parametrize("rol", [Rol.evaluador, Rol.consultor])
def test_solo_el_administrador_crea(rol):
    assert _cliente(rol).post("/proveedores", json=NUEVO).status_code == 403


@pytest.mark.parametrize("rol", [Rol.evaluador, Rol.consultor])
def test_solo_el_administrador_edita(rol):
    assert _cliente(rol).patch("/proveedores/1", json={"ciudad": "Cali"}).status_code == 403


@pytest.mark.parametrize("rol", [Rol.evaluador, Rol.consultor])
def test_solo_el_administrador_agrega_servicios_y_zonas(rol):
    cliente = _cliente(rol)
    assert cliente.post("/proveedores/1/servicios", json={"nombre": "Tour"}).status_code == 403
    assert cliente.post("/proveedores/1/zonas", json={"ciudad_o_region": "Cali"}).status_code == 403


def test_consultor_no_cambia_el_estado():
    assert _cliente(Rol.consultor).patch("/proveedores/1/estado", json={"estado": "en_seguimiento"}).status_code == 403
