from datetime import date, timedelta
from decimal import Decimal

from core.models import ModeloBase
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db import models
from django.db.models import Q
from simple_history.models import HistoricalRecords as Historia

from .estados_modelo import *


class Cotizacion(ModeloBase):
    nombre = models.CharField(max_length=150, verbose_name="Nombre de Cotización")
    empresa = models.ForeignKey(
        "empresas.Empresa",
        on_delete=models.CASCADE,
        verbose_name="Empresa",
        related_name="cotizacion_empresa",
    )
    cliente = models.ForeignKey(
        "empresas.Empresa",
        on_delete=models.CASCADE,
        verbose_name="Cliente",
        related_name="cotizacion_cliente",
    )
    numero_cotizacion = models.IntegerField(
        verbose_name="Número de Cotización", blank=True, null=True, unique=True
    )
    fecha_vencimiento = models.DateField(
        null=True, blank=True, verbose_name="Fecha de vencimiento"
    )
    estado = models.CharField(
        max_length=20,
        choices=ESTADOS_COTIZACION,
        default="pendiente",
        verbose_name="Estado de la cotización",
    )
    descripcion = models.CharField(
        max_length=150,
        null=True,
        blank=True,
        verbose_name="Descripción general de la cotización",
    )
    total_estimado = models.DecimalField(
        max_digits=10, decimal_places=2, default=0.00, verbose_name="Total estimado"
    )
    observaciones = models.TextField(
        null=True, blank=True, verbose_name="Observaciones para el cliente"
    )
    # items = models.ManyToManyField("cotizaciones.ItemCotizacion", related_name="items_cotizacion", blank=True)
    tipo_moneda = models.CharField(
        max_length=1,
        choices=[("1", "USD"), ("2", "CLP"), ("3", "UF")],
        default="2",
        verbose_name="Tipo de Moneda",
    )
    porcentaje_recargo = models.PositiveIntegerField(
        default=0,
        verbose_name="Porcentaje de recargo",
    )
    historia = Historia()
    # solicitantes = models.ManyToManyField("cotizaciones.SolicitanteCotizacion", related_name="solicitantes_cotizacion", blank=True)
    fecha_facturacion = models.DateField(null=True, blank=True)
    dolar_observado = models.DecimalField(
        null=True, blank=True, decimal_places=2, max_digits=10
    )
    valor_uf = models.DecimalField(
        null=True, blank=True, decimal_places=2, max_digits=10
    )
    fecha_tipo_cambio = models.DateField(null=True, blank=True)
    estado_tipo_cambio = models.CharField(
        max_length=20,
        choices=ESTADO_TIPO_CAMBIO,
        default='pendiente',
        verbose_name="Estado del tipo de cambio",
        help_text="Indica si el tipo de cambio fue obtenido automáticamente, manualmente o falló",
    )
    error_tipo_cambio = models.TextField(
        null=True,
        blank=True,
        verbose_name="Error de tipo de cambio",
        help_text="Mensaje de error si falló la obtención del tipo de cambio",
    )
    ppm = models.DecimalField(default=1, max_digits=5, decimal_places=2)
    copia_de = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="copias",
        verbose_name="Cotizacion original",
    )

    class Meta:
        verbose_name = "Cotización"
        verbose_name_plural = "Cotizaciones"
        ordering = ["-fecha_creacion"]

    def __str__(self):
        return f"Cotización #{self.numero_cotizacion} - {self.cliente.nombre}"

    @property
    def calcular_total_estimado(self):
        """Calcula el total estimado sumando los costos totales de los items."""
        # Ajuste: la relación correcta es 'items' (related_name en ItemCotizacion)
        total = Decimal(0)
        for item in self.items.all():
            # precio_total_backend devuelve { 'clp': ..., 'usd': ... } con el precio final (con margen)
            precios = item.precio_total_backend

            if self.tipo_moneda == "1":  # USD
                total += precios["usd"]
            elif self.tipo_moneda == "2":  # CLP
                total += precios["clp"]
            elif self.tipo_moneda == "3":  # UF
                # Convertir CLP a UF usando el valor UF de la cotización
                valor_uf = Decimal(self.valor_uf or 1)
                total += precios["clp"] / valor_uf

        # UF requiere mas precision (4 decimales) para que el total en la lista coincida con el detalle
        div = Decimal("0.0001") if self.tipo_moneda == "3" else Decimal("0.01")
        return total.quantize(div)

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

    def save(self, *args, **kwargs):
        if not self.numero_cotizacion:
            valor_inicial = 800  # Establece el número inicial mínimo
            last_cotizacion = Cotizacion.objects.order_by("-numero_cotizacion").first()
            if last_cotizacion and last_cotizacion.numero_cotizacion is not None:
                self.numero_cotizacion = last_cotizacion.numero_cotizacion + 1
            else:
                self.numero_cotizacion = valor_inicial
            # Asegura que no haya conflicto en la BD (si hay un número duplicado, aumenta hasta encontrar uno disponible)
            while Cotizacion.objects.filter(
                numero_cotizacion=self.numero_cotizacion
            ).exists():
                self.numero_cotizacion += 1

        if not self.fecha_vencimiento:
            self.fecha_vencimiento = self.establecer_fecha_vencimiento()
        super().save(*args, **kwargs)


