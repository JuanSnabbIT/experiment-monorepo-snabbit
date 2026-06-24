"""
seed_rrhh_completo.py

Pobla la BD con DOS empresas demo independientes para probar el flujo completo
de contratos laborales. Por cada empresa crea:

  - Sucursal principal con datos de contacto
  - Catálogos de cargos (por empresa)
  - Configuración laboral global (empresa=None) + overrides por empresa
  - 7 usuarios: 1 admin + 6 trabajadores (uno por estado de contrato)
  - 6 contratos laborales, uno por estado:
      borrador · pendiente_aprobacion · vigente · terminado · anulado · descartado
  - 1 EnvioAprobacionEmpleador sobre el contrato pendiente_aprobacion
  - 1 AnexoContrato (modificacion_sueldo, vigente) sobre el contrato vigente

Catálogos globales creados una vez (empresa=None):
  - AFP (7 entidades) con tasa_cotizacion
  - Bancos (9 entidades)
  - Nacionalidades (9 entidades)
  - ConfiguracionLaboral global (4 parámetros legales)

Idempotente: usa get_or_create / filter().first() en cada entidad.
Password de todos los usuarios demo: Demo1234!

Uso:
    python manage.py seed_rrhh_completo
    python manage.py seed_rrhh_completo --reset   # limpia y recrea
"""

from datetime import timedelta
from decimal import Decimal

from django.contrib.auth.hashers import make_password
from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from cuentas.models import User
from core.models import PersonalizacionUsuario
from empresas.models import Empresa, SucursalEmpresa, UsuarioEmpresa
from rrhh.models import (
    AfpCatalogo,
    AnexoContrato,
    BancoCatalogo,
    CargoCatalogo,
    ConfiguracionLaboral,
    ContratoTrabajador,
    EnvioAprobacionEmpleador,
    NacionalidadCatalogo,
)

PASSWORD_DEMO = "Demo1234!"

# ─── RUTs demo válidos (check digit verificado con módulo 11) ─────────────────
# Patrón "dígito repetido" — todos son RUTs chilenos matemáticamente válidos.
# Los primeros 4 pueden colisionar con seed_demo_rrhh; si ese seed NO está
# activo (SQLite fresca), se usan sin problema.
RUTS = [
    "11111111-1",  # 0  empresa1-admin
    "22222222-2",  # 1  empresa1-borrador
    "33333333-3",  # 2  empresa1-pendiente
    "44444444-4",  # 3  empresa1-vigente
    "55555555-5",  # 4  empresa1-terminado
    "66666666-6",  # 5  empresa1-anulado
    "77777777-7",  # 6  empresa1-descartado
    "88888888-8",  # 7  empresa2-admin
    "99999999-9",  # 8  empresa2-borrador
    "12312312-3",  # 9  empresa2-pendiente  (calculado: 12312312 -> dv=3)
    "13131313-6",  # 10 empresa2-vigente    (calculado: 13131313 -> dv=6)
    "14141414-3",  # 11 empresa2-terminado  (calculado: 14141414 -> dv=3)
    "15151515-K",  # 12 empresa2-anulado    (calculado: 15151515 -> dv=K)
    "16161616-8",  # 13 empresa2-descartado (calculado: 16161616 -> dv=8)
]

# ─── Catálogos globales ───────────────────────────────────────────────────────

AFP_GLOBALES = [
    ("Provida", Decimal("0.1058")),
    ("Habitat", Decimal("0.1027")),
    ("Capital", Decimal("0.1044")),
    ("Cuprum", Decimal("0.1144")),
    ("Modelo", Decimal("0.0958")),
    ("PlanVital", Decimal("0.1116")),
    ("Uno AFP", Decimal("0.0969")),
]

BANCO_GLOBALES = [
    "BancoEstado", "Santander", "BCI", "Chile",
    "Itaú", "Scotiabank", "Security", "Bice", "Falabella",
]

