---
title: "Scripts de Utilidad del Monorepo ERP"
scope: "scripts"
status: "active"
last_updated: "2025-11-05"
---

# 🛠️ Scripts de Utilidad del Monorepo ERP

## Objetivo
Documentar todos los scripts disponibles para inicialización, desarrollo y mantenimiento del sistema ERP. Cada script incluye propósito, prerequisitos, uso, ejemplos y troubleshooting.

---

## 📂 Estructura de Scripts

```
scripts/
├── README.md                       # Documentación general
├── INDICE.md                       # Índice rápido
├── setup/                          # 🚀 Inicialización y configuración
│   ├── setup_superuser.py         # Configurar superusuario con empresa
│   ├── seed_data.py                # Poblar DB con datos de prueba
│   ├── seed_servicios.py           # 🆕 Poblar servicios y planes de servicio
│   ├── seed_contratos_extras.py    # 🆕 Poblar visitas, licencias y condiciones
│   ├── seed_categorias_gastos.py   # 🆕 Poblar categorías de gastos para rendiciones
│   ├── seed_completo.py            # 🆕 Orquestador que ejecuta todos los seeds
│   ├── reset_db.py                 # ⚠️ Resetear base de datos
│   └── reset_local_environment.cmd # Wrapper batch para Windows
├── development/                    # 🛠️ Desarrollo
│   ├── create_groups.py            # Crear/actualizar grupos de permisos
│   ├── check_personalizacion.py   # Diagnosticar PersonalizacionUsuario
│   ├── list_endpoints.py           # Listar endpoints API
│   └── reset_local_data.py         # Wrapper interactivo para reset_db
└── maintenance/                    # 🔧 Mantenimiento
    └── backup_db.py                # Backup de db.sqlite3
```

---

## 🚀 Scripts de Setup (Inicialización)

### 1. setup_superuser.py

**Ubicación**: `scripts/setup/setup_superuser.py`

**Propósito**: Configurar un superusuario con empresa, sucursal, grupos de permisos y personalización para dashboard.

#### Qué Hace

1. **Crea grupos estándar**:
   - `staff` (Personal administrativo general)
   - `superadmin` (Administrador con permisos máximos)
   - `multi-empresas` (Acceso a múltiples empresas)
   - `tecnico` (Técnico de campo para OT y visitas)
   - `representante_legal` (Representante legal de empresa)

2. **Crea empresa inicial "Snabbit"**:
   - RUT: `11111111-1`
   - Sucursal: "Casa Matriz" (es_casa_matriz=True)

3. **Asocia superusuario a empresa**:
   - Crea `UsuarioEmpresa` con `estado='1'` (activo)
   - Asigna grupos administrativos: `staff`, `superadmin`, `multi-empresas`

4. **Configura personalización**:
   - Crea `PersonalizacionUsuario` con:
     - `tema='3'` (Sistema)
     - `font_size=14`
     - `sucursal_principal` = Casa Matriz

#### Cuándo Usar

- ✅ Primera vez que inicializas el proyecto
- ✅ Después de resetear la base de datos (`reset_db.py`)
- ✅ Al configurar un nuevo entorno (notebook, servidor)
- ✅ Cuando el dashboard muestra "sin empresa"
- ✅ Cuando las invitaciones aparecen vacías

#### Prerequisitos

```cmd
REM 1. Base de datos migrada
cd backend
backend\ENV\Scripts\python.exe manage.py migrate

REM 2. Superusuario creado
backend\ENV\Scripts\python.exe manage.py createsuperuser
```

#### Uso

```cmd
REM Desde la raíz del proyecto
backend\ENV\Scripts\python.exe scripts\setup\setup_superuser.py

REM O desde backend/
cd backend
ENV\Scripts\python.exe ..\scripts\setup\setup_superuser.py
```

#### Salida Esperada

```
============================================================
Configuración de Superusuario con Empresa
============================================================

✓ Superusuario encontrado: admin@snabbit.cl

--- Creando grupos de permisos ---
✓ Grupo 'staff' creado
✓ Grupo 'superadmin' creado
✓ Grupo 'multi-empresas' creado
✓ Grupo 'tecnico' creado
✓ Grupo 'representante_legal' creado

--- Creando empresa inicial ---
✓ Empresa 'Snabbit' creada (RUT: 11111111-1)
✓ Sucursal 'Casa Matriz' creada (fallback)

--- Configurando UsuarioEmpresa ---
✓ UsuarioEmpresa creado para 'admin@snabbit.cl'
✓ Grupos asignados: staff, superadmin, multi-empresas

--- Configurando Personalización ---
✓ Personalización creada para 'admin@snabbit.cl'

============================================================
✓ Configuración completada exitosamente
============================================================

Próximos pasos:
1. Inicia el backend: python manage.py runserver
2. Inicia el frontend: cd ../frontend && npm run dev
3. Accede a http://localhost:5173
4. Login con tu superusuario
5. ¡Ahora tienes acceso completo al sistema!
```

#### Idempotencia

✅ **Idempotente**: Puede ejecutarse múltiples veces sin causar errores.

- Usa `get_or_create()` para todos los modelos
- Actualiza datos existentes si es necesario
- No duplica registros

#### Troubleshooting

| Problema | Causa | Solución |
|----------|-------|----------|
| "No se encontró ningún superusuario" | No has creado superusuario | Ejecuta `manage.py createsuperuser` primero |
| "Error al buscar superusuario" | Django no configurado | Verifica que `migrate` se haya ejecutado |
| Grupos no se asignan | Error en permisos | Revisa que `UsuarioEmpresa.grupos` esté relacionado correctamente |

---

### 2. seed_data.py

**Ubicación**: `scripts/setup/seed_data.py`

**Propósito**: Poblar la base de datos con datos de prueba realistas para desarrollo y testing.

#### Qué Hace

1. **Crea empresas adicionales**:
   - Empresa Cliente A (RUT: 76123456-7)
   - Empresa Cliente B (RUT: 76234567-8)
   - Cada una con sucursal "Sucursal Principal"

2. **Crea usuarios de prueba**:
   - `tecnico@snabbit.cl` / `test1234` (grupo: tecnico)
   - `bodeguero@snabbit.cl` / `test1234` (grupo: bodeguero)
   - `admin@snabbit.cl` / `test1234` (grupos: staff, superadmin)

3. **Crea categorías de items**:
   - Cámaras de Seguridad
   - DVR/NVR
   - Alarmas
   - Control de Acceso
   - Cables y Conectores

4. **Crea fabricantes**:
   - Hikvision
   - Dahua
   - Samsung
   - Axis
   - Genérico

5. **Crea items de prueba**:
   - Cámara Domo 2MP (CAM-DOMO-001)
   - DVR 8 Canales (DVR-8CH-001)
   - Cable UTP Cat5e (CAB-UTP-001)

6. **Crea bodegas**:
   - Bodega Principal (Snabbit)
   - Bodega Secundaria (Snabbit)

7. **Importa usuarios desde planillas Excel**:
   - Lee `backend/usuarios_*.xlsx` (4 archivos esperados)
   - Crea empresas que no existan
   - Genera usuarios con contraseña `test1234`
   - Asocia usuarios a empresas vía `UsuarioEmpresa`
   - Asigna grupo `representante_legal`
   - Configura `PersonalizacionUsuario` con sucursal

#### ⚠️ Limitación Conocida

**NO crea servicios ni planes de servicio**. Para poblar catálogos de contratos, ejecutar después:

```cmd
backend\ENV\Scripts\python.exe scripts\setup\seed_servicios.py
```

Ver siguiente sección para detalles.

#### Cuándo Usar

- ✅ Después de `reset_db.py` para tener datos de prueba
- ✅ Testing de funcionalidades con datos realistas
- ✅ Demos del sistema a stakeholders
- ✅ Desarrollo de nuevas features

#### Prerequisitos

```cmd
REM 1. Base de datos migrada
backend\ENV\Scripts\python.exe manage.py migrate

REM 2. Empresa base "Snabbit" creada
backend\ENV\Scripts\python.exe scripts\setup\setup_superuser.py

REM 3. (Opcional) Planillas Excel en backend/
REM    - usuarios_aygasociados.xlsx
REM    - usuarios_camacoes.xlsx
REM    - usuarios_molinarios.xlsx
REM    - usuarios_prodalmen.xlsx
```

