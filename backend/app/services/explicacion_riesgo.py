import json
import logging
from collections import OrderedDict
from threading import Lock
from time import monotonic

from pydantic import BaseModel, Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)

class ConfigIA(BaseSettings):
    gemini_api_key: SecretStr | None = None
    gemini_model: str = 'gemini-2.5-flash'
    model_config = SettingsConfigDict(env_file=('../.env', '.env'), extra='ignore')

class Explicacion(BaseModel):
    resumen: str = Field(min_length=1, max_length=1500)
    acciones: list[str] = Field(max_length=5)

_cache = OrderedDict()
_lock = Lock()
_ultima_llamada = 0.0


def respaldo(resultado):
    if resultado['nivel'] == 'sin_datos':
        return {'resumen': 'Falta al menos una evaluación o un documento. No se asigna puntaje.', 'acciones': ['Completar documentos y evaluaciones antes de clasificar al proveedor.'], 'origen': 'reglas'}
    factores = sorted(resultado['factores'].items(), key=lambda x: -x[1])
    aportes = ', '.join(f'{k}: {v} puntos' for k,v in factores if v)
    acciones = []
    for k,v in factores:
        if not v:
            continue
        acciones.append({
            'documentacion': 'Revisar y renovar documentos vencidos o próximos a vencer.',
            'calificacion': 'Revisar las últimas evaluaciones y acordar mejoras de servicio.',
            'incidentes': 'Revisar incidentes recientes y sus medidas correctivas.',
            'incumplimientos': 'Revisar compromisos incumplidos y registrar su seguimiento.',
            'tarifas': 'Registrar una tarifa vigente para los servicios que no la tienen.',
        }[k])
    return {'resumen': f"Riesgo {resultado['nivel']}: {resultado['puntaje']}/100. " + (aportes or 'No hay aportes de riesgo con las reglas actuales.'), 'acciones': acciones, 'origen': 'reglas'}


def explicar(resultado):
    global _ultima_llamada
    base = respaldo(resultado)
    config = ConfigIA()
    if not config.gemini_api_key or resultado['nivel'] == 'sin_datos':
        return base
    # Solo salen datos numéricos agregados: nunca nombres, documentos, comentarios ni contactos.
    datos = {k: resultado[k] for k in ('puntaje', 'nivel', 'factores')}
    clave = config.gemini_model + json.dumps(datos, sort_keys=True)
    ahora = monotonic()
    with _lock:
        if clave in _cache and ahora - _cache[clave][0] < 3600:
            return _cache[clave][1]
        # Límite conservador global por proceso; sin espera ni bloqueo del resto de la aplicación.
        if ahora - _ultima_llamada < 15:
            return base
        _ultima_llamada = ahora
    try:
        from google import genai
        from google.genai import types
        with genai.Client(api_key=config.gemini_api_key.get_secret_value(), http_options=types.HttpOptions(timeout=10000)) as client:
            respuesta = client.models.generate_content(
                model=config.gemini_model,
                contents='Explica en español estos resultados ya calculados. No cambies ni recalcules el puntaje. No inventes hechos. Sugiere hasta cinco acciones prudentes para revisión humana; no ordenes suspender proveedores. Datos: ' + json.dumps(datos),
                config={'response_mime_type': 'application/json', 'response_json_schema': Explicacion.model_json_schema(), 'temperature': 0.2},
            )
        texto = Explicacion.model_validate_json(respuesta.text)
        salida = {**texto.model_dump(), 'origen': 'gemini', 'modelo': config.gemini_model}
        with _lock:
            _cache[clave] = (monotonic(), salida)
            _cache.move_to_end(clave)
            while len(_cache) > 100:
                _cache.popitem(last=False)
        return salida
    except Exception:
        # No registrar la excepción: podría incluir datos de configuración o credenciales.
        logger.warning('Gemini no disponible; se usa explicación por reglas.')
        return base
