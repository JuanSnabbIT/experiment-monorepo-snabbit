from django.core.management.base import BaseCommand
from django.db import transaction

from contratos.models import PlantillaContrato
from contratos.management.commands._v29_seed_helpers import (
    config_pagina_basica,
    documento_desde_secciones_condicionales,
)

PLANTILLAS_LABORALES = [
    {
        "titulo": "Contrato Individual de Trabajo",
        "descripcion": "Plantilla base para contratos individuales de trabajo indefinido.",
        "es_default": True,
        "secciones": [
            {
                "orden": 1,
                "tipo": "encabezado",
                "titulo": "CONTRATO INDIVIDUAL DE TRABAJO",
                "contenido_template": "CONTRATO INDIVIDUAL DE TRABAJO\n\nEntre [nombre_empresa] y [nombre_trabajador]",
                "es_obligatoria": True,
                "es_editable_en_contrato": False,
            },
            {
                "orden": 2,
                "tipo": "clausula",
                "titulo": "PRIMERA: PARTES",
                "contenido_template": "PRIMERA: PARTES\n\nContratante: [nombre_empresa], RUT [rut_empresa]\nContratado: [nombre_trabajador], RUT [rut_trabajador]",
                "es_obligatoria": True,
                "es_editable_en_contrato": False,
            },
            {
                "orden": 3,
                "tipo": "clausula",
                "titulo": "SEGUNDA: FUNCIONES",
                "contenido_template": "SEGUNDA: FUNCIONES\n\nEl trabajador desempeñará el cargo de [nombre_cargo]",
                "es_obligatoria": True,
                "es_editable_en_contrato": True,
            },
            {
                "orden": 4,
                "tipo": "clausula",
                "titulo": "TERCERA: REMUNERACIÓN",
                "contenido_template": "TERCERA: REMUNERACIÓN\n\nSueldo Base: [sueldo_base] [moneda]",
                "es_obligatoria": True,
                "es_editable_en_contrato": True,
            },
            {
                "orden": 5,
                "tipo": "clausula",
                "titulo": "CUARTA: JORNADA",
                "contenido_template": "CUARTA: JORNADA\n\nTipo: [jornada_label]\nHoras Semanales: [horas_semanales]",
                "es_obligatoria": True,
                "es_editable_en_contrato": False,
            },
            {
                "orden": 6,
                "tipo": "firmas",
                "titulo": "FIRMAS",
                "contenido_template": "[firma.trabajador]\n[firma.empleador]",
                "es_obligatoria": True,
                "es_editable_en_contrato": False,
            },
        ],
    },
    {
        "titulo": "Contrato a Plazo Fijo",
        "descripcion": "Plantilla para contratos de duración determinada.",
        "es_default": False,
        "secciones": [
            {
                "orden": 1,
                "tipo": "encabezado",
                "titulo": "CONTRATO DE TRABAJO A PLAZO FIJO",
                "contenido_template": "CONTRATO DE TRABAJO A PLAZO FIJO\n\nEntre [nombre_empresa] y [nombre_trabajador]",
                "es_obligatoria": True,
                "es_editable_en_contrato": False,
            },
            {
                "orden": 2,
                "tipo": "clausula",
                "titulo": "PRIMERA: PARTES",
                "contenido_template": "PRIMERA: PARTES\n\nContratante: [nombre_empresa], RUT [rut_empresa]\nContratado: [nombre_trabajador], RUT [rut_trabajador]",
                "es_obligatoria": True,
                "es_editable_en_contrato": False,
            },
            {
                "orden": 3,
                "tipo": "clausula",
                "titulo": "SEGUNDA: DURACIÓN",
                "contenido_template": "SEGUNDA: DURACIÓN\n\nFecha de Inicio: [fecha_inicio]\nFecha de Término: [fecha_termino]",
                "es_obligatoria": True,
                "es_editable_en_contrato": True,
            },
            {
                "orden": 4,
                "tipo": "clausula",
                "titulo": "TERCERA: FUNCIONES",
                "contenido_template": "TERCERA: FUNCIONES\n\nCargo: [nombre_cargo]",
                "es_obligatoria": True,
                "es_editable_en_contrato": True,
            },
            {
                "orden": 5,
                "tipo": "clausula",
                "titulo": "CUARTA: REMUNERACIÓN",
                "contenido_template": "CUARTA: REMUNERACIÓN\n\nSueldo Base: [sueldo_base] [moneda]",
                "es_obligatoria": True,
                "es_editable_en_contrato": True,
            },
            {
                "orden": 6,
                "tipo": "firmas",
                "titulo": "FIRMAS",
                "contenido_template": "[firma.trabajador]\n[firma.empleador]",
                "es_obligatoria": True,
                "es_editable_en_contrato": False,
            },
        ],
    },
    {
        "titulo": "Contrato de Reemplazo",
        "descripcion": "Plantilla para contratos de reemplazo temporal.",
        "es_default": False,
        "secciones": [
            {
                "orden": 1,
                "tipo": "encabezado",
                "titulo": "CONTRATO DE REEMPLAZO",
                "contenido_template": "CONTRATO DE REEMPLAZO\n\nEntre [nombre_empresa] y [nombre_trabajador]",
                "es_obligatoria": True,
                "es_editable_en_contrato": False,
            },
            {
                "orden": 2,
                "tipo": "clausula",
                "titulo": "PRIMERA: PARTES",
                "contenido_template": "PRIMERA: PARTES\n\nContratante: [nombre_empresa], RUT [rut_empresa]\nContratado (Reemplazo): [nombre_trabajador], RUT [rut_trabajador]\nReemplaza a: [nombre_reemplazado]",
                "es_obligatoria": True,
                "es_editable_en_contrato": False,
            },
            {
                "orden": 3,
                "tipo": "clausula",
                "titulo": "SEGUNDA: CAUSAL",
                "contenido_template": "SEGUNDA: CAUSAL DE REEMPLAZO\n\nCausa: [causal_reemplazo_label]",
                "es_obligatoria": True,
                "es_editable_en_contrato": True,
            },
            {
                "orden": 4,
                "tipo": "clausula",
                "titulo": "TERCERA: FUNCIONES",
                "contenido_template": "TERCERA: FUNCIONES\n\nCargo: [nombre_cargo]\nLugar de trabajo: [lugar_trabajo]",
                "es_obligatoria": True,
                "es_editable_en_contrato": True,
            },
            {
                "orden": 5,
                "tipo": "clausula",
                "titulo": "CUARTA: REMUNERACIÓN",
                "contenido_template": "CUARTA: REMUNERACIÓN\n\nSueldo Base: [sueldo_base] [moneda]",
                "es_obligatoria": True,
                "es_editable_en_contrato": True,
            },
            {
                "orden": 6,
                "tipo": "firmas",
                "titulo": "FIRMAS",
                "contenido_template": "[firma.trabajador]\n[firma.empleador]",
                "es_obligatoria": True,
                "es_editable_en_contrato": False,
            },
        ],
    },
    {
        "titulo": "Anexo de Modificación de Remuneración",
        "descripcion": "Plantilla para anexos de cambio de sueldo o beneficios.",
        "es_default": False,
        "secciones": [
            {
                "orden": 1,
                "tipo": "encabezado",
                "titulo": "ANEXO - MODIFICACIÓN DE REMUNERACIÓN",
                "contenido_template": "ANEXO - MODIFICACIÓN DE REMUNERACIÓN\n\nAl Contrato Individual de Trabajo celebrado entre [nombre_empresa] y [nombre_trabajador]",
                "es_obligatoria": True,
                "es_editable_en_contrato": False,
            },
            {
                "orden": 2,
                "tipo": "clausula",
                "titulo": "PRIMERA: ANTECEDENTES",
                "contenido_template": "PRIMERA: ANTECEDENTES\n\nFecha de contrato original: [fecha_inicio]\nCargo actual: [nombre_cargo]\nSueldo actual: [sueldo_base]",
                "es_obligatoria": True,
                "es_editable_en_contrato": False,
            },
            {
                "orden": 3,
                "tipo": "clausula",
                "titulo": "SEGUNDA: MODIFICACIÓN",
                "contenido_template": "SEGUNDA: MODIFICACIÓN\n\nEl nuevo sueldo base será: [sueldo_base]\nMoneda: [moneda]",
                "es_obligatoria": True,
                "es_editable_en_contrato": True,
            },
            {
                "orden": 4,
                "tipo": "clausula",
                "titulo": "TERCERA: EFECTOS",
                "contenido_template": "TERCERA: EFECTOS\n\nEsta modificación rige a partir de la fecha indicada y en nada altera los demás términos del contrato original.",
                "es_obligatoria": True,
                "es_editable_en_contrato": True,
            },
            {
                "orden": 5,
                "tipo": "firmas",
                "titulo": "FIRMAS",
                "contenido_template": "[firma.trabajador]\n[firma.empleador]",
                "es_obligatoria": True,
                "es_editable_en_contrato": False,
            },
        ],
    },
]


