from django.db import migrations, models


def backfill_item_tipo_moneda(apps, schema_editor):
    ItemCotizacion = apps.get_model("cotizaciones", "ItemCotizacion")
    ProveedorEmpresa = apps.get_model("items", "ProveedorEmpresa")

    proveedor_moneda = {
        proveedor.id: (proveedor.tipo_moneda or "2")
        for proveedor in ProveedorEmpresa.objects.all().only("id", "tipo_moneda")
    }

    for item in ItemCotizacion.objects.all().only("id", "proveedor_empresa_id"):
        item.tipo_moneda = proveedor_moneda.get(item.proveedor_empresa_id, "2")
        item.save(update_fields=["tipo_moneda"])


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("cotizaciones", "0003_cotizacion_contrato_historicalcotizacion_contrato"),
        ("items", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="itemcotizacion",
            name="tipo_moneda",
            field=models.CharField(
                choices=[("1", "USD"), ("2", "CLP"), ("3", "UF")],
                default="2",
                max_length=1,
                verbose_name="Tipo de moneda del item",
            ),
        ),
        migrations.RunPython(backfill_item_tipo_moneda, noop_reverse),
    ]