#### Uso

```cmd
REM Desde la raíz del proyecto
backend\ENV\Scripts\python.exe scripts\setup\seed_data.py

REM O desde backend/
cd backend
ENV\Scripts\python.exe ..\scripts\setup\seed_data.py
```

#### Salida Esperada

```
============================================================
Población de Datos de Prueba
============================================================

--- Creando empresas adicionales ---
✓ Empresa 'Empresa Cliente A' creada
✓ Empresa 'Empresa Cliente B' creada

--- Creando usuarios de prueba ---
✓ Usuario 'tecnico@snabbit.cl' creado
✓ Usuario 'bodeguero@snabbit.cl' creado
✓ Usuario 'admin@snabbit.cl' creado

--- Creando categorías y fabricantes ---
✓ Categoría 'Cámaras de Seguridad' creada
✓ Categoría 'DVR/NVR' creada
...

--- Creando items de prueba ---
✓ Item 'Cámara Domo 2MP' creado
✓ Item 'DVR 8 Canales' creado
✓ Item 'Cable UTP Cat5e' creado

--- Creando bodegas de prueba ---
✓ Bodega 'Bodega Principal' creada
✓ Bodega 'Bodega Secundaria' creada

--- Cargando usuarios desde planillas Excel ---
  Procesando 'usuarios_aygasociados.xlsx' (10 filas)
  Procesando 'usuarios_camacoes.xlsx' (15 filas)
  Procesando 'usuarios_molinarios.xlsx' (8 filas)
  Procesando 'usuarios_prodalmen.xlsx' (12 filas)

============================================================
✓ Datos de prueba creados exitosamente
============================================================

Resumen:
- Empresas: 3 (incluyendo Snabbit)
- Usuarios: 3
- Categorías: 5
- Fabricantes: 5
- Items: 3
- Bodegas: 2
- Empresas desde Excel: 4
- Usuarios desde Excel: 45

Usuarios de prueba creados:
  - tecnico@snabbit.cl / test1234
  - bodeguero@snabbit.cl / test1234
  - admin@snabbit.cl / test1234
```

#### Idempotencia

✅ **Idempotente**: Puede ejecutarse múltiples veces sin causar errores.

- Usa `get_or_create()` para empresas, categorías, fabricantes
- Actualiza `descripcion_corta`, `categoria`, `fabricante` de items existentes
- Actualiza `sucursal` de usuarios existentes si cambia

#### Troubleshooting

| Problema | Causa | Solución |
|----------|-------|----------|
| "No se encontró la empresa base 'Snabbit'" | No has ejecutado `setup_superuser.py` | Ejecuta `setup_superuser.py` primero |
| "Archivo '*.xlsx' no encontrado" | Planillas no están en `backend/` | Coloca planillas o ignora advertencia (no es crítico) |
| Usuarios duplicados | Email ya existe | Script actualiza usuarios existentes |

#### Formato de Planillas Excel

**Encabezados esperados**:
- `Empresa` (Nombre de empresa)
- `Nombre` (First name del usuario)
- `Apellido` (Last name del usuario)
- `Correo` (Email del usuario)

**Ejemplo**:

| Empresa | Nombre | Apellido | Correo |
|---------|--------|----------|--------|
| AYG ASOCIADOS | Juan | Pérez | juan.perez@aygasociados.cl |
| AYG ASOCIADOS | María | González | maria.gonzalez@aygasociados.cl |

---

### 3. seed_servicios.py

**Ubicación**: `scripts/setup/seed_servicios.py`

**Propósito**: Poblar catálogos de servicios y planes de servicio para testing del módulo de contratos.

#### Qué Hace

1. **Crea tipos de servicio** (5):
   - Instalación
   - Mantenimiento
   - Soporte Técnico
   - Reparación
   - Consultoría

2. **Crea servicios individuales** (7):
   - Instalación de Cámara IP ($25,000)
   - Mantenimiento Preventivo Mensual ($35,000)
   - Soporte Técnico Remoto ($20,000)
   - Instalación DVR/NVR ($40,000)
   - Reparación de Equipos ($30,000)
   - Consultoría de Seguridad ($80,000)
   - Configuración de Red ($35,000)

3. **Crea características de servicio** (5):
   - Incluye materiales
   - 24/7 Disponibilidad
   - Garantía extendida
   - Respuesta prioritaria
   - Informe técnico

4. **Crea planes de servicio** (3 paquetes):
   - Plan Básico de Seguridad ($180,000)
     * Instalación cámara + Soporte remoto
     * 24/7 + Informe técnico
   - Plan Empresarial Completo ($350,000)
     * Instalación cámara + Mantenimiento + Soporte + DVR
     * Materiales + 24/7 + Prioritario + Informe
   - Plan Mantenimiento Anual ($480,000)
     * Mantenimiento + Reparación
     * Garantía extendida + Prioritario

#### Cuándo Usar

- ✅ **Antes de crear contratos por primera vez**
- ✅ Después de `reset_db.py` si vas a usar módulo contratos
- ✅ Testing de agregado de servicios/planes a contratos
- ✅ Demos del módulo de contratos
- ⚠️ **REQUERIDO para que la lista de servicios/planes no aparezca vacía**

#### Prerequisitos

```cmd
REM 1. Base de datos migrada
backend\ENV\Scripts\python.exe manage.py migrate

REM 2. Empresa base "Snabbit" creada
backend\ENV\Scripts\python.exe scripts\setup\setup_superuser.py
```

#### Uso

```cmd
REM Desde la raíz del proyecto
backend\ENV\Scripts\python.exe scripts\setup\seed_servicios.py

REM O desde backend/
cd backend
ENV\Scripts\python.exe ..\scripts\setup\seed_servicios.py
```

#### Salida Esperada

```
============================================================
Población de Servicios y Planes de Servicio
============================================================

--- Creando tipos de servicio ---
✓ Tipo servicio 'Instalación' creado
✓ Tipo servicio 'Mantenimiento' creado
...

--- Creando servicios ---
✓ Servicio 'Instalación de Cámara IP' creado ($25000)
✓ Servicio 'Mantenimiento Preventivo Mensual' creado ($35000)
...

--- Creando características de servicio ---
✓ Característica 'Incluye materiales' creada
...

--- Creando planes de servicio ---
✓ Plan 'Plan Básico de Seguridad' creado ($180000)
  - 2 servicios incluidos
  - 2 características
...

============================================================
✓ Servicios y planes creados exitosamente
============================================================

Resumen:
- Tipos de servicio: 5
- Servicios: 7
- Características: 5
- Planes de servicio: 3

Ahora puedes agregar servicios/planes a tus contratos.
```

#### Verificación

```python
# Django shell
from contratos.models import Servicio, PlanServicio, TipoServicio, CaracteristicaServicio

# Verificar creación
print(f"Tipos: {TipoServicio.objects.count()}")  # 5
print(f"Servicios: {Servicio.objects.count()}")  # 7
print(f"Características: {CaracteristicaServicio.objects.count()}")  # 5
print(f"Planes: {PlanServicio.objects.count()}")  # 3

# Ver detalles
for plan in PlanServicio.objects.all():
    print(f"{plan.nombre}: {plan.servicios.count()} servicios")
```

#### Troubleshooting

**Problema**: "No se encontró la empresa base 'Snabbit'"

```cmd
REM Ejecutar primero setup_superuser.py
backend\ENV\Scripts\python.exe scripts\setup\setup_superuser.py
```

**Problema**: "Ya existen servicios" (mensaje informativo)

- No es error, significa que ya se ejecutó antes
- Los datos existentes se mantienen intactos

**Problema**: Frontend sigue mostrando lista vacía

1. Verificar en Django shell que existen datos:
   ```python
   from contratos.models import Servicio, PlanServicio
   print(Servicio.objects.count(), PlanServicio.objects.count())
   ```

2. Verificar que backend está corriendo:
   ```cmd
   REM Terminal separada
   backend\ENV\Scripts\python.exe backend\manage.py runserver
   ```

3. Verificar endpoint API en navegador:
   - `http://localhost:8000/api/servicios/` (debe mostrar lista JSON)
   - `http://localhost:8000/api/planes-servicio/` (debe mostrar lista JSON)

4. Revisar consola del navegador (F12) para errores de red

---

### 4. seed_contratos_extras.py

