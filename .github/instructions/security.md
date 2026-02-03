````markdown
# Security - Autenticación, Autorización y Seguridad (Documento Exhaustivo)

Guía completa de configuración de seguridad del sistema.

---

## 1. Autenticación JWT

### 1.1 Configuración SimpleJWT

```python
# backend/sw_erp/settings.py
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=5),
    "REFRESH_TOKEN_LIFETIME": timedelta(hours=10),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "ALGORITHM": "HS256",
    "SIGNING_KEY": SECRET_KEY,
    "AUTH_HEADER_TYPES": ("Bearer",),
}
```

### 1.2 Tokens

| Token | Duración | Uso |
|-------|----------|-----|
| **Access Token** | 5 horas | Autenticación de requests |
| **Refresh Token** | 10 horas | Obtener nuevo access token |

### 1.3 Header de Autenticación

```http
Authorization: Bearer <access_token>
```

### 1.4 Flujo de Refresh

1. Access token expira (401 Unauthorized)
2. Frontend envía refresh token a `/auth/jwt/refresh/`
3. Backend retorna nuevo access token
4. Frontend reintenta request original
5. Si refresh falla → logout y redirect a login

---

## 2. Configuración Djoser

```python
# backend/sw_erp/settings.py
DJOSER = {
    "LOGIN_FIELD": "email",                    # Login con email, no username
    "USER_CREATE_PASSWORD_RETYPE": True,       # Confirmar contraseña en registro
    "SEND_CONFIRMATION_EMAIL": True,           # Email al registrar
    "SEND_ACTIVATION_EMAIL": True,             # Email de activación
    
    # URLs de frontend para emails
    "PASSWORD_RESET_CONFIRM_URL": "cambio-contra/{uid}/{token}",
    "ACTIVATION_URL": "verificacion/{uid}/{token}",
    
    # Serializers personalizados
    "SERIALIZERS": {
        "user": "cuentas.serializers.UserSerializer",
        "current_user": "cuentas.serializers.UserSerializer",
        "user_create": "cuentas.serializers.UserCreateSerializer",
    },
}
```

---

## 3. Endpoints de Autenticación

### 3.1 Login y Tokens

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/auth/jwt/create/` | POST | Login, retorna access + refresh |
| `/auth/jwt/refresh/` | POST | Refrescar access token |
| `/auth/jwt/verify/` | POST | Verificar validez de token |

### 3.2 Usuarios

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/auth/users/` | POST | Registro de usuario |
| `/auth/users/me/` | GET | Datos del usuario actual |
| `/auth/users/activation/` | POST | Activar cuenta |
| `/auth/users/reset_password/` | POST | Solicitar reset password |
| `/auth/users/reset_password_confirm/` | POST | Confirmar reset password |

---

## 4. Configuración REST Framework

```python
# backend/sw_erp/settings.py
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
        "rest_framework.authentication.TokenAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.AllowAny",  # ⚠️ Por defecto AllowAny
    ],
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
    "DEFAULT_PARSER_CLASSES": [
        "rest_framework.parsers.JSONParser",
    ],
}
```

**⚠️ IMPORTANTE:** `DEFAULT_PERMISSION_CLASSES` está en `AllowAny`. Cada ViewSet DEBE definir sus permisos explícitamente.

---

## 5. Permisos en ViewSets

### 5.1 Definir Permisos Explícitos

```python
from rest_framework.permissions import IsAuthenticated

class MiViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    # ...
```

### 5.2 Permisos Disponibles

| Clase | Descripción |
|-------|-------------|
| `AllowAny` | Sin restricción (público) |
| `IsAuthenticated` | Solo usuarios logueados |
| `IsAdminUser` | Solo staff/admin |
| `IsAuthenticatedOrReadOnly` | Lectura pública, escritura autenticada |

### 5.3 Permisos Personalizados

```python
from rest_framework.permissions import BasePermission

class EsAdminEmpresa(BasePermission):
    def has_permission(self, request, view):
        usuario_empresa = obtener_usuario_empresa(request.user)
        return usuario_empresa and usuario_empresa.es_admin
```

---

## 6. Multi-tenancy (Aislamiento de Datos)

### 6.1 Patrón Obligatorio

Todos los ViewSets DEBEN filtrar datos por empresa del usuario:

```python
from core.models import PersonalizacionUsuario

class MiViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        user = self.request.user
        personalizacion = PersonalizacionUsuario.objects.filter(
            usuario=user
        ).first()
        
        if not personalizacion or not personalizacion.sucursal_principal:
            return self.queryset.model.objects.none()
        
        empresa = personalizacion.sucursal_principal.empresa
        return self.queryset.model.objects.filter(empresa=empresa)
```

