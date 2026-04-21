from __future__ import annotations

import os

from django.db import transaction
from django.db.models import F
from django.db.models.functions import Greatest
from rest_framework.exceptions import ValidationError

from bodegas.models import ItemsGuiaSalida, StockItemEnBodega
from bodegas.movimientos import (
    registrar_ajuste_manual,
    registrar_devolucion,
    registrar_salida,
)
from bodegas.series import (
    despachar_serie,
    liberar_serie,
    liberar_series_por_item_guia,
    marcar_serie_devuelta,
    reservar_serie,
)
from bodegas.validaciones import (
    validar_ajuste_no_negativo,
    validar_motivo_ajuste,
    validar_serie_despachable,
    validar_stock_disponible,
)


def validaciones_duras_habilitadas() -> bool:
    value = os.getenv("BODEGAS_STRICT_SERIES_VALIDATIONS", "false").strip().lower()
    return value in {"1", "true", "yes", "on"}


@transaction.atomic
def reservar_stock_para_item_guia(
    *,
    item_guia: ItemsGuiaSalida,
    cantidad: int,
    usuario=None,
    descripcion: str,
) -> StockItemEnBodega:
    stock_item = StockItemEnBodega.objects.select_for_update().get(
        pk=item_guia.stock_item_id
    )
    validar_stock_disponible(stock_item, cantidad)
    StockItemEnBodega.objects.filter(pk=stock_item.pk).update(
        cantidad_no_disponible=F("cantidad_no_disponible") + cantidad
    )
    registrar_salida(
        stock_item=stock_item,
        cantidad=cantidad,
        usuario=usuario,
        origen=item_guia,
        descripcion=descripcion,
    )
    stock_item.refresh_from_db()
    return stock_item


@transaction.atomic
def liberar_stock_para_item_guia(
    *,
    item_guia: ItemsGuiaSalida,
    cantidad: int,
    usuario=None,
    descripcion: str,
) -> StockItemEnBodega:
    if cantidad <= 0:
        raise ValidationError({"cantidad": "La cantidad a liberar debe ser mayor a cero."})

    stock_item = StockItemEnBodega.objects.select_for_update().get(
        pk=item_guia.stock_item_id
    )
    StockItemEnBodega.objects.filter(pk=stock_item.pk).update(
        cantidad_no_disponible=Greatest(F("cantidad_no_disponible") - cantidad, 0)
    )
    registrar_devolucion(
        stock_item=stock_item,
        cantidad=cantidad,
        usuario=usuario,
        origen=item_guia,
        descripcion=descripcion,
    )
    stock_item.refresh_from_db()
    return stock_item


@transaction.atomic
def ajustar_reserva_item_guia(
    *,
    item_guia: ItemsGuiaSalida,
    delta: int,
    usuario=None,
) -> StockItemEnBodega:
    if delta == 0:
        return StockItemEnBodega.objects.get(pk=item_guia.stock_item_id)

    if delta > 0:
        return reservar_stock_para_item_guia(
            item_guia=item_guia,
            cantidad=delta,
            usuario=usuario,
            descripcion="Items aumentados en la guia de salida",
        )

    return liberar_stock_para_item_guia(
        item_guia=item_guia,
        cantidad=abs(delta),
        usuario=usuario,
        descripcion="Items reducidos en la guia de salida (devolucion parcial)",
    )


@transaction.atomic
def reservar_serie_para_item_guia(
    *,
    item_guia: ItemsGuiaSalida,
    serie: str,
    usuario=None,
    causa: str = "",
) -> None:
    ok, motivo = reservar_serie(
        stock_item=item_guia.stock_item,
        serie=serie,
        item_guia_id=item_guia.pk,
        usuario=usuario,
        causa=causa,
    )
    if not ok:
        raise ValidationError({"serie": motivo})


@transaction.atomic
def liberar_series_de_item_guia(
    *,
    item_guia: ItemsGuiaSalida,
    usuario=None,
    causa: str = "",
) -> None:
    liberar_series_por_item_guia(
        stock_item=item_guia.stock_item,
        item_guia_id=item_guia.pk,
        usuario=usuario,
        causa=causa,
    )


