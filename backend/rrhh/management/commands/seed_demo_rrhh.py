from datetime import timedelta
from decimal import Decimal
from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from django.contrib.auth.hashers import make_password

from cuentas.models import User
from core.models import PersonalizacionUsuario
from empresas.models import Empresa, SucursalEmpresa, UsuarioEmpresa
from contratos.models import PlantillaContrato, SeccionPlantilla
from rrhh.models import (
    ContratoTrabajador,
    AfpCatalogo,
    BancoCatalogo,
    CargoCatalogo,
    ConfiguracionLaboral,
)


# Demo empresa y usuario admin
DEMO_EMPRESA_NOMBRE = "Demo RRHH SpA"
DEMO_EMPRESA_DIRECCION = "Av. Demo 123, Santiago, Región Metropolitana"
DEMO_SUCURSAL_NOMBRE = "Casa Matriz"

# Catálogos
AFP_CATALOGOS = [
    "Provida",
    "Habitat",
    "Capital",
    "Cuprum",
    "Modelo",
    "PlanVital",
    "Uno AFP",
]

BANCO_CATALOGOS = [
    "BancoEstado",
    "Santander",
    "BCI",
    "Chile",
    "Itaú",
    "Scotiabank",
    "Security",
    "Bice",
    "Falabella",
    "Ripley",
]

CARGO_CATALOGOS = [
    "Gerente General",
    "Desarrollador de Software",
    "Analista de Sistemas",
    "Diseñador UX",
    "Administrativo",
]

CONFIG_LABORAL = [
    {"clave": "gratificacion_mensual_tope", "valor": Decimal("4.75")},
    {"clave": "jornada_horas_semanales", "valor": Decimal("45")},
]

# Usuarios trabajadores
USUARIOS_TRABAJADORES = [
    {
        "email": "admin@demo.cl",
        "first_name": "Admin",
        "last_name": "Demo",
        "is_staff": True,
        "is_superuser": True,
        "rut": "11111111-1",
        "cargo": "Gerente General",
    },
    {
        "email": "ana.perez@demo.cl",
        "first_name": "Ana",
        "last_name": "Pérez",
        "is_staff": False,
        "is_superuser": False,
        "rut": "22222222-2",
        "cargo": "Desarrollador de Software",
    },
    {
        "email": "juan.soto@demo.cl",
        "first_name": "Juan",
        "last_name": "Soto",
        "is_staff": False,
        "is_superuser": False,
        "rut": "33333333-3",
        "cargo": "Analista de Sistemas",
    },
    {
        "email": "carla.rojas@demo.cl",
        "first_name": "Carla",
        "last_name": "Rojas",
        "is_staff": False,
        "is_superuser": False,
        "rut": "44444444-4",
        "cargo": "Administrativo",
    },
]

PASSWORD_DEMO = "Demo1234!"

