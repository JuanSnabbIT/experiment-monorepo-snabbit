# Security - Autenticación, Autorización y Seguridad

Guía completa de configuración de seguridad del sistema ERP.

---

## 1. Autenticación JWT

### 1.1 Configuración SimpleJWT

**Ubicación:** `backend/sw_erp/settings.py`

```python
from datetime import timedelta

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=5),
    "REFRESH_TOKEN_LIFETIME": timedelta(hours=10),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "ALGORITHM": "HS256",
    "SIGNING_KEY": SECRET_KEY,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
}
```

### 1.2 Ciclo de Vida de Tokens

| Token | Duración | Propósito | Rotación |
|-------|----------|-----------|----------|
| **Access Token** | 5 horas | Autenticar requests HTTP | Automática |
| **Refresh Token** | 10 horas | Obtener nuevo access token | Sí (ROTATE_REFRESH_TOKENS) |

### 1.3 Header de Autenticación

```http
GET /api/ordenes/ HTTP/1.1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 1.4 Flujo de Refresh de Token

**Cuando Access Token expira:**

1. Frontend recibe respuesta `401 Unauthorized`
2. Frontend envía: `POST /api/auth/token/refresh/` con refresh token
3. Backend valida refresh token y emite nuevo access token
4. Frontend reintentar request original con nuevo token
5. Si refresh token también expiró → **logout** y redirect a `/login`

**Implementación Frontend (RTK Query):**

```typescript
const rtkApi = createApi({
    baseQuery: fetchBaseQuery({
        baseUrl: 'http://localhost:8000/api',
        prepareHeaders: (headers, { getState }: any) => {
            const token = getState().auth?.access;
            if (token) headers.set('Authorization', `Bearer ${token}`);
            return headers;
        },
    }),
    // RTK Query maneja refresh automáticamente
});
```

---

## 2. Configuración Djoser

**Ubicación:** `backend/sw_erp/settings.py`

```python
DJOSER = {
    "PASSWORD_RESET_CONFIRM_URL": "password/reset/confirm/{uid}/{token}/",
    "ACTIVATION_URL": "activate/{uid}/{token}/",
    "SEND_ACTIVATION_EMAIL": True,
    "SEND_CONFIRMATION_EMAIL": True,
    "PASSWORD_CHANGED_EMAIL_CONFIRMATION": True,
    "USER_CREATE_PASSWORD_RETYPE": True,
    "SET_PASSWORD_RETYPE": True,
    "TOKEN_MODEL": None,  # Usar SimpleJWT, no token auth legacy
}
```

### Endpoints Djoser Automáticos

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/auth/jwt/create/` | POST | Login (retorna access + refresh tokens) |
| `/api/auth/jwt/refresh/` | POST | Refrescar access token |
| `/api/auth/jwt/verify/` | POST | Verificar que token es válido |
| `/api/auth/users/` | POST | Registrar usuario (con validation URL) |
| `/api/auth/users/confirm-email/` | POST | Confirmar email |
| `/api/auth/users/reset-password/` | POST | Solicitar reset password |
| `/api/auth/users/reset-password-confirm/` | POST | Confirmar reset password |

---

## 3. REST Framework - Configuración de Permisos

### 3.1 Configuración Global

```python
# backend/sw_erp/settings.py
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.AllowAny",  # ⚠️ POR DEFECTO: ACCESO PÚBLICO
    ],
    # ... resto de configuración
}
```

**⚠️ CRÍTICO:** `DEFAULT_PERMISSION_CLASSES = [AllowAny]`

Esto significa que **TODOS los endpoints son públicos por defecto**.

**Cada ViewSet DEBE definir explícitamente su `permission_classes`.**

### 3.2 Clases de Permiso Disponibles

```python
from rest_framework.permissions import (
    AllowAny,
    IsAuthenticated,
    IsAdminUser,
    IsAuthenticatedOrReadOnly,
)

class MiViewSet(viewsets.ModelViewSet):
    # Solo usuarios autenticados
    permission_classes = [IsAuthenticated]
    
    # O mezcla de permisos
    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def datos_publicos(self, request):
        pass
```

**Tabla de Permisos:**

| Clase | Lectura | Escritura | Caso de Uso |
|-------|---------|-----------|-----------|
| `AllowAny` | ✅ Público | ✅ Público | Endpoints públicos (login, feedback, cotización pública) |
| `IsAuthenticated` | ✅ Autenticado | ✅ Autenticado | APIs internas (órdenes, bodegas, etc.) |
| `IsAdminUser` | ✅ Admin | ✅ Admin | Admin panel |
| `IsAuthenticatedOrReadOnly` | ✅ Público | ✅ Autenticado | Lectura pública, edición autenticada |

---

## 4. Multi-tenancy (Aislamiento de Datos)

### 4.1 Patrón Obligatorio

**TODOS los ViewSets DEBEN implementar:**

```python
from core.models import PersonalizacionUsuario

class MiViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        personalizacion = PersonalizacionUsuario.objects.filter(usuario=user).first()
        
        if personalizacion and personalizacion.sucursal_principal:
            return MiModelo.objects.filter(
                empresa=personalizacion.sucursal_principal.empresa
            )
        
        # CRÍTICO: Retornar .none(), no lista vacía []
        return MiModelo.objects.none()
```

