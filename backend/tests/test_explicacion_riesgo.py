import json
from types import SimpleNamespace

import google.genai as genai
import pytest

from app.services import explicacion_riesgo as m

RESULTADO = {
    "puntaje": 40,
    "nivel": "medio",
    "factores": {"documentacion": 30, "calificacion": 10, "incidentes": 0, "incumplimientos": 0, "tarifas": 0},
    "proveedor": "Nombre que nunca debe salir",
}
VALIDO = json.dumps({"resumen": "Resumen de prueba.", "acciones": ["Revisar documentos."]})


@pytest.fixture(autouse=True)
def limpiar(monkeypatch):
    m._cache.clear()
    monkeypatch.setattr(m, "_ultima_llamada", -1000.0)
    monkeypatch.setenv("GEMINI_API_KEY", "clave-falsa")
    yield
    m._cache.clear()


def cliente_falso(monkeypatch, texto=VALIDO, falla=False):
    llamadas = []

    class Modelos:
        def generate_content(self, **kwargs):
            llamadas.append(kwargs)
            if falla:
                raise RuntimeError("fallo simulado")
            return SimpleNamespace(text=texto)

    class Cliente:
        def __init__(self, **kwargs):
            self.models = Modelos()

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

    monkeypatch.setattr(genai, "Client", Cliente)
    return llamadas


def test_respaldo_sin_datos():
    r = m.respaldo({"nivel": "sin_datos", "puntaje": None, "factores": {}})
    assert r["origen"] == "reglas"
    assert "No se asigna puntaje" in r["resumen"]


def test_respaldo_solo_acciones_de_factores_con_puntos():
    r = m.respaldo(RESULTADO)
    assert len(r["acciones"]) == 2
    assert "medio" in r["resumen"] and "40/100" in r["resumen"]


def test_sin_clave_no_llama_a_gemini(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "")
    llamadas = cliente_falso(monkeypatch)
    assert m.explicar(RESULTADO)["origen"] == "reglas"
    assert llamadas == []


def test_sin_datos_no_llama_a_gemini(monkeypatch):
    llamadas = cliente_falso(monkeypatch)
    assert m.explicar({"nivel": "sin_datos", "puntaje": None, "factores": {}})["origen"] == "reglas"
    assert llamadas == []


def test_gemini_correcto_y_solo_datos_agregados(monkeypatch):
    llamadas = cliente_falso(monkeypatch)
    r = m.explicar(RESULTADO)
    assert r["origen"] == "gemini" and r["modelo"] == m.ConfigIA().gemini_model
    assert len(llamadas) == 1
    assert "Nombre que nunca debe salir" not in llamadas[0]["contents"]
    assert "clave-falsa" not in llamadas[0]["contents"]


def test_falla_de_gemini_usa_respaldo(monkeypatch):
    cliente_falso(monkeypatch, falla=True)
    assert m.explicar(RESULTADO)["origen"] == "reglas"


@pytest.mark.parametrize("texto", ["no es json", json.dumps({"resumen": "x", "acciones": ["a"] * 6})])
def test_respuesta_invalida_usa_respaldo(monkeypatch, texto):
    cliente_falso(monkeypatch, texto=texto)
    assert m.explicar(RESULTADO)["origen"] == "reglas"


def test_cache_evita_segunda_llamada(monkeypatch):
    llamadas = cliente_falso(monkeypatch)
    primero = m.explicar(RESULTADO)
    segundo = m.explicar(RESULTADO)
    assert primero == segundo and len(llamadas) == 1


def test_limite_de_frecuencia_usa_respaldo(monkeypatch):
    llamadas = cliente_falso(monkeypatch)
    m.explicar(RESULTADO)
    otro = {**RESULTADO, "puntaje": 41}
    assert m.explicar(otro)["origen"] == "reglas"
    assert len(llamadas) == 1
