#!/usr/bin/env python
"""
Script definitivo para poblar datos MAESTROS del ERP - Análisis Profundo

Análisis hecho sobre la arquitectura real del sistema:
- Campos obligatorios identificados
- Dependencias entre modelos mapeadas
- Restricciones (OneToOne, unique) respetadas
- Datos de configuración vs transaccionales separados

QUÉ CREA (DATOS MAESTROS):
  ✅ Grupos de permisos
  ✅ Empresa base (Snabbit) con recargo/PPM variables
  ✅ Sucursal base con región/provincia/comuna COMPLETOS
  ✅ Usuarios internos (Admin, Ventas, Bodega, Supervisor, Técnico)
  ✅ Personalizaciones de usuarios (CRÍTICO para sistema)
  ✅ 12 Empresas cliente con recargo/PPM variables
  ✅ Usuarios de empresas cliente
  ✅ Relaciones empresa-cliente (prestador → cliente)
  ✅ Bodegas por sucursal
  ✅ ~50 Items con categoría/fabricante
  ✅ 10 Proveedores con datos completos
  ✅ Stock inicial distribuido en bodegas
    ✅ Catálogos (Servicios, Visitas, Licencias, etc.)
    ✅ Categorías de gastos operativos
  ✅ Acuerdo de Confidencialidad base

QUÉ NO CREA (son procesos de negocio):
  ❌ Cotizaciones (las creas manualmente)
  ❌ Órdenes de Compra (derivadas de cotizaciones)
  ❌ Guías de Salida (generan OT automático)
  ❌ Órdenes de Trabajo (creadas desde guías)
  ❌ Contratos (creados independientemente)
  ❌ Compras y movimientos de stock (registros transaccionales)

PROBLEMAS CORREGIDOS EN VERSIÓN ANTERIOR:
  🔧 UsuarioEmpresa es OneToOne: un usuario = una empresa
  🔧 PersonalizacionUsuario es obligatorio para filtros de datos
  🔧 StockItemEnBodega debe vincularse correctamente
  🔧 RelacionEmpresa es CRÍTICA para flujos de cotización/OC
  🔧 Grupos de Django deben existir antes de asignarlos

Prerequisitos:
  - Base de datos limpia
  - Migraciones aplicadas: python manage.py migrate

Uso:
  cd backend
  python ..\\dev\\scripts\\setup\\seed_base_v2.py
"""

import os
import random
import sys
from datetime import date, timedelta
from decimal import Decimal
from pathlib import Path

# Setup Django
REPO_ROOT = Path(__file__).resolve().parents[3]
BACKEND_PATH = REPO_ROOT / "backend"
sys.path.insert(0, str(BACKEND_PATH))
os.chdir(BACKEND_PATH)
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "sw_erp.settings")

import django

django.setup()

from bodegas.models import Bodega, StockItemEnBodega
from contratos.models import Licencia, Servicio, Visita
from core.models import AcuerdoConfidencialidadBase, PersonalizacionUsuario, Software
from django.contrib.auth import get_user_model

# Imports post-Django setup
from django.contrib.auth.models import Group
from django.db import transaction
from empresas.models import Empresa, RelacionEmpresa, SucursalEmpresa, UsuarioEmpresa
from items.models import Categoria, Fabricante, ItemEmpresa, ProveedorEmpresa
from rendiciones.models import CategoriaGastoRendicion

User = get_user_model()

# =============================================================================
# UTILIDADES
# =============================================================================


def print_section(title):
    """Imprime un encabezado de sección."""
    print("\n" + "=" * 80)
    print(f"  {title}".ljust(80))
    print("=" * 80)


def print_step(step, total, msg):
    """Imprime progreso de un paso."""
    print(f"  [{step}/{total}] {msg}")


# =============================================================================
# 0. SUPERUSUARIO (si no existe)
# =============================================================================


