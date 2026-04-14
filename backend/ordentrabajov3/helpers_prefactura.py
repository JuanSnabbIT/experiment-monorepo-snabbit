"""
Helpers de prefacturacion para OT V3.
Logica de matching pactado/ejecutado adaptada para los modelos de ordentrabajov3.

Diferencias clave vs V2:
- Gastos propios: GastoOTV3 (no GastoOperativoEnOt ni rendiciones)
- Cotizaciones, guias y OC: M2M directos en OrdenDeTrabajoV3
- Sin SoporteTecnico / ServicioEnOT — las tareas son TareaOTV3
"""

import logging
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

from django.utils import timezone

logger = logging.getLogger("facturacion.debug")

MONEDA_CODIGO_MAP = {
    "1": "USD",
    "2": "CLP",
    "3": "UF",
}
MONEDAS_PERMITIDAS_PREF = {"CLP", "USD", "UF"}
DECIMALES_POR_MONEDA_PREF = {
    "CLP": 0,
    "USD": 1,
    "UF": 4,
}
CUANTIZACION_POR_MONEDA_PREF = {
    "CLP": Decimal("1"),
    "USD": Decimal("0.1"),
    "UF": Decimal("0.0001"),
}


def _to_decimal(value, default=Decimal("0")):
    if isinstance(value, Decimal):
        return value
    if value in (None, ""):
        return default
    try:
        return Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        return default


def _to_positive_decimal_or_none(value):
    if value in (None, ""):
        return None
    try:
        parsed = Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        return None
    if parsed <= 0:
        return None
    return parsed


def normalizar_moneda_prefactura(moneda, default="CLP"):
    if moneda in (None, ""):
        return default
    normalized = str(moneda).strip().upper()
    normalized = MONEDA_CODIGO_MAP.get(normalized, normalized)
    if normalized not in MONEDAS_PERMITIDAS_PREF:
        raise ValueError(
            f"Moneda no soportada: {moneda}. Debe ser una de {sorted(MONEDAS_PERMITIDAS_PREF)}."
        )
    return normalized


def cuantizar_monto_prefactura(value, moneda):
    moneda_norm = normalizar_moneda_prefactura(moneda)
    monto = _to_decimal(value)
    quantum = CUANTIZACION_POR_MONEDA_PREF[moneda_norm]
    return monto.quantize(quantum, rounding=ROUND_HALF_UP)


def resolver_tasas_cambio_prefactura(
    *,
    fecha_prefactura,
    dolar_override=None,
    uf_override=None,
    monedas_requeridas=None,
    fetch_missing=False,
):
    try:
        from cotizaciones.tasks import obtener_tipo_cambio_mindicador_con_fallback
    except ImportError:
        obtener_tipo_cambio_mindicador_con_fallback = None

    requeridas = {normalizar_moneda_prefactura(m) for m in (monedas_requeridas or [])}
    tasa_dolar = _to_positive_decimal_or_none(dolar_override)
    tasa_uf = _to_positive_decimal_or_none(uf_override)

    necesita_dolar = "USD" in requeridas
    necesita_uf = "UF" in requeridas

    debe_buscar_dolar = tasa_dolar is None and (necesita_dolar or fetch_missing)
    debe_buscar_uf = tasa_uf is None and (necesita_uf or fetch_missing)

    if debe_buscar_dolar or debe_buscar_uf:
        if not obtener_tipo_cambio_mindicador_con_fallback:
            raise ValueError(
                "No hay proveedor de tipo de cambio disponible para completar conversion de moneda."
            )
        if fecha_prefactura is None:
            raise ValueError("Se requiere fecha_prefactura para resolver tipo de cambio.")
        try:
            if debe_buscar_dolar:
                tasa_dolar_raw, _ = obtener_tipo_cambio_mindicador_con_fallback(
                    "dolar",
                    fecha_prefactura,
                )
                tasa_dolar = _to_positive_decimal_or_none(tasa_dolar_raw)
            if debe_buscar_uf:
                tasa_uf_raw, _ = obtener_tipo_cambio_mindicador_con_fallback(
                    "uf",
                    fecha_prefactura,
                )
                tasa_uf = _to_positive_decimal_or_none(tasa_uf_raw)
        except Exception as exc:
            if necesita_dolar or necesita_uf:
                raise ValueError(
                    f"No fue posible obtener tipos de cambio para {fecha_prefactura}: {exc}"
                ) from exc
            logger.warning(
                "No fue posible obtener tipos de cambio informativos para fecha=%s: %s",
                fecha_prefactura,
                exc,
            )

    if necesita_dolar and tasa_dolar is None:
        raise ValueError("No existe tasa de dolar valida para la conversion solicitada.")
    if necesita_uf and tasa_uf is None:
        raise ValueError("No existe tasa de UF valida para la conversion solicitada.")

    return {
        "dolar": tasa_dolar,
        "uf": tasa_uf,
    }


