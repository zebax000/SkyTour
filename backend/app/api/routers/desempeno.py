from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.api.routers.proveedores import _escapar_like, admin_o_evaluador
from app.core.constantes import EVALUACIONES_PARA_PROMEDIO
from app.core.database import get_db
from app.models import (
    EstadoProveedor,
    Evaluacion,
    Gravedad,
    Incidente,
    Observacion,
    Proveedor,
    TipoIncidente,
    Usuario,
)
from app.schemas.desempeno import (
    CierreIn,
    EvaluacionesDeProveedor,
    EvaluacionIn,
    EvaluacionOut,
    IncidenteIn,
    IncidenteOut,
    ObservacionIn,
    ObservacionOut,
    PaginaEvaluaciones,
    PaginaIncidentes,
    ProveedorAtencion,
)
from app.schemas.proveedor import ProveedorResumen
from app.services.calificacion import promedio_ultimas, suma_criterios

# Evaluaciones, incidentes y observaciones. Registrar: administrador y evaluador. Consultar: cualquier usuario con sesión.
router = APIRouter(tags=["desempeno"])

LIMITE_HISTORIAL = 100


def _fila(objeto, **extra) -> dict:
    datos = {columna.name: getattr(objeto, columna.name) for columna in objeto.__table__.columns}
    datos.update(extra)
    return datos


def _verificar_proveedor(db: Session, proveedor_id: int) -> None:
    if db.scalar(select(Proveedor.id).where(Proveedor.id == proveedor_id)) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Proveedor no encontrado.")


def _filtro_proveedor(q: Optional[str]):
    if q and q.strip():
        return Proveedor.nombre.ilike(f"%{_escapar_like(q.strip())}%", escape="\\")
    return None


# ---------- Evaluaciones ----------
@router.get(
    "/proveedores/{proveedor_id}/evaluaciones",
    response_model=EvaluacionesDeProveedor,
    dependencies=[Depends(get_current_user)],
)
def evaluaciones_de_proveedor(proveedor_id: int, db: Session = Depends(get_db)):
    _verificar_proveedor(db, proveedor_id)
    filas = db.execute(
        select(Evaluacion, Usuario.nombre)
        .join(Usuario, Usuario.id == Evaluacion.evaluador_id)
        .where(Evaluacion.proveedor_id == proveedor_id)
        .order_by(Evaluacion.fecha.desc(), Evaluacion.id.desc())
        .limit(LIMITE_HISTORIAL)
    ).all()
    total = db.scalar(select(func.count(Evaluacion.id)).where(Evaluacion.proveedor_id == proveedor_id)) or 0
    sumas = [suma_criterios(e.calidad, e.puntualidad, e.cumplimiento, e.precio) for e, _ in filas]
    return {
        "promedio": promedio_ultimas(sumas),
        "en_promedio": min(len(sumas), EVALUACIONES_PARA_PROMEDIO),
        "total": total,
        "items": [_fila(e, evaluador_nombre=nombre) for e, nombre in filas],
    }


@router.post(
    "/proveedores/{proveedor_id}/evaluaciones",
    response_model=EvaluacionOut,
    status_code=status.HTTP_201_CREATED,
)
def evaluar(
    proveedor_id: int,
    datos: EvaluacionIn,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(admin_o_evaluador),
):
    _verificar_proveedor(db, proveedor_id)
    evaluacion = Evaluacion(
        proveedor_id=proveedor_id,
        evaluador_id=usuario.id,
        calidad=datos.calidad,
        puntualidad=datos.puntualidad,
        cumplimiento=datos.cumplimiento,
        precio=datos.precio,
        comentario=datos.comentario,
    )
    db.add(evaluacion)
    db.commit()
    db.refresh(evaluacion)
    # TODO(ia): recalcular el riesgo del proveedor al registrar una evaluación (fase 7)
    return _fila(evaluacion, evaluador_nombre=usuario.nombre)