def ensure_superuser():
    """Busca o crea superusuario de forma interactiva."""
    print_section("0. Validando Superusuario")

    superuser = User.objects.filter(is_superuser=True).first()

    if superuser:
        print_step(1, 1, f"Superusuario existente: {superuser.email}")
        return superuser

    # No existe superusuario - preguntar si quiere crear uno
    print("\n⚠️  No se encontró ningún superusuario en el sistema.")
    print()
    respuesta = input("¿Deseas crear uno ahora? (s/n): ").strip().lower()
    print()

    if respuesta not in ["s", "si", "yes", "y"]:
        print("❌ Seed cancelado. No se puede continuar sin superusuario.")
        print()
        print("   Para crear un superusuario manualmente:")
        print("   cd backend")
        print("   ENV\\Scripts\\python.exe manage.py createsuperuser")
        print()
        sys.exit(1)

    # Pedir datos del superusuario
    import getpass

    from django.core.exceptions import ValidationError
    from django.core.validators import validate_email

    print("=" * 60)
    print("CREACIÓN DE SUPERUSUARIO")
    print("=" * 60)
    print()

    while True:
        email = input("Email: ").strip()
        if not email:
            print("❌ El email es obligatorio.")
            continue

        try:
            validate_email(email)
            if User.objects.filter(email=email).exists():
                print(f"❌ Ya existe un usuario con el email '{email}'.")
                continue
            break
        except ValidationError:
            print("❌ Email inválido. Intenta nuevamente.")

    while True:
        rut = input("RUT (formato: 12345678-9): ").strip()
        if not rut:
            print("❌ El RUT es obligatorio.")
            continue

        if User.objects.filter(rut=rut).exists():
            print(f"❌ Ya existe un usuario con el RUT '{rut}'.")
            continue
        break

    first_name = input("Nombre: ").strip()
    if not first_name:
        first_name = "Admin"

    last_name = input("Apellido: ").strip()
    if not last_name:
        last_name = "Sistema"

    while True:
        password = getpass.getpass("Contraseña (mínimo 8 caracteres): ")
        if len(password) < 8:
            print("❌ La contraseña debe tener al menos 8 caracteres.")
            continue

        password_confirm = getpass.getpass("Confirma contraseña: ")
        if password != password_confirm:
            print("❌ Las contraseñas no coinciden.")
            continue
        break

    try:
        superuser = User.objects.create_superuser(
            email=email,
            rut=rut,
            first_name=first_name,
            last_name=last_name,
            password=password,
        )
        print()
        print(f"✅ Superusuario '{superuser.email}' creado exitosamente")
        print()
        return superuser
    except Exception as e:
        print(f"❌ Error al crear superusuario: {e}")
        print("❌ Seed cancelado.")
        sys.exit(1)


# =============================================================================
# 1. GRUPOS DE PERMISOS
# =============================================================================


def create_groups():
    """Crea grupos de permisos base."""
    print_section("1. Creando Grupos de Permisos")

    grupos_def = [
        ("staff", "Personal administrativo general"),
        ("superadmin", "Administrador con permisos máximos"),
        ("multi-empresas", "Acceso a múltiples empresas"),
        ("tecnico", "Técnico de campo para OT y visitas"),
        ("bodeguero", "Gestores de inventario y bodegas"),
        ("representante_legal", "Representante legal de empresa"),
    ]

    grupos = {}
    for i, (nombre, descripcion) in enumerate(grupos_def, 1):
        grupo, created = Group.objects.get_or_create(name=nombre)
        grupos[nombre] = grupo
        status = "creado" if created else "existente"
        print_step(i, len(grupos_def), f"{nombre}: {status}")

    return grupos


# =============================================================================
# 2. EMPRESA BASE Y SUCURSAL
# =============================================================================


def create_base_company(recargo=None, ppm=None):
    """Crea empresa Snabbit con sucursal base."""
    print_section("2. Creando Empresa Base (Snabbit)")

    # Generar valores si no se proporcionan
    if recargo is None:
        recargo = random.randint(22, 28)
    if ppm is None:
        ppm = Decimal(str(round(random.uniform(3.0, 7.0), 2)))

    empresa, created = Empresa.objects.get_or_create(
        rut_empresa="11111111-1",
        defaults={
            "nombre": "Snabbit",
            "direccion_principal": "Av. Providencia 1234, Santiago",
            "telefono": "+56912345678",
            "email": "contacto@snabbit.cl",
            "recargo": recargo,
            "ppm": ppm,
        },
    )

    if created:
        print_step(1, 2, f"Empresa Snabbit creada (Recargo: {recargo}%, PPM: {ppm}%)")
    else:
        # Actualizar si existen valores por defecto
        updated = False
        if empresa.recargo == 0:
            empresa.recargo = recargo
            updated = True
        if empresa.ppm == 1:
            empresa.ppm = ppm
            updated = True
        if updated:
            empresa.save()
        print_step(1, 2, f"Empresa Snabbit existente (actualizada)")

    # Crear sucursal base
    sucursal, created = SucursalEmpresa.objects.get_or_create(
        empresa=empresa,
        nombre="Casa Matriz",
        defaults={
            "direccion": empresa.direccion_principal,
            "telefono": empresa.telefono,
            "email": empresa.email,
            "region": 13,  # Región Metropolitana
            "provincia": 131,  # Santiago
            "comuna": 13101,  # Santiago Centro
        },
    )

    # Asegurar que sucursal tenga datos de ubicación
    if sucursal.region == 0:
        sucursal.region = 13
        sucursal.provincia = 131
        sucursal.comuna = 13101
        sucursal.save()

    print_step(2, 2, f"Sucursal '{sucursal.nombre}' lista")

    return empresa, sucursal


