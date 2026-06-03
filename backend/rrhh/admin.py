from django.contrib import admin
from simple_history.admin import SimpleHistoryAdmin

from .models import (
    AfpCatalogo,
    AnexoContrato,
    BancoCatalogo,
    CargoCatalogo,
    ContratoTrabajador,
    EnvioAprobacionEmpleador,
    TurnoLaboral,
)


@admin.register(ContratoTrabajador)
class ContratoTrabajadorAdmin(SimpleHistoryAdmin):
    list_display = (
        "id",
        "usuario_empresa",
        "tipo_contrato",
        "estado",
        "fecha_inicio",
        "fecha_termino",
        "cargo",
    )
    list_filter = ("estado", "tipo_contrato", "jornada", "moneda")
    search_fields = (
        "usuario_empresa__usuario__email",
        "usuario_empresa__usuario__first_name",
        "usuario_empresa__usuario__last_name",
        "cargo",
    )
    raw_id_fields = ("usuario_empresa", "creado_por", "aceptado_por")


@admin.register(AnexoContrato)
class AnexoContratoAdmin(SimpleHistoryAdmin):
    list_display = ("id", "contrato", "tipo", "fecha_efectiva", "estado")
    list_filter = ("tipo", "estado")
    raw_id_fields = ("contrato", "creado_por")


@admin.register(CargoCatalogo)
class CargoCatalogoAdmin(admin.ModelAdmin):
    list_display = ("id", "nombre", "empresa", "activo")
    list_filter = ("activo", "empresa")
    search_fields = ("nombre", "empresa__nombre")
    list_editable = ("activo",)


@admin.register(AfpCatalogo)
class AfpCatalogoAdmin(admin.ModelAdmin):
    list_display = ("id", "nombre", "empresa", "activo")
    list_filter = ("activo", "empresa")
    search_fields = ("nombre",)
    list_editable = ("activo",)


@admin.register(BancoCatalogo)
class BancoCatalogoAdmin(admin.ModelAdmin):
    list_display = ("id", "nombre", "empresa", "activo")
    list_filter = ("activo", "empresa")
    search_fields = ("nombre",)
    list_editable = ("activo",)


@admin.register(TurnoLaboral)
class TurnoLaboralAdmin(admin.ModelAdmin):
    list_display = ("id", "nombre", "empresa", "hora_inicio", "hora_fin", "horas_turno", "activo")
    list_filter = ("activo", "empresa")
    search_fields = ("nombre", "empresa__nombre")
    list_editable = ("activo",)
    readonly_fields = ("cruza_medianoche", "horas_turno")


@admin.register(EnvioAprobacionEmpleador)
class EnvioAprobacionEmpleadorAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "contrato",
        "enviado_a",
        "enviado_por",
        "decision",
        "fecha_envio",
        "fecha_respuesta",
        "expirado",
    )
    list_filter = ("decision", "expirado")
    search_fields = ("enviado_a", "contrato__id")
    readonly_fields = (
        "uuid",
        "pdf_congelado",
        "fecha_envio",
        "fecha_respuesta",
        "ip_respuesta",
    )
    raw_id_fields = ("contrato", "enviado_por")
