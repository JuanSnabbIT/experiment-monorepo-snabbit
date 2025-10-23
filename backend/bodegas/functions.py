from collections import defaultdict
from io import BytesIO
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import Table, TableStyle, SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib import colors
from textwrap import wrap

from empresas.models import UsuarioEmpresa
from recursos.models import Equipo  # ajusta el import a tu app real

def crear_equipos_para_items_guia(guia_salida, usuario_empresa):
    """
    Crea registros Equipo para todos los Items individualizados de la guía.
    Debe ejecutarse dentro de una transacción si el llamador lo requiere.
    """

    for item_guia in guia_salida.itemsguiasalida_set.filter(individualizado=True):
        datos_serie_item = item_guia.numero_serie            # {"serie": "...", ...}

        if not (isinstance(datos_serie_item, dict) and datos_serie_item.get("serie")):
            continue  # la validación ya la hiciste antes, pero mejor prevenir

        serie = datos_serie_item["serie"]

        # --- localizar el ItemOrdenCompraEnStock correspondiente ---
        item_oc_obj = None
        for item_oc in item_guia.stock_item.itemordencompraenstock_set.all():
            numeros_serie_data = item_oc.numeros_serie        # {"numeros_serie": [ {serie, ...}, ... ]}
            series_list = (numeros_serie_data or {}).get("numeros_serie", [])
            if any(sd.get("serie") == serie for sd in series_list):
                item_oc_obj = item_oc
                break

        # --- obtener fecha de compra ---
        orden_compra = None
        if item_oc_obj is not None:
            if hasattr(item_oc_obj.item_oc, "orden_compra"):
                orden_compra = item_oc_obj.item_oc.orden_compra
            else:
                orden_compra = item_oc_obj.item_oc

        Equipo.objects.get_or_create(
            numero_serie=serie,
            defaults={
                "registrado_por": usuario_empresa,
                "fecha_compra": getattr(orden_compra, "fecha_compra", None),
            },
        )

