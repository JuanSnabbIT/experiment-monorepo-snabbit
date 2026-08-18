from datetime import date, timedelta
from decimal import Decimal
from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from django.contrib.auth.hashers import make_password

from cuentas.models import User
from core.models import PersonalizacionUsuario
from empresas.models import Empresa, SucursalEmpresa, UsuarioEmpresa
from contratos.models import PlantillaContrato
from contratos.management.commands._v29_seed_helpers import (
    config_pagina_basica,
    documento_desde_secciones_condicionales,
)
from rrhh.models import (
    ContratoTrabajador,
    AfpCatalogo,
    BancoCatalogo,
    CargoCatalogo,
    ConfiguracionLaboral,
)


DEMO_EMPRESA_NOMBRE = "Demo RRHH SpA"
DEMO_EMPRESA_DIRECCION = "Av. Demo 123, Santiago, Región Metropolitana"
DEMO_SUCURSAL_NOMBRE = "Casa Matriz"

# Lista de emails demo (usado en reset y en creación)
DEMO_EMAILS = [
    "admin@demo.cl",
    "ana.perez@demo.cl",
    "juan.soto@demo.cl",
    "carla.rojas@demo.cl",
    "pedro.alarcon@demo.cl",
]

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

# Usuarios trabajadores — no mutar este dict; el loop usa .copy()
USUARIOS_TRABAJADORES = [
    {
        "email": "admin@demo.cl",
        "first_name": "Admin",
        "last_name": "Demo",
        "is_staff": True,
        "is_superuser": True,
        "rut": "11111111-1",
        "cargo": "Gerente General",
        # Perfil personal
        "celular": "+56998765432",
        "genero": "1",
        "fecha_nacimiento": date(1978, 9, 25),
        "estado_civil": "casado",
        "nacionalidad": "Chilena",
        "direccion": "Av. Apoquindo 5678, Las Condes, Santiago",
        # Previsional / bancario
        "afp_nombre": "Capital",
        "sistema_salud": "isapre",
        "nombre_isapre": "Colmena",
        "banco": "BancoEstado",
        "tipo_cuenta_bancaria": "corriente",
        "numero_cuenta_bancaria": "00011111111",
    },
    {
        "email": "ana.perez@demo.cl",
        "first_name": "Ana",
        "last_name": "Pérez",
        "is_staff": False,
        "is_superuser": False,
        "rut": "22222222-2",
        "cargo": "Desarrollador de Software",
        # Perfil personal
        "celular": "+56912345678",
        "genero": "2",
        "fecha_nacimiento": date(1990, 5, 15),
        "estado_civil": "soltero",
        "nacionalidad": "Chilena",
        "direccion": "Av. Providencia 1234, Providencia, Santiago",
        # Previsional / bancario
        "afp_nombre": "Habitat",
        "sistema_salud": "fonasa",
        "nombre_isapre": None,
        "banco": "BancoEstado",
        "tipo_cuenta_bancaria": "rut",
        "numero_cuenta_bancaria": "22222222",
    },
    {
        "email": "juan.soto@demo.cl",
        "first_name": "Juan",
        "last_name": "Soto",
        "is_staff": False,
        "is_superuser": False,
        "rut": "33333333-3",
        "cargo": "Analista de Sistemas",
        # Perfil personal
        "celular": "+56923456789",
        "genero": "1",
        "fecha_nacimiento": date(1985, 11, 20),
        "estado_civil": "casado",
        "nacionalidad": "Chilena",
        "direccion": "Calle San Martín 456, Maipú, Santiago",
        # Previsional / bancario
        "afp_nombre": "Provida",
        "sistema_salud": "isapre",
        "nombre_isapre": "Cruz Blanca",
        "banco": "Santander",
        "tipo_cuenta_bancaria": "corriente",
        "numero_cuenta_bancaria": "00033333333",
    },
    {
        "email": "carla.rojas@demo.cl",
        "first_name": "Carla",
        "last_name": "Rojas",
        "is_staff": False,
        "is_superuser": False,
        "rut": "44444444-4",
        "cargo": "Administrativo",
        # Perfil personal
        "celular": "+56934567890",
        "genero": "2",
        "fecha_nacimiento": date(1992, 3, 8),
        "estado_civil": "divorciado",
        "nacionalidad": "Chilena",
        "direccion": "Pasaje Los Pinos 789, Ñuñoa, Santiago",
        # Previsional / bancario
        "afp_nombre": "Capital",
        "sistema_salud": "fonasa",
        "nombre_isapre": None,
        "banco": "BCI",
        "tipo_cuenta_bancaria": "vista",
        "numero_cuenta_bancaria": "00044444444",
    },
    {
        "email": "pedro.alarcon@demo.cl",
        "first_name": "Pedro",
        "last_name": "Alarcón",
        "is_staff": False,
        "is_superuser": False,
        "rut": "55555555-5",
        "cargo": "Diseñador UX",
        # Perfil personal
        "celular": "+56945678901",
        "genero": "1",
        "fecha_nacimiento": date(1988, 7, 14),
        "estado_civil": "casado",
        "nacionalidad": "Chilena",
        "direccion": "Av. Grecia 2500, Macul, Santiago",
        # Previsional / bancario
        "afp_nombre": "Cuprum",
        "sistema_salud": "isapre",
        "nombre_isapre": "Banmédica",
        "banco": "Chile",
        "tipo_cuenta_bancaria": "corriente",
        "numero_cuenta_bancaria": "00055555555",
    },
]

