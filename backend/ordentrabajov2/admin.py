from django.contrib import admin
from django.utils.html import format_html
import json

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


# ============ INLINES ============


class SoporteTecnicoInline(admin.TabularInline):
    model = SoporteTecnico
    extra = 0
    fields = ["nombre", "estado", "tecnico_asignado", "fecha_soporte", "descripcion"]
    raw_id_fields = ["tecnico_asignado"]
    show_change_link = True


class ServicioEnOTInline(admin.TabularInline):
    model = ServicioEnOT
    extra = 0
    fields = ["nombre", "estado", "tecnico_asignado", "resuelto", "fecha_servicio"]
    raw_id_fields = ["tecnico_asignado"]
    show_change_link = True


class GastoOperativoEnOtInline(admin.TabularInline):
    model = GastoOperativoEnOt
    extra = 0
    fields = ["categoria", "detalle", "cantidad", "monto_unitario", "monto_total", "fecha_compra"]
    readonly_fields = ["monto_total"]
    raw_id_fields = ["usuario_comprador"]


class AdjuntoDeOrdenInline(admin.TabularInline):
    model = AdjuntoDeOrden
    extra = 0
    fields = ["tipo", "descripcion", "archivo"]


class SeguimientoItemOTInline(admin.TabularInline):
    model = SeguimientoItemOT
    extra = 0
    fields = ["tipo", "usuario", "comentario", "fecha_creacion"]
    readonly_fields = ["fecha_creacion"]
    raw_id_fields = ["usuario"]
    fk_name = "orden"

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.filter(orden__isnull=False)


class HistorialCambiosOrdenInline(admin.TabularInline):
    model = HistorialCambiosOrden
    extra = 0
    fields = ["fecha_cambio", "usuario", "estado_anterior", "estado_actual", "comentario"]
    readonly_fields = ["fecha_cambio"]
    raw_id_fields = ["usuario"]
    can_delete = False


# ============ ADMIN PRINCIPAL ============


@admin.register(OrdenDeTrabajo)
class OrdenDeTrabajoAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "cliente",
        "tipo_servicio",
        "estado_badge",
        "prioridad_badge",
        "tecnico_responsable_ot",
        "fecha_inicio_ot",
        "fecha_finalizacion_ot",
        "fecha_creacion",
    ]
    list_filter = [
        "estado",
        "tipo_servicio",
        "prioridad",
        "empresa",
        "fecha_inicio_ot",
        "fecha_creacion",
    ]
    search_fields = ["id", "cliente__nombre", "descripcion", "tecnico_responsable_ot__usuario__email"]
    readonly_fields = ["fecha_creacion", "fecha_modificacion", "firmas_ot_formatted"]
    autocomplete_fields = ["cliente", "tecnico_responsable_ot", "cliente_solicitante"]
    raw_id_fields = ["empresa"]
    filter_horizontal = ["cotizaciones"]
    date_hierarchy = "fecha_creacion"
    
    inlines = [
        SoporteTecnicoInline,
        ServicioEnOTInline,
        GastoOperativoEnOtInline,
        AdjuntoDeOrdenInline,
        SeguimientoItemOTInline,
        HistorialCambiosOrdenInline,
    ]

    fieldsets = (
        ("Información General", {
            "fields": ("empresa", "cliente", "tipo_servicio")
        }),
        ("Detalles de la Orden", {
            "fields": ("descripcion", "prioridad", "notas_internas")
        }),
        ("Fechas", {
            "fields": ("fecha_inicio_ot", "fecha_finalizacion_ot")
        }),
        ("Estado y Responsables", {
            "fields": ("estado", "tecnico_responsable_ot", "cliente_solicitante")
        }),
        ("Firmas OT", {
            "fields": ("firmas_ot_formatted",),
            "classes": ("collapse",)
        }),
        ("Cotizaciones", {
            "fields": ("cotizaciones",),
            "classes": ("collapse",)
        }),
        ("Metadatos", {
            "fields": ("fecha_creacion", "fecha_modificacion"),
            "classes": ("collapse",),
        }),
    )

    def estado_badge(self, obj):
        colores = {
            "pendiente": "#ffc107",
            "en_proceso": "#007bff",
            "completada": "#28a745",
            "cerrada": "#6c757d",
            "facturada": "#17a2b8",
        }
        color = colores.get(obj.estado, "#6c757d")
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; border-radius: 3px;">{}</span>',
            color,
            obj.get_estado_display()
        )
    estado_badge.short_description = "Estado"

    def prioridad_badge(self, obj):
        colores = {
            "1": "#dc3545",  # Alta
            "2": "#ffc107",  # Media
            "3": "#28a745",  # Baja
        }
        color = colores.get(obj.prioridad, "#6c757d")
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; border-radius: 3px;">{}</span>',
            color,
            obj.get_prioridad_display()
        )
    prioridad_badge.short_description = "Prioridad"

    def firmas_ot_formatted(self, obj):
        if obj.firmas_ot:
            return format_html("<pre>{}</pre>", json.dumps(obj.firmas_ot, indent=2, ensure_ascii=False))
        return "-"
    firmas_ot_formatted.short_description = "Firmas OT (JSON)"


