from django.db import models
from django.forms import ValidationError
from rendiciones.models import CategoriaGastoRendicion
from .estados_modelo import *
from core.models import ModeloBaseHistorico
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db.models import Q


class OrdenDeTrabajo(ModeloBaseHistorico):
    empresa = models.ForeignKey('empresas.Empresa', on_delete=models.CASCADE, verbose_name="empresa_orden_trabajo", related_name="empresa_ot")
    cliente = models.ForeignKey('empresas.Empresa', on_delete=models.CASCADE, verbose_name="cliente_orden_trabajo", related_name="cliente_ot")
    fecha_inicio_ot = models.DateField(null=True, blank=True, verbose_name="Fecha inicio")
    fecha_finalizacion_ot = models.DateField(null=True, blank=True, verbose_name="Fecha de finalización")
    estado = models.CharField(max_length=20, choices=ESTADOS_ORDEN, default='pendiente', verbose_name="Estado de la orden")
    descripcion = models.TextField(verbose_name="Descripción de la orden")
    prioridad = models.CharField(max_length=20, choices=PRIORIDAD, default='1', verbose_name="Prioridad")
    notas_internas = models.TextField(null=True, blank=True, verbose_name="Notas internas")
    responsable_empresa = models.ForeignKey("empresas.UsuarioEmpresa", on_delete=models.SET_NULL, null=True, blank=True, verbose_name="Responsable", related_name="responsable_ot")
    solicitante_empresa = models.ForeignKey("empresas.UsuarioEmpresa", on_delete=models.SET_NULL, null=True, blank=True, verbose_name="Solicitante", related_name="solicitante_ot")
    usuarios_asignados = models.ManyToManyField("self", through="ordentrabajo.UsuarioAsignadoOT", verbose_name="Usuarios asignados", blank=True)
    adjuntos = models.ManyToManyField("self", through="ordentrabajo.AdjuntoDeOrden", verbose_name="Adjuntos", blank=True)
    trabajos = models.ManyToManyField("self", through="ordentrabajo.DetalleTrabajo", verbose_name="Trabajos", blank=True)
    historial_cambios = models.ManyToManyField("self", through="ordentrabajo.HistorialCambiosOrden", blank=True)

    class Meta:
        verbose_name = "Orden de Trabajo"
        verbose_name_plural = "Ordenes de Trabajos"
        ordering = ['-fecha_creacion']

    def clean(self):
        super().clean()
        if self.fecha_inicio_ot and self.fecha_finalizacion_ot:
            if self.fecha_finalizacion_ot < self.fecha_inicio_ot:
                raise ValidationError("La fecha de finalización no puede ser anterior a la fecha de inicio.")

    def __str__(self):
        return f"Orden #{self.id} - {self.cliente.nombre}"

class UsuarioAsignadoOT(ModeloBaseHistorico):
    orden = models.ForeignKey(OrdenDeTrabajo, on_delete=models.CASCADE, verbose_name="Orden de trabajo")
    usuario_empresa = models.ForeignKey("empresas.UsuarioEmpresa", on_delete=models.CASCADE, null=True, blank=True)
    usuario_externo = models.CharField(max_length=250, blank=True, null=True)
    correo_usuario_externo = models.EmailField(blank=True, null=True)

    class Meta:
        verbose_name = "Usuario Asignado a Orden de Trabajo"
        verbose_name_plural = "Usuarios Asignados a Ordenes de Trabajos"
        constraints = [
            models.CheckConstraint(
                check=(
                    (models.Q(usuario_empresa__isnull=False) & models.Q(usuario_externo__isnull=True) & models.Q(correo_usuario_externo__isnull=True)) |
                    (models.Q(usuario_empresa__isnull=True) & models.Q(usuario_externo__isnull=False))
                ),
                name="usuario_empresa_xor_usuario_externo"
            )
        ]

    def __str__(self):
        if self.usuario_empresa:
            return f"Usuario Empresa Asignado en Orden #{self.orden.id} - {self.usuario_empresa.usuario.get_nombre()}"
        elif self.usuario_externo:
            return f"Usuario Externo Asignado en Orden #{self.orden.id} - {self.usuario_externo}"
        else:
            return f"Registro Creado N° {self.pk} - Orden #{self.orden.id} - Sin usuario asignado"

    def clean(self):
        super().clean()
        if self.usuario_empresa and (self.usuario_externo or self.correo_usuario_externo):
            raise ValidationError("No puede asignar ambos: usuario_empresa y usuario_externo/correo_usuario_externo. Debe elegir solo uno.")
        if not self.usuario_empresa and not self.usuario_externo:
            raise ValidationError("Debe asignar un usuario_empresa o un usuario_externo.")

