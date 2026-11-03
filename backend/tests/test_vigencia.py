from datetime import date, timedelta

import pytest

from app.services.vigencia import estado_documento, estado_tarifa

HOY = date(2026, 10, 19)


@pytest.mark.parametrize(
    "dias,esperado",
    [(-1, "vencido"), (0, "por_vencer"), (30, "por_vencer"), (31, "vigente"), (365, "vigente")],
)
def test_estado_documento(dias, esperado):
    assert estado_documento(HOY + timedelta(days=dias), HOY) == esperado


def test_tarifa_vigente_sin_fecha_final():
    assert estado_tarifa(HOY - timedelta(days=10), None, HOY) == "vigente"


def test_tarifa_vigente_hasta_hoy():
    assert estado_tarifa(HOY - timedelta(days=10), HOY, HOY) == "vigente"


def test_tarifa_vencida():
    assert estado_tarifa(HOY - timedelta(days=30), HOY - timedelta(days=1), HOY) == "vencida"


def test_tarifa_futura():
    assert estado_tarifa(HOY + timedelta(days=1), None, HOY) == "futura"
