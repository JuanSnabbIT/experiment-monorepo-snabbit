from django.contrib import admin

from .models import Activo, DocumentoActivo, ImagenActivo


@admin.register(Activo)
class ActivoAdmin(admin.ModelAdmin):
	list_display = ("id", "empresa", "numero_serie", "cantidad", "valor")
	search_fields = ("numero_serie", "empresa__nombre")
	list_filter = ("empresa",)


@admin.register(DocumentoActivo)
class DocumentoActivoAdmin(admin.ModelAdmin):
	list_display = (
		"id",
		"activo",
		"asignado",
		"asignado_a",
		"en_bodega",
		"bodega",
		"estado_activado",
	)
	search_fields = ("activo__numero_serie",)
	list_filter = ("asignado", "en_bodega", "estado_activado")


@admin.register(ImagenActivo)
class ImagenActivoAdmin(admin.ModelAdmin):
	list_display = ("id", "activo")
	search_fields = ("activo__numero_serie",)