def generar_orden_de_compra(nombre_empresa, rut_empresa, direccion_empresa, telefono_empresa, 
                            email_empresa, sitio_web_empresa, fecha_orden, codigo_orden, nombre_cliente, telefono_cliente,
                            direccion_cliente, rut_cliente, email_cliente, datos_tabla, neto_orden, subtotal_orden, iva_orden,
                            total_orden, comentarios_orden, buffer):
    
    # Crear PDF en el buffer
    pdf = canvas.Canvas(buffer, pagesize=letter)
    ancho, alto = letter

    # Márgenes reducidos
    margen_x = 30
    margen_y = 30

    # Posición inicial del encabezado
    y_pos = alto - margen_y

    # Encabezado: Nombre de la empresa
    pdf.setFont("Helvetica-Bold", 18)
    pdf.drawString(margen_x, y_pos, nombre_empresa)
    y_pos -= 25

    pdf.setFont("Helvetica", 10)

    # RUT de la empresa
    if rut_empresa:
        pdf.drawString(margen_x, y_pos, f"RUT: {rut_empresa}")
        y_pos -= 15

    # Dirección de la empresa (wrapped dentro de la zona izquierda)
    if direccion_empresa:
        # Reservar espacio horizontal para detalles de la orden a la derecha
        x_right = ancho - margen_x - 200
        left_width = x_right - margen_x
        max_chars = int(left_width / 6)
        for line in wrap(direccion_empresa, width=max_chars):
            pdf.drawString(margen_x, y_pos, line)
            y_pos -= 15

    # Teléfono de la empresa
    if telefono_empresa:
        pdf.drawString(margen_x, y_pos, f"Teléfono: {telefono_empresa}")
        y_pos -= 15

    # Correo de la empresa
    if email_empresa:
        pdf.drawString(margen_x, y_pos, f"Correo: {email_empresa}")
        y_pos -= 15

    # Sitio web de la empresa
    if sitio_web_empresa:
        pdf.drawString(margen_x, y_pos, f"Sitio Web: {sitio_web_empresa}")
        y_pos -= 15

    # Encabezado derecha: Detalles de la orden
    pdf.setFont("Helvetica-Bold", 14)
    pdf.drawString(ancho - margen_x - 200, alto - margen_y, "ORDEN DE COMPRA")
    pdf.setFont("Helvetica", 10)
    pdf.drawString(ancho - margen_x - 200, alto - margen_y - 20, f"Fecha: {fecha_orden}")
    pdf.drawString(ancho - margen_x - 200, alto - margen_y - 35, f"Número de Orden de Compra: {codigo_orden}")

    # Línea divisoria
    pdf.line(margen_x, y_pos - 10, ancho - margen_x, y_pos - 10)
    y_pos -= 30

    # Información del destinatario
    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawString(margen_x, y_pos, "SEÑORES:")
    y_pos -= 15

    pdf.setFont("Helvetica", 10)
    pdf.drawString(margen_x, y_pos, nombre_cliente)
    y_pos -= 15

    if direccion_cliente:
        pdf.drawString(margen_x, y_pos, direccion_cliente)
        y_pos -= 15

    if rut_cliente:
        pdf.drawString(margen_x, y_pos, f"RUT: {rut_cliente}")
        y_pos -= 15

    if telefono_cliente:
        pdf.drawString(margen_x, y_pos, f"Teléfono: {telefono_cliente}")
        y_pos -= 15

    if email_cliente:
        pdf.drawString(margen_x, y_pos, f"Correo: {email_cliente}")
        y_pos -= 15

    # Línea divisoria
    pdf.line(margen_x, y_pos - 10, ancho - margen_x, y_pos - 10)
    y_pos -= 30

    # Preparar estilos para la tabla
    styles = getSampleStyleSheet()
    desc_style = ParagraphStyle(
        name='TableDescription',
        parent=styles['BodyText'],
        fontSize=8,
        leading=10
    )

    # Construir datos de la tabla con Paragraph para la descripción
    tabla_data = []
    header = datos_tabla[0]
    tabla_data.append(header)

    for row in datos_tabla[1:]:
        if len(row) == 6:
            codigo, nombre_item, descripcion_item, cantidad, precio_unitario, total = row
            contenido = Paragraph(f"<b>{nombre_item}</b><br/>{descripcion_item}", desc_style)
        elif len(row) == 5:
            codigo, descripcion, cantidad, precio_unitario, total = row
            contenido = Paragraph(descripcion, desc_style)
        else:
            codigo = row[0]
            cantidad, precio_unitario, total = row[-3], row[-2], row[-1]
            resto = " ".join(str(x) for x in row[1:-3])
            contenido = Paragraph(resto, desc_style)
        tabla_data.append([codigo, contenido, cantidad, precio_unitario, total])

    # Definir anchos de columnas
    ancho_tabla = ancho - 2*margen_x
    colWidths = [0.15*ancho_tabla, 0.5*ancho_tabla, 0.1*ancho_tabla, 0.12*ancho_tabla, 0.13*ancho_tabla]

    tabla = Table(tabla_data, colWidths=colWidths)
    tabla.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,0), colors.HexColor("#003366")),
        ("TEXTCOLOR", (0,0), (-1,0), colors.white),
        ("ALIGN", (0,0), (-1,0), "CENTER"),
        ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
        ("FONTSIZE", (0,0), (-1,0), 10),
        ("ALIGN", (1,1), (1,-1), "LEFT"),
        ("ALIGN", (2,1), (2,-1), "CENTER"),
        ("ALIGN", (3,1), (3,-1), "CENTER"),
        ("ALIGN", (4,1), (4,-1), "CENTER"),
        ("GRID", (0,0), (-1,-1), 1, colors.black)
    ]))

    # Dibujar tabla
    table_w, table_h = tabla.wrap(0,0)
    y_tabla = y_pos - table_h - 40
    tabla.drawOn(pdf, margen_x, y_tabla)

    # Totales
    y_tot = y_tabla - 40
    pdf.setFont("Helvetica-Bold", 10)
    pdf.drawRightString(ancho-margen_x, y_tot, f"NETO: {neto_orden}")
    pdf.drawRightString(ancho-margen_x, y_tot-15, f"SUBTOTAL: {subtotal_orden}")
    pdf.drawRightString(ancho-margen_x, y_tot-30, f"IVA 19%: {iva_orden}")
    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawRightString(ancho-margen_x, y_tot-45, f"TOTAL: {total_orden}")

    # Comentarios
    y_com = y_tot - 100
    pdf.setFont("Helvetica", 10)
    pdf.drawString(margen_x, y_com, "Comentarios o instrucciones especiales:")
    pdf.rect(margen_x, y_com-50, ancho-2*margen_x, 40)
    text = pdf.beginText(margen_x+10, y_com-25)
    text.setFont("Helvetica", 10)
    max_w = ancho - 2*margen_x - 20
    for ln in wrap(comentarios_orden, width=int(max_w/6)):
        text.textLine(ln)
    pdf.drawText(text)

    # Guardar y resetear
    pdf.save()
    buffer.seek(0)