**Ubicación**: `scripts/setup/seed_contratos_extras.py`

**Propósito**: Poblar catálogos complementarios de contratos: Visitas, Licencias y Condiciones Especiales.

#### Qué Hace

1. **Crea catálogo de visitas** (8):
   - Visita de Mantenimiento Mensual
   - Visita de Mantenimiento Trimestral
   - Visita de Mantenimiento Semestral
   - Visita de Mantenimiento Anual
   - Visita de Soporte Técnico
   - Visita de Inspección de Equipos
   - Visita de Instalación de Software
   - Visita de Capacitación de Usuarios

2. **Crea catálogo de licencias** (12):
   - Microsoft 365 Business Standard (Microsoft)
   - Microsoft 365 E3 (Microsoft)
   - AutoCAD (Autodesk)
   - Adobe Creative Cloud All Apps (Adobe)
   - Adobe Acrobat Pro (Adobe)
   - Windows 10 Pro / Windows 11 Pro (Microsoft)
   - Slack Business+ (Slack)
   - Zoom Pro (Zoom)
   - Antivirus Kaspersky Endpoint (Kaspersky)
   - TeamViewer Corporate (TeamViewer)
   - SolidWorks Professional (Dassault Systèmes)

3. **Crea catálogo de condiciones especiales** (10):
   - SLA 24/7 - Tiempo de Respuesta 2 horas
   - SLA 8x5 - Tiempo de Respuesta 4 horas
   - Garantía Extendida 3 años
   - Garantía Extendida 5 años
   - Reemplazo de Equipos en Caso de Falla
   - Capacitación de Usuarios Incluida
   - Actualización de Software Incluida
   - Penalización por Incumplimiento de SLA
   - Confidencialidad y NDA
   - Cláusula de Terminación Anticipada

#### Cuándo Usar

- ✅ **CRÍTICO**: Después de `seed_servicios.py` y antes de crear contratos
- ✅ Cuando dropdown de visitas aparece vacío en configuración de contrato
- ✅ Cuando dropdown de licencias aparece vacío
- ✅ Cuando no hay condiciones especiales disponibles
- ✅ Testing completo del módulo contratos

#### Prerequisitos

```cmd
REM 1. Base de datos migrada
cd backend
backend\ENV\Scripts\python.exe manage.py migrate

REM 2. Empresa base creada (setup_superuser.py)
backend\ENV\Scripts\python.exe ..\scripts\setup\setup_superuser.py
```

#### Uso

```cmd
REM Desde la raíz del proyecto
backend\ENV\Scripts\python.exe scripts\setup\seed_contratos_extras.py

REM O desde backend/
cd backend
ENV\Scripts\python.exe ..\scripts\setup\seed_contratos_extras.py
```

#### Salida Esperada

```
======================================================================
SEED CONTRATOS EXTRAS - Poblando catálogos de Visitas, Licencias y Condiciones
======================================================================

--- Creando catálogo de Visitas ---
✓ Visita 'Visita de Mantenimiento Mensual' creada
✓ Visita 'Visita de Mantenimiento Trimestral' creada
...

--- Creando catálogo de Licencias ---
✓ Licencia 'Microsoft 365 Business Standard' de Microsoft creada
✓ Licencia 'AutoCAD' de Autodesk creada
...

--- Creando catálogo de Condiciones Especiales ---
✓ Condición 'SLA 24/7 - Tiempo de Respuesta 2 horas' creada
✓ Condición 'Garantía Extendida 3 años' creada
...

======================================================================
RESUMEN DE CREACIÓN
======================================================================
Visitas creadas:              8
Licencias creadas:            12
Condiciones especiales:       10
======================================================================
✅ SEED CONTRATOS EXTRAS COMPLETADO CON ÉXITO
======================================================================

📊 Totales en base de datos:
   - Visitas: 8
   - Licencias: 12
   - Condiciones Especiales: 10
```

#### Verificación

```cmd
backend\ENV\Scripts\python.exe backend\manage.py shell
```

```python
from contratos.models import Visita, Licencia, CondicionEspecial

print(f"Visitas: {Visita.objects.count()}")  # Esperado: 8
print(f"Licencias: {Licencia.objects.count()}")  # Esperado: 12
print(f"Condiciones: {CondicionEspecial.objects.count()}")  # Esperado: 10

# Verificar algunas visitas
for visita in Visita.objects.all()[:3]:
    print(f"  - {visita.descripcion}")

# Verificar algunas licencias
for licencia in Licencia.objects.all()[:3]:
    print(f"  - {licencia.nombre} ({licencia.proveedor})")
```

#### Troubleshooting

**Problema**: Script ejecuta pero no crea registros

```cmd
REM Verificar que no existan duplicados
backend\ENV\Scripts\python.exe backend\manage.py shell
```

```python
from contratos.models import Visita
# get_or_create no crea si ya existe con mismo nombre
Visita.objects.filter(descripcion__icontains="Mantenimiento").delete()
```

---

### 5. seed_categorias_gastos.py

**Ubicación**: `scripts/setup/seed_categorias_gastos.py`

**Propósito**: Poblar catálogo de categorías de gastos para módulo de rendiciones.

#### Qué Hace

Crea **24 categorías de gastos** agrupadas por tipo:

**Transporte** (6):
- Combustible, Peaje, Estacionamiento
- Taxi/Uber, Transporte Público, Arriendo de Vehículo

**Alimentación** (4):
- Desayuno, Almuerzo, Cena, Colación

**Hospedaje** (2):
- Hotel, Hostal

**Materiales y Herramientas** (5):
- Cables y Conectores, Herramientas
- Material Eléctrico, Tornillería, Consumibles

**Comunicaciones** (2):
- Llamadas Telefónicas, Internet Móvil

**Otros** (5):
- Capacitación, Impresiones, Envío de Documentos, Gastos Varios

#### Cuándo Usar

- ✅ **CRÍTICO**: Antes de que usuarios creen Rendiciones o DetalleGastoRendicionOT
- ✅ Testing de módulos de rendiciones de gastos
- ✅ Testing de OT con gastos asociados
- ✅ Cuando dropdown de categorías aparece vacío en formulario de rendición

#### Prerequisitos

```cmd
REM Base de datos migrada
cd backend
backend\ENV\Scripts\python.exe manage.py migrate
```

#### Uso

```cmd
REM Desde la raíz del proyecto
backend\ENV\Scripts\python.exe scripts\setup\seed_categorias_gastos.py

REM O desde backend/
cd backend
ENV\Scripts\python.exe ..\scripts\setup\seed_categorias_gastos.py
```

#### Salida Esperada

```
======================================================================
SEED CATEGORÍAS DE GASTOS - Poblando catálogo para Rendiciones
======================================================================

--- Creando catálogo de Categorías de Gastos ---
✓ Categoría 'Combustible' creada
✓ Categoría 'Peaje' creada
✓ Categoría 'Estacionamiento' creada
...

======================================================================
RESUMEN DE CREACIÓN
======================================================================
Categorías de gastos creadas:  24
======================================================================
✅ SEED CATEGORÍAS DE GASTOS COMPLETADO CON ÉXITO
======================================================================

📊 Total en base de datos: 24 categorías
```

#### Verificación

```cmd
backend\ENV\Scripts\python.exe backend\manage.py shell
```

```python
from rendiciones.models import CategoriaGastoRendicion

print(f"Categorías: {CategoriaGastoRendicion.objects.count()}")  # Esperado: 24

# Listar por grupo
print("\nTransporte:")
for cat in CategoriaGastoRendicion.objects.filter(nombre__in=['Combustible', 'Peaje', 'Estacionamiento']):
    print(f"  - {cat.nombre}")

print("\nAlimentación:")
for cat in CategoriaGastoRendicion.objects.filter(nombre__in=['Desayuno', 'Almuerzo', 'Cena']):
    print(f"  - {cat.nombre}")
```

---

### 6. seed_completo.py

**Ubicación**: `scripts/setup/seed_completo.py`

**Propósito**: Orquestador que ejecuta todos los scripts de seed en orden correcto de dependencias.

#### Qué Hace

Ejecuta secuencialmente en orden:

1. `setup_superuser.py` → User + Empresa base (11111111-1)
2. `seed_data.py` → Empresas, Usuarios, Items, Bodegas
3. `seed_servicios.py` → Servicios, Planes, Características
4. `seed_contratos_extras.py` → Visitas, Licencias, Condiciones
5. `seed_categorias_gastos.py` → Categorías de gastos

