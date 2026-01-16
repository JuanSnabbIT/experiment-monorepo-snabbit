from collections import defaultdict
from io import BytesIO
from textwrap import wrap

from django.utils import timezone
from empresas.models import UsuarioEmpresa
from recursos.models import Equipo
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


# Stub functions (not yet implemented or to be removed)
def generar_orden_de_compra(
    nombre_empresa,
    rut_empresa,
    direccion_empresa,
    telefono_empresa,
    email_empresa,
    sitio_web_empresa,
    fecha_orden,
    codigo_orden,
    nombre_proveedor,
    telefono_proveedor,
    direccion_proveedor,
    rut_proveedor,
    email_proveedor,
    datos_tabla,
    neto_orden,
    subtotal_orden,
    iva_orden,
    total_orden,
    comentarios_orden,
    buffer,
    estado_orden=None,
    nombre_cliente=None,
    rut_cliente=None,
):
    """
    Genera un PDF de Orden de Compra con formato profesional.
    """
    from reportlab.lib.units import inch

    # Configuración de página
    pdf = canvas.Canvas(buffer, pagesize=letter)
    ancho, alto = letter
    margen_x = 40
    margen_y = 40
    y_pos = alto - margen_y

    # Colores
    COLOR_PRIMARIO = colors.HexColor("#1e3a5f")
    COLOR_SECUNDARIO = colors.HexColor("#3b82f6")
    COLOR_TEXTO = colors.HexColor("#374151")
    COLOR_FONDO_HEADER = colors.HexColor("#f3f4f6")
    COLOR_ALERTA = colors.HexColor("#dc2626")  # Rojo para estados negativos

    # ============= ENCABEZADO EMPRESA =============
    pdf.setFont("Helvetica-Bold", 20)
    pdf.setFillColor(COLOR_PRIMARIO)
    pdf.drawString(margen_x, y_pos, nombre_empresa or "Empresa")
    y_pos -= 18

    pdf.setFont("Helvetica", 9)
    pdf.setFillColor(COLOR_TEXTO)
    if rut_empresa:
        pdf.drawString(margen_x, y_pos, f"RUT: {rut_empresa}")
        y_pos -= 12
    if direccion_empresa:
        pdf.drawString(margen_x, y_pos, direccion_empresa)
        y_pos -= 12
    if telefono_empresa:
        pdf.drawString(margen_x, y_pos, f"Teléfono: {telefono_empresa}")
        y_pos -= 12
    if email_empresa:
        pdf.drawString(margen_x, y_pos, f"Email: {email_empresa}")
        y_pos -= 12

    # ============= TÍTULO ORDEN DE COMPRA (derecha) =============
    pdf.setFont("Helvetica-Bold", 16)
    pdf.setFillColor(COLOR_SECUNDARIO)
    pdf.drawRightString(ancho - margen_x, alto - margen_y, "ORDEN DE COMPRA")

    pdf.setFont("Helvetica-Bold", 14)
    pdf.setFillColor(COLOR_PRIMARIO)
    pdf.drawRightString(ancho - margen_x, alto - margen_y - 20, f"Nº {codigo_orden}")

    # Mostrar Estado si está presente
    if estado_orden:
        pdf.setFont("Helvetica-Bold", 10)
        # Colorear según el estado si es crítico
        col_estado = COLOR_SECUNDARIO
        if any(x in estado_orden.lower() for x in ["cancelada", "rechazada"]):
            col_estado = COLOR_ALERTA
        pdf.setFillColor(col_estado)
        pdf.drawRightString(ancho - margen_x, alto - margen_y - 36, f"Estado: {estado_orden.upper()}")
        pdf.setFont("Helvetica", 10)
        pdf.setFillColor(COLOR_TEXTO)
        pdf.drawRightString(ancho - margen_x, alto - margen_y - 50, f"Fecha: {fecha_orden}")
    else:
        pdf.setFont("Helvetica", 10)
        pdf.setFillColor(COLOR_TEXTO)
        pdf.drawRightString(ancho - margen_x, alto - margen_y - 36, f"Fecha: {fecha_orden}")

    # ============= LÍNEA DIVISORIA =============
    y_pos = min(y_pos, alto - margen_y - 65)
    pdf.setStrokeColor(COLOR_SECUNDARIO)
    pdf.setLineWidth(2)
    pdf.line(margen_x, y_pos, ancho - margen_x, y_pos)
    y_pos -= 25

    # ============= SECCIÓN DATOS (PROVEEDOR Y CLIENTE) =============
    pdf.setFont("Helvetica-Bold", 11)
    pdf.setFillColor(COLOR_PRIMARIO)
    pdf.drawString(margen_x, y_pos, "PROVEEDOR:")
    
    if nombre_cliente:
        pdf.drawString(ancho/2 + 20, y_pos, "CLIENTE FINAL / SOLICITANTE:")
    
    y_pos -= 15
    pdf.setFont("Helvetica", 9)
    pdf.setFillColor(COLOR_TEXTO)
    
    y_prov = y_pos
    if nombre_proveedor:
        pdf.drawString(margen_x, y_prov, nombre_proveedor)
        y_prov -= 12
    if rut_proveedor:
        pdf.drawString(margen_x, y_prov, f"RUT: {rut_proveedor}")
        y_prov -= 12
    if direccion_proveedor:
        pdf.drawString(margen_x, y_prov, f"Dirección: {direccion_proveedor}")
        y_prov -= 12
    if telefono_proveedor:
        pdf.drawString(margen_x, y_prov, f"Teléfono: {telefono_proveedor}")
        y_prov -= 12
    if email_proveedor:
        pdf.drawString(margen_x, y_prov, f"Email: {email_proveedor}")
        y_prov -= 12

    if nombre_cliente:
        y_cli = y_pos
        pdf.drawString(ancho/2 + 20, y_cli, nombre_cliente)
        y_cli -= 12
        if rut_cliente:
            pdf.drawString(ancho/2 + 20, y_cli, f"RUT: {rut_cliente}")
            y_cli -= 12
        y_pos = min(y_prov, y_cli) - 10
    else:
        y_pos = y_prov - 10

    # ============= TABLA DE ÍTEMS =============
    if datos_tabla and len(datos_tabla) > 1:
        ancho_tabla = ancho - (2 * margen_x)
        col_widths = [
            0.10 * ancho_tabla,
            0.45 * ancho_tabla,
            0.12 * ancho_tabla,
            0.16 * ancho_tabla,
            0.17 * ancho_tabla,
        ]

        tabla = Table(datos_tabla, colWidths=col_widths)
        tabla.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), COLOR_PRIMARIO),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 9),
            ("ALIGN", (0, 0), (-1, 0), "CENTER"),
            ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
            ("TOPPADDING", (0, 0), (-1, 0), 8),
            ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
            ("FONTSIZE", (0, 1), (-1, -1), 8),
            ("ALIGN", (0, 1), (0, -1), "CENTER"),
            ("ALIGN", (2, 1), (2, -1), "CENTER"),
            ("ALIGN", (3, 1), (-1, -1), "RIGHT"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, COLOR_FONDO_HEADER]),
            ("TOPPADDING", (0, 1), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 1), (-1, -1), 6),
            ("LEFTPADDING", (0, 0), (-1, -1), 4),
            ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ]))

        table_width, table_height = tabla.wrap(0, 0)
        if y_pos - table_height < 100:
            pdf.showPage()
            y_pos = alto - margen_y
            
        table_y = y_pos - table_height
        tabla.drawOn(pdf, margen_x, table_y)
        y_pos = table_y - 20

    # ============= TOTALES =============
    totales_x = ancho - margen_x - 180

    pdf.setFont("Helvetica", 10)
    pdf.setFillColor(COLOR_TEXTO)

    pdf.drawString(totales_x, y_pos, "Neto:")
    pdf.drawRightString(ancho - margen_x, y_pos, neto_orden)
    y_pos -= 14

    pdf.drawString(totales_x, y_pos, "IVA (19%):")
    pdf.drawRightString(ancho - margen_x, y_pos, iva_orden)
    y_pos -= 14

    pdf.setStrokeColor(COLOR_TEXTO)
    pdf.setLineWidth(0.5)
    pdf.line(totales_x, y_pos + 2, ancho - margen_x, y_pos + 2)

    pdf.setFont("Helvetica-Bold", 12)
    pdf.setFillColor(COLOR_PRIMARIO)
    pdf.drawString(totales_x, y_pos - 10, "TOTAL:")
    pdf.drawRightString(ancho - margen_x, y_pos - 10, total_orden)
    y_pos -= 45

    # ============= OBSERVACIONES =============
    if comentarios_orden and comentarios_orden != "Sin observaciones":
        pdf.setFont("Helvetica-Bold", 10)
        pdf.setFillColor(COLOR_PRIMARIO)
        pdf.drawString(margen_x, y_pos, "Observaciones:")
        y_pos -= 14

        pdf.setFont("Helvetica", 9)
        pdf.setFillColor(COLOR_TEXTO)

        max_chars = 95
        texto = comentarios_orden
        while texto:
            linea = texto[:max_chars]
            if len(texto) > max_chars:
                ultimo_espacio = linea.rfind(' ')
                if ultimo_espacio > 0:
                    linea = texto[:ultimo_espacio]
                    texto = texto[ultimo_espacio + 1:]
                else:
                    texto = texto[max_chars:]
            else:
                texto = ""
            pdf.drawString(margen_x, y_pos, linea)
            y_pos -= 12
        y_pos -= 20

    # ============= BLOQUES DE FIRMA =============
    if y_pos < 120:
        pdf.showPage()
        y_pos = alto - 100

    f_ancho = 180
    y_firma = 100
    if y_pos < 150:
        y_firma = y_pos - 60
    
    pdf.setStrokeColor(COLOR_TEXTO)
    pdf.setLineWidth(0.5)
    pdf.line(margen_x, y_firma, margen_x + f_ancho, y_firma)
    pdf.setFont("Helvetica", 8)
    pdf.drawCentredString(margen_x + f_ancho/2, y_firma - 12, "AUTORIZADO POR")
    
    pdf.line(ancho - margen_x - f_ancho, y_firma, ancho - margen_x, y_firma)
    pdf.drawCentredString(ancho - margen_x - f_ancho/2, y_firma - 12, "RECIBIDO CONFORME PROVEEDOR")

    # ============= PIE DE PÁGINA =============
    pdf.setStrokeColor(COLOR_SECUNDARIO)
    pdf.setLineWidth(1)
    pdf.line(margen_x, margen_y + 30, ancho - margen_x, margen_y + 30)

    pdf.setFont("Helvetica", 8)
    pdf.setFillColor(COLOR_TEXTO)
    pdf.drawCentredString(
        ancho / 2,
        margen_y + 15,
        f"Documento generado automáticamente - {nombre_empresa}"
    )
    if sitio_web_empresa:
        pdf.drawCentredString(ancho / 2, margen_y + 5, sitio_web_empresa)

    pdf.save()
    buffer.seek(0)


