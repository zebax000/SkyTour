import json
import logging
from collections import OrderedDict
from threading import Lock
from time import monotonic

from pydantic import BaseModel, Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)

ETIQUETAS = {
    'documentacion': 'Documentación',
    'calificacion': 'Calificación',
    'incidentes': 'Incidentes',
    'incumplimientos': 'Incumplimientos',
    'tarifas': 'Tarifas',
}

MOTIVOS_HTTP = {
    400: 'clave_invalida_o_solicitud_rechazada',
    401: 'clave_o_permiso_rechazado',
    403: 'clave_o_permiso_rechazado',
    404: 'modelo_no_disponible',
    429: 'cuota_agotada',
}


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
    aportes = ', '.join(f'{ETIQUETAS.get(k, k)}: {v} puntos' for k, v in factores if v)
    acciones = []
    for k, v in factores:
        if not v:
            continue
        acciones.append({
            'documentacion': 'Revisar y renovar documentos vencidos o próximos a vencer.',
            'calificacion': 'Revisar las últimas evaluaciones y acordar mejoras de servicio.',
            'incidentes': 'Revisar incidentes recientes y sus medidas correctivas.',
            'incumplimientos': 'Revisar compromisos incumplidos y registrar su seguimiento.',
            'tarifas': 'Registrar una tarifa vigente para los servicios que no la tienen.',
        }[k])
    detalle = f'{aportes}.' if aportes else 'No hay aportes de riesgo con las reglas actuales.'
    return {'resumen': f"Riesgo {resultado['nivel']}: {resultado['puntaje']}/100. {detalle}", 'acciones': acciones, 'origen': 'reglas'}


def _con_motivo(base, motivo):
    return {**base, 'motivo': motivo}


def _clasificar_error(error):
    codigo = getattr(error, 'code', None)
    if isinstance(codigo, int):
        if codigo in MOTIVOS_HTTP:
            return MOTIVOS_HTTP[codigo], codigo
        if codigo >= 500:
            return 'servicio_saturado', codigo
    if isinstance(error, ImportError):
        return 'sdk_no_instalado', None
    if 'timeout' in type(error).__name__.lower():
        return 'tiempo_agotado', None
    return 'error_desconocido', None


def explicar(resultado):
    global _ultima_llamada
    base = respaldo(resultado)
    config = ConfigIA()
    if resultado['nivel'] == 'sin_datos':
        return _con_motivo(base, 'sin_datos')
    if not config.gemini_api_key or not config.gemini_api_key.get_secret_value().strip():
        return _con_motivo(base, 'sin_clave')
    # Solo salen datos numéricos agregados: nunca nombres, documentos, comentarios ni contactos.
    datos = {k: resultado[k] for k in ('puntaje', 'nivel', 'factores')}
    clave = config.gemini_model + json.dumps(datos, sort_keys=True)
    ahora = monotonic()
    with _lock:
        if clave in _cache and ahora - _cache[clave][0] < 3600:
            return _cache[clave][1]
        # Límite conservador global por proceso; sin espera ni bloqueo del resto de la aplicación.
        if ahora - _ultima_llamada < 15:
            return _con_motivo(base, 'limite_de_frecuencia')
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
        contenido = respuesta.text or ''
    except Exception as error:
        # Solo se registra la categoría, el tipo de excepción y el código HTTP; nunca el mensaje, la clave ni los datos.
        motivo, codigo = _clasificar_error(error)
        logger.warning('Gemini no disponible (motivo=%s, tipo=%s, codigo=%s); se usa explicación por reglas.', motivo, type(error).__name__, codigo)
        return _con_motivo(base, motivo)
    try:
        texto = Explicacion.model_validate_json(contenido)
    except ValueError:
        logger.warning('Gemini no disponible (motivo=respuesta_invalida); se usa explicación por reglas.')
        return _con_motivo(base, 'respuesta_invalida')
    salida = {**texto.model_dump(), 'origen': 'gemini', 'modelo': config.gemini_model}
    with _lock:
        _cache[clave] = (monotonic(), salida)
        _cache.move_to_end(clave)
        while len(_cache) > 100:
            _cache.popitem(last=False)
    return salida