# =============================================================================
# 3. USUARIOS INTERNOS
# =============================================================================


def create_internal_users(empresa, sucursal, grupos):
    """Crea usuarios internos de Snabbit."""
    print_section("3. Creando Usuarios Internos")

    usuarios_specs = [
        {
            "email": "admin@snabbit.cl",
            "rut": "11111111-9",
            "first_name": "Admin",
            "last_name": "Snabbit",
            "password": "test1234",
            "is_staff": True,
            "is_superuser": True,
            "cargo": "Administrador",
            "grupos": ["staff", "superadmin", "multi-empresas"],
        },
        {
            "email": "ventas@snabbit.cl",
            "rut": "11111111-6",
            "first_name": "Paula",
            "last_name": "Ventas",
            "password": "test1234",
            "is_staff": True,
            "is_superuser": False,
            "cargo": "Ejecutiva de Ventas",
            "grupos": ["staff"],
        },
        {
            "email": "bodeguero@snabbit.cl",
            "rut": "11111111-7",
            "first_name": "Bodeguero",
            "last_name": "Snabbit",
            "password": "test1234",
            "is_staff": False,
            "is_superuser": False,
            "cargo": "Bodeguero",
            "grupos": ["bodeguero"],
        },
        {
            "email": "supervisor@snabbit.cl",
            "rut": "11111111-4",
            "first_name": "Camila",
            "last_name": "Supervisor",
            "password": "test1234",
            "is_staff": True,
            "is_superuser": False,
            "cargo": "Supervisora de Operaciones",
            "grupos": ["staff"],
        },
        {
            "email": "tecnico@snabbit.cl",
            "rut": "11111111-8",
            "first_name": "Tecnico",
            "last_name": "Snabbit",
            "password": "test1234",
            "is_staff": False,
            "is_superuser": False,
            "cargo": "Técnico de Campo",
            "grupos": ["tecnico"],
        },
    ]

    usuarios = {}
    for i, spec in enumerate(usuarios_specs, 1):
        # Crear User
        user, user_created = User.objects.get_or_create(
            email=spec["email"],
            defaults={
                "first_name": spec["first_name"],
                "last_name": spec["last_name"],
                "rut": spec["rut"],
                "is_active": True,
                "is_staff": spec.get("is_staff", False),
                "is_superuser": spec.get("is_superuser", False),
            },
        )

        if user_created:
            user.set_password(spec["password"])
            user.save()

        # Crear UsuarioEmpresa (OneToOne)
        usuario_empresa, ue_created = UsuarioEmpresa.objects.get_or_create(
            usuario=user,
            defaults={
                "sucursal": sucursal,
                "cargo": spec["cargo"],
                "fecha_contrato": date.today() - timedelta(days=400),
                "fecha_ingreso": date.today() - timedelta(days=400),
                "estado": "1",
            },
        )

        # Asignar grupos
        grupo_objects = [grupos[g] for g in spec["grupos"] if g in grupos]
        usuario_empresa.grupos.set(grupo_objects)

        # Crear PersonalizacionUsuario (CRÍTICO)
        PersonalizacionUsuario.objects.get_or_create(
            usuario=user,
            defaults={
                "tema": "1",
                "font_size": 13,
                "sucursal_principal": sucursal,
            },
        )

        usuarios[spec["email"].split("@")[0]] = usuario_empresa
        print_step(i, len(usuarios_specs), f"{spec['first_name']} {spec['last_name']}")

    return usuarios


# =============================================================================
# 4. EMPRESAS CLIENTE
# =============================================================================


