"""
Funciones para el módulo de Ordenes de Trabajo (Cierres Administrativos/Facturación)
"""

import base64
import io
import os
from datetime import datetime
from decimal import Decimal
from textwrap import wrap

from core.pdf.canvas_utils import (
    draw_encabezado,
    draw_footer,
    draw_paginacion,
    draw_titulo,
)
from core.pdf.components import LOGO_PATH
from core.pdf.styles import BRAND_BLUE, CELL_STYLE, FONTS, LIGHT_GRAY
from core.pdf.utils import format_currency
from django.conf import settings
from django.db import transaction
from django.db.models import Count, Q, Sum
from django.utils import timezone
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph, Table, TableStyle


def _obtener_cache_asignacion(usuario_asignado):
    cache = usuario_asignado.cache_asignacion or {}
    cache_data = cache.get("cache") or {}
    seleccion = cache_data.get("seleccion") or {}
    movimientos = cache_data.get("movimientos") or []
    if not movimientos:
        raise ValueError("No hay movimientos pendientes.")
    original = cache.get("original") or {
        "usuario_equipo_id": usuario_asignado.usuario_equipo_id,
        "equipo_id": getattr(usuario_asignado.usuario_equipo, "equipo_id", None),
        "numero_serie": getattr(
            getattr(usuario_asignado.usuario_equipo, "equipo", None),
            "numero_serie",
            None,
        ),
    }
    return cache, seleccion, movimientos, original


def _es_misma_firma_usuario(item, entry):
    if item.get("tipo") == entry.get("tipo") and item.get("objeto_id") == entry.get(
        "objeto_id"
    ):
        return True
    # Compatibilidad con registros legacy
    if entry.get("tipo") == "asignacion_equipo":
        return item.get("usuario_asignado_id") == entry.get("objeto_id")
    return False


def _registrar_firma_asignacion_en_ot(orden, entry):
    from ordentrabajov2.models import OrdenDeTrabajo

    with transaction.atomic():
        orden_db = OrdenDeTrabajo.objects.select_for_update().get(pk=orden.pk)
        firmas_ot = orden_db.firmas_ot or {}
        firmas_ot.setdefault("firmas_usuarios", [])

        actualizado = False
        for idx, item in enumerate(firmas_ot["firmas_usuarios"]):
            if _es_misma_firma_usuario(item, entry):
                firmas_ot["firmas_usuarios"][idx] = entry
                actualizado = True
                break
        if not actualizado:
            firmas_ot["firmas_usuarios"].append(entry)

        orden_db.firmas_ot = firmas_ot
        orden_db.save(update_fields=["firmas_ot"])


def _construir_entry_firma(
    *,
    usuario_asignado,
    firma,
    usuario_empresa,
    seleccion,
    movimientos,
    original,
    equipo_id_resultante=None,
    usuario_equipo_id_resultante=None,
    item_guia_id=None,
    aplicada=True,
    fecha=None,
):
    return {
        "tipo": "asignacion_equipo",
        "objeto_id": usuario_asignado.id,
        "responsable_id": usuario_empresa.id,
        "firma": firma,
        "fecha": fecha or timezone.now().isoformat(),
    }


def _construir_historial_entry(
    *,
    usuario_asignado,
    original,
    seleccion,
    movimientos,
    equipo_id_resultante=None,
    usuario_equipo_id_resultante=None,
    item_guia_id=None,
    usuario_ejecutor=None,
):
    soporte = usuario_asignado.soporte_tecnico
    return {
        "fecha": timezone.now().isoformat(),
        "original": original,
        "seleccion": seleccion,
        "movimientos": movimientos,
        "equipo_id_resultante": equipo_id_resultante,
        "usuario_equipo_id_resultante": usuario_equipo_id_resultante,
        "item_guia_id": item_guia_id,
        "soporte_id": soporte.id,
        "tecnico_id": soporte.tecnico_asignado_id,
        "usuario_ejecutor_id": getattr(usuario_ejecutor, "id", None),
    }


def _aplicar_historial_cache(usuario_asignado, *, original, historial_entry):
    cache_actual = usuario_asignado.cache_asignacion or {}
    historial = cache_actual.get("historial")
    if not isinstance(historial, list):
        historial = []
    nuevo_cache = {"original": original, "historial": historial + [historial_entry]}
    usuario_asignado.cache_asignacion = nuevo_cache


def _normalizar_ids(ids) -> list[int]:
    if ids is None:
        return []
    if isinstance(ids, (list, tuple, set)):
        normalizados = []
        for raw_id in ids:
            if raw_id is None:
                continue
            try:
                normalizados.append(int(raw_id))
            except (TypeError, ValueError) as exc:
                raise ValueError("Los IDs deben ser numéricos.") from exc
        return list(dict.fromkeys(normalizados))
    try:
        return [int(ids)]
    except (TypeError, ValueError) as exc:
        raise ValueError("Los IDs deben ser numéricos.") from exc


def _validar_ot_pendiente(orden) -> None:
    if orden.estado != "pendiente":
        raise ValueError(
            "Solo se puede vincular cotizaciones o guías cuando la OT está en estado pendiente."
        )


def _obtener_cotizaciones_por_guias(guias_ids: list[int]) -> dict[int, set[int]]:
    from bodegas.models import ItemsGuiaSalida

    if not guias_ids:
        return {}

    mapping: dict[int, set[int]] = {}
    rows = ItemsGuiaSalida.objects.filter(
        guia_id__in=guias_ids,
        source_item__isnull=False,
        source_item__orden_compra__relacion_cotizacion__isnull=False,
    ).values_list("guia_id", "source_item__orden_compra__relacion_cotizacion_id")
    for guia_id, cotizacion_id in rows:
        if not cotizacion_id:
            continue
        mapping.setdefault(int(guia_id), set()).add(int(cotizacion_id))
    return mapping


