from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ("contratos", "0009_persona_licenciataria_correo_persona"),
    ]

    operations = [
        migrations.CreateModel(
            name="EnvioContratoAprobacion",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("fecha_creacion", models.DateTimeField(auto_now_add=True)),
                ("fecha_modificacion", models.DateTimeField(auto_now=True)),
                ("uuid", models.UUIDField(default=uuid.uuid4, unique=True)),
                ("fecha_envio", models.DateTimeField(blank=True, null=True)),
                ("enviado", models.BooleanField(default=False)),
                ("respondido", models.BooleanField(default=False)),
                ("aprobado", models.BooleanField(blank=True, null=True)),
                ("fecha_respuesta", models.DateTimeField(blank=True, null=True)),
                ("ip_respuesta", models.GenericIPAddressField(blank=True, null=True)),
                ("comentario_respuesta", models.TextField(blank=True, null=True)),
                ("pdf_congelado", models.BinaryField(blank=True, null=True)),
                ("snapshot_contrato", models.JSONField(blank=True, default=dict, null=True)),
                ("version_envio", models.PositiveIntegerField(default=1)),
                ("contrato", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="envios_aprobacion", to="contratos.contratoempresacliente")),
                ("destinatario", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="envios_aprobacion", to="contratos.usuariovinculadocontrato")),
            ],
            options={
                "verbose_name": "Envio del Contrato para Aprobacion",
                "verbose_name_plural": "Envios de Contratos para Aprobacion",
                "ordering": ["-fecha_envio", "-id"],
            },
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
                    ("en_firma", "En firma"),
                    ("activo", "Activo"),
                    ("suspendido", "Suspendido"),
                    ("finalizado", "Finalizado"),
                ],
                default="borrador",
                max_length=30,
            ),
        ),
        migrations.AddField(
            model_name="enviocontratofirmausuario",
            name="ip_respuesta",
            field=models.GenericIPAddressField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="enviocontratofirmausuario",
            name="pdf_congelado",
            field=models.BinaryField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="enviocontratofirmausuario",
            name="snapshot_contrato",
            field=models.JSONField(blank=True, default=dict, null=True),
        ),
        migrations.AddField(
            model_name="usuariovinculadocontrato",
            name="correo_generico",
            field=models.EmailField(blank=True, max_length=250, null=True),
        ),
        migrations.AddField(
            model_name="usuariovinculadocontrato",
            name="correo_normalizado",
            field=models.EmailField(blank=True, db_index=True, max_length=250, null=True),
        ),
        migrations.AddField(
            model_name="usuariovinculadocontrato",
            name="es_destinatario_principal",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="usuariovinculadocontrato",
            name="nombre",
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
        migrations.AlterField(
            model_name="usuariovinculadocontrato",
            name="usuario",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, to="empresas.usuarioempresa"),
        ),
        migrations.AddConstraint(
            model_name="usuariovinculadocontrato",
            constraint=models.UniqueConstraint(
                condition=models.Q(usuario__isnull=False),
                fields=("contrato", "usuario"),
                name="unique_vinculo_contrato_usuario",
            ),
        ),
        migrations.AddConstraint(
            model_name="usuariovinculadocontrato",
            constraint=models.UniqueConstraint(
                condition=models.Q(correo_normalizado__isnull=False),
                fields=("contrato", "correo_normalizado"),
                name="unique_vinculo_contrato_correo",
            ),
        ),
        migrations.AddConstraint(
            model_name="usuariovinculadocontrato",
            constraint=models.UniqueConstraint(
                condition=models.Q(es_destinatario_principal=True),
                fields=("contrato",),
                name="unique_destinatario_principal_contrato",
            ),
        ),
    ]
