import logging
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Any, Optional, Tuple

import requests
from celery import shared_task
from django.apps import apps
from django.core.cache import cache
from django.db.models import Q
from django.utils import timezone

"""
Tasks para el módulo de cotizaciones.
Maneja la obtención asíncrona de indicadores económicos (Dólar, UF)
y tareas de mantenimiento (expiración de cotizaciones).
"""

logger = logging.getLogger(__name__)

MINDICADOR_API_URL = "https://mindicador.cl/api"
CACHE_TIMEOUT_SECONDS = 60 * 60 * 24  # 24 horas
API_TIMEOUT_SECONDS = 20  # Aumentado a 20 segundos para conexiones lentas


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
        return datetime.fromisoformat(date_str.replace("Z", "")).date()
    except ValueError:
        return None


# Logica Core
def obtener_tipo_cambio_mindicador_con_fallback(
    indicator: str, target_date: Any
) -> Tuple[Decimal, date]:
    """
    Núcleo unificado para obtener indicadores económicos (Dólar, UF).

    Estrategia de obtención (4 niveles de fallback):
    1. Base de Datos (IndicadorEconomico) - Caché persistente.
    2. Cache Redis (24 horas) - Caché temporal rápido.
    3. API Mindicador (Fecha exacta + historial).
    4. Fallback BD histórico (Cotizaciones anteriores).

    Al obtener de API, guarda automáticamente en BD para futuras consultas.

    NOTA: Esta función es importada desde bodegas/views.py para obtener tipos de cambio
    en operaciones de compra. No debe ser modificada sin coordinar cambios en ese módulo.

    Args:
        indicator: 'dolar' o 'uf'
        target_date: Fecha objetivo (str ISO, datetime, o date)

    Returns:
        Tuple[Decimal, date]: (valor_indicador, fecha_referencia)

    Raises:
        ValueError: Si no hay indicador disponible en ninguna fuente
    """
    IndicadorEconomico = apps.get_model("core", "IndicadorEconomico")

    # Estandarizar fecha
    if isinstance(target_date, str):
        target_date = datetime.fromisoformat(target_date.replace("Z", "")).date()
    elif isinstance(target_date, datetime):
        target_date = target_date.date()

    # Normalizar fecha (API Mindicador no tiene datos de fines de semana)
    search_date = _get_previous_business_day(target_date)
    cache_key = f"cotizaciones:indicator:{indicator}:{search_date.isoformat()}"

    # 1. BD (IndicadorEconomico) - Caché persistente
    try:
        indicador_bd = IndicadorEconomico.objects.get(tipo=indicator, fecha=search_date)
        logger.info(
            f"✅ {indicator} desde BD: ${indicador_bd.valor} ({search_date})"
        )
        return indicador_bd.valor, indicador_bd.fecha
    except IndicadorEconomico.DoesNotExist:
        pass

    # 2. Cache Redis - Caché temporal
    cached_val = cache.get(cache_key)
    if cached_val:
        logger.info(f"✅ {indicator} desde Redis: ${cached_val} ({search_date})")
        return Decimal(str(cached_val)), search_date

    # 3. API Mindicador
    api_val, api_date = _fetch_from_api(indicator, search_date)

    if api_val:
        # Guardar en BD (persistente) - usar get_or_create para evitar duplicados
        IndicadorEconomico.objects.get_or_create(
            tipo=indicator,
            fecha=api_date or search_date,
            defaults={"valor": api_val, "fuente": "mindicador.cl"}
        )
        # Guardar en Redis (rápido)
        cache.set(cache_key, str(api_val), timeout=CACHE_TIMEOUT_SECONDS)
        logger.info(
            f"✅ {indicator} desde API y guardado en BD: ${api_val} ({api_date or search_date})"
        )
        return api_val, api_date or search_date

    # 4. Fallback: Buscar fecha anterior en BD (IndicadorEconomico)
    indicador_historico = IndicadorEconomico.objects.filter(
        tipo=indicator,
        fecha__lte=search_date
    ).order_by("-fecha").first()

    if indicador_historico:
        logger.info(
            f"⚠️ {indicator} desde BD (histórico): ${indicador_historico.valor} ({indicador_historico.fecha})"
        )
        return indicador_historico.valor, indicador_historico.fecha

    # 5. Fallback final: Cotizaciones anteriores (legacy)
    return _fetch_from_db_last_known(indicator, search_date)


