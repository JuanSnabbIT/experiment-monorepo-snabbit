from django.db.models.signals import post_save
from django.dispatch import receiver
from cuentas.models import User
from .models import PersonalizacionUsuario, DescripcionGrupo
from django.contrib.auth.models import Group

@receiver(post_save, sender=User)
def create_personalizacion_usuario(sender, instance, created, **kwargs):
    if created:
        PersonalizacionUsuario.objects.create(usuario=instance)

@receiver(post_save, sender=Group)
def create_descripcion_grupo(sender, instance, created, **kwargs):
    """
    Signal que se activa después de guardar un objeto Group.
    Si es la primera creación (created == True), se crea la instancia de DescripcionGrupo vinculada.
    """
    if created:
        DescripcionGrupo.objects.create(group=instance)