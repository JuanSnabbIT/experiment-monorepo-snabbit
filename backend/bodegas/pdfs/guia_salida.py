import base64
import os
from datetime import datetime
from io import BytesIO

from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph, Table, TableStyle
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from textwrap import wrap

from core.pdf.styles import FONTS, CELL_STYLE, MESES_ES
from core.pdf.components import LOGO_PATH
from core.pdf.canvas_utils import (
    draw_fecha,
    draw_encabezado,
    draw_titulo,
    draw_footer,
    draw_paginacion,
)

def draw_datos_guia(pdf, cliente_nombre, cliente_rut, entregado_a_nombre, recibido_por_nombre, mx, y):
    pdf.setFont(*FONTS["datos_label"])
    pdf.drawString(mx, y, "Destinatario / Cliente:")
    y -= 14
    
    pdf.setFont(*FONTS["datos"])
    if cliente_nombre:
        pdf.drawString(mx, y, f"Cliente: {cliente_nombre}")
        y -= 14
    if cliente_rut:
        pdf.drawString(mx, y, f"RUT: {cliente_rut}")
        y -= 14
    
    y -= 6
    
    if entregado_a_nombre:
        pdf.drawString(mx, y, f"Entregado A (Contacto): {entregado_a_nombre}")
        y -= 14
        
    if recibido_por_nombre:
        pdf.drawString(mx, y, f"Recibido Por (Sistema): {recibido_por_nombre}")
        y -= 14
            
    return y - 20

def draw_tabla_items_guia(pdf, items, ancho, mx, y, alto, ubicacion, fecha_str, logo_b64, numero_guia):
    # Headers: Description (Item+Cat), Cantidad, Serie
    headers = ["Descripci\u00f3n", "Cantidad", "N\u00b0 Serie"]
    data = [headers]
    
    for item in items:
        # item is dict: {nombre, categoria, cantidad, serie}
        nombre_str = str(item.get("nombre", ""))
        cat_str = str(item.get("categoria", ""))
        
        # Merge Name + Category
        combined = f"<b>{nombre_str}</b><br/><font size='8'>{cat_str}</font>"
        desc_para = Paragraph(combined, CELL_STYLE)
        
        cantidad = str(item.get("cantidad", ""))
        serie = str(item.get("serie", "")) if item.get("serie") else "-"
        
        data.append([desc_para, cantidad, serie])
        
    table_width = ancho - 2 * mx
    # Columns: 
    colWidths = [
            0.60 * table_width, # Desc
            0.15 * table_width, # Cantidad
            0.25 * table_width, # Serie
        ]
        
    style = TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("ALIGN", (2, 0), (-1, -1), "RIGHT"), # Cantidad Right
        ("GRID", (0, 0), (-1, -1), 0.5, colors.black),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
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
            draw_titulo(pdf, numero_guia, ancho, alto, mx, my=40, titulo_texto="Gu\u00eda de Salida N\u00b0")
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
            draw_titulo(pdf, numero_guia, ancho, alto, mx, my=40, titulo_texto="Gu\u00eda de Salida N\u00b0")
            y_start = alto - 40 - 90
            continue
        break
    return y_start

def draw_firmas_guia(pdf, ancho, y):
    # Two columns for signatures: Entregado Por / Recibido Por
    y -= 50
    
    pdf.line(40, y, ancho/2 - 20, y)
    pdf.line(ancho/2 + 20, y, ancho - 40, y)
    
    y -= 14
    pdf.setFont(*FONTS["firma_label"])
    pdf.drawCentredString( (40 + ancho/2 - 20)/2, y, "Entregado Por" )
    pdf.drawCentredString( (ancho/2 + 20 + ancho - 40)/2, y, "Recibido Conforme" )
    
    y -= 14
    pdf.setFont(*FONTS["firma"])
    pdf.drawCentredString( (40 + ancho/2 - 20)/2, y, "Firma y Timbre" )
    pdf.drawCentredString( (ancho/2 + 20 + ancho - 40)/2, y, "Firma y RUT" )
    
    return y - 20

def generar_pdf_guia_salida(
    numero_guia,
    fecha_guia,
    cliente_nombre,
    cliente_rut,
    entregado_a_nombre,
    recibido_por_nombre,
    items, # List of dicts
    buffer,
    observaciones=None
):
    pdf = canvas.Canvas(buffer, pagesize=A4)
    ancho, alto = A4
    mx, my = 40, 40
    ubicacion = "Santiago"
    
    logo_b64 = None
    if os.path.exists(LOGO_PATH):
       try: 
           with open(LOGO_PATH, "rb") as f:
               logo_bytes = f.read()
               logo_b64 = "data:image/png;base64," + base64.b64encode(logo_bytes).decode()
       except:
           pass

    try:
        # Try to parse the input date string
        for fmt in ("%d-%m-%Y", "%Y-%m-%d", "%d/%m/%Y"):
            try:
                dt = datetime.strptime(fecha_guia, fmt)
                fecha_str = f"{dt.day} de {MESES_ES[dt.month - 1]} de {dt.year}"
                break
            except ValueError:
                pass
        else:
             fecha_str = fecha_guia
    except Exception:
        fecha_str = fecha_guia
    
    # 1. Header
    draw_encabezado(pdf, ubicacion, fecha_str, logo_b64, ancho, alto, mx, my)
    
    # 2. Title
    draw_titulo(pdf, numero_guia, ancho, alto, mx, my, titulo_texto="Gu\u00eda de Salida N\u00b0")
    
    y = alto - my - 90
    
    # 3. Datos
    y = draw_datos_guia(
        pdf, cliente_nombre, cliente_rut, entregado_a_nombre, recibido_por_nombre, mx, y
    )
    
    # 4. Tabla Items
    if items:
        y = draw_tabla_items_guia(pdf, items, ancho, mx, y, alto, ubicacion, fecha_str, logo_b64, numero_guia)
    
    # 5. Observaciones
    if observaciones:
        pdf.setFont(*FONTS["datos_label"])
        pdf.drawString(mx, y, "Observaciones:")
        y -= 12
        pdf.setFont(*FONTS["datos"])
        for line in wrap(observaciones, width=90):
             pdf.drawString(mx, y, line)
             y -= 12
    
    # 6. Firmas
    y = draw_firmas_guia(pdf, ancho, y)
    
    # 7. Footer
    draw_footer(pdf, ancho, mx, my)
    draw_paginacion(pdf, ancho, mx, my)
    
    pdf.showPage()
    pdf.save()
    buffer.seek(0)
    return buffer