# ============ ADMIN MODELOS RELACIONADOS ============


class UsuarioAsignadoSoporteInline(admin.TabularInline):
    model = UsuarioAsignadoSoporte
    extra = 0
    fields = ["usuario_equipo", "usuario_empresa", "trabajo_realizado", "resuelto"]
    raw_id_fields = ["usuario_equipo", "usuario_empresa"]


class SeguimientoSoporteInline(admin.TabularInline):
    model = SeguimientoItemOT
    extra = 0
    fields = ["tipo", "usuario", "comentario", "fecha_creacion"]
    readonly_fields = ["fecha_creacion"]
    raw_id_fields = ["usuario"]
    fk_name = "soporte"

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.filter(soporte__isnull=False)


@admin.register(SoporteTecnico)
class SoporteTecnicoAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "orden",
        "nombre",
        "estado_badge",
        "tecnico_asignado",
        "fecha_soporte",
        "fecha_creacion",
    ]
    list_filter = ["estado", "orden__tipo_servicio", "fecha_soporte"]
    search_fields = ["nombre", "descripcion", "orden__id"]
    readonly_fields = ["fecha_creacion", "fecha_modificacion"]
    autocomplete_fields = ["tecnico_asignado"]
    raw_id_fields = ["orden"]
    date_hierarchy = "fecha_creacion"
    
    inlines = [UsuarioAsignadoSoporteInline, SeguimientoSoporteInline]

    def estado_badge(self, obj):
        colores = {
            "pendiente": "#ffc107",
            "en_proceso": "#007bff",
            "completado": "#28a745",
            "cancelado": "#dc3545",
        }
        color = colores.get(obj.estado, "#6c757d")
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; border-radius: 3px;">{}</span>',
            color,
            obj.get_estado_display()
        )
    estado_badge.short_description = "Estado"


