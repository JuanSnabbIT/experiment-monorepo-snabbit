"""
Servicios de auditoría y trazabilidad para movimientos y series.

Proporciona funciones para:
1. Registrar eventos en la bitácora
2. Consultar trazabilidad por serie
3. Generar reportes de conciliación
4. Detectar y registrar anomalías
"""

from django.db import transaction
from django.utils import timezone
from django.db.models import Sum, Q, Count
import logging

from .models import (
    MovimientoStock, SerieItem, BitácoraMovimiento, BitácoraSerieMovimiento,
    ReporteTrazabilidadSerie, ReporteConciliación, AnomalíaMovimiento,
    StockItemEnBodega
)
from empresas.models import Empresa, UsuarioEmpresa

logger = logging.getLogger(__name__)


class AuditoríaMovimientoService:
    """Servicio para registrar movimientos en la bitácora de auditoría."""

    @staticmethod
    @transaction.atomic
    def registrar_movimiento(
        empresa: Empresa,
        tipo_evento: str,
        stock_item: StockItemEnBodega,
        cantidad: int,
        bodega_origen=None,
        bodega_destino=None,
        usuario: UsuarioEmpresa = None,
        documento_origen=None,
        numero_documento: str = "",
        descripcion: str = "",
        observaciones: str = "",
        cantidad_series: int = 0,
        movimiento_reversado: BitácoraMovimiento = None,
        anulacion_razon: str = ""
    ) -> BitácoraMovimiento:
        """
        Registra un movimiento de stock en la bitácora.

        Args:
            empresa: Empresa propietaria
            tipo_evento: Tipo de evento (ingreso_compra, salida_guia, etc)
            stock_item: Item de stock afectado
            cantidad: Cantidad movida (puede ser negativa)
            bodega_origen: Bodega de origen (si aplica)
            bodega_destino: Bodega de destino (si aplica)
            usuario: Usuario que realiza el movimiento
            documento_origen: Objeto que originó el movimiento (OC, Guía, etc)
            numero_documento: Número visible del documento
            descripcion: Descripción del evento
            observaciones: Notas adicionales
            cantidad_series: Cantidad de series afectadas
            movimiento_reversado: Si es reverso, el movimiento original
            anulacion_razon: Razón de anulación

        Returns:
            BitácoraMovimiento: Registro creado
        """

        # Capturar estado anterior (cantidad disponible = cantidad - cantidad_no_disponible)
        cantidad_anterior = stock_item.cantidad - stock_item.cantidad_no_disponible

        nombre_usuario = usuario.usuario.get_full_name() if usuario else ""

        # Crear registro de bitácora
        bitacora = BitácoraMovimiento.objects.create(
            empresa=empresa,
            tipo_evento=tipo_evento,
            stock_item=stock_item,
            item_nombre=stock_item.item.nombre if stock_item.item else "",
            cantidad=cantidad,
            cantidad_series=cantidad_series,
            bodega_origen=bodega_origen,
            bodega_destino=bodega_destino,
            cantidad_anterior=cantidad_anterior,
            usuario=usuario,
            usuario_nombre=nombre_usuario,
            descripcion=descripcion,
            observaciones=observaciones,
            numero_documento=numero_documento,
            movimiento_reversado=movimiento_reversado,
            anulacion_razon=anulacion_razon
        )

        # Asignar documento origen si existe
        if documento_origen:
            from django.contrib.contenttypes.models import ContentType
            content_type = ContentType.objects.get_for_model(documento_origen)
            bitacora.documento_origen_content_type = content_type
            bitacora.documento_origen_id = documento_origen.id
            bitacora.save(update_fields=['documento_origen_content_type', 'documento_origen_id'])

        # Registrar cantidad posterior
        bitacora.cantidad_posterior = cantidad_anterior + cantidad
        bitacora.save(update_fields=['cantidad_posterior'])

        logger.info(
            f"Movimiento registrado: {tipo_evento} de {stock_item} x{cantidad} "
            f"por {nombre_usuario} en {numero_documento}"
        )

        return bitacora

    @staticmethod
    @transaction.atomic
    def registrar_cambio_serie(
        serie: SerieItem,
        estado_anterior: str,
        estado_nuevo: str,
        empresa: Empresa,
        usuario: UsuarioEmpresa = None,
        documento_referencia: str = "",
        bitacora_movimiento: BitácoraMovimiento = None,
        observaciones: str = ""
    ) -> BitácoraSerieMovimiento:
        """
        Registra un cambio de estado para una serie.

        Args:
            serie: Serie afectada
            estado_anterior: Estado previo
            estado_nuevo: Estado nuevo
            empresa: Empresa propietaria
            usuario: Usuario que realizó el cambio
            documento_referencia: Número de documento que originó el cambio
            bitacora_movimiento: Movimiento asociado (si aplica)
            observaciones: Notas adicionales

        Returns:
            BitácoraSerieMovimiento: Registro creado
        """

        cambio = BitácoraSerieMovimiento.objects.create(
            serie_item=serie,
            estado_anterior=estado_anterior,
            estado_nuevo=estado_nuevo,
            bodega=serie.stock_item.bodega if serie.stock_item else None,
            usuario=usuario,
            documento_referencia=documento_referencia,
            bitacora_movimiento=bitacora_movimiento,
            observaciones=observaciones,
            empresa=empresa
        )

        # Actualizar el estado actual de la serie
        serie.estado = estado_nuevo
        serie.save(update_fields=['estado'])

        logger.info(
            f"Estado de serie actualizado: {serie.serie} "
            f"{estado_anterior} → {estado_nuevo}"
        )

        return cambio