**Características**:
- Detiene ejecución si algún script requerido falla
- Muestra progreso paso a paso
- Resumen final con estadísticas

#### Cuándo Usar

- ✅ **Primera inicialización** del sistema desde cero
- ✅ Después de `reset_db.py` para poblar todo de una vez
- ✅ Configurar entorno de testing con datos completos
- ✅ Onboarding de nuevos desarrolladores
- ✅ Cuando quieres asegurar que TODOS los catálogos estén poblados

#### Prerequisitos

```cmd
REM 1. Base de datos resetada
backend\ENV\Scripts\python.exe scripts\setup\reset_db.py

REM 2. Confirmar que todos los scripts existen en scripts/setup/
dir scripts\setup\seed*.py
```

#### Uso

```cmd
REM Desde la raíz del proyecto
backend\ENV\Scripts\python.exe scripts\setup\seed_completo.py

REM O desde backend/
cd backend
ENV\Scripts\python.exe ..\scripts\setup\seed_completo.py
```

#### Salida Esperada

```
================================================================================
           SEED COMPLETO - Poblando todos los catálogos del sistema           
================================================================================

📋 Scripts a ejecutar:
   1. setup_superuser.py           - Crear superusuario y empresa base (11111111-1) [✅ Requerido]
   2. seed_data.py                 - Poblar empresas, usuarios, items, bodegas, categorías [✅ Requerido]
   3. seed_servicios.py            - Poblar servicios, planes y características [✅ Requerido]
   4. seed_contratos_extras.py     - Poblar visitas, licencias y condiciones especiales [✅ Requerido]
   5. seed_categorias_gastos.py    - Poblar categorías de gastos para rendiciones [✅ Requerido]

================================================================================
PASO 1/5: setup_superuser.py
Descripción: Crear superusuario y empresa base (11111111-1)
================================================================================
[...output del script...]
✅ setup_superuser.py completado exitosamente

================================================================================
PASO 2/5: seed_data.py
Descripción: Poblar empresas, usuarios, items, bodegas, categorías
================================================================================
[...output del script...]
✅ seed_data.py completado exitosamente

[...continúa con cada script...]

================================================================================
                         RESUMEN DE EJECUCIÓN                                  
================================================================================

📊 Estadísticas:
   - Scripts ejecutados:    5/5
   - Scripts exitosos:      5
   - Scripts fallidos:      0

================================================================================
                 ✅ SEED COMPLETO FINALIZADO CON ÉXITO                         
================================================================================

💡 Próximos pasos:
   1. Iniciar backend: backend\ENV\Scripts\python.exe backend\manage.py runserver
   2. Iniciar frontend: cd frontend && npm run dev
   3. Acceder al sistema: http://localhost:5173
   4. Login con superusuario configurado en setup_superuser.py
```

#### Verificación Post-Ejecución

```cmd
backend\ENV\Scripts\python.exe backend\manage.py shell
```

```python
from django.contrib.auth import get_user_model
from empresas.models import Empresa, UsuarioEmpresa
from items.models import ItemEmpresa, Categoria
from bodegas.models import Bodega
from contratos.models import Servicio, PlanServicio, Visita, Licencia, CondicionEspecial
from rendiciones.models import CategoriaGastoRendicion

User = get_user_model()

# Verificar todos los catálogos
print("=" * 60)
print("VERIFICACIÓN DE CATÁLOGOS POBLADOS")
print("=" * 60)
print(f"✅ Users: {User.objects.count()}")
print(f"✅ Empresas: {Empresa.objects.count()}")
print(f"✅ UsuarioEmpresa: {UsuarioEmpresa.objects.count()}")
print(f"✅ Items: {ItemEmpresa.objects.count()}")
print(f"✅ Categorías Items: {Categoria.objects.count()}")
print(f"✅ Bodegas: {Bodega.objects.count()}")
print(f"✅ Servicios: {Servicio.objects.count()}")
print(f"✅ Planes: {PlanServicio.objects.count()}")
print(f"✅ Visitas: {Visita.objects.count()}")
print(f"✅ Licencias: {Licencia.objects.count()}")
print(f"✅ Condiciones: {CondicionEspecial.objects.count()}")
print(f"✅ Categorías Gastos: {CategoriaGastoRendicion.objects.count()}")
print("=" * 60)
```

#### Troubleshooting

**Problema**: Script falla en paso intermedio

```bash
# 1. Identificar qué script falló (aparecerá ❌ ERROR en...)
# 2. Ejecutar ese script individualmente para ver error completo
backend\ENV\Scripts\python.exe scripts\setup\seed_servicios.py

# 3. Corregir problema
# 4. Continuar desde ese paso ejecutando scripts restantes manualmente
```

**Problema**: "Script X NO ENCONTRADO"

```cmd
REM Verificar que el script existe
dir scripts\setup\seed_servicios.py

REM Si no existe, créalo o verifica ruta
```

---

### 7. reset_db.py

**Ubicación**: `scripts/setup/reset_db.py`

**Propósito**: Resetear la base de datos a estado inicial limpio (elimina TODOS los datos).

#### ⚠️ PELIGRO

- **Elimina PERMANENTEMENTE** todos los datos
- **Solo para desarrollo local**
- **NUNCA usar en producción**

#### Qué Hace

1. **Pide confirmación** (usuario debe escribir "SI" en mayúsculas)
2. **Elimina `backend/db.sqlite3`** completo
3. **Re-ejecuta todas las migraciones** (`manage.py migrate`)
4. **Deja base limpia** lista para `createsuperuser`

#### Cuándo Usar

- ✅ Desarrollo local cuando necesitas empezar de cero
- ✅ Antes de correr migraciones conflictivas
- ✅ Testing de inicialización completa
- ✅ Conflictos de migraciones irresolubles
- ❌ **NUNCA en producción**

#### Prerequisitos

```cmd
REM 1. Entorno virtual creado y dependencias instaladas
cd backend
python -m venv ENV
ENV\Scripts\activate
pip install -r req.txt

REM 2. Variables de entorno configuradas (opcional en local)
REM    - SECRET_KEY, DEBUG_ENABLE, etc.
```

#### Uso

```cmd
REM Desde la raíz del proyecto
backend\ENV\Scripts\python.exe scripts\setup\reset_db.py

REM O desde backend/
cd backend
ENV\Scripts\python.exe ..\scripts\setup\reset_db.py
```

#### Flujo de Ejecución

```
============================================================
Reset de Base de Datos
============================================================

⚠️  ADVERTENCIA: Esta acción eliminará TODOS los datos de la base de datos.

¿Estás seguro de continuar? (escribe 'SI' para confirmar): SI

--- Eliminando base de datos ---
✓ Base de datos eliminada: C:\...\backend\db.sqlite3

--- Ejecutando migraciones ---
Operations to perform:
  Apply all migrations: admin, auth, contenttypes, sessions, ...
Running migrations:
  Applying contenttypes.0001_initial... OK
  Applying auth.0001_initial... OK
  ...
✓ Migraciones ejecutadas exitosamente

============================================================
✓ Base de datos reseteada exitosamente
============================================================

Próximos pasos:
1. Crear superusuario:
   cd backend
   backend\ENV\Scripts\python.exe manage.py createsuperuser

2. Configurar empresa y permisos:
   backend\ENV\Scripts\python.exe ..\scripts\setup\setup_superuser.py

3. (Opcional) Poblar datos de prueba:
   backend\ENV\Scripts\python.exe ..\scripts\setup\seed_data.py
```

#### Idempotencia

❌ **NO idempotente**: Siempre elimina todos los datos.

- Requiere confirmación manual cada vez
- No hay forma de "deshacer" sin backup

#### Troubleshooting

| Problema | Causa | Solución |
|----------|-------|----------|
| "Base de datos no existe" | Ya está limpia | Continúa con migraciones |
| "Error al ejecutar migraciones" | Código de migrations corrupto | Revisa archivos de migrations o usa `--fake-initial` |
| "Operación cancelada" | Usuario escribió algo distinto de "SI" | Re-ejecuta y escribe "SI" exactamente |

#### Prevención de Pérdida de Datos

**Antes de usar `reset_db.py`, considera**:

