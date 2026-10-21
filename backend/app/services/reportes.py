from collections import defaultdict

from sqlalchemy import func, select

from app.core.constantes import EVALUACIONES_PARA_PROMEDIO
from app.models import EstadoProveedor, Evaluacion, Incidente, Proveedor
from app.services.calificacion import promedio_ultimas, suma_criterios
from app.services.riesgo_lista import asegurar_analisis, riesgo_de

ETIQUETA_TIPO = {
    'hotel': 'Hotel',
    'aerolinea': 'Aerolínea',
    'transportador': 'Transportador',
    'operador': 'Operador turístico',
    'guia': 'Guía',
    'restaurante': 'Restaurante',
    'aseguradora': 'Aseguradora',
}
ETIQUETA_ESTADO = {
    'activo': 'Activo',
    'en_seguimiento': 'En seguimiento',
    'suspendido': 'Suspendido',
    'inactivo': 'Inactivo',
}
ETIQUETA_NIVEL = {
    'bajo': 'Riesgo bajo',
    'medio': 'Riesgo medio',
    'alto': 'Riesgo alto',
    'sin_datos': 'Sin datos suficientes',
}


def _valor(x):
    return getattr(x, 'value', x)


def ordenar(filas, orden):
    """Calificación: la mejor primero. Riesgo: el mayor riesgo primero (a quién atender). Lo que no tiene dato va al final."""
    if orden == 'riesgo':
        def clave(f):
            return (f['riesgo_puntaje'] is None, -(f['riesgo_puntaje'] or 0), f['calificacion'] is None, f['calificacion'] or 0, f['nombre'].lower())
    else:
        def clave(f):
            return (f['calificacion'] is None, -(f['calificacion'] or 0), f['riesgo_puntaje'] is None, f['riesgo_puntaje'] or 0, f['nombre'].lower())
    ordenadas = sorted(filas, key=clave)
    for posicion, fila in enumerate(ordenadas, start=1):
        fila['posicion'] = posicion
    return ordenadas


def construir_ranking(db, orden, tipo=None, ciudad=None):
    """Ranking de proveedores no inactivos con su calificación (últimas 5 evaluaciones) y su último riesgo guardado."""
    consulta = select(Proveedor).where(Proveedor.estado != EstadoProveedor.inactivo)
    if tipo is not None:
        consulta = consulta.where(Proveedor.tipo == tipo)
    if ciudad and ciudad.strip():
        consulta = consulta.where(func.lower(Proveedor.ciudad) == ciudad.strip().lower())
    proveedores = db.scalars(consulta).all()
    if not proveedores:
        return []

    ids = [p.id for p in proveedores]
    asegurar_analisis(db, ids)
    riesgos = riesgo_de(db, ids)

    sumas = defaultdict(list)
    totales = defaultdict(int)
    evaluaciones = db.execute(
        select(Evaluacion.proveedor_id, Evaluacion.calidad, Evaluacion.puntualidad, Evaluacion.cumplimiento, Evaluacion.precio)
        .where(Evaluacion.proveedor_id.in_(ids))
        .order_by(Evaluacion.proveedor_id, Evaluacion.fecha.desc(), Evaluacion.id.desc())
    )
    for proveedor_id, calidad, puntualidad, cumplimiento, precio in evaluaciones:
        totales[proveedor_id] += 1
        if len(sumas[proveedor_id]) < EVALUACIONES_PARA_PROMEDIO:
            sumas[proveedor_id].append(suma_criterios(calidad, puntualidad, cumplimiento, precio))

    abiertos = dict(
        db.execute(
            select(Incidente.proveedor_id, func.count(Incidente.id))
            .where(Incidente.resuelto.is_(False), Incidente.proveedor_id.in_(ids))
            .group_by(Incidente.proveedor_id)
        ).all()
    )

    filas = []
    for p in proveedores:
        puntaje, nivel = riesgos.get(p.id, (None, None))
        filas.append(
            {
                'id': p.id,
                'nombre': p.nombre,
                'tipo': p.tipo,
                'ciudad': p.ciudad,
                'estado': p.estado,
                'calificacion': promedio_ultimas(sumas[p.id]),
                'evaluaciones': totales[p.id],
                'riesgo_nivel': nivel,
                'riesgo_puntaje': puntaje,
                'incidentes_abiertos': abiertos.get(p.id, 0),
            }
        )
    return ordenar(filas, orden)


def a_filas_legibles(filas):
    """Pasa el ranking a texto en español para los archivos descargables."""
    legibles = []
    for f in filas:
        nivel = _valor(f['riesgo_nivel'])
        legibles.append(
            {
                'posicion': f['posicion'],
                'proveedor': f['nombre'],
                'tipo': ETIQUETA_TIPO.get(_valor(f['tipo']), str(_valor(f['tipo']))),
                'ciudad': f['ciudad'],
                'estado': ETIQUETA_ESTADO.get(_valor(f['estado']), str(_valor(f['estado']))),
                'calificacion': f['calificacion'],
                'evaluaciones': f['evaluaciones'],
                'riesgo': ETIQUETA_NIVEL.get(nivel, 'Sin calcular') if nivel else 'Sin calcular',
                'puntaje': f['riesgo_puntaje'],
                'incidentes_abiertos': f['incidentes_abiertos'],
            }
        )
    return legibles
