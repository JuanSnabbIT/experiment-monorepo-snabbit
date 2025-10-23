from django.db import models
from .estados_modelo import *
from core.models import ModeloBase
from datetime import timedelta, date
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db.models import Q


class Cotizacion(ModeloBase):
    nombre = models.CharField(max_length=150, verbose_name="Nombre de Cotización")
    empresa = models.ForeignKey('empresas.Empresa', on_delete=models.CASCADE, verbose_name="Empresa", related_name="cotizacion_empresa")
    cliente = models.ForeignKey('empresas.Empresa', on_delete=models.CASCADE, verbose_name="Cliente", related_name="cotizacion_cliente")
    numero_cotizacion = models.IntegerField(verbose_name="Número de Cotización", blank=True, null=True)
    fecha_vencimiento = models.DateField(null=True, blank=True, verbose_name="Fecha de vencimiento")
    estado = models.CharField(max_length=20, choices=ESTADOS_COTIZACION, default='pendiente', verbose_name="Estado de la cotización")
    descripcion = models.CharField(max_length=150, null=True, blank=True, verbose_name="Descripción general de la cotización")
    total_estimado = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, verbose_name="Total estimado")
    observaciones = models.TextField(null=True, blank=True, verbose_name="Observaciones para el cliente")
    items = models.ManyToManyField("cotizaciones.ItemCotizacion", related_name="items_cotizacion", blank=True)
    tipo_moneda = models.CharField(max_length=1, choices=TIPOS_MONEDA, default='1', verbose_name="Tipo de moneda")
    solicitantes = models.ManyToManyField("cotizaciones.SolicitanteCotizacion", related_name="solicitantes_cotizacion", blank=True)
    fecha_facturacion = models.DateField(null=True, blank=True, auto_now_add=True)
    dolar_observado = models.DecimalField(null=True, blank=True, decimal_places=2, max_digits=10)
    valor_uf = models.DecimalField(null=True, blank=True, decimal_places=2, max_digits=10)
    ppm = models.DecimalField(default=0.01, max_digits=5, decimal_places=2)
    recargo_dolar = models.PositiveIntegerField(default=5)
    comentarios = models.ManyToManyField("self", through="cotizaciones.ComentarioCotizacion")
    # proveedores = models.ManyToManyField("items.ProveedorEmpresa", blank=True)

    class Meta:
        verbose_name = "Cotización"
        verbose_name_plural = "Cotizaciones"
        ordering = ['-fecha_creacion']

    def __str__(self):
        return f"Cotización #{self.id} - {self.cliente.nombre}"

    @property
    def calcular_total_estimado(self):
        """Calcula el total estimado sumando los costos totales de los items."""
        return sum(item.costo_total for item in self.detalles.all())

    @property
    def es_vigente(self):
        """Verifica si la cotización aún no ha vencido."""
        if not self.fecha_vencimiento:
            return False
        return self.fecha_vencimiento >= date.today()

    def establecer_fecha_vencimiento(self):
        """Calcula la fecha de vencimiento 2 semanas después de la fecha de creación."""
        if not self.fecha_creacion:
            return date.today() + timedelta(weeks=2)
        else:
            return self.fecha_creacion + timedelta(weeks=2)

    def establecer_fecha_facturacion(self):
        """Calcula la fecha de vencimiento 2 semanas después de la fecha de creación."""
        if not self.fecha_creacion:
            return date.today() + timedelta(weeks=2)
        else:
            return self.fecha_creacion + timedelta(weeks=2)

    def save(self, *args, **kwargs):
        if not self.numero_cotizacion:
            valor_inicial = 800  # Establece el número inicial mínimo
            last_cotizacion = Cotizacion.objects.order_by('-numero_cotizacion').first()
            if last_cotizacion and last_cotizacion.numero_cotizacion is not None:
                self.numero_cotizacion = last_cotizacion.numero_cotizacion + 1
            else:
                self.numero_cotizacion = valor_inicial
            # Asegura que no haya conflicto en la BD (si hay un número duplicado, aumenta hasta encontrar uno disponible)
            while Cotizacion.objects.filter(numero_cotizacion=self.numero_cotizacion).exists():
                self.numero_cotizacion += 1

        if not self.fecha_vencimiento:
            self.fecha_vencimiento = self.establecer_fecha_vencimiento()

        if not self.fecha_facturacion:
            self.fecha_facturacion = self.establecer_fecha_facturacion()
        super().save(*args, **kwargs)

