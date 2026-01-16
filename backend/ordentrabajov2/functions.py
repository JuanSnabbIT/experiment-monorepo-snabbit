"""
Funciones para el módulo de Ordenes de Trabajo (Cierres Administrativos/Facturación)
"""

from decimal import Decimal
import io
import os
from datetime import datetime
from django.conf import settings
from django.db.models import Q
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
from core.pdf.engine import create_pdf_engine
from core.pdf.styles import get_pdf_styles, BRAND_BLUE, LIGHT_GRAY, TEXT_DARK, success_color_by_state
from core.pdf.components import get_header_flowable, draw_footer, create_info_table, create_data_table, create_signature_block
from core.pdf.utils import format_currency


def format_currency(value):
    if value is None:
        return "$0"
    return f"${value:,.0f}".replace(",", ".")



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
                if hasattr(contrato_servicio, "nombre") and contrato_servicio.nombre
                else contrato_servicio.servicio_generico.nombre
            )

            cantidad = contrato_servicio.cantidad
            precio_unitario = contrato_servicio.precio_unitario
            total_item = Decimal(cantidad) * Decimal(precio_unitario)

            items.append(
                {
                    "id": f"servicio_{contrato_servicio.id}",
                    "nombre": nombre_servicio,
                    "cantidad": cantidad,
                    "precio_unitario": float(precio_unitario),
                    "total": float(total_item),
                    "tipo": "servicio",
                    "vinculado_a": None,
                }
            )

            total_pactado += total_item

    # Procesar ContratoLicencia
    if contrato.contrato_licencias.exists():
        for contrato_licencia in contrato.contrato_licencias.all():
            nombre_licencia = contrato_licencia.licencia.nombre
            cantidad = contrato_licencia.cantidad
            precio_unitario = contrato_licencia.precio_unitario
            total_item = Decimal(cantidad) * Decimal(precio_unitario)

            items.append(
                {
                    "id": f"licencia_{contrato_licencia.id}",
                    "nombre": nombre_licencia,
                    "cantidad": cantidad,
                    "precio_unitario": float(precio_unitario),
                    "total": float(total_item),
                    "tipo": "licencia",
                    "vinculado_a": None,
                }
            )

            total_pactado += total_item

    return {"items": items, "total": float(total_pactado), "moneda": "CLP"}


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
    from bodegas.models import GuiaSalida, ItemsGuiaSalida
    from cotizaciones.models import Cotizacion, ItemCotizacion
    from ordentrabajov2.models import OrdenDeTrabajo, ServicioEnOT, SoporteTecnico
    from rendiciones.models import Rendicion

    items = []
    total_ejecutado = Decimal("0.00")
    cliente = contrato.empresa_cliente

    # 1. SERVICIOS EN ÓRDENES DE TRABAJO COMPLETADAS
    ordenes_completadas = OrdenDeTrabajo.objects.filter(
        cliente=cliente,
        estado__in=["completada", "cerrada", "facturada"],
        fecha_finalizacion_ot__isnull=False,
    ).prefetch_related("soportetecnico_set", "servicioenot_set")

    for orden in ordenes_completadas:
        # Procesar SoporteTecnico (detalles técnicos)
        for soporte in orden.soportetecnico_set.all():
            items.append(
                {
                    "id": f"ot_{orden.id}_soporte_{soporte.id}",  # legacy
                    "item_id": soporte.id,
                    "nombre": soporte.nombre,
                    "cantidad": 1,
                    "precio_unitario": 0.0,
                    "total": 0.0,
                    "tipo": "soporte_tecnico",
                    "estado": soporte.estado,
                    "ot_id": orden.id,
                }
            )

        # Procesar ServicioEnOT (servicios)
        for servicio in orden.servicioenot_set.all():
            items.append(
                {
                    "id": f"ot_{orden.id}_servicio_{servicio.id}",  # legacy
                    "item_id": servicio.id,
                    "nombre": servicio.nombre,
                    "cantidad": 1,
                    "precio_unitario": 0.0,
                    "total": 0.0,
                    "tipo": "servicio_ot",
                    "estado": servicio.estado,
                    "ot_id": orden.id,
                }
            )

    # 2. ITEMS EN COTIZACIONES ACEPTADAS
    cotizaciones_aceptadas = Cotizacion.objects.filter(
        cliente=cliente,
        estado="aceptada",
        fecha_creacion__date__gte=periodo_desde,
        fecha_creacion__date__lte=periodo_hasta,
    ).prefetch_related("items")

    for cotizacion in cotizaciones_aceptadas:
        for item_cot in cotizacion.items.all():
            costo = Decimal(str(item_cot.costo_total or 0))
            total_ejecutado += costo

            items.append(
                {
                    "id": f"cotizacion_{cotizacion.id}_item_{item_cot.id}",
                    "nombre": item_cot.nombre or "Item sin nombre",
                    "cantidad": item_cot.cantidad,
                    "precio_unitario": float(item_cot.precio_unitario or 0),
                    "total": float(costo),
                    "tipo": "cotizacion",
                    "aprobado": item_cot.aprobado,
                }
            )

    # 3. ITEMS EN GUÍAS DE SALIDA ENTREGADAS
    guias_entregadas = GuiaSalida.objects.filter(
        cliente=cliente,
        estado__in=["FR", "ET"],  # Firmada o Entregada
        fecha_creacion__date__gte=periodo_desde,
        fecha_creacion__date__lte=periodo_hasta,
    ).prefetch_related("itemsguiasalida_set")

    for guia in guias_entregadas:
        for item_guia in guia.itemsguiasalida_set.all():
            cantidad_entregada = item_guia.cantidad_rebajada
            nombre_item = (
                item_guia.stock_item.item.nombre
                if item_guia.stock_item.item
                else "Item sin nombre"
            )

            items.append(
                {
                    "id": f"guia_{guia.id}_item_{item_guia.id}",
                    "nombre": nombre_item,
                    "cantidad": cantidad_entregada,
                    "precio_unitario": 0.0,
                    "total": 0.0,
                    "tipo": "guia_salida",
                    "estado": guia.estado,
                }
            )

    # 4. RENDICIONES PAGADAS (Todo se cobra al cliente)
    rendiciones_pagadas = Rendicion.objects.filter(
        cliente=cliente,
        estado="4",  # Solo rendiciones pagadas
        fecha_rendicion__gte=periodo_desde,
        fecha_rendicion__lte=periodo_hasta,
    ).prefetch_related("items")

    for rendicion in rendiciones_pagadas:
        # Procesar RendicionItem (genéricos)
        for rend_item in rendicion.items.all():
            detalle = rend_item.detalle
            if detalle is None:
                continue

            monto = Decimal("0.00")
            tipo_rendicion = "rendicion_gasto"
            nombre_detalle = "Gasto sin descripción"

            # Obtener el content type del detalle
            ct = rend_item.content_type

            # Gastos operativos (DetalleGastoRendicion o GastoOperativoEnOt)
            if ct.app_label == "rendiciones" and ct.model == "detallegastorendicion":
                monto = Decimal(str(detalle.monto_total or 0))
                nombre_detalle = getattr(detalle, "detalle", "Gasto sin descripción")
                tipo_rendicion = "rendicion_gasto"

            elif ct.app_label == "ordentrabajov2" and ct.model == "gastooperativoenot":
                monto = Decimal(str(detalle.monto_total or 0))
                nombre_detalle = getattr(detalle, "detalle", "Gasto sin descripción")
                tipo_rendicion = "rendicion_gasto"

            # Compras (Compra completa con todos sus ItemEnCompra)
            elif ct.app_label == "bodegas" and ct.model == "compra":
                # La Compra contiene múltiples ItemEnCompra, sumar todos
                monto = sum(
                    Decimal(line.cantidad) * Decimal(str(line.precio))
                    for line in detalle.itemencompra_set.all()
                )
                nombre_detalle = f"Compra #{detalle.id}"
                tipo_rendicion = "compra_material"

            if monto > 0:
                total_ejecutado += monto

                items.append(
                    {
                        "id": f"rendicion_{rendicion.id}_item_{rend_item.id}",
                        "nombre": nombre_detalle,
                        "cantidad": 1,
                        "precio_unitario": float(monto),
                        "total": float(monto),
                        "tipo": tipo_rendicion,
                    }
                )

    return {"items": items, "total": float(total_ejecutado), "moneda": "CLP"}