# Plantillas de contrato laboral
PLANTILLAS_TRABAJADOR = [
    {
        "titulo": "Contrato Individual de Trabajo",
        "descripcion": "Plantilla base para contratos individuales de trabajo indefinido",
        "es_default": True,
        "secciones": [
            {
                "orden": 1,
                "tipo": "encabezado",
                "titulo": "CONTRATO INDIVIDUAL DE TRABAJO",
                "contenido_template": "CONTRATO INDIVIDUAL DE TRABAJO\n\nEntre [empresa.nombre] y [trabajador.nombre_completo]",
                "es_obligatoria": True,
                "es_editable_en_contrato": False,
            },
            {
                "orden": 2,
                "tipo": "clausula",
                "titulo": "PRIMERA: PARTES",
                "contenido_template": "PRIMERA: PARTES\n\nContratante: [empresa.nombre], RUT [empresa.rut]\nContratado: [trabajador.nombre_completo], RUT [trabajador.rut]\nDomicilio: [trabajador.direccion]",
                "es_obligatoria": True,
                "es_editable_en_contrato": False,
            },
            {
                "orden": 3,
                "tipo": "clausula",
                "titulo": "SEGUNDA: FUNCIONES",
                "contenido_template": "SEGUNDA: FUNCIONES\n\nEl trabajador desempeñará el cargo de [cargo.nombre]",
                "es_obligatoria": True,
                "es_editable_en_contrato": True,
            },
            {
                "orden": 4,
                "tipo": "clausula",
                "titulo": "TERCERA: REMUNERACIÓN",
                "contenido_template": "TERCERA: REMUNERACIÓN\n\nSueldo Base: [remuneracion.sueldo_base] [remuneracion.moneda]",
                "es_obligatoria": True,
                "es_editable_en_contrato": True,
            },
            {
                "orden": 5,
                "tipo": "clausula",
                "titulo": "CUARTA: JORNADA",
                "contenido_template": "CUARTA: JORNADA\n\nTipo: [jornada.tipo]\nHoras Semanales: [jornada.horas_semanales]",
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
        "descripcion": "Plantilla para contratos de duración determinada",
        "es_default": False,
        "secciones": [
            {
                "orden": 1,
                "tipo": "encabezado",
                "titulo": "CONTRATO DE TRABAJO A PLAZO FIJO",
                "contenido_template": "CONTRATO DE TRABAJO A PLAZO FIJO\n\nEntre [empresa.nombre] y [trabajador.nombre_completo]",
                "es_obligatoria": True,
                "es_editable_en_contrato": False,
            },
            {
                "orden": 2,
                "tipo": "clausula",
                "titulo": "PRIMERA: PARTES",
                "contenido_template": "PRIMERA: PARTES\n\nContratante: [empresa.nombre], RUT [empresa.rut]\nContratado: [trabajador.nombre_completo], RUT [trabajador.rut]",
                "es_obligatoria": True,
                "es_editable_en_contrato": False,
            },
            {
                "orden": 3,
                "tipo": "clausula",
                "titulo": "SEGUNDA: DURACIÓN",
                "contenido_template": "SEGUNDA: DURACIÓN\n\nFecha de Inicio: [contrato.fecha_inicio]\nFecha de Término: [contrato.fecha_termino]\nDuración aproximada: [contrato.cantidad_meses] meses",
                "es_obligatoria": True,
                "es_editable_en_contrato": True,
            },
            {
                "orden": 4,
                "tipo": "clausula",
                "titulo": "TERCERA: FUNCIONES",
                "contenido_template": "TERCERA: FUNCIONES\n\nCargo: [cargo.nombre]",
                "es_obligatoria": True,
                "es_editable_en_contrato": True,
            },
            {
                "orden": 5,
                "tipo": "clausula",
                "titulo": "CUARTA: REMUNERACIÓN",
                "contenido_template": "CUARTA: REMUNERACIÓN\n\nSueldo Base: [remuneracion.sueldo_base] [remuneracion.moneda]",
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
        "descripcion": "Plantilla para contratos de reemplazo temporal",
        "es_default": False,
        "secciones": [
            {
                "orden": 1,
                "tipo": "encabezado",
                "titulo": "CONTRATO DE REEMPLAZO",
                "contenido_template": "CONTRATO DE REEMPLAZO\n\nEntre [empresa.nombre] y [trabajador.nombre_completo]",
                "es_obligatoria": True,
                "es_editable_en_contrato": False,
            },
            {
                "orden": 2,
                "tipo": "clausula",
                "titulo": "PRIMERA: PARTES",
                "contenido_template": "PRIMERA: PARTES\n\nContratante: [empresa.nombre], RUT [empresa.rut]\nContratado (Reemplazo): [trabajador.nombre_completo], RUT [trabajador.rut]\nReemplaza a: [trabajador_reemplazado.nombre_completo]",
                "es_obligatoria": True,
                "es_editable_en_contrato": False,
            },
            {
                "orden": 3,
                "tipo": "clausula",
                "titulo": "SEGUNDA: CAUSAL",
                "contenido_template": "SEGUNDA: CAUSAL DE REEMPLAZO\n\nCausa: [reemplazo.causal]\nDuración estimada: [contrato.cantidad_meses] meses",
                "es_obligatoria": True,
                "es_editable_en_contrato": True,
            },
            {
                "orden": 4,
                "tipo": "clausula",
                "titulo": "TERCERA: FUNCIONES",
                "contenido_template": "TERCERA: FUNCIONES\n\nCargo: [cargo.nombre]\nLugar de trabajo: [contrato.lugar_trabajo]",
                "es_obligatoria": True,
                "es_editable_en_contrato": True,
            },
            {
                "orden": 5,
                "tipo": "clausula",
                "titulo": "CUARTA: REMUNERACIÓN",
                "contenido_template": "CUARTA: REMUNERACIÓN\n\nSueldo Base: [remuneracion.sueldo_base] [remuneracion.moneda]",
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
        "descripcion": "Plantilla para anexos de cambio de sueldo o beneficios",
        "es_default": False,
        "secciones": [
            {
                "orden": 1,
                "tipo": "encabezado",
                "titulo": "ANEXO - MODIFICACIÓN DE REMUNERACIÓN",
                "contenido_template": "ANEXO - MODIFICACIÓN DE REMUNERACIÓN\n\nAl Contrato Individual de Trabajo celebrado entre [empresa.nombre] y [trabajador.nombre_completo]",
                "es_obligatoria": True,
                "es_editable_en_contrato": False,
            },
            {
                "orden": 2,
                "tipo": "clausula",
                "titulo": "PRIMERA: ANTECEDENTES",
                "contenido_template": "PRIMERA: ANTECEDENTES\n\nFecha de contrato original: [contrato.fecha_inicio]\nCargo actual: [cargo.nombre]\nSueldo actual: [remuneracion.sueldo_base_anterior]",
                "es_obligatoria": True,
                "es_editable_en_contrato": False,
            },
            {
                "orden": 3,
                "tipo": "clausula",
                "titulo": "SEGUNDA: MODIFICACIÓN",
                "contenido_template": "SEGUNDA: MODIFICACIÓN\n\nA partir de [anexo.fecha_efectiva], el nuevo sueldo base será: [remuneracion.sueldo_base_nuevo]\nMoneda: [remuneracion.moneda]",
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
    help = "Seed demo data for RRHH module: empresa, usuarios, catálogos, plantilla, y contratos de prueba."

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Elimina empresa demo y todos sus datos antes de recrear (usa con cuidado)",
        )

    def handle(self, *args, **options):
        reset = options.get("reset", False)

        with transaction.atomic():
            # Paso 0: Catálogos globales
            self.stdout.write(self.style.WARNING("Paso 0: Poblando catálogos globales..."))
            call_command("seed_turnos_globales")
            call_command("seed_etiquetas_trabajador")
            call_command("seed_bloques_transversales")

            # Paso 1: Empresa y Sucursal
            self.stdout.write(self.style.WARNING("Paso 1: Creando empresa y sucursal..."))
            empresa, empresa_creada = Empresa.objects.get_or_create(
                nombre=DEMO_EMPRESA_NOMBRE,
                defaults={"direccion_principal": DEMO_EMPRESA_DIRECCION},
            )
            if empresa_creada:
                self.stdout.write(
                    self.style.SUCCESS(
                        f"  [OK] Empresa '{empresa.nombre}' creada"
                    )
                )
            else:
                self.stdout.write(
                    self.style.SUCCESS(
                        f"  [OK] Empresa '{empresa.nombre}' ya existe"
                    )
                )

            sucursal, sucursal_creada = SucursalEmpresa.objects.get_or_create(
                empresa=empresa,
                nombre=DEMO_SUCURSAL_NOMBRE,
            )
            if sucursal_creada:
                self.stdout.write(self.style.SUCCESS(f"  [OK] Sucursal '{sucursal.nombre}' creada"))
            else:
                self.stdout.write(self.style.SUCCESS(f"  [OK] Sucursal '{sucursal.nombre}' ya existe"))

            # Paso 2: Plantillas de contrato por defecto para la empresa demo
            self.stdout.write(self.style.WARNING("Paso 2: Creando plantillas de contrato por defecto para la empresa demo..."))
            call_command("seed_plantillas_default", empresa_id=empresa.id)

            # Paso 3: Catálogos por empresa
            self.stdout.write(self.style.WARNING("Paso 3: Poblando catálogos por empresa..."))

            # AFP
            afp_creadas = 0
            for afp_nombre in AFP_CATALOGOS:
                _, creada = AfpCatalogo.objects.get_or_create(
                    nombre=afp_nombre,
                    empresa=None,
                )
                if creada:
                    afp_creadas += 1
            self.stdout.write(self.style.SUCCESS(f"  [OK] AFP: {afp_creadas} creadas"))

            # Bancos
            banco_creados = 0
            for banco_nombre in BANCO_CATALOGOS:
                _, creado = BancoCatalogo.objects.get_or_create(
                    nombre=banco_nombre,
                    empresa=None,
                )
                if creado:
                    banco_creados += 1
            self.stdout.write(self.style.SUCCESS(f"  [OK] Bancos: {banco_creados} creados"))

            # Cargos por empresa
            cargo_creados = 0
            for cargo_nombre in CARGO_CATALOGOS:
                _, creado = CargoCatalogo.objects.get_or_create(
                    empresa=empresa,
                    nombre=cargo_nombre,
                )
                if creado:
                    cargo_creados += 1
            self.stdout.write(
                self.style.SUCCESS(f"  [OK] Cargos ({empresa.nombre}): {cargo_creados} creados")
            )

            # Configuración laboral
            config_creadas = 0
            for config_data in CONFIG_LABORAL:
                _, creada = ConfiguracionLaboral.objects.get_or_create(
                    empresa=empresa,
                    clave=config_data["clave"],
                    defaults={"valor": config_data["valor"]},
                )
                if creada:
                    config_creadas += 1
            self.stdout.write(
                self.style.SUCCESS(f"  [OK] Configuración laboral: {config_creadas} creada")
            )

            # Paso 3: Usuarios trabajadores
            self.stdout.write(self.style.WARNING("Paso 3: Creando usuarios trabajadores..."))
            usuarios_creados = 0
            for user_data in USUARIOS_TRABAJADORES:
                email = user_data.pop("email")
                rut = user_data.pop("rut")
                cargo_nombre = user_data.pop("cargo")

                user, user_creado = User.objects.get_or_create(
                    email=email,
                    defaults={
                        "password": make_password(PASSWORD_DEMO),
                        **user_data,
                    },
                )
                if user_creado:
                    usuarios_creados += 1
                    self.stdout.write(self.style.SUCCESS(f"    [OK] User '{email}' creado"))

                # UsuarioEmpresa
                usuario_empresa, ue_creado = UsuarioEmpresa.objects.get_or_create(
                    usuario=user,
                    defaults={
                        "sucursal": sucursal,
                        "cargo": cargo_nombre,
                        "rut": rut,
                    },
                )

                # PersonalizacionUsuario (actualizar sucursal_principal si no existe)
                personalizacion, _ = PersonalizacionUsuario.objects.get_or_create(
                    usuario=user,
                    defaults={"sucursal_principal": sucursal},
                )
                if personalizacion.sucursal_principal is None:
                    personalizacion.sucursal_principal = sucursal
                    personalizacion.save()

            self.stdout.write(self.style.SUCCESS(f"  [OK] Usuarios: {usuarios_creados} creados"))

            # Paso 4: Plantillas globales tipo='trabajador'
            self.stdout.write(self.style.WARNING("Paso 4: Creando plantillas laborales globales..."))

            plantillas_creadas = 0
            plantilla_default = None

            for plantilla_data in PLANTILLAS_TRABAJADOR:
                titulo = plantilla_data["titulo"]
                secciones_data = plantilla_data["secciones"]
                es_default = plantilla_data.get("es_default", False)

                plantilla, creada = PlantillaContrato.objects.get_or_create(
                    empresa_prestadora=None,
                    tipo_contrato="trabajador",
                    titulo=titulo,
                    defaults={
                        "descripcion": plantilla_data.get("descripcion", ""),
                        "es_default": es_default,
                        "activa": True,
                        "version": 1,
                    },
                )

                if creada:
                    plantillas_creadas += 1
                    self.stdout.write(self.style.SUCCESS(f"  [OK] Plantilla global creada: {titulo}"))

                    # Crear secciones de la plantilla
                    secciones_creadas = 0
                    for sec_data in secciones_data:
                        _, sec_creada = SeccionPlantilla.objects.get_or_create(
                            plantilla=plantilla,
                            orden=sec_data["orden"],
                            defaults={
                                "tipo": sec_data["tipo"],
                                "titulo": sec_data["titulo"],
                                "contenido_template": sec_data["contenido_template"],
                                "es_obligatoria": sec_data["es_obligatoria"],
                                "es_editable_en_contrato": sec_data["es_editable_en_contrato"],
                            },
                        )
                        if sec_creada:
                            secciones_creadas += 1

                    self.stdout.write(
                        self.style.SUCCESS(f"    [OK] {secciones_creadas} secciones creadas")
                    )
                else:
                    self.stdout.write(self.style.SUCCESS(f"  [OK] Plantilla global ya existe: {titulo}"))

                # Guardar la plantilla por defecto
                if es_default:
                    plantilla_default = plantilla

            self.stdout.write(
                self.style.SUCCESS(f"  [OK] Total plantillas laborales globales creadas: {plantillas_creadas}")
            )

            # Paso 5: Contratos laborales en distintos estados
            self.stdout.write(self.style.WARNING("Paso 5: Creando contratos de prueba..."))

            hoy = timezone.now().date()
            contratos_data = [
                {
                    "trabajador_email": "ana.perez@demo.cl",
                    "tipo_contrato": "indefinido",
                    "estado": "borrador",
                    "fecha_inicio": hoy,
                    "cargo": "Desarrollador de Software",
                    "sueldo_base": Decimal("2500000"),
                },
                {
                    "trabajador_email": "juan.soto@demo.cl",
                    "tipo_contrato": "plazo_fijo",
                    "estado": "vigente",
                    "fecha_inicio": hoy - timedelta(days=30),
                    "cargo": "Analista de Sistemas",
                    "sueldo_base": Decimal("2300000"),
                },
                {
                    "trabajador_email": "carla.rojas@demo.cl",
                    "tipo_contrato": "indefinido",
                    "estado": "terminado",
                    "fecha_inicio": hoy - timedelta(days=180),
                    "cargo": "Administrativo",
                    "sueldo_base": Decimal("1800000"),
                },
            ]

            contratos_creados = 0
            for contrato_data in contratos_data:
                trabajador_email = contrato_data.pop("trabajador_email")
                usuario = User.objects.get(email=trabajador_email)
                usuario_empresa = UsuarioEmpresa.objects.get(usuario=usuario)

                # Buscar cargo del catálogo
                cargo = CargoCatalogo.objects.filter(
                    empresa=empresa, nombre=contrato_data["cargo"]
                ).first()
                if not cargo:
                    cargo = CargoCatalogo.objects.filter(
                        empresa=empresa, nombre="Desarrollador de Software"
                    ).first()

                _, contrato_creado = ContratoTrabajador.objects.get_or_create(
                    usuario_empresa=usuario_empresa,
                    fecha_inicio=contrato_data["fecha_inicio"],
                    defaults={
                        "tipo_contrato": contrato_data["tipo_contrato"],
                        "estado": contrato_data["estado"],
                        "cargo": contrato_data["cargo"],
                        "jornada": "completa",
                        "sueldo_base": contrato_data["sueldo_base"],
                        "moneda": "CLP",
                        "plantilla_contrato": plantilla_default,
                    },
                )

                if contrato_creado:
                    contratos_creados += 1
                    estado_display = contrato_data["estado"].upper()
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"    [OK] Contrato {usuario.email}: {estado_display}"
                        )
                    )

            self.stdout.write(self.style.SUCCESS(f"  [OK] Contratos: {contratos_creados} creados"))

            # Resumen final
            self.stdout.write("")
            self.stdout.write(
                self.style.SUCCESS(
                    f"[OK] Seed completado para RRHH Demo.\n"
                    f"  Empresa: {empresa.nombre}\n"
                    f"  Login demo: admin@demo.cl / {PASSWORD_DEMO}\n"
                    f"  Trabajadores: ana.perez@demo.cl, juan.soto@demo.cl, carla.rojas@demo.cl"
                )
            )
