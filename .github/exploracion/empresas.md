---
title: "Módulo 1: Empresas - Exploración Completa"
scope: "exploration"
status: "completed"
last_updated: "2025-11-05"
---

# 🏢 Módulo 1: Empresas - Exploración Completa

**Fecha exploración**: 2025-11-04  
**Explorado por**: Fabian  
**Ruta Frontend**: `/empresa/empresas`  
**API Endpoint**: `http://localhost:8000/api/empresas/`

---

## 📋 Resumen Ejecutivo

### Objetivos Cumplidos
- ✅ Creación y edición de empresas
- ✅ Gestión de sucursales
- ✅ Sistema de invitaciones de usuarios
- ✅ Identificación de 6 bugs (4 resueltos, 2 documentados)
- ✅ Comprensión de arquitectura Redux y filtros backend
- ✅ Documentación completa de hallazgos
- ✅ Verificación con datos poblados (seed_data.py)
- ✅ Validación de setup_superuser.py

### Bugs Críticos Encontrados
1. ✅ **RUT no se guarda** (RESUELTO) - Mismatch `rut` vs `rut_empresa`
2. ✅ **Invitaciones no visibles** (RESUELTO) - Filtro backend por `PersonalizacionUsuario` (resuelto con setup_superuser.py)
3. 🔴 **Email no reutilizable** - Validación antes de eliminar usuario previo
4. ✅ **Dashboard sin empresa** (RESUELTO) - Falta `sucursal_principal` en personalización (resuelto con setup_superuser.py)
5. 🟡 **Sidebar sin scroll** - UX bloqueada en pantallas pequeñas
6. 🟡 **Modal scroll cierra** - UX dificulta llenar formularios largos

---

## 🎯 Funcionalidades del Módulo

### Empresa

| Campo | Tipo | Obligatorio | Observaciones |
|-------|------|-------------|---------------|
| `nombre` | String | ✅ | Razón social de la empresa |
| `rut_empresa` | String | ❌ | ⚠️ Bug #1 resuelto |
| `direccion_principal` | String | ✅ | Dirección fiscal |
| `telefono` | String | ❌ | Contacto principal |
| `email` | Email | ❌ | Email corporativo |
| `sitio_web` | URL | ❌ | Website de la empresa |
| `logo` | Text/URL | ❌ | Logo corporativo |
| `firma_empresa` | Text/URL | ❌ | Firma digital |
| `recargo` | Integer | ❌ | Porcentaje de recargo (default 0) |
| `clientes` | M2M | ❌ | Relación empresa → empresa |
| `sucursales` | Relación | ❌ | Lista de sucursales (read-only) |

### Sucursal Empresa

| Campo | Tipo | Obligatorio | Observaciones |
|-------|------|-------------|---------------|
| `nombre` | String | ✅ | Ej: "Casa Matriz", "Sucursal Centro" |
| `direccion` | String | ✅ | Dirección física |
| `telefono` | String | ❌ | Contacto de sucursal |
| `email` | Email | ❌ | Email de sucursal |
| `empresa` | FK | ✅ | Empresa a la que pertenece |
| `es_casa_matriz` | Boolean | ❌ | Auto-generada al crear empresa |

### Invitación Empresa

| Campo | Tipo | Obligatorio | Observaciones |
|-------|------|-------------|---------------|
| `email` | Email | ✅ | Email del invitado |
| `first_name` | String | ✅ | Nombre del invitado |
| `last_name` | String | ✅ | Apellido del invitado |
| `sucursal` | FK | ✅ | Sucursal a la que se invita |
| `activation_token` | UUID | Auto | Token único de activación |
| `expiration_date` | DateTime | Auto | Expira en 7 días |
| `is_expired()` | Method | - | Valida si ya expiró |

---

## 🐛 Análisis de Bugs

### Bug #1: RUT no se guarda ✅ RESUELTO

**Síntoma**: Campo RUT aceptado en formulario pero `rut_empresa` queda `null` en BD.

**Causa raíz**:
```tsx
// frontend/src/pages/Empresas/modals/CrearEmpresa.tsx (línea 53)
// ❌ ANTES
data: JSON.stringify({
    nombre: values.nombre,
    rut: values.rut,  // ← Frontend envía "rut"
})

// ✅ DESPUÉS
data: JSON.stringify({
    nombre: values.nombre,
    rut_empresa: values.rut,  // ← Backend espera "rut_empresa"
})
```

**Solución aplicada**: Cambiar `rut` por `rut_empresa` en línea 53.

**Lección**: Verificar nombres de campos backend vs frontend (snake_case vs camelCase).

---

