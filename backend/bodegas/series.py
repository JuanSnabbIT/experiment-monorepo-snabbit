"""
Funciones centralizadas de gestión de números de serie — bodegas.

SSOT para operaciones sobre series de ítems.
Usa el modelo relacional SerieItem como fuente de verdad,
y mantiene sincronizado el JSONField legacy en ItemOrdenCompraEnStock
durante el período de transición.

Todas las funciones asumen que los objetos ya están bloqueados (select_for_update)
si se requiere protección de concurrencia. El llamador es responsable de
asegurar el contexto transaccional.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from bodegas.models import ItemOrdenCompraEnStock, SerieItem, StockItemEnBodega


# ---------------------------------------------------------------------------
# Helpers internos (JSON legacy — se eliminarán cuando se retire el JSONField)
# ---------------------------------------------------------------------------

def _get_lista_series(oc: ItemOrdenCompraEnStock) -> list[dict]:
    """Extrae la lista de series del JSONField."""
    return (oc.numeros_serie or {}).get("numeros_serie", [])


def _set_lista_series(oc: ItemOrdenCompraEnStock, lista_series: list[dict]) -> None:
    """Escribe la lista de series al JSONField y guarda."""
    numeros_serie = oc.numeros_serie or {}
    numeros_serie["numeros_serie"] = lista_series
    oc.numeros_serie = numeros_serie
    oc.save()


def _sync_json_agregar(oc_target: ItemOrdenCompraEnStock, serie: str) -> None:
    """Sincroniza el JSONField al agregar una serie."""
    lista = _get_lista_series(oc_target)
    lista.append({"serie": serie, "modelo": "", "object_id": 0})
    _set_lista_series(oc_target, lista)


def _sync_json_eliminar(stock_item: StockItemEnBodega, serie: str) -> None:
    """Sincroniza el JSONField al eliminar una serie."""
    from bodegas.models import ItemOrdenCompraEnStock

    for oc in ItemOrdenCompraEnStock.objects.filter(stock_item=stock_item):
        lista = _get_lista_series(oc)
        for i, entry in enumerate(lista):
            if entry.get("serie") == serie:
                lista.pop(i)
                _set_lista_series(oc, lista)
                return


def _sync_json_reservar(
    stock_item: StockItemEnBodega, serie: str, item_guia_id: int
) -> None:
    """Sincroniza el JSONField al reservar una serie."""
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
    stock_item: StockItemEnBodega, serie: str, item_guia_id: int | None = None
) -> None:
    """Sincroniza el JSONField al liberar una serie."""
    from bodegas.models import ItemOrdenCompraEnStock

    for oc in ItemOrdenCompraEnStock.objects.filter(stock_item=stock_item):
        lista = _get_lista_series(oc)
        modified = False
        for entry in lista:
            if entry.get("serie") == serie:
                if item_guia_id is not None:
                    if (
                        entry.get("modelo") == "itemsguiasalida"
                        and entry.get("object_id") == item_guia_id
                    ):
                        entry["modelo"] = ""
                        entry["object_id"] = 0
                        modified = True
                else:
                    entry["modelo"] = ""
                    entry["object_id"] = 0
                    modified = True
        if modified:
            _set_lista_series(oc, lista)
            return


def _sync_json_liberar_por_item_guia(
    stock_item: StockItemEnBodega, item_guia_id: int
) -> None:
    """Sincroniza el JSONField al liberar series por item_guia_id."""
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


# ---------------------------------------------------------------------------
# Helpers: obtener empresa desde stock_item
# ---------------------------------------------------------------------------

def _get_empresa(stock_item: StockItemEnBodega):
    """Obtiene la empresa del stock_item a través de la cadena bodega→sucursal→empresa."""
    return stock_item.bodega.sucursal.empresa


# ---------------------------------------------------------------------------
# Consultas
# ---------------------------------------------------------------------------

def serie_existe_en_stock(stock_item: StockItemEnBodega, serie: str) -> bool:
    """Verifica si una serie ya existe en un stock_item (via SerieItem)."""
    from bodegas.models import SerieItem

    return SerieItem.objects.filter(stock_item=stock_item, serie=serie).exists()


def obtener_series_disponibles(stock_item: StockItemEnBodega) -> list[str]:
    """
    Retorna la lista de series disponibles (no asignadas) para un stock_item.
    Usado por serializers para mostrar series seleccionables.
    """
    from bodegas.models import SerieItem

    return list(
        SerieItem.objects.filter(
            stock_item=stock_item, estado="disponible"
        ).values_list("serie", flat=True)
    )


# ---------------------------------------------------------------------------
# Escrituras (dual-write: SerieItem + JSON legacy)
# ---------------------------------------------------------------------------

def agregar_serie_a_stock(oc_target: ItemOrdenCompraEnStock, serie: str) -> None:
    """
    Agrega una nueva serie al stock.
    No verifica duplicados — eso debe hacerse antes de llamar.
    """
    from bodegas.models import SerieItem

    stock_item = oc_target.stock_item
    empresa = _get_empresa(stock_item)

    SerieItem.objects.create(
        serie=serie,
        stock_item=stock_item,
        item_orden_compra_en_stock=oc_target,
        empresa=empresa,
        estado="disponible",
    )

    # Sync legacy JSON
    _sync_json_agregar(oc_target, serie)


def eliminar_serie_de_stock(
    stock_item: StockItemEnBodega, serie: str
) -> tuple[bool, str]:
    """
    Elimina una serie del stock. Solo si está disponible (no asignada).

    Returns:
        (True, "") si se eliminó
        (False, "motivo") si no se puede eliminar
    """
    from bodegas.models import SerieItem

    try:
        serie_obj = SerieItem.objects.get(stock_item=stock_item, serie=serie)
    except SerieItem.DoesNotExist:
        return False, "Serie no encontrada."

    if serie_obj.estado != "disponible":
        return (
            False,
            "No se puede eliminar una serie asignada a una guía de salida.",
        )

    serie_obj.delete()

    # Sync legacy JSON
    _sync_json_eliminar(stock_item, serie)

    return True, ""


def reservar_serie(
    stock_item: StockItemEnBodega, serie: str, item_guia_id: int
) -> tuple[bool, str]:
    """
    Reserva una serie para un ItemsGuiaSalida específico.

    Returns:
        (True, "") si la reserva fue exitosa
        (False, "motivo") si no se pudo reservar
    """
    from bodegas.models import ItemOrdenCompraEnStock, ItemsGuiaSalida, SerieItem

    try:
        serie_obj = SerieItem.objects.get(stock_item=stock_item, serie=serie)
    except SerieItem.DoesNotExist:
        # Fallback legacy: si la serie existe solo en el JSONField (datos previos a la
        # migración a SerieItem), la creamos on-the-fly para compatibilidad hacia atrás.
        oc = ItemOrdenCompraEnStock.objects.filter(stock_item=stock_item).first()
        if oc:
            lista = _get_lista_series(oc)
            entry = next((e for e in lista if e.get("serie") == serie), None)
            if entry is not None and entry.get("object_id") == 0 and entry.get("modelo") == "":
                empresa = _get_empresa(stock_item)
                serie_obj = SerieItem.objects.create(
                    serie=serie,
                    stock_item=stock_item,
                    item_orden_compra_en_stock=oc,
                    empresa=empresa,
                    estado="disponible",
                )
            elif entry is not None:
                return False, "La serie ya está asignada a otro ítem de guía."
            else:
                return False, "Serie no encontrada en ItemOrdenCompraEnStock."
        else:
            return False, "Serie no encontrada en ItemOrdenCompraEnStock."

    # Verificar que no esté asignada a otro item_guia
    if serie_obj.estado != "disponible":
        if serie_obj.item_guia_salida_id != item_guia_id:
            return False, "La serie ya está asignada a otro ítem de guía."
        # Ya está asignada al mismo item_guia, nada que hacer
        return True, ""

    try:
        item_guia = ItemsGuiaSalida.objects.get(pk=item_guia_id)
    except ItemsGuiaSalida.DoesNotExist:
        return False, "ItemsGuiaSalida no encontrado."

    serie_obj.estado = "reservada"
    serie_obj.item_guia_salida = item_guia
    serie_obj.save(update_fields=["estado", "item_guia_salida", "fecha_modificacion"])

    # Sync legacy JSON
    _sync_json_reservar(stock_item, serie, item_guia_id)

    return True, ""


def liberar_serie(
    stock_item: StockItemEnBodega,
    serie: str,
    item_guia_id: int | None = None,
) -> bool:
    """
    Libera una serie específica. Si item_guia_id se proporciona, solo libera
    si pertenece a ese item_guia (evita liberar series de otro item).

    Returns True si se liberó la serie.
    """
    from bodegas.models import SerieItem

    filtros = {"stock_item": stock_item, "serie": serie}
    if item_guia_id is not None:
        filtros["item_guia_salida_id"] = item_guia_id

    try:
        serie_obj = SerieItem.objects.get(**filtros)
    except SerieItem.DoesNotExist:
        return False

    if serie_obj.estado in ("disponible",):
        return False  # Ya está libre

    serie_obj.estado = "disponible"
    serie_obj.item_guia_salida = None
    serie_obj.save(update_fields=["estado", "item_guia_salida", "fecha_modificacion"])

    # Sync legacy JSON
    _sync_json_liberar(stock_item, serie, item_guia_id)

    return True


def liberar_series_por_item_guia(
    stock_item: StockItemEnBodega, item_guia_id: int
) -> bool:
    """
    Libera todas las series asociadas a un item_guia_id en el stock_item dado.
    Usado en:
    - signal pre_delete de ItemsGuiaSalida
    - actualizar_serie (fase 1: reset de asignación anterior)

    Returns True si se liberó al menos una serie.
    """
    from bodegas.models import SerieItem

    updated = SerieItem.objects.filter(
        stock_item=stock_item,
        item_guia_salida_id=item_guia_id,
    ).update(estado="disponible", item_guia_salida=None)

    if updated > 0:
        # Sync legacy JSON
        _sync_json_liberar_por_item_guia(stock_item, item_guia_id)

    return updated > 0
