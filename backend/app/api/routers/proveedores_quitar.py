from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.routers.proveedores import solo_admin
from app.core.database import get_db
from app.models import Servicio, Tarifa, Usuario

# Quitar servicios y tarifas (solo administrador). Las zonas se quitan en el router de proveedores.
router = APIRouter(prefix="/proveedores", tags=["proveedores"])


@router.delete("/{proveedor_id}/servicios/{servicio_id}", status_code=status.HTTP_204_NO_CONTENT)
def quitar_servicio(
    proveedor_id: int,
    servicio_id: int,
    db: Session = Depends(get_db),
    _admin: Usuario = Depends(solo_admin),
):
    servicio = db.scalar(select(Servicio).where(Servicio.id == servicio_id, Servicio.proveedor_id == proveedor_id))
    if servicio is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Servicio no encontrado.")
    # Sus tarifas se borran con él (la base lo hace en cascada)
    db.delete(servicio)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete(
    "/{proveedor_id}/servicios/{servicio_id}/tarifas/{tarifa_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def quitar_tarifa(
    proveedor_id: int,
    servicio_id: int,
    tarifa_id: int,
    db: Session = Depends(get_db),
    _admin: Usuario = Depends(solo_admin),
):
    tarifa = db.scalar(
        select(Tarifa)
        .join(Servicio, Servicio.id == Tarifa.servicio_id)
        .where(Tarifa.id == tarifa_id, Servicio.id == servicio_id, Servicio.proveedor_id == proveedor_id)
    )
    if tarifa is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tarifa no encontrada.")
    db.delete(tarifa)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
