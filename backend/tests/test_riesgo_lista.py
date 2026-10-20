from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from app.api.deps import get_current_user
from app.core.database import get_db
from app.main import app
from app.models import EstadoProveedor, NivelRiesgo, Rol
from app.services import riesgo_lista as rl


@pytest.mark.parametrize(
    "estado,nivel,esperado",
    [
        (EstadoProveedor.en_seguimiento, NivelRiesgo.alto, ["en_seguimiento", "riesgo_alto"]),
        (EstadoProveedor.en_seguimiento, NivelRiesgo.bajo, ["en_seguimiento"]),
        (EstadoProveedor.activo, NivelRiesgo.alto, ["riesgo_alto"]),
        (EstadoProveedor.activo, NivelRiesgo.medio, []),
        (EstadoProveedor.activo, None, []),
    ],
)
def test_motivos_de_atencion(estado, nivel, esperado):
    assert rl.motivos_de_atencion(estado, nivel) == esperado


class BaseFalsa:
    def __init__(self, ids):
        self.ids = ids
        self.commits = 0

    def scalars(self, consulta):
        return iter(self.ids)

    def commit(self):
        self.commits += 1


@pytest.fixture
def espia(monkeypatch):
    calculados, guardados = [], []
    monkeypatch.setattr(rl, "riesgo_de", lambda db, ids: {1: (10, NivelRiesgo.bajo)})
    monkeypatch.setattr(rl, "calcular_para_proveedor", lambda db, pid: calculados.append(pid) or {"proveedor": pid})
    monkeypatch.setattr(rl, "guardar_resultado", lambda db, pid, resultado: guardados.append(pid))
    return calculados, guardados


def test_asegurar_solo_calcula_a_quien_no_tiene_analisis(espia):
    calculados, guardados = espia
    db = BaseFalsa([1, 2, 3])
    assert rl.asegurar_analisis(db) == 2
    assert calculados == [2, 3] and guardados == [2, 3]
    assert db.commits == 1


def test_asegurar_con_ids_explicitos_y_sin_pendientes_no_escribe(espia):
    calculados, _ = espia
    db = BaseFalsa([])
    assert rl.asegurar_analisis(db, [1]) == 0
    assert calculados == [] and db.commits == 0


def test_asegurar_sin_proveedores_devuelve_cero(espia):
    assert rl.asegurar_analisis(BaseFalsa([])) == 0


def test_asegurar_se_detiene_si_los_pesos_son_invalidos(monkeypatch, espia):
    def calcular(db, pid):
        if pid == 3:
            raise ValueError("pesos")
        return {"proveedor": pid}

    guardados = []
    monkeypatch.setattr(rl, "calcular_para_proveedor", calcular)
    monkeypatch.setattr(rl, "guardar_resultado", lambda db, pid, resultado: guardados.append(pid))
    db = BaseFalsa([1, 2, 3, 4])
    assert rl.asegurar_analisis(db) == 1
    assert guardados == [2] and db.commits == 1


def test_asegurar_omite_un_proveedor_que_desaparecio(monkeypatch, espia):
    def calcular(db, pid):
        if pid == 2:
            raise LookupError("no existe")
        return {"proveedor": pid}

    guardados = []
    monkeypatch.setattr(rl, "calcular_para_proveedor", calcular)
    monkeypatch.setattr(rl, "guardar_resultado", lambda db, pid, resultado: guardados.append(pid))
    assert rl.asegurar_analisis(BaseFalsa([1, 2, 3])) == 1
    assert guardados == [3]


# ---------- Rutas (sin base de datos) ----------
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


def test_atencion_sin_sesion_da_401():
    assert _cliente(None).get("/atencion").status_code == 401


def test_filtro_de_riesgo_con_valor_invalido_da_422():
    assert _cliente(Rol.consultor).get("/proveedores?riesgo=extremo").status_code == 422
