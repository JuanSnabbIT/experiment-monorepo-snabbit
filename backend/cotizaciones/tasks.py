import logging
import requests
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Optional, Tuple, Any
from celery import shared_task
from django.core.cache import cache
from django.utils import timezone
from django.apps import apps
from django.db.models import Q

"""
Tasks para el módulo de cotizaciones.
Maneja la obtención asíncrona de indicadores económicos (Dólar, UF)
y tareas de mantenimiento (expiración de cotizaciones).
"""

logger = logging.getLogger(__name__)

MINDICADOR_API_URL = "https://mindicador.cl/api"
CACHE_TIMEOUT_SECONDS = 60 * 60 * 24  # 24 horas

# Helpers de Fecha 
def _get_previous_business_day(target_date: date) -> date:
    """Retorna el día hábil anterior o igual a la fecha dada (evita fines de semana)."""
    adjusted = target_date
    while adjusted.weekday() >= 5:  # 5=Sab, 6=Dom
        adjusted -= timedelta(days=1)
    return adjusted

def _parse_mindicador_date(date_str: str) -> Optional[date]:
    """Parsea la fecha formato ISO de la API mindicador."""
    if not date_str:
        return None
    try:
        # Mindicador usa ISO format con 'Z'
        return datetime.fromisoformat(date_str.replace('Z', '')).date()
    except ValueError:
        return None

# Logica Core
def obtener_tipo_cambio_mindicador_con_fallback(indicator: str, target_date: Any) -> Tuple[Decimal, date]:
    """
    Núcleo unificado para obtener indicadores.
    Estrategia:
    1. Busqueda inteligente de fecha (evitar findes).
    2. Cache local.
    3. API Mindicador (Fecha exacta).
    4. API Mindicador (Historial para feriados/findes).
    5. Fallback Base de Datos (Último valor conocido).
    """
    # Estandarizar fecha
    if isinstance(target_date, str):
        target_date = datetime.fromisoformat(target_date.replace('Z', '')).date()
    elif isinstance(target_date, datetime):
        target_date = target_date.date()
    
    # 1. Busqueda inteligente de fecha (evitar findes)
    search_date = _get_previous_business_day(target_date)
    cache_key = f"cotizaciones:indicator:{indicator}:{search_date.isoformat()}"
    
    # 2. Cache
    cached_val = cache.get(cache_key)
    if cached_val:
        return Decimal(str(cached_val)), search_date

    # 3. API Fetch (Intento directo)
    api_val, api_date = _fetch_from_api(indicator, search_date)
    
    if api_val:
        # Guardar en cache y retornar
        cache.set(cache_key, str(api_val), timeout=CACHE_TIMEOUT_SECONDS)
        return api_val, api_date or search_date
        
    # 4. Fallback DB (Si la API falló totalmente)
    return _fetch_from_db_last_known(indicator, search_date)

def _fetch_from_api(indicator: str, search_date: date) -> Tuple[Optional[Decimal], Optional[date]]:
    """Consulta la API de mindicador con lógica de reintento/serie."""
    formatted_date = search_date.strftime('%d-%m-%Y')
    url_direct = f"{MINDICADOR_API_URL}/{indicator}/{formatted_date}"
    
    try:
        # Intento 1: Fecha específica
        resp = requests.get(url_direct, timeout=5)
        if resp.ok:
            data = resp.json()
            serie = data.get('serie', [])
            if serie:
                val = Decimal(str(serie[0]['valor']))
                date_obj = _parse_mindicador_date(serie[0]['fecha'])
                return val, date_obj

        # Intento 2: Historial (si fecha específica falla, ej. feriado local no detectado)
        # Solo si el error no fue de conexión, sino de datos vacíos
        url_series = f"{MINDICADOR_API_URL}/{indicator}"
        resp_series = requests.get(url_series, timeout=5)
        if resp_series.ok:
            data = resp_series.json()
            serie = data.get('serie', [])
            # Buscar el más cercano hacia atrás
            best_entry = None
            for entry in serie:
                entry_date = _parse_mindicador_date(entry['fecha'])
                if entry_date and entry_date <= search_date:
                    if best_entry is None:
                        best_entry = (entry, entry_date)
                    elif entry_date > best_entry[1]:
                        best_entry = (entry, entry_date)
            
            if best_entry:
                val = Decimal(str(best_entry[0]['valor']))
                return val, best_entry[1]

    except requests.RequestException as e:
        logger.error(f"Error consultando API Mindicador ({indicator}): {e}")
    
    return None, None

