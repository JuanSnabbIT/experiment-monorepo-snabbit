"""Servicios de notificaciones: orquestacion de eventos de negocio.

Estas funciones son los puntos de entrada que los hooks de cada modulo deben llamar.
Cada funcion:
- Resuelve los destinatarios segun reglas de negocio.
- Verifica que el tipo de evento este activo para la empresa.
- Excluye al usuario que dispara la accion (si aplica).
- Encola la tarea Celery de envio push.
"""

from __future__ import annotations

import logging
from typing import Iterable

from django.contrib.auth.models import Group

from .models import (
    ConfiguracionNotificacionEmpresa,
    TipoEventoNotificacion,
)

logger = logging.getLogger(__name__)


# Nombres de grupos Django que deben existir (creados en seed_base.py).
GRUPO_CONTABILIDAD = "contabilidad"
GRUPO_COMPRADOR = "comprador"
GRUPO_TECNICO = "tecnico"


def _usuarios_en_rol_de_empresa(empresa, nombre_grupo: str) -> list[int]:
    """Retorna ids de Users activos del rol indicado dentro de la empresa.

    Filtra por `UsuarioEmpresa.sucursal.empresa == empresa` para evitar fuga
    de datos entre empresas (multi-tenancy).
    """
    if empresa is None:
        return []

    from empresas.models import UsuarioEmpresa  # import local para evitar ciclos

    grupo = Group.objects.filter(name=nombre_grupo).first()
    if grupo is None:
        logger.warning(
            "Grupo '%s' no existe; ningun usuario sera notificado.", nombre_grupo
        )
        return []

    qs = UsuarioEmpresa.objects.filter(
        sucursal__empresa=empresa,
        grupos=grupo,
        usuario__is_active=True,
    ).values_list("usuario_id", flat=True).distinct()

    return list(qs)


def _disparar(
    usuario_ids: Iterable[int],
    tipo: str,
    titulo: str,
    cuerpo: str,
    url_destino: str,
    datos: dict | None,
    excluir_usuario_id: int | None,
) -> None:
    """Llama la tarea Celery de envio push, excluyendo a `excluir_usuario_id`."""
    destinatarios = [uid for uid in set(usuario_ids) if uid and uid != excluir_usuario_id]
    if not destinatarios:
        return

    # Import local para evitar ciclos al importar el modulo.
    from .tasks import send_fcm_push_task

    send_fcm_push_task.delay(
        usuario_ids=destinatarios,
        tipo=tipo,
        titulo=titulo,
        cuerpo=cuerpo,
        url_destino=url_destino,
        datos=datos or {},
    )


# ----------------------------------------------------------------------------
# E1 — Prefactura paso a "Por Facturar" -> notificar a Contabilidad de la empresa
# ----------------------------------------------------------------------------
def notificar_prefactura_por_facturar(prefactura, *, usuario_actor=None) -> None:
    """Hook E1.

    Args:
        prefactura: instancia `CierreAdministrativoOT` recien transitada a `por_facturar`.
        usuario_actor: User que disparo la accion (para excluirlo).
    """
    try:
        # Soporta CierreAdministrativoOT (v2, tiene .orden FK)
        # y PrefacturaOTV3 (v3, tiene .ots M2M o .ot FK nullable)
        if hasattr(prefactura, "orden") and prefactura.orden:
            empresa = prefactura.orden.empresa
        elif hasattr(prefactura, "ot") and prefactura.ot:
            empresa = prefactura.ot.empresa
        elif hasattr(prefactura, "ots"):
            primera_ot = prefactura.ots.first()
            empresa = primera_ot.empresa if primera_ot else None
        else:
            empresa = None
    except Exception:
        empresa = None

    tipo = TipoEventoNotificacion.PREFACTURA_POR_FACTURAR.value
    if not ConfiguracionNotificacionEmpresa.esta_activo(empresa, tipo):
        return

    usuario_ids = _usuarios_en_rol_de_empresa(empresa, GRUPO_CONTABILIDAD)
    if not usuario_ids:
        return

    # Resolver ot_id para mensaje y URL
    if hasattr(prefactura, "orden") and prefactura.orden:
        ot_id = prefactura.orden.id
    elif hasattr(prefactura, "ot") and prefactura.ot:
        ot_id = prefactura.ot.id
    elif hasattr(prefactura, "ots"):
        primera_ot = prefactura.ots.first()
        ot_id = primera_ot.id if primera_ot else None
    else:
        ot_id = None
    titulo = "Prefactura lista para facturar"
    cuerpo = f"OT #{ot_id} tiene una prefactura lista para emitir factura."
    url_destino = f"/ordenes-trabajo/{ot_id}" if ot_id else ""

    actor_id = getattr(usuario_actor, "id", None)
    _disparar(
        usuario_ids=usuario_ids,
        tipo=tipo,
        titulo=titulo,
        cuerpo=cuerpo,
        url_destino=url_destino,
        datos={"orden_trabajo_id": ot_id, "prefactura_id": prefactura.pk},
        excluir_usuario_id=actor_id,
    )


