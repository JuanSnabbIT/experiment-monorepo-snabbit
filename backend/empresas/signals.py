from django.db.models.signals import post_save
from django.dispatch import receiver
from empresas.models import Empresa, SucursalEmpresa

@receiver(post_save, sender=Empresa)
def crear_casa_matriz(sender, instance, created, **kwargs):
    if created:
        SucursalEmpresa.objects.create(
            nombre="Casa Matriz",
            empresa=instance,
            direccion=instance.direccion_principal
        )
