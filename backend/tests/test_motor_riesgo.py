import pytest
from app.services.motor_riesgo import EventoRiesgo, calcular_riesgo, nivel_de_puntaje

@pytest.mark.parametrize('puntaje,nivel', [(0,'bajo'),(33,'bajo'),(34,'medio'),(66,'medio'),(67,'alto'),(100,'alto')])
def test_umbrales(puntaje, nivel):
    assert nivel_de_puntaje(puntaje) == nivel

@pytest.mark.parametrize('dias,puntos', [(-1,10),(0,4),(30,4),(31,0)])
def test_documentacion(dias, puntos):
    assert calcular_riesgo([dias],5,[],0)['factores']['documentacion'] == puntos

@pytest.mark.parametrize('documentos,promedio', [([],5),([100],None)])
def test_datos_insuficientes(documentos,promedio):
    assert calcular_riesgo(documentos,promedio,[],0)['puntaje'] is None

def test_topes():
    eventos = [EventoRiesgo('incidente','critica',1)]*20 + [EventoRiesgo('incumplimiento','alta',1)]*20
    r = calcular_riesgo([-1]*20,1,eventos,10)
    assert r['factores'] == {'documentacion':30,'calificacion':20,'incidentes':20,'incumplimientos':15,'tarifas':10}
    assert r['puntaje'] == 95

def test_ventana_y_resueltos():
    eventos = [EventoRiesgo('incidente','media',90,True),EventoRiesgo('incidente','critica',91),EventoRiesgo('incidente','critica',-1)]
    assert calcular_riesgo([100],5,eventos,0)['factores']['incidentes'] == 2

def test_tarifa_solo_servicios_sin_vigente():
    assert calcular_riesgo([100],5,[],0)['factores']['tarifas'] == 0
    assert calcular_riesgo([100],5,[],1)['factores']['tarifas'] == 5

def test_pesos_invalidos():
    with pytest.raises(ValueError):
        calcular_riesgo([100],5,[],0,{'tarifas':10})
