"""Reglas fijas del negocio. Se cambian aquí y en ningún otro lugar."""

ZONA_HORARIA = "America/Bogota"  # "hoy" se calcula en hora de Colombia, no en la del servidor (UTC)

DIAS_POR_VENCER = 30  # un documento con 30 días o menos para vencer está "por vencer"
DIAS_VENTANA_RIESGO = 90  # incidentes e incumplimientos suman al riesgo durante 90 días
EVALUACIONES_PARA_PROMEDIO = 5  # la calificación promedio usa las últimas 5 evaluaciones

UMBRAL_RIESGO_BAJO_MAX = 33  # 0 a 33 = bajo
UMBRAL_RIESGO_MEDIO_MAX = 66  # 34 a 66 = medio; 67 a 100 = alto

ARCHIVO_MAX_MB = 5
ARCHIVO_TIPOS_PERMITIDOS = ("application/pdf", "image/jpeg", "image/png")
