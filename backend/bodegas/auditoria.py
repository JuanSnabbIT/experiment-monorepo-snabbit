"""
Módulo de auditoría y trazabilidad para movimientos y series.

Proporciona:
1. Registros de auditoría completos para cada evento
2. Trazabilidad por serie (historial completo)
3. Reportes de conciliación (stock vs movimientos vs series activas)
4. Detección de anomalías e inconsistencias
"""

from django.db import models
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from core.models import ModeloBase
from django.db.models import Q


class BitácoraMovimiento(ModeloBase):
    """
    Registro completo y auditable de cada evento en el sistema de bodegas.
    
    Cada evento relevante crea un registro inmutable que permite reconstruir
    el estado del inventario en cualquier momento.
    
    Eventos capturados:
    - Ingreso de stock (compra)
    - Egreso por guía de salida
    - Devoluciones
    - Ajustes de inventario
    - Anulaciones
    - Reversos
    """
    
    TIPO_EVENTO_CHOICES = (
        ('ingreso_compra', 'Ingreso por Compra'),
        ('salida_guia', 'Salida por Guía'),
        ('devolucion', 'Devolución de Cliente'),
        ('ajuste_inventario', 'Ajuste de Inventario'),
        ('anulacion', 'Anulación'),
        ('reverso', 'Reverso de Movimiento'),
        ('ajuste_serie', 'Ajuste de Serie'),
        ('transferencia_bodega', 'Transferencia Entre Bodegas'),
    )
    
    # Identificación del evento
    tipo_evento = models.CharField(
        max_length=30,
        choices=TIPO_EVENTO_CHOICES,
        db_index=True,
        help_text="Clasificación del tipo de evento"
    )
    
    # Documentación del origen
    documento_origen_content_type = models.ForeignKey(
        ContentType,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='bitacora_documentos_origen',
        limit_choices_to=Q(
            Q(app_label='bodegas', model='itemordencompraenstock') |
            Q(app_label='bodegas', model='itemsguiasalida') |
            Q(app_label='bodegas', model='itementomainventario') |
            Q(app_label='bodegas', model='voucherdevolucion')
        ),
        help_text="Tipo de documento origen (OC, Guía, etc)"
    )
    documento_origen_id = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="ID del documento origen"
    )
    documento_origen = GenericForeignKey(
        'documento_origen_content_type',
        'documento_origen_id'
    )
    numero_documento = models.CharField(
        max_length=100,
        blank=True,
        db_index=True,
        help_text="Número visible del documento (ej: OC-001, VDEV-2025-0001)"
    )
    
    # Contexto de bodegas
    bodega_origen = models.ForeignKey(
        'bodegas.Bodega',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='bitacora_salidas',
        help_text="Bodega origen del movimiento"
    )
    bodega_destino = models.ForeignKey(
        'bodegas.Bodega',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='bitacora_entradas',
        help_text="Bodega destino del movimiento"
    )
    
    # Item y stock
    stock_item = models.ForeignKey(
        'bodegas.StockItemEnBodega',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='bitacora_movimientos',
        help_text="Item de stock afectado"
    )
    item_nombre = models.CharField(
        max_length=250,
        blank=True,
        help_text="Nombre del item (snapshot para trazabilidad)"
    )
    
    # Estados y cantidades
    cantidad = models.IntegerField(
        help_text="Cantidad del movimiento (puede ser negativo para egresos)"
    )
    cantidad_series = models.IntegerField(
        default=0,
        help_text="Cantidad de series afectadas"
    )
    
    # Estados previos y posteriores
    cantidad_anterior = models.IntegerField(
        null=True,
        blank=True,
        help_text="Stock disponible antes del movimiento"
    )
    cantidad_posterior = models.IntegerField(
        null=True,
        blank=True,
        help_text="Stock disponible después del movimiento"
    )
    
    # Registro de usuario
    usuario = models.ForeignKey(
        'empresas.UsuarioEmpresa',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='bitacora_eventos',
        help_text="Usuario que realizó la acción"
    )
    usuario_nombre = models.CharField(
        max_length=250,
        blank=True,
        help_text="Nombre del usuario (snapshot)"
    )
    
    # Detalles y observaciones
    descripcion = models.TextField(
        blank=True,
        help_text="Descripción detallada del evento"
    )
    observaciones = models.TextField(
        blank=True,
        help_text="Notas adicionales sobre el movimiento"
    )
    
    # Trazabilidad de reversiones
    movimiento_reversado = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reversos',
        help_text="Si es un reverso, referencia al movimiento original"
    )
    anulacion_razon = models.CharField(
        max_length=250,
        blank=True,
        help_text="Razón de anulación si aplica"
    )
    
    # Campos de auditoría
    empresa = models.ForeignKey(
        'empresas.Empresa',
        on_delete=models.CASCADE,
        related_name='bitacora_movimientos',
        help_text="Empresa propietaria"
    )
    
    class Meta:
        verbose_name = "Bitácora de Movimiento"
        verbose_name_plural = "Bitácoras de Movimientos"
        ordering = ['-fecha_creacion']
        db_index = ['empresa', 'tipo_evento', 'bodega_origen', 'bodega_destino']
        indexes = [
            models.Index(fields=['empresa', 'fecha_creacion']),
            models.Index(fields=['tipo_evento', 'fecha_creacion']),
            models.Index(fields=['stock_item', 'fecha_creacion']),
            models.Index(fields=['numero_documento']),
        ]
    
    def __str__(self):
        return (
            f"[{self.tipo_evento}] {self.item_nombre} x{self.cantidad} "
            f"({self.numero_documento}) - {self.usuario_nombre} - {self.fecha_creacion.strftime('%Y-%m-%d %H:%M')}"
        )
    
    @property
    def cambio_neto(self):
        """Cambio neto de cantidad en el stock."""
        if self.cantidad_anterior is not None and self.cantidad_posterior is not None:
            return self.cantidad_posterior - self.cantidad_anterior
        return self.cantidad
    
    @property
    def es_reverso(self):
        """Indica si este movimiento es un reverso de otro."""
        return self.movimiento_reversado_id is not None


