from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.api.routers.proveedores import admin_o_evaluador
from app.core.database import get_db
from app.models import Proveedor
from app.services import recalculo_automatico  # noqa: F401  registra el evento de sesión
from app.services.explicacion_riesgo import explicar
from app.services.riesgo_proveedor import (
    calcular_para_proveedor,
    explicacion_guardada,
    guardar_explicacion,
    guardar_resultado,
)

router = APIRouter(tags=['riesgo'])

AVISO = 'Sugerencia generada automáticamente: revísala antes de actuar.'


def _calcular(db, proveedor_id):
    try:
        return calcular_para_proveedor(db, proveedor_id)
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e)) from None
    except ValueError:
        raise HTTPException(status_code=503, detail='Configuración de pesos inválida. Los cinco pesos deben sumar 100.') from None


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


@router.get('/proveedores/{proveedor_id}/riesgo/explicacion', dependencies=[Depends(get_current_user)])
def obtener_explicacion(proveedor_id: int, db: Session = Depends(get_db)):
    """Devuelve la explicación guardada del análisis vigente; si no existe, la genera una vez y la guarda."""
    resultado = _calcular(db, proveedor_id)
    analisis = guardar_resultado(db, proveedor_id, resultado)
    analisis_id = analisis.id
    guardada = explicacion_guardada(analisis)
    # Libera la transacción antes de una posible llamada externa lenta.
    db.commit()
    if guardada is not None:
        return guardada
    explicacion = explicar(resultado)
    # Solo se guarda lo que respondió la IA; el respaldo por reglas se recalcula sin costo.
    if explicacion.get('origen') == 'gemini':
        guardar_explicacion(db, analisis_id, explicacion)
    return explicacion


@router.post('/proveedores/{proveedor_id}/riesgo/explicacion', dependencies=[Depends(admin_o_evaluador)])
def generar_explicacion(proveedor_id: int, db: Session = Depends(get_db)):
    """Regenera la explicación del análisis vigente y devuelve también el cálculo, como antes."""
    resultado = _calcular(db, proveedor_id)
    analisis = guardar_resultado(db, proveedor_id, resultado)
    analisis_id = analisis.id
    db.commit()
    explicacion = explicar(resultado)
    if explicacion.get('origen') == 'gemini':
        guardar_explicacion(db, analisis_id, explicacion)
    return {**resultado, **explicacion, 'aviso': AVISO}
