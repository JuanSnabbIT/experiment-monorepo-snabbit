# 🔒 Security – Autenticación, Autorización y Validación

Guía de prácticas seguras en el monorepo.

---

## 🔐 Autenticación JWT

### Backend

**Stack:** Django REST Framework + SimpleJWT

```python
# settings.py
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=5),
    'REFRESH_TOKEN_LIFETIME': timedelta(hours=10),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'AUTH_HEADER_TYPES': ('Bearer',),
}

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
}
```

**Endpoints Djoser:**
```
POST   /api/token/              # Login (obtener access + refresh tokens)
POST   /api/token/refresh/      # Refrescar access token
POST   /api/users/              # Registro
POST   /api/users/me/           # Datos usuario actual
```

**Response:**
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

### Frontend

**BaseService.ts (JWT Interceptor):**
```typescript
// Inyectar token en cada request
axiosInstance.interceptors.request.use(config => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-refresh si expira
axiosInstance.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
      const refreshToken = localStorage.getItem('refresh_token');
      const newAccessToken = await refreshAccessToken(refreshToken);
      // Reintentar request con nuevo token
    }
  }
);
```

### Buenas Prácticas
✅ **Haz:**
- Tokens en `localStorage` (con cuidado) o cookies HttpOnly
- Refresh automático en frontend (BaseService interceptor)
- Logout revoca tokens (blacklist en backend)
- Duración corta para access tokens (5h)

❌ **Evita:**
- Tokens en localStorage sin HTTPS (XSS risk)
- Refrescos manuales (automatiza en interceptor)
- Almacenar datos sensibles en JWT
- Tokens sin expiración

---

## 👥 Autorización (Permisos)

### RBAC (Role-Based Access Control)

**Backend:**
```python
# Modelos
User (Django user)
  ├── groups (M2M → Group: 'Admin', 'Operador', 'Viewer')
  └── ...

# Ejemplo: usuario es Admin
user.groups.filter(name='Admin').exists()

# En ViewSet:
class MiViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, EsAdmin]
```

**Permiso personalizado:**
```python
from rest_framework import permissions

class EsAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.groups.filter(name='Admin').exists()

class EsPropietario(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        return obj.usuario_creador == request.user
```

### Multi-tenancy (Empresa)

**Backend:**
```python
# Cada usuario pertenece a una empresa
UsuarioEmpresa
  ├── usuario (FK)
  ├── empresa (FK)
  ├── grupos (roles específicos por empresa)
  └── es_admin_empresa (bool)

# En ViewSet: filtrar por empresa
def get_queryset(self):
    return Model.objects.filter(empresa=self.request.user.empresa_activa)
```

**Frontend:**
```typescript
// Redux: empresa seleccionada
const empresaActiva = useAppSelector(state => state.auth.empresa_activa);

// En API calls: pasar empresa_id automáticamente
const listar = (filters) => {
  return api.get('/ordentrabajov2/', {
    params: { empresa_id: empresaActiva.id, ...filters }
  });
};
```

### Buenas Prácticas
✅ **Haz:**
- Validar permisos en nivel de ViewSet (DRF)
- Validar también en nivel de queryset (`get_queryset()`)
- Usar grupos Django para roles
- Validar multi-tenancy en QuerySet

❌ **Evita:**
- Validar solo en frontend
- Confiar en datos de JWT para permisos críticos
- No filtrar QuerySet por usuario/empresa
- Permisos hardcodeados

---

## 🔑 Almacenamiento de Credenciales

### Backend

**variables de entorno (.env):**
```bash
SECRET_KEY=tu-secret-key-super-secreto
DEBUG_ENABLE=False  # NUNCA True en producción
POSTGRES_PASSWORD=password-segura
REDIS_PASSWORD=redis-password
EMAIL_HOST_PASSWORD=app-password-gmail
```

**Acceso seguro:**
```python
import os
from dotenv import load_dotenv

load_dotenv()
SECRET_KEY = os.getenv("SECRET_KEY")
# NUNCA los valores por defecto en código
```

### Frontend

**variables de entorno (.env.development / .env.production):**
```bash
VITE_API_URL=http://localhost:8001/api
VITE_PUBLIC_KEY=  # Solo datos públicos, NUNCA secrets
```

**Uso:**
```typescript
const apiUrl = import.meta.env.VITE_API_URL;
// NUNCA: const apiKey = import.meta.env.VITE_SECRET_KEY
```

### Buenas Prácticas
✅ **Haz:**
- Variables de entorno para credenciales
- `.env` en `.gitignore`
- `.env.example` con valores dummy (para documentación)
- Secrets en variables de entorno en CI/CD

❌ **Evita:**
- Hardcodear credenciales en código
- Commitear `.env`
- Almacenar secrets en localStorage (XSS risk)
- Logs con credenciales

---

## 🛡️ Validación de Datos

### Backend (Serializers)

```python
from rest_framework import serializers

class OrdenTrabajoSerializer(serializers.ModelSerializer):
    def validate_numero(self, value):
        """Validación personalizada."""
        if not value.startswith('OT-'):
            raise serializers.ValidationError("Debe comenzar con 'OT-'")
        return value
    
    def validate(self, data):
        """Validación entre múltiples campos."""
        if data['fecha_inicio'] > data['fecha_fin']:
            raise serializers.ValidationError({
                'fecha_fin': 'Debe ser posterior a fecha_inicio'
            })
        return data
```

