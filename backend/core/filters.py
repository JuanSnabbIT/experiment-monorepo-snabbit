import django_filters
from .models import *


class PersonalizacionUsuarioFilter(django_filters.FilterSet):
    usuario_pk = django_filters.NumberFilter(field_name='usuario__pk')

    class Meta:
        model = PersonalizacionUsuario
        fields = ['usuario_pk']