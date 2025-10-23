from rest_framework import serializers
from .models import AsistenciaUsuario, EntregaDeEquipo, VisitaSoporte
from recursos.serializers import EquipoSerializer


class AsistenciaUsuarioSerializer(serializers.ModelSerializer):
    estado_revision_label = serializers.SerializerMethodField()
    usuario_equipo_nombre = serializers.SerializerMethodField()

    def get_usuario_equipo_nombre(self, obj):
        return obj.usuario_equipo.usuario.usuario.get_nombre_completo()

    def get_estado_revision_label(self, obj): 
        return obj.get_estado_revision_display()

    class Meta:
        model = AsistenciaUsuario
        fields = '__all__'

class VisitaSoporteSerializer(serializers.ModelSerializer):
    empresa_nombre = serializers.SerializerMethodField()
    cliente_nombre = serializers.SerializerMethodField()
    estado_label = serializers.SerializerMethodField()
    guia_salida_nombre = serializers.SerializerMethodField()

    def get_empresa_nombre(self, obj):
        return obj.empresa.nombre

    def get_cliente_nombre(self, obj):
        return obj.cliente.nombre

    def get_estado_label(self, obj):
        return obj.get_estado_display()

    def get_guia_salida_nombre(self, obj):
        return f"N°{obj.guia_salida.pk} - {obj.guia_salida.motivo}" if obj.guia_salida else "Sin Guia de Salida"

    class Meta:
        model = VisitaSoporte
        fields = '__all__'

class EntregaDeEquipoSerializer(serializers.ModelSerializer):
    nombre_usuario_a_entregar = serializers.SerializerMethodField()
    estado_entrega_label = serializers.SerializerMethodField()
    datos_equipo = EquipoSerializer(source="equipo", read_only=True)
    se_puede_firmar = serializers.SerializerMethodField()

    def get_nombre_usuario_a_entregar(self, obj):
        return obj.usuario_a_entregar.usuario.get_nombre_completo()

    def get_estado_entrega_label(self, obj):
        return obj.get_estado_entrega_display()

    def get_se_puede_firmar(self, obj):
        if obj.equipo.marca != "OTRA" and obj.equipo.modelo != "" and obj.equipo.id_procesador != None and obj.equipo.id_procesador != "" and obj.equipo.tipo_procesador != "OTRO" and obj.equipo.ram != "OTRA" and obj.equipo.fecha_compra != None:
            return True
        else:
            return False

    class Meta:
        model = EntregaDeEquipo
        fields = '__all__'

class EntregaDeEquipoEnDetalleOTSerializer(serializers.ModelSerializer):
    estado_entrega_label = serializers.SerializerMethodField()
    nombre_usuario_a_entregar = serializers.SerializerMethodField()
    numero_serie_equipo = serializers.SerializerMethodField()
    se_puede_firmar = serializers.SerializerMethodField()
    
    def get_nombre_usuario_a_entregar(self, obj):
        return obj.usuario_a_entregar.usuario.get_nombre_completo()

    def get_estado_entrega_label(self, obj):
        return obj.get_estado_entrega_display()

    def get_numero_serie_equipo(self, obj):
        return obj.equipo.numero_serie

    def get_se_puede_firmar(self, obj):
        if obj.equipo.marca != "OTRA" and obj.equipo.modelo != "" and obj.equipo.id_procesador != None and obj.equipo.id_procesador != "" and obj.equipo.tipo_procesador != "OTRO" and obj.equipo.ram != "OTRA" and obj.equipo.fecha_compra != None:
            return True
        else:
            return False

    class Meta:
        model = EntregaDeEquipo
        fields = '__all__'

class VisitaSoporteEnDetalleOTSerializer(serializers.ModelSerializer):
    datos_entregas = EntregaDeEquipoEnDetalleOTSerializer(source="entregas", many=True, read_only=True)
    datos_asistencias = AsistenciaUsuarioSerializer(source="revisiones", many=True, read_only=True)

    class Meta:
        model = VisitaSoporte
        fields = '__all__'