@transaction.atomic
def despachar_items_guia_de_guia(
    *,
    guia,
    usuario=None,
) -> None:
    strict = validaciones_duras_habilitadas()
    items = list(
        ItemsGuiaSalida.objects.select_for_update()
        .filter(guia=guia)
        .select_related("stock_item__item")
    )
    if not items:
        raise ValidationError({"detail": "No puedes aprobar una guia sin items."})

    for item_guia in items:
        stock_item = StockItemEnBodega.objects.select_for_update().get(
            pk=item_guia.stock_item_id
        )
        if strict and item_guia.cantidad_rebajada > stock_item.cantidad_no_disponible:
            raise ValidationError(
                {
                    "detail": (
                        f"La cantidad a rebajar ({item_guia.cantidad_rebajada}) excede "
                        f"el stock reservado ({stock_item.cantidad_no_disponible}) "
                        f"para el item {stock_item.item}."
                    )
                }
            )

        StockItemEnBodega.objects.filter(pk=stock_item.pk).update(
            cantidad_no_disponible=Greatest(
                F("cantidad_no_disponible") - item_guia.cantidad_rebajada,
                0,
            )
        )

        if not item_guia.individualizado:
            continue

        numero_serie = item_guia.numero_serie or {}
        serie = (numero_serie.get("serie") or "").strip()
        if strict and not serie:
            raise ValidationError(
                {"detail": f"El item serializado {item_guia.pk} no tiene serie asignada."}
            )
        if not serie:
            continue
        if strict:
            validar_serie_despachable(serie, stock_item)
        ok, motivo = despachar_serie(
            stock_item=stock_item,
            serie=serie,
            item_guia_id=item_guia.pk,
            usuario=usuario,
            causa="Despacho de guia",
        )
        if strict and not ok:
            raise ValidationError({"serie": motivo})


@transaction.atomic
def devolver_item_guia(
    *,
    item_guia: ItemsGuiaSalida,
    cantidad: int,
    usuario=None,
    causa: str = "",
) -> None:
    if cantidad <= 0:
        raise ValidationError({"cantidad": "La cantidad a devolver debe ser mayor a cero."})

    item_guia = ItemsGuiaSalida.objects.select_for_update().get(pk=item_guia.pk)
    max_dev = item_guia.cantidad_rebajada - item_guia.cantidad_devuelta
    if cantidad > max_dev:
        raise ValidationError(
            {
                "detail": (
                    f"No puedes devolver mas de lo rebajado en item {item_guia.pk}."
                )
            }
        )

    item_guia.cantidad_devuelta += cantidad
    item_guia.save(update_fields=["cantidad_devuelta"])
    liberar_stock_para_item_guia(
        item_guia=item_guia,
        cantidad=cantidad,
        usuario=usuario,
        descripcion="Devolucion desde guia de salida",
    )

    numero_serie = item_guia.numero_serie or {}
    serie = (numero_serie.get("serie") or "").strip()
    if serie:
        marcar_serie_devuelta(
            stock_item=item_guia.stock_item,
            serie=serie,
            item_guia_id=item_guia.pk,
            usuario=usuario,
            causa=causa or "Devolucion de item en guia",
        )


@transaction.atomic
def revertir_item_guia(
    *,
    item_guia: ItemsGuiaSalida,
    usuario=None,
    causa: str = "",
) -> None:
    item_guia = ItemsGuiaSalida.objects.select_for_update().get(pk=item_guia.pk)
    pendiente = max(item_guia.cantidad_rebajada - item_guia.cantidad_devuelta, 0)
    if pendiente > 0:
        liberar_stock_para_item_guia(
            item_guia=item_guia,
            cantidad=pendiente,
            usuario=usuario,
            descripcion="Reversion de item de guia",
        )

    numero_serie = item_guia.numero_serie or {}
    serie = (numero_serie.get("serie") or "").strip()
    if serie:
        liberar_serie(
            stock_item=item_guia.stock_item,
            serie=serie,
            item_guia_id=item_guia.pk,
            usuario=usuario,
            causa=causa or "Reversion de item de guia",
            tipo_evento="REVERSO",
        )


@transaction.atomic
def ajustar_stock_manual_transaccional(
    *,
    stock_item: StockItemEnBodega,
    delta: int,
    usuario=None,
    descripcion: str,
) -> None:
    stock_item = StockItemEnBodega.objects.select_for_update().get(pk=stock_item.pk)
    validar_motivo_ajuste(descripcion)
    validar_ajuste_no_negativo(stock_item, delta)
    registrar_ajuste_manual(
        stock_item=stock_item,
        cantidad_delta=delta,
        usuario=usuario,
        descripcion=descripcion,
    )
