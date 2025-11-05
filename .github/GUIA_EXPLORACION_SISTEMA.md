# 🗺️ Guía de Exploración Completa del Sistema ERP

**Objetivo:** Inicializar y explorar el sistema ERP completo, desactivando temporalmente los permisos para comprender toda la funcionalidad sin restricciones.

**Audiencia:** Nuevos desarrolladores, analistas de negocio, stakeholders técnicos

**Última actualización:** 2025-11-04

---

## 📋 Índice

1. [Visión General del Proyecto](#-visión-general-del-proyecto)
2. [Plan de Exploración (Fases)](#-plan-de-exploración-fases)
3. [Fase 0: Preparación del Entorno](#fase-0-preparación-del-entorno)
4. [Fase 1: Desactivar Permisos Temporalmente](#fase-1-desactivar-permisos-temporalmente)
5. [Fase 2: Exploración por Módulos](#fase-2-exploración-por-módulos)
6. [Fase 3: Documentar Funcionalidad](#fase-3-documentar-funcionalidad)
7. [Fase 4: Restaurar Permisos](#fase-4-restaurar-permisos)
8. [Anexo: Arquitectura del Sistema](#anexo-arquitectura-del-sistema)
9. [Troubleshooting](#troubleshooting)

---

## 🎯 Visión General del Proyecto

### ¿Qué es este sistema?

Este es un **ERP completo** (Enterprise Resource Planning) que gestiona:

- 🏢 **Empresas**: Gestión de clientes, proveedores, sucursales
- 📦 **Bodegas**: Inventario, movimientos de stock, guías de salida
- 📝 **Cotizaciones**: Propuestas comerciales, conversión a contratos
- 📋 **Contratos**: Acuerdos comerciales con clientes
- 🔧 **Órdenes de Trabajo**: Servicios técnicos, instalaciones
- 👥 **Recursos**: Empleados, equipos, asignaciones
- 💰 **Rendiciones**: Gastos, ingresos, contabilidad
- 📅 **Calendario**: Eventos, visitas, vacaciones
- 🎯 **Items**: Productos y servicios comercializables
- 🚗 **Activos**: Equipos, vehículos, herramientas

### Stack Tecnológico

**Backend:**
- Django 5.1 (Python 3.11+)
- Django REST Framework (APIs REST)
- Celery (tareas asíncronas)
- Channels + Daphne (WebSockets, tiempo real)
- JWT (autenticación stateless)
- SQLite (desarrollo) / PostgreSQL (producción)
- Redis (caché, Celery broker, Channels)

**Frontend:**
- React 18 (biblioteca UI)
- TypeScript (tipado estático)
- Vite (build tool)
- TailwindCSS (estilos)
- Redux Toolkit (estado global)
- React Router (navegación)

---

## 🗺️ Plan de Exploración (Fases)

### Enfoque Estratégico

El sistema tiene **permisos multinivel** que pueden dificultar la exploración inicial. Vamos a:

1. ✅ **Preparar entorno** local funcional
2. ✅ **Desactivar permisos** temporalmente (modo "Dios")
3. ✅ **Explorar módulos** uno por uno
4. ✅ **Documentar hallazgos** (funcionalidad, relaciones, flujos)
5. ✅ **Restaurar permisos** y aplicar aprendizaje

### Cronograma Sugerido

| Fase | Duración | Objetivo |
|------|----------|----------|
| Fase 0 | 1-2 horas | Entorno funcional |
| Fase 1 | 30 min | Desactivar permisos |
| Fase 2 | 3-5 días | Explorar módulos |
| Fase 3 | 2-3 días | Documentar |
| Fase 4 | 1 hora | Restaurar permisos |

---

## Fase 0: Preparación del Entorno

### Objetivo
Tener el sistema corriendo localmente sin errores.

### Prerequisitos

- **Python 3.11+** instalado
- **Node.js 18+** instalado
- **Git** instalado
- **Redis** disponible (Docker o WSL2)

### Paso 0.1: Verificar Instalaciones

```cmd
python --version
REM Debe mostrar: Python 3.11.x o superior

node --version
REM Debe mostrar: v18.x.x o superior

git --version
REM Debe mostrar versión de Git
```

### Paso 0.2: Clonar Repositorio (si aún no lo tienes)

```cmd
git clone https://github.com/Suikunstito/monorepo_erp.git
cd monorepo_erp
```

### Paso 0.3: Iniciar Redis

**Opción A: Docker (recomendado)**
```cmd
docker run -d --name redis-erp -p 6379:6379 redis:latest
```

**Opción B: WSL2 con Redis nativo**
```bash
# Dentro de WSL2
sudo apt update
sudo apt install redis-server
sudo service redis-server start
```

**Verificar Redis:**
```cmd
REM Instalar redis-cli si usas Docker:
docker exec -it redis-erp redis-cli ping
REM Debe responder: PONG
```

### Paso 0.4: Configurar Backend

```cmd
cd backend

REM Crear entorno virtual
python -m venv ENV

REM Activar entorno
ENV\Scripts\activate

REM Instalar dependencias
pip install -r req.txt

REM Crear archivo .env
copy .env.example .env
REM Editar .env con editor de texto (valores por defecto están OK para local)
```

**Contenido mínimo de `.env`:**
```env
SECRET_KEY=django-insecure-local-development-key-change-in-production
DEBUG_ENABLE=True
HOSTAPIV2=localhost
LOCALHOST_IP=127.0.0.1
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
APIV1URLHTTP_LOCALHOST=http://localhost:8000
FRONTEND_URL=http://localhost:5173
```

```cmd
REM Aplicar migraciones
ENV\Scripts\python.exe manage.py migrate

REM Crear superusuario
ENV\Scripts\python.exe manage.py createsuperuser
REM Email: admin@example.com
REM First name: Admin
REM Last name: Sistema
REM Password: admin123 (o la que prefieras)

REM Configurar empresa y permisos básicos
ENV\Scripts\python.exe ..\scripts\setup\setup_superuser.py
REM Sigue las instrucciones del script

REM Poblar datos de prueba (opcional)
ENV\Scripts\python.exe ..\scripts\setup\seed_data.py
```

### Paso 0.5: Configurar Frontend

**Nueva terminal:**
```cmd
cd frontend

REM Instalar dependencias
npm install

REM Crear archivo .env
copy .env.example .env
```

**Contenido de `frontend\.env`:**
```env
VITE_API_URL=http://localhost:8000
```

### Paso 0.6: Iniciar Sistema

**Terminal 1 (Backend):**
```cmd
cd backend
ENV\Scripts\python.exe manage.py runserver
```

**Terminal 2 (Frontend):**
```cmd
cd frontend
npm run dev
```

**Terminal 3 (Celery Worker - opcional):**
```cmd
cd backend
ENV\Scripts\python.exe -m celery -A sw_erp worker --loglevel=info
```

### Paso 0.7: Validar Instalación

1. **Backend**: http://localhost:8000/admin/
   - Login con superusuario creado
   - Debes ver el Django Admin

2. **Frontend**: http://localhost:5173
   - Login con superusuario
   - Debes ver el dashboard del ERP

3. **API**: http://localhost:8000/api/
   - Debes ver el navegador de API de DRF

**✅ Si todo funciona, continúa a Fase 1**

---

## Fase 1: Desactivar Permisos Temporalmente

### Objetivo
Crear una configuración que permita acceso completo sin validaciones de permisos.

### ⚠️ IMPORTANTE: Backup

Antes de modificar archivos, crea un backup:

```cmd
cd backend
copy sw_erp\settings.py sw_erp\settings.py.BACKUP
```

```cmd
cd frontend
copy src\config\pages.config.ts src\config\pages.config.ts.BACKUP
```

### Paso 1.1: Desactivar Permisos en Backend

**Archivo:** `backend/sw_erp/settings.py`

**Cambio 1: Permitir todos los orígenes (CORS)**

Buscar:
```python
CORS_ORIGIN_ALLOW_ALL = True
```

✅ Ya está configurado, no cambiar.

**Cambio 2: Desactivar validación de autenticación**

Buscar la sección `REST_FRAMEWORK`:

```python
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'rest_framework.authentication.TokenAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',  # ← CAMBIAR ESTA LÍNEA
    ],
    # ...resto de config
}
```

**Cambiar a:**
```python
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'rest_framework.authentication.TokenAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny',  # ← MODO EXPLORACIÓN: Sin permisos
    ],
    # ...resto de config
}
```

**⚠️ SOLO PARA DESARROLLO LOCAL**

**Cambio 3: Desactivar JWT temporalmente (opcional, si da problemas)**

Si encuentras problemas de tokens expirados, aumenta los lifetimes:

```python
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=24),  # ← De 5h a 24h
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),   # ← De 10h a 7 días
    # ...resto de config
}
```

**Reiniciar backend:**
```cmd
REM Detener backend (Ctrl+C en la terminal)
REM Reiniciar:
cd backend
ENV\Scripts\python.exe manage.py runserver
```

### Paso 1.2: Desactivar Permisos en Frontend

**Archivo:** `frontend/src/config/pages.config.ts`

Este archivo define qué grupos (`authority`) necesita cada ruta. Vamos a vaciar todos los `authority`.

**Opción A: Script automatizado (recomendado)**

Crea el archivo `frontend/disable-permissions.js`:

```javascript
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, 'src', 'config', 'pages.config.ts');
let content = fs.readFileSync(configPath, 'utf8');

// Reemplazar todos los authority con array vacío
content = content.replace(/authority:\s*\[.*?\]/g, 'authority: []');

fs.writeFileSync(configPath, content, 'utf8');
console.log('✅ Permisos desactivados en pages.config.ts');
```

**Ejecutar:**
```cmd
cd frontend
node disable-permissions.js
```

**Opción B: Manual con VS Code**

1. Abrir `frontend/src/config/pages.config.ts`
2. Buscar y Reemplazar (Ctrl+H):
   - **Buscar:** `authority: \[.*?\]`
   - **Opciones:** Habilitar "Use Regular Expression" (icono `.*`)
   - **Reemplazar con:** `authority: []`
   - Click en "Replace All"

**Verificar cambio:**
```typescript
// Antes:
empresa: {
    authority: ['staff', 'superadmin'],  // ← Requería permisos
    // ...
}

// Después:
empresa: {
    authority: [],  // ← Sin permisos
    // ...
}
```

**Reiniciar frontend:**
```cmd
REM Detener frontend (Ctrl+C)
REM Reiniciar:
cd frontend
npm run dev
```

### Paso 1.3: Validar Desactivación

1. **Logout y Login** en frontend (http://localhost:5173)
   - Cerrar sesión si estabas logueado
   - Limpiar localStorage (F12 → Application → Local Storage → Clear)
   - Volver a iniciar sesión

2. **Verificar sidebar**: Debes ver TODAS las opciones de menú
   - ✅ Empresa (Empresas, Usuarios Empresa, Clientes)
   - ✅ Cotización (Cotizaciones clientes)
   - ✅ Compras (Órdenes Compra, Mis órdenes de compra, Compras)
   - ✅ Bodega (Bodegas, Guías de Salida, Tomas de inventario)
   - ✅ Orden Trabajo (Órdenes trabajo, Asistencia técnica)
   - ✅ Recursos (Software)
   - ✅ Registros (Categorías, Fabricantes, Proveedores, Items, Usuarios)
   - ✅ Vacaciones (Lista solicitudes, Pedir vacaciones, Solicitudes vacaciones, Dashboard)
   - ✅ Rendiciones (Rendiciones admin, Mis rendiciones)
   - ✅ Invitaciones
   - ✅ Días Calendario
   - ✅ Equipos empresa
   
3. **Navegar libremente**: Intenta acceder a todas las rutas
   - Haz click en cada opción del menú
   - No debes ver errores de "Sin permisos"
   - Todas las páginas deben cargar correctamente

4. **API accesible sin restricciones**:
   
   **a) Navegador de DRF:**
   ```
   http://localhost:8000/api/
   ```
   - Debes ver una interfaz web de DRF
   - Muestra endpoints principales en formato JSON o HTML
   - Puedes navegar haciendo click en los enlaces
   
   **b) Probar endpoint específico sin autenticación:**
   ```
   http://localhost:8000/api/empresas/
   ```
   - Debería cargar la lista de empresas SIN pedir login
   - Si antes pedía autenticación, ahora no debería
   
   **c) Verificar con curl (cmd):**
   ```cmd
   curl http://localhost:8000/api/empresas/
   ```
   - Debe retornar JSON sin error 401 (Unauthorized)
   - Antes de desactivar permisos, esto daría error

**⚠️ Nota Importante sobre Endpoints:**

El navegador `http://localhost:8000/api/` solo muestra endpoints del **router raíz** (≈20-30 endpoints base). Los 1000+ endpoints del sistema incluyen:
- Rutas anidadas (ej: `/api/empresas/{id}/sucursales-empresa/`)
- Detalles individuales (ej: `/api/empresas/123/`)
- Acciones custom (ej: `/api/contratos/{id}/renovar/`)

Para ver la lista completa, usa el **Paso 1.4** (script de listado).

### Paso 1.4: Listar Todos los Endpoints (Opcional)

Para tener una referencia completa de todos los endpoints:

**Opción A: Navegador de API de DRF (Visual)**
```
Abrir en navegador: http://localhost:8000/api/
```
Verás una interfaz web interactiva con todos los endpoints.

**Opción B: Script automatizado (Completo)**
```cmd
cd backend
ENV\Scripts\python.exe list_endpoints.py
```

Este script:
- Lista todos los endpoints organizados por categoría
- Muestra métodos HTTP permitidos
- Opción de exportar a `.github/LISTA_ENDPOINTS.md`

**Opción C: Comando Django**
```cmd
cd backend
ENV\Scripts\python.exe manage.py show_urls
```

**Opción D: Inspección manual**
- Ver archivo principal: `backend/sw_erp/urls.py`
- Ver archivos por app: `backend/<app>/urls.py`

**✅ Si puedes ver todo, continúa a Fase 2**

### 🔄 Rollback (si algo falla)

```cmd
REM Backend
cd backend
copy sw_erp\settings.py.BACKUP sw_erp\settings.py

REM Frontend
cd frontend
copy src\config\pages.config.ts.BACKUP src\config\pages.config.ts
```

---

## Fase 2: Exploración por Módulos

### Objetivo
Explorar cada módulo del ERP, entender su funcionalidad y documentar hallazgos.

### Metodología de Exploración

Para cada módulo:

1. **Acceder a la UI** (frontend)
2. **Listar registros** existentes
3. **Crear nuevo registro** (formulario completo)
4. **Editar registro** existente
5. **Ver detalles** de registro
6. **Eliminar registro** (si aplica)
7. **Explorar acciones especiales** (botones, dropdowns, modales)
8. **Revisar relaciones** con otros módulos
9. **Documentar en tabla** (ver Fase 3)

### 📊 Orden de Exploración Sugerido

Explorar en este orden (de base a complejo):

| Orden | Módulo | Ruta Frontend | Descripción |
|-------|--------|---------------|-------------|
| 1 | **Empresas** | `/empresa/empresas` | Clientes, proveedores, sucursales |
| 2 | **Usuarios** | `/cuenta/usuarios` | Empleados, accesos |
| 3 | **Items** | `/item` | Productos y servicios |
| 4 | **Bodegas** | `/bodega` | Inventario, stock |
| 5 | **Recursos** | `/recurso` | Empleados técnicos, equipos |
| 6 | **Activos** | `/activo` | Vehículos, herramientas |
| 7 | **Cotizaciones** | `/cotizacion` | Propuestas comerciales |
| 8 | **Contratos** | `/contrato` | Acuerdos firmados |
| 9 | **Órdenes de Trabajo** | `/orden-trabajo` | Servicios técnicos |
| 10 | **Visitas** | `/visita` | Visitas técnicas/comerciales |
| 11 | **Rendiciones** | `/rendicion` | Gastos e ingresos |
| 12 | **Vacaciones** | `/vacacion` | Solicitudes de vacaciones |
| 13 | **Calendario** | `/calendario` | Eventos programados |

### 🔍 Checklist por Módulo

Para cada módulo, responder:

- [ ] **¿Qué problema resuelve este módulo?**
- [ ] **¿Qué campos tiene el formulario principal?**
- [ ] **¿Campos obligatorios vs opcionales?**
- [ ] **¿Se relaciona con otros módulos? ¿Cuáles?**
- [ ] **¿Qué acciones especiales tiene?** (aprobar, rechazar, duplicar, etc.)
- [ ] **¿Tiene estados o flujos de trabajo?** (borrador → activo → cerrado)
- [ ] **¿Permite adjuntar archivos?**
- [ ] **¿Genera documentos PDF?** (contratos, cotizaciones, guías)
- [ ] **¿Tiene validaciones de negocio complejas?**
- [ ] **¿Envía notificaciones o emails?**

---

### Módulo 1: Empresas 🏢

**Ruta:** `/empresa/empresas`

**Objetivo:** Gestión de clientes, proveedores, sucursales.

**Exploración:**

1. **Listar empresas**
   - Ver columnas de la tabla
   - Probar filtros (búsqueda, estado)
   - Probar paginación

2. **Crear nueva empresa**
   - Click en "Nueva Empresa"
   - Completar todos los campos:
     - Razón social
     - RUT/ID fiscal
     - Dirección
     - Teléfono, email
     - Tipo (cliente/proveedor)
   - Guardar y verificar

3. **Crear sucursal**
   - Seleccionar empresa creada
   - Click en "Nueva Sucursal"
   - Completar datos:
     - Nombre sucursal
     - Dirección
     - Responsable
   - Guardar

4. **Editar empresa**
   - Click en "Editar"
   - Modificar campo (ej: teléfono)
   - Guardar y verificar cambio

5. **Ver relaciones**
   - ¿La empresa tiene contratos?
   - ¿Tiene cotizaciones?
   - ¿Tiene órdenes de trabajo?

**Documentar:**
- Campos clave del formulario
- Relaciones detectadas
- Acciones especiales encontradas

---

### Módulo 2: Usuarios 👥

**Ruta:** `/cuenta/usuarios`

**Exploración:**

1. **Listar usuarios**
   - Ver roles/grupos asignados
   - Ver empresas asociadas

2. **Crear usuario**
   - Datos personales (nombre, email)
   - Asignar empresa y sucursal
   - Asignar grupos/roles
   - ¿Se envía email de activación?

3. **Ver UsuarioEmpresa**
   - Ir a Django Admin: http://localhost:8000/admin/empresas/usuarioempresa/
   - Ver cómo se relaciona usuario con empresa
   - Ver grupos asignados

**Documentar:**
- Diferencia entre User y UsuarioEmpresa
- Roles disponibles
- Flujo de invitación

---

### Módulo 3: Items 📦

**Ruta:** `/item`

**Exploración:**

1. **Listar items**
   - Productos vs servicios
   - Categorías

2. **Crear producto**
   - Código/SKU
   - Nombre
   - Descripción
   - Precio
   - ¿Stock manejado por bodega?

3. **Crear servicio**
   - Similar a producto pero sin stock

**Documentar:**
- Diferencia producto vs servicio
- Relación con bodegas

---

### Módulo 4: Bodegas 📦

**Ruta:** `/bodega`

**Exploración:**

1. **Listar bodegas**
   - Ver ubicaciones

2. **Crear bodega**
   - Nombre
   - Dirección
   - Responsable

3. **Movimientos de inventario**
   - Entrada de stock
   - Salida de stock
   - Ajustes
   - ¿Cómo se registran?

4. **Guías de salida**
   - ¿Genera PDF?
   - ¿Requiere aprobación?

**Documentar:**
- Tipos de movimientos
- Flujo de aprobación
- Relación con Items y Órdenes de Trabajo

---

### Módulo 5: Recursos 🔧

**Ruta:** `/recurso`

**Exploración:**

1. **Listar recursos**
   - Empleados técnicos
   - Equipos

2. **Crear recurso (empleado)**
   - Datos personales
   - Habilidades/especialidades
   - Disponibilidad

3. **Asignaciones**
   - ¿Cómo se asignan a OT?
   - ¿Se valida disponibilidad?

**Documentar:**
- Tipos de recursos
- Gestión de disponibilidad

---

### Módulo 6: Activos 🚗

**Ruta:** `/activo`

**Exploración:**

1. **Listar activos**
   - Vehículos
   - Equipos
   - Herramientas

2. **Crear activo**
   - Tipo (vehículo, equipo)
   - Marca, modelo
   - Número de serie
   - Estado (operativo, en mantención)

3. **Asignaciones**
   - ¿Se asignan a empleados?
   - ¿Se asignan a OT?

**Documentar:**
- Tipos de activos
- Gestión de mantenimiento

---

### Módulo 7: Cotizaciones 📝

**Ruta:** `/cotizacion`

**Exploración:**

1. **Listar cotizaciones**
   - Estados (borrador, enviada, aprobada, rechazada)

2. **Crear cotización**
   - Seleccionar cliente (empresa)
   - Agregar items (productos/servicios)
   - Calcular totales
   - Condiciones comerciales

3. **Aprobar cotización**
   - ¿Genera PDF?
   - ¿Se envía por email?

4. **Convertir a contrato**
   - ¿Hay botón especial?
   - ¿Qué datos se copian?

**Documentar:**
- Estados del flujo
- Cálculos automáticos
- Conversión a contrato

---

### Módulo 8: Contratos 📋

**Ruta:** `/contrato`

**Exploración:**

1. **Listar contratos**
   - Estados (activo, vencido, renovado)

2. **Crear contrato**
   - Desde cotización vs desde cero
   - Términos y condiciones
   - Fechas (inicio, fin, renovación)

3. **Firmar contrato**
   - ¿Firma digital?
   - ¿PDF firmado?

4. **Renovar contrato**
   - ¿Proceso automático?

**Documentar:**
- Diferencia cotización vs contrato
- Flujo de firma
- Renovaciones

---

### Módulo 9: Órdenes de Trabajo 🔧

**Ruta:** `/orden-trabajo`

**Exploración:**

1. **Listar OTs**
   - Estados (pendiente, asignada, en progreso, completada)

2. **Crear OT**
   - Desde contrato
   - Tipo de servicio
   - Asignar técnico (recurso)
   - Asignar activos/equipos
   - Fecha programada

3. **Ejecutar OT**
   - Iniciar trabajo
   - Registrar actividades
   - Adjuntar fotos
   - Completar

4. **Cerrar OT**
   - Firma del cliente
   - ¿Genera factura?

**Documentar:**
- Estados y transiciones
- Asignación de recursos
- Integración con bodega (materiales usados)

---

### Módulo 10: Visitas 📍

**Ruta:** `/visita`

**Exploración:**

1. **Listar visitas**
   - Técnicas vs comerciales

2. **Crear visita**
   - Cliente
   - Motivo
   - Fecha y hora
   - Asignar responsable

3. **Ejecutar visita**
   - ¿Se registra ubicación GPS?
   - ¿Fotos?
   - Notas

**Documentar:**
- Tipos de visitas
- Seguimiento

---

### Módulo 11: Rendiciones 💰

**Ruta:** `/rendicion`

**Exploración:**

1. **Listar rendiciones**
   - Gastos vs ingresos

2. **Crear rendición**
   - Asociar a OT o proyecto
   - Tipo de gasto
   - Monto
   - Adjuntar comprobante

3. **Aprobar rendición**
   - Flujo de aprobación

**Documentar:**
- Tipos de gastos
- Proceso de aprobación

---

### Módulo 12: Vacaciones 🏖️

**Ruta:** `/vacacion`

**Exploración:**

1. **Solicitar vacaciones**
   - Fechas
   - Días solicitados
   - ¿Se valida disponibilidad?

2. **Aprobar/rechazar**
   - Workflow

**Documentar:**
- Cálculo de días disponibles
- Flujo de aprobación

---

### Módulo 13: Calendario 📅

**Ruta:** `/calendario`

**Exploración:**

1. **Ver eventos**
   - OT programadas
   - Visitas
   - Vacaciones

2. **Crear evento**
   - Manual vs automático

**Documentar:**
- Integración con otros módulos

---

## Fase 3: Documentar Funcionalidad

### Objetivo
Crear documentación estructurada de los hallazgos.

### Plantilla de Documentación por Módulo

**Archivo:** Crear `.github/EXPLORACION_<MODULO>.md`

```markdown
# Exploración: <Nombre del Módulo>

**Fecha:** YYYY-MM-DD  
**Explorado por:** Tu nombre

---

## Propósito del Módulo

<Descripción de qué problema resuelve>

---

## Formulario Principal

### Campos

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|-------------|
| nombre | texto | Sí | Nombre del registro |
| descripcion | textarea | No | Descripción detallada |
| ... | ... | ... | ... |

### Validaciones

- **Nombre**: Mínimo 3 caracteres
- **Email**: Formato válido
- ...

---

## Estados y Flujos

```
Borrador → Activo → Completado
           ↓
       Cancelado
```

**Transiciones:**
- Borrador → Activo: Al guardar con datos completos
- Activo → Completado: Al cerrar manualmente
- ...

---

## Relaciones con Otros Módulos

| Módulo Relacionado | Tipo de Relación | Descripción |
|-------------------|------------------|-------------|
| Empresas | ForeignKey | Cada registro pertenece a una empresa |
| Usuarios | ManyToMany | Puede tener múltiples responsables |
| ... | ... | ... |

---

## Acciones Especiales

- **Duplicar**: Crea copia del registro con datos base
- **Aprobar**: Cambia estado a "Aprobado" y notifica
- **Generar PDF**: Descarga documento con datos del registro
- ...

---

## Archivos y Adjuntos

- ✅ Permite adjuntar PDF, imágenes, Excel
- ❌ No tiene límite de tamaño
- ⚠️ Se almacenan en `media/<modulo>/`

---

## Notificaciones y Emails

- **Al crear**: Notifica a responsable
- **Al aprobar**: Notifica a solicitante
- ...

---

## API Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/<modulo>/` | Listar registros |
| POST | `/api/<modulo>/` | Crear registro |
| GET | `/api/<modulo>/{id}/` | Detalles |
| PUT/PATCH | `/api/<modulo>/{id}/` | Editar |
| DELETE | `/api/<modulo>/{id}/` | Eliminar |

---

## Permisos Originales

**Grupos que pueden acceder:**
- `staff`
- `superadmin`
- `<grupo_específico>`

**Nota:** Temporalmente desactivados para exploración.

---

## Hallazgos y Observaciones

- **Positivo:** El formulario es intuitivo
- **Mejora:** Falta validación de fecha futura
- **Bug:** Al duplicar no copia los adjuntos
- ...

---

## Capturas de Pantalla

(Agregar capturas relevantes)

---
```

### Crear Índice General

**Archivo:** `.github/INDICE_EXPLORACION.md`

```markdown
# Índice de Exploración del Sistema ERP

**Fecha de exploración:** 2025-11-04 al YYYY-MM-DD  
**Explorado por:** Tu nombre

---

## Resumen Ejecutivo

El sistema ERP consta de **X módulos principales** que gestionan:
- <Resumen de funcionalidad>

**Arquitectura:**
- Backend: Django 5.1 + DRF + Celery
- Frontend: React + TypeScript + Redux
- Autenticación: JWT
- Base de datos: SQLite (dev) / PostgreSQL (prod)

---

## Módulos Explorados

| # | Módulo | Archivo Documentación | Estado |
|---|--------|-----------------------|--------|
| 1 | Empresas | [EXPLORACION_EMPRESAS.md](./EXPLORACION_EMPRESAS.md) | ✅ Completo |
| 2 | Usuarios | [EXPLORACION_USUARIOS.md](./EXPLORACION_USUARIOS.md) | ✅ Completo |
| 3 | Items | [EXPLORACION_ITEMS.md](./EXPLORACION_ITEMS.md) | 🔄 En progreso |
| ... | ... | ... | ... |

---

## Mapa de Relaciones Entre Módulos

```
Empresa
  ↓
  ├─→ Sucursal
  ├─→ Contratos
  │     ↓
  │     └─→ Órdenes de Trabajo
  │            ↓
  │            ├─→ Recursos (asignaciones)
  │            ├─→ Activos (equipos usados)
  │            └─→ Movimientos de Bodega (materiales)
  ├─→ Cotizaciones
  │     ↓
  │     └─→ Contratos (conversión)
  └─→ Visitas
```

---

## Hallazgos Clave

### Funcionalidad Destacada
- ✅ Conversión automática cotización → contrato
- ✅ Asignación inteligente de recursos a OT
- ✅ Generación de PDFs con plantillas personalizables

### Limitaciones Identificadas
- ⚠️ No hay validación de stock en tiempo real
- ⚠️ Falta integración con sistema contable externo
- ⚠️ Permisos a nivel de objeto no implementados

### Oportunidades de Mejora
- 💡 Implementar notificaciones push en móvil
- 💡 Dashboard con métricas en tiempo real
- 💡 Integración con sistema de facturación electrónica

---

## Próximos Pasos

1. **Completar exploración** de módulos restantes
2. **Documentar APIs** en detalle (Postman/Swagger)
3. **Implementar permisos** granulares (Django Guardian)
4. **Optimizar performance** (queries N+1, caché)

---
```

---

## Fase 4: Restaurar Permisos

### Objetivo
Volver al sistema de permisos original con el conocimiento adquirido.

### Paso 4.1: Restaurar Backend

```cmd
cd backend
copy sw_erp\settings.py.BACKUP sw_erp\settings.py
```

Verificar que `REST_FRAMEWORK['DEFAULT_PERMISSION_CLASSES']` vuelva a:
```python
'DEFAULT_PERMISSION_CLASSES': [
    'rest_framework.permissions.IsAuthenticated',  # ← Restaurado
],
```

**Reiniciar backend:**
```cmd
ENV\Scripts\python.exe manage.py runserver
```

### Paso 4.2: Restaurar Frontend

**Opción A: Desde backup**
```cmd
cd frontend
copy src\config\pages.config.ts.BACKUP src\config\pages.config.ts
```

**Opción B: Desde Git (si no hiciste commit de cambios)**
```cmd
cd frontend
git checkout src/config/pages.config.ts
```

**Reiniciar frontend:**
```cmd
npm run dev
```

### Paso 4.3: Validar Restauración

1. **Logout y login** en frontend
2. **Verificar permisos**: Debes ver SOLO las rutas permitidas para tu usuario
3. **API protegida**: http://localhost:8000/api/ debe requerir autenticación

### Paso 4.4: Aplicar Aprendizaje

Con el conocimiento adquirido:

1. **Revisar permisos por módulo**
   - ¿Qué grupos necesitan acceso a qué?
   - Actualizar `pages.config.ts` según necesidad

2. **Implementar validaciones backend**
   - Añadir permisos personalizados donde sea necesario
   - Ver: `.github/instructions/backend-instructions.md` (sección 5)

3. **Documentar permisos**
   - Actualizar documentación de permisos con hallazgos

---

## Anexo: Arquitectura del Sistema

### Diagrama de Componentes

```
┌────────────────────────────────────────────────────────┐
│                     FRONTEND (React)                   │
│  ┌──────────────────────────────────────────────────┐  │
│  │  UI Components (TailwindCSS)                     │  │
│  ├──────────────────────────────────────────────────┤  │
│  │  Estado Global (Redux Toolkit)                   │  │
│  ├──────────────────────────────────────────────────┤  │
│  │  Servicios HTTP (Axios + BaseService)            │  │
│  ├──────────────────────────────────────────────────┤  │
│  │  Autenticación (JWT en localStorage)             │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
                            ↓ HTTP/HTTPS
┌────────────────────────────────────────────────────────┐
│                   BACKEND (Django)                     │
│  ┌──────────────────────────────────────────────────┐  │
│  │  API REST (Django REST Framework)                │  │
│  ├──────────────────────────────────────────────────┤  │
│  │  Autenticación (JWT - SimpleJWT)                 │  │
│  ├──────────────────────────────────────────────────┤  │
│  │  Modelos de Negocio (Django ORM)                 │  │
│  ├──────────────────────────────────────────────────┤  │
│  │  Tareas Asíncronas (Celery)                      │  │
│  ├──────────────────────────────────────────────────┤  │
│  │  WebSockets (Channels + Daphne)                  │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
         ↓                    ↓                    ↓
    ┌─────────┐         ┌─────────┐         ┌─────────┐
    │SQLite/  │         │  Redis  │         │ Celery  │
    │PostgreSQL│         │ (Cache) │         │ Worker  │
    └─────────┘         └─────────┘         └─────────┘
```

### Flujo de una Request Típica

```
1. Usuario hace clic en "Ver Cotizaciones"
   ↓
2. Frontend ejecuta thunk: fetchCotizaciones()
   ↓
3. Axios hace GET /api/cotizaciones/
   + Header: Authorization: Bearer {JWT_TOKEN}
   ↓
4. Backend (DRF):
   - JWTAuthentication valida token
   - IsAuthenticated verifica usuario autenticado
   - CotizacionViewSet.get_queryset():
     * Filtra por empresa del usuario
     * Aplica permisos si están habilitados
   ↓
5. Django ORM ejecuta query SQL
   ↓
6. Backend serializa datos (CotizacionSerializer)
   ↓
7. Respuesta JSON al frontend
   ↓
8. Redux actualiza state.cotizaciones.items
   ↓
9. React re-renderiza componente ListaCotizaciones
   ↓
10. Usuario ve tabla con cotizaciones
```

### Capas del Sistema

| Capa | Responsabilidad | Tecnología |
|------|----------------|------------|
| **Presentación** | UI/UX, interacción usuario | React + TailwindCSS |
| **Estado** | Gestión de estado global | Redux Toolkit |
| **Comunicación** | Llamadas HTTP, manejo de errores | Axios + BaseService |
| **API** | Endpoints REST, serialización | Django REST Framework |
| **Lógica de Negocio** | Validaciones, reglas, cálculos | Django Models + Services |
| **Persistencia** | Almacenamiento de datos | Django ORM + SQLite/PostgreSQL |
| **Caché** | Sesiones, Celery tasks | Redis |
| **Tareas Asíncronas** | Emails, reportes, procesamiento | Celery |
| **Tiempo Real** | Notificaciones live | Channels (WebSockets) |

---

## Troubleshooting

### ❌ Error: "No module named 'dotenv'"

**Solución:**
```cmd
cd backend
ENV\Scripts\pip.exe install python-dotenv
```

### ❌ Error: "Redis connection refused"

**Causa:** Redis no está corriendo.

**Solución:**
```cmd
REM Iniciar Redis con Docker
docker run -d --name redis-erp -p 6379:6379 redis:latest

REM O verificar en WSL2
wsl
sudo service redis-server status
sudo service redis-server start
```

### ❌ Error: Frontend no carga después de cambiar pages.config.ts

**Causa:** Error de sintaxis en JavaScript/TypeScript.

**Solución:**
```cmd
REM Verificar consola del navegador (F12 → Console)
REM Revertir cambios:
cd frontend
copy src\config\pages.config.ts.BACKUP src\config\pages.config.ts
npm run dev
```

### ❌ Error: "CORS policy" en llamadas API

**Causa:** Frontend no está en lista blanca.

**Solución:**
```python
# backend/sw_erp/settings.py
CORS_ORIGIN_ALLOW_ALL = True  # Solo para desarrollo local
```

### ❌ Error: JWT token inválido constantemente

**Causa:** Lifetimes muy cortos.

**Solución:**
```python
# backend/sw_erp/settings.py
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=24),  # ← Aumentar temporalmente
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
}
```

Reiniciar backend y limpiar localStorage en frontend (F12 → Application → Clear).

---

## 📚 Referencias Adicionales

### Documentación del Proyecto

- **Inicio Rápido**: `INICIO-RAPIDO.md` (raíz del proyecto)
- **Backend**: `.github/instructions/backend-instructions.md`
- **Frontend**: `.github/instructions/frontend-instructions.md`
- **Seguridad**: `.github/instructions/security.md`
- **Sistema de Permisos Actual**: `docs/README_PERMISOS.md` (ubicación a confirmar)
- **Permisos con Guardian**: `docs/PLAN_IMPLEMENTACION_GUARDIAN.md` (ubicación a confirmar)

### Documentación Externa

- **Django**: https://docs.djangoproject.com/en/5.1/
- **Django REST Framework**: https://www.django-rest-framework.org/
- **React**: https://react.dev/
- **Redux Toolkit**: https://redux-toolkit.js.org/
- **TailwindCSS**: https://tailwindcss.com/

---

## ✅ Checklist de Finalización

Antes de considerar la exploración completa:

- [ ] Todos los módulos explorados (13 módulos)
- [ ] Documentación de cada módulo creada
- [ ] Índice general actualizado
- [ ] Mapa de relaciones entre módulos documentado
- [ ] Hallazgos y limitaciones identificadas
- [ ] Permisos restaurados y sistema funcional
- [ ] Conocimiento aplicado en mejoras o documentación

---

**Fecha de creación:** 2025-11-04  
**Versión:** 1.0  
**Autor:** GitHub Copilot  
**Mantenido por:** Equipo de desarrollo ERP

---

## 📝 Notas Finales

Esta guía es un **punto de partida**. Durante la exploración, encontrarás:

- **Funcionalidad no documentada** (agrégala a los docs)
- **Bugs o comportamientos inesperados** (repórtalos)
- **Oportunidades de mejora** (documéntalas en `.github/MEJORAS_PROPUESTAS.md`)

**Recuerda:**
- ⚠️ El modo "sin permisos" es **SOLO PARA DESARROLLO LOCAL**
- ⚠️ NUNCA subir a producción con `AllowAny` habilitado
- ⚠️ Hacer backup antes de modificar archivos críticos
- ✅ Documentar TODO lo que descubras
- ✅ Restaurar permisos al finalizar

**¡Buena exploración! 🚀**