def generar_pdf_bodega(datos_bodega):
    """
    Genera un archivo PDF con tabla estilizada en azul y sin bordes visibles.
    
    :param datos_bodega: Diccionario con la información de la bodega y sus items.
    :return: BytesIO con el contenido del PDF.
    """
    buffer = BytesIO()
    margin = 30  # Margen ajustado a 30 puntos
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=margin,
        rightMargin=margin,
        topMargin=margin,
        bottomMargin=margin,
    )

    elements = []
    styles = getSampleStyleSheet()
    title_style = styles["Title"]
    title_style.fontSize = 14
    title_style.alignment = 1  # Centrar el texto

    # Título
    title = Paragraph(f"<b>Reporte de Bodega: {datos_bodega['nombre']}</b>", title_style)
    elements.append(title)
    elements.append(Spacer(1, 10))  # Espaciado entre el título y la tabla

    # Tabla de datos
    table_data = [
        ["Nombre del Item", "Categoría", "Fabricante", "Cantidad", "PMP", "Proveedores"]
    ]

    for item in datos_bodega['items']:
        table_data.append([
            item['nombre'],
            item['categoria'],
            item['fabricante'],
            item['cantidad'],
            item['pmp'],
            item['proveedores']
        ])

    # Estilo de la tabla
    table = Table(table_data, colWidths=[100, 100, 100, 60, 60, 120])
    table.setStyle(TableStyle([
        # Estilo para encabezados
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#003366")),  # Azul oscuro
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),  # Texto blanco en encabezados
        ("ALIGN", (0, 0), (-1, 0), "CENTER"),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 10),

        # Estilo para celdas
        ("ALIGN", (0, 1), (-1, -1), "CENTER"),
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 1), (-1, -1), 9),

        # Bordes de las celdas
        ("GRID", (0, 0), (-1, -1), 0.5, colors.black),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]))

    elements.append(table)

    # Construir el PDF
    doc.build(elements)

    buffer.seek(0)
    return buffer

def generar_pdf_bodega_resumido(datos_bodega):
    """
    Genera un archivo PDF con ítems agrupados por categoría y tabla estilizada.
    
    :param datos_bodega: Diccionario con la información de la bodega y sus ítems.
    :return: BytesIO con el contenido del PDF.
    """
    buffer = BytesIO()
    margin = 30  # Margen ajustado a 30 puntos
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=margin,
        rightMargin=margin,
        topMargin=margin,
        bottomMargin=margin,
    )

    elements = []
    styles = getSampleStyleSheet()
    title_style = styles["Title"]
    title_style.fontSize = 14
    title_style.alignment = 1  # Centrar el texto

    # Título
    title = Paragraph(f"<b>Reporte de Bodega: {datos_bodega['nombre']}</b>", title_style)
    elements.append(title)
    elements.append(Spacer(1, 10))  # Espaciado entre el título y la tabla

    # Agrupar los ítems por categoría
    categorias = defaultdict(lambda: {"cantidad_total": 0, "pmp_total": 0, "num_items": 0})

    for item in datos_bodega['items']:
        categoria = item['categoria'] if item['categoria'] else "Sin categoría"
        categorias[categoria]["cantidad_total"] += item['cantidad']
        categorias[categoria]["pmp_total"] += item['cantidad'] * item['pmp']
        categorias[categoria]["num_items"] += 1

    # Calcular PMP promedio ponderado por categoría
    for categoria, datos in categorias.items():
        if datos["cantidad_total"] > 0:
            datos["pmp_promedio"] = datos["pmp_total"] / datos["cantidad_total"]
        else:
            datos["pmp_promedio"] = 0

    # Crear datos para la tabla
    table_data = [["Categoría", "Cantidad Total", "PMP Promedio"]]

    for categoria, datos in categorias.items():
        table_data.append([
            categoria,
            datos["cantidad_total"],
            f"${datos['pmp_promedio']:.2f}"
        ])

    # Estilo de la tabla
    table = Table(table_data, colWidths=[200, 100, 150])
    table.setStyle(TableStyle([
        # Estilo para encabezados
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#003366")),  # Azul oscuro
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),  # Texto blanco en encabezados
        ("ALIGN", (0, 0), (-1, 0), "CENTER"),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 10),

        # Estilo para celdas
        ("ALIGN", (0, 1), (-1, -1), "CENTER"),
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 1), (-1, -1), 9),

        # Bordes de las celdas
        ("GRID", (0, 0), (-1, -1), 0.5, colors.black),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]))

    elements.append(table)

    # Construir el PDF
    doc.build(elements)

    buffer.seek(0)
    return buffer