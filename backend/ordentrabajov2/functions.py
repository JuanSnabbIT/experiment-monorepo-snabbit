"""
Funciones para el módulo de Ordenes de Trabajo (Cierres Administrativos/Facturación)
"""
from decimal import Decimal
from django.db.models import Q


def calcular_pactado_del_contrato(contrato):
    """
    Extrae los servicios y licencias contratados de un ContratoEmpresaCliente
    y retorna una estructura JSON con items y total para el campo 'pactado'
    en resultado de CierreAdministrativoOT.
    
    Args:
        contrato: Instancia de ContratoEmpresaCliente
    
    Returns:
        dict: Estructura con items y total
        {
            "items": [
                {
                    "id": "servicio_1",
                    "nombre": "Soporte Técnico Nivel 2",
                    "cantidad": 1,
                    "precio_unitario": 500.00,
                    "total": 500.00,
                    "tipo": "servicio",
                    "vinculado_a": None
                },
                ...
            ],
            "total": 1000.00,
            "moneda": "CLP"
        }
    """
    items = []
    total_pactado = Decimal("0.00")
    
    # Procesar ContratoServicio
    if contrato.contrato_servicios.exists():
        for contrato_servicio in contrato.contrato_servicios.all():
            # Obtener el nombre del servicio desde la relación genérica
            nombre_servicio = (
                contrato_servicio.nombre 
                if hasattr(contrato_servicio, 'nombre') and contrato_servicio.nombre
                else contrato_servicio.servicio_generico.nombre
            )
            
            cantidad = contrato_servicio.cantidad
            precio_unitario = contrato_servicio.precio_unitario
            total_item = Decimal(cantidad) * Decimal(precio_unitario)
            
            items.append({
                "id": f"servicio_{contrato_servicio.id}",
                "nombre": nombre_servicio,
                "cantidad": cantidad,
                "precio_unitario": float(precio_unitario),
                "total": float(total_item),
                "tipo": "servicio",
                "vinculado_a": None
            })
            
            total_pactado += total_item
    
    # Procesar ContratoLicencia
    if contrato.contrato_licencias.exists():
        for contrato_licencia in contrato.contrato_licencias.all():
            nombre_licencia = contrato_licencia.licencia.nombre
            cantidad = contrato_licencia.cantidad
            precio_unitario = contrato_licencia.precio_unitario
            total_item = Decimal(cantidad) * Decimal(precio_unitario)
            
            items.append({
                "id": f"licencia_{contrato_licencia.id}",
                "nombre": nombre_licencia,
                "cantidad": cantidad,
                "precio_unitario": float(precio_unitario),
                "total": float(total_item),
                "tipo": "licencia",
                "vinculado_a": None
            })
            
            total_pactado += total_item
    
    return {
        "items": items,
        "total": float(total_pactado),
        "moneda": "CLP"
    }


