import random
import string

from core.models import ModeloBase, ModeloBaseHistorico
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db import models
from django.db.models import Q

from .estados_modelo import *


def generate_random_code():
    """
    Generates a random 4-character alphanumeric code.

    Returns:
        str: A string representing the 4-character alphanumeric code.
    """
    characters = (
        string.ascii_letters + string.digits
    )  # Includes uppercase, lowercase letters, and digits
    return "".join(random.choice(characters) for _ in range(4))


class OrdenCompraAgrupada(ModeloBase):
    """
    Contenedor de OCs agrupadas por cliente/prospecto y cotizaciones.
    Cada OC individual dentro de ella corresponde a un proveedor distinto.
    """
    codigo = models.CharField(max_length=50, unique=True)
    oc_empresa = models.ForeignKey(
        "empresas.Empresa",
        on_delete=models.CASCADE,
        related_name="oc_agrupadas_empresa",
    )
    oc_cliente = models.ForeignKey(
        "empresas.Empresa",
        on_delete=models.CASCADE,
        related_name="oc_agrupadas_cliente",
    )
    cotizaciones = models.ManyToManyField(
        "cotizaciones.Cotizacion",
        related_name="oc_agrupadas",
        blank=True,
    )
    creado_por = models.ForeignKey(
        "empresas.UsuarioEmpresa", on_delete=models.SET_NULL, null=True
    )
    observaciones = models.TextField(blank=True)

    @property
    def estado_derivado(self):
        """Calcula el estado del contenedor a partir del estado de sus OCs."""
        ocs = self.ordenes_compra.all()
        if not ocs.exists():
            return "borrador"
        estados = set(oc.estado for oc in ocs)
        # Todas canceladas
        if estados == {"6"}:
            return "cancelada"
        # Todas completadas o cerradas (5 y 7)
        if estados.issubset({"5", "7"}):
            return "completada"
        # Al menos una completada pero no todas
        if {"5", "7"} & estados:
            return "parcialmente_completada"
        return "en_proceso"

    @property
    def estado_derivado_label(self):
        mapa = dict(ESTADOS_OC_AGRUPADA)
        return mapa.get(self.estado_derivado, self.estado_derivado)

    def save(self, *args, **kwargs):
        if not self.codigo:
            self.codigo = generate_random_code()
        return super().save(*args, **kwargs)

    class Meta:
        verbose_name = "OC Agrupada"
        verbose_name_plural = "OCs Agrupadas"
        ordering = ["-fecha_creacion"]

    def __str__(self):
        return f"OC Agrupada {self.codigo}"


class Bodega(ModeloBase):
    nombre = models.CharField(max_length=250)
    sucursal = models.ForeignKey("empresas.SucursalEmpresa", on_delete=models.CASCADE)
    stocks = models.ManyToManyField(
        "items.ItemEmpresa", through="bodegas.StockItemEnBodega"
    )

    class Meta:
        verbose_name = "Bodega"
        verbose_name_plural = "Bodegas"

    def __str__(self):
        return self.nombre


class TomaInventario(ModeloBase):
    bodegas = models.ManyToManyField(Bodega)
    fecha_inicio = models.DateTimeField(blank=True, null=True)
    fecha_termino = models.DateTimeField(blank=True, null=True)
    motivo = models.TextField()
    items_a_inventariar = models.ManyToManyField(
        "bodegas.StockItemEnBodega", through="bodegas.ItemEnTomaInventario"
    )
    creado_por = models.ForeignKey(
        "empresas.UsuarioEmpresa", on_delete=models.SET_NULL, blank=True, null=True
    )

    class Meta:
        verbose_name = "Toma de Inventario"
        verbose_name_plural = "Tomas de Inventarios"
        ordering = ["-fecha_creacion"]

    def __str__(self):
        return f"Toma de Inventario N°{self.pk} por {self.motivo}"


class EstadoTomaInventario(ModeloBase):
    toma_inventario = models.ForeignKey(
        TomaInventario, on_delete=models.CASCADE, related_name="estados"
    )
    estado = models.CharField(
        max_length=50, default="pendiente", choices=ESTADO_TOMA_INVENTARIO
    )
    usuario = models.ForeignKey(
        "empresas.UsuarioEmpresa", on_delete=models.SET_NULL, blank=True, null=True
    )
    fecha_cambio = models.DateTimeField(blank=True, null=True)
    observaciones = models.TextField(blank=True)

    class Meta:
        verbose_name = "Estado Toma de Inventario"
        verbose_name_plural = "Estados de Tomas de Inventarios"

    def __str__(self):
        return f"Estado {self.get_estado_display()} en Toma de Inventario N°{self.toma_inventario.pk}"


