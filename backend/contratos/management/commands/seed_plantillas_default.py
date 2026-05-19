"""Seed idempotente de plantillas default de contratos por empresa.

Crea las 3 plantillas default (servicios, licencia, venta) para cada empresa.
Sin argumentos crea las 3 plantillas en todas las empresas existentes.

Opciones:
  --empresa_id <int>   Solo para la empresa indicada.
  --tipo <str>         Solo el tipo indicado (servicios | licencia | venta).

Idempotencia: si ya existe una plantilla del mismo tipo y titulo para la
empresa, no se crea duplicado ni se modifican sus secciones.
"""

from django.core.management.base import BaseCommand
from django.db import transaction

from contratos.models import PlantillaContrato, SeccionPlantilla
from contratos.estados_modelo import CONTENIDO_CANONICO_CONDICIONES_GENERALES
from empresas.models import Empresa


# ── SERVICIOS ────────────────────────────────────────────────────────────────

TITULO_SERVICIOS = "CONTRATO DE SERVICIOS TECNOLOGICOS Y ASESORIAS"

SECCIONES_SERVICIOS = [
    {
        "orden": 4,
        "tipo": "clausula",
        "titulo": "Cláusula de Confidencialidad",
        "contenido_template": (
            "[nombre_proveedor] se compromete a mantener reserva respecto a todos los asuntos "
            "que lleguen a su conocimiento, directa o indirectamente, respecto de las técnicas, "
            "costos de producción, clientes, negocios o asuntos de  [nombre_cliente], o de sus "
            "proveedores y clientes, de cualquier naturaleza que sean y a no divulgar información "
            "del desempeño de sus servicios ni a retirar cualquier tipo de documentos, equipos, "
            "o elementos de propiedad de [nombre_cliente]."
        ),
        "es_editable_en_contrato": True,
        "es_obligatoria": True,
    },
    {
        "orden": 5,
        "tipo": "condiciones_generales",
        "titulo": "PRIMERO",
        "contenido_template": (
            "[nombre_proveedor], es una sociedad de Responsabilidad Limitada, dedicada a la "
            "prestación de servicios en las áreas de gestiones empresariales, contabilidad, "
            "selección de personal y servicios tecnológicos, que cuenta con un grupo de "
            "profesionales altamente capacitados en cada una de sus áreas, para otorgar la "
            "completa tranquilidad que nuestros clientes necesitan. El compromiso es con "
            "nuestros clientes."
        ),
        "es_editable_en_contrato": True,
        "es_obligatoria": True,
    },
    {
        "orden": 6,
        "tipo": "condiciones_generales",
        "titulo": "SEGUNDO",
        "contenido_template": (
            "Por cliente se entiende a la persona natural o jurídica que suscribe el presente "
            "contrato, en virtud al cual se le hace prestación de servicios antes suscritos."
        ),
        "es_editable_en_contrato": True,
        "es_obligatoria": True,
    },
    {
        "orden": 7,
        "tipo": "condiciones_generales",
        "titulo": "TERCERO",
        "contenido_template": (
            "[nombre_proveedor], se obliga a disponer y mantener personal suficiente y calificado "
            "para brindar el servicio contratado. Sin perjuicio de lo anterior, [nombre_proveedor], "
            "podrá modificar su planta de profesionales, asignando un nuevo trabajador a la "
            "atención del CLIENTE."
        ),
        "es_editable_en_contrato": True,
        "es_obligatoria": True,
    },
    {
        "orden": 8,
        "tipo": "condiciones_generales",
        "titulo": "CUARTO",
        "contenido_template": (
            "El CLIENTE se obliga a pagar a [nombre_proveedor], por concepto de honorarios "
            "derivados de la prestación de servicios contratados, la suma establecida en la "
            "cláusula 3 de su plan seleccionado y en las fechas pactadas en la misma clausula."
        ),
        "es_editable_en_contrato": True,
        "es_obligatoria": True,
    },
    {
        "orden": 9,
        "tipo": "condiciones_generales",
        "titulo": "QUINTO",
        "contenido_template": (
            "[nombre_proveedor], se compromete a mantener en estricta confidencialidad toda "
            "información inherente a los servicios administrativos-contables y/o asesorías "
            "tecnológicas otorgados al CLIENTE cumpliendo con la normativa vigente y el Código "
            "de Ética que resguarda el secreto profesional. Además, se anexa a este contrato un "
            "acuerdo de confidencialidad que será firmado entre [nombre_proveedor] y el CLIENTE."
        ),
        "es_editable_en_contrato": True,
        "es_obligatoria": True,
    },
    {
        "orden": 10,
        "tipo": "condiciones_generales",
        "titulo": "SEXTO",
        "contenido_template": (
            "La vigencia del contrato será de un año y se renovará automáticamente si ninguna "
            "de las partes avisa a la otra por escrito su intención de no renovarlo por lo menos "
            "60 días antes de su fecha de vencimiento, si se desea dar de baja de los servicios, "
            "deberá ser previo aviso como se ha señalado anteriormente con 60 días de anticipación "
            "al término que se señale, cancelándose estas últimas mensualidades.\n"
            " El valor del contrato será modificado si las condiciones de los servicios originales "
            "pactados en el presente contrato cambiarán generando un nuevo contrato o un anexo a "
            "este documento."
        ),
        "es_editable_en_contrato": True,
        "es_obligatoria": True,
    },
    {
        "orden": 11,
        "tipo": "condiciones_generales",
        "titulo": "SEPTIMO",
        "contenido_template": (
            "Todos los servicios que no se encuentren especificados en este contrato, se entienden "
            "como servicios adicionales y serán facturados como adicionales, previa cotización y "
            "confirmación por el CLIENTE. Asimismo, si cambian las condiciones pactadas en este "
            "contrato, se realizarán anexos de contrato con el detalle de los nuevos servicios y "
            "valores adicionales."
        ),
        "es_editable_en_contrato": True,
        "es_obligatoria": True,
    },
    {
        "orden": 12,
        "tipo": "condiciones_generales",
        "titulo": "OCTAVO",
        "contenido_template": (
            "De haber término del contrato deben estar canceladas en su totalidad las "
            "mensualidades hasta la fecha de término, cualquier irregularidad en el término del "
            "presente contrato dará derecho a [nombre_proveedor] a aplicar medidas compensatorias."
        ),
        "es_editable_en_contrato": True,
        "es_obligatoria": True,
    },
    {
        "orden": 13,
        "tipo": "condiciones_generales",
        "titulo": "NOVENO",
        "contenido_template": (
            "EL CLIENTE, da Fe de conocer las condiciones y términos del contrato entre su "
            "prestador de servicios [nombre_proveedor]."
        ),
        "es_editable_en_contrato": True,
        "es_obligatoria": True,
    },
]


