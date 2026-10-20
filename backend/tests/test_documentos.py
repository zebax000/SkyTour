import base64
from datetime import date, datetime, timedelta
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.api.deps import get_current_user
from app.core.database import get_db
from app.main import app
from app.models import Rol
from app.schemas.documento import DocumentoCambios, DocumentoIn, DocumentoOut
from app.services.vigencia import hoy

ARCHIVO = {"nombre": "rut.pdf", "contenido_base64": base64.b64encode(b"%PDF-1.4").decode()}


# ---------- Validación de datos ----------
def test_documento_valido():
    d = DocumentoIn(tipo=" RUT ", fecha_emision=date(2026, 1, 1), fecha_vencimiento=date(2027, 1, 1), archivo=ARCHIVO)
    assert d.tipo == "RUT"


def test_vencimiento_anterior_a_la_emision_se_rechaza():
    with pytest.raises(ValidationError):
        DocumentoIn(tipo="RUT", fecha_emision=date(2026, 5, 1), fecha_vencimiento=date(2026, 4, 1), archivo=ARCHIVO)


def test_tipo_vacio_se_rechaza():
    with pytest.raises(ValidationError):
        DocumentoIn(tipo="  ", fecha_emision=date(2026, 1, 1), fecha_vencimiento=date(2027, 1, 1), archivo=ARCHIVO)


def test_el_archivo_es_obligatorio_al_crear():
    with pytest.raises(ValidationError):
        DocumentoIn(tipo="RUT", fecha_emision=date(2026, 1, 1), fecha_vencimiento=date(2027, 1, 1))


def test_cambios_no_aceptan_valores_nulos():
    with pytest.raises(ValidationError):
        DocumentoCambios(tipo=None)
    assert DocumentoCambios(tipo="RNT").model_dump(exclude_unset=True) == {"tipo": "RNT"}


# ---------- Estado calculado en la respuesta ----------
def _documento(dias: int) -> SimpleNamespace:
    return SimpleNamespace(
        id=1,
        proveedor_id=1,
        tipo="RNT",
        fecha_emision=hoy() - timedelta(days=400),
        fecha_vencimiento=hoy() + timedelta(days=dias),
        creado_en=datetime(2026, 1, 1),
        archivo=None,
    )


@pytest.mark.parametrize(
    "dias,estado",
    [(-1, "vencido"), (0, "por_vencer"), (30, "por_vencer"), (31, "vigente"), (200, "vigente")],
)
def test_la_respuesta_trae_el_estado_y_los_dias(dias, estado):
    salida = DocumentoOut.model_validate(_documento(dias))
    assert salida.estado == estado
    assert salida.dias_restantes == dias


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


NUEVO = {"tipo": "RUT", "fecha_emision": "2026-01-01", "fecha_vencimiento": "2027-01-01", "archivo": ARCHIVO}


@pytest.mark.parametrize(
    "ruta",
    ["/documentos", "/documentos/resumen", "/proveedores/1/documentos", "/documentos/1/archivo"],
)
def test_consultar_sin_sesion_da_401(ruta):
    assert _cliente(None).get(ruta).status_code == 401


@pytest.mark.parametrize("rol", [Rol.evaluador, Rol.consultor])
def test_solo_el_administrador_sube_edita_y_quita(rol):
    cliente = _cliente(rol)
    assert cliente.post("/proveedores/1/documentos", json=NUEVO).status_code == 403
    assert cliente.patch("/documentos/1", json={"tipo": "RNT"}).status_code == 403
    assert cliente.delete("/documentos/1").status_code == 403
