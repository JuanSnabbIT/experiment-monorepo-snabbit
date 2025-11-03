---
title: "Instrucciones Backend (Django)"
scope: "backend"
status: "active"
last_updated: "2025-11-03"
---

# Instrucciones Backend (Django)

## Objetivo
Guiar el desarrollo, mantenimiento y revisión de código Python en el backend Django del ERP. Aplicable a desarrolladores humanos y agentes IA. Centraliza reglas sobre modelos, serializers, vistas, permisos, tareas asíncronas (Celery) y tiempo real (Channels).

## Reglas clave

### 1. Arquitectura y estructura
- **Apps por dominio**: cada módulo de negocio (`bodegas`, `cuentas`, `cotizaciones`, etc.) es una app Django independiente con `models.py`, `serializers.py`, `views.py`, `urls.py`, `tasks.py` (Celery), `signals.py` (si aplica).
- **Proyecto principal**: `sw_erp/` contiene `settings.py`, `celery.py`, `asgi.py`, `urls.py` (raíz).
- **No acoplar lógica entre apps**: usar servicios compartidos o señales cuando sea necesario; evitar imports circulares.

### 2. Modelos
- **Docstrings obligatorios**: describir propósito, relaciones clave y restricciones.
- **`verbose_name` y `ordering`**: definir en `class Meta` para claridad en admin y queries.
- **Constraints**: usar `UniqueConstraint`, `CheckConstraint` para integridad de datos.
- **Managers personalizados**: centralizar queries reutilizables (`objects`, `active`, etc.).
- Ejemplo:
  ```python
  class Producto(models.Model):
      """Representa un producto físico o servicio del ERP."""
      nombre = models.CharField(max_length=200, verbose_name="Nombre")
      activo = models.BooleanField(default=True)
  
      class Meta:
          verbose_name = "Producto"
          verbose_name_plural = "Productos"
          ordering = ["nombre"]
  ```

### 3. Serializers
- **`ModelSerializer` por defecto**: para recursos CRUD habituales.
- **Validaciones**: usar `validate_<field>` y `validate` para reglas complejas; delegar lógica de negocio a servicios externos cuando sea pesada.
- **`to_representation` con criterio**: evitar lógica pesada; usar para transformaciones simples.
- **Tipado en docstrings**: mencionar campos clave y validaciones no obvias.

### 4. Vistas y ViewSets
- **`ViewSet`/`ModelViewSet`**: para recursos RESTful; `APIView` para casos especiales.
- **Permisos explícitos**: definir `permission_classes = [IsAuthenticated]` (por defecto) o `AllowAny` con justificación.
- **`filter_backends`, `search_fields`, `ordering_fields`**: habilitar filtros y búsquedas donde aplique.
- **Paginación**: activada globalmente; personalizar si es necesario.
- Ejemplo:
  ```python
  from rest_framework.viewsets import ModelViewSet
  from rest_framework.permissions import IsAuthenticated
  
  class ProductoViewSet(ModelViewSet):
      queryset = Producto.objects.all()
      serializer_class = ProductoSerializer
      permission_classes = [IsAuthenticated]
      search_fields = ['nombre', 'codigo']
      ordering_fields = ['nombre', 'created_at']
  ```

### 5. Autenticación y permisos

#### Configuración y ubicación
- **Middleware**: `django.contrib.auth.middleware.AuthenticationMiddleware` habilita `request.user`/`request.session`.
- **DRF**: En `sw_erp/settings.py` bajo `REST_FRAMEWORK`:
  ```python
  REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
      'rest_framework_simplejwt.authentication.JWTAuthentication',
      'rest_framework.authentication.TokenAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
      'rest_framework.permissions.IsAuthenticated',
    ],
  }
  ```

#### Endpoints de autenticación
- **Djoser**: expone bajo `/auth/`:
  - `/auth/jwt/create` - login, devuelve `access` y `refresh`
  - `/auth/jwt/refresh` - renueva `access` con `refresh`
  - `/auth/jwt/verify` - valida token
  - Campo de login: `email` (configurado en `DJOSER['LOGIN_FIELD']`)

#### Configuración JWT
```python
SIMPLE_JWT = {
  'ACCESS_TOKEN_LIFETIME': timedelta(hours=5),
  'REFRESH_TOKEN_LIFETIME': timedelta(hours=10),
  'ROTATE_REFRESH_TOKENS': True,
  'BLACKLIST_AFTER_ROTATION': True,
  'ALGORITHM': 'HS256',
  'SIGNING_KEY': SECRET_KEY,
  'AUTH_HEADER_TYPES': ('Bearer',),
}
```

#### Permisos por vista
- **Global**: `IsAuthenticated` por defecto en todos los endpoints `/api/`.
- **Público**: marcar explícitamente con `AllowAny` (documentar justificación).
- **Personalizado**: heredar de `BasePermission` para lógica basada en grupos/roles.

Ejemplos:
```python
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
from rest_framework.viewsets import ModelViewSet

class ProductoViewSet(ModelViewSet):
    queryset = Producto.objects.all()
    serializer_class = ProductoSerializer
    permission_classes = [IsAuthenticated]  # por defecto

class ReportePublicoView(APIView):
    permission_classes = [AllowAny]  # justificar en código
    def get(self, request):
        return Response({"status": "ok"})
```

#### Permisos basados en roles/grupos
```python
from rest_framework.permissions import BasePermission

class IsBodeguero(BasePermission):
    message = "Se requiere rol bodeguero"
    
    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and 
                   user.groups.filter(name="bodeguero").exists())

class MovimientoInventarioViewSet(ModelViewSet):
    permission_classes = [IsAuthenticated, IsBodeguero]
```