### Frontend (Validación antes de enviar)

```typescript
export const validateOrdenTrabajo = (data: IOrdenTrabajoRequest): Record<string, string> => {
  const errors: Record<string, string> = {};
  
  if (!data.numero) errors.numero = 'Requerido';
  if (!data.numero.startsWith('OT-')) errors.numero = 'Debe comenzar con OT-';
  
  if (!data.descripcion) errors.descripcion = 'Requerida';
  if (data.descripcion.length < 10) errors.descripcion = 'Mínimo 10 caracteres';
  
  return errors;
};

// En componente
const [errors, setErrors] = useState<Record<string, string>>({});

const handleSubmit = async (data: IOrdenTrabajoRequest) => {
  const validationErrors = validateOrdenTrabajo(data);
  if (Object.keys(validationErrors).length > 0) {
    setErrors(validationErrors);
    return;
  }
  
  dispatch(crearOrdenTrabajoThunk(data));
};
```

### Buenas Prácticas
✅ **Haz:**
- Validación en backend (SIEMPRE)
- Validación en frontend (UX mejorada)
- Validaciones específicas (min length, formato, etc.)
- Error messages claros al usuario

❌ **Evita:**
- Confiar solo en validación frontend
- No escapar datos en HTML (XSS)
- Mensajes genéricos ("Error")
- Aceptar tipos inesperados

---

## 🚨 CORS (Cross-Origin)

### Backend

```python
# settings.py
CORS_ORIGIN_ALLOW_ALL = True  # ⚠️ SOLO DESARROLLO

# Producción:
CORS_ALLOWED_ORIGINS = [
    'https://gestion.snabbit.cl',
    'https://admin.snabbit.cl',
]

CORS_ALLOW_CREDENTIALS = True  # Para cookies
```

### Frontend

**Axios incluye credenciales:**
```typescript
axiosInstance.defaults.withCredentials = true;
```

### Buenas Prácticas
✅ **Haz:**
- Listar dominios específicos (no `*`)
- Usar HTTPS en producción
- `CORS_ALLOW_CREDENTIALS = True` si usas cookies

❌ **Evita:**
- `CORS_ORIGIN_ALLOW_ALL = True` en producción
- No validar origen

---

## 🔗 SQL Injection Prevention

### Django ORM (Safe by default)

```python
# ✅ SEGURO - usa ORM
users = User.objects.filter(email=user_email)

# ❌ INSEGURO - evita raw SQL
# users = User.objects.raw(f"SELECT * FROM cuentas_user WHERE email = '{user_email}'")
```

### DRF Serializers (Safe by default)

```python
# ✅ SEGURO - validación automática
serializer = UserSerializer(data=request.data)
if serializer.is_valid():
    user = serializer.save()

# ❌ INSEGURO - crear sin validación
user = User.objects.create(email=request.data['email'])
```

### Buenas Prácticas
✅ **Haz:**
- Django ORM siempre
- Parameterized queries si usas raw SQL

❌ **Evita:**
- String formatting en SQL (`f"SELECT ... WHERE id = {id}"`)
- Raw SQL sin parametrización

---

## 🚫 XSS (Cross-Site Scripting)

### Frontend

```typescript
// ❌ INSEGURO - innerHTML puede ejecutar scripts
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// ✅ SEGURO - React escapa automáticamente
<div>{userInput}</div>

// ❌ INSEGURO
<img src={`javascript:alert('xss')`} />

// ✅ SEGURO - validar URLs
const isSafeUrl = (url: string) => {
  return url.startsWith('http://') || url.startsWith('https://');
};
<img src={isSafeUrl(url) ? url : '/placeholder.png'} />
```

### Backend

```python
# ❌ INSEGURO
response = f"<h1>Bienvenido {user_name}</h1>"

# ✅ SEGURO - Django templates escapan automáticamente
from django.template import Template, Context
template = Template("Bienvenido {{ user_name }}")
response = template.render(Context({'user_name': user_name}))
```

### Buenas Prácticas
✅ **Haz:**
- Escapar datos del usuario
- Usar template engines (Django, React)
- Content Security Policy headers

❌ **Evita:**
- `dangerouslySetInnerHTML`
- Insertar datos del usuario directamente en HTML
- Confiar en usuarios para no ejecutar código

---

## 📝 Auditoría (Logging)

### Backend

```python
# Simple History auditará cambios en modelos
from simple_history.models import HistoricalRecords

class OrdenTrabajo(models.Model):
    history = HistoricalRecords()

# Consultar cambios
ot = OrdenTrabajo.objects.get(id=1)
for change in ot.history.all():
    print(f"{change.history_user} cambió a {change.history_date}")
```

**Logs:**
```python
import logging

logger = logging.getLogger(__name__)

# En sensibles actions
logger.info(f"Usuario {user.email} creó OT {ot.id}")
logger.warning(f"Intento de acceso no autorizado a {resource}")
```

### Frontend

```typescript
// Logs simples (não envíes data sensible)
console.log(`User ${userId} navigated to /ordenes`);

// Enviar eventos a servidor si es crítico
import AnalyticsService from '@/services/AnalyticsService';
AnalyticsService.logEvent('orden_completada', { orderId: 123 });
```

---

## 🔗 Referencias

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Django Security](https://docs.djangoproject.com/en/5.1/topics/security/)
- [DRF Authentication](https://www.django-rest-framework.org/api-guide/authentication/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)

**Última actualización:** 2025-12-28