class ItemCotizacion(ModeloBase):
    cotizacion = models.ForeignKey(
        Cotizacion,
        related_name="items",
        on_delete=models.CASCADE,
        verbose_name="Cotización",
    )
    item_empresa = models.ForeignKey(
        "items.ItemEmpresa", on_delete=models.SET_NULL, null=True, blank=True
    )
    proveedor_empresa = models.ForeignKey(
        "items.ProveedorEmpresa", on_delete=models.SET_NULL, null=True, blank=True
    )
    aprobado = models.BooleanField(default=False)
    nombre = models.CharField(
        max_length=250,
        verbose_name="Nombre del Item de Cotización",
        null=True,
        blank=True,
    )
    descripcion = models.TextField(
        verbose_name="Descripción del producto/servicio", null=True, blank=True
    )
    cantidad = models.PositiveIntegerField(verbose_name="Cantidad")
    precio_unitario = models.DecimalField(
        max_digits=10, decimal_places=2, verbose_name="Precio unitario"
    )
    costo_total = models.DecimalField(
        max_digits=10, decimal_places=2, verbose_name="Costo total", blank=True
    )
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
        costo = self._costo_total_en_clp
        factor = Decimal(self.cotizacion.porcentaje_recargo or 0) / Decimal(100)
        base = costo + (costo * factor) if factor else costo

        iva = base * Decimal("0.19")
        return iva.quantize(Decimal("0.01"))

    @property
    def iva_compra(self) -> Decimal:
        """
        IVA de compra (19% sobre costo_total).
        """
        costo = self._costo_total_en_clp
        iva = costo * Decimal("0.19")
        return iva.quantize(Decimal("0.01"))

    @property
    def valor_ppm(self) -> Decimal:
        """
        Valor de PPM total en CLP:
          = (costo_total + recargo) * (ppm/100)
        Redondeado a 2 decimales.
        """
        costo = self._costo_total_en_clp
        factor = Decimal(self.cotizacion.porcentaje_recargo or 0) / Decimal(100)
        base = costo + (costo * factor) if factor else costo

        ppm_amount = base * (Decimal(self.cotizacion.ppm or 0) / Decimal(100))
        return ppm_amount.quantize(Decimal("0.01"))

    @property
    def total_impuesto(self) -> Decimal:
        """
        total_impuesto en CLP:
          = (IVA venta) - (IVA compra) + (PPM_amount)
        donde IVA venta = (costo+recargo)*0.19; IVA compra = costo*0.19; PPM_amount = valor_ppm.
        """
        costo = self._costo_total_en_clp
        factor = Decimal(self.cotizacion.porcentaje_recargo or 0) / Decimal(100)
        base = costo + (costo * factor) if factor else costo

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
        costo = self._costo_total_en_clp
        factor = Decimal(self.cotizacion.porcentaje_recargo or 0) / Decimal(100)
        recargo = costo * factor if factor else Decimal("0.00")

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
        return Decimal(self.cotizacion.dolar_observado or 0) + Decimal(
            self.recargo_dolar or 0
        )

    def _tasa_uf_clp(self) -> Decimal:
        """
        Tasa CLP por 1 UF.
          = cotizacion.valor_uf
        """
        return Decimal(self.cotizacion.valor_uf or 1)

    def _get_tipo_moneda(self) -> str:
        """
        Obtiene el tipo de moneda del proveedor asociado al item.
        Default: '2' (CLP) si no hay proveedor.
        """
        if self.proveedor_empresa:
            return self.proveedor_empresa.tipo_moneda or "2"
        return "2"  # CLP por defecto

    @property
    def _costo_total_en_clp(self) -> Decimal:
        """
        Calcula el costo total convertido a CLP.
        Usa la lógica de precio_total_backend["clp"] pero para el costo.
        """
        costo = Decimal(self.costo_total or 0)
        tipo = self._get_tipo_moneda()
        dolar_obs = Decimal(self.cotizacion.dolar_observado or 0)
        # tasa_usd ya incluye recargo_dolar
        tasa_usd = self._tasa_usd_clp()
        tasa_uf = self._tasa_uf_clp()

        if tipo == "1":  # USD -> CLP
            if tasa_usd > 0:
                return (costo * tasa_usd).quantize(Decimal("0.01"))
        elif tipo == "2":  # CLP -> CLP
            return costo
        elif tipo == "3":  # UF -> CLP
            return (costo * tasa_uf).quantize(Decimal("0.01"))

        return costo

    #
    # ——————————————————————
    # 3) "Precio neto" en moneda base
    # ——————————————————————
    #

    @property
    def precio_venta_neta_unitario_moneda_base(self) -> Decimal:
        """
        Devuelve el precio de venta neto unitario (Costo + Recargo)
        en la moneda de la COTIZACIÓN (CLP, USD o UF).
        """
        costo_unitario_clp = (
            self._costo_total_en_clp / Decimal(self.cantidad)
            if self.cantidad
            else Decimal("0.00")
        )
        factor_rec = Decimal(self.cotizacion.porcentaje_recargo or 0) / Decimal(100)
        venta_unitario_clp = (
            costo_unitario_clp * (Decimal("1.00") + factor_rec)
            if factor_rec
            else costo_unitario_clp
        )

        moneda_coti = self.cotizacion.tipo_moneda
        if moneda_coti == "1":  # Venta en USD
            # Para la VENTA en USD usamos el dolar_observado de la cotización
            # (precio "limpio" para el cliente), aunque el costo CLP ya incluya el margen.
            tasa_venda_usd = Decimal(self.cotizacion.dolar_observado or 1)
            if tasa_venda_usd > 0:
                return (venta_unitario_clp / tasa_venda_usd).quantize(Decimal("0.01"))
            return Decimal("0.00")
        elif moneda_coti == "3":  # Venta en UF
            tasa_uf = self._tasa_uf_clp()
            if tasa_uf > 0:
                return (venta_unitario_clp / tasa_uf).quantize(Decimal("0.0001"))
            return Decimal("0.00")

        # Venta en CLP (Default)
        return venta_unitario_clp.quantize(Decimal("0.01"))

    @property
    def precio_venta_neta_total_moneda_base(self) -> Decimal:
        """
        Devuelve el precio de venta neto total (Costo + Recargo) * Cantidad
        en la moneda de la COTIZACIÓN (CLP, USD o UF).
        """
        costo_total_clp = self._costo_total_en_clp
        factor_rec = Decimal(self.cotizacion.porcentaje_recargo or 0) / Decimal(100)
        venta_total_clp = (
            costo_total_clp * (Decimal("1.00") + factor_rec)
            if factor_rec
            else costo_total_clp
        )

        moneda_coti = self.cotizacion.tipo_moneda
        if moneda_coti == "1":  # Venta en USD
            tasa_venda_usd = Decimal(self.cotizacion.dolar_observado or 1)
            if tasa_venda_usd > 0:
                return (venta_total_clp / tasa_venda_usd).quantize(Decimal("0.01"))
            return Decimal("0.00")
        elif moneda_coti == "3":  # Venta en UF
            tasa_uf = self._tasa_uf_clp()
            if tasa_uf > 0:
                return (venta_total_clp / tasa_uf).quantize(Decimal("0.0001"))
            return Decimal("0.00")

        # Venta en CLP (Default)
        return venta_total_clp.quantize(Decimal("0.01"))

    #
    # ——————————————————————
    # 4) Props "unitario" / "total" en CLP y USD
    # ——————————————————————
    #

    @property
    def precio_unitario_backend(self) -> dict:
        """
        Devuelve un dict con el "precio neto por unidad" (Costo + Recargo)
        convertido a CLP y USD para propósitos de impuestos y márgenes internos.
        """
        costo_unitario_clp = (
            self._costo_total_en_clp / Decimal(self.cantidad)
            if self.cantidad
            else Decimal("0.00")
        )
        factor_rec = Decimal(self.cotizacion.porcentaje_recargo or 0) / Decimal(100)
        venta_unitario_clp = (
            costo_unitario_clp * (Decimal("1.00") + factor_rec)
            if factor_rec
            else costo_unitario_clp
        )

        dolar_obs = Decimal(self.cotizacion.dolar_observado or 0)
        unit_clp = venta_unitario_clp
        unit_usd = venta_unitario_clp / dolar_obs if dolar_obs > 0 else Decimal("0.00")

        return {
            "clp": unit_clp.quantize(Decimal("0.01")),
            "usd": unit_usd.quantize(Decimal("0.01")),
        }

    @property
    def precio_total_backend(self) -> dict:
        """
        Devuelve un dict con el "precio neto total" (unitario × cantidad) convertido a CLP y USD:
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
            "usd": tot_usd.quantize(Decimal("0.01")),
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
    cotizacion = models.ForeignKey(
        Cotizacion,
        related_name="seguimientos",
        on_delete=models.CASCADE,
        verbose_name="Cotización",
    )
    tipo = models.CharField(
        max_length=20,
        choices=TIPO_SEGUIMIENTO_COTIZACION,
        default="actualizacion",
        verbose_name="Tipo de seguimiento",
    )
    fecha = models.DateTimeField(
        auto_now_add=True, verbose_name="Fecha del seguimiento"
    )
    comentario = models.TextField(verbose_name="Comentario del seguimiento")
    usuario = models.ForeignKey(
        "empresas.UsuarioEmpresa",
        on_delete=models.CASCADE,
        verbose_name="Usuario responsable",
        blank=True,
        null=True,  # Permite null para seguimientos desde endpoints públicos
    )

    class Meta:
        verbose_name = "Seguimineto de Cotización"
        verbose_name_plural = "Seguimientos de Cotizaciones"

    def __str__(self):
        return f"Seguimiento para Cotización #{self.cotizacion.id} - {self.fecha.strftime('%Y-%m-%d %H:%M:%S')}"


class EnvioCorreoCotizacion(models.Model):
    cotizacion = models.ForeignKey(
        Cotizacion,
        related_name="envios_correos",
        on_delete=models.CASCADE,
        verbose_name="Cotización",
    )
    fecha_envio = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de envío")
    usuarios_destinatarios = models.ManyToManyField(
        "empresas.UsuarioEmpresa",
        related_name="envios_cotizaciones",
        blank=True,
        verbose_name="Usuarios destinatarios",
    )
    correos_externos = models.TextField(
        blank=True, null=True, verbose_name="Correos externos"
    )

    class Meta:
        verbose_name = "Envío de Correo de Cotización"
        verbose_name_plural = "Envíos de Correos de Cotizaciones"

    def __str__(self):
        return f"Envío #{self.id} - Cotización {self.cotizacion.numero_cotizacion} ({self.fecha_envio.strftime('%Y-%m-%d %H:%M')})"

    def get_correos_externos(self):
        """Devuelve la lista de correos externos como una lista de Python."""
        return (
            [correo.strip() for correo in self.correos_externos.split(",")]
            if self.correos_externos
            else []
        )


class SolicitanteCotizacion(ModeloBase):
    cotizacion = models.ForeignKey(
        Cotizacion, related_name="solicitantes", on_delete=models.CASCADE
    )
    opciones = Q(app_label="cotizaciones", model="solicitanteexterno") | Q(
        app_label="empresas", model="usuarioempresa"
    )
    content_type = models.ForeignKey(
        ContentType, on_delete=models.CASCADE, limit_choices_to=opciones
    )
    usuario_id = models.PositiveIntegerField()
    usuario = GenericForeignKey("content_type", "usuario_id")
    aprobo = models.BooleanField(default=False)
    fecha_aprobacion = models.DateTimeField(blank=True, null=True)
    
    # --- Campos para aprobación/rechazo vía email (público) ---
    token = models.UUIDField(unique=True, editable=False, blank=True, null=True)
    token_usado = models.BooleanField(default=False)
    fecha_respuesta = models.DateTimeField(blank=True, null=True)
    ip_respuesta = models.GenericIPAddressField(blank=True, null=True)
    motivo_rechazo = models.TextField(blank=True, null=True)

    class Meta:
        verbose_name = "Solicitante de Cotización"
        verbose_name_plural = "Solicitantes de Cotizaciones"

    def __str__(self):
        return (
            f"{self.pk} - Usuario: {self.usuario_id} Modelo: {self.content_type.model}"
        )

    def save(self, *args, **kwargs):
        import uuid
        if not self.token:
            self.token = uuid.uuid4()
        super().save(*args, **kwargs)

    def get_email(self):
        """Retorna el email del solicitante según su tipo."""
        if self.content_type.model == "solicitanteexterno":
            return getattr(self.usuario, "email", None)
        elif self.content_type.model == "usuarioempresa":
            return getattr(getattr(self.usuario, "usuario", None), "email", None)
        return None

    def get_nombre(self):
        """Retorna el nombre del solicitante según su tipo."""
        if self.content_type.model == "solicitanteexterno":
            return getattr(self.usuario, "nombre", "Solicitante Externo")
        elif self.content_type.model == "usuarioempresa":
            usuario = getattr(self.usuario, "usuario", None)
            if usuario:
                return usuario.get_nombre_completo() or usuario.email
        return "Solicitante"


class SolicitanteExterno(ModeloBase):
    email = models.EmailField(max_length=100)
    nombre = models.CharField(max_length=200)

    class Meta:
        verbose_name = "Solicitante Externo"
        verbose_name_plural = "Solicitantes Externos"

    def __str__(self):
        return f"{self.email} {self.nombre}"