class Command(BaseCommand):
    help = (
        "Resetea las plantillas laborales tipo 'trabajador'. "
        "Elimina todas las plantillas existentes y crea 4 plantillas globales nuevas."
    )

    def handle(self, *args, **options):
        with transaction.atomic():
            self.stdout.write(self.style.WARNING("[1/3] Eliminando plantillas laborales existentes..."))

            plantillas_qs = PlantillaContrato.objects.filter(tipo_contrato="trabajador")
            plantillas_eliminadas = [p.titulo for p in plantillas_qs.order_by("titulo")]
            total_plantillas_eliminadas = plantillas_qs.count()

            plantillas_qs.delete()

            if total_plantillas_eliminadas:
                self.stdout.write(self.style.SUCCESS(
                    f"  Plantillas eliminadas: {total_plantillas_eliminadas}"
                ))
                for titulo in plantillas_eliminadas:
                    self.stdout.write(f"    - {titulo}")
            else:
                self.stdout.write(self.style.WARNING("  No se encontraron plantillas laborales para eliminar."))

            self.stdout.write(self.style.WARNING("[2/3] Creando plantillas laborales globales..."))
            plantillas_creadas = []

            for plantilla_data in PLANTILLAS_LABORALES:
                plantilla = PlantillaContrato.objects.create(
                    empresa_prestadora=None,
                    tipo_contrato="trabajador",
                    titulo=plantilla_data["titulo"],
                    descripcion=plantilla_data["descripcion"],
                    es_default=plantilla_data["es_default"],
                    activa=True,
                    version=1,
                    version_editor="v29",
                    contenido_documento_v29=documento_desde_secciones_condicionales(
                        plantilla_data["secciones"],
                    ),
                    config_pagina_v29=config_pagina_basica(),
                )
                plantillas_creadas.append(plantilla.titulo)

            self.stdout.write(self.style.SUCCESS(
                f"  Plantillas creadas: {len(plantillas_creadas)}"
            ))
            for titulo in plantillas_creadas:
                self.stdout.write(f"    - {titulo}")

            self.stdout.write(self.style.WARNING("[3/3] Verificando estado final..."))
            total_globales = PlantillaContrato.objects.filter(
                tipo_contrato="trabajador",
                empresa_prestadora__isnull=True,
            ).count()
            total_con_empresa = PlantillaContrato.objects.filter(
                tipo_contrato="trabajador",
            ).exclude(empresa_prestadora__isnull=True).count()
            total_trabajador = PlantillaContrato.objects.filter(tipo_contrato="trabajador").count()
            todas_es_global = total_globales == total_trabajador

            self.stdout.write(self.style.SUCCESS(
                f"  Plantillas globales creadas: {total_globales}"
            ))
            self.stdout.write(self.style.SUCCESS(
                f"  Plantillas con empresa: {total_con_empresa}"
            ))
            self.stdout.write(self.style.SUCCESS(
                f"  Todas tienen es_global=True: {todas_es_global}"
            ))

            if total_globales != 4 or total_con_empresa != 0 or not todas_es_global:
                self.stdout.write(self.style.ERROR(
                    "Verificación final falló: el estado de las plantillas laborales no es el esperado."
                ))