class ItemEnTomaInventario(ModeloBase):
    toma_inventario = models.ForeignKey(TomaInventario, on_delete=models.CASCADE)
    stock_item = models.ForeignKey(
        "bodegas.StockItemEnBodega", on_delete=models.CASCADE
    )
    cantidad_original = models.IntegerField()
    cantidad_encontrada = models.IntegerField()
    estado = models.CharField(
        max_length=50, default="por_inventariar", choices=ESTADO_ITEM_INTEVENTARIADO
    )
    observaciones = models.TextField(blank=True)

    class Meta:
        verbose_name = "Item en Toma de Inventario"
        verbose_name_plural = "Items en Tomas de Inventarios"

    def __str__(self):
        return f"{self.stock_item.item.nombre} en Toma de Inventario N°{self.toma_inventario.pk}"


class ImagenDeItemEnTomaInventario(ModeloBase):
    item = models.ForeignKey(
        ItemEnTomaInventario, related_name="imagenes", on_delete=models.CASCADE
    )
    imagen = models.TextField()

    class Meta:
        verbose_name = "Imagen de Item en Toma de Inventario"
        verbose_name_plural = "Imagenes de Items en Tomas de Inventarios"

    def __str__(self):
        return f"Imagen de {self.item.stock_item.item.nombre} en Toma de Inventario N°{self.item.toma_inventario.pk}"


class OrdenCompra(ModeloBaseHistorico):
    codigo = models.CharField(max_length=50, unique=True)
    cotizacion = models.FileField(
        upload_to="ordenes_compra_pdfs/", null=True, blank=True
    )
    proveedor = models.ForeignKey(
        "items.ProveedorEmpresa", on_delete=models.SET_NULL, null=True
    )
    oc_cliente = models.ForeignKey(
        "empresas.Empresa",
        on_delete=models.SET_NULL,
        null=True,
        related_name="ordenes_cliente",
    )
    oc_empresa = models.ForeignKey(
        "empresas.Empresa",
        on_delete=models.SET_NULL,
        null=True,
        related_name="ordenes_empresa",
    )
    creado_por = models.ForeignKey(
        "empresas.UsuarioEmpresa", on_delete=models.SET_NULL, null=True
    )
    relacion_cotizacion = models.ForeignKey(
        "cotizaciones.Cotizacion", on_delete=models.SET_NULL, null=True, blank=True
    )
    oc_agrupada = models.ForeignKey(
        "bodegas.OrdenCompraAgrupada",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ordenes_compra",
    )
    observaciones = models.TextField(blank=True)
    estado = models.CharField(max_length=2, choices=ESTADOS_OC, default="-")
    consumo_directo = models.BooleanField(
        default=False,
        help_text="Los ítems de esta OC se consumen directamente y no ingresan a bodega.",
    )
    items = models.ManyToManyField(
        "items.ItemEmpresa", through="bodegas.ItemEnOrdenCompra"
    )
    dolar_observado = models.PositiveIntegerField(blank=True, null=True)
    fecha_compra = models.DateField(blank=True, null=True)

    def __str__(self):
        return "id: %s - %s" % (self.pk, self.codigo)

    def save(self, *args, **kwargs):
        if not self.codigo:
            self.codigo = generate_random_code()
        return super().save(*args, **kwargs)

    class Meta:
        verbose_name = "Orden de Compra"
        verbose_name_plural = "Ordenes de Compra"
        ordering = ["-fecha_creacion"]


class ItemEnOrdenCompra(ModeloBase):
    orden_compra = models.ForeignKey(OrdenCompra, on_delete=models.CASCADE)
    item = models.ForeignKey("items.ItemEmpresa", on_delete=models.CASCADE)
    cantidad = models.IntegerField()
    precio = models.IntegerField()

    class Meta:
        verbose_name = "Item en Orden de Compra"
        verbose_name_plural = "Items en Orden de Compra"

    def __str__(self):
        return "%s en %s" % (self.item.nombre, self.orden_compra)


class ArchivoCompra(ModeloBase):
    opcion = models.CharField(max_length=50, choices=OPCIONES_ARCHIVO, default="boleta")
    archivo = models.FileField(upload_to="archivo_compra/", null=True, blank=True)
    imagen = models.TextField(null=True, blank=True)
    creado_por = models.ForeignKey(
        "empresas.UsuarioEmpresa", on_delete=models.SET_NULL, null=True
    )
    compra = models.ForeignKey(
        "bodegas.Compra", on_delete=models.CASCADE, related_name="archivos"
    )
    tipo = models.CharField(max_length=2, choices=TIPO_ARCHIVO, default="1")
    observaciones = models.TextField(blank=True, null=True)

    class Meta:
        verbose_name = "Archivo en Compra"
        verbose_name_plural = "Archivos en Compras"

    def __str__(self):
        return self.get_opcion_display()


