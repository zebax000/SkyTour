from datetime import UTC, datetime, timedelta
from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from starlette.requests import Request

from app.api.routers import auth
from app.schemas.usuario import RestablecimientoIn
from app.services.limitador import limitador_login


class BaseFalsa:
    def __init__(self, registro=None, usuario=None):
        self.registro = registro
        self.usuario = usuario
        self.consultas = 0
        self.commits = 0

    def scalar(self, consulta):
        self.consultas += 1
        return self.registro

    def get(self, modelo, identificador):
        return self.usuario

    def commit(self):
        self.commits += 1


@pytest.fixture(autouse=True)
def limpiar_limitador():
    limitador_login.vaciar()
    yield
    limitador_login.vaciar()


def peticion(ip, cabeceras=()):
    return Request({
        "type": "http", "method": "POST", "path": "/auth/restablecer-contrasena",
        "headers": list(cabeceras), "client": (ip, 1234),
    })


def datos():
    return RestablecimientoIn(token="a" * 43, contrasena_nueva="NuevaClave123")


def fallar(request, db):
    with pytest.raises(HTTPException) as error:
        auth.restablecer_contrasena_con_token(datos=datos(), request=request, db=db)
    return error.value


def test_cinco_fallos_no_bloquean_otro_origen(monkeypatch):
    db_invalida = BaseFalsa()
    for _ in range(5):
        assert fallar(peticion("192.0.2.1"), db_invalida).status_code == 400
    bloqueo = fallar(peticion("192.0.2.1"), db_invalida)
    assert bloqueo.status_code == 429
    assert int(bloqueo.headers["Retry-After"]) > 0
    assert db_invalida.consultas == 5
    usuario = SimpleNamespace(id=1, activo=True, correo="ana@example.com", contrasena_hash="anterior")
    registro = SimpleNamespace(usuario_id=1, usado_en=None, vence_en=datetime.now(UTC) + timedelta(minutes=30))
    db_valida = BaseFalsa(registro, usuario)
    monkeypatch.setattr(auth, "hash_password", lambda clave: "hash-nuevo")
    respuesta = auth.restablecer_contrasena_con_token(datos=datos(), request=peticion("192.0.2.2"), db=db_valida)
    assert respuesta.status_code == 204
    assert db_valida.commits == 1
    assert usuario.contrasena_hash == "hash-nuevo"
    assert registro.usado_en is not None


def test_cabecera_falsa_no_evade_limite():
    db = BaseFalsa()
    for n in range(5):
        request = peticion("192.0.2.1", [(b"x-forwarded-for", f"198.51.100.{n}".encode())])
        assert fallar(request, db).status_code == 400
    request = peticion("192.0.2.1", [(b"x-forwarded-for", b"203.0.113.99")])
    assert fallar(request, db).status_code == 429


def test_exito_reinicia_contador_del_origen(monkeypatch):
    request = peticion("192.0.2.3")
    for _ in range(4):
        assert fallar(request, BaseFalsa()).status_code == 400
    usuario = SimpleNamespace(id=1, activo=True, correo="ana@example.com", contrasena_hash="anterior")
    registro = SimpleNamespace(usuario_id=1, usado_en=None, vence_en=datetime.now(UTC) + timedelta(minutes=30))
    monkeypatch.setattr(auth, "hash_password", lambda clave: "hash-nuevo")
    assert auth.restablecer_contrasena_con_token(datos=datos(), request=request, db=BaseFalsa(registro, usuario)).status_code == 204
    for _ in range(5):
        assert fallar(request, BaseFalsa()).status_code == 400
    assert fallar(request, BaseFalsa()).status_code == 429
