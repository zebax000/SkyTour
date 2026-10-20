from decimal import ROUND_HALF_UP, Decimal
from typing import Optional, Sequence

from app.core.constantes import EVALUACIONES_PARA_PROMEDIO

CRITERIOS = 4  # calidad, puntualidad, cumplimiento y precio


def _redondear(valor: Decimal) -> float:
    return float(valor.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


def suma_criterios(calidad: int, puntualidad: int, cumplimiento: int, precio: int) -> int:
    return calidad + puntualidad + cumplimiento + precio


def promedio_evaluacion(calidad: int, puntualidad: int, cumplimiento: int, precio: int) -> float:
    """Cada evaluación vale el promedio de sus cuatro criterios."""
    return _redondear(Decimal(suma_criterios(calidad, puntualidad, cumplimiento, precio)) / CRITERIOS)


def promedio_ultimas(sumas_recientes_primero: Sequence[int], cantidad: int = EVALUACIONES_PARA_PROMEDIO) -> Optional[float]:
    """Calificación del proveedor: promedio de sus últimas evaluaciones (5 por defecto).

    Recibe la suma de los cuatro criterios de cada evaluación, de la más reciente a la más antigua.
    Devuelve None si todavía no hay evaluaciones. Se redondea una sola vez, al final.
    """
    tomadas = list(sumas_recientes_primero)[:cantidad]
    if not tomadas:
        return None
    return _redondear(Decimal(sum(tomadas)) / Decimal(CRITERIOS * len(tomadas)))