class Compra(ModeloBaseHistorico):
    codigo = models.CharField(max_length=50, unique=True)
    # tipo = models.CharField(
    #     max_length=50, choices=TIPO_COMPRA, default="nacional", null=True, blank=True
    # )
    sucursal = models.ForeignKey("empresas.SucursalEmpresa", on_delete=models.CASCADE)
    creado_por = models.ForeignKey(
        "empresas.UsuarioEmpresa", on_delete=models.SET_NULL, null=True
    )
    observaciones = models.TextField(blank=True)
    fecha_compra = models.DateField(
        null=True,
        blank=True,
        help_text="Fecha de la compra",
    )
    estado = models.CharField(max_length=2, choices=ESTADO_CR, default="-")
    items = models.ManyToManyField("items.ItemEmpresa", through="bodegas.ItemEnCompra")
    orden_trabajo = models.ForeignKey(
        "ordentrabajov2.OrdenDeTrabajo",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="compras_rapidas",
        verbose_name="Orden de trabajo",
    )

    @property
    def total_compra(self):
        return sum(l.cantidad * l.precio for l in self.itemencompra_set.all())

    def save(self, *args, **kwargs):
        if not self.codigo:
            self.codigo = generate_random_code()
        return super().save(*args, **kwargs)

    class Meta:
        verbose_name = "Compra"
        verbose_name_plural = "Compras"
        ordering = ["-fecha_creacion"]

    def __str__(self):
        return "id: %s - %s" % (self.pk, self.codigo)


class ItemEnCompra(ModeloBase):
    compra = models.ForeignKey(Compra, on_delete=models.CASCADE)
    item = models.ForeignKey("items.ItemEmpresa", on_delete=models.CASCADE)
    cantidad = models.IntegerField()
    precio = models.IntegerField()

    class Meta:
        verbose_name = "Item en Compra"
        verbose_name_plural = "Items en Compras"

    def __str__(self):
        return self.item.nombre


class StockItemEnBodega(ModeloBaseHistorico):
    bodega = models.ForeignKey(
        Bodega, related_name="stock_items", on_delete=models.CASCADE
    )
    item = models.OneToOneField("items.ItemEmpresa", on_delete=models.CASCADE)
    cantidad = models.IntegerField(default=0)
    cantidad_no_disponible = models.IntegerField(default=0)
    pmp = models.IntegerField(default=0)
    compras = models.ManyToManyField(
        ContentType, through="bodegas.ItemOrdenCompraEnStock"
    )

    class Meta:
        verbose_name = "Stock de Item en Bodega"
        verbose_name_plural = "Stock de Items en Bodega"

    def __str__(self):
        return "%s en %s" % (self.item.nombre, self.bodega.nombre)


class ItemOrdenCompraEnStock(ModeloBase):
    opciones = Q(app_label="bodegas", model="itemenordencompra") | Q(
        app_label="bodegas", model="itemencompra"
    )
    content_type = models.ForeignKey(
        ContentType, on_delete=models.CASCADE, limit_choices_to=opciones
    )
    item_oc_id = models.PositiveIntegerField()
    item_oc = GenericForeignKey("content_type", "item_oc_id")
    stock_item = models.ForeignKey(
        StockItemEnBodega, on_delete=models.CASCADE, null=True, blank=True
    )
    bodega_temporal = models.ForeignKey(
        "bodegas.Bodega", on_delete=models.CASCADE, blank=True, null=True
    )
    numeros_serie = models.JSONField(default=dict, blank=True)
    cantidad = models.IntegerField(default=0)

    class Meta:
        verbose_name = "Item de Orden de Compra en Stock"
        verbose_name_plural = "Items de Orden de Compra en Stock"


class SerieItem(ModeloBase):
    """
    Modelo relacional para números de serie.
    Reemplaza el JSONField 'numeros_serie' en ItemOrdenCompraEnStock.

    Ciclo de vida:
        disponible → reservada (al asignar a guía) → despachada (al confirmar entrega)
        reservada → disponible (al liberar/desasignar)
        despachada → devuelta (al recibir devolución)
    """
    serie = models.CharField(max_length=250)
    stock_item = models.ForeignKey(
        StockItemEnBodega,
        on_delete=models.CASCADE,
        related_name="series",
    )
    item_orden_compra_en_stock = models.ForeignKey(
        ItemOrdenCompraEnStock,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="series",
        help_text="Referencia al registro de compra/stock de donde proviene la serie",
    )
    item_guia_salida = models.ForeignKey(
        "bodegas.ItemsGuiaSalida",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="series",
        help_text="Guía de salida donde está reservada/despachada esta serie",
    )
    empresa = models.ForeignKey(
        "empresas.Empresa",
        on_delete=models.CASCADE,
        related_name="series_items",
    )
    estado = models.CharField(
        max_length=20,
        choices=(
            ("disponible", "Disponible"),
            ("reservada", "Reservada en Guía"),
            ("despachada", "Despachada"),
            ("devuelta", "Devuelta"),
        ),
        default="disponible",
    )

    class Meta:
        verbose_name = "Serie de Item"
        verbose_name_plural = "Series de Items"
        constraints = [
            models.UniqueConstraint(
                fields=["serie", "empresa"],
                name="uniq_serie_por_empresa",
            ),
        ]

    def __str__(self):
        return f"{self.serie} ({self.get_estado_display()})"


