# 📁 Scripts de Utilidad - Índice Rápido

## 🚀 Setup (Inicialización)

| Script | Descripción | Uso Típico |
|--------|-------------|------------|
| **setup_superuser.py** | Configura superusuario con empresa y grupos | Primera vez, después de reset_db |
| **reset_db.py** | ⚠️ Resetea DB a cero | Desarrollo local, conflictos de migración |
| **seed_data.py** | Pobla DB con datos de prueba | Testing, demos, después de reset |

## 🛠️ Development (Desarrollo)

| Script | Descripción | Uso Típico |
|--------|-------------|------------|
| **create_groups.py** | Crea/actualiza grupos de permisos | Nuevos roles, sincronizar entornos |

## 🔧 Maintenance (Mantenimiento)

| Script | Descripción | Uso Típico |
|--------|-------------|------------|
| **backup_db.py** | Backup de db.sqlite3 | Antes de migraciones grandes |

---

## 🎯 Flujos Comunes

### Primer Setup (Notebook Nuevo)

```cmd
cd monorepo_erp
inicio-rapido.bat
```

O manualmente:

```cmd
# Backend
cd backend
python -m venv ENV
ENV\Scripts\activate
pip install -r req.txt
python manage.py migrate
python manage.py createsuperuser
python ..\scripts\setup\setup_superuser.py

# Frontend  
cd ..\frontend
npm install
npm run dev
```

### Resetear Todo (Empezar de Cero)

```cmd
cd backend
backend\ENV\Scripts\python.exe ..\scripts\setup\reset_db.py
backend\ENV\Scripts\python.exe manage.py createsuperuser
backend\ENV\Scripts\python.exe ..\scripts\setup\setup_superuser.py
backend\ENV\Scripts\python.exe ..\scripts\setup\seed_data.py
```

### Agregar Nuevo Rol al Sistema

```cmd
# 1. Editar scripts/development/create_groups.py
# 2. Agregar nuevo grupo a GRUPOS_ESTANDAR

# 3. Ejecutar
cd backend
backend\ENV\Scripts\python.exe ..\scripts\development\create_groups.py

# 4. Actualizar frontend/src/config/pages.config.ts
# 5. Asignar grupo a usuarios en Django Admin
```

### Backup Antes de Migración Grande

```cmd
cd backend
backend\ENV\Scripts\python.exe ..\scripts\maintenance\backup_db.py
backend\ENV\Scripts\python.exe manage.py makemigrations
backend\ENV\Scripts\python.exe manage.py migrate
```

---

## 📝 Convenciones

### Ejecutar Scripts

**Desde raíz del proyecto:**
```cmd
backend\ENV\Scripts\python.exe scripts\<categoria>\<script>.py
```

**Desde backend/:**
```cmd
cd backend
ENV\Scripts\python.exe ..\scripts\<categoria>\<script>.py
```

### Agregar Nuevo Script

1. Colocar en carpeta apropiada (`setup/`, `development/`, `maintenance/`)
2. Seguir estructura estándar:
   ```python
   #!/usr/bin/env python
   """Docstring descriptivo"""
   # Setup Django
   # Imports
   # Funciones
   # main()
   ```
3. Actualizar `scripts/README.md`
4. Actualizar este índice si es script importante

---

## 🔗 Enlaces Rápidos

### Documentación General
- [README Completo](README.md) - Documentación detallada de scripts
- [Inicio Rápido](../INICIO-RAPIDO.md) - Guía de setup inicial

### Sistema de Permisos (NUEVO ✨)
- [📖 README Permisos](../docs/README_PERMISOS.md) - Guía de lectura (empieza aquí)
- [📊 Análisis Sistema Actual](../docs/ANALISIS_SISTEMA_PERMISOS.md) - Cómo funciona ahora
- [🚀 Plan Guardian](../docs/PLAN_IMPLEMENTACION_GUARDIAN.md) - Implementación paso a paso

### Instrucciones Técnicas
- [Backend Instructions](../.github/instructions/backend-instructions.md)
- [Security Instructions](../.github/instructions/security.md)
- [Frontend Instructions](../.github/instructions/frontend-instructions.md)

---

**Tip**: Marca este archivo con ⭐ para acceso rápido
