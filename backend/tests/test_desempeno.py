from datetime import datetime
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.api.deps import get_current_user
from app.core.database import get_db
from app.main import app
from app.models import Rol
from app.schemas.desempeno import CierreIn, EvaluacionIn, EvaluacionOut, IncidenteIn, ObservacionIn


# ---------- Validación de datos ----------
def test_evaluacion_valida():
    e = EvaluacionIn(calidad=5, puntualidad=4, cumplimiento=3, precio=2, comentario=" Buen servicio ")
    assert e.comentario == "Buen servicio"


@pytest.mark.parametrize("valor", [0, 6, -1])
def test_calificacion_fuera_de_rango_se_rechaza(valor):
    with pytest.raises(ValidationError):
        EvaluacionIn(calidad=valor, puntualidad=3, cumplimiento=3, precio=3)


def test_faltan_criterios_se_rechaza():
    with pytest.raises(ValidationError):
        EvaluacionIn(calidad=3, puntualidad=3, cumplimiento=3)


def test_comentario_vacio_se_guarda_como_nulo():
    assert EvaluacionIn(calidad=3, puntualidad=3, cumplimiento=3, precio=3, comentario="   ").comentario is None


def test_incidente_necesita_tipo_gravedad_y_descripcion():
    ok = IncidenteIn(tipo="incumplimiento", gravedad="alta", descripcion="Llegó 2 horas tarde")
    assert ok.gravedad.value == "alta"
    with pytest.raises(ValidationError):
        IncidenteIn(tipo="incidente", gravedad="muy grave", descripcion="x")
    with pytest.raises(ValidationError):
        IncidenteIn(tipo="incidente", gravedad="baja", descripcion="   ")


def test_cierre_y_observacion():
    assert CierreIn(comentario="").comentario is None
    assert ObservacionIn(texto=" nota ").texto == "nota"
    with pytest.raises(ValidationError):
        ObservacionIn(texto="  ")


def test_la_respuesta_trae_el_promedio_de_la_evaluacion():
    salida = EvaluacionOut.model_validate(
        SimpleNamespace(
            id=1,
            proveedor_id=1,
            evaluador_id=2,
            evaluador_nombre="Carlos",
            calidad=5,
            puntualidad=4,
            cumplimiento=4,
            precio=4,
            comentario=None,
            fecha=datetime(2026, 10, 20),
        )
    )
    assert salida.promedio == 4.25


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
        app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(rol=rol, id=1, nombre="Prueba")
    return TestClient(app)


EVALUACION = {"calidad": 5, "puntualidad": 5, "cumplimiento": 5, "precio": 5}
INCIDENTE = {"tipo": "incidente", "gravedad": "baja", "descripcion": "Prueba"}


@pytest.mark.parametrize(
    "ruta",
    [
        "/proveedores/1/evaluaciones",
        "/proveedores/1/incidentes",
        "/proveedores/1/observaciones",
        "/evaluaciones",
        "/incidentes",
        "/atencion",
    ],
)
def test_consultar_sin_sesion_da_401(ruta):
    # /atencion debe dar 401 y no 422: confirma que no choca con /proveedores/{id}
    assert _cliente(None).get(ruta).status_code == 401


def test_el_consultor_no_puede_registrar_nada():
    cliente = _cliente(Rol.consultor)
    assert cliente.post("/proveedores/1/evaluaciones", json=EVALUACION).status_code == 403
    assert cliente.post("/proveedores/1/incidentes", json=INCIDENTE).status_code == 403
    assert cliente.post("/proveedores/1/observaciones", json={"texto": "nota"}).status_code == 403
    assert cliente.patch("/incidentes/1/cierre", json={}).status_code == 403


def test_registrar_sin_sesion_da_401():
    cliente = _cliente(None)
    assert cliente.post("/proveedores/1/evaluaciones", json=EVALUACION).status_code == 401
    assert cliente.patch("/incidentes/1/cierre", json={}).status_code == 401
