from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.api.routers.proveedores import admin_o_evaluador
from app.core.database import get_db
from app.models import Proveedor
from app.services import recalculo_automatico  # noqa: F401  registra el evento de sesión
<<<<<<< HEAD
from app.services.explicacion_riesgo import explicar
from app.services.riesgo_proveedor import calcular_para_proveedor, guardar_resultado

router = APIRouter(tags=['riesgo'])


def _calcular(db, proveedor_id):
    try:
        return calcular_para_proveedor(db, proveedor_id)
=======
from app.services import riesgo_proveedor, explicacion_riesgo

router = APIRouter(tags=['riesgo'])

@router.get("/{proveedor_id}/riesgo/explicacion", dependencies=[Depends(get_current_user)])
def obtener_o_generar_explicacion(proveedor_id: int, db: Session = Depends(get_db)):
    # 1. Obtenemos el último análisis (la transacción de lectura es corta)
    analisis = riesgo_proveedor.obtener_ultimo_analisis(db, proveedor_id)
    if not analisis:
        raise HTTPException(status_code=404, detail="No hay análisis de riesgo")
    
    # 2. Si ya tiene explicación guardada, la devolvemos inmediatamente
    if analisis.explicacion_resumen:
        return {
            "resumen": analisis.explicacion_resumen, 
            "acciones": analisis.explicacion_acciones, 
            "origen": analisis.explicacion_origen
        }
        
    # 3. Si no existe, llamamos a Gemini. 
    explicacion = explicacion_riesgo.generar_explicacion(analisis)
    
    # 4. Solo si Gemini respondió exitosamente, guardamos en la base de datos
    if explicacion.get("origen") == "gemini":
        riesgo_proveedor.guardar_explicacion(db, analisis.id, explicacion)
        
    return explicacion


def _calcular(db, proveedor_id):
    try:
        # Se agrega el prefijo del módulo
        return riesgo_proveedor.calcular_para_proveedor(db, proveedor_id)
>>>>>>> origin/main
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e)) from None
    except ValueError:
        raise HTTPException(status_code=503, detail='Configuración de pesos inválida. Los cinco pesos deben sumar 100.') from None


@router.get('/proveedores/{proveedor_id}/riesgo', dependencies=[Depends(get_current_user)])
def consultar(proveedor_id: int, db: Session = Depends(get_db)):
    resultado = _calcular(db, proveedor_id)
<<<<<<< HEAD
    # Abrir la ficha refresca el riesgo guardado, que cambia con el tiempo (por ejemplo, un documento que vence).
    # Solo agrega una fila nueva si el resultado cambió.
    guardar_resultado(db, proveedor_id, resultado)
=======
    # Se agrega el prefijo del módulo
    riesgo_proveedor.guardar_resultado(db, proveedor_id, resultado)
>>>>>>> origin/main
    db.commit()
    return resultado


@router.post('/proveedores/{proveedor_id}/riesgo/recalcular', dependencies=[Depends(admin_o_evaluador)])
def recalcular(proveedor_id: int, db: Session = Depends(get_db)):
    db.execute(select(Proveedor.id).where(Proveedor.id == proveedor_id).with_for_update())
    resultado = _calcular(db, proveedor_id)
<<<<<<< HEAD
    analisis = guardar_resultado(db, proveedor_id, resultado)
=======
    # Se agrega el prefijo del módulo
    analisis = riesgo_proveedor.guardar_resultado(db, proveedor_id, resultado)
>>>>>>> origin/main
    db.commit()
    return {**resultado, 'analisis_id': analisis.id}


@router.post('/proveedores/{proveedor_id}/riesgo/explicacion', dependencies=[Depends(admin_o_evaluador)])
def generar_explicacion(proveedor_id: int, db: Session = Depends(get_db)):
<<<<<<< HEAD
    resultado = _calcular(db, proveedor_id)
    # Libera la transacción antes de una posible llamada externa lenta.
    db.rollback()
    return {**resultado, **explicar(resultado), 'aviso': 'Sugerencia generada automáticamente: revísala antes de actuar.'}
=======
    # Esta ruta ahora actúa como "Regenerar"
    analisis = riesgo_proveedor.obtener_ultimo_analisis(db, proveedor_id)
    if not analisis:
        raise HTTPException(status_code=404, detail="No hay análisis de riesgo")
    
    # Libera la transacción antes de una posible llamada externa lenta.
    db.rollback()
    
    # Forzamos una nueva generación y la guardamos si es exitosa
    explicacion = explicacion_riesgo.generar_explicacion(analisis)
    if explicacion.get("origen") == "gemini":
        riesgo_proveedor.guardar_explicacion(db, analisis.id, explicacion)
        
    return explicacion
>>>>>>> origin/main