def generar_pdf_bodega(*args, **kwargs):
    """Placeholder for generar_pdf_bodega."""
    return BytesIO()


def generar_pdf_bodega_resumido(*args, **kwargs):
    """Placeholder for generar_pdf_bodega_resumido."""
    return BytesIO()


def crear_equipos_para_items_guia(guia_salida, usuario_empresa):
    """
    Crea registros Equipo para todos los Items individualizados de la guia.
    Debe ejecutarse dentro de una transaccion si el llamador lo requiere.
    """
    for item_guia in guia_salida.itemsguiasalida_set.filter(individualizado=True):
        datos_serie_item = item_guia.numero_serie

        if not (isinstance(datos_serie_item, dict) and datos_serie_item.get("serie")):
            continue

        serie = datos_serie_item["serie"]

        item_oc_obj = None
        for item_oc in item_guia.stock_item.itemordencompraenstock_set.all():
            numeros_serie_data = item_oc.numeros_serie
            series_list = (numeros_serie_data or {}).get("numeros_serie", [])
            if any(sd.get("serie") == serie for sd in series_list):
                item_oc_obj = item_oc
                break

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
                "empresa_propietaria": getattr(usuario_empresa.sucursal, "empresa", None) if usuario_empresa else None,
                "cliente": getattr(guia_salida, "cliente", None),
                "fecha_compra": getattr(orden_compra, "fecha_compra", None),
            },
        )


