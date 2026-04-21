from django.contrib import admin

from .models import *


@admin.register(Bodega)
class BodegaAdmin(admin.ModelAdmin):
    list_display = ("nombre", "sucursal", "fecha_creacion", "fecha_modificacion")
    search_fields = ("nombre", "sucursal__nombre")


@admin.register(TomaInventario)
class TomaInventarioAdmin(admin.ModelAdmin):
    list_display = ("id", "fecha_inicio", "fecha_termino", "fecha_creacion")
    filter_horizontal = ("bodegas",)


# @admin.register(ImagenesTomaInventario)
# class ImagenesTomaInventarioAdmin(admin.ModelAdmin):
#     list_display = ('id', 'toma_inventario', 'fecha_creacion')


@admin.register(OrdenCompra)
class OrdenCompraAdmin(admin.ModelAdmin):
    list_display = ("codigo", "proveedor", "creado_por", "estado", "fecha_creacion")
    list_filter = ("estado", "proveedor")
    search_fields = (
        "codigo",
        "proveedor__nombre",
    )


@admin.register(ItemEnOrdenCompra)
class ItemEnOrdenCompraAdmin(admin.ModelAdmin):
    list_display = ("orden_compra", "item", "cantidad", "precio")
    search_fields = ("orden_compra__codigo", "item__nombre")


@admin.register(Compra)
class CompraAdmin(admin.ModelAdmin):
    list_display = ("codigo", "sucursal", "creado_por", "estado", "fecha_creacion")
    list_filter = ("estado", "sucursal")
    search_fields = ("codigo", "sucursal__nombre")


@admin.register(ItemEnCompra)
class ItemEnCompraAdmin(admin.ModelAdmin):
    list_display = ("compra", "item", "cantidad", "precio")
    search_fields = ("compra__codigo", "item__nombre")


@admin.register(StockItemEnBodega)
class StockItemEnBodegaAdmin(admin.ModelAdmin):
    list_display = ("bodega", "item", "cantidad", "pmp")
    search_fields = ("bodega__nombre", "item__nombre")


@admin.register(ItemOrdenCompraEnStock)
class ItemOrdenCompraEnStockAdmin(admin.ModelAdmin):
    list_display = ("content_type", "item_oc_id", "stock_item", "cantidad")
    search_fields = ("stock_item__item__nombre",)


@admin.register(GuiaSalida)
class GuiaSalidaAdmin(admin.ModelAdmin):
    list_display = ("id", "bodega", "creado_por", "estado", "fecha_creacion")
    list_filter = ("estado", "bodega")
    search_fields = ("bodega__nombre",)


@admin.register(ItemsGuiaSalida)
class ItemsGuiaSalidaAdmin(admin.ModelAdmin):
    list_display = (
        "guia",
        "stock_item",
        "cantidad_original",
        "cantidad_rebajada",
        "cantidad_devuelta",
    )
    search_fields = ("guia__id", "stock_item__item__nombre")


@admin.register(MovimientoStock)
class MovimientoStockAdmin(admin.ModelAdmin):
    list_display = ("stock_item", "tipo_movimiento", "cantidad", "usuario", "fecha_creacion")
    search_fields = ("stock_item__item__nombre", "stock_item__bodega__nombre")
    list_filter = ("tipo_movimiento",)


admin.site.register(ArchivoCompra)
admin.site.register(ItemEnTomaInventario)
admin.site.register(ImagenDeItemEnTomaInventario)


@admin.register(SerieItem)
class SerieItemAdmin(admin.ModelAdmin):
    list_display = ("serie", "stock_item", "estado", "empresa", "item_guia_salida", "fecha_creacion")
    list_filter = ("estado", "empresa")
    search_fields = ("serie", "stock_item__item__nombre")
    raw_id_fields = ("stock_item", "item_guia_salida", "item_orden_compra_en_stock")


class MovimientoEnVoucherInline(admin.TabularInline):
    model = MovimientoEnVoucher
    extra = 0
    fields = ("movimiento", "orden", "notas")
    raw_id_fields = ["movimiento"]  # Cambiado de autocomplete_fields


@admin.register(VoucherDevolucion)
class VoucherDevolucionAdmin(admin.ModelAdmin):
    list_display = ("numero", "orden_trabajo", "total_items_devueltos", "fecha_creacion")
    search_fields = ("numero", "orden_trabajo__id")
    readonly_fields = ("numero", "fecha_creacion", "fecha_modificacion")
    inlines = [MovimientoEnVoucherInline]
    
    fieldsets = (
        ("Información General", {
            "fields": ("numero", "orden_trabajo", "observaciones")
        }),
        ("Metadatos", {
            "fields": ("fecha_creacion", "fecha_modificacion"),
            "classes": ("collapse",)
        }),
    )