### 4.2 Riesgo: Sin Filtro Multi-tenancy

**Impacto: FUGA DE DATOS ENTRE EMPRESAS**

Si `get_queryset()` no filtra por empresa:
- Usuario de Empresa A puede ver datos de Empresa B
- Usuario de Empresa A puede editar/eliminar datos de Empresa B
- Acceso no autorizado a información confidencial

**Ejemplo Vulnerable:**
```python
class MiViewSet(viewsets.ModelViewSet):
    queryset = MiModelo.objects.all()  # ❌ EXPONE TODAS LAS EMPRESAS
    # Sin override de get_queryset()
```

---

## 5. Permisos Personalizados

### 5.1 Crear Permiso Custom

```python
# backend/core/permissions.py
from rest_framework.permissions import BasePermission

class EsAdminEmpresa(BasePermission):
    """
    Permite acceso solo si usuario es admin de su empresa.
    """
    def has_permission(self, request, view):
        from cuentas.functions import obtener_usuario_empresa
        
        usuario_empresa = obtener_usuario_empresa(request.user)
        return usuario_empresa and usuario_empresa.es_admin

    def has_object_permission(self, request, view, obj):
        # Validación a nivel de objeto específico
        return obj.empresa == request.user.personalizacion.sucursal_principal.empresa
```

### 5.2 Usar Permiso Custom

```python
from core.permissions import EsAdminEmpresa

class EmpresaViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, EsAdminEmpresa]
    # Solo admins de su empresa pueden acceder
```

---

## 6. CORS (Cross-Origin Resource Sharing)

### 6.1 Configuración Producción

```python
# backend/sw_erp/settings.py
CORS_ALLOWED_ORIGINS = [
    "https://app.miempresa.com",
    "https://www.miempresa.com",
]

CORS_ALLOW_CREDENTIALS = True

CORS_ALLOW_HEADERS = [
    "accept",
    "accept-encoding",
    "authorization",
    "content-type",
    "dnt",
    "origin",
    "user-agent",
    "x-csrftoken",
    "x-requested-with",
]
```

### 6.2 Configuración Desarrollo

```python
# settings.py (desarrollo)
if DEBUG:
    CORS_ALLOWED_ORIGINS = [
        "http://localhost:5173",    # Frontend Vite
        "http://127.0.0.1:5173",
        "http://localhost:3000",    # Alternativa
    ]
```

---

## 7. CSRF (Cross-Site Request Forgery)

### 7.1 Configuración

```python
# backend/sw_erp/settings.py
CSRF_COOKIE_SECURE = True       # HTTPS only
CSRF_COOKIE_HTTPONLY = False    # JavaScript puede leer (necesario en SPAs)
CSRF_COOKIE_SAMESITE = 'Lax'    # No enviar en requests cross-site
CSRF_TRUSTED_ORIGINS = [
    'https://app.miempresa.com',
]
```

### 7.2 Manejo en Frontend

```typescript
// Frontend (Axios)
// Django envía X-CSRFToken en cookie
const csrftoken = document.cookie
    .split('; ')
    .find(row => row.startsWith('csrftoken='))
    ?.split('=')[1];

axios.defaults.headers.common['X-CSRFToken'] = csrftoken;
```

---

## 8. Seguridad de Contraseñas

### 8.1 Configuración Django

```python
# backend/sw_erp/settings.py
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {'min_length': 8}
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]
```

### 8.2 Hash de Contraseñas

Django automáticamente:
- Hash con PBKDF2 (por defecto)
- Salt único por contraseña
- Múltiples iteraciones para ralentizar ataques

**JAMÁS almacenar contraseñas en texto plano.**

---

## 9. GAP ANALYSIS - Audit de Seguridad

**Fecha de auditoría:** 2025-02-12

### 9.1 ViewSets Sin Permission Classes Definido (🔴 CRÍTICO)

| App | ViewSet | Riesgo | Estado |
|-----|---------|--------|--------|
| **items** | `CategoriaViewSet` | Acceso público a catálogo de categorías | **INCORRECTO** |
| **items** | `FabricanteViewSet` | Acceso público a fabricantes | **INCORRECTO** |
| **contratos** | `ServicioViewSet` | Acceso público a servicios de contratos | **INCORRECTO** |
| **contratos** | `PlanServicioViewSet` | Acceso público a planes de servicios | **INCORRECTO** |
| **contratos** | `CaracteristicaServicioViewSet` | Acceso público a características | **INCORRECTO** |
| **contratos** | `VisitaViewSet` | Acceso público a plantilla de visitas | **INCORRECTO** |
| **contratos** | `LicenciaViewSet` | Acceso público a licencias SIN filtro multi-tenancy | **CRÍTICO** |
| **contratos** | `CondicionEspecialViewSet` | Acceso público a condiciones especiales | **INCORRECTO** |
| **core** | `SoftwareViewSet` | Acceso público a catálogo software | **INCORRECTO** |
| **core** | `AcuerdoConfidencialidadBaseViewSet` | Acceso público a acuerdos base | **INCORRECTO** |

