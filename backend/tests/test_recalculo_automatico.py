import pytest

from app.models import AnalisisRiesgo, Documento, Evaluacion, Incidente, Proveedor, Servicio, Tarifa
from app.services import recalculo_automatico as ra


class BaseFalsa:
    """Imita lo único que usa el evento de la sesión: las listas de cambios y flush/expire_all."""

    def __init__(self, nuevos=(), modificados=(), eliminados=()):
        self.new, self.dirty, self.deleted = list(nuevos), list(modificados), list(eliminados)
        self.pasos = []

    def flush(self):
        self.pasos.append("flush")

    def expire_all(self):
        self.pasos.append("expire_all")


@pytest.fixture
def espia(monkeypatch):
    guardados = []
    monkeypatch.setattr(ra, "_existe", lambda db, proveedor_id: proveedor_id != 99)
    monkeypatch.setattr(ra, "_proveedor_de_servicio", lambda db, servicio_id: {7: 9}.get(servicio_id))
    monkeypatch.setattr(ra, "calcular_para_proveedor", lambda db, proveedor_id: {"proveedor": proveedor_id})
    monkeypatch.setattr(ra, "guardar_resultado", lambda db, proveedor_id, resultado: guardados.append(proveedor_id))
    return guardados


@pytest.mark.parametrize(
    "objeto",
    [Documento(proveedor_id=3), Evaluacion(proveedor_id=3), Incidente(proveedor_id=3), Servicio(proveedor_id=3), Proveedor(id=3)],
)
def test_cada_cambio_relevante_recalcula_su_proveedor(espia, objeto):
    db = BaseFalsa(nuevos=[objeto])
    ra.recalcular_cambios(db)
    assert espia == [3]
    assert db.pasos == ["flush", "expire_all"]


def test_los_cambios_modificados_y_eliminados_tambien_cuentan(espia):
    db = BaseFalsa(modificados=[Incidente(proveedor_id=4)], eliminados=[Documento(proveedor_id=5)])
    ra.recalcular_cambios(db)
    assert espia == [4, 5]


def test_una_tarifa_recalcula_al_proveedor_de_su_servicio(espia):
    ra.recalcular_cambios(BaseFalsa(nuevos=[Tarifa(servicio_id=7)]))
    assert espia == [9]


def test_tarifa_de_un_servicio_desconocido_no_recalcula(espia):
    db = BaseFalsa(nuevos=[Tarifa(servicio_id=123)])
    ra.recalcular_cambios(db)
    assert espia == []
    assert db.pasos == ["flush"]


def test_varios_cambios_del_mismo_proveedor_recalculan_una_vez_y_en_orden(espia):
    db = BaseFalsa(nuevos=[Evaluacion(proveedor_id=8), Incidente(proveedor_id=8), Documento(proveedor_id=2)])
    ra.recalcular_cambios(db)
    assert espia == [2, 8]


def test_un_proveedor_que_ya_no_existe_se_omite(espia):
    ra.recalcular_cambios(BaseFalsa(eliminados=[Documento(proveedor_id=99), Documento(proveedor_id=1)]))
    assert espia == [1]


def test_cambios_ajenos_al_riesgo_no_hacen_nada(espia):
    db = BaseFalsa(nuevos=[AnalisisRiesgo(proveedor_id=3)])
    ra.recalcular_cambios(db)
    assert espia == []
    assert db.pasos == []


def test_sin_cambios_no_hace_nada(espia):
    db = BaseFalsa()
    ra.recalcular_cambios(db)
    assert espia == [] and db.pasos == []


def test_el_recalculo_nunca_usa_gemini():
    assert not hasattr(ra, "explicar") and not hasattr(ra, "explicacion_riesgo")
