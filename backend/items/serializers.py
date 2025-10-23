from .models import *
from rest_framework import serializers

class CategoriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Categoria
        fields = '__all__'

class FabricanteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Fabricante
        fields = '__all__'

class ProveedorEmpresaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProveedorEmpresa
        fields = '__all__'

class BulkImagenItemInputSerializer(serializers.Serializer):
    """
    Payload de entrada: un solo item y un listado de strings base64.
    """
    item     = serializers.PrimaryKeyRelatedField(
        queryset=ItemEmpresa.objects.all()
    )
    imagenes = serializers.ListField(
        child=serializers.CharField(),
        allow_empty=False
    )

class ImagenItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ImagenItem
        fields = '__all__'

class ItemEmpresaSerializer(serializers.ModelSerializer):
    datos_proveedores = ProveedorEmpresaSerializer(source="proveedores_empresa", many=True, read_only=True)
    datos_categoria = CategoriaSerializer(source="categoria", read_only=True)
    datos_fabricante = FabricanteSerializer(source="fabricante", read_only=True)
    imagenes = ImagenItemSerializer(many=True, read_only=True)

    class Meta:
        model = ItemEmpresa
        fields = '__all__'

class CampoAdicionalItemSerializer(serializers.ModelSerializer):
    nombre_campo = serializers.SerializerMethodField()
    proveedor = serializers.SerializerMethodField()

    class Meta:
        model = CampoAdicionalItem
        fields = '__all__'

    def get_nombre_campo(self, obj):
        return obj.campo.nombre

    def get_proveedor(self, obj):
        return obj.campo.proveedor.pk