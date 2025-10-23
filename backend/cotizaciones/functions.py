from io import BytesIO
from reportlab.pdfgen import canvas
from reportlab.platypus import Table, TableStyle, Paragraph
from reportlab.lib import colors
from textwrap import wrap
from .models import SeguimientoCotizacion, Cotizacion
from empresas.models import UsuarioEmpresa
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import ImageReader
from reportlab.lib.styles import ParagraphStyle
import base64

# def generar_pdf_cotizacion(datos_cotizacion,nombre_empresa, rut_empresa, direccion_empresa, telefono_empresa, 
#                             email_empresa, sitio_web_empresa, nombre_cliente, telefono_cliente,
#                             direccion_cliente, rut_cliente, email_cliente):
#     buffer = BytesIO()
#     pdf = canvas.Canvas(buffer, pagesize=letter)
#     ancho, alto = letter

#     # Márgenes reducidos
#     margen_x = 30
#     margen_y = 30

#     # Posición inicial del encabezado
#     y_pos = alto - margen_y

#     # Encabezado: Nombre de la empresa
#     pdf.setFont("Helvetica-Bold", 18)
#     pdf.drawString(margen_x, y_pos, nombre_empresa)
#     y_pos -= 25

#     pdf.setFont("Helvetica", 10)

#     # RUT de la empresa
#     if rut_empresa:
#         pdf.drawString(margen_x, y_pos, f"RUT: {rut_empresa}")
#         y_pos -= 15

#     # Dirección de la empresa
#     if direccion_empresa:
#         pdf.drawString(margen_x, y_pos, direccion_empresa)
#         y_pos -= 15

#     # Teléfono de la empresa
#     if telefono_empresa:
#         pdf.drawString(margen_x, y_pos, f"Teléfono: {telefono_empresa}")
#         y_pos -= 15

#     # Correo de la empresa
#     if email_empresa:
#         pdf.drawString(margen_x, y_pos, f"Correo: {email_empresa}")
#         y_pos -= 15

#     # Sitio web de la empresa
#     if sitio_web_empresa:
#         pdf.drawString(margen_x, y_pos, f"Sitio Web: {sitio_web_empresa}")
#         y_pos -= 15

#     # Encabezado derecha: Detalles de la cotización
#     pdf.setFont("Helvetica-Bold", 14)
#     pdf.drawString(ancho - margen_x - 200, alto - margen_y, "COTIZACIÓN")
#     pdf.setFont("Helvetica", 10)
#     pdf.drawString(ancho - margen_x - 200, alto - margen_y - 20, f"Número de Cotización: {datos_cotizacion['numero_cotizacion']}")
#     pdf.drawString(ancho - margen_x - 200, alto - margen_y - 32, f"Fecha de Vencimiento: {datos_cotizacion['fecha_vencimiento']}")
#     # Fecha de Vencimiento

#     # Línea divisoria
#     pdf.line(margen_x, y_pos - 10, ancho - margen_x, y_pos - 10)
#     y_pos -= 30

#     # Información del destinatario
#     pdf.setFont("Helvetica-Bold", 12)
#     pdf.drawString(margen_x, y_pos, "SEÑORES:")
#     y_pos -= 15

#     pdf.setFont("Helvetica", 10)
#     pdf.drawString(margen_x, y_pos, nombre_cliente)
#     y_pos -= 15

#     if direccion_cliente:
#         pdf.drawString(margen_x, y_pos, direccion_cliente)
#         y_pos -= 15

#     if rut_cliente:
#         pdf.drawString(margen_x, y_pos, f"RUT: {rut_cliente}")
#         y_pos -= 15

#     if telefono_cliente:
#         pdf.drawString(margen_x, y_pos, f"Teléfono: {telefono_cliente}")
#         y_pos -= 15

#     if email_cliente:
#         pdf.drawString(margen_x, y_pos, f"Correo: {email_cliente}")
#         y_pos -= 15

#     # Estado
#     pdf.drawString(margen_x, y_pos, f"Estado: {datos_cotizacion['estado']}")
#     y_pos -= 15

#     # Total Estimado
#     pdf.drawString(margen_x, y_pos, f"Total Estimado: {datos_cotizacion['total_estimado']}")
#     y_pos -= 15

