"""
Seed idempotente de etiquetas globales para contratos laborales.

Cada etiqueta mapea una clave [xxx] (que el operador inserta en el editor de
plantillas) a una ruta `origen_dato` que el ``AdaptadorContratoTrabajador``
resuelve en tiempo de generacion del PDF/secciones (motor v2).

Las etiquetas se crean con ``empresa_prestadora=None`` (globales). Las
empresas pueden override creando etiquetas con la misma clave y su FK
``empresa_prestadora``.

Usa ``update_or_create`` para ser idempotente: reruns actualizan campos
existentes (incluyendo ``tipo_contrato`` agregado en migracion 0068).
"""

from django.core.management.base import BaseCommand

from contratos.models import EtiquetaPlantilla
from empresas.models import Empresa


ETIQUETAS_TRABAJADOR = [
    # --- Empresa empleadora ---
    {"clave": "nombre_empresa",       "nombre_display": "Nombre empresa empleadora",      "categoria": "trabajador", "tipo_contrato": "trabajador", "origen_dato": "empresa.nombre"},
    {"clave": "rut_empresa",          "nombre_display": "RUT empresa empleadora",          "categoria": "trabajador", "tipo_contrato": "trabajador", "origen_dato": "empresa.rut_empresa"},
    {"clave": "domicilio_empresa",    "nombre_display": "Domicilio empresa",               "categoria": "trabajador", "tipo_contrato": "trabajador", "origen_dato": "empresa.direccion_principal"},
    {"clave": "representante_legal",  "nombre_display": "Representante legal",             "categoria": "trabajador", "tipo_contrato": "trabajador", "origen_dato": "empresa.representante_legal"},
    {"clave": "rut_representante",    "nombre_display": "RUT representante legal",         "categoria": "trabajador", "tipo_contrato": "trabajador", "origen_dato": "empresa.rut_representante"},

    # --- Trabajador ---
    {"clave": "nombre_trabajador",    "nombre_display": "Nombre completo trabajador",      "categoria": "trabajador", "tipo_contrato": "trabajador", "origen_dato": "trabajador.nombre_completo"},
    {"clave": "rut_trabajador",       "nombre_display": "RUT trabajador",                  "categoria": "trabajador", "tipo_contrato": "trabajador", "origen_dato": "trabajador.rut"},
    {"clave": "email_trabajador",     "nombre_display": "Email trabajador",                "categoria": "trabajador", "tipo_contrato": "trabajador", "origen_dato": "trabajador.email"},
    {"clave": "domicilio_trabajador", "nombre_display": "Domicilio trabajador",            "categoria": "trabajador", "tipo_contrato": "trabajador", "origen_dato": "trabajador.direccion"},
    {"clave": "nacionalidad",         "nombre_display": "Nacionalidad",                    "categoria": "trabajador", "tipo_contrato": "trabajador", "origen_dato": "trabajador.nacionalidad"},
    {"clave": "fecha_nacimiento",     "nombre_display": "Fecha de nacimiento",             "categoria": "trabajador", "tipo_contrato": "trabajador", "origen_dato": "trabajador.fecha_nacimiento"},
    {"clave": "estado_civil",         "nombre_display": "Estado civil",                    "categoria": "trabajador", "tipo_contrato": "trabajador", "origen_dato": "trabajador.estado_civil"},
    {"clave": "celular_trabajador",   "nombre_display": "Celular trabajador",              "categoria": "trabajador", "tipo_contrato": "trabajador", "origen_dato": "trabajador.celular"},

    # --- Cargo y funciones ---
    {"clave": "cargo",                "nombre_display": "Cargo",                           "categoria": "trabajador", "tipo_contrato": "trabajador", "origen_dato": "contrato.cargo"},
    {"clave": "funciones",            "nombre_display": "Funciones",                       "categoria": "trabajador", "tipo_contrato": "trabajador", "origen_dato": "contrato.funciones"},
    {"clave": "lugar_trabajo",        "nombre_display": "Lugar de trabajo",                "categoria": "trabajador", "tipo_contrato": "trabajador", "origen_dato": "contrato.lugar_trabajo"},

    # --- Jornada ---
    {"clave": "tipo_contrato_label",  "nombre_display": "Tipo de contrato",                "categoria": "trabajador", "tipo_contrato": "trabajador", "origen_dato": "contrato.tipo_contrato"},
    {"clave": "jornada_label",        "nombre_display": "Jornada",                         "categoria": "trabajador", "tipo_contrato": "trabajador", "origen_dato": "contrato.jornada"},
    {"clave": "horas_semanales",      "nombre_display": "Horas semanales",                 "categoria": "trabajador", "tipo_contrato": "trabajador", "origen_dato": "contrato.horas_semanales"},
    {"clave": "horario_detalle",      "nombre_display": "Detalle de horario",              "categoria": "trabajador", "tipo_contrato": "trabajador", "origen_dato": "contrato.horario_detalle"},
    {"clave": "tiempo_colacion",      "nombre_display": "Minutos de colacion",             "categoria": "trabajador", "tipo_contrato": "trabajador", "origen_dato": "contrato.tiempo_colacion"},

    # --- Grupo de turnos (snapshot) ---
    {"clave": "grupo_turno_nombre",   "nombre_display": "Nombre del grupo de turnos",      "categoria": "trabajador", "tipo_contrato": "trabajador", "origen_dato": "jornada.grupo_nombre"},
    {"clave": "grupo_turno_ciclo",    "nombre_display": "Ciclo de rotacion",               "categoria": "trabajador", "tipo_contrato": "trabajador", "origen_dato": "jornada.ciclo"},
    {"clave": "grupo_turno_slots",    "nombre_display": "Tabla de slots del grupo",        "categoria": "trabajador", "tipo_contrato": "trabajador", "origen_dato": "jornada.tabla_slots"},

    # --- Vigencia ---
    {"clave": "fecha_inicio",         "nombre_display": "Fecha de inicio",                 "categoria": "trabajador", "tipo_contrato": "trabajador", "origen_dato": "contrato.fecha_inicio"},
    {"clave": "fecha_termino",        "nombre_display": "Fecha de termino",                "categoria": "trabajador", "tipo_contrato": "trabajador", "origen_dato": "contrato.fecha_termino"},

    # --- Remuneracion ---
    {"clave": "sueldo_base",             "nombre_display": "Sueldo bruto",                     "categoria": "trabajador", "tipo_contrato": "trabajador", "origen_dato": "remuneracion.sueldo_base"},
    {"clave": "sueldo_liquido",          "nombre_display": "Sueldo liquido",                   "categoria": "trabajador", "tipo_contrato": "trabajador", "origen_dato": "remuneracion.sueldo_liquido"},
    {"clave": "sueldo_liquido_palabras", "nombre_display": "Sueldo liquido en palabras",        "categoria": "trabajador", "tipo_contrato": "trabajador", "origen_dato": "remuneracion.sueldo_liquido_palabras"},
    {"clave": "moneda",                  "nombre_display": "Moneda",                            "categoria": "trabajador", "tipo_contrato": "trabajador", "origen_dato": "remuneracion.moneda"},
    {"clave": "bono_movilizacion",       "nombre_display": "Bono movilizacion",                "categoria": "trabajador", "tipo_contrato": "trabajador", "origen_dato": "remuneracion.bono_movilizacion"},
    {"clave": "bono_colacion",           "nombre_display": "Bono colacion",                    "categoria": "trabajador", "tipo_contrato": "trabajador", "origen_dato": "remuneracion.bono_colacion"},
    {"clave": "gratificacion_legal",     "nombre_display": "Gratificacion legal",               "categoria": "trabajador", "tipo_contrato": "trabajador", "origen_dato": "remuneracion.gratificacion_legal"},
    {"clave": "tipo_gratificacion",      "nombre_display": "Tipo de gratificacion",             "categoria": "trabajador", "tipo_contrato": "trabajador", "origen_dato": "remuneracion.tipo_gratificacion"},

    # --- Prevision ---
    {"clave": "afp",                  "nombre_display": "AFP",                             "categoria": "trabajador", "tipo_contrato": "trabajador", "origen_dato": "prevision.afp"},
    {"clave": "sistema_salud",        "nombre_display": "Sistema de salud",                "categoria": "trabajador", "tipo_contrato": "trabajador", "origen_dato": "prevision.sistema_salud"},
    {"clave": "nombre_isapre",        "nombre_display": "Nombre Isapre",                   "categoria": "trabajador", "tipo_contrato": "trabajador", "origen_dato": "prevision.nombre_isapre"},
    {"clave": "banco",                "nombre_display": "Banco",                           "categoria": "trabajador", "tipo_contrato": "trabajador", "origen_dato": "prevision.banco"},
    {"clave": "tipo_cuenta",          "nombre_display": "Tipo de cuenta bancaria",         "categoria": "trabajador", "tipo_contrato": "trabajador", "origen_dato": "prevision.tipo_cuenta"},
    {"clave": "numero_cuenta",        "nombre_display": "Numero de cuenta bancaria",       "categoria": "trabajador", "tipo_contrato": "trabajador", "origen_dato": "prevision.numero_cuenta"},

    # --- Firma ---
    {"clave": "lugar_firma",          "nombre_display": "Lugar de firma",                  "categoria": "trabajador", "tipo_contrato": "trabajador", "origen_dato": "firma.lugar_firma"},
    {"clave": "fecha_firma",          "nombre_display": "Fecha de firma",                  "categoria": "trabajador", "tipo_contrato": "trabajador", "origen_dato": "firma.fecha_firma"},

    # --- Jornada fija ---
    {"clave": "hora_inicio",          "nombre_display": "Hora de inicio de jornada",       "categoria": "trabajador", "tipo_contrato": "trabajador", "origen_dato": "contrato.hora_inicio"},
    {"clave": "hora_fin",             "nombre_display": "Hora de fin de jornada",          "categoria": "trabajador", "tipo_contrato": "trabajador", "origen_dato": "contrato.hora_fin"},
    {"clave": "jornada_descripcion",  "nombre_display": "Descripcion completa de la jornada", "categoria": "trabajador", "tipo_contrato": "trabajador", "origen_dato": "contrato.jornada_descripcion"},

    # --- Vigencia y tipo de contrato ---
    {"clave": "vigencia_descripcion", "nombre_display": "Descripcion de vigencia del contrato", "categoria": "trabajador", "tipo_contrato": "trabajador", "origen_dato": "contrato.vigencia_descripcion"},
    {"clave": "cantidad_meses",       "nombre_display": "Duracion en meses (plazo fijo)",  "categoria": "trabajador", "tipo_contrato": "trabajador", "origen_dato": "contrato.cantidad_meses"},

    # --- Reemplazo ---
    {"clave": "causal_reemplazo_label", "nombre_display": "Causal de reemplazo (texto)",  "categoria": "trabajador", "tipo_contrato": "trabajador", "origen_dato": "contrato.causal_reemplazo_label"},
    {"clave": "nombre_reemplazado",   "nombre_display": "Nombre del trabajador reemplazado", "categoria": "trabajador", "tipo_contrato": "trabajador", "origen_dato": "contrato.nombre_reemplazado"},
    {"clave": "rut_reemplazado",      "nombre_display": "RUT del trabajador reemplazado", "categoria": "trabajador", "tipo_contrato": "trabajador", "origen_dato": "contrato.rut_reemplazado"},

    # --- Remuneracion ampliada ---
    {"clave": "tipo_sueldo_label",         "nombre_display": "Tipo de sueldo (texto)",            "categoria": "trabajador", "tipo_contrato": "trabajador", "origen_dato": "remuneracion.tipo_sueldo_label"},
    {"clave": "tiene_bono_movilizacion",   "nombre_display": "Tiene bono de movilizacion (Si/No)", "categoria": "trabajador", "tipo_contrato": "trabajador", "origen_dato": "remuneracion.tiene_bono_movilizacion"},
    {"clave": "tiene_bono_colacion",       "nombre_display": "Tiene bono de colacion (Si/No)",    "categoria": "trabajador", "tipo_contrato": "trabajador", "origen_dato": "remuneracion.tiene_bono_colacion"},
    {"clave": "gratificacion_descripcion", "nombre_display": "Texto legal de la gratificacion",   "categoria": "trabajador", "tipo_contrato": "trabajador", "origen_dato": "remuneracion.gratificacion_descripcion"},
    {"clave": "sueldo_base_palabras",      "nombre_display": "Sueldo base en palabras",           "categoria": "trabajador", "tipo_contrato": "trabajador", "origen_dato": "remuneracion.sueldo_base_palabras"},

    # --- Prevision ampliada ---
    {"clave": "salud_descripcion",    "nombre_display": "Sistema de salud (texto completo)", "categoria": "trabajador", "tipo_contrato": "trabajador", "origen_dato": "prevision.salud_descripcion"},

    # --- Trabajador — Art. 10 CT ---
    {"clave": "profesion_u_oficio",   "nombre_display": "Profesion u oficio",              "categoria": "trabajador", "tipo_contrato": "trabajador", "origen_dato": "trabajador.profesion_u_oficio"},
    {"clave": "estado_civil_label",   "nombre_display": "Estado civil (texto)",             "categoria": "trabajador", "tipo_contrato": "trabajador", "origen_dato": "trabajador.estado_civil"},

    # =========================================================================
    # Etiquetas nuevas (v2 expandido)
    # =========================================================================

    # --- Trabajador — datos personales adicionales ---
    {"clave": "segundo_nombre",       "nombre_display": "Segundo nombre",                  "categoria": "trabajador", "tipo_contrato": "trabajador", "origen_dato": "trabajador.segundo_nombre"},
    {"clave": "segundo_apellido",     "nombre_display": "Segundo apellido",                "categoria": "trabajador", "tipo_contrato": "trabajador", "origen_dato": "trabajador.segundo_apellido"},
    {"clave": "nombre_apellido",      "nombre_display": "Nombre y primer apellido",        "categoria": "trabajador", "tipo_contrato": "trabajador", "origen_dato": "trabajador.nombre_apellido"},
    {"clave": "genero",               "nombre_display": "Genero",                          "categoria": "trabajador", "tipo_contrato": "trabajador", "origen_dato": "trabajador.genero"},
    {"clave": "nivel_estudios",       "nombre_display": "Nivel de estudios",               "categoria": "trabajador", "tipo_contrato": "trabajador", "origen_dato": "trabajador.nivel_estudios"},
    {"clave": "titulo_especialidad",  "nombre_display": "Titulo o especialidad",           "categoria": "trabajador", "tipo_contrato": "trabajador", "origen_dato": "trabajador.titulo_especialidad"},

    # --- Empleador — vinculo laboral ---
    {"clave": "fecha_ingreso_empresa", "nombre_display": "Fecha de ingreso a la empresa",  "categoria": "trabajador", "tipo_contrato": "trabajador", "origen_dato": "empleador.fecha_ingreso"},

    # --- Jornada — dias de la semana ---
    {"clave": "dias_semana_texto",    "nombre_display": "Dias trabajados (texto)",         "categoria": "trabajador", "tipo_contrato": "trabajador", "origen_dato": "contrato.dias_semana_texto"},

    # --- Remuneracion — descuentos previsionales ---
    {"clave": "descuento_prevision",  "nombre_display": "Aplica descuento AFP (Si/No)",    "categoria": "trabajador", "tipo_contrato": "trabajador", "origen_dato": "remuneracion.descuento_prevision"},
    {"clave": "descuento_salud",      "nombre_display": "Aplica descuento salud (Si/No)",  "categoria": "trabajador", "tipo_contrato": "trabajador", "origen_dato": "remuneracion.descuento_salud"},

    # --- Contrato — referencia interna ---
    {"clave": "referencia_interna",   "nombre_display": "Referencia interna del contrato", "categoria": "trabajador", "tipo_contrato": "trabajador", "origen_dato": "contrato.referencia_interna"},

    # --- Finiquito (para plantillas tipo finiquito) ---
    {"clave": "finiquito_total_neto",        "nombre_display": "Finiquito: total neto",        "categoria": "trabajador", "tipo_contrato": "trabajador", "origen_dato": "finiquito.total_neto"},
    {"clave": "finiquito_total_bruto",       "nombre_display": "Finiquito: total bruto",       "categoria": "trabajador", "tipo_contrato": "trabajador", "origen_dato": "finiquito.total_bruto"},
    {"clave": "finiquito_total_descuentos",  "nombre_display": "Finiquito: total descuentos",  "categoria": "trabajador", "tipo_contrato": "trabajador", "origen_dato": "finiquito.total_descuentos"},
    {"clave": "finiquito_fecha_firma",       "nombre_display": "Finiquito: fecha de firma",    "categoria": "trabajador", "tipo_contrato": "trabajador", "origen_dato": "finiquito.fecha_firma"},
    {"clave": "finiquito_motivo_termino",    "nombre_display": "Finiquito: motivo de termino", "categoria": "trabajador", "tipo_contrato": "trabajador", "origen_dato": "finiquito.motivo_termino"},
]


class Command(BaseCommand):
    help = (
        "Crea o actualiza etiquetas predefinidas para contratos laborales (trabajador). "
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
        actualizadas = 0
        for etiqueta_data in ETIQUETAS_TRABAJADOR:
            _, created = EtiquetaPlantilla.objects.update_or_create(
                empresa_prestadora=empresa,
                clave=etiqueta_data["clave"],
                defaults={
                    "nombre_display": etiqueta_data["nombre_display"],
                    "categoria":      etiqueta_data["categoria"],
                    "origen_dato":    etiqueta_data["origen_dato"],
                    "tipo_contrato":  etiqueta_data.get("tipo_contrato", "trabajador"),
                },
            )
            if created:
                creadas += 1
            else:
                actualizadas += 1

        scope = f"Empresa '{empresa.nombre}'" if empresa else "Globales"
        self.stdout.write(self.style.SUCCESS(
            f"Etiquetas trabajador ({scope}): "
            f"{creadas} creadas, {actualizadas} actualizadas "
            f"(total definidas: {len(ETIQUETAS_TRABAJADOR)})."
        ))
