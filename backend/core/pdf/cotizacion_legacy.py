import base64
from datetime import datetime
from io import BytesIO
from textwrap import wrap

from reportlab.pdfgen import canvas
from reportlab.platypus import Table, TableStyle, Paragraph, Image
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import ImageReader
from reportlab.lib.styles import ParagraphStyle

MESES_ES = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
]

FONTS = {
    "fecha": ("Helvetica", 9),
    "titulo": ("Helvetica-Bold", 14),
    "datos_label": ("Helvetica-Bold", 10),
    "datos": ("Helvetica", 10),
    "introduccion": ("Helvetica", 10),
    "fijo": ("Helvetica-Oblique", 9),
    "cierre": ("Helvetica", 10),
    "firma_label": ("Helvetica-Bold", 10),
    "firma": ("Helvetica", 10),
    "firma_cargo": ("Helvetica", 9),
    "footer": ("Helvetica", 8),
}

INTRO_STYLE = ParagraphStyle(
    "intro", fontName="Helvetica", fontSize=10, leading=12
)

FOOTER_STYLE = ParagraphStyle(
    "footer", fontName="Helvetica", fontSize=8, leading=10, alignment=1
)

CELL_STYLE = ParagraphStyle(
    "cell", fontName="Helvetica", fontSize=10, leading=12
)


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


def draw_titulo(pdf, numero, ancho, alto, mx, my):
    pdf.setFont(*FONTS["titulo"])
    pdf.drawCentredString(ancho / 2, alto - my - 40, f"Cotizaci\u00f3n N\u00b0 {numero}")


def draw_datos_cliente(pdf, nombre, rut, direccion, destinatarios, mx, y):
    pdf.setFont(*FONTS["datos_label"])
    pdf.drawString(mx, y, f"Cliente: {nombre}")
    y -= 14
    if rut:
        pdf.setFont(*FONTS["datos"])
        pdf.drawString(mx, y, f"Rut: {rut}")
        y -= 14
    if direccion:
        pdf.setFont(*FONTS["datos"])
        pdf.drawString(mx, y, f"Direcci\u00f3n: {direccion}")
        y -= 20
    else:
        y -= 20
    if destinatarios:
        pdf.setFont(*FONTS["datos_label"])
        pdf.drawString(mx, y, f"Estimado/a: {destinatarios}")
        y -= 20
    return y


def draw_introduccion(pdf, descripcion, mx, y, ancho):
    intro_text = (
        f"Ud. ha solicitado los precios de <b>{descripcion}</b>, "
        "a continuaci\u00f3n aparece nuestra cotizaci\u00f3n:"
    )
    para = Paragraph(intro_text, INTRO_STYLE)
    _w, h = para.wrap(ancho - 2 * mx, y)
    para.drawOn(pdf, mx, y - h)
    return y - h - 12


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


def draw_tabla_items(
    pdf,
    items,
    ancho,
    mx,
    y,
    tipo_moneda,
    alto,
    ubicacion,
    fecha_str,
    logo_b64,
    datos_cotizacion,
):
    try:
        tipo = int(tipo_moneda)
    except Exception:
        tipo = 1
    if not items:
        return y
    if tipo == 1:
        encabezados = ["Descripci\u00f3n", "Cantidad", "Precio Unit USD", "Total Neto USD"]
    elif tipo == 2:
        encabezados = ["Descripci\u00f3n", "Cantidad", "Precio Unit", "Total Neto"]
    else:
        encabezados = ["Descripci\u00f3n", "Cantidad", "Precio Unit UF", "Total Neto UF"]

    data = [encabezados]
    for it in items:
        nombre_item = it.get("nombre", "")
        desc_texto = it.get("descripcion", "")
        nombre_item = str(nombre_item).replace("<", "").replace(">", "")
        desc_texto = str(desc_texto).replace("<", "").replace(">", "")
        combined = f"<b>{nombre_item}</b><br/><font size='8'>{desc_texto}</font>"
        desc_para = Paragraph(combined, CELL_STYLE)

        try:
            pu = float(it["precio_unitario"])
        except Exception:
            pu = 0.0
        try:
            tn = float(it["total_neto"])
        except Exception:
            tn = 0.0

        if tipo == 1:
            valor_pu = _format_usd(pu)
            valor_tn = _format_usd(tn)
        elif tipo == 2:
            valor_pu = _format_clp(pu)
            valor_tn = _format_clp(tn)
        else:
            valor_pu = _format_uf(pu)
            valor_tn = _format_uf(tn)

        data.append([desc_para, str(it["cantidad"]), valor_pu, valor_tn])

    table_width = ancho - 2 * mx
    colWidths = [
        0.4 * table_width,
        0.15 * table_width,
        0.2 * table_width,
        0.25 * table_width,
    ]
    style = TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("ALIGN", (1, 1), (-1, -1), "RIGHT"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.black),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
    ])
    tabla = Table(data, colWidths=colWidths, style=style, repeatRows=1)

    bottom_reserved = 200
    availW = table_width
    y_start = y
    remaining = tabla
    while True:
        availH = y_start - (40 + bottom_reserved)
        if availH <= 0:
            pdf.showPage()
            draw_encabezado(pdf, ubicacion, fecha_str, logo_b64, ancho, alto, mx, my=40)
            draw_titulo(pdf, datos_cotizacion.get("numero_cotizacion", ""), ancho, alto, mx, my=40)
            y_start = alto - 40 - 90
        parts = remaining.split(availW, availH)
        if not parts:
            break
        part = parts[0]
        _w, h = part.wrap(availW, availH)
        part.drawOn(pdf, mx, y_start - h)
        y_start -= h + 20
        if len(parts) > 1:
            remaining = parts[1]
            pdf.showPage()
            draw_encabezado(pdf, ubicacion, fecha_str, logo_b64, ancho, alto, mx, my=40)
            draw_titulo(pdf, datos_cotizacion.get("numero_cotizacion", ""), ancho, alto, mx, my=40)
            y_start = alto - 40 - 90
            continue
        break
    return y_start


