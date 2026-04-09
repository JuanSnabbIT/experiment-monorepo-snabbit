from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver


# Cache in-memory del estado anterior para detectar cambios
_estado_anterior_cache = {}


@receiver(pre_save, sender="ordentrabajov3.OrdenDeTrabajoV3")
def cachear_estado_anterior(sender, instance, **kwargs):
    """Guarda el estado anterior antes de que se guarde el modelo."""
    if instance.pk:
        try:
            from .models import OrdenDeTrabajoV3
            original = OrdenDeTrabajoV3.objects.get(pk=instance.pk)
            _estado_anterior_cache[instance.pk] = original.estado
        except sender.DoesNotExist:
            _estado_anterior_cache[instance.pk] = ""
    else:
        _estado_anterior_cache["new"] = ""


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
    else:
        estado_anterior = _estado_anterior_cache.pop(instance.pk, None)
        if estado_anterior is not None and estado_anterior != instance.estado:
            HistorialEstadoOTV3.objects.create(
                orden=instance,
                estado_anterior=estado_anterior,
                estado_nuevo=instance.estado,
                comentario=f"Cambio de estado: {estado_anterior} -> {instance.estado}",
            )
