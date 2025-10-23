from rest_framework import serializers
from .models import *


class SolicitudVacacionesSerializer(serializers.ModelSerializer):
    papeleta = serializers.SerializerMethodField()
    estado_label = serializers.SerializerMethodField()
    nombre_creado_por = serializers.SerializerMethodField()
    nombre_aprobado_rechazado_por = serializers.SerializerMethodField()
    logo_empresa = serializers.SerializerMethodField()
    firma_empresa = serializers.SerializerMethodField()

    class Meta:
        model = SolicitudVacaciones
        fields = '__all__'

    def get_papeleta(self, obj):
        return obj.usuario_empresa.generar_papeleta()

    def get_estado_label(self, obj):
        return obj.get_estado_display()

    def get_nombre_creado_por(self, obj):
        if obj.creado_por:
            return obj.creado_por.get_nombre_completo()
        else:
            return ""

    def get_nombre_aprobado_rechazado_por(self, obj):
        if obj.aprobado_rechazado_por:
            return obj.aprobado_rechazado_por.get_nombre_completo()
        else:
            return ""

    def get_logo_empresa(self, obj):
        if obj.usuario_empresa.sucursal.empresa.logo:
            return obj.usuario_empresa.sucursal.empresa.logo
        else:
            return ""

    def get_firma_empresa(self, obj):
        if obj.usuario_empresa.sucursal.empresa.firma_empresa:
            return obj.usuario_empresa.sucursal.empresa.firma_empresa
        else:
            return obj.usuario_empresa.sucursal.empresa.firma_empresa