PASSWORD_DEMO = "Demo1234!"

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
                "contenido_template": "CONTRATO INDIVIDUAL DE TRABAJO\n\nEntre [nombre_empresa] y [nombre_trabajador]",
                "es_obligatoria": True,
                "es_editable_en_contrato": False,
            },
            {
                "orden": 2,
                "tipo": "clausula",
                "titulo": "PRIMERA: PARTES",
                "contenido_template": "PRIMERA: PARTES\n\nContratante: [nombre_empresa], RUT [rut_empresa]\nContratado: [nombre_trabajador], RUT [rut_trabajador]\nDomicilio: [direccion_trabajador]",
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
        "descripcion": "Plantilla para contratos de duración determinada",
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
        "descripcion": "Plantilla para contratos de reemplazo temporal",
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
        "descripcion": "Plantilla para anexos de cambio de sueldo o beneficios",
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

            # ── RESET ──────────────────────────────────────────────────────────
            if reset:
                self.stdout.write(self.style.WARNING("RESET: Limpiando datos demo anteriores..."))
                empresa_demo = Empresa.objects.filter(nombre=DEMO_EMPRESA_NOMBRE).first()
                if empresa_demo:
                    # 1. Contratos (PROTECT sobre UsuarioEmpresa — borrar primero)
                    sucursal_ids = empresa_demo.sucursales.values_list("id", flat=True)
                    ue_ids = UsuarioEmpresa.objects.filter(
                        sucursal_id__in=sucursal_ids
                    ).values_list("id", flat=True)
                    n_contratos, _ = ContratoTrabajador.objects.filter(
                        usuario_empresa_id__in=ue_ids
                    ).delete()
                    self.stdout.write(self.style.SUCCESS(f"  [OK] Contratos eliminados: {n_contratos}"))

                    # 2. Plantillas por empresa (SET_NULL no las borra automáticamente)
                    n_plantillas, _ = PlantillaContrato.objects.filter(
                        empresa_prestadora=empresa_demo
                    ).delete()
                    self.stdout.write(self.style.SUCCESS(f"  [OK] Plantillas de empresa eliminadas: {n_plantillas}"))

                    # 3. Usuarios demo (cascade elimina UsuarioEmpresa y PersonalizacionUsuario)
                    n_users, _ = User.objects.filter(email__in=DEMO_EMAILS).delete()
                    self.stdout.write(self.style.SUCCESS(f"  [OK] Usuarios eliminados: {n_users}"))

                    # 4. Empresa (cascade elimina SucursalEmpresa, CargoCatalogo, ConfiguracionLaboral)
                    empresa_demo.delete()
                    self.stdout.write(self.style.SUCCESS(f"  [OK] Empresa '{DEMO_EMPRESA_NOMBRE}' eliminada"))
                else:
                    self.stdout.write(self.style.SUCCESS("  [OK] No había datos demo previos"))

            # ── PASO 0: Catálogos globales ─────────────────────────────────────
            self.stdout.write(self.style.WARNING("Paso 0: Poblando catálogos globales..."))
            call_command("seed_turnos_globales")

            # ── PASO 1: Empresa y Sucursal ─────────────────────────────────────
            self.stdout.write(self.style.WARNING("Paso 1: Creando empresa y sucursal..."))
            empresa, empresa_creada = Empresa.objects.get_or_create(
                nombre=DEMO_EMPRESA_NOMBRE,
                defaults={"direccion_principal": DEMO_EMPRESA_DIRECCION},
            )
            self.stdout.write(
                self.style.SUCCESS(
                    f"  [OK] Empresa '{empresa.nombre}' {'creada' if empresa_creada else 'ya existe'}"
                )
            )

            sucursal, sucursal_creada = SucursalEmpresa.objects.get_or_create(
                empresa=empresa,
                nombre=DEMO_SUCURSAL_NOMBRE,
            )
            self.stdout.write(
                self.style.SUCCESS(
                    f"  [OK] Sucursal '{sucursal.nombre}' {'creada' if sucursal_creada else 'ya existe'}"
                )
            )

            # ── PASO 2: Plantillas default por empresa ─────────────────────────
            self.stdout.write(self.style.WARNING("Paso 2: Creando plantillas de contrato por defecto para la empresa demo..."))
            call_command("seed_plantillas_default", empresa_id=empresa.id)

            # ── PASO 3: Catálogos por empresa ──────────────────────────────────
            self.stdout.write(self.style.WARNING("Paso 3: Poblando catálogos por empresa..."))

            afp_creadas = 0
            for afp_nombre in AFP_CATALOGOS:
                _, creada = AfpCatalogo.objects.get_or_create(nombre=afp_nombre, empresa=None)
                if creada:
                    afp_creadas += 1
            self.stdout.write(self.style.SUCCESS(f"  [OK] AFP: {afp_creadas} creadas"))

            banco_creados = 0
            for banco_nombre in BANCO_CATALOGOS:
                _, creado = BancoCatalogo.objects.get_or_create(nombre=banco_nombre, empresa=None)
                if creado:
                    banco_creados += 1
            self.stdout.write(self.style.SUCCESS(f"  [OK] Bancos: {banco_creados} creados"))

            cargo_creados = 0
            for cargo_nombre in CARGO_CATALOGOS:
                _, creado = CargoCatalogo.objects.get_or_create(empresa=empresa, nombre=cargo_nombre)
                if creado:
                    cargo_creados += 1
            self.stdout.write(self.style.SUCCESS(f"  [OK] Cargos ({empresa.nombre}): {cargo_creados} creados"))

            config_creadas = 0
            for config_data in CONFIG_LABORAL:
                _, creada = ConfiguracionLaboral.objects.get_or_create(
                    empresa=empresa,
                    clave=config_data["clave"],
                    defaults={"valor": config_data["valor"]},
                )
                if creada:
                    config_creadas += 1
            self.stdout.write(self.style.SUCCESS(f"  [OK] Configuración laboral: {config_creadas} creada"))

            # ── PASO 4: Usuarios trabajadores ──────────────────────────────────
            self.stdout.write(self.style.WARNING("Paso 4: Creando usuarios trabajadores..."))
            hoy = timezone.now().date()
            usuarios_creados = 0

            for raw_data in USUARIOS_TRABAJADORES:
                data = raw_data.copy()

                email = data.pop("email")
                rut = data.pop("rut")
                cargo_nombre = data.pop("cargo")
                afp_nombre = data.pop("afp_nombre")
                sistema_salud = data.pop("sistema_salud")
                nombre_isapre = data.pop("nombre_isapre")
                banco_nombre = data.pop("banco")
                tipo_cuenta_bancaria = data.pop("tipo_cuenta_bancaria")
                numero_cuenta_bancaria = data.pop("numero_cuenta_bancaria")

                # Campos del User (todo lo que queda en data más rut e is_active)
                user, user_creado = User.objects.get_or_create(
                    email=email,
                    defaults={
                        "password": make_password(PASSWORD_DEMO),
                        "is_active": True,
                        "rut": rut,
                        **data,
                    },
                )
                if user_creado:
                    usuarios_creados += 1
                    self.stdout.write(self.style.SUCCESS(f"    [OK] User '{email}' creado"))
                else:
                    # Actualizar campos de perfil en usuarios existentes
                    needs_save = False
                    profile_fields = {
                        "is_active": True,
                        "rut": rut,
                        **{k: v for k, v in data.items() if k not in ("is_staff", "is_superuser")},
                    }
                    for field, value in profile_fields.items():
                        if getattr(user, field) != value:
                            setattr(user, field, value)
                            needs_save = True
                    if needs_save:
                        user.save()

                # AFP lookup
                afp_obj = AfpCatalogo.objects.filter(nombre=afp_nombre, empresa=None).first()

                # UsuarioEmpresa
                if cargo_nombre == "Diseñador UX":
                    fecha_ingreso = hoy - timedelta(days=913)  # ~2 años 6 meses
                elif cargo_nombre == "Administrativo":
                    fecha_ingreso = hoy - timedelta(days=180)
                elif cargo_nombre == "Analista de Sistemas":
                    fecha_ingreso = hoy - timedelta(days=30)
                else:
                    fecha_ingreso = hoy - timedelta(days=60)
                usuario_empresa, ue_creado = UsuarioEmpresa.objects.get_or_create(
                    usuario=user,
                    defaults={
                        "sucursal": sucursal,
                        "cargo": cargo_nombre,
                        "rut": rut,
                        "afp": afp_obj,
                        "sistema_salud": sistema_salud,
                        "nombre_isapre": nombre_isapre or "",
                        "banco": banco_nombre,
                        "tipo_cuenta_bancaria": tipo_cuenta_bancaria,
                        "numero_cuenta_bancaria": numero_cuenta_bancaria,
                        "fecha_ingreso": fecha_ingreso,
                        "fecha_contrato": fecha_ingreso,
                    },
                )
                if not ue_creado:
                    # Actualizar datos previsionales/bancarios en registros existentes
                    updated = UsuarioEmpresa.objects.filter(pk=usuario_empresa.pk).update(
                        afp=afp_obj,
                        sistema_salud=sistema_salud,
                        nombre_isapre=nombre_isapre or "",
                        banco=banco_nombre,
                        tipo_cuenta_bancaria=tipo_cuenta_bancaria,
                        numero_cuenta_bancaria=numero_cuenta_bancaria,
                        fecha_ingreso=fecha_ingreso,
                        fecha_contrato=fecha_ingreso,
                    )
                    if updated:
                        self.stdout.write(self.style.SUCCESS(f"    [OK] UsuarioEmpresa '{email}' actualizado"))

                # PersonalizacionUsuario
                personalizacion, _ = PersonalizacionUsuario.objects.get_or_create(
                    usuario=user,
                    defaults={"sucursal_principal": sucursal},
                )
                if personalizacion.sucursal_principal is None:
                    personalizacion.sucursal_principal = sucursal
                    personalizacion.save()

            self.stdout.write(self.style.SUCCESS(f"  [OK] Usuarios: {usuarios_creados} creados"))

            # ── PASO 5: Plantillas laborales globales ─────────────────────────
            self.stdout.write(self.style.WARNING("Paso 5: Creando plantillas laborales globales..."))

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
                        "version_editor": "v29",
                        "contenido_documento_v29": documento_desde_secciones_condicionales(secciones_data),
                        "config_pagina_v29": config_pagina_basica(),
                    },
                )

                if creada:
                    plantillas_creadas += 1
                    self.stdout.write(self.style.SUCCESS(
                        f"  [OK] Plantilla global creada: {titulo} ({len(secciones_data)} secciones)"
                    ))
                else:
                    self.stdout.write(self.style.SUCCESS(f"  [OK] Plantilla global ya existe: {titulo}"))

                if es_default:
                    plantilla_default = plantilla

            self.stdout.write(self.style.SUCCESS(f"  [OK] Total plantillas laborales globales: {plantillas_creadas} creadas"))

            # ── PASO 6: Contratos de prueba ───────────────────────────────────
            self.stdout.write(self.style.WARNING("Paso 6: Creando contratos de prueba..."))

            hoy = timezone.now().date()
            contratos_data = [
                {
                    "trabajador_email": "ana.perez@demo.cl",
                    "tipo_contrato": "indefinido",
                    "estado": "borrador",
                    "fecha_inicio": hoy,
                    "cargo": "Desarrollador de Software",
                    "sueldo": Decimal("2500000"),
                },
                {
                    "trabajador_email": "juan.soto@demo.cl",
                    "tipo_contrato": "plazo_fijo",
                    "estado": "vigente",
                    "fecha_inicio": hoy - timedelta(days=30),
                    "cargo": "Analista de Sistemas",
                    "sueldo": Decimal("2300000"),
                },
                {
                    "trabajador_email": "carla.rojas@demo.cl",
                    "tipo_contrato": "indefinido",
                    "estado": "terminado",
                    "fecha_inicio": hoy - timedelta(days=180),
                    "cargo": "Administrativo",
                    "sueldo": Decimal("1800000"),
                },
                {
                    "trabajador_email": "pedro.alarcon@demo.cl",
                    "tipo_contrato": "indefinido",
                    "estado": "vigente",
                    "fecha_inicio": hoy - timedelta(days=913),
                    "cargo": "Diseñador UX",
                    "sueldo": Decimal("2800000"),
                },
            ]

            contratos_creados = 0
            for contrato_data in contratos_data:
                trabajador_email = contrato_data.pop("trabajador_email")
                usuario = User.objects.get(email=trabajador_email)
                usuario_empresa = UsuarioEmpresa.objects.get(usuario=usuario)

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
                        "sueldo": contrato_data["sueldo"],
                        "moneda": "CLP",
                        "plantilla_contrato": plantilla_default,
                    },
                )

                if contrato_creado:
                    contratos_creados += 1
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"    [OK] Contrato {usuario.email}: {contrato_data['estado'].upper()}"
                        )
                    )

            self.stdout.write(self.style.SUCCESS(f"  [OK] Contratos: {contratos_creados} creados"))

            # ── Resumen ────────────────────────────────────────────────────────
            self.stdout.write("")
            self.stdout.write(
                self.style.SUCCESS(
                    f"[OK] Seed completado para RRHH Demo.\n"
                    f"  Empresa: {empresa.nombre}\n"
                    f"  Login demo: admin@demo.cl / {PASSWORD_DEMO}\n"
                    f"  Trabajadores: ana.perez@demo.cl, juan.soto@demo.cl, carla.rojas@demo.cl\n"
                    f"  Contratos: BORRADOR (Ana), VIGENTE (Juan), TERMINADO (Carla), VIGENTE (Pedro ~2.5 años)"
                )
            )
