from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal

import requests
from celery import shared_task
from django.core.cache import cache


def _to_dd_mm_yyyy(value: date | datetime | str) -> str:
    if isinstance(value, str):
        # Expected ISO (YYYY-MM-DD) or already DD-MM-YYYY.
        try:
            parsed = datetime.fromisoformat(value.replace('Z', ''))
            return parsed.strftime('%d-%m-%Y')
        except ValueError:
            return value

    if isinstance(value, datetime):
        return value.strftime('%d-%m-%Y')

    return value.strftime('%d-%m-%Y')


def obtener_tipo_cambio_mindicador(indicador: str, fecha: date | datetime | str) -> Decimal:
    """Obtiene el valor del indicador (dolar/uf) para la fecha, usando cache.

    - Cache key por día para evitar llamadas repetidas.
    - Levanta excepción si no se puede obtener valor.
    """

    fecha_key = fecha if isinstance(fecha, str) else (fecha.date() if isinstance(fecha, datetime) else fecha)
    cache_key = f"cotizaciones:mindicador:{indicador}:{fecha_key}"

    cached_value = cache.get(cache_key)
    if cached_value is not None:
        return Decimal(str(cached_value))

    fecha_fmt = _to_dd_mm_yyyy(fecha)
    url = f"https://mindicador.cl/api/{indicador}/{fecha_fmt}"

    response = requests.get(url, timeout=10)
    response.raise_for_status()
    data = response.json()

    serie = data.get('serie')
    if not serie:
        raise ValueError(f"No se encontró {indicador} para la fecha {fecha_fmt}")

    valor = Decimal(str(serie[0]['valor']))
    cache.set(cache_key, str(valor), timeout=60 * 60 * 24)
    return valor


@shared_task(bind=True, max_retries=3)
def obtener_tipo_cambio_dolar(self, fecha: str) -> str:
    """Task Celery: obtiene dólar observado para una fecha (YYYY-MM-DD)."""

    try:
        valor = obtener_tipo_cambio_mindicador('dolar', fecha)
        return str(valor)
    except Exception as exc:  # pragma: no cover
        raise self.retry(exc=exc, countdown=60)


@shared_task(bind=True, max_retries=3)
def obtener_valor_uf(self, fecha: str) -> str:
    """Task Celery: obtiene UF para una fecha (YYYY-MM-DD)."""

    try:
        valor = obtener_tipo_cambio_mindicador('uf', fecha)
        return str(valor)
    except Exception as exc:  # pragma: no cover
        raise self.retry(exc=exc, countdown=60)


@shared_task
def expirar_cotizaciones_vencidas() -> str:
    """Task Celery: marca como 'expirada' las cotizaciones 'pendiente' cuya fecha vencimiento es < hoy."""
    from .models import Cotizacion

    hoy = date.today()
    cotizaciones_vencidas = Cotizacion.objects.filter(
        estado='pendiente',
        fecha_vencimiento__lt=hoy
    )
    count = cotizaciones_vencidas.update(estado='expirada')

    return f"Se expiraron {count} cotizaciones vencidas."
