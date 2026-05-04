from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import simple_history.models


def _nombre_completo(user):
    """Replica get_nombre_completo() sin depender de métodos custom del modelo."""
    partes = [user.first_name or ""]
    if getattr(user, "second_name", None):
        partes.append(user.second_name)
    partes.append(user.last_name or "")
    if getattr(user, "second_last_name", None):
        partes.append(user.second_last_name)
    return " ".join(p for p in partes if p).strip() or user.email


def poblar_personas_y_correos(apps, schema_editor):
    PersonaLicenciataria = apps.get_model("contratos", "PersonaLicenciataria")
    CorreoPersonaLicenciataria = apps.get_model("contratos", "CorreoPersonaLicenciataria")
    UsuarioVinculadoLicencia = apps.get_model("contratos", "UsuarioVinculadoLicencia")

    vistos = set()

    for vinculo in UsuarioVinculadoLicencia.objects.select_related(
        "usuario__usuario",
        "licencia__contrato",
    ).iterator():
        empresa_id = vinculo.licencia.contrato.empresa_cliente_id
        correo_obj = None

        if vinculo.usuario_id and getattr(vinculo.usuario, "usuario", None):
            nombre = _nombre_completo(vinculo.usuario.usuario)
            correo = (vinculo.usuario.usuario.email or "").strip().lower()
            persona, _ = PersonaLicenciataria.objects.get_or_create(
                usuario_empresa_id=vinculo.usuario_id,
                defaults={
                    "empresa_id": empresa_id,
                    "nombre": nombre,
                    "es_interno": True,
                    "activo": True,
                },
            )
            cambios_persona = []
            if persona.empresa_id != empresa_id:
                persona.empresa_id = empresa_id
                cambios_persona.append("empresa")
            if persona.nombre != nombre:
                persona.nombre = nombre
                cambios_persona.append("nombre")
            if not persona.es_interno:
                persona.es_interno = True
                cambios_persona.append("es_interno")
            if not persona.activo:
                persona.activo = True
                cambios_persona.append("activo")
            if cambios_persona:
                persona.save(update_fields=cambios_persona)

            if correo:
                correo_obj, _ = CorreoPersonaLicenciataria.objects.get_or_create(
                    empresa_id=empresa_id,
                    correo_normalizado=correo,
                    defaults={
                        "persona_id": persona.id,
                        "correo": correo,
                        "es_principal": True,
                        "es_corporativo": True,
                        "verificado": True,
                        "activo": True,
                    },
                )
                cambios_correo = []
                if correo_obj.persona_id != persona.id:
                    correo_obj.persona_id = persona.id
                    cambios_correo.append("persona")
                if correo_obj.correo != correo:
                    correo_obj.correo = correo
                    cambios_correo.append("correo")
                if not correo_obj.es_principal:
                    correo_obj.es_principal = True
                    cambios_correo.append("es_principal")
                if not correo_obj.es_corporativo:
                    correo_obj.es_corporativo = True
                    cambios_correo.append("es_corporativo")
                if not correo_obj.verificado:
                    correo_obj.verificado = True
                    cambios_correo.append("verificado")
                if not correo_obj.activo:
                    correo_obj.activo = True
                    cambios_correo.append("activo")
                if cambios_correo:
                    correo_obj.save(update_fields=cambios_correo)
        elif vinculo.correo_generico:
            correo = vinculo.correo_generico.strip().lower()
            correo_obj = CorreoPersonaLicenciataria.objects.filter(
                empresa_id=empresa_id,
                correo_normalizado=correo,
            ).select_related("persona").first()
            if correo_obj:
                persona = correo_obj.persona
                if vinculo.nombre and persona.nombre != vinculo.nombre:
                    persona.nombre = vinculo.nombre
                    persona.save(update_fields=["nombre"])
            else:
                persona = PersonaLicenciataria.objects.create(
                    empresa_id=empresa_id,
                    nombre=vinculo.nombre or correo,
                    es_interno=False,
                    activo=True,
                )
                correo_obj = CorreoPersonaLicenciataria.objects.create(
                    persona_id=persona.id,
                    empresa_id=empresa_id,
                    correo=correo,
                    correo_normalizado=correo,
                    es_principal=True,
                    es_corporativo=False,
                    verificado=False,
                    activo=True,
                )

        if correo_obj:
            clave = (vinculo.licencia_id, correo_obj.id)
            if clave not in vistos:
                vinculo.correo_persona_id = correo_obj.id
                vinculo.save(update_fields=["correo_persona"])
                vistos.add(clave)


def revertir_personas_y_correos(apps, schema_editor):
    UsuarioVinculadoLicencia = apps.get_model("contratos", "UsuarioVinculadoLicencia")
    UsuarioVinculadoLicencia.objects.update(correo_persona_id=None)


