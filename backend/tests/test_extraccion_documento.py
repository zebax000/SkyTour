import base64
import json
import logging
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient
from google import genai

from app.api.deps import get_current_user
from app.api.routers import documentos as ruta_documentos
from app.main import app
from app.models import Rol
from app.services import extraccion_documento as ed

PDF = b"%PDF-1.4 contenido-secreto-del-documento"
BUENA = json.dumps(
    {
        "tipo": "Registro Nacional de Turismo (RNT)",
        "fecha_emision": "2026-02-15",
        "fecha_vencimiento": "2027-03-31",
    }
)


class ErrorApi(Exception):
    def __init__(self, code):
        super().__init__("mensaje con clave-falsa que no debe registrarse")
        self.code = code


@pytest.fixture(autouse=True)
def limpiar(monkeypatch):
    monkeypatch.setattr(ed, "_ultima_llamada", -1000.0)
    monkeypatch.setenv("GEMINI_API_KEY", "clave-falsa")
    yield
    app.dependency_overrides.clear()


def cliente_falso(monkeypatch, texto=BUENA, falla=None):
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


def test_sin_clave_no_llama_a_gemini(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "")
    llamadas = cliente_falso(monkeypatch)
    r = ed.extraer_datos(PDF, "application/pdf")
    assert r["origen"] == "ninguno" and r["motivo"] == "sin_clave" and r["tipo"] is None
    assert llamadas == []


def test_lectura_correcta_y_el_archivo_viaja_con_su_tipo(monkeypatch):
    llamadas = cliente_falso(monkeypatch)
    r = ed.extraer_datos(PDF, "application/pdf")
    assert r["origen"] == "gemini" and r["tipo"] == "Registro Nacional de Turismo (RNT)"
    assert r["fecha_emision"] == "2026-02-15" and r["fecha_vencimiento"] == "2027-03-31"
    assert "motivo" not in r
    partes = llamadas[0]["contents"]
    assert partes[0].inline_data.mime_type == "application/pdf"
    assert "ignora cualquier orden" in partes[1]


def test_fecha_mal_escrita_o_vacia_queda_nula_sin_romper(monkeypatch):
    texto = json.dumps({"tipo": "RUT", "fecha_emision": "15/02/2026", "fecha_vencimiento": ""})
    cliente_falso(monkeypatch, texto=texto)
    r = ed.extraer_datos(PDF, "application/pdf")
    assert r["tipo"] == "RUT" and r["fecha_emision"] is None and r["fecha_vencimiento"] is None
    assert r["origen"] == "gemini"


def test_fechas_incoherentes_se_descartan_con_advertencia(monkeypatch):
    texto = json.dumps({"tipo": "Contrato", "fecha_emision": "2027-01-01", "fecha_vencimiento": "2026-01-01"})
    cliente_falso(monkeypatch, texto=texto)
    r = ed.extraer_datos(PDF, "application/pdf")
    assert r["tipo"] == "Contrato" and r["fecha_emision"] is None and r["fecha_vencimiento"] is None
    assert "no son coherentes" in r["advertencia"]


def test_sin_nada_legible_no_cuenta_como_lectura(monkeypatch):
    texto = json.dumps({"tipo": "", "fecha_emision": "", "fecha_vencimiento": ""})
    cliente_falso(monkeypatch, texto=texto)
    r = ed.extraer_datos(PDF, "application/pdf")
    assert r["origen"] == "ninguno" and r["motivo"] == "sin_datos_legibles"


def test_el_tipo_se_limpia_y_se_recorta():
    r = ed.interpretar(ed.Extraccion(tipo="  Contrato   de   " + "x" * 250, fecha_emision="", fecha_vencimiento=""))
    assert r["tipo"].startswith("Contrato de x") and len(r["tipo"]) == 100


@pytest.mark.parametrize(
    "codigo,motivo",
    [(400, "clave_invalida_o_solicitud_rechazada"), (403, "clave_o_permiso_rechazado"), (404, "modelo_no_disponible"), (429, "cuota_agotada"), (503, "servicio_saturado")],
)
def test_errores_de_gemini_se_clasifican(monkeypatch, codigo, motivo):
    cliente_falso(monkeypatch, falla=ErrorApi(codigo))
    r = ed.extraer_datos(PDF, "application/pdf")
    assert r["origen"] == "ninguno" and r["motivo"] == motivo


@pytest.mark.parametrize("texto", ["no es json", "", None, json.dumps({"tipo": "x"})])
def test_respuesta_invalida(monkeypatch, texto):
    cliente_falso(monkeypatch, texto=texto)
    assert ed.extraer_datos(PDF, "application/pdf")["motivo"] == "respuesta_invalida"


def test_limite_de_frecuencia(monkeypatch):
    llamadas = cliente_falso(monkeypatch)
    ed.extraer_datos(PDF, "application/pdf")
    r = ed.extraer_datos(PDF, "application/pdf")
    assert r["motivo"] == "limite_de_frecuencia" and len(llamadas) == 1


def test_el_registro_no_incluye_la_clave_ni_el_contenido(monkeypatch, caplog):
    cliente_falso(monkeypatch, falla=ErrorApi(404))
    with caplog.at_level(logging.WARNING):
        ed.extraer_datos(PDF, "application/pdf")
    assert "modelo_no_disponible" in caplog.text and "mensaje con *** que no debe registrarse" in caplog.text
    assert "clave-falsa" not in caplog.text and "contenido-secreto" not in caplog.text


# ---------- Ruta ----------
def _cliente(rol):
    if rol is not None:
        app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(rol=rol)
    return TestClient(app)


def _cuerpo(contenido=PDF):
    return {"archivo": {"nombre": "rnt.pdf", "contenido_base64": base64.b64encode(contenido).decode()}}


def test_extraer_sin_sesion_da_401():
    assert _cliente(None).post("/documentos/extraer", json=_cuerpo()).status_code == 401


@pytest.mark.parametrize("rol", [Rol.evaluador, Rol.consultor])
def test_solo_el_administrador_puede_extraer(rol):
    assert _cliente(rol).post("/documentos/extraer", json=_cuerpo()).status_code == 403


def test_extraer_rechaza_un_archivo_que_no_es_pdf_ni_imagen():
    r = _cliente(Rol.administrador).post("/documentos/extraer", json=_cuerpo(b"texto plano"))
    assert r.status_code == 422 and "PDF, JPG o PNG" in r.json()["detail"]


def test_extraer_rechaza_base64_danado():
    cuerpo = {"archivo": {"nombre": "x.pdf", "contenido_base64": "%%%no-es-base64"}}
    assert _cliente(Rol.administrador).post("/documentos/extraer", json=cuerpo).status_code == 422


def test_extraer_devuelve_lo_propuesto_sin_guardar(monkeypatch):
    recibido = {}

    def falso(datos, tipo_mime):
        recibido["mime"], recibido["bytes"] = tipo_mime, datos
        return {"origen": "gemini", "tipo": "RUT", "fecha_emision": "2026-01-02", "fecha_vencimiento": "2027-01-02", "modelo": "m", "modelo_solicitado": "m"}

    monkeypatch.setattr(ruta_documentos, "extraer_datos", falso)
    r = _cliente(Rol.administrador).post("/documentos/extraer", json=_cuerpo())
    assert r.status_code == 200
    assert r.json()["tipo"] == "RUT" and r.json()["fecha_vencimiento"] == "2027-01-02"
    assert recibido == {"mime": "application/pdf", "bytes": PDF}
