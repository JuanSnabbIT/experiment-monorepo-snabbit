"""
Funciones centralizadas para gestion de series.

Este modulo mantiene dual-write con el JSON legacy de ItemOrdenCompraEnStock
y agrega bitacora operativa de eventos de serie.
"""

from __future__ import annotations

from typing import TYPE_CHECKING
from django.db import transaction

if TYPE_CHECKING:
    from empresas.models import UsuarioEmpresa
    from bodegas.models import ItemOrdenCompraEnStock, ItemsGuiaSalida, StockItemEnBodega


def _get_lista_series(oc: ItemOrdenCompraEnStock) -> list[dict]:
    return (oc.numeros_serie or {}).get("numeros_serie", [])


def _set_lista_series(oc: ItemOrdenCompraEnStock, lista_series: list[dict]) -> None:
    numeros_serie = oc.numeros_serie or {}
    numeros_serie["numeros_serie"] = lista_series
    oc.numeros_serie = numeros_serie
    oc.save()


def _sync_json_agregar(oc_target: ItemOrdenCompraEnStock, serie: str) -> None:
    lista = _get_lista_series(oc_target)
    lista.append({"serie": serie, "modelo": "", "object_id": 0})
    _set_lista_series(oc_target, lista)


def _sync_json_eliminar(stock_item: StockItemEnBodega, serie: str) -> None:
    from bodegas.models import ItemOrdenCompraEnStock

    for oc in ItemOrdenCompraEnStock.objects.filter(stock_item=stock_item):
        lista = _get_lista_series(oc)
        for idx, entry in enumerate(lista):
            if entry.get("serie") == serie:
                lista.pop(idx)
                _set_lista_series(oc, lista)
                return


def _sync_json_reservar(
    stock_item: StockItemEnBodega,
    serie: str,
    item_guia_id: int,
) -> None:
    from bodegas.models import ItemOrdenCompraEnStock

    for oc in ItemOrdenCompraEnStock.objects.filter(stock_item=stock_item):
        lista = _get_lista_series(oc)
        for entry in lista:
            if entry.get("serie") == serie:
                entry["modelo"] = "itemsguiasalida"
                entry["object_id"] = item_guia_id
                _set_lista_series(oc, lista)
                return


def _sync_json_liberar(
    stock_item: StockItemEnBodega,
    serie: str,
    item_guia_id: int | None = None,
) -> None:
    from bodegas.models import ItemOrdenCompraEnStock

    for oc in ItemOrdenCompraEnStock.objects.filter(stock_item=stock_item):
        lista = _get_lista_series(oc)
        modified = False
        for entry in lista:
            if entry.get("serie") != serie:
                continue
            if item_guia_id is None:
                entry["modelo"] = ""
                entry["object_id"] = 0
                modified = True
                continue
            if (
                entry.get("modelo") == "itemsguiasalida"
                and entry.get("object_id") == item_guia_id
            ):
                entry["modelo"] = ""
                entry["object_id"] = 0
                modified = True
        if modified:
            _set_lista_series(oc, lista)
            return


def _sync_json_liberar_por_item_guia(
    stock_item: StockItemEnBodega,
    item_guia_id: int,
) -> None:
    from bodegas.models import ItemOrdenCompraEnStock

    for oc in ItemOrdenCompraEnStock.objects.filter(stock_item=stock_item):
        lista = _get_lista_series(oc)
        modified = False
        for entry in lista:
            if entry.get("object_id") == item_guia_id:
                entry["modelo"] = ""
                entry["object_id"] = 0
                modified = True
        if modified:
            _set_lista_series(oc, lista)


def _get_empresa(stock_item: StockItemEnBodega):
    return stock_item.bodega.sucursal.empresa


def _serie_queryset_con_lock():
    from bodegas.models import SerieItem

    qs = SerieItem.objects
    if transaction.get_connection().in_atomic_block:
        qs = qs.select_for_update()
    return qs


def _registrar_evento(
    *,
    serie_obj=None,
    serie: str,
    tipo_evento: str,
    estado_anterior: str = "",
    estado_nuevo: str = "",
    usuario: UsuarioEmpresa | None = None,
    stock_item: StockItemEnBodega | None = None,
    item_guia=None,
    documento_tipo: str = "",
    documento_id: int | None = None,
    causa: str = "",
    metadata: dict | None = None,
    bodega_origen=None,
    bodega_destino=None,
) -> None:
    from bodegas.models import SerieEvento

    stock_item = stock_item or (serie_obj.stock_item if serie_obj else None)
    if item_guia is not None and not documento_tipo:
        documento_tipo = "guia_salida"
        documento_id = item_guia.guia_id

    SerieEvento.objects.create(
        serie_item=serie_obj,
        serie=serie,
        tipo_evento=tipo_evento,
        estado_anterior=estado_anterior or "",
        estado_nuevo=estado_nuevo or "",
        usuario=usuario,
        stock_item=stock_item,
        guia_salida=item_guia.guia if item_guia else None,
        item_guia_salida=item_guia,
        bodega_origen=bodega_origen or (stock_item.bodega if stock_item else None),
        bodega_destino=bodega_destino or (stock_item.bodega if stock_item else None),
        documento_tipo=documento_tipo or "",
        documento_id=documento_id,
        causa=causa or "",
        metadata=metadata or {},
    )


