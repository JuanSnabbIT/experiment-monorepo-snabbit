"""Modelos del modulo RRHH: contratos laborales y anexos."""

from django.conf import settings
from django.db import models

from core.models import ModeloBaseHistorico

from .estados_modelo import (
    ESTADO_CONTRATO,
    JORNADA_CONTRATO,
    MONEDA_CONTRATO,
    MOTIVO_TERMINO_CONTRATO,
    TIPO_ANEXO,
    TIPO_CONTRATO,
)


def archivo_contrato_path(instance, filename):
    """Ruta de almacenamiento del PDF del contrato."""
    return f"rrhh/contratos/{instance.usuario_empresa_id}/{filename}"


def archivo_anexo_path(instance, filename):
    """Ruta de almacenamiento del PDF de un anexo."""
    return f"rrhh/anexos/{instance.contrato_id}/{filename}"


class ContratoTrabajador(ModeloBaseHistorico):
    """Contrato laboral entre la empresa y un trabajador (UsuarioEmpresa)."""

    usuario_empresa = models.ForeignKey(
        "empresas.UsuarioEmpresa",
        on_delete=models.PROTECT,
        related_name="contratos_laborales",
    )

    tipo_contrato = models.CharField(max_length=20, choices=TIPO_CONTRATO)
    fecha_inicio = models.DateField()
    fecha_termino = models.DateField(blank=True, null=True)

    cargo = models.CharField(max_length=150)
    funciones = models.TextField(blank=True, null=True)

    jornada = models.CharField(max_length=20, choices=JORNADA_CONTRATO)
    horas_semanales = models.PositiveSmallIntegerField(blank=True, null=True)
    lugar_trabajo = models.CharField(max_length=255, blank=True, null=True)

    sueldo_base = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    moneda = models.CharField(max_length=5, choices=MONEDA_CONTRATO, default="CLP")
    gratificacion_legal = models.BooleanField(default=False)
    bono_movilizacion = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    bono_colacion = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    archivo_pdf = models.FileField(upload_to=archivo_contrato_path, blank=True, null=True)

    estado = models.CharField(max_length=25, choices=ESTADO_CONTRATO, default="borrador")
    fecha_aceptacion = models.DateTimeField(blank=True, null=True)
    aceptado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="contratos_trabajador_aceptados",
    )

    motivo_termino = models.CharField(
        max_length=30, choices=MOTIVO_TERMINO_CONTRATO, blank=True, null=True,
    )
    fecha_termino_real = models.DateField(blank=True, null=True)
    observaciones_termino = models.TextField(blank=True, null=True)

    creado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="contratos_trabajador_creados",
    )

    class Meta:
        verbose_name = "Contrato de Trabajador"
        verbose_name_plural = "Contratos de Trabajadores"
        ordering = ["-fecha_inicio", "-fecha_creacion"]

    def __str__(self):
        return f"Contrato {self.tipo_contrato} - {self.usuario_empresa} ({self.estado})"


class AnexoContrato(ModeloBaseHistorico):
    """Anexo / modificacion contractual asociado a un ContratoTrabajador."""

    contrato = models.ForeignKey(
        ContratoTrabajador,
        on_delete=models.CASCADE,
        related_name="anexos",
    )

    tipo = models.CharField(max_length=30, choices=TIPO_ANEXO)
    fecha_efectiva = models.DateField()
    descripcion = models.TextField()
    archivo_pdf = models.FileField(upload_to=archivo_anexo_path, blank=True, null=True)

    estado = models.CharField(max_length=25, choices=ESTADO_CONTRATO, default="borrador")

    creado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="anexos_contrato_creados",
    )

    class Meta:
        verbose_name = "Anexo de Contrato"
        verbose_name_plural = "Anexos de Contratos"
        ordering = ["-fecha_efectiva", "-fecha_creacion"]

    def __str__(self):
        return f"Anexo {self.tipo} ({self.fecha_efectiva}) - {self.contrato_id}"