def generar_voucher_devolucion(voucher_id):
    """
    Genera PDF del voucher de devolución.
    
    Integra lógica de generación con tabla agrupada por origen (GuíaSalida/Compra).
    Sigue patrón de generar_pdf_bodega.
    
    Args:
        voucher_id (int): ID del voucher
    
    Returns:
        BytesIO: Buffer con el PDF generado
    
    Raises:
        VoucherDevolucion.DoesNotExist: Si el voucher no existe
    """
    from bodegas.models import VoucherDevolucion
    from bodegas.serializers import VoucherDevolucionSerializer
    from reportlab.lib.enums import TA_CENTER, TA_RIGHT
    
    # Obtener voucher con datos relacionados
    voucher = VoucherDevolucion.objects.select_related('orden_trabajo').prefetch_related(
        'movimientos_voucher__movimiento__stock_item__item',
        'movimientos_voucher__movimiento__stock_item__bodega',
        'movimientos_voucher__movimiento__usuario__usuario'
    ).get(id=voucher_id)
    
    # Serializar para obtener movimientos agrupados
    serializer = VoucherDevolucionSerializer(voucher)
    movimientos_agrupados = serializer.data['movimientos_agrupados']
    
    # Crear buffer
    buffer = BytesIO()
    
    # Crear documento PDF
    from reportlab.lib.units import inch
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=0.5*inch,
        leftMargin=0.5*inch,
        topMargin=0.75*inch,
        bottomMargin=0.5*inch
    )
    
    # Estilos
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=18,
        textColor=colors.HexColor('#1f2937'),
        spaceAfter=12,
        alignment=TA_CENTER
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=12,
        textColor=colors.HexColor('#374151'),
        spaceAfter=8,
        spaceBefore=12
    )
    
    # Contenido del PDF
    story = []
    
    # --- Header ---
    story.append(Paragraph("VOUCHER DE DEVOLUCIÓN", title_style))
    story.append(Spacer(1, 0.2*inch))
    
    # Información del voucher
    info_data = [
        ['Número:', voucher.numero],
        ['Orden de Trabajo:', f"OT #{voucher.orden_trabajo.id}"],
        ['Fecha Emisión:', voucher.fecha_creacion.strftime('%d/%m/%Y %H:%M')],
        ['Total Ítems Devueltos:', str(voucher.total_items_devueltos)],
    ]
    
    info_table = Table(info_data, colWidths=[2*inch, 4*inch])
    info_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#374151')),
        ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 0.3*inch))
    
    # --- Movimientos agrupados por origen ---
    if not movimientos_agrupados:
        story.append(Paragraph("No hay movimientos registrados.", styles['Normal']))
    else:
        for grupo in movimientos_agrupados:
            # Header del grupo (origen)
            origen_header = f"{grupo['origen_detalle']}"
            story.append(Paragraph(origen_header, heading_style))
            
            # Tabla de items del grupo
            items_data = [
                ['Ítem', 'Código', 'Cantidad', 'Bodega', 'Usuario', 'Fecha']
            ]
            
            for item in grupo['items']:
                items_data.append([
                    item['item_nombre'][:30],  # Truncar si es muy largo
                    item['item_codigo'],
                    str(item['cantidad_devuelta']),
                    item['bodega'][:20],
                    item['usuario'][:25],
                    item['fecha'].split()[0],  # Solo fecha, sin hora
                ])
            
            # Crear tabla
            items_table = Table(
                items_data,
                colWidths=[2.2*inch, 1*inch, 0.8*inch, 1.3*inch, 1.5*inch, 0.9*inch]
            )
            items_table.setStyle(TableStyle([
                # Header
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3b82f6')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 9),
                ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
                
                # Body
                ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 1), (-1, -1), 8),
                ('ALIGN', (2, 1), (2, -1), 'CENTER'),  # Cantidad centrada
                ('ALIGN', (5, 1), (5, -1), 'CENTER'),  # Fecha centrada
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f3f4f6')]),
                ('TOPPADDING', (0, 1), (-1, -1), 6),
                ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
            ]))
            
            story.append(items_table)
            story.append(Spacer(1, 0.2*inch))
    
    # --- Footer ---
    story.append(Spacer(1, 0.3*inch))
    story.append(Paragraph(
        f"Documento generado: {timezone.now().strftime('%d/%m/%Y %H:%M:%S')}",
        styles['Normal']
    ))
    
    # Construir PDF
    doc.build(story)
    buffer.seek(0)
    return buffer