### 6.2 Riesgo de No Implementar

Si no se implementa el filtro por empresa:
- Usuario A podría ver/modificar datos de Usuario B
- Violación de privacidad de datos
- Riesgo de seguridad crítico

---

## 7. CORS (Cross-Origin Resource Sharing)

### 7.1 Configuración Actual (Desarrollo)

```python
# backend/sw_erp/settings.py
CORS_ORIGIN_ALLOW_ALL = True  # ⚠️ Solo para desarrollo
```

### 7.2 Configuración Recomendada (Producción)

```python
CORS_ORIGIN_ALLOW_ALL = False
CORS_ALLOWED_ORIGINS = [
    "https://tudominio.com",
    "https://app.tudominio.com",
]
CORS_ALLOW_CREDENTIALS = True
```

---

## 8. Frontend - Manejo de Tokens

### 8.1 Almacenamiento

- Tokens se almacenan en Redux state (`auth.access`, `auth.refresh`)
- **NO** se usa localStorage directamente para inyectar JWT

### 8.2 Interceptor de Request

```typescript
// services/BaseService.ts
BaseService.interceptors.request.use((config) => {
    const token = store.getState().auth.access;
    if (token) {
        config.headers['Authorization'] = 'Bearer ' + token;
    }
    return config;
});
```

### 8.3 Interceptor de Response (Refresh)

```typescript
// services/BaseService.ts
BaseService.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            const refreshToken = store.getState().auth.refresh;
            
            try {
                const response = await axios.post('/auth/jwt/refresh', {
                    refresh: refreshToken
                });
                store.dispatch(GUARDAR_TOKEN(response.data.access));
                return BaseService(originalRequest);
            } catch {
                store.dispatch(LOGOUT());
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);
```

---

## 9. Endpoints Públicos (Sin Autenticación)

### 9.1 Cotizaciones Públicas

```python
# cotizaciones/urls.py
path('public/cotizacion/<str:token>/', PublicCotizacionView.as_view()),
path('public/cotizacion/<str:token>/aprobar/', PublicAprobarCotizacionView.as_view()),
path('public/cotizacion/<str:token>/rechazar/', PublicRechazarCotizacionView.as_view()),
```

Estos endpoints permiten a solicitantes externos aprobar/rechazar cotizaciones sin cuenta.

### 9.2 Seguridad de Tokens Públicos

- Tokens generados con `uuid4()` (128 bits de entropía)
- Expiran después de cierto tiempo
- Solo permiten acciones específicas (aprobar/rechazar)

---

## 10. Validaciones de Seguridad

### 10.1 No Hardcodear Credenciales

```python
# ❌ INCORRECTO
SECRET_KEY = "mi-clave-super-secreta"

# ✅ CORRECTO
SECRET_KEY = os.getenv("SECRET_KEY")
```

### 10.2 Variables de Entorno Sensibles

| Variable | Descripción |
|----------|-------------|
| `SECRET_KEY` | Clave secreta Django |
| `DATABASE_URL` | Conexión a BD |
| `REDIS_HOST` | Host de Redis |
| `EMAIL_HOST_PASSWORD` | Contraseña de correo |

### 10.3 Checklist de Seguridad

- [ ] `DEBUG = False` en producción
- [ ] `SECRET_KEY` en variable de entorno
- [ ] `CORS_ALLOWED_ORIGINS` definido (no `CORS_ORIGIN_ALLOW_ALL`)
- [ ] Todos los ViewSets con permisos explícitos
- [ ] Multi-tenancy implementado en todos los ViewSets
- [ ] HTTPS habilitado
- [ ] Credenciales de BD en variables de entorno

---

## 11. Auditoría

### 11.1 django-simple-history

Modelos que heredan de `ModeloBaseHistorico` tienen auditoría automática:

```python
from core.models import ModeloBaseHistorico

class MiModelo(ModeloBaseHistorico):
    # Automáticamente registra quién y cuándo modificó
    pass
```

### 11.2 Historial Manual

Algunos modelos tienen su propio historial:

```python
# ordentrabajov2/models.py
class HistorialCambiosOrden(models.Model):
    orden = models.ForeignKey(OrdenDeTrabajo, on_delete=models.CASCADE)
    fecha = models.DateTimeField(auto_now_add=True)
    descripcion = models.TextField()
    usuario = models.ForeignKey(UsuarioEmpresa, on_delete=models.SET_NULL)
```

---

Última actualización: 2026-02-03
````
