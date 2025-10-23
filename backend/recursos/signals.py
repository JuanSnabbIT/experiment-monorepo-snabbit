from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import *

# @receiver(post_save, sender=Equipo)
# def crear_usuario_equipo(sender, instance, created, **kwargs):
#     if instance.asignado_a and created:  # Verifica que tenga un usuario asignado
#         UsuarioEquipo.objects.get_or_create(
#             equipo=instance,
#             usuario=instance.asignado_a,
#             fecha_devolucion=None,  # Solo asignaciones activas
#             defaults={'estado': True}  # Estado activo por defecto
#         )
