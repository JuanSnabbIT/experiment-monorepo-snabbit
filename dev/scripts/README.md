# Scripts de Desarrollo

Scripts de utilidad para setup y mantenimiento del proyecto.

## Estructura Actual

```
dev/scripts/
├── setup/                                     # Scripts de inicialización
│   ├── setup_superuser.py                    # Crear superusuario + empresa base
│   ├── seed_base.py                          # Poblar datos base (regiones, categorías, fabricantes)
│   ├── reset_db.py                           # Resetear base de datos (SOLO DEV)
│   ├── check_seed.py                         # Validar datos seeded
│   ├── crear_datos_ordentrabajo.py           # Generar datos de prueba para OT
│   ├── crear_datos_ordentrabajo_completo.py  # Generar OT completas con relaciones
│   └── codex_web_setup.sh                    # Bootstrap rápido del workspace
├── DATOS_BASE.md                              # Documentación de datos base
└── README.md                                  # Este archivo
```

---

## Scripts de Setup

### `setup_superuser.py`

Crea el superusuario y la empresa base del sistema.

**Uso:**
```bash
cd backend
python ../dev/scripts/setup/setup_superuser.py
```

**Crea:**
- Superusuario: `admin` / `admin123`
- Empresa: SW Components
- Sucursal: Casa Matriz
- PersonalizacionUsuario para el admin

---

### `seed_base.py`

Pobla datos base del sistema (catálogos maestros).

**Uso:**
```bash
cd backend
python ../dev/scripts/setup/seed_base.py
```

**Crea:**
- 16 Regiones de Chile con ~346 Comunas
- 9 Categorías base de Items
- 10 Fabricantes comunes

---

### `reset_db.py`

**⚠️ PELIGRO:** Elimina TODA la base de datos.

Solo para desarrollo. Requiere confirmación explícita escribiendo `RESET`.

**Uso:**
```bash
cd backend
python ../dev/scripts/setup/reset_db.py
```

**Efectos:**
1. Elimina `db.sqlite3`
2. Ejecuta `migrate` para recrear esquema vacío

**Próximos pasos recomendados:**
1. `python ../dev/scripts/setup/setup_superuser.py`
2. `python ../dev/scripts/setup/seed_base.py`

---

## Uso desde VS Code Tasks

Los scripts están integrados en `.vscode/tasks.json`:

- **Backend: Setup Superuser** - Ejecuta `setup_superuser.py`
- **Backend: Seed Base** - Ejecuta `seed_base.py`
- **Backend: Reset DB** - Ejecuta `reset_db.py`

Acceso: `Ctrl+Shift+P` → "Tasks: Run Task" → Seleccionar tarea

---

## Flujo Inicial Recomendado

### Primera vez (DB nueva):
```bash
cd backend

# 1. Aplicar migraciones
python manage.py migrate

# 2. Crear superusuario + empresa
python ../dev/scripts/setup/setup_superuser.py

# 3. Poblar datos base
python ../dev/scripts/setup/seed_base.py
```

### Reset completo (durante desarrollo):
```bash
cd backend

# 1. Resetear BD (requiere confirmación 'RESET')
python ../dev/scripts/setup/reset_db.py

# 2. Crear superusuario + empresa
python ../dev/scripts/setup/setup_superuser.py

# 3. Poblar datos base
python ../dev/scripts/setup/seed_base.py
```

---

## Notas

- Todos los scripts configuran Django automáticamente
- Los scripts detectan si los datos ya existen (idempotentes)
- Mensajes con emojis: ✅ éxito, ❌ error, ⚠️ advertencia, 💡 información
- `reset_db.py` es **SOLO para desarrollo** (nunca usar en producción)
- Scripts compatibles con Windows (cmd/PowerShell) y Linux/Mac

---

**Última actualización:** 2025-12-31