### Bug #2: Invitaciones no visibles 🔴 PENDIENTE

**Síntoma**:
1. Crear invitación con datos válidos
2. Mensaje "Invitacion creada" aparece
3. Tabla de invitaciones vacía
4. Intentar crear otra con mismo email → "El usuario con email ya existe"

**Causa raíz**: Backend filtra por `PersonalizacionUsuario.sucursal_principal`

```python
# backend/cuentas/views.py - InvitacionEmpresaViewSet (líneas 182-194)
def get_queryset(self):
    personalizacion = PersonalizacionUsuario.objects.filter(
        usuario=self.request.user
    ).first()
    
    if personalizacion and personalizacion.sucursal_principal:
        return InvitacionEmpresa.objects.filter(
            sucursal=personalizacion.sucursal_principal
        )
    
    # Sin PersonalizacionUsuario → queryset vacío
    return InvitacionEmpresa.objects.none()
```

**Por qué falla**:
- Usuario creado con `createsuperuser` **NO tiene** `PersonalizacionUsuario`
- Backend retorna array vacío `[]`
- Frontend recibe respuesta válida pero sin datos

**Verificación Redux**:
- ✅ Slice correcto: `state.invitacion.listaInvitaciones`
- ✅ Thunk correcto: `listaInvitacionesThunk()` en `invitacionSlice.ts`
- ✅ Dispatch ejecutado: Modal y `DetalleEmpresa.tsx` llaman al thunk
- ✅ Estado actualizado: Redux funciona correctamente

**Soluciones propuestas**:

**A. Temporal (exploración)**:
```python
# backend/cuentas/views.py
def get_queryset(self):
    return InvitacionEmpresa.objects.all()
```

**B. Correcta (producción)**:
```cmd
backend\ENV\Scripts\python.exe scripts\setup\setup_superuser.py
```
Crea `PersonalizacionUsuario` con `sucursal_principal` configurado.

**Estado**: ✅ RESUELTO tras ejecutar `setup_superuser.py`.

**Verificación** (2025-11-05):
```cmd
ENV\Scripts\python.exe manage.py shell -c "from core.models import PersonalizacionUsuario; ..."
```
- ✅ PersonalizacionUsuario existe con sucursal_principal = Casa Matriz (Snabbit)
- ✅ UsuarioEmpresa existe con sucursal = Casa Matriz, estado = 1
- ✅ Invitaciones ahora visibles en frontend (filtro backend funciona correctamente)

---

### Bug #3: Email no reutilizable tras eliminación 🔴 PENDIENTE

**Síntoma**:
1. Crear invitación con `test@example.com`
2. Eliminar invitación
3. Intentar crear nueva con `test@example.com`
4. Error: "El usuario con este email ya existe"

**Causa raíz**: Validación ocurre **antes** de eliminar usuario previo

```python
# backend/cuentas/views.py - InvitacionEmpresaViewSet.create() (líneas 127-132)
user_exists = User.objects.filter(email=email).exists()
if user_exists:
    return Response(
        {"detail": "El usuario con este email ya existe."},
        status=status.HTTP_400_BAD_REQUEST,
    )
```

**Problema**:
- Usuario con `is_active=False` (invitación no aceptada) → Debería poder recrearse
- Usuario con `is_active=True` (invitación aceptada) → NO debe recrearse

**Solución propuesta**:
```python
# Validar solo usuarios activos
user_exists = User.objects.filter(email=email, is_active=True).exists()
if user_exists:
    return Response(
        {"detail": "El usuario con este email ya está activo en el sistema."},
        status=status.HTTP_400_BAD_REQUEST,
    )

# Eliminar usuarios inactivos previos
User.objects.filter(email=email, is_active=False).delete()
```

**Estado**: 🔴 Pendiente de implementar.

---

### Bug #4: Dashboard muestra "sin empresa" 🟡 DOCUMENTADO

**Síntoma**:
- Al hacer login, dashboard muestra "Aún no tienes empresa, crea una"
- Al navegar a Empresas y volver al dashboard, ahora SÍ muestra empresa

**Causa raíz**: Componente depende de `personalizacionUsuario.sucursal_principal`

```tsx
// frontend/src/pages/Dashboard/components/EmpresaSeleccionada.tsx (líneas 17-19)
useEffect(() => {
    if (personalizacionUsuario?.sucursal_principal) {
        dispatch(detalleEmpresaThunk({ id_empresa: personalizacionUsuario.sucursal_principal }))
    }
}, [dispatch, personalizacionUsuario?.sucursal_principal])
```

**Flujo esperado vs. actual**:

