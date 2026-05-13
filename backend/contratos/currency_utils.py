"""
Utilidades canónicas de conversión de moneda para el módulo contratos.

Fuente única de verdad para convertir precios entre CLP, USD y UF
en el contexto de ContratoItemComercial y ContratoServicio.

Delega la lógica de conversión a `convertir_monto_cotizacion` (venta_helpers),
que ya es la SSOT para la conversión aritmética. Esta capa agrega:
  - Modo safe (retorna None en vez de lanzar ValueError)
  - Obtención lazy de tipos de cambio actuales vía cache/API
  - Utilidad para consolidar totales de una lista de items en una sola moneda

Uso típico en serializadores:
    from contratos.currency_utils import convertir_precio_item_safe, obtener_tipos_cambio_actuales

    dolar, uf = obtener_tipos_cambio_actuales()
    subtotal_en_moneda_cobro = convertir_precio_item_safe(
        monto=item.total_para_forma_pago_contractual,
        moneda_origen=item.moneda,
        moneda_destino=contrato.moneda_cobro,
        dolar_observado=dolar,
        valor_uf=uf,
    )
"""
from __future__ import annotations

import logging
from datetime import date
from decimal import Decimal
from typing import Optional, Tuple

from contratos.venta_helpers import convertir_monto_cotizacion, normalizar_moneda

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Conversión puntual con modo safe
# ---------------------------------------------------------------------------

def convertir_precio_item(
    monto,
    moneda_origen: str,
    moneda_destino: str,
    *,
    dolar_observado=None,
    valor_uf=None,
) -> Decimal:
    """
    Convierte `monto` desde `moneda_origen` hacia `moneda_destino`.

    Delega en `convertir_monto_cotizacion` de venta_helpers (SSOT aritmético).
    Lanza ValueError si falta el tipo de cambio requerido.

    Args:
        monto: Monto a convertir (Decimal, int, float o str).
        moneda_origen: 'CLP', 'USD' o 'UF' (también acepta '1'/'2'/'3').
        moneda_destino: 'CLP', 'USD' o 'UF' (también acepta '1'/'2'/'3').
        dolar_observado: Valor del dólar en CLP. Requerido si alguna moneda es USD.
        valor_uf: Valor de la UF en CLP. Requerido si alguna moneda es UF.

    Returns:
        Decimal convertido y cuantizado según la moneda destino.
    """
    return convertir_monto_cotizacion(
        monto,
        moneda_origen=moneda_origen,
        moneda_destino=moneda_destino,
        dolar_observado=dolar_observado,
        valor_uf=valor_uf,
    )


def convertir_precio_item_safe(
    monto,
    moneda_origen: str,
    moneda_destino: str,
    *,
    dolar_observado=None,
    valor_uf=None,
) -> Optional[Decimal]:
    """
    Igual que `convertir_precio_item` pero retorna None si falta el tipo de cambio
    o si las monedas no son reconocidas, en vez de lanzar ValueError.

    Útil en serializadores donde un fallo de conversión no debe romper la respuesta.

    Returns:
        Decimal convertido, o None si la conversión no es posible.
    """
    try:
        return convertir_precio_item(
            monto,
            moneda_origen=moneda_origen,
            moneda_destino=moneda_destino,
            dolar_observado=dolar_observado,
            valor_uf=valor_uf,
        )
    except (ValueError, Exception) as exc:
        logger.debug(
            "convertir_precio_item_safe: no se pudo convertir %s %s -> %s: %s",
            monto,
            moneda_origen,
            moneda_destino,
            exc,
        )
        return None


# ---------------------------------------------------------------------------
# Obtención de tipos de cambio actuales
# ---------------------------------------------------------------------------

def obtener_tipos_cambio_actuales(
    target_date: Optional[date] = None,
) -> Tuple[Optional[Decimal], Optional[Decimal]]:
    """
    Retorna (dolar_observado, valor_uf) para la fecha indicada (hoy si no se especifica).

    Utiliza el sistema de caché de cotizaciones (Redis → API Mindicador → BD histórica)
    para minimizar latencia. Si ambas tasas fallan, retorna (None, None).

    Returns:
        Tuple (dolar_en_clp, uf_en_clp). Cada valor puede ser None si no está disponible.
    """
    from cotizaciones.tasks import obtener_tipo_cambio_mindicador_con_fallback

    fecha = target_date or date.today()
    dolar = None
    uf = None

    try:
        dolar, _ = obtener_tipo_cambio_mindicador_con_fallback("dolar", fecha)
    except Exception as exc:
        logger.warning("obtener_tipos_cambio_actuales: no se pudo obtener dolar: %s", exc)

    try:
        uf, _ = obtener_tipo_cambio_mindicador_con_fallback("uf", fecha)
    except Exception as exc:
        logger.warning("obtener_tipos_cambio_actuales: no se pudo obtener uf: %s", exc)

    return dolar, uf


# ---------------------------------------------------------------------------
# Consolidación de totales de una lista de items
# ---------------------------------------------------------------------------

def consolidar_totales_items(
    items,
    moneda_cobro: str,
    dolar: Optional[Decimal] = None,
    uf: Optional[Decimal] = None,
) -> Optional[Decimal]:
    """
    Suma los totales de una lista de ContratoItemComercial convirtiéndolos todos
    a `moneda_cobro` antes de sumar.

    A diferencia de `sum(item.total_para_forma_pago_contractual for item in items)`,
    esta función convierte cada item a la moneda del contrato antes de sumar,
    evitando mezclar valores en distintas monedas (p.ej. 5 UF + 100_000 CLP).

    Si algún item no se puede convertir (falta tipo de cambio), ese item se omite
    del total y se registra un WARNING. Retorna None si no se puede convertir
    ningún item.

    Args:
        items: Iterable de ContratoItemComercial.
        moneda_cobro: Moneda destino del contrato ('CLP', 'USD', 'UF').
        dolar: Tasa USD→CLP pre-cargada (FASE 7). Si None, se obtiene internamente.
        uf: Tasa UF→CLP pre-cargada (FASE 7). Si None, se obtiene internamente.

    Returns:
        Decimal con la suma en moneda_cobro, o None si no hay items convertibles.
    """
    try:
        moneda_destino = normalizar_moneda(moneda_cobro)
    except ValueError:
        logger.warning("consolidar_totales_items: moneda_cobro no válida: %r", moneda_cobro)
        return None

    # Si no se pasan tasas, obtenerlas ahora (para llamadas desde modelos o sin contexto).
    if dolar is None and uf is None:
        dolar, uf = obtener_tipos_cambio_actuales()

    total = Decimal("0")
    hay_items_validos = False

    for item in items:
        monto = item.total_para_forma_pago_contractual
        moneda_item = item.moneda or "CLP"

        convertido = convertir_precio_item_safe(
            monto,
            moneda_origen=moneda_item,
            moneda_destino=moneda_destino,
            dolar_observado=dolar,
            valor_uf=uf,
        )

        if convertido is not None:
            total += convertido
            hay_items_validos = True
        else:
            logger.warning(
                "consolidar_totales_items: item id=%s (%s %s) no convertible a %s",
                getattr(item, "id", "?"),
                monto,
                moneda_item,
                moneda_destino,
            )

    return total if hay_items_validos else None
