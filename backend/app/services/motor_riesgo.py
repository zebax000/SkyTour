from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP

from app.core.constantes import (
    DIAS_POR_VENCER, DIAS_VENTANA_RIESGO,
    UMBRAL_RIESGO_BAJO_MAX, UMBRAL_RIESGO_MEDIO_MAX,
)

MAXIMOS = {"documentacion": 30, "calificacion": 25, "incidentes": 20, "incumplimientos": 15, "tarifas": 10}
GRAVEDAD = {"baja": 2, "media": 4, "alta": 7, "critica": 10}

@dataclass(frozen=True)
class EventoRiesgo:
    tipo: str
    gravedad: str
    dias: int
    resuelto: bool = False


def nivel_de_puntaje(puntaje: int) -> str:
    if not 0 <= puntaje <= 100:
        raise ValueError("Puntaje fuera del rango 0 a 100.")
    return "bajo" if puntaje <= UMBRAL_RIESGO_BAJO_MAX else "medio" if puntaje <= UMBRAL_RIESGO_MEDIO_MAX else "alto"


def calcular_riesgo(documentos_dias, promedio, eventos, servicios_sin_tarifa, maximos=None):
    """Recibe datos preparados, sin consultar ni modificar la base de datos.

    documentos_dias: días restantes de cada documento; negativo significa vencido.
    promedio: promedio de las últimas 5 evaluaciones, o None.
    servicios_sin_tarifa: servicios que no tienen ninguna tarifa vigente.
    Los eventos resueltos pesan la mitad antes del redondeo por factor.
    """
    limites = dict(MAXIMOS if maximos is None else maximos)
    if set(limites) != set(MAXIMOS) or any(type(x) is not int or x < 0 for x in limites.values()) or sum(limites.values()) != 100:
        raise ValueError("Los cinco pesos deben ser enteros no negativos y sumar 100.")
    if promedio is not None and not 1 <= promedio <= 5:
        raise ValueError("Promedio fuera del rango 1 a 5.")
    if type(servicios_sin_tarifa) is not int or servicios_sin_tarifa < 0:
        raise ValueError("Cantidad de servicios inválida.")
    documentos_dias = list(documentos_dias)
    recientes = [e for e in eventos if 0 <= e.dias <= DIAS_VENTANA_RIESGO]
    for e in recientes:
        if e.tipo not in ("incidente", "incumplimiento") or e.gravedad not in GRAVEDAD:
            raise ValueError("Evento inválido.")
    if promedio is None or not documentos_dias:
        return {"puntaje": None, "nivel": "sin_datos", "factores": {}}
    puntos = {
        "documentacion": Decimal(sum(10 if d < 0 else 4 if d <= DIAS_POR_VENCER else 0 for d in documentos_dias)),
        "calificacion": Decimal(25) * (Decimal(5) - Decimal(str(promedio))) / Decimal(5),
        "incidentes": sum((Decimal(GRAVEDAD[e.gravedad]) * (Decimal("0.5") if e.resuelto else 1) for e in recientes if e.tipo == "incidente"), Decimal(0)),
        "incumplimientos": sum((Decimal(5) * (Decimal("0.5") if e.resuelto else 1) for e in recientes if e.tipo == "incumplimiento"), Decimal(0)),
        "tarifas": Decimal(5 * servicios_sin_tarifa),
    }
    factores = {k: min(limites[k], int(v.quantize(Decimal("1"), rounding=ROUND_HALF_UP))) for k, v in puntos.items()}
    total = sum(factores.values())
    return {"puntaje": total, "nivel": nivel_de_puntaje(total), "factores": factores}