def create_client_companies(empresa_base):
    """Crea 12 empresas cliente."""
    print_section("4. Creando Empresas Cliente")

    clientes_config = [
        {
            "nombre": "AYG ASOCIADOS SpA",
            "rut": "76123456-7",
            "direccion": "Av. Providencia 1234, Oficina 402",
            "region": 13,
            "provincia": 131,
            "comuna": 13101,
        },
        {
            "nombre": "CAMACOES Ltda",
            "rut": "76345678-5",
            "direccion": "Av. Libertad 450, Piso 3",
            "region": 5,
            "provincia": 51,
            "comuna": 5101,
        },
        {
            "nombre": "MOLINA RIOS Ingeniería",
            "rut": "76456789-0",
            "direccion": "Av. San Martin 890",
            "region": 8,
            "provincia": 81,
            "comuna": 8101,
        },
        {
            "nombre": "PRODALMEN S.A.",
            "rut": "76567890-1",
            "direccion": "Calle 10 Norte 120",
            "region": 7,
            "provincia": 71,
            "comuna": 7101,
        },
        {
            "nombre": "Segurimax Chile SpA",
            "rut": "76678901-2",
            "direccion": "Av. Apoquindo 4890, Torre B",
            "region": 13,
            "provincia": 131,
            "comuna": 13114,
        },
        {
            "nombre": "Servicios Nova Ltda",
            "rut": "76789012-3",
            "direccion": "Camino Industrial 455",
            "region": 2,
            "provincia": 21,
            "comuna": 2101,
        },
        {
            "nombre": "Grupo Austral SpA",
            "rut": "76890123-4",
            "direccion": "Pedro Montt 1200",
            "region": 10,
            "provincia": 101,
            "comuna": 10101,
        },
        {
            "nombre": "Centro Medico San Lucas",
            "rut": "76901234-5",
            "direccion": "Av. Alemania 850",
            "region": 9,
            "provincia": 91,
            "comuna": 9101,
        },
        {
            "nombre": "Logistica Rayo Sur",
            "rut": "77012345-6",
            "direccion": "Parque Industrial 200",
            "region": 6,
            "provincia": 61,
            "comuna": 6101,
        },
        {
            "nombre": "Fundacion Valle Seguro",
            "rut": "77123456-7",
            "direccion": "Av. O'Higgins 322",
            "region": 3,
            "provincia": 31,
            "comuna": 3101,
        },
        {
            "nombre": "Comercial El Faro EIRL",
            "rut": "77234567-8",
            "direccion": "Av. La Serena 120",
            "region": 4,
            "provincia": 41,
            "comuna": 4101,
        },
        {
            "nombre": "Juan Perez Servicios",
            "rut": "77345678-9",
            "direccion": "Los Jardines 45",
            "region": 13,
            "provincia": 132,
            "comuna": 13201,
        },
    ]

    clientes = []
    for i, client_cfg in enumerate(clientes_config, 1):
        # Generar recargo y PPM únicos
        recargo = random.randint(22, 28)
        ppm = Decimal(str(round(random.uniform(3.0, 7.0), 2)))

        empresa, created = Empresa.objects.get_or_create(
            rut_empresa=client_cfg["rut"],
            defaults={
                "nombre": client_cfg["nombre"],
                "direccion_principal": client_cfg["direccion"],
                "telefono": "+56900000000",
                "email": f"contacto@{client_cfg['nombre'].lower().replace(' ', '')}.cl",
                "recargo": recargo,
                "ppm": ppm,
            },
        )

        # Actualizar recargo/ppm si están en defecto
        if empresa.recargo == 0 or empresa.ppm == 1:
            empresa.recargo = recargo
            empresa.ppm = ppm
            empresa.save()

        # Crear sucursal
        sucursal, _ = SucursalEmpresa.objects.get_or_create(
            empresa=empresa,
            nombre="Casa Matriz",
            defaults={
                "direccion": empresa.direccion_principal,
                "telefono": empresa.telefono,
                "email": empresa.email,
                "region": client_cfg.get("region", 0),
                "provincia": client_cfg.get("provincia", 0),
                "comuna": client_cfg.get("comuna", 0),
            },
        )

        # CRÍTICO: Crear RelacionEmpresa
        RelacionEmpresa.objects.get_or_create(
            prestador_servicios=empresa_base,
            cliente=empresa,
            defaults={"tipo_relacion": "prestador-cliente"},
        )

        clientes.append(
            {
                "empresa": empresa,
                "sucursal": sucursal,
            }
        )

        print_step(i, len(clientes_config), f"{client_cfg['nombre']}")

    return clientes


# =============================================================================
# 5. USUARIOS DE CLIENTES
# =============================================================================


def create_client_users(clientes):
    """Crea usuarios básicos para cada empresa cliente."""
    print_section("5. Creando Usuarios de Clientes")

    rut_counter = 30000000

    total_users = 0
    for cliente_idx, cliente_data in enumerate(clientes, 1):
        empresa = cliente_data["empresa"]
        sucursal = cliente_data["sucursal"]

        # Crear 3 usuarios por empresa cliente
        nombres = [
            ("admin", "Admin"),
            ("compras", "Compras"),
            ("operaciones", "Operaciones"),
        ]

        for nombre, first_name in nombres:
            total_users += 1
            # Usar números muy diferentes para evitar colisiones
            rut = f"{rut_counter + (cliente_idx * 100) + (len(nombres) * 10)}-{random.randint(0, 9)}"

            # Hacer email único
            email = f"user_{rut_counter}@cliente.test.com"
            rut_counter += 1

            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    "first_name": first_name,
                    "last_name": empresa.nombre.split()[0],
                    "rut": rut,
                    "is_active": True,
                },
            )

            if created:
                user.set_password("test1234")
                user.save()

            # Crear UsuarioEmpresa (OneToOne)
            UsuarioEmpresa.objects.get_or_create(
                usuario=user,
                defaults={
                    "sucursal": sucursal,
                    "cargo": first_name,
                    "fecha_contrato": date.today() - timedelta(days=365),
                    "fecha_ingreso": date.today() - timedelta(days=365),
                    "estado": "1",
                },
            )

            # Crear PersonalizacionUsuario
            PersonalizacionUsuario.objects.get_or_create(
                usuario=user,
                defaults={
                    "tema": "1",
                    "font_size": 13,
                    "sucursal_principal": sucursal,
                },
            )

    print_step(1, 1, f"{total_users} usuarios de clientes creados (3 por empresa)")


