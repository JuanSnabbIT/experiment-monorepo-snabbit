from import_export import resources, fields
from .models import Empresa, SucursalEmpresa, UsuarioEmpresa, RelacionEmpresa
from import_export.widgets import ForeignKeyWidget
from cuentas.models import User


class EmpresaResource(resources.ModelResource):
    class Meta:
        model = Empresa

class SucursalEmpresaResource(resources.ModelResource):
    empresa = fields.Field(
        column_name='empresa',
        attribute='empresa',
        widget=ForeignKeyWidget(Empresa, 'nombre')
    )

    class Meta:
        model = SucursalEmpresa

class UsuarioEmpresaResource(resources.ModelResource):
    empresa = fields.Field(
        column_name='empresa',
        attribute='empresa',
        widget=ForeignKeyWidget(Empresa, 'nombre')
    )
    usuario = fields.Field(
        column_name='usuario',
        attribute='usuario',
        widget=ForeignKeyWidget(User, 'email')
    )

    class Meta:
        model = UsuarioEmpresa

class RelacionEmpresaResource(resources.ModelResource):
    prestador_servicios = fields.Field(
        column_name='prestador_servicios',
        attribute='prestador_servicios',
        widget=ForeignKeyWidget(Empresa, 'nombre')
    )
    cliente = fields.Field(
        column_name='cliente',
        attribute='cliente',
        widget=ForeignKeyWidget(Empresa, 'nombre')
    )


    class Meta:
        model = RelacionEmpresa