def _fetch_from_db_last_known(indicator: str, max_date: date) -> Tuple[Decimal, date]:
    """Busca el último valor guardado en cotizaciones anteriores."""
    Cotizacion = apps.get_model('cotizaciones', 'Cotizacion')
    field = 'dolar_observado' if indicator == 'dolar' else 'valor_uf'
    
    # Buscar cotización con valor y fecha <= max_date
    fallback = Cotizacion.objects.filter(
        **{f"{field}__isnull": False}
    ).filter(
        Q(fecha_tipo_cambio__lte=max_date) | 
        Q(fecha_tipo_cambio__isnull=True, fecha_facturacion__lte=max_date)
    ).order_by('-fecha_tipo_cambio', '-fecha_facturacion').first()

    if fallback:
        val = getattr(fallback, field)
        ref_date = fallback.fecha_tipo_cambio or fallback.fecha_facturacion
        return val, ref_date or max_date
    
    # Fallback Hardcoded de emergencia (Evita crash, aunque sea dato viejo/estimado)
    return Decimal(0), max_date

# Tasks 
@shared_task
def actualizar_tipo_cambio_cotizacion(
    cotizacion_id: int,
    actualizar_dolar: bool = True,
    actualizar_uf: bool = True
) -> str:
    """
    Actualiza los indicadores de una cotización específica.
    """
    Cotizacion = apps.get_model('cotizaciones', 'Cotizacion')
    try:
        cotizacion = Cotizacion.objects.get(id=cotizacion_id)
    except Cotizacion.DoesNotExist:
        return f"Cotización {cotizacion_id} no encontrada."

    target_date = cotizacion.fecha_facturacion or timezone.localdate()
    # Si es fecha futura, usamos la fecha de HOY para buscar el indicador (proyección del día)
    today = timezone.localdate()
    search_date = target_date if target_date <= today else today

    updated_fields = []
    
    # Dolar
    if actualizar_dolar:
        val, ref_date = obtener_tipo_cambio_mindicador_con_fallback('dolar', search_date)
        if val > 0:
            cotizacion.dolar_observado = val
            # Solo actualizamos fecha referencia si no es UF (prioridad moneda)
            if cotizacion.tipo_moneda != '3':
                cotizacion.fecha_tipo_cambio = ref_date
                updated_fields.append('fecha_tipo_cambio')
            updated_fields.append('dolar_observado')

    # UF
    if actualizar_uf:
        val, ref_date = obtener_tipo_cambio_mindicador_con_fallback('uf', search_date)
        if val > 0:
            cotizacion.valor_uf = val
            if cotizacion.tipo_moneda == '3':
                cotizacion.fecha_tipo_cambio = ref_date
                updated_fields.append('fecha_tipo_cambio')
            updated_fields.append('valor_uf')

    if updated_fields:
        cotizacion.save(update_fields=updated_fields)
        return f"Cotización {cotizacion_id} actualizada: {updated_fields}"
    
    return f"Cotización {cotizacion_id} sin cambios (API/DB sin datos nuevos)."

@shared_task
def expirar_cotizaciones_vencidas() -> str:
    """
    Marca como 'expirada' las cotizaciones vencidas.
    Afecta a estados: 'pendiente' y 'enviada'.
    """
    Cotizacion = apps.get_model('cotizaciones', 'Cotizacion')
    hoy = date.today()
    
    qs = Cotizacion.objects.filter(
        estado__in=['pendiente', 'enviada'],
        fecha_vencimiento__lt=hoy
    )
    count = qs.update(estado='expirada')
    return f"Se expiraron {count} cotizaciones vencidas."

@shared_task
def refrescar_tipo_cambio_proyecciones() -> str:
    """
    Tarea diaria: Actualiza el tipo de cambio para cotizaciones 'pendiente'
    que tengan fecha de facturación HOY o FUTURA.
    Mantiene la estimación al día.
    """
    Cotizacion = apps.get_model('cotizaciones', 'Cotizacion')
    hoy = timezone.localdate()
    
    # Cotizaciones pendientes con fecha >= hoy (proyecciones o del día)
    qs = Cotizacion.objects.filter(
        estado='pendiente',
        fecha_facturacion__gte=hoy
    )
    
    count = 0
    for cot in qs:
        actualizar_tipo_cambio_cotizacion.delay(
            cotizacion_id=cot.id,
            actualizar_dolar=True,
            actualizar_uf=True
        )
        count += 1
        
    return f"Se programó actualización para {count} proyecciones futuras."
