"""Límite de intentos fallidos de inicio de sesión (en memoria, sin dependencias nuevas).

Cuenta los fallos por clave (el correo) dentro de una ventana de tiempo. Al llegar al máximo bloquea
hasta que caduque el fallo más antiguo de la ventana. Vive en la memoria del servidor: con una sola
instancia (el plan gratuito de Render) basta; con varias instancias habría que guardarlo en la base de datos.
"""
import math
import threading
import time
from typing import Callable


class LimitadorIntentos:
    def __init__(
        self,
        maximo: int = 5,
        ventana_segundos: int = 900,
        reloj: Callable[[], float] = time.monotonic,
    ) -> None:
        self._maximo = maximo
        self._ventana = ventana_segundos
        self._reloj = reloj
        self._fallos: dict[str, list[float]] = {}
        self._cerrojo = threading.Lock()

    @staticmethod
    def _normalizar(clave: str) -> str:
        return clave.strip().lower()

    def _vigentes(self, clave: str, ahora: float) -> list[float]:
        vigentes = [t for t in self._fallos.get(clave, []) if ahora - t < self._ventana]
        if vigentes:
            self._fallos[clave] = vigentes
        else:
            self._fallos.pop(clave, None)
        return vigentes

    def segundos_bloqueado(self, clave: str) -> int:
        """0 si puede intentar; si no, los segundos que faltan para el próximo intento."""
        clave = self._normalizar(clave)
        with self._cerrojo:
            ahora = self._reloj()
            vigentes = self._vigentes(clave, ahora)
            if len(vigentes) < self._maximo:
                return 0
            libera = vigentes[-self._maximo] + self._ventana
            return max(1, math.ceil(libera - ahora))

    def registrar_fallo(self, clave: str) -> None:
        clave = self._normalizar(clave)
        with self._cerrojo:
            ahora = self._reloj()
            if len(self._fallos) > 10_000:  # evita que la memoria crezca sin límite
                for otra in list(self._fallos):
                    self._vigentes(otra, ahora)
            self._vigentes(clave, ahora)
            self._fallos.setdefault(clave, []).append(ahora)

    def reiniciar(self, clave: str) -> None:
        with self._cerrojo:
            self._fallos.pop(self._normalizar(clave), None)

    def vaciar(self) -> None:
        with self._cerrojo:
            self._fallos.clear()


# Una sola instancia para toda la aplicación: 5 fallos seguidos bloquean 15 minutos
limitador_login = LimitadorIntentos()