class Migration(migrations.Migration):

    dependencies = [
        ("contratos", "0008_notificacionventanalicencia"),
        ("empresas", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # Vacio: este contenido fue absorbido por 0001_initial durante el squash.
        # Ver _legacy_operations para el contenido original.
    ]

    _legacy_operations = [
        migrations.CreateModel(
            name="PersonaLicenciataria",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("fecha_creacion", models.DateTimeField(auto_now_add=True)),
                ("fecha_modificacion", models.DateTimeField(auto_now=True)),
                ("nombre", models.CharField(max_length=255)),
                ("es_interno", models.BooleanField(default=False)),
                ("activo", models.BooleanField(default=True)),
                ("empresa", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="personas_licenciatarias", to="empresas.empresa")),
                ("usuario_empresa", models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="persona_licenciataria", to="empresas.usuarioempresa")),
            ],
            options={
                "verbose_name": "Persona Licenciataria",
                "verbose_name_plural": "Personas Licenciatarias",
                "ordering": ["nombre", "id"],
            },
        ),
        migrations.CreateModel(
            name="HistoricalPersonaLicenciataria",
            fields=[
                ("id", models.BigIntegerField(auto_created=True, blank=True, db_index=True, verbose_name="ID")),
                ("fecha_creacion", models.DateTimeField(blank=True, editable=False)),
                ("fecha_modificacion", models.DateTimeField(blank=True, editable=False)),
                ("nombre", models.CharField(max_length=255)),
                ("es_interno", models.BooleanField(default=False)),
                ("activo", models.BooleanField(default=True)),
                ("history_id", models.AutoField(primary_key=True, serialize=False)),
                ("history_date", models.DateTimeField(db_index=True)),
                ("history_change_reason", models.CharField(max_length=100, null=True)),
                ("history_type", models.CharField(choices=[("+", "Created"), ("~", "Changed"), ("-", "Deleted")], max_length=1)),
                ("empresa", models.ForeignKey(blank=True, db_constraint=False, null=True, on_delete=django.db.models.deletion.DO_NOTHING, related_name="+", to="empresas.empresa")),
                ("history_user", models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to=settings.AUTH_USER_MODEL)),
                ("usuario_empresa", models.ForeignKey(blank=True, db_constraint=False, null=True, on_delete=django.db.models.deletion.DO_NOTHING, related_name="+", to="empresas.usuarioempresa")),
            ],
            options={
                "verbose_name": "historical Persona Licenciataria",
                "verbose_name_plural": "historical Personas Licenciatarias",
                "ordering": ("-history_date", "-history_id"),
                "get_latest_by": ("history_date", "history_id"),
            },
            bases=(simple_history.models.HistoricalChanges, models.Model),
        ),
        migrations.CreateModel(
            name="CorreoPersonaLicenciataria",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("fecha_creacion", models.DateTimeField(auto_now_add=True)),
                ("fecha_modificacion", models.DateTimeField(auto_now=True)),
                ("correo", models.EmailField(max_length=250)),
                ("correo_normalizado", models.EmailField(db_index=True, max_length=250)),
                ("es_principal", models.BooleanField(default=False)),
                ("es_corporativo", models.BooleanField(default=True)),
                ("verificado", models.BooleanField(default=False)),
                ("activo", models.BooleanField(default=True)),
                ("empresa", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="correos_licenciatarios", to="empresas.empresa")),
                ("persona", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="correos", to="contratos.personalicenciataria")),
            ],
            options={
                "verbose_name": "Correo de Persona Licenciataria",
                "verbose_name_plural": "Correos de Personas Licenciatarias",
                "ordering": ["-es_principal", "correo", "id"],
            },
        ),
        migrations.CreateModel(
            name="HistoricalCorreoPersonaLicenciataria",
            fields=[
                ("id", models.BigIntegerField(auto_created=True, blank=True, db_index=True, verbose_name="ID")),
                ("fecha_creacion", models.DateTimeField(blank=True, editable=False)),
                ("fecha_modificacion", models.DateTimeField(blank=True, editable=False)),
                ("correo", models.EmailField(max_length=250)),
                ("correo_normalizado", models.EmailField(db_index=True, max_length=250)),
                ("es_principal", models.BooleanField(default=False)),
                ("es_corporativo", models.BooleanField(default=True)),
                ("verificado", models.BooleanField(default=False)),
                ("activo", models.BooleanField(default=True)),
                ("history_id", models.AutoField(primary_key=True, serialize=False)),
                ("history_date", models.DateTimeField(db_index=True)),
                ("history_change_reason", models.CharField(max_length=100, null=True)),
                ("history_type", models.CharField(choices=[("+", "Created"), ("~", "Changed"), ("-", "Deleted")], max_length=1)),
                ("empresa", models.ForeignKey(blank=True, db_constraint=False, null=True, on_delete=django.db.models.deletion.DO_NOTHING, related_name="+", to="empresas.empresa")),
                ("history_user", models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to=settings.AUTH_USER_MODEL)),
                ("persona", models.ForeignKey(blank=True, db_constraint=False, null=True, on_delete=django.db.models.deletion.DO_NOTHING, related_name="+", to="contratos.personalicenciataria")),
            ],
            options={
                "verbose_name": "historical Correo de Persona Licenciataria",
                "verbose_name_plural": "historical Correos de Personas Licenciatarias",
                "ordering": ("-history_date", "-history_id"),
                "get_latest_by": ("history_date", "history_id"),
            },
            bases=(simple_history.models.HistoricalChanges, models.Model),
        ),
        migrations.AddField(
            model_name="usuariovinculadolicencia",
            name="correo_persona",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="asignaciones_licencia", to="contratos.correopersonalicenciataria"),
        ),
        migrations.AddField(
            model_name="historicalusuariovinculadolicencia",
            name="correo_persona",
            field=models.ForeignKey(blank=True, db_constraint=False, null=True, on_delete=django.db.models.deletion.DO_NOTHING, related_name="+", to="contratos.correopersonalicenciataria"),
        ),
        migrations.RunPython(poblar_personas_y_correos, revertir_personas_y_correos),
        migrations.AddConstraint(
            model_name="correopersonalicenciataria",
            constraint=models.UniqueConstraint(fields=("empresa", "correo_normalizado"), name="unique_correo_persona_licenciataria_empresa"),
        ),
        migrations.AddConstraint(
            model_name="usuariovinculadolicencia",
            constraint=models.UniqueConstraint(condition=models.Q(correo_persona__isnull=False), fields=("licencia", "correo_persona"), name="unique_vinculo_licencia_correo_persona"),
        ),
    ]