@admin.register(MovimientoEnVoucher)
class MovimientoEnVoucherAdmin(admin.ModelAdmin):
    list_display = ("voucher", "movimiento", "orden", "fecha_creacion")
    search_fields = ("voucher__numero", "movimiento__stock_item__item__nombre")
    list_filter = ("voucher__orden_trabajo",)
    ordering = ["voucher", "orden", "-fecha_creacion"]


# ─── Auditoría y Trazabilidad (Fase 4) ───────────────────────────────────────

from .models import (
    BitácoraMovimiento,
    BitácoraSerieMovimiento,
    ReporteTrazabilidadSerie,
    ReporteConciliación,
    AnomalíaMovimiento,
)


@admin.register(BitácoraMovimiento)
class BitácoraMovimientoAdmin(admin.ModelAdmin):
    list_display = (
        "tipo_evento", "item_nombre", "cantidad", "numero_documento",
        "usuario_nombre", "empresa", "fecha_creacion",
    )
    list_filter = ("tipo_evento", "empresa", "bodega_origen")
    search_fields = ("numero_documento", "item_nombre", "usuario_nombre")
    readonly_fields = (
        "tipo_evento", "item_nombre", "cantidad", "cantidad_series",
        "cantidad_anterior", "cantidad_posterior", "numero_documento",
        "usuario_nombre", "descripcion", "observaciones",
        "empresa", "bodega_origen", "bodega_destino", "stock_item",
        "documento_origen_content_type", "documento_origen_id",
        "movimiento_reversado", "anulacion_razon",
        "fecha_creacion", "fecha_modificacion",
    )
    ordering = ["-fecha_creacion"]
    date_hierarchy = "fecha_creacion"

    def has_add_permission(self, request):
        return False  # Solo lectura — no crear manualmente

    def has_delete_permission(self, request, obj=None):
        return False  # Registros de auditoría no se eliminan


@admin.register(BitácoraSerieMovimiento)
class BitácoraSerieMovimientoAdmin(admin.ModelAdmin):
    list_display = (
        "serie_item", "estado_anterior", "estado_nuevo",
        "documento_referencia", "empresa", "fecha_creacion",
    )
    list_filter = ("estado_nuevo", "empresa")
    search_fields = ("serie_item__serie", "documento_referencia")
    readonly_fields = tuple(
        f for f in [
            "serie_item", "estado_anterior", "estado_nuevo",
            "documento_referencia", "observaciones", "empresa",
            "bodega", "usuario", "bitacora_movimiento",
            "fecha_creacion", "fecha_modificacion",
        ]
    )
    ordering = ["-fecha_creacion"]

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(ReporteConciliación)
class ReporteConciliaciónAdmin(admin.ModelAdmin):
    list_display = (
        "stock_item", "bodega", "cantidad_stock_registrado",
        "cantidad_stock_calculado", "diferencia", "es_consistente",
        "empresa", "fecha_creacion",
    )
    list_filter = ("es_consistente", "empresa", "bodega")
    search_fields = ("stock_item__item__nombre",)
    readonly_fields = (
        "bodega", "stock_item", "cantidad_stock_registrado",
        "cantidad_stock_calculado", "diferencia",
        "cantidad_series_registradas", "cantidad_series_disponibles",
        "cantidad_series_reservadas", "cantidad_series_despachadas",
        "es_consistente", "anomalias", "fecha_inicio", "fecha_cierre",
        "empresa", "fecha_creacion", "fecha_modificacion",
    )
    ordering = ["-fecha_creacion"]


@admin.register(AnomalíaMovimiento)
class AnomalíaMovimientoAdmin(admin.ModelAdmin):
    list_display = (
        "tipo_anomalia", "descripcion_corta", "resuelta",
        "empresa", "fecha_creacion",
    )
    list_filter = ("tipo_anomalia", "resuelta", "empresa")
    search_fields = ("descripcion",)
    ordering = ["-fecha_creacion"]
    actions = ["marcar_como_resuelta"]

    def descripcion_corta(self, obj):
        return obj.descripcion[:80] + ("..." if len(obj.descripcion) > 80 else "")
    descripcion_corta.short_description = "Descripción"

    @admin.action(description="Marcar seleccionadas como resueltas")
    def marcar_como_resuelta(self, request, queryset):
        from django.utils import timezone
        count = queryset.filter(resuelta=False).update(
            resuelta=True,
            fecha_resolucion=timezone.now(),
        )
        self.message_user(request, f"{count} anomalía(s) marcada(s) como resueltas.")