def _fetch_from_api(
    indicator: str, search_date: date
) -> Tuple[Optional[Decimal], Optional[date]]:
    """Consulta la API de mindicador con lógica de reintento/serie."""
    formatted_date = search_date.strftime("%d-%m-%Y")
    url_direct = f"{MINDICADOR_API_URL}/{indicator}/{formatted_date}"

    try:
        # Intento 1: Fecha específica
        logger.info(f"Consultando API {indicator} para {formatted_date}...")
        resp = requests.get(url_direct, timeout=API_TIMEOUT_SECONDS)

        if resp.ok:
            data = resp.json()
            serie = data.get("serie", [])
            if serie:
                val = Decimal(str(serie[0]["valor"]))
                date_obj = _parse_mindicador_date(serie[0]["fecha"])
                logger.info(f"API {indicator} exitosa: ${val} (fecha: {date_obj})")
                return val, date_obj

        logger.warning(
            f"API {indicator} devolvió estatus {resp.status_code} para {formatted_date}"
        )

        # Intento 2: Historial (si fecha específica falla, ej. feriado local no detectado)
        # Solo si el error no fue de conexión, sino de datos vacíos
        logger.info(f"Intentando historial de {indicator}...")
        url_series = f"{MINDICADOR_API_URL}/{indicator}"
        resp_series = requests.get(url_series, timeout=API_TIMEOUT_SECONDS)

        if resp_series.ok:
            data = resp_series.json()
            serie = data.get("serie", [])
            # Buscar el más cercano hacia atrás
            best_entry = None
            for entry in serie:
                entry_date = _parse_mindicador_date(entry["fecha"])
                if entry_date and entry_date <= search_date:
                    if best_entry is None:
                        best_entry = (entry, entry_date)
                    elif entry_date > best_entry[1]:
                        best_entry = (entry, entry_date)

            if best_entry:
                val = Decimal(str(best_entry[0]["valor"]))
                logger.info(
                    f"Historial {indicator} encontrado: ${val} (fecha: {best_entry[1]})"
                )
                return val, best_entry[1]

        logger.warning(f"Historial {indicator} sin datos para {search_date}")

    except requests.exceptions.Timeout as e:
        logger.error(
            f"⏱️  TIMEOUT consultando API Mindicador ({indicator}): {e}. Timeout: {API_TIMEOUT_SECONDS}s"
        )
    except requests.exceptions.ConnectionError as e:
        logger.error(
            f"🔌 ERROR DE CONEXIÓN consultando API Mindicador ({indicator}): {e}"
        )
    except requests.RequestException as e:
        logger.error(
            f"❌ Error consultando API Mindicador ({indicator}): {type(e).__name__}: {e}"
        )

    return None, None


def _fetch_from_db_last_known(indicator: str, max_date: date) -> Tuple[Decimal, date]:
    """
    Busca el último valor guardado en cotizaciones anteriores.
    Si no encuentra nada, lanza una excepción clara en lugar de retornar 0.

    Estrategia:
    - Para CUALQUIER fecha: busca el valor más reciente que sea anterior a max_date (exacto)
    - Para fechas FUTURAS SOLAMENTE: si no hay exacto, busca el valor más reciente sin límite
    - Para fechas PASADAS: si no hay exacto, lanza excepción (no hay datos históricos)
    """
    Cotizacion = apps.get_model("cotizaciones", "Cotizacion")
    field = "dolar_observado" if indicator == "dolar" else "valor_uf"
    today = timezone.localdate()

    # Búsqueda: Valor anterior a max_date (historico exacto)
    fallback = (
        Cotizacion.objects.filter(**{f"{field}__isnull": False, f"{field}__gt": 0})
        .filter(
            Q(fecha_tipo_cambio__lte=max_date)
            | Q(fecha_tipo_cambio__isnull=True, fecha_facturacion__lte=max_date)
        )
        .order_by("-fecha_tipo_cambio", "-fecha_facturacion")
        .first()
    )

    if fallback:
        val = getattr(fallback, field)
        ref_date = fallback.fecha_tipo_cambio or fallback.fecha_facturacion
        if val and val > 0:
            logger.info(
                f"Usando {indicator} de BD (histórico exacto): ${val} (fecha: {ref_date})"
            )
            return val, ref_date or max_date

    # Fallback SOLO para fechas FUTURAS: buscar el valor más reciente disponible
    if max_date > today:
        logger.warning(
            f"No hay cotización para {indicator} en {max_date} (futura), usando valor actual..."
        )
        fallback = (
            Cotizacion.objects.filter(**{f"{field}__isnull": False, f"{field}__gt": 0})
            .order_by("-fecha_tipo_cambio", "-fecha_facturacion")
            .first()
        )

        if fallback:
            val = getattr(fallback, field)
            ref_date = fallback.fecha_tipo_cambio or fallback.fecha_facturacion
            if val and val > 0:
                logger.info(
                    f"Usando {indicator} de BD (proyección): ${val} (fecha actual: {ref_date})"
                )
                return val, today  # Devolver HOY, no la fecha antigua

    # Para fechas PASADAS sin datos exactos: excepción clara
    logger.error(f"No hay tipo de cambio para {indicator} en {max_date}")
    raise ValueError(
        f"No hay tipo de cambio disponible para {indicator} en {max_date}. "
        f"Intente con una fecha más reciente o cargue manualmente el valor."
    )


