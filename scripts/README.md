# Scripts de Utilidad - ERP Snabbit

Colección de scripts para inicialización, desarrollo y mantenimiento del monorepo ERP.

## Estructura

```
scripts/
├── README.md                    # Este archivo
├── setup/                       # Scripts de inicialización y configuración
│   ├── setup_superuser.py       # Configurar superusuario con empresa
│   ├── reset_db.py              # Resetear base de datos a estado inicial
│   └── seed_data.py             # Poblar DB con datos de prueba
├── development/                 # Scripts para desarrollo
│   ├── create_groups.py        # Crear grupos de permisos
│   └── export_fixtures.py      # Exportar fixtures para testing
└── maintenance/                 # Scripts de mantenimiento
    ├── cleanup_migrations.py   # Limpiar migraciones
    └── backup_db.py            # Backup de base de datos
```

## Prerequisitos

Todos los scripts deben ejecutarse desde la carpeta `backend/` con el entorno virtual activado:

```cmd
cd backend
backend\ENV\Scripts\python.exe scripts\<categoria>\<script>.py
```

O desde la raíz del proyecto:

```cmd
backend\ENV\Scripts\python.exe scripts\<categoria>\<script>.py
```

## Scripts Disponibles

### Setup (Inicialización)

#### 1. setup_superuser.py
**Propósito**: Configurar un superusuario con empresa y grupos de permisos.

**Cuándo usar**: 
- Primera vez que inicializas el proyecto
- Después de resetear la base de datos
- Al configurar un nuevo entorno (notebook, servidor)

**Qué hace**:
- ✅ Crea grupos estándar (staff, superadmin, multi-empresas, tecnico, bodeguero)
- ✅ Crea empresa inicial "Snabbit" y sucursal "Casa Matriz"
- ✅ Asocia superusuario a la empresa con grupos administrativos
- ✅ Configura personalización del usuario

**Uso**:
```cmd
cd backend
backend\ENV\Scripts\python.exe ..\scripts\setup\setup_superuser.py
```

**Resultado esperado**:
```
============================================================
Configuración de Superusuario con Empresa
============================================================

✓ Superusuario encontrado: admin@snabbit.cl

--- Creando grupos ---
✓ Grupo 'staff' creado
✓ Grupo 'superadmin' creado
...

✓ Configuración completada exitosamente
```

#### 2. reset_db.py
**Propósito**: Resetear base de datos a estado limpio.

**⚠️ PELIGRO**: Elimina TODOS los datos.

**Cuándo usar**:
- Desarrollo local cuando necesitas empezar de cero
- Antes de correr migraciones conflictivas
- Nunca en producción

**Uso**:
```cmd
cd backend
backend\ENV\Scripts\python.exe ..\scripts\setup\reset_db.py
```

#### 3. seed_data.py
**Propósito**: Poblar base de datos con datos de prueba.

**Cuándo usar**:
- Después de reset_db
- Testing de funcionalidades
- Demos

**Uso**:
```cmd
cd backend
backend\ENV\Scripts\python.exe ..\scripts\setup\seed_data.py
```

Incluye:
- Creación de usuarios internos (técnico, bodeguero, admin)
- Importación de empresas y usuarios cliente desde Excel con fallback a datos internos
- Registro de equipos para clientes con asignaciones parciales a usuarios

### Development (Desarrollo)

#### 1. create_groups.py
**Propósito**: Crear/actualizar grupos de permisos estándar.

**Cuándo usar**:
- Agregar nuevos roles al sistema
- Sincronizar grupos entre entornos

**Uso**:
```cmd
cd backend
backend\ENV\Scripts\python.exe ..\scripts\development\create_groups.py
```

#### 2. export_fixtures.py
**Propósito**: Exportar datos a fixtures JSON para testing.

**Cuándo usar**:
- Crear fixtures para tests
- Backup de configuraciones

