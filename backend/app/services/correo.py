"""Correo transaccional mediante Brevo HTTPS; no registrar tokens ni destinatarios."""
import html
import logging

import httpx

from app.core.config import settings
from app.services.restablecimiento import construir_enlace_restablecimiento

logger = logging.getLogger(__name__)
BREVO_URL = "https://api.brevo.com/v3/smtp/email"
TIMEOUT_SEGUNDOS = 8.0


def construir_mensaje_restablecimiento(
    nombre: str,
    enlace: str,
    minutos: int = 30,
) -> tuple[str, str, str]:
    asunto = "Restablecer tu contraseña de SkyTour"
    saludo = nombre.strip() if nombre and nombre.strip() else "Hola"
    texto = (
        f"Hola, {saludo}:\n\n"
        "Recibimos una solicitud para restablecer la contraseña de tu cuenta en SkyTour.\n\n"
        f"Para crear una contraseña nueva, abre el siguiente enlace (válido durante {minutos} minutos y de un solo uso):\n"
        f"{enlace}\n\n"
        "Si no fuiste tú, ignora este mensaje: tu contraseña actual seguirá funcionando.\n"
    )
    nombre_seguro = html.escape(saludo)
    enlace_seguro = html.escape(enlace, quote=True)
    cuerpo_html = (
        f"<p>Hola, <strong>{nombre_seguro}</strong>:</p>"
        "<p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en SkyTour.</p>"
        f"<p>Para crear una contraseña nueva, usa este enlace de un solo uso (válido durante {minutos} minutos):</p>"
        f'<p><a href="{enlace_seguro}">Restablecer mi contraseña</a></p>'
        "<p>Si no fuiste tú, ignora este mensaje: tu contraseña actual seguirá funcionando.</p>"
    )
    return asunto, texto, cuerpo_html


def enviar_correo(
    destinatario_correo: str,
    destinatario_nombre: str,
    asunto: str,
    contenido_texto: str,
    contenido_html: str,
) -> bool:
    clave = (settings.brevo_api_key or "").strip()
    remitente = (settings.correo_remitente or "").strip()
    nombre_remitente = (settings.correo_nombre_remitente or "SkyTour").strip() or "SkyTour"
    if not clave or not remitente:
        logger.warning("Envío de correo omitido: falta configurar BREVO_API_KEY o CORREO_REMITENTE.")
        return False
    cuerpo = {
        "sender": {"name": nombre_remitente, "email": remitente},
        "to": [{"email": destinatario_correo, "name": destinatario_nombre or destinatario_correo}],
        "subject": asunto,
        "textContent": contenido_texto,
        "htmlContent": contenido_html,
    }
    cabeceras = {"api-key": clave, "accept": "application/json", "content-type": "application/json"}
    try:
        respuesta = httpx.post(BREVO_URL, json=cuerpo, headers=cabeceras, timeout=TIMEOUT_SEGUNDOS)
        if not 200 <= respuesta.status_code < 300:
            logger.warning("Brevo rechazó el envío de correo (codigo=%s).", respuesta.status_code)
            return False
        return True
    except Exception as error:  # noqa: BLE001
        logger.warning("No se pudo conectar con Brevo para enviar el correo (tipo=%s).", type(error).__name__)
        return False


def enviar_correo_restablecimiento(
    destinatario_correo: str,
    destinatario_nombre: str,
    enlace: str,
    minutos: int = 30,
) -> bool:
    asunto, texto, cuerpo_html = construir_mensaje_restablecimiento(destinatario_nombre, enlace, minutos=minutos)
    return enviar_correo(destinatario_correo, destinatario_nombre, asunto, texto, cuerpo_html)


def enviar_correo_recuperacion(email_destino: str, token: str) -> bool:
    """Compatibilidad con el nombre anterior, usando la configuración y envío unificados."""
    enlace = construir_enlace_restablecimiento(settings.frontend_url, token)
    return enviar_correo_restablecimiento(email_destino, "", enlace, settings.reset_token_expire_minutes)