# Tasks
@shared_task
def actualizar_tipo_cambio_cotizacion(
    cotizacion_id: int, actualizar_dolar: bool = True, actualizar_uf: bool = True
) -> str:
    """
    Actualiza los indicadores económicos (Dólar, UF) de una cotización específica.

    Se ejecuta de forma asíncrona desde:
    - perform_create(): Al crear una cotización (si no hay valores manuales)
    - perform_update(): Al editar (si cambió fecha_facturacion o no es manual)
    - action refrescar-tipo-cambio: Al hacer refresh manual
    - refrescar_tipo_cambio_proyecciones: Diariamente para cotizaciones futuras

    Args:
        cotizacion_id: ID de la cotización a actualizar
        actualizar_dolar: Si True, intenta obtener dólar_observado
        actualizar_uf: Si True, intenta obtener valor_uf

    Returns:
        str: Mensaje de resultado

    Raises:
        ValueError: Si no hay indicador disponible (propaga desde obtener_tipo_cambio_mindicador_con_fallback)
    """
    Cotizacion = apps.get_model("cotizaciones", "Cotizacion")
    try:
        cotizacion = Cotizacion.objects.get(id=cotizacion_id)
    except Cotizacion.DoesNotExist:
        logger.error(f"Cotización {cotizacion_id} no encontrada")
        return f"Cotización {cotizacion_id} no encontrada."

    target_date = cotizacion.fecha_facturacion or timezone.localdate()
    today = timezone.localdate()

    # SIEMPRE pedimos la fecha exacta al API. El API tiene histórico completo.
    # Solo sustituimos por HOY si la fecha es futura Y queremos "proyección del día"
    search_date = target_date

    logger.info(
        f"Actualizando cotización {cotizacion_id}: fecha_facturacion={target_date}, search_date={search_date}"
    )

    updated_fields = []
    errores = []

    # Dolar
    if actualizar_dolar:
        try:
            val, ref_date = obtener_tipo_cambio_mindicador_con_fallback(
                "dolar", search_date
            )
            if val > 0:
                cotizacion.dolar_observado = val
                # Solo actualizamos fecha referencia si no es UF (prioridad moneda)
                if cotizacion.tipo_moneda != "3":
                    # Usar ref_date del API, pero si fue fallback (ref_date es antigua) y es fecha futura,
                    # usar search_date en su lugar
                    is_fallback = (
                        ref_date != search_date
                    )  # Si dates no coinciden, vino de fallback
                    fecha_referencia = (
                        search_date if is_fallback and search_date > today else ref_date
                    )
                    cotizacion.fecha_tipo_cambio = fecha_referencia
                    updated_fields.append("fecha_tipo_cambio")
                updated_fields.append("dolar_observado")
                logger.info(
                    f"Dólar actualizado: ${val} (ref_date={ref_date}, guardando: {cotizacion.fecha_tipo_cambio})"
                )
        except ValueError as e:
            logger.warning(f"No se pudo obtener tipo de cambio dólar: {e}")
            errores.append(f"Dólar: {e}")

    # UF
    if actualizar_uf:
        try:
            val, ref_date = obtener_tipo_cambio_mindicador_con_fallback(
                "uf", search_date
            )
            if val > 0:
                cotizacion.valor_uf = val
                if cotizacion.tipo_moneda == "3":
                    # Usar ref_date del API, pero si fue fallback (ref_date es antigua) y es fecha futura,
                    # usar search_date en su lugar
                    is_fallback = (
                        ref_date != search_date
                    )  # Si dates no coinciden, vino de fallback
                    fecha_referencia = (
                        search_date if is_fallback and search_date > today else ref_date
                    )
                    cotizacion.fecha_tipo_cambio = fecha_referencia
                    updated_fields.append("fecha_tipo_cambio")
                updated_fields.append("valor_uf")
                logger.info(
                    f"UF actualizado: ${val} (ref_date={ref_date}, guardando: {cotizacion.fecha_tipo_cambio})"
                )
        except ValueError as e:
            logger.warning(f"No se pudo obtener tipo de cambio UF: {e}")
            errores.append(f"UF: {e}")

    # Actualizar estado según resultado
    if errores:
        # Hubo errores en la obtención
        cotizacion.estado_tipo_cambio = "error"
        cotizacion.error_tipo_cambio = " | ".join(errores)
        updated_fields.extend(["estado_tipo_cambio", "error_tipo_cambio"])
        logger.error(f"Cotización {cotizacion_id} con errores de tipo de cambio: {errores}")
    elif updated_fields:
        # Actualización exitosa
        cotizacion.estado_tipo_cambio = "actualizado"
        cotizacion.error_tipo_cambio = None
        updated_fields.extend(["estado_tipo_cambio", "error_tipo_cambio"])

    if updated_fields:
        # Eliminar duplicados manteniendo orden
        updated_fields = list(dict.fromkeys(updated_fields))
        cotizacion.save(update_fields=updated_fields)
        return f"Cotización {cotizacion_id} actualizada: {updated_fields}"

    return f"Cotización {cotizacion_id} sin cambios (API/DB sin datos nuevos)."


