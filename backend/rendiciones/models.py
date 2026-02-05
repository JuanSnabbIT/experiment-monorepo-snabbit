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

    # BLOQUE 6 - Fase 2: Relación con cliente
    cliente = models.ForeignKey(
        "empresas.Empresa",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        verbose_name="Cliente",
        help_text="Cliente al que pertenece esta rendición",
    )

    # BLOQUE 6 - Fase 6: Relación con OT (creación automática)
    orden_trabajo = models.OneToOneField(
        "ordentrabajov2.OrdenDeTrabajo",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="rendicion_asociada",
        verbose_name="Orden de Trabajo",
        help_text="OT que generó automáticamente esta rendición al completarse",
    )

    # Campos de revisión/aprobación/rechazo
    # Nota: El estado determina si es aprobación (2), rechazo (3) o pago (4)
    motivo_rechazo = models.TextField(
        blank=True,
        null=True,
        verbose_name="Motivo de Rechazo",
        help_text="Motivo por el cual se rechazó la rendición (solo si estado=3)",
    )
    revisado_por = models.ForeignKey(
        "cuentas.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="rendiciones_revisadas",
        verbose_name="Revisado Por",
        help_text="Usuario que aprobó/rechazó la rendición. El estado indica la acción (2=aprobada, 3=rechazada)",
    )
    fecha_revision = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="Fecha de Revisión",
        help_text="Fecha y hora en que se aprobó/rechazó la rendición",
    )

    def __str__(self):
        return f"Rendición del {self.fecha_rendicion}"

    @property
    def total_reembolso_tecnico(self):
        """Total a reembolsar al técnico (todo lo que gastó)"""
        total = 0
        for item in self.items.all():
            det = item.detalle
            if det is None:
                continue

            ct = item.content_type

            # Gastos operativos (GastoOperativoEnOt o DetalleGastoRendicion)
            if ct.app_label == "rendiciones" and ct.model == "detallegastorendicion":
                total += det.monto_total
            elif ct.app_label == "ordentrabajov2" and ct.model == "gastooperativoenot":
                total += det.monto_total

            # Compras (si técnico pagó de su bolsillo)
            elif ct.app_label == "bodegas" and ct.model == "compra":
                total += sum(
                    line.cantidad * line.precio for line in det.itemencompra_set.all()
                )

        return total

    @property
    def total_facturable_cliente(self):
        """
        Total a facturar al cliente.
        Nota: Se elimino el concepto de política de viáticos.
        Todo lo que está en una rendición pagada se cobra al cliente.
        La decisión de qué cobrar se maneja desde Condiciones Especiales del Contrato.
        """
        return self.total_reembolso_tecnico

    @property
    def total_no_facturable(self):
        """
        Gastos que empresa asume (no se cobran al cliente).
        Nota: Ahora siempre es 0 porque todo se cobra.
        Se mantiene por compatibilidad pero no se usa.
        """
        return 0

    @property
    def total_rendicion(self):
        """Mantener compatibilidad: retorna total reembolso"""
        return self.total_reembolso_tecnico

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
        Q(app_label="ordentrabajov2", model="gastooperativoenot")
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
        # Handle None detalle (cuando se intenta eliminar y hay referencias rotas)
        if self.detalle is None:
            return f"Item #{self.detalle_id} (referencia rota) - Rendicion N°{self.rendicion.pk}"

        detalle_str = getattr(self.detalle, "detalle", str(self.detalle))
        return f"Item {detalle_str} - Rendicion N°{self.rendicion.pk}"
