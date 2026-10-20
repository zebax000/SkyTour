from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_user, require_roles
from app.core.database import get_db
from app.models import (
    EstadoProveedor,
    NivelRiesgo,
    Proveedor,
    Rol,
    Servicio,
    Tarifa,
    TipoProveedor,
    Usuario,
    ZonaCobertura,
)
from app.schemas.proveedor import (
    EstadoIn,
    PaginaProveedores,
    ProveedorDetalle,
    ProveedorIn,
    ProveedorResumen,
    ProveedorUpdate,
    ServicioIn,
    ServicioOut,
    TarifaIn,
    TarifaOut,
    ZonaIn,
    ZonaOut,
)
from app.services.proveedores import puede_cambiar_estado
from app.services.riesgo_lista import asegurar_analisis, con_nivel, riesgo_de

router = APIRouter(prefix="/proveedores", tags=["proveedores"])

# Permisos (se validan aquí, en el servidor; ocultar botones en la pantalla no es seguridad)
solo_admin = require_roles(Rol.administrador)
admin_o_evaluador = require_roles(Rol.administrador, Rol.evaluador)


def _escapar_like(texto: str) -> str:
    return texto.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def _cargar(db: Session, proveedor_id: int) -> Proveedor:
    proveedor = db.scalar(
        select(Proveedor)
        .where(Proveedor.id == proveedor_id)
        .options(selectinload(Proveedor.servicios).selectinload(Servicio.tarifas), selectinload(Proveedor.zonas))
    )
    if proveedor is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Proveedor no encontrado.")
    return proveedor


def _nit_en_uso(db: Session, nit: str, excepto_id: Optional[int] = None) -> bool:
    consulta = select(Proveedor.id).where(Proveedor.nit == nit)
    if excepto_id is not None:
        consulta = consulta.where(Proveedor.id != excepto_id)
    return db.scalar(consulta) is not None


def _confirmar(db: Session) -> None:
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ya existe un registro con esos datos.")


@router.get("", response_model=PaginaProveedores, dependencies=[Depends(get_current_user)])
def listar(
    q: Optional[str] = Query(None, description="Busca por nombre o NIT"),
    tipo: Optional[TipoProveedor] = None,
    ciudad: Optional[str] = None,
    estado: Optional[EstadoProveedor] = None,
    riesgo: Optional[NivelRiesgo] = None,
    pagina: int = Query(1, ge=1),
    tamano: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    consulta = select(Proveedor)
    if q and q.strip():
        patron = f"%{_escapar_like(q.strip())}%"
        consulta = consulta.where(or_(Proveedor.nombre.ilike(patron, escape="\\"), Proveedor.nit.ilike(patron, escape="\\")))
    if tipo is not None:
        consulta = consulta.where(Proveedor.tipo == tipo)
    if ciudad and ciudad.strip():
        consulta = consulta.where(func.lower(Proveedor.ciudad) == ciudad.strip().lower())
    if estado is not None:
        consulta = consulta.where(Proveedor.estado == estado)
    if riesgo is not None:
        # Para filtrar hace falta el riesgo de todos: se calcula una sola vez a quien aún no lo tiene
        asegurar_analisis(db)
        consulta = consulta.where(con_nivel(riesgo))

    total = db.scalar(select(func.count()).select_from(consulta.subquery())) or 0
    filas = db.scalars(consulta.order_by(Proveedor.nombre).limit(tamano).offset((pagina - 1) * tamano)).all()

    ids = [p.id for p in filas]
    asegurar_analisis(db, ids)
    por_proveedor = riesgo_de(db, ids)
    items = []
    for p in filas:
        puntaje, nivel = por_proveedor.get(p.id, (None, None))
        items.append({**ProveedorResumen.model_validate(p).model_dump(), "riesgo_nivel": nivel, "riesgo_puntaje": puntaje})
    return {"items": items, "total": total, "pagina": pagina, "tamano": tamano}


@router.get("/ciudades", response_model=list[str], dependencies=[Depends(get_current_user)])
def ciudades(db: Session = Depends(get_db)):
    """Ciudades con proveedores, para el filtro de la lista."""
    return list(db.scalars(select(Proveedor.ciudad).distinct().order_by(Proveedor.ciudad)))


@router.get("/{proveedor_id}", response_model=ProveedorDetalle, dependencies=[Depends(get_current_user)])
def detalle(proveedor_id: int, db: Session = Depends(get_db)):
    return _cargar(db, proveedor_id)


@router.post("", response_model=ProveedorDetalle, status_code=status.HTTP_201_CREATED)
def crear(datos: ProveedorIn, db: Session = Depends(get_db), _admin: Usuario = Depends(solo_admin)):
    if _nit_en_uso(db, datos.nit):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ya existe un proveedor con ese NIT.")
    proveedor = Proveedor(
        nombre=datos.nombre,
        nit=datos.nit,
        tipo=datos.tipo,
        ciudad=datos.ciudad,
        contacto_nombre=datos.contacto_nombre,
        contacto_correo=datos.contacto_correo,
        contacto_telefono=datos.contacto_telefono,
        servicios=[
            Servicio(
                nombre=s.nombre,
                descripcion=s.descripcion,
                tarifas=[Tarifa(**t.model_dump()) for t in s.tarifas],
            )
            for s in datos.servicios
        ],
        zonas=[ZonaCobertura(ciudad_o_region=z) for z in datos.zonas],
    )
    db.add(proveedor)
    # El riesgo inicial se calcula solo: services/recalculo_automatico.py reacciona a este commit
    _confirmar(db)
    return _cargar(db, proveedor.id)


@router.patch("/{proveedor_id}", response_model=ProveedorDetalle)
def actualizar(
    proveedor_id: int,
    datos: ProveedorUpdate,
    db: Session = Depends(get_db),
    _admin: Usuario = Depends(solo_admin),
):
    proveedor = _cargar(db, proveedor_id)
    cambios = datos.model_dump(exclude_unset=True)
    if "nit" in cambios and _nit_en_uso(db, cambios["nit"], excepto_id=proveedor.id):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ya existe un proveedor con ese NIT.")
    for campo, valor in cambios.items():
        setattr(proveedor, campo, valor)
    _confirmar(db)
    return _cargar(db, proveedor.id)


@router.patch("/{proveedor_id}/estado", response_model=ProveedorDetalle)
def cambiar_estado(
    proveedor_id: int,
    datos: EstadoIn,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(admin_o_evaluador),
):
    proveedor = _cargar(db, proveedor_id)
    if not puede_cambiar_estado(usuario.rol, proveedor.estado, datos.estado):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo el administrador puede suspender, inactivar o reactivar un proveedor.",
        )
    proveedor.estado = datos.estado
    _confirmar(db)
    return _cargar(db, proveedor.id)