class GuiaSalida(ModeloBaseHistorico):
    bodega = models.ForeignKey("bodegas.Bodega", on_delete=models.CASCADE)
    cliente = models.ForeignKey(
        "empresas.Empresa",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="guias_salida_cliente",
    )
    cotizacion_origen = models.ForeignKey(
        "cotizaciones.Cotizacion",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="guias_salida",
        help_text="Cotizacion de origen usada como fuente de verdad para el flujo de OT.",
    )
    recibido_por = models.ForeignKey(
        "empresas.UsuarioEmpresa", on_delete=models.SET_NULL, null=True, blank=True
    )
    creado_por = models.ForeignKey(
        "empresas.UsuarioEmpresa",
        on_delete=models.SET_NULL,
        null=True,
        related_name="creado_por_guia",
    )
    firma_recibido_por = models.TextField(blank=True)
    fecha_firma_recibido_por = models.DateTimeField(null=True, blank=True)
    motivo = models.TextField(blank=True)
    estado = models.CharField(max_length=2, choices=ESTADOS_REBAJE, default="P")
    items = models.ManyToManyField(
        "bodegas.StockItemEnBodega",
        through="bodegas.ItemsGuiaSalida",
        related_name="items_guia",
    )
    firma_entrega = models.TextField(blank=True)
    fecha_firma_entrega = models.DateTimeField(null=True, blank=True)
    entregado_a = models.ForeignKey(
        "empresas.UsuarioEmpresa",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="entregado_a_guia",
    )
    orden_trabajo = models.ForeignKey(
        "ordentrabajov2.OrdenDeTrabajo",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="guias_salida",
    )

    def __str__(self):
        return f"Guia de Salida {self.pk} - Bodega: {self.bodega.nombre}"

    def obtener_cotizacion_origen_legacy_id(self):
        cotizaciones_ids = list(
            self.itemsguiasalida_set.filter(
                source_item__orden_compra__relacion_cotizacion__isnull=False,
            )
            .values_list(
                "source_item__orden_compra__relacion_cotizacion_id",
                flat=True,
            )
            .distinct()[:2]
        )
        if len(cotizaciones_ids) == 1:
            return cotizaciones_ids[0]
        return None

    @property
    def cotizacion_origen_efectiva_id(self):
        return self.cotizacion_origen_id or self.obtener_cotizacion_origen_legacy_id()

    @property
    def cotizacion_origen_efectiva(self):
        if self.cotizacion_origen_id:
            return self.cotizacion_origen

        cotizacion_id = self.obtener_cotizacion_origen_legacy_id()
        if not cotizacion_id:
            return None

        from cotizaciones.models import Cotizacion

        return Cotizacion.objects.filter(pk=cotizacion_id).first()

    class Meta:
        verbose_name = "Guia de Salida"
        verbose_name_plural = "Guias de Salidas"
        ordering = ["-fecha_creacion"]


class ItemsGuiaSalida(ModeloBaseHistorico):
    guia = models.ForeignKey(GuiaSalida, on_delete=models.CASCADE)
    stock_item = models.ForeignKey(
        "bodegas.StockItemEnBodega", on_delete=models.CASCADE
    )
    cantidad_original = models.IntegerField(default=0)
    cantidad_rebajada = models.IntegerField(default=0)
    cantidad_devuelta = models.IntegerField(default=0)
    numero_serie = models.JSONField(default=dict, blank=True)
    individualizado = models.BooleanField(default=False)
    source_item = models.ForeignKey(
        "bodegas.ItemEnOrdenCompra",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text="Referencia al item de la Orden de Compra origen (trazabilidad a nivel item)",
    )

    class Meta:
        verbose_name = "Item en Guia de Salida"
        verbose_name_plural = "Items en Guias de Salidas"
        constraints = [
            models.CheckConstraint(
                check=~models.Q(individualizado=True) | models.Q(cantidad_rebajada=1),
                name="individualizado_implica_cantidad_1",
            ),
        ]

    def __str__(self):
        return f"Item {self.stock_item.item} - Rebajado: {self.cantidad_rebajada}, Devuelto: {self.cantidad_devuelta}"


class MovimientoStock(ModeloBase):
    stock_item = models.ForeignKey(
        "bodegas.StockItemEnBodega",
        on_delete=models.CASCADE,
        related_name="movimientos",
    )
    tipo_movimiento = models.CharField(max_length=20, choices=MOVIMIENTOS_TIPO)
    cantidad = models.IntegerField()
    descripcion = models.TextField(blank=True)
    usuario = models.ForeignKey(
        "empresas.UsuarioEmpresa", on_delete=models.SET_NULL, null=True, blank=True
    )

    # Limitar los content types permitidos a los modelos válidos
    content_type_limit = Q(
        Q(app_label="bodegas", model="itemordencompraenstock")
        | Q(app_label="bodegas", model="itemsguiasalida")
        | Q(app_label="bodegas", model="itementomainventario")
    )

    content_type = models.ForeignKey(
        ContentType,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        limit_choices_to=content_type_limit,
    )
    object_id = models.PositiveIntegerField(null=True, blank=True)
    origen = GenericForeignKey("content_type", "object_id")

    class Meta:
        verbose_name = "Movimiento de Stock"
        verbose_name_plural = "Movimientos de Stock"

    def __str__(self):
        return f"[{self.tipo_movimiento}] {self.stock_item} -> {self.cantidad} (origen: {self.origen})"


