import base64
from datetime import datetime
from io import BytesIO
from textwrap import wrap

from reportlab.pdfgen import canvas
from reportlab.platypus import Table, TableStyle, Paragraph
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4

from .styles import FONTS, CELL_STYLE, INTRO_STYLE, MESES_ES
from .canvas_utils import (
    draw_fecha,
    draw_encabezado,
    draw_titulo,
    draw_texto_fijo,
    draw_cierre,
    draw_firma,
    draw_footer,
    draw_paginacion,
    _format_usd,
    _format_clp,
    _format_uf,
)

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
        label = "Estimado/a:"
        pdf.setFont(*FONTS["datos_label"])
        pdf.drawString(mx, y, label)

        pdf.setFont(*FONTS["datos"])
        label_width = pdf.stringWidth(label, *FONTS["datos_label"]) + 6
        lines = wrap(str(destinatarios), width=90)
        if not lines:
            lines = [""]

        for idx, line in enumerate(lines):
            x = mx + label_width if idx == 0 else mx + label_width
            pdf.drawString(x, y, line)
            y -= 14
        y -= 6
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