def convertir_monto_a_clp(monto, moneda_origen, *, tasa_dolar=None, tasa_uf=None):
    moneda_norm = normalizar_moneda_prefactura(moneda_origen)
    monto_dec = _to_decimal(monto)
    if moneda_norm == "CLP":
        return monto_dec
    if moneda_norm == "USD":
        if tasa_dolar is None:
            raise ValueError("Falta tasa de dolar para convertir USD a CLP.")
        return monto_dec * _to_decimal(tasa_dolar)
    if moneda_norm == "UF":
        if tasa_uf is None:
            raise ValueError("Falta tasa de UF para convertir UF a CLP.")
        return monto_dec * _to_decimal(tasa_uf)
    raise ValueError(f"Moneda origen no soportada: {moneda_norm}")


def convertir_monto_desde_clp(monto_clp, moneda_destino, *, tasa_dolar=None, tasa_uf=None):
    moneda_norm = normalizar_moneda_prefactura(moneda_destino)
    monto_clp_dec = _to_decimal(monto_clp)
    if moneda_norm == "CLP":
        return cuantizar_monto_prefactura(monto_clp_dec, "CLP")
    if moneda_norm == "USD":
        if tasa_dolar is None:
            raise ValueError("Falta tasa de dolar para convertir CLP a USD.")
        return cuantizar_monto_prefactura(
            monto_clp_dec / _to_decimal(tasa_dolar),
            "USD",
        )
    if moneda_norm == "UF":
        if tasa_uf is None:
            raise ValueError("Falta tasa de UF para convertir CLP a UF.")
        return cuantizar_monto_prefactura(
            monto_clp_dec / _to_decimal(tasa_uf),
            "UF",
        )
    raise ValueError(f"Moneda destino no soportada: {moneda_norm}")


def _resolve_fecha_prefactura_v3(raw_fecha):
    """
    Convierte string ISO o date object a date.
    Fallback: hoy (timezone.localdate()).
    """
    if raw_fecha is None:
        return timezone.localdate()
    if hasattr(raw_fecha, "year"):
        return raw_fecha
    try:
        from datetime import date
        if isinstance(raw_fecha, str):
            return date.fromisoformat(raw_fecha[:10])
    except (ValueError, TypeError):
        pass
    return timezone.localdate()


def _coerce_non_negative_int(value):
    """Convierte un valor a int >= 0. Si no se puede, retorna None."""
    if value is None:
        return None
    try:
        coerced = int(value)
    except (TypeError, ValueError):
        return None
    if coerced < 0:
        return None
    return coerced


def _resolve_visitas_mensuales_item(item):
    """
    Resuelve visitas mensuales incluidas para un item comercial con prioridad:
    1) num_visitas_mensuales
    2) snapshot_num_visitas_mensuales
    3) valor en referencia (plan/servicio) si existe
    """
    referencia = getattr(item, "plan_version", None) or getattr(item, "servicio_version", None)
    candidatos = [
        getattr(item, "num_visitas_mensuales", None),
        getattr(item, "snapshot_num_visitas_mensuales", None),
        getattr(referencia, "num_visitas_mensuales", None) if referencia else None,
    ]

    for candidato in candidatos:
        visitas = _coerce_non_negative_int(candidato)
        if visitas is not None:
            return visitas
    return 0


