from .models import *
from rest_framework import serializers


class ItemCotizacionSerializer(serializers.ModelSerializer):
    ppm = serializers.SerializerMethodField()
    nombre_item = serializers.SerializerMethodField()
    nombre_proveedor = serializers.SerializerMethodField()
    recargo_iva_venta = serializers.SerializerMethodField()
    iva_compra = serializers.SerializerMethodField()
    # precio_venta_neta = serializers.SerializerMethodField()
    valor_ppm = serializers.SerializerMethodField()
    total_impuesto = serializers.SerializerMethodField()
    precio_total_backend = serializers.SerializerMethodField()
    precio_unitario_backend = serializers.SerializerMethodField()
    ganancia = serializers.SerializerMethodField()
    precio_venta_neta_unitario_moneda_base = serializers.SerializerMethodField()
    precio_venta_neta_total_moneda_base = serializers.SerializerMethodField()

    class Meta:
        model = ItemCotizacion
        fields = '__all__'

    def get_ppm(self, obj):
        return obj.cotizacion.ppm

    def get_nombre_item(self, obj):
        if obj.item_empresa:
            return obj.item_empresa.nombre
        return obj.nombre

    def get_nombre_proveedor(self, obj):
        if obj.proveedor_empresa:
            return obj.proveedor_empresa.nombre
        return None

    def get_recargo_iva_venta(self, obj):
        return obj.recargo_iva_venta

    def get_iva_compra(self, obj):
        return obj.iva_compra

    # def get_precio_venta_neta(self, obj):
    #     return obj.precio_venta_neta

    def get_valor_ppm(self, obj):
        return obj.valor_ppm

    def get_total_impuesto(self, obj):
        return obj.total_impuesto

    def get_precio_total_backend(self, obj):
        return obj.precio_total_backend

    def get_precio_unitario_backend(self, obj):
        return obj.precio_unitario_backend

    def get_ganancia(self, obj):
        return obj.ganancia

    def get_precio_venta_neta_unitario_moneda_base(self, obj):
        return obj.precio_venta_neta_unitario_moneda_base

    def get_precio_venta_neta_total_moneda_base(self, obj):
        return obj.precio_venta_neta_total_moneda_base

class CotizacionSerializer(serializers.ModelSerializer):
    estado_label = serializers.SerializerMethodField()
    tipo_moneda_label = serializers.SerializerMethodField()
    empresa_nombre = serializers.SerializerMethodField()
    cliente_nombre = serializers.SerializerMethodField()
    recargo_cliente = serializers.SerializerMethodField()
    es_vigente = serializers.SerializerMethodField()

    def get_empresa_nombre(self, obj):
        return obj.empresa.nombre

    def get_cliente_nombre(self, obj):
        return obj.cliente.nombre

    def get_estado_label(self, obj):
        return obj.get_estado_display()

    def get_tipo_moneda_label(self, obj):
        return obj.get_tipo_moneda_display()

    def get_recargo_cliente(self, obj):
        return obj.cliente.recargo

    def get_es_vigente(self, obj):
        return obj.es_vigente

    class Meta:
        model = Cotizacion
        fields = '__all__'

class SeguimientoCotizacionSerializer(serializers.ModelSerializer):
    usuario_nombre = serializers.SerializerMethodField()

    def get_usuario_nombre(self, obj):
        return f"{obj.usuario.usuario.first_name} {obj.usuario.usuario.last_name}"

    class Meta:
        model = SeguimientoCotizacion
        fields = '__all__'

class SolicitanteCotizacionSerializer(serializers.ModelSerializer):
    nombre_usuario = serializers.SerializerMethodField()
    email_usuario = serializers.SerializerMethodField()

    class Meta:
        model = SolicitanteCotizacion
        fields = '__all__'

    def get_nombre_usuario(self, obj):
        # Si es un solicitante externo, usamos el atributo "nombre"
        if obj.content_type.model == "solicitanteexterno":
            return obj.usuario.nombre
        # Si es un usuario empresa, accedemos al usuario relacionado y obtenemos el nombre
        elif obj.content_type.model == "usuarioempresa":
            return obj.usuario.usuario.get_nombre_completo()
        return ""

    def get_email_usuario(self, obj):
        # Si es un solicitante externo, usamos el atributo "email"
        if obj.content_type.model == "solicitanteexterno":
            return obj.usuario.email
        # Si es un usuario empresa, accedemos al usuario relacionado y obtenemos su email
        elif obj.content_type.model == "usuarioempresa":
            return obj.usuario.usuario.email
        return ""

class SolicitanteExternoSerializer(serializers.ModelSerializer):
    class Meta:
        model = SolicitanteExterno
        fields = '__all__'

class ComentarioCotizacionSerializer(serializers.ModelSerializer):
    nombre_creado_por = serializers.SerializerMethodField()

    class Meta:
        model = ComentarioCotizacion
        fields = '__all__'

    def get_nombre_creado_por(self, obj):
        return obj.creado_por.usuario.get_nombre_completo()