import base64
from io import BytesIO
from textwrap import wrap
from reportlab.lib.utils import ImageReader
from reportlab.platypus import Paragraph
from .styles import FONTS, CELL_STYLE, FOOTER_STYLE

def textotipomoneda(tipo_moneda):
    try:
        tipo = int(tipo_moneda)
    except Exception:
        return ""
    if tipo == 1:
        return (
            "Valores netos expresados en USD, conversi\u00f3n del d\u00f3lar, "
            "observado del d\u00eda de la compra +$5"
        )
    if tipo == 2:
        return "Valores netos expresados en CLP, debe agregar IVA"
    if tipo == 3:
        return "Valores netos expresados en UF, debe agregar IVA"
    return ""

def _format_usd(valor):
    s = f"{valor:,.1f}"
    s = s.replace(",", "X").replace(".", ",").replace("X", ".")
    return f"{s} USD"

def _format_clp(valor):
    s = f"{valor:,.0f}"
    s = s.replace(",", "X").replace(".", ",").replace("X", ".")
    return f"${s}"

def _format_uf(valor):
    s = f"{valor:,.2f}"
    s = s.replace(",", "X").replace(".", ",").replace("X", ".")
    return f"{s} UF"

def draw_fecha(pdf, ubicacion, fecha_str, mx, alto, my):
    pdf.setFont(*FONTS["fecha"])
    pdf.drawString(mx, alto - my + 1, f"{ubicacion}, {fecha_str}")

def draw_logo(pdf, logo_b64, ancho, alto, mx, my):
    if not logo_b64:
        return
    try:
        b64 = logo_b64.split(",", 1)[1] if "," in logo_b64 else logo_b64
        img = ImageReader(BytesIO(base64.b64decode(b64)))
        iw, ih = img.getSize()
        w_logo = 120
        h_logo = w_logo * (ih / iw)
        pdf.drawImage(
            img,
            ancho - mx - w_logo,
            alto - my - h_logo,
            width=w_logo,
            height=h_logo,
            mask="auto",
        )
    except Exception:
        return

def draw_encabezado(pdf, ubicacion, fecha_str, logo_b64, ancho, alto, mx, my):
    draw_fecha(pdf, ubicacion, fecha_str, mx, alto, my)
    draw_logo(pdf, logo_b64, ancho, alto, mx, my)

def draw_titulo(pdf, numero, ancho, alto, mx, my, titulo_texto="Cotizaci\u00f3n N\u00b0"):
    pdf.setFont(*FONTS["titulo"])
    pdf.drawCentredString(ancho / 2, alto - my - 40, f"{titulo_texto} {numero}")

def draw_texto_fijo(pdf, mx, y, tipo_moneda):
    texto = textotipomoneda(tipo_moneda)
    pdf.setFont(*FONTS["fijo"])
    for line in wrap(texto, width=90):
        pdf.drawString(mx, y, line)
        y -= 12
    return y - 10

def draw_cierre(pdf, mx, y):
    cierre = (
        "Gracias por darnos la oportunidad de ofrecerle este presupuesto. "
        "Como siempre, es para nosotros un placer hacer negocios con ustedes. "
        "Esperamos hacer realidad este pedido para su completa satisfacci\u00f3n."
    )
    pdf.setFont(*FONTS["cierre"])
    text_obj = pdf.beginText(mx, y)
    for line in wrap(cierre, width=115):
        text_obj.textLine(line)
        y -= 12
    pdf.drawText(text_obj)
    return y - 30

def draw_firma(pdf, firma_empresa_b64, firmante, cargo, cargo2, ancho, y):
    if firma_empresa_b64:
        try:
            b64 = (
                firma_empresa_b64.split(",", 1)[1]
                if "," in firma_empresa_b64
                else firma_empresa_b64
            )
            img = ImageReader(BytesIO(base64.b64decode(b64)))
            iw, ih = img.getSize()
            w_img = 200
            h_img = w_img * (ih / iw)
            x_img = (ancho - w_img) / 2
            pdf.drawImage(img, x_img, y - h_img, width=w_img, height=h_img, mask="auto")
            y = y - h_img - 10
        except Exception:
            pass
    lines = ["Atentamente,", firmante]
    if cargo:
        lines.append(cargo)
    if cargo2:
        lines.append(cargo2)
    for i, line in enumerate(lines):
        if i == 0:
            pdf.setFont(*FONTS["firma_label"])
        elif i == 1:
            pdf.setFont(*FONTS["firma"])
        else:
            pdf.setFont(*FONTS["firma_cargo"])
        pdf.drawCentredString(ancho / 2, y - i * 14, line)
    return y - len(lines) * 14 - 10

def draw_footer(pdf, ancho, mx, my):
    footer_text = (
        "<b>Snabb IT | Asesores Tecnol\u00f3gicos</b><br/>"
        "<a href='https://maps.app.goo.gl/R1pAm1ANqs5eEjvSA'>"
        "Gran Av. Jos\u00e9 Miguel Carrera N\u00b0 3840 Of - 808, San Miguel"
        "</a> - Fono: <a href='tel:+56227596140'>(56-2) 27596140</a><br/>"
        "Vis\u00edtenos en <a href='https://snabbit.cl' target='_blank'>https://snabbit.cl</a>"
    )
    para = Paragraph(footer_text, FOOTER_STYLE)
    _w, h = para.wrap(ancho - 2 * mx, my)
    para.drawOn(pdf, mx, my - h - 5)

def draw_paginacion(pdf, ancho, mx, my):
    page = pdf.getPageNumber()
    pdf.setFont(*FONTS["footer"])
    pdf.drawRightString(ancho - mx, 15, f"{page}/{page}")


def get_logo_empresa_b64(empresa):
    """
    Extrae el logo de una empresa y lo retorna como data URL base64.

    Soporta tres formatos del campo empresa.logo:
      - FileField de Django: se lee con .read()
      - String data URL (ya tiene 'data:...,base64,...'): se retorna directamente
      - Ruta de archivo en disco: se lee con open()

    Retorna 'data:image/png;base64,...' o None si no hay logo o falla la lectura.
    """
    logo_field = getattr(empresa, "logo", None)
    if not logo_field:
        return None

    logo_bytes = None

    if hasattr(logo_field, "read"):
        # FileField / FieldFile de Django
        try:
            logo_bytes = logo_field.read()
        except Exception:
            return None
    elif isinstance(logo_field, str) and "," in logo_field:
        # Ya es data URL: data:image/png;base64,...
        return logo_field
    elif isinstance(logo_field, str):
        # Ruta de archivo en disco
        try:
            with open(logo_field, "rb") as f:
                logo_bytes = f.read()
        except Exception:
            return None

    if logo_bytes:
        return "data:image/png;base64," + base64.b64encode(logo_bytes).decode()

    return None
