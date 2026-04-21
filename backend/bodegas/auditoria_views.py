"""
Vistas API para auditoría y trazabilidad.

Endpoints:
- GET /api/bitacora/ - Listar movimientos
- GET /api/bitacora/{id}/ - Detalle
- GET /api/series/{serie_id}/trazabilidad/ - Historial completo de una serie
- GET /api/conciliacion/ - Reportes de conciliación
- GET /api/anomalias/ - Anomalías detectadas
- POST /api/anomalias/{id}/resolver/ - Marcar anomalía como resuelta
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db.models import Q
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter

from .models import (
    BitácoraMovimiento, BitácoraSerieMovimiento, ReporteTrazabilidadSerie,
    ReporteConciliación, AnomalíaMovimiento, SerieItem
)
from .auditoria_serializers import (
    BitácoraMovimientoSerializer, BitácoraSerieMovimientoSerializer,
    ReporteTrazabilidadSerieSerializer, ReporteConciliacionSerializer,
    AnomalíaMovimientoSerializer
)
from .auditoria_servicios import (
    TrazabilidadService, ConciliacionService, DetectorAnomalíasService
)
from empresas.models import Empresa


class BitácoraMovimientoViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet para consultar la bitácora de movimientos.
    
    Permite filtrar por:
    - tipo_evento
    - bodega_origen
    - bodega_destino
    - stock_item
    - usuario
    - numero_documento
    - fecha_creacion
    """
    
    serializer_class = BitácoraMovimientoSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = [
        'tipo_evento', 'bodega_origen', 'bodega_destino',
        'stock_item', 'usuario', 'numero_documento', 'empresa'
    ]
    ordering_fields = ['fecha_creacion', 'numero_documento', 'cantidad']
    ordering = ['-fecha_creacion']
    
    def get_queryset(self):
        """Filtrar por empresa del usuario."""
        usuario = self.request.user
        empresas = usuario.empresausuario_set.values_list('empresa', flat=True)
        return BitácoraMovimiento.objects.filter(empresa__in=empresas)
    
    @action(detail=False, methods=['get'])
    def resumen_diario(self, request):
        """
        Resumen de movimientos del día actual.
        
        GET /api/bitacora/resumen_diario/
        """
        hoy = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
        
        usuario = request.user
        empresas = usuario.empresausuario_set.values_list('empresa', flat=True)
        
        movimientos = BitácoraMovimiento.objects.filter(
            empresa__in=empresas,
            fecha_creacion__gte=hoy
        )
        
        resumen = {
            'total_movimientos': movimientos.count(),
            'ingresos': movimientos.filter(tipo_evento='ingreso_compra').count(),
            'salidas': movimientos.filter(tipo_evento='salida_guia').count(),
            'devoluciones': movimientos.filter(tipo_evento='devolucion').count(),
            'ajustes': movimientos.filter(tipo_evento='ajuste_inventario').count(),
        }
        
        return Response(resumen)


class BitácoraSerieMovimientoViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet para consultar cambios de estado de series."""
    
    serializer_class = BitácoraSerieMovimientoSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['serie_item', 'estado_anterior', 'estado_nuevo', 'empresa']
    ordering_fields = ['fecha_creacion']
    ordering = ['-fecha_creacion']
    
    def get_queryset(self):
        """Filtrar por empresa del usuario."""
        usuario = self.request.user
        empresas = usuario.empresausuario_set.values_list('empresa', flat=True)
        return BitácoraSerieMovimiento.objects.filter(empresa__in=empresas)


class TrazabilidadSerieViewSet(viewsets.ViewSet):
    """
    ViewSet para consultar trazabilidad completa de series.
    
    Endpoints:
    - GET /api/trazabilidad-series/{serie_id}/ - Historial completo
    """
    
    permission_classes = [IsAuthenticated]
    
    def retrieve(self, request, pk=None):
        """Obtiene el historial completo de una serie."""
        try:
            serie = SerieItem.objects.get(pk=pk)
            
            # Verificar permiso: usuario debe pertenecer a la empresa de la serie
            usuario = request.user
            empresas = usuario.empresausuario_set.values_list('empresa', flat=True)
            
            if serie.empresa_id not in empresas:
                return Response(
                    {'error': 'No tiene permiso para ver esta serie'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            historial = TrazabilidadService.obtener_historial_serie(serie)
            return Response(historial)
        
        except SerieItem.DoesNotExist:
            return Response(
                {'error': 'Serie no encontrada'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['get'])
    def por_bodega(self, request):
        """
        Obtiene todas las series activas de una bodega.
        
        GET /api/trazabilidad-series/por_bodega/?bodega_id=1
        """
        bodega_id = request.query_params.get('bodega_id')
        
        if not bodega_id:
            return Response(
                {'error': 'Se requiere bodega_id'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            from .models import Bodega
            bodega = Bodega.objects.get(pk=bodega_id)
            series = TrazabilidadService.obtener_series_por_bodega(bodega)
            return Response(series)
        except:
            return Response(
                {'error': 'Bodega no encontrada'},
                status=status.HTTP_404_NOT_FOUND
            )


class ConciliacionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet para consultar reportes de conciliación.
    
    Permite filtrar por:
    - bodega
    - stock_item
    - es_consistente
    - empresa
    """
    
    serializer_class = ReporteConciliacionSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['bodega', 'stock_item', 'es_consistente', 'empresa']
    ordering_fields = ['fecha_creacion', 'diferencia']
    ordering = ['-fecha_creacion']
    
    def get_queryset(self):
        """Filtrar por empresa del usuario."""
        usuario = request.user
        empresas = usuario.empresausuario_set.values_list('empresa', flat=True)
        return ReporteConciliación.objects.filter(empresa__in=empresas)
    
    @action(detail=False, methods=['post'])
    def generar_bodega(self, request):
        """
        Genera reportes de conciliación para todos los items de una bodega.
        
        POST /api/conciliacion/generar_bodega/
        {
            "bodega_id": 1,
            "empresa_id": 1
        }
        """
        bodega_id = request.data.get('bodega_id')
        empresa_id = request.data.get('empresa_id')
        
        if not bodega_id or not empresa_id:
            return Response(
                {'error': 'Se requiere bodega_id y empresa_id'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            from .models import Bodega
            bodega = Bodega.objects.get(pk=bodega_id)
            empresa = Empresa.objects.get(pk=empresa_id)
            
            # Verificar permiso
            usuario = request.user
            if not usuario.empresausuario_set.filter(empresa=empresa).exists():
                return Response(
                    {'error': 'No tiene permiso en esta empresa'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            reportes = ConciliacionService.generar_reporte_conciliacion_bodega(bodega, empresa)
            
            return Response({
                'total_reportes': len(reportes),
                'inconsistencias': sum(1 for r in reportes if not r.es_consistente),
                'detalles': ReporteConciliacionSerializer(reportes, many=True).data
            })
        
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class AnomalíaMovimientoViewSet(viewsets.ModelViewSet):
    """
    ViewSet para consultar y resolver anomalías.
    
    Permite:
    - Listar anomalías
    - Filtrar por tipo, resuelta, etc.
    - Marcar como resuelta con nota
    """
    
    serializer_class = AnomalíaMovimientoSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['tipo_anomalia', 'resuelta', 'bodega', 'stock_item', 'empresa']
    ordering_fields = ['fecha_creacion', 'tipo_anomalia']
    ordering = ['-fecha_creacion']
    
    def get_queryset(self):
        """Filtrar por empresa del usuario."""
        usuario = self.request.user
        empresas = usuario.empresausuario_set.values_list('empresa', flat=True)
        return AnomalíaMovimiento.objects.filter(empresa__in=empresas)
    
    @action(detail=True, methods=['post'])
    def resolver(self, request, pk=None):
        """
        Marca una anomalía como resuelta.
        
        POST /api/anomalias/{id}/resolver/
        {
            "nota_resolucion": "Se ajustó manualmente el stock"
        }
        """
        try:
            anomalia = self.get_object()
            anomalia.resuelta = True
            anomalia.fecha_resolucion = timezone.now()
            anomalia.resuelto_por = request.user.usuarioempresa
            anomalia.nota_resolucion = request.data.get('nota_resolucion', '')
            anomalia.save()
            
            return Response({
                'success': True,
                'message': 'Anomalía marcada como resuelta',
                'anomalia': self.get_serializer(anomalia).data
            })
        
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['post'])
    def detectar_anomalias(self, request):
        """
        Ejecuta detección automática de anomalías.
        
        POST /api/anomalias/detectar_anomalias/
        {
            "empresa_id": 1
        }
        """
        empresa_id = request.data.get('empresa_id')
        
        if not empresa_id:
            return Response(
                {'error': 'Se requiere empresa_id'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            empresa = Empresa.objects.get(pk=empresa_id)
            
            # Verificar permiso
            usuario = request.user
            if not usuario.empresausuario_set.filter(empresa=empresa).exists():
                return Response(
                    {'error': 'No tiene permiso en esta empresa'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            anomalias = DetectorAnomalíasService.detectar_anomalias(empresa)
            
            return Response({
                'total_anomalias_detectadas': len(anomalias),
                'detalles': AnomalíaMovimientoSerializer(anomalias, many=True).data
            })
        
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['get'])
    def sin_resolver(self, request):
        """
        Obtiene todas las anomalías sin resolver.
        
        GET /api/anomalias/sin_resolver/
        """
        usuario = request.user
        empresas = usuario.empresausuario_set.values_list('empresa', flat=True)
        
        anomalias = AnomalíaMovimiento.objects.filter(
            empresa__in=empresas,
            resuelta=False
        ).order_by('-fecha_creacion')
        
        return Response(
            AnomalíaMovimientoSerializer(anomalias, many=True).data
        )
