from sqlalchemy import event, select

from app.core.database import SessionLocal
from app.models import Proveedor, Documento, Evaluacion, Incidente, Servicio, Tarifa
from app.services.riesgo_proveedor import calcular_para_proveedor, guardar_resultado

DEPENDIENTES = (Documento, Evaluacion, Incidente, Servicio)


def _proveedor_de_servicio(db, servicio_id):
    return db.scalar(select(Servicio.proveedor_id).where(Servicio.id == servicio_id))


def _existe(db, proveedor_id):
    # Bloquea la fila para serializar recálculos simultáneos del mismo proveedor.
    return db.scalar(select(Proveedor.id).where(Proveedor.id == proveedor_id).with_for_update()) is not None


def proveedores_afectados(db, objetos):
    """Ids de los proveedores cuyo riesgo puede cambiar por estos objetos."""
    afectados = set()
    for obj in objetos:
        if isinstance(obj, Proveedor):
            if obj.id is not None:
                afectados.add(obj.id)
        elif isinstance(obj, DEPENDIENTES):
            if obj.proveedor_id is not None:
                afectados.add(obj.proveedor_id)
        elif isinstance(obj, Tarifa) and obj.servicio_id is not None:
            proveedor_id = _proveedor_de_servicio(db, obj.servicio_id)
            if proveedor_id is not None:
                afectados.add(proveedor_id)
    return afectados


@event.listens_for(SessionLocal, 'before_commit')
def recalcular_cambios(db):
    """Recalcula dentro de la misma transacción. Nunca llama a Gemini.

    Solo observa operaciones ORM de la aplicación, no SQL directo en Neon ni scripts externos.
    Los análisis de riesgo no vuelven a disparar este cálculo.
    """
    objetos = list(db.new) + list(db.dirty) + list(db.deleted)
    if not any(isinstance(o, (Proveedor, Tarifa) + DEPENDIENTES) for o in objetos):
        return
    # Primero se escriben los cambios: así los hijos creados por relación ya tienen su clave foránea.
    db.flush()
    afectados = proveedores_afectados(db, objetos)
    if not afectados:
        return
    # Evita relaciones precargadas con tarifas o documentos anteriores a los cambios.
    db.expire_all()
    for proveedor_id in sorted(afectados):
        if _existe(db, proveedor_id):
            guardar_resultado(db, proveedor_id, calcular_para_proveedor(db, proveedor_id))
