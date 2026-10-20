import logging

from sqlalchemy import func, select

from app.models import AnalisisRiesgo, EstadoProveedor, NivelRiesgo, Proveedor
from app.services.riesgo_proveedor import calcular_para_proveedor, guardar_resultado

logger = logging.getLogger(__name__)


def _ultimos_ids():
    # Último análisis de cada proveedor: guardar_resultado solo agrega una fila nueva cuando el resultado cambia.
    return select(func.max(AnalisisRiesgo.id)).group_by(AnalisisRiesgo.proveedor_id)


def riesgo_de(db, ids):
    """Devuelve {proveedor_id: (puntaje, nivel)} con el último análisis guardado de cada proveedor."""
    if not ids:
        return {}
    filas = db.execute(
        select(AnalisisRiesgo.proveedor_id, AnalisisRiesgo.puntaje, AnalisisRiesgo.nivel).where(
            AnalisisRiesgo.id.in_(_ultimos_ids()), AnalisisRiesgo.proveedor_id.in_(ids)
        )
    )
    return {pid: (puntaje, nivel) for pid, puntaje, nivel in filas}


def con_nivel(nivel):
    """Condición para filtrar proveedores cuyo último análisis tiene ese nivel."""
    ids = select(AnalisisRiesgo.proveedor_id).where(AnalisisRiesgo.id.in_(_ultimos_ids()), AnalisisRiesgo.nivel == nivel)
    return Proveedor.id.in_(ids)


def asegurar_analisis(db, ids=None):
    """Calcula y guarda el riesgo de los proveedores que todavía no tienen ningún análisis. Devuelve cuántos calculó."""
    if ids is None:
        ids = list(db.scalars(select(Proveedor.id)))
    if not ids:
        return 0
    existentes = riesgo_de(db, ids)
    nuevos = 0
    for pid in ids:
        if pid in existentes:
            continue
        try:
            guardar_resultado(db, pid, calcular_para_proveedor(db, pid))
        except LookupError:
            continue
        except ValueError:
            logger.warning('No se pudo calcular el riesgo: los pesos configurados no suman 100.')
            break
        nuevos += 1
    if nuevos:
        db.commit()
    return nuevos


def motivos_de_atencion(estado, nivel):
    """Por qué un proveedor aparece en la lista de atención: está en seguimiento y/o tiene riesgo alto."""
    motivos = []
    if estado == EstadoProveedor.en_seguimiento:
        motivos.append('en_seguimiento')
    if nivel == NivelRiesgo.alto:
        motivos.append('riesgo_alto')
    return motivos
