#!/usr/bin/env python
"""
Script para resetear la base de datos a estado inicial.

⚠️ PELIGRO: Este script ELIMINA TODOS LOS DATOS de la base de datos.

Qué hace:
- Elimina el archivo db.sqlite3
- Re-ejecuta todas las migraciones
- Deja la base de datos limpia lista para uso

Cuándo usar:
- Desarrollo local cuando necesitas empezar de cero
- Antes de correr migraciones conflictivas
- Testing de inicialización completa
- NUNCA en producción

Uso:
    cd backend
    backend\ENV\Scripts\python.exe ..\scripts\setup\reset_db.py
"""
import os
import sys
import subprocess

# Paths
script_dir = os.path.dirname(os.path.abspath(__file__))
backend_path = os.path.join(os.path.dirname(os.path.dirname(script_dir)), 'backend')
db_path = os.path.join(backend_path, 'db.sqlite3')
python_exe = os.path.join(backend_path, 'ENV', 'Scripts', 'python.exe')
manage_py = os.path.join(backend_path, 'manage.py')


def confirmar_accion():
    """Pide confirmación al usuario antes de continuar."""
    print("⚠️  ADVERTENCIA: Esta acción eliminará TODOS los datos de la base de datos.")
    print()
    respuesta = input("¿Estás seguro de continuar? (escribe 'SI' para confirmar): ")
    return respuesta.strip().upper() == 'SI'


def eliminar_base_datos():
    """Elimina el archivo de base de datos SQLite."""
    if os.path.exists(db_path):
        try:
            os.remove(db_path)
            print(f"✓ Base de datos eliminada: {db_path}")
            return True
        except Exception as e:
            print(f"❌ Error al eliminar base de datos: {e}")
            return False
    else:
        print("  Base de datos no existe (ya está limpia)")
        return True


def ejecutar_migraciones():
    """Ejecuta todas las migraciones de Django."""
    try:
        print("\n--- Ejecutando migraciones ---")
        result = subprocess.run(
            [python_exe, manage_py, 'migrate'],
            cwd=backend_path,
            capture_output=True,
            text=True
        )
        
        if result.returncode == 0:
            print("✓ Migraciones ejecutadas exitosamente")
            return True
        else:
            print(f"❌ Error al ejecutar migraciones:")
            print(result.stderr)
            return False
    except Exception as e:
        print(f"❌ Error al ejecutar migraciones: {e}")
        return False


def main():
    print("=" * 60)
    print("Reset de Base de Datos")
    print("=" * 60)
    print()
    
    # Confirmación
    if not confirmar_accion():
        print("\n❌ Operación cancelada por el usuario.")
        return
    
    print()
    print("--- Eliminando base de datos ---")
    if not eliminar_base_datos():
        return
    
    print()
    if not ejecutar_migraciones():
        return
    
    print()
    print("=" * 60)
    print("✓ Base de datos reseteada exitosamente")
    print("=" * 60)
    print()
    print("Próximos pasos:")
    print("1. Crear superusuario:")
    print("   cd backend")
    print("   backend\\ENV\\Scripts\\python.exe manage.py createsuperuser")
    print()
    print("2. Configurar empresa y permisos:")
    print("   backend\\ENV\\Scripts\\python.exe ..\\scripts\\setup\\setup_superuser.py")
    print()
    print("3. (Opcional) Poblar datos de prueba:")
    print("   backend\\ENV\\Scripts\\python.exe ..\\scripts\\setup\\seed_data.py")
    print()


if __name__ == '__main__':
    main()