class VoucherDevolucion(ModeloBase):
    """
    Comprobante consolidado de devoluciones realizadas al completar una OT.

    Agrupa todos los MovimientoStock de tipo 'DEVOLUCION' asociados a una OT
    para generar un documento formal imprimible (PDF/HTML).

    Sigue el patrón M2M con tabla intermedia (through) estándar del sistema.
    """

    numero = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
        help_text="Número único del voucher, ej: VDEV-2025-0001",
    )
    orden_trabajo = models.OneToOneField(
        "ordentrabajov2.OrdenDeTrabajo",
        on_delete=models.CASCADE,
        related_name="voucher_devolucion",
        help_text="Orden de trabajo asociada a estas devoluciones",
    )
    movimientos = models.ManyToManyField(
        MovimientoStock,
        through="bodegas.MovimientoEnVoucher",
        related_name="vouchers",
        help_text="Movimientos de stock tipo DEVOLUCION incluidos en este voucher",
    )
    observaciones = models.TextField(
        blank=True, help_text="Notas adicionales sobre las devoluciones"
    )

    class Meta:
        verbose_name = "Voucher de Devolución"
        verbose_name_plural = "Vouchers de Devolución"
        ordering = ["-fecha_creacion"]

    def __str__(self):
        return f"{self.numero} - OT #{self.orden_trabajo.id}"

    @property
    def total_items_devueltos(self):
        """Cantidad total de ítems devueltos en este voucher."""
        return sum(m.cantidad for m in self.movimientos.all())

    def save(self, *args, **kwargs):
        """Auto-genera número de voucher si no existe."""
        if not self.numero:
            # Formato: VDEV-YYYY-NNNN
            from django.utils import timezone

            year = timezone.now().year
            ultimo = (
                VoucherDevolucion.objects.filter(numero__startswith=f"VDEV-{year}")
                .order_by("-numero")
                .first()
            )

            if ultimo:
                # Extraer número y sumar 1
                ultimo_num = int(ultimo.numero.split("-")[-1])
                nuevo_num = ultimo_num + 1
            else:
                nuevo_num = 1

            self.numero = f"VDEV-{year}-{nuevo_num:04d}"

        super().save(*args, **kwargs)


class MovimientoEnVoucher(ModeloBase):
    """
    Tabla intermedia M2M entre VoucherDevolucion y MovimientoStock.

    Permite agregar metadatos específicos de la relación si es necesario
    (ej: orden de aparición, notas, etc.).
    """

    voucher = models.ForeignKey(
        VoucherDevolucion, on_delete=models.CASCADE, related_name="movimientos_voucher"
    )
    movimiento = models.ForeignKey(
        MovimientoStock,
        on_delete=models.CASCADE,
        limit_choices_to={"tipo_movimiento": "DEVOLUCION"},
        help_text="Solo movimientos de tipo DEVOLUCION",
    )
    orden = models.PositiveIntegerField(
        default=0, help_text="Orden de aparición en el voucher (opcional)"
    )
    notas = models.TextField(
        blank=True, help_text="Notas específicas sobre este movimiento en el voucher"
    )

    class Meta:
        verbose_name = "Movimiento en Voucher"
        verbose_name_plural = "Movimientos en Vouchers"
        ordering = ["orden", "-fecha_creacion"]
        unique_together = ["voucher", "movimiento"]

    def __str__(self):
        return f"{self.voucher.numero} → {self.movimiento}"
"""
Módulo de auditoría y trazabilidad para movimientos y series.

Proporciona:
1. Registros de auditoría completos para cada evento
2. Trazabilidad por serie (historial completo)
3. Reportes de conciliación (stock vs movimientos vs series activas)
4. Detección de anomalías e inconsistencias
"""

from django.db import models
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from core.models import ModeloBase
from django.db.models import Q


