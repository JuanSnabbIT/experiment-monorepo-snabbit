from rest_framework import serializers, pagination
from .models import *

class ProvinciaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Provincia
        fields = '__all__'

class ComunaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Comuna
        fields = '__all__'

class RegionSerializer(serializers.ModelSerializer):
    provincia = serializers.SerializerMethodField()
    comuna = serializers.SerializerMethodField()
    
    class Meta:
        model = Region
        fields = '__all__'
        
    def get_provincia(self, obj):
        provincia = Provincia.objects.using('db_comunas').filter(provincia_region = obj.pk)
        return [ProvinciaSerializer(m).data for m in provincia]
    
    def get_comuna(self, obj):
        provincia = Provincia.objects.using('db_comunas').filter(provincia_region = obj.pk).values_list('pk', flat=True)
        comuna = Comuna.objects.using('db_comunas').filter(comuna_provincia__in=provincia)
        return [ComunaSerializer(m).data for m in comuna]