def serie_existe_en_stock(stock_item: StockItemEnBodega, serie: str) -> bool:
    from bodegas.models import SerieItem

    return SerieItem.objects.filter(stock_item=stock_item, serie=serie).exists()


def obtener_series_disponibles(stock_item: StockItemEnBodega) -> list[str]:
    from bodegas.models import SerieItem

    return list(
        SerieItem.objects.filter(
            stock_item=stock_item,
            estado="disponible",
        ).values_list("serie", flat=True)
    )


def agregar_serie_a_stock(
    oc_target: ItemOrdenCompraEnStock,
    serie: str,
    usuario: UsuarioEmpresa | None = None,
    causa: str = "",
) -> None:
    from bodegas.models import SerieItem

    stock_item = oc_target.stock_item
    empresa = _get_empresa(stock_item)
    serie_obj = SerieItem.objects.create(
        serie=serie,
        stock_item=stock_item,
        item_orden_compra_en_stock=oc_target,
        empresa=empresa,
        estado="disponible",
    )
    _sync_json_agregar(oc_target, serie)
    _registrar_evento(
        serie_obj=serie_obj,
        serie=serie,
        tipo_evento="ALTA",
        estado_nuevo="disponible",
        usuario=usuario,
        stock_item=stock_item,
        causa=causa,
        documento_tipo="item_orden_compra_en_stock",
        documento_id=oc_target.pk,
    )


def eliminar_serie_de_stock(
    stock_item: StockItemEnBodega,
    serie: str,
    usuario: UsuarioEmpresa | None = None,
    causa: str = "",
) -> tuple[bool, str]:
    from bodegas.models import SerieItem

    try:
        serie_obj = _serie_queryset_con_lock().get(stock_item=stock_item, serie=serie)
    except SerieItem.DoesNotExist:
        return False, "Serie no encontrada."

    if serie_obj.estado != "disponible":
        return False, "No se puede eliminar una serie asignada a una guia de salida."

    _registrar_evento(
        serie_obj=serie_obj,
        serie=serie_obj.serie,
        tipo_evento="BAJA",
        estado_anterior=serie_obj.estado,
        usuario=usuario,
        stock_item=stock_item,
        causa=causa,
    )
    serie_obj.delete()
    _sync_json_eliminar(stock_item, serie)
    return True, ""


def reservar_serie(
    stock_item: StockItemEnBodega,
    serie: str,
    item_guia_id: int,
    usuario: UsuarioEmpresa | None = None,
    causa: str = "",
) -> tuple[bool, str]:
    from bodegas.models import ItemOrdenCompraEnStock, ItemsGuiaSalida, SerieItem

    try:
        serie_obj = _serie_queryset_con_lock().get(stock_item=stock_item, serie=serie)
    except SerieItem.DoesNotExist:
        oc = ItemOrdenCompraEnStock.objects.filter(stock_item=stock_item).first()
        if not oc:
            return False, "Serie no encontrada en ItemOrdenCompraEnStock."
        lista = _get_lista_series(oc)
        entry = next((e for e in lista if e.get("serie") == serie), None)
        if entry is None:
            return False, "Serie no encontrada en ItemOrdenCompraEnStock."
        if entry.get("object_id") != 0 or entry.get("modelo") != "":
            return False, "La serie ya esta asignada a otro item de guia."
        empresa = _get_empresa(stock_item)
        serie_obj = SerieItem.objects.create(
            serie=serie,
            stock_item=stock_item,
            item_orden_compra_en_stock=oc,
            empresa=empresa,
            estado="disponible",
        )

    if serie_obj.estado != "disponible":
        if serie_obj.item_guia_salida_id != item_guia_id:
            return False, "La serie ya esta asignada a otro item de guia."
        return True, ""

    try:
        item_guia = ItemsGuiaSalida.objects.get(pk=item_guia_id)
    except ItemsGuiaSalida.DoesNotExist:
        return False, "ItemsGuiaSalida no encontrado."

    estado_anterior = serie_obj.estado
    serie_obj.estado = "reservada"
    serie_obj.item_guia_salida = item_guia
    serie_obj.save(update_fields=["estado", "item_guia_salida", "fecha_modificacion"])
    _sync_json_reservar(stock_item, serie, item_guia_id)
    _registrar_evento(
        serie_obj=serie_obj,
        serie=serie_obj.serie,
        tipo_evento="RESERVA",
        estado_anterior=estado_anterior,
        estado_nuevo="reservada",
        usuario=usuario,
        stock_item=stock_item,
        item_guia=item_guia,
        causa=causa,
    )
    return True, ""