@router.post("/{proveedor_id}/servicios", response_model=ServicioOut, status_code=status.HTTP_201_CREATED)
def agregar_servicio(
    proveedor_id: int,
    datos: ServicioIn,
    db: Session = Depends(get_db),
    _admin: Usuario = Depends(solo_admin),
):
    proveedor = _cargar(db, proveedor_id)
    servicio = Servicio(
        proveedor_id=proveedor.id,
        nombre=datos.nombre,
        descripcion=datos.descripcion,
        tarifas=[Tarifa(**t.model_dump()) for t in datos.tarifas],
    )
    db.add(servicio)
    # Un servicio nuevo sin tarifa vigente suma riesgo: el recálculo automático lo detecta en este commit
    _confirmar(db)
    return servicio


@router.post(
    "/{proveedor_id}/servicios/{servicio_id}/tarifas",
    response_model=TarifaOut,
    status_code=status.HTTP_201_CREATED,
)
def agregar_tarifa(
    proveedor_id: int,
    servicio_id: int,
    datos: TarifaIn,
    db: Session = Depends(get_db),
    _admin: Usuario = Depends(solo_admin),
):
    servicio = db.scalar(select(Servicio).where(Servicio.id == servicio_id, Servicio.proveedor_id == proveedor_id))
    if servicio is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Servicio no encontrado en ese proveedor.")
    # Las tarifas anteriores no se borran: quedan como historial
    tarifa = Tarifa(servicio_id=servicio.id, **datos.model_dump())
    db.add(tarifa)
    _confirmar(db)
    return tarifa


@router.post("/{proveedor_id}/zonas", response_model=ZonaOut, status_code=status.HTTP_201_CREATED)
def agregar_zona(
    proveedor_id: int,
    datos: ZonaIn,
    db: Session = Depends(get_db),
    _admin: Usuario = Depends(solo_admin),
):
    proveedor = _cargar(db, proveedor_id)
    repetida = db.scalar(
        select(ZonaCobertura.id).where(
            ZonaCobertura.proveedor_id == proveedor.id,
            func.lower(ZonaCobertura.ciudad_o_region) == datos.ciudad_o_region.lower(),
        )
    )
    if repetida is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Esa zona ya está registrada.")
    zona = ZonaCobertura(proveedor_id=proveedor.id, ciudad_o_region=datos.ciudad_o_region)
    db.add(zona)
    _confirmar(db)
    return zona


@router.delete("/{proveedor_id}/zonas/{zona_id}", status_code=status.HTTP_204_NO_CONTENT)
def quitar_zona(
    proveedor_id: int,
    zona_id: int,
    db: Session = Depends(get_db),
    _admin: Usuario = Depends(solo_admin),
):
    zona = db.scalar(select(ZonaCobertura).where(ZonaCobertura.id == zona_id, ZonaCobertura.proveedor_id == proveedor_id))
    if zona is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Zona no encontrada.")
    db.delete(zona)
    _confirmar(db)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# TODO(backend): editar y quitar servicios y tarifas; el proveedor se inactiva, nunca se elimina.
