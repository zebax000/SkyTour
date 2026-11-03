from datetime import UTC, datetime, timedelta
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from app.api.routers import auth as ruta_auth
from app.core.database import get_db
from app.core.security import hash_password, verify_password
from app.main import app
from app.models import Rol
from app.services import restablecimiento as sr
from app.services.correo import construir_mensaje_restablecimiento
from app.services.limitador import limitador_login


class BaseRestablecimientoFalsa:
    def __init__(self, usuarios=None):
        self.usuarios = list(usuarios or [])
        self.tokens = []
        self.commits = 0
        self._seq = 1

    def scalar(self, consulta):
        texto = str(consulta).lower()
        if "from usuario" in texto:
            # Busca por correo
            for u in self.usuarios:
                if u.correo.lower() == self._ultimo_correo:
                    return u
            return None
        if "from restablecimiento_contrasena" in texto:
            for t in self.tokens:
                if t.token_hash == self._ultimo_hash:
                    return t
            return None
        return None

    def scalars(self, _consulta):
        return [
            t
            for t in self.tokens
            if t.usuario_id == self._ultimo_usuario_id and t.usado_en is None
        ]

    def add(self, obj):
        if getattr(obj, "id", None) is None:
            obj.id = self._seq
            self._seq += 1
        self.tokens.append(obj)

    def get(self, _modelo, ident):
        for u in self.usuarios:
            if u.id == ident:
                return u
        return None

    def commit(self):
        self.commits += 1


@pytest.fixture(autouse=True)
def limpiar():
    limitador_login.vaciar()
    yield
    app.dependency_overrides.clear()
    limitador_login.vaciar()


def test_generar_token_y_hash_sha256_nunca_iguales():
    t1 = sr.generar_token()
    t2 = sr.generar_token()
    assert t1 != t2
    assert len(t1) >= 40
    h1 = sr.hash_token(t1)
    assert len(h1) == 64
    assert h1 != t1
    assert sr.hash_token(t1) == h1


def test_vencimiento_y_un_solo_uso_puros():
    ahora = datetime(2026, 11, 2, 12, 0, tzinfo=UTC)
    vence = sr.calcular_vencimiento(ahora=ahora, minutos=30)
    registro = SimpleNamespace(vence_en=vence, usado_en=None)
    assert sr.puede_usarse(registro, ahora=ahora + timedelta(minutes=29)) is True
    assert sr.puede_usarse(registro, ahora=ahora + timedelta(minutes=31)) is False

    usado = SimpleNamespace(vence_en=vence, usado_en=ahora + timedelta(minutes=5))
    assert sr.puede_usarse(usado, ahora=ahora + timedelta(minutes=10)) is False
    assert sr.puede_usarse(None, ahora=ahora) is False


def test_plantilla_correo_en_espanol_con_vigencia_y_aviso():
    enlace = sr.construir_enlace_restablecimiento("https://skytour.vercel.app/", "tok123")
    assert enlace == "https://skytour.vercel.app/restablecer-contrasena?token=tok123"
    asunto, texto, html_cuerpo = construir_mensaje_restablecimiento("Ana", enlace, minutos=30)
    assert "SkyTour" in asunto
    assert "30 minutos" in texto
    assert "Si no fuiste tú, ignora este mensaje" in texto
    assert enlace in texto and enlace in html_cuerpo


def _preparar_cliente(usuarios):
    db = BaseRestablecimientoFalsa(usuarios)
    enviados = []

    def enviar_falso(correo, nombre, enlace, minutos):
        enviados.append({"correo": correo, "nombre": nombre, "enlace": enlace, "minutos": minutos})
        return True

    def override_db():
        yield db

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[ruta_auth.get_enviador_correo] = lambda: enviar_falso
    return TestClient(app), db, enviados


def test_respuesta_identica_exista_o_no_el_correo_y_usuario_inactivo():
    activo = SimpleNamespace(
        id=1,
        nombre="Ana Activa",
        correo="ana@empresa.com",
        contrasena_hash=hash_password("Vieja1234"),
        rol=Rol.evaluador,
        activo=True,
    )
    inactivo = SimpleNamespace(
        id=2,
        nombre="Pedro Inactivo",
        correo="pedro@empresa.com",
        contrasena_hash=hash_password("Vieja1234"),
        rol=Rol.consultor,
        activo=False,
    )
    cliente, db, enviados = _preparar_cliente([activo, inactivo])

    # Correo que no existe
    db._ultimo_correo = "noexiste@empresa.com"
    r1 = cliente.post("/auth/olvide-contrasena", json={"correo": "noexiste@empresa.com"})

    # Usuario inactivo
    db._ultimo_correo = "pedro@empresa.com"
    r2 = cliente.post("/auth/olvide-contrasena", json={"correo": "pedro@empresa.com"})

    # Usuario activo
    db._ultimo_correo = "ana@empresa.com"
    db._ultimo_usuario_id = 1
    r3 = cliente.post("/auth/olvide-contrasena", json={"correo": "ana@empresa.com"})

    assert r1.status_code == r2.status_code == r3.status_code == 200
    assert r1.json() == r2.json() == r3.json()
    assert len(enviados) == 1
    assert enviados[0]["correo"] == "ana@empresa.com"
    assert len(db.tokens) == 1
    # En la base solo está el hash SHA-256, nunca el token del enlace
    token_en_enlace = enviados[0]["enlace"].split("token=")[1]
    assert db.tokens[0].token_hash != token_en_enlace
    assert db.tokens[0].token_hash == sr.hash_token(token_en_enlace)


