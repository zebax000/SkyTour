from datetime import timedelta
from typing import Literal
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session, undefer

from app.api.deps import get_current_user
from app.api.routers.proveedores import _escapar_like, solo_admin
from app.core.constantes import DIAS_POR_VENCER
from app.core.database import get_db
from app.models import Documento, DocumentoArchivo, Proveedor, Usuario
from app.schemas.documento import (
    DocumentoCambios,
    DocumentoIn,
    DocumentoOut,
    ExtraccionIn,
    ExtraccionOut,
    PaginaDocumentos,
    ResumenDocumentos,
)
from app.services.archivos import ArchivoInvalido, leer_archivo
from app.services.extraccion_documento import extraer_datos
from app.services.vigencia import hoy

router = APIRouter(tags=["documentos"])

EstadoDocumento = Literal["vigente", "por_vencer", "vencido"]


def _condicion_estado(estado: str):
    """Misma regla que estado_documento, expresada para la base de datos."""
    hoy_ = hoy()
    limite = hoy_ + timedelta(days=DIAS_POR_VENCER)
    if estado == "vencido":
        return Documento.fecha_vencimiento < hoy_
    if estado == "por_vencer":
        return and_(Documento.fecha_vencimiento >= hoy_, Documento.fecha_vencimiento <= limite)
    return Documento.fecha_vencimiento > limite


def _invalido(error: ArchivoInvalido) -> HTTPException:
    return HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(error))


def _con_proveedor(documento: Documento, nombre_proveedor: str) -> dict:
    datos = DocumentoOut.model_validate(documento).model_dump()
    datos["proveedor_nombre"] = nombre_proveedor
    return datos


@router.get("/documentos", response_model=PaginaDocumentos, dependencies=[Depends(get_current_user)])
def listar(
    estado: EstadoDocumento | None = None,
    q: str | None = Query(None, description="Busca por proveedor o tipo de documento"),
    pagina: int = Query(1, ge=1),
    tamano: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
):
    filtros = []
    if estado is not None:
        filtros.append(_condicion_estado(estado))
    if q and q.strip():
        patron = f"%{_escapar_like(q.strip())}%"
        filtros.append(or_(Proveedor.nombre.ilike(patron, escape="\\"), Documento.tipo.ilike(patron, escape="\\")))

    union = Proveedor.id == Documento.proveedor_id
    total = db.scalar(select(func.count(Documento.id)).join(Proveedor, union).where(*filtros)) or 0
    filas = db.execute(
        select(Documento, Proveedor.nombre)
        .join(Proveedor, union)
        .where(*filtros)
        .order_by(Documento.fecha_vencimiento, Documento.id)  # lo más urgente primero
        .limit(tamano)
        .offset((pagina - 1) * tamano)
    ).all()
    return {
        "items": [_con_proveedor(documento, nombre) for documento, nombre in filas],
        "total": total,
        "pagina": pagina,
        "tamano": tamano,
    }


@router.get("/documentos/resumen", response_model=ResumenDocumentos, dependencies=[Depends(get_current_user)])
def resumen(db: Session = Depends(get_db)):
    def contar(estado: str) -> int:
        return db.scalar(select(func.count(Documento.id)).where(_condicion_estado(estado))) or 0

    return {"vigentes": contar("vigente"), "por_vencer": contar("por_vencer"), "vencidos": contar("vencido")}


@router.post("/documentos/extraer", response_model=ExtraccionOut)
def extraer(datos: ExtraccionIn, _admin: Usuario = Depends(solo_admin)):
    """Propone el tipo y las fechas leyendo el archivo con IA. No guarda nada ni usa la base de datos:
    la persona revisa y confirma los valores en el formulario."""
    try:
        leido = leer_archivo(datos.archivo.nombre, datos.archivo.contenido_base64)
    except ArchivoInvalido as error:
        raise _invalido(error) from None
    return extraer_datos(leido.datos, leido.tipo_mime)


