from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.api.routers.proveedores import admin_o_evaluador
from app.core.database import get_db
from app.models import Proveedor
from app.services import recalculo_automatico  # noqa: F401  registra el evento de sesión
from app.services.explicacion_riesgo import explicar
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
    resultado = _calcular(db, proveedor_id)
    # Abrir la ficha refresca el riesgo guardado, que cambia con el tiempo (por ejemplo, un documento que vence).
    # Solo agrega una fila nueva si el resultado cambió.
    guardar_resultado(db, proveedor_id, resultado)
    db.commit()
    return resultado


@router.post('/proveedores/{proveedor_id}/riesgo/recalcular', dependencies=[Depends(admin_o_evaluador)])
def recalcular(proveedor_id: int, db: Session = Depends(get_db)):
    db.execute(select(Proveedor.id).where(Proveedor.id == proveedor_id).with_for_update())
    resultado = _calcular(db, proveedor_id)
    analisis = guardar_resultado(db, proveedor_id, resultado)
    db.commit()
    return {**resultado, 'analisis_id': analisis.id}


@router.post('/proveedores/{proveedor_id}/riesgo/explicacion', dependencies=[Depends(admin_o_evaluador)])
def generar_explicacion(proveedor_id: int, db: Session = Depends(get_db)):
    resultado = _calcular(db, proveedor_id)
    # Libera la transacción antes de una posible llamada externa lenta.
    db.rollback()
    return {**resultado, **explicar(resultado), 'aviso': 'Sugerencia generada automáticamente: revísala antes de actuar.'}