#     # Línea divisoria
#     pdf.line(margen_x, y_pos - 10, ancho - margen_x, y_pos - 10)
#     y_pos -= 30

#     # V1
#     # # Crear tabla con los datos
#     # data = [['Descripción', 'Cantidad', 'Precio Unitario', 'Costo Total']]
#     # for item in datos_cotizacion['items']:
#     #     data.append([
#     #         item['descripcion'],
#     #         item['cantidad'],
#     #         f"${item['precio_unitario']:.2f}",
#     #         f"${item['costo_total']:.2f}"
#     #     ])

#     # ancho_tabla = ancho - (2 * margen_x)
#     # colWidths = [0.4 * ancho_tabla, 0.2 * ancho_tabla, 0.2 * ancho_tabla, 0.2 * ancho_tabla]

#     # tabla = Table(data, colWidths=colWidths)
#     # tabla.setStyle(TableStyle([
#     #     ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#003366")),
#     #     ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
#     #     ("ALIGN", (0, 0), (-1, -1), "CENTER"),
#     #     ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
#     #     ("FONTSIZE", (0, 0), (-1, 0), 10),
#     #     ("GRID", (0, 0), (-1, -1), 1, colors.black),
#     # ]))
    
#     # V2
#     # Antes de construir la lista `data`, obtenemos el stylesheet:
#     styles = getSampleStyleSheet()
#     # Creamos un estilo base para la celda (puedes ajustar leading si lo necesitas)
#     cell_style = ParagraphStyle(
#         'ItemCell',
#         parent=styles['BodyText'],
#         fontName='Helvetica',
#         fontSize=10,
#         leading=12,
#     )

#     # Encabezado de la tabla
#     data = [['Descripción', 'Cantidad', 'Precio Unitario', 'Costo Total']]

#     # Para cada ítem, construimos un Paragraph con nombre + descripción
#     for item in datos_cotizacion['items']:
#         nombre = item.get('nombre', '')  # asumiendo que tu dict trae 'nombre'
#         descripcion = item.get('descripcion', '')

#         # Usamos HTML-like tags para negrita y tamaño de fuente
#         texto_item = f"<b>{nombre}</b><br/><font size='8'>{descripcion}</font>"
#         celda_descripcion = Paragraph(texto_item, cell_style)

#         data.append([
#             celda_descripcion,
#             item['cantidad'],
#             f"${item['precio_unitario']:.2f}",
#             f"${item['costo_total']:.2f}"
#         ])

#     # Luego el resto de tu código de ReportLab para crear la tabla:
#     ancho_tabla = ancho - (2 * margen_x)
#     colWidths = [0.4 * ancho_tabla, 0.2 * ancho_tabla, 0.2 * ancho_tabla, 0.2 * ancho_tabla]

#     tabla = Table(data, colWidths=colWidths)
#     tabla.setStyle(TableStyle([
#         ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#003366")),
#         ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
#         ("ALIGN", (0, 0), (-1, -1), "CENTER"),
#         ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
#         ("FONTSIZE", (0, 0), (-1, 0), 10),
#         ("GRID", (0, 0), (-1, -1), 1, colors.black),
#     ]))

#     # Posicionar y dibujar la tabla
#     table_width, table_height = tabla.wrap(0, 0)
#     table_position_y = y_pos - table_height - 40
#     tabla.drawOn(pdf, margen_x, table_position_y)

#     # Observaciones
#     comments_position_y = table_position_y - 40
#     pdf.setFont("Helvetica", 10)
#     pdf.drawString(margen_x, comments_position_y, "Observaciones:")
#     pdf.rect(margen_x, comments_position_y - 50, ancho - margen_x * 2, 40)

#     observaciones = datos_cotizacion.get('observaciones', '')
#     wrapped_text = pdf.beginText(margen_x + 10, comments_position_y - 25)
#     wrapped_text.setFont("Helvetica", 10)
#     max_width = ancho - margen_x * 2 - 20
#     for line in wrap(observaciones, width=int(max_width / 6)):
#         wrapped_text.textLine(line)
#     pdf.drawText(wrapped_text)

#     # Guardar PDF en el buffer
#     pdf.save()
#     buffer.seek(0)
#     return buffer.getvalue()

