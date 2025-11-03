#!/usr/bin/env python
"""
Script para configurar un superusuario con permisos de empresa.

Qué hace:
- Crea grupos de permisos estándar (staff, superadmin, multi-empresas, etc.)
- Crea empresa inicial "Snabbit" con sucursal "Casa Matriz"
- Asocia el superusuario a la empresa con grupos administrativos
- Configura personalización del usuario para el dashboard

Cuándo usar:
- Primera vez que inicializas el proyecto
- Después de resetear la base de datos
- Al configurar un nuevo entorno de desarrollo

Prerequisitos:
- Haber ejecutado: python manage.py migrate
- Haber creado superusuario: python manage.py createsuperuser

Uso:
    cd backend
    backend\ENV\Scripts\python.exe ..\scripts\setup\setup_superuser.py
"""
import os
import sys
import django

# Agregar path del backend al PYTHONPATH
backend_path = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(backend_path, 'backend'))

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sw_erp.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from empresas.models import Empresa, SucursalEmpresa, UsuarioEmpresa
from core.models import Personalizacion

User = get_user_model()


def crear_grupos():
    """Crea los grupos necesarios para el sistema."""
    grupos = [
        ('staff', 'Personal administrativo general'),
        ('superadmin', 'Administrador con permisos máximos'),
        ('multi-empresas', 'Acceso a múltiples empresas'),
        ('tecnico', 'Técnico de campo para OT y visitas'),
        ('bodeguero', 'Encargado de bodega e inventario'),
        ('representante_legal', 'Representante legal de empresa'),
    ]
    
    grupos_creados = []
    for nombre_grupo, descripcion in grupos:
        grupo, created = Group.objects.get_or_create(name=nombre_grupo)
        grupos_creados.append(grupo)
        if created:
            print(f"✓ Grupo '{nombre_grupo}' creado")
        else:
            print(f"  Grupo '{nombre_grupo}' ya existe")
    
    return grupos_creados


def crear_empresa_inicial():
    """Crea una empresa y sucursal inicial."""
    empresa, created = Empresa.objects.get_or_create(
        rut='11111111-1',
        defaults={
            'nombre': 'Snabbit',
            'direccion_principal': 'Dirección Principal 123',
            'telefono': '+56912345678',
            'email': 'contacto@snabbit.cl',
        }
    )
    
    if created:
        print(f"✓ Empresa '{empresa.nombre}' creada (RUT: {empresa.rut})")
    else:
        print(f"  Empresa '{empresa.nombre}' ya existe (RUT: {empresa.rut})")
    
    sucursal, created = SucursalEmpresa.objects.get_or_create(
        empresa=empresa,
        nombre='Casa Matriz',
        defaults={
            'direccion': 'Dirección Principal 123',
            'telefono': '+56912345678',
        }
    )
    
    if created:
        print(f"✓ Sucursal '{sucursal.nombre}' creada")
    else:
        print(f"  Sucursal '{sucursal.nombre}' ya existe")
    
    return empresa, sucursal


def configurar_usuario_empresa(user, empresa, sucursal, grupos):
    """Configura un UsuarioEmpresa con grupos administrativos."""
    usuario_empresa, created = UsuarioEmpresa.objects.get_or_create(
        usuario=user,
        empresa=empresa,
        defaults={
            'sucursal': sucursal,
            'is_active': True,
        }
    )
    
    if created:
        print(f"✓ UsuarioEmpresa creado para '{user.email}'")
    else:
        print(f"  UsuarioEmpresa ya existe para '{user.email}'")
    
    # Asignar grupos administrativos
    grupos_admin = [g for g in grupos if g.name in ['staff', 'superadmin', 'multi-empresas']]
    usuario_empresa.grupos.set(grupos_admin)
    usuario_empresa.save()
    print(f"✓ Grupos asignados: {', '.join([g.name for g in grupos_admin])}")
    
    return usuario_empresa


def configurar_personalizacion(user, sucursal, empresa):
    """Configura la personalización del usuario para el dashboard."""
    personalizacion, created = Personalizacion.objects.get_or_create(
        usuario=user,
        defaults={
            'tema': 'system',
            'font_size': 14,
            'sucursal_principal': sucursal,
            'empresa': empresa,
            'dashboard_preferences': {}
        }
    )
    
    if created:
        print(f"✓ Personalización creada para '{user.email}'")
    else:
        # Actualizar sucursal y empresa si no estaban configuradas
        actualizado = False
        if not personalizacion.sucursal_principal:
            personalizacion.sucursal_principal = sucursal
            actualizado = True
        if not personalizacion.empresa:
            personalizacion.empresa = empresa
            actualizado = True
        
        if actualizado:
            personalizacion.save()
            print(f"✓ Personalización actualizada para '{user.email}'")
        else:
            print(f"  Personalización ya existe para '{user.email}'")
    
    return personalizacion


def main():
    print("=" * 60)
    print("Configuración de Superusuario con Empresa")
    print("=" * 60)
    print()
    
    # 1. Buscar superusuario
    try:
        superuser = User.objects.filter(is_superuser=True).first()
        if not superuser:
            print("❌ No se encontró ningún superusuario.")
            print()
            print("   Ejecuta primero:")
            print("   cd backend")
            print("   backend\\ENV\\Scripts\\python.exe manage.py createsuperuser")
            print()
            return
        
        print(f"✓ Superusuario encontrado: {superuser.email}")
        print()
    except Exception as e:
        print(f"❌ Error al buscar superusuario: {e}")
        return
    
    # 2. Crear grupos
    print("--- Creando grupos de permisos ---")
    grupos = crear_grupos()
    print()
    
    # 3. Crear empresa y sucursal
    print("--- Creando empresa inicial ---")
    empresa, sucursal = crear_empresa_inicial()
    print()
    
    # 4. Configurar UsuarioEmpresa
    print("--- Configurando UsuarioEmpresa ---")
    usuario_empresa = configurar_usuario_empresa(superuser, empresa, sucursal, grupos)
    print()
    
    # 5. Configurar Personalización
    print("--- Configurando Personalización ---")
    personalizacion = configurar_personalizacion(superuser, sucursal, empresa)
    print()
    
    print("=" * 60)
    print("✓ Configuración completada exitosamente")
    print("=" * 60)
    print()
    print("Próximos pasos:")
    print("1. Inicia el backend: python manage.py runserver")
    print("2. Inicia el frontend: cd ../frontend && npm run dev")
    print("3. Accede a http://localhost:5173")
    print("4. Login con tu superusuario")
    print("5. ¡Ahora tienes acceso completo al sistema!")
    print()


if __name__ == '__main__':
    main()
