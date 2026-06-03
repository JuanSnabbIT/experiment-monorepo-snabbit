"""Signals del modulo RRHH."""

from django.db import models, transaction
from django.db.models.signals import pre_save
from django.dispatch import receiver

from .models import AnexoContrato


@receiver(pre_save, sender=AnexoContrato)
def asignar_numero_anexo(sender, instance, **kwargs):
    """Asigna numero correlativo por contrato al crear un anexo.

    Usa select_for_update + Max para evitar duplicados bajo concurrencia.
    """
    if instance.pk is not None:
        return

    with transaction.atomic():
        ultimo = (
            AnexoContrato.objects.select_for_update()
            .filter(contrato=instance.contrato)
            .aggregate(models.Max("numero_anexo"))["numero_anexo__max"]
        )
        instance.numero_anexo = (ultimo or 0) + 1