def obtener_cotizaciones_elegibles_para_ot(orden):
    """
    Retorna cotizaciones aceptadas del mismo cliente que:
    - Tienen al menos una OC asociada.
    - Todas las OCs están en estado recepcionado (4/5/6).
    - No están vinculadas a otra OT (M2M o guías).
    """
    from bodegas.models import (
        ItemEnOrdenCompra,
        ItemOrdenCompraEnStock,
        ItemsGuiaSalida,
        MovimientoStock,
        OrdenCompra,
    )
    from cotizaciones.models import Cotizacion, ItemCotizacion
    from django.contrib.contenttypes.models import ContentType

    _validar_ot_pendiente(orden)

    cotizaciones = list(
        Cotizacion.objects.filter(cliente=orden.cliente, estado="aceptada")
    )
    if not cotizaciones:
        return [], {}

    cot_ids = [c.id for c in cotizaciones]
    ocs = list(
        OrdenCompra.objects.filter(relacion_cotizacion_id__in=cot_ids).select_related(
            "relacion_cotizacion"
        )
    )
    if not ocs:
        return [], {}

    ocs_por_cotizacion: dict[int, list] = {}
    for oc in ocs:
        if not oc.relacion_cotizacion_id:
            continue
        ocs_por_cotizacion.setdefault(oc.relacion_cotizacion_id, []).append(oc)

    estados_validos = {"4", "5", "6"}
    elegibles_ids = []
    for cotizacion in cotizaciones:
        cot_ocs = ocs_por_cotizacion.get(cotizacion.id, [])
        if not cot_ocs:
            continue
        if any(oc.estado not in estados_validos for oc in cot_ocs):
            continue
        elegibles_ids.append(cotizacion.id)

    if not elegibles_ids:
        return [], {}

    excluidas_ids = set(
        Cotizacion.objects.filter(ordenes_trabajo_v2__isnull=False)
        .exclude(ordenes_trabajo_v2=orden)
        .values_list("id", flat=True)
    )

    cotizaciones_en_ot = set(orden.cotizaciones.values_list("id", flat=True))
    cotizaciones_en_ot &= set(elegibles_ids)
    if cotizaciones_en_ot:
        cotizaciones_con_guias_faltantes = set(
            ItemsGuiaSalida.objects.filter(
                source_item__orden_compra__relacion_cotizacion_id__in=cotizaciones_en_ot,
                guia__orden_trabajo__isnull=True,
            ).values_list(
                "source_item__orden_compra__relacion_cotizacion_id",
                flat=True,
            )
        )
        for cot_id in cotizaciones_en_ot:
            if cot_id not in cotizaciones_con_guias_faltantes:
                excluidas_ids.add(cot_id)

    relaciones_guias = ItemsGuiaSalida.objects.filter(
        source_item__orden_compra__relacion_cotizacion_id__in=elegibles_ids,
        guia__orden_trabajo__isnull=False,
    ).values_list(
        "source_item__orden_compra__relacion_cotizacion_id",
        "guia__orden_trabajo_id",
    )
    for cot_id, ot_id in relaciones_guias:
        if ot_id != orden.id:
            excluidas_ids.add(cot_id)

    elegibles_ids = [cid for cid in elegibles_ids if cid not in excluidas_ids]
    if not elegibles_ids:
        return [], {}

    resumen = {}
    resumen_ocs = (
        OrdenCompra.objects.filter(relacion_cotizacion_id__in=elegibles_ids)
        .values("relacion_cotizacion_id")
        .annotate(
            oc_count=Count("id"),
            oc_recibidas_count=Count("id", filter=Q(estado__in=estados_validos)),
        )
    )
    resumen_ocs_map = {row["relacion_cotizacion_id"]: row for row in resumen_ocs}

    resumen_guias = (
        ItemsGuiaSalida.objects.filter(
            source_item__orden_compra__relacion_cotizacion_id__in=elegibles_ids
        )
        .values("source_item__orden_compra__relacion_cotizacion_id")
        .annotate(guias_count=Count("guia_id", distinct=True))
    )
    resumen_guias_map = {
        row["source_item__orden_compra__relacion_cotizacion_id"]: row["guias_count"]
        for row in resumen_guias
    }

    pedido_rows = (
        ItemCotizacion.objects.filter(cotizacion_id__in=elegibles_ids)
        .values("cotizacion_id")
        .annotate(total_pedido=Sum("cantidad"))
    )
    pedido_map = {row["cotizacion_id"]: row["total_pedido"] or 0 for row in pedido_rows}

    total_recibido_map = {cid: 0 for cid in elegibles_ids}
    item_oc_rows = ItemEnOrdenCompra.objects.filter(
        orden_compra__relacion_cotizacion_id__in=elegibles_ids
    ).values("id", "orden_compra__relacion_cotizacion_id")
    item_oc_ids = [row["id"] for row in item_oc_rows]
    item_oc_to_cot = {
        row["id"]: row["orden_compra__relacion_cotizacion_id"] for row in item_oc_rows
    }

    if item_oc_ids:
        ct_item_oc = ContentType.objects.get_for_model(ItemEnOrdenCompra)
        oc_stock_rows = ItemOrdenCompraEnStock.objects.filter(
            content_type=ct_item_oc,
            item_oc_id__in=item_oc_ids,
        ).values("id", "item_oc_id")
        oc_stock_to_cot = {
            row["id"]: item_oc_to_cot.get(row["item_oc_id"]) for row in oc_stock_rows
        }
        oc_stock_ids = list(oc_stock_to_cot.keys())
        if oc_stock_ids:
            ct_oc_stock = ContentType.objects.get_for_model(ItemOrdenCompraEnStock)
            movs = (
                MovimientoStock.objects.filter(
                    content_type=ct_oc_stock,
                    object_id__in=oc_stock_ids,
                    tipo_movimiento="ENTRADA",
                )
                .values("object_id")
                .annotate(total=Sum("cantidad"))
            )
            for row in movs:
                cot_id = oc_stock_to_cot.get(row["object_id"])
                if cot_id:
                    total_recibido_map[cot_id] = total_recibido_map.get(cot_id, 0) + (
                        row["total"] or 0
                    )

    for cotizacion in cotizaciones:
        if cotizacion.id not in elegibles_ids:
            continue
        oc_row = resumen_ocs_map.get(cotizacion.id, {})
        resumen[cotizacion.id] = {
            "oc_count": oc_row.get("oc_count", 0),
            "oc_recibidas_count": oc_row.get("oc_recibidas_count", 0),
            "guias_count": resumen_guias_map.get(cotizacion.id, 0),
            "total_pedido": pedido_map.get(cotizacion.id, 0),
            "total_recibido": total_recibido_map.get(cotizacion.id, 0),
        }

    return [c for c in cotizaciones if c.id in elegibles_ids], resumen


