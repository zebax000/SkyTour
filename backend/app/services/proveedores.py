from app.models import EstadoProveedor, Rol

_LIBRES = {EstadoProveedor.activo, EstadoProveedor.en_seguimiento}


def puede_cambiar_estado(rol: Rol, actual: EstadoProveedor, nuevo: EstadoProveedor) -> bool:
    """El administrador cambia cualquier estado. El evaluador solo marca o quita 'en seguimiento'.
    Suspender, inactivar y reactivar es solo del administrador. El consultor no cambia nada."""
    if rol == Rol.administrador:
        return True
    if rol == Rol.evaluador:
        return actual in _LIBRES and nuevo in _LIBRES
    return False
