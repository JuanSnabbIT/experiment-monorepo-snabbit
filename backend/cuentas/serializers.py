from djoser.serializers import UserSerializer as BaseUserSerializer
from rest_framework import serializers
from djoser.serializers import UserCreateSerializer as BaseUserCreateSerializer

from core.models import DescripcionGrupo

from .models import *


class DescripcionGrupoSerializer(serializers.ModelSerializer):
    nombre = serializers.CharField(source="group.name", read_only=True)

    class Meta:
        model = DescripcionGrupo
        fields = ("nombre", "descripcion")

class UserCreateSerializer(BaseUserCreateSerializer):
    class Meta(BaseUserCreateSerializer.Meta):
        model = User
        fields = ('id', 'email', 'first_name', 'last_name', 'password', 'is_active')
        
class UserSerializer(BaseUserSerializer):
    class Meta(BaseUserSerializer.Meta):
        model = User
        fields = ('email', 'first_name', 'second_name', 'last_name', 'second_last_name', 'rut', 'celular', 'genero', 'fecha_nacimiento', 'is_staff', 'pk', 'image', 'estado_civil', 'nacionalidad', 'direccion', 'region', 'provincia', 'comuna', 'is_active')

class InvitacionEmpresaSerializer(serializers.ModelSerializer):
    is_expired = serializers.SerializerMethodField()
    id_user = serializers.SerializerMethodField()
    
    class Meta:
        model = InvitacionEmpresa
        fields = '__all__'
        
    def get_is_expired(self, obj):
        return obj.is_expired()

    def get_id_user(self, obj):
        usuario = User.objects.filter(email=obj.email)
        if usuario.exists() and usuario.first().is_active:
            return usuario.first().pk
        else:
            return False