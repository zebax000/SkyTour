import csv
import io

ENCABEZADOS = [
    'Posición', 'Proveedor', 'Tipo', 'Ciudad', 'Estado',
    'Calificación', 'Evaluaciones', 'Riesgo', 'Puntaje de riesgo', 'Incidentes abiertos',
]
# Una celda que empieza así se interpreta como fórmula en Excel y Calc (inyección de fórmulas en CSV)
_PELIGROSOS = ('=', '+', '-', '@', '\t', '\r', '\n')


def celda_segura(valor):
    texto = '' if valor is None else str(valor)
    return "'" + texto if texto.startswith(_PELIGROSOS) else texto


def numero(valor):
    # Excel en español usa coma decimal
    return '' if valor is None else str(valor).replace('.', ',')


def generar_csv(filas):
    """CSV pensado para Excel en español: UTF-8 con BOM (acentos), punto y coma como separador y coma decimal."""
    salida = io.StringIO()
    escritor = csv.writer(salida, delimiter=';', quoting=csv.QUOTE_MINIMAL, lineterminator='\r\n')
    escritor.writerow(ENCABEZADOS)
    for f in filas:
        escritor.writerow([
            f['posicion'],
            celda_segura(f['proveedor']),
            celda_segura(f['tipo']),
            celda_segura(f['ciudad']),
            celda_segura(f['estado']),
            numero(f['calificacion']),
            f['evaluaciones'],
            celda_segura(f['riesgo']),
            numero(f['puntaje']),
            f['incidentes_abiertos'],
        ])
    return ('\ufeff' + salida.getvalue()).encode('utf-8')
