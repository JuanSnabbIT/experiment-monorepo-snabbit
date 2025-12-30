from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import (
    OrdenDeTrabajo,
    SoporteTecnico,
    ServicioEnOT,
    CierreAdministrativoOT,
)

@receiver(post_save, sender=OrdenDeTrabajo)
def crear_registros_iniciales_y_cierre(sender, instance, created, **kwargs):
    """Crea registros iniciales según el tipo de servicio y el cierre administrativo al pasar a estado 'cerrada'.
    - SoporteTecnico inicial para tipos soporte.
    - ServicioEnOT inicial para tipo general.
    - CierreAdministrativoOT al cerrar si aún no existe.
    Idempotente mediante get_or_create y hasattr.
    """
    if created:
        if instance.tipo_servicio in ("soporte_r", "soporte_p"):
            SoporteTecnico.objects.get_or_create(
                orden=instance,
                defaults={
                    "nombre": "Soporte inicial",
                    "descripcion": "Registro automático de soporte",
                    "estado": "pendiente",
                    "tecnico_asignado": instance.tecnico_responsable_ot,
                    "fecha_soporte": instance.fecha_inicio_ot,
                },
            )
        elif instance.tipo_servicio == "general":
            ServicioEnOT.objects.get_or_create(
                orden=instance,
                defaults={
                    "nombre": "Servicio inicial",
                    "descripcion": "Registro automático de servicio",
                    "estado": "pendiente",
                    "tecnico_asignado": instance.tecnico_responsable_ot,
                    "fecha_servicio": instance.fecha_inicio_ot,
                },
            )
    # Crear cierre administrativo si la orden está cerrada y no existe aún
    if instance.estado == "cerrada" and not hasattr(instance, "cierre_administrativo_v2"):
        CierreAdministrativoOT.objects.create(
            orden=instance,
            valido=False,
            resultado={},
            comentario="Creado automáticamente al pasar a estado 'cerrada'",
        )