NACIONALIDADES_GLOBALES = [
    "Chilena", "Peruana", "Colombiana", "Venezolana",
    "Argentina", "Boliviana", "Ecuatoriana", "Española", "Otra",
]

GLOBAL_CONFIG = [
    {
        "clave": "gratificacion_mensual_tope",
        "valor": Decimal("4.75"),
        "descripcion": "Tope art. 50 mensual (4.75 UTM) — valor legal vigente",
    },
    {
        "clave": "jornada_horas_semanales_max",
        "valor": Decimal("45"),
        "descripcion": "Máximo horas semanales Código del Trabajo (art. 22)",
    },
    {
        "clave": "horas_extra_max_semanal",
        "valor": Decimal("12"),
        "descripcion": "Máximo horas extraordinarias semanales (art. 31)",
    },
    {
        "clave": "dias_vacaciones_base",
        "valor": Decimal("15"),
        "descripcion": "Días hábiles vacaciones base anuales (art. 67)",
    },
]

# ─── Empresa 1: Alpha TechServices SpA ───────────────────────────────────────

EMPRESA1 = {
    "nombre": "Alpha TechServices SpA",
    "rut_empresa": "76111001-K",
    "direccion_principal": "Av. Providencia 1500, Piso 5, Santiago",
    "representante_legal": "Alejandro Vidal Muñoz",
    "rut_representante": "11111111-1",
    "giro": "Servicios de Tecnología de la Información",
    "email": "contacto@alphatech.demo",
    "telefono": "+56222345678",
}

EMPRESA1_SUCURSAL = {
    "nombre": "Casa Matriz",
    "direccion": "Av. Providencia 1500, Piso 5",
    "region": 13,
    "provincia": 131,
    "comuna": 13120,
}

EMPRESA1_CONFIG = [
    {
        "clave": "jornada_horas_semanales",
        "valor": Decimal("44"),
        "descripcion": "Jornada laboral Alpha (44h — 1h reducida respecto al máximo legal)",
    },
    {
        "clave": "bono_movilizacion_estandar",
        "valor": Decimal("40000"),
        "descripcion": "Bono movilización estándar para personal administrativo Alpha",
    },
]

EMPRESA1_CARGOS = [
    "Gerente de Tecnología",
    "Desarrollador Senior",
    "Analista de QA",
    "Diseñador UX/UI",
    "Soporte Técnico",
    "Coordinador de Proyectos",
    "Administrativo",
]

EMPRESA1_USUARIOS = [
    {
        "email": "admin@alpha.demo",
        "first_name": "Alejandro",
        "last_name": "Vidal",
        "rut_idx": 0,
        "is_staff": True,
        "is_superuser": True,
        "cargo": "Gerente de Tecnología",
        "estado_contrato": None,
    },
    {
        "email": "sofia.contreras@alpha.demo",
        "first_name": "Sofía",
        "last_name": "Contreras",
        "rut_idx": 1,
        "cargo": "Desarrollador Senior",
        "estado_contrato": "borrador",
        "tipo_contrato": "indefinido",
        "sueldo": Decimal("1_800_000"),
    },
    {
        "email": "carlos.mendoza@alpha.demo",
        "first_name": "Carlos",
        "last_name": "Mendoza",
        "rut_idx": 2,
        "cargo": "Analista de QA",
        "estado_contrato": "pendiente_aprobacion",
        "tipo_contrato": "indefinido",
        "sueldo": Decimal("2_100_000"),
    },
    {
        "email": "maria.torres@alpha.demo",
        "first_name": "María",
        "last_name": "Torres",
        "rut_idx": 3,
        "cargo": "Diseñador UX/UI",
        "estado_contrato": "vigente",
        "tipo_contrato": "indefinido",
        "sueldo": Decimal("2_500_000"),
    },
    {
        "email": "pedro.vega@alpha.demo",
        "first_name": "Pedro",
        "last_name": "Vega",
        "rut_idx": 4,
        "cargo": "Soporte Técnico",
        "estado_contrato": "terminado",
        "tipo_contrato": "plazo_fijo",
        "sueldo": Decimal("1_950_000"),
    },
    {
        "email": "laura.espinoza@alpha.demo",
        "first_name": "Laura",
        "last_name": "Espinoza",
        "rut_idx": 5,
        "cargo": "Coordinador de Proyectos",
        "estado_contrato": "anulado",
        "tipo_contrato": "indefinido",
        "sueldo": Decimal("2_000_000"),
    },
    {
        "email": "diego.morales@alpha.demo",
        "first_name": "Diego",
        "last_name": "Morales",
        "rut_idx": 6,
        "cargo": "Administrativo",
        "estado_contrato": "descartado",
        "tipo_contrato": "plazo_fijo",
        "sueldo": Decimal("1_600_000"),
    },
]

