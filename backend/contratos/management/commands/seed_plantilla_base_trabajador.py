"""
Seed idempotente: crea la plantilla laboral base global con secciones
estándar del Código del Trabajo chileno y sus condiciones de aparición.

Uso:
    python manage.py seed_plantilla_base_trabajador
    python manage.py seed_plantilla_base_trabajador --reset
"""

from django.core.management.base import BaseCommand

from contratos.models import PlantillaContrato, SeccionPlantilla

PLANTILLA_TITULO = "Contrato de Trabajo — Plantilla Base"

SECCIONES = [
    {
        "titulo": "CONTRATO INDIVIDUAL DE TRABAJO",
        "tipo": "titulo",
        "contenido_template": "",
        "orden": 10,
        "condicion_aparicion": "siempre",
        "es_obligatoria": True,
        "es_editable_en_contrato": False,
    },
    {
        "titulo": "PRIMERO: PARTES",
        "tipo": "clausula",
        "contenido_template": (
            "En [lugar_firma], a [fecha_firma], entre [nombre_empresa], "
            "RUT [rut_empresa], domiciliada en [domicilio_empresa], "
            "representada por [representante_legal], RUT [rut_representante], "
            "en adelante el «Empleador»; y don/doña [nombre_trabajador], "
            "RUT [rut_trabajador], [estado_civil_label], de profesión u oficio [profesion_u_oficio], "
            "domiciliado/a en [domicilio_trabajador], en adelante el «Trabajador», "
            "se celebra el siguiente Contrato Individual de Trabajo:"
        ),
        "orden": 20,
        "condicion_aparicion": "siempre",
        "es_obligatoria": True,
        "es_editable_en_contrato": False,
    },
    {
        "titulo": "SEGUNDO: VIGENCIA",
        "tipo": "clausula",
        "contenido_template": "[vigencia_descripcion]",
        "orden": 30,
        "condicion_aparicion": "siempre",
        "es_obligatoria": True,
        "es_editable_en_contrato": False,
    },
    {
        "titulo": "TERCERO: TRABAJADOR REEMPLAZADO",
        "tipo": "clausula",
        "contenido_template": (
            "El presente contrato se celebra para reemplazar a don/doña [nombre_reemplazado], "
            "RUT [rut_reemplazado], quien se encuentra en situación de [causal_reemplazo_label]. "
            "El contrato quedará sin efecto cuando el trabajador reemplazado se reincorpore."
        ),
        "orden": 35,
        "condicion_aparicion": "solo_reemplazo",
        "es_obligatoria": False,
        "es_editable_en_contrato": False,
    },
    {
        "titulo": "CUARTO: CARGO Y FUNCIONES",
        "tipo": "clausula",
        "contenido_template": (
            "El Trabajador se desempeñará en el cargo de [cargo]. "
            "Sus principales funciones serán: [funciones]. "
            "El lugar de prestación de servicios será [lugar_trabajo]."
        ),
        "orden": 40,
        "condicion_aparicion": "siempre",
        "es_obligatoria": True,
        "es_editable_en_contrato": True,
    },
    {
        "titulo": "QUINTO: JORNADA DE TRABAJO",
        "tipo": "clausula",
        "contenido_template": (
            "La [jornada_descripcion]"
        ),
        "orden": 50,
        "condicion_aparicion": "siempre",
        "es_obligatoria": True,
        "es_editable_en_contrato": False,
    },
    {
        "titulo": "QUINTO BIS: SISTEMA DE TURNOS",
        "tipo": "clausula",
        "contenido_template": (
            "El Trabajador cumplirá su jornada en sistema de turnos rotativos "
            "conforme al siguiente esquema:\n\n[grupo_turno_slots]"
        ),
        "orden": 55,
        "condicion_aparicion": "si_grupo_turno",
        "es_obligatoria": False,
        "es_editable_en_contrato": False,
    },
    {
        "titulo": "SEXTO: REMUNERACIÓN",
        "tipo": "clausula",
        "contenido_template": (
            "El Empleador pagará al Trabajador una remuneración mensual de "
            "$[sueldo_base] ([sueldo_base_palabras]), en [moneda]. "
            "Dicho monto corresponde al [tipo_sueldo_label] pactado."
        ),
        "orden": 60,
        "condicion_aparicion": "siempre",
        "es_obligatoria": True,
        "es_editable_en_contrato": False,
    },
    {
        "titulo": "SÉPTIMO: BONO DE MOVILIZACIÓN",
        "tipo": "clausula",
        "contenido_template": (
            "El Empleador pagará al Trabajador, adicionalmente a su remuneración, "
            "un bono de movilización mensual de $[bono_movilizacion], "
            "el que no constituye remuneración para efectos legales."
        ),
        "orden": 65,
        "condicion_aparicion": "si_bono_movilizacion",
        "es_obligatoria": False,
        "es_editable_en_contrato": False,
    },
    {
        "titulo": "OCTAVO: BONO DE COLACIÓN",
        "tipo": "clausula",
        "contenido_template": (
            "El Empleador otorgará al Trabajador un bono de colación mensual de $[bono_colacion], "
            "el que no constituye remuneración para efectos legales."
        ),
        "orden": 67,
        "condicion_aparicion": "si_bono_colacion",
        "es_obligatoria": False,
        "es_editable_en_contrato": False,
    },
    {
        "titulo": "NOVENO: GRATIFICACIÓN",
        "tipo": "clausula",
        "contenido_template": (
            "[gratificacion_descripcion]"
        ),
        "orden": 70,
        "condicion_aparicion": "si_gratificacion",
        "es_obligatoria": False,
        "es_editable_en_contrato": False,
    },
    {
        "titulo": "DÉCIMO: PREVISIÓN Y SALUD",
        "tipo": "clausula",
        "contenido_template": (
            "El Trabajador cotizará previsión en [afp] y salud en [salud_descripcion]. "
            "Los descuentos correspondientes serán aplicados conforme a la legislación vigente."
        ),
        "orden": 80,
        "condicion_aparicion": "siempre",
        "es_obligatoria": True,
        "es_editable_en_contrato": False,
    },
    {
        "titulo": "UNDÉCIMO: PAGO POR TRANSFERENCIA",
        "tipo": "clausula",
        "contenido_template": (
            "El pago de las remuneraciones se realizará mediante transferencia electrónica "
            "a la [tipo_cuenta] N° [numero_cuenta] del banco [banco]."
        ),
        "orden": 85,
        "condicion_aparicion": "si_banco",
        "es_obligatoria": False,
        "es_editable_en_contrato": False,
    },
    {
        "titulo": "DUODÉCIMO: TÉRMINO DEL CONTRATO",
        "tipo": "clausula",
        "contenido_template": (
            "El presente contrato tendrá vigencia hasta el [fecha_termino], "
            "fecha en la cual terminará por la causal del artículo 159 N°4 del Código del Trabajo "
            "(vencimiento del plazo convenido). Con a lo menos 30 días de anticipación, "
            "cualquiera de las partes podrá comunicar a la otra su intención de no renovarlo."
        ),
        "orden": 90,
        "condicion_aparicion": "solo_plazo_fijo",
        "es_obligatoria": False,
        "es_editable_en_contrato": False,
    },
    {
        "titulo": "Firmas",
        "tipo": "firmas",
        "contenido_template": "",
        "orden": 200,
        "condicion_aparicion": "siempre",
        "es_obligatoria": True,
        "es_editable_en_contrato": False,
    },
]


