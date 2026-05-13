from django.contrib import admin
from simple_history.admin import SimpleHistoryAdmin

from .models import AnexoContrato, ContratoTrabajador


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
