from django.contrib import admin
from django.contrib.auth.models import Group
from django.contrib.auth.admin import GroupAdmin as DefaultGroupAdmin
from .models import *

admin.site.register(PersonalizacionUsuario)
admin.site.register(Software)
admin.site.register(AcuerdoConfidencialidadBase)


class DescripcionGrupoInline(admin.StackedInline):
    model = DescripcionGrupo
    can_delete = False
    max_num = 1
    fields = ("descripcion", "activo")


admin.site.unregister(Group)


@admin.register(Group)
class GroupAdmin(DefaultGroupAdmin):
    # El widget de `permissions` de Django no lo consulta el motor de
    # autorización (TienePermisoDeRol solo verifica pertenencia al grupo por
    # nombre) — se oculta para no sugerir que marcarlo otorga algo.
    fields = ("name",)
    inlines = [DescripcionGrupoInline]
    list_display = ("name", "descripcion_corta", "cantidad_usuarios", "esta_activo")

    def descripcion_corta(self, obj):
        return getattr(getattr(obj, "descripcion", None), "descripcion", "") or "—"
    descripcion_corta.short_description = "Descripción"

    def esta_activo(self, obj):
        return getattr(getattr(obj, "descripcion", None), "activo", None)
    esta_activo.boolean = True
    esta_activo.short_description = "Activo"

    def cantidad_usuarios(self, obj):
        return obj.usuarioempresa_set.count()
    cantidad_usuarios.short_description = "Usuarios"


@admin.register(RecursoAccion)
class RecursoAccionAdmin(admin.ModelAdmin):
    list_display = ("recurso", "accion", "descripcion", "cantidad_roles")
    list_filter = ("recurso",)
    search_fields = ("recurso", "accion", "descripcion")
    filter_horizontal = ("grupos",)

    def cantidad_roles(self, obj):
        return obj.grupos.count()
    cantidad_roles.short_description = "Roles con acceso"


admin.site.site_header = "ERP Snabbit | Administración"
admin.site.site_title = "ERP Snabbit"
admin.site.index_title = "Bienvenido al ERP Snabbit"



@admin.register(PreguntaEnRetroalimentacion)
class PreguntaEnRetroalimentacionAdmin(admin.ModelAdmin):
    search_fields = ["texto"]
    list_display = ["id", "texto", "content_type", "activo"]
    list_filter = ["activo", "content_type"]