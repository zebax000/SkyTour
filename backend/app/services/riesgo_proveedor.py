from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.constantes import EVALUACIONES_PARA_PROMEDIO, ZONA_HORARIA
from app.models import (
    AnalisisRiesgo,
    AnalisisRiesgoFactor,
    Documento,
    Evaluacion,
    FactorRiesgo,
    Incidente,
    NivelRiesgo,
    ParametroRiesgo,
    Proveedor,
    Servicio,
)
from app.services.motor_riesgo import EventoRiesgo, calcular_riesgo
from app.services.vigencia import hoy


def calcular_para_proveedor(db, proveedor_id):
    if db.get(Proveedor, proveedor_id) is None:
        raise LookupError("Proveedor no encontrado.")
    fecha = hoy()
    documentos = db.scalars(select(Documento.fecha_vencimiento).where(Documento.proveedor_id == proveedor_id)).all()
    evaluaciones = db.scalars(
        select(Evaluacion).where(Evaluacion.proveedor_id == proveedor_id)
        .order_by(Evaluacion.fecha.desc(), Evaluacion.id.desc()).limit(EVALUACIONES_PARA_PROMEDIO)
    ).all()
    # Conserva la precisión del promedio hasta que el motor redondee el factor.
    from decimal import Decimal
    promedio = None
    if evaluaciones:
        promedio = Decimal(sum(e.calidad + e.puntualidad + e.cumplimiento + e.precio for e in evaluaciones)) / Decimal(4 * len(evaluaciones))
    incidentes = db.scalars(select(Incidente).where(Incidente.proveedor_id == proveedor_id)).all()
    eventos = [EventoRiesgo(
        i.tipo.value, i.gravedad.value,
        (fecha - i.fecha.astimezone(ZoneInfo(ZONA_HORARIA)).date()).days,
        i.resuelto,
    ) for i in incidentes]
    servicios = db.scalars(
        select(Servicio).where(Servicio.proveedor_id == proveedor_id).options(selectinload(Servicio.tarifas))
    ).all()
    sin_tarifa = sum(not any(
        t.vigente_desde <= fecha and (t.vigente_hasta is None or t.vigente_hasta >= fecha)
        for t in s.tarifas
    ) for s in servicios)
    parametros = db.scalars(select(ParametroRiesgo)).all()
    pesos = {p.factor.value: p.puntos_maximos for p in parametros} if parametros else None
    resultado = calcular_riesgo([(d - fecha).days for d in documentos], promedio, eventos, sin_tarifa, pesos)
    resultado['fecha_datos'] = fecha.isoformat()
    resultado['evaluaciones_usadas'] = len(evaluaciones)
    resultado['documentos_registrados'] = len(documentos)
    resultado['servicios_sin_tarifa'] = sin_tarifa
    return resultado


def guardar_resultado(db, proveedor_id, resultado):
    # Serializa la comparación y escritura de análisis por proveedor.
    db.execute(select(Proveedor.id).where(Proveedor.id == proveedor_id).with_for_update())
    ultimo = db.scalar(
        select(AnalisisRiesgo).where(AnalisisRiesgo.proveedor_id == proveedor_id)
        .order_by(AnalisisRiesgo.calculado_en.desc(), AnalisisRiesgo.id.desc())
        .options(selectinload(AnalisisRiesgo.factores)).limit(1)
    )
    factores = resultado['factores']
    if ultimo is not None and ultimo.puntaje == resultado['puntaje'] and ultimo.nivel.value == resultado['nivel'] and {f.factor.value: f.puntos for f in ultimo.factores} == factores:
        return ultimo
    analisis = AnalisisRiesgo(
        proveedor_id=proveedor_id, puntaje=resultado['puntaje'], nivel=NivelRiesgo(resultado['nivel']),
        factores=[AnalisisRiesgoFactor(factor=FactorRiesgo(k), puntos=v, descripcion=f"Aporte de {k}: {v} puntos.") for k,v in factores.items()],
    )
    db.add(analisis)
    db.flush()
    return analisis
