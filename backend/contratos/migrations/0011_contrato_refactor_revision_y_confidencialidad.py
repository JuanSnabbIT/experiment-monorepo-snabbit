from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("contratos", "0010_flujo_aprobacion_contratos"),
    ]

    operations = [
        migrations.AddField(
            model_name="servicio",
            name="clausulas_especiales",
            field=models.TextField(
                blank=True,
                null=True,
                verbose_name="Clausulas especiales",
            ),
        ),
        migrations.AddField(
            model_name="servicio",
            name="incluye",
            field=models.TextField(blank=True, null=True, verbose_name="Incluye"),
        ),
        migrations.AddField(
            model_name="servicio",
            name="no_incluye",
            field=models.TextField(blank=True, null=True, verbose_name="No incluye"),
        ),
        migrations.AddField(
            model_name="planservicio",
            name="clausulas_especiales",
            field=models.TextField(
                blank=True,
                null=True,
                verbose_name="Clausulas especiales",
            ),
        ),
        migrations.AddField(
            model_name="planservicio",
            name="incluye",
            field=models.TextField(blank=True, null=True, verbose_name="Incluye"),
        ),
        migrations.AddField(
            model_name="planservicio",
            name="no_incluye",
            field=models.TextField(blank=True, null=True, verbose_name="No incluye"),
        ),
        migrations.AddField(
            model_name="condicionespecial",
            name="multa_incumplimiento",
            field=models.DecimalField(
                decimal_places=2,
                default=0,
                max_digits=12,
                verbose_name="Costo asociado al incumplimiento",
            ),
        ),
        migrations.AddField(
            model_name="historicalcondicionespecial",
            name="multa_incumplimiento",
            field=models.DecimalField(
                decimal_places=2,
                default=0,
                max_digits=12,
                verbose_name="Costo asociado al incumplimiento",
            ),
        ),
        migrations.AddField(
            model_name="contratocondicionespecial",
            name="detalle_personalizado",
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="contratocondicionespecial",
            name="multa_incumplimiento",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=12),
        ),
        migrations.AddField(
            model_name="contratocondicionespecial",
            name="titulo_personalizado",
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
        migrations.AddField(
            model_name="historicalcontratocondicionespecial",
            name="detalle_personalizado",
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="historicalcontratocondicionespecial",
            name="multa_incumplimiento",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=12),
        ),
        migrations.AddField(
            model_name="historicalcontratocondicionespecial",
            name="titulo_personalizado",
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
        migrations.AddField(
            model_name="acuerdoconfidencialidadcontrato",
            name="archivo_firma",
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="acuerdoconfidencialidadcontrato",
            name="correo_firmante",
            field=models.EmailField(blank=True, max_length=250, null=True),
        ),
        migrations.AddField(
            model_name="acuerdoconfidencialidadcontrato",
            name="fecha_envio",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="acuerdoconfidencialidadcontrato",
            name="fecha_firma",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="acuerdoconfidencialidadcontrato",
            name="firma_usuario_empresa",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="acuerdos_confidencialidad_contrato",
                to="empresas.usuarioempresa",
            ),
        ),
        migrations.AddField(
            model_name="acuerdoconfidencialidadcontrato",
            name="firmado",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="acuerdoconfidencialidadcontrato",
            name="nombre_firmante",
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
        migrations.AddField(
            model_name="acuerdoconfidencialidadcontrato",
            name="periodicidad_meses",
            field=models.PositiveSmallIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="acuerdoconfidencialidadcontrato",
            name="vigencia_desde",
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="acuerdoconfidencialidadcontrato",
            name="vigencia_hasta",
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="historicalacuerdoconfidencialidadcontrato",
            name="archivo_firma",
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="historicalacuerdoconfidencialidadcontrato",
            name="correo_firmante",
            field=models.EmailField(blank=True, max_length=250, null=True),
        ),
        migrations.AddField(
            model_name="historicalacuerdoconfidencialidadcontrato",
            name="fecha_envio",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="historicalacuerdoconfidencialidadcontrato",
            name="fecha_firma",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="historicalacuerdoconfidencialidadcontrato",
            name="firma_usuario_empresa",
            field=models.ForeignKey(
                blank=True,
                db_constraint=False,
                null=True,
                on_delete=django.db.models.deletion.DO_NOTHING,
                related_name="+",
                to="empresas.usuarioempresa",
            ),
        ),
        migrations.AddField(
            model_name="historicalacuerdoconfidencialidadcontrato",
            name="firmado",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="historicalacuerdoconfidencialidadcontrato",
            name="nombre_firmante",
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
        migrations.AddField(
            model_name="historicalacuerdoconfidencialidadcontrato",
            name="periodicidad_meses",
            field=models.PositiveSmallIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="historicalacuerdoconfidencialidadcontrato",
            name="vigencia_desde",
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="historicalacuerdoconfidencialidadcontrato",
            name="vigencia_hasta",
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name="contratoempresacliente",
            name="estado",
            field=models.CharField(
                choices=[
                    ("borrador", "Borrador"),
                    ("en_aprobacion_cliente", "En aprobacion del cliente"),
                    ("cambios_solicitados", "Cambios solicitados"),
                    ("aprobado_cliente", "Aprobado por cliente"),
                    ("rechazado_cliente", "Rechazado por cliente"),
                    ("en_firma", "En firma"),
                    ("activo", "Activo"),
                    ("suspendido", "Suspendido"),
                    ("finalizado", "Finalizado"),
                ],
                default="borrador",
                max_length=30,
            ),
        ),
        migrations.AlterField(
            model_name="historicalcontratoempresacliente",
            name="estado",
            field=models.CharField(
                choices=[
                    ("borrador", "Borrador"),
                    ("en_aprobacion_cliente", "En aprobacion del cliente"),
                    ("cambios_solicitados", "Cambios solicitados"),
                    ("aprobado_cliente", "Aprobado por cliente"),
                    ("rechazado_cliente", "Rechazado por cliente"),
                    ("en_firma", "En firma"),
                    ("activo", "Activo"),
                    ("suspendido", "Suspendido"),
                    ("finalizado", "Finalizado"),
                ],
                default="borrador",
                max_length=30,
            ),
        ),
    ]
