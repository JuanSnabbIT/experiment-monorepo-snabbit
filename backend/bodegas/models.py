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
    observaciones = models.TextField(blank=True)
    estado = models.CharField(max_length=2, choices=ESTADOS_OC, default="-")
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


class GuiaSalida(ModeloBaseHistorico):
    bodega = models.ForeignKey("bodegas.Bodega", on_delete=models.CASCADE)
    cliente = models.ForeignKey(
        "empresas.Empresa",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="guias_salida_cliente",
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

    class Meta:
        verbose_name = "Guia de Salida"
        verbose_name_plural = "Guias de Salidas"
        ordering = ["-fecha_creacion"]

    def revertir_item(self, item_rebaje_id, cantidad_a_devolver):
        """
        Método para revertir (devolver) una cierta cantidad de un ítem rebajado.
        Esto debería:
        1. Verificar que la cantidad a devolver no supere la cantidad rebajada.
        2. Actualizar el `StockItemEnBodega` sumándole la cantidad devuelta.
        3. Actualizar el registro `ItemsRebajeBodega` indicando las cantidades devueltas.
        4. Opcionalmente, cambiar el estado de la rebaja si se devolvieron todos los items.
        """
        item_rebaje = self.items.get(pk=item_rebaje_id)
        if (
            cantidad_a_devolver
            > item_rebaje.cantidad_rebajada - item_rebaje.cantidad_devuelta
        ):
            raise ValueError(
                "No se puede devolver más ítems de los que fueron rebajados."
            )

        # Actualizar stock de la bodega
        stock_item = item_rebaje.stock_item
        stock_item.cantidad += cantidad_a_devolver
        stock_item.save()

        # Actualizar cantidad devuelta
        item_rebaje.cantidad_devuelta += cantidad_a_devolver
        item_rebaje.save()

        # Verificar si todos los ítems han sido devueltos
        total_rebajado = sum(ir.cantidad_rebajada for ir in self.items.all())
        total_devuelto = sum(ir.cantidad_devuelta for ir in self.items.all())
        if total_devuelto == total_rebajado:
            self.estado = "R"
            self.save()
        elif total_devuelto > 0 and total_devuelto < total_rebajado:
            self.estado = "PR"
            self.save()


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
            models.UniqueConstraint(
                fields=["guia", "source_item"],
                name="uniq_guia_source_item",
            )
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
        help_text="Número único del voucher, ej: VDEV-2025-0001"
    )
    orden_trabajo = models.OneToOneField(
        "ordentrabajov2.OrdenDeTrabajo",
        on_delete=models.CASCADE,
        related_name="voucher_devolucion",
        help_text="Orden de trabajo asociada a estas devoluciones"
    )
    movimientos = models.ManyToManyField(
        MovimientoStock,
        through="bodegas.MovimientoEnVoucher",
        related_name="vouchers",
        help_text="Movimientos de stock tipo DEVOLUCION incluidos en este voucher"
    )
    observaciones = models.TextField(
        blank=True,
        help_text="Notas adicionales sobre las devoluciones"
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
            ultimo = VoucherDevolucion.objects.filter(
                numero__startswith=f"VDEV-{year}"
            ).order_by('-numero').first()
            
            if ultimo:
                # Extraer número y sumar 1
                ultimo_num = int(ultimo.numero.split('-')[-1])
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
        VoucherDevolucion,
        on_delete=models.CASCADE,
        related_name="movimientos_voucher"
    )
    movimiento = models.ForeignKey(
        MovimientoStock,
        on_delete=models.CASCADE,
        limit_choices_to={'tipo_movimiento': 'DEVOLUCION'},
        help_text="Solo movimientos de tipo DEVOLUCION"
    )
    orden = models.PositiveIntegerField(
        default=0,
        help_text="Orden de aparición en el voucher (opcional)"
    )
    notas = models.TextField(
        blank=True,
        help_text="Notas específicas sobre este movimiento en el voucher"
    )
    
    class Meta:
        verbose_name = "Movimiento en Voucher"
        verbose_name_plural = "Movimientos en Vouchers"
        ordering = ['orden', '-fecha_creacion']
        unique_together = ['voucher', 'movimiento']
    
    def __str__(self):
        return f"{self.voucher.numero} → {self.movimiento}"
