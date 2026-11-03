import io
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

ENCABEZADOS = ['#', 'Proveedor', 'Tipo', 'Ciudad', 'Estado', 'Calificación', 'Eval.', 'Riesgo', 'Puntaje', 'Inc. abiertos']
AZUL = colors.HexColor('#0B2545')


def _numero(valor):
    return '' if valor is None else str(valor).replace('.', ',')


def _pie(lienzo, documento):
    lienzo.saveState()
    lienzo.setFont('Helvetica', 8)
    lienzo.setFillColor(colors.HexColor('#6B7280'))
    lienzo.drawString(1.5 * cm, 1 * cm, 'SkyTour · Reporte de proveedores')
    lienzo.drawRightString(landscape(A4)[0] - 1.5 * cm, 1 * cm, f'Página {documento.page}')
    lienzo.restoreState()


def generar_pdf(filas, titulo, subtitulo):
    """PDF horizontal con una tabla del ranking. Usa solo texto con acentos latinos (fuentes estándar de PDF)."""
    buffer = io.BytesIO()
    documento = SimpleDocTemplate(
        buffer, pagesize=landscape(A4), leftMargin=1.5 * cm, rightMargin=1.5 * cm,
        topMargin=1.5 * cm, bottomMargin=1.8 * cm, title=titulo, author='SkyTour',
    )
    estilos = getSampleStyleSheet()
    celda = ParagraphStyle('celda', parent=estilos['BodyText'], fontSize=8.5, leading=10.5)
    cabecera = ParagraphStyle('cabecera', parent=celda, textColor=colors.white, fontName='Helvetica-Bold')
    elementos = [Paragraph(escape(titulo), estilos['Title']), Paragraph(escape(subtitulo), estilos['Normal']), Spacer(1, 12)]

    tabla = [[Paragraph(escape(t), cabecera) for t in ENCABEZADOS]]
    for f in filas:
        valores = [
            f['posicion'], f['proveedor'], f['tipo'], f['ciudad'], f['estado'],
            _numero(f['calificacion']) or 'Sin evaluar', f['evaluaciones'], f['riesgo'],
            _numero(f['puntaje']) or '-', f['incidentes_abiertos'],
        ]
        tabla.append([Paragraph(escape(str(v)), celda) for v in valores])
    if len(tabla) == 1:
        elementos.append(Paragraph('No hay proveedores con esos filtros.', estilos['Normal']))
    else:
        anchos = [1.0, 6.0, 3.3, 3.0, 2.8, 2.4, 1.4, 3.0, 1.6, 1.8]
        t = Table(tabla, colWidths=[a * cm for a in anchos], repeatRows=1)
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), AZUL),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F5F7FA')]),
            ('GRID', (0, 0), (-1, -1), 0.25, colors.HexColor('#D1D5DB')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        elementos.append(t)
    documento.build(elementos, onFirstPage=_pie, onLaterPages=_pie)
    return buffer.getvalue()