1. **Backup manual**:
   ```cmd
   copy backend\db.sqlite3 backend\db_backup_%date:~-4,4%%date:~-10,2%%date:~-7,2%.sqlite3
   ```

2. **Usar `backup_db.py`**:
   ```cmd
   backend\ENV\Scripts\python.exe scripts\maintenance\backup_db.py
   ```

3. **Exportar fixtures**:
   ```cmd
   backend\ENV\Scripts\python.exe manage.py dumpdata empresas --indent 2 > empresas.json
   ```

---

## 🛠️ Scripts de Development (Desarrollo)

### 4. create_groups.py

**Ubicación**: `scripts/development/create_groups.py`

**Propósito**: Crear o actualizar grupos de permisos estándar del sistema.

#### Qué Hace

Crea/actualiza 8 grupos predefinidos:

| Grupo | Descripción | Uso Típico |
|-------|-------------|------------|
| `staff` | Personal administrativo general | Acceso a funciones de gestión |
| `superadmin` | Administrador con permisos máximos | Acceso total al sistema |
| `multi-empresas` | Acceso a múltiples empresas | Ver/gestionar varias empresas |
| `tecnico` | Técnico de campo | Gestión de OT, visitas y equipos |
| `bodeguero` | Encargado de bodega | Gestión de inventario y movimientos |
| `representante_legal` | Representante legal | Firma de contratos y documentos legales |
| `vendedor` | Vendedor | Gestión de cotizaciones y clientes |
| `comprador` | Comprador | Gestión de órdenes de compra y proveedores |

#### Cuándo Usar

- ✅ Agregar nuevos roles al sistema
- ✅ Sincronizar grupos entre entornos (dev, staging, prod)
- ✅ Después de cambios en permisos del sistema
- ✅ Diagnóstico de permisos (ver qué grupos existen)

#### Prerequisitos

```cmd
REM Base de datos migrada
backend\ENV\Scripts\python.exe manage.py migrate
```

#### Uso

```cmd
REM Desde la raíz del proyecto
backend\ENV\Scripts\python.exe scripts\development\create_groups.py

REM O desde backend/
cd backend
ENV\Scripts\python.exe ..\scripts\development\create_groups.py
```

#### Salida Esperada

```
============================================================
Creación de Grupos de Permisos
============================================================

--- Grupos estándar definidos ---
  - staff                      → Personal administrativo general - Acceso a funciones de gestión
  - superadmin                 → Administrador con permisos máximos - Acceso total al sistema
  - multi-empresas             → Acceso a múltiples empresas - Puede ver y gestionar varias empresas
  - tecnico                    → Técnico de campo - Gestión de OT, visitas y equipos
  - bodeguero                  → Encargado de bodega - Gestión de inventario y movimientos
  - representante_legal        → Representante legal - Firma de contratos y documentos legales
  - vendedor                   → Vendedor - Gestión de cotizaciones y clientes
  - comprador                  → Comprador - Gestión de órdenes de compra y proveedores

--- Creando/verificando grupos ---
✓ Grupo 'staff' creado
  └─ Personal administrativo general - Acceso a funciones de gestión
✓ Grupo 'superadmin' creado
  └─ Administrador con permisos máximos - Acceso total al sistema
  Grupo 'tecnico' ya existe
  Grupo 'bodeguero' ya existe
...

--- Resumen ---
  Grupos creados: 2
  Grupos existentes: 6

--- Grupos actuales en el sistema ---
  - bodeguero                  (3 usuarios)
  - comprador                  (0 usuarios)
  - multi-empresas             (1 usuarios)
  - representante_legal        (45 usuarios)
  - staff                      (2 usuarios)
  - superadmin                 (2 usuarios)
  - tecnico                    (3 usuarios)
  - vendedor                   (0 usuarios)

============================================================
✓ Operación completada
============================================================

Los nuevos grupos están listos para ser asignados a usuarios
desde Django Admin (/admin/empresas/usuarioempresa/)
```

#### Idempotencia

✅ **Idempotente**: Puede ejecutarse múltiples veces sin causar errores.

- Usa `get_or_create()` para todos los grupos
- No duplica grupos existentes
- No modifica asignaciones de usuarios

#### Cómo Agregar Nuevo Rol

1. **Editar `create_groups.py`**:
   ```python
   GRUPOS_ESTANDAR = [
       # ... grupos existentes ...
       {
           'name': 'nuevo_rol',
           'descripcion': 'Descripción del nuevo rol',
       },
   ]
   ```

2. **Ejecutar script**:
   ```cmd
   backend\ENV\Scripts\python.exe scripts\development\create_groups.py
   ```

3. **Asignar grupo a usuarios** en Django Admin:
   - `/admin/empresas/usuarioempresa/`
   - Seleccionar usuario
   - Agregar grupo en campo "grupos"

4. **Actualizar frontend** (si aplica):
   ```typescript
   // frontend/src/config/pages.config.ts
   export const PagesConfig = {
       path: '/nueva-ruta',
       roles: ['nuevo_rol'],
       // ...
   }
   ```

---

### 5. check_personalizacion.py

**Ubicación**: `scripts/development/check_personalizacion.py`

**Propósito**: Diagnosticar `PersonalizacionUsuario` faltante o mal configurado.

#### Qué Hace

1. **Busca primer usuario** en la base de datos
2. **Verifica** si tiene `PersonalizacionUsuario` asociado
3. **Muestra `sucursal_principal`** configurada
4. **Lista sucursales disponibles** (primeras 5)

#### Cuándo Usar

- ✅ Dashboard muestra "sin empresa"
- ✅ Invitaciones aparecen vacías
- ✅ Usuario creado con `createsuperuser` no puede acceder al sistema
- ✅ Debugging de contexto de usuario

#### Prerequisitos

```cmd
REM Base de datos migrada con al menos 1 usuario
backend\ENV\Scripts\python.exe manage.py migrate
backend\ENV\Scripts\python.exe manage.py createsuperuser
```

#### Uso

**Método 1: Django shell**:
```cmd
cd backend
ENV\Scripts\python.exe manage.py shell < ..\scripts\development\check_personalizacion.py
```

**Método 2: Ejecutar directamente** (modificar script para no requerir shell):
```cmd
backend\ENV\Scripts\python.exe scripts\development\check_personalizacion.py
```

#### Salida Esperada

**Sin PersonalizacionUsuario**:
```
Usuario: admin@snabbit.cl (ID: 1)
PersonalizacionUsuario existente: None
  - NO existe PersonalizacionUsuario para este usuario

Sucursales disponibles: 3
  - Casa Matriz (ID: 1, Empresa: Snabbit)
  - Sucursal Principal (ID: 2, Empresa: Empresa Cliente A)
  - Sucursal Principal (ID: 3, Empresa: Empresa Cliente B)
```

**Con PersonalizacionUsuario**:
```
Usuario: admin@snabbit.cl (ID: 1)
PersonalizacionUsuario existente: PersonalizacionUsuario object (1)
  - Sucursal principal: Casa Matriz

Sucursales disponibles: 3
  - Casa Matriz (ID: 1, Empresa: Snabbit)
  - Sucursal Principal (ID: 2, Empresa: Empresa Cliente A)
  - Sucursal Principal (ID: 3, Empresa: Empresa Cliente B)
```

#### Solución a Problemas Comunes

**Si falta `PersonalizacionUsuario`**:
```cmd
backend\ENV\Scripts\python.exe scripts\setup\setup_superuser.py
```

**Si `sucursal_principal` es None**:
```python
# Django shell
from core.models import PersonalizacionUsuario
from empresas.models import SucursalEmpresa

pers = PersonalizacionUsuario.objects.first()
sucursal = SucursalEmpresa.objects.first()
pers.sucursal_principal = sucursal
pers.save()
```

---

### 6. list_endpoints.py

**Ubicación**: `scripts/development/list_endpoints.py`

**Propósito**: Listar todos los endpoints API del sistema, opcionalmente exportar a Markdown.

#### Qué Hace

1. **Extrae recursivamente** todas las URLs del proyecto Django
2. **Categoriza endpoints** por módulo (Autenticación, Empresas, Cotizaciones, etc.)
3. **Muestra en consola** con formato organizado
4. **Opcionalmente exporta** a `.github/LISTA_ENDPOINTS.md`

