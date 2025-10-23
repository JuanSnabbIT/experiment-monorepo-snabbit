from rest_framework import serializers
from bodegas.models import Compra
from bodegas.serializers import CompraSerializer
from ordentrabajo.serializers import DetalleGastoRendicionOTSerializer
from .models import CategoriaGastoRendicion, DetalleGastoRendicion, ItemRendicion, Rendicion	
from empresas.serializers import UsuarioEmpresaSerializer


class CategoriaGastoRendicionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CategoriaGastoRendicion
        fields = '__all__'

class DetalleGastoRendicionSerializer(serializers.ModelSerializer):
    nombre_categoria = serializers.SerializerMethodField()

    class Meta:
        model = DetalleGastoRendicion
        fields = '__all__'

    def get_nombre_categoria(self, obj):
        return obj.categoria.nombre

class RendicionSerializer(serializers.ModelSerializer):
    detalles = DetalleGastoRendicionSerializer(many=True, read_only=True, source='detallegastorendicion_set')
    # total_rendicion = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    # gastos = DetalleGastoRendicionSerializer(read_only=True, many=True)
    datos_usuario =  UsuarioEmpresaSerializer(source="usuario", read_only=True)
    estado_label = serializers.SerializerMethodField()
    total = serializers.SerializerMethodField()

    def get_estado_label(self, obj):
        return obj.get_estado_display()

    def get_total(self, obj):
        return obj.total_rendicion

    class Meta:
        model = Rendicion
        fields = '__all__'

# # 1) Serializer para la categoría
# class CategoriaGastoRendicionSerializer(serializers.ModelSerializer):
#     class Meta:
#         model  = CategoriaGastoRendicion
#         fields = ['id', 'nombre', 'descripcion']  # cambia 'nombre' por el campo que tenga tu modelo

# # 2) Serializer "genérico" para los campos comunes + categoría
# class DetalleGastoSerializer(serializers.Serializer):
#     detalle        = serializers.CharField(max_length=255, allow_null=True, allow_blank=True)
#     cantidad       = serializers.IntegerField()
#     monto_unitario = serializers.IntegerField()
#     monto_total    = serializers.IntegerField(required=False)
#     fecha_gasto    = serializers.DateField()
#     categoria      = CategoriaGastoRendicionSerializer()

# # 3) Serializer principal que anida DetalleGastoSerializer
# class ItemRendicionSerializer(serializers.ModelSerializer):
#     detalle_data = DetalleGastoSerializer(source='detalle')

#     class Meta:
#         model  = ItemRendicion
#         fields = '__all__'

class ItemRendicionSerializer(serializers.ModelSerializer):
    detalle_data = serializers.SerializerMethodField()

    class Meta:
        model = ItemRendicion
        # fields = ['id', 'rendicion', 'content_type', 'detalle_id', 'detalle_data',]  # ajusta según necesites
        fields = '__all__'

    def get_detalle_data(self, obj):
        ct = obj.content_type
        # Gasto interno
        if ct.app_label == 'rendiciones' and ct.model == 'detallegastorendicion':
            return DetalleGastoRendicionSerializer(obj.detalle).data

        # Gasto OT
        if ct.app_label == 'ordentrabajo' and ct.model == 'detallegastorendicionot':
            return DetalleGastoRendicionOTSerializer(obj.detalle).data

        # Compra
        if ct.app_label == 'bodegas' and ct.model == 'compra':
            return CompraSerializer(obj.detalle).data

        return None

class CompraRendicionSerializer(serializers.ModelSerializer):
    total_compra = serializers.SerializerMethodField()

    class Meta:
        model = Compra
        fields = '__all__'

    def get_total_compra(self, obj):
        return sum((item.cantidad * item.precio) for item in obj.itemencompra_set.all())

