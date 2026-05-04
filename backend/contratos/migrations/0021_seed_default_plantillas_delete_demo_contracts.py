"""
Data migration: Borrar contratos demo sin plantilla y crear plantillas default por empresa.

- Elimina todos los ContratoEmpresaCliente cuyo campo plantilla es NULL (datos demo).
- Crea 3 PlantillaContrato (servicios, licencia, venta) con es_default=True por cada Empresa.
- Cada plantilla recibe 5 SeccionPlantilla base.
"""

from django.db import migrations


CONTENIDO_CANONICO_FIRMAS = (
    "[Zona de firmas del contrato]\n\n"
    "Representante Empresa Prestadora: [nombre_empresa_prestadora]\n"
    "Representante Cliente: [nombre_cliente]"
)


# Definiciones por tipo de contrato
PLANTILLAS_DEFAULT = [
    {
        "titulo": "Contrato de Servicios (Default)",
        "tipo_contrato": "servicios",
        "secciones": [
            {
                "titulo": "Encabezado del Contrato",
                "tipo": "encabezado",
                "contenido_template": (
                    "CONTRATO DE PRESTACIÓN DE SERVICIOS\n\n"
                    "Entre [empresa_prestadora.nombre], en adelante \"El Proveedor\", "
                    "y [empresa_cliente.nombre], en adelante \"El Cliente\".\n\n"
                    "Fecha de inicio: [contrato.fecha_inicio]\n"
                    "Vigencia: [calculado:vigencia_meses] meses"
                ),
                "orden": 100,
                "es_editable_en_contrato": True,
                "es_obligatoria": True,
            },
            {
                "titulo": "Alcance de los Servicios",
                "tipo": "clausula",
                "contenido_template": (
                    "El Proveedor se compromete a prestar los servicios detallados "
                    "en el alcance comercial adjunto, conforme a las condiciones "
                    "acordadas entre las partes."
                ),
                "orden": 1100,
                "es_editable_en_contrato": True,
                "es_obligatoria": True,
            },
            {
                "titulo": "Condiciones de Operación",
                "tipo": "clausula",
                "contenido_template": (
                    "Los servicios se prestarán en horario hábil salvo acuerdo "
                    "expreso en contrario. El Cliente designará un responsable "
                    "para coordinar la ejecución de los servicios."
                ),
                "orden": 2100,
                "es_editable_en_contrato": True,
                "es_obligatoria": False,
            },
            {
                "titulo": "Condiciones Generales",
                "tipo": "condiciones_generales",
                "contenido_template": (
                    "Ambas partes se comprometen a mantener la confidencialidad "
                    "de la información intercambiada. El incumplimiento de las "
                    "obligaciones contractuales facultará a la parte afectada "
                    "a resolver el contrato previa notificación escrita."
                ),
                "orden": 3100,
                "es_editable_en_contrato": True,
                "es_obligatoria": True,
            },
            {
                "titulo": "Firmas",
                "tipo": "firmas",
                "contenido_template": CONTENIDO_CANONICO_FIRMAS,
                "orden": 4000,
                "es_editable_en_contrato": False,
                "es_obligatoria": True,
            },
        ],
    },
    {
        "titulo": "Contrato de Licencias (Default)",
        "tipo_contrato": "licencia",
        "secciones": [
            {
                "titulo": "Encabezado del Contrato",
                "tipo": "encabezado",
                "contenido_template": (
                    "CONTRATO DE LICENCIAMIENTO DE SOFTWARE\n\n"
                    "Entre [empresa_prestadora.nombre], en adelante \"El Proveedor\", "
                    "y [empresa_cliente.nombre], en adelante \"El Cliente\".\n\n"
                    "Fecha de inicio: [contrato.fecha_inicio]\n"
                    "Vigencia: [calculado:vigencia_meses] meses"
                ),
                "orden": 100,
                "es_editable_en_contrato": True,
                "es_obligatoria": True,
            },
            {
                "titulo": "Alcance de las Licencias",
                "tipo": "clausula",
                "contenido_template": (
                    "El Proveedor otorga al Cliente las licencias de software "
                    "detalladas en el apartado comercial del presente contrato, "
                    "bajo las modalidades y cantidades allí especificadas."
                ),
                "orden": 1100,
                "es_editable_en_contrato": True,
                "es_obligatoria": True,
            },
            {
                "titulo": "Condiciones de Uso",
                "tipo": "clausula",
                "contenido_template": (
                    "Las licencias son intransferibles y de uso exclusivo del "
                    "Cliente. El Cliente se compromete a no exceder los cupos "
                    "contratados y a notificar cualquier uso no autorizado."
                ),
                "orden": 2100,
                "es_editable_en_contrato": True,
                "es_obligatoria": False,
            },
            {
                "titulo": "Condiciones Generales",
                "tipo": "condiciones_generales",
                "contenido_template": (
                    "Ambas partes se comprometen a mantener la confidencialidad "
                    "de la información intercambiada. El incumplimiento de las "
                    "obligaciones contractuales facultará a la parte afectada "
                    "a resolver el contrato previa notificación escrita."
                ),
                "orden": 3100,
                "es_editable_en_contrato": True,
                "es_obligatoria": True,
            },
            {
                "titulo": "Firmas",
                "tipo": "firmas",
                "contenido_template": CONTENIDO_CANONICO_FIRMAS,
                "orden": 4000,
                "es_editable_en_contrato": False,
                "es_obligatoria": True,
            },
        ],
    },
    {
        "titulo": "Contrato de Venta (Default)",
        "tipo_contrato": "venta",
        "secciones": [
            {
                "titulo": "Encabezado del Contrato",
                "tipo": "encabezado",
                "contenido_template": (
                    "CONTRATO DE COMPRAVENTA\n\n"
                    "Entre [empresa_prestadora.nombre], en adelante \"El Vendedor\", "
                    "y [empresa_cliente.nombre], en adelante \"El Comprador\".\n\n"
                    "Fecha de inicio: [contrato.fecha_inicio]\n"
                    "Vigencia: [calculado:vigencia_meses] meses"
                ),
                "orden": 100,
                "es_editable_en_contrato": True,
                "es_obligatoria": True,
            },
            {
                "titulo": "Objeto de la Venta",
                "tipo": "clausula",
                "contenido_template": (
                    "El Vendedor se compromete a entregar los bienes y/o servicios "
                    "detallados en el alcance comercial del presente contrato, "
                    "en las condiciones y plazos acordados."
                ),
                "orden": 1100,
                "es_editable_en_contrato": True,
                "es_obligatoria": True,
            },
            {
                "titulo": "Condiciones de Entrega",
                "tipo": "clausula",
                "contenido_template": (
                    "La entrega se realizará en las instalaciones del Comprador "
                    "o en el lugar que las partes acuerden. Los gastos de envío "
                    "corren por cuenta del Vendedor salvo pacto en contrario."
                ),
                "orden": 2100,
                "es_editable_en_contrato": True,
                "es_obligatoria": False,
            },
            {
                "titulo": "Condiciones Generales",
                "tipo": "condiciones_generales",
                "contenido_template": (
                    "Ambas partes se comprometen a mantener la confidencialidad "
                    "de la información intercambiada. El incumplimiento de las "
                    "obligaciones contractuales facultará a la parte afectada "
                    "a resolver el contrato previa notificación escrita."
                ),
                "orden": 3100,
                "es_editable_en_contrato": True,
                "es_obligatoria": True,
            },
            {
                "titulo": "Firmas",
                "tipo": "firmas",
                "contenido_template": CONTENIDO_CANONICO_FIRMAS,
                "orden": 4000,
                "es_editable_en_contrato": False,
                "es_obligatoria": True,
            },
        ],
    },
]