| Flujo Esperado | Flujo Actual (sin permisos) |
|----------------|------------------------------|
| Usuario recibe invitación | Usuario crea cuenta directamente (superuser) |
| Acepta invitación → `UsuarioEmpresa` + `PersonalizacionUsuario` creados | **NO se crea** `PersonalizacionUsuario` |
| `sucursal_principal` = sucursal de invitación | `sucursal_principal` = `null` |
| Dashboard muestra empresa automáticamente | Dashboard dice "sin empresa" |

**Solución**:
```cmd
backend\ENV\Scripts\python.exe scripts\setup\setup_superuser.py
```

**Estado**: ✅ RESUELTO - Dashboard funciona correctamente con PersonalizacionUsuario configurado.

---

### Bug #5 y #6: UX (Sidebar/Modal) 🟡 DOCUMENTADO

**Sidebar sin scroll**:
- Opciones inferiores inaccesibles en pantallas pequeñas
- Falta `overflow-y: auto` en contenedor

**Modal scroll cierra**:
- Scroll interno del modal cierra el modal completo
- Dificulta llenar formularios largos

**Solución**: Mejoras de CSS/UX (prioridad baja).

---

## 🔍 Arquitectura del Sistema

### Modelo de Datos

```
Empresa
├── rut_empresa (String, nullable)
├── nombre (String)
├── direccion_principal (String)
├── sucursales → [SucursalEmpresa]
└── clientes (M2M a sí misma)

SucursalEmpresa
├── nombre (String)
├── direccion (String)
├── empresa (FK a Empresa)
└── es_casa_matriz (Boolean)

InvitacionEmpresa
├── email (Email)
├── first_name, last_name (String)
├── sucursal (FK a SucursalEmpresa)
├── activation_token (UUID)
└── expiration_date (DateTime)

User (Django Auth)
├── email (EmailField, unique)
├── is_superuser, is_staff (Boolean)
├── PersonalizacionUsuario (One-to-One)
│   └── sucursal_principal (FK)  ← CRÍTICO
└── UsuarioEmpresa (Many-to-Many via)
    ├── empresa (FK)
    ├── sucursal (FK)
    └── grupos (M2M a Group)
```

### Redux Store

```
state.empresa
├── listaEmpresas: IEmpresa[]
├── detalleEmpresa: IEmpresa | null
├── listaMisSucursales: ISucursalEmpresa[]
├── loading: boolean
└── error: string | undefined

state.invitacion  ← ⚠️ Slice SEPARADO
├── listaInvitaciones: IInvitacionEmpresa[]
├── loading: boolean
└── error: string | undefined
```

**Lección**: Invitaciones tienen su propio slice (`invitacionSlice`), NO están en `empresaSlice`.

### API Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/empresas/` | Listar empresas |
| POST | `/api/empresas/` | Crear empresa |
| GET | `/api/empresas/{id}/` | Detalle empresa |
| PUT/PATCH | `/api/empresas/{id}/` | Editar empresa |
| DELETE | `/api/empresas/{id}/` | Eliminar empresa |
| GET | `/api/sucursales-empresa/` | Listar sucursales |
| POST | `/api/sucursales-empresa/` | Crear sucursal |
| GET | `/api/invitaciones-empresa/` | Listar invitaciones (filtradas) |
| POST | `/api/invitaciones-empresa/` | Crear invitación |
| DELETE | `/api/invitaciones-empresa/{id}/` | Eliminar invitación |

---

## 💡 Lecciones Aprendidas

### 1. PersonalizacionUsuario es Crítico

Sin `PersonalizacionUsuario.sucursal_principal`:
- ❌ Invitaciones retornan `[]`
- ❌ Dashboard muestra "sin empresa"
- ❌ Otros módulos probablemente fallan

**Solución**: Siempre ejecutar `setup_superuser.py` tras `createsuperuser`.

### 2. Redux Store es Modular

- Invitaciones **NO están** en `empresaSlice`
- Cada entidad tiene su propio slice
- Verificar `rootReducer.ts` para mapeo completo

### 3. Backend Filtering es Transparente

- Frontend recibe `[]` (array vacío válido)
- Backend puede estar filtrando en `get_queryset()`
- Siempre verificar ViewSet antes de culpar a Redux

### 4. Validaciones de Campo

- Django serializers esperan nombres snake_case (`rut_empresa`)
- Frontend suele usar camelCase (`rut`)
- Mapear correctamente en `onSubmit` del formulario

---

## 📚 Documentación Relacionada