# def mejorar_cuerpo_correo(cliente, cotizacion, empresa):
#     html = f"""
#     <html>
#     <head>
#         <style>
#             body {{
#                 font-family: 'Arial', sans-serif;
#                 background-color: #f4f4f4;
#                 color: #333;
#                 line-height: 1.6;
#                 padding: 20px;
#             }}
#             .container {{
#                 background-color: #fff;
#                 padding: 20px;
#                 border-radius: 10px;
#                 box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
#             }}
#             .header {{
#                 background-color: #003366;
#                 color: white;
#                 padding: 10px;
#                 text-align: center;
#                 border-radius: 10px 10px 0 0;
#             }}
#             .content {{
#                 margin: 20px;
#             }}
#             .details {{
#                 margin-top: 20px;
#                 padding: 10px;
#                 background-color: #f9f9f9;
#                 border-radius: 5px;
#             }}
#             .details p {{
#                 margin: 5px 0;
#             }}
#             .footer {{
#                 margin-top: 30px;
#                 font-size: 0.9em;
#                 color: #555;
#                 text-align: center;
#             }}
#         </style>
#     </head>
#     <body>
#         <div class="container">
#             <div class="header">
#                 <h1>Detalles de la Cotización</h1>
#             </div>
#             <div class="content">
#                 <p>Estimado {cliente.nombre},</p>
#                 <p>Nos complace informarle que su cotización número <strong>{cotizacion.numero_cotizacion}</strong> esta lista para que la revise.</p>
#                 <p>Adjunto a este correo encontrará el documento PDF con los detalles completos de la cotización.</p>
#             </div>
#         </div>
#     </body>
#     </html>
#     """
#     return html

def crear_seguimiento_cotizacion(cotizacion_id, usuario_id, comentario):
    """
    Crea un seguimiento de cotización de forma dinámica.

    :param cotizacion_id: ID de la cotización relacionada
    :param user_id: ID del usuario autenticado
    :param comentario: Descripción del seguimiento
    """
    try:
        cotizacion = Cotizacion.objects.get(id=cotizacion_id)
        usuario_empresa = UsuarioEmpresa.objects.get(id=usuario_id) if usuario_id else None
    except (Cotizacion.DoesNotExist, UsuarioEmpresa.DoesNotExist):
        return None  # Evitar errores si la cotización o el usuario no existen

    return SeguimientoCotizacion.objects.create(
        cotizacion=cotizacion,
        usuario=usuario_empresa,
        comentario=comentario
    )

FONTS = {
    'fecha':        ("Helvetica", 9),
    'titulo':       ("Helvetica-Bold", 14),
    'datos_label':  ("Helvetica-Bold", 10),
    'datos':        ("Helvetica", 10),
    'introduccion': ("Helvetica", 10),
    'fijo':         ("Helvetica-Oblique", 9),
    'cierre':       ("Helvetica", 10),
    'firma_label':  ("Helvetica-Bold", 10),
    'firma':        ("Helvetica", 10),
    'firma_cargo':  ("Helvetica", 9),
    'footer':       ("Helvetica", 8),
}

MESES_ES = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
]

INTRO_STYLE = ParagraphStyle(
    'intro', fontName='Helvetica', fontSize=10, leading=12
)

FOOTER_STYLE = ParagraphStyle(
    'footer', fontName='Helvetica', fontSize=8, leading=10, alignment=1
)

CELL_STYLE = ParagraphStyle(
    'cell', fontName='Helvetica', fontSize=10, leading=12
)

def draw_fecha(pdf, ubicacion, fecha_str, mx, alto, my):
    pdf.setFont(*FONTS['fecha'])
    pdf.drawString(mx, alto - my + 1, f"{ubicacion}, {fecha_str}")

def draw_logo(pdf, logo_b64, ancho, alto, mx, my):
    if not logo_b64:
        return
    try:
        b64 = logo_b64.split(',', 1)[1] if ',' in logo_b64 else logo_b64
        img = ImageReader(BytesIO(base64.b64decode(b64)))
        iw, ih = img.getSize()
        w_logo = 120
        h_logo = w_logo * (ih / iw)
        pdf.drawImage(img, ancho - mx - w_logo, alto - my - h_logo, width=w_logo, height=h_logo, mask='auto')
    except:
        pass

def draw_encabezado(pdf, ubicacion, fecha_str, logo_b64, ancho, alto, mx, my):
    draw_fecha(pdf, ubicacion, fecha_str, mx, alto, my)
    draw_logo(pdf, logo_b64, ancho, alto, mx, my)