class TrazabilidadService:
    """Servicio para consultas de trazabilidad completa."""

    @staticmethod
    def obtener_historial_serie(serie: SerieItem) -> dict:
        """
        Obtiene el historial completo de una serie.

        Args:
            serie: Serie a consultar

        Returns:
            dict con historial, ubicación actual, documentos relacionados, etc.
        """

        # Cambios de estado
        cambios = BitácoraSerieMovimiento.objects.filter(
            serie_item=serie
        ).order_by('fecha_creacion')

        # Movimientos relacionados
        movimientos = BitácoraMovimiento.objects.filter(
            series_afectadas__serie_item=serie
        ).order_by('fecha_creacion')

        # Cadena de custodia
        cadena_custodia = []
        for cambio in cambios:
            cadena_custodia.append({
                'fecha': cambio.fecha_creacion.isoformat(),
                'usuario': cambio.usuario.usuario.get_full_name() if cambio.usuario else 'Sistema',
                'evento': cambio.get_estado_nuevo_display(),
                'documento': cambio.documento_referencia,
                'bodega': str(cambio.bodega) if cambio.bodega else '-',
            })

        return {
            'serie': serie.serie,
            'estado_actual': serie.get_estado_display(),
            'bodega_actual': str(serie.stock_item.bodega) if serie.stock_item else '-',
            'fecha_creacion': serie.fecha_creacion.isoformat(),
            'fecha_ultima_actualizacion': (cambios.last().fecha_creacion.isoformat() if cambios.exists() else '-'),
            'cantidad_movimientos': movimientos.count(),
            'cantidad_cambios_estado': cambios.count(),
            'cadena_custodia': cadena_custodia,
            'movimientos': [
                {
                    'fecha': m.fecha_creacion.isoformat(),
                    'tipo': m.get_tipo_evento_display(),
                    'cantidad': m.cantidad,
                    'documento': m.numero_documento,
                    'usuario': m.usuario_nombre,
                }
                for m in movimientos
            ]
        }

    @staticmethod
    def obtener_series_por_bodega(bodega) -> list:
        """
        Obtiene todas las series activas de una bodega con su estado.

        Args:
            bodega: Bodega a consultar

        Returns:
            Lista de series con su estado actual y ubicación
        """

        series = SerieItem.objects.filter(
            stock_item__bodega=bodega
        ).exclude(
            estado='devuelta'
        ).select_related('stock_item__item', 'stock_item__bodega')

        return [
            {
                'serie': s.serie,
                'item': s.stock_item.item.nombre if s.stock_item else '-',
                'estado': s.get_estado_display(),
                'bodega': str(s.stock_item.bodega),
                'fecha_creacion': s.fecha_creacion.isoformat(),
            }
            for s in series
        ]

    @staticmethod
    def obtener_series_por_documento(documento) -> list:
        """
        Obtiene todas las series asociadas a un documento (OC, Guía, etc).

        Args:
            documento: Documento (ItemOrdenCompraEnStock, ItemsGuiaSalida, etc)

        Returns:
            Lista de series con su trazabilidad
        """

        from django.contrib.contenttypes.models import ContentType
        content_type = ContentType.objects.get_for_model(documento.__class__)

        # Buscar en BitácoraMovimiento
        bitacoras = BitácoraMovimiento.objects.filter(
            documento_origen_content_type=content_type,
            documento_origen_id=documento.id
        )

        series_ids = bitacoras.values_list('series_afectadas__serie_item_id', flat=True)
        series = SerieItem.objects.filter(id__in=series_ids)

        return [TrazabilidadService.obtener_historial_serie(s) for s in series]