@router.get(
    "/proveedores/{proveedor_id}/documentos",
    response_model=list[DocumentoOut],
    dependencies=[Depends(get_current_user)],
)
def listar_de_proveedor(proveedor_id: int, db: Session = Depends(get_db)):
    if db.scalar(select(Proveedor.id).where(Proveedor.id == proveedor_id)) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Proveedor no encontrado.")
    return db.scalars(
        select(Documento)
        .where(Documento.proveedor_id == proveedor_id)
        .order_by(Documento.fecha_vencimiento, Documento.id)
    ).all()


@router.post(
    "/proveedores/{proveedor_id}/documentos",
    response_model=DocumentoOut,
    status_code=status.HTTP_201_CREATED,
)
def crear(
    proveedor_id: int,
    datos: DocumentoIn,
    db: Session = Depends(get_db),
    _admin: Usuario = Depends(solo_admin),
):
    if db.scalar(select(Proveedor.id).where(Proveedor.id == proveedor_id)) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Proveedor no encontrado.")
    try:
        leido = leer_archivo(datos.archivo.nombre, datos.archivo.contenido_base64)
    except ArchivoInvalido as error:
        raise _invalido(error) from None

    documento = Documento(
        proveedor_id=proveedor_id,
        tipo=datos.tipo,
        fecha_emision=datos.fecha_emision,
        fecha_vencimiento=datos.fecha_vencimiento,
        archivo=DocumentoArchivo(
            nombre=leido.nombre, tipo_mime=leido.tipo_mime, tamano=len(leido.datos), datos=leido.datos
        ),
    )
    db.add(documento)
    # El riesgo se recalcula solo: services/recalculo_automatico.py reacciona a este commit
    db.commit()
    return documento


@router.patch("/documentos/{documento_id}", response_model=DocumentoOut)
def actualizar(
    documento_id: int,
    datos: DocumentoCambios,
    db: Session = Depends(get_db),
    _admin: Usuario = Depends(solo_admin),
):
    documento = db.get(Documento, documento_id)
    if documento is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Documento no encontrado.")

    cambios = datos.model_dump(exclude_unset=True, exclude={"archivo"})
    emision = cambios.get("fecha_emision", documento.fecha_emision)
    vencimiento = cambios.get("fecha_vencimiento", documento.fecha_vencimiento)
    if vencimiento < emision:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="La fecha de vencimiento no puede ser anterior a la de emisión.",
        )
    leido = None
    if datos.archivo is not None:
        try:
            leido = leer_archivo(datos.archivo.nombre, datos.archivo.contenido_base64)
        except ArchivoInvalido as error:
            raise _invalido(error) from None

    for campo, valor in cambios.items():
        setattr(documento, campo, valor)
    if leido is not None:
        if documento.archivo is None:
            documento.archivo = DocumentoArchivo(
                nombre=leido.nombre, tipo_mime=leido.tipo_mime, tamano=len(leido.datos), datos=leido.datos
            )
        else:
            documento.archivo.nombre = leido.nombre
            documento.archivo.tipo_mime = leido.tipo_mime
            documento.archivo.tamano = len(leido.datos)
            documento.archivo.datos = leido.datos
    db.commit()
    return documento


@router.delete("/documentos/{documento_id}", status_code=status.HTTP_204_NO_CONTENT)
def quitar(documento_id: int, db: Session = Depends(get_db), _admin: Usuario = Depends(solo_admin)):
    documento = db.get(Documento, documento_id)
    if documento is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Documento no encontrado.")
    db.delete(documento)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/documentos/{documento_id}/archivo", dependencies=[Depends(get_current_user)])
def descargar(documento_id: int, db: Session = Depends(get_db)):
    archivo = db.scalar(
        select(DocumentoArchivo)
        .where(DocumentoArchivo.documento_id == documento_id)
        .options(undefer(DocumentoArchivo.datos))
    )
    if archivo is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="El documento no tiene archivo.")
    return Response(
        content=bytes(archivo.datos),
        media_type=archivo.tipo_mime,
        headers={
            "Content-Disposition": f"inline; filename*=UTF-8''{quote(archivo.nombre)}",
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "private, no-store",
        },
    )
