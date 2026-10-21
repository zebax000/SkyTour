import pytest

from app.services.calificacion import (
    promedio_evaluacion,
    promedio_ultimas,
    suma_criterios,
)


def test_suma_de_los_cuatro_criterios():
    assert suma_criterios(5, 4, 4, 3) == 16


@pytest.mark.parametrize(
    "criterios,esperado",
    [((5, 5, 5, 5), 5.0), ((1, 1, 1, 1), 1.0), ((5, 4, 4, 3), 4.0), ((5, 4, 4, 4), 4.25), ((5, 5, 4, 4), 4.5)],
)
def test_promedio_de_una_evaluacion(criterios, esperado):
    assert promedio_evaluacion(*criterios) == esperado


def test_sin_evaluaciones_no_hay_promedio():
    assert promedio_ultimas([]) is None


def test_con_una_sola_evaluacion_es_su_promedio():
    assert promedio_ultimas([17]) == 4.25


def test_con_menos_de_cinco_promedia_las_que_hay():
    assert promedio_ultimas([20, 12]) == 4.0  # (5 + 3) / 2


def test_con_exactamente_cinco_las_usa_todas():
    assert promedio_ultimas([20, 20, 20, 20, 12]) == 4.6  # 92 / 20


def test_con_mas_de_cinco_solo_cuentan_las_cinco_mas_recientes():
    recientes_primero = [20, 20, 20, 20, 20, 4, 4]  # las dos viejas son malas y no deben pesar
    assert promedio_ultimas(recientes_primero) == 5.0


def test_redondea_a_dos_decimales_una_sola_vez():
    assert promedio_ultimas([17, 16, 16]) == 4.08  # 49 / 12 = 4.0833...


def test_redondeo_hacia_arriba_en_la_mitad():
    assert promedio_ultimas([17, 16]) == 4.13  # 33 / 8 = 4.125 exacto, y la mitad sube
