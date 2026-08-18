import logging
import re
import unicodedata
from datetime import date, timedelta

from celery import shared_task
from django.core.cache import cache
from django.db.models import Q
from django.utils import timezone

logger = logging.getLogger(__name__)

CACHE_PREFIX_AFP = "afp_afiliacion:"
CACHE_TTL_AFP = 30 * 24 * 3600  # 30 dias


def _normalizar_nombre_afp(nombre):
    """Normaliza un nombre de AFP para comparar: sin acentos, sin 'AFP ', upper, sin espacios extra."""
    if not nombre:
        return ""
    sin_acentos = "".join(
        c for c in unicodedata.normalize("NFD", str(nombre)) if unicodedata.category(c) != "Mn"
    )
    limpio = re.sub(r"\s+", " ", sin_acentos).strip().upper()
    limpio = re.sub(r"^AFP\s+", "", limpio)
    return limpio


def _match_afp_catalogo(afp_nombre, empresa_id):
    """Resuelve el nombre scrapeado de AFP a un AfpCatalogo.id (global + empresa).

    Devuelve el id si hay match exacto tras normalizar; None en otro caso.
    NO crea registros nuevos.
    """
    from .models import AfpCatalogo

    objetivo = _normalizar_nombre_afp(afp_nombre)
    if not objetivo:
        return None
    qs = AfpCatalogo.objects.filter(activo=True).filter(
        Q(empresa__isnull=True) | Q(empresa_id=empresa_id)
    )
    for afp in qs:
        if _normalizar_nombre_afp(afp.nombre) == objetivo:
            return afp.id
    return None


@shared_task
def consultar_afiliacion_afp(rut, empresa_id=None):
    """Consulta la afiliacion AFP/AFC de un RUT en spensiones.cl y cachea 30 dias.

    Hace el scraping, resuelve el AFP contra el catalogo de la empresa y guarda
    el resultado en Redis bajo 'afp_afiliacion:{rut_sin_guion}'. Retorna el dict.
    """
    from .afp_scraper import AfpScraperError, consultar_afiliacion, rut_sin_guion

    cache_key = f"{CACHE_PREFIX_AFP}{rut_sin_guion(rut)}"
    try:
        resultado = consultar_afiliacion(rut)
    except AfpScraperError as exc:
        logger.warning("Consulta AFP fallida para %s: %s", rut, exc)
        error_payload = {"status": "failed", "error": str(exc)}
        cache.set(cache_key, error_payload, 60 * 10)  # cachear el error 10 min
        return error_payload

    resultado["afp_id"] = _match_afp_catalogo(resultado.get("afp_nombre"), empresa_id)
    resultado["consultado_en"] = timezone.now().isoformat()
    resultado["status"] = "completed"
    cache.set(cache_key, resultado, CACHE_TTL_AFP)
    return resultado


@shared_task
def verificar_contratos_vencidos():
    """Transita contratos plazo_fijo cuya fecha_termino venció de vigente a vencido.

    Se ejecuta diariamente. El lazy fallback en ContratoTrabajadorViewSet.retrieve()
    cubre el caso de contratos que vencieron antes de que esta tarea corriera.
    """
    from .models import ContratoTrabajador

    contratos = ContratoTrabajador.objects.filter(
        estado="vigente",
        tipo_contrato="plazo_fijo",
        fecha_termino__lt=date.today(),
    )
    count = 0
    for contrato in contratos:
        contrato.estado = "vencido"
        contrato._change_reason = "[SISTEMA] Transición automática por vencimiento de plazo"
        contrato.save(update_fields=["estado", "fecha_modificacion"])
        count += 1
    return f"{count} contratos transitados a vencido"


DIAS_AVISO_VENCIMIENTO = 7


@shared_task
def avisar_contratos_proximos_a_vencer():
    """Avisa (correo a RRHH + notificacion in-app) los contratos plazo_fijo
    que vencen dentro de DIAS_AVISO_VENCIMIENTO dias.

    Se ejecuta diariamente. `aviso_vencimiento_enviado` evita reenviar el
    aviso mas de una vez por contrato (no se resetea si luego se prorroga
    con una fecha_termino distinta a la que ya fue avisada, ya que un
    cambio real de fecha amerita revisar el contrato de todas formas).
    """
    from .models import ContratoTrabajador
    from .services import RRHHContratosService, RRHHContratosServiceException

    limite = date.today() + timedelta(days=DIAS_AVISO_VENCIMIENTO)

    contratos = ContratoTrabajador.objects.filter(
        estado="vigente",
        tipo_contrato="plazo_fijo",
        fecha_termino__gte=date.today(),
        fecha_termino__lte=limite,
        aviso_vencimiento_enviado=False,
    ).select_related("usuario_empresa__usuario", "usuario_empresa__sucursal__empresa")

    count = 0
    for contrato in contratos:
        try:
            RRHHContratosService.enviar_aviso_vencimiento(contrato)
        except RRHHContratosServiceException as exc:
            logger.warning(
                "Aviso de vencimiento omitido para contrato %s: %s", contrato.id, exc,
            )
            continue
        count += 1

    return f"{count} avisos de vencimiento enviados"