def vincular_cotizaciones_generar_guias(orden, cotizaciones_ids, usuario=None):
    """
    Vincula cotizaciones a una OT y genera guías de salida automáticamente
    con los items recepcionados (agrupadas por bodega).
    """
    from bodegas.functions import (
        add_oc_items_to_guia,
        obtener_guia_pendiente_por_cotizacion,
    )
    from bodegas.models import (
        GuiaSalida,
        ItemEnOrdenCompra,
        ItemOrdenCompraEnStock,
        ItemsGuiaSalida,
        MovimientoStock,
        OrdenCompra,
    )
    from cotizaciones.models import Cotizacion
    from django.contrib.contenttypes.models import ContentType

    _validar_ot_pendiente(orden)
    cotizaciones_ids = _normalizar_ids(cotizaciones_ids)
    if not cotizaciones_ids:
        raise ValueError("Debes enviar al menos una cotización.")

    cotizaciones = list(
        Cotizacion.objects.filter(id__in=cotizaciones_ids).select_related("cliente")
    )
    encontrados = {c.id for c in cotizaciones}
    faltantes = [cid for cid in cotizaciones_ids if cid not in encontrados]
    if faltantes:
        raise ValueError(
            f"Cotizaciones no encontradas: {', '.join(map(str, faltantes))}."
        )

    for cotizacion in cotizaciones:
        if cotizacion.estado != "aceptada":
            raise ValueError(
                f"La cotización #{cotizacion.numero_cotizacion} no está aceptada."
            )
        if cotizacion.cliente_id != orden.cliente_id:
            raise ValueError(
                f"La cotización #{cotizacion.numero_cotizacion} no pertenece al cliente de la OT."
            )

    ocs = list(
        OrdenCompra.objects.filter(relacion_cotizacion__in=cotizaciones).select_related(
            "relacion_cotizacion", "creado_por"
        )
    )
    if not ocs:
        raise ValueError("Las cotizaciones seleccionadas no tienen órdenes de compra.")

    ocs_por_cotizacion: dict[int, list[OrdenCompra]] = {}
    for oc in ocs:
        if not oc.relacion_cotizacion_id:
            continue
        ocs_por_cotizacion.setdefault(oc.relacion_cotizacion_id, []).append(oc)

    estados_validos = {"4", "5", "6"}
    for cotizacion in cotizaciones:
        cot_ocs = ocs_por_cotizacion.get(cotizacion.id, [])
        if not cot_ocs:
            raise ValueError(
                f"La cotización #{cotizacion.numero_cotizacion} no tiene OC asociadas."
            )
        if any(oc.estado not in estados_validos for oc in cot_ocs):
            raise ValueError(
                f"La cotización #{cotizacion.numero_cotizacion} tiene OCs sin recepción completa."
            )

    item_oc_qs = ItemEnOrdenCompra.objects.filter(orden_compra__in=ocs).select_related(
        "orden_compra", "item"
    )
    item_oc_ids = [item.id for item in item_oc_qs]
    if not item_oc_ids:
        raise ValueError("No hay items asociados en las OCs seleccionadas.")

    content_type_item_oc = ContentType.objects.get_for_model(ItemEnOrdenCompra)
    content_type_oc_stock = ContentType.objects.get_for_model(ItemOrdenCompraEnStock)

    oc_stock_qs = ItemOrdenCompraEnStock.objects.filter(
        content_type=content_type_item_oc, item_oc_id__in=item_oc_ids
    ).select_related("stock_item__bodega", "bodega_temporal")
    oc_stock_map = {oc_stock.item_oc_id: oc_stock for oc_stock in oc_stock_qs}
    if len(oc_stock_map) < len(item_oc_ids):
        faltantes_stock = [
            str(item_id) for item_id in item_oc_ids if item_id not in oc_stock_map
        ]
        raise ValueError(
            "Faltan registros de recepción para items OC: " + ", ".join(faltantes_stock)
        )

    movs = (
        MovimientoStock.objects.filter(
            content_type=content_type_oc_stock,
            object_id__in=[oc_stock.id for oc_stock in oc_stock_qs],
            tipo_movimiento="ENTRADA",
        )
        .values("object_id")
        .annotate(total=Sum("cantidad"))
    )
    recibidos_por_stock = {row["object_id"]: row["total"] or 0 for row in movs}
    recibidos_por_item_oc = {
        item_oc_id: recibidos_por_stock.get(oc_stock.id, 0)
        for item_oc_id, oc_stock in oc_stock_map.items()
    }

    rebajados = (
        ItemsGuiaSalida.objects.filter(source_item_id__in=item_oc_ids)
        .values("source_item_id")
        .annotate(total=Sum("cantidad_rebajada"))
    )
    rebajados_por_item = {row["source_item_id"]: row["total"] or 0 for row in rebajados}

    guias_creadas: list[int] = []
    guias_vinculadas: set[int] = set()

    item_oc_por_oc: dict[int, list[ItemEnOrdenCompra]] = {}
    for item_oc in item_oc_qs:
        item_oc_por_oc.setdefault(item_oc.orden_compra_id, []).append(item_oc)

    with transaction.atomic():
        for cotizacion in cotizaciones:
            orden.cotizaciones.add(cotizacion)

            cot_ocs = ocs_por_cotizacion.get(cotizacion.id, [])
            mapa_bodegas: dict[int, dict[int, dict[int, int]]] = {}
            bodegas_lookup = {}
            creador_por_bodega: dict[int, object] = {}
            total_pendiente = 0

            for oc in cot_ocs:
                for item_oc in item_oc_por_oc.get(oc.id, []):
                    recibida = max(recibidos_por_item_oc.get(item_oc.id, 0), 0)
                    rebajada = max(rebajados_por_item.get(item_oc.id, 0), 0)
                    pendiente = max(recibida - rebajada, 0)
                    if pendiente <= 0:
                        continue

                    oc_stock = oc_stock_map[item_oc.id]
                    bodega = (
                        getattr(oc_stock.stock_item, "bodega", None)
                        or oc_stock.bodega_temporal
                    )
                    if not bodega:
                        raise ValueError(
                            f"El item OC #{item_oc.id} no tiene bodega asociada."
                        )

                    total_pendiente += pendiente
                    bodegas_lookup[bodega.id] = bodega
                    creador_por_bodega.setdefault(bodega.id, oc.creado_por or usuario)
                    mapa_bodegas.setdefault(bodega.id, {}).setdefault(oc.id, {})[
                        item_oc.id
                    ] = pendiente

            guias_existentes = (
                GuiaSalida.objects.filter(
                    itemsguiasalida__source_item__orden_compra__relacion_cotizacion=cotizacion
                )
                .distinct()
                .select_related("cliente")
            )

            if total_pendiente <= 0 and not guias_existentes:
                raise ValueError(
                    f"La cotización #{cotizacion.numero_cotizacion} no tiene items recepcionados pendientes de guía."
                )

            for bodega_id, oc_map in mapa_bodegas.items():
                bodega = bodegas_lookup[bodega_id]
                guia = obtener_guia_pendiente_por_cotizacion(
                    cotizacion, bodega, cotizacion.cliente
                )
                if not guia:
                    motivo = (
                        cotizacion.descripcion
                        or f"Cotización #{cotizacion.numero_cotizacion}"
                    )
                    guia = GuiaSalida.objects.create(
                        bodega=bodega,
                        cliente=orden.cliente,
                        creado_por=creador_por_bodega.get(bodega_id) or usuario,
                        recibido_por=orden.tecnico_responsable_ot,
                        entregado_a=orden.tecnico_responsable_ot,
                        motivo=motivo,
                        estado="P",
                    )
                    guias_creadas.append(guia.id)

                for oc_id, cantidades_map in oc_map.items():
                    oc = next((o for o in cot_ocs if o.id == oc_id), None)
                    if not oc:
                        continue
                    add_oc_items_to_guia(
                        guia,
                        oc,
                        usuario=usuario,
                        cantidades_map=cantidades_map,
                    )

                if guia.orden_trabajo_id and guia.orden_trabajo_id != orden.id:
                    raise ValueError(f"La guía #{guia.id} está vinculada a otra OT.")
                if guia.orden_trabajo_id != orden.id:
                    guia.orden_trabajo = orden
                    guia.save(update_fields=["orden_trabajo"])
                guias_vinculadas.add(guia.id)

            for guia in guias_existentes:
                if guia.orden_trabajo_id and guia.orden_trabajo_id != orden.id:
                    raise ValueError(f"La guía #{guia.id} está vinculada a otra OT.")
                if guia.cliente_id and guia.cliente_id != orden.cliente_id:
                    raise ValueError(
                        f"La guía #{guia.id} no pertenece al cliente de la OT."
                    )
                if guia.orden_trabajo_id != orden.id:
                    guia.orden_trabajo = orden
                    guia.save(update_fields=["orden_trabajo"])
                guias_vinculadas.add(guia.id)
    return {
        "cotizaciones_vinculadas": list({c.id for c in cotizaciones}),
        "guias_vinculadas": sorted(guias_vinculadas),
        "guias_creadas": guias_creadas,
    }


def vincular_guias_a_ot(orden, guias_ids):
    """
    Vincula guías directamente a una OT y auto-vincula cotizaciones por trazabilidad.
    """
    from bodegas.models import GuiaSalida
    from cotizaciones.models import Cotizacion

    _validar_ot_pendiente(orden)
    guias_ids = _normalizar_ids(guias_ids)
    if not guias_ids:
        raise ValueError("Debes enviar al menos una guía.")

    guias = list(GuiaSalida.objects.filter(id__in=guias_ids).select_related("cliente"))
    encontrados = {guia.id for guia in guias}
    faltantes = [gid for gid in guias_ids if gid not in encontrados]
    if faltantes:
        raise ValueError(f"Guías no encontradas: {', '.join(map(str, faltantes))}.")

    for guia in guias:
        if guia.estado not in ("ER", "FR"):
            raise ValueError(
                f"La guía #{guia.id} debe estar en estado 'Espera firma tecnico' o 'Firmada por tecnico'."
            )
        if guia.orden_trabajo_id and guia.orden_trabajo_id != orden.id:
            raise ValueError(f"La guía #{guia.id} está vinculada a otra OT.")
        if guia.cliente_id and guia.cliente_id != orden.cliente_id:
            raise ValueError(f"La guía #{guia.id} no pertenece al mismo cliente.")

    cotizaciones_por_guia = _obtener_cotizaciones_por_guias(guias_ids)
    cotizaciones_ids: set[int] = set()
    for guia_id, cot_ids in cotizaciones_por_guia.items():
        if len(cot_ids) > 1:
            raise ValueError(
                f"La guía #{guia_id} tiene items de múltiples cotizaciones."
            )
        if cot_ids:
            cotizaciones_ids.update(cot_ids)

    cotizaciones = []
    if cotizaciones_ids:
        cotizaciones = list(
            Cotizacion.objects.filter(id__in=cotizaciones_ids).select_related("cliente")
        )
        encontrados_cot = {c.id for c in cotizaciones}
        faltantes_cot = [cid for cid in cotizaciones_ids if cid not in encontrados_cot]
        if faltantes_cot:
            raise ValueError(
                f"Cotizaciones no encontradas: {', '.join(map(str, faltantes_cot))}."
            )
        for cotizacion in cotizaciones:
            if cotizacion.estado != "aceptada":
                raise ValueError(
                    f"La cotización #{cotizacion.numero_cotizacion} no está aceptada."
                )
            if cotizacion.cliente_id != orden.cliente_id:
                raise ValueError(
                    f"La cotización #{cotizacion.numero_cotizacion} no pertenece al cliente de la OT."
                )

    cotizaciones_previas = set(orden.cotizaciones.values_list("id", flat=True))
    guias_previas = set(
        GuiaSalida.objects.filter(orden_trabajo=orden).values_list("id", flat=True)
    )

    with transaction.atomic():
        for guia in guias:
            if guia.orden_trabajo_id != orden.id:
                guia.orden_trabajo = orden
                guia.save(update_fields=["orden_trabajo"])
        if cotizaciones:
            orden.cotizaciones.add(*cotizaciones)

    nuevas_guias = [g.id for g in guias if g.id not in guias_previas]
    nuevas_cotizaciones = [
        c.id for c in cotizaciones if c.id not in cotizaciones_previas
    ]
    return {
        "guias_vinculadas": nuevas_guias,
        "cotizaciones_vinculadas": nuevas_cotizaciones,
    }


