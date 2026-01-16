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
def generar_orden_de_compra(*args, **kwargs):
    """Placeholder for generar_orden_de_compra."""
    pass


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


def add_oc_items_to_guia(guia, orden_compra, usuario=None):
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
                        existente.cantidad_rebajada + item_oc.cantidad
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
                        existente_stock.cantidad_rebajada + item_oc.cantidad
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
                    cantidad_rebajada=item_oc.cantidad,
                    source_item=item_oc,
                )

                # Reservar cantidad y registrar salida
                stock_item.cantidad_no_disponible = (
                    stock_item.cantidad_no_disponible + item_oc.cantidad
                )
                stock_item.save(update_fields=["cantidad_no_disponible"])

                registrar_salida(
                    stock_item=stock_item,
                    cantidad=item_oc.cantidad,
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
