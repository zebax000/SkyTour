import pytest
from pydantic import ValidationError

from app.schemas.usuario import CambioContrasena, ContrasenaNueva, UsuarioActualizar, UsuarioCrear
from app.services.usuarios import ReglaUsuario, validar_cambio, validar_contrasena, validar_correo

ADMIN, EVAL = "administrador", "evaluador"


# ---------- Correo y contraseña ----------
def test_correo_se_limpia_y_pasa_a_minusculas():
    assert validar_correo("  Ana@Empresa.COM ") == "ana@empresa.com"


@pytest.mark.parametrize("malo", ["", "ana", "ana@", "@x.com", "ana@x", "a na@x.com", "ana@x.c"])
def test_correo_invalido_se_rechaza(malo):
    with pytest.raises(ValueError):
        validar_correo(malo)


def test_contrasena_valida():
    assert validar_contrasena("Clave1234") is None


@pytest.mark.parametrize("mala", ["corta1", "solo letras largas", "12345678"])
def test_contrasena_debil_se_rechaza(mala):
    assert validar_contrasena(mala) is not None


# ---------- Reglas de cambio ----------
def _cambio(**extra):
    base = dict(
        actor_id=1, objetivo_id=2, objetivo_rol=EVAL, objetivo_activo=True,
        nuevo_rol=None, nuevo_activo=None, admins_activos=2,
    )
    base.update(extra)
    validar_cambio(**base)


def test_administrador_puede_desactivar_a_otro():
    _cambio(nuevo_activo=False)


def test_administrador_puede_cambiar_el_rol_de_otro():
    _cambio(nuevo_rol=ADMIN)


def test_no_puede_desactivarse_a_si_mismo():
    with pytest.raises(ReglaUsuario, match="propia cuenta"):
        _cambio(objetivo_id=1, objetivo_rol=ADMIN, nuevo_activo=False)


def test_no_puede_cambiar_su_propio_rol():
    with pytest.raises(ReglaUsuario, match="propio rol"):
        _cambio(objetivo_id=1, objetivo_rol=ADMIN, nuevo_rol=EVAL)


def test_enviar_el_mismo_rol_no_es_un_cambio():
    _cambio(objetivo_id=1, objetivo_rol=ADMIN, nuevo_rol=ADMIN)


def test_no_se_puede_quitar_al_ultimo_administrador():
    with pytest.raises(ReglaUsuario, match="al menos un administrador"):
        _cambio(objetivo_rol=ADMIN, nuevo_activo=False, admins_activos=1)
    with pytest.raises(ReglaUsuario, match="al menos un administrador"):
        _cambio(objetivo_rol=ADMIN, nuevo_rol=EVAL, admins_activos=1)


def test_con_dos_administradores_se_puede_quitar_uno():
    _cambio(objetivo_rol=ADMIN, nuevo_activo=False, admins_activos=2)


def test_reactivar_a_alguien_siempre_se_permite():
    _cambio(objetivo_activo=False, nuevo_activo=True)


# ---------- Esquemas ----------
DATOS = {"nombre": "  Ana   Pérez ", "correo": "ANA@Empresa.com", "rol": "evaluador", "contrasena": "Clave1234"}


def test_crear_usuario_limpia_los_datos():
    u = UsuarioCrear(**DATOS)
    assert (u.nombre, u.correo) == ("Ana Pérez", "ana@empresa.com")


def test_crear_usuario_con_contrasena_debil_se_rechaza():
    with pytest.raises(ValidationError):
        UsuarioCrear(**{**DATOS, "contrasena": "corta"})


def test_crear_usuario_con_rol_desconocido_se_rechaza():
    with pytest.raises(ValidationError):
        UsuarioCrear(**{**DATOS, "rol": "superjefe"})


@pytest.mark.parametrize("campo", ["nombre", "rol", "activo"])
def test_actualizar_no_acepta_nulos(campo):
    with pytest.raises(ValidationError):
        UsuarioActualizar(**{campo: None})


def test_actualizar_solo_trae_lo_enviado():
    assert UsuarioActualizar(activo=False).model_dump(exclude_unset=True) == {"activo": False}


def test_contrasena_nueva_se_valida():
    with pytest.raises(ValidationError):
        ContrasenaNueva(contrasena="abc")
    with pytest.raises(ValidationError):
        CambioContrasena(contrasena_actual="x", contrasena_nueva="sinnumeros")
