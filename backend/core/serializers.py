from .models import *
from rest_framework import serializers
from django.contrib.contenttypes.models import ContentType


class PersonalizacionUsuarioSerializer(serializers.ModelSerializer):
    empresa = serializers.SerializerMethodField()

    class Meta:
        model = PersonalizacionUsuario
        fields = '__all__'

    def get_empresa(self, obj):
        if obj.sucursal_principal:
            return obj.sucursal_principal.empresa_id

class ContentTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContentType
        fields = ['id', 'app_label', 'model']

class SoftwareSerializer(serializers.ModelSerializer):
    class Meta:
        fields = '__all__'
        model = Software

class AcuerdoConfidencialidadBaseSerializer(serializers.ModelSerializer):
    class Meta:
        fields = '__all__'
        model = AcuerdoConfidencialidadBase