# =============================================================================
# 6. CATEGORÍAS DE GASTOS OPERATIVOS
# =============================================================================


def create_expense_categories():
    """Crea categorías base para gastos operativos/rendiciones."""
    print_section("6. Creando Categorías de Gastos Operativos")

    categorias_data = [
        ("Transporte", "Movilización, pasajes y transporte público"),
        ("Combustible", "Bencina, diésel y otros combustibles"),
        ("Alimentación", "Comidas y colaciones en terreno"),
        ("Hospedaje", "Alojamiento por trabajos fuera de base"),
        ("Peajes", "Peajes y TAG"),
        ("Estacionamiento", "Estacionamientos y parquímetros"),
        ("Materiales", "Materiales menores y consumibles"),
        ("Herramientas", "Herramientas o insumos de trabajo"),
        ("Servicios", "Servicios asociados a la ejecución"),
        ("Otros", "Gastos varios no clasificados"),
    ]

    creadas = 0
    for nombre, descripcion in categorias_data:
        _, created = CategoriaGastoRendicion.objects.get_or_create(
            nombre=nombre,
            defaults={"descripcion": descripcion},
        )
        if created:
            creadas += 1

    print_step(1, 1, f"{len(categorias_data)} categorías listas ({creadas} nuevas)")
    return categorias_data


# =============================================================================
# 7. CATEGORÍAS Y FABRICANTES
# =============================================================================


def create_categories_and_manufacturers():
    """Crea catálogos de categorías y fabricantes."""
    print_section("7. Creando Categorías y Fabricantes")

    categorias_names = [
        "Cámaras IP",
        "Cámaras Analógicas",
        "Grabadores y NVR",
        "Control de Acceso",
        "Alarmas e Intrusión",
        "Redes y Conectividad",
        "Energía y UPS",
        "Accesorios y Montaje",
        "Cableado y Conectores",
    ]

    categorias = {}
    for i, nombre in enumerate(categorias_names, 1):
        cat, _ = Categoria.objects.get_or_create(nombre=nombre)
        categorias[nombre] = cat

    print_step(1, 2, f"{len(categorias)} categorías creadas")

    fabricantes_names = [
        "Hikvision",
        "Dahua",
        "Ubiquiti",
        "TP-Link",
        "Intelbras",
        "APC",
        "Cisco",
        "Genérico",
    ]

    fabricantes = {}
    for i, nombre in enumerate(fabricantes_names, 1):
        fab, _ = Fabricante.objects.get_or_create(nombre=nombre)
        fabricantes[nombre] = fab

    print_step(2, 2, f"{len(fabricantes)} fabricantes creados")

    return categorias, fabricantes


# =============================================================================
# 8. PROVEEDORES
# =============================================================================


