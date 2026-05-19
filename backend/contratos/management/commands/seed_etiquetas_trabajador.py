"""
Seed idempotente de etiquetas globales para contratos laborales.

Cada etiqueta mapea una clave [xxx] (que el operador inserta en el editor de
plantillas) a una ruta `origen_dato` que el ``AdaptadorContratoTrabajador``
resuelve en tiempo de generacion del PDF/secciones (motor v2).

Las etiquetas se crean con ``empresa_prestadora=None`` (globales). Las
empresas pueden override creando etiquetas con la misma clave y su FK
``empresa_prestadora``.
"""

from django.core.management.base import BaseCommand

from contratos.models import EtiquetaPlantilla
from empresas.models import Empresa


ETIQUETAS_TRABAJADOR = [
    # --- Empresa empleadora ---
    {"clave": "nombre_empresa", "nombre_display": "Nombre empresa empleadora",
     "categoria": "trabajador", "origen_dato": "empresa.nombre"},
    {"clave": "rut_empresa", "nombre_display": "RUT empresa empleadora",
     "categoria": "trabajador", "origen_dato": "empresa.rut_empresa"},
    {"clave": "domicilio_empresa", "nombre_display": "Domicilio empresa",
     "categoria": "trabajador", "origen_dato": "empresa.direccion_principal"},
    {"clave": "representante_legal", "nombre_display": "Representante legal",
     "categoria": "trabajador", "origen_dato": "empresa.representante_legal"},
    {"clave": "rut_representante", "nombre_display": "RUT representante legal",
     "categoria": "trabajador", "origen_dato": "empresa.rut_representante"},

    # --- Trabajador ---
    {"clave": "nombre_trabajador", "nombre_display": "Nombre trabajador",
     "categoria": "trabajador", "origen_dato": "trabajador.nombre_completo"},
    {"clave": "rut_trabajador", "nombre_display": "RUT trabajador",
     "categoria": "trabajador", "origen_dato": "trabajador.rut"},
    {"clave": "email_trabajador", "nombre_display": "Email trabajador",
     "categoria": "trabajador", "origen_dato": "trabajador.email"},
    {"clave": "domicilio_trabajador", "nombre_display": "Domicilio trabajador",
     "categoria": "trabajador", "origen_dato": "trabajador.direccion"},
    {"clave": "nacionalidad", "nombre_display": "Nacionalidad",
     "categoria": "trabajador", "origen_dato": "trabajador.nacionalidad"},
    {"clave": "fecha_nacimiento", "nombre_display": "Fecha de nacimiento",
     "categoria": "trabajador", "origen_dato": "trabajador.fecha_nacimiento"},
    {"clave": "estado_civil", "nombre_display": "Estado civil",
     "categoria": "trabajador", "origen_dato": "trabajador.estado_civil"},
    {"clave": "celular_trabajador", "nombre_display": "Celular trabajador",
     "categoria": "trabajador", "origen_dato": "trabajador.celular"},

    # --- Cargo y funciones ---
    {"clave": "cargo", "nombre_display": "Cargo",
     "categoria": "trabajador", "origen_dato": "contrato.cargo"},
    {"clave": "funciones", "nombre_display": "Funciones",
     "categoria": "trabajador", "origen_dato": "contrato.funciones"},
    {"clave": "lugar_trabajo", "nombre_display": "Lugar de trabajo",
     "categoria": "trabajador", "origen_dato": "contrato.lugar_trabajo"},

    # --- Jornada ---
    {"clave": "tipo_contrato_label", "nombre_display": "Tipo de contrato",
     "categoria": "trabajador", "origen_dato": "contrato.tipo_contrato"},
    {"clave": "jornada_label", "nombre_display": "Jornada",
     "categoria": "trabajador", "origen_dato": "contrato.jornada"},
    {"clave": "horas_semanales", "nombre_display": "Horas semanales",
     "categoria": "trabajador", "origen_dato": "contrato.horas_semanales"},
    {"clave": "horario_detalle", "nombre_display": "Detalle de horario",
     "categoria": "trabajador", "origen_dato": "contrato.horario_detalle"},
    {"clave": "tiempo_colacion", "nombre_display": "Minutos de colacion",
     "categoria": "trabajador", "origen_dato": "contrato.tiempo_colacion"},

    # --- Vigencia ---
    {"clave": "fecha_inicio", "nombre_display": "Fecha de inicio",
     "categoria": "trabajador", "origen_dato": "contrato.fecha_inicio"},
    {"clave": "fecha_termino", "nombre_display": "Fecha de termino",
     "categoria": "trabajador", "origen_dato": "contrato.fecha_termino"},

    # --- Remuneracion ---
    {"clave": "sueldo_base", "nombre_display": "Sueldo bruto",
     "categoria": "trabajador", "origen_dato": "remuneracion.sueldo_base"},
    {"clave": "sueldo_liquido", "nombre_display": "Sueldo liquido",
     "categoria": "trabajador", "origen_dato": "remuneracion.sueldo_liquido"},
    {"clave": "sueldo_liquido_palabras", "nombre_display": "Sueldo liquido en palabras",
     "categoria": "trabajador", "origen_dato": "remuneracion.sueldo_liquido_palabras"},
    {"clave": "moneda", "nombre_display": "Moneda",
     "categoria": "trabajador", "origen_dato": "remuneracion.moneda"},
    {"clave": "bono_movilizacion", "nombre_display": "Bono movilizacion",
     "categoria": "trabajador", "origen_dato": "remuneracion.bono_movilizacion"},
    {"clave": "bono_colacion", "nombre_display": "Bono colacion",
     "categoria": "trabajador", "origen_dato": "remuneracion.bono_colacion"},
    {"clave": "gratificacion_legal", "nombre_display": "Gratificacion legal",
     "categoria": "trabajador", "origen_dato": "remuneracion.gratificacion_legal"},

    # --- Prevision ---
    {"clave": "afp", "nombre_display": "AFP",
     "categoria": "trabajador", "origen_dato": "prevision.afp"},
    {"clave": "sistema_salud", "nombre_display": "Sistema de salud",
     "categoria": "trabajador", "origen_dato": "prevision.sistema_salud"},
    {"clave": "nombre_isapre", "nombre_display": "Nombre Isapre",
     "categoria": "trabajador", "origen_dato": "prevision.nombre_isapre"},
    {"clave": "banco", "nombre_display": "Banco",
     "categoria": "trabajador", "origen_dato": "prevision.banco"},
    {"clave": "tipo_cuenta", "nombre_display": "Tipo de cuenta bancaria",
     "categoria": "trabajador", "origen_dato": "prevision.tipo_cuenta"},
    {"clave": "numero_cuenta", "nombre_display": "Numero de cuenta bancaria",
     "categoria": "trabajador", "origen_dato": "prevision.numero_cuenta"},

    # --- Firma ---
    {"clave": "lugar_firma", "nombre_display": "Lugar de firma",
     "categoria": "trabajador", "origen_dato": "firma.lugar_firma"},
    {"clave": "fecha_firma", "nombre_display": "Fecha de firma",
     "categoria": "trabajador", "origen_dato": "firma.fecha_firma"},
]