@shared_task
def expirar_cotizaciones_vencidas() -> str:
    """
    Marca como 'expirada' las cotizaciones vencidas.
    Afecta a estados: 'pendiente' y 'enviada'.
    Se ejecuta diariamente a medianoche vía celery beat.
    """
    Cotizacion = apps.get_model("cotizaciones", "Cotizacion")
    hoy = timezone.localdate()

    qs = Cotizacion.objects.filter(
        estado__in=["pendiente", "enviada"], fecha_vencimiento__lt=hoy
    )
    count = qs.update(estado="expirada")
    if count > 0:
        logger.info(
            f"Expiración de cotizaciones: {count} cotizaciones marcadas como expiradas"
        )
    return f"Se expiraron {count} cotizaciones vencidas."


@shared_task
def refrescar_tipo_cambio_proyecciones() -> str:
    """
    Tarea diaria: Actualiza el tipo de cambio para cotizaciones 'pendiente'
    que tengan fecha de facturación HOY o FUTURA.
    Mantiene la estimación al día.
    Se ejecuta diariamente a las 6 AM vía celery beat.
    """
    Cotizacion = apps.get_model("cotizaciones", "Cotizacion")
    hoy = timezone.localdate()

    # Cotizaciones pendientes con fecha >= hoy (proyecciones o del día)
    qs = Cotizacion.objects.filter(estado="pendiente", fecha_facturacion__gte=hoy)

    count = 0
    for cot in qs:
        try:
            actualizar_tipo_cambio_cotizacion.delay(
                cotizacion_id=cot.id, actualizar_dolar=True, actualizar_uf=True
            )
            count += 1
        except Exception as e:
            logger.error(f"Error encolando actualización para cotización {cot.id}: {e}")

    logger.info(
        f"Refrescador de tipo de cambio: se encolaron {count} actualizaciones para cotizaciones futuras"
    )
    return f"Se programó actualización para {count} proyecciones futuras."


