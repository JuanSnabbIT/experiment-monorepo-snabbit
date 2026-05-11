# Fase 1 (Licencia SSOT): agregar snapshots de `nombre` y `proveedor`
# de la `Licencia` referenciada en cada `ContratoLicencia`. Patron en
# tres pasos en una sola migracion:
#   1) AddField nullable
#   2) RunPython poblar desde catalogo (con fallback "")
#   3) AlterField a NOT NULL (con default "" para proveedor)

from django.db import migrations, models


def poblar_nombre_proveedor(apps, schema_editor):
    ContratoLicencia = apps.get_model("contratos", "ContratoLicencia")
    for cl in ContratoLicencia.objects.select_related("licencia").all():
        if not cl.nombre_snapshot:
            cl.nombre_snapshot = (cl.licencia.nombre or "") if cl.licencia_id else ""
        if not cl.proveedor_snapshot:
            cl.proveedor_snapshot = (cl.licencia.proveedor or "") if cl.licencia_id else ""
        cl.save(update_fields=["nombre_snapshot", "proveedor_snapshot"])


def reverse_noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("contratos", "0044_remove_contratolicencia_otro_tipo_and_more"),
    ]

    operations = [
        # 1) Agregar nullable
        migrations.AddField(
            model_name="contratolicencia",
            name="nombre_snapshot",
            field=models.CharField(
                max_length=255,
                blank=True,
                null=True,
                verbose_name="Nombre (snapshot)",
            ),
        ),
        migrations.AddField(
            model_name="contratolicencia",
            name="proveedor_snapshot",
            field=models.CharField(
                max_length=255,
                blank=True,
                null=True,
                verbose_name="Proveedor (snapshot)",
            ),
        ),
        migrations.AddField(
            model_name="historicalcontratolicencia",
            name="nombre_snapshot",
            field=models.CharField(
                max_length=255,
                blank=True,
                null=True,
                verbose_name="Nombre (snapshot)",
            ),
        ),
        migrations.AddField(
            model_name="historicalcontratolicencia",
            name="proveedor_snapshot",
            field=models.CharField(
                max_length=255,
                blank=True,
                null=True,
                verbose_name="Proveedor (snapshot)",
            ),
        ),
        # 2) Poblar desde catalogo
        migrations.RunPython(poblar_nombre_proveedor, reverse_noop),
        # 3) NOT NULL final (proveedor con default vacio)
        migrations.AlterField(
            model_name="contratolicencia",
            name="nombre_snapshot",
            field=models.CharField(
                help_text="Nombre congelado del catalogo `Licencia` al crear la linea.",
                max_length=255,
                verbose_name="Nombre (snapshot)",
            ),
        ),
        migrations.AlterField(
            model_name="contratolicencia",
            name="proveedor_snapshot",
            field=models.CharField(
                blank=True,
                default="",
                help_text="Proveedor congelado del catalogo `Licencia` al crear la linea.",
                max_length=255,
                verbose_name="Proveedor (snapshot)",
            ),
        ),
        migrations.AlterField(
            model_name="historicalcontratolicencia",
            name="nombre_snapshot",
            field=models.CharField(
                help_text="Nombre congelado del catalogo `Licencia` al crear la linea.",
                max_length=255,
                verbose_name="Nombre (snapshot)",
            ),
        ),
        migrations.AlterField(
            model_name="historicalcontratolicencia",
            name="proveedor_snapshot",
            field=models.CharField(
                blank=True,
                default="",
                help_text="Proveedor congelado del catalogo `Licencia` al crear la linea.",
                max_length=255,
                verbose_name="Proveedor (snapshot)",
            ),
        ),
    ]
