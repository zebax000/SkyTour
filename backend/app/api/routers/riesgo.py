from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.api.routers.proveedores import admin_o_evaluador
from app.core.database import get_db
from app.services.riesgo_proveedor import calcular_para_proveedor, guardar_resultado

router = APIRouter(tags=['riesgo'])


def _calcular(db, proveedor_id):
    try:
        return calcular_para_proveedor(db, proveedor_id)
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError:
        raise HTTPException(status_code=503, detail='Configuración de pesos inválida. Los cinco pesos deben sumar 100.')


@router.get('/proveedores/{proveedor_id}/riesgo', dependencies=[Depends(get_current_user)])
def consultar(proveedor_id: int, db: Session = Depends(get_db)):
    # Consulta siempre datos actuales sin generar escrituras ni llamadas a Gemini.
    return _calcular(db, proveedor_id)


@router.post('/proveedores/{proveedor_id}/riesgo/recalcular', dependencies=[Depends(admin_o_evaluador)])
def recalcular(proveedor_id: int, db: Session = Depends(get_db)):
    # El bloqueo se toma antes de leer para evitar guardar resultados simultáneos desactualizados.
    from sqlalchemy import select
    from app.models import Proveedor
    db.execute(select(Proveedor.id).where(Proveedor.id == proveedor_id).with_for_update())
    resultado = _calcular(db, proveedor_id)
    analisis = guardar_resultado(db, proveedor_id, resultado)
    db.commit()
    return {**resultado, 'analisis_id': analisis.id}