def draw_texto_fijo(pdf, mx, y, tipo_moneda):
    texto = textotipomoneda(tipo_moneda)
    pdf.setFont(*FONTS["fijo"])
    for line in wrap(texto, width=90):
        pdf.drawString(mx, y, line)
        y -= 12
    return y - 10


def draw_observaciones(pdf, observaciones, mx, y):
    if not observaciones:
        return y
    lines = wrap(observaciones, width=90)
    if not lines:
        return y

    label = "Observaciones:"
    pdf.setFont(*FONTS["datos_label"])
    pdf.drawString(mx, y, label)
    y -= 12

    pdf.setFont(*FONTS["datos"])
    text_obj = pdf.beginText(mx, y)
    for line in lines:
        text_obj.textLine(line)
        y -= 12
    pdf.drawText(text_obj)

    return y - 20


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


def generar_pdf_cotizacion_legacy(
    datos_cotizacion,
    logo_base64,
    nombre_cliente,
    rut_cliente,
    direccion_cliente,
    destinatarios,
    items=None,
    observaciones=None,
    firmante=None,
    cargo=None,
    cargo2=None,
    firma_empresa_b64=None,
    ubicacion="Santiago",
    tipo_moneda="1",
):
    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    ancho, alto = A4
    mx, my = 40, 40

    fecha_obj = datos_cotizacion.get("fecha_cotizacion")
    if isinstance(fecha_obj, (datetime,)):
        dia = fecha_obj.day
        mes = MESES_ES[fecha_obj.month - 1]
        anio = fecha_obj.year
        fecha_str = f"{dia} de {mes} de {anio}"
    else:
        hoy = datetime.now()
        fecha_str = f"{hoy.day} de {MESES_ES[hoy.month - 1]} de {hoy.year}"

    y = alto - my - 90
    draw_encabezado(pdf, ubicacion, fecha_str, logo_base64, ancho, alto, mx, my)
    draw_titulo(pdf, datos_cotizacion.get("numero_cotizacion", ""), ancho, alto, mx, my)
    y = draw_datos_cliente(pdf, nombre_cliente, rut_cliente, direccion_cliente, destinatarios, mx, y)
    y = draw_introduccion(pdf, datos_cotizacion.get("descripcion", ""), mx, y, ancho)
    y = draw_tabla_items(
        pdf,
        items or [],
        ancho,
        mx,
        y,
        tipo_moneda,
        alto,
        ubicacion,
        fecha_str,
        logo_base64,
        datos_cotizacion,
    )
    y = draw_texto_fijo(pdf, mx, y, tipo_moneda)
    y = draw_observaciones(pdf, observaciones or "", mx, y)
    y = draw_cierre(pdf, mx, y)
    y = draw_firma(pdf, firma_empresa_b64, firmante or "", cargo or "", cargo2 or "", ancho, y)
    draw_footer(pdf, ancho, mx, my)
    draw_paginacion(pdf, ancho, mx, my)
    pdf.showPage()
    pdf.save()
    buffer.seek(0)
    return buffer.getvalue()
