from django.contrib import admin
from .resources import EmpresaResource, RelacionEmpresaResource, SucursalEmpresaResource, UsuarioEmpresaResource
from .models import *
from import_export.admin import ImportExportModelAdmin


@admin.register(Empresa)
class EmpresaAdmin(ImportExportModelAdmin):
    resource_class = EmpresaResource
    list_display = ('id', 'nombre', 'sitio_web')  # personaliza según tus necesidades
    search_fields = ["nombre", "rut", "correo"]
    

@admin.register(SucursalEmpresa)
class SucursalAdmin(ImportExportModelAdmin):
    resource_class = SucursalEmpresaResource
    list_display = ('id', 'nombre')

@admin.register(UsuarioEmpresa)
class UsuarioEmpresaAdmin(ImportExportModelAdmin):
    resource_class = UsuarioEmpresaResource
    list_display = ('usuario', 'id', 'estado')
    search_fields = ["usuario__first_name", "usuario__last_name", "usuario__email"]


@admin.register(RelacionEmpresa)
class RelacionEmpresaAdmin(ImportExportModelAdmin):
    resource_class = RelacionEmpresaResource
    list_display = ('id', 'prestador_servicios', 'cliente')


# admin.site.register(Empresa)
# admin.site.register(SucursalEmpresa)
# admin.site.register(UsuarioEmpresa)
# admin.site.register(RelacionEmpresa)

