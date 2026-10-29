import httpx
from app.core.config import settings

def enviar_correo_recuperacion(email_destino: str, token: str):
    if not settings.BREVO_API_KEY:
        print("Advertencia: BREVO_API_KEY no configurada. Correo omitido.")
        return

    url = "https://api.brevo.com/v3/smtp/email"
    headers = {
        "api-key": settings.BREVO_API_KEY,
        "Content-Type": "application/json"
    }
    
    enlace = f"{settings.FRONTEND_URL}/restablecer-contrasena?token={token}"
    html_content = f"<p>Usa este enlace para cambiar tu contraseña: <a href='{enlace}'>{enlace}</a></p><p>Válido por 30 minutos. Si no fuiste tú, ignora este mensaje.</p>"
    
    payload = {
        "sender": {"name": settings.CORREO_NOMBRE_REMITENTE, "email": settings.CORREO_REMITENTE},
        "to": [{"email": email_destino}],
        "subject": "Restablecer contraseña - SkyTour",
        "htmlContent": html_content
    }
    
    httpx.post(url, headers=headers, json=payload, timeout=10.0)