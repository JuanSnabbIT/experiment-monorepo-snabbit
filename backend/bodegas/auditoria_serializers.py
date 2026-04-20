"""
Serializadores para modelos de auditoría y trazabilidad.
"""

from rest_framework import serializers
from .models import (
    BitácoraMovimiento, BitácoraSerieMovimiento, ReporteTrazabilidadSerie,
    ReporteConciliación, AnomalíaMovimiento, SerieItem
)


class BitácoraMovimientoSerializer(serializers.ModelSerializer):
    """Serializador para BitácoraMovimiento."""
    
    tipo_evento_display = serializers.CharField(source='get_tipo_evento_display', read_only=True)
    bodega_origen_nombre = serializers.CharField(source='bodega_origen.nombre', read_only=True)
    bodega_destino_nombre = serializers.CharField(source='bodega_destino.nombre', read_only=True)
    item_nombre_display = serializers.CharField(source='item_nombre', read_only=True)
    
    class Meta:
        model = BitácoraMovimiento
        fields = [
            'id', 'tipo_evento', 'tipo_evento_display', 'numero_documento',
            'bodega_origen', 'bodega_origen_nombre', 'bodega_destino', 'bodega_destino_nombre',
            'item_nombre_display', 'cantidad', 'cantidad_anterior', 'cantidad_posterior',
            'usuario_nombre', 'descripcion', 'observaciones', 'cantidad_series',
            'movimiento_reversado', 'anulacion_razon', 'fecha_creacion'
        ]
        read_only_fields = fields


class BitácoraSerieMovimientoSerializer(serializers.ModelSerializer):
    """Serializador para BitácoraSerieMovimiento."""
    
    serie_numero = serializers.CharField(source='serie_item.serie', read_only=True)
    estado_anterior_display = serializers.CharField(source='get_estado_anterior_display', read_only=True)
    estado_nuevo_display = serializers.CharField(source='get_estado_nuevo_display', read_only=True)
    bodega_nombre = serializers.CharField(source='bodega.nombre', read_only=True)
    usuario_nombre = serializers.CharField(source='usuario.usuario.get_full_name', read_only=True)
    
    class Meta:
        model = BitácoraSerieMovimiento
        fields = [
            'id', 'serie_numero', 'estado_anterior', 'estado_anterior_display',
            'estado_nuevo', 'estado_nuevo_display', 'bodega', 'bodega_nombre',
            'usuario_nombre', 'documento_referencia', 'observaciones', 'fecha_creacion'
        ]
        read_only_fields = fields


class ReporteTrazabilidadSerieSerializer(serializers.ModelSerializer):
    """Serializador para ReporteTrazabilidad."""
    
    serie_numero = serializers.CharField(source='serie_item.serie', read_only=True)
    estado_actual_display = serializers.CharField(source='get_estado_actual_display', read_only=True)
    bodega_actual_nombre = serializers.CharField(source='bodega_actual.nombre', read_only=True)
    
    class Meta:
        model = ReporteTrazabilidadSerie
        fields = [
            'serie_numero', 'estado_actual', 'estado_actual_display', 'bodega_actual_nombre',
            'fecha_creacion_serie', 'cantidad_movimientos', 'cantidad_cambios_estado',
            'numero_orden_compra', 'numero_guia_salida', 'numero_voucher_devolucion',
            'cadena_custodia', 'anomalias'
        ]
        read_only_fields = fields


class ReporteConciliacionSerializer(serializers.ModelSerializer):
    """Serializador para ReporteConciliación."""
    
    bodega_nombre = serializers.CharField(source='bodega.nombre', read_only=True)
    item_nombre = serializers.CharField(source='stock_item.item.nombre', read_only=True)
    estado_display = serializers.SerializerMethodField()
    
    class Meta:
        model = ReporteConciliación
        fields = [
            'id', 'bodega_nombre', 'item_nombre',
            'cantidad_stock_registrado', 'cantidad_stock_calculado', 'diferencia',
            'cantidad_series_registradas', 'cantidad_series_disponibles',
            'cantidad_series_reservadas', 'cantidad_series_despachadas',
            'es_consistente', 'anomalias', 'fecha_inicio', 'fecha_cierre', 'fecha_creacion'
        ]
        read_only_fields = fields
    
    def get_estado_display(self, obj):
        return "✓ Consistente" if obj.es_consistente else "✗ Inconsistencia"


class AnomalíaMovimientoSerializer(serializers.ModelSerializer):
    """Serializador para AnomalíaMovimiento."""
    
    tipo_anomalia_display = serializers.CharField(source='get_tipo_anomalia_display', read_only=True)
    bodega_nombre = serializers.CharField(source='bodega.nombre', read_only=True)
    item_nombre = serializers.CharField(source='stock_item.item.nombre', read_only=True)
    serie_numero = serializers.CharField(source='serie_item.serie', read_only=True)
    estado_resolucion = serializers.SerializerMethodField()
    
    class Meta:
        model = AnomalíaMovimiento
        fields = [
            'id', 'tipo_anomalia', 'tipo_anomalia_display', 'bodega_nombre', 'item_nombre',
            'serie_numero', 'descripcion', 'datos_anomalia', 'resuelta', 'estado_resolucion',
            'fecha_resolucion', 'nota_resolucion', 'fecha_creacion'
        ]
        read_only_fields = [f for f in fields if f != 'resuelta']
    
    def get_estado_resolucion(self, obj):
        return "Resuelta" if obj.resuelta else "Pendiente"
