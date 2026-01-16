from decimal import Decimal
import io
import os
import base64
from datetime import datetime
from django.conf import settings

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.platypus import Paragraph, Spacer, Table, TableStyle, Image, PageBreak
from reportlab.lib.utils import ImageReader

from .models import SeguimientoCotizacion, Cotizacion
from empresas.models import UsuarioEmpresa

# Core PDF Engine Imports
from core.pdf.engine import create_pdf_engine
from core.pdf.styles import get_pdf_styles, BRAND_BLUE, LIGHT_GRAY, TEXT_DARK, TEXT_GRAY
from core.pdf.components import get_header_flowable, draw_footer, create_info_table, create_data_table, create_signature_block
from core.pdf.utils import format_currency

MESES_ES = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
]

def crear_seguimiento_cotizacion(cotizacion_id, usuario_id, comentario):
    """
    Crea un seguimiento de cotización de forma dinámica.
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

def textotipomoneda(tipo_moneda):
    """Retorna el texto legal asociado a la moneda."""
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
    """
    Genera el PDF de Cotización usando el motor compartido core.pdf.
    Reemplaza la lógica antigua de canvas.
    """
    buffer = io.BytesIO()
    doc = create_pdf_engine(buffer)
    story = []
    styles = get_pdf_styles()

    # --- 1. HEADER (Logo y Fecha) ---
    # Custom Header handling for dynamic Base64 Logo support
    header_data = []
    logo_img = "[LOGO]" # Fallback
    
    # Intenta usar el logo dinámico si viene
    if logo_base64:
        try:
            b64 = logo_base64.split(',', 1)[1] if ',' in logo_base64 else logo_base64
            img_reader = ImageReader(io.BytesIO(base64.b64decode(b64)))
            iw, ih = img_reader.getSize()
            aspect = ih / float(iw)
            logo_img = Image(img_reader, width=4*cm, height=(4*cm)*aspect)
        except Exception:
            # Fallback al logo estático si falla
            logo_path = os.path.join(settings.BASE_DIR, "static", "img", "logo_sn.png")
            if os.path.exists(logo_path):
                logo_img = Image(logo_path, width=4*cm, height=2*cm)
    else:
        # Uso estándar de logo estático
        logo_path = os.path.join(settings.BASE_DIR, "static", "img", "logo_sn.png")
        if os.path.exists(logo_path):
            logo_img = Image(logo_path, width=4*cm, height=2*cm)

    # Fecha formateada
    fecha_obj = datos_cotizacion.get('fecha_cotizacion')
    if isinstance(fecha_obj, (datetime, )):
        fecha_str = f"{fecha_obj.day} de {MESES_ES[fecha_obj.month - 1]} de {fecha_obj.year}"
    else:
        hoy = datetime.now()
        fecha_str = f"{hoy.day} de {MESES_ES[hoy.month - 1]} de {hoy.year}"
    
    # Tabla Header: Logo Izq | Fecha Der
    header_p = Paragraph(f"{ubicacion}, {fecha_str}", styles["DataRight"])
    header_table = Table([[logo_img, header_p]], colWidths=[6*cm, 12*cm])
    header_table.setStyle(TableStyle([
        ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
        ("ALIGN", (1,0), (1,0), "RIGHT"),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 1*cm))

    # --- 2. TÍTULO ---
    numero = datos_cotizacion.get('numero_cotizacion', '')
    story.append(Paragraph(f"Cotización Nº {numero}", styles["DocTitle"]))
    story.append(Spacer(1, 0.5*cm))

    # --- 3. DATOS CLIENTE ---
    datos_cliente = [
        ["Cliente:", nombre_cliente],
    ]
    if rut_cliente:
        datos_cliente.append(["Rut:", rut_cliente])
    if direccion_cliente:
        datos_cliente.append(["Dirección:", direccion_cliente])
    if destinatarios:
        datos_cliente.append(["Estimado/a:", destinatarios])
    
    # Usamos create_info_table pero personalizado a 2 columnas (Label, Value)
    cliente_table = Table(datos_cliente, colWidths=[3*cm, 15*cm])
    cliente_table.setStyle(TableStyle([
        ("FONTNAME", (0,0), (0,-1), "Helvetica-Bold"),
        ("FONTNAME", (1,0), (1,-1), "Helvetica"),
        ("VALIGN", (0,0), (-1,-1), "TOP"),
        ("BOTTOMPADDING", (0,0), (-1,-1), 8),
    ]))
    story.append(cliente_table)
    story.append(Spacer(1, 1*cm))

    # --- 4. INTRODUCCIÓN ---
    descripcion = datos_cotizacion.get('descripcion', '')
    intro_html = f"Ud. ha solicitado los precios de <b>{descripcion}</b>, a continuación aparece nuestra cotización:"
    story.append(Paragraph(intro_html, styles["BodyText"]))
    story.append(Spacer(1, 0.5*cm))

    # --- 5. ITEMS ---
    # Determinar columnas según moneda
    try:
        tipo = int(tipo_moneda)
    except:
        tipo = 1
    
    if tipo == 1: # USD
        headers = ["Descripción", "Cantidad", "Precio Unit USD", "Total Neto USD"]
    elif tipo == 2: # CLP
        headers = ["Descripción", "Cantidad", "Precio Unit", "Total Neto"]
    else: # UF (3)
        headers = ["Descripción", "Cantidad", "Precio Unit UF", "Total Neto UF"]

    data_rows = []
    if items:
        for it in items:
            nombre = str(it.get('nombre', '')).replace('<','').replace('>','')
            desc = str(it.get('descripcion', '')).replace('<','').replace('>','')
            detalle_html = f"<b>{nombre}</b><br/><font size='8' color='#6b7280'>{desc}</font>"
            
            cant = str(it['cantidad'])
            # Conversión segura a float
            try:
                pu_val = float(it['precio_unitario'])
            except:
                pu_val = 0.0
            try:
                tn_val = float(it['total_neto'])
            except:
                tn_val = 0.0
            
            # Formateo manual para coincidir con legacy (X -> . , etc) si se desea, 
            # O usar estandar core.pdf. Usaremos estilo similar al legacy pero limpio.
            if tipo == 1: # USD
                 pu_str = f"{pu_val:,.1f} USD"
                 tn_str = f"{tn_val:,.1f} USD"
            elif tipo == 2: # CLP
                 pu_str = f"${pu_val:,.0f}".replace(",",".")
                 tn_str = f"${tn_val:,.0f}".replace(",",".")
            else: # UF
                 pu_str = f"{pu_val:,.2f} UF"
                 tn_str = f"{tn_val:,.2f} UF"
            
            data_rows.append([Paragraph(detalle_html, styles["Data"]), cant, pu_str, tn_str])

    if data_rows:
        # Col widths ajustados
        widths = [8.5*cm, 2.5*cm, 3.5*cm, 3.5*cm]
        # create_data_table ya aplica el estilo estándar (Azul fondo header)
        story.append(create_data_table(headers, data_rows, widths))
    story.append(Spacer(1, 0.5*cm))

    # --- 6. TEXTO LEGAL Y OBSERVACIONES ---
    texto_legal = textotipomoneda(tipo_moneda)
    if texto_legal:
        story.append(Paragraph(f"<i>{texto_legal}</i>", styles["SmallPrint"]))
        story.append(Spacer(1, 0.5*cm))

    if observaciones:
        story.append(Paragraph("<b>Observaciones:</b>", styles["Label"]))
        story.append(Paragraph(observaciones, styles["BodyText"]))
        story.append(Spacer(1, 1*cm))

    # --- 7. CIERRE Y FIRMA ---
    cierre_txt = ("Gracias por darnos la oportunidad de ofrecerle este presupuesto. "
                  "Como siempre, es para nosotros un placer hacer negocios con ustedes. "
                  "Esperamos hacer realidad este pedido para su completa satisfacción.")
    story.append(Paragraph(cierre_txt, styles["BodyText"]))
    story.append(Spacer(1, 1.5*cm))

    # Firma Imagen (Empresa)
    if firma_empresa_b64:
        try:
            b64_f = firma_empresa_b64.split(',', 1)[1] if ',' in firma_empresa_b64 else firma_empresa_b64
            img_reader_f = ImageReader(io.BytesIO(base64.b64decode(b64_f)))
            iw, ih = img_reader_f.getSize()
            aspect = ih / float(iw)
            # Ancho fijo firma ~5cm
            f_img = Image(img_reader_f, width=5*cm, height=(5*cm)*aspect)
            story.append(f_img)
        except:
            pass # Si falla imagen, solo texto
    
    # Texto Firma
    story.append(Paragraph("Atentamente,", styles["Data"]))
    story.append(Spacer(1, 0.2*cm))
    if firmante:
        story.append(Paragraph(f"<b>{firmante}</b>", styles["Data"]))
    if cargo:
        story.append(Paragraph(cargo, styles["SmallPrint"]))
    if cargo2:
        story.append(Paragraph(cargo2, styles["SmallPrint"]))

    # Footer y Build
    doc.build(story, onFirstPage=draw_footer, onLaterPages=draw_footer)
    buffer.seek(0)
    return buffer.getvalue()


def generar_pdf_cotizacion_desde_model(cotizacion_id, ubicacion="Santiago"):
    """
    Prepara los datos desde el modelo y llama a generar_pdf_cotizacion.
    Mantiene lógica de negocio existente.
    """
    cot = (Cotizacion.objects
           .select_related('empresa','cliente')
           .prefetch_related('items','solicitantes')
           .get(pk=cotizacion_id))
    
    datos = {
        'numero_cotizacion': cot.numero_cotizacion,
        'descripcion': cot.descripcion or ''
    }
    datos['fecha_cotizacion'] = cot.fecha_creacion
    
    # Lógica de logo (mantenida)
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
            'precio_unitario': f"{pu_backend}", # Pasamos numero como string, formateo en generador
            'total_neto': f"{tn_backend}"
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


def crear_orden_compra_para_proveedor(cotizacion, proveedor, usuario_empresa):
    """
    Crea una OrdenCompra para un proveedor específico desde una cotización.
    Retorna la OC creada.
    """
    from bodegas.models import OrdenCompra, ItemEnOrdenCompra
    # Filtrar items válidos para el proveedor
    items_filtrados = cotizacion.items.filter(
        proveedor_empresa=proveedor,
        item_empresa__isnull=False,
        proveedor_empresa__isnull=False,
        aprobado=True
    )
    if not items_filtrados.exists():
        return None
    # Verificar si ya existe OC para este proveedor y cotización
    if OrdenCompra.objects.filter(relacion_cotizacion=cotizacion, proveedor=proveedor).exists():
        return None  # Ya existe, no crear duplicado
    # Crear OC
    orden = OrdenCompra.objects.create(
        proveedor=proveedor,
        oc_cliente=cotizacion.cliente,
        oc_empresa=cotizacion.empresa,
        creado_por=usuario_empresa,
        relacion_cotizacion=cotizacion
    )
    # Crear items en la OC
    for item in items_filtrados:
        ItemEnOrdenCompra.objects.create(
            orden_compra=orden,
            item=item.item_empresa,
            cantidad=item.cantidad,
            precio=int(item.precio_unitario)
        )
    return orden
