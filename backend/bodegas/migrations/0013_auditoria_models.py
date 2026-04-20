# Generated for Issue #45 - Fase 4: Detección y saneamiento de datos históricos

import django.db.models.deletion
import django.db.models.functions.comparison
from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ('bodegas', '0012_add_item_asignado_usuario'),
        ('empresas', '0001_initial'),
    ]

    operations = [
        # BitácoraMovimiento
        migrations.CreateModel(
            name='BitácoraMovimiento',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('fecha_creacion', models.DateTimeField(auto_now_add=True)),
                ('fecha_modificacion', models.DateTimeField(auto_now=True)),
                ('tipo_evento', models.CharField(
                    choices=[
                        ('ingreso_compra', 'Ingreso por Compra'),
                        ('salida_guia', 'Salida por Guía'),
                        ('devolucion', 'Devolución de Cliente'),
                        ('ajuste_inventario', 'Ajuste de Inventario'),
                        ('anulacion', 'Anulación'),
                        ('reverso', 'Reverso de Movimiento'),
                        ('ajuste_serie', 'Ajuste de Serie'),
                        ('transferencia_bodega', 'Transferencia Entre Bodegas'),
                    ],
                    db_index=True,
                    max_length=30,
                    help_text='Clasificación del tipo de evento',
                )),
                ('numero_documento', models.CharField(blank=True, db_index=True, help_text='Número visible del documento (ej: OC-001, VDEV-2025-0001)', max_length=100)),
                ('item_nombre', models.CharField(blank=True, help_text='Nombre del item (snapshot para trazabilidad)', max_length=250)),
                ('cantidad', models.IntegerField(help_text='Cantidad del movimiento (puede ser negativo para egresos)')),
                ('cantidad_series', models.IntegerField(default=0, help_text='Cantidad de series afectadas')),
                ('cantidad_anterior', models.IntegerField(blank=True, help_text='Stock disponible antes del movimiento', null=True)),
                ('cantidad_posterior', models.IntegerField(blank=True, help_text='Stock disponible después del movimiento', null=True)),
                ('usuario_nombre', models.CharField(blank=True, help_text='Nombre del usuario (snapshot)', max_length=250)),
                ('descripcion', models.TextField(blank=True, help_text='Descripción detallada del evento')),
                ('observaciones', models.TextField(blank=True, help_text='Notas adicionales sobre el movimiento')),
                ('anulacion_razon', models.CharField(blank=True, help_text='Razón de anulación si aplica', max_length=250)),
                ('documento_origen_id', models.PositiveIntegerField(blank=True, help_text='ID del documento origen', null=True)),
                ('bodega_destino', models.ForeignKey(blank=True, help_text='Bodega destino del movimiento', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='bitacora_entradas', to='bodegas.bodega')),
                ('bodega_origen', models.ForeignKey(blank=True, help_text='Bodega origen del movimiento', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='bitacora_salidas', to='bodegas.bodega')),
                ('documento_origen_content_type', models.ForeignKey(blank=True, help_text='Tipo de documento origen (OC, Guía, etc)', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='bitacora_documentos_origen', to='contenttypes.contenttype')),
                ('empresa', models.ForeignKey(help_text='Empresa propietaria', on_delete=django.db.models.deletion.CASCADE, related_name='bitacora_movimientos', to='empresas.empresa')),
                ('stock_item', models.ForeignKey(blank=True, help_text='Item de stock afectado', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='bitacora_movimientos', to='bodegas.stockitemenbodega')),  # noqa
                ('usuario', models.ForeignKey(blank=True, help_text='Usuario que realizó la acción', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='bitacora_eventos', to='empresas.usuarioempresa')),
                ('movimiento_reversado', models.ForeignKey(blank=True, help_text='Si es un reverso, referencia al movimiento original', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='reversos', to='bodegas.bitácoramovimiento')),
            ],
            options={
                'verbose_name': 'Bitácora de Movimiento',
                'verbose_name_plural': 'Bitácoras de Movimientos',
                'ordering': ['-fecha_creacion'],
                'indexes': [
                    models.Index(fields=['empresa', 'fecha_creacion'], name='bodegas_bit_empresa_idx'),
                    models.Index(fields=['tipo_evento', 'fecha_creacion'], name='bodegas_bit_tipo_idx'),
                    models.Index(fields=['stock_item', 'fecha_creacion'], name='bodegas_bit_stock_idx'),
                    models.Index(fields=['numero_documento'], name='bodegas_bit_numdoc_idx'),
                ],
            },
        ),
        # BitácoraSerieMovimiento
        migrations.CreateModel(
            name='BitácoraSerieMovimiento',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('fecha_creacion', models.DateTimeField(auto_now_add=True)),
                ('fecha_modificacion', models.DateTimeField(auto_now=True)),
                ('estado_anterior', models.CharField(
                    choices=[
                        ('disponible', 'Disponible'),
                        ('reservada', 'Reservada en Guía'),
                        ('despachada', 'Despachada'),
                        ('devuelta', 'Devuelta'),
                    ],
                    help_text='Estado previo',
                    max_length=20,
                )),
                ('estado_nuevo', models.CharField(
                    choices=[
                        ('disponible', 'Disponible'),
                        ('reservada', 'Reservada en Guía'),
                        ('despachada', 'Despachada'),
                        ('devuelta', 'Devuelta'),
                    ],
                    help_text='Estado nuevo',
                    max_length=20,
                )),
                ('documento_referencia', models.CharField(blank=True, help_text='Referencia del documento que originó el cambio', max_length=100)),
                ('observaciones', models.TextField(blank=True)),
                ('bitacora_movimiento', models.ForeignKey(blank=True, help_text='Movimiento que causó el cambio de estado', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='series_afectadas', to='bodegas.bitácoramovimiento')),
                ('bodega', models.ForeignKey(blank=True, help_text='Bodega donde ocurrió el cambio', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='bitacora_series_movimientos', to='bodegas.bodega')),
                ('empresa', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='bitacora_series', to='empresas.empresa')),
                ('serie_item', models.ForeignKey(help_text='Serie afectada', on_delete=django.db.models.deletion.CASCADE, related_name='bitacora_estados', to='bodegas.serieitem')),
                ('usuario', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='bitacora_cambios_series', to='empresas.usuarioempresa')),
            ],
            options={
                'verbose_name': 'Bitácora de Serie',
                'verbose_name_plural': 'Bitácoras de Series',
                'ordering': ['-fecha_creacion'],
                'indexes': [
                    models.Index(fields=['serie_item', 'fecha_creacion'], name='bodegas_bitserie_item_idx'),
                    models.Index(fields=['empresa', 'fecha_creacion'], name='bodegas_bitserie_emp_idx'),
                ],
            },
        ),
        # ReporteTrazabilidadSerie
        migrations.CreateModel(
            name='ReporteTrazabilidadSerie',
            fields=[
                ('serie_item', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, primary_key=True, related_name='trazabilidad', serialize=False, to='bodegas.serieitem')),
                ('estado_actual', models.CharField(
                    choices=[
                        ('disponible', 'Disponible'),
                        ('reservada', 'Reservada en Guía'),
                        ('despachada', 'Despachada'),
                        ('devuelta', 'Devuelta'),
                    ],
                    max_length=20,
                )),
                ('fecha_creacion_serie', models.DateTimeField(help_text='Cuándo entró al sistema')),
                ('fecha_ultima_actualizacion', models.DateTimeField(auto_now=True, help_text='Última actualización de este registro')),
                ('cantidad_movimientos', models.IntegerField(default=0, help_text='Total de eventos en la serie')),
                ('cantidad_cambios_estado', models.IntegerField(default=0, help_text='Total de cambios de estado')),
                ('numero_orden_compra', models.CharField(blank=True, help_text='OC de donde proviene', max_length=100)),
                ('numero_guia_salida', models.CharField(blank=True, help_text='Guía de salida asociada', max_length=100)),
                ('numero_voucher_devolucion', models.CharField(blank=True, help_text='Voucher si fue devuelta', max_length=100)),
                ('cadena_custodia', models.JSONField(default=list, help_text='[{usuario, fecha, evento, documento}, ...]')),
                ('anomalias', models.JSONField(default=list, help_text='[{tipo, descripcion, fecha_deteccion}, ...]')),
                ('bodega_actual', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='series_trazabilidad', to='bodegas.bodega')),
                ('empresa', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='reportes_trazabilidad', to='empresas.empresa')),
            ],
            options={
                'verbose_name': 'Reporte de Trazabilidad',
                'verbose_name_plural': 'Reportes de Trazabilidad',
            },
        ),
        # ReporteConciliación
        migrations.CreateModel(
            name='ReporteConciliación',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('fecha_creacion', models.DateTimeField(auto_now_add=True)),
                ('fecha_modificacion', models.DateTimeField(auto_now=True)),
                ('cantidad_stock_registrado', models.IntegerField(help_text='Cantidad disponible en StockItemEnBodega')),
                ('cantidad_stock_calculado', models.IntegerField(help_text='Suma de movimientos de BitácoraMovimiento')),
                ('diferencia', models.IntegerField(help_text='cantidad_stock_registrado - cantidad_stock_calculado')),
                ('cantidad_series_registradas', models.IntegerField(default=0, help_text='Series activas vinculadas a este stock')),
                ('cantidad_series_disponibles', models.IntegerField(default=0, help_text='Series en estado disponible')),
                ('cantidad_series_reservadas', models.IntegerField(default=0, help_text='Series en estado reservada')),
                ('cantidad_series_despachadas', models.IntegerField(default=0, help_text='Series en estado despachada')),
                ('es_consistente', models.BooleanField(default=False, help_text='True si diferencia == 0 y conteos de series son válidos')),
                ('anomalias', models.JSONField(default=list, help_text='[{tipo, descripcion, ...}]')),
                ('fecha_inicio', models.DateTimeField(help_text='Inicio del período analizado')),
                ('fecha_cierre', models.DateTimeField(help_text='Fin del período analizado')),
                ('bodega', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='reportes_conciliacion', to='bodegas.bodega')),
                ('empresa', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='reportes_conciliacion', to='empresas.empresa')),
                ('stock_item', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='reportes_conciliacion', to='bodegas.stockitemenbodega')),
            ],
            options={
                'verbose_name': 'Reporte de Conciliación',
                'verbose_name_plural': 'Reportes de Conciliación',
                'ordering': ['-fecha_creacion'],
                'indexes': [
                    models.Index(fields=['empresa', 'es_consistente'], name='bodegas_repconc_emp_idx'),
                    models.Index(fields=['bodega', 'stock_item'], name='bodegas_repconc_bst_idx'),
                ],
            },
        ),
        # AnomalíaMovimiento
        migrations.CreateModel(
            name='AnomalíaMovimiento',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('fecha_creacion', models.DateTimeField(auto_now_add=True)),
                ('fecha_modificacion', models.DateTimeField(auto_now=True)),
                ('tipo_anomalia', models.CharField(
                    choices=[
                        ('stock_negativo', 'Stock Negativo'),
                        ('movimiento_huerfano', 'Movimiento sin Documento'),
                        ('salida_sin_entrada', 'Salida sin Entrada Previa'),
                        ('devolucion_sin_salida', 'Devolución sin Salida Previa'),
                        ('inconsistencia_series', 'Inconsistencia de Series'),
                        ('diferencia_stock', 'Diferencia Stock vs Bitácora'),
                        ('serie_duplicada', 'Serie Duplicada'),
                        ('otro', 'Otro'),
                    ],
                    db_index=True,
                    max_length=50,
                )),
                ('descripcion', models.TextField(help_text='Descripción detallada de la anomalía')),
                ('datos_anomalia', models.JSONField(default=dict, help_text='Datos adicionales según tipo de anomalía')),
                ('resuelta', models.BooleanField(db_index=True, default=False, help_text='Indica si la anomalía fue resuelta')),
                ('fecha_resolucion', models.DateTimeField(blank=True, null=True)),
                ('nota_resolucion', models.TextField(blank=True)),
                ('bitacora_movimiento', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='anomalias', to='bodegas.bitácoramovimiento')),
                ('bodega', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='anomalias', to='bodegas.bodega')),
                ('empresa', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='anomalias', to='empresas.empresa')),
                ('resuelto_por', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='anomalias_resueltas', to='empresas.usuarioempresa')),
                ('serie_item', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='anomalias', to='bodegas.serieitem')),
                ('stock_item', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='anomalias', to='bodegas.stockitemenbodega')),
            ],
            options={
                'verbose_name': 'Anomalía de Movimiento',
                'verbose_name_plural': 'Anomalías de Movimientos',
                'ordering': ['-fecha_creacion'],
                'indexes': [
                    models.Index(fields=['tipo_anomalia', 'resuelta'], name='bodegas_anomalia_tipo_idx'),
                    models.Index(fields=['empresa', 'resuelta'], name='bodegas_anomalia_emp_idx'),
                ],
            },
        ),
    ]