def vincular_cotizaciones_a_ot(orden, cotizaciones_ids):
    """
    Vincula cotizaciones a una OT y auto-vincula guías relacionadas.
    """
    from bodegas.models import GuiaSalida, ItemsGuiaSalida
    from cotizaciones.models import Cotizacion

    _validar_ot_pendiente(orden)
    cotizaciones_ids = _normalizar_ids(cotizaciones_ids)
    if not cotizaciones_ids:
        raise ValueError("Debes enviar al menos una cotización.")

    cotizaciones = list(
        Cotizacion.objects.filter(id__in=cotizaciones_ids).select_related("cliente")
    )
    encontrados = {c.id for c in cotizaciones}
    faltantes = [cid for cid in cotizaciones_ids if cid not in encontrados]
    if faltantes:
        raise ValueError(
            f"Cotizaciones no encontradas: {', '.join(map(str, faltantes))}."
        )
    for cotizacion in cotizaciones:
        if cotizacion.estado != "aceptada":
            raise ValueError(
                f"La cotización #{cotizacion.numero_cotizacion} no está aceptada."
            )
        if cotizacion.cliente_id != orden.cliente_id:
            raise ValueError(
                f"La cotización #{cotizacion.numero_cotizacion} no pertenece al cliente de la OT."
            )

    guias_ids = list(
        ItemsGuiaSalida.objects.filter(
            source_item__orden_compra__relacion_cotizacion_id__in=cotizaciones_ids
        )
        .values_list("guia_id", flat=True)
        .distinct()
    )

    guias = list(
        GuiaSalida.objects.filter(
            id__in=guias_ids, estado__in=["ER", "FR"]
        ).select_related("cliente")
    )
    for guia in guias:
        if guia.orden_trabajo_id and guia.orden_trabajo_id != orden.id:
            raise ValueError(f"La guía #{guia.id} está vinculada a otra OT.")
        if guia.cliente_id and guia.cliente_id != orden.cliente_id:
            raise ValueError(f"La guía #{guia.id} no pertenece al mismo cliente.")

    cotizaciones_previas = set(orden.cotizaciones.values_list("id", flat=True))
    guias_previas = set(
        GuiaSalida.objects.filter(orden_trabajo=orden).values_list("id", flat=True)
    )

    with transaction.atomic():
        orden.cotizaciones.add(*cotizaciones)
        for guia in guias:
            if guia.orden_trabajo_id != orden.id:
                guia.orden_trabajo = orden
                guia.save(update_fields=["orden_trabajo"])

    nuevas_cotizaciones = [
        c.id for c in cotizaciones if c.id not in cotizaciones_previas
    ]
    nuevas_guias = [g.id for g in guias if g.id not in guias_previas]
    return {
        "cotizaciones_vinculadas": nuevas_cotizaciones,
        "guias_vinculadas": nuevas_guias,
    }


def aplicar_cache_asignacion_usuario(usuario_asignado, *, firma, usuario_ejecutor=None):
    """
    Aplica el cache de asignacion de un UsuarioAsignadoSoporte al modelo UsuarioEquipo.
    Crea/actualiza equipos, marca el trabajo como resuelto y guarda la firma en firmas_ot.
    """
    from bodegas.models import ItemsGuiaSalida
    from empresas.models import UsuarioEmpresa
    from ordentrabajov2.models import OrdenDeTrabajo
    from recursos.models import Equipo, UsuarioEquipo

    if not firma:
        raise ValueError("La firma es requerida.")
    if usuario_asignado.resuelto:
        raise ValueError("Esta asignacion ya fue resuelta.")

    cache, seleccion, movimientos, original = _obtener_cache_asignacion(
        usuario_asignado
    )

    usuario_empresa = usuario_asignado.usuario_empresa or (
        usuario_asignado.usuario_equipo.usuario
        if usuario_asignado.usuario_equipo
        else None
    )
    if not usuario_empresa:
        raise ValueError("No hay usuario asociado para aplicar la asignacion.")

    soporte = usuario_asignado.soporte_tecnico
    orden = soporte.orden

    tipo = seleccion.get("tipo")
    nuevo_equipo = None
    item_guia_id = None

    if tipo == "equipo":
        equipo_id = seleccion.get("equipo_id")
        if not equipo_id:
            raise ValueError("Debe indicar equipo_id.")
        nuevo_equipo = Equipo.objects.get(pk=equipo_id)
    elif tipo == "item_guia":
        item_guia_id = seleccion.get("item_guia_id")
        if not item_guia_id:
            raise ValueError("Debe indicar item_guia_id.")
        item_guia = ItemsGuiaSalida.objects.select_related("guia").get(pk=item_guia_id)
        if (
            not item_guia.guia.orden_trabajo_id
            or item_guia.guia.orden_trabajo_id != orden.id
        ):
            raise ValueError("El item no pertenece a una guia vinculada a esta OT.")
        serie = (item_guia.numero_serie or {}).get("serie")
        if not serie:
            raise ValueError("El item serializado no tiene numero de serie.")

        defaults = {
            "registrado_por": usuario_ejecutor or usuario_empresa,
            "cliente": getattr(item_guia.guia, "cliente", None) or orden.cliente,
            "empresa_propietaria": (
                getattr(getattr(usuario_ejecutor, "sucursal", None), "empresa", None)
                if usuario_ejecutor
                else getattr(
                    getattr(usuario_empresa, "sucursal", None), "empresa", None
                )
            ),
        }
        nuevo_equipo, _ = Equipo.objects.get_or_create(
            numero_serie=serie,
            defaults=defaults,
        )
    elif tipo == "sin_equipo":
        nuevo_equipo = None
    else:
        raise ValueError("Tipo de seleccion invalido.")

    if nuevo_equipo:
        asignado_otro = (
            UsuarioEquipo.objects.filter(equipo=nuevo_equipo, estado=True)
            .exclude(usuario=usuario_empresa)
            .exists()
        )
        if asignado_otro:
            raise ValueError("El equipo ya tiene un usuario asignado.")

    with transaction.atomic():
        actual_usuario_equipo = (
            UsuarioEquipo.objects.select_for_update()
            .filter(usuario=usuario_empresa, estado=True)
            .first()
        )
        if actual_usuario_equipo and (
            nuevo_equipo is None
            or actual_usuario_equipo.equipo_id != getattr(nuevo_equipo, "id", None)
        ):
            actual_usuario_equipo.estado = False
            actual_usuario_equipo.fecha_devolucion = timezone.now().date()
            actual_usuario_equipo.save(update_fields=["estado", "fecha_devolucion"])

        usuario_equipo_nuevo = None
        if nuevo_equipo:
            if (
                actual_usuario_equipo
                and actual_usuario_equipo.equipo_id == nuevo_equipo.id
            ):
                usuario_equipo_nuevo = actual_usuario_equipo
            else:
                usuario_equipo_nuevo = UsuarioEquipo.objects.create(
                    equipo=nuevo_equipo,
                    usuario=usuario_empresa,
                    estado=True,
                )

        usuario_asignado.usuario_equipo = usuario_equipo_nuevo
        usuario_asignado.resuelto = True
        historial_entry = _construir_historial_entry(
            usuario_asignado=usuario_asignado,
            original=original,
            seleccion=seleccion,
            movimientos=movimientos,
            equipo_id_resultante=getattr(nuevo_equipo, "id", None),
            usuario_equipo_id_resultante=getattr(usuario_equipo_nuevo, "id", None),
            item_guia_id=item_guia_id,
            usuario_ejecutor=usuario_ejecutor,
        )
        _aplicar_historial_cache(
            usuario_asignado,
            original=original,
            historial_entry=historial_entry,
        )
        usuario_asignado.save(
            update_fields=["usuario_equipo", "resuelto", "cache_asignacion"]
        )

        entry = _construir_entry_firma(
            usuario_asignado=usuario_asignado,
            firma=firma,
            usuario_empresa=usuario_empresa,
            seleccion=seleccion,
            movimientos=movimientos,
            original=original,
            equipo_id_resultante=getattr(nuevo_equipo, "id", None),
            usuario_equipo_id_resultante=getattr(usuario_equipo_nuevo, "id", None),
            item_guia_id=item_guia_id,
            aplicada=True,
        )
        _registrar_firma_asignacion_en_ot(orden, entry)

    return entry