# ── LICENCIA ─────────────────────────────────────────────────────────────────

TITULO_LICENCIA = "CONTRATO DE LICENCIAMIENTO DE SOFTWARE"

SECCIONES_LICENCIA = [
    {
        "orden": 1,
        "tipo": "clausula",
        "titulo": "SEGUNDO: Plan y Alcance de la Licencia",
        "contenido_template": (
            "El software licenciado corresponde a \"[descripcion_servicio]\".\n\n"
            "El plan contratado es: \"[nombre_plan]\".\n\n"
            "Los servicios incluyen: [incluye_servicio].\n\n"
            "Los servicios no incluyen: [no_incluye_servicio].\n\n"
            "EL LICENCIANTE otorga a EL LICENCIATARIO una licencia de uso no exclusiva, "
            "intransferible e indelegable, para el uso del software exclusivamente "
            "dentro de la organización de EL LICENCIATARIO."
        ),
        "es_editable_en_contrato": True,
        "es_obligatoria": True,
    },
    {
        "orden": 2,
        "tipo": "clausula",
        "titulo": "TERCERO: Precio y Forma de Pago",
        "contenido_template": (
            "El valor de la licencia asciende a [moneda] [valor_total], "
            "de acuerdo a la modalidad de cobro acordada.\n\n"
            "La forma de pago sera: [forma_pago].\n\n"
            "La facturación se realizará el día [dia_facturacion] de cada período, "
            "conforme a las condiciones pactadas."
        ),
        "es_editable_en_contrato": True,
        "es_obligatoria": True,
    },
    {
        "orden": 3,
        "tipo": "clausula",
        "titulo": "CUARTO: Vigencia y Renovación",
        "contenido_template": (
            "El presente contrato tendrá una vigencia de [vigencia_meses] meses, "
            "contados desde el [fecha_inicio] hasta el [fecha_fin].\n\n"
            "Renovación automática: [renovacion_automatica].\n\n"
            "Cualquiera de las partes podrá dar término al contrato mediante aviso "
            "escrito con a lo menos [dias_aviso_termino] días de anticipación al "
            "vencimiento del período vigente."
        ),
        "es_editable_en_contrato": True,
        "es_obligatoria": True,
    },
    {
        "orden": 4,
        "tipo": "condiciones_generales",
        "titulo": "Condiciones Generales",
        "contenido_template": CONTENIDO_CANONICO_CONDICIONES_GENERALES,
        "es_editable_en_contrato": True,
        "es_obligatoria": True,
    },
]