class ConciliacionService:
    """Servicio para generar reportes de conciliación."""

    @staticmethod
    @transaction.atomic
    def generar_reporte_conciliacion(
        bodega,
        stock_item: StockItemEnBodega,
        empresa: Empresa,
        fecha_inicio=None,
        fecha_cierre=None
    ) -> ReporteConciliación:
        """
        Genera un reporte de conciliación para un item en una bodega.

        Compara:
        1. Stock registrado (StockItemEnBodega.cantidad - cantidad_no_disponible)
        2. Stock calculado (suma de movimientos en BitácoraMovimiento)
        3. Series activas

        Args:
            bodega: Bodega a conciliar
            stock_item: Item a conciliar
            empresa: Empresa propietaria
            fecha_inicio: Inicio del período
            fecha_cierre: Fin del período

        Returns:
            ReporteConciliación: Reporte generado
        """

        if not fecha_cierre:
            fecha_cierre = timezone.now()
        if not fecha_inicio:
            fecha_inicio = stock_item.fecha_creacion

        # 1. Stock disponible registrado
        cantidad_registrada = stock_item.cantidad - stock_item.cantidad_no_disponible

        # 2. Stock calculado (suma de movimientos de bitácora en el período)
        movimientos = BitácoraMovimiento.objects.filter(
            stock_item=stock_item,
            fecha_creacion__range=[fecha_inicio, fecha_cierre]
        )
        cantidad_calculada = movimientos.aggregate(total=Sum('cantidad'))['total'] or 0

        # 3. Series activas
        series = SerieItem.objects.filter(
            stock_item=stock_item,
            empresa=empresa
        )

        cantidad_disponibles = series.filter(estado='disponible').count()
        cantidad_reservadas = series.filter(estado='reservada').count()
        cantidad_despachadas = series.filter(estado='despachada').count()
        cantidad_series_activas = cantidad_disponibles + cantidad_reservadas + cantidad_despachadas

        # Calcular diferencia: si hay bitácora, comparar; si no, la diferencia es el stock actual
        # (ya que no hay histórico de movimientos anteriores al sistema de bitácora)
        diferencia = cantidad_registrada - cantidad_calculada

        # Detectar anomalías
        anomalias = []
        es_consistente = True

        if cantidad_calculada > 0 and diferencia != 0:
            es_consistente = False
            if diferencia > 0:
                anomalias.append({
                    'tipo': 'sobrestock',
                    'descripcion': f'Stock registrado {diferencia} unidades mayor que calculado por bitácora',
                    'cantidad': diferencia
                })
            else:
                anomalias.append({
                    'tipo': 'substock',
                    'descripcion': f'Stock registrado {abs(diferencia)} unidades menor que calculado por bitácora',
                    'cantidad': abs(diferencia)
                })

        # Validar consistencia de series (solo si el item tiene series)
        if cantidad_series_activas > cantidad_registrada:
            es_consistente = False
            anomalias.append({
                'tipo': 'inconsistencia_series',
                'descripcion': f'Más series activas ({cantidad_series_activas}) que stock disponible ({cantidad_registrada})',
            })

        # Crear reporte
        reporte = ReporteConciliación.objects.create(
            bodega=bodega,
            stock_item=stock_item,
            cantidad_stock_registrado=cantidad_registrada,
            cantidad_stock_calculado=cantidad_calculada,
            diferencia=diferencia,
            cantidad_series_registradas=cantidad_series_activas,
            cantidad_series_disponibles=cantidad_disponibles,
            cantidad_series_reservadas=cantidad_reservadas,
            cantidad_series_despachadas=cantidad_despachadas,
            es_consistente=es_consistente,
            anomalias=anomalias,
            fecha_inicio=fecha_inicio,
            fecha_cierre=fecha_cierre,
            empresa=empresa
        )

        logger.info(
            f"Reporte de conciliación generado para {stock_item} en {bodega}: "
            f"Diferencia={diferencia}, Consistente={es_consistente}"
        )

        return reporte

    @staticmethod
    def generar_reporte_conciliacion_bodega(bodega, empresa: Empresa):
        """
        Genera reporte de conciliación para todos los items en una bodega.

        Args:
            bodega: Bodega a conciliar
            empresa: Empresa propietaria

        Returns:
            Lista de ReporteConciliación
        """

        reportes = []
        stock_items = StockItemEnBodega.objects.filter(bodega=bodega)

        for stock_item in stock_items:
            reporte = ConciliacionService.generar_reporte_conciliacion(
                bodega, stock_item, empresa
            )
            reportes.append(reporte)

        return reportes


