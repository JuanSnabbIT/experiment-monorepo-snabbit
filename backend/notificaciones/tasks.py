"""Tareas Celery de la app notificaciones."""

from __future__ import annotations

import logging
from datetime import timedelta

from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task(name="notificaciones.send_fcm_push_task")
def send_fcm_push_task(
    usuario_ids: list[int],
    tipo: str,
    titulo: str,
    cuerpo: str,
    url_destino: str = "",
    datos: dict | None = None,
) -> dict:
    """Envia push a una lista de usuarios y crea su historial de Notificacion.

    El historial se crea SIEMPRE (incluso si el envio FCM falla),
    para que el usuario pueda ver la notificacion en la campana del header.
    """
    from .fcm_client import enviar_push_a_tokens
    from .models import FCMToken, Notificacion

    if not usuario_ids:
        return {"creadas": 0, "tokens_invalidos": 0}

    datos = datos or {}

    # 1) Crear historial por usuario.
    notificaciones = [
        Notificacion(
            usuario_id=uid,
            tipo=tipo,
            titulo=titulo,
            cuerpo=cuerpo,
            url_destino=url_destino,
            datos=datos,
        )
        for uid in usuario_ids
    ]
    Notificacion.objects.bulk_create(notificaciones)

    # 2) Recopilar tokens activos.
    tokens = list(
        FCMToken.objects.filter(
            usuario_id__in=usuario_ids, activo=True
        ).values_list("token", flat=True)
    )
    if not tokens:
        return {"creadas": len(notificaciones), "tokens_invalidos": 0}

    # 3) Enviar push.
    invalidos, exitosos = enviar_push_a_tokens(
        tokens=tokens,
        titulo=titulo,
        cuerpo=cuerpo,
        url_destino=url_destino,
        datos=datos,
    )

    # 4) Marcar tokens invalidos como inactivos.
    if invalidos:
        FCMToken.objects.filter(token__in=invalidos).update(activo=False)

    return {
        "creadas": len(notificaciones),
        "enviados_ok": len(exitosos),
        "tokens_invalidos": len(invalidos),
    }


@shared_task(name="notificaciones.purgar_notificaciones_antiguas")
def purgar_notificaciones_antiguas(dias: int = 30) -> int:
    """Elimina notificaciones del historial con mas de `dias` dias de antiguedad."""
    from .models import Notificacion

    limite = timezone.now() - timedelta(days=dias)
    eliminadas, _ = Notificacion.objects.filter(fecha_creacion__lt=limite).delete()
    logger.info("Purga de notificaciones: %s eliminadas (>%s dias).", eliminadas, dias)
    return eliminadas
