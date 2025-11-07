---
title: "Sistema de Permisos del ERP"
scope: "full-stack"
status: "active"
last_updated: "2025-11-04"
---

# 🔐 Sistema de Permisos del ERP Snabbit

**Guía Completa para Entender la Arquitectura de Permisos**

> **📌 Nota**: Este documento explica el sistema actual. Para la modernización con Django Guardian, ver [permisos-guardian.md](./permisos-guardian.md)

---

## 📋 Índice

1. [Visión General](#-visión-general)
2. [Componentes Clave](#-componentes-clave)
3. [Flujo de Autenticación](#-flujo-de-autenticación)
4. [Grupos Estándar](#-grupos-estándar)
5. [Frontend: Validación de Permisos](#-frontend-validación-de-permisos)
6. [Backend: Configuración de Permisos](#-backend-configuración-de-permisos)
7. [Flujo de Onboarding](#-flujo-de-onboarding)
8. [Ejemplos Prácticos](#-ejemplos-prácticos)
9. [Limitaciones del Sistema Actual](#-limitaciones-del-sistema-actual)
10. [Troubleshooting](#-troubleshooting)
11. [Mejores Prácticas](#-mejores-prácticas)

---

## 🎯 Visión General

El sistema de permisos del ERP combina:

- **Django Groups**: Sistema de grupos del backend
- **UsuarioEmpresa**: Modelo puente que conecta usuarios con empresas y grupos
- **JWT**: Tokens para autenticación stateless
- **Frontend Guards**: Componentes React que validan permisos antes de renderizar

### Principio Fundamental

> **Un usuario puede acceder a una ruta/funcionalidad si tiene AL MENOS UNO de los grupos requeridos.**

```
Usuario tiene grupos: ['staff', 'bodeguero']
Ruta requiere: ['staff', 'multi-empresas', 'superadmin']
                  ↓
           ✅ ACCESO PERMITIDO (tiene 'staff')
```

---

## 🧩 Componentes Clave

### 1. Backend: Modelo `UsuarioEmpresa`

**Ubicación**: `backend/empresas/models.py`

```python
class UsuarioEmpresa(ModeloBase):
    usuario = models.OneToOneField("cuentas.User", on_delete=models.CASCADE)
    sucursal = models.ForeignKey("empresas.SucursalEmpresa", on_delete=models.CASCADE)
    fecha_ingreso = models.DateField(blank=True, null=True)
    fecha_contrato = models.DateField(blank=True, null=True)
    cargo = models.CharField(max_length=150, blank=True, null=True)
    estado = models.CharField(max_length=1, choices=ESTADO_USUARIO_EMPRESA, default="1")
    grupos = models.ManyToManyField(Group, blank=True)  # ← CLAVE: Grupos asignados
```

**Características**:
- Relaciona un `User` con una `Empresa/Sucursal`
- Almacena grupos de permisos específicos de esa empresa
- Un usuario puede tener **múltiples** `UsuarioEmpresa` (soporte multiempresa)

**Importante**: Un `User` puede tener múltiples registros `UsuarioEmpresa` para soporte multiempresa.

### 2. Backend: Endpoint de Grupos

**Ubicación**: `backend/cuentas/views.py` (línea 51-77)

```python
async def get_grupos_user(request):
    # Valida JWT token
    jwt_authenticator = JWTAuthentication()
    user = await sync_to_async(jwt_authenticator.get_user)(validated_token)
    
    # Obtiene TODOS los grupos del usuario de TODAS sus empresas
    grupos_usuario_empresa = await sync_to_async(
        lambda: list(
            UsuarioEmpresa.objects.filter(usuario=user)
            .values_list('grupos__name', flat=True)
            .distinct()
        )
    )()
    
    return JsonResponse({'grupos': grupos_usuario_empresa})
```

**Endpoint**: `GET /api/get_grupos_user/`

**Respuesta**:
```json
{
  "grupos": ["staff", "superadmin", "multi-empresas"]
}
```

### 3. Frontend: Configuración de Rutas

**Ubicación**: `frontend/src/config/pages.config.ts`

Define permisos por ruta:

```typescript
export const Pages = {
    empresa: {
        id: 'empresa',
        to: '/empresa',
        text: 'Empresa',
        icon: 'HeroBuildingOffice2',
        authority: ['staff', 'superadmin'],  // ← Grupos requeridos
        subPages: {
            listaEmpresas: {
                id: 'listaEmpresas',
                to: '/empresa/empresas',
                text: 'Empresas',
                icon: 'DuoBuilding',
                authority: ['staff', 'multi-empresas', 'superadmin'],  // ← Grupos requeridos
            },
            // ...más subpáginas
        }
    },
    // ...más módulos
};
```

### 4. Frontend: Hook de Autorización

**Ubicación**: `frontend/src/hooks/useAuthority.ts`

```typescript
function useAuthority(
    userAuthority: string[] = [],  // Grupos del usuario
    authority: string[] = [],       // Grupos requeridos
    emptyCheck = false
) {
    const roleMatched = useMemo(() => {
        // Verifica si el usuario tiene AL MENOS UNO de los grupos requeridos
        return authority.some((role) => userAuthority.includes(role))
    }, [authority, userAuthority])
    
    // Si authority está vacío → acceso público
    if (isEmpty(authority) || typeof authority === 'undefined') {
        return !emptyCheck
    }
    
    return roleMatched
}
```

### 5. Frontend: Componentes de Protección

#### `AuthorityCheck` (para rutas)

**Ubicación**: `frontend/src/components/layouts/AuthorityCheck/AuthorityCheck.tsx`

```tsx
const AuthorityCheck = ({ userAuthority = [], authority = [], children }) => {
    // Si authority es vacío → sin protección
    if (!authority || authority.length === 0) {
        return <>{children}</>
    }

    const roleMatched = useAuthority(userAuthority, authority, true)

    // Si no tiene permisos → redirige a /sin-permisos
    return <>{roleMatched ? children : <Navigate to="/sin-permisos" />}</>
}
```

Componente HOC que valida permisos antes de renderizar. Si el usuario no tiene al menos uno de los grupos requeridos → Redirige a `/sin-permisos`.

#### `AuthorityCheckNav` (para navegación)

**Ubicación**: `frontend/src/components/layouts/AuthorityCheckNav/AuthorityCheckNav.tsx`

```tsx
const AuthorityCheckNav = ({ userAuthority = [], authority = [], children }) => {
    if (!authority || authority.length === 0) {
        return <>{children}</>
    }

    const roleMatched = useAuthority(userAuthority, authority, true)

    // Si no tiene permisos → no renderiza (null)
    return <>{roleMatched ? children : null}</>
}
```

**Diferencia clave**:
- `AuthorityCheck`: Redirige a `/sin-permisos` ❌
- `AuthorityCheckNav`: Simplemente oculta el elemento ⚠️

---

## 🔄 Flujo de Autenticación

```
┌─────────────────────────────────────────────────────────────────┐
│                    1. Usuario hace LOGIN                         │
│                    POST /auth/jwt/create                         │
│                    { email, password }                           │
└───────────────────────────┬─────────────────────────────────────┘
                            ↓
                  ┌─────────────────────┐
                  │ Backend valida y    │
                  │ devuelve JWT tokens │
                  │ { access, refresh } │
                  └──────────┬──────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│              2. Frontend guarda tokens en localStorage           │
└───────────────────────────┬─────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│              3. Ejecuta userMeThunk (obtener datos usuario)     │
│                 GET /auth/users/me                               │
│                 Authorization: Bearer {access}                   │
└───────────────────────────┬─────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│             4. Ejecuta obtenerGruposThunk                        │
│                GET /api/get_grupos_user/                         │
│                Authorization: Bearer {access}                    │
│                                                                  │
│     Backend consulta: UsuarioEmpresa.objects                     │
│                      .filter(usuario=user)                       │
│                      .values_list('grupos__name', flat=True)     │
│                                                                  │
│     Respuesta: { grupos: ['staff', 'superadmin'] }              │
└───────────────────────────┬─────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│     5. Redux guarda grupos en state.auth.listaGrupos            │
│        listaGrupos = { grupos: ['staff', 'superadmin'] }        │
└───────────────────────────┬─────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│   6. Ejecuta obtenerPersonalizacionThunk (config usuario)       │
│      GET /api/personalizacion-usuarios/                          │
│      Obtiene: sucursal_principal, empresa, tema, etc.            │
└───────────────────────────┬─────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│   7. Router valida permisos en cada navegación                   │
│      AuthorityCheck compara:                                     │
│      - listaGrupos.grupos (del usuario)                          │
│      - authority (de pages.config.ts)                            │
│                                                                  │
│      Si coincide AL MENOS UNO → ✅ Renderiza                    │
│      Si NO coincide → ❌ Redirige a /sin-permisos               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 👥 Grupos Estándar

Los grupos se gestionan desde Django Admin (`/admin/auth/group/`) y se asignan en `UsuarioEmpresa.grupos`.

| Grupo                | Código             | Descripción                           | Permisos típicos                           |
|----------------------|-------------------|---------------------------------------|--------------------------------------------|
| Staff                | `staff`           | Administrativo general                | Gestión de empresa, usuarios, configuración|
| Super Admin          | `superadmin`      | Administrador máximo                  | Acceso total al sistema                    |
| Multi-empresas       | `multi-empresas`  | Acceso a múltiples empresas           | Ver/gestionar varias empresas              |
| Técnico              | `tecnico`         | Técnico de campo                      | OT, visitas, equipos, instalaciones        |
| Bodeguero            | `bodeguero`       | Encargado de bodega                   | Movimientos, guías de salida, inventario   |
| Representante Legal  | `representante_legal` | Representante legal de empresa    | Firmas, contratos, acuerdos legales        |
| Vendedor             | `vendedor`        | Personal de ventas                    | Cotizaciones, seguimiento de ventas        |
| Comprador            | `comprador`       | Gestión de compras                    | Órdenes de compra, proveedores             |

### Creación de Grupos

**Opción 1: Django Admin**

```
1. Ir a /admin/auth/group/
2. Click en "Añadir Grupo"
3. Nombre: staff
4. Guardar
```

**Opción 2: Script automatizado**

```cmd
cd backend
backend\ENV\Scripts\python.exe ..\scripts\development\create_groups.py
```

---

## 🎨 Frontend: Validación de Permisos

### Ejemplo 1: Proteger una Ruta

**Archivo**: `frontend/src/routes/contentRoutes.tsx`

```tsx
import { AuthorityCheck } from '@/components/layouts';
import { Pages } from '@/config/pages.config';
import { useAppSelector } from '@/store';

const contentRoutes = [
    {
        path: Pages.empresa.subPages.listaEmpresas.to,
        element: (
            <AuthorityCheck 
                userAuthority={listaGrupos?.grupos}
                authority={Pages.empresa.subPages.listaEmpresas.authority}
            >
                <ListaEmpresas />
            </AuthorityCheck>
        ),
    },
];
```

**Comportamiento**:
- Si usuario tiene `['staff', 'bodeguero']` y ruta requiere `['staff', 'superadmin']` → ✅ Acceso (tiene staff)
- Si usuario tiene `['bodeguero']` y ruta requiere `['staff', 'superadmin']` → ❌ Redirige a `/sin-permisos`

### Ejemplo 2: Ocultar Elementos del Sidebar

**Archivo**: `frontend/src/templates/layouts/Asides/DefaultAside.template.tsx`

```tsx
const DefaultAsideTemplate = () => {
    const { listaGrupos } = useAppSelector((state) => state.auth)
    
    return (
        <Aside>
            <Nav>
                {/* Solo visible si usuario tiene grupos requeridos */}
                <AuthorityCheckNav 
                    authority={Pages.empresa.authority} 
                    userAuthority={listaGrupos?.grupos}
                >
                    <NavCollapse text="Empresa" icon="building">
                        <NavItem text="Lista Empresas" to="/empresa/empresas" />
                    </NavCollapse>
                </AuthorityCheckNav>
                
                {/* Sin protección → siempre visible */}
                <NavItem text="Mi Perfil" to="/profile" />
            </Nav>
        </Aside>
    )
}
```

### Ejemplo 3: Botones Condicionales

```tsx
const CrearEmpresaButton = () => {
    const { listaGrupos } = useAppSelector((state) => state.auth)
    const hasPermission = useAuthority(
        listaGrupos?.grupos,
        ['staff', 'superadmin'],
        true
    )
    
    if (!hasPermission) return null
    
    return (
        <Button onClick={() => navigate('/empresa/crear')}>
            Crear Empresa
        </Button>
    )
}
```

---

## ⚙️ Backend: Configuración de Permisos

### Configuración Global (DRF)

**Archivo**: `backend/sw_erp/settings.py`

```python
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'rest_framework.authentication.TokenAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',  # ← Por defecto: autenticado
    ],
}
```

**Implicación**: Todos los endpoints requieren autenticación JWT por defecto.

### Excepciones: Endpoints Públicos

**Archivo**: `backend/retroalimentacion/views.py`

```python
from rest_framework.permissions import AllowAny

class RetroalimentacionPorTokenView(generics.RetrieveUpdateAPIView):
    permission_classes = [AllowAny]  # ← Acceso sin autenticación
    
    def get_object(self):
        token = self.kwargs['token']
        return Retroalimentacion.objects.get(token=token)
```

**Uso típico**: Páginas públicas como:
- Recuperar contraseña
- Aceptar invitaciones
- Retroalimentación de clientes externos
- Firmar contratos con UUID

### Permisos Personalizados

**Crear permiso basado en grupos**:

```python
# backend/core/permissions.py
from rest_framework.permissions import BasePermission
from empresas.models import UsuarioEmpresa

class EsStaffOSuperAdmin(BasePermission):
    """
    Permite acceso solo a usuarios con grupos 'staff' o 'superadmin'
    """
    message = "Se requiere rol de staff o superadmin"
    
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        
        # Obtener grupos del usuario desde UsuarioEmpresa
        grupos = UsuarioEmpresa.objects.filter(usuario=user)\
                    .values_list('grupos__name', flat=True)\
                    .distinct()
        
        return 'staff' in grupos or 'superadmin' in grupos

# Usar en ViewSet
class EmpresaViewSet(ModelViewSet):
    permission_classes = [IsAuthenticated, EsStaffOSuperAdmin]
    queryset = Empresa.objects.all()
```

### Validar Permisos en Métodos

Django no valida automáticamente por grupos de `UsuarioEmpresa`. Implementar en vistas:

```python
from rest_framework.exceptions import PermissionDenied
from empresas.models import UsuarioEmpresa

class EmpresaViewSet(ModelViewSet):
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        # Verificar grupos
        grupos = UsuarioEmpresa.objects.filter(usuario=user)\
                    .values_list('grupos__name', flat=True)
        if 'staff' not in grupos:
            return self.queryset.none()
        return self.queryset
    
    def perform_destroy(self, instance):
        # Validar grupos del usuario
        grupos = UsuarioEmpresa.objects.filter(usuario=self.request.user)\
                    .values_list('grupos__name', flat=True)
        
        if 'superadmin' not in grupos:
            raise PermissionDenied("Solo superadmin puede eliminar empresas")
        
        return super().perform_destroy(instance)
```

---

## 🚀 Flujo de Onboarding

### 1. Crear Superusuario (Primera vez)

```cmd
cd backend
backend\ENV\Scripts\python.exe manage.py createsuperuser
```

Datos requeridos:
- Email
- Password
- First name / Last name

**Estado**: Usuario creado, pero sin empresa ni grupos → Sin acceso al sistema.

### 2. Configurar Empresa y Grupos

**Opción A: Script automatizado** (recomendado)

```cmd
backend\ENV\Scripts\python.exe ..\scripts\setup\setup_superuser.py
```

**Opción B: Django Admin manual**

1. Crear grupos: `/admin/auth/group/`
2. Crear empresa: `/admin/empresas/empresa/`
3. Crear sucursal: `/admin/empresas/sucursalempresa/`
4. Crear UsuarioEmpresa: `/admin/empresas/usuarioempresa/`
   - Asociar usuario, empresa, sucursal
   - Asignar grupos: `staff`, `superadmin`, `multi-empresas`

### 3. Configurar Personalización

```python
from core.models import Personalizacion

Personalizacion.objects.create(
    usuario=user,
    sucursal_principal=sucursal,
    empresa=empresa,
    tema='system',
    font_size=14
)
```

Permite que el dashboard cargue la empresa seleccionada.

---

## 💡 Ejemplos Prácticos

### Caso 1: Nuevo Usuario → Superusuario

**Problema**: Creaste un superusuario pero no puede acceder a ninguna ruta.

**Causa**: `User.is_superuser=True` no es suficiente. Necesita `UsuarioEmpresa` con grupos asignados.

**Solución**:

```cmd
cd backend
backend\ENV\Scripts\python.exe ..\scripts\setup\setup_superuser.py
```

**¿Qué hace el script?**

1. Crea grupos estándar (staff, superadmin, multi-empresas, etc.)
2. Crea empresa inicial "Snabbit"
3. Crea sucursal "Casa Matriz"
4. Crea `UsuarioEmpresa` asociando superusuario con empresa
5. Asigna grupos: `staff`, `superadmin`, `multi-empresas`
6. Crea `Personalizacion` con sucursal_principal

**Después del script**:
```cmd
# Re-login en frontend
1. Cerrar sesión
2. Borrar localStorage (F12 → Application → Local Storage → Clear)
3. Iniciar sesión nuevamente
4. Ahora tendrás acceso a todas las rutas
```

### Caso 2: Crear Técnico de Campo

**Objetivo**: Usuario que solo puede ver/gestionar OT, visitas y equipos.

**Pasos**:

1. **Crear usuario**:
```python
# Django Admin: /admin/cuentas/user/add/
Email: tecnico@example.com
First name: Juan
Last name: Pérez
Password: (generar)
```

2. **Crear UsuarioEmpresa**:
```python
# Django Admin: /admin/empresas/usuarioempresa/add/
Usuario: tecnico@example.com
Sucursal: (seleccionar sucursal existente)
Grupos: [tecnico]  # ← Asignar solo grupo 'tecnico'
```

3. **Usuario puede acceder a**:
- `/orden-trabajo/*` (authority: `['staff', 'superadmin', 'tecnico']`)
- `/cotizacion/*` (authority: `['staff', 'superadmin', 'tecnico']`)

4. **Usuario NO puede acceder a**:
- `/empresa/*` (authority: `['staff', 'superadmin']`)
- `/bodega/*` (authority: `['staff', 'superadmin']`)

### Caso 3: Multi-empresa

**Escenario**: Usuario trabaja en 2 empresas diferentes.

**Configuración**:

```python
# UsuarioEmpresa 1
usuario = user@example.com
empresa = Snabbit
sucursal = Casa Matriz
grupos = [staff, superadmin]

# UsuarioEmpresa 2
usuario = user@example.com
empresa = Cliente XYZ
sucursal = Sucursal Norte
grupos = [tecnico]
```

**Resultado**:
- `obtenerGruposThunk` devuelve: `['staff', 'superadmin', 'tecnico']` (todos los grupos de todas las empresas)
- Usuario tiene acceso a rutas que requieren cualquiera de esos grupos
- Puede cambiar empresa activa desde el selector de sucursal en el header

El sistema soporta multiempresa. Si `UsuarioEmpresa` tiene múltiples registros:

```python
UsuarioEmpresa.objects.filter(usuario=user).values_list('empresa__nombre', flat=True)
# ['Empresa A', 'Empresa B', 'Empresa C']
```

Grupos se obtienen de **todos** los registros:

```python
.filter(usuario=user).values_list('grupos__name', flat=True).distinct()
```

Para cambiar empresa activa:
- Frontend permite seleccionar sucursal en header (componente `SelectSucursalEmpresa`)
- Actualiza `Personalizacion.sucursal_principal`

---

## ⚠️ Limitaciones del Sistema Actual

### 1. **No Hay Permisos a Nivel de Objeto**

**Problema**: Solo puedo verificar si el usuario está autenticado y filtrar por empresa.

```python
# Actual: Solo filtrado manual en get_queryset()
class CotizacionViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        personalizacion = PersonalizacionUsuario.objects.filter(usuario=self.request.user).first()
        if personalizacion and personalizacion.sucursal_principal:
            return Cotizacion.objects.filter(empresa=personalizacion.sucursal_principal.empresa)
        return Cotizacion.objects.none()
```

**Limitación**: No puedo decir "Usuario X puede editar Cotización #123 pero no #456" dentro de la misma empresa.

### 2. **Permisos Hardcodeados en Frontend**

```typescript
// pages.config.ts
empresa: {
    authority: ['staff', 'superadmin'],  // ← Hardcoded
}
```

**Problema**:
- Si cambio un grupo en BD, debo cambiar código frontend
- No es dinámico
- Difícil de mantener

### 3. **Filtrado Manual Repetitivo**

```python
# Cada ViewSet tiene que implementar su propio filtrado
def get_queryset(self):
    user = self.request.user
    personalizacion = PersonalizacionUsuario.objects.filter(usuario=user).first()
    if personalizacion and personalizacion.sucursal_principal:
        return MiModelo.objects.filter(empresa=personalizacion.sucursal_principal.empresa)
    return MiModelo.objects.none()
```

**Problema**:
- Código duplicado en ~20+ ViewSets
- Fácil olvidar filtrar en algún endpoint
- No es DRY (Don't Repeat Yourself)

### 4. **Sin Auditoría Granular**

**Problema**:
- No sé QUÉ objeto específico modificó un usuario
- Solo puedo auditar a nivel de empresa
- No puedo rastrear "Usuario X aprobó Cotización #123"

### 5. **Solución: Django Guardian**

Para resolver estas limitaciones, ver [permisos-guardian.md](./permisos-guardian.md) que implementa:
- ✅ Permisos por objeto específico
- ✅ Permisos dinámicos desde BD
- ✅ Código centralizado sin duplicación
- ✅ Auditoría granular por objeto

---

## 🔍 Troubleshooting

### ❌ Problema: "Sin permisos" al acceder a una ruta

**Causa**: `UsuarioEmpresa.grupos` está vacío.

**Diagnóstico**:

1. **Verificar grupos del usuario**:
```cmd
# Abrir DevTools (F12) → Console
console.log(JSON.parse(localStorage.getItem('persist:root'))?.auth)
# Buscar: listaGrupos.grupos
```

2. **Verificar grupos requeridos por la ruta**:
```typescript
// Buscar en frontend/src/config/pages.config.ts
listaEmpresas: {
    authority: ['staff', 'multi-empresas', 'superadmin']
}
```

3. **Validar en Django Admin**:
```
/admin/empresas/usuarioempresa/
Buscar tu usuario → Ver grupos asignados
```

**Soluciones**:

A. **Usuario sin UsuarioEmpresa**:
```cmd
backend\ENV\Scripts\python.exe ..\scripts\setup\setup_superuser.py
```

B. **Grupos incorrectos**:
```
1. Django Admin → /admin/empresas/usuarioempresa/
2. Seleccionar UsuarioEmpresa del usuario
3. Editar campo "grupos"
4. Agregar grupos necesarios
5. Guardar
6. Re-login en frontend
```

### ❌ Problema: Grupos no se actualizan en frontend

**Causa**: Estado de Redux no actualizado.

**Solución**:
```cmd
1. Cerrar sesión en la app
2. F12 → Application → Local Storage → contenedores.snabbit.cl
3. Click derecho → Clear
4. Recargar página (F5)
5. Iniciar sesión nuevamente
```

### ❌ Problema: Empresa no aparece en dashboard

**Causa**: `Personalizacion.sucursal_principal` o `Personalizacion.empresa` es null.

**Diagnóstico**:
```python
# Django shell
python manage.py shell

from core.models import Personalizacion
from cuentas.models import User

user = User.objects.get(email='tu@email.com')
personalizacion = Personalizacion.objects.get(usuario=user)

print(personalizacion.sucursal_principal)  # Debe tener valor
print(personalizacion.empresa)  # Debe tener valor
```

**Solución**:
```python
# Django shell (continuación)
from empresas.models import SucursalEmpresa

sucursal = SucursalEmpresa.objects.first()  # o filtrar la correcta
personalizacion.sucursal_principal = sucursal
personalizacion.empresa = sucursal.empresa
personalizacion.save()
```

### ❌ Problema: JWT inválido/expirado constantemente

**Causa**: Lifetimes muy cortos.

**Diagnóstico**:
```python
# backend/sw_erp/settings.py
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=5),   # ← Revisar
    'REFRESH_TOKEN_LIFETIME': timedelta(hours=10), # ← Revisar
}
```

**Solución**:
```python
# Ajustar lifetimes (desarrollo)
'ACCESS_TOKEN_LIFETIME': timedelta(hours=10),
'REFRESH_TOKEN_LIFETIME': timedelta(days=7),

# Producción (más restrictivo)
'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
'REFRESH_TOKEN_LIFETIME': timedelta(days=30),
```

### ❌ Problema: CORS error al llamar API

**Causa**: Frontend no está en lista blanca de CORS.

**Diagnóstico**:
```python
# backend/sw_erp/settings.py
CORS_ALLOWED_ORIGINS = [
    'http://localhost:5173',  # ← Verificar puerto de Vite
]
```

**Solución**:
```python
# Desarrollo (permitir todo - solo local)
CORS_ORIGIN_ALLOW_ALL = True

# Producción (lista blanca)
CORS_ALLOWED_ORIGINS = [
    'https://app.snabbit.cl',
    'https://www.snabbit.cl',
]
```

---

## 🎯 Mejores Prácticas

### Crear Nuevo Usuario

1. Crear `User` desde admin o por invitación
2. Crear `UsuarioEmpresa` asociando empresa/sucursal
3. Asignar grupos apropiados según rol
4. Crear `Personalizacion` (automático en primer login)

### Definir Nuevos Permisos

1. Crear grupo en admin: `/admin/auth/group/`
2. Actualizar `pages.config.ts`:
   ```typescript
   nuevaRuta: {
       authority: ['nuevo_grupo']
   }
   ```
3. Usar `AuthorityCheck` o `AuthorityCheckNav` en componentes

### Validar Permisos en Backend

Django no valida automáticamente por grupos de `UsuarioEmpresa`. Implementar en vistas según ejemplos en sección "Backend: Configuración de Permisos".

---

## 📚 Archivos de Referencia

### Backend

| Archivo | Descripción |
|---------|-------------|
| `backend/empresas/models.py` | Modelo `UsuarioEmpresa` (línea 57) |
| `backend/cuentas/views.py` | Endpoint `/api/get_grupos_user/` (línea 51) |
| `backend/sw_erp/settings.py` | Configuración DRF y JWT (línea 220) |
| `backend/core/models.py` | Modelo `Personalizacion` |

### Frontend

| Archivo | Descripción |
|---------|-------------|
| `frontend/src/config/pages.config.ts` | Definición de rutas y permisos |
| `frontend/src/hooks/useAuthority.ts` | Hook de validación de permisos |
| `frontend/src/components/layouts/AuthorityCheck/` | Componente para proteger rutas |
| `frontend/src/components/layouts/AuthorityCheckNav/` | Componente para sidebar |
| `frontend/src/store/slices/auth/authSlice.ts` | Redux state (listaGrupos) |
| `frontend/src/routes/contentRoutes.tsx` | Configuración de rutas protegidas |

### Scripts

| Archivo | Descripción |
|---------|-------------|
| `scripts/setup/setup_superuser.py` | Inicializar superusuario con permisos |
| `scripts/development/create_groups.py` | Crear grupos estándar |
| `scripts/setup/seed_data.py` | Datos de prueba con usuarios y permisos |

### Documentación

| Archivo | Descripción |
|---------|-------------|
| `.github/instrucciones/backend-instructions.md` | Guía de backend (sección 5: Autenticación) |
| `.github/instrucciones/security.md` | Seguridad y JWT |
| `.github/instrucciones/frontend-instructions.md` | Guía de frontend |

---

## 🎓 Conceptos Clave

### 1. Autenticación vs Autorización

- **Autenticación** (Authentication): ¿Quién eres? → JWT valida identidad
- **Autorización** (Authorization): ¿Qué puedes hacer? → Grupos validan permisos

### 2. IsAuthenticated vs Grupos

```python
# Todos los endpoints por defecto requieren IsAuthenticated
# Esto valida que el JWT sea válido y el usuario exista
# NO valida grupos específicos

# Para validar grupos, debes implementar lógica adicional:
grupos = UsuarioEmpresa.objects.filter(usuario=user).values_list('grupos__name', flat=True)
if 'staff' not in grupos:
    raise PermissionDenied()
```

### 3. Superusuario ≠ Permisos ERP

```
User.is_superuser = True
    ↓
Acceso total al Django Admin (/admin/)

PERO NO implica:
    ↓
UsuarioEmpresa con grupos → Acceso al ERP
```

### 4. Multi-tenancy (Multi-empresa)

```python
# Un usuario puede tener múltiples UsuarioEmpresa:
UsuarioEmpresa(usuario=juan, empresa=Snabbit, grupos=[staff])
UsuarioEmpresa(usuario=juan, empresa=ClienteXYZ, grupos=[tecnico])

# obtenerGruposThunk devuelve TODOS los grupos agregados:
{ grupos: ['staff', 'tecnico'] }

# Usuario puede cambiar empresa activa (selector en header)
# pero mantiene todos los permisos agregados
```

---

## ✅ Checklist de Verificación

### Nuevo Usuario

- [ ] Usuario creado en Django Admin (`/admin/cuentas/user/`)
- [ ] UsuarioEmpresa creado y asociado con empresa/sucursal
- [ ] Grupos asignados en UsuarioEmpresa
- [ ] Personalizacion creada (automático en primer login, o manual)
- [ ] Usuario puede hacer login y ver su empresa en dashboard
- [ ] Usuario puede acceder a rutas según sus grupos

### Nueva Ruta Protegida

- [ ] Agregar `authority: ['grupo1', 'grupo2']` en `pages.config.ts`
- [ ] Envolver ruta en `<AuthorityCheck>` en `contentRoutes.tsx`
- [ ] Envolver NavItem en `<AuthorityCheckNav>` en `DefaultAside.template.tsx`
- [ ] Probar con usuario que tiene permisos
- [ ] Probar con usuario que NO tiene permisos (debe redirigir a /sin-permisos)

### Nueva Funcionalidad Backend

- [ ] Definir `permission_classes` en ViewSet/APIView
- [ ] Si requiere grupos específicos, validar en método
- [ ] Probar con JWT válido pero sin permisos (debe retornar 403)
- [ ] Probar sin JWT (debe retornar 401)
- [ ] Documentar grupos requeridos en docstring

---

## Referencias Cruzadas

- [Backend (Django)](./backend/general.md): configuración de autenticación y permisos (sección 5)
- [Frontend (React)](./frontend/general.md): componentes de autorización y rutas protegidas
- [Seguridad](./procesos/security.md): JWT, CORS/CSRF, validaciones, rotación de claves
- [Estándares](./procesos/standards.md): convenciones de código y estructura
- [Playbooks](./soporte/playbooks.md): procedimientos de onboarding y troubleshooting

---

**Última actualización**: 2025-11-03