def guardar_firma_asignacion_pendiente(
    usuario_asignado, *, firma, usuario_ejecutor=None
):
    """
    Guarda una firma pendiente de aplicar para un UsuarioAsignadoSoporte.
    """
    if usuario_asignado.resuelto:
        raise ValueError("Esta asignacion ya fue resuelta.")

    cache, seleccion, movimientos, original = _obtener_cache_asignacion(
        usuario_asignado
    )
    if cache.get("firma_pendiente"):
        raise ValueError("La asignacion ya tiene una firma pendiente.")

    usuario_empresa = usuario_asignado.usuario_empresa or (
        usuario_asignado.usuario_equipo.usuario
        if usuario_asignado.usuario_equipo
        else None
    )
    if not usuario_empresa:
        raise ValueError("No hay usuario asociado para aplicar la asignacion.")

    soporte = usuario_asignado.soporte_tecnico
    orden = soporte.orden

    entry = _construir_entry_firma(
        usuario_asignado=usuario_asignado,
        firma=firma,
        usuario_empresa=usuario_empresa,
        seleccion=seleccion,
        movimientos=movimientos,
        original=original,
        aplicada=False,
    )
    _registrar_firma_asignacion_en_ot(orden, entry)

    firma_pendiente = {
        "firma": firma,
        "fecha": entry["fecha"],
        "responsable_id": usuario_empresa.id,
        "tecnico_id": soporte.tecnico_asignado_id,
        "usuario_ejecutor_id": getattr(usuario_ejecutor, "id", None),
    }
    cache_actualizado = {**cache, "firma_pendiente": firma_pendiente}
    usuario_asignado.cache_asignacion = cache_actualizado
    usuario_asignado.save(update_fields=["cache_asignacion"])

    return entry


def _resolver_equipo_desde_seleccion(
    seleccion, orden, usuario_empresa, usuario_ejecutor=None
):
    from bodegas.models import ItemsGuiaSalida
    from recursos.models import Equipo

    tipo = seleccion.get("tipo")
    item_guia_id = None
    nuevo_equipo = None

    if tipo == "equipo":
        equipo_id = seleccion.get("equipo_id")
        if not equipo_id:
            raise ValueError("Debe indicar equipo_id.")
        nuevo_equipo = Equipo.objects.get(pk=equipo_id)
    elif tipo == "item_guia":
        item_guia_id = seleccion.get("item_guia_id")
        if not item_guia_id:
            raise ValueError("Debe indicar item_guia_id.")
        item_guia = ItemsGuiaSalida.objects.select_related("guia").get(pk=item_guia_id)
        if (
            not item_guia.guia.orden_trabajo_id
            or item_guia.guia.orden_trabajo_id != orden.id
        ):
            raise ValueError("El item no pertenece a una guia vinculada a esta OT.")
        serie = (item_guia.numero_serie or {}).get("serie")
        if not serie:
            raise ValueError("El item serializado no tiene numero de serie.")

        defaults = {
            "registrado_por": usuario_ejecutor or usuario_empresa,
            "cliente": getattr(item_guia.guia, "cliente", None) or orden.cliente,
            "empresa_propietaria": (
                getattr(getattr(usuario_ejecutor, "sucursal", None), "empresa", None)
                if usuario_ejecutor
                else getattr(
                    getattr(usuario_empresa, "sucursal", None), "empresa", None
                )
            ),
        }
        nuevo_equipo, _ = Equipo.objects.get_or_create(
            numero_serie=serie,
            defaults=defaults,
        )
    elif tipo == "sin_equipo":
        nuevo_equipo = None
    else:
        raise ValueError("Tipo de seleccion invalido.")

    return nuevo_equipo, item_guia_id