def create_providers(empresa_base):
    """Crea 10 proveedores para la empresa base."""
    print_section("8. Creando Proveedores")

    proveedores_data = [
        {
            "rut": "76555666-7",
            "nombre": "Importadora TechPro",
            "tipo_moneda": "1",
            "ejecutivo": "Juan Perez",
            "email": "j.perez@techpro.cl",
        },
        {
            "rut": "77888999-0",
            "nombre": "Distribuidora ElectroSur",
            "tipo_moneda": "2",
            "ejecutivo": "Maria Gonzalez",
            "email": "m.gonzalez@electrosur.cl",
        },
        {
            "rut": "78111222-3",
            "nombre": "Global Hardware Inc",
            "tipo_moneda": "3",
            "ejecutivo": "Robert Smith",
            "email": "r.smith@globalhardware.com",
        },
        {
            "rut": "78222333-4",
            "nombre": "Seguridad Integral Norte",
            "tipo_moneda": "2",
            "ejecutivo": "Patricia Silva",
            "email": "p.silva@sintnorte.cl",
        },
        {
            "rut": "78333444-5",
            "nombre": "CCTV Solutions",
            "tipo_moneda": "1",
            "ejecutivo": "Carlos Diaz",
            "email": "c.diaz@cctvsolutions.com",
        },
        {
            "rut": "78444555-6",
            "nombre": "Redes y Datos Chile",
            "tipo_moneda": "2",
            "ejecutivo": "Sofia Romero",
            "email": "s.romero@redesdatos.cl",
        },
        {
            "rut": "78555666-7",
            "nombre": "Control Access SpA",
            "tipo_moneda": "2",
            "ejecutivo": "Javier Soto",
            "email": "j.soto@controlaccess.cl",
        },
        {
            "rut": "78666777-8",
            "nombre": "Energia Segura Ltda",
            "tipo_moneda": "3",
            "ejecutivo": "Paula Rivas",
            "email": "p.rivas@energiasegura.cl",
        },
        {
            "rut": "78777888-9",
            "nombre": "Conectividad Andes",
            "tipo_moneda": "2",
            "ejecutivo": "Felipe Morales",
            "email": "f.morales@conectividadandes.cl",
        },
        {
            "rut": "78888999-1",
            "nombre": "Accesorios Omega",
            "tipo_moneda": "2",
            "ejecutivo": "Andrea Lara",
            "email": "a.lara@accesoriosomega.cl",
        },
    ]

    proveedores = []
    for i, prov_data in enumerate(proveedores_data, 1):
        proveedor, _ = ProveedorEmpresa.objects.get_or_create(
            rut=prov_data["rut"],
            empresa=empresa_base,
            defaults={
                "nombre": prov_data["nombre"],
                "direccion": "Dirección Proveedor 123",
                "telefono": "+56911111111",
                "email_ejecutivo": prov_data["email"],
                "ejecutivo_asignado": prov_data["ejecutivo"],
                "tipo_moneda": prov_data["tipo_moneda"],
            },
        )
        proveedores.append(proveedor)
        print_step(i, len(proveedores_data), prov_data["nombre"])

    return proveedores


# =============================================================================
# 9. ITEMS
# =============================================================================


