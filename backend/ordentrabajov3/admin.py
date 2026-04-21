from django.contrib import admin
from .models import (
    OrdenDeTrabajoV3,
    TareaOTV3,
    AsignacionTecnicoOTV3,
    ChecklistItemOTV3,
    SeguimientoOTV3,
    GastoOTV3,
    AdjuntoOTV3,
    HistorialEstadoOTV3,
    PrefacturaOTV3,
)


class TareaInline(admin.TabularInline):
    model = TareaOTV3
    extra = 0
    fields = ["titulo", "estado", "tecnico_asignado", "fecha_programada", "requiere_firma"]


class AsignacionInline(admin.TabularInline):
    model = AsignacionTecnicoOTV3
    extra = 0
    fields = ["tecnico", "rol", "confirmado"]


@admin.register(OrdenDeTrabajoV3)
class OrdenDeTrabajoV3Admin(admin.ModelAdmin):
    list_display = ["id", "titulo", "empresa", "cliente", "modalidad", "estado", "prioridad", "fecha_programada"]
    list_filter = ["estado", "modalidad", "prioridad", "empresa"]
    search_fields = ["titulo", "descripcion"]
    inlines = [TareaInline, AsignacionInline]


@admin.register(TareaOTV3)
class TareaOTV3Admin(admin.ModelAdmin):
    list_display = ["id", "titulo", "orden", "estado", "tecnico_asignado", "requiere_firma"]
    list_filter = ["estado", "requiere_firma"]
    search_fields = ["titulo", "descripcion"]


@admin.register(AsignacionTecnicoOTV3)
class AsignacionTecnicoOTV3Admin(admin.ModelAdmin):
    list_display = ["id", "orden", "tecnico", "rol", "confirmado"]
    list_filter = ["rol", "confirmado"]


@admin.register(ChecklistItemOTV3)
class ChecklistItemOTV3Admin(admin.ModelAdmin):
    list_display = ["id", "tarea", "tipo", "descripcion", "completado"]
    list_filter = ["tipo", "completado"]


@admin.register(SeguimientoOTV3)
class SeguimientoOTV3Admin(admin.ModelAdmin):
    list_display = ["id", "orden", "tarea", "tipo", "autor", "fecha_creacion"]
    list_filter = ["tipo"]


@admin.register(GastoOTV3)
class GastoOTV3Admin(admin.ModelAdmin):
    list_display = ["id", "orden", "detalle", "cantidad", "monto_total", "fecha_compra"]


@admin.register(AdjuntoOTV3)
class AdjuntoOTV3Admin(admin.ModelAdmin):
    list_display = ["id", "orden", "tipo", "descripcion", "subido_por", "fecha_creacion"]
    list_filter = ["tipo"]


@admin.register(HistorialEstadoOTV3)
class HistorialEstadoOTV3Admin(admin.ModelAdmin):
    list_display = ["id", "orden", "estado_anterior", "estado_nuevo", "usuario", "fecha_creacion"]
    list_filter = ["estado_nuevo"]


@admin.register(PrefacturaOTV3)
class PrefacturaOTV3Admin(admin.ModelAdmin):
    list_display = [
        "id",
        "cliente",
        "estado_cierre",
        "moneda_prefactura",
        "fecha_prefactura",
        "creado_por",
        "fecha_creacion",
    ]
    list_filter = ["estado_cierre", "moneda_prefactura", "fecha_prefactura", "cliente"]
    search_fields = ["id", "cliente__nombre", "comentario"]
    autocomplete_fields = ["cliente", "creado_por", "actualizado_por"]
    filter_horizontal = ["ots", "contratos"]
    raw_id_fields = ["ot"]
    readonly_fields = ["fecha_creacion", "fecha_modificacion"]
    date_hierarchy = "fecha_creacion"

    fieldsets = (
        ("Información principal", {
            "fields": (
                "ot",
                "ots",
                "contratos",
                "cliente",
                "estado_cierre",
                "moneda_prefactura",
                "fecha_prefactura",
            )
        }),
        ("Documento y auditoría", {
            "fields": (
                "documento_factura",
                "resultado",
                "comentario",
                "tasa_dolar_usada",
                "tasa_uf_usada",
                "fecha_tasa_cambio",
                "creado_por",
                "actualizado_por",
                "fecha_creacion",
                "fecha_modificacion",
            ),
            "classes": ("collapse",),
        }),
    )