def draw_titulo(pdf, numero, ancho, alto, mx, my):
    pdf.setFont(*FONTS['titulo'])
    pdf.drawCentredString(ancho/2, alto - my - 40, f"Cotización N° {numero}")

def draw_datos_cliente(pdf, nombre, rut, direccion, destinatarios, mx, y):
    pdf.setFont(*FONTS['datos_label'])
    pdf.drawString(mx, y, f"Cliente: {nombre}")
    y -= 14
    if rut:
        pdf.setFont(*FONTS['datos'])
        pdf.drawString(mx, y, f"Rut: {rut}")
        y -= 14
    if direccion:
        pdf.setFont(*FONTS['datos'])
        pdf.drawString(mx, y, f"Dirección: {direccion}")
        y -= 20
    else:
        y -= 20
    if destinatarios:
        pdf.setFont(*FONTS['datos_label'])
        pdf.drawString(mx, y, f"Estimado/a: {destinatarios}")
        y -= 20
    return y

def draw_introduccion(pdf, descripcion, mx, y, ancho):
    intro_text = (f"Ud. ha solicitado los precios de <b>{descripcion}</b>, "
                  "a continuación aparece nuestra cotización:")
    para = Paragraph(intro_text, INTRO_STYLE)
    w, h = para.wrap(ancho - 2 * mx, y)
    para.drawOn(pdf, mx, y - h)
    return y - h - 12