# ─── Empresa 2: Beta Consulting Ltda ─────────────────────────────────────────

EMPRESA2 = {
    "nombre": "Beta Consulting Ltda",
    "rut_empresa": "76222002-1",
    "direccion_principal": "Calle Los Leones 890, Temuco",
    "representante_legal": "Beatriz Fuentes Carrasco",
    "rut_representante": "88888888-8",
    "giro": "Consultoría Empresarial y Gestión de Personas",
    "email": "rrhh@betaconsulting.demo",
    "telefono": "+56452345678",
}

EMPRESA2_SUCURSAL = {
    "nombre": "Sede Central Temuco",
    "direccion": "Calle Los Leones 890",
    "region": 9,
    "provincia": 91,
    "comuna": 9101,
}

EMPRESA2_CONFIG = [
    {
        "clave": "jornada_horas_semanales",
        "valor": Decimal("40"),
        "descripcion": "Jornada 40 horas Beta (política interna de bienestar laboral)",
    },
    {
        "clave": "gratificacion_mensual_tope",
        "valor": Decimal("5.00"),
        "descripcion": "Tope gratificación aumentado Beta (beneficio adicional sobre ley)",
    },
    {
        "clave": "dias_vacaciones_base",
        "valor": Decimal("20"),
        "descripcion": "Vacaciones extendidas Beta (5 días adicionales sobre ley)",
    },
]

EMPRESA2_CARGOS = [
    "Gerente de RRHH",
    "Consultor Senior",
    "Analista de Procesos",
    "Especialista en Compensaciones",
    "Asistente de RRHH",
    "Jefe de Capacitación",
    "Administrativo",
]

EMPRESA2_USUARIOS = [
    {
        "email": "admin@beta.demo",
        "first_name": "Beatriz",
        "last_name": "Fuentes",
        "rut_idx": 7,
        "is_staff": True,
        "is_superuser": True,
        "cargo": "Gerente de RRHH",
        "estado_contrato": None,
    },
    {
        "email": "isabel.mendoza@beta.demo",
        "first_name": "Isabel",
        "last_name": "Mendoza",
        "rut_idx": 8,
        "cargo": "Consultor Senior",
        "estado_contrato": "borrador",
        "tipo_contrato": "indefinido",
        "sueldo": Decimal("2_200_000"),
    },
    {
        "email": "roberto.salas@beta.demo",
        "first_name": "Roberto",
        "last_name": "Salas",
        "rut_idx": 9,
        "cargo": "Analista de Procesos",
        "estado_contrato": "pendiente_aprobacion",
        "tipo_contrato": "indefinido",
        "sueldo": Decimal("1_900_000"),
    },
    {
        "email": "andrea.moya@beta.demo",
        "first_name": "Andrea",
        "last_name": "Moya",
        "rut_idx": 10,
        "cargo": "Especialista en Compensaciones",
        "estado_contrato": "vigente",
        "tipo_contrato": "indefinido",
        "sueldo": Decimal("2_800_000"),
    },
    {
        "email": "felipe.castro@beta.demo",
        "first_name": "Felipe",
        "last_name": "Castro",
        "rut_idx": 11,
        "cargo": "Asistente de RRHH",
        "estado_contrato": "terminado",
        "tipo_contrato": "plazo_fijo",
        "sueldo": Decimal("1_400_000"),
    },
    {
        "email": "carmen.rios@beta.demo",
        "first_name": "Carmen",
        "last_name": "Ríos",
        "rut_idx": 12,
        "cargo": "Jefe de Capacitación",
        "estado_contrato": "anulado",
        "tipo_contrato": "indefinido",
        "sueldo": Decimal("2_300_000"),
    },
    {
        "email": "hector.lima@beta.demo",
        "first_name": "Héctor",
        "last_name": "Lima",
        "rut_idx": 13,
        "cargo": "Administrativo",
        "estado_contrato": "descartado",
        "tipo_contrato": "plazo_fijo",
        "sueldo": Decimal("1_350_000"),
    },
]