class BitácoraSerieMovimiento(ModeloBase):
    """
    Historial de cambios de estado para cada serie.
    
    Permite reconstruir el viaje completo de una serie desde su creación
    hasta su estado actual (disponible → reservada → despachada → devuelta).
    
    Vinculada directamente con BitácoraMovimiento para trazabilidad cruzada.
    """
    
    ESTADO_CHOICES = (
        ('disponible', 'Disponible'),
        ('reservada', 'Reservada en Guía'),
        ('despachada', 'Despachada'),
        ('devuelta', 'Devuelta'),
    )
    
    serie_item = models.ForeignKey(
        'bodegas.SerieItem',
        on_delete=models.CASCADE,
        related_name='bitacora_estados',
        help_text="Serie afectada"
    )
    
    # Estados
    estado_anterior = models.CharField(
        max_length=20,
        choices=ESTADO_CHOICES,
        help_text="Estado previo"
    )
    estado_nuevo = models.CharField(
        max_length=20,
        choices=ESTADO_CHOICES,
        help_text="Estado nuevo"
    )
    
    # Evento generador
    bitacora_movimiento = models.ForeignKey(
        'BitácoraMovimiento',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='series_afectadas',
        help_text="Movimiento que causó el cambio de estado"
    )
    
    # Bodega
    bodega = models.ForeignKey(
        'bodegas.Bodega',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='bitacora_series_movimientos',
        help_text="Bodega donde ocurrió el cambio"
    )
    
    # Usuario
    usuario = models.ForeignKey(
        'empresas.UsuarioEmpresa',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='bitacora_cambios_series'
    )
    
    # Documento de origen
    documento_referencia = models.CharField(
        max_length=100,
        blank=True,
        help_text="Referencia del documento que originó el cambio"
    )
    
    # Observaciones
    observaciones = models.TextField(blank=True)
    
    empresa = models.ForeignKey(
        'empresas.Empresa',
        on_delete=models.CASCADE,
        related_name='bitacora_series',
    )
    
    class Meta:
        verbose_name = "Bitácora de Serie"
        verbose_name_plural = "Bitácoras de Series"
        ordering = ['-fecha_creacion']
        db_index = ['serie_item', 'empresa']
        indexes = [
            models.Index(fields=['serie_item', 'fecha_creacion']),
            models.Index(fields=['empresa', 'fecha_creacion']),
        ]
    
    def __str__(self):
        return (
            f"Serie {self.serie_item.serie}: {self.estado_anterior} → {self.estado_nuevo} "
            f"({self.fecha_creacion.strftime('%Y-%m-%d %H:%M')})"
        )