def calcular_pactado_del_contrato_v3(
    contrato,
    *,
    moneda_objetivo="CLP",
    tasa_dolar=None,
    tasa_uf=None,
):
    """
    Extrae items pactados de un ContratoEmpresaCliente.
    Fuente primaria: ContratoItemComercial (modelo vigente).
    Fallback: ContratoServicio + ContratoLicencia (legacy) si no hay items_comerciales.

    Returns:
        {
            "items": [{"id", "nombre", "cantidad", "precio_unitario", "total", "tipo", "vinculado_a"}],
            "total": float,
            "moneda": moneda_objetivo
        }
    """
    moneda_objetivo = normalizar_moneda_prefactura(moneda_objetivo)
    items = []
    total_pactado = Decimal("0")

    # Fuente primaria: ContratoItemComercial (modelo vigente)
    items_comerciales = list(contrato.items_comerciales.all())
    if items_comerciales:
        for ic in items_comerciales:
            nombre = ic.snapshot_nombre or f"Item #{ic.id}"
            cantidad = ic.cantidad or 1
            moneda_item = normalizar_moneda_prefactura(
                getattr(ic, "moneda", None) or getattr(contrato, "moneda_cobro", "CLP")
            )
            precio_unitario_origen = _to_decimal(ic.precio_unitario_contratado)
            precio_unitario_clp = convertir_monto_a_clp(
                precio_unitario_origen,
                moneda_item,
                tasa_dolar=tasa_dolar,
                tasa_uf=tasa_uf,
            )
            total_item_clp = precio_unitario_clp * _to_decimal(cantidad)
            precio_unitario = convertir_monto_desde_clp(
                precio_unitario_clp,
                moneda_objetivo,
                tasa_dolar=tasa_dolar,
                tasa_uf=tasa_uf,
            )
            total_item = convertir_monto_desde_clp(
                total_item_clp,
                moneda_objetivo,
                tasa_dolar=tasa_dolar,
                tasa_uf=tasa_uf,
            )

            items.append({
                "id": f"comercial_{ic.id}",
                "nombre": nombre,
                "cantidad": cantidad,
                "precio_unitario": float(precio_unitario),
                "total": float(total_item),
                "moneda": moneda_objetivo,
                "moneda_origen": moneda_item,
                "tipo": ic.tipo_origen,
                "vinculado_a": None,
            })
            total_pactado += total_item

        return {"items": items, "total": float(total_pactado), "moneda": moneda_objetivo}

    # Fallback: modelos legacy ContratoServicio + ContratoLicencia
    for cs in contrato.contrato_servicios.all():
        nombre = (
            cs.nombre
            if hasattr(cs, "nombre") and cs.nombre
            else cs.servicio_generico.nombre
        )
        cantidad = cs.cantidad
        moneda_item = normalizar_moneda_prefactura(
            getattr(cs, "tipo_moneda", None) or getattr(contrato, "moneda_cobro", "CLP")
        )
        precio_unitario_origen = _to_decimal(cs.precio_unitario)
        precio_unitario_clp = convertir_monto_a_clp(
            precio_unitario_origen,
            moneda_item,
            tasa_dolar=tasa_dolar,
            tasa_uf=tasa_uf,
        )
        total_item_clp = precio_unitario_clp * _to_decimal(cantidad)
        precio_unitario = convertir_monto_desde_clp(
            precio_unitario_clp,
            moneda_objetivo,
            tasa_dolar=tasa_dolar,
            tasa_uf=tasa_uf,
        )
        total_item = convertir_monto_desde_clp(
            total_item_clp,
            moneda_objetivo,
            tasa_dolar=tasa_dolar,
            tasa_uf=tasa_uf,
        )

        items.append({
            "id": f"servicio_{cs.id}",
            "nombre": nombre,
            "cantidad": cantidad,
            "precio_unitario": float(precio_unitario),
            "total": float(total_item),
            "moneda": moneda_objetivo,
            "moneda_origen": moneda_item,
            "tipo": "servicio",
            "vinculado_a": None,
        })
        total_pactado += total_item

    for cl in contrato.contrato_licencias.all():
        nombre = cl.licencia.nombre
        cantidad = cl.cantidad
        moneda_item = normalizar_moneda_prefactura(
            getattr(cl, "tipo_moneda", None) or getattr(contrato, "moneda_cobro", "CLP")
        )
        precio_unitario_origen = _to_decimal(cl.precio_unitario)
        precio_unitario_clp = convertir_monto_a_clp(
            precio_unitario_origen,
            moneda_item,
            tasa_dolar=tasa_dolar,
            tasa_uf=tasa_uf,
        )
        total_item_clp = precio_unitario_clp * _to_decimal(cantidad)
        precio_unitario = convertir_monto_desde_clp(
            precio_unitario_clp,
            moneda_objetivo,
            tasa_dolar=tasa_dolar,
            tasa_uf=tasa_uf,
        )
        total_item = convertir_monto_desde_clp(
            total_item_clp,
            moneda_objetivo,
            tasa_dolar=tasa_dolar,
            tasa_uf=tasa_uf,
        )

        items.append({
            "id": f"licencia_{cl.id}",
            "nombre": nombre,
            "cantidad": cantidad,
            "precio_unitario": float(precio_unitario),
            "total": float(total_item),
            "moneda": moneda_objetivo,
            "moneda_origen": moneda_item,
            "tipo": "licencia",
            "vinculado_a": None,
        })
        total_pactado += total_item

    return {"items": items, "total": float(total_pactado), "moneda": moneda_objetivo}