**Uso**:
```cmd
cd backend
backend\ENV\Scripts\python.exe ..\scripts\development\export_fixtures.py
```

### Maintenance (Mantenimiento)

#### 1. cleanup_migrations.py
**Propósito**: Limpiar archivos de migraciones (excepto __init__.py).

**⚠️ PELIGRO**: Solo usar en desarrollo.

**Cuándo usar**:
- Conflictos de migraciones irresolubles
- Refactorización de modelos

**Uso**:
```cmd
cd backend
backend\ENV\Scripts\python.exe ..\scripts\maintenance\cleanup_migrations.py
```

#### 2. backup_db.py
**Propósito**: Crear backup de base de datos SQLite.

**Cuándo usar**:
- Antes de migraciones grandes
- Backup periódico en desarrollo

**Uso**:
```cmd
cd backend
backend\ENV\Scripts\python.exe ..\scripts\maintenance\backup_db.py
```

## Flujo de Inicialización Completo (Nuevo Entorno)

### Escenario: Acabas de clonar el repo en tu notebook

```cmd
# 1. Navegar al proyecto
cd monorepo_erp

# 2. Backend: Crear entorno virtual e instalar dependencias
cd backend
python -m venv ENV
ENV\Scripts\activate
pip install -r req.txt

# 3. Aplicar migraciones
ENV\Scripts\python.exe manage.py migrate

# 4. Crear superusuario
ENV\Scripts\python.exe manage.py createsuperuser
# Email: tu@email.com
# Password: ********

# 5. Ejecutar script de setup
ENV\Scripts\python.exe ..\scripts\setup\setup_superuser.py

# 6. (Opcional) Poblar datos de prueba
ENV\Scripts\python.exe ..\scripts\setup\seed_data.py

# 7. Iniciar servidor backend
ENV\Scripts\python.exe manage.py runserver

# 8. Frontend (otra terminal): Instalar dependencias
cd ..\frontend
npm install

# 9. Iniciar servidor frontend
npm run dev
```

### Acceso:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000/api/
- Django Admin: http://localhost:8000/admin/

Login con el superusuario creado → Tendrás acceso completo al sistema.

## Convenciones

### Nomenclatura de Scripts

- `setup_*.py`: Inicialización y configuración
- `create_*.py`: Creación de recursos
- `reset_*.py`: Reseteo de estado
- `seed_*.py`: Población de datos
- `export_*.py`: Exportación de datos
- `cleanup_*.py`: Limpieza de recursos
- `backup_*.py`: Respaldo de datos

### Estructura de Código

Todos los scripts deben seguir este patrón:

```python
#!/usr/bin/env python
"""
Descripción breve del script.
Qué hace, cuándo usarlo, precauciones.
"""
import os
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sw_erp.settings')
django.setup()

# Imports de Django/proyecto después de setup
from django.contrib.auth import get_user_model

def main():
    print("=" * 60)
    print("Título del Script")
    print("=" * 60)
    print()
    
    # Lógica del script
    
    print("=" * 60)
    print("✓ Operación completada")
    print("=" * 60)

if __name__ == '__main__':
    main()
```

### Salida de Scripts

- ✓ Checkmark verde para operaciones exitosas
- ⚠️ Warning para acciones que requieren atención
- ❌ Error para fallos
- Mensajes descriptivos y concisos

## Contribuir

Al agregar un nuevo script:

1. Colocarlo en la carpeta apropiada (`setup/`, `development/`, `maintenance/`)
2. Seguir convenciones de nomenclatura
3. Incluir docstring descriptivo
4. Actualizar este README con:
   - Propósito del script
   - Cuándo usarlo
   - Ejemplo de uso
   - Resultado esperado

## Referencias

- Instrucciones de backend: `.github/instructions/backend-instructions.md`
- Sistema de permisos: `.github/instructions/permisos-sistema.md`
- Playbooks operacionales: `.github/instructions/playbooks.md`

---

**Última actualización**: 2025-11-03
