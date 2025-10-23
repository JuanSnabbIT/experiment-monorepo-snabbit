from django.contrib import admin
from .models import *
admin.site.register(PersonalizacionUsuario)
admin.site.register(Software)
admin.site.register(AcuerdoConfidencialidadBase)
admin.site.register(DescripcionGrupo)

admin.site.site_header = "ERP Snabbit | Administración"
admin.site.site_title = "ERP Snabbit"
admin.site.index_title = "Bienvenido al ERP Snabbit"



@admin.register(PreguntaEnRetroalimentacion)
class PreguntaEnRetroalimentacionAdmin(admin.ModelAdmin):
    search_fields = ["texto"]
    list_display = ["id", "texto", "content_type", "activo"]
    list_filter = ["activo", "content_type"]