#### Permisos de modelo/acción
```python
from rest_framework.exceptions import PermissionDenied

class EmpresaViewSet(ModelViewSet):
    def perform_destroy(self, instance):
        if not self.request.user.has_perm('empresas.delete_empresa'):
            raise PermissionDenied("No tienes permiso para eliminar empresas")
        return super().perform_destroy(instance)
```

#### Flujo de autenticación
1. **Login**: frontend → `/auth/jwt/create` → backend devuelve `{access, refresh}`
2. **Autorización**: frontend envía `Authorization: Bearer <access>` en cada request
3. **Refresh**: al expirar `access`, frontend → `/auth/jwt/refresh` con `refresh` → nuevo `access`
4. **Revocación**: `ROTATE_REFRESH_TOKENS=True` + `BLACKLIST_AFTER_ROTATION=True` invalida refresh tokens usados

#### Limitaciones actuales y mejoras
- **Lifetimes largos**: reducir en producción (access 15-60 min, refresh 7-30 días)
- **Firma simétrica HS256**: considerar RS256 con gestión de claves para microservicios
- **Sin scopes JWT**: granularidad depende de permisos Django/grupos
- **`TokenAuthentication` habilitado**: revisar si es necesario (superficie adicional)
- **Throttling**: implementar en endpoints sensibles (login, registro, reset password)

Ver [security.md](./security.md) para detalles sobre rotación de claves y auditoría.

### 6. Celery (tareas asíncronas)
- **`@shared_task`**: para tareas en segundo plano (envío de correos, procesamiento de archivos, reportes).
- **Ubicación**: `<app>/tasks.py`; autodiscovery configurado en `sw_erp/celery.py`.
- **Idempotencia y reintentos**: diseñar tareas idempotentes; configurar `autoretry_for` y `retry_kwargs`.
- **Programación**: usar `django-celery-beat` para tareas periódicas (`beat_schedule` en `celery.py`).
- Ejemplo:
  ```python
  from celery import shared_task
  
  @shared_task(bind=True, autoretry_for=(Exception,), retry_kwargs={'max_retries': 3})
  def procesar_contrato(self, contrato_id):
      """Procesa un contrato en segundo plano."""
      # Lógica de negocio
  ```

### 7. Channels (tiempo real)
- **WebSockets con Daphne**: configurar `consumers.py` por app; registrar rutas en `sw_erp/asgi.py`.
- **Redis como capa de canales**: validar `CHANNEL_LAYERS` en `settings.py`.
- **Autenticación en websockets**: validar JWT o sesión en `connect()`.
- Ejemplo mínimo:
  ```python
  from channels.generic.websocket import AsyncWebsocketConsumer
  
  class NotificacionConsumer(AsyncWebsocketConsumer):
      async def connect(self):
          # Validar autenticación
          await self.accept()
  ```

## Checklist de desarrollo

- [ ] Modelo define `verbose_name`, `ordering` y constraints relevantes.
- [ ] Serializer valida entradas; lógica pesada delegada a servicios.
- [ ] Vista/ViewSet declara `permission_classes` y `authentication_classes` explícitos.
- [ ] Endpoints bajo `/api/`; autenticación bajo `/auth/`.
- [ ] Tests cubren: creación, validaciones, permisos (200/401/403), y casos edge.
- [ ] Migraciones generadas y revisadas; no reescribir migraciones compartidas.
- [ ] Tareas Celery idempotentes; documentan reintentos y efectos secundarios.
- [ ] Código sigue PEP 8; linters (`ruff`/`flake8`) pasan sin errores.

## Comandos de desarrollo

### Migraciones
```cmd
REM Generar migraciones
backend\ENV\Scripts\python.exe manage.py makemigrations

REM Aplicar migraciones
backend\ENV\Scripts\python.exe manage.py migrate

REM Ver migraciones pendientes
backend\ENV\Scripts\python.exe manage.py showmigrations
```

### Tests
```cmd
REM Ejecutar todos los tests
backend\ENV\Scripts\python.exe manage.py test

REM Tests de una app específica
backend\ENV\Scripts\python.exe manage.py test bodegas

REM Tests de un módulo específico
backend\ENV\Scripts\python.exe manage.py test bodegas.tests.test_models
```

### Celery
```cmd
REM Worker
backend\ENV\Scripts\python.exe -m celery -A sw_erp worker --loglevel=info

REM Beat (scheduler)
backend\ENV\Scripts\python.exe -m celery -A sw_erp beat --loglevel=info
```

### Docker (despliegue)
```cmd
REM Build de imagen backend
cd backend
docker build -t contenedores.snabbit.cl/erp_snabbit:backend-VERSION .

REM Ejecutar migraciones en contenedor
docker run --rm -e DATABASE_URL=%DB_URL% contenedores.snabbit.cl/erp_snabbit:backend-VERSION python manage.py migrate

REM Ejecutar contenedor local
docker run --rm -e REDIS_HOST=redis -p 8000:8000 contenedores.snabbit.cl/erp_snabbit:backend-VERSION
```

## Referencias cruzadas
- [Frontend (React)](./frontend-instructions.md): integración con APIs.
- [Seguridad](./security.md): JWT, CORS/CSRF, validaciones.
- [Testing](./testing.md): estrategias de tests backend.
- [Performance](./performance.md): optimización de queries (N+1, índices).
- [Observabilidad](./observability.md): logging, métricas, health checks.

---
