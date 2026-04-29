from django.contrib import admin

from .models import ConfiguracionNotificacionEmpresa, FCMToken, Notificacion


@admin.register(FCMToken)
class FCMTokenAdmin(admin.ModelAdmin):
    list_display = ("id", "usuario", "activo", "ultima_vez_visto", "fecha_creacion")
    list_filter = ("activo",)
    search_fields = ("usuario__email", "token")


@admin.register(Notificacion)
class NotificacionAdmin(admin.ModelAdmin):
    list_display = ("id", "usuario", "tipo", "titulo", "leida", "fecha_creacion")
    list_filter = ("tipo", "leida")
    search_fields = ("usuario__email", "titulo", "cuerpo")
    readonly_fields = ("fecha_creacion", "fecha_modificacion")


@admin.register(ConfiguracionNotificacionEmpresa)
class ConfiguracionNotificacionEmpresaAdmin(admin.ModelAdmin):
    list_display = ("id", "empresa", "tipo", "activo")
    list_filter = ("tipo", "activo")
    search_fields = ("empresa__nombre",)
