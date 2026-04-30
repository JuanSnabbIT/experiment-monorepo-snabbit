from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver


# Cache in-memory del estado anterior para detectar cambios
_estado_anterior_cache = {}
_tecnico_anterior_cache = {}


@receiver(pre_save, sender="ordentrabajov3.OrdenDeTrabajoV3")
def cachear_estado_anterior(sender, instance, **kwargs):
    """Guarda estado y técnico anteriores antes de que se guarde el modelo."""
    if instance.pk:
        try:
            from .models import OrdenDeTrabajoV3
            original = OrdenDeTrabajoV3.objects.get(pk=instance.pk)
            _estado_anterior_cache[instance.pk] = original.estado
            _tecnico_anterior_cache[instance.pk] = original.tecnico_responsable_id
        except sender.DoesNotExist:
            _estado_anterior_cache[instance.pk] = ""
            _tecnico_anterior_cache[instance.pk] = None
    else:
        _estado_anterior_cache["new"] = ""
        _tecnico_anterior_cache["new"] = None


@receiver(post_save, sender="ordentrabajov3.OrdenDeTrabajoV3")
def registrar_historial_estado(sender, instance, created, **kwargs):
    """
    Registra automaticamente un HistorialEstadoOTV3 cuando cambia el estado de una OT.
    """
    from .models import HistorialEstadoOTV3

    if created:
        HistorialEstadoOTV3.objects.create(
            orden=instance,
            estado_anterior="",
            estado_nuevo=instance.estado,
            comentario="OT creada",
        )
        _estado_anterior_cache.pop("new", None)
        _tecnico_anterior_cache.pop("new", None)
    else:
        estado_anterior = _estado_anterior_cache.pop(instance.pk, None)
        if estado_anterior is not None and estado_anterior != instance.estado:
            HistorialEstadoOTV3.objects.create(
                orden=instance,
                estado_anterior=estado_anterior,
                estado_nuevo=instance.estado,
                comentario=f"Cambio de estado: {estado_anterior} -> {instance.estado}",
            )


# ── Hooks de notificaciones FCM (lote SEB-275..301) ──
@receiver(post_save, sender="ordentrabajov3.OrdenDeTrabajoV3")
def fcm_hook_ot_v3(sender, instance, created, **kwargs):
    """Dispara N1 (asignación), N10 (cambio estado), N11 (facturada) para OT V3.

    Falla silenciosamente para no romper el flujo.
    """
    import logging

    logger_local = logging.getLogger(__name__)
    tecnico_anterior_id = _tecnico_anterior_cache.pop(instance.pk, None)
    tecnico_actual_id = instance.tecnico_responsable_id

    # N1: asignación / reasignación
    try:
        if tecnico_actual_id and tecnico_actual_id != tecnico_anterior_id:
            from notificaciones.services import notificar_ot_asignada_tecnico

            notificar_ot_asignada_tecnico(
                instance, tecnico_actual_id, usuario_actor=None
            )
    except Exception:
        logger_local.exception("Hook FCM N1 (OT v3 asignación) fallo (silencioso).")

    # N10/N11: cambios de estado. El cache ya fue popeado por registrar_historial_estado,
    # así que reconsultamos via el HistorialEstadoOTV3 más reciente si fue creado.
    if created:
        return
    try:
        from .models import HistorialEstadoOTV3
        ultimo = (
            HistorialEstadoOTV3.objects
            .filter(orden=instance)
            .order_by("-fecha_creacion")
            .first()
        )
        if not ultimo or ultimo.estado_anterior == "" or ultimo.estado_anterior == ultimo.estado_nuevo:
            return
        if ultimo.estado_nuevo != instance.estado:
            return

        from notificaciones.services import (
            notificar_ot_cambio_estado,
            notificar_ot_cerrada_facturada,
        )

        notificar_ot_cambio_estado(
            instance, ultimo.estado_anterior, ultimo.estado_nuevo, usuario_actor=None
        )
        if instance.estado == "facturada":
            notificar_ot_cerrada_facturada(instance, usuario_actor=None)
    except Exception:
        logger_local.exception("Hook FCM N10/N11 (OT v3 estado) fallo (silencioso).")
