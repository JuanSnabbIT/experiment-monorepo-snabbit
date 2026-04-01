from rest_framework import serializers
from .models import *

class SucursalEmpresaListaSerializer(serializers.ModelSerializer):
    class Meta:
        model = SucursalEmpresa
        fields = ['id', 'nombre', 'direccion']

class EmpresaSerializer(serializers.ModelSerializer):
    sucursales = SucursalEmpresaListaSerializer(many=True, read_only=True)  # Añade el serializador anidado

    class Meta:
        model = Empresa
        fields = '__all__'

class SucursalEmpresaSerializer(serializers.ModelSerializer):
    class Meta:
        model = SucursalEmpresa
        fields = '__all__'

class UsuarioEmpresaSerializer(serializers.ModelSerializer):
    nombre_usuario = serializers.SerializerMethodField()
    email_usuario = serializers.SerializerMethodField()
    papeleta = serializers.SerializerMethodField()
    estado_label = serializers.SerializerMethodField()
    is_active = serializers.BooleanField(source="usuario.is_active", read_only=True)
    nombre_sucursal = serializers.SerializerMethodField()
    
    class Meta:
        model = UsuarioEmpresa
        fields = '__all__'

    def get_nombre_usuario(self, obj):
        return obj.usuario.get_nombre_completo()

    def get_papeleta(self, obj):
        return obj.generar_papeleta()

    def get_email_usuario(self, obj):
        return obj.usuario.email

    def get_estado_label(self, obj):
        return obj.get_estado_display()

    def get_nombre_sucursal(self, obj):
        return f"{obj.sucursal.nombre} de {obj.sucursal.empresa.nombre}"

class RelacionEmpresaSerializer(serializers.ModelSerializer):
    info_prestador_servicios = EmpresaSerializer(source="prestador_servicios", read_only=True)
    info_cliente = EmpresaSerializer(source="cliente", read_only=True)
    tipo_relacion_label = serializers.SerializerMethodField()

    class Meta:
        model = RelacionEmpresa
        fields = '__all__'

    def get_tipo_relacion_label(self, obj):
        return obj.get_tipo_relacion_display()

    def validate(self, attrs):
        prestador = attrs.get("prestador_servicios") or getattr(self.instance, "prestador_servicios", None)
        cliente = attrs.get("cliente") or getattr(self.instance, "cliente", None)
        if prestador and cliente and prestador == cliente:
            raise serializers.ValidationError("No se puede asignar la misma empresa como cliente de sí misma.")
        return attrs


class CrearProspectoSerializer(serializers.Serializer):
    nombre = serializers.CharField(max_length=255)
    rut_empresa = serializers.CharField(max_length=100, required=False, allow_blank=True, allow_null=True)
    email = serializers.EmailField(required=False, allow_blank=True, allow_null=True)
    telefono = serializers.CharField(max_length=20, required=False, allow_blank=True, allow_null=True)

class EmpresaContratoSerializer(serializers.ModelSerializer):
    representantes_legales = serializers.SerializerMethodField()

    class Meta:
        model = Empresa
        fields = '__all__'

    def get_representantes_legales(self, obj):
        representantes = UsuarioEmpresa.objects.filter(
            sucursal__in=obj.sucursales.all(),
            grupos__name="representante_legal"
        ).distinct()

        return UsuarioEmpresaSerializer(representantes, many=True).data