#### Cuándo Usar

- ✅ Documentar API para frontend
- ✅ Auditoría de endpoints disponibles
- ✅ Planificación de desarrollo (ver qué falta)
- ✅ Onboarding de nuevos desarrolladores

#### Prerequisitos

```cmd
REM Base de datos migrada (Django configurado)
backend\ENV\Scripts\python.exe manage.py migrate
```

#### Uso

```cmd
REM Desde la raíz del proyecto
backend\ENV\Scripts\python.exe scripts\development\list_endpoints.py

REM O desde backend/
cd backend
ENV\Scripts\python.exe ..\scripts\development\list_endpoints.py
```

#### Salida Esperada (Consola)

```
================================================================================
📋 LISTA COMPLETA DE ENDPOINTS DEL SISTEMA ERP
================================================================================

🔹 AUTENTICACIÓN (8 endpoints)
--------------------------------------------------------------------------------
  /auth/jwt/create                                   [GET, POST, PUT, PATCH, DELETE]
  /auth/jwt/refresh                                  [GET, POST, PUT, PATCH, DELETE]
  /auth/jwt/verify                                   [GET, POST, PUT, PATCH, DELETE]
  /auth/users/                                       [GET, POST, PUT, PATCH, DELETE]
  /auth/users/activation/                            [GET, POST, PUT, PATCH, DELETE]
  /auth/users/me/                                    [GET, POST, PUT, PATCH, DELETE]
  /auth/users/reset_password/                        [GET, POST, PUT, PATCH, DELETE]
  /auth/users/reset_password_confirm/                [GET, POST, PUT, PATCH, DELETE]

🔹 EMPRESAS Y SUCURSALES (12 endpoints)
--------------------------------------------------------------------------------
  /api/empresas/                                     [GET, POST]
  /api/empresas/<pk>/                                [GET, PUT, PATCH, DELETE]
  /api/empresas/<pk>/clientes/                       [GET]
  /api/sucursales-empresa/                           [GET, POST]
  /api/sucursales-empresa/<pk>/                      [GET, PUT, PATCH, DELETE]
  /api/usuarios-empresa/                             [GET, POST]
  /api/usuarios-empresa/<pk>/                        [GET, PUT, PATCH, DELETE]
  /api/invitaciones-empresa/                         [GET, POST]
  /api/invitaciones-empresa/<pk>/                    [GET, DELETE]
  /api/invitaciones-empresa/<uuid:uuid>/aceptar/     [POST]
  /api/relaciones-empresa/                           [GET, POST]
  /api/relaciones-empresa/<pk>/                      [GET, PUT, PATCH, DELETE]

... (sigue con todas las categorías) ...

================================================================================
✅ Total de endpoints: 247
================================================================================
```

#### Exportar a Markdown

Al final de la ejecución, el script pregunta:

```
¿Deseas exportar a Markdown? (s/n): s

✅ Lista exportada a: C:\...\monorepo_erp\.github\LISTA_ENDPOINTS.md
```

**Archivo generado**: `.github/LISTA_ENDPOINTS.md`

#### Categorías de Endpoints

El script categoriza automáticamente por:

- **Autenticación** (`/auth/`)
- **Empresas y Sucursales** (`/api/empresas`, `/usuarios-empresa`)
- **Cotizaciones** (`/api/cotizaciones`)
- **Contratos** (`/api/contratos`)
- **Órdenes de Trabajo** (`/api/ordentrabajo`, `/api/orden`)
- **Bodegas e Inventario** (`/api/bodegas`, `/api/movimientos`, `/api/guias`)
- **Items y Productos** (`/api/items`, `/api/productos`)
- **Recursos Humanos** (`/api/recursos`)
- **Activos** (`/api/activos`)
- **Vacaciones** (`/api/vacaciones`)
- **Visitas** (`/api/visitas`)
- **Rendiciones** (`/api/rendiciones`)
- **Calendario** (`/api/calendario`, `/api/eventos`)
- **Usuarios y Cuentas** (`/api/cuentas`, `/api/usuarios`)
- **Personalización** (`/api/personalizacion`)
- **Geografía** (`/api/regiones`, `/api/comunas`, `/api/ciudades`)
- **Retroalimentación** (`/api/retroalimentacion`)
- **Django Admin** (`admin/`)
- **Monitoreo** (`metrics/`)
- **Otros**

---

### 7. reset_local_data.py

**Ubicación**: `scripts/development/reset_local_data.py`

**Propósito**: Wrapper interactivo para `reset_db.py` ejecutable desde la raíz del proyecto.

#### Qué Hace

1. **Verifica prerequisitos**:
   - Entorno virtual en `backend/ENV/Scripts/python.exe`
   - Script `reset_db.py` existe

2. **Pide confirmación** (usuario debe escribir "SI" en mayúsculas)

3. **Delega a `reset_db.py`** con paths absolutos

4. **Reporta resultado** con código de salida

#### Cuándo Usar

- ✅ Mismo caso de uso que `reset_db.py`
- ✅ Más cómodo desde raíz del proyecto
- ✅ Mejor mensajes de error si falta entorno virtual

#### Prerequisitos

```cmd
REM Mismo que reset_db.py
```

#### Uso

```cmd
REM Desde la raíz del proyecto
python scripts\development\reset_local_data.py
```

#### Salida Esperada

```
⚠️  Esta acción eliminará backend/db.sqlite3 y volverá a ejecutar las migraciones.
¿Deseas continuar? (escribe SI en mayúsculas): SI

Ejecutando:
C:\...\backend\ENV\Scripts\python.exe C:\...\scripts\setup\reset_db.py

============================================================
Reset de Base de Datos
============================================================
...
(salida de reset_db.py)
...

✅ Base de datos reiniciada con éxito. Puedes volver a correr los scripts de seed.
```

#### Troubleshooting

| Problema | Causa | Solución |
|----------|-------|----------|
| "No se encontró el intérprete en backend/ENV/Scripts/python.exe" | Entorno virtual no creado | Crea entorno: `python -m venv backend/ENV` |
| "No se encontró scripts/setup/reset_db.py" | Repositorio incompleto | Clona repositorio completo |
| "Operación cancelada" | Usuario no escribió "SI" | Re-ejecuta y escribe "SI" exactamente |

---

## 🔧 Scripts de Maintenance (Mantenimiento)

### 8. backup_db.py

**Ubicación**: `scripts/maintenance/backup_db.py`

**Propósito**: Crear backup timestampeado de la base de datos SQLite.

#### Qué Hace

1. **Verifica** que existe `backend/db.sqlite3`
2. **Crea carpeta** `backend/backups/` si no existe
3. **Copia archivo** con nombre `db_backup_YYYYMMDD_HHMMSS.sqlite3`
4. **Muestra tamaño** del backup en MB
5. **Lista** backups existentes (5 más recientes)

#### Cuándo Usar

- ✅ Antes de migraciones grandes
- ✅ Antes de operaciones peligrosas (reset, cambios masivos)
- ✅ Backup periódico en desarrollo
- ✅ Antes de actualizar dependencias
- ❌ **NO reemplaza backup en producción** (usar dump SQL)

#### Prerequisitos

```cmd
REM Base de datos existente
REM (Si no existe, script reporta error)
```

#### Uso

```cmd
REM Desde la raíz del proyecto
backend\ENV\Scripts\python.exe scripts\maintenance\backup_db.py

REM O desde backend/
cd backend
ENV\Scripts\python.exe ..\scripts\maintenance\backup_db.py
```

#### Salida Esperada

```
============================================================
Backup de Base de Datos
============================================================

--- Creando backup ---
✓ Backup creado exitosamente
  Archivo: db_backup_20251105_143022.sqlite3
  Ubicación: C:\...\backend\backups\db_backup_20251105_143022.sqlite3
  Tamaño: 1.23 MB

--- Backups existentes ---
  Total: 5 backups

  - db_backup_20251105_143022.sqlite3   1.23 MB   2025-11-05 14:30:22
  - db_backup_20251105_120045.sqlite3   1.21 MB   2025-11-05 12:00:45
  - db_backup_20251104_185511.sqlite3   1.18 MB   2025-11-04 18:55:11
  - db_backup_20251104_094233.sqlite3   1.15 MB   2025-11-04 09:42:33
  - db_backup_20251103_213344.sqlite3   1.10 MB   2025-11-03 21:33:44

============================================================
✓ Backup completado
============================================================

Para restaurar un backup:
1. Detén el servidor backend
2. Reemplaza db.sqlite3 con el archivo de backup
3. Reinicia el servidor
```