# ─── Comando ─────────────────────────────────────────────────────────────────


class Command(BaseCommand):
    help = (
        "Pobla la BD con dos empresas demo (Alpha + Beta) para testing del "
        "flujo completo de contratos laborales. Crea todos los estados posibles."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Elimina las dos empresas demo y todos sus datos antes de recrear.",
        )

    def handle(self, *args, **options):
        if options.get("reset"):
            self._reset_empresas()

        with transaction.atomic():
            self._paso_0_seeds_opcionales()
            self._paso_1_config_laboral_global()
            self._paso_2_catalogos_globales()
            empresa1 = self._seed_empresa(
                EMPRESA1, EMPRESA1_SUCURSAL, EMPRESA1_CONFIG, EMPRESA1_CARGOS,
                EMPRESA1_USUARIOS, label="Empresa 1 — Alpha",
            )
            empresa2 = self._seed_empresa(
                EMPRESA2, EMPRESA2_SUCURSAL, EMPRESA2_CONFIG, EMPRESA2_CARGOS,
                EMPRESA2_USUARIOS, label="Empresa 2 — Beta",
            )

        self._imprimir_resumen(empresa1, empresa2)

    # ── Pasos globales ────────────────────────────────────────────────────────

    def _paso_0_seeds_opcionales(self):
        self.stdout.write(self.style.WARNING("Paso 0: Seeds globales opcionales..."))
        for cmd in ("seed_turnos_globales", "seed_etiquetas_trabajador", "seed_bloques_transversales"):
            try:
                call_command(cmd, verbosity=0)
                self.stdout.write(self.style.SUCCESS(f"  [OK] {cmd}"))
            except Exception:
                self.stdout.write(self.style.WARNING(f"  [SKIP] {cmd} no encontrado"))

    def _paso_1_config_laboral_global(self):
        self.stdout.write(self.style.WARNING("Paso 1: Configuración laboral global (empresa=None)..."))
        for cfg in GLOBAL_CONFIG:
            _, creada = ConfiguracionLaboral.objects.get_or_create(
                empresa=None,
                clave=cfg["clave"],
                defaults={"valor": cfg["valor"], "descripcion": cfg["descripcion"]},
            )
            marca = "[OK]" if creada else "[--]"
            self.stdout.write(self.style.SUCCESS(
                f"  {marca} {cfg['clave']} = {cfg['valor']}"
            ))

    def _paso_2_catalogos_globales(self):
        self.stdout.write(self.style.WARNING("Paso 2: Catálogos globales (AFP, Banco, Nacionalidad)..."))

        for nombre, tasa in AFP_GLOBALES:
            AfpCatalogo.objects.get_or_create(
                nombre=nombre, empresa=None,
                defaults={"tasa_cotizacion": tasa, "activo": True},
            )
        self.stdout.write(self.style.SUCCESS(f"  [OK] AFP: {len(AFP_GLOBALES)} entradas"))

        for nombre in BANCO_GLOBALES:
            BancoCatalogo.objects.get_or_create(
                nombre=nombre, empresa=None,
                defaults={"activo": True},
            )
        self.stdout.write(self.style.SUCCESS(f"  [OK] Bancos: {len(BANCO_GLOBALES)} entradas"))

        for nombre in NACIONALIDADES_GLOBALES:
            NacionalidadCatalogo.objects.get_or_create(
                nombre=nombre, empresa=None,
                defaults={"activo": True},
            )
        self.stdout.write(self.style.SUCCESS(f"  [OK] Nacionalidades: {len(NACIONALIDADES_GLOBALES)} entradas"))

    # ── Seed por empresa ──────────────────────────────────────────────────────

    def _seed_empresa(self, empresa_datos, sucursal_datos, config_list, cargos, usuarios_data, label):
        self.stdout.write(self.style.WARNING(f"\n{label}: {empresa_datos['nombre']}"))

        # 1. Empresa + Sucursal
        empresa, emp_creada = Empresa.objects.get_or_create(
            nombre=empresa_datos["nombre"],
            defaults={k: v for k, v in empresa_datos.items() if k != "nombre"},
        )
        marca = "[OK]" if emp_creada else "[--]"
        self.stdout.write(self.style.SUCCESS(f"  {marca} Empresa: {empresa.nombre}"))

        sucursal, suc_creada = SucursalEmpresa.objects.get_or_create(
            empresa=empresa,
            nombre=sucursal_datos["nombre"],
            defaults={k: v for k, v in sucursal_datos.items() if k != "nombre"},
        )
        marca = "[OK]" if suc_creada else "[--]"
        self.stdout.write(self.style.SUCCESS(f"  {marca} Sucursal: {sucursal.nombre}"))

        # 2. Config laboral por empresa
        for cfg in config_list:
            _, creada = ConfiguracionLaboral.objects.get_or_create(
                empresa=empresa,
                clave=cfg["clave"],
                defaults={"valor": cfg["valor"], "descripcion": cfg["descripcion"]},
            )
            marca = "[OK]" if creada else "[--]"
            self.stdout.write(self.style.SUCCESS(
                f"  {marca} Config [{empresa.nombre[:20]}]: {cfg['clave']} = {cfg['valor']}"
            ))

        # 3. Catálogo de cargos por empresa
        for nombre in cargos:
            CargoCatalogo.objects.get_or_create(
                empresa=empresa, nombre=nombre,
                defaults={"activo": True},
            )
        self.stdout.write(self.style.SUCCESS(f"  [OK] CargoCatalogo: {len(cargos)} cargos"))

        # 4. Crear todos los usuarios primero (admin necesario para FK en contratos)
        usuarios_creados = {}
        admin_user = None

        for u in usuarios_data:
            user, user_creado = User.objects.get_or_create(
                email=u["email"],
                defaults={
                    "first_name": u["first_name"],
                    "last_name": u["last_name"],
                    "password": make_password(PASSWORD_DEMO),
                    "is_staff": u.get("is_staff", False),
                    "is_superuser": u.get("is_superuser", False),
                    "is_active": True,
                },
            )

            ue, _ = UsuarioEmpresa.objects.get_or_create(
                usuario=user,
                defaults={
                    "sucursal": sucursal,
                    "cargo": u["cargo"],
                    "rut": RUTS[u["rut_idx"]],
                    "sistema_salud": "fonasa",
                },
            )

            pers, _ = PersonalizacionUsuario.objects.get_or_create(
                usuario=user,
                defaults={"sucursal_principal": sucursal},
            )
            if pers.sucursal_principal is None:
                pers.sucursal_principal = sucursal
                pers.save(update_fields=["sucursal_principal"])

            marca = "[OK]" if user_creado else "[--]"
            self.stdout.write(self.style.SUCCESS(f"    {marca} User: {user.email}"))

            usuarios_creados[u["email"]] = (user, ue)
            if u.get("is_superuser"):
                admin_user = user

        # 5. Crear contratos (admin_user ya disponible)
        self.stdout.write(self.style.SUCCESS(f"  Creando contratos..."))
        for u in usuarios_data:
            if not u.get("estado_contrato"):
                continue
            user, ue = usuarios_creados[u["email"]]
            self._crear_contrato(
                ue=ue,
                user=user,
                empresa=empresa,
                sucursal=sucursal,
                admin_user=admin_user,
                estado=u["estado_contrato"],
                tipo_contrato=u["tipo_contrato"],
                cargo_nombre=u["cargo"],
                sueldo_arg=u["sueldo"],
            )

        return empresa

    # ── Contratos por estado ──────────────────────────────────────────────────

    def _crear_contrato(self, ue, user, empresa, sucursal, admin_user, estado, tipo_contrato, cargo_nombre, sueldo_arg):
        hoy = timezone.now().date()
        ahora = timezone.now()

        # Campos comunes a todos los contratos
        campos_base = {
            "tipo_contrato": tipo_contrato,
            "cargo": cargo_nombre,
            "jornada": "completa",
            "moneda": "CLP",
            "sueldo": sueldo_arg,
            "bono_movilizacion": Decimal("40000"),
            "bono_colacion": Decimal("50000"),
            "tipo_gratificacion": "art_47",
            "horas_semanales": 44,
            "lugar_trabajo": sucursal.nombre,
            "funciones": f"Funciones y responsabilidades del cargo de {cargo_nombre}.",
            "horario_detalle": "Lunes a viernes de 09:00 a 18:00 hrs",
            "dias_semana": ["L", "M", "X", "J", "V"],
            "creado_por": admin_user,
        }

        if estado == "borrador":
            # Contrato en redacción, aún sin enviar al trabajador.
            self._get_or_create_contrato(
                ue=ue, estado=estado,
                campos={
                    **campos_base,
                    "fecha_inicio": hoy + timedelta(days=7),
                    "observaciones": (
                        "Contrato en etapa de redacción. Pendiente completar "
                        "datos bancarios y previsionales del trabajador."
                    ),
                },
                label=f"{user.email} -> BORRADOR",
            )

        elif estado == "pendiente_aprobacion":
            # Contrato enviado al empleador, esperando su decisión.
            fecha_inicio = hoy - timedelta(days=3)
            contrato, creado = self._get_or_create_contrato(
                ue=ue, estado=estado,
                campos={
                    **campos_base,
                    "fecha_inicio": fecha_inicio,
                    "snapshot_documento": {
                        "trabajador": {
                            "nombre_completo": f"{user.first_name} {user.last_name}",
                            "rut": ue.rut,
                            "email": user.email,
                        },
                        "empresa": {
                            "nombre": empresa.nombre,
                            "rut": empresa.rut_empresa or "",
                            "representante": empresa.representante_legal or "",
                        },
                        "contrato": {
                            "cargo": cargo_nombre,
                            "tipo_contrato": tipo_contrato,
                            "fecha_inicio": str(fecha_inicio),
                            "sueldo": str(sueldo_arg),
                            "moneda": "CLP",
                            "jornada": "completa",
                        },
                    },
                    "observaciones": "Contrato enviado al empleador para revisión y aprobación.",
                },
                label=f"{user.email} -> PENDIENTE_APROBACION",
            )
            if creado:
                EnvioAprobacionEmpleador.objects.get_or_create(
                    contrato=contrato,
                    defaults={
                        "pdf_congelado": b"[PDF_PLACEHOLDER_DEMO]",
                        "enviado_a": empresa.email or f"empleador@{empresa.nombre[:10].lower()}.demo",
                        "enviado_por": admin_user,
                        "decision": "pendiente",
                        "expirado": False,
                    },
                )
                self.stdout.write(self.style.SUCCESS(
                    f"      [OK] EnvioAprobacionEmpleador creado"
                ))

        elif estado == "vigente":
            # Contrato activo, aprobado por el empleador hace 55 días.
            fecha_inicio = hoy - timedelta(days=60)
            contrato, creado = self._get_or_create_contrato(
                ue=ue, estado=estado,
                campos={
                    **campos_base,
                    "fecha_inicio": fecha_inicio,
                    "fecha_aprobacion": ahora - timedelta(days=55),
                    "aceptado_por": admin_user,
                    "observaciones": "Contrato vigente. Aprobado por el empleador sin observaciones.",
                },
                label=f"{user.email} -> VIGENTE",
            )
            if creado:
                AnexoContrato.objects.get_or_create(
                    contrato=contrato,
                    numero_anexo=1,
                    defaults={
                        "tipo": "modificacion_sueldo",
                        "estado": "vigente",
                        "fecha_efectiva": hoy - timedelta(days=30),
                        "descripcion": (
                            f"Modificación de remuneración. Nuevo sueldo base: "
                            f"${sueldo_arg + Decimal('200000'):,.0f} CLP vigente desde la fecha indicada."
                        ),
                        "creado_por": admin_user,
                    },
                )
                self.stdout.write(self.style.SUCCESS(
                    f"      [OK] AnexoContrato (modificacion_sueldo) creado"
                ))

        elif estado == "terminado":
            # Contrato plazo fijo terminado por vencimiento hace 30 días.
            fecha_inicio = hoy - timedelta(days=180)
            fecha_termino = hoy - timedelta(days=30)
            self._get_or_create_contrato(
                ue=ue, estado=estado,
                campos={
                    **campos_base,
                    "tipo_contrato": "plazo_fijo",
                    "fecha_inicio": fecha_inicio,
                    "fecha_termino": fecha_termino,
                    "cantidad_meses": 5,
                    "fecha_aprobacion": ahora - timedelta(days=175),
                    "aceptado_por": admin_user,
                    "motivo_termino": "vencimiento_plazo",
                    "fecha_termino_real": fecha_termino,
                    "observaciones_termino": (
                        "Término por vencimiento del plazo contractual pactado. "
                        "El trabajador fue notificado con 30 días de anticipación. "
                        "No se renovará el contrato."
                    ),
                    "observaciones": "Contrato a plazo fijo concluido exitosamente.",
                },
                label=f"{user.email} -> TERMINADO",
            )

        elif estado == "anulado":
            # Contrato anulado por error administrativo.
            fecha_inicio = hoy - timedelta(days=90)
            self._get_or_create_contrato(
                ue=ue, estado=estado,
                campos={
                    **campos_base,
                    "fecha_inicio": fecha_inicio,
                    "fecha_aprobacion": ahora - timedelta(days=85),
                    "aceptado_por": admin_user,
                    "motivo_anulacion": (
                        "Anulado por error administrativo: datos tributarios del "
                        "trabajador incorrectos en el documento original. "
                        "Se emitirá nuevo contrato con información corregida."
                    ),
                    "observaciones": "Contrato anulado. Ver motivo_anulacion para detalles.",
                },
                label=f"{user.email} -> ANULADO",
            )

        elif estado == "descartado":
            # Borrador descartado antes de enviarse.
            self._get_or_create_contrato(
                ue=ue, estado=estado,
                campos={
                    **campos_base,
                    "fecha_inicio": hoy + timedelta(days=14),
                    "fecha_termino": hoy + timedelta(days=90),
                    "cantidad_meses": 3,
                    "observaciones": (
                        "Proceso de contratación cancelado antes de firma. "
                        "El candidato rechazó la oferta laboral."
                    ),
                },
                label=f"{user.email} -> DESCARTADO",
            )

    def _get_or_create_contrato(self, ue, estado, campos, label):
        """Crea el contrato si no existe uno con ese estado para ese trabajador."""
        existente = ContratoTrabajador.objects.filter(
            usuario_empresa=ue, estado=estado
        ).first()

        if existente:
            self.stdout.write(self.style.SUCCESS(f"    [--] Contrato {label} ya existe"))
            return existente, False

        contrato = ContratoTrabajador.objects.create(
            usuario_empresa=ue,
            estado=estado,
            **campos,
        )
        self.stdout.write(self.style.SUCCESS(f"    [OK] Contrato {label}"))
        return contrato, True

    # ── Reset ─────────────────────────────────────────────────────────────────

    def _reset_empresas(self):
        self.stdout.write(self.style.WARNING("--reset: eliminando empresas demo existentes..."))
        for datos in (EMPRESA1, EMPRESA2):
            empresa = Empresa.objects.filter(nombre=datos["nombre"]).first()
            if not empresa:
                continue
            # Borrar contratos antes (FK PROTECT desde ContratoTrabajador -> UsuarioEmpresa)
            for sucursal in empresa.sucursales.all():
                for ue in sucursal.usuarios.all():
                    ContratoTrabajador.objects.filter(usuario_empresa=ue).delete()
                    user = ue.usuario
                    ue.delete()
                    if user.email.endswith(".demo"):
                        PersonalizacionUsuario.objects.filter(usuario=user).delete()
                        user.delete()
            empresa.delete()
            self.stdout.write(self.style.WARNING(f"  [DEL] {datos['nombre']} eliminada"))

    # ── Resumen ───────────────────────────────────────────────────────────────

    def _imprimir_resumen(self, empresa1, empresa2):
        sep = "=" * 62
        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS(sep))
        self.stdout.write(self.style.SUCCESS("  SEED RRHH COMPLETO — FINALIZADO"))
        self.stdout.write(self.style.SUCCESS(sep))
        self.stdout.write(f"  Password demo: {PASSWORD_DEMO}")
        self.stdout.write("")
        self.stdout.write(f"  Empresa 1: {empresa1.nombre}")
        self.stdout.write(f"    Admin:     admin@alpha.demo")
        self.stdout.write(f"    Borrador:  sofia.contreras@alpha.demo")
        self.stdout.write(f"    Pendiente: carlos.mendoza@alpha.demo")
        self.stdout.write(f"    Vigente:   maria.torres@alpha.demo   (+ 1 AnexoContrato)")
        self.stdout.write(f"    Terminado: pedro.vega@alpha.demo")
        self.stdout.write(f"    Anulado:   laura.espinoza@alpha.demo")
        self.stdout.write(f"    Descartado:diego.morales@alpha.demo")
        self.stdout.write("")
        self.stdout.write(f"  Empresa 2: {empresa2.nombre}")
        self.stdout.write(f"    Admin:     admin@beta.demo")
        self.stdout.write(f"    Borrador:  isabel.mendoza@beta.demo")
        self.stdout.write(f"    Pendiente: roberto.salas@beta.demo")
        self.stdout.write(f"    Vigente:   andrea.moya@beta.demo     (+ 1 AnexoContrato)")
        self.stdout.write(f"    Terminado: felipe.castro@beta.demo")
        self.stdout.write(f"    Anulado:   carmen.rios@beta.demo")
        self.stdout.write(f"    Descartado:hector.lima@beta.demo")
        self.stdout.write("")
        self.stdout.write(f"  Config global: {len(GLOBAL_CONFIG)} parámetros legales (empresa=None)")
        self.stdout.write(f"  Config Alpha:  {len(EMPRESA1_CONFIG)} overrides (jornada=44h)")
        self.stdout.write(f"  Config Beta:   {len(EMPRESA2_CONFIG)} overrides (jornada=40h, vacaciones=20d)")
        self.stdout.write(self.style.SUCCESS(sep))