@admin.register(UsuarioAsignadoSoporte)
class UsuarioAsignadoSoporteAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "soporte_tecnico",
        "get_usuario",
        "resuelto_icon",
        "fecha_creacion",
    ]
    list_filter = ["resuelto", "fecha_creacion"]
    search_fields = [
        "soporte_tecnico__nombre",
        "trabajo_realizado",
        "usuario_equipo__usuario__email",
        "usuario_empresa__usuario__email",
    ]
    readonly_fields = ["fecha_creacion", "fecha_modificacion", "cache_asignacion_formatted"]
    raw_id_fields = ["soporte_tecnico", "usuario_equipo", "usuario_empresa"]

    fieldsets = (
        ("Relación", {
            "fields": ("soporte_tecnico", "usuario_equipo", "usuario_empresa")
        }),
        ("Detalles del Trabajo", {
            "fields": ("trabajo_realizado", "resuelto")
        }),
        ("Cache", {
            "fields": ("cache_asignacion_formatted",),
            "classes": ("collapse",)
        }),
        ("Metadatos", {
            "fields": ("fecha_creacion", "fecha_modificacion"),
            "classes": ("collapse",)
        }),
    )

    def get_usuario(self, obj):
        return str(obj.usuario_equipo or obj.usuario_empresa or "-")
    get_usuario.short_description = "Usuario"

    def resuelto_icon(self, obj):
        if obj.resuelto:
            return format_html('<span style="color: green; font-size: 16px;">✓</span>')
        return format_html('<span style="color: red; font-size: 16px;">✗</span>')
    resuelto_icon.short_description = "Resuelto"

    def cache_asignacion_formatted(self, obj):
        if obj.cache_asignacion:
            return format_html("<pre>{}</pre>", json.dumps(obj.cache_asignacion, indent=2, ensure_ascii=False))
        return "-"
    cache_asignacion_formatted.short_description = "Cache Asignación (JSON)"


class SeguimientoServicioInline(admin.TabularInline):
    model = SeguimientoItemOT
    extra = 0
    fields = ["tipo", "usuario", "comentario", "fecha_creacion"]
    readonly_fields = ["fecha_creacion"]
    raw_id_fields = ["usuario"]
    fk_name = "servicio"

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.filter(servicio__isnull=False)


@admin.register(ServicioEnOT)
class ServicioEnOTAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "orden",
        "nombre",
        "estado_badge",
        "tecnico_asignado",
        "resuelto_icon",
        "fecha_servicio",
        "fecha_creacion",
    ]
    list_filter = ["estado", "resuelto", "fecha_servicio"]
    search_fields = ["nombre", "descripcion", "orden__id"]
    readonly_fields = ["fecha_creacion", "fecha_modificacion"]
    autocomplete_fields = ["tecnico_asignado"]
    raw_id_fields = ["orden"]
    date_hierarchy = "fecha_creacion"
    
    inlines = [SeguimientoServicioInline]

    def estado_badge(self, obj):
        colores = {
            "pendiente": "#ffc107",
            "en_proceso": "#007bff",
            "completado": "#28a745",
            "cancelado": "#dc3545",
        }
        color = colores.get(obj.estado, "#6c757d")
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; border-radius: 3px;">{}</span>',
            color,
            obj.get_estado_display()
        )
    estado_badge.short_description = "Estado"

    def resuelto_icon(self, obj):
        if obj.resuelto:
            return format_html('<span style="color: green; font-size: 16px;">✓</span>')
        return format_html('<span style="color: red; font-size: 16px;">✗</span>')
    resuelto_icon.short_description = "Resuelto"


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
    date_hierarchy = "fecha_cambio"


@admin.register(AdjuntoDeOrden)
class AdjuntoDeOrdenAdmin(admin.ModelAdmin):
    list_display = ["id", "orden", "tipo", "descripcion", "archivo", "fecha_creacion"]
    list_filter = ["tipo", "fecha_creacion"]
    search_fields = ["orden__id", "descripcion"]
    readonly_fields = ["fecha_creacion", "fecha_modificacion"]
    raw_id_fields = ["orden"]
    date_hierarchy = "fecha_creacion"


@admin.register(GastoOperativoEnOt)
class GastoOperativoEnOtAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "orden",
        "categoria",
        "detalle",
        "cantidad",
        "monto_unitario",
        "monto_total_formatted",
        "usuario_comprador",
        "fecha_compra",
    ]
    list_filter = ["categoria", "fecha_compra"]
    search_fields = ["orden__id", "detalle"]
    readonly_fields = ["monto_total", "fecha_creacion", "fecha_modificacion"]
    autocomplete_fields = ["usuario_comprador"]
    raw_id_fields = ["orden", "categoria"]
    date_hierarchy = "fecha_compra"

    def monto_total_formatted(self, obj):
        return f"${obj.monto_total:,}" if obj.monto_total else "-"
    monto_total_formatted.short_description = "Monto Total"