class BitácoraMovimiento(ModeloBase):
    """
    Registro completo y auditable de cada evento en el sistema de bodegas.
    
    Cada evento relevante crea un registro immutable que permite reconstruir
    el estado del inventario en cualquier momento.
    
    Eventos capturados:
    - Ingreso de stock (compra)
    - Egreso por guía de salida
    - Devoluciones
    - Ajustes de inventario
    - Anulaciones
    - Reversos
    """
    
    TIPO_EVENTO_CHOICES = (
        ('ingreso_compra', 'Ingreso por Compra'),
        ('salida_guia', 'Salida por Guía'),
        ('devolucion', 'Devolución de Cliente'),
        ('ajuste_inventario', 'Ajuste de Inventario'),
        ('anulacion', 'Anulación'),
        ('reverso', 'Reverso de Movimiento'),
        ('ajuste_serie', 'Ajuste de Serie'),
        ('transferencia_bodega', 'Transferencia Entre Bodegas'),
    )
    
    # Identificación del evento
    tipo_evento = models.CharField(
        max_length=30,
        choices=TIPO_EVENTO_CHOICES,
        db_index=True,
        help_text="Clasificación del tipo de evento"
    )
    
    # Documentación del origen
    documento_origen_content_type = models.ForeignKey(
        ContentType,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='bitacora_documentos_origen',
        limit_choices_to=Q(
            Q(app_label='bodegas', model='itemordencompraenstock') |
            Q(app_label='bodegas', model='itemsguiasalida') |
            Q(app_label='bodegas', model='itementomainventario') |
            Q(app_label='bodegas', model='voucherdevolucion')
        ),
        help_text="Tipo de documento origen (OC, Guía, etc)"
    )
    documento_origen_id = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="ID del documento origen"
    )
    documento_origen = GenericForeignKey(
        'documento_origen_content_type',
        'documento_origen_id'
    )
    numero_documento = models.CharField(
        max_length=100,
        blank=True,
        db_index=True,
        help_text="Número visible del documento (ej: OC-001, VDEV-2025-0001)"
    )
    
    # Contexto de bodegas
    bodega_origen = models.ForeignKey(
        'bodegas.Bodega',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='bitacora_salidas',
        help_text="Bodega origen del movimiento"
    )
    bodega_destino = models.ForeignKey(
        'bodegas.Bodega',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='bitacora_entradas',
        help_text="Bodega destino del movimiento"
    )
    
    # Item y stock
    stock_item = models.ForeignKey(
        'bodegas.StockItemEnBodega',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='bitacora_movimientos',
        help_text="Item de stock afectado"
    )
    item_nombre = models.CharField(
        max_length=250,
        blank=True,
        help_text="Nombre del item (snapshot para trazabilidad)"
    )
    
    # Estados y cantidades
    cantidad = models.IntegerField(
        help_text="Cantidad del movimiento (puede ser negativo para egresos)"
    )
    cantidad_series = models.IntegerField(
        default=0,
        help_text="Cantidad de series afectadas"
    )
    
    # Estados previos y posteriores
    cantidad_anterior = models.IntegerField(
        null=True,
        blank=True,
        help_text="Stock disponible antes del movimiento"
    )
    cantidad_posterior = models.IntegerField(
        null=True,
        blank=True,
        help_text="Stock disponible después del movimiento"
    )
    
    # Registro de usuario
    usuario = models.ForeignKey(
        'empresas.UsuarioEmpresa',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='bitacora_eventos',
        help_text="Usuario que realizó la acción"
    )
    usuario_nombre = models.CharField(
        max_length=250,
        blank=True,
        help_text="Nombre del usuario (snapshot)"
    )
    
    # Detalles y observaciones
    descripcion = models.TextField(
        blank=True,
        help_text="Descripción detallada del evento"
    )
    observaciones = models.TextField(
        blank=True,
        help_text="Notas adicionales sobre el movimiento"
    )
    
    # Trazabilidad de reversiones
    movimiento_reversado = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reversos',
        help_text="Si es un reverso, referencia al movimiento original"
    )
    anulacion_razon = models.CharField(
        max_length=250,
        blank=True,
        help_text="Razón de anulación si aplica"
    )
    
    # Campos de auditoría
    empresa = models.ForeignKey(
        'empresas.Empresa',
        on_delete=models.CASCADE,
        related_name='bitacora_movimientos',
        help_text="Empresa propietaria"
    )
    
    class Meta:
        verbose_name = "Bitácora de Movimiento"
        verbose_name_plural = "Bitácoras de Movimientos"
        ordering = ['-fecha_creacion']
        db_index = ['empresa', 'tipo_evento', 'bodega_origen', 'bodega_destino']
        indexes = [
            models.Index(fields=['empresa', 'fecha_creacion']),
            models.Index(fields=['tipo_evento', 'fecha_creacion']),
            models.Index(fields=['stock_item', 'fecha_creacion']),
            models.Index(fields=['numero_documento']),
        ]
    
    def __str__(self):
        return (
            f"[{self.tipo_evento}] {self.item_nombre} x{self.cantidad} "
            f"({self.numero_documento}) - {self.usuario_nombre} - {self.fecha_creacion.strftime('%Y-%m-%d %H:%M')}"
        )
    
    @property
    def cambio_neto(self):
        """Cambio neto de cantidad en el stock."""
        if self.cantidad_anterior is not None and self.cantidad_posterior is not None:
            return self.cantidad_posterior - self.cantidad_anterior
        return self.cantidad
    
    @property
    def es_reverso(self):
        """Indica si este movimiento es un reverso de otro."""
        return self.movimiento_reversado_id is not None