class DetalleTrabajo(ModeloBaseHistorico):
    nombre = models.CharField(max_length=100)
    orden = models.ForeignKey(OrdenDeTrabajo, on_delete=models.CASCADE, verbose_name="Orden de trabajo")
    descripcion = models.TextField(verbose_name="Descripción del detalle")
    opciones = Q(app_label='cotizaciones', model='cotizacion') | Q(app_label='visitas', model='visitasoporte') | Q(app_label='bodegas', model='compra')
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE, limit_choices_to=opciones, null=True, blank=True)
    trabajo_id = models.PositiveIntegerField(null=True, blank=True)
    trabajo = GenericForeignKey('content_type', 'trabajo_id')
    seguimiento = models.ManyToManyField("self", through="ordentrabajo.SeguimientoDetalleTrabajo", blank=True)
    estado = models.CharField(max_length=30, choices=ESTADOS_DETALLE_TRABAJO, default='pendiente', verbose_name="Estado del trabajo")
    tecnico_asignado = models.ForeignKey("empresas.UsuarioEmpresa", verbose_name="Técnico asignado", on_delete=models.SET_NULL, null=True, blank=True)
    insumo = models.OneToOneField("bodegas.GuiaSalida", on_delete=models.CASCADE, blank=True, null=True)

    def __str__(self):
        return f"Detalle N°{self.pk} para Orden #{self.orden.id}"

    class Meta:
        verbose_name = "Detalle de Orden de Trabajo"
        verbose_name_plural = "Detalles de Ordenes de Trabajos"
        ordering = ["-fecha_creacion"]

class SeguimientoDetalleTrabajo(ModeloBaseHistorico):
    detalle_trabajo = models.ForeignKey(DetalleTrabajo, on_delete=models.CASCADE, verbose_name="Detalle Orden de Trabajo")
    tipo = models.CharField(max_length=20, choices=TIPO_SEGUIMIENTO, default='comentario', verbose_name="Tipo de seguimiento")
    fecha = models.DateTimeField(auto_now_add=True, verbose_name="Fecha del seguimiento")
    comentario = models.TextField(verbose_name="Comentario")
    usuario = models.ForeignKey("empresas.UsuarioEmpresa", on_delete=models.CASCADE, verbose_name="Usuario responsable", null=True, blank=True)

    def __str__(self):
        return f"Seguimiento para Detalle #{self.detalle_trabajo.id} - {self.fecha.strftime('%Y-%m-%d %H:%M:%S')}"

    class Meta:
        verbose_name = "Seguimiento de Orden de Trabajo"
        verbose_name_plural = "Seguimientos de Ordenes de Trabajos"

class HistorialCambiosOrden(ModeloBaseHistorico):
    orden = models.ForeignKey(OrdenDeTrabajo, related_name="historial", on_delete=models.CASCADE, verbose_name="Orden de trabajo")
    fecha_cambio = models.DateTimeField(auto_now_add=True, verbose_name="Fecha del cambio")
    estado_anterior = models.TextField(verbose_name="Estado o condicion anterior al cambio", null=True, blank=True,)
    estado_actual = models.TextField(verbose_name="Estado o condicion solicitada en el cambio", null=True, blank=True,)
    comentario = models.TextField(null=True, blank=True, verbose_name="Comentario del cambio")
    usuario = models.ForeignKey("empresas.UsuarioEmpresa", on_delete=models.CASCADE, verbose_name="Usuario que realizó el cambio")

    def __str__(self):
        return f"Historial para Orden #{self.orden.id} - {self.fecha_cambio}"

    class Meta:
        verbose_name = "Historial de Cambios de Orden de Trabajo"
        verbose_name_plural = "Historial de Cambios de Ordenes de Trabajos"
        ordering=["-fecha_creacion"]

def adjuntos_ot(instance, filename):
    return 'ot/{0}/adjuntos/{1}'.format(instance.orden.pk, filename)

class AdjuntoDeOrden(ModeloBaseHistorico):
    orden = models.ForeignKey(OrdenDeTrabajo, on_delete=models.CASCADE, verbose_name="Orden de trabajo")
    tipo = models.CharField(max_length=20, choices=TIPO_ADJUNTO, default='informe', verbose_name="Tipo de archivo")
    archivo = models.FileField(upload_to=adjuntos_ot, blank=True, null=True)
    descripcion = models.CharField(max_length=255, null=True, blank=True, verbose_name="Descripción")

    def __str__(self):
        return f"Adjunto: {self.descripcion or self.archivo.name}"

    class Meta:
        verbose_name = "Adjunto de Orden de Trabajo"
        verbose_name_plural = "Adjuntos de Ordenes de Trabajo"

class DetalleGastoRendicionOT(ModeloBaseHistorico):
    orden = models.ForeignKey(OrdenDeTrabajo, on_delete=models.CASCADE, verbose_name="Orden de trabajo")
    categoria = models.ForeignKey(CategoriaGastoRendicion, on_delete=models.PROTECT, verbose_name="Categoría")
    detalle = models.CharField(max_length=255, verbose_name="Detalle del gasto", null=True, blank=True)
    cantidad = models.PositiveIntegerField(verbose_name="Cantidad")
    monto_unitario = models.PositiveIntegerField(verbose_name="Monto unitario")
    monto_total = models.PositiveIntegerField(verbose_name="Monto total", blank=True)
    fecha_gasto = models.DateField()

    def save(self, *args, **kwargs):
        self.monto_total = self.cantidad * self.monto_unitario
        super().save(*args, **kwargs)

    class Meta:
        verbose_name = "Detalle Gasto Rendición OT"
        verbose_name_plural = "Detalles Gastos Rendiciones OT"
        ordering = ["-fecha_creacion"]

    def __str__(self):
        return f"Detalle N°{self.pk} - {self.detalle}"