@admin.register(CierreAdministrativoOT)
class CierreAdministrativoOTAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "cliente",
        "estado_badge",
        "fecha_prefactura",
        "tiene_documento",
        "creado_por",
        "fecha_creacion",
    ]
    list_filter = ["estado_cierre", "fecha_creacion", "fecha_prefactura"]
    search_fields = ["cliente__nombre", "comentario", "id"]
    readonly_fields = [
        "fecha_creacion",
        "fecha_modificacion",
        "creado_por",
        "actualizado_por",
        "resultado_formatted",
    ]
    autocomplete_fields = ["cliente", "creado_por", "actualizado_por"]
    date_hierarchy = "fecha_creacion"

    fieldsets = (
        ("Información Principal", {
            "fields": ("cliente", "estado_cierre", "fecha_prefactura")
        }),
        ("Documento", {
            "fields": ("documento_factura",)
        }),
        ("Resultado", {
            "fields": ("resultado_formatted",),
            "classes": ("collapse",)
        }),
        ("Comentarios", {
            "fields": ("comentario",)
        }),
        ("Auditoría", {
            "fields": ("creado_por", "actualizado_por", "fecha_creacion", "fecha_modificacion"),
            "classes": ("collapse",)
        }),
    )

    def estado_badge(self, obj):
        colores = {
            "borrador": "#6c757d",
            "en_revision": "#ffc107",
            "aprobado": "#007bff",
            "facturado": "#28a745",
            "pagado": "#17a2b8",
        }
        color = colores.get(obj.estado_cierre, "#6c757d")
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; border-radius: 3px;">{}</span>',
            color,
            obj.get_estado_cierre_display()
        )
    estado_badge.short_description = "Estado"

    def tiene_documento(self, obj):
        if obj.documento_factura:
            return format_html('<span style="color: green; font-size: 16px;">✓</span>')
        return format_html('<span style="color: red; font-size: 16px;">✗</span>')
    tiene_documento.short_description = "Doc"

    def resultado_formatted(self, obj):
        if obj.resultado:
            return format_html("<pre>{}</pre>", json.dumps(obj.resultado, indent=2, ensure_ascii=False))
        return "-"
    resultado_formatted.short_description = "Resultado (JSON)"


@admin.register(SeguimientoItemOT)
class SeguimientoItemOTAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "get_destino",
        "tipo",
        "usuario",
        "comentario_corto",
        "fecha_creacion",
    ]
    list_filter = ["tipo", "fecha_creacion"]
    search_fields = [
        "servicio__nombre",
        "soporte__nombre",
        "orden__id",
        "comentario",
        "usuario__usuario__email",
    ]
    readonly_fields = ["fecha_creacion", "fecha_modificacion"]
    raw_id_fields = ["servicio", "soporte", "orden", "usuario"]
    date_hierarchy = "fecha_creacion"

    fieldsets = (
        ("Relación (Solo UNO debe estar definido)", {
            "fields": ("orden", "servicio", "soporte")
        }),
        ("Detalles", {
            "fields": ("tipo", "usuario", "comentario")
        }),
        ("Metadatos", {
            "fields": ("fecha_creacion", "fecha_modificacion"),
            "classes": ("collapse",)
        }),
    )

    def get_destino(self, obj):
        if obj.servicio_id:
            return format_html("Servicio <strong>#{}</strong>", obj.servicio_id)
        elif obj.soporte_id:
            return format_html("Soporte <strong>#{}</strong>", obj.soporte_id)
        elif obj.orden_id:
            return format_html("Orden <strong>#{}</strong>", obj.orden_id)
        return "-"
    get_destino.short_description = "Destino"

    def comentario_corto(self, obj):
        if obj.comentario:
            return obj.comentario[:50] + "..." if len(obj.comentario) > 50 else obj.comentario
        return "-"
    comentario_corto.short_description = "Comentario"

