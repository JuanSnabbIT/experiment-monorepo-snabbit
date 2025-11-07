---
title: "Guía de Inicialización del Sistema"
scope: "setup"
status: "active"
last_updated: "2025-11-05"
---

# 🚀 Guía de Inicialización del Sistema ERP

## Objetivo
Documentar el proceso completo de inicialización del sistema ERP desde cero, explicando cada script, comando y concepto clave para entender cómo "poblar" correctamente la base de datos y arrancar el sistema.

---

## 📋 Prerequisitos

### Software Requerido
- **Python 3.11+**: [Descargar](https://www.python.org/downloads/)
- **Node.js 18+**: [Descargar](https://nodejs.org/)
- **Git**: [Descargar](https://git-scm.com/)

### Verificar Instalaciones
```cmd
python --version
node --version
git --version
```

---

## 🎯 Flujo de Inicialización Completo

El proyecto ya no incluye scripts automatizados; la ruta recomendada es realizar los pasos manualmente para comprender cada componente del sistema.

### Paso 0: Clonar Repositorio

```cmd
git clone https://github.com/Suikunstito/monorepo_erp.git
cd monorepo_erp
```

### Paso 1: Backend - Configurar Entorno Python

```cmd
cd backend

REM Crear entorno virtual
python -m venv ENV

REM Activar entorno (Windows CMD)
ENV\Scripts\activate

REM Instalar dependencias
pip install -r req.txt
```

**¿Qué hace?**
- `venv`: Crea entorno aislado de Python para evitar conflictos de dependencias
- `req.txt`: Contiene todas las librerías necesarias (Django, DRF, Celery, Channels, etc.)

### Paso 2: Aplicar Migraciones

```cmd
ENV\Scripts\python.exe manage.py migrate
```

**¿Qué hace?**
- Crea todas las tablas en `db.sqlite3` según los modelos Django
- Aplica migraciones de todas las apps: `cuentas`, `empresas`, `bodegas`, `items`, `cotizaciones`, etc.
- **IMPORTANTE**: Base de datos queda VACÍA (sin usuarios, sin empresas, sin datos)

### Paso 3: Crear Superusuario

```cmd
ENV\Scripts\python.exe manage.py createsuperuser
```

Ingresa:
- **Email**: tu@email.com
- **First name**: Tu Nombre
- **Last name**: Tu Apellido
- **Password**: ********

**¿Qué hace?**
- Crea usuario con `is_superuser=True` y `is_staff=True`
- **NO crea** `PersonalizacionUsuario` (causa del bug del dashboard)
- **NO crea** `UsuarioEmpresa` (no está asociado a ninguna empresa)
- **NO crea** empresa inicial

### Paso 4: Configurar Empresa y Permisos (CRÍTICO ⚠️)

```cmd
ENV\Scripts\python.exe ..\scripts\setup\setup_superuser.py
```

**¿Qué hace este script?** (Análisis)

1. **Crea empresas cliente adicionales** (líneas 70-112):
    - Empresa Cliente A (RUT: 76123456-7)
    - Empresa Cliente B (RUT: 76234567-8)
    - Cada una queda con su sucursal principal

2. **Crea usuarios de prueba base** (líneas 114-172):
       ('tecnico', 'Técnico de campo para OT y visitas'),
       ('representante_legal', 'Representante legal de empresa'),
   ]
   ```

2. **Crea empresa inicial "Snabbit"** (líneas 66-88):
   ```python
   Empresa.objects.get_or_create(
3. **Crea categorías de items** (líneas 174-205):
       defaults={
           'nombre': 'Snabbit',
           'direccion_principal': 'Dirección Principal 123',
           # ...
       }
   )
4. **Crea fabricantes** (líneas 207-229):

3. **Crea sucursal "Casa Matriz"** (líneas 90-102):
   - Sucursal principal se usa para filtrar datos por contexto

4. **Crea/actualiza `UsuarioEmpresa`** (líneas 111-151):
   ```python
6. **Crea bodegas** (líneas 279-321):
       usuario=user,
       defaults={

7. **Importa planillas Excel de usuarios** (líneas 323-458):
    - Lee `backend/usuarios_*.xlsx`
    - Crea empresas que no existan (con sucursal "Casa Matriz" si hace falta)
    - Genera o actualiza usuarios con contraseña `test1234`
    - Enlaza cada usuario a su empresa vía `UsuarioEmpresa` y les asocia el grupo `representante_legal`
    - Ajusta `PersonalizacionUsuario` apuntando a la sucursal importada
           'sucursal': sucursal,
           'estado': '1',
       }
   )
   ```
   - Garantiza que el superusuario tenga sucursal y estado activo (`estado = '1'`)
   - Reasigna grupos administrativos: `staff`, `superadmin`, `multi-empresas`
   - **Sin esto, el usuario no puede acceder al sistema** (bug de permisos)
- Empresas: 3 (incluyendo Snabbit)
- Usuarios: 3
   ```python
   PersonalizacionUsuario.objects.get_or_create(
       usuario=user,
       defaults={
- Empresas desde Excel: 4
- Usuarios desde Excel: 40
           'tema': '3',  # Sistema
           'font_size': 14,
           'sucursal_principal': sucursal,
       }
   )
   ```
   - **sucursal_principal**: Contexto operativo del usuario
   - **Sin esto**:
     - Dashboard muestra "sin empresa"
     - Invitaciones retornan array vacío `[]`
     - Otros módulos pueden fallar

**Resultado esperado**:
```
============================================================
Configuración de Superusuario con Empresa
============================================================

✓ Superusuario encontrado: admin@snabbit.cl

--- Creando grupos de permisos ---
✓ Grupo 'staff' creado
✓ Grupo 'superadmin' creado
...

✓ Configuración completada exitosamente
```

### Paso 5: Poblar Datos de Prueba

```cmd
ENV\Scripts\python.exe ..\scripts\setup\seed_data.py
```

**¿Qué hace este script?** (Análisis)

1. **Crea o actualiza empresas cliente adicionales**: Empresa Cliente A/B con su sucursal “Sucursal Principal”. Si ya existen, solo valida sus datos.
2. **Crea o actualiza usuarios base de Snabbit**: `tecnico@snabbit.cl`, `bodeguero@snabbit.cl`, `admin@snabbit.cl` (contraseña `test1234`) y les asigna sus grupos.
3. **Crea o ajusta categorías, fabricantes, items y bodegas**: usa `get_or_create` y actualiza `descripcion_corta`, categoría, fabricante o sucursal cuando ya existen.
4. **Importa planillas Excel de usuarios** (todas las `backend/usuarios_*.xlsx` existentes):
    - Crea empresas faltantes y asegura una sucursal “Casa Matriz”.
    - Crea/actualiza usuarios con contraseña por defecto `test1234` y los marca activos.
    - Enlaza `UsuarioEmpresa`, asigna el grupo `representante_legal` y ajusta `PersonalizacionUsuario.sucursal_principal`.

**Resultado esperado**:
```
--- Creando empresas adicionales ---
✓ Empresa 'Empresa Cliente A' creada
...

Resumen:
- Empresas: 3 (incluyendo Snabbit)
- Usuarios: 3
- Categorías: 5
- Fabricantes: 5
- Items: 3
- Bodegas: 2
- Empresas desde Excel: según planillas procesadas
- Usuarios desde Excel: según planillas procesadas
```

#### Paso 7: Frontend - Configurar Node.js

```cmd
cd ..\frontend

REM Instalar dependencias
npm install

REM Iniciar servidor de desarrollo
npm run dev
```

**¿Qué hace?**
- Instala paquetes de `package.json` (React, TypeScript, Vite, TailwindCSS, etc.)
- Inicia servidor en `http://localhost:5173`

---

## 🔍 Scripts Disponibles (Detallado)

### Setup (`scripts/setup/`)

#### `setup_superuser.py`
**Líneas totales**: ~180  
**Prerequisitos**: `migrate`, `createsuperuser`  
**Función principal**: `main()` (líneas 157-180)

**Flujo interno**:
1. Buscar superusuario con `User.objects.filter(is_superuser=True).first()`
2. Llamar `crear_grupos()` → Crear 6 grupos estándar
3. Llamar `crear_empresa_inicial()` → Crear Snabbit + Casa Matriz
4. Llamar `configurar_usuario_empresa()` → Asociar user+empresa+grupos
5. Llamar `configurar_personalizacion()` → Crear PersonalizacionUsuario

**Idempotente**: ✅ (usa `get_or_create`, puede ejecutarse múltiples veces)

#### `seed_data.py`
**Líneas totales**: ~260  
**Prerequisitos**: `setup_superuser.py`  
**Función principal**: `main()` (líneas 244-260)

**Flujo interno**:
1. Verificar que existe empresa Snabbit (RUT 11111111-1)
2. Llamar `crear_empresas_adicionales()` → 2 empresas cliente
3. Llamar `crear_usuarios_prueba()` → 3 usuarios con roles
4. Llamar `crear_categorias_y_fabricantes()` → 5 categorías + 5 fabricantes
5. Llamar `crear_items_prueba()` → 3 items ejemplo
6. Llamar `crear_bodegas_prueba()` → 2 bodegas

**Idempotente**: ✅ (usa `get_or_create`)

#### `reset_db.py`
**Líneas totales**: ~110  
**⚠️ DESTRUCTIVO**: Elimina `db.sqlite3` completo  
**Función principal**: `main()` (líneas 77-110)

**Flujo interno**:
1. Pedir confirmación (usuario debe escribir "SI")
2. Llamar `eliminar_base_datos()` → `os.remove(db_path)`
3. Llamar `ejecutar_migraciones()` → `subprocess.run([python, manage.py, migrate])`

**Idempotente**: ❌ (elimina datos permanentemente)

**Cuándo usar**:
- Desarrollo local con conflictos de migraciones
- Testing de inicialización completa
- **NUNCA en producción**

### Development (`scripts/development/`)

#### `create_groups.py`
**Función**: Crear/actualizar grupos de permisos estándar  
**Prerequisitos**: `migrate`  
**Uso**: Al agregar nuevos roles al sistema

#### `check_personalizacion.py`
**Función**: Script de diagnóstico para confirmar que los usuarios poseen `PersonalizacionUsuario` y sucursal principal asignada.  
**Uso**: Ejecutar con `manage.py shell` cuando el dashboard o las invitaciones aparecen vacíos.

#### `list_endpoints.py`
**Función**: Genera un informe categorizado de todos los endpoints registrados en Django.  
**Salida**: Opcionalmente exporta a `.github/LISTA_ENDPOINTS.md` para documentar la API al día.

#### `reset_local_data.py`
**Función**: Wrapper interactivo que delega en `scripts/setup/reset_db.py` para limpiar `db.sqlite3` y aplicar migraciones frescas.  
**Uso**: Desde la raíz `python scripts\development\reset_local_data.py`.

### Maintenance (`scripts/maintenance/`)

#### `backup_db.py`
**Función**: Crear backup de `db.sqlite3`  
**Prerequisitos**: Base de datos existente  
**Uso**: Antes de migraciones grandes o cambios destructivos

---

## 📓 Notebooks de Apoyo (Exploración)

| Notebook | Objetivo | Qué hace |
|----------|----------|----------|
| `backend/Creacion_Usuarios_Masiva.ipynb` | Carga masiva desde Excel | Activa Django dentro de Jupyter (`dj_notebook.activate`), lista empresas/sucursales, lee `usuarios_aygasociados.xlsx` y crea usuarios (`User`) con password fijo vinculándolos a una `SucursalEmpresa` mediante `UsuarioEmpresa` usando transacciones. |
| `backend/FuncionesHistory.ipynb` | Probar historiales de stock | Define `registrar_movimiento_stock` que ajusta `StockItemEnBodega.cantidad`, registra motivos con `simple_history.update_change_reason` y setea `_history_user`; luego ejecuta un flujo de prueba con `StockItemEnBodega.pk=1`. |
| `backend/Reportlab_Diseños.ipynb` | Diseñar PDF de cotizaciones | Carga utilidades (`generar_pdf_cotizacion`) para generar `temp_cotizacion.pdf`, muestra inline y contiene una implementación personalizada con ReportLab para maquetar cotizaciones con logo, tabla de items y firma. |
| `backend/testing_apis.ipynb` | Verificar API externa de feriados | Usa `requests` para consumir `https://apis.digital.gob.cl/fl/feriados/<año>`, maneja errores y muestra feriados para varios años. |

> Estos notebooks son herramientas de exploración; no forman parte del flujo de inicialización, pero ayudan a entender procesos de carga masiva, historial de inventario y generación de PDFs.

---

## 🎭 Flujos de Uso Comunes

### 🆕 Nuevo Entorno (Notebook/PC/Servidor)

```cmd
cd backend
python -m venv ENV
ENV\Scripts\activate
pip install -r req.txt
ENV\Scripts\python.exe manage.py migrate
ENV\Scripts\python.exe manage.py createsuperuser
ENV\Scripts\python.exe ..\scripts\setup\setup_superuser.py
ENV\Scripts\python.exe ..\scripts\setup\seed_data.py

cd ..\frontend
npm install
npm run dev
```

### 🔄 Reiniciar Base Local (limpiar datos de pruebas)

```cmd
REM Desde la raíz del proyecto
python scripts\development\reset_local_data.py

REM Luego repetir inicialización mínima
cd backend
ENV\Scripts\python.exe manage.py createsuperuser
ENV\Scripts\python.exe ..\scripts\setup\setup_superuser.py
ENV\Scripts\python.exe ..\scripts\setup\seed_data.py
```

### 🐛 Resolver "Sin Permisos" tras Login

**Síntoma**: Usuario logueado pero sin acceso a módulos

**Causa**: Falta `UsuarioEmpresa` o grupos no asignados

**Solución**:
```cmd
cd backend
backend\ENV\Scripts\python.exe ..\scripts\setup\setup_superuser.py
```

Luego: Cerrar sesión en frontend y volver a loguear

### 📊 Resolver "Dashboard sin Empresa"

**Síntoma**: Dashboard muestra "Aún no tienes empresa, crea una"

**Causa**: Falta `PersonalizacionUsuario` con `sucursal_principal`

**Solución**:
```cmd
cd backend
backend\ENV\Scripts\python.exe ..\scripts\setup\setup_superuser.py
```

### 📋 Resolver "Invitaciones Vacías"

**Síntoma**: Tabla de invitaciones siempre vacía

**Causa**: Backend filtra por `PersonalizacionUsuario.sucursal_principal`

**Solución temporal** (exploración):
```python
# backend/cuentas/views.py - InvitacionEmpresaViewSet.get_queryset()
return InvitacionEmpresa.objects.all()  # Sin filtros
```

**Solución correcta**:
```cmd
backend\ENV\Scripts\python.exe ..\scripts\setup\setup_superuser.py
```

---

## 🔑 Conceptos Clave del Sistema

### Modelo de Datos Multicapa

```
User (Django Auth)
├── is_superuser, is_staff       → Permisos globales Django
├── PersonalizacionUsuario        → Contexto UI (sucursal_principal)
│   └── sucursal_principal (FK)  → Contexto operativo
└── UsuarioEmpresa                → Asociación user ↔ empresa
    ├── empresa (FK)
    ├── sucursal (FK)
    └── grupos (M2M)             → Permisos específicos de empresa
```

### Grupos de Permisos Estándar

| Grupo | Descripción | Acceso Típico |
|-------|-------------|---------------|
| `staff` | Personal administrativo | Módulos generales, lectura/escritura |
| `superadmin` | Administrador máximo | Todos los módulos, todas las acciones |
| `multi-empresas` | Acceso a múltiples empresas | Ver/editar datos de varias empresas |
| `tecnico` | Técnico de campo | OT, visitas, rendiciones |
| `bodeguero` | Encargado de inventario | Bodegas, movimientos, stock |
| `representante_legal` | Representante legal | Firmar documentos, aprobar contratos |

### Arquitectura de Permisos

```
Backend Filtering (get_queryset)
↓
personalizacion_usuario = PersonalizacionUsuario.objects.filter(
    usuario=request.user
).first()

if personalizacion_usuario and personalizacion_usuario.sucursal_principal:
    return Model.objects.filter(
        sucursal=personalizacion_usuario.sucursal_principal
    )

return Model.objects.none()  # Sin contexto → Sin datos
```

**Implicación**: Sin `PersonalizacionUsuario.sucursal_principal`, muchos módulos retornan datos vacíos.

---

## 🧪 Usuarios de Prueba (tras seed_data.py)

| Email | Password | Roles | Descripción |
|-------|----------|-------|-------------|
| `admin@snabbit.cl` | `test1234` | staff, superadmin | Admin completo |
| `tecnico@snabbit.cl` | `test1234` | tecnico | Técnico de campo |
| `bodeguero@snabbit.cl` | `test1234` | bodeguero | Encargado de bodega |

---

## 📚 Referencias Cruzadas

- [Backend Instructions](./instrucciones/backend-instructions.md): Modelos, ViewSets, permisos
- [Frontend Instructions](./instrucciones/frontend-instructions.md): Componentes, Redux, servicios
- [Redux Store Structure](./instrucciones/store-structure.md): Slices y thunks
- [Security](./instrucciones/security.md): JWT, CORS, validaciones
- [Tasks Instructions](./instrucciones/tasks.instructions.md): VS Code tasks

---

## 🎯 Próximo Paso

Una vez inicializado el sistema con `setup_superuser.py`, el siguiente módulo a explorar es:

**Módulo 2: Usuarios Empresa** → Entender cómo funcionan `UsuarioEmpresa`, `PersonalizacionUsuario`, roles y el flujo completo de invitaciones.

---

**Última actualización**: 2025-11-05  
**Autor**: Análisis de scripts del monorepo + exploración Módulo 1 (Empresas)
