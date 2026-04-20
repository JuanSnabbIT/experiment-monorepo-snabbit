"""
Servicio de validaciones transaccionales de inventario — bodegas.

Centraliza las reglas de negocio ANTES de que se ejecuten movimientos
de stock o series. Todas las funciones son puras (no modifican BD) y
lanzan ValidationError de DRF cuando una regla es violada.

Uso típico (dentro de @transaction.atomic):
    from bodegas.validaciones import (
        validar_stock_disponible,
        validar_serie_disponible,
        validar_series_pertenecen_a_stock,
        validar_ajuste_no_negativo,
        validar_motivo_ajuste,
        validar_estado_guia_permite_operacion,
    )
"""
from __future__ import annotations

from rest_framework.exceptions import ValidationError


# ---------------------------------------------------------------------------
# Stock
# ---------------------------------------------------------------------------

def validar_stock_disponible(stock_item, cantidad_requerida: int) -> None:
    """
    Verifica que haya suficiente stock disponible para una salida.

    Args:
        stock_item (StockItemEnBodega): ítem a verificar
        cantidad_requerida (int): cantidad que se intenta descontar

    Raises:
        ValidationError: si el stock disponible es insuficiente
    """
    if cantidad_requerida <= 0:
        raise ValidationError(
            {
                "cantidad": (
                    f"La cantidad requerida debe ser mayor a cero, "
                    f"recibido: {cantidad_requerida}."
                )
            }
        )
    disponible = stock_item.cantidad
    if disponible < cantidad_requerida:
        raise ValidationError(
            {
                "stock": (
                    f"Stock insuficiente para '{stock_item.item.nombre}': "
                    f"disponible {disponible}, requerido {cantidad_requerida}."
                )
            }
        )


def validar_ajuste_no_negativo(stock_item, delta: int) -> None:
    """
    Verifica que un ajuste manual no deje el stock en negativo.

    Args:
        stock_item (StockItemEnBodega): ítem a ajustar
        delta (int): cantidad a sumar (positivo) o restar (negativo)

    Raises:
        ValidationError: si el resultado sería negativo
    """
    if delta == 0:
        raise ValidationError({"cantidad": "El delta de ajuste no puede ser cero."})

    resultado = stock_item.cantidad + delta
    if resultado < 0:
        raise ValidationError(
            {
                "stock": (
                    f"El ajuste dejaría '{stock_item.item.nombre}' con stock negativo "
                    f"({resultado}). Stock actual: {stock_item.cantidad}, delta: {delta}."
                )
            }
        )


def validar_motivo_ajuste(descripcion: str | None) -> None:
    """
    Exige que todo ajuste manual incluya un motivo no vacío.

    Raises:
        ValidationError: si la descripción está vacía o ausente
    """
    if not descripcion or not descripcion.strip():
        raise ValidationError(
            {"descripcion": "El campo 'descripcion' es obligatorio para ajustes manuales."}
        )


# ---------------------------------------------------------------------------
# Series
# ---------------------------------------------------------------------------

def validar_serie_disponible(stock_item, serie: str) -> None:
    """
    Verifica que una serie exista en el stock y esté en estado 'disponible'.

    Args:
        stock_item (StockItemEnBodega): stock donde debe existir la serie
        serie (str): número de serie a validar

    Raises:
        ValidationError: si la serie no existe o no está disponible
    """
    from bodegas.models import SerieItem

    try:
        serie_obj = SerieItem.objects.get(stock_item=stock_item, serie=serie)
    except SerieItem.DoesNotExist:
        raise ValidationError(
            {
                "serie": (
                    f"La serie '{serie}' no existe en el stock de "
                    f"'{stock_item.item.nombre}'."
                )
            }
        )

    if serie_obj.estado != "disponible":
        estados_label = {
            "reservada": "reservada en una guía de salida",
            "despachada": "ya despachada",
            "devuelta": "devuelta (pendiente de revisión)",
        }
        label = estados_label.get(serie_obj.estado, serie_obj.estado)
        raise ValidationError(
            {
                "serie": (
                    f"La serie '{serie}' no está disponible: está {label}."
                )
            }
        )


def validar_serie_no_duplicada_activa(empresa, serie: str, excluir_stock_item=None) -> None:
    """
    Verifica que no exista una serie activa (disponible/reservada/despachada)
    con el mismo número para la empresa.

    Args:
        empresa: instancia de Empresa
        serie (str): número de serie a verificar
        excluir_stock_item: si se proporciona, excluye ese stock_item de la búsqueda
            (útil al re-ingresar una serie devuelta al mismo ítem)

    Raises:
        ValidationError: si existe una serie activa duplicada
    """
    from bodegas.models import SerieItem

    qs = SerieItem.objects.filter(
        empresa=empresa,
        serie=serie,
        estado__in=("disponible", "reservada", "despachada"),
    )
    if excluir_stock_item:
        qs = qs.exclude(stock_item=excluir_stock_item)

    if qs.exists():
        raise ValidationError(
            {
                "serie": (
                    f"La serie '{serie}' ya está activa en el inventario de esta empresa. "
                    f"No se permiten series duplicadas activas."
                )
            }
        )


