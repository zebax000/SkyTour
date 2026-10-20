from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import jwt
import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

from app.api.deps import get_current_user, require_roles
from app.core.config import settings
from app.core.security import (
    ALGORITMO,
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)
from app.models import Rol


def test_contrasena_se_guarda_cifrada_y_se_verifica():
    huella = hash_password("Secreta123")
    assert huella != "Secreta123"
    assert verify_password("Secreta123", huella)
    assert not verify_password("otra", huella)


def test_token_ida_y_vuelta():
    token = create_access_token(7, "evaluador")
    datos = decode_access_token(token)
    assert datos["sub"] == "7"
    assert datos["rol"] == "evaluador"


def test_token_vencido_se_rechaza():
    token = create_access_token(7, "evaluador", expires_minutes=-1)
    with pytest.raises(jwt.ExpiredSignatureError):
        decode_access_token(token)


def test_token_alterado_se_rechaza():
    token = create_access_token(7, "evaluador")
    with pytest.raises(jwt.InvalidTokenError):
        decode_access_token(token[:-2] + ("AA" if not token.endswith("AA") else "BB"))


def test_token_firmado_con_otra_clave_se_rechaza():
    ahora = datetime.now(timezone.utc)
    falso = jwt.encode(
        {"sub": "1", "exp": ahora + timedelta(minutes=5)}, "otra-clave-distinta-" * 4, algorithm=ALGORITMO
    )
    with pytest.raises(jwt.InvalidTokenError):
        decode_access_token(falso)


def test_token_con_otro_algoritmo_se_rechaza():
    ahora = datetime.now(timezone.utc)
    otro = jwt.encode({"sub": "1", "exp": ahora + timedelta(minutes=5)}, settings.secret_key, algorithm="HS512")
    with pytest.raises(jwt.InvalidTokenError):
        decode_access_token(otro)


def test_token_sin_vencimiento_se_rechaza():
    sin_exp = jwt.encode({"sub": "1"}, settings.secret_key, algorithm=ALGORITMO)
    with pytest.raises(jwt.InvalidTokenError):
        decode_access_token(sin_exp)


def _app_con_rol(rol_del_usuario: Rol) -> TestClient:
    app = FastAPI()

    @app.get("/solo-admin")
    def solo_admin(usuario=Depends(require_roles(Rol.administrador))):
        return {"ok": True}

    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(rol=rol_del_usuario)
    return TestClient(app)


@pytest.mark.parametrize("rol", [Rol.evaluador, Rol.consultor])
def test_rol_sin_permiso_recibe_403(rol):
    assert _app_con_rol(rol).get("/solo-admin").status_code == 403


def test_rol_con_permiso_recibe_200():
    assert _app_con_rol(Rol.administrador).get("/solo-admin").status_code == 200