def generar_pdf_etiquetas_bodega(items_data):
    """
    Genera un PDF con etiquetas de bodega para los items especificados.

    items_data: lista de dicts con estructura:
        {
            "codigo": str,
            "nombre": str,
            "cantidad": int,
            "bodega": str
        }

    Retorna: BytesIO object
    """
    buffer = BytesIO()

    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=20, bottomMargin=20)
    styles = getSampleStyleSheet()
    elements = []

    title_style = ParagraphStyle(
        "CustomTitle",
        parent=styles["Heading1"],
        fontSize=16,
        textColor=colors.HexColor("#003366"),
        spaceAfter=20,
        alignment=1,
    )

    title = Paragraph("Etiquetas de Bodega", title_style)
    elements.append(title)

    table_data = [["Codigo", "Nombre", "Cantidad"]]

    for item in items_data:
        table_data.append(
            [
                item.get("codigo", ""),
                item.get("nombre", ""),
                str(item.get("cantidad", 0)),
            ]
        )

    table = Table(table_data, colWidths=[200, 100, 150])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#003366")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("ALIGN", (0, 0), (-1, 0), "CENTER"),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, 0), 10),
                ("ALIGN", (0, 1), (-1, -1), "CENTER"),
                ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
                ("FONTSIZE", (0, 1), (-1, -1), 9),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.black),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )

    elements.append(table)

    doc.build(elements)

    buffer.seek(0)
    return buffer


