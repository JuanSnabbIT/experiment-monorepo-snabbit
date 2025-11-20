from core.models import ModeloBase
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db import models
from django.db.models import Q

from .estados_modelos import *


class CategoriaGastoRendicion(models.Model):
    nombre = models.CharField(max_length=100, verbose_name="Nombre de la categoría")
    descripcion = models.TextField(null=True, blank=True, verbose_name="Descripción")

    def __str__(self):
        return self.nombre


class Rendicion(ModeloBase):
    usuario = models.ForeignKey("empresas.UsuarioEmpresa", on_delete=models.CASCADE)
    fecha_rendicion = models.DateField(verbose_name="Fecha de la rendición")
    observaciones = models.TextField(
        null=True, blank=True, verbose_name="Observaciones"
    )
    estado = models.CharField(max_length=2, choices=ESTADOS_RENDICIONES, default="0")

    def __str__(self):
        return f"Rendición del {self.fecha_rendicion}"

    @property
    def total_rendicion(self):
        total = 0
        for item in self.items.all():
            det = item.detalle
            # Si el objeto referenciado ya no existe, lo ignoramos
            if det is None:
                continue

            ct = item.content_type
            # Gasto interno
            if ct.app_label == "rendiciones" and ct.model == "detallegastorendicion":
                total += det.monto_total
            # Gasto OT V2
            elif ct.app_label == "ordentrabajov2" and ct.model == "rendicionenot":
                total += det.monto_total
            # Compra
            elif ct.app_label == "bodegas" and ct.model == "compra":
                total += sum(
                    line.cantidad * line.precio for line in det.itemencompra_set.all()
                )

        return total

    class Meta:
        verbose_name = "Rendicion"
        verbose_name_plural = "Rendiciones"
        ordering = ["-fecha_creacion"]


class DetalleGastoRendicion(ModeloBase):
    categoria = models.ForeignKey(
        CategoriaGastoRendicion, on_delete=models.PROTECT, verbose_name="Categoría"
    )
    detalle = models.CharField(
        max_length=255, verbose_name="Detalle del gasto", null=True, blank=True
    )
    cantidad = models.PositiveIntegerField(verbose_name="Cantidad")
    monto_unitario = models.PositiveIntegerField(verbose_name="Monto unitario")
    monto_total = models.PositiveIntegerField(verbose_name="Monto total", blank=True)
    fecha_gasto = models.DateField()

    def save(self, *args, **kwargs):
        self.monto_total = self.cantidad * self.monto_unitario
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Detalle N°{self.pk} - {self.detalle}"

    class Meta:
        verbose_name = "Detalle Gasto Rendición"
        verbose_name_plural = "Detalles Gastos"
        ordering = ["-fecha_creacion"]


class ItemRendicion(ModeloBase):
    rendicion = models.ForeignKey(
        Rendicion,
        on_delete=models.CASCADE,
        verbose_name="Rendición",
        related_name="items",
    )
    opciones = (
        Q(app_label="ordentrabajov2", model="rendicionenot")
        | Q(app_label="rendiciones", model="detallegastorendicion")
        | Q(app_label="bodegas", model="compra")
    )  # V2
    content_type = models.ForeignKey(
        ContentType, on_delete=models.CASCADE, limit_choices_to=opciones
    )
    detalle_id = models.PositiveIntegerField()
    detalle = GenericForeignKey("content_type", "detalle_id")

    class Meta:
        verbose_name = "Item en Rendicion"
        verbose_name_plural = "Items en Rendiciones"
        ordering = ["-fecha_creacion"]

    def delete(self, *args, **kwargs):
        # Si el detalle es instancia de DetalleGastoRendicion (app 'rendiciones'), lo borramos
        if isinstance(self.detalle, DetalleGastoRendicion):
            self.detalle.delete()
        # Luego borramos el propio ItemRendicion
        super().delete(*args, **kwargs)

    def __str__(self):
        return f"Item {self.detalle.detalle} - Rendicion N°{self.rendicion.pk}"
