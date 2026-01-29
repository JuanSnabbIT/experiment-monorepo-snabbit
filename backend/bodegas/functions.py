from collections import defaultdict
from datetime import datetime
from io import BytesIO
import os
from textwrap import wrap

from django.utils import timezone
from empresas.models import UsuarioEmpresa
from recursos.models import Equipo
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
# Core PDF Engine Imports
from core.pdf.engine import create_pdf_engine, NumberedCanvas
from core.pdf.styles import get_pdf_styles
from core.pdf.components import LOGO_PATH, draw_footer, create_data_table, create_info_table
from core.pdf.utils import format_currency

MESES_ES = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
]

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
    Genera un PDF de Orden de Compra profesional usando core.pdf components.
    """
    from reportlab.lib.units import cm
    ubicacion = "Santiago"

    # 1. Setup Engine
    doc = create_pdf_engine(buffer)
    story = []
    styles = get_pdf_styles()

    def _format_fecha_larga(fecha):
        if not fecha:
            return ""
        for fmt in ("%d-%m-%Y", "%Y-%m-%d", "%d/%m/%Y"):
            try:
                parsed = datetime.strptime(fecha, fmt)
                return f"{parsed.day} de {MESES_ES[parsed.month - 1]} de {parsed.year}"
            except ValueError:
                continue
        return fecha

    def _draw_header_footer(canvas_obj, doc_obj):
        canvas_obj.saveState()
        width, height = doc_obj.pagesize
        mx = doc_obj.leftMargin
        my = doc_obj.topMargin

        fecha_larga = _format_fecha_larga(fecha_orden)
        canvas_obj.setFont("Helvetica", 9)
        canvas_obj.drawString(mx, height - my + 1, f"{ubicacion}, {fecha_larga}")

        if os.path.exists(LOGO_PATH):
            try:
                img = ImageReader(LOGO_PATH)
                iw, ih = img.getSize()
                w_logo = 120
                h_logo = w_logo * (ih / iw)
                canvas_obj.drawImage(
                    img,
                    width - mx - w_logo,
                    height - my - h_logo,
                    width=w_logo,
                    height=h_logo,
                    mask="auto",
                )
            except Exception:
                pass

        draw_footer(canvas_obj, doc_obj)
        canvas_obj.restoreState()

    # 3. Document Title
    story.append(Spacer(1, 1.4 * cm))
    story.append(Paragraph(f"Orden de Compra N° {codigo_orden}", styles["DocTitle"]))
    story.append(Spacer(1, 0.2 * cm))

    if estado_orden:
        story.append(
            Paragraph(f"<b>Estado:</b> {estado_orden.upper()}", styles["Data"])
        )
        story.append(Spacer(1, 0.15 * cm))
    else:
        story.append(Spacer(1, 0.15 * cm))

    # 4. Proveedor & Cliente Info
    story.append(Paragraph("Datos del proveedor", styles["Label"]))
    info_col_widths = [
        0.13 * doc.width,
        0.45 * doc.width,
        0.12 * doc.width,
        0.30 * doc.width,
    ]
    info_prov = [
        ["Nombre:", nombre_proveedor or "", "Rut:", rut_proveedor or ""],
        ["Dirección:", direccion_proveedor or "", "Teléfono:", telefono_proveedor or ""],
        ["Email:", email_proveedor or "", "", ""],
    ]
    tabla_prov = create_info_table(info_prov, col_widths=info_col_widths)
    tabla_prov.setStyle(
        TableStyle(
            [
                ("LEFTPADDING", (0, 0), (-1, -1), 1),
                ("RIGHTPADDING", (0, 0), (-1, -1), 1),
                ("TOPPADDING", (0, 0), (-1, -1), 1),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
            ]
        )
    )
    story.append(tabla_prov)
    story.append(Spacer(1, 0.2 * cm))

    if nombre_cliente:
        story.append(Paragraph("Cliente final / solicitante", styles["Label"]))
        info_cli = [
            ["Nombre:", nombre_cliente or "", "Rut:", rut_cliente or ""],
        ]
        tabla_cli = create_info_table(info_cli, col_widths=info_col_widths)
        tabla_cli.setStyle(
            TableStyle(
                [
                    ("LEFTPADDING", (0, 0), (-1, -1), 1),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 1),
                    ("TOPPADDING", (0, 0), (-1, -1), 1),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
                ]
            )
        )
        story.append(tabla_cli)
        story.append(Spacer(1, 0.2 * cm))

    # 5. Items Table
    if datos_tabla and len(datos_tabla) > 1:
        header_map = {
            "ARTICULO": "Artículo",
            "ARTÍCULO": "Artículo",
            "DESCRIPCION": "Descripción",
            "DESCRIPCIÓN": "Descripción",
            "CANTIDAD": "Cantidad",
            "PRECIO UNITARIO": "Precio Unit.",
            "PRECIO UNIT": "Precio Unit.",
            "TOTAL": "Total",
            "TOTAL NETO": "Total Neto",
        }
        headers = [
            header_map.get(str(header).strip().upper(), header)
            for header in datos_tabla[0]
        ]
        data = datos_tabla[1:]
        
        # Estimate column widths for 5 columns
        ancho_total = doc.width
        # Distribute: [12%, 43%, 12%, 15%, 18%]
        col_widths = [
            0.12 * ancho_total,
            0.43 * ancho_total,
            0.12 * ancho_total,
            0.15 * ancho_total,
            0.18 * ancho_total,
        ]

        tabla_items = create_data_table(headers, data, col_widths)
        tabla_items.setStyle(
            TableStyle(
                [
                    ("FONTSIZE", (0, 0), (-1, 0), 9),
                    ("TOPPADDING", (0, 0), (-1, 0), 4),
                    ("BOTTOMPADDING", (0, 0), (-1, 0), 4),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ]
            )
        )
        story.append(tabla_items)
        story.append(Spacer(1, 0.35 * cm))

    # 6. Totales
    totales_data = [
        ["Neto:", neto_orden],
        ["IVA:", iva_orden],
        ["TOTAL:", total_orden]
    ]
    t_totales = Table(totales_data, colWidths=[3.5*cm, 4*cm], hAlign="RIGHT")
    t_totales.setStyle(TableStyle([
        ("ALIGN", (0, 0), (-1, -1), "RIGHT"),
        ("FONTNAME", (0, 2), (-1, 2), "Helvetica-Bold"),
        ("LINEABOVE", (0, 2), (-1, 2), 0.5, colors.black),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 2),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
    ]))
    story.append(t_totales)
    story.append(Spacer(1, 0.6 * cm))

    # 7. Observaciones
    if comentarios_orden and comentarios_orden != "Sin observaciones":
        story.append(Paragraph("Observaciones:", styles["Label"]))
        story.append(Paragraph(comentarios_orden, styles["BodyText"]))
        story.append(Spacer(1, 0.6 * cm))
    
    # 9. Build with NumberedCanvas
    doc.build(
        story,
        onFirstPage=_draw_header_footer,
        onLaterPages=_draw_header_footer,
        canvasmaker=NumberedCanvas,
    )
    buffer.seek(0)
    return buffer


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