def draw_tabla_items(pdf, items, ancho, mx, y, tipo_moneda, alto, ubicacion, fecha_str, logo_b64, datos_cotizacion):
    try:
        tipo = int(tipo_moneda)
    except:
        tipo = 1
    if not items:
        return y
    if tipo == 1:
        encabezados = ["Descripción", "Cantidad", "Precio Unit USD", "Total Neto USD"]
    else:
        encabezados = ["Descripción", "Cantidad", "Precio Unit", "Total Neto"]
    data = [encabezados]
    for it in items:
        nombre_item = it.get('nombre', '').replace('<', '').replace('>', '')
        desc_texto = it.get('descripcion', '').replace('<', '').replace('>', '')
        combined = f"<b>{nombre_item}</b><br/><font size='8'>{desc_texto}</font>"
        desc_para = Paragraph(combined, CELL_STYLE)
        pu = float(it['precio_unitario'])
        tn = float(it['total_neto'])
        if tipo == 1:
            s_pu = f"{pu:,.1f}".replace(",", "X").replace(".", ",").replace("X", ".")
            s_tn = f"{tn:,.1f}".replace(",", "X").replace(".", ",").replace("X", ".")
            valor_pu = f"{s_pu} USD"
            valor_tn = f"{s_tn} USD"
        elif tipo == 2:
            s_pu = f"{pu:,.0f}".replace(",", "X").replace(".", ",").replace("X", ".")
            s_tn = f"{tn:,.0f}".replace(",", "X").replace(".", ",").replace("X", ".")
            valor_pu = f"${s_pu}"
            valor_tn = f"${s_tn}"
        else:
            s_pu = f"{pu:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
            s_tn = f"{tn:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
            valor_pu = f"{s_pu} UF"
            valor_tn = f"{s_tn} UF"
        data.append([desc_para, str(it['cantidad']), valor_pu, valor_tn])
    table_width = ancho - 2 * mx
    colWidths = [0.4 * table_width, 0.15 * table_width, 0.2 * table_width, 0.25 * table_width]
    style = TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('ALIGN', (1, 1), (-1, -1), 'RIGHT'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
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
            draw_titulo(pdf, datos_cotizacion.get('numero_cotizacion',''), ancho, alto, mx, my=40)
            y_start = alto - 40 - 90
        parts = remaining.split(availW, availH)
        if not parts:
            break
        part = parts[0]
        w, h = part.wrap(availW, availH)
        part.drawOn(pdf, mx, y_start - h)
        y_start -= h + 20
        if len(parts) > 1:
            remaining = parts[1]
            pdf.showPage()
            draw_encabezado(pdf, ubicacion, fecha_str, logo_b64, ancho, alto, mx, my=40)
            draw_titulo(pdf, datos_cotizacion.get('numero_cotizacion',''), ancho, alto, mx, my=40)
            y_start = alto - 40 - 90
            continue
        break
    return y_start

def textotipomoneda(tipo_moneda):
    try:
        tipo = int(tipo_moneda)
    except:
        return ""
    if tipo == 1:
        return "Valores netos expresados en USD, conversión del dólar, observado del día de la compra +$5"
    elif tipo == 2:
        return "Valores netos expresados en CLP, debe agregar IVA"
    elif tipo == 3:
        return "Valores netos expresados en UF, debe agregar IVA"
    return ""

def draw_texto_fijo(pdf, mx, y, tipo_moneda):
    texto = textotipomoneda(tipo_moneda)
    pdf.setFont(*FONTS['fijo'])
    for line in wrap(texto, width=90):
        pdf.drawString(mx, y, line)
        y -= 12
    return y - 10

def draw_observaciones(pdf, observaciones, mx, y):
    if not observaciones:
        return y
    pdf.setFont(*FONTS['fijo'])
    text_obj = pdf.beginText(mx, y)
    for line in wrap(observaciones, width=90):
        text_obj.textLine(line)
        y -= 12
    pdf.drawText(text_obj)
    return y - 20

def draw_cierre(pdf, mx, y):
    cierre = (
        "Gracias por darnos la oportunidad de ofrecerle este presupuesto. "
        "Como siempre, es para nosotros un placer hacer negocios con ustedes. "
        "Esperamos hacer realidad este pedido para su completa satisfacción."
    )
    pdf.setFont(*FONTS['cierre'])
    text_obj = pdf.beginText(mx, y)
    for line in wrap(cierre, width=115):
        text_obj.textLine(line)
        y -= 12
    pdf.drawText(text_obj)
    return y - 30

def draw_firma(pdf, firma_empresa_b64, firmante, cargo, cargo2, ancho, y):
    if firma_empresa_b64:
        try:
            b64 = firma_empresa_b64.split(',', 1)[1] if ',' in firma_empresa_b64 else firma_empresa_b64
            img = ImageReader(BytesIO(base64.b64decode(b64)))
            iw, ih = img.getSize()
            w_img = 200
            h_img = w_img * (ih / iw)
            x_img = (ancho - w_img) / 2
            pdf.drawImage(img, x_img, y - h_img, width=w_img, height=h_img, mask='auto')
            y = y - h_img - 10
        except:
            pass
    lines = ['Atentamente,', firmante]
    if cargo:
        lines.append(cargo)
    if cargo2:
        lines.append(cargo2)
    for i, line in enumerate(lines):
        if i == 0:
            pdf.setFont(*FONTS['firma_label'])
        elif i == 1:
            pdf.setFont(*FONTS['firma'])
        else:
            pdf.setFont(*FONTS['firma_cargo'])
        pdf.drawCentredString(ancho/2, y - i * 14, line)
    return y - len(lines) * 14 - 10

def draw_footer(pdf, ancho, mx, my):
    footer_text = (
        "<b>Snabb IT | Asesores Tecnológicos</b><br/>"
        "<a href='https://maps.app.goo.gl/R1pAm1ANqs5eEjvSA'>Gran Av. José Miguel Carrera N° 3840 Of - 808, San Miguel</a> - "
        "Fono: <a href='tel:+56227596140'>(56-2) 27596140</a><br/>"
        "Visítenos en <a href='https://snabbit.cl' target='_blank'>https://snabbit.cl</a>"
    )
    para = Paragraph(footer_text, FOOTER_STYLE)
    w, h = para.wrap(ancho - 2 * mx, my)
    para.drawOn(pdf, mx, my - h - 5)

def draw_paginacion(pdf, ancho, mx, my):
    page = pdf.getPageNumber()
    pdf.setFont(*FONTS['footer'])
    pdf.drawRightString(ancho - mx, 15, f"{page}/{page}")

def generar_pdf_cotizacion(
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
    tipo_moneda='1'
):
    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    ancho, alto = A4
    mx, my = 40, 40
    fecha_obj = datos_cotizacion.get('fecha_cotizacion')
    if isinstance(fecha_obj, (datetime, )):
        dia = fecha_obj.day
        mes = MESES_ES[fecha_obj.month - 1]
        anio = fecha_obj.year
        fecha_str = f"{dia} de {mes} de {anio}"
    else:
        hoy = datetime.now()
        dia = hoy.day
        mes = MESES_ES[hoy.month - 1]
        anio = hoy.year
        fecha_str = f"{dia} de {mes} de {anio}"
    y = alto - my - 90
    draw_encabezado(pdf, ubicacion, fecha_str, logo_base64, ancho, alto, mx, my)
    draw_titulo(pdf, datos_cotizacion.get('numero_cotizacion',''), ancho, alto, mx, my)
    y = draw_datos_cliente(pdf, nombre_cliente, rut_cliente, direccion_cliente, destinatarios, mx, y)
    y = draw_introduccion(pdf, datos_cotizacion.get('descripcion',''), mx, y, ancho)
    y = draw_tabla_items(pdf, items or [], ancho, mx, y, tipo_moneda, alto, ubicacion, fecha_str, logo_base64, datos_cotizacion)
    y = draw_texto_fijo(pdf, mx, y, tipo_moneda)
    y = draw_observaciones(pdf, observaciones or '', mx, y)
    y = draw_cierre(pdf, mx, y)
    y = draw_firma(pdf, firma_empresa_b64, firmante or '', cargo or '', cargo2 or '', ancho, y)
    draw_footer(pdf, ancho, mx, my)
    draw_paginacion(pdf, ancho, mx, my)
    pdf.showPage()
    pdf.save()
    buffer.seek(0)
    return buffer.getvalue()

def generar_pdf_cotizacion_desde_model(cotizacion_id, ubicacion="Santiago"):
    cot = (Cotizacion.objects
           .select_related('empresa','cliente')
           .prefetch_related('items','solicitantes')
           .get(pk=cotizacion_id))
    datos = {
        'numero_cotizacion': cot.numero_cotizacion,
        'descripcion': cot.descripcion or ''
    }
    datos['fecha_cotizacion'] = cot.fecha_creacion
    logo_b64 = None
    logo_field = getattr(cot.empresa, 'logo', None)
    logo_bytes = None
    if logo_field and hasattr(logo_field, 'read'):
        try:
            logo_bytes = logo_field.read()
        except:
            pass
    elif isinstance(logo_field, str) and ',' in logo_field:
        logo_b64 = logo_field
    elif isinstance(logo_field, str):
        try:
            logo_bytes = open(logo_field, 'rb').read()
        except:
            pass
    if logo_bytes:
        logo_b64 = 'data:image/png;base64,' + base64.b64encode(logo_bytes).decode()
    destinatarios = '/'.join(str(s.usuario) for s in cot.solicitantes.all())
    items = []
    for it in cot.items.all():
        if cot.tipo_moneda == "1":
            pu_backend = it.precio_unitario_backend['usd']
            tn_backend = it.precio_total_backend['usd']
        elif cot.tipo_moneda == "2":
            pu_backend = it.precio_unitario_backend['clp']
            tn_backend = it.precio_total_backend['clp']
        else:
            pu_backend = it.precio_venta_neta_unitario_moneda_base
            tn_backend = it.precio_venta_neta_total_moneda_base
        items.append({
            'nombre': it.item_empresa.nombre if it.item_empresa else (it.nombre or ''),
            'descripcion': it.item_empresa.descripcion_corta if it.item_empresa else (it.descripcion or ''),
            'cantidad': it.cantidad,
            'precio_unitario': f"{pu_backend:.2f}",
            'total_neto': f"{tn_backend:.2f}"
        })
    firma_empresa_b64 = getattr(cot.empresa, 'firma_empresa', None)
    return generar_pdf_cotizacion(
        datos_cotizacion=datos,
        logo_base64=logo_b64,
        nombre_cliente=cot.cliente.nombre,
        rut_cliente=getattr(cot.cliente, 'rut_empresa', ''),
        direccion_cliente=getattr(cot.cliente, 'direccion_principal', ''),
        destinatarios=destinatarios,
        items=items,
        observaciones=cot.observaciones or '',
        firmante='Luis Rojas Molina',
        cargo='Jefe de Proyectos',
        cargo2='Snabbit Tecnologías',
        firma_empresa_b64=firma_empresa_b64,
        ubicacion=ubicacion,
        tipo_moneda=cot.tipo_moneda
    )
