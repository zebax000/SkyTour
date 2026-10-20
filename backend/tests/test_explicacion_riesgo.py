import json
import logging
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


class ErrorApi(Exception):
    def __init__(self, code):
        super().__init__("mensaje con clave-falsa que no debe registrarse")
        self.code = code


class ReadTimeout(Exception):
    pass


@pytest.fixture(autouse=True)
def limpiar(monkeypatch):
    m._cache.clear()
    monkeypatch.setattr(m, "_ultima_llamada", -1000.0)
    monkeypatch.setenv("GEMINI_API_KEY", "clave-falsa")
    yield
    m._cache.clear()


def cliente_falso(monkeypatch, texto=VALIDO, falla=None):
    llamadas = []

    class Modelos:
        def generate_content(self, **kwargs):
            llamadas.append(kwargs)
            if falla is not None:
                raise falla
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


def test_respaldo_usa_etiquetas_con_acento_y_punto_final():
    r = m.respaldo(RESULTADO)
    assert "Documentación: 30 puntos" in r["resumen"]
    assert "Calificación: 10 puntos" in r["resumen"]
    assert r["resumen"].endswith(".")


def test_sin_clave_no_llama_a_gemini(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "")
    llamadas = cliente_falso(monkeypatch)
    r = m.explicar(RESULTADO)
    assert r["origen"] == "reglas" and r["motivo"] == "sin_clave"
    assert llamadas == []


def test_clave_solo_con_espacios_cuenta_como_sin_clave(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "   ")
    llamadas = cliente_falso(monkeypatch)
    assert m.explicar(RESULTADO)["motivo"] == "sin_clave"
    assert llamadas == []


def test_sin_datos_no_llama_a_gemini(monkeypatch):
    llamadas = cliente_falso(monkeypatch)
    r = m.explicar({"nivel": "sin_datos", "puntaje": None, "factores": {}})
    assert r["origen"] == "reglas" and r["motivo"] == "sin_datos"
    assert llamadas == []


def test_gemini_correcto_y_solo_datos_agregados(monkeypatch):
    llamadas = cliente_falso(monkeypatch)
    r = m.explicar(RESULTADO)
    assert r["origen"] == "gemini" and r["modelo"] == m.ConfigIA().gemini_model
    assert "motivo" not in r
    assert len(llamadas) == 1
    assert "Nombre que nunca debe salir" not in llamadas[0]["contents"]
    assert "clave-falsa" not in llamadas[0]["contents"]


@pytest.mark.parametrize(
    "codigo,motivo",
    [
        (400, "clave_invalida_o_solicitud_rechazada"),
        (401, "clave_o_permiso_rechazado"),
        (403, "clave_o_permiso_rechazado"),
        (404, "modelo_no_disponible"),
        (429, "cuota_agotada"),
        (500, "servicio_saturado"),
        (503, "servicio_saturado"),
    ],
)
def test_errores_http_se_clasifican(monkeypatch, codigo, motivo):
    cliente_falso(monkeypatch, falla=ErrorApi(codigo))
    r = m.explicar(RESULTADO)
    assert r["origen"] == "reglas" and r["motivo"] == motivo


def test_tiempo_agotado(monkeypatch):
    cliente_falso(monkeypatch, falla=ReadTimeout())
    assert m.explicar(RESULTADO)["motivo"] == "tiempo_agotado"


def test_error_desconocido(monkeypatch):
    cliente_falso(monkeypatch, falla=RuntimeError("fallo simulado"))
    assert m.explicar(RESULTADO)["motivo"] == "error_desconocido"


def test_registro_no_incluye_mensaje_ni_clave(monkeypatch, caplog):
    cliente_falso(monkeypatch, falla=ErrorApi(429))
    with caplog.at_level(logging.WARNING):
        m.explicar(RESULTADO)
    texto = caplog.text
    assert "cuota_agotada" in texto and "ErrorApi" in texto and "429" in texto
    assert "clave-falsa" not in texto


@pytest.mark.parametrize("texto", ["no es json", "", None, json.dumps({"resumen": "x", "acciones": ["a"] * 6})])
def test_respuesta_invalida_usa_respaldo(monkeypatch, texto):
    cliente_falso(monkeypatch, texto=texto)
    r = m.explicar(RESULTADO)
    assert r["origen"] == "reglas" and r["motivo"] == "respuesta_invalida"


def test_cache_evita_segunda_llamada(monkeypatch):
    llamadas = cliente_falso(monkeypatch)
    primero = m.explicar(RESULTADO)
    segundo = m.explicar(RESULTADO)
    assert primero == segundo and len(llamadas) == 1


def test_limite_de_frecuencia_usa_respaldo(monkeypatch):
    llamadas = cliente_falso(monkeypatch)
    m.explicar(RESULTADO)
    otro = {**RESULTADO, "puntaje": 41}
    r = m.explicar(otro)
    assert r["origen"] == "reglas" and r["motivo"] == "limite_de_frecuencia"
    assert len(llamadas) == 1