def create_items(empresa_base, categorias, fabricantes, proveedores):
    """Crea ~50 items con categoría, fabricante y proveedores."""
    print_section("9. Creando Items")

    items_data = [
        {
            "nombre": "Cámara IP Domo 2MP",
            "categoria": "Cámaras IP",
            "fabricante": "Hikvision",
            "proveedores": [0, 3],
        },
        {
            "nombre": "Cámara IP Bullet 4MP",
            "categoria": "Cámaras IP",
            "fabricante": "Hikvision",
            "proveedores": [0, 4],
        },
        {
            "nombre": "Cámara IP Domo 4MP",
            "categoria": "Cámaras IP",
            "fabricante": "Dahua",
            "proveedores": [1, 4],
        },
        {
            "nombre": "Cámara IP PTZ 20x",
            "categoria": "Cámaras IP",
            "fabricante": "Dahua",
            "proveedores": [1, 4],
        },
        {
            "nombre": "Cámara Analógica 2MP",
            "categoria": "Cámaras Analógicas",
            "fabricante": "Hikvision",
            "proveedores": [0],
        },
        {
            "nombre": "Cámara Analógica 5MP",
            "categoria": "Cámaras Analógicas",
            "fabricante": "Dahua",
            "proveedores": [1],
        },
        {
            "nombre": "NVR 8 Canales",
            "categoria": "Grabadores y NVR",
            "fabricante": "Hikvision",
            "proveedores": [0],
        },
        {
            "nombre": "NVR 16 Canales",
            "categoria": "Grabadores y NVR",
            "fabricante": "Hikvision",
            "proveedores": [0],
        },
        {
            "nombre": "DVR 16 Canales",
            "categoria": "Grabadores y NVR",
            "fabricante": "Dahua",
            "proveedores": [1],
        },
        {
            "nombre": "Switch PoE 8 Puertos",
            "categoria": "Redes y Conectividad",
            "fabricante": "TP-Link",
            "proveedores": [5, 8],
        },
        {
            "nombre": "Switch PoE 24 Puertos",
            "categoria": "Redes y Conectividad",
            "fabricante": "Cisco",
            "proveedores": [5],
        },
        {
            "nombre": "Router Gigabit",
            "categoria": "Redes y Conectividad",
            "fabricante": "TP-Link",
            "proveedores": [5],
        },
        {
            "nombre": "Access Point AC",
            "categoria": "Redes y Conectividad",
            "fabricante": "Ubiquiti",
            "proveedores": [5, 8],
        },
        {
            "nombre": "Controlador de Acceso 2 Puertas",
            "categoria": "Control de Acceso",
            "fabricante": "Intelbras",
            "proveedores": [6],
        },
        {
            "nombre": "Lector RFID",
            "categoria": "Control de Acceso",
            "fabricante": "Intelbras",
            "proveedores": [6],
        },
        {
            "nombre": "Botón de Salida",
            "categoria": "Control de Acceso",
            "fabricante": "Genérico",
            "proveedores": [6, 9],
        },
        {
            "nombre": "Cerradura Electromagnética 600lb",
            "categoria": "Control de Acceso",
            "fabricante": "Genérico",
            "proveedores": [6, 9],
        },
        {
            "nombre": "Sirena 30W Exterior",
            "categoria": "Alarmas e Intrusión",
            "fabricante": "Genérico",
            "proveedores": [3, 9],
        },
        {
            "nombre": "Panel de Alarma 8 Zonas",
            "categoria": "Alarmas e Intrusión",
            "fabricante": "Intelbras",
            "proveedores": [3, 6],
        },
        {
            "nombre": "Sensor Movimiento PIR",
            "categoria": "Alarmas e Intrusión",
            "fabricante": "Genérico",
            "proveedores": [3, 9],
        },
        {
            "nombre": "Sensor Magnético",
            "categoria": "Alarmas e Intrusión",
            "fabricante": "Genérico",
            "proveedores": [3, 9],
        },
        {
            "nombre": "UPS 1000VA",
            "categoria": "Energía y UPS",
            "fabricante": "APC",
            "proveedores": [7],
        },
        {
            "nombre": "UPS 2000VA",
            "categoria": "Energía y UPS",
            "fabricante": "APC",
            "proveedores": [7],
        },
        {
            "nombre": "Regulador de Voltaje",
            "categoria": "Energía y UPS",
            "fabricante": "Genérico",
            "proveedores": [7],
        },
        {
            "nombre": 'Monitor 21.5" LED',
            "categoria": "Accesorios y Montaje",
            "fabricante": "Genérico",
            "proveedores": [5],
        },
        {
            "nombre": 'Monitor 27" LED',
            "categoria": "Accesorios y Montaje",
            "fabricante": "Genérico",
            "proveedores": [5],
        },
        {
            "nombre": "Bracket de Montaje",
            "categoria": "Accesorios y Montaje",
            "fabricante": "Genérico",
            "proveedores": [9],
        },
        {
            "nombre": "Cable UTP Cat6",
            "categoria": "Cableado y Conectores",
            "fabricante": "Genérico",
            "proveedores": [5, 8],
        },
        {
            "nombre": "Conector RJ45",
            "categoria": "Cableado y Conectores",
            "fabricante": "Genérico",
            "proveedores": [5],
        },
        {
            "nombre": "Canaleta Plástica",
            "categoria": "Cableado y Conectores",
            "fabricante": "Genérico",
            "proveedores": [9],
        },
    ]

    items = []
    for i, item_data in enumerate(items_data, 1):
        item, _ = ItemEmpresa.objects.get_or_create(
            nombre=item_data["nombre"],
            empresa=empresa_base,
            defaults={
                "categoria": categorias.get(item_data["categoria"]),
                "fabricante": fabricantes.get(item_data["fabricante"]),
            },
        )

        # Asociar proveedores
        prov_objs = [
            proveedores[idx]
            for idx in item_data["proveedores"]
            if idx < len(proveedores)
        ]
        item.proveedores_empresa.set(prov_objs)

        items.append(item)

    print_step(1, 1, f"{len(items)} items creados")
    return items


# =============================================================================
# 10. BODEGAS Y STOCK
# =============================================================================


def create_bodegas_and_stock(empresa_base, sucursal_base, items):
    """Crea bodegas y distribuye stock inicial."""
    print_section("10. Creando Bodegas y Stock Inicial")

    # Crear 2 bodegas
    bodegas = []
    for nombre in ["Bodega Principal", "Bodega Secundaria"]:
        bodega, _ = Bodega.objects.get_or_create(
            nombre=nombre,
            sucursal=sucursal_base,
        )
        bodegas.append(bodega)

    print_step(1, 2, f"{len(bodegas)} bodegas creadas")

    # Distribuir stock - cada item va a UNA bodega (OneToOneField)
    bodega_principal = bodegas[0]
    bodega_secundaria = bodegas[1] if len(bodegas) > 1 else bodegas[0]

    stock_count = 0
    for i, item in enumerate(items):
        # Distribuir entre bodegas
        bodega = bodega_principal if i % 2 == 0 else bodega_secundaria
        cantidad = random.randint(10, 100)

        # Intentar obtener o crear stock
        try:
            stock, created = StockItemEnBodega.objects.get_or_create(
                item=item, defaults={"bodega": bodega, "cantidad": cantidad}
            )
            if not created:
                # Si ya existe, actualizar
                stock.bodega = bodega
                stock.cantidad = cantidad
                stock.save()
            stock_count += 1
        except Exception as e:
            print(f"   Advertencia: No se pudo crear stock para {item.nombre}: {e}")

    print_step(2, 2, f"{stock_count} items en stock distribuidos")


