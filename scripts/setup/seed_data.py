#!/usr/bin/env python
"""
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
    backend\ENV\Scripts\python.exe ..\scripts\setup\seed_data.py
"""
import os
import sys
import django
from decimal import Decimal
from datetime import date, timedelta

# Setup Django
backend_path = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(backend_path, 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sw_erp.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from empresas.models import Empresa, SucursalEmpresa, UsuarioEmpresa
from items.models import Categoria, Fabricante, ItemEmpresa
from bodegas.models import Bodega

User = get_user_model()


def crear_empresas_adicionales():
    """Crea empresas de prueba adicionales."""
    empresas_data = [
        {
            'rut': '76123456-7',
            'nombre': 'Empresa Cliente A',
            'direccion_principal': 'Av. Principal 100',
            'telefono': '+56922334455',
            'email': 'contacto@clientea.cl',
        },
        {
            'rut': '76234567-8',
            'nombre': 'Empresa Cliente B',
            'direccion_principal': 'Calle Secundaria 200',
            'telefono': '+56933445566',
            'email': 'info@clienteb.cl',
        },
    ]
    
    empresas = []
    for data in empresas_data:
        empresa, created = Empresa.objects.get_or_create(
            rut=data['rut'],
            defaults=data
        )
        empresas.append(empresa)
        if created:
            print(f"✓ Empresa '{empresa.nombre}' creada")
            
            # Crear sucursal para cada empresa
            SucursalEmpresa.objects.get_or_create(
                empresa=empresa,
                nombre='Sucursal Principal',
                defaults={
                    'direccion': data['direccion_principal'],
                    'telefono': data['telefono'],
                }
            )
        else:
            print(f"  Empresa '{empresa.nombre}' ya existe")
    
    return empresas


def crear_usuarios_prueba():
    """Crea usuarios de prueba con diferentes roles."""
    usuarios_data = [
        {
            'email': 'tecnico@snabbit.cl',
            'first_name': 'Juan',
            'last_name': 'Técnico',
            'password': 'test1234',
            'grupos': ['tecnico'],
        },
        {
            'email': 'bodeguero@snabbit.cl',
            'first_name': 'María',
            'last_name': 'Bodeguera',
            'password': 'test1234',
            'grupos': ['bodeguero'],
        },
        {
            'email': 'admin@snabbit.cl',
            'first_name': 'Pedro',
            'last_name': 'Admin',
            'password': 'test1234',
            'grupos': ['staff', 'superadmin'],
        },
    ]
    
    empresa_snabbit = Empresa.objects.get(rut='11111111-1')
    sucursal = SucursalEmpresa.objects.filter(empresa=empresa_snabbit).first()
    
    usuarios = []
    for data in usuarios_data:
        user, created = User.objects.get_or_create(
            email=data['email'],
            defaults={
                'first_name': data['first_name'],
                'last_name': data['last_name'],
            }
        )
        
        if created:
            user.set_password(data['password'])
            user.save()
            print(f"✓ Usuario '{user.email}' creado")
        else:
            print(f"  Usuario '{user.email}' ya existe")
        
        # Asociar a empresa con grupos
        usuario_empresa, _ = UsuarioEmpresa.objects.get_or_create(
            usuario=user,
            empresa=empresa_snabbit,
            defaults={'sucursal': sucursal, 'is_active': True}
        )
        
        # Asignar grupos
        grupos = Group.objects.filter(name__in=data['grupos'])
        usuario_empresa.grupos.set(grupos)
        
        usuarios.append(user)
    
    return usuarios


def crear_categorias_y_fabricantes():
    """Crea categorías y fabricantes de ejemplo."""
    categorias_data = [
        'Cámaras de Seguridad',
        'DVR/NVR',
        'Alarmas',
        'Control de Acceso',
        'Cables y Conectores',
    ]
    
    categorias = []
    for nombre in categorias_data:
        categoria, created = Categoria.objects.get_or_create(
            nombre=nombre,
            defaults={'descripcion': f'Categoría de {nombre}'}
        )
        categorias.append(categoria)
        if created:
            print(f"✓ Categoría '{categoria.nombre}' creada")
    
    fabricantes_data = [
        'Hikvision',
        'Dahua',
        'Samsung',
        'Axis',
        'Genérico',
    ]
    
    fabricantes = []
    for nombre in fabricantes_data:
        fabricante, created = Fabricante.objects.get_or_create(
            nombre=nombre,
            defaults={'pais_origen': 'China' if nombre in ['Hikvision', 'Dahua'] else 'USA'}
        )
        fabricantes.append(fabricante)
        if created:
            print(f"✓ Fabricante '{fabricante.nombre}' creado")
    
    return categorias, fabricantes


def crear_items_prueba(categorias, fabricantes):
    """Crea items de prueba."""
    empresa_snabbit = Empresa.objects.get(rut='11111111-1')
    
    items_data = [
        {
            'nombre': 'Cámara Domo 2MP',
            'codigo': 'CAM-DOMO-001',
            'precio': Decimal('45000'),
            'categoria': categorias[0],
            'fabricante': fabricantes[0],
        },
        {
            'nombre': 'DVR 8 Canales',
            'codigo': 'DVR-8CH-001',
            'precio': Decimal('120000'),
            'categoria': categorias[1],
            'fabricante': fabricantes[1],
        },
        {
            'nombre': 'Cable UTP Cat5e',
            'codigo': 'CAB-UTP-001',
            'precio': Decimal('500'),
            'categoria': categorias[4],
            'fabricante': fabricantes[4],
        },
    ]
    
    items = []
    for data in items_data:
        item, created = ItemEmpresa.objects.get_or_create(
            codigo=data['codigo'],
            empresa=empresa_snabbit,
            defaults={
                'nombre': data['nombre'],
                'precio': data['precio'],
                'categoria': data['categoria'],
                'fabricante': data['fabricante'],
                'descripcion': f"Item de prueba: {data['nombre']}",
            }
        )
        items.append(item)
        if created:
            print(f"✓ Item '{item.nombre}' creado")
    
    return items


def crear_bodegas_prueba():
    """Crea bodegas de prueba."""
    empresa_snabbit = Empresa.objects.get(rut='11111111-1')
    sucursal = SucursalEmpresa.objects.filter(empresa=empresa_snabbit).first()
    
    bodegas_data = [
        {
            'nombre': 'Bodega Principal',
            'direccion': 'Av. Principal 123',
        },
        {
            'nombre': 'Bodega Secundaria',
            'direccion': 'Calle Secundaria 456',
        },
    ]
    
    bodegas = []
    for data in bodegas_data:
        bodega, created = Bodega.objects.get_or_create(
            nombre=data['nombre'],
            empresa=empresa_snabbit,
            defaults={
                'direccion': data['direccion'],
                'sucursal': sucursal,
            }
        )
        bodegas.append(bodega)
        if created:
            print(f"✓ Bodega '{bodega.nombre}' creada")
    
    return bodegas


def main():
    print("=" * 60)
    print("Población de Datos de Prueba")
    print("=" * 60)
    print()
    
    # Verificar que existe empresa base
    try:
        Empresa.objects.get(rut='11111111-1')
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
    print()
    print("Usuarios de prueba creados:")
    print("  - tecnico@snabbit.cl / test1234")
    print("  - bodeguero@snabbit.cl / test1234")
    print("  - admin@snabbit.cl / test1234")
    print()


if __name__ == '__main__':
    main()
