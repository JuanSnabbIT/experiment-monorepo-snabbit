from django.db import models
from .estados_modelo import *
from core.models import ModeloBase
from datetime import timedelta, date
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db.models import Q
from decimal import Decimal


class Cotizacion(ModeloBase):
    nombre = models.CharField(max_length=150, verbose_name="Nombre de Cotización")
    empresa = models.ForeignKey('empresas.Empresa', on_delete=models.CASCADE, verbose_name="Empresa", related_name="cotizacion_empresa")
    cliente = models.ForeignKey('empresas.Empresa', on_delete=models.CASCADE, verbose_name="Cliente", related_name="cotizacion_cliente")
    numero_cotizacion = models.IntegerField(verbose_name="Número de Cotización", blank=True, null=True, unique=True)
    fecha_vencimiento = models.DateField(null=True, blank=True, verbose_name="Fecha de vencimiento")
    estado = models.CharField(max_length=20, choices=ESTADOS_COTIZACION, default='pendiente', verbose_name="Estado de la cotización")
    descripcion = models.CharField(max_length=150, null=True, blank=True, verbose_name="Descripción general de la cotización")
    total_estimado = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, verbose_name="Total estimado")
    observaciones = models.TextField(null=True, blank=True, verbose_name="Observaciones para el cliente")
    # items = models.ManyToManyField("cotizaciones.ItemCotizacion", related_name="items_cotizacion", blank=True)
    tipo_moneda = models.CharField(max_length=1, choices=TIPOS_MONEDA, default='1', verbose_name="Tipo de moneda")
    # solicitantes = models.ManyToManyField("cotizaciones.SolicitanteCotizacion", related_name="solicitantes_cotizacion", blank=True)
    fecha_facturacion = models.DateField(null=True, blank=True, auto_now_add=True)
    dolar_observado = models.DecimalField(null=True, blank=True, decimal_places=2, max_digits=10)
    valor_uf = models.DecimalField(null=True, blank=True, decimal_places=2, max_digits=10)
    ppm = models.DecimalField(default=1, max_digits=5, decimal_places=2)
    comentarios = models.ManyToManyField("self", through="cotizaciones.ComentarioCotizacion")

    class Meta:
        verbose_name = "Cotización"
        verbose_name_plural = "Cotizaciones"
        ordering = ['-fecha_creacion']

    def __str__(self):
        return f"Cotización #{self.numero_cotizacion} - {self.cliente.nombre}"

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
    cotizacion = models.ForeignKey(Cotizacion, related_name="items", on_delete=models.CASCADE, verbose_name="Cotización")
    item_empresa = models.ForeignKey("items.ItemEmpresa", on_delete=models.SET_NULL, null=True, blank=True)
    proveedor_empresa = models.ForeignKey("items.ProveedorEmpresa", on_delete=models.SET_NULL, null=True, blank=True)
    aprobado = models.BooleanField(default=False)
    nombre = models.CharField(max_length=250, verbose_name="Nombre del Item de Cotización", null=True, blank=True)
    descripcion = models.TextField(verbose_name="Descripción del producto/servicio", null=True, blank=True)
    porcentaje_recargo = models.IntegerField(blank=True, null=True)
    cantidad = models.PositiveIntegerField(verbose_name="Cantidad")
    precio_unitario = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Precio unitario")
    costo_total = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Costo total", blank=True)
    recargo_dolar = models.IntegerField(default=5, null=True, blank=True)

    #
    # ——————————————————————
    # 1) Props fiscales / internos en CLP
    # ——————————————————————
    #

    @property
    def recargo_iva_venta(self) -> Decimal:
        """
        IVA sobre venta (19%) del 'costo_total + recargo'. 
        - Si porcentaje_recargo existe (>0): 
            base = costo_total + (costo_total * porcentaje_recargo/100)
        - Sino:
            base = costo_total
        IVA = base * 0.19
        """
        costo = Decimal(self.costo_total or 0)
        if self.porcentaje_recargo:
            factor = Decimal(self.porcentaje_recargo) / Decimal(100)
            base = costo + (costo * factor)
        else:
            base = costo

        iva = base * Decimal("0.19")
        return iva.quantize(Decimal("0.01"))

    @property
    def iva_compra(self) -> Decimal:
        """
        IVA de compra (19% sobre costo_total).
        """
        costo = Decimal(self.costo_total or 0)
        iva = costo * Decimal("0.19")
        return iva.quantize(Decimal("0.01"))

    @property
    def valor_ppm(self) -> Decimal:
        """
        Valor de PPM total en CLP:
          = (costo_total + recargo) * (ppm/100)
        Redondeado a 2 decimales.
        """
        costo = Decimal(self.costo_total or 0)
        if self.porcentaje_recargo:
            base = costo + (costo * (Decimal(self.porcentaje_recargo) / Decimal(100)))
        else:
            base = costo

        ppm_amount = base * (Decimal(self.cotizacion.ppm or 0) / Decimal(100))
        return ppm_amount.quantize(Decimal("0.01"))

    @property
    def total_impuesto(self) -> Decimal:
        """
        total_impuesto en CLP:
          = (IVA venta) - (IVA compra) + (PPM_amount)
        donde IVA venta = (costo+recargo)*0.19; IVA compra = costo*0.19; PPM_amount = valor_ppm.
        """
        costo = Decimal(self.costo_total or 0)
        if self.porcentaje_recargo:
            base = costo + (costo * (Decimal(self.porcentaje_recargo) / Decimal(100)))
        else:
            base = costo

        iva_venta = base * Decimal("0.19")
        iva_compra = costo * Decimal("0.19")
        ppm_amount = base * (Decimal(self.cotizacion.ppm or 0) / Decimal(100))
        total = iva_venta - iva_compra + ppm_amount
        return total.quantize(Decimal("0.01"))

    @property
    def ganancia(self) -> Decimal:
        """
        Ganancia = (costo_total + recargo) - costo_total - total_impuesto
                 = recargo - total_impuesto
        Donde:
          - recargo = costo_total * (porcentaje_recargo/100) (o 0 si no hay porcentaje_recargo)
          - total_impuesto es la propiedad que ya tienes (en CLP)
        Redondea a 2 decimales.
        """
        costo = Decimal(self.costo_total or 0)
        if self.porcentaje_recargo:
            recargo = costo * (Decimal(self.porcentaje_recargo) / Decimal(100))
        else:
            recargo = Decimal("0.00")

        # self.total_impuesto ya está en CLP
        impuesto = self.total_impuesto

        gan = recargo - impuesto
        return gan.quantize(Decimal("0.01"))

    #
    # ——————————————————————
    # 2) Helpers para convertir entre CLP, USD y UF
    # ——————————————————————
    #

    def _tasa_usd_clp(self) -> Decimal:
        """
        Tasa CLP por 1 USD, considerando recargo_dolar.
          = dolar_observado + recargo_dolar
        """
        return (
            Decimal(self.cotizacion.dolar_observado or 0)
            + Decimal(self.recargo_dolar or 0)
        )

    def _tasa_uf_clp(self) -> Decimal:
        """
        Tasa CLP por 1 UF.
          = cotizacion.valor_uf
        """
        return Decimal(self.cotizacion.valor_uf or 1)

    #
    # ——————————————————————
    # 3) “Precio neto” en moneda base
    # ——————————————————————
    #

    @property
    def precio_venta_neta_unitario_moneda_base(self) -> Decimal:
        """
        Este valor está en la moneda base (USD, CLP o UF), y representa:
          precio_unitario + (precio_unitario * porcentaje_recargo/100)
        - Si tipo_moneda=="1": precio_base está en USD.
        - Si tipo_moneda=="2": precio_base está en CLP.
        - Si tipo_moneda=="3": precio_base está en UF.
        Redondeado a 2 decimales.
        """
        base = Decimal(self.precio_unitario or 0)
        if self.porcentaje_recargo:
            factor_rec = Decimal(self.porcentaje_recargo) / Decimal(100)
            precio_neto = base + (base * factor_rec)
        else:
            precio_neto = base

        return precio_neto.quantize(Decimal("0.01"))

    @property
    def precio_venta_neta_total_moneda_base(self) -> Decimal:
        base = Decimal(self.precio_unitario or 0)
        if self.porcentaje_recargo:
            factor_rec = Decimal(self.porcentaje_recargo) / Decimal(100)
            precio_neto = (base + (base * factor_rec)) * self.cantidad
        else:
            precio_neto = base * self.cantidad

        return precio_neto.quantize(Decimal("0.01"))

    #
    # ——————————————————————
    # 4) Props “unitario” / “total” en CLP y USD
    # ——————————————————————
    #

    @property
    def precio_unitario_backend(self) -> dict:
        """
        Devuelve un dict con el “precio neto por unidad” convertido a CLP y USD:
          {
            "clp": Decimal(...),
            "usd": Decimal(...)
          }

        Lógica:
        1) Calculamos primero el precio neto por unidad en la moneda base:
            neto_base = self.precio_venta_neta_unitario_moneda_base
           - Si tipo_moneda=="1" → neto_base en USD
           - Si tipo_moneda=="2" → neto_base en CLP
           - Si tipo_moneda=="3" → neto_base en UF

        2) Convertimos neto_base → CLP y USD según:
           • Si base es USD (tipo=="1"):
               clp = neto_base * (_tasa_usd_clp())
               usd = neto_base
           • Si base es CLP (tipo=="2"):
               clp = neto_base
               usd = clp / (dolar_observado)   # SIN recargo_dolar
           • Si base es UF  (tipo=="3"):
               clp = neto_base * (_tasa_uf_clp())
               usd = (clp) / (dolar_observado) # SIN recargo_dolar

        Siempre redondeamos a 2 decimales.
        """
        neto_base = self.precio_venta_neta_unitario_moneda_base
        tipo = self.cotizacion.tipo_moneda or "2"
        dolar_obs = Decimal(self.cotizacion.dolar_observado or 0)
        tasa_usd = self._tasa_usd_clp()
        tasa_uf = self._tasa_uf_clp()

        unit_clp = Decimal("0.00")
        unit_usd = Decimal("0.00")

        if tipo == "1":
            # base en USD
            unit_usd = neto_base
            if tasa_usd > 0:
                unit_clp = (unit_usd * tasa_usd).quantize(Decimal("0.01"))

        elif tipo == "2":
            # base en CLP
            unit_clp = neto_base
            if dolar_obs > 0:
                unit_usd = (unit_clp / dolar_obs).quantize(Decimal("0.01"))

        else:  # tipo == "3"
            # base en UF
            unit_clp = (neto_base * tasa_uf).quantize(Decimal("0.01"))
            if dolar_obs > 0:
                unit_usd = (unit_clp / dolar_obs).quantize(Decimal("0.01"))

        return {
            "clp": unit_clp.quantize(Decimal("0.01")),
            "usd": unit_usd.quantize(Decimal("0.01"))
        }

    @property
    def precio_total_backend(self) -> dict:
        """
        Devuelve un dict con el “precio neto total” (unitario × cantidad) convertido a CLP y USD:
          {
            "clp": Decimal(...),
            "usd": Decimal(...)
          }

        Simplemente multiplicamos cada valor de precio_unitario_backend por cantidad:
          tot_clp = precio_unitario_backend["clp"] * cantidad
          tot_usd = precio_unitario_backend["usd"] * cantidad
        Redondeado a 2 decimales.
        """
        cant = Decimal(self.cantidad or 0)
        unitarios = self.precio_unitario_backend  # { "clp": ..., "usd": ... }

        tot_clp = (unitarios["clp"] * cant).quantize(Decimal("0.01"))
        tot_usd = (unitarios["usd"] * cant).quantize(Decimal("0.01"))

        return {
            "clp": tot_clp.quantize(Decimal("0.01")),
            "usd": tot_usd.quantize(Decimal("0.01"))
        }

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
    cotizacion = models.ForeignKey(Cotizacion, related_name="solicitantes", on_delete=models.CASCADE)
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