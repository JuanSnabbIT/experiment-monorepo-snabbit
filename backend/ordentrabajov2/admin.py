from django.contrib import admin

from .models import (
    AdjuntoDeOrden,
    CierreAdministrativoOT,
    GastoOperativoEnOt,
    HistorialCambiosOrden,
    OrdenDeTrabajo,
    SeguimientoItemOT,
    ServicioEnOT,
    SoporteTecnico,
    UsuarioAsignadoSoporte,
)


@admin.register(OrdenDeTrabajo)
class OrdenDeTrabajoAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "cliente",
        "tipo_servicio",
        "estado",
        "prioridad",
        "fecha_inicio_ot",
        "fecha_finalizacion_ot",
        "fecha_creacion",
    ]
    list_filter = ["estado", "tipo_servicio", "prioridad", "empresa"]
    search_fields = ["id", "cliente__nombre", "descripcion"]
    readonly_fields = ["fecha_creacion", "fecha_modificacion"]
    raw_id_fields = [
        "empresa",
        "cliente",
        "tecnico_responsable_ot",
        "cliente_solicitante",
        "cotizaciones",
    ]

    fieldsets = (
        ("Información General", {"fields": ("empresa", "cliente", "tipo_servicio")}),
        (
            "Detalles de la Orden",
            {"fields": ("descripcion", "prioridad", "notas_internas")},
        ),
        ("Fechas", {"fields": ("fecha_inicio_ot", "fecha_finalizacion_ot")}),
        (
            "Estado y Responsables",
            {"fields": ("estado", "tecnico_responsable_ot", "cliente_solicitante")},
        ),
        ("Firmas OT", {"fields": ("firmas_ot",), "classes": ("collapse",)}),
        ("Cotizaciones", {"fields": ("cotizaciones",), "classes": ("collapse",)}),
        (
            "Metadatos",
            {
                "fields": ("fecha_creacion", "fecha_modificacion"),
                "classes": ("collapse",),
            },
        ),
    )


@admin.register(SoporteTecnico)
class SoporteTecnicoAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "orden",
        "nombre",
        "estado",
        "tecnico_asignado",
        "fecha_soporte",
        "fecha_creacion",
    ]
    list_filter = ["estado", "orden__tipo_servicio"]
    search_fields = ["nombre", "descripcion", "orden__id"]
    readonly_fields = ["fecha_creacion", "fecha_modificacion"]
    raw_id_fields = ["orden", "tecnico_asignado"]


@admin.register(UsuarioAsignadoSoporte)
class UsuarioAsignadoSoporteAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "soporte_tecnico",
        "usuario_equipo",
        "resuelto",
        "fecha_creacion",
    ]
    list_filter = ["resuelto"]
    search_fields = ["soporte_tecnico__nombre", "trabajo_realizado"]
    readonly_fields = ["fecha_creacion", "fecha_modificacion"]
    raw_id_fields = ["soporte_tecnico", "usuario_equipo"]


@admin.register(ServicioEnOT)
class ServicioEnOTAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "orden",
        "nombre",
        "estado",
        "tecnico_asignado",
        "resuelto",
        "fecha_servicio",
        "fecha_creacion",
    ]
    list_filter = ["estado", "resuelto"]
    search_fields = ["nombre", "descripcion", "orden__id"]
    readonly_fields = ["fecha_creacion", "fecha_modificacion"]
    raw_id_fields = ["orden", "tecnico_asignado"]


@admin.register(HistorialCambiosOrden)
class HistorialCambiosOrdenAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "orden",
        "usuario",
        "fecha_cambio",
        "estado_anterior",
        "estado_actual",
    ]
    list_filter = ["fecha_cambio"]
    search_fields = ["orden__id", "usuario__usuario__email", "comentario"]
    readonly_fields = ["fecha_cambio", "fecha_creacion", "fecha_modificacion"]
    raw_id_fields = ["orden", "usuario"]


@admin.register(AdjuntoDeOrden)
class AdjuntoDeOrdenAdmin(admin.ModelAdmin):
    list_display = ["id", "orden", "tipo", "descripcion", "fecha_creacion"]
    list_filter = ["tipo"]
    search_fields = ["orden__id", "descripcion"]
    readonly_fields = ["fecha_creacion", "fecha_modificacion"]
    raw_id_fields = ["orden"]


@admin.register(GastoOperativoEnOt)
class GastoOperativoEnOtAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "orden",
        "categoria",
        "detalle",
        "cantidad",
        "monto_unitario",
        "monto_total",
        "fecha_compra",
    ]
    list_filter = ["categoria", "fecha_compra"]
    search_fields = ["orden__id", "detalle"]
    readonly_fields = ["monto_total", "fecha_creacion", "fecha_modificacion"]
    raw_id_fields = ["orden", "usuario_comprador"]


@admin.register(CierreAdministrativoOT)
class CierreAdministrativoOTAdmin(admin.ModelAdmin):
    list_display = ["id", "cliente", "estado_cierre", "fecha_creacion"]
    list_filter = ["estado_cierre", "fecha_creacion"]
    search_fields = ["cliente__nombre", "comentario"]
    readonly_fields = [
        "fecha_creacion",
        "fecha_modificacion",
        "creado_por",
        "actualizado_por",
    ]
    raw_id_fields = ["cliente", "creado_por", "actualizado_por"]


@admin.register(SeguimientoItemOT)
class SeguimientoItemOTAdmin(admin.ModelAdmin):
    list_display = ["id", "servicio", "soporte", "usuario", "tipo", "fecha_creacion"]
    list_filter = ["tipo"]
    search_fields = ["servicio__id", "soporte__id", "comentario"]
    readonly_fields = ["fecha_creacion", "fecha_modificacion"]
    raw_id_fields = ["servicio", "soporte", "usuario"]
