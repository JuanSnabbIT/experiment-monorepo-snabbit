#!/usr/bin/env python
"""
Script para crear o actualizar grupos de permisos estándar.

Qué hace:
- Crea todos los grupos estándar del sistema
- Muestra qué grupos ya existen y cuáles son nuevos
- Útil para sincronizar grupos entre entornos

Cuándo usar:
- Agregar nuevos roles al sistema
- Sincronizar grupos entre desarrollo/producción
- Después de cambios en permisos del sistema

Uso:
    cd backend
    backend\ENV\Scripts\python.exe ..\scripts\development\create_groups.py
"""
import os
import sys
import django

# Setup Django
backend_path = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(backend_path, 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sw_erp.settings')
django.setup()

from django.contrib.auth.models import Group


# Definición de grupos estándar del sistema
GRUPOS_ESTANDAR = [
    {
        'name': 'staff',
        'descripcion': 'Personal administrativo general - Acceso a funciones de gestión',
    },
    {
        'name': 'superadmin',
        'descripcion': 'Administrador con permisos máximos - Acceso total al sistema',
    },
    {
        'name': 'multi-empresas',
        'descripcion': 'Acceso a múltiples empresas - Puede ver y gestionar varias empresas',
    },
    {
        'name': 'tecnico',
        'descripcion': 'Técnico de campo - Gestión de OT, visitas y equipos',
    },
    {
        'name': 'bodeguero',
        'descripcion': 'Encargado de bodega - Gestión de inventario y movimientos',
    },
    {
        'name': 'representante_legal',
        'descripcion': 'Representante legal - Firma de contratos y documentos legales',
    },
    {
        'name': 'vendedor',
        'descripcion': 'Vendedor - Gestión de cotizaciones y clientes',
    },
    {
        'name': 'comprador',
        'descripcion': 'Comprador - Gestión de órdenes de compra y proveedores',
    },
]


def crear_grupos():
    """Crea o actualiza los grupos estándar."""
    grupos_creados = []
    grupos_existentes = []
    
    for grupo_data in GRUPOS_ESTANDAR:
        grupo, created = Group.objects.get_or_create(
            name=grupo_data['name']
        )
        
        if created:
            grupos_creados.append(grupo)
            print(f"✓ Grupo '{grupo.name}' creado")
            print(f"  └─ {grupo_data['descripcion']}")
        else:
            grupos_existentes.append(grupo)
            print(f"  Grupo '{grupo.name}' ya existe")
    
    return grupos_creados, grupos_existentes


def listar_grupos_actuales():
    """Lista todos los grupos actuales en el sistema."""
    grupos = Group.objects.all().order_by('name')
    
    if not grupos:
        print("  No hay grupos en el sistema")
        return
    
    for grupo in grupos:
        # Contar usuarios en cada grupo
        usuarios_count = grupo.user_set.count()
        usuarios_empresa_count = grupo.usuarioempresa_set.count()
        total = usuarios_count + usuarios_empresa_count
        
        print(f"  - {grupo.name:<25} ({total} usuario{'s' if total != 1 else ''})")


def main():
    print("=" * 60)
    print("Creación de Grupos de Permisos")
    print("=" * 60)
    print()
    
    print("--- Grupos estándar definidos ---")
    for grupo_data in GRUPOS_ESTANDAR:
        print(f"  - {grupo_data['name']:<25} → {grupo_data['descripcion']}")
    print()
    
    print("--- Creando/verificando grupos ---")
    grupos_creados, grupos_existentes = crear_grupos()
    print()
    
    print("--- Resumen ---")
    print(f"  Grupos creados: {len(grupos_creados)}")
    print(f"  Grupos existentes: {len(grupos_existentes)}")
    print()
    
    print("--- Grupos actuales en el sistema ---")
    listar_grupos_actuales()
    print()
    
    print("=" * 60)
    print("✓ Operación completada")
    print("=" * 60)
    print()
    
    if grupos_creados:
        print("Los nuevos grupos están listos para ser asignados a usuarios")
        print("desde Django Admin (/admin/empresas/usuarioempresa/)")
    print()


if __name__ == '__main__':
    main()
