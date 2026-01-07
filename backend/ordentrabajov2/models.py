from core.models import ModeloBase, ModeloBaseHistorico
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db import models
from django.db.models import Q
from django.forms import ValidationError
from rendiciones.models import CategoriaGastoRendicion

from .estados_modelo import *


class OrdenDeTrabajo(ModeloBase):
    empresa = models.ForeignKey(
        "empresas.Empresa",
        on_delete=models.CASCADE,
        verbose_name="empresa_orden_trabajo",
        related_name="empresa_ot_v2",
    )
    cliente = models.ForeignKey(
        "empresas.Empresa",
        on_delete=models.CASCADE,
        verbose_name="cliente_orden_trabajo",
        related_name="cliente_ot_v2",
    )
    tipo_servicio = models.CharField(
        max_length=50,
        choices=SERVICIOS_OT,
        default="general",
        verbose_name="Tipo de Servicio",
    )
    fecha_inicio_ot = models.DateField(
        null=True, blank=True, verbose_name="Fecha inicio"
    )
    fecha_finalizacion_ot = models.DateField(
        null=True, blank=True, verbose_name="Fecha de finalización"
    )
    estado = models.CharField(
        max_length=20,
        choices=ESTADOS_ORDEN,
        default="pendiente",
        verbose_name="Estado de la orden",
    )
    descripcion = models.TextField(verbose_name="Descripción de la orden")
    prioridad = models.CharField(
        max_length=20, choices=PRIORIDAD, default="2", verbose_name="Prioridad"
    )
    notas_internas = models.TextField(
        null=True, blank=True, verbose_name="Notas internas"
    )
    tecnico_responsable_ot = models.ForeignKey(
        "empresas.UsuarioEmpresa",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name="Tecnico Responsable",
        related_name="responsable_ot_v2",
    )
    cliente_solicitante = models.ForeignKey(
        "empresas.UsuarioEmpresa",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name="Cliente Solicitante",
        related_name="solicitante_ot_v2",
    )

    class Meta:
        verbose_name = "Orden de Trabajo"
        verbose_name_plural = "Ordenes de Trabajos"
        ordering = ["-fecha_creacion"]

    def clean(self):
        super().clean()
        if self.fecha_inicio_ot and self.fecha_finalizacion_ot:
            if self.fecha_finalizacion_ot < self.fecha_inicio_ot:
                raise ValidationError(
                    "La fecha de finalización no puede ser anterior a la fecha de inicio."
                )

    def __str__(self):
        return f"Orden #{self.id} - {self.cliente.nombre}"