### 9.2 ViewSets Con Filtro Multi-tenancy Incompleto (⚠️ ALTO)

| App | ViewSet | Problema | Estado |
|-----|---------|----------|--------|
| **items** | `ItemEmpresaViewset` | Filtra por `empresa_pk` en URL pero no por usuario logueado | **PARCIAL** |
| **visitas** | `AsistenciaUsuarioViewSet` | Sin filtro multi-tenancy explícito | **INCORRECTO** |
| **visitas** | `EntregaDeEquipoViewSet` | Sin filtro multi-tenancy explícito | **INCORRECTO** |
| **recursos** | `SoftwareInstaladoViewSet` | Sin permission_classes ni filtro | **INCORRECTO** |
| **recursos** | `MonitorEquipoViewSet` | Sin permission_classes explícito | **INCORRECTO** |
| **recursos** | `UsuarioEquipoViewSet` | Sin permission_classes explícito | **INCORRECTO** |
| **recursos** | `AlmacenamientoEquipoViewSet` | Sin permission_classes explícito | **INCORRECTO** |
| **recursos** | `FotoEquipoViewSet` | Sin permission_classes explícito | **INCORRECTO** |

### 9.3 ViewSets Correctamente Implementados (✅ CORRECTO)

| App | ViewSet | Permission | Multi-tenancy | Estado |
|-----|---------|-----------|----------------|--------|
| **ordentrabajov2** | `OrdenDeTrabajoViewSet` | `IsAuthenticated` | ✅ Filtra por empresa | **CORRECTO** |
| **ordentrabajov2** | `SoporteTecnicoViewSet` | `IsAuthenticated` | ✅ Filtra por empresa | **CORRECTO** |
| **bodegas** | `BodegaViewSet` | `IsAuthenticated` | ✅ Filtra por empresa | **CORRECTO** |
| **bodegas** | `GuiaSalidaViewSet` | `IsAuthenticated` | ✅ Filtra por empresa | **CORRECTO** |
| **empresas** | `UsuarioEmpresaViewSet` | `IsAuthenticated` | ✅ Filtra por sucursal | **CORRECTO** |
| **visitas** | `VisitaSoporteViewSet` | `IsAuthenticated` | ✅ Filtra por empresa | **CORRECTO** |
| **retroalimentacion** | `RetroalimentacionPorTokenView` | `AllowAny` | N/A (público intencional) | **CORRECTO** |

### 9.4 Resumen del GAP

- **Total ViewSets:** ~50+
- **Con permisos explícitos:** ~15 ✅
- **Sin permisos explícitos:** ~10+ 🔴
- **Con filtro multi-tenancy:** ~20 ✅
- **Sin filtro multi-tenancy:** ~15+ ⚠️

---

## 10. Recomendaciones de Corrección

### 10.1 INMEDIATO (Crítico)

1. **Agregar `permission_classes`** a todos los ViewSets en `items/`, `contratos/`, `core/`

   ```python
   class CategoriaViewSet(viewsets.ModelViewSet):
       permission_classes = [permissions.IsAuthenticated]  # ← AGREGAR
   ```

2. **Implementar filtro multi-tenancy** en `LicenciaViewSet`:

   ```python
   def get_queryset(self):
       user = self.request.user
       personalizacion = PersonalizacionUsuario.objects.filter(usuario=user).first()
       if personalizacion and personalizacion.sucursal_principal:
           return Licencia.objects.filter(
               empresa=personalizacion.sucursal_principal.empresa
           )
       return Licencia.objects.none()
   ```

### 10.2 CORTO PLAZO (1-2 semanas)

3. Auditar todos los `get_queryset()` para asegurar filtro de empresa
4. Agregar tests que validen que usuarios de empresa A NO pueden acceder a datos de empresa B
5. Documento en RISKLOG.md con lista de vulnerabilidades

### 10.3 LARGO PLAZO (Sprint siguiente)

6. Implementar custom permission class `EsDeEmpresa` reutilizable
7. Crear middleware de auditoría que logee accesos
8. Implementar rate limiting para endpoints públicos

---

## 11. Checklist de Seguridad

- [ ] Todos los ViewSets tienen `permission_classes` explícito
- [ ] Todos los ViewSets implementan `get_queryset()` con filtro de empresa
- [ ] Tokens JWT se envían HTTPS en producción
- [ ] CORS está configurado restrictivamente en producción
- [ ] CSRF_COOKIE_SECURE = True en producción
- [ ] Passwords validadas con validadores fuertes
- [ ] No hay hardcodeados secrets en código
- [ ] SECRET_KEY es único y fuerte en producción
- [ ] DEBUG = False en producción
- [ ] Logs de seguridad se registran (logins fallidos, accesos denegados)

---

Última actualización: 2025-02-12  
Responsable: Equipo de Seguridad  
**ESTADO:** 🔴 10 vulnerabilidades críticas identificadas (ver RISKLOG.md)
