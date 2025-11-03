#!/usr/bin/env python
"""
Script para crear backup de la base de datos SQLite.

Qué hace:
- Crea copia de seguridad de db.sqlite3 con timestamp
- Guarda en carpeta backups/ dentro de backend/
- Muestra información del backup creado

Cuándo usar:
- Antes de migraciones grandes
- Antes de operaciones peligrosas
- Backup periódico en desarrollo
- Nunca reemplaza backup en producción (usar dump SQL)

Uso:
    cd backend
    backend\ENV\Scripts\python.exe ..\scripts\maintenance\backup_db.py
"""
import os
import shutil
from datetime import datetime


def crear_backup():
    """Crea backup de la base de datos."""
    # Paths
    script_dir = os.path.dirname(os.path.abspath(__file__))
    backend_path = os.path.join(os.path.dirname(os.path.dirname(script_dir)), 'backend')
    db_path = os.path.join(backend_path, 'db.sqlite3')
    backups_dir = os.path.join(backend_path, 'backups')
    
    # Verificar que existe DB
    if not os.path.exists(db_path):
        print("❌ Error: No se encontró db.sqlite3")
        return False
    
    # Crear carpeta backups si no existe
    os.makedirs(backups_dir, exist_ok=True)
    
    # Nombre del backup con timestamp
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_filename = f"db_backup_{timestamp}.sqlite3"
    backup_path = os.path.join(backups_dir, backup_filename)
    
    try:
        # Copiar archivo
        shutil.copy2(db_path, backup_path)
        
        # Obtener tamaño
        size_bytes = os.path.getsize(backup_path)
        size_mb = size_bytes / (1024 * 1024)
        
        print(f"✓ Backup creado exitosamente")
        print(f"  Archivo: {backup_filename}")
        print(f"  Ubicación: {backup_path}")
        print(f"  Tamaño: {size_mb:.2f} MB")
        
        return True
    except Exception as e:
        print(f"❌ Error al crear backup: {e}")
        return False


def listar_backups():
    """Lista backups existentes."""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    backend_path = os.path.join(os.path.dirname(os.path.dirname(script_dir)), 'backend')
    backups_dir = os.path.join(backend_path, 'backups')
    
    if not os.path.exists(backups_dir):
        print("  No hay backups previos")
        return
    
    backups = [f for f in os.listdir(backups_dir) if f.endswith('.sqlite3')]
    
    if not backups:
        print("  No hay backups previos")
        return
    
    print(f"  Total: {len(backups)} backup{'s' if len(backups) != 1 else ''}")
    print()
    
    # Mostrar los 5 más recientes
    backups.sort(reverse=True)
    for backup in backups[:5]:
        backup_path = os.path.join(backups_dir, backup)
        size_mb = os.path.getsize(backup_path) / (1024 * 1024)
        timestamp_str = backup.replace('db_backup_', '').replace('.sqlite3', '')
        
        # Formatear timestamp
        try:
            dt = datetime.strptime(timestamp_str, '%Y%m%d_%H%M%S')
            fecha = dt.strftime('%Y-%m-%d %H:%M:%S')
        except:
            fecha = timestamp_str
        
        print(f"  - {backup:<30} {size_mb:>6.2f} MB   {fecha}")
    
    if len(backups) > 5:
        print(f"  ... y {len(backups) - 5} más")


def main():
    print("=" * 60)
    print("Backup de Base de Datos")
    print("=" * 60)
    print()
    
    print("--- Creando backup ---")
    if not crear_backup():
        return
    
    print()
    print("--- Backups existentes ---")
    listar_backups()
    print()
    
    print("=" * 60)
    print("✓ Backup completado")
    print("=" * 60)
    print()
    print("Para restaurar un backup:")
    print("1. Detén el servidor backend")
    print("2. Reemplaza db.sqlite3 con el archivo de backup")
    print("3. Reinicia el servidor")
    print()


if __name__ == '__main__':
    main()