def test_pedir_enlace_nuevo_invalida_el_anterior_y_limite_de_solicitudes():
    usuario = SimpleNamespace(
        id=1,
        nombre="Ana",
        correo="ana@empresa.com",
        contrasena_hash=hash_password("Vieja1234"),
        rol=Rol.evaluador,
        activo=True,
    )
    cliente, db, enviados = _preparar_cliente([usuario])
    db._ultimo_correo = "ana@empresa.com"
    db._ultimo_usuario_id = 1

    cliente.post("/auth/olvide-contrasena", json={"correo": "ana@empresa.com"})
    primero = db.tokens[0]
    assert primero.usado_en is None

    cliente.post("/auth/olvide-contrasena", json={"correo": "ana@empresa.com"})
    assert primero.usado_en is not None
    assert db.tokens[1].usado_en is None

    # Al superar las 5 solicitudes por correo, responde igual (200) sin enviar más correos
    for _ in range(5):
        r = cliente.post("/auth/olvide-contrasena", json={"correo": "ana@empresa.com"})
        assert r.status_code == 200
    assert len(enviados) == 5


def test_restablecer_cambia_contrasena_una_sola_vez_y_reinicia_bloqueo_login():
    usuario = SimpleNamespace(
        id=1,
        nombre="Ana",
        correo="ana@empresa.com",
        contrasena_hash=hash_password("Vieja1234"),
        rol=Rol.evaluador,
        activo=True,
    )
    cliente, db, enviados = _preparar_cliente([usuario])
    db._ultimo_correo = "ana@empresa.com"
    db._ultimo_usuario_id = 1

    # Bloquea el login de Ana con 5 fallos
    for _ in range(5):
        limitador_login.registrar_fallo("ana@empresa.com")
    assert limitador_login.segundos_bloqueado("ana@empresa.com") > 0

    cliente.post("/auth/olvide-contrasena", json={"correo": "ana@empresa.com"})
    token = enviados[0]["enlace"].split("token=")[1]
    db._ultimo_hash = sr.hash_token(token)

    # Contraseña débil se rechaza con 422
    r_debil = cliente.post(
        "/auth/restablecer-contrasena",
        json={"token": token, "contrasena_nueva": "corta1"},
    )
    assert r_debil.status_code == 422

    # Contraseña válida cambia el hash y desbloquea el login
    r_ok = cliente.post(
        "/auth/restablecer-contrasena",
        json={"token": token, "contrasena_nueva": "NuevaClave123"},
    )
    assert r_ok.status_code == 204
    assert verify_password("NuevaClave123", usuario.contrasena_hash)
    assert limitador_login.segundos_bloqueado("ana@empresa.com") == 0

    # Intentar reutilizar el mismo token falla con 400
    r_reuso = cliente.post(
        "/auth/restablecer-contrasena",
        json={"token": token, "contrasena_nueva": "OtraClave456"},
    )
    assert r_reuso.status_code == 400


def test_token_invalido_o_vencido_da_400_con_mismo_mensaje():
    usuario = SimpleNamespace(
        id=1,
        nombre="Ana",
        correo="ana@empresa.com",
        contrasena_hash=hash_password("Vieja1234"),
        rol=Rol.evaluador,
        activo=True,
    )
    cliente, db, _ = _preparar_cliente([usuario])
    token_vencido = sr.generar_token()
    db.add(
        SimpleNamespace(
            id=99,
            usuario_id=1,
            token_hash=sr.hash_token(token_vencido),
            creado_en=datetime.now(UTC) - timedelta(minutes=40),
            vence_en=datetime.now(UTC) - timedelta(minutes=10),
            usado_en=None,
        )
    )

    db._ultimo_hash = sr.hash_token(token_vencido)
    r_vencido = cliente.post(
        "/auth/restablecer-contrasena",
        json={"token": token_vencido, "contrasena_nueva": "NuevaClave123"},
    )

    token_inexistente = sr.generar_token()
    db._ultimo_hash = sr.hash_token(token_inexistente)
    r_invalido = cliente.post(
        "/auth/restablecer-contrasena",
        json={"token": token_inexistente, "contrasena_nueva": "NuevaClave123"},
    )

    assert r_vencido.status_code == 400 and r_invalido.status_code == 400
    assert r_vencido.json()["detail"] == r_invalido.json()["detail"]