def validar_series_pertenecen_a_stock(stock_item, series: list[str]) -> None:
    """
    Verifica que todas las series de la lista pertenezcan al stock_item dado
    y estén en estado 'disponible'.

    Args:
        stock_item (StockItemEnBodega): stock origen
        series (list[str]): lista de números de serie

    Raises:
        ValidationError: con detalle de qué series fallan
    """
    if not series:
        return

    from bodegas.models import SerieItem

    disponibles = set(
        SerieItem.objects.filter(
            stock_item=stock_item, serie__in=series, estado="disponible"
        ).values_list("serie", flat=True)
    )
    faltantes = [s for s in series if s not in disponibles]
    if faltantes:
        raise ValidationError(
            {
                "series": (
                    f"Las siguientes series no están disponibles en "
                    f"'{stock_item.item.nombre}': {', '.join(faltantes)}."
                )
            }
        )


def validar_serie_pertenece_a_guia(serie: str, item_guia_id: int, stock_item) -> None:
    """
    Verifica que una serie esté reservada específicamente para el item_guia dado.

    Raises:
        ValidationError: si la serie no está reservada para ese item_guia
    """
    from bodegas.models import SerieItem

    existe = SerieItem.objects.filter(
        stock_item=stock_item,
        serie=serie,
        item_guia_salida_id=item_guia_id,
        estado="reservada",
    ).exists()
    if not existe:
        raise ValidationError(
            {
                "serie": (
                    f"La serie '{serie}' no está reservada para este ítem de guía."
                )
            }
        )


def validar_serie_despachable(serie: str, stock_item) -> None:
    """
    Verifica que una serie esté en estado 'reservada' (lista para despachar).

    Raises:
        ValidationError: si la serie no puede ser despachada
    """
    from bodegas.models import SerieItem

    try:
        serie_obj = SerieItem.objects.get(stock_item=stock_item, serie=serie)
    except SerieItem.DoesNotExist:
        raise ValidationError(
            {"serie": f"La serie '{serie}' no existe en el stock."}
        )

    if serie_obj.estado != "reservada":
        raise ValidationError(
            {
                "serie": (
                    f"La serie '{serie}' no se puede despachar: "
                    f"estado actual '{serie_obj.estado}' (se requiere 'reservada')."
                )
            }
        )


def validar_serie_devuelta_reingresal(serie: str, empresa) -> None:
    """
    Verifica que una serie marcada como 'devuelta' pueda ser reingresada.
    Bloquea el reingreso si ya existe una serie 'disponible' con el mismo número
    en otro stock_item de la empresa (duplicado lógico).

    Raises:
        ValidationError
    """
    from bodegas.models import SerieItem

    activas_en_otro_stock = SerieItem.objects.filter(
        empresa=empresa,
        serie=serie,
        estado__in=("disponible", "reservada", "despachada"),
    ).exists()
    if activas_en_otro_stock:
        raise ValidationError(
            {
                "serie": (
                    f"La serie '{serie}' ya está activa en otro ítem del inventario. "
                    f"No se puede reingresar como disponible."
                )
            }
        )


# ---------------------------------------------------------------------------
# Estados de GuiaSalida
# ---------------------------------------------------------------------------

_ESTADOS_BLOQUEADOS_PARA_EDICION = ("ET", "E", "T")
_ESTADOS_BLOQUEADOS_PARA_REVERSION = ("E", "T")


def validar_estado_guia_permite_edicion(guia) -> None:
    """
    Verifica que el estado de la guía permita agregar/editar/eliminar ítems.

    Raises:
        ValidationError: si la guía ya fue despachada o terminada
    """
    if guia.estado in _ESTADOS_BLOQUEADOS_PARA_EDICION:
        estados_label = {
            "ET": "En Tránsito",
            "E": "Entregada",
            "T": "Terminada",
        }
        label = estados_label.get(guia.estado, guia.estado)
        raise ValidationError(
            {
                "guia": (
                    f"No se puede modificar la guía N°{guia.pk}: "
                    f"estado '{label}' no permite edición."
                )
            }
        )


def validar_estado_guia_permite_reversion(guia) -> None:
    """
    Verifica que el estado de la guía permita revertir/devolver ítems.

    Raises:
        ValidationError: si la guía está en estado terminal
    """
    if guia.estado in _ESTADOS_BLOQUEADOS_PARA_REVERSION:
        estados_label = {
            "E": "Entregada",
            "T": "Terminada",
        }
        label = estados_label.get(guia.estado, guia.estado)
        raise ValidationError(
            {
                "guia": (
                    f"No se puede revertir la guía N°{guia.pk}: "
                    f"estado '{label}' es terminal."
                )
            }
        )


# ---------------------------------------------------------------------------
# Integridad encabezado ↔ detalle
# ---------------------------------------------------------------------------

def validar_cantidad_vs_series(cantidad: int, series: list[str]) -> None:
    """
    Verifica que la cantidad del ítem coincida con la cantidad de series provistas
    cuando el ítem requiere series.

    Args:
        cantidad (int): cantidad declarada en el movimiento
        series (list[str]): lista de números de serie

    Raises:
        ValidationError: si hay discrepancia
    """
    if series and len(series) != cantidad:
        raise ValidationError(
            {
                "series": (
                    f"La cantidad declarada ({cantidad}) no coincide con el número "
                    f"de series provistas ({len(series)})."
                )
            }
        )


def validar_no_series_duplicadas_en_lista(series: list[str]) -> None:
    """
    Verifica que no haya series repetidas en la lista de entrada.

    Raises:
        ValidationError: si hay duplicados en la lista
    """
    vistos = set()
    duplicados = []
    for s in series:
        if s in vistos:
            duplicados.append(s)
        vistos.add(s)
    if duplicados:
        raise ValidationError(
            {
                "series": (
                    f"Se detectaron series duplicadas en la lista: "
                    f"{', '.join(set(duplicados))}."
                )
            }
        )