@router.get("/evaluaciones", response_model=PaginaEvaluaciones, dependencies=[Depends(get_current_user)])
def listar_evaluaciones(
    q: Optional[str] = Query(None, description="Busca por proveedor"),
    pagina: int = Query(1, ge=1),
    tamano: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
):
    filtros = [f for f in (_filtro_proveedor(q),) if f is not None]
    total = (
        db.scalar(
            select(func.count(Evaluacion.id)).join(Proveedor, Proveedor.id == Evaluacion.proveedor_id).where(*filtros)
        )
        or 0
    )
    filas = db.execute(
        select(Evaluacion, Usuario.nombre, Proveedor.nombre)
        .join(Usuario, Usuario.id == Evaluacion.evaluador_id)
        .join(Proveedor, Proveedor.id == Evaluacion.proveedor_id)
        .where(*filtros)
        .order_by(Evaluacion.fecha.desc(), Evaluacion.id.desc())
        .limit(tamano)
        .offset((pagina - 1) * tamano)
    ).all()
    items = [_fila(e, evaluador_nombre=evaluador, proveedor_nombre=proveedor) for e, evaluador, proveedor in filas]
    return {"items": items, "total": total, "pagina": pagina, "tamano": tamano}


# ---------- Incidentes e incumplimientos ----------
@router.get(
    "/proveedores/{proveedor_id}/incidentes",
    response_model=list[IncidenteOut],
    dependencies=[Depends(get_current_user)],
)
def incidentes_de_proveedor(proveedor_id: int, db: Session = Depends(get_db)):
    _verificar_proveedor(db, proveedor_id)
    filas = db.execute(
        select(Incidente, Usuario.nombre)
        .join(Usuario, Usuario.id == Incidente.registrado_por)
        .where(Incidente.proveedor_id == proveedor_id)
        .order_by(Incidente.resuelto, Incidente.fecha.desc(), Incidente.id.desc())  # abiertos primero
        .limit(LIMITE_HISTORIAL)
    ).all()
    return [_fila(i, registrado_por_nombre=nombre) for i, nombre in filas]


@router.post(
    "/proveedores/{proveedor_id}/incidentes",
    response_model=IncidenteOut,
    status_code=status.HTTP_201_CREATED,
)
def registrar_incidente(
    proveedor_id: int,
    datos: IncidenteIn,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(admin_o_evaluador),
):
    _verificar_proveedor(db, proveedor_id)
    incidente = Incidente(
        proveedor_id=proveedor_id,
        registrado_por=usuario.id,
        tipo=datos.tipo,
        gravedad=datos.gravedad,
        descripcion=datos.descripcion,
    )
    db.add(incidente)
    db.commit()
    db.refresh(incidente)
    # TODO(ia): recalcular el riesgo del proveedor al registrar un incidente o incumplimiento (fase 7)
    return _fila(incidente, registrado_por_nombre=usuario.nombre)


@router.patch("/incidentes/{incidente_id}/cierre", response_model=IncidenteOut)
def resolver_incidente(
    incidente_id: int,
    datos: CierreIn,
    db: Session = Depends(get_db),
    _usuario: Usuario = Depends(admin_o_evaluador),
):
    incidente = db.get(Incidente, incidente_id)
    if incidente is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incidente no encontrado.")
    if incidente.resuelto:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="El incidente ya está resuelto.")
    incidente.resuelto = True
    incidente.fecha_cierre = datetime.now(timezone.utc)
    incidente.comentario_cierre = datos.comentario
    db.commit()
    nombre = db.scalar(select(Usuario.nombre).where(Usuario.id == incidente.registrado_por)) or ""
    # TODO(ia): recalcular el riesgo del proveedor al resolver un incidente (fase 7)
    return _fila(incidente, registrado_por_nombre=nombre)


