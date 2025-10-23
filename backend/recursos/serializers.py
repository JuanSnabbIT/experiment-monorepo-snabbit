from rest_framework import serializers
from core.models import Software
from .models import *


class SoftwareInstaladoSerializer(serializers.ModelSerializer):
    nombre_software = serializers.SerializerMethodField()

    class Meta:
        fields = '__all__'
        model = SoftwareInstalado

    def get_nombre_software(self, obj):
        if isinstance(obj.software, Software):
            return obj.software.nombre
        return obj.software.software.nombre

class AlmacenamientoEquipoSerializer(serializers.ModelSerializer):
    almacenamiento_label = serializers.SerializerMethodField()

    class Meta:
        model = AlmacenamientoEquipo
        fields = '__all__'

    def get_almacenamiento_label(self, obj):
        return obj.get_almacenamiento_display()

class MonitorEquipoSerializer(serializers.ModelSerializer):
    class Meta:
        fields = '__all__'
        model = MonitorEquipo

class FotoEquipoSerializer(serializers.ModelSerializer):
    nombre_usuario = serializers.SerializerMethodField()

    class Meta:
        fields = '__all__'
        model = FotoEquipo

    def get_nombre_usuario(self, obj):
        return obj.usuario_equipo.usuario.usuario.get_nombre_completo()

class EquipoSerializer(serializers.ModelSerializer):
    tipo_equipo_label = serializers.SerializerMethodField()
    marca_label = serializers.SerializerMethodField()
    tipo_procesador_label = serializers.SerializerMethodField()
    generacion_procesador_label = serializers.SerializerMethodField()
    ram_label = serializers.SerializerMethodField()
    sistema_operativo_label = serializers.SerializerMethodField()
    condicion_equipo_label = serializers.SerializerMethodField()
    marca_tarjeta_grafica_label = serializers.SerializerMethodField()
    tipo_tarjeta_grafica_label = serializers.SerializerMethodField()
    datos_almacenamiento = AlmacenamientoEquipoSerializer(source="almacenamientoequipo_set", read_only=True, many=True)
    datos_monitor = MonitorEquipoSerializer(source="monitorequipo_set", read_only=True, many=True)
    datos_software = SoftwareInstaladoSerializer(source="softwareinstalado_set", read_only=True, many=True)
    nombre_usuario_asignado = serializers.SerializerMethodField()

    class Meta:
        model = Equipo
        fields = '__all__'

    def get_nombre_usuario_asignado(self, obj):
        usuario_equipo = obj.usuario_equipo.filter(estado=True).first()
        if usuario_equipo:
            return usuario_equipo.usuario.usuario.get_nombre_completo()
        return None 

    def get_tipo_equipo_label(self, obj):
        return obj.get_tipo_equipo_display()

    def get_marca_label(self, obj):
        return obj.get_marca_display()

    def get_tipo_procesador_label(self, obj):
        return obj.get_tipo_procesador_display()

    def get_generacion_procesador_label(self, obj):
        return obj.get_generacion_procesador_display()

    def get_ram_label(self, obj):
        return obj.get_ram_display()

    def get_sistema_operativo_label(self, obj):
        return obj.get_sistema_operativo_display()

    def get_condicion_equipo_label(self, obj):
        return obj.get_condicion_equipo_display()

    def get_marca_tarjeta_grafica_label(self, obj):
        return obj.get_marca_tarjeta_grafica_display()

    def get_tipo_tarjeta_grafica_label(self, obj):
        return obj.get_tipo_tarjeta_grafica_display()

class UsuarioEquipoSerializer(serializers.ModelSerializer):
    nombre_usuario = serializers.SerializerMethodField()
    datos_equipo = EquipoSerializer(source="equipo", read_only=True)
    foto_usuario = serializers.SerializerMethodField()

    def get_nombre_usuario(self, obj):
        return obj.usuario.usuario.get_nombre_completo()

    def get_foto_usuario(self, obj):
        if obj.usuario.usuario.image:
            return obj.usuario.usuario.image.url
        else:
            return None

    class Meta:
        fields = '__all__'
        model = UsuarioEquipo

class SoftwareDeEmpresaSerializer(serializers.ModelSerializer):
    nombre_empresa = serializers.SerializerMethodField()

    class Meta:
        fields = '__all__'
        model = SoftwareDeEmpresa

    def get_nombre_empresa(self, obj):
        return obj.software.nombre