def calcular_ejecutado_del_contrato(contrato, periodo_desde, periodo_hasta):
    """
    Extrae los items ejecutados (servicios en OT, items cotizados, guías de salida, rendiciones)
    de un ContratoEmpresaCliente dentro de un período específico.
    
    Args:
        contrato: Instancia de ContratoEmpresaCliente
        periodo_desde: datetime.date (inicio del período)
        periodo_hasta: datetime.date (fin del período)
    
    Returns:
        dict: Estructura con items y total
        {
            "items": [
                {
                    "id": "ot_1_servicio_2",
                    "nombre": "Instalación de Servidor",
                    "cantidad": 1,
                    "precio_unitario": 0.0,
                    "total": 0.0,
                    "tipo": "servicio_ot",
                    "estado": "completada"
                },
                ...
            ],
            "total": 1500.0,
            "moneda": "CLP"
        }
    """
    from ordentrabajov2.models import OrdenDeTrabajo, SoporteTecnico, ServicioEnOT
    from cotizaciones.models import Cotizacion, ItemCotizacion
    from bodegas.models import GuiaSalida, ItemsGuiaSalida
    from rendiciones.models import Rendicion
    
    items = []
    total_ejecutado = Decimal("0.00")
    cliente = contrato.empresa_cliente
    
    # 1. SERVICIOS EN ÓRDENES DE TRABAJO COMPLETADAS
    ordenes_completadas = OrdenDeTrabajo.objects.filter(
        cliente=cliente,
        estado__in=['completada', 'cerrada', 'facturada'],
        fecha_finalizacion_ot__isnull=False
    ).prefetch_related('soportetecnico_set', 'servicioenot_set')
    
    for orden in ordenes_completadas:
        # Procesar SoporteTecnico (detalles técnicos)
        for soporte in orden.soportetecnico_set.all():
            items.append({
                "id": f"ot_{orden.id}_soporte_{soporte.id}",
                "nombre": soporte.nombre,
                "cantidad": 1,
                "precio_unitario": 0.0,
                "total": 0.0,
                "tipo": "soporte_tecnico",
                "estado": soporte.estado
            })
        
        # Procesar ServicioEnOT (servicios)
        for servicio in orden.servicioenot_set.all():
            items.append({
                "id": f"ot_{orden.id}_servicio_{servicio.id}",
                "nombre": servicio.nombre,
                "cantidad": 1,
                "precio_unitario": 0.0,
                "total": 0.0,
                "tipo": "servicio_ot",
                "estado": servicio.estado
            })
    
    # 2. ITEMS EN COTIZACIONES ACEPTADAS
    cotizaciones_aceptadas = Cotizacion.objects.filter(
        cliente=cliente,
        estado='aceptada',
        fecha_creacion__date__gte=periodo_desde,
        fecha_creacion__date__lte=periodo_hasta
    ).prefetch_related('items')
    
    for cotizacion in cotizaciones_aceptadas:
        for item_cot in cotizacion.items.all():
            costo = Decimal(str(item_cot.costo_total or 0))
            total_ejecutado += costo
            
            items.append({
                "id": f"cotizacion_{cotizacion.id}_item_{item_cot.id}",
                "nombre": item_cot.nombre or "Item sin nombre",
                "cantidad": item_cot.cantidad,
                "precio_unitario": float(item_cot.precio_unitario or 0),
                "total": float(costo),
                "tipo": "cotizacion",
                "aprobado": item_cot.aprobado
            })
    
    # 3. ITEMS EN GUÍAS DE SALIDA ENTREGADAS
    guias_entregadas = GuiaSalida.objects.filter(
        cliente=cliente,
        estado__in=['FR', 'ET'],  # Firmada o Entregada
        fecha_creacion__date__gte=periodo_desde,
        fecha_creacion__date__lte=periodo_hasta
    ).prefetch_related('itemsguiasalida_set')
    
    for guia in guias_entregadas:
        for item_guia in guia.itemsguiasalida_set.all():
            cantidad_entregada = item_guia.cantidad_rebajada
            nombre_item = item_guia.stock_item.item.nombre if item_guia.stock_item.item else "Item sin nombre"
            
            items.append({
                "id": f"guia_{guia.id}_item_{item_guia.id}",
                "nombre": nombre_item,
                "cantidad": cantidad_entregada,
                "precio_unitario": 0.0,
                "total": 0.0,
                "tipo": "guia_salida",
                "estado": guia.estado
            })
    
    # 4. RENDICIONES FACTURABLES
    rendiciones_facturables = Rendicion.objects.filter(
        cliente=cliente,
        politica_viaticos='F',  # Solo facturable
        fecha_rendicion__gte=periodo_desde,
        fecha_rendicion__lte=periodo_hasta
    ).prefetch_related('items')
    
    for rendicion in rendiciones_facturables:
        # Procesar RendicionItem (genéricos)
        for rend_item in rendicion.items.all():
            detalle = rend_item.detalle
            if detalle is None:
                continue
            
            # Determinar el monto según el tipo de detalle
            monto = Decimal("0.00")
            tipo_rendicion = "rendicion_gasto"
            
            # DetalleGastoRendicion
            if hasattr(detalle, 'monto_total'):
                monto = Decimal(str(detalle.monto_total or 0))
                tipo_rendicion = "rendicion_gasto"
            
            # RendicionEnOt
            elif hasattr(detalle, 'monto_total'):
                monto = Decimal(str(detalle.monto_total or 0))
                tipo_rendicion = "rendicion_ot"
            
            if monto > 0:
                total_ejecutado += monto
                
                nombre_detalle = (
                    getattr(detalle, 'detalle', None) 
                    or getattr(detalle, 'descripcion', None)
                    or "Gasto sin descripción"
                )
                
                items.append({
                    "id": f"rendicion_{rendicion.id}_item_{rend_item.id}",
                    "nombre": nombre_detalle,
                    "cantidad": 1,
                    "precio_unitario": float(monto),
                    "total": float(monto),
                    "tipo": tipo_rendicion,
                    "politica": rendicion.politica_viaticos
                })
    
    return {
        "items": items,
        "total": float(total_ejecutado),
        "moneda": "CLP"
    }

