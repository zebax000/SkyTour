from app.services.limitador import LimitadorIntentos


class Reloj:
    def __init__(self):
        self.ahora = 1000.0

    def __call__(self):
        return self.ahora


def _limitador():
    reloj = Reloj()
    return LimitadorIntentos(maximo=3, ventana_segundos=60, reloj=reloj), reloj


def test_no_bloquea_antes_del_maximo():
    limitador, _ = _limitador()
    limitador.registrar_fallo("ana@x.com")
    limitador.registrar_fallo("ana@x.com")
    assert limitador.segundos_bloqueado("ana@x.com") == 0


def test_bloquea_al_llegar_al_maximo_y_dice_cuanto_falta():
    limitador, reloj = _limitador()
    for _ in range(3):
        limitador.registrar_fallo("ana@x.com")
    reloj.ahora += 10
    assert limitador.segundos_bloqueado("ana@x.com") == 50


def test_se_libera_al_pasar_la_ventana():
    limitador, reloj = _limitador()
    for _ in range(3):
        limitador.registrar_fallo("ana@x.com")
    reloj.ahora += 61
    assert limitador.segundos_bloqueado("ana@x.com") == 0


def test_los_fallos_viejos_no_cuentan():
    limitador, reloj = _limitador()
    limitador.registrar_fallo("ana@x.com")
    limitador.registrar_fallo("ana@x.com")
    reloj.ahora += 61
    limitador.registrar_fallo("ana@x.com")
    assert limitador.segundos_bloqueado("ana@x.com") == 0


def test_un_acierto_borra_los_fallos():
    limitador, _ = _limitador()
    for _ in range(3):
        limitador.registrar_fallo("ana@x.com")
    limitador.reiniciar("ana@x.com")
    assert limitador.segundos_bloqueado("ana@x.com") == 0


def test_la_clave_no_distingue_mayusculas_ni_espacios():
    limitador, _ = _limitador()
    for texto in ("Ana@X.com", " ana@x.com", "ANA@X.COM "):
        limitador.registrar_fallo(texto)
    assert limitador.segundos_bloqueado("ana@x.com") > 0


def test_cada_clave_va_aparte():
    limitador, _ = _limitador()
    for _ in range(3):
        limitador.registrar_fallo("ana@x.com")
    assert limitador.segundos_bloqueado("luis@x.com") == 0