# ── VENTA ─────────────────────────────────────────────────────────────────────

TITULO_VENTA = "CONTRATO DE VENTA DE EQUIPOS Y SERVICIOS"

SECCIONES_VENTA = [
    {
        "orden": 1,
        "tipo": "clausula",
        "titulo": "SEGUNDO: Precio y Condiciones de Pago",
        "contenido_template": (
            "El precio total de la venta asciende a [cotizaciones_totales_convertidos], "
            "de acuerdo al detalle de las cotizaciones vinculadas.\n\n"
            "[cotizaciones_tabla]\n\n"
            "La forma de pago será: [forma_pago_venta].\n\n"
            "Condiciones de cuotas e hitos de pago: [cuotas_venta_tabla]\n\n"
            "El no pago en los plazos establecidos facultará a EL VENDEDOR a "
            "suspender la entrega y cobrar intereses moratorios conforme a "
            "la legislación vigente."
        ),
        "es_editable_en_contrato": True,
        "es_obligatoria": True,
    },
    {
        "orden": 2,
        "tipo": "condiciones_generales",
        "titulo": "Condiciones Generales",
        "contenido_template": CONTENIDO_CANONICO_CONDICIONES_GENERALES,
        "es_editable_en_contrato": True,
        "es_obligatoria": True,
    },
]


# ── Mapa tipo → (titulo, secciones, descripcion) ─────────────────────────────

_TIPOS = {
    "servicios": (
        TITULO_SERVICIOS,
        SECCIONES_SERVICIOS,
        "Plantilla base de contrato de servicios tecnológicos y asesorías generada por seed.",
    ),
    "licencia": (
        TITULO_LICENCIA,
        SECCIONES_LICENCIA,
        "Plantilla base de contrato de licenciamiento de software generada por seed.",
    ),
    "venta": (
        TITULO_VENTA,
        SECCIONES_VENTA,
        "Plantilla base de contrato de venta de equipos y servicios generada por seed.",
    ),
}


class Command(BaseCommand):
    help = (
        "Crea las plantillas default de contratos (servicios, licencia, venta) "
        "para una o todas las empresas (idempotente)."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--empresa_id",
            type=int,
            required=False,
            default=None,
            help="(Opcional) ID de empresa. Si se omite, itera todas las empresas.",
        )
        parser.add_argument(
            "--tipo",
            choices=list(_TIPOS.keys()),
            required=False,
            default=None,
            help="(Opcional) Tipo de contrato a crear. Si se omite, crea los 3.",
        )

    def handle(self, *args, **options):
        empresa_id = options["empresa_id"]
        tipo_filtro = options["tipo"]

        if empresa_id:
            try:
                empresas = [Empresa.objects.get(pk=empresa_id)]
            except Empresa.DoesNotExist:
                self.stderr.write(
                    self.style.ERROR(f"Empresa con id={empresa_id} no existe.")
                )
                return
        else:
            empresas = list(Empresa.objects.all())

        tipos_a_crear = [tipo_filtro] if tipo_filtro else list(_TIPOS.keys())

        total_creadas = 0
        total_existentes = 0

        for empresa in empresas:
            self.stdout.write(f"\n{empresa.nombre}:")
            for tipo in tipos_a_crear:
                titulo, secciones, descripcion = _TIPOS[tipo]

                existente = PlantillaContrato.objects.filter(
                    empresa_prestadora=empresa,
                    tipo_contrato=tipo,
                    titulo=titulo,
                ).first()

                if existente:
                    total_existentes += 1
                    self.stdout.write(
                        f"  [=] {tipo}: ya existe (id={existente.id})."
                    )
                    continue

                with transaction.atomic():
                    plantilla = PlantillaContrato.objects.create(
                        empresa_prestadora=empresa,
                        titulo=titulo,
                        descripcion=descripcion,
                        tipo_contrato=tipo,
                        es_default=True,
                        activa=True,
                        version=1,
                    )
                    for sec in secciones:
                        SeccionPlantilla.objects.create(
                            plantilla=plantilla,
                            titulo=sec["titulo"],
                            tipo=sec["tipo"],
                            contenido_template=sec["contenido_template"],
                            orden=sec["orden"],
                            es_obligatoria=sec["es_obligatoria"],
                            es_editable_en_contrato=sec["es_editable_en_contrato"],
                        )

                total_creadas += 1
                self.stdout.write(
                    self.style.SUCCESS(
                        f"  [+] {tipo}: creada (id={plantilla.id}, "
                        f"{len(secciones)} secciones)."
                    )
                )

        self.stdout.write(
            f"\nResumen: {total_creadas} creadas, {total_existentes} ya existentes."
        )