def seed_default_plantillas(apps, schema_editor):
    ContratoEmpresaCliente = apps.get_model("contratos", "ContratoEmpresaCliente")
    PlantillaContrato = apps.get_model("contratos", "PlantillaContrato")
    SeccionPlantilla = apps.get_model("contratos", "SeccionPlantilla")
    Empresa = apps.get_model("empresas", "Empresa")

    # 1) Borrar contratos sin plantilla (demo data)
    contratos_sin_plantilla = ContratoEmpresaCliente.objects.filter(plantilla__isnull=True)
    count = contratos_sin_plantilla.count()
    contratos_sin_plantilla.delete()
    if count:
        print(f"\n  [DATA] Eliminados {count} contratos demo sin plantilla.")

    # 2) Crear plantillas default por empresa
    empresas = Empresa.objects.all()
    for empresa in empresas:
        for plantilla_def in PLANTILLAS_DEFAULT:
            # Evitar duplicados si la migración se ejecuta más de una vez
            exists = PlantillaContrato.objects.filter(
                empresa_prestadora=empresa,
                titulo=plantilla_def["titulo"],
                es_default=True,
            ).exists()
            if exists:
                continue

            plantilla = PlantillaContrato.objects.create(
                empresa_prestadora=empresa,
                titulo=plantilla_def["titulo"],
                tipo_contrato=plantilla_def["tipo_contrato"],
                version=1,
                activa=True,
                es_default=True,
            )

            for seccion_def in plantilla_def["secciones"]:
                SeccionPlantilla.objects.create(
                    plantilla=plantilla,
                    titulo=seccion_def["titulo"],
                    tipo=seccion_def["tipo"],
                    contenido_template=seccion_def["contenido_template"],
                    orden=seccion_def["orden"],
                    es_editable_en_contrato=seccion_def["es_editable_en_contrato"],
                    es_obligatoria=seccion_def["es_obligatoria"],
                )

        print(f"  [DATA] Plantillas default creadas para empresa: {empresa}")


def reverse_seed(apps, schema_editor):
    PlantillaContrato = apps.get_model("contratos", "PlantillaContrato")
    PlantillaContrato.objects.filter(es_default=True).delete()
    print("\n  [DATA] Plantillas default eliminadas (reverse).")


class Migration(migrations.Migration):

    dependencies = [
        ("contratos", "0020_remove_commercial_fields_add_es_default_plantilla"),
        ("empresas", "0001_initial"),
    ]

    operations = [
        # Vacio: este contenido fue absorbido por 0001_initial durante el squash.
        # Ver _legacy_operations para el contenido original.
    ]

    _legacy_operations = [
        migrations.RunPython(seed_default_plantillas, reverse_seed),
    ]