class ReporteTrazabilidadSerie(models.Model):
    """
    Vista materializada / caché para consultas rápidas de trazabilidad por serie.
    
    Proporciona:
    - Historial completo de la serie
    - Ubicación actual
    - Documentos relacionados
    - Cadena de custodia
    
    Se actualiza automáticamente cuando hay cambios en BitácoraSerieMovimiento.
    """
    
    serie_item = models.OneToOneField(
        'bodegas.SerieItem',
        on_delete=models.CASCADE,
        primary_key=True,
        related_name='trazabilidad'
    )
    
    # Estado actual
    estado_actual = models.CharField(
        max_length=20,
        choices=BitácoraSerieMovimiento.ESTADO_CHOICES
    )
    bodega_actual = models.ForeignKey(
        'bodegas.Bodega',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='series_trazabilidad'
    )
    
    # Fechas clave
    fecha_creacion_serie = models.DateTimeField(
        help_text="Cuándo entró al sistema"
    )
    fecha_ultima_actualizacion = models.DateTimeField(
        auto_now=True,
        help_text="Última actualización de este registro"
    )
    
    # Contadores
    cantidad_movimientos = models.IntegerField(
        default=0,
        help_text="Total de eventos en la serie"
    )
    cantidad_cambios_estado = models.IntegerField(
        default=0,
        help_text="Total de cambios de estado"
    )
    
    # Documentos relacionados
    numero_orden_compra = models.CharField(
        max_length=100,
        blank=True,
        help_text="OC de donde proviene"
    )
    numero_guia_salida = models.CharField(
        max_length=100,
        blank=True,
        help_text="Guía de salida asociada"
    )
    numero_voucher_devolucion = models.CharField(
        max_length=100,
        blank=True,
        help_text="Voucher si fue devuelta"
    )
    
    # Datos de trazabilidad
    cadena_custodia = models.JSONField(
        default=list,
        help_text="[{usuario, fecha, evento, documento}, ...]"
    )
    anomalias = models.JSONField(
        default=list,
        help_text="[{tipo, descripcion, fecha_deteccion}, ...]"
    )
    
    empresa = models.ForeignKey(
        'empresas.Empresa',
        on_delete=models.CASCADE,
        related_name='reportes_trazabilidad'
    )
    
    class Meta:
        verbose_name = "Reporte de Trazabilidad"
        verbose_name_plural = "Reportes de Trazabilidad"
        db_index = ['empresa']
    
    def __str__(self):
        return f"Trazabilidad: {self.serie_item.serie}"


class ReporteConciliación(ModeloBase):
    """
    Reporte de conciliación entre:
    1. Stock en StockItemEnBodega
    2. Suma de movimientos en BitácoraMovimiento
    3. Series activas asociadas
    
    Permite detectar inconsistencias y discrepancias silenciosas.
    """
    
    # Identificación
    bodega = models.ForeignKey(
        'bodegas.Bodega',
        on_delete=models.CASCADE,
        related_name='reportes_conciliacion'
    )
    stock_item = models.ForeignKey(
        'bodegas.StockItemEnBodega',
        on_delete=models.CASCADE,
        related_name='reportes_conciliacion'
    )
    
    # Stock reportado vs. calculado
    cantidad_stock_registrado = models.IntegerField(
        help_text="Cantidad en StockItemEnBodega"
    )
    cantidad_stock_calculado = models.IntegerField(
        help_text="Suma de movimientos de BitácoraMovimiento"
    )
    diferencia = models.IntegerField(
        help_text="cantidad_stock_registrado - cantidad_stock_calculado"
    )
    
    # Series
    cantidad_series_registradas = models.IntegerField(
        default=0,
        help_text="Series con estado != 'devuelta' y vinculadas a este stock"
    )
    cantidad_series_disponibles = models.IntegerField(
        default=0,
        help_text="Series en estado 'disponible'"
    )
    cantidad_series_reservadas = models.IntegerField(
        default=0,
        help_text="Series en estado 'reservada'"
    )
    cantidad_series_despachadas = models.IntegerField(
        default=0,
        help_text="Series en estado 'despachada'"
    )
    
    # Validaciones
    es_consistente = models.BooleanField(
        default=False,
        help_text="True si diferencia == 0 y conteos de series son válidos"
    )
    anomalias = models.JSONField(
        default=list,
        help_text="[{tipo: 'sobrestock' | 'substock' | 'inconsistencia_series', detalle}, ...]"
    )
    
    # Período del reporte
    fecha_inicio = models.DateTimeField(
        help_text="Inicio del período analizado"
    )
    fecha_cierre = models.DateTimeField(
        help_text="Fin del período analizado"
    )
    
    empresa = models.ForeignKey(
        'empresas.Empresa',
        on_delete=models.CASCADE,
        related_name='reportes_conciliacion'
    )
    
    class Meta:
        verbose_name = "Reporte de Conciliación"
        verbose_name_plural = "Reportes de Conciliación"
        ordering = ['-fecha_creacion']
        db_index = ['bodega', 'stock_item', 'empresa', 'es_consistente']
    
    def __str__(self):
        estado = "✓ Consistente" if self.es_consistente else "✗ Inconsistencia"
        return f"{estado} - {self.stock_item} en {self.bodega} (Δ{self.diferencia:+d})"