#### Restaurar Backup

**Método manual**:

```cmd
REM 1. Detener backend (Ctrl+C en runserver)

REM 2. Reemplazar db.sqlite3
cd backend
copy backups\db_backup_20251105_143022.sqlite3 db.sqlite3
REM Confirmar sobreescritura: Y

REM 3. Reiniciar backend
ENV\Scripts\python.exe manage.py runserver
```

**Método con PowerShell**:

```powershell
cd backend
Stop-Process -Name "python" -ErrorAction SilentlyContinue
Copy-Item -Path "backups\db_backup_20251105_143022.sqlite3" -Destination "db.sqlite3" -Force
.\ENV\Scripts\python.exe manage.py runserver
```

#### Gestión de Backups

**Ver todos los backups**:
```cmd
dir backend\backups\*.sqlite3 /o-d
```

**Eliminar backups antiguos** (más de 30 días):
```cmd
forfiles /p backend\backups /s /m *.sqlite3 /d -30 /c "cmd /c del @path"
```

**Backup antes de migración**:
```cmd
REM 1. Crear backup
backend\ENV\Scripts\python.exe scripts\maintenance\backup_db.py

REM 2. Ejecutar migración
cd backend
ENV\Scripts\python.exe manage.py makemigrations
ENV\Scripts\python.exe manage.py migrate

REM 3. Si falla, restaurar backup (ver "Restaurar Backup" arriba)
```

---

## 🎯 Flujos de Trabajo Completos

### Flujo 1: Inicialización Completa (Nuevo Entorno)

**Escenario**: Acabas de clonar el repo en tu notebook.

```cmd
REM 1. Navegar al proyecto
cd monorepo_erp

REM 2. Backend: Crear entorno virtual e instalar dependencias
cd backend
python -m venv ENV
ENV\Scripts\activate
pip install -r req.txt

REM 3. Aplicar migraciones
ENV\Scripts\python.exe manage.py migrate

REM 4. Crear superusuario
ENV\Scripts\python.exe manage.py createsuperuser
REM Email: admin@snabbit.cl
REM First name: Admin
REM Last name: Snabbit
REM Password: ******** (tu password)

REM 5. Configurar empresa y permisos
ENV\Scripts\python.exe ..\scripts\setup\setup_superuser.py

REM 6. (Opcional) Poblar datos de prueba
ENV\Scripts\python.exe ..\scripts\setup\seed_data.py

REM 7. Iniciar servidor backend
ENV\Scripts\python.exe manage.py runserver
```

**En otra terminal**:

```cmd
REM 8. Frontend: Instalar dependencias
cd frontend
npm install

REM 9. Iniciar servidor frontend
npm run dev
```

**Acceso**:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000/api/
- Django Admin: http://localhost:8000/admin/

Login con tu superusuario → Acceso completo al sistema ✅

---

### Flujo 2: Resetear Sistema (Empezar de Cero)

**Escenario**: Tienes errores de migraciones o quieres limpiar datos.

```cmd
REM 1. (Opcional) Backup
cd backend
ENV\Scripts\python.exe ..\scripts\maintenance\backup_db.py

REM 2. Resetear base de datos
ENV\Scripts\python.exe ..\scripts\setup\reset_db.py
REM Escribir: SI

REM 3. Crear superusuario
ENV\Scripts\python.exe manage.py createsuperuser
REM Email: admin@snabbit.cl
REM Password: ********

REM 4. Configurar empresa y permisos
ENV\Scripts\python.exe ..\scripts\setup\setup_superuser.py

REM 5. (Opcional) Poblar datos de prueba
ENV\Scripts\python.exe ..\scripts\setup\seed_data.py

REM 6. Reiniciar backend
ENV\Scripts\python.exe manage.py runserver
```

---

### Flujo 3: Agregar Nuevo Rol al Sistema

**Escenario**: Necesitas crear rol "auditor" para auditorías.

**Paso 1: Agregar grupo**

Editar `scripts/development/create_groups.py`:

```python
GRUPOS_ESTANDAR = [
    # ... grupos existentes ...
    {
        'name': 'auditor',
        'descripcion': 'Auditor - Acceso solo lectura a módulos financieros',
    },
]
```

Ejecutar:
```cmd
backend\ENV\Scripts\python.exe scripts\development\create_groups.py
```

**Paso 2: Configurar permisos en frontend**

Editar `frontend/src/config/pages.config.ts`:

```typescript
export const PagesConfig = [
    // ... configuraciones existentes ...
    {
        path: '/auditoria',
        roles: ['auditor', 'superadmin'],
        // ...
    }
]
```

**Paso 3: Asignar grupo a usuarios**

1. Ir a Django Admin: http://localhost:8000/admin/
2. Navegar a **Empresas > Usuarios empresa**
3. Seleccionar usuario
4. Agregar grupo "auditor" en campo "grupos"
5. Guardar

---

### Flujo 4: Backup Antes de Migración Grande

**Escenario**: Vas a cambiar estructura de modelos significativamente.

```cmd
REM 1. Crear backup
cd backend
ENV\Scripts\python.exe ..\scripts\maintenance\backup_db.py
REM Anotar timestamp del backup: db_backup_20251105_143022.sqlite3

REM 2. Ejecutar migraciones
ENV\Scripts\python.exe manage.py makemigrations
REM Revisar migraciones generadas en <app>/migrations/

ENV\Scripts\python.exe manage.py migrate
REM Verificar que no hay errores

REM 3. Testing
ENV\Scripts\python.exe manage.py runserver
REM Probar funcionalidades afectadas en frontend

REM 4. Si todo bien: commit
git add backend/<app>/migrations/
git commit -m "feat: migración de <modelo>"

REM 5. Si hay problemas: rollback
REM Detener backend (Ctrl+C)
copy backups\db_backup_20251105_143022.sqlite3 db.sqlite3
REM Reiniciar backend
ENV\Scripts\python.exe manage.py runserver
```

---

### Flujo 5: Diagnosticar Problema de Permisos

**Escenario**: Usuario reporta "No puedo ver empresas/dashboard vacío".

```cmd
REM 1. Verificar PersonalizacionUsuario
cd backend
ENV\Scripts\python.exe manage.py shell
>>> from core.models import PersonalizacionUsuario
>>> from cuentas.models import User
>>> user = User.objects.get(email='usuario@ejemplo.cl')
>>> PersonalizacionUsuario.objects.filter(usuario=user).exists()
False  # ← Problema encontrado
>>> exit()

REM 2. Ejecutar setup_superuser si es superusuario
ENV\Scripts\python.exe ..\scripts\setup\setup_superuser.py

REM O crear PersonalizacionUsuario manualmente
ENV\Scripts\python.exe manage.py shell
>>> from core.models import PersonalizacionUsuario
>>> from empresas.models import SucursalEmpresa
>>> from cuentas.models import User
>>> user = User.objects.get(email='usuario@ejemplo.cl')
>>> sucursal = SucursalEmpresa.objects.first()
>>> PersonalizacionUsuario.objects.create(
...     usuario=user,
...     tema='3',
...     font_size=14,
...     sucursal_principal=sucursal
... )
>>> exit()

REM 3. Usuario debe cerrar sesión y volver a loguear
```

---

## 📊 Resumen de Scripts

| Script | Categoría | Idempotente | Peligroso | Uso Típico |
|--------|-----------|-------------|-----------|------------|
| `setup_superuser.py` | Setup | ✅ Sí | ❌ No | Primera vez, después de reset |
| `seed_data.py` | Setup | ✅ Sí | ❌ No | Poblar datos de prueba |
| `reset_db.py` | Setup | ❌ No | ⚠️ Sí | Resetear base limpia |
| `create_groups.py` | Development | ✅ Sí | ❌ No | Agregar nuevos roles |
| `check_personalizacion.py` | Development | ✅ Sí (lectura) | ❌ No | Diagnosticar permisos |
| `list_endpoints.py` | Development | ✅ Sí (lectura) | ❌ No | Documentar API |
| `reset_local_data.py` | Development | ❌ No | ⚠️ Sí | Wrapper para reset_db |
| `backup_db.py` | Maintenance | ✅ Sí | ❌ No | Backup antes de cambios |