@shared_task
def notificar_respuesta_cotizacion(
    cotizacion_id: int,
    accion: str,  # 'aprobada' o 'rechazada'
    solicitante_nombre: str,
    solicitante_email: str,
    items_aprobados: int = 0,
    motivo_rechazo: str = None,
) -> str:
    """
    Notifica al prestador de servicios (empresa emisora) cuando un cliente
    aprueba o rechaza una cotización vía el enlace público.

    Args:
        cotizacion_id: ID de la cotización
        accion: 'aprobada' o 'rechazada'
        solicitante_nombre: Nombre de quien respondió
        solicitante_email: Email de quien respondió
        items_aprobados: Cantidad de items aprobados (solo para aprobación)
        motivo_rechazo: Razón del rechazo (solo para rechazo)
    """
    from core.tasks import send_email_task
    from django.conf import settings

    Cotizacion = apps.get_model("cotizaciones", "Cotizacion")

    try:
        cotizacion = Cotizacion.objects.select_related("empresa", "cliente").get(
            id=cotizacion_id
        )
    except Cotizacion.DoesNotExist:
        return f"Cotización {cotizacion_id} no encontrada."

    # Obtener email de la empresa emisora
    empresa = cotizacion.empresa
    email_empresa = empresa.email

    if not email_empresa:
        logger.error(
            f"No se puede notificar: Empresa {empresa.id} ({empresa.nombre}) sin email configurado"
        )
        raise ValueError(
            f"Empresa {empresa.nombre} no tiene email configurado para notificaciones"
        )

    # Obtener FRONTEND_URL desde settings (más seguro que os.getenv)
    frontend_url = getattr(settings, "FRONTEND_URL", None)
    if not frontend_url:
        logger.error("FRONTEND_URL no está configurado en settings")
        raise ValueError("FRONTEND_URL no está configurado en settings")
    url_detalle = (
        f"{frontend_url}/cotizacion/detalle-cotizacion/{cotizacion.numero_cotizacion}"
    )

    if accion == "aprobada":
        subject = f"✅ Cotización N°{cotizacion.numero_cotizacion} APROBADA"
        emoji = "✅"
        accion_display = "APROBADA"
        color = "#28a745"
        detalle_extra = f"<p><strong>Items aprobados:</strong> {items_aprobados}</p>"
    else:
        subject = f"❌ Cotización N°{cotizacion.numero_cotizacion} RECHAZADA"
        emoji = "❌"
        accion_display = "RECHAZADA"
        color = "#dc3545"
        detalle_extra = ""
        if motivo_rechazo:
            detalle_extra = f"<p><strong>Motivo del rechazo:</strong></p><blockquote style='border-left: 3px solid {color}; padding-left: 10px; color: #666;'>{motivo_rechazo}</blockquote>"

    html_body = f"""
    <div style="font-family: Arial, sans-serif;">
        <h2 style="color: {color};">{emoji} Cotización {accion_display}</h2>
        <p>La cotización <strong>N°{cotizacion.numero_cotizacion}</strong> ha sido <strong style="color: {color};">{accion_display}</strong>.</p>
        
        <table style="border-collapse: collapse; margin: 15px 0;">
            <tr>
                <td style="padding: 5px 15px 5px 0; color: #666;">Cliente:</td>
                <td style="padding: 5px 0;"><strong>{cotizacion.cliente.nombre}</strong></td>
            </tr>
            <tr>
                <td style="padding: 5px 15px 5px 0; color: #666;">Respondió:</td>
                <td style="padding: 5px 0;">{solicitante_nombre} ({solicitante_email})</td>
            </tr>
            <tr>
                <td style="padding: 5px 15px 5px 0; color: #666;">Cotización:</td>
                <td style="padding: 5px 0;">{cotizacion.nombre}</td>
            </tr>
        </table>
        
        {detalle_extra}
        
        <p style="margin-top: 20px;">Para ver los detalles completos, haga clic en el siguiente enlace:</p>
    </div>
    """

    try:
        send_email_task.delay(
            subject=subject,
            recipient_list=[email_empresa],
            html_body=html_body,
            titulo=f"Cotización {cotizacion.numero_cotizacion} {accion_display}",
            url_boton=url_detalle,
            text_boton="Ver Cotización",
        )
        return f"Notificación enviada a {email_empresa} - Cotización {cotizacion.numero_cotizacion} {accion}"
    except Exception as e:
        logger.error(f"Error enviando notificación de respuesta: {e}")
        return f"Error enviando notificación: {e}"
