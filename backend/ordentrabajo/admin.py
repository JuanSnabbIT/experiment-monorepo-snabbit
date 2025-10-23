from django.contrib import admin
from .models import (
    OrdenDeTrabajo,
    DetalleTrabajo,
    UsuarioAsignadoOT,
    SeguimientoDetalleTrabajo,
    HistorialCambiosOrden,
    AdjuntoDeOrden,
    DetalleGastoRendicionOT
)


class DetalleTrabajoInline(admin.TabularInline):
    model = DetalleTrabajo
    extra = 0
    autocomplete_fields = ["content_type", "tecnico_asignado"]
    readonly_fields = ["trabajo_id"]  # GFK ID editable si lo deseas


@admin.register(OrdenDeTrabajo)
class OrdenDeTrabajoAdmin(admin.ModelAdmin):
    list_display = ["id", "cliente", "estado", "prioridad", "fecha_inicio_ot", "fecha_finalizacion_ot"]
    list_filter = ["estado", "prioridad", "empresa", "cliente"]
    search_fields = ["id", "descripcion", "cliente__nombre"]
    autocomplete_fields = ["empresa", "cliente", "responsable_empresa", "solicitante_empresa"]
    inlines = [DetalleTrabajoInline]


@admin.register(DetalleTrabajo)
class DetalleTrabajoAdmin(admin.ModelAdmin):
    list_display = ["id", "orden", "nombre", "estado", "trabajo", "tecnico_asignado"]
    list_filter = ["estado", "orden"]
    search_fields = ["nombre", "orden__id"]
    autocomplete_fields = ["orden", "tecnico_asignado", "content_type"]


@admin.register(UsuarioAsignadoOT)
class UsuarioAsignadoOTAdmin(admin.ModelAdmin):
    list_display = ["id", "orden", "usuario_empresa", "usuario_externo", "correo_usuario_externo"]
    list_filter = ["orden"]
    search_fields = [
        "orden__id",
        "usuario_empresa__usuario__first_name",
        "usuario_empresa__usuario__last_name",
        "usuario_externo",
        "correo_usuario_externo"
    ]
    autocomplete_fields = ["orden", "usuario_empresa"]


@admin.register(SeguimientoDetalleTrabajo)
class SeguimientoDetalleTrabajoAdmin(admin.ModelAdmin):
    list_display = ["id", "detalle_trabajo", "tipo", "fecha", "usuario"]
    list_filter = ["tipo", "fecha"]
    search_fields = ["comentario", "detalle_trabajo__id"]
    autocomplete_fields = ["detalle_trabajo", "usuario"]


@admin.register(HistorialCambiosOrden)
class HistorialCambiosOrdenAdmin(admin.ModelAdmin):
    list_display = ["id", "orden", "fecha_cambio", "estado_anterior", "estado_actual", "usuario"]
    list_filter = ["fecha_cambio"]
    search_fields = ["comentario", "estado_anterior", "estado_actual", "orden__id"]
    autocomplete_fields = ["orden", "usuario"]


@admin.register(AdjuntoDeOrden)
class AdjuntoDeOrdenAdmin(admin.ModelAdmin):
    list_display = ["id", "orden", "tipo", "descripcion"]
    list_filter = ["tipo"]
    search_fields = ["descripcion", "orden__id"]
    autocomplete_fields = ["orden"]


@admin.register(DetalleGastoRendicionOT)
class DetalleGastoRendicionOTAdmin(admin.ModelAdmin):
    list_display = ["id", "orden", "categoria", "detalle", "cantidad", "monto_unitario", "monto_total", "fecha_gasto"]
    list_filter = ["categoria", "fecha_gasto"]
    search_fields = ["detalle", "orden__id"]
    autocomplete_fields = ["orden", "categoria"]
