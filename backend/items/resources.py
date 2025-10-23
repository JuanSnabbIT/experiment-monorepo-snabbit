from import_export import resources, fields
from import_export.widgets import ForeignKeyWidget, ManyToManyWidget
from .models import Categoria, Fabricante, ItemEmpresa, ProveedorEmpresa
from empresas.models import Empresa  # Se asume que Empresa está en la app "empresas"


### Resource para Categoria
class CategoriaResource(resources.ModelResource):
    class Meta:
        model = Categoria
        fields = ('id', 'nombre',)
        export_order = ('id', 'nombre',)

### Resource para Fabricante
class FabricanteResource(resources.ModelResource):
    class Meta:
        model = Fabricante
        fields = ('id', 'nombre', 'pagina_web', 'email_soporte', 'telefono_soporte',)
        export_order = ('id', 'nombre', 'pagina_web', 'email_soporte', 'telefono_soporte',)

### Resource para ProveedorEmpresa
class ProveedorEmpresaResource(resources.ModelResource):
    # Para el campo empresa (FK a Empresa) usamos un widget que identifica la empresa por su nombre
    empresa = fields.Field(
        column_name='empresa',
        attribute='empresa',
        widget=ForeignKeyWidget(Empresa, 'nombre')
    )

    class Meta:
        model = ProveedorEmpresa
        fields = (
            'id',
            'nombre',
            'rut',
            'direccion',
            'region',
            'provincia',
            'comuna',
            'pagina_web',
            'telefono',
            'empresa',
            'ejecutivo_asignado',
            'email_ejecutivo',
            'catalogo_web',
        )
        export_order = (
            'id',
            'nombre',
            'rut',
            'direccion',
            'region',
            'provincia',
            'comuna',
            'pagina_web',
            'telefono',
            'empresa',
            'ejecutivo_asignado',
            'email_ejecutivo',
            'catalogo_web',
        )

### Resource para ItemEmpresa
class ItemEmpresaResource(resources.ModelResource):
    # Widget para el campo fabricante (FK a Fabricante)
    fabricante = fields.Field(
        column_name='fabricante',
        attribute='fabricante',
        widget=ForeignKeyWidget(Fabricante, 'nombre')
    )
    # Widget para el campo categoria (FK a Categoria)
    categoria = fields.Field(
        column_name='categoria',
        attribute='categoria',
        widget=ForeignKeyWidget(Categoria, 'nombre')
    )
    # Widget para el campo empresa (FK a Empresa)
    empresa = fields.Field(
        column_name='empresa',
        attribute='empresa',
        widget=ForeignKeyWidget(Empresa, 'nombre')
    )
    # Para la relación ManyToMany con ProveedorEmpresa
    proveedores_empresa = fields.Field(
        column_name='proveedores_empresa',
        attribute='proveedores_empresa',
        widget=ManyToManyWidget(ProveedorEmpresa, separator=',', field='nombre')
    )

    class Meta:
        model = ItemEmpresa
        fields = (
            'id',
            'nombre',
            'descripcion_corta',
            'fabricante',
            'categoria',
            'empresa',
            'proveedores_empresa',
            'comentarios',
        )
        export_order = (
            'id',
            'nombre',
            'descripcion_corta',
            'fabricante',
            'categoria',
            'empresa',
            'proveedores_empresa',
            'comentarios',
        )

# ### Resource para ImagenItem
# class ImagenItemResource(resources.ModelResource):
#     # Para el campo item (FK a ItemEmpresa) se muestra el nombre del item
#     item = fields.Field(
#         column_name='item',
#         attribute='item',
#         widget=ForeignKeyWidget(ItemEmpresa, 'nombre')
#     )

#     class Meta:
#         model = ImagenItem
#         fields = ('id', 'item', 'imagen',)
#         export_order = ('id', 'item', 'imagen',)
