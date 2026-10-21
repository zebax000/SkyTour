from typing import Literal, Optional

from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models import TipoProveedor
from app.schemas.reporte import FilaRanking
from app.services.reporte_csv import generar_csv
from app.services.reporte_pdf import generar_pdf
from app.services.reportes import ETIQUETA_TIPO, a_filas_legibles, construir_ranking
from app.services.vigencia import hoy

router = APIRouter(prefix='/reportes', tags=['reportes'])

Orden = Literal['calificacion', 'riesgo']
TITULO = {
    'calificacion': 'Ranking de proveedores por calificación',
    'riesgo': 'Ranking de proveedores por riesgo (mayor riesgo primero)',
}


def _descarga(contenido, tipo_mime, nombre):
    return Response(
        content=contenido,
        media_type=tipo_mime,
        headers={
            'Content-Disposition': f'attachment; filename="{nombre}"',
            'X-Content-Type-Options': 'nosniff',
            'Cache-Control': 'private, no-store',
        },
    )


def _subtitulo(tipo, ciudad):
    partes = [f'Generado el {hoy().strftime("%d/%m/%Y")}', 'No incluye proveedores inactivos']
    if tipo is not None:
        partes.append(f'Tipo: {ETIQUETA_TIPO.get(tipo.value, tipo.value)}')
    if ciudad and ciudad.strip():
        partes.append(f'Ciudad: {ciudad.strip()}')
    return ' · '.join(partes)


@router.get('/ranking', response_model=list[FilaRanking], dependencies=[Depends(get_current_user)])
def ranking(
    orden: Orden = 'calificacion',
    tipo: Optional[TipoProveedor] = None,
    ciudad: Optional[str] = None,
    db: Session = Depends(get_db),
):
    return construir_ranking(db, orden, tipo, ciudad)


@router.get('/ranking.csv', dependencies=[Depends(get_current_user)])
def ranking_csv(
    orden: Orden = 'calificacion',
    tipo: Optional[TipoProveedor] = None,
    ciudad: Optional[str] = None,
    db: Session = Depends(get_db),
):
    filas = a_filas_legibles(construir_ranking(db, orden, tipo, ciudad))
    return _descarga(generar_csv(filas), 'text/csv; charset=utf-8', f'ranking_{orden}.csv')


@router.get('/ranking.pdf', dependencies=[Depends(get_current_user)])
def ranking_pdf(
    orden: Orden = 'calificacion',
    tipo: Optional[TipoProveedor] = None,
    ciudad: Optional[str] = None,
    db: Session = Depends(get_db),
):
    filas = a_filas_legibles(construir_ranking(db, orden, tipo, ciudad))
    return _descarga(generar_pdf(filas, TITULO[orden], _subtitulo(tipo, ciudad)), 'application/pdf', f'ranking_{orden}.pdf')
