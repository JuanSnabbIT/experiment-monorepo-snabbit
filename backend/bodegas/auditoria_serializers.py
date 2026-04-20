"""Serializadores para auditoría y trazabilidad"""
from rest_framework import serializers
from .models import (
    BitácoraMovimiento, BitácoraSerieMovimiento, ReporteTrazabilidadSerie,
    ReporteConciliación, AnomalíaMovimiento
)

class BitácoraMovimientoSerializer(serializers.ModelSerializer):
    tipo_evento_display = serializers.CharField(source='get_tipo_evento_display', read_only=True)
    bodega_origen_nombre = serializers.CharField(source='bodega_origen.nombre', read_only=True)
    bodega_destino_nombre = serializers.CharField(source='bodega_destino.nombre', read_only=True)
    
    class Meta:
        model = BitácoraMovimiento
        fields = ['id', 'tipo_evento', 'tipo_evento_display', 'numero_documento',
                 'bodega_origen', 'bodega_origen_nombre', 'bodega_destino', 'bodega_destino_nombre',
                 'item_nombre', 'cantidad', 'cantidad_anterior', 'cantidad_posterior',
                 'usuario_nombre', 'descripcion', 'observaciones', 'fecha_creacion']

class BitácoraSerieMovimientoSerializer(serializers.ModelSerializer):
    serie_numero = serializers.CharField(source='serie_item.serie', read_only=True)
    estado_nuevo_display = serializers.CharField(source='get_estado_nuevo_display', read_only=True)
    
    class Meta:
        model = BitácoraSerieMovimiento
        fields = ['id', 'serie_numero', 'estado_anterior', 'estado_nuevo', 'estado_nuevo_display',
                 'bodega', 'usuario', 'documento_referencia', 'observaciones', 'fecha_creacion']

class ReporteConciliacionSerializer(serializers.ModelSerializer):
    bodega_nombre = serializers.CharField(source='bodega.nombre', read_only=True)
    item_nombre = serializers.CharField(source='stock_item.item.nombre', read_only=True)
    
    class Meta:
        model = ReporteConciliación
        fields = ['id', 'bodega_nombre', 'item_nombre', 'cantidad_stock_registrado',
                 'cantidad_stock_calculado', 'diferencia', 'es_consistente', 'anomalias',
                 'fecha_inicio', 'fecha_cierre', 'fecha_creacion']

class AnomalíaMovimientoSerializer(serializers.ModelSerializer):
    tipo_anomalia_display = serializers.CharField(source='get_tipo_anomalia_display', read_only=True)
    
    class Meta:
        model = AnomalíaMovimiento
        fields = ['id', 'tipo_anomalia', 'tipo_anomalia_display', 'descripcion',
                 'datos_anomalia', 'resuelta', 'fecha_resolucion', 'nota_resolucion', 'fecha_creacion']
