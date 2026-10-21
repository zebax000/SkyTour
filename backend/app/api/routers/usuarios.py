
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.core.database import get_db
from app.core.security import hash_password
from app.models import Rol, Usuario
from app.schemas.usuario import (
    ContrasenaNueva,
    PaginaUsuarios,
    UsuarioActualizar,
    UsuarioAdminOut,
    UsuarioCrear,
)
from app.services.limitador import limitador_login
from app.services.usuarios import ReglaUsuario, validar_cambio

# Administración de usuarios: solo el administrador. Los usuarios no se borran (las evaluaciones,
# incidentes y observaciones los referencian): se desactivan, y un usuario desactivado pierde el acceso
# de inmediato porque get_current_user revisa la base en cada petición.
router = APIRouter(prefix="/usuarios", tags=["usuarios"])
solo_admin = require_roles(Rol.administrador)


def _patron(texto: str) -> str:
    """Convierte lo que escribe el administrador en un patrón LIKE sin que % o _ tengan efecto especial."""
    limpio = texto.strip().lower().replace("!", "!!").replace("%", "!%").replace("_", "!_")
    return f"%{limpio}%"


def _o_404(db: Session, usuario_id: int) -> Usuario:
    usuario = db.get(Usuario, usuario_id)
    if usuario is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado.")
    return usuario


@router.get("", response_model=PaginaUsuarios)
def listar(
    q: str = Query("", max_length=100),
    rol: Rol | None = None,
    activo: bool | None = None,
    pagina: int = Query(1, ge=1),
    tamano: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    _admin: Usuario = Depends(solo_admin),
):
    consulta = select(Usuario)
    if q.strip():
        patron = _patron(q)
        consulta = consulta.where(
            or_(func.lower(Usuario.nombre).like(patron, escape="!"), func.lower(Usuario.correo).like(patron, escape="!"))
        )
    if rol is not None:
        consulta = consulta.where(Usuario.rol == rol)
    if activo is not None:
        consulta = consulta.where(Usuario.activo.is_(activo))
    total = db.scalar(select(func.count()).select_from(consulta.subquery())) or 0
    items = db.scalars(
        consulta.order_by(func.lower(Usuario.nombre), Usuario.id).offset((pagina - 1) * tamano).limit(tamano)
    ).all()
    return {"items": items, "total": total, "pagina": pagina, "tamano": tamano}


@router.post("", response_model=UsuarioAdminOut, status_code=status.HTTP_201_CREATED)
def crear(datos: UsuarioCrear, db: Session = Depends(get_db), _admin: Usuario = Depends(solo_admin)):
    ocupado = db.scalar(select(Usuario.id).where(func.lower(Usuario.correo) == datos.correo))
    if ocupado is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ya existe un usuario con ese correo.")
    usuario = Usuario(
        nombre=datos.nombre,
        correo=datos.correo,
        contrasena_hash=hash_password(datos.contrasena),
        rol=datos.rol,
    )
    db.add(usuario)
    try:
        db.commit()
    except IntegrityError:  # dos administradores crearon el mismo correo a la vez
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ya existe un usuario con ese correo.") from None
    db.refresh(usuario)
    return usuario


@router.patch("/{usuario_id}", response_model=UsuarioAdminOut)
def actualizar(
    usuario_id: int,
    cambios: UsuarioActualizar,
    db: Session = Depends(get_db),
    admin: Usuario = Depends(solo_admin),
):
    usuario = _o_404(db, usuario_id)
    datos = cambios.model_dump(exclude_unset=True)
    # Se bloquean las filas de los administradores activos mientras se decide, para que dos cambios
    # simultáneos no dejen la aplicación sin administrador.
    admins_activos = len(
        db.scalars(
            select(Usuario.id).where(Usuario.rol == Rol.administrador, Usuario.activo.is_(True)).with_for_update()
        ).all()
    )
    try:
        validar_cambio(
            actor_id=admin.id,
            objetivo_id=usuario.id,
            objetivo_rol=usuario.rol,
            objetivo_activo=usuario.activo,
            nuevo_rol=datos.get("rol"),
            nuevo_activo=datos.get("activo"),
            admins_activos=admins_activos,
        )
    except ReglaUsuario as error:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(error)) from None
    for campo, valor in datos.items():
        setattr(usuario, campo, valor)
    db.commit()
    db.refresh(usuario)
    return usuario


@router.post("/{usuario_id}/contrasena", status_code=status.HTTP_204_NO_CONTENT)
def restablecer_contrasena(
    usuario_id: int,
    datos: ContrasenaNueva,
    db: Session = Depends(get_db),
    _admin: Usuario = Depends(solo_admin),
):
    usuario = _o_404(db, usuario_id)
    usuario.contrasena_hash = hash_password(datos.contrasena)
    db.commit()
    limitador_login.reiniciar(usuario.correo)  # si estaba bloqueado por intentos fallidos, queda libre
    return Response(status_code=status.HTTP_204_NO_CONTENT)