### Instrucciones Técnicas
- [Inicialización del Sistema](../guias/inicializacion.md): Scripts de setup
- [Backend Instructions](./instrucciones/backend-instructions.md): ViewSets, filtros
- [Frontend Instructions](./instrucciones/frontend-instructions.md): Componentes, formularios
- [Redux Toolkit y Thunks](./instrucciones/redux-thunks.md): Thunks asíncronos
- [Store Structure](./instrucciones/store-structure.md): Índice de slices

### Exploración
- **Próximo**: Módulo 2: Usuarios Empresa (entender `UsuarioEmpresa`, roles, invitaciones)

---

## ✅ Checklist de Completitud

- [x] Explorado formulario de empresa (todos los campos)
- [x] Creada al menos 1 empresa
- [x] ✅ Bug #1 RUT resuelto (cambio en CrearEmpresa.tsx)
- [x] Explorada creación automática de "Casa Matriz"
- [x] Creada sucursal adicional manualmente
- [x] Verificado que no se puede eliminar sucursales
- [x] Probado editar información de sucursal
- [x] Creada invitación de usuario
- [x] Identificados 6 bugs (1 resuelto, 5 documentados)
- [x] Analizado código frontend y backend
- [x] Documentadas causas técnicas de los bugs
- [x] Tabla de campos completada
- [x] Anotados hallazgos positivos y negativos
- [x] Creadas guías de Redux/Thunks y Store Structure

---

**Tiempo de exploración**: ~3 horas  
**Estado**: ✅ COMPLETADO  
**Próximo módulo**: Usuarios Empresa

---

## 📊 Validación con Datos Poblados (2025-11-05)

### Datos Actuales en BD

**Empresas** (8 total):
```
1: Snabbit (RUT: 11111111-1)
2: Empresa Cliente A (RUT: 76123456-7)
3: Empresa Cliente B (RUT: 76234567-8)
4-8: AYG ASOCIADOS, CAMACOES, OTIC-CAMACOES, MOLINA RIOS, PRODALMEN (desde Excel)
```

**Sucursales** (10 total):
- Casa Matriz (Snabbit, Empresa Cliente A/B, empresas Excel)
- Sucursales Principal (Empresa Cliente A/B)

**Usuarios** (64 total):
- Fabian@gmail.com: Superusuario con PersonalizacionUsuario ✅
- tecnico@snabbit.cl, bodeguero@snabbit.cl, admin@snabbit.cl (is_active=False, creados por seed)
- 60 usuarios desde planillas Excel (is_active=True)

**Invitaciones** (1):
- fabianhsk6@gmail.com → Sucursal: Casa Matriz (Snabbit), No aceptada, No expirada

### Verificaciones Realizadas

1. **✅ PersonalizacionUsuario configurado**:
   - Superusuario tiene `sucursal_principal = Casa Matriz (Snabbit)`
   - Dashboard funcionando correctamente

2. **✅ UsuarioEmpresa configurado**:
   - Superusuario vinculado a Snabbit, sucursal Casa Matriz
   - Estado activo (1)
   - Grupos: staff, superadmin, multi-empresas

3. **✅ Filtros backend funcionando**:
   - InvitacionEmpresaViewSet filtra por `sucursal_principal` del usuario
   - Invitaciones visibles tras configurar PersonalizacionUsuario

### Bugs Resueltos vs Pendientes

**Resueltos** (4/6):
- ✅ Bug #1: RUT no se guarda (cambio en frontend)
- ✅ Bug #2: Invitaciones no visibles (setup_superuser.py)
- ✅ Bug #4: Dashboard sin empresa (setup_superuser.py)
- ✅ Validación: Datos poblados correctamente con seed_data.py

**Pendientes** (2/6):
- 🔴 Bug #3: Email no reutilizable tras eliminación (requiere cambio en backend)
- 🟡 Bug #5/6: UX Sidebar/Modal (mejoras CSS, prioridad baja)

### Lecciones Confirmadas

1. **setup_superuser.py es CRÍTICO**:
   - Sin él: invitaciones vacías, dashboard sin empresa, filtros fallan
   - Con él: sistema funciona correctamente
   - Debe ejecutarse SIEMPRE después de `createsuperuser`

2. **seed_data.py funciona correctamente**:
   - Importa usuarios desde planillas Excel
   - Crea empresas, sucursales, categorías, fabricantes, items, bodegas
   - Datos consistentes con estructura esperada

3. **Filtros backend son estrictos**:
   - `get_queryset()` filtra por `PersonalizacionUsuario.sucursal_principal`
   - Retorna queryset vacío si no existe personalización
   - Frontend recibe `[]` (válido) pero sin datos

---

**Tiempo de exploración**: ~3 horas + validación (30 min)  
**Estado**: ✅ COMPLETADO Y VALIDADO  
**Próximo módulo**: Usuarios Empresa
