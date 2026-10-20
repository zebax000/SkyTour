from sqlalchemy import event, select

from app.core.database import SessionLocal
from app.models import Proveedor, Documento, Evaluacion, Incidente, Servicio, Tarifa
from app.services.riesgo_proveedor import calcular_para_proveedor, guardar_resultado


@event.listens_for(SessionLocal, 'before_commit')
def recalcular_cambios(db):
    """Recalcula dentro de la misma transacción. Nunca llama a Gemini.

    Solo observa operaciones ORM de la aplicación, no SQL directo en Neon ni scripts externos.
    Si se modifica el riesgo, sus filas no vuelven a disparar este cálculo.
    """
    objetos = list(db.new) + list(db.dirty) + list(db.deleted)
    afectados = set()
    referencias = []
    for obj in objetos:
        if isinstance(obj, Proveedor):
            referencias.append(obj)
        elif isinstance(obj, (Documento, Evaluacion, Incidente, Servicio)):
            if obj.proveedor_id is not None:
                afectados.add(obj.proveedor_id)
        elif isinstance(obj, Tarifa) and obj.servicio_id is not None:
            pid = db.scalar(select(Servicio.proveedor_id).where(Servicio.id == obj.servicio_id))
            if pid is not None:
                afectados.add(pid)
    if not referencias and not afectados:
        return
    db.flush()
    afectados.update(p.id for p in referencias if p.id is not None)
    # Evita relaciones precargadas con tarifas/documentos anteriores a los cambios.
    db.expire_all()
    for pid in sorted(afectados):
        existe = db.scalar(select(Proveedor.id).where(Proveedor.id == pid).with_for_update())
        if existe is None:
            continue
        guardar_resultado(db, pid, calcular_para_proveedor(db, pid))
