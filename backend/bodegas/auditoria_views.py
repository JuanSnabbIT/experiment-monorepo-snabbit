"""Vistas API para auditoría y trazabilidad"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter

from .models import (
    BitácoraMovimiento, BitácoraSerieMovimiento, ReporteConciliación, AnomalíaMovimiento, SerieItem
)
from .auditoria_serializers import (
    BitácoraMovimientoSerializer, BitácoraSerieMovimientoSerializer,
    ReporteConciliacionSerializer, AnomalíaMovimientoSerializer
)
from .auditoria_servicios import (
    TrazabilidadService, ConciliacionService, DetectorAnomalíasService
)

class BitácoraMovimientoViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = BitácoraMovimientoSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['tipo_evento', 'bodega_origen', 'bodega_destino', 'stock_item', 'empresa']
    ordering_fields = ['fecha_creacion', 'numero_documento']
    ordering = ['-fecha_creacion']
    
    def get_queryset(self):
        usuario = self.request.user
        empresas = usuario.empresausuario_set.values_list('empresa', flat=True)
        return BitácoraMovimiento.objects.filter(empresa__in=empresas)
    
    @action(detail=False, methods=['get'])
    def resumen_diario(self, request):
        hoy = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
        usuario = request.user
        empresas = usuario.empresausuario_set.values_list('empresa', flat=True)
        movimientos = BitácoraMovimiento.objects.filter(empresa__in=empresas, fecha_creacion__gte=hoy)
        return Response({
            'total_movimientos': movimientos.count(),
            'ingresos': movimientos.filter(tipo_evento='ingreso_compra').count(),
            'salidas': movimientos.filter(tipo_evento='salida_guia').count(),
            'devoluciones': movimientos.filter(tipo_evento='devolucion').count(),
        })

class BitácoraSerieMovimientoViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = BitácoraSerieMovimientoSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['serie_item', 'estado_nuevo', 'empresa']
    ordering = ['-fecha_creacion']
    
    def get_queryset(self):
        usuario = self.request.user
        empresas = usuario.empresausuario_set.values_list('empresa', flat=True)
        return BitácoraSerieMovimiento.objects.filter(empresa__in=empresas)

class TrazabilidadSerieViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]
    
    def retrieve(self, request, pk=None):
        try:
            serie = SerieItem.objects.get(pk=pk)
            usuario = request.user
            empresas = usuario.empresausuario_set.values_list('empresa', flat=True)
            if serie.empresa_id not in empresas:
                return Response({'error': 'No autorizado'}, status=status.HTTP_403_FORBIDDEN)
            return Response(TrazabilidadService.obtener_historial_serie(serie))
        except SerieItem.DoesNotExist:
            return Response({'error': 'No encontrada'}, status=status.HTTP_404_NOT_FOUND)

class ConciliacionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ReporteConciliacionSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['bodega', 'stock_item', 'es_consistente', 'empresa']
    ordering = ['-fecha_creacion']
    
    def get_queryset(self):
        usuario = self.request.user
        empresas = usuario.empresausuario_set.values_list('empresa', flat=True)
        return ReporteConciliación.objects.filter(empresa__in=empresas)

class AnomalíaMovimientoViewSet(viewsets.ModelViewSet):
    serializer_class = AnomalíaMovimientoSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['tipo_anomalia', 'resuelta', 'empresa']
    ordering = ['-fecha_creacion']
    
    def get_queryset(self):
        usuario = self.request.user
        empresas = usuario.empresausuario_set.values_list('empresa', flat=True)
        return AnomalíaMovimiento.objects.filter(empresa__in=empresas)
    
    @action(detail=False, methods=['post'])
    def detectar_anomalias(self, request):
        from empresas.models import Empresa
        empresa_id = request.data.get('empresa_id')
        try:
            empresa = Empresa.objects.get(pk=empresa_id)
            anomalias = DetectorAnomalíasService.detectar_anomalias(empresa)
            return Response({'total': len(anomalias), 'detalles': AnomalíaMovimientoSerializer(anomalias, many=True).data})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
