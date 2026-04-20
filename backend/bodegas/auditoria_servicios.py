"""Servicios de auditoría y trazabilidad"""
from django.db import transaction
from django.utils import timezone
from django.db.models import Sum
from .models import (
    BitácoraMovimiento, BitácoraSerieMovimiento, ReporteTrazabilidadSerie,
    ReporteConciliación, AnomalíaMovimiento, StockItemEnBodega
)

class AuditoríaMovimientoService:
    @staticmethod
    @transaction.atomic
    def registrar_movimiento(empresa, tipo_evento, stock_item, cantidad, bodega_origen=None,
                           bodega_destino=None, usuario=None, documento_origen=None,
                           numero_documento="", descripcion="", observaciones="",
                           cantidad_series=0, movimiento_reversado=None, anulacion_razon=""):
        cantidad_anterior = stock_item.cantidad_disponible
        return BitácoraMovimiento.objects.create(
            empresa=empresa, tipo_evento=tipo_evento, stock_item=stock_item,
            item_nombre=stock_item.item.nombre if stock_item.item else "",
            cantidad=cantidad, cantidad_series=cantidad_series,
            bodega_origen=bodega_origen, bodega_destino=bodega_destino,
            cantidad_anterior=cantidad_anterior, cantidad_posterior=cantidad_anterior + cantidad,
            usuario=usuario, usuario_nombre=usuario.usuario.get_full_name() if usuario else "",
            descripcion=descripcion, observaciones=observaciones, numero_documento=numero_documento,
            movimiento_reversado=movimiento_reversado, anulacion_razon=anulacion_razon
        )

    @staticmethod
    @transaction.atomic
    def registrar_cambio_serie(serie, estado_anterior, estado_nuevo, empresa, usuario=None,
                             documento_referencia="", bitacora_movimiento=None, observaciones=""):
        cambio = BitácoraSerieMovimiento.objects.create(
            serie_item=serie, estado_anterior=estado_anterior, estado_nuevo=estado_nuevo,
            bodega=serie.stock_item.bodega if serie.stock_item else None,
            usuario=usuario, documento_referencia=documento_referencia,
            bitacora_movimiento=bitacora_movimiento, observaciones=observaciones, empresa=empresa
        )
        serie.estado = estado_nuevo
        serie.save(update_fields=['estado'])
        return cambio

class TrazabilidadService:
    @staticmethod
    def obtener_historial_serie(serie):
        cambios = BitácoraSerieMovimiento.objects.filter(serie_item=serie).order_by('fecha_creacion')
        movimientos = BitácoraMovimiento.objects.filter(series_afectadas__serie_item=serie).order_by('fecha_creacion')
        return {
            'serie': serie.serie,
            'estado_actual': serie.get_estado_display(),
            'bodega_actual': str(serie.stock_item.bodega) if serie.stock_item else '-',
            'fecha_creacion': serie.fecha_creacion.isoformat(),
            'cantidad_movimientos': movimientos.count(),
            'cantidad_cambios_estado': cambios.count(),
            'cadena_custodia': [
                {'fecha': c.fecha_creacion.isoformat(), 'usuario': c.usuario.usuario.get_full_name() if c.usuario else 'Sistema',
                 'evento': c.get_estado_nuevo_display(), 'documento': c.documento_referencia,
                 'bodega': str(c.bodega) if c.bodega else '-'} for c in cambios
            ]
        }

class ConciliacionService:
    @staticmethod
    @transaction.atomic
    def generar_reporte_conciliacion(bodega, stock_item, empresa, fecha_inicio=None, fecha_cierre=None):
        if not fecha_cierre:
            fecha_cierre = timezone.now()
        if not fecha_inicio:
            fecha_inicio = stock_item.fecha_creacion
        
        cantidad_registrada = stock_item.cantidad_disponible
        movimientos = BitácoraMovimiento.objects.filter(
            stock_item=stock_item, fecha_creacion__range=[fecha_inicio, fecha_cierre]
        )
        cantidad_calculada = (movimientos.aggregate(total=Sum('cantidad'))['total'] or 0) + cantidad_registrada
        diferencia = cantidad_registrada - cantidad_calculada
        
        anomalias = []
        es_consistente = diferencia == 0
        
        if diferencia != 0:
            es_consistente = False
            anomalias.append({
                'tipo': 'sobrestock' if diferencia > 0 else 'substock',
                'descripcion': f'Stock {abs(diferencia)} unidades {"mayor" if diferencia > 0 else "menor"} que calculado',
                'cantidad': abs(diferencia)
            })
        
        return ReporteConciliación.objects.create(
            bodega=bodega, stock_item=stock_item, 
            cantidad_stock_registrado=cantidad_registrada, cantidad_stock_calculado=cantidad_calculada,
            diferencia=diferencia, es_consistente=es_consistente, anomalias=anomalias,
            fecha_inicio=fecha_inicio, fecha_cierre=fecha_cierre, empresa=empresa
        )

class DetectorAnomalíasService:
    @staticmethod
    @transaction.atomic
    def detectar_anomalias(empresa):
        anomalias = []
        stock_negativo = StockItemEnBodega.objects.filter(empresa=empresa, cantidad_disponible__lt=0)
        for stock in stock_negativo:
            anomalias.append(AnomalíaMovimiento.objects.create(
                empresa=empresa, tipo_anomalia='stock_negativo', bodega=stock.bodega, stock_item=stock,
                descripcion=f'Stock negativo: {stock.cantidad_disponible} unidades',
                datos_anomalia={'cantidad': stock.cantidad_disponible}
            ))
        return anomalias

    @staticmethod
    def obtener_anomalias_sin_resolver(empresa):
        return AnomalíaMovimiento.objects.filter(empresa=empresa, resuelta=False).order_by('-fecha_creacion')
