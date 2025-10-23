from django.contrib import admin
from .models import *

@admin.register(Bodega)
class BodegaAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'sucursal', 'fecha_creacion', 'fecha_modificacion')
    search_fields = ('nombre', 'sucursal__nombre')

@admin.register(TomaInventario)
class TomaInventarioAdmin(admin.ModelAdmin):
    list_display = ('id', 'fecha_inicio', 'fecha_termino', 'fecha_creacion')
    filter_horizontal = ('bodegas',)

# @admin.register(ImagenesTomaInventario)
# class ImagenesTomaInventarioAdmin(admin.ModelAdmin):
#     list_display = ('id', 'toma_inventario', 'fecha_creacion')

@admin.register(OrdenCompra)
class OrdenCompraAdmin(admin.ModelAdmin):
    list_display = ('codigo', 'proveedor', 'creado_por', 'estado', 'fecha_creacion')
    list_filter = ('estado', 'proveedor')
    search_fields = ('codigo', 'proveedor__nombre',)

@admin.register(ItemEnOrdenCompra)
class ItemEnOrdenCompraAdmin(admin.ModelAdmin):
    list_display = ('orden_compra', 'item', 'cantidad', 'precio')
    search_fields = ('orden_compra__codigo', 'item__nombre')

@admin.register(Compra)
class CompraAdmin(admin.ModelAdmin):
    list_display = ('codigo', 'proveedor', 'creado_por', 'estado', 'fecha_creacion')
    list_filter = ('estado', 'proveedor')
    search_fields = ('codigo', 'proveedor__nombre')

@admin.register(ItemEnCompra)
class ItemEnCompraAdmin(admin.ModelAdmin):
    list_display = ('compra', 'item', 'cantidad', 'precio')
    search_fields = ('compra__codigo', 'item__nombre')

@admin.register(StockItemEnBodega)
class StockItemEnBodegaAdmin(admin.ModelAdmin):
    list_display = ('bodega', 'item', 'cantidad', 'pmp')
    search_fields = ('bodega__nombre', 'item__nombre')

@admin.register(ItemOrdenCompraEnStock)
class ItemOrdenCompraEnStockAdmin(admin.ModelAdmin):
    list_display = ('content_type', 'item_oc_id', 'stock_item', 'cantidad')
    search_fields = ('stock_item__item__nombre',)

@admin.register(GuiaSalida)
class GuiaSalidaAdmin(admin.ModelAdmin):
    list_display = ('id', 'bodega', 'creado_por', 'estado', 'fecha_creacion')
    list_filter = ('estado', 'bodega')
    search_fields = ('bodega__nombre',)

@admin.register(ItemsGuiaSalida)
class ItemsGuiaSalidaAdmin(admin.ModelAdmin):
    list_display = ('guia', 'stock_item', 'cantidad_original', 'cantidad_rebajada', 'cantidad_devuelta')
    search_fields = ('guia__id', 'stock_item__item__nombre')

admin.site.register(ArchivoCompra)
admin.site.register(MovimientoStock)
admin.site.register(ItemEnTomaInventario)
admin.site.register(ImagenDeItemEnTomaInventario)