# =============================================================================
# 11. CATÁLOGOS DE SERVICIOS
# =============================================================================


def create_service_catalogs():
    """Crea catálogos de servicios, visitas, etc."""
    print_section("11. Creando Catálogos")

    # Servicios de Cotización
    servicios = [
        "Instalación de Cámaras",
        "Configuración de NVR",
        "Mantenimiento Preventivo",
        "Soporte Técnico",
        "Consultoría",
    ]

    for nombre in servicios:
        Servicio.objects.get_or_create(nombre=nombre)

    print_step(1, 3, f"{len(servicios)} servicios creados")

    # Visitas de Contrato
    visitas_names = [
        "Visita de Mantenimiento Mensual",
        "Visita de Soporte Técnico",
        "Visita de Inspección",
    ]

    for nombre in visitas_names:
        Visita.objects.get_or_create(descripcion=nombre)

    print_step(2, 3, f"{len(visitas_names)} visitas creadas")

    # Licencias
    licencias = [
        ("Microsoft 365 Business Standard", "Microsoft"),
        ("Antivirus Corporativo", "Kaspersky"),
    ]

    for nombre, proveedor in licencias:
        Licencia.objects.get_or_create(nombre=nombre, proveedor=proveedor)

    print_step(3, 3, f"{len(licencias)} licencias creadas")


# =============================================================================
# 12. CONFIGURACIÓN BASE
# =============================================================================


def create_base_configuration():
    """Crea acuerdo de confidencialidad y otros datos de configuración."""
    print_section("12. Creando Configuración Base")

    AcuerdoConfidencialidadBase.objects.get_or_create(
        titulo="NDA Estándar",
        defaults={
            "contenido": "Este acuerdo protege la confidencialidad de información entre las partes."
        },
    )

    print_step(1, 1, "Acuerdo de Confidencialidad creado")


# =============================================================================
# MAIN
# =============================================================================


def main():
    """Ejecuta todo el seed."""
    print("\n")
    print("┌" + "─" * 78 + "┐")
    print("│" + "SEED BASE V2 - Población de Datos Maestros".center(78) + "│")
    print(
        "│"
        + "Análisis Profundo | Datos Correctos | Relaciones Completas".center(78)
        + "│"
    )
    print("└" + "─" * 78 + "┘")

    with transaction.atomic():
        # 0. Validar/crear superusuario
        superuser = ensure_superuser()

        # 1. Grupos
        grupos = create_groups()

        # 2. Empresa Base
        empresa_base, sucursal_base = create_base_company()

        # 3. Usuarios Internos
        usuarios_internos = create_internal_users(empresa_base, sucursal_base, grupos)

        # 4. Empresas Cliente
        clientes = create_client_companies(empresa_base)

        # 5. Usuarios Clientes
        create_client_users(clientes)

        # 6. Categorías de gastos operativos
        create_expense_categories()

        # 7. Categorías y Fabricantes
        categorias, fabricantes = create_categories_and_manufacturers()

        # 8. Proveedores
        proveedores = create_providers(empresa_base)

        # 9. Items
        items = create_items(empresa_base, categorias, fabricantes, proveedores)

        # 10. Bodegas y Stock
        create_bodegas_and_stock(empresa_base, sucursal_base, items)

        # 11. Catálogos
        create_service_catalogs()

        # 12. Configuración
        create_base_configuration()

    # Resumen final
    print_section("✅ SEED BASE COMPLETADO EXITOSAMENTE")
    print(
        """
  📊 Datos Creados:
     ✓ Superusuario creado/validado
     ✓ Empresa base (Snabbit) con recargo/PPM variables
     ✓ 1 sucursal con región/provincia/comuna completos
     ✓ 5 usuarios internos + Personalizaciones
     ✓ 12 empresas cliente con recargo/PPM variables
     ✓ 36 usuarios cliente (3 por empresa)
     ✓ 9 categorías de productos
     ✓ 8 fabricantes
    ✓ 10 categorías de gastos operativos
     ✓ 10 proveedores
     ✓ 30 items con relaciones completas
     ✓ 2 bodegas
     ✓ 30 registros de stock
     ✓ Catálogos de servicios, visitas, licencias
     ✓ Acuerdos de confidencialidad

  🎯 Ahora puedes:
     • Crear Cotizaciones manualmente
     • Crear Órdenes de Compra desde cotizaciones
     • Crear Guías de Salida (generarán OT automático)
     • Crear Contratos independientes
     • Probar flujos de negocio completos

  📝 Nota: Todos los usuarios NO SUPERUSUARIOS tienen contraseña 'test1234'
    """
    )


if __name__ == "__main__":
    main()