def _precio_unitario_cotizacion_clp(item_cot, dolar_override=None, uf_override=None):
    """
    Convierte precio de item de cotizacion a CLP segun la moneda de la cotizacion.
    """
    moneda_cot = item_cot.cotizacion.tipo_moneda
    unit_base = Decimal(str(item_cot.precio_venta_neta_unitario_moneda_base or 0))

    if moneda_cot == "1":  # USD
        tasa_usd = Decimal(str(dolar_override or item_cot.cotizacion.dolar_observado or 0))
        return float((unit_base * tasa_usd if tasa_usd > 0 else Decimal("0")).quantize(Decimal("0.01")))

    if moneda_cot == "3":  # UF
        tasa_uf = Decimal(str(uf_override or item_cot.cotizacion.valor_uf or 0))
        return float((unit_base * tasa_uf if tasa_uf > 0 else Decimal("0")).quantize(Decimal("0.01")))

    # CLP
    unit_clp = Decimal(str(item_cot.precio_unitario_backend.get("clp", 0)))
    return float(unit_clp.quantize(Decimal("0.01")))


def calcular_ejecutado_de_ots_v3(
    ots_ids_v3,
    fecha_prefactura=None,
    *,
    moneda_objetivo="CLP",
    tasa_dolar=None,
    tasa_uf=None,
):
    """
    Extrae items ejecutados de un conjunto de OrdenDeTrabajoV3.

    Fuentes:
    - TareaOTV3 completadas (trabajo ejecutado)
    - GastoOTV3 (gastos directos)
    - Cotizaciones M2M vinculadas y sus ItemCotizacion
    - GuiasSalida M2M vinculadas y sus ItemsGuiaSalida
    - OrdenesCompra M2M vinculadas y sus ItemEnCompra

    Returns:
        {
            "items": [...],
            "total": float,
            "moneda": moneda_objetivo,
            "resumen": {"tareas", "guias", "compras", "gastos"},
            "cotizaciones": [...]
        }
    """
    from bodegas.models import GuiaSalida, ItemsGuiaSalida
    from cotizaciones.models import Cotizacion, ItemCotizacion
    from ordentrabajov3.models import GastoOTV3, OrdenDeTrabajoV3, TareaOTV3

    moneda_objetivo = normalizar_moneda_prefactura(moneda_objetivo)
    tasas = resolver_tasas_cambio_prefactura(
        fecha_prefactura=fecha_prefactura,
        dolar_override=tasa_dolar,
        uf_override=tasa_uf,
        monedas_requeridas=[moneda_objetivo],
    )
    tasa_dolar_resuelta = tasas["dolar"]
    tasa_uf_resuelta = tasas["uf"]

    items = []
    total_ejecutado_clp = Decimal("0")
    count_tareas = 0
    count_guias = 0
    count_compras = 0
    count_gastos = 0

    ordenes = (
        OrdenDeTrabajoV3.objects
        .filter(id__in=ots_ids_v3)
        .prefetch_related("tareas", "guias_salida", "cotizaciones", "ordenes_compra")
    )

    # Cotizaciones relacionadas a report en resumen
    cotizaciones_ids = set()
    for orden in ordenes:
        cotizaciones_ids.update(orden.cotizaciones.values_list("id", flat=True))

    cotizaciones_relacionadas = []
    if cotizaciones_ids:
        cotizaciones_relacionadas = [
            {
                "id": c.id,
                "numero_cotizacion": c.numero_cotizacion,
                "nombre": c.nombre,
                "estado": c.estado,
                "estado_label": c.get_estado_display(),
                "cliente_id": c.cliente_id,
                "cliente_nombre": getattr(c.cliente, "nombre", ""),
                "total_estimado": float(c.total_estimado or 0),
            }
            for c in Cotizacion.objects.filter(id__in=cotizaciones_ids).select_related("cliente")
        ]

    precio_cot_cache = {}

    for orden in ordenes:
        # 1. TareaOTV3 completadas
        for tarea in orden.tareas.filter(estado="completada"):
            count_tareas += 1
            items.append({
                "id": tarea.id,
                "item_id": tarea.id,
                "nombre": tarea.titulo,
                "cantidad": 1,
                "precio_unitario": 0.0,
                "total": 0.0,
                "tipo": "tarea_ot",
                "estado": tarea.estado,
                "ot_id": orden.id,
            })

        # 2. Cotizaciones M2M y sus items
        for cotizacion in orden.cotizaciones.prefetch_related("items"):
            for item_cot in cotizacion.items.all():
                precio_unitario = _precio_unitario_cotizacion_clp(
                    item_cot,
                    float(tasa_dolar_resuelta) if tasa_dolar_resuelta is not None else None,
                    float(tasa_uf_resuelta) if tasa_uf_resuelta is not None else None,
                )
                cantidad = item_cot.cantidad or 1
                total_item = float(cantidad * precio_unitario)
                total_ejecutado_clp += Decimal(str(total_item))

                # Tipo de moneda de la cotización ("1"=USD, "2"=CLP, "3"=UF)
                moneda_cot_codigo = cotizacion.tipo_moneda or "2"
                moneda_cot_label = {"1": "USD", "2": "CLP", "3": "UF"}.get(moneda_cot_codigo, "CLP")

                items.append({
                    "id": f"cot_{cotizacion.id}_item_{item_cot.id}",
                    "item_id": item_cot.id,
                    "nombre": item_cot.nombre or "Item sin nombre",
                    "cantidad": cantidad,
                    "precio_unitario": precio_unitario,
                    "total": total_item,
                    "tipo": "cotizacion",
                    "ot_id": orden.id,
                    "cotizacion_id": cotizacion.id,
                    # Metadata de conversión para trazabilidad
                    "moneda_cotizacion": moneda_cot_label,
                    "precio_unitario_original": float(item_cot.precio_venta_neta_unitario_moneda_base or 0),
                })

        # 3. GuiasSalida M2M y sus items
        for guia in orden.guias_salida.prefetch_related("itemsguiasalida_set__stock_item__item"):
            tiene_items_facturables = False
            for item_guia in guia.itemsguiasalida_set.all():
                cantidad_entregada = max(
                    (item_guia.cantidad_rebajada or 0) - (item_guia.cantidad_devuelta or 0),
                    0,
                )
                if cantidad_entregada <= 0:
                    continue
                tiene_items_facturables = True

                nombre_item = "Item sin nombre"
                try:
                    if item_guia.stock_item and item_guia.stock_item.item:
                        nombre_item = item_guia.stock_item.item.nombre or f"Item #{item_guia.stock_item.item.id}"
                except (AttributeError, ValueError) as exc:
                    nombre_item = f"Guia #{guia.id} - Item #{item_guia.id}"
                    logger.error("Error extrayendo nombre item_guia %s: %s", item_guia.id, exc)

                precio_unitario = 0.0
                if item_guia.source_item_id:
                    oc = item_guia.source_item.orden_compra
                    cotizacion_id = getattr(oc, "relacion_cotizacion_id", None)
                    item_empresa_id = item_guia.source_item.item_id
                    cache_key = (cotizacion_id, item_empresa_id, str(fecha_prefactura or ""))
                    if cotizacion_id and item_empresa_id:
                        if cache_key not in precio_cot_cache:
                            item_cot = (
                                ItemCotizacion.objects
                                .filter(cotizacion_id=cotizacion_id, item_empresa_id=item_empresa_id)
                                .select_related("cotizacion", "proveedor_empresa")
                                .first()
                            )
                            precio_cot_cache[cache_key] = (
                                _precio_unitario_cotizacion_clp(
                                    item_cot,
                                    float(tasa_dolar_resuelta) if tasa_dolar_resuelta is not None else None,
                                    float(tasa_uf_resuelta) if tasa_uf_resuelta is not None else None,
                                )
                                if item_cot else 0.0
                            )
                        precio_unitario = precio_cot_cache.get(cache_key, 0.0)

                    if precio_unitario == 0.0:
                        precio_unitario = float(item_guia.source_item.precio or 0)

                total_item = float(cantidad_entregada * precio_unitario)
                total_ejecutado_clp += Decimal(str(total_item))

                items.append({
                    "id": item_guia.id,
                    "item_id": item_guia.id,
                    "nombre": nombre_item,
                    "cantidad": cantidad_entregada,
                    "precio_unitario": precio_unitario,
                    "total": total_item,
                    "tipo": "guia_salida",
                    "estado": guia.estado,
                    "ot_id": orden.id,
                    "guia_id": guia.id,
                })

            if tiene_items_facturables:
                count_guias += 1

        # 4. OrdenesCompra M2M directas (items de compra)
        for oc in orden.ordenes_compra.prefetch_related("itemenordencompra_set__item"):
            for item_compra in oc.itemenordencompra_set.all():
                cantidad = item_compra.cantidad or 0
                precio_uc = float(item_compra.precio or 0)
                monto_item = float(cantidad * precio_uc)
                if monto_item <= 0:
                    continue

                nombre_item = (
                    item_compra.item.nombre if item_compra.item else f"Item #{item_compra.id}"
                )
                total_ejecutado_clp += Decimal(str(monto_item))
                count_compras += 1

                items.append({
                    "id": f"oc_{oc.id}_item_{item_compra.id}",
                    "item_id": item_compra.id,
                    "nombre": nombre_item,
                    "cantidad": cantidad,
                    "precio_unitario": precio_uc,
                    "total": monto_item,
                    "tipo": "compra",
                    "ot_id": orden.id,
                    "oc_id": oc.id,
                })

        # 5. GastoOTV3 (gastos operativos directos de la OT)
        for gasto in GastoOTV3.objects.filter(orden=orden):
            monto = float(gasto.monto_total or 0)
            if monto <= 0:
                continue

            nombre_gasto = gasto.detalle or f"Gasto #{gasto.id}"
            total_ejecutado_clp += Decimal(str(monto))
            count_gastos += 1

            items.append({
                "id": f"gasto_{gasto.id}",
                "item_id": gasto.id,
                "nombre": f"Gasto - {nombre_gasto}",
                "cantidad": gasto.cantidad,
                "precio_unitario": float(gasto.monto_unitario or 0),
                "total": monto,
                "tipo": "gasto_operativo",
                "ot_id": orden.id,
            })

    items_normalizados = []
    for item in items:
        precio_unitario_obj = convertir_monto_desde_clp(
            _to_decimal(item.get("precio_unitario")),
            moneda_objetivo,
            tasa_dolar=tasa_dolar_resuelta,
            tasa_uf=tasa_uf_resuelta,
        )
        total_obj = convertir_monto_desde_clp(
            _to_decimal(item.get("total")),
            moneda_objetivo,
            tasa_dolar=tasa_dolar_resuelta,
            tasa_uf=tasa_uf_resuelta,
        )
        items_normalizados.append({
            **item,
            "precio_unitario": float(precio_unitario_obj),
            "total": float(total_obj),
            "moneda": moneda_objetivo,
        })

    total_ejecutado = convertir_monto_desde_clp(
        total_ejecutado_clp,
        moneda_objetivo,
        tasa_dolar=tasa_dolar_resuelta,
        tasa_uf=tasa_uf_resuelta,
    )

    return {
        "items": items_normalizados,
        "total": float(total_ejecutado),
        "moneda": moneda_objetivo,
        "resumen": {
            "tareas": count_tareas,
            "guias": count_guias,
            "compras": count_compras,
            "gastos": count_gastos,
        },
        "cotizaciones": cotizaciones_relacionadas,
    }