def aplicar_cache_asignacion_swap(
    usuario_actual,
    usuario_otro,
    *,
    firma_actual,
    firma_otro,
    fecha_firma_otro=None,
    usuario_ejecutor=None,
):
    """
    Aplica dos firmas pendientes en una misma transaccion para permitir swaps de equipos.
    """
    from recursos.models import UsuarioEquipo

    if usuario_actual.resuelto or usuario_otro.resuelto:
        raise ValueError("Una de las asignaciones ya fue resuelta.")

    cache_actual, seleccion_actual, movimientos_actual, original_actual = (
        _obtener_cache_asignacion(usuario_actual)
    )
    cache_otro, seleccion_otro, movimientos_otro, original_otro = (
        _obtener_cache_asignacion(usuario_otro)
    )

    usuario_empresa_actual = usuario_actual.usuario_empresa or (
        usuario_actual.usuario_equipo.usuario if usuario_actual.usuario_equipo else None
    )
    usuario_empresa_otro = usuario_otro.usuario_empresa or (
        usuario_otro.usuario_equipo.usuario if usuario_otro.usuario_equipo else None
    )
    if not usuario_empresa_actual or not usuario_empresa_otro:
        raise ValueError("No hay usuario asociado para aplicar la asignacion.")

    soporte = usuario_actual.soporte_tecnico
    orden = soporte.orden

    nuevo_equipo_actual, item_guia_actual = _resolver_equipo_desde_seleccion(
        seleccion_actual, orden, usuario_empresa_actual, usuario_ejecutor
    )
    nuevo_equipo_otro, item_guia_otro = _resolver_equipo_desde_seleccion(
        seleccion_otro, orden, usuario_empresa_otro, usuario_ejecutor
    )

    with transaction.atomic():
        actual_usuario_equipo = (
            UsuarioEquipo.objects.select_for_update()
            .filter(usuario=usuario_empresa_actual, estado=True)
            .first()
        )
        otro_usuario_equipo = (
            UsuarioEquipo.objects.select_for_update()
            .filter(usuario=usuario_empresa_otro, estado=True)
            .first()
        )

        if actual_usuario_equipo and (
            nuevo_equipo_actual is None
            or actual_usuario_equipo.equipo_id
            != getattr(nuevo_equipo_actual, "id", None)
        ):
            actual_usuario_equipo.estado = False
            actual_usuario_equipo.fecha_devolucion = timezone.now().date()
            actual_usuario_equipo.save(update_fields=["estado", "fecha_devolucion"])

        if otro_usuario_equipo and (
            nuevo_equipo_otro is None
            or otro_usuario_equipo.equipo_id != getattr(nuevo_equipo_otro, "id", None)
        ):
            otro_usuario_equipo.estado = False
            otro_usuario_equipo.fecha_devolucion = timezone.now().date()
            otro_usuario_equipo.save(update_fields=["estado", "fecha_devolucion"])

        if nuevo_equipo_actual and (
            UsuarioEquipo.objects.filter(equipo=nuevo_equipo_actual, estado=True)
            .exclude(usuario__in=[usuario_empresa_actual, usuario_empresa_otro])
            .exists()
        ):
            raise ValueError("El equipo ya tiene un usuario asignado.")

        if nuevo_equipo_otro and (
            UsuarioEquipo.objects.filter(equipo=nuevo_equipo_otro, estado=True)
            .exclude(usuario__in=[usuario_empresa_actual, usuario_empresa_otro])
            .exists()
        ):
            raise ValueError("El equipo ya tiene un usuario asignado.")

        usuario_equipo_nuevo_actual = None
        if nuevo_equipo_actual:
            if (
                actual_usuario_equipo
                and actual_usuario_equipo.equipo_id == nuevo_equipo_actual.id
            ):
                usuario_equipo_nuevo_actual = actual_usuario_equipo
            else:
                usuario_equipo_nuevo_actual = UsuarioEquipo.objects.create(
                    equipo=nuevo_equipo_actual,
                    usuario=usuario_empresa_actual,
                    estado=True,
                )

        usuario_equipo_nuevo_otro = None
        if nuevo_equipo_otro:
            if (
                otro_usuario_equipo
                and otro_usuario_equipo.equipo_id == nuevo_equipo_otro.id
            ):
                usuario_equipo_nuevo_otro = otro_usuario_equipo
            else:
                usuario_equipo_nuevo_otro = UsuarioEquipo.objects.create(
                    equipo=nuevo_equipo_otro,
                    usuario=usuario_empresa_otro,
                    estado=True,
                )

        usuario_actual.usuario_equipo = usuario_equipo_nuevo_actual
        usuario_actual.resuelto = True
        historial_actual = _construir_historial_entry(
            usuario_asignado=usuario_actual,
            original=original_actual,
            seleccion=seleccion_actual,
            movimientos=movimientos_actual,
            equipo_id_resultante=getattr(nuevo_equipo_actual, "id", None),
            usuario_equipo_id_resultante=getattr(
                usuario_equipo_nuevo_actual, "id", None
            ),
            item_guia_id=item_guia_actual,
            usuario_ejecutor=usuario_ejecutor,
        )
        _aplicar_historial_cache(
            usuario_actual,
            original=original_actual,
            historial_entry=historial_actual,
        )
        usuario_actual.save(
            update_fields=["usuario_equipo", "resuelto", "cache_asignacion"]
        )

        usuario_otro.usuario_equipo = usuario_equipo_nuevo_otro
        usuario_otro.resuelto = True
        historial_otro = _construir_historial_entry(
            usuario_asignado=usuario_otro,
            original=original_otro,
            seleccion=seleccion_otro,
            movimientos=movimientos_otro,
            equipo_id_resultante=getattr(nuevo_equipo_otro, "id", None),
            usuario_equipo_id_resultante=getattr(usuario_equipo_nuevo_otro, "id", None),
            item_guia_id=item_guia_otro,
            usuario_ejecutor=usuario_ejecutor,
        )
        _aplicar_historial_cache(
            usuario_otro,
            original=original_otro,
            historial_entry=historial_otro,
        )
        usuario_otro.save(
            update_fields=["usuario_equipo", "resuelto", "cache_asignacion"]
        )

        entry_actual = _construir_entry_firma(
            usuario_asignado=usuario_actual,
            firma=firma_actual,
            usuario_empresa=usuario_empresa_actual,
            seleccion=seleccion_actual,
            movimientos=movimientos_actual,
            original=original_actual,
            equipo_id_resultante=getattr(nuevo_equipo_actual, "id", None),
            usuario_equipo_id_resultante=getattr(
                usuario_equipo_nuevo_actual, "id", None
            ),
            item_guia_id=item_guia_actual,
            aplicada=True,
        )
        entry_otro = _construir_entry_firma(
            usuario_asignado=usuario_otro,
            firma=firma_otro,
            usuario_empresa=usuario_empresa_otro,
            seleccion=seleccion_otro,
            movimientos=movimientos_otro,
            original=original_otro,
            equipo_id_resultante=getattr(nuevo_equipo_otro, "id", None),
            usuario_equipo_id_resultante=getattr(usuario_equipo_nuevo_otro, "id", None),
            item_guia_id=item_guia_otro,
            aplicada=True,
            fecha=fecha_firma_otro,
        )

        _registrar_firma_asignacion_en_ot(orden, entry_actual)
        _registrar_firma_asignacion_en_ot(orden, entry_otro)

    return entry_actual, entry_otro


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