def calcular_ejecutado_de_ots_seleccionadas(ots_ids):
    """
    Extrae los items ejecutados de un conjunto específico de OTs.
    Similar a calcular_ejecutado_del_contrato pero solo considera las OTs indicadas.

    Args:
        ots_ids: Lista de IDs de OrdenDeTrabajo

    Returns:
        dict: Estructura con items y total
        {
            "items": [...],
            "total": 1500.0,
            "moneda": "CLP",
            "resumen": {
                "trabajos": 5,
                "guias": 2,
                "rendiciones": 3
            }
        }
    """
    import logging

    from bodegas.models import GuiaSalida
    from cotizaciones.models import Cotizacion
    from ordentrabajov2.models import OrdenDeTrabajo
    from rendiciones.models import Rendicion

    logger = logging.getLogger("facturacion.debug")

    items = []
    total_ejecutado = Decimal("0.00")

    # Contadores para resumen
    count_trabajos = 0
    count_guias = 0
    count_compras = 0
    count_gastos = 0

    # Obtener las OTs seleccionadas
    ordenes = OrdenDeTrabajo.objects.filter(
        id__in=ots_ids,
        estado__in=["completada", "cerrada", "facturada"],
    ).prefetch_related("soportetecnico_set", "servicioenot_set")

    for orden in ordenes:
        # Procesar SoporteTecnico
        for soporte in orden.soportetecnico_set.all():
            count_trabajos += 1
            usuarios_asignados_count = soporte.usuarioasignadosoporte_set.count()
            items.append(
                {
                    "id": soporte.id,
                    "item_id": soporte.id,
                    "nombre": soporte.nombre,
                    "cantidad": 1,
                    "precio_unitario": 0.0,
                    "total": 0.0,
                    "tipo": "soporte_tecnico",
                    "estado": soporte.estado,
                    "ot_id": orden.id,
                    "usuarios_asignados_count": usuarios_asignados_count,
                }
            )

        # Procesar ServicioEnOT
        for servicio in orden.servicioenot_set.all():
            count_trabajos += 1
            items.append(
                {
                    "id": servicio.id,
                    "item_id": servicio.id,
                    "nombre": servicio.nombre,
                    "cantidad": 1,
                    "precio_unitario": 0.0,
                    "total": 0.0,
                    "tipo": "servicio_ot",
                    "estado": servicio.estado,
                    "ot_id": orden.id,
                }
            )

        # Procesar Guías de Salida vinculadas directamente a esta OT
        guias_ot = GuiaSalida.objects.filter(
            orden_trabajo=orden,  # Filtrar por OT específica (relación directa)
            estado__in=["FR", "E"],  # FR=Firmada, E=Entregada
        ).prefetch_related("itemsguiasalida_set__stock_item__item")

        for guia in guias_ot:
            count_guias += 1
            cantidad_items = guia.itemsguiasalida_set.count()
            for item_guia in guia.itemsguiasalida_set.all():
                cantidad_entregada = item_guia.cantidad_rebajada

                # Intentar obtener nombre del item desde múltiples fuentes
                nombre_item = "Item sin nombre"
                try:
                    if item_guia.stock_item and item_guia.stock_item.item:
                        nombre_item = item_guia.stock_item.item.nombre
                        # Asegurar que nombre no sea vacío
                        if not nombre_item or nombre_item.strip() == "":
                            nombre_item = f"Item #{item_guia.stock_item.item.id}"
                        logger.debug(
                            f"GuiaSalida item {item_guia.id}: nombre='{nombre_item}'"
                        )
                    elif hasattr(item_guia, "nombre") and item_guia.nombre:
                        nombre_item = item_guia.nombre
                    elif item_guia.stock_item:
                        nombre_item = f"Stock #{item_guia.stock_item.id}"
                except (AttributeError, ValueError) as e:
                    # En caso de error en la traversal de relaciones
                    nombre_item = f"Guía #{guia.id} - Item #{item_guia.id}"
                    logger.error(
                        f"Error extrayendo nombre para item_guia {item_guia.id}: {str(e)}"
                    )

                items.append(
                    {
                        "id": item_guia.id,  # legacy - mantener por compatibilidad
                        "item_id": item_guia.id,
                        "nombre": nombre_item,
                        "cantidad": cantidad_entregada,
                        "precio_unitario": 0.0,
                        "total": 0.0,
                        "tipo": "guia_salida",
                        "estado": guia.estado,
                        "ot_id": orden.id,
                        "guia_id": guia.id,  # legacy - mantener por compatibilidad
                        "stock_item_id": (
                            item_guia.stock_item_id if item_guia.stock_item_id else None
                        ),
                        "cantidad_items": cantidad_items,
                    }
                )

        # Procesar Rendiciones - traer items individuales (Compras y Gastos Operativos)
        # Se obtienen desde la Rendición asociada a la OT
        # Permite decidir cuál se factura: una compra, un gasto, uno, el otro o ninguno
        rendiciones_ot = Rendicion.objects.filter(
            orden_trabajo=orden,  # Vinculadas directamente a esta OT
            estado__in=["0", "1", "2", "4"],  # Excluye rechazadas ("3")
        ).prefetch_related("items__content_type")

        for rendicion in rendiciones_ot:
            logger.info(
                f"Procesando Rendición {rendicion.id}: {rendicion.items.count()} items"
            )

            # Iterar items individuales dentro de la rendición
            for item_rendicion in rendicion.items.all():

                # Determinar el tipo de item (Compra o Gasto Operativo)
                content_type = item_rendicion.content_type
                nombre_item = "Item sin nombre"
                monto = 0.0

                logger.debug(
                    f"ItemRendicion {item_rendicion.id}: content_type.app_label='{content_type.app_label}', content_type.model='{content_type.model}'"
                )

                try:
                    # Obtener el objeto a través del GenericForeignKey
                    obj = (
                        item_rendicion.detalle
                    )  # Usar 'detalle' que es el GenericForeignKey en ItemRendicion

                    if obj is None:
                        logger.warning(
                            f"ItemRendicion {item_rendicion.id}: El objeto genérico es None"
                        )
                        continue

                    # Compra
                    if (
                        content_type.app_label == "bodegas"
                        and content_type.model == "compra"
                    ):
                        compra = obj
                        items_compra = compra.itemencompra_set.select_related("item")
                        if not items_compra.exists():
                            logger.info(
                                f"  → Compra {compra.id}: sin items en compra"
                            )
                            continue

                        for item_compra in items_compra:
                            cantidad_item = item_compra.cantidad or 0
                            precio_unitario_item = item_compra.precio or 0
                            monto_item = float(cantidad_item * precio_unitario_item)

                            if monto_item <= 0:
                                continue

                            nombre_item = (
                                item_compra.item.nombre
                                if item_compra.item
                                else f"Item #{item_compra.id}"
                            )

                            total_ejecutado += Decimal(str(monto_item))
                            count_compras += 1

                            items.append(
                                {
                                    "id": item_compra.id,
                                    "item_id": item_compra.id,
                                    "nombre": nombre_item,
                                    "cantidad": cantidad_item,
                                    "precio_unitario": float(precio_unitario_item),
                                    "total": float(monto_item),
                                    "tipo": "compra",
                                    "ot_id": orden.id,
                                    "rendicion_id": rendicion.id,
                                    "item_rendicion_id": item_rendicion.id,
                                    "compra_id": compra.id,
                                    "content_type": f"{content_type.app_label}.{content_type.model}",
                                }
                            )

                        continue

                    # Gasto Operativo (DetalleGastoRendicion en app rendiciones)
                    elif (
                        content_type.app_label == "rendiciones"
                        and content_type.model == "detallegastorendicion"
                    ):
                        gasto = obj
                        nombre_item = f"Gasto - {gasto.detalle if hasattr(gasto, 'detalle') and gasto.detalle else f'ID {gasto.id}'}"
                        monto = (
                            float(gasto.monto_total or 0)
                            if hasattr(gasto, "monto_total")
                            else 0.0
                        )
                        logger.info(
                            f"  → Gasto Rendición: {nombre_item}, monto={monto}"
                        )

                    # Gasto Operativo en OT (si viene de ordentrabajov2)
                    elif (
                        content_type.app_label == "ordentrabajov2"
                        and content_type.model == "gastooperativoenot"
                    ):
                        gasto = obj
                        nombre_item = f"Gasto - {gasto.detalle if hasattr(gasto, 'detalle') and gasto.detalle else f'ID {gasto.id}'}"
                        monto = (
                            float(gasto.monto_total or 0)
                            if hasattr(gasto, "monto_total")
                            else 0.0
                        )
                        logger.info(f"  → Gasto OT: {nombre_item}, monto={monto}")

                    else:
                        logger.warning(
                            f"ItemRendicion {item_rendicion.id}: Tipo de contenido desconocido: {content_type.app_label}.{content_type.model}"
                        )
                        continue

                except Exception as e:
                    logger.error(
                        f"Error procesando ItemRendicion {item_rendicion.id}: {str(e)}",
                        exc_info=True,
                    )
                    continue

                if monto > 0:
                    total_ejecutado += Decimal(str(monto))

                    # Determinar tipo específico según content_type
                    tipo_item = "rendicion_gasto"  # default (no debería usarse)
                    if (
                        content_type.app_label == "bodegas"
                        and content_type.model == "compra"
                    ):
                        tipo_item = "compra"
                        count_compras += 1
                    elif (
                        content_type.app_label == "rendiciones"
                        and content_type.model == "detallegastorendicion"
                    ):
                        tipo_item = "gasto_operativo"
                        count_gastos += 1
                    elif (
                        content_type.app_label == "ordentrabajov2"
                        and content_type.model == "gastooperativoenot"
                    ):
                        tipo_item = "gasto_operativo"
                        count_gastos += 1

                    items.append(
                        {
                            "id": item_rendicion.id,
                            "item_id": obj.id,  # ID del objeto real (Compra o Gasto), no del ItemRendicion
                            "nombre": nombre_item,
                            "cantidad": 1,
                            "precio_unitario": monto,
                            "total": monto,
                            "tipo": tipo_item,  # "compra" o "gasto_operativo"
                            "ot_id": orden.id,
                            "rendicion_id": rendicion.id,
                            "item_rendicion_id": item_rendicion.id,
                            "content_type": f"{content_type.app_label}.{content_type.model}",
                        }
                    )
                else:
                    logger.info(
                        f"ItemRendicion {item_rendicion.id}: Monto es 0, no se incluye en items"
                    )

    return {
        "items": items,
        "total": float(total_ejecutado),
        "moneda": "CLP",
        "resumen": {
            "trabajos": count_trabajos,
            "guias": count_guias,
            "compras": count_compras,
            "gastos_operativos": count_gastos,
        },
    }


