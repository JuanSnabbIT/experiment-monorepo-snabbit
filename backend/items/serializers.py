import re

from .models import *
from rest_framework import serializers


def normalizar_url(valor):
    """Normaliza una URL: agrega https:// si no tiene protocolo y valida formato básico."""
    if not valor:
        return valor

    valor = valor.strip()
    if not valor:
        return ''

    # Si no tiene protocolo, agregar https://
    if not re.match(r'^https?://', valor, re.IGNORECASE):
        valor = f'https://{valor}'

    # Validar formato básico de URL
    patron_url = re.compile(
        r'^https?://'
        r'([a-zA-Z0-9]([a-zA-Z0-9\-]*[a-zA-Z0-9])?\.)+'
        r'[a-zA-Z]{2,}'
        r'(/[^\s]*)?$',
        re.IGNORECASE,
    )
    if not patron_url.match(valor):
        return None  # Señal de URL inválida

    return valor


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

    def validate_pagina_web(self, value):
        if not value:
            return value
        resultado = normalizar_url(value)
        if resultado is None:
            raise serializers.ValidationError(
                'Ingrese una URL válida (ej: empresa.com o https://empresa.com).'
            )
        return resultado

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