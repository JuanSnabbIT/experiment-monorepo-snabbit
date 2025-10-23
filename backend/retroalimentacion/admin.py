from django.contrib import admin
from django.contrib.contenttypes.admin import GenericStackedInline
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.contrib.admin.widgets import ForeignKeyRawIdWidget
from django import forms

from .models import Retroalimentacion, RetroalimentacionAplicada, LogDeAccesoRetroalimentacion


@admin.action(description="Generar preguntas aplicables")
def generar_preguntas(modeladmin, request, queryset):
    for retro in queryset:
        retro.generar_preguntas_aplicables()

# FORMULARIO PARA EL INLINE
class RetroalimentacionAplicadaInlineForm(forms.ModelForm):
    class Meta:
        model = RetroalimentacionAplicada
        fields = "__all__"
        widgets = {
            'content_type': ForeignKeyRawIdWidget(RetroalimentacionAplicada._meta.get_field('content_type').remote_field, admin.site),
        }


# INLINE PARA APLICADAS
class RetroalimentacionAplicadaInline(admin.TabularInline):
    model = RetroalimentacionAplicada
    form = RetroalimentacionAplicadaInlineForm
    extra = 0
    autocomplete_fields = ["pregunta"]
    raw_id_fields = ["content_type"]
    readonly_fields = ["modelo_relacionado"]


@admin.register(Retroalimentacion)
class RetroalimentacionAdmin(admin.ModelAdmin):
    list_display = ["id", "orden_trabajo", "usuario_empresa", "usuario_externo", "fecha_retroalimentacion"]
    list_filter = ["fecha_retroalimentacion"]
    search_fields = ["usuario_empresa__usuario__first_name", "usuario_externo", "orden_trabajo__id"]
    inlines = [RetroalimentacionAplicadaInline]
    readonly_fields = ["uuid"]
    autocomplete_fields = ["usuario_empresa", "preguntas"]
    actions = [generar_preguntas]


@admin.register(RetroalimentacionAplicada)
class RetroalimentacionAplicadaAdmin(admin.ModelAdmin):
    list_display = ["id", "retroalimentacion", "pregunta", "cantidad_estrellas", "modelo_relacionado"]
    list_filter = ["cantidad_estrellas", "content_type"]
    search_fields = ["pregunta__texto", "observaciones"]
    raw_id_fields = ["content_type"]
    autocomplete_fields = ["pregunta", "retroalimentacion"]
    readonly_fields = ["modelo_relacionado"]




@admin.register(LogDeAccesoRetroalimentacion)
class LogDeAccesoAdmin(admin.ModelAdmin):
    list_display = ["retroalimentacion", "ip", "timestamp"]
    list_filter = ["timestamp"]
    search_fields = ["ip", "user_agent", "retroalimentacion__uuid"]