import base64

import pytest

from app.services.archivos import MAX_BYTES, ArchivoInvalido, leer_archivo

PDF = b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\n"
PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 20
JPG = b"\xff\xd8\xff\xe0" + b"\x00" * 20


def _b64(datos: bytes) -> str:
    return base64.b64encode(datos).decode()


@pytest.mark.parametrize(
    "datos,mime,extension",
    [(PDF, "application/pdf", ".pdf"), (PNG, "image/png", ".png"), (JPG, "image/jpeg", ".jpg")],
)
def test_acepta_pdf_png_y_jpg(datos, mime, extension):
    leido = leer_archivo("rut", _b64(datos))
    assert leido.tipo_mime == mime
    assert leido.nombre == "rut" + extension
    assert leido.datos == datos


def test_el_tipo_se_decide_por_el_contenido_no_por_el_nombre():
    leido = leer_archivo("programa.exe", _b64(PDF))
    assert leido.tipo_mime == "application/pdf"
    assert leido.nombre == "programa.pdf"


def test_rechaza_un_archivo_de_texto_aunque_se_llame_pdf():
    with pytest.raises(ArchivoInvalido, match="PDF, JPG o PNG"):
        leer_archivo("falso.pdf", _b64(b"esto no es un pdf"))


def test_limpia_rutas_y_caracteres_peligrosos_del_nombre():
    leido = leer_archivo("..\\..\\etc/paswd<>.pdf", _b64(PDF))
    assert leido.nombre == "paswd.pdf"


def test_nombre_vacio_se_reemplaza():
    assert leer_archivo("  ", _b64(PDF)).nombre == "documento.pdf"


def test_rechaza_base64_dañado():
    with pytest.raises(ArchivoInvalido, match="dañado"):
        leer_archivo("a.pdf", "esto no es base64 !!!")


def test_rechaza_archivo_vacio():
    with pytest.raises(ArchivoInvalido, match="vacío"):
        leer_archivo("a.pdf", "")


def test_acepta_exactamente_el_maximo_y_rechaza_un_byte_mas():
    justo = PDF + b"0" * (MAX_BYTES - len(PDF))
    assert len(leer_archivo("a.pdf", _b64(justo)).datos) == MAX_BYTES
    with pytest.raises(ArchivoInvalido, match="máximo"):
        leer_archivo("a.pdf", _b64(justo + b"0"))


def test_corta_rapido_si_el_texto_es_enorme():
    with pytest.raises(ArchivoInvalido, match="máximo"):
        leer_archivo("a.pdf", "A" * (MAX_BYTES * 2))