def resolver_ots_marcadas_visitas(ots_v3):
    """
    Retorna lista de IDs de OTs que deben marcar visita por defecto
    (tipo_servicio == 'soporte_tecnico_presencial').
    """
    from ordentrabajov3.estados_modelo import TIPO_SERVICIO_SOPORTE_PRESENCIAL
    return list(
        ots_v3
        .filter(tipo_servicio=TIPO_SERVICIO_SOPORTE_PRESENCIAL)
        .values_list("id", flat=True)
    )


def _build_visitas_v3(contratos, ots_v3, fecha_prefactura):
    """
    Calcula resumen de visitas para la prefactura V3.

    Para cada contrato calcula:
    - incluidas_mes: visitas mensuales incluidas segun items_comerciales
    - confirmadas_mes: visitas ya marcadas en prefacturas activas del mes
    - ots_marcadas_por_defecto: OTs presenciales incluidas en ots_v3

    Args:
        contratos: QuerySet de ContratoEmpresaCliente
        ots_v3: QuerySet de OrdenDeTrabajoV3
        fecha_prefactura: date

    Returns:
        dict con resumen de visitas por contrato y totales
    """
    from ordentrabajov3.models import PrefacturaOTV3

    periodo = fecha_prefactura.strftime("%Y-%m")
    ots_marcadas_por_defecto = list(resolver_ots_marcadas_visitas(ots_v3))

    resumen_por_contrato = []
    total_incluidas = 0
    total_confirmadas = 0

    for contrato in contratos:
        incluidas_mes = sum(
            _resolve_visitas_mensuales_item(item)
            for item in contrato.items_comerciales.all()
        )

        # Contar visitas ya marcadas en prefacturas activas del mismo mes para este contrato
        prefacturas_mes = PrefacturaOTV3.objects.filter(
            estado_cierre__in=["por_facturar", "facturado"],
            fecha_prefactura__year=fecha_prefactura.year,
            fecha_prefactura__month=fecha_prefactura.month,
            contratos=contrato,
        ).only("resultado")

        confirmadas_mes = 0
        for pf in prefacturas_mes:
            visitas = (pf.resultado or {}).get("visitas") or {}
            try:
                confirmadas_mes += int(visitas.get("marcadas_prefactura") or 0)
            except (TypeError, ValueError):
                continue

        total_incluidas += incluidas_mes
        total_confirmadas += confirmadas_mes

        resumen_por_contrato.append({
            "contrato_id": contrato.id,
            "contrato_nombre": str(contrato),
            "incluidas_mes": incluidas_mes,
            "confirmadas_mes": confirmadas_mes,
        })

    marcadas_esta_prefactura = len(ots_marcadas_por_defecto)
    exceso = max(total_confirmadas + marcadas_esta_prefactura - total_incluidas, 0)

    precio_exceso = 0.0
    if contratos:
        primer_contrato = list(contratos)[0]
        precio_exceso = float(
            getattr(primer_contrato, "precio_visita_adicional", 0) or 0
        )

    return {
        "periodo": periodo,
        "incluidas_mes": total_incluidas,
        "incluidas_total": total_incluidas,
        "confirmadas_mes": total_confirmadas,
        "ots_marcadas_por_defecto": ots_marcadas_por_defecto,
        "marcadas_esta_prefactura": marcadas_esta_prefactura,
        "exceso": exceso,
        "precio_unitario_exceso": precio_exceso,
        "total_exceso": float(exceso * precio_exceso),
        "por_contrato": resumen_por_contrato,
    }