class BitácoraSerieMovimiento(ModeloBase):
    """
    Historial de cambios de estado para cada serie.
    
    Permite reconstruir el viaje completo de una serie desde su creación
    hasta su estado actual (disponible → reservada → despachada → devuelta).
    
    Vinculada directamente con BitácoraMovimiento para trazabilidad cruzada.
    """
    
    ESTADO_CHOICES = (
        ('disponible', 'Disponible'),
        ('reservada', 'Reservada en Guía'),
        ('despachada', 'Despachada'),
        ('devuelta', 'Devuelta'),
    )
    
    serie_item = models.ForeignKey(
        'bodegas.SerieItem',
        on_delete=models.CASCADE,
        related_name='bitacora_estados',
        help_text="Serie afectada"
    )
    
    # Estados
    estado_anterior = models.CharField(
        max_length=20,
        choices=ESTADO_CHOICES,
        help_text="Estado previo"
    )
    estado_nuevo = models.CharField(
        max_length=20,
        choices=ESTADO_CHOICES,
        help_text="Estado nuevo"
    )
    
    # Evento generador
    bitacora_movimiento = models.ForeignKey(
        'BitácoraMovimiento',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='series_afectadas',
        help_text="Movimiento que causó el cambio de estado"
    )
    
    # Bodega
    bodega = models.ForeignKey(
        'bodegas.Bodega',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='bitacora_series_movimientos',
        help_text="Bodega donde ocurrió el cambio"
    )
    
    # Usuario
    usuario = models.ForeignKey(
        'empresas.UsuarioEmpresa',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='bitacora_cambios_series'
    )
    
    # Documento de origen
    documento_referencia = models.CharField(
        max_length=100,
        blank=True,
        help_text="Referencia del documento que originó el cambio"
    )
    
    # Observaciones
    observaciones = models.TextField(blank=True)
    
    empresa = models.ForeignKey(
        'empresas.Empresa',
        on_delete=models.CASCADE,
        related_name='bitacora_series',
    )
    
    class Meta:
        verbose_name = "Bitácora de Serie"
        verbose_name_plural = "Bitácoras de Series"
        ordering = ['-fecha_creacion']
        db_index = ['serie_item', 'empresa']
        indexes = [
            models.Index(fields=['serie_item', 'fecha_creacion']),
            models.Index(fields=['empresa', 'fecha_creacion']),
        ]
    
    def __str__(self):
        return (
            f"Serie {self.serie_item.serie}: {self.estado_anterior} → {self.estado_nuevo} "
            f"({self.fecha_creacion.strftime('%Y-%m-%d %H:%M')})"
        )


class ReporteTrazabilidadSerie(models.Model):
    """
    Vista materializada / caché para consultas rápidas de trazabilidad por serie.
    
    Proporciona:
    - Historial completo de la serie
    - Ubicación actual
    - Documentos relacionados
    - Cadena de custodia
    
    Se actualiza automáticamente cuando hay cambios en BitácoraSerieMovimiento.
    """
    
    serie_item = models.OneToOneField(
        'bodegas.SerieItem',
        on_delete=models.CASCADE,
        primary_key=True,
        related_name='trazabilidad'
    )
    
    # Estado actual
    estado_actual = models.CharField(
        max_length=20,
        choices=BitácoraSerieMovimiento.ESTADO_CHOICES
    )
    bodega_actual = models.ForeignKey(
        'bodegas.Bodega',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='series_trazabilidad'
    )
    
    # Fechas clave
    fecha_creacion_serie = models.DateTimeField(
        help_text="Cuándo entró al sistema"
    )
    fecha_ultima_actualizacion = models.DateTimeField(
        auto_now=True,
        help_text="Última actualización de este registro"
    )
    
    # Contadores
    cantidad_movimientos = models.IntegerField(
        default=0,
        help_text="Total de eventos en la serie"
    )
    cantidad_cambios_estado = models.IntegerField(
        default=0,
        help_text="Total de cambios de estado"
    )
    
    # Documentos relacionados
    numero_orden_compra = models.CharField(
        max_length=100,
        blank=True,
        help_text="OC de donde proviene"
    )
    numero_guia_salida = models.CharField(
        max_length=100,
        blank=True,
        help_text="Guía de salida asociada"
    )
    numero_voucher_devolucion = models.CharField(
        max_length=100,
        blank=True,
        help_text="Voucher si fue devuelta"
    )
    
    # Datos de trazabilidad
    cadena_custodia = models.JSONField(
        default=list,
        help_text="[{usuario, fecha, evento, documento}, ...]"
    )
    anomalias = models.JSONField(
        default=list,
        help_text="[{tipo, descripcion, fecha_deteccion}, ...]"
    )
    
    empresa = models.ForeignKey(
        'empresas.Empresa',
        on_delete=models.CASCADE,
        related_name='reportes_trazabilidad'
    )
    
    class Meta:
        verbose_name = "Reporte de Trazabilidad"
        verbose_name_plural = "Reportes de Trazabilidad"
        db_index = ['empresa']
    
    def __str__(self):
        return f"Trazabilidad: {self.serie_item.serie}"


