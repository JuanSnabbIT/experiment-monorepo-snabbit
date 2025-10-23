from django.contrib import admin
from .models import *
from .resources import CategoriaResource, FabricanteResource, ItemEmpresaResource, ProveedorEmpresaResource
from import_export.admin import ImportExportModelAdmin

@admin.register(Categoria)
class CategoriaAdmin(ImportExportModelAdmin):
    resource_class = CategoriaResource
    list_display = ('id', 'nombre',)

@admin.register(Fabricante)
class FabricanteAdmin(ImportExportModelAdmin):
    resource_class = FabricanteResource
    list_display = ('id', 'nombre', 'pagina_web', 'email_soporte', 'telefono_soporte',)

@admin.register(ProveedorEmpresa)
class ProveedorEmpresaAdmin(ImportExportModelAdmin):
    resource_class = ProveedorEmpresaResource
    list_display = ('id', 'nombre', 'rut', 'direccion', 'empresa',)

@admin.register(ItemEmpresa)
class ItemEmpresaAdmin(ImportExportModelAdmin):
    resource_class = ItemEmpresaResource
    list_display = ('id', 'nombre', 'empresa', 'categoria',)

# @admin.register(ImagenItem)
# class ImagenItemAdmin(ImportExportModelAdmin):
#     resource_class = ImagenItemResource
#     list_display = ('id', 'item',)

admin.site.register(ImagenItem)
admin.site.register(CampoAdicionalItem)
admin.site.register(CampoAdicionalProveedor)