class DetectorAnomalíasService:
    """Servicio para detectar y registrar anomalías en datos históricos."""

    @staticmethod
    @transaction.atomic
    def detectar_anomalias(empresa: Empresa):
        """
        Ejecuta detección automática de anomalías en el sistema.

        Detecta:
        - Stock negativo
        - Movimientos huérfanos
        - Salida sin entrada previa
        - Devolución sin salida previa
        - Inconsistencias de series
        - Diferencias stock vs bitácora

        Args:
            empresa: Empresa a analizar

        Returns:
            Lista de AnomalíaMovimiento creadas
        """

        anomalias_detectadas = []

        # 1. Stock negativo
        stock_negativo = StockItemEnBodega.objects.filter(
            bodega__sucursal__empresa=empresa,
            cantidad__lt=0
        )
        for stock in stock_negativo:
            anomalia = AnomalíaMovimiento.objects.create(
                empresa=empresa,
                tipo_anomalia='stock_negativo',
                bodega=stock.bodega,
                stock_item=stock,
                descripcion=f'Stock negativo: {stock.cantidad} unidades',
                datos_anomalia={'cantidad': stock.cantidad}
            )
            anomalias_detectadas.append(anomalia)
            logger.warning(f"Anomalía detectada: Stock negativo en {stock}")

        # 2. Movimientos huérfanos en BitácoraMovimiento
        movimientos_huerfanos = BitácoraMovimiento.objects.filter(
            empresa=empresa,
            documento_origen_content_type__isnull=True,
            numero_documento=''
        )
        for mov in movimientos_huerfanos:
            anomalia = AnomalíaMovimiento.objects.create(
                empresa=empresa,
                tipo_anomalia='movimiento_huerfano',
                stock_item=mov.stock_item,
                bitacora_movimiento=mov,
                descripcion=f'Movimiento sin documento origen: {mov.tipo_evento} x{mov.cantidad}',
                datos_anomalia={'tipo_evento': mov.tipo_evento, 'cantidad': mov.cantidad}
            )
            anomalias_detectadas.append(anomalia)
            logger.warning(f"Anomalía detectada: Movimiento huérfano {mov.id}")

        # 3. Salida sin entrada previa
        salidas = BitácoraMovimiento.objects.filter(
            empresa=empresa,
            tipo_evento='salida_guia'
        )
        for salida in salidas:
            entradas = BitácoraMovimiento.objects.filter(
                stock_item=salida.stock_item,
                fecha_creacion__lt=salida.fecha_creacion,
                tipo_evento__in=['ingreso_compra', 'transferencia_bodega']
            )
            if not entradas.exists():
                anomalia = AnomalíaMovimiento.objects.create(
                    empresa=empresa,
                    tipo_anomalia='salida_sin_entrada',
                    stock_item=salida.stock_item,
                    bitacora_movimiento=salida,
                    descripcion=f'Salida sin entrada previa: {salida.numero_documento}',
                    datos_anomalia={'documento': salida.numero_documento}
                )
                anomalias_detectadas.append(anomalia)

        # 4. Devolución sin salida previa
        devoluciones = BitácoraMovimiento.objects.filter(
            empresa=empresa,
            tipo_evento='devolucion'
        )
        for devolucion in devoluciones:
            salidas_previas = BitácoraMovimiento.objects.filter(
                stock_item=devolucion.stock_item,
                fecha_creacion__lt=devolucion.fecha_creacion,
                tipo_evento='salida_guia'
            )
            if not salidas_previas.exists():
                anomalia = AnomalíaMovimiento.objects.create(
                    empresa=empresa,
                    tipo_anomalia='devolucion_sin_salida',
                    stock_item=devolucion.stock_item,
                    bitacora_movimiento=devolucion,
                    descripcion=f'Devolución sin salida previa: {devolucion.numero_documento}',
                    datos_anomalia={'documento': devolucion.numero_documento}
                )
                anomalias_detectadas.append(anomalia)

        logger.info(
            f"Detección de anomalías completada: {len(anomalias_detectadas)} anomalías encontradas"
        )

        return anomalias_detectadas

    @staticmethod
    def obtener_anomalias_sin_resolver(empresa: Empresa):
        """
        Obtiene todas las anomalías sin resolver de una empresa.

        Args:
            empresa: Empresa a consultar

        Returns:
            QuerySet de AnomalíaMovimiento sin resolver
        """

        return AnomalíaMovimiento.objects.filter(
            empresa=empresa,
            resuelta=False
        ).order_by('-fecha_creacion')