def calcular_ejecutado_de_ots_seleccionadas(ots_ids, fecha_prefactura=None):
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

    from bodegas.models import GuiaSalida, ItemsGuiaSalida
    from cotizaciones.models import Cotizacion, ItemCotizacion
    from cotizaciones.tasks import obtener_tipo_cambio_mindicador_con_fallback
    from ordentrabajov2.models import OrdenDeTrabajo
    from rendiciones.models import Rendicion

    logger = logging.getLogger("facturacion.debug")

    items = []
    total_ejecutado = Decimal("0.00")
    dolar_override = None
    uf_override = None

    if fecha_prefactura:
        try:
            dolar_override, _ = obtener_tipo_cambio_mindicador_con_fallback(
                "dolar", fecha_prefactura
            )
            uf_override, _ = obtener_tipo_cambio_mindicador_con_fallback(
                "uf", fecha_prefactura
            )
        except Exception as exc:
            logger.warning(
                "No se pudo obtener tipo de cambio para fecha_prefactura=%s: %s",
                fecha_prefactura,
                exc,
            )

    def _precio_unitario_cotizacion_clp(item_cot: ItemCotizacion) -> float:
        if not item_cot:
            return 0.0

        moneda_cot = item_cot.cotizacion.tipo_moneda
        unit_base = Decimal(item_cot.precio_venta_neta_unitario_moneda_base or 0)

        if moneda_cot == "1":
            tasa_usd = Decimal(
                dolar_override or item_cot.cotizacion.dolar_observado or 0
            ) + Decimal(5)
            unit_clp = unit_base * tasa_usd if tasa_usd > 0 else Decimal("0.00")
            return float(unit_clp.quantize(Decimal("0.01")))

        if moneda_cot == "3":
            tasa_uf = Decimal(uf_override or item_cot.cotizacion.valor_uf or 0)
            unit_clp = unit_base * tasa_uf if tasa_uf > 0 else Decimal("0.00")
            return float(unit_clp.quantize(Decimal("0.01")))

        # Venta en CLP: mantener el cálculo original basado en CLP
        unit_clp = Decimal(item_cot.precio_unitario_backend.get("clp", 0))
        return float(unit_clp.quantize(Decimal("0.01")))

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

    cotizaciones_ids = set()
    for orden in ordenes:
        cotizaciones_ids.update(orden.cotizaciones.values_list("id", flat=True))

    guias_ids = list(
        GuiaSalida.objects.filter(orden_trabajo__in=ordenes).values_list(
            "id", flat=True
        )
    )
    if guias_ids:
        cotizaciones_ids.update(
            ItemsGuiaSalida.objects.filter(
                guia_id__in=guias_ids,
                source_item__orden_compra__relacion_cotizacion__isnull=False,
            )
            .values_list("source_item__orden_compra__relacion_cotizacion_id", flat=True)
            .distinct()
        )

    cotizaciones_relacionadas = []
    if cotizaciones_ids:
        cotizaciones_relacionadas = [
            {
                "id": cotizacion.id,
                "numero_cotizacion": cotizacion.numero_cotizacion,
                "nombre": cotizacion.nombre,
                "estado": cotizacion.estado,
                "estado_label": cotizacion.get_estado_display(),
                "cliente_id": cotizacion.cliente_id,
                "cliente_nombre": getattr(cotizacion.cliente, "nombre", ""),
                "total_estimado": float(cotizacion.total_estimado or 0),
                "fecha_vencimiento": (
                    cotizacion.fecha_vencimiento.isoformat()
                    if cotizacion.fecha_vencimiento
                    else None
                ),
            }
            for cotizacion in Cotizacion.objects.filter(id__in=cotizaciones_ids)
            .select_related("cliente")
            .order_by("numero_cotizacion")
        ]

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
            estado__in=[
                "E",
                "PR",
                "R",
            ],  # Entregada / Parcialmente Revertida / Revertida
        ).prefetch_related("itemsguiasalida_set__stock_item__item")

        precio_cot_cache = {}
        for guia in guias_ot:
            cantidad_items = guia.itemsguiasalida_set.count()
            tiene_items_facturables = False
            for item_guia in guia.itemsguiasalida_set.all():
                cantidad_entregada = max(
                    (item_guia.cantidad_rebajada or 0)
                    - (item_guia.cantidad_devuelta or 0),
                    0,
                )
                if cantidad_entregada <= 0:
                    continue
                tiene_items_facturables = True

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

                precio_unitario = 0.0
                if item_guia.source_item_id:
                    oc = item_guia.source_item.orden_compra
                    cotizacion_id = getattr(oc, "relacion_cotizacion_id", None)
                    item_empresa_id = item_guia.source_item.item_id
                    cache_key = (
                        cotizacion_id,
                        item_empresa_id,
                        fecha_prefactura or "default",
                    )
                    if cotizacion_id and item_empresa_id:
                        if cache_key not in precio_cot_cache:
                            item_cot = (
                                ItemCotizacion.objects.filter(
                                    cotizacion_id=cotizacion_id,
                                    item_empresa_id=item_empresa_id,
                                )
                                .select_related("cotizacion", "proveedor_empresa")
                                .first()
                            )
                            if item_cot:
                                precio_cot_cache[cache_key] = (
                                    _precio_unitario_cotizacion_clp(item_cot)
                                )
                            else:
                                precio_cot_cache[cache_key] = 0.0
                        precio_unitario = precio_cot_cache.get(cache_key, 0.0)

                total_item = float(cantidad_entregada * precio_unitario)
                total_ejecutado += Decimal(str(total_item))

                items.append(
                    {
                        "id": item_guia.id,  # legacy - mantener por compatibilidad
                        "item_id": item_guia.id,
                        "nombre": nombre_item,
                        "cantidad": cantidad_entregada,
                        "precio_unitario": float(precio_unitario),
                        "total": total_item,
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
            if tiene_items_facturables:
                count_guias += 1

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
                            logger.info(f"  → Compra {compra.id}: sin items en compra")
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
                        cantidad_gasto = getattr(gasto, "cantidad", 1) or 1
                        monto_unitario = getattr(gasto, "monto_unitario", None)
                        monto_total = getattr(gasto, "monto_total", None)
                        if monto_total is None and monto_unitario is not None:
                            monto_total = cantidad_gasto * monto_unitario
                        monto = float(monto_total or 0)
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
                        cantidad_gasto = getattr(gasto, "cantidad", 1) or 1
                        monto_unitario = getattr(gasto, "monto_unitario", None)
                        monto_total = getattr(gasto, "monto_total", None)
                        if monto_total is None and monto_unitario is not None:
                            monto_total = cantidad_gasto * monto_unitario
                        monto = float(monto_total or 0)
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

                    cantidad_final = 1
                    precio_unitario_final = monto
                    if tipo_item == "gasto_operativo":
                        cantidad_final = getattr(gasto, "cantidad", 1) or 1
                        precio_unitario_final = (
                            float(getattr(gasto, "monto_unitario", 0)) or 0.0
                        )
                    items.append(
                        {
                            "id": item_rendicion.id,
                            "item_id": obj.id,  # ID del objeto real (Compra o Gasto), no del ItemRendicion
                            "nombre": nombre_item,
                            "cantidad": cantidad_final,
                            "precio_unitario": precio_unitario_final,
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
        "cotizaciones": cotizaciones_relacionadas,
    }


def generar_pdf_orden_trabajo(orden, servicios, soportes, guias, gastos, adjuntos):
    """
    Genera un PDF profesional para una Orden de Trabajo con estructura por módulos.
    Utiliza el motor canvas directo para consistencia con Guías de Salida y Cotizaciones.
    """
    buffer = io.BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    ancho, alto = A4
    mx, my = 40, 40

    logo_b64 = None
    if os.path.exists(LOGO_PATH):
        try:
            with open(LOGO_PATH, "rb") as f:
                logo_bytes = f.read()
                logo_b64 = (
                    "data:image/png;base64," + base64.b64encode(logo_bytes).decode()
                )
        except:
            pass

    ubicacion = "Santiago"
    fecha_str = orden.fecha_creacion.strftime("%d de %B de %Y")

    # --- Helper Interno para dibujar datos ---
    def draw_kv_line(p, x, y, label, value, x2=None, label2=None, value2=None):
        p.setFont(*FONTS["datos_label"])
        p.drawString(x, y, label)
        p.setFont(*FONTS["datos"])
        p.drawString(x + 100, y, str(value))

        if x2 and label2:
            p.setFont(*FONTS["datos_label"])
            p.drawString(x2, y, label2)
            p.setFont(*FONTS["datos"])
            p.drawString(x2 + 80, y, str(value2))
        return y - 14

    def check_page(curr_y, limit=100):
        if curr_y < limit:
            pdf.showPage()
            draw_encabezado(pdf, ubicacion, fecha_str, logo_b64, ancho, alto, mx, my=40)
            draw_titulo(
                pdf,
                orden.id,
                ancho,
                alto,
                mx,
                40,
                titulo_texto="Orden de Trabajo N\u00b0",
            )
            return alto - 40 - 90
        return curr_y

    def draw_module_title(p, y, text):
        p.setFont(*FONTS["titulo"])  # Reusing title font for module headers
        p.drawString(mx, y, text)
        p.line(mx, y - 4, ancho - mx, y - 4)
        return y - 25

    def draw_section_head(p, y, text):
        p.setFont(*FONTS["datos_label"])
        p.drawString(mx, y, text)
        return y - 15

    # 1. Header & Title (Pag 1)
    draw_encabezado(pdf, ubicacion, fecha_str, logo_b64, ancho, alto, mx, my=40)
    draw_titulo(
        pdf, orden.id, ancho, alto, mx, 40, titulo_texto="Orden de Trabajo N\u00b0"
    )

    y = alto - 40 - 90

    # Estado
    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawRightString(ancho - mx, y, f"Estado: {orden.get_estado_display().upper()}")
    y -= 25

    # 2. Información General
    y = draw_module_title(pdf, y, "INFORMACIÓN GENERAL")

    # Cols setup
    col2_x = ancho / 2 + 10

    pdf.setFont(*FONTS["datos_label"])
    pdf.drawString(mx, y, "Cliente:")
    pdf.setFont(*FONTS["datos"])
    pdf.drawString(mx + 60, y, orden.cliente.nombre)

    pdf.setFont(*FONTS["datos_label"])
    pdf.drawString(col2_x, y, "Solicitante:")
    pdf.setFont(*FONTS["datos"])
    solicitante = (
        orden.cliente_solicitante.usuario.get_nombre_completo()
        if orden.cliente_solicitante
        else "N/A"
    )
    pdf.drawString(col2_x + 80, y, solicitante)
    y -= 14

    pdf.setFont(*FONTS["datos_label"])
    pdf.drawString(mx, y, "Prioridad:")
    pdf.setFont(*FONTS["datos"])
    pdf.drawString(mx + 60, y, orden.get_prioridad_display())

    pdf.setFont(*FONTS["datos_label"])
    pdf.drawString(col2_x, y, "Responsable:")
    pdf.setFont(*FONTS["datos"])
    responsable = (
        orden.tecnico_responsable_ot.usuario.get_nombre_completo()
        if orden.tecnico_responsable_ot
        else "N/A"
    )
    pdf.drawString(col2_x + 80, y, responsable)
    y -= 14

    pdf.setFont(*FONTS["datos_label"])
    pdf.drawString(mx, y, "Inicio:")
    pdf.setFont(*FONTS["datos"])
    ini = orden.fecha_inicio_ot.strftime("%d/%m/%Y") if orden.fecha_inicio_ot else "N/A"
    pdf.drawString(mx + 60, y, ini)

    pdf.setFont(*FONTS["datos_label"])
    pdf.drawString(col2_x, y, "Fin:")
    pdf.setFont(*FONTS["datos"])
    fin = (
        orden.fecha_finalizacion_ot.strftime("%d/%m/%Y")
        if orden.fecha_finalizacion_ot
        else "N/A"
    )
    pdf.drawString(col2_x + 80, y, fin)
    y -= 25

    # 3. Descripción
    y = draw_section_head(pdf, y, "Descripción del Requerimiento:")
    pdf.setFont(*FONTS["datos"])
    desc_lines = wrap(orden.descripcion or "Sin descripción", width=100)
    for line in desc_lines:
        y = check_page(y)
        pdf.drawString(mx, y, line)
        y -= 12
    y -= 20

    # 4. Resumen Ejecutivo
    y = check_page(y, 150)
    y = draw_module_title(pdf, y, "RESUMEN EJECUTIVO")  # Header

    # Table data
    resumen_data = [
        ["Concepto", "Cantidad / Valor"],
        ["Servicios/Soportes registrados", str(len(servicios) + len(soportes))],
        ["Guías de Salida asociadas", str(len(guias))],
        [
            "Gastos Operativos totales",
            format_currency(sum(g.monto_total for g in gastos)),
        ],
    ]

    # Draw simple table manually or using platypus Table via wrapOn/drawOn
    t_width = ancho - 2 * mx
    resumen_table = Table(resumen_data, colWidths=[t_width * 0.7, t_width * 0.3])
    resumen_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), BRAND_BLUE),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, -1), "Helvetica-Bold"),
                ("ALIGN", (1, 0), (1, -1), "RIGHT"),
                ("GRID", (0, 0), (-1, -1), 0.5, LIGHT_GRAY),
                ("PADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    w, h = resumen_table.wrap(t_width, y)
    resumen_table.drawOn(pdf, mx, y - h)
    y -= h + 20

    # 5. Servicios y Soportes
    if servicios or soportes:
        y = check_page(y, 100)
        y = draw_module_title(pdf, y, "SERVICIOS Y SOPORTES")

        all_activities = list(soportes) + list(servicios)

        for act in all_activities:
            is_soporte = hasattr(act, "guia_salida")
            tipo = "Soporte Técnico" if is_soporte else "Servicio General"

            y = check_page(y, 120)
            pdf.setFont("Helvetica-Bold", 10)
            pdf.drawString(mx, y, f"{act.nombre} ({tipo})")
            y -= 14

            # Info line
            tecnico = (
                act.tecnico_asignado.usuario.get_nombre_completo()
                if act.tecnico_asignado and act.tecnico_asignado.usuario
                else "No asignado"
            )
            estado = act.get_estado_display()
            fecha_act = act.fecha_soporte if is_soporte else act.fecha_servicio
            fecha_str_act = fecha_act.strftime("%d/%m/%Y") if fecha_act else "N/A"

            pdf.setFont("Helvetica", 9)
            info_str = f"Fecha: {fecha_str_act} | Técnico: {tecnico} | Estado: {estado}"
            pdf.drawString(mx, y, info_str)
            y -= 12

            # Desc
            pdf.setFont("Helvetica-Oblique", 9)
            desc_act = wrap(act.descripcion or "", width=100)
            for line in desc_act:
                y = check_page(y)
                pdf.drawString(mx, y, line)
                y -= 10

            y -= 10
            # Line separator
            pdf.setStrokeColor(LIGHT_GRAY)
            pdf.line(mx, y, ancho - mx, y)
            pdf.setStrokeColor(colors.black)
            y -= 15

    # 6. Guías de Salida
    if guias:
        y = check_page(y, 100)
        y = draw_module_title(pdf, y, "GUÍAS DE SALIDA Y MATERIALES")

        for guia in guias:
            y = check_page(y, 80)
            pdf.setFont("Helvetica-Bold", 10)
            pdf.drawString(
                mx,
                y,
                f"Guía Nº {guia.id} - Bodega: {guia.bodega.nombre if guia.bodega else 'N/A'}",
            )
            y -= 14

            entregado = (
                guia.entregado_a.usuario.get_nombre_completo()
                if guia.entregado_a and guia.entregado_a.usuario
                else "N/A"
            )
            pdf.setFont("Helvetica", 9)
            pdf.drawString(
                mx, y, f"Entregado a: {entregado} | Motivo: {guia.motivo or '-'}"
            )
            y -= 14

            # Items table
            headers = ["Item", "Cant", "Serie"]
            data_items = [headers]
            for item in guia.itemsguiasalida_set.all():
                nombre = (
                    item.stock_item.item.nombre
                    if item.stock_item and item.stock_item.item
                    else "Desconocido"
                )
                # Serial fix:
                serial_val = str(
                    item.numero_serie.get("serie", "N/A")
                    if isinstance(item.numero_serie, dict)
                    else (item.numero_serie or "N/A")
                )
                data_items.append([nombre, str(item.cantidad_rebajada), serial_val])

            t_items = Table(
                data_items, colWidths=[t_width * 0.6, t_width * 0.15, t_width * 0.25]
            )
            t_items.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, 0), LIGHT_GRAY),
                        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                        ("GRID", (0, 0), (-1, -1), 0.5, colors.black),
                        ("FONTSIZE", (0, 0), (-1, -1), 8),
                    ]
                )
            )

            w, h = t_items.wrap(t_width, y)  # check height
            if y - h < 50:
                y = check_page(0)  # Force new page

            t_items.drawOn(pdf, mx, y - h)
            y -= h + 20

    # 7. Gastos
    if gastos:
        y = check_page(y, 100)
        y = draw_module_title(pdf, y, "GASTOS OPERATIVOS")

        headers = ["Fecha", "Categoría", "Detalle", "Monto"]
        data_gastos = [headers]
        total_gastos = 0
        for g in gastos:
            total_gastos += g.monto_total
            fecha_g = g.fecha_compra.strftime("%d/%m/%Y") if g.fecha_compra else "-"
            cat = g.categoria.nombre if g.categoria else "-"
            det = g.detalle or "-"
            monto = format_currency(g.monto_total)
            data_gastos.append([fecha_g, cat, det, monto])

        data_gastos.append(["", "", "TOTAL", format_currency(total_gastos)])

        t_gastos = Table(
            data_gastos,
            colWidths=[t_width * 0.15, t_width * 0.25, t_width * 0.4, t_width * 0.2],
        )
        t_gastos.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), LIGHT_GRAY),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    (
                        "FONTNAME",
                        (-2, -1),
                        (-1, -1),
                        "Helvetica-Bold",
                    ),  # Total row bold
                    ("ALIGN", (3, 0), (3, -1), "RIGHT"),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.black),
                    ("FONTSIZE", (0, 0), (-1, -1), 9),
                ]
            )
        )

        w, h = t_gastos.wrap(t_width, y)
        if y - h < 50:
            y = check_page(0)

        t_gastos.drawOn(pdf, mx, y - h)
        y -= h + 30

    # 8. Cierre y Firmas
    y = check_page(y, 150)
    y = draw_module_title(pdf, y, "VALIDACIÓN FINAL")
    y -= 30

    # Firmas blocks
    # Box 1: Tecnico
    box_w = (t_width / 2) - 10

    pdf.line(mx, y, mx + box_w, y)
    pdf.line(mx + box_w + 20, y, ancho - mx, y)
    y -= 15

    pdf.setFont("Helvetica-Bold", 9)
    pdf.drawCentredString(mx + box_w / 2, y, "Técnico Responsable")
    pdf.drawCentredString(mx + box_w + 20 + box_w / 2, y, "Aprobación Cliente")
    y -= 12

    nom_tec = (
        orden.tecnico_responsable_ot.usuario.get_nombre_completo()
        if orden.tecnico_responsable_ot
        else ""
    )
    nom_cli = (
        orden.cliente_solicitante.usuario.get_nombre_completo()
        if orden.cliente_solicitante and orden.cliente_solicitante.usuario
        else ""
    )

    pdf.setFont("Helvetica", 9)
    pdf.drawCentredString(mx + box_w / 2, y, nom_tec)
    pdf.drawCentredString(mx + box_w + 20 + box_w / 2, y, nom_cli)

    # Final Footer
    draw_footer(pdf, ancho, mx, my)
    draw_paginacion(pdf, ancho, mx, my)
    pdf.showPage()

    pdf.save()
    buffer.seek(0)
    return buffer