class ReporteConciliación(ModeloBase):
    """
    Reporte de conciliación entre:
    1. Stock en StockItemEnBodega
    2. Suma de movimientos en BitácoraMovimiento
    3. Series activas asociadas
    
    Permite detectar inconsistencias y discrepancias silenciosas.
    """
    
    # Identificación
    bodega = models.ForeignKey(
        'bodegas.Bodega',
        on_delete=models.CASCADE,
        related_name='reportes_conciliacion'
    )
    stock_item = models.ForeignKey(
        'bodegas.StockItemEnBodega',
        on_delete=models.CASCADE,
        related_name='reportes_conciliacion'
    )
    
    # Stock reportado vs. calculado
    cantidad_stock_registrado = models.IntegerField(
        help_text="Cantidad en StockItemEnBodega"
    )
    cantidad_stock_calculado = models.IntegerField(
        help_text="Suma de movimientos de BitácoraMovimiento"
    )
    diferencia = models.IntegerField(
        help_text="cantidad_stock_registrado - cantidad_stock_calculado"
    )
    
    # Series
    cantidad_series_registradas = models.IntegerField(
        default=0,
        help_text="Series con estado != 'devuelta' y vinculadas a este stock"
    )
    cantidad_series_disponibles = models.IntegerField(
        default=0,
        help_text="Series en estado 'disponible'"
    )
    cantidad_series_reservadas = models.IntegerField(
        default=0,
        help_text="Series en estado 'reservada'"
    )
    cantidad_series_despachadas = models.IntegerField(
        default=0,
        help_text="Series en estado 'despachada'"
    )
    
    # Validaciones
    es_consistente = models.BooleanField(
        default=False,
        help_text="True si diferencia == 0 y conteos de series son válidos"
    )
    anomalias = models.JSONField(
        default=list,
        help_text="[{tipo: 'sobrestock' | 'substock' | 'inconsistencia_series', detalle}, ...]"
    )
    
    # Período del reporte
    fecha_inicio = models.DateTimeField(
        help_text="Inicio del período analizado"
    )
    fecha_cierre = models.DateTimeField(
        help_text="Fin del período analizado"
    )
    
    empresa = models.ForeignKey(
        'empresas.Empresa',
        on_delete=models.CASCADE,
        related_name='reportes_conciliacion'
    )
    
    class Meta:
        verbose_name = "Reporte de Conciliación"
        verbose_name_plural = "Reportes de Conciliación"
        ordering = ['-fecha_creacion']
        db_index = ['bodega', 'stock_item', 'empresa', 'es_consistente']
    
    def __str__(self):
        estado = "✓ Consistente" if self.es_consistente else "✗ Inconsistencia"
        return f"{estado} - {self.stock_item} en {self.bodega} (Δ{self.diferencia:+d})"


class AnomalíaMovimiento(ModeloBase):
    """
    Registro de anomalías detectadas en movimientos.
    
    Tipos de anomalías:
    - Stock negativo
    - Movimiento huérfano (sin documento)
    - Salida sin entrada previa
    - Devolución sin salida previa
    - Inconsistencia de series
    - Diferencia stock vs bitácora
    """
    
    TIPO_ANOMALIA_CHOICES = (
        ('stock_negativo', 'Stock Negativo'),
        ('movimiento_huerfano', 'Movimiento sin Documento'),
        ('salida_sin_entrada', 'Salida sin Entrada Previa'),
        ('devolucion_sin_salida', 'Devolución sin Salida Previa'),
        ('inconsistencia_series', 'Inconsistencia de Series'),
        ('diferencia_stock', 'Diferencia Stock vs Bitácora'),
        ('serie_duplicada', 'Serie Duplicada'),
        ('otro', 'Otro'),
    )
    
    tipo_anomalia = models.CharField(
        max_length=50,
        choices=TIPO_ANOMALIA_CHOICES,
        db_index=True
    )
    
    # Contexto
    bodega = models.ForeignKey(
        'bodegas.Bodega',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='anomalias'
    )
    stock_item = models.ForeignKey(
        'bodegas.StockItemEnBodega',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='anomalias'
    )
    serie_item = models.ForeignKey(
        'bodegas.SerieItem',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='anomalias'
    )
    bitacora_movimiento = models.ForeignKey(
        'BitácoraMovimiento',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='anomalias'
    )
    
    # Detalle
    descripcion = models.TextField(
        help_text="Descripción detallada de la anomalía"
    )
    datos_anomalia = models.JSONField(
        default=dict,
        help_text="Datos adicionales según tipo de anomalía"
    )
    
    # Resolución
    resuelta = models.BooleanField(
        default=False,
        db_index=True,
        help_text="Indica si la anomalía fue resuelta"
    )
    fecha_resolucion = models.DateTimeField(
        null=True,
        blank=True
    )
    resuelto_por = models.ForeignKey(
        'empresas.UsuarioEmpresa',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='anomalias_resueltas'
    )
    nota_resolucion = models.TextField(blank=True)
    
    empresa = models.ForeignKey(
        'empresas.Empresa',
        on_delete=models.CASCADE,
        related_name='anomalias'
    )
    
    class Meta:
        verbose_name = "Anomalía de Movimiento"
        verbose_name_plural = "Anomalías de Movimientos"
        ordering = ['-fecha_creacion']
        db_index = ['tipo_anomalia', 'resuelta', 'empresa']
        indexes = [
            models.Index(fields=['tipo_anomalia', 'resuelta']),
            models.Index(fields=['empresa', 'resuelta']),
        ]
    
    def __str__(self):
        return f"[{self.get_tipo_anomalia_display()}] {self.descripcion[:100]}"
