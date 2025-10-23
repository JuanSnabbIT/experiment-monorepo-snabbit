from rest_framework import serializers
from .models import *


class DiaCalendarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = DiaCalendario
        fields = '__all__'