def calcular_saldo_historico_stock(stock_item):
    """Calculate accumulated stock balance at each movement date."""
    from bodegas.models import MovimientoStock

    movimientos = MovimientoStock.objects.filter(stock_item=stock_item).order_by(
        "created_at"
    )
    saldo_acumulado = 0
    resultado = []

    for movimiento in movimientos:
        saldo_acumulado += movimiento.cantidad
        resultado.append(
            {
                "fecha": movimiento.created_at,
                "tipo_movimiento": movimiento.tipo_movimiento,
                "cantidad_delta": movimiento.cantidad,
                "saldo_acumulado": saldo_acumulado,
                "descripcion": movimiento.descripcion,
            }
        )

    return resultado


def add_oc_items_to_guia(guia, orden_compra, usuario=None, cantidades_map=None):
    """
    Añade los items de una `OrdenCompra` a una `GuiaSalida`.

    Reglas:
    - Si ya existe un `ItemsGuiaSalida` con `source_item` igual al item de la OC,
      se suma la cantidad.
    - Si existe un `ItemsGuiaSalida` con el mismo `stock_item` pero sin `source_item`,
      se suma la cantidad y se asigna `source_item` si está vacío.
    - Si no existe, se crea un nuevo `ItemsGuiaSalida` y se registra la salida.

    Devuelve un dict resumen con conteos y listas de errores.
    """
    from django.db import transaction, IntegrityError
    from bodegas.models import (
        ItemsGuiaSalida,
        StockItemEnBodega,
        ItemEnOrdenCompra,
    )
    from bodegas.movimientos import registrar_salida

    resultado = {
        "added": 0,
        "summed": 0,
        "skipped_missing_stock": [],
        "errors": [],
    }

    with transaction.atomic():
        guia = guia.__class__.objects.select_for_update().get(pk=guia.pk)

        for item_oc in orden_compra.itemenordencompra_set.all():
            cantidad_a_usar = (
                cantidades_map.get(item_oc.id, item_oc.cantidad)
                if cantidades_map
                else item_oc.cantidad
            )
            if cantidad_a_usar <= 0:
                continue

            try:
                stock_item = StockItemEnBodega.objects.get(
                    bodega=guia.bodega, item=item_oc.item
                )
            except StockItemEnBodega.DoesNotExist:
                resultado["skipped_missing_stock"].append(item_oc.pk)
                continue

            try:
                # Prefer match by source_item (explicit trace)
                existente = ItemsGuiaSalida.objects.filter(
                    guia=guia, source_item=item_oc
                ).select_for_update().first()

                if existente:
                    existente.cantidad_rebajada = (
                        existente.cantidad_rebajada + cantidad_a_usar
                    )
                    existente.save(update_fields=["cantidad_rebajada"])
                    resultado["summed"] += 1
                    continue

                # Fallback: match by stock_item
                existente_stock = ItemsGuiaSalida.objects.filter(
                    guia=guia, stock_item=stock_item
                ).select_for_update().first()

                if existente_stock:
                    existente_stock.cantidad_rebajada = (
                        existente_stock.cantidad_rebajada + cantidad_a_usar
                    )
                    if not existente_stock.source_item:
                        existente_stock.source_item = item_oc
                    existente_stock.save(update_fields=["cantidad_rebajada", "source_item"])
                    resultado["summed"] += 1
                    continue

                # Crear nuevo item en la guia
                item_guia = ItemsGuiaSalida.objects.create(
                    guia=guia,
                    stock_item=stock_item,
                    cantidad_original=stock_item.cantidad,
                    cantidad_rebajada=cantidad_a_usar,
                    source_item=item_oc,
                )

                # Reservar cantidad y registrar salida
                stock_item.cantidad_no_disponible = (
                    stock_item.cantidad_no_disponible + cantidad_a_usar
                )
                stock_item.save(update_fields=["cantidad_no_disponible"])

                registrar_salida(
                    stock_item=stock_item,
                    cantidad=cantidad_a_usar,
                    origen=item_guia,
                    usuario=usuario,
                    descripcion=f"Items añadidos desde OC {orden_compra.pk}",
                )

                resultado["added"] += 1

            except IntegrityError:
                # Constraint unique: already exists concurrently — tratar como idempotente
                resultado["errors"].append(
                    f"IntegrityError al procesar item OC {item_oc.pk}"
                )
                continue
            except Exception as e:
                resultado["errors"].append(str(e))
                continue

    return resultado


def obtener_guia_pendiente_por_cotizacion(cotizacion, bodega, cliente=None):
    from bodegas.models import GuiaSalida

    if not cotizacion or not bodega:
        return None

    filtros = {"estado": "P", "bodega": bodega}
    if cliente:
        filtros["cliente"] = cliente

    return (
        GuiaSalida.objects.filter(
            **filtros,
            itemsguiasalida__source_item__orden_compra__relacion_cotizacion=cotizacion,
        )
        .distinct()
        .order_by("-fecha_creacion")
        .first()
    )


def recepcionar_oc_y_crear_guia(orden_compra, estado, items_data, usuario=None):
    from django.contrib.contenttypes.models import ContentType
    from django.db import transaction
    from rest_framework.exceptions import ValidationError

    from bodegas.models import (
        GuiaSalida,
        ItemEnOrdenCompra,
        ItemOrdenCompraEnStock,
        StockItemEnBodega,
    )
    from bodegas.movimientos import registrar_entrada

    if estado not in ["4", "5"]:
        raise ValidationError('Estado invalido. Debe ser "4" (parcial) o "5" (completa).')

    if not orden_compra.relacion_cotizacion_id:
        raise ValidationError("La orden de compra no tiene cotizacion asociada.")

    items_oc = ItemEnOrdenCompra.objects.filter(orden_compra=orden_compra).select_related("item")
    if not items_oc.exists():
        raise ValidationError("La orden no tiene items asociados.")

    items_map = {}
    if estado == "4":
        for item in items_data:
            item_oc_id = item.get("item_oc_id")
            cantidad = item.get("cantidad")
            if item_oc_id is None or cantidad is None:
                raise ValidationError("Cada item debe tener item_oc_id y cantidad.")
            items_map[str(item_oc_id)] = cantidad

    content_type_oc = ContentType.objects.get_for_model(ItemEnOrdenCompra)
    cantidades_map = {}
    bodega_unica = None

    with transaction.atomic():
        for ioc in items_oc:
            item_oc_en_stock = ItemOrdenCompraEnStock.objects.filter(
                item_oc_id=ioc.id,
                content_type=content_type_oc,
            ).first()
            if not item_oc_en_stock:
                raise ValidationError(
                    f"No se encontro un registro en ItemOrdenCompraEnStock para el item {ioc.id}"
                )

            cantidad_a_ingresar = (
                ioc.cantidad if estado == "5" else items_map.get(str(ioc.id))
            )
            if cantidad_a_ingresar is None:
                raise ValidationError(
                    f"No se proporciono cantidad parcial para el item {ioc.id}"
                )

            try:
                cantidad_a_ingresar = int(cantidad_a_ingresar)
            except ValueError:
                raise ValidationError(
                    f"La cantidad para el item {ioc.id} no es un numero valido."
                )

            if cantidad_a_ingresar < 0:
                raise ValidationError(
                    f"La cantidad para el item {ioc.id} no puede ser negativa."
                )

            cantidades_map[ioc.id] = cantidad_a_ingresar

            if cantidad_a_ingresar > 0:
                if not item_oc_en_stock.bodega_temporal:
                    raise ValidationError(
                        f"El item {ioc.id} no tiene una bodega temporal asociada."
                    )

                if bodega_unica and item_oc_en_stock.bodega_temporal_id != bodega_unica.id:
                    raise ValidationError("Se requiere una sola bodega de recepcion.")

                bodega_unica = item_oc_en_stock.bodega_temporal

            if item_oc_en_stock.bodega_temporal:
                stock_item, created = StockItemEnBodega.objects.get_or_create(
                    item=ioc.item,
                    defaults={'bodega': item_oc_en_stock.bodega_temporal, 'cantidad': 0, 'pmp': 0},
                )
                if not created and stock_item.bodega_id != item_oc_en_stock.bodega_temporal_id:
                    raise ValidationError(f"El item {ioc.id} ya existe en otra bodega.")

                item_oc_en_stock.stock_item = stock_item
                item_oc_en_stock.save(update_fields=['stock_item'])

                if cantidad_a_ingresar > 0:
                    registrar_entrada(
                        stock_item=stock_item,
                        cantidad=cantidad_a_ingresar,
                        usuario=usuario,
                        origen=item_oc_en_stock,
                        descripcion="Items agregados desde una orden de compra",
                    )
        if not bodega_unica:
            raise ValidationError("No hay items con cantidad para generar la guia.")

        cotizacion = orden_compra.relacion_cotizacion
        cliente = cotizacion.cliente if cotizacion else None
        if not cliente:
            raise ValidationError("La cotizacion no tiene cliente asociado.")

        guia = obtener_guia_pendiente_por_cotizacion(cotizacion, bodega_unica, cliente)

        if not guia:
            guia = GuiaSalida.objects.create(
                bodega=bodega_unica,
                cliente=cliente,
                creado_por=usuario,
                motivo=f"Generada desde OC {orden_compra.pk}",
            )

        resultado_guia = add_oc_items_to_guia(
            guia, orden_compra, usuario=usuario, cantidades_map=cantidades_map
        )

        orden_compra.estado = estado
        orden_compra.save(update_fields=["estado"])

    return {
        "message": "Orden actualizada y guia creada",
        "estado": estado,
        "guia_id": guia.id,
        "guia_resultado": resultado_guia,
    }