@router.get("/incidentes", response_model=PaginaIncidentes, dependencies=[Depends(get_current_user)])
def listar_incidentes(
    tipo: Optional[TipoIncidente] = None,
    gravedad: Optional[Gravedad] = None,
    resuelto: Optional[bool] = None,
    q: Optional[str] = Query(None, description="Busca por proveedor"),
    pagina: int = Query(1, ge=1),
    tamano: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
):
    filtros = []
    if tipo is not None:
        filtros.append(Incidente.tipo == tipo)
    if gravedad is not None:
        filtros.append(Incidente.gravedad == gravedad)
    if resuelto is not None:
        filtros.append(Incidente.resuelto.is_(resuelto))
    por_proveedor = _filtro_proveedor(q)
    if por_proveedor is not None:
        filtros.append(por_proveedor)

    total = (
        db.scalar(
            select(func.count(Incidente.id)).join(Proveedor, Proveedor.id == Incidente.proveedor_id).where(*filtros)
        )
        or 0
    )
    filas = db.execute(
        select(Incidente, Usuario.nombre, Proveedor.nombre)
        .join(Usuario, Usuario.id == Incidente.registrado_por)
        .join(Proveedor, Proveedor.id == Incidente.proveedor_id)
        .where(*filtros)
        .order_by(Incidente.resuelto, Incidente.fecha.desc(), Incidente.id.desc())
        .limit(tamano)
        .offset((pagina - 1) * tamano)
    ).all()
    items = [_fila(i, registrado_por_nombre=autor, proveedor_nombre=proveedor) for i, autor, proveedor in filas]
    return {"items": items, "total": total, "pagina": pagina, "tamano": tamano}


# ---------- Observaciones (bitácora) ----------
@router.get(
    "/proveedores/{proveedor_id}/observaciones",
    response_model=list[ObservacionOut],
    dependencies=[Depends(get_current_user)],
)
def observaciones_de_proveedor(proveedor_id: int, db: Session = Depends(get_db)):
    _verificar_proveedor(db, proveedor_id)
    filas = db.execute(
        select(Observacion, Usuario.nombre)
        .join(Usuario, Usuario.id == Observacion.autor_id)
        .where(Observacion.proveedor_id == proveedor_id)
        .order_by(Observacion.fecha.desc(), Observacion.id.desc())
        .limit(LIMITE_HISTORIAL)
    ).all()
    return [_fila(o, autor_nombre=nombre) for o, nombre in filas]


@router.post(
    "/proveedores/{proveedor_id}/observaciones",
    response_model=ObservacionOut,
    status_code=status.HTTP_201_CREATED,
)
def agregar_observacion(
    proveedor_id: int,
    datos: ObservacionIn,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(admin_o_evaluador),
):
    _verificar_proveedor(db, proveedor_id)
    observacion = Observacion(proveedor_id=proveedor_id, autor_id=usuario.id, texto=datos.texto)
    db.add(observacion)
    db.commit()
    db.refresh(observacion)
    return _fila(observacion, autor_nombre=usuario.nombre)


# ---------- Lista de atención ----------
# Ruta propia (/atencion) para no chocar con /proveedores/{proveedor_id}
@router.get("/atencion", response_model=list[ProveedorAtencion], dependencies=[Depends(get_current_user)])
def lista_de_atencion(db: Session = Depends(get_db)):
    """Proveedores que requieren atención. Por ahora: los marcados "En seguimiento".
    TODO(ia): sumar los de riesgo alto cuando exista el cálculo de riesgo (fase 7)."""
    abiertos = (
        select(func.count(Incidente.id))
        .where(Incidente.proveedor_id == Proveedor.id, Incidente.resuelto.is_(False))
        .correlate(Proveedor)
        .scalar_subquery()
    )
    filas = db.execute(
        select(Proveedor, abiertos.label("abiertos"))
        .where(Proveedor.estado == EstadoProveedor.en_seguimiento)
        .order_by(abiertos.desc(), Proveedor.nombre)
    ).all()
    return [{**ProveedorResumen.model_validate(p).model_dump(), "incidentes_abiertos": n} for p, n in filas]