# ----------------------------------------------------------------------------
# E2 — Guia de salida requiere firma del tecnico asignado
# ----------------------------------------------------------------------------
def notificar_guia_requiere_firma(guia, *, usuario_actor=None) -> None:
    """Hook E2.

    Notifica unicamente al tecnico (`guia.recibido_por`) cuando este definido.
    """
    try:
        empresa = guia.bodega.sucursal.empresa  # type: ignore[attr-defined]
    except Exception:
        empresa = None

    tipo = TipoEventoNotificacion.GUIA_REQUIERE_FIRMA.value
    if not ConfiguracionNotificacionEmpresa.esta_activo(empresa, tipo):
        return

    recibido_por = getattr(guia, "recibido_por", None)
    if recibido_por is None or getattr(recibido_por, "usuario_id", None) is None:
        return

    usuario_id = recibido_por.usuario_id
    titulo = "Guia de salida pendiente de firma"
    cuerpo = f"La guia de salida #{guia.pk} requiere tu firma."
    url_destino = f"/bodegas/guias-salida/{guia.pk}"

    actor_id = getattr(usuario_actor, "id", None)
    _disparar(
        usuario_ids=[usuario_id],
        tipo=tipo,
        titulo=titulo,
        cuerpo=cuerpo,
        url_destino=url_destino,
        datos={"guia_id": guia.pk},
        excluir_usuario_id=actor_id,
    )


# ----------------------------------------------------------------------------
# E3 — Stock bajo el minimo: notificar a Compradores de la empresa
# ----------------------------------------------------------------------------
def notificar_stock_bajo(stock_item, *, usuario_actor=None) -> None:
    """Hook E3.

    Reglas:
    - Se ejecuta DESPUES de un movimiento de salida.
    - Solo dispara si `stock_item.cantidad <= stock_item.stock_minimo` y
      `stock_item.alerta_stock_enviada == False`.
    - Marca `alerta_stock_enviada=True` para evitar notificaciones repetidas.
    - Cuando el stock vuelve a subir por encima del minimo, otro hook (en `registrar_entrada`/
      `registrar_devolucion`/`registrar_ajuste_*`) debera resetear el flag a False.
    """
    try:
        empresa = stock_item.bodega.sucursal.empresa  # type: ignore[attr-defined]
    except Exception:
        empresa = None

    tipo = TipoEventoNotificacion.STOCK_BAJO_MINIMO.value
    if not ConfiguracionNotificacionEmpresa.esta_activo(empresa, tipo):
        return

    if stock_item.alerta_stock_enviada:
        return  # ya notificamos y no se ha repuesto
    if stock_item.stock_minimo <= 0:
        return  # sin minimo configurado, no aplica
    if stock_item.cantidad > stock_item.stock_minimo:
        return  # aun esta sobre el minimo

    usuario_ids = _usuarios_en_rol_de_empresa(empresa, GRUPO_COMPRADOR)
    if not usuario_ids:
        # Igual marcamos como enviada para no recalcular constantemente
        stock_item.alerta_stock_enviada = True
        stock_item.save(update_fields=["alerta_stock_enviada"])
        return

    item_nombre = getattr(stock_item.item, "nombre", f"#{stock_item.item_id}")
    bodega_nombre = getattr(stock_item.bodega, "nombre", f"#{stock_item.bodega_id}")
    titulo = "Stock bajo el minimo"
    cuerpo = (
        f"'{item_nombre}' en bodega '{bodega_nombre}' quedo en {stock_item.cantidad} "
        f"(minimo: {stock_item.stock_minimo})."
    )
    url_destino = f"/bodegas/{stock_item.bodega_id}/stock"

    actor_id = getattr(usuario_actor, "id", None)
    _disparar(
        usuario_ids=usuario_ids,
        tipo=tipo,
        titulo=titulo,
        cuerpo=cuerpo,
        url_destino=url_destino,
        datos={
            "stock_item_id": stock_item.pk,
            "bodega_id": stock_item.bodega_id,
            "item_id": stock_item.item_id,
        },
        excluir_usuario_id=actor_id,
    )

    stock_item.alerta_stock_enviada = True
    stock_item.save(update_fields=["alerta_stock_enviada"])


def resetear_alerta_stock_si_repuesto(stock_item) -> None:
    """Resetea `alerta_stock_enviada=False` cuando el stock vuelve sobre el minimo.

    Llamada desde `registrar_entrada`, `registrar_devolucion`, ajustes positivos.
    """
    if not stock_item.alerta_stock_enviada:
        return
    if stock_item.stock_minimo <= 0:
        return
    if stock_item.cantidad > stock_item.stock_minimo:
        stock_item.alerta_stock_enviada = False
        stock_item.save(update_fields=["alerta_stock_enviada"])
