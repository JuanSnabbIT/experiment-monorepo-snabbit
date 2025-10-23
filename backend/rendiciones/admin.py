from django.contrib import admin
from .models import (
    CategoriaGastoRendicion,
    Rendicion,
    DetalleGastoRendicion,
    ItemRendicion,
)


@admin.register(Rendicion)
class RendicionAdmin(admin.ModelAdmin):
    list_display = ('id', 'usuario', 'fecha_rendicion', 'estado')
    list_filter = ('estado', 'fecha_rendicion', 'usuario')
    search_fields = ('usuario__username', 'observaciones')
    date_hierarchy = 'fecha_rendicion'

@admin.register(CategoriaGastoRendicion)
class CategoriaGastoRendicionAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'descripcion')
    search_fields = ('nombre',)

@admin.register(DetalleGastoRendicion)
class DetalleGastoRendicionAdmin(admin.ModelAdmin):
    list_display = (
        'categoria',
        'detalle',
        'cantidad',
        'monto_unitario',
        'monto_total',
        'fecha_gasto',
    )
    list_filter = ('categoria', 'fecha_gasto')
    search_fields = ('detalle',)
    date_hierarchy = 'fecha_gasto'

@admin.register(ItemRendicion)
class ItemRendicionAdmin(admin.ModelAdmin):
    list_display = ('rendicion', 'content_type', 'detalle_link')
    list_filter = ('content_type',)
    search_fields = ('detalle_id',)

    def detalle_link(self, obj):
        return str(obj.detalle)
    detalle_link.short_description = 'Detalle'
