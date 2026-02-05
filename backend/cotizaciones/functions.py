import base64

from .models import SeguimientoCotizacion, Cotizacion
from empresas.models import UsuarioEmpresa

from core.pdf.cotizacion_legacy import generar_pdf_cotizacion_legacy

def crear_seguimiento_cotizacion(cotizacion_id, usuario_id, comentario, tipo="actualizacion"):
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
        comentario=comentario,
        tipo=tipo,
    )

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
    tipo_moneda="1",
    estado=None,
    aprobador_info=None,
):
    return generar_pdf_cotizacion_legacy(
        datos_cotizacion=datos_cotizacion,
        logo_base64=logo_base64,
        nombre_cliente=nombre_cliente,
        rut_cliente=rut_cliente,
        direccion_cliente=direccion_cliente,
        destinatarios=destinatarios,
        items=items,
        observaciones=observaciones,
        firmante=firmante,
        cargo=cargo,
        cargo2=cargo2,
        firma_empresa_b64=firma_empresa_b64,
        ubicacion=ubicacion,
        tipo_moneda=tipo_moneda,
        estado=estado,
        aprobador_info=aprobador_info,
    )

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
        
    destinatarios_list = []
    for sol in cot.solicitantes.all():
        subj = sol.usuario
        if not subj:
            continue

        if hasattr(subj, "get_nombre_completo"):
            name = subj.get_nombre_completo()
        elif hasattr(subj, "nombre"):
            name = subj.nombre
        elif hasattr(subj, "usuario") and hasattr(subj.usuario, "get_nombre"):
            name = subj.usuario.get_nombre()
        else:
            name = str(subj)

        email = getattr(subj, "email", None)
        if not email and hasattr(subj, "usuario"):
            email = getattr(subj.usuario, "email", None)

        if email:
            name = f"{name} ({email})"

        destinatarios_list.append(name)

    destinatarios = " / ".join(destinatarios_list)
    
    # Obtener información del solicitante que aprobó/rechazó
    aprobador_info = None
    if cot.estado in ['aceptada', 'rechazada']:
        solicitante_que_respondio = cot.solicitantes.filter(
            token_usado=True
        ).exclude(
            aprobo__isnull=True
        ).first()
        
        if solicitante_que_respondio:
            aprobador_info = {
                'nombre': solicitante_que_respondio.get_nombre(),
                'email': solicitante_que_respondio.get_email(),
                'aprobo': solicitante_que_respondio.aprobo,
                'fecha_respuesta': solicitante_que_respondio.fecha_respuesta,
                'motivo_rechazo': solicitante_que_respondio.motivo_rechazo,
            }
    
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
            'descripcion': (it.item_empresa.descripcion_corta if it.item_empresa else it.descripcion) or '',
            'cantidad': it.cantidad,
            'precio_unitario': f"{pu_backend:.2f}", # Pasamos numero como string, formateo en generador
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
        tipo_moneda=cot.tipo_moneda,
        estado=cot.estado,
        aprobador_info=aprobador_info
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
