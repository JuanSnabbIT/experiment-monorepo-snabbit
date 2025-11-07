#!/usr/bin/env python
"""\
Script para poblar la base de datos con datos de prueba.

Qué hace:
- Crea múltiples empresas y sucursales
- Crea usuarios con diferentes roles
- Crea items de prueba (productos/servicios)
- Crea bodegas con stock
- Crea cotizaciones de ejemplo
- Útil para desarrollo y testing

Cuándo usar:
- Después de reset_db para tener datos de prueba
- Testing de funcionalidades con datos realistas
- Demos del sistema

Prerequisitos:
- Base de datos migrada
- Superusuario configurado (setup_superuser.py)

Uso:
    cd backend
    backend\\ENV\\Scripts\\python.exe ..\\scripts\\setup\\seed_data.py
"""
import os
import sys
from pathlib import Path

import django

# Setup Django
backend_path = os.path.dirname(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
)
sys.path.insert(0, os.path.join(backend_path, "backend"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "sw_erp.settings")
django.setup()

from bodegas.models import Bodega
from core.models import PersonalizacionUsuario
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from empresas.models import Empresa, SucursalEmpresa, UsuarioEmpresa
from items.models import Categoria, Fabricante, ItemEmpresa
from openpyxl import load_workbook

User = get_user_model()

BASE_BACKEND_PATH = Path(backend_path) / "backend"
EXCEL_USER_FILES = [
    "usuarios_aygasociados.xlsx",
    "usuarios_camacoes.xlsx",
    "usuarios_molinarios.xlsx",
    "usuarios_prodalmen.xlsx",
]
DEFAULT_EXCEL_PASSWORD = "test1234"


def crear_empresas_adicionales():
    """Crea empresas de prueba adicionales."""
    empresas_data = [
        {
            "rut": "76123456-7",
            "nombre": "Empresa Cliente A",
            "direccion_principal": "Av. Principal 100",
            "telefono": "+56922334455",
            "email": "contacto@clientea.cl",
        },
        {
            "rut": "76234567-8",
            "nombre": "Empresa Cliente B",
            "direccion_principal": "Calle Secundaria 200",
            "telefono": "+56933445566",
            "email": "info@clienteb.cl",
        },
    ]

    empresas = []
    for data in empresas_data:
        empresa, created = Empresa.objects.get_or_create(
            rut_empresa=data["rut"],
            defaults={
                "nombre": data["nombre"],
                "direccion_principal": data["direccion_principal"],
                "telefono": data["telefono"],
                "email": data["email"],
            },
        )
        empresas.append(empresa)
        if created:
            print(f"✓ Empresa '{empresa.nombre}' creada")

            # Crear sucursal para cada empresa
            SucursalEmpresa.objects.get_or_create(
                empresa=empresa,
                nombre="Sucursal Principal",
                defaults={
                    "direccion": data["direccion_principal"],
                    "telefono": data["telefono"],
                },
            )
        else:
            print(f"  Empresa '{empresa.nombre}' ya existe")

    return empresas


def crear_usuarios_prueba():
    """Crea usuarios de prueba con diferentes roles."""
    usuarios_data = [
        {
            "email": "tecnico@snabbit.cl",
            "first_name": "Juan",
            "last_name": "Técnico",
            "password": "test1234",
            "grupos": ["tecnico"],
        },
        {
            "email": "bodeguero@snabbit.cl",
            "first_name": "María",
            "last_name": "Bodeguera",
            "password": "test1234",
            "grupos": ["bodeguero"],
        },
        {
            "email": "admin@snabbit.cl",
            "first_name": "Pedro",
            "last_name": "Admin",
            "password": "test1234",
            "grupos": ["staff", "superadmin"],
        },
    ]

    empresa_snabbit = Empresa.objects.get(rut_empresa="11111111-1")
    sucursal = SucursalEmpresa.objects.filter(empresa=empresa_snabbit).first()

    usuarios = []
    for data in usuarios_data:
        user, created = User.objects.get_or_create(
            email=data["email"],
            defaults={
                "first_name": data["first_name"],
                "last_name": data["last_name"],
            },
        )

        if created:
            user.set_password(data["password"])
            user.save()
            print(f"✓ Usuario '{user.email}' creado")
        else:
            print(f"  Usuario '{user.email}' ya existe")

        # Asociar a empresa con grupos
        usuario_empresa, _ = UsuarioEmpresa.objects.get_or_create(
            usuario=user,
            defaults={
                "sucursal": sucursal,
                "estado": "1",
            },
        )
        if usuario_empresa.sucursal_id != sucursal.id:
            usuario_empresa.sucursal = sucursal
            usuario_empresa.save(update_fields=["sucursal"])

        # Asignar grupos
        grupos = Group.objects.filter(name__in=data["grupos"])
        usuario_empresa.grupos.set(grupos)

        usuarios.append(user)

    return usuarios


def crear_categorias_y_fabricantes():
    """Crea categorías y fabricantes de ejemplo."""
    categorias_data = [
        "Cámaras de Seguridad",
        "DVR/NVR",
        "Alarmas",
        "Control de Acceso",
        "Cables y Conectores",
    ]

    categorias = []
    for nombre in categorias_data:
        categoria, created = Categoria.objects.get_or_create(nombre=nombre)
        categorias.append(categoria)
        if created:
            print(f"✓ Categoría '{categoria.nombre}' creada")

    fabricantes_data = [
        "Hikvision",
        "Dahua",
        "Samsung",
        "Axis",
        "Genérico",
    ]

    fabricantes = []
    for nombre in fabricantes_data:
        fabricante, created = Fabricante.objects.get_or_create(nombre=nombre)
        fabricantes.append(fabricante)
        if created:
            print(f"✓ Fabricante '{fabricante.nombre}' creado")

    return categorias, fabricantes


def crear_items_prueba(categorias, fabricantes):
    """Crea items de prueba."""
    empresa_snabbit = Empresa.objects.get(rut_empresa="11111111-1")

    items_data = [
        {
            "nombre": "Cámara Domo 2MP",
            "descripcion_corta": "CAM-DOMO-001",
            "categoria": categorias[0],
            "fabricante": fabricantes[0],
        },
        {
            "nombre": "DVR 8 Canales",
            "descripcion_corta": "DVR-8CH-001",
            "categoria": categorias[1],
            "fabricante": fabricantes[1],
        },
        {
            "nombre": "Cable UTP Cat5e",
            "descripcion_corta": "CAB-UTP-001",
            "categoria": categorias[4],
            "fabricante": fabricantes[4],
        },
    ]

    items = []
    for data in items_data:
        item, created = ItemEmpresa.objects.get_or_create(
            empresa=empresa_snabbit,
            nombre=data["nombre"],
            defaults={
                "descripcion_corta": data["descripcion_corta"],
                "categoria": data["categoria"],
                "fabricante": data["fabricante"],
            },
        )
        items.append(item)
        if created:
            print(f"✓ Item '{item.nombre}' creado")
        else:
            cambios = False
            if data["categoria"] and item.categoria_id != data["categoria"].id:
                item.categoria = data["categoria"]
                cambios = True
            if data["fabricante"] and item.fabricante_id != data["fabricante"].id:
                item.fabricante = data["fabricante"]
                cambios = True
            if (
                data["descripcion_corta"]
                and item.descripcion_corta != data["descripcion_corta"]
            ):
                item.descripcion_corta = data["descripcion_corta"]
                cambios = True
            if cambios:
                item.save()
                print(f"✓ Item '{item.nombre}' actualizado")

    return items


def crear_bodegas_prueba():
    """Crea bodegas de prueba."""
    empresa_snabbit = Empresa.objects.get(rut_empresa="11111111-1")
    sucursal = _obtener_sucursal_principal(empresa_snabbit)

    bodegas_data = [
        {
            "nombre": "Bodega Principal",
        },
        {
            "nombre": "Bodega Secundaria",
        },
    ]

    bodegas = []
    for data in bodegas_data:
        bodega, created = Bodega.objects.get_or_create(
            nombre=data["nombre"],
            sucursal=sucursal,
        )
        bodegas.append(bodega)
        if created:
            print(f"✓ Bodega '{bodega.nombre}' creada")
        elif bodega.sucursal_id != sucursal.id:
            bodega.sucursal = sucursal
            bodega.save(update_fields=["sucursal"])
            print(f"✓ Bodega '{bodega.nombre}' actualizada")

    return bodegas


def _clean_str(value):
    if value is None:
        return ""
    text = str(value).strip()
    return text


def _obtener_sucursal_principal(empresa: Empresa) -> SucursalEmpresa:
    sucursal = empresa.sucursales.first()
    if not sucursal:
        sucursal = SucursalEmpresa.objects.create(
            empresa=empresa,
            nombre="Casa Matriz",
            direccion=empresa.direccion_principal or "Dirección no especificada",
        )
    return sucursal


def cargar_usuarios_desde_excels():
    """Crea empresas y usuarios a partir de planillas Excel ubicadas en backend/."""
    print("--- Cargando usuarios desde planillas Excel ---")

    archivos = []
    for nombre in EXCEL_USER_FILES:
        ruta = BASE_BACKEND_PATH / nombre
        if ruta.exists():
            archivos.append(ruta)
        else:
            print(f"  ⚠️ Archivo '{nombre}' no encontrado, se omite.")

    if not archivos:
        print("  ⚠️ No se encontraron planillas de usuarios.")
        return {"empresas": 0, "usuarios": 0}

    grupo_representante = Group.objects.filter(name="representante_legal").first()

    totales = {"empresas": 0, "usuarios": 0}
    for archivo in archivos:
        wb = load_workbook(archivo)
        sheet = wb.active
        headers = [cell.value for cell in next(sheet.iter_rows(min_row=1, max_row=1))]

        try:
            idx_empresa = headers.index("Empresa")
            idx_nombre = headers.index("Nombre")
            idx_apellido = headers.index("Apellido")
            idx_correo = headers.index("Correo")
        except ValueError:
            print(f"  ⚠️ Encabezados inesperados en '{archivo.name}', se omite.")
            continue

        print(f"  Procesando '{archivo.name}' ({sheet.max_row - 1} filas)")

        for row in sheet.iter_rows(min_row=2, values_only=True):
            empresa_nombre = _clean_str(row[idx_empresa])
            email = _clean_str(row[idx_correo]).lower()
            first_name = _clean_str(row[idx_nombre])
            last_name = _clean_str(row[idx_apellido])

            if not email:
                continue

            if not empresa_nombre:
                empresa_nombre = "Empresa sin nombre"

            empresa_defaults = {
                "direccion_principal": "Dirección no especificada",
                "telefono": "",
                "email": "",
            }
            empresa, creada = Empresa.objects.get_or_create(
                nombre=empresa_nombre,
                defaults=empresa_defaults,
            )
            if creada:
                totales["empresas"] += 1

            # Asegurar que la empresa tenga sucursal principal
            sucursal = _obtener_sucursal_principal(empresa)

            user, creado_usuario = User.objects.get_or_create(
                email=email,
                defaults={
                    "first_name": first_name or "Usuario",
                    "last_name": last_name or "",
                    "is_active": True,
                },
            )
            if creado_usuario:
                user.set_password(DEFAULT_EXCEL_PASSWORD)
                user.is_active = True
                user.save()
                totales["usuarios"] += 1
            else:
                actualizado = False
                if first_name and user.first_name != first_name:
                    user.first_name = first_name
                    actualizado = True
                if last_name and user.last_name != last_name:
                    user.last_name = last_name
                    actualizado = True
                if not user.is_active:
                    user.is_active = True
                    actualizado = True
                if actualizado:
                    user.save()

            usuario_empresa, creado_ue = UsuarioEmpresa.objects.get_or_create(
                usuario=user,
                defaults={
                    "sucursal": sucursal,
                    "estado": "1",
                },
            )

            if not creado_ue:
                cambios = False
                if usuario_empresa.sucursal_id != sucursal.id:
                    usuario_empresa.sucursal = sucursal
                    cambios = True
                if usuario_empresa.estado != "1":
                    usuario_empresa.estado = "1"
                    cambios = True
                if cambios:
                    usuario_empresa.save()
            else:
                usuario_empresa.save()

            if grupo_representante:
                usuario_empresa.grupos.add(grupo_representante)

            personalizacion, creada_personalizacion = (
                PersonalizacionUsuario.objects.get_or_create(
                    usuario=user,
                    defaults={
                        "tema": "3",
                        "font_size": 14,
                        "sucursal_principal": sucursal,
                    },
                )
            )
            if (
                not creada_personalizacion
                and personalizacion.sucursal_principal_id != sucursal.id
            ):
                personalizacion.sucursal_principal = sucursal
                personalizacion.save(update_fields=["sucursal_principal"])

    return totales


def main():
    print("=" * 60)
    print("Población de Datos de Prueba")
    print("=" * 60)
    print()

    # Verificar que existe empresa base
    try:
        Empresa.objects.get(rut_empresa="11111111-1")
    except Empresa.DoesNotExist:
        print("❌ Error: No se encontró la empresa base 'Snabbit'.")
        print("   Ejecuta primero: setup_superuser.py")
        return

    print("--- Creando empresas adicionales ---")
    empresas = crear_empresas_adicionales()
    print()

    print("--- Creando usuarios de prueba ---")
    usuarios = crear_usuarios_prueba()
    print()

    print("--- Creando categorías y fabricantes ---")
    categorias, fabricantes = crear_categorias_y_fabricantes()
    print()

    print("--- Creando items de prueba ---")
    items = crear_items_prueba(categorias, fabricantes)
    print()

    print("--- Creando bodegas de prueba ---")
    bodegas = crear_bodegas_prueba()
    print()

    totales_excel = cargar_usuarios_desde_excels()
    print()

    print("=" * 60)
    print("✓ Datos de prueba creados exitosamente")
    print("=" * 60)
    print()
    print("Resumen:")
    print(f"- Empresas: {len(empresas) + 1} (incluyendo Snabbit)")
    print(f"- Usuarios: {len(usuarios)}")
    print(f"- Categorías: {len(categorias)}")
    print(f"- Fabricantes: {len(fabricantes)}")
    print(f"- Items: {len(items)}")
    print(f"- Bodegas: {len(bodegas)}")
    print(f"- Empresas desde Excel: {totales_excel['empresas']}")
    print(f"- Usuarios desde Excel: {totales_excel['usuarios']}")
    print()
    print("Usuarios de prueba creados:")
    print("  - tecnico@snabbit.cl / test1234")
    print("  - bodeguero@snabbit.cl / test1234")
    print("  - admin@snabbit.cl / test1234")
    print()


if __name__ == "__main__":
    main()