class SoporteTecnico(ModeloBase):
    orden = models.ForeignKey(
        OrdenDeTrabajo, on_delete=models.CASCADE, verbose_name="Orden de trabajo"
    )
    nombre = models.CharField(max_length=100)
    descripcion = models.TextField(verbose_name="Descripción del detalle")
    estado = models.CharField(
        max_length=30,
        choices=ESTADOS_DETALLE_TRABAJO,
        default="pendiente",
        verbose_name="Estado del trabajo",
    )
    tecnico_asignado = models.ForeignKey(
        "empresas.UsuarioEmpresa",
        verbose_name="Técnico asignado",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    usuarios = models.ManyToManyField(
        "recursos.UsuarioEquipo",
        blank=True,
        through="UsuarioAsignadoSoporte",
        related_name="usuarios_asignados_soporte",
    )
    fecha_soporte = models.DateField(
        null=True, blank=True, verbose_name="Fecha del soporte"
    )
    guia_salida = models.OneToOneField(
        "bodegas.GuiaSalida",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="soporte_tecnico",
    )

    def __str__(self):
        return f"Detalle N°{self.pk} para Orden #{self.orden.id}"

    def save(self, *args, **kwargs):
        """
        Si este soporte pasa a 'en_proceso' y la OT sigue en 'pendiente',
        avanzamos la OT para mantener el flujo automático sin importar
        desde dónde se actualice el soporte (aprobación de guía, cambio manual, etc.).
        """
        super().save(*args, **kwargs)
        if self.estado == "en_proceso" and self.orden.estado == "pendiente":
            self.orden.estado = "en_proceso"
            self.orden.save(update_fields=["estado"])

    class Meta:
        verbose_name = "Detalle de Orden de Trabajo"
        verbose_name_plural = "Detalles de Ordenes de Trabajos"
        ordering = ["-fecha_creacion"]


class UsuarioAsignadoSoporte(ModeloBase):
    soporte_tecnico = models.ForeignKey(
        SoporteTecnico,
        on_delete=models.CASCADE,
        verbose_name="Detalle del Soporte Técnico",
    )
    usuario_equipo = models.ForeignKey(
        "recursos.UsuarioEquipo",
        on_delete=models.CASCADE,
        verbose_name="Usuario con Equipo asociado",
    )
    trabajo_realizado = models.TextField("Trabajo realizado", blank=True)
    resuelto = models.BooleanField("Trabajo resuelto", default=False)

    def __str__(self):
        return (
            f"Asignación de {self.usuario_equipo} al Detalle #{self.soporte_tecnico.id}"
        )

    class Meta:
        verbose_name = "Usuario Asignado a Detalle de OT"
        verbose_name_plural = "Usuarios Asignados a Detalles de OT"
        ordering = ["-fecha_creacion"]


class ServicioEnOT(ModeloBase):
    orden = models.ForeignKey(
        OrdenDeTrabajo, on_delete=models.CASCADE, verbose_name="Orden de trabajo"
    )
    nombre = models.CharField(max_length=100, verbose_name="Servicio realizado")
    descripcion = models.TextField(verbose_name="Descripción del servicio")
    estado = models.CharField(
        max_length=30,
        choices=ESTADOS_DETALLE_TRABAJO,
        default="pendiente",
        verbose_name="Estado del trabajo",
    )
    tecnico_asignado = models.ForeignKey(
        "empresas.UsuarioEmpresa",
        verbose_name="Técnico asignado",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    guia_salida = models.OneToOneField(
        "bodegas.GuiaSalida",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="servicio_ot",
    )
    resuelto = models.BooleanField("Trabajo resuelto", default=False)
    fecha_servicio = models.DateField(
        null=True, blank=True, verbose_name="Fecha del servicio"
    )

    def __str__(self):
        return f"Servicio: {self.nombre} para Orden #{self.orden.id}"

    class Meta:
        verbose_name = "Servicio en Orden de Trabajo"
        verbose_name_plural = "Servicios en Ordenes de Trabajo"
        ordering = ["-fecha_creacion"]


class HistorialCambiosOrden(ModeloBaseHistorico):
    orden = models.ForeignKey(
        OrdenDeTrabajo,
        related_name="historial_v2",
        on_delete=models.CASCADE,
        verbose_name="Orden de trabajo",
    )
    fecha_cambio = models.DateTimeField(
        auto_now_add=True, verbose_name="Fecha del cambio"
    )
    estado_anterior = models.TextField(
        verbose_name="Estado o condicion anterior al cambio",
        null=True,
        blank=True,
    )
    estado_actual = models.TextField(
        verbose_name="Estado o condicion solicitada en el cambio",
        null=True,
        blank=True,
    )
    comentario = models.TextField(
        null=True, blank=True, verbose_name="Comentario del cambio"
    )
    usuario = models.ForeignKey(
        "empresas.UsuarioEmpresa",
        on_delete=models.CASCADE,
        verbose_name="Usuario que realizó el cambio",
        related_name="historial_cambios_ot_v2",
    )

    def __str__(self):
        return f"Historial para Orden #{self.orden.id} - {self.fecha_cambio}"

    class Meta:
        verbose_name = "Historial de Cambios de Orden de Trabajo"
        verbose_name_plural = "Historial de Cambios de Ordenes de Trabajos"
        ordering = ["-fecha_creacion"]


def adjuntos_ot(instance, filename):
    return "ot/{0}/adjuntos/{1}".format(instance.orden.pk, filename)


class AdjuntoDeOrden(ModeloBaseHistorico):
    orden = models.ForeignKey(
        OrdenDeTrabajo, on_delete=models.CASCADE, verbose_name="Orden de trabajo"
    )
    tipo = models.CharField(
        max_length=20,
        choices=TIPO_ADJUNTO,
        default="informe",
        verbose_name="Tipo de archivo",
    )
    archivo = models.FileField(upload_to=adjuntos_ot, blank=True, null=True)
    descripcion = models.CharField(
        max_length=255, null=True, blank=True, verbose_name="Descripción"
    )

    def __str__(self):
        return f"Adjunto: {self.descripcion or self.archivo.name}"

    class Meta:
        verbose_name = "Adjunto de Orden de Trabajo"
        verbose_name_plural = "Adjuntos de Ordenes de Trabajo"


class RendicionEnOt(ModeloBase):
    orden = models.ForeignKey(
        OrdenDeTrabajo, on_delete=models.CASCADE, verbose_name="Orden de trabajo"
    )
    categoria = models.ForeignKey(
        CategoriaGastoRendicion,
        on_delete=models.PROTECT,
        verbose_name="Categoría del gasto",
    )
    detalle = models.CharField(
        max_length=255, verbose_name="Detalle del gasto", null=True, blank=True
    )
    cantidad = models.PositiveIntegerField(verbose_name="Cantidad")
    monto_unitario = models.PositiveIntegerField(verbose_name="Monto unitario")
    monto_total = models.PositiveIntegerField(
        verbose_name="Monto total", blank=True, null=True
    )
    usuario_comprador = models.ForeignKey(
        "empresas.UsuarioEmpresa",
        on_delete=models.SET_NULL,
        null=True,
        verbose_name="Usuario que creó la rendición",
    )
    fecha_compra = models.DateTimeField(
        auto_now_add=False, verbose_name="Fecha del cambio"
    )

    def save(self, *args, **kwargs):
        self.monto_total = self.cantidad * self.monto_unitario
        super().save(*args, **kwargs)

    class Meta:
        verbose_name = "Detalle Gasto Rendición OT"
        verbose_name_plural = "Detalles Gastos Rendiciones OT"
        ordering = ["-fecha_creacion"]

    def __str__(self):
        return f"Detalle N°{self.pk} - {self.detalle}"


class CierreAdministrativoOT(ModeloBaseHistorico):
    contrato = models.ForeignKey(
        "contratos.ContratoEmpresaCliente",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="cierres_administrativos_ot",
    )
    # Período de facturación (del 26 del mes anterior al 25 del mes actual)
    periodo_desde = models.DateField(
        null=True,
        blank=True,
        verbose_name="Inicio del período",
        help_text="Fecha de inicio del período a facturar (típicamente día 26)",
    )
    periodo_hasta = models.DateField(
        null=True,
        blank=True,
        verbose_name="Fin del período",
        help_text="Fecha de fin del período a facturar (típicamente día 25)",
    )
    # OT opcional - para cierres legacy individuales por OT (deprecado para facturación)
    orden = models.OneToOneField(
        OrdenDeTrabajo,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="cierre_administrativo_v2",
    )
    usuario = models.ForeignKey(
        "empresas.UsuarioEmpresa",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cierres_administrativos_ot_v2",
    )
    fecha_cierre = models.DateTimeField(auto_now_add=True)
    valido = models.BooleanField(default=False, verbose_name="Cierre válido")
    # JSON principal para facturación: pactado, ejecutado, vinculaciones, factura
    resultado = models.JSONField(
        default=dict, blank=True, verbose_name="Resultado de validaciones y facturación"
    )
    # Deprecado: usar solo resultado
    detalle = models.JSONField(
        default=dict, blank=True, verbose_name="Detalle de facturación (deprecado)"
    )
    # Estado del cierre para el flujo de facturación
    estado_cierre = models.CharField(
        max_length=20,
        choices=ESTADOS_CIERRE_OT,
        default="borrador",
        verbose_name="Estado del cierre",
    )
    comentario = models.TextField(blank=True, null=True)

    class Meta:
        verbose_name = "Cierre Administrativo de OT / Facturación"
        verbose_name_plural = "Cierres Administrativos de OT / Facturaciones"
        indexes = [
            models.Index(fields=["contrato", "periodo_desde", "periodo_hasta"]),
            models.Index(fields=["estado_cierre"]),
        ]

    def __str__(self):
        if self.contrato:
            periodo = (
                f"{self.periodo_desde} - {self.periodo_hasta}"
                if self.periodo_desde
                else "Sin período"
            )
            return f"Facturación Contrato #{self.contrato_id} ({periodo})"
        elif self.orden:
            estado = "Válido" if self.valido else "Observado"
            return f"Cierre OT #{self.orden_id} - {estado}"
        return f"Cierre #{self.id}"


class SeguimientoItemOT(ModeloBase):
    servicio = models.ForeignKey(
        ServicioEnOT,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="seguimientos",
    )
    soporte = models.ForeignKey(
        SoporteTecnico,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="seguimientos",
    )
    usuario = models.ForeignKey(
        "empresas.UsuarioEmpresa",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="seguimientos_ot_v2",
    )
    tipo = models.CharField(
        max_length=30, choices=TIPO_SEGUIMIENTO, default="comentario_tecnico"
    )
    comentario = models.TextField(blank=True, null=True)

    class Meta:
        verbose_name = "Seguimiento de servicio/soporte OT"
        verbose_name_plural = "Seguimientos de servicios/soportes OT"
        ordering = ["-fecha_creacion"]
        constraints = [
            models.CheckConstraint(
                check=(
                    (Q(servicio__isnull=False) & Q(soporte__isnull=True))
                    | (Q(servicio__isnull=True) & Q(soporte__isnull=False))
                ),
                name="seguimiento_item_ot_un_solo_origen",
            )
        ]

    def clean(self):
        super().clean()
        tiene_servicio = self.servicio_id is not None
        tiene_soporte = self.soporte_id is not None
        if tiene_servicio == tiene_soporte:
            raise ValidationError(
                "Debe asociar el seguimiento a solo un servicio o a un soporte."
            )

    def __str__(self):
        destino = self.servicio_id or self.soporte_id or "sin destino"
        return f"Seguimiento OT item #{destino}"
