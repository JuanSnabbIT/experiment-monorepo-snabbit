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
    # Crear cierre administrativo si la orden está cerrada y no existe una prefactura que la incluya
    if instance.estado == "cerrada":
        prefacturas = CierreAdministrativoOT.objects.filter(
            cliente_id=instance.cliente_id,
            estado_cierre__in=["borrador", "en_revision", "aprobado", "facturado", "pagado"],
        ).only("id", "resultado")
        for prefactura in prefacturas:
            resultado = prefactura.resultado or {}
            ots_incluidas = resultado.get("ots_incluidas", [])
            if isinstance(ots_incluidas, list) and instance.id in ots_incluidas:
                return

        CierreAdministrativoOT.objects.create(
            cliente=instance.cliente,
            creado_por=instance.tecnico_responsable_ot,
            actualizado_por=instance.tecnico_responsable_ot,
            estado_cierre="borrador",
            resultado={
                "cliente_id": instance.cliente_id,
                "ots_incluidas": [instance.id],
                "items": [],
                "resumen": {},
            },
            comentario="Creado automaticamente al pasar a estado 'cerrada'",
        )
