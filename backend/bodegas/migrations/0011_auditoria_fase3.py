# Generated migration for audit trail models - Phase 3

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('bodegas', '0010_consumo_directo_oc'),
        ('empresas', '0001_initial'),  # Adjust based on actual empresas migration
        ('contenttypes', '0002_remove_content_type_name'),
    ]

    operations = [
        # BitácoraMovimiento
        migrations.CreateModel(
            name='BitácoraMovimiento',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('fecha_creacion', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('fecha_actualizacion', models.DateTimeField(auto_now=True)),
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
                )),
                ('documento_origen_id', models.PositiveIntegerField(blank=True, null=True)),
                ('numero_documento', models.CharField(blank=True, db_index=True, max_length=100)),
                ('cantidad', models.IntegerField()),
                ('cantidad_anterior', models.IntegerField(blank=True, null=True)),
                ('cantidad_posterior', models.IntegerField(blank=True, null=True)),
                ('cantidad_series', models.IntegerField(default=0)),
                ('usuario_nombre', models.CharField(blank=True, max_length=250)),
                ('item_nombre', models.CharField(blank=True, max_length=250)),
                ('descripcion', models.TextField(blank=True)),
                ('observaciones', models.TextField(blank=True)),
                ('anulacion_razon', models.CharField(blank=True, max_length=250)),
                ('bodega_destino', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='bitacora_entradas', to='bodegas.bodega')),
                ('bodega_origen', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='bitacora_salidas', to='bodegas.bodega')),
                ('documento_origen_content_type', models.ForeignKey(blank=True, limit_choices_to=models.Q(('app_label', 'bodegas'), ('model', 'itemordencompraenstock'), ('app_label', 'bodegas'), ('model', 'itemsguiasalida'), ('app_label', 'bodegas'), ('model', 'itementomainventario'), ('app_label', 'bodegas'), ('model', 'voucherdevolucion'), _connector='OR'), null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='bitacora_documentos_origen', to='contenttypes.contenttype')),
                ('empresa', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='bitacora_movimientos', to='empresas.empresa')),
                ('movimiento_reversado', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='reversos', to='bodegas.bitacoramovimiento')),
                ('stock_item', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='bitacora_movimientos', to='bodegas.stockitemenBodega')),
                ('usuario', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='bitacora_eventos', to='empresas.usuarioempresa')),
            ],
            options={
                'verbose_name': 'Bitácora de Movimiento',
                'verbose_name_plural': 'Bitácoras de Movimientos',
                'ordering': ['-fecha_creacion'],
            },
        ),
        
        # BitácoraSerieMovimiento
        migrations.CreateModel(
            name='BitácoraSerieMovimiento',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('fecha_creacion', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('fecha_actualizacion', models.DateTimeField(auto_now=True)),
                ('estado_anterior', models.CharField(choices=[('disponible', 'Disponible'), ('reservada', 'Reservada en Guía'), ('despachada', 'Despachada'), ('devuelta', 'Devuelta')], max_length=20)),
                ('estado_nuevo', models.CharField(choices=[('disponible', 'Disponible'), ('reservada', 'Reservada en Guía'), ('despachada', 'Despachada'), ('devuelta', 'Devuelta')], max_length=20)),
                ('documento_referencia', models.CharField(blank=True, max_length=100)),
                ('observaciones', models.TextField(blank=True)),
                ('bitacora_movimiento', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='series_afectadas', to='bodegas.bitacoramovimiento')),
                ('bodega', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='bitacora_series_movimientos', to='bodegas.bodega')),
                ('empresa', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='bitacora_series', to='empresas.empresa')),
                ('serie_item', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='bitacora_estados', to='bodegas.serieitem')),
                ('usuario', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='bitacora_cambios_series', to='empresas.usuarioempresa')),
            ],
            options={
                'verbose_name': 'Bitácora de Serie',
                'verbose_name_plural': 'Bitácoras de Series',
                'ordering': ['-fecha_creacion'],
            },
        ),
        
        # ReporteTrazabilidadSerie
        migrations.CreateModel(
            name='ReporteTrazabilidadSerie',
            fields=[
                ('serie_item', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, primary_key=True, related_name='trazabilidad', serialize=False, to='bodegas.serieitem')),
                ('estado_actual', models.CharField(choices=[('disponible', 'Disponible'), ('reservada', 'Reservada en Guía'), ('despachada', 'Despachada'), ('devuelta', 'Devuelta')], max_length=20)),
                ('fecha_creacion_serie', models.DateTimeField()),
                ('fecha_ultima_actualizacion', models.DateTimeField(auto_now=True)),
                ('cantidad_movimientos', models.IntegerField(default=0)),
                ('cantidad_cambios_estado', models.IntegerField(default=0)),
                ('numero_orden_compra', models.CharField(blank=True, max_length=100)),
                ('numero_guia_salida', models.CharField(blank=True, max_length=100)),
                ('numero_voucher_devolucion', models.CharField(blank=True, max_length=100)),
                ('cadena_custodia', models.JSONField(default=list)),
                ('anomalias', models.JSONField(default=list)),
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
                ('fecha_creacion', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('fecha_actualizacion', models.DateTimeField(auto_now=True)),
                ('cantidad_stock_registrado', models.IntegerField()),
                ('cantidad_stock_calculado', models.IntegerField()),
                ('diferencia', models.IntegerField()),
                ('cantidad_series_registradas', models.IntegerField(default=0)),
                ('cantidad_series_disponibles', models.IntegerField(default=0)),
                ('cantidad_series_reservadas', models.IntegerField(default=0)),
                ('cantidad_series_despachadas', models.IntegerField(default=0)),
                ('es_consistente', models.BooleanField(default=False, db_index=True)),
                ('anomalias', models.JSONField(default=list)),
                ('fecha_inicio', models.DateTimeField()),
                ('fecha_cierre', models.DateTimeField()),
                ('bodega', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='reportes_conciliacion', to='bodegas.bodega')),
                ('empresa', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='reportes_conciliacion', to='empresas.empresa')),
                ('stock_item', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='reportes_conciliacion', to='bodegas.stockitemenBodega')),
            ],
            options={
                'verbose_name': 'Reporte de Conciliación',
                'verbose_name_plural': 'Reportes de Conciliación',
                'ordering': ['-fecha_creacion'],
            },
        ),
        
        # AnomalíaMovimiento
        migrations.CreateModel(
            name='AnomalíaMovimiento',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('fecha_creacion', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('fecha_actualizacion', models.DateTimeField(auto_now=True)),
                ('tipo_anomalia', models.CharField(choices=[('stock_negativo', 'Stock Negativo'), ('movimiento_huerfano', 'Movimiento sin Documento'), ('salida_sin_entrada', 'Salida sin Entrada Previa'), ('devolucion_sin_salida', 'Devolución sin Salida Previa'), ('inconsistencia_series', 'Inconsistencia de Series'), ('diferencia_stock', 'Diferencia Stock vs Bitácora'), ('serie_duplicada', 'Serie Duplicada'), ('otro', 'Otro')], db_index=True, max_length=50)),
                ('descripcion', models.TextField()),
                ('datos_anomalia', models.JSONField(default=dict)),
                ('resuelta', models.BooleanField(db_index=True, default=False)),
                ('fecha_resolucion', models.DateTimeField(blank=True, null=True)),
                ('nota_resolucion', models.TextField(blank=True)),
                ('bitacora_movimiento', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='anomalias', to='bodegas.bitacoramovimiento')),
                ('bodega', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='anomalias', to='bodegas.bodega')),
                ('empresa', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='anomalias', to='empresas.empresa')),
                ('resuelto_por', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='anomalias_resueltas', to='empresas.usuarioempresa')),
                ('serie_item', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='anomalias', to='bodegas.serieitem')),
                ('stock_item', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='anomalias', to='bodegas.stockitemenBodega')),
            ],
            options={
                'verbose_name': 'Anomalía de Movimiento',
                'verbose_name_plural': 'Anomalías de Movimientos',
                'ordering': ['-fecha_creacion'],
            },
        ),
        
        # Add indexes
        migrations.AddIndex(
            model_name='bitacoramovimiento',
            index=models.Index(fields=['empresa', 'fecha_creacion'], name='bodegas_bi_empresa_fecha_idx'),
        ),
        migrations.AddIndex(
            model_name='bitacoramovimiento',
            index=models.Index(fields=['tipo_evento', 'fecha_creacion'], name='bodegas_bi_evento_fecha_idx'),
        ),
        migrations.AddIndex(
            model_name='bitacoramovimiento',
            index=models.Index(fields=['stock_item', 'fecha_creacion'], name='bodegas_bi_stock_fecha_idx'),
        ),
        migrations.AddIndex(
            model_name='bitacoraserimovimiento',
            index=models.Index(fields=['serie_item', 'fecha_creacion'], name='bodegas_bs_serie_fecha_idx'),
        ),
        migrations.AddIndex(
            model_name='bitacoraserimovimiento',
            index=models.Index(fields=['empresa', 'fecha_creacion'], name='bodegas_bs_empresa_fecha_idx'),
        ),
        migrations.AddIndex(
            model_name='anomaliamovimiento',
            index=models.Index(fields=['tipo_anomalia', 'resuelta'], name='bodegas_ano_tipo_res_idx'),
        ),
        migrations.AddIndex(
            model_name='anomaliamovimiento',
            index=models.Index(fields=['empresa', 'resuelta'], name='bodegas_ano_empresa_res_idx'),
        ),
    ]
