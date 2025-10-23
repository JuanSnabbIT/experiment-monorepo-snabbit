from django_filters import rest_framework as filters
from .models import TomaInventario
from django.db.models import Count, Q


class TomaInventarioFilter(filters.FilterSet):
    # Solo la parte de fecha ⇒ fecha_inicio__date y fecha_termino__date
    desde  = filters.DateFilter(field_name='fecha_inicio__date', lookup_expr='gte')
    hasta  = filters.DateFilter(field_name='fecha_termino__date', lookup_expr='lte')

    bodegas = filters.CharFilter(method='filter_bodegas')

    class Meta:
        model  = TomaInventario
        fields = ['desde', 'hasta', 'bodegas']

    def filter_bodegas(self, qs, name, value):
        ids = [int(pk) for pk in value.split(',') if pk.strip().isdigit()]
        if not ids:
            return qs
        return (qs.filter(bodegas__in=ids)
                .annotate(cnt=Count('bodegas',
                                           filter=Q(bodegas__in=ids),
                                           distinct=True))
                .filter(cnt=len(ids)))
