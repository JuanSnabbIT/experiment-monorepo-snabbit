from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from ordentrabajov2.models import OrdenDeTrabajo
from retroalimentacion.utils import (
    crear_retroalimentacion_y_enviar_correo,
    crear_retroalimentacion_y_enviar_correo_otv3,
    reenviar_correo_retroalimentacion_v3,
)


@shared_task
def task_gestionar_retroalimentacion_para_orden(orden_id):
    try:
        orden = OrdenDeTrabajo.objects.get(pk=orden_id)
        crear_retroalimentacion_y_enviar_correo(orden)
        return f"Retroalimentacion creada y correo enviado para OT #{orden.id}"
    except OrdenDeTrabajo.DoesNotExist:
        return f"Orden {orden_id} no encontrada"


@shared_task
def crear_y_enviar_retroalimentacion_v3(otv3_id):
    """Crea la retroalimentacion para una OT V3 y envia el correo al solicitante."""
    try:
        crear_retroalimentacion_y_enviar_correo_otv3(otv3_id)
        return f"Retroalimentacion V3 creada para OT V3 #{otv3_id}"
    except Exception as exc:
        return f"Error al crear retroalimentacion V3 para OT V3 #{otv3_id}: {exc}"


@shared_task
def reenviar_correo_retroalimentacion_v3_task(otv3_id):
    """Reenvía el correo de retroalimentación a una OT V3 ya existente."""
    try:
        from ordentrabajov3.models import OrdenDeTrabajoV3
        otv3 = OrdenDeTrabajoV3.objects.get(pk=otv3_id)
        reenviar_correo_retroalimentacion_v3(otv3)
        return f"Correo de retroalimentacion reenviado para OT V3 #{otv3_id}"
    except Exception as exc:
        return f"Error al reenviar correo V3 para OT V3 #{otv3_id}: {exc}"


@shared_task
def verificar_retroalimentaciones_v3_pendientes():
    """
    Tarea periodica (crontab horario) que:
    1. Marca como vencidas las retroalimentaciones V3 caducadas cuya OT sigue en retroalimentacion.
    2. Envia recordatorios cada 24h a retroalimentaciones pendientes no vencidas.
    """
    from retroalimentacion.models import Retroalimentacion
    from ordentrabajov3.models import OrdenDeTrabajoV3
    from ordentrabajov3.estados_modelo import ESTADO_RETROALIMENTACION, ESTADO_POR_FACTURAR
    from core.tasks import send_email_task
    from core.pdf.canvas_utils import get_logo_empresa_b64
    from django.conf import settings
    import os

    frontend_url = getattr(settings, "FRONTEND_URL", os.getenv("FRONTEND_URL", "http://127.0.0.1:5173"))
    ahora = timezone.now()

    pendientes = (
        Retroalimentacion.objects.filter(
            orden_trabajo_v3__isnull=False,
            fecha_retroalimentacion__isnull=True,
        )
        .select_related(
            "orden_trabajo_v3",
            "usuario_empresa__usuario",
        )
    )

    for retro in pendientes:
        otv3 = retro.orden_trabajo_v3

        # Si la OT ya no esta en retroalimentacion, ignorar
        if otv3.estado != ESTADO_RETROALIMENTACION:
            continue

        # Vencida: avanzar la OT automaticamente a por_facturar
        if retro.fecha_vencimiento and ahora > retro.fecha_vencimiento:
            otv3.estado = ESTADO_POR_FACTURAR
            otv3.save(update_fields=["estado"])
            # Registrar historial
            try:
                from ordentrabajov3.models import HistorialEstadoOTV3
                ultimo = HistorialEstadoOTV3.objects.filter(
                    orden=otv3,
                    estado_nuevo=ESTADO_POR_FACTURAR,
                ).order_by("-fecha_creacion").first()
                if ultimo:
                    ultimo.comentario = "Retroalimentacion vencida — avance automatico"
                    ultimo.save(update_fields=["comentario"])
            except Exception:
                pass
            continue

        # Recordatorio: enviar si han pasado >= 24h desde el ultimo envio
        umbral = retro.fecha_ultimo_recordatorio or retro.fecha_creacion
        if ahora - umbral < timedelta(hours=24):
            continue

        email = retro.correo_usuario_externo
        nombre = (
            retro.usuario_empresa.usuario.get_nombre_completo()
            if retro.usuario_empresa
            else (retro.usuario_externo or "Cliente")
        )
        if not email:
            continue

        url = f"{frontend_url}/retroalimentacion-orden-trabajo-v3/{retro.uuid}"
        empresa_nombre = getattr(otv3.empresa, "nombre", "Nuestra empresa")

        html_body = (
            f"<p>Estimado/a <strong>{nombre}</strong>,</p>"
            f"<p>Te recordamos que tienes pendiente la evaluacion del servicio recibido "
            f"para la orden <strong>\"{otv3.titulo}\"</strong>, prestado por "
            f"<strong>{empresa_nombre}</strong>.</p>"
            f"<p style='background:#e8f4fd;border-left:4px solid #2196f3;padding:10px 14px;margin:16px 0;'>"
            f"<strong>Tu opinion es importante.</strong><br>"
            f"La encuesta toma menos de 2 minutos y nos ayuda a mejorar la calidad del servicio."
            f"</p>"
            f"<p>Si ya completaste la evaluacion, por favor ignora este mensaje.</p>"
        )

        logo_b64 = get_logo_empresa_b64(getattr(otv3, 'empresa', None))

        send_email_task.delay(
            subject=f"Recordatorio: Evalua el servicio recibido — {otv3.titulo}",
            recipient_list=[email],
            html_body=html_body,
            titulo="Recordatorio de Encuesta",
            url_boton=url,
            text_boton="Completar Encuesta",
            logo_empresa_b64=logo_b64,
            empresa_nombre=getattr(otv3, 'empresa', None) and getattr(otv3.empresa, 'nombre', None),
        )

        retro.recordatorios_enviados += 1
        retro.fecha_ultimo_recordatorio = ahora
        retro.save(update_fields=["recordatorios_enviados", "fecha_ultimo_recordatorio"])

    return "Verificacion de retroalimentaciones V3 completada"