class ItemCotizacion(ModeloBase):
    cotizacion = models.ForeignKey(Cotizacion, related_name="detalles", on_delete=models.CASCADE, verbose_name="Cotización")
    item_empresa = models.ForeignKey("items.ItemEmpresa", on_delete=models.SET_NULL, null=True, blank=True)
    proveedor_empresa = models.ForeignKey("items.ProveedorEmpresa", on_delete=models.SET_NULL, null=True, blank=True)
    aprobado = models.BooleanField(default=False)
    nombre = models.CharField(max_length=250, verbose_name="Nombre del Item de Cotización", null=True, blank=True)
    descripcion = models.TextField(verbose_name="Descripción del producto/servicio", null=True, blank=True)
    porcentaje_recargo = models.IntegerField(blank=True, null=True)
    cantidad = models.PositiveIntegerField(verbose_name="Cantidad")
    precio_unitario = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Precio unitario")
    costo_total = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Costo total", blank=True)

    class Meta:
        verbose_name = "Item de Cotización"
        verbose_name_plural = "Items de Cotizaciones"

    def save(self, *args, **kwargs):
        self.costo_total = self.cantidad * self.precio_unitario
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Detalle para Cotización #{self.cotizacion.id}"

class SeguimientoCotizacion(models.Model):
    cotizacion = models.ForeignKey(Cotizacion, related_name="seguimientos", on_delete=models.CASCADE, verbose_name="Cotización")
    fecha = models.DateTimeField(auto_now_add=True, verbose_name="Fecha del seguimiento")
    comentario = models.TextField(verbose_name="Comentario del seguimiento")
    usuario = models.ForeignKey("empresas.UsuarioEmpresa", on_delete=models.CASCADE, verbose_name="Usuario responsable")

    class Meta:
        verbose_name = "Seguimineto de Cotización"
        verbose_name_plural = "Seguimientos de Cotizaciones"

    def __str__(self):
        return f"Seguimiento para Cotización #{self.cotizacion.id} - {self.fecha.strftime('%Y-%m-%d %H:%M:%S')}"

class EnvioCorreoCotizacion(models.Model):
    cotizacion = models.ForeignKey(Cotizacion, related_name="envios_correos", on_delete=models.CASCADE, verbose_name="Cotización")
    fecha_envio = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de envío")
    usuarios_destinatarios = models.ManyToManyField("empresas.UsuarioEmpresa", related_name="envios_cotizaciones", blank=True, verbose_name="Usuarios destinatarios")
    correos_externos = models.TextField(blank=True, null=True, verbose_name="Correos externos")

    class Meta:
        verbose_name = "Envío de Correo de Cotización"
        verbose_name_plural = "Envíos de Correos de Cotizaciones"

    def __str__(self):
        return f"Envío #{self.id} - Cotización {self.cotizacion.numero_cotizacion} ({self.fecha_envio.strftime('%Y-%m-%d %H:%M')})"

    def get_correos_externos(self):
        """ Devuelve la lista de correos externos como una lista de Python. """
        return [correo.strip() for correo in self.correos_externos.split(",")] if self.correos_externos else []

class SolicitanteCotizacion(ModeloBase):
    cotizacion = models.ForeignKey(Cotizacion, related_name="cotizacion_solicitante", on_delete=models.CASCADE)
    opciones = Q(app_label='cotizaciones', model='solicitanteexterno') | Q(app_label='empresas', model='usuarioempresa')
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE, limit_choices_to=opciones)
    usuario_id = models.PositiveIntegerField()
    usuario = GenericForeignKey('content_type', 'usuario_id')
    aprobo = models.BooleanField(default=False)
    fecha_aprobacion = models.DateTimeField(blank=True, null=True)

    class Meta:
        verbose_name = "Solicitante de Cotización"
        verbose_name_plural = "Solicitantes de Cotizaciones"

    def __str__(self):
        return f"{self.pk} - Usuario: {self.usuario_id} Modelo: {self.content_type.model}"

class SolicitanteExterno(ModeloBase):
    email = models.EmailField(max_length=100)
    nombre = models.CharField(max_length=200)

    class Meta:
        verbose_name = "Solicitante Externo"
        verbose_name_plural = "Solicitantes Externos"

    def __str__(self):
        return f'{self.email} {self.nombre}'

class ComentarioCotizacion(ModeloBase):
    comentario = models.TextField()
    cotizacion = models.ForeignKey(Cotizacion, on_delete=models.CASCADE)
    creado_por = models.ForeignKey("empresas.UsuarioEmpresa", on_delete=models.CASCADE)

    class Meta:
        verbose_name = "Comentario de Cotización"
        verbose_name_plural = "Comentarios de Cotizaciónes"
        ordering = ["-fecha_creacion"]

    def __str__(self):
        return f'{self.pk} {self.creado_por.usuario}'