---

## 🔗 Referencias Cruzadas

### Documentación General
- [Inicialización del Sistema](./guias/inicializacion.md) - Guía completa de setup con scripts
- [Exploración: Empresas](./exploracion/empresas.md) - Bugs encontrados, lecciones aprendidas

### Instrucciones Técnicas
- [Backend Instructions](./instrucciones/backend-instructions.md) - Modelos, ViewSets, permisos
- [Frontend Instructions](./instrucciones/frontend-instructions.md) - Componentes, Redux, servicios
- [Security](./instrucciones/security.md) - JWT, CORS, validaciones
- [Playbooks](./instrucciones/playbooks.md) - Troubleshooting operativo

### Backend Detallado
- [Core + Cuentas](./instrucciones/backend/core-cuentas.md) - Autenticación, personalización
- [Empresas + Cotizaciones](./instrucciones/backend/empresas-cotizaciones.md) - Gestión de empresas
- [Contratos + Bodegas + Items](./instrucciones/backend/contratos-bodegas-items.md) - Operaciones
- [OT + Recursos + Rendiciones + Visitas](./instrucciones/backend/ordentrabajo-recursos-rendiciones-visitas.md) - Operaciones de campo
- [Vacaciones + Calendario + Activos + Retroalimentación](./instrucciones/backend/vacaciones-calendario-activos-retroalimentacion.md) - Soporte

---

## 💡 Notas Importantes

### Convenciones de Ejecución

**Desde raíz del proyecto**:
```cmd
backend\ENV\Scripts\python.exe scripts\<categoria>\<script>.py
```

**Desde backend/**:
```cmd
cd backend
ENV\Scripts\python.exe ..\scripts\<categoria>\<script>.py
```

### Gestión de Entorno Virtual

**Activar entorno** (opcional, scripts usan ruta absoluta):
```cmd
cd backend
ENV\Scripts\activate
```

**Desactivar entorno**:
```cmd
deactivate
```

### Variables de Entorno

Scripts usan `DJANGO_SETTINGS_MODULE` automáticamente:

```python
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sw_erp.settings')
django.setup()
```

Para usar settings personalizados:

```cmd
set DJANGO_SETTINGS_MODULE=sw_erp.settings_custom
backend\ENV\Scripts\python.exe scripts\setup\setup_superuser.py
```

### Estructura Estándar de Script

Todos los scripts siguen este patrón:

```python
#!/usr/bin/env python
"""
Docstring descriptivo.

Qué hace:
- Acción 1
- Acción 2

Cuándo usar:
- Escenario 1
- Escenario 2

Prerequisitos:
- Requisito 1
- Requisito 2

Uso:
    backend\\ENV\\Scripts\\python.exe scripts\\<categoria>\\<script>.py
"""
import os
import sys
import django

# Setup Django
backend_path = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(backend_path, 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sw_erp.settings')
django.setup()

# Imports de Django/proyecto después de setup
from django.contrib.auth import get_user_model

User = get_user_model()


def main():
    print("=" * 60)
    print("Título del Script")
    print("=" * 60)
    print()
    
    # Lógica del script
    # ...
    
    print()
    print("=" * 60)
    print("✓ Operación completada")
    print("=" * 60)
    print()


if __name__ == '__main__':
    main()
```

### Salida de Scripts

**Convenciones**:
- ✓ Checkmark verde para operaciones exitosas
- ⚠️ Warning para acciones que requieren atención
- ❌ Error para fallos
- Secciones con `---` para claridad
- Mensajes descriptivos y concisos

---

## 🚨 Troubleshooting General

### "django.core.exceptions.ImproperlyConfigured"

**Causa**: Django no encuentra `settings.py`

**Solución**:
```cmd
REM Verificar variable de entorno
echo %DJANGO_SETTINGS_MODULE%
REM Debe mostrar: sw_erp.settings

REM Si no está configurada:
set DJANGO_SETTINGS_MODULE=sw_erp.settings
```

### "ModuleNotFoundError: No module named 'django'"

**Causa**: Dependencias no instaladas en entorno virtual

**Solución**:
```cmd
cd backend
ENV\Scripts\python.exe -m pip install -r req.txt
```

### "django.db.utils.OperationalError: no such table"

**Causa**: Migraciones no aplicadas

**Solución**:
```cmd
cd backend
ENV\Scripts\python.exe manage.py migrate
```

### "PermissionError: [WinError 32]"

**Causa**: Archivo de base de datos en uso (backend corriendo)

**Solución**:
```cmd
REM Detener backend (Ctrl+C en terminal de runserver)
REM Re-ejecutar script
```

### Scripts no crean datos esperados

**Diagnóstico**:
```cmd
REM Verificar que existe empresa base
cd backend
ENV\Scripts\python.exe manage.py shell
>>> from empresas.models import Empresa
>>> Empresa.objects.filter(rut_empresa='11111111-1').exists()
True  # ← Debe ser True
>>> exit()
```

**Solución**:
```cmd
REM Ejecutar setup_superuser primero
backend\ENV\Scripts\python.exe scripts\setup\setup_superuser.py
```

---

## 📝 Contribuir

### Agregar Nuevo Script

1. **Colocar en carpeta apropiada**:
   - `setup/` → Inicialización
   - `development/` → Desarrollo
   - `maintenance/` → Mantenimiento

2. **Seguir estructura estándar** (ver "Estructura Estándar de Script")

3. **Actualizar `scripts/README.md`**:
   ```markdown
   #### nuevo_script.py
   **Propósito**: Descripción breve
   
   **Cuándo usar**: Escenarios
   
   **Uso**:
   ```cmd
   backend\ENV\Scripts\python.exe scripts\<categoria>\nuevo_script.py
   ```
   ```

4. **Actualizar este documento** (`guias/scripts.md`):
   - Agregar sección completa con ejemplos
   - Agregar a tabla de resumen
   - Agregar a flujos si aplica

5. **Crear tests** (opcional pero recomendado):
   ```cmd
   cd backend
   ENV\Scripts\python.exe manage.py test scripts.tests
   ```

---

## 🎓 Mejores Prácticas

### Para Desarrolladores

1. **Siempre backup antes de cambios peligrosos**:
   ```cmd
   backend\ENV\Scripts\python.exe scripts\maintenance\backup_db.py
   ```

2. **Usar setup_superuser.py tras createsuperuser**:
   - Evita bugs de permisos
   - Configura PersonalizacionUsuario
   - Garantiza acceso al sistema

3. **seed_data.py solo en desarrollo**:
   - No usar en producción
   - Crea datos de prueba solamente

4. **Documentar nuevos scripts**:
   - Docstring descriptivo
   - Ejemplos de uso
   - Prerequisitos claros

### Para Administradores

1. **Backup periódico** (no solo con script):
   ```cmd
   REM Backup completo del directorio
   xcopy backend\db.sqlite3 backups\db_%date:~-4,4%%date:~-10,2%%date:~-7,2%.sqlite3
   ```

2. **No usar reset_db.py en producción**:
   - Solo desarrollo local
   - Siempre confirmar entorno antes de ejecutar

3. **Mantener backups organizados**:
   ```cmd
   REM Eliminar backups > 30 días
   forfiles /p backend\backups /m *.sqlite3 /d -30 /c "cmd /c del @path"
   ```

---

## 📚 Recursos Adicionales

### Django Management Commands

Scripts complementan pero no reemplazan comandos Django:

```cmd
REM Shell interactivo de Django
python manage.py shell

REM Crear superusuario
python manage.py createsuperuser

REM Ejecutar tests
python manage.py test

REM Colectar archivos estáticos
python manage.py collectstatic

REM Dump de datos
python manage.py dumpdata <app> --indent 2 > fixtures.json

REM Load de datos
python manage.py loaddata fixtures.json
```

### Documentación Django

- [Django Admin](https://docs.djangoproject.com/en/5.1/ref/contrib/admin/)
- [Management Commands](https://docs.djangoproject.com/en/5.1/howto/custom-management-commands/)
- [Migrations](https://docs.djangoproject.com/en/5.1/topics/migrations/)

---

**Última actualización**: 2025-11-05  
**Total líneas**: ~800 líneas  
**Scripts documentados**: 8 scripts principales

---