class Command(BaseCommand):
    help = (
        "Crea etiquetas predefinidas para contratos laborales (trabajador). "
        "Por defecto las crea como globales (empresa_prestadora=None). "
        "Use --empresa_id para crearlas asociadas a una empresa especifica."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--empresa_id", type=int, required=False, default=None,
            help="(Opcional) ID de empresa. Si se omite, crea etiquetas globales.",
        )

    def handle(self, *args, **options):
        empresa_id = options["empresa_id"]
        empresa = None
        if empresa_id:
            try:
                empresa = Empresa.objects.get(pk=empresa_id)
            except Empresa.DoesNotExist:
                self.stderr.write(self.style.ERROR(
                    f"Empresa con id={empresa_id} no existe."
                ))
                return

        creadas = 0
        existentes = 0
        for etiqueta_data in ETIQUETAS_TRABAJADOR:
            _, created = EtiquetaPlantilla.objects.get_or_create(
                empresa_prestadora=empresa,
                clave=etiqueta_data["clave"],
                defaults={
                    "nombre_display": etiqueta_data["nombre_display"],
                    "categoria": etiqueta_data["categoria"],
                    "origen_dato": etiqueta_data["origen_dato"],
                },
            )
            if created:
                creadas += 1
            else:
                existentes += 1

        scope = f"Empresa '{empresa.nombre}'" if empresa else "Globales"
        self.stdout.write(self.style.SUCCESS(
            f"Etiquetas trabajador ({scope}): "
            f"{creadas} creadas, {existentes} ya existian "
            f"(total definidas: {len(ETIQUETAS_TRABAJADOR)})."
        ))