def generar_pdf_orden_trabajo(orden, servicios, soportes, guias, gastos, adjuntos):
    """
    Genera un PDF profesional para una Orden de Trabajo con estructura por módulos.
    Utiliza el motor compartido core.pdf.
    """
    buffer = io.BytesIO()
    doc = create_pdf_engine(buffer)

    story = []
    styles = get_pdf_styles()
    
    # 1. Header (Logo y Datos)
    # En SimpleDocTemplate con Flowables, podemos poner el encabezado como primer elemento
    # O usar un PageTemplate. Por simplicidad y consistencia visual con el resto,
    # lo añadimos como tabla al principio del flujo.
    story.append(get_header_flowable())
    story.append(Spacer(1, 0.5 * cm))

    # 2. Título del Documento
    story.append(Paragraph(f"ORDEN DE TRABAJO Nº {orden.id}", styles["DocTitle"]))
    
    # Estado (Color coded)
    estado_text = f'<b>Estado:</b> <font color="{success_color_by_state(orden.estado).hexval()}">{orden.get_estado_display().upper()}</font>'
    story.append(Paragraph(estado_text, styles["DataRight"]))
    story.append(Spacer(1, 0.5 * cm))

    # 3. Información General (Tabla Key-Value)
    info_data = [
        ["FECHA EMISIÓN:", orden.fecha_creacion.strftime("%d/%m/%Y"), "PRIORIDAD:", orden.get_prioridad_display()],
        ["CLIENTE:", orden.cliente.nombre, "SOLICITANTE:", orden.cliente_solicitante.usuario.get_nombre_completo() if orden.cliente_solicitante else "N/A"],
        ["TIPO SERVICIO:", orden.get_tipo_servicio_display(), "RESPONSABLE:", orden.tecnico_responsable_ot.usuario.get_nombre_completo() if orden.tecnico_responsable_ot else "N/A"],
        ["FECHA INICIO:", orden.fecha_inicio_ot.strftime("%d/%m/%Y") if orden.fecha_inicio_ot else "N/A", "FECHA FIN:", orden.fecha_finalizacion_ot.strftime("%d/%m/%Y") if orden.fecha_finalizacion_ot else "N/A"],
    ]
    story.append(create_info_table(info_data))
    story.append(Spacer(1, 0.5 * cm))

    # 4. Descripción
    story.append(Paragraph("DESCRIPCIÓN DEL REQUERIMIENTO", styles["SectionHead"]))
    story.append(Paragraph(orden.descripcion, styles["BodyText"]))
    story.append(Spacer(1, 1 * cm))

    # 5. Resumen Ejecutivo
    resumen_headers = ["RESUMEN EJECUTIVO", ""]
    resumen_data = [
        ["Servicios/Soportes registrados:", str(len(servicios) + len(soportes))],
        ["Guías de Salida asociadas:", str(len(guias))],
        ["Gastos Operativos totales:", format_currency(sum(g.monto_total for g in gastos))],
    ]
    # Usamos create_data_table pero adaptado para resumen (sin header row explícito en data si usamos el helper)
    # Ajuste manual para la tabla de resumen que es simple
    resumen_table = Table([resumen_headers] + resumen_data, colWidths=[8 * cm, 4 * cm])
    resumen_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BRAND_BLUE),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica-Bold"),
        ("ALIGN", (1, 1), (1, -1), "CENTER"),
        ("GRID", (0, 0), (-1, -1), 0.5, LIGHT_GRAY),
    ]))
    story.append(resumen_table)
    story.append(PageBreak())

    # --- MÓDULO 2: SERVICIOS Y SOPORTES ---
    if servicios or soportes:
        story.append(Paragraph("SERVICIOS Y SOPORTES TÉCNICOS", styles["ModuleTitle"]))

        # Soportes (Iterar y mostrar detalles)
        for sop in soportes:
            story.append(Paragraph(f"{sop.nombre} (Soporte Técnico)", styles["SectionHead"]))
            sop_info = [
                ["Fecha:", sop.fecha_soporte.strftime("%d/%m/%Y") if sop.fecha_soporte else "N/A", "Estado:", sop.get_estado_display()],
                ["Técnico:", sop.tecnico_asignado.usuario.get_nombre_completo() if sop.tecnico_asignado else "No asignado", "Guía:", f"GS-{sop.guia_salida.id}" if sop.guia_salida else "N/A"],
            ]
            story.append(create_info_table(sop_info))
            story.append(Spacer(1, 0.2 * cm))
            story.append(Paragraph(f"<b>Descripción:</b> {sop.descripcion}", styles["BodyText"]))
            story.append(Spacer(1, 0.5 * cm))
            
            # Firma Placeholder (Simplificado)
            story.append(create_signature_block([("Ejecución", "Firma Técnico"), ("Validación", "Firma Cliente")]))
            story.append(Spacer(1, 1 * cm))

        # Servicios
        for serv in servicios:
            story.append(Paragraph(f"{serv.nombre} (Servicio General)", styles["SectionHead"]))
            serv_info = [
                ["Fecha:", serv.fecha_servicio.strftime("%d/%m/%Y") if serv.fecha_servicio else "N/A", "Estado:", serv.get_estado_display()],
                ["Técnico:", serv.tecnico_asignado.usuario.get_nombre_completo() if serv.tecnico_asignado else "No asignado", "Resuelto:", "SÍ" if serv.resuelto else "NO"],
            ]
            story.append(create_info_table(serv_info))
            story.append(Spacer(1, 0.2 * cm))
            story.append(Paragraph(f"<b>Descripción:</b> {serv.descripcion}", styles["BodyText"]))
            story.append(Spacer(1, 0.5 * cm))
            story.append(create_signature_block([("Ejecución", "Firma Técnico"), ("Validación", "Firma Cliente")]))
            story.append(Spacer(1, 1 * cm))

        story.append(PageBreak())

    # --- MÓDULO 3: GUÍAS DE SALIDA ---
    if guias:
        story.append(Paragraph("GUÍAS DE SALIDA Y MATERIALES", styles["ModuleTitle"]))
        for guia in guias:
            story.append(Paragraph(f"GUÍA DE SALIDA Nº {guia.id}", styles["SectionHead"]))
            guia_info = [
                ["FECHA:", guia.fecha_creacion.strftime("%d/%m/%Y"), "BODEGA:", guia.bodega.nombre],
                ["ENTREGADO A:", guia.entregado_a.usuario.get_nombre_completo() if guia.entregado_a else "N/A", "MOTIVO:", guia.motivo or "Sin motivo"],
            ]
            story.append(create_info_table(guia_info))
            story.append(Spacer(1, 0.5 * cm))

            # Items Table
            headers = ["ITEM / MATERIAL", "CANT.", "NUM. SERIE"]
            data_items = []
            for item in guia.itemsguiasalida_set.all():
                nombre = item.stock_item.item.nombre if item.stock_item and item.stock_item.item else "Desconocido"
                data_items.append([nombre, str(item.cantidad_rebajada), str(item.numero_serie or "N/A")])
            
            story.append(create_data_table(headers, data_items, [9 * cm, 3 * cm, 6 * cm]))
            story.append(Spacer(1, 0.5 * cm))
            story.append(create_signature_block([("Entregó", "Bodega"), ("Recibió", "Técnico")]))
            story.append(Spacer(1, 1 * cm))
        
        story.append(PageBreak())

    # --- MÓDULO 4: GASTOS ---
    if gastos:
        story.append(Paragraph("GASTOS OPERATIVOS", styles["ModuleTitle"]))
        headers = ["FECHA", "CATEGORÍA", "DETALLE", "CANT.", "TOTAL"]
        data_gastos = []
        for gasto in gastos:
            data_gastos.append([
                gasto.fecha_compra.strftime("%d/%m/%Y") if gasto.fecha_compra else "N/A",
                gasto.categoria.nombre if gasto.categoria else "N/A",
                gasto.detalle or "-",
                str(gasto.cantidad),
                format_currency(gasto.monto_total),
            ])
        # Total Row
        data_gastos.append(["", "", "TOTAL GASTOS:", "", format_currency(sum(g.monto_total for g in gastos))])
        
        story.append(create_data_table(headers, data_gastos, [2.5 * cm, 3.5 * cm, 8 * cm, 1.5 * cm, 2.5 * cm]))
        story.append(PageBreak())

    # --- CIERRE ---
    story.append(Paragraph("CIERRE Y VALIDACIÓN FINAL", styles["ModuleTitle"]))
    story.append(Spacer(1, 1 * cm))
    story.append(Paragraph("ESTADO FINAL DE TRABAJOS", styles["SectionHead"]))
    
    headers_resumen = ["TRABAJO / SERVICIO", "ESTADO", "RESUELTO"]
    data_resumen = []
    for sop in soportes:
        data_resumen.append([sop.nombre, sop.get_estado_display(), "SÍ" if sop.estado == "completado" else "NO"])
    for serv in servicios:
        data_resumen.append([serv.nombre, serv.get_estado_display(), "SÍ" if serv.resuelto else "NO"])
        
    story.append(create_data_table(headers_resumen, data_resumen, [10 * cm, 5 * cm, 3 * cm]))
    story.append(Spacer(1, 2 * cm))

    # Firmas Finales
    story.append(create_signature_block([
        ("Técnico Responsable", orden.tecnico_responsable_ot.usuario.get_nombre_completo() if orden.tecnico_responsable_ot else ""),
        ("Validación Cliente", orden.cliente_solicitante.usuario.get_nombre_completo() if orden.cliente_solicitante else "")
    ]))
    
    story.append(Spacer(1, 1 * cm))
    story.append(create_signature_block([("Aprobación Administrativa", "")] ))

    # Build
    doc.build(story, onFirstPage=draw_footer, onLaterPages=draw_footer)
    buffer.seek(0)
    return buffer
