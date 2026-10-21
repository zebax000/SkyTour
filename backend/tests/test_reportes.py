from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from app.api.deps import get_current_user
from app.api.routers import reportes as ruta_reportes
from app.core.database import get_db
from app.main import app
from app.models import Rol
from app.services import reportes as rp
from app.services.reporte_csv import ENCABEZADOS, celda_segura, generar_csv, numero
from app.services.reporte_pdf import generar_pdf


def fila(nombre, calificacion=None, puntaje=None, **extra):
    base = {
        'id': 1, 'nombre': nombre, 'tipo': 'hotel', 'ciudad': 'Cali', 'estado': 'activo',
        'calificacion': calificacion, 'evaluaciones': 0 if calificacion is None else 3,
        'riesgo_nivel': None if puntaje is None else 'alto', 'riesgo_puntaje': puntaje, 'incidentes_abiertos': 0,
    }
    base.update(extra)
    return base


# ---------- Orden ----------
def test_ranking_por_calificacion_mejor_primero_y_sin_dato_al_final():
    filas = [fila('Beta', 4.0), fila('Alfa', 4.5), fila('Sin', None), fila('Aurora', 4.5)]
    ordenadas = rp.ordenar(filas, 'calificacion')
    assert [f['nombre'] for f in ordenadas] == ['Alfa', 'Aurora', 'Beta', 'Sin']
    assert [f['posicion'] for f in ordenadas] == [1, 2, 3, 4]


def test_ranking_por_riesgo_mayor_riesgo_primero_y_sin_dato_al_final():
    filas = [fila('Beta', puntaje=10), fila('Alfa', puntaje=80), fila('Sin'), fila('Aurora', puntaje=80)]
    ordenadas = rp.ordenar(filas, 'riesgo')
    assert [f['nombre'] for f in ordenadas] == ['Alfa', 'Aurora', 'Beta', 'Sin']


def test_en_empate_de_riesgo_gana_la_peor_calificacion():
    filas = [fila('Buena', calificacion=4.8, puntaje=70), fila('Mala', calificacion=2.0, puntaje=70)]
    assert [f['nombre'] for f in rp.ordenar(filas, 'riesgo')] == ['Mala', 'Buena']


def test_ordenar_lista_vacia():
    assert rp.ordenar([], 'calificacion') == []


def test_filas_legibles_traducen_etiquetas_y_sin_riesgo():
    legibles = rp.a_filas_legibles(rp.ordenar([fila('Alfa', 4.0, 80), fila('Sin')], 'calificacion'))
    assert legibles[0]['tipo'] == 'Hotel' and legibles[0]['estado'] == 'Activo' and legibles[0]['riesgo'] == 'Riesgo alto'
    assert legibles[1]['riesgo'] == 'Sin calcular' and legibles[1]['calificacion'] is None


# ---------- CSV ----------
def _legibles():
    return rp.a_filas_legibles(rp.ordenar([fila('Hotel Aurora', 4.25, 12), fila('=HYPERLINK("http://x")', None, None)], 'calificacion'))


def test_csv_trae_bom_punto_y_coma_y_coma_decimal():
    datos = generar_csv(_legibles())
    assert datos.startswith(b'\xef\xbb\xbf')
    lineas = datos.decode('utf-8-sig').splitlines()
    assert lineas[0] == ';'.join(ENCABEZADOS)
    assert lineas[1].split(';')[5] == '4,25'


def test_csv_neutraliza_formulas():
    texto = generar_csv(_legibles()).decode('utf-8-sig')
    assert '"\'=HYPERLINK' in texto
    for peligroso in ('=1+1', '+1', '-1', '@x', '\tx'):
        assert celda_segura(peligroso).startswith("'")
    assert celda_segura('Hotel') == 'Hotel' and celda_segura(None) == ''


def test_numero_usa_coma():
    assert numero(4.5) == '4,5' and numero(None) == '' and numero(12) == '12'


def test_csv_sin_filas_solo_trae_encabezados():
    assert len(generar_csv([]).decode('utf-8-sig').splitlines()) == 1


# ---------- PDF ----------
def test_pdf_se_genera_con_acentos_y_caracteres_especiales():
    filas = rp.a_filas_legibles(rp.ordenar([fila('Hotel <Sur> & Cía', 4.0, 12)] * 40, 'calificacion'))
    datos = generar_pdf(filas, 'Ranking por calificación', 'Generado hoy')
    assert datos.startswith(b'%PDF-') and len(datos) > 1000


def test_pdf_sin_filas_tambien_se_genera():
    assert generar_pdf([], 'Ranking', 'Sin datos').startswith(b'%PDF-')


# ---------- Rutas (sin base de datos) ----------
def _base_falsa():
    yield None


@pytest.fixture(autouse=True)
def limpiar():
    yield
    app.dependency_overrides.clear()


def _cliente(rol):
    app.dependency_overrides[get_db] = _base_falsa
    if rol is not None:
        app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(rol=rol)
    return TestClient(app)


RUTAS = ['/reportes/ranking', '/reportes/ranking.csv', '/reportes/ranking.pdf']


@pytest.mark.parametrize('ruta', RUTAS)
def test_sin_sesion_da_401(ruta):
    assert _cliente(None).get(ruta).status_code == 401


@pytest.mark.parametrize('ruta', RUTAS)
def test_orden_invalido_da_422(ruta):
    assert _cliente(Rol.consultor).get(ruta + '?orden=azar').status_code == 422


@pytest.mark.parametrize('ruta', RUTAS)
def test_tipo_invalido_da_422(ruta):
    assert _cliente(Rol.consultor).get(ruta + '?tipo=nave').status_code == 422


@pytest.fixture
def ranking_falso(monkeypatch):
    llamadas = []

    def falso(db, orden, tipo=None, ciudad=None):
        llamadas.append((orden, tipo, ciudad))
        return rp.ordenar([fila('Hotel Aurora', 4.25, 12)], orden)

    monkeypatch.setattr(ruta_reportes, 'construir_ranking', falso)
    return llamadas


def test_el_consultor_puede_ver_el_ranking(ranking_falso):
    r = _cliente(Rol.consultor).get('/reportes/ranking?orden=riesgo&ciudad=Cali')
    assert r.status_code == 200 and r.json()[0]['nombre'] == 'Hotel Aurora' and r.json()[0]['posicion'] == 1
    assert ranking_falso == [('riesgo', None, 'Cali')]


def test_descarga_csv(ranking_falso):
    r = _cliente(Rol.consultor).get('/reportes/ranking.csv?orden=calificacion')
    assert r.status_code == 200 and r.headers['content-type'].startswith('text/csv')
    assert 'attachment' in r.headers['content-disposition'] and 'ranking_calificacion.csv' in r.headers['content-disposition']
    assert r.content.startswith(b'\xef\xbb\xbf') and b'Hotel Aurora' in r.content


def test_descarga_pdf(ranking_falso):
    r = _cliente(Rol.evaluador).get('/reportes/ranking.pdf?orden=riesgo')
    assert r.status_code == 200 and r.headers['content-type'] == 'application/pdf'
    assert 'ranking_riesgo.pdf' in r.headers['content-disposition'] and r.content.startswith(b'%PDF-')