def liberar_serie(
    stock_item: StockItemEnBodega,
    serie: str,
    item_guia_id: int | None = None,
    usuario: UsuarioEmpresa | None = None,
    causa: str = "",
    tipo_evento: str = "LIBERACION",
) -> bool:
    filtros = {"stock_item": stock_item, "serie": serie}
    if item_guia_id is not None:
        filtros["item_guia_salida_id"] = item_guia_id

    try:
        serie_obj = _serie_queryset_con_lock().get(**filtros)
    except SerieItem.DoesNotExist:
        return False

    if serie_obj.estado == "disponible":
        return False

    estado_anterior = serie_obj.estado
    item_guia = serie_obj.item_guia_salida
    serie_obj.estado = "disponible"
    serie_obj.item_guia_salida = None
    serie_obj.save(update_fields=["estado", "item_guia_salida", "fecha_modificacion"])
    _sync_json_liberar(stock_item, serie, item_guia_id)
    _registrar_evento(
        serie_obj=serie_obj,
        serie=serie_obj.serie,
        tipo_evento=tipo_evento,
        estado_anterior=estado_anterior,
        estado_nuevo="disponible",
        usuario=usuario,
        stock_item=stock_item,
        item_guia=item_guia,
        causa=causa,
    )
    return True


def liberar_series_por_item_guia(
    stock_item: StockItemEnBodega,
    item_guia_id: int,
    usuario: UsuarioEmpresa | None = None,
    causa: str = "",
    tipo_evento: str = "LIBERACION",
) -> bool:
    series = list(
        _serie_queryset_con_lock().filter(
            stock_item=stock_item,
            item_guia_salida_id=item_guia_id,
        )
    )
    if not series:
        return False

    for serie_obj in series:
        serie_obj.estado = "disponible"
        serie_obj.item_guia_salida = None
        serie_obj.save(update_fields=["estado", "item_guia_salida", "fecha_modificacion"])
        _registrar_evento(
            serie_obj=serie_obj,
            serie=serie_obj.serie,
            tipo_evento=tipo_evento,
            estado_anterior="reservada",
            estado_nuevo="disponible",
            usuario=usuario,
            stock_item=stock_item,
            causa=causa,
        )

    _sync_json_liberar_por_item_guia(stock_item, item_guia_id)
    return True


def despachar_serie(
    stock_item: StockItemEnBodega,
    serie: str,
    item_guia_id: int | None = None,
    usuario: UsuarioEmpresa | None = None,
    causa: str = "",
) -> tuple[bool, str]:
    filtros = {"stock_item": stock_item, "serie": serie}
    if item_guia_id is not None:
        filtros["item_guia_salida_id"] = item_guia_id

    try:
        serie_obj = _serie_queryset_con_lock().get(**filtros)
    except SerieItem.DoesNotExist:
        return False, "Serie no encontrada."

    if serie_obj.estado == "despachada":
        return True, ""
    if serie_obj.estado != "reservada":
        return False, f"La serie no se puede despachar desde estado '{serie_obj.estado}'."

    estado_anterior = serie_obj.estado
    item_guia = serie_obj.item_guia_salida
    serie_obj.estado = "despachada"
    serie_obj.save(update_fields=["estado", "fecha_modificacion"])
    _registrar_evento(
        serie_obj=serie_obj,
        serie=serie_obj.serie,
        tipo_evento="DESPACHO",
        estado_anterior=estado_anterior,
        estado_nuevo="despachada",
        usuario=usuario,
        stock_item=stock_item,
        item_guia=item_guia,
        causa=causa,
    )
    return True, ""


def marcar_serie_devuelta(
    stock_item: StockItemEnBodega,
    serie: str,
    item_guia_id: int | None = None,
    usuario: UsuarioEmpresa | None = None,
    causa: str = "",
) -> tuple[bool, str]:
    filtros = {"stock_item": stock_item, "serie": serie}
    if item_guia_id is not None:
        filtros["item_guia_salida_id"] = item_guia_id

    try:
        serie_obj = _serie_queryset_con_lock().get(**filtros)
    except SerieItem.DoesNotExist:
        return False, "Serie no encontrada."

    if serie_obj.estado == "devuelta":
        return True, ""
    if serie_obj.estado not in {"despachada", "reservada"}:
        return False, f"La serie no se puede devolver desde estado '{serie_obj.estado}'."

    estado_anterior = serie_obj.estado
    item_guia = serie_obj.item_guia_salida
    serie_obj.estado = "devuelta"
    serie_obj.item_guia_salida = None
    serie_obj.save(update_fields=["estado", "item_guia_salida", "fecha_modificacion"])
    _sync_json_liberar(stock_item, serie, item_guia_id=item_guia_id)
    _registrar_evento(
        serie_obj=serie_obj,
        serie=serie_obj.serie,
        tipo_evento="DEVOLUCION",
        estado_anterior=estado_anterior,
        estado_nuevo="devuelta",
        usuario=usuario,
        stock_item=stock_item,
        item_guia=item_guia,
        causa=causa,
    )
    return True, ""