class AnomalíaMovimiento(ModeloBase):
    """
    Registro de anomalías detectadas en movimientos.
    
    Tipos de anomalías:
    - Stock negativo
    - Movimiento huérfano (sin documento)
    - Salida sin entrada previa
    - Devolución sin salida previa
    - Inconsistencia de series
    - Diferencia stock vs bitácora
    """
    
    TIPO_ANOMALIA_CHOICES = (
        ('stock_negativo', 'Stock Negativo'),
        ('movimiento_huerfano', 'Movimiento sin Documento'),
        ('salida_sin_entrada', 'Salida sin Entrada Previa'),
        ('devolucion_sin_salida', 'Devolución sin Salida Previa'),
        ('inconsistencia_series', 'Inconsistencia de Series'),
        ('diferencia_stock', 'Diferencia Stock vs Bitácora'),
        ('serie_duplicada', 'Serie Duplicada'),
        ('otro', 'Otro'),
    )
    
    tipo_anomalia = models.CharField(
        max_length=50,
        choices=TIPO_ANOMALIA_CHOICES,
        db_index=True
    )
    
    # Contexto
    bodega = models.ForeignKey(
        'bodegas.Bodega',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='anomalias'
    )
    stock_item = models.ForeignKey(
        'bodegas.StockItemEnBodega',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='anomalias'
    )
    serie_item = models.ForeignKey(
        'bodegas.SerieItem',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='anomalias'
    )
    bitacora_movimiento = models.ForeignKey(
        'BitácoraMovimiento',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='anomalias'
    )
    
    # Detalle
    descripcion = models.TextField(
        help_text="Descripción detallada de la anomalía"
    )
    datos_anomalia = models.JSONField(
        default=dict,
        help_text="Datos adicionales según tipo de anomalía"
    )
    
    # Resolución
    resuelta = models.BooleanField(
        default=False,
        db_index=True,
        help_text="Indica si la anomalía fue resuelta"
    )
    fecha_resolucion = models.DateTimeField(
        null=True,
        blank=True
    )
    resuelto_por = models.ForeignKey(
        'empresas.UsuarioEmpresa',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='anomalias_resueltas'
    )
    nota_resolucion = models.TextField(blank=True)
    
    empresa = models.ForeignKey(
        'empresas.Empresa',
        on_delete=models.CASCADE,
        related_name='anomalias'
    )
    
    class Meta:
        verbose_name = "Anomalía de Movimiento"
        verbose_name_plural = "Anomalías de Movimientos"
        ordering = ['-fecha_creacion']
        db_index = ['tipo_anomalia', 'resuelta', 'empresa']
        indexes = [
            models.Index(fields=['tipo_anomalia', 'resuelta']),
            models.Index(fields=['empresa', 'resuelta']),
        ]
    
    def __str__(self):
        return f"[{self.get_tipo_anomalia_display()}] {self.descripcion[:100]}"