class Command(BaseCommand):
    help = "Crea la plantilla laboral base global con secciones estándar (idempotente)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Elimina la plantilla existente y la recrea desde cero.",
        )

    def handle(self, *args, **options):
        if options["reset"]:
            deleted, _ = PlantillaContrato.objects.filter(
                titulo=PLANTILLA_TITULO,
                empresa_prestadora__isnull=True,
            ).delete()
            self.stdout.write(self.style.WARNING(
                f"Plantilla anterior eliminada (deleted={deleted})."
            ))

        plantilla, created = PlantillaContrato.objects.get_or_create(
            titulo=PLANTILLA_TITULO,
            empresa_prestadora=None,
            defaults={
                "tipo_contrato": "trabajador",
                "subtipo_trabajador": None,
                "es_default": True,
                "activa": True,
                "descripcion": (
                    "Plantilla base para contratos laborales chilenos. "
                    "Incluye cláusulas estándar del Código del Trabajo con "
                    "secciones condicionales según los datos del contrato."
                ),
                "version": 1,
            },
        )
        accion = "Creada" if created else "Ya existía"
        self.stdout.write(f"{accion}: '{plantilla.titulo}' (id={plantilla.id})")

        creadas_sec = 0
        existentes_sec = 0
        for sec_data in SECCIONES:
            condicion = sec_data.pop("condicion_aparicion", "siempre")
            _, sec_created = SeccionPlantilla.objects.get_or_create(
                plantilla=plantilla,
                titulo=sec_data["titulo"],
                defaults={**sec_data, "condicion_aparicion": condicion},
            )
            sec_data["condicion_aparicion"] = condicion  # restaurar para re-runs
            if sec_created:
                creadas_sec += 1
            else:
                existentes_sec += 1

        self.stdout.write(self.style.SUCCESS(
            f"Secciones: {creadas_sec} creadas, {existentes_sec} ya existían "
            f"(total: {len(SECCIONES)})."
        ))
