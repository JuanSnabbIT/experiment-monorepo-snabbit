# Backend Guide - Monorepo ERP

Convenciones, patrones y estándares para desarrollo backend en Django + DRF.

---

## 1. Stack Backend

| Herramienta | Versión | Propósito |
|------------|---------|----------|
| Django | 5.1.x | Framework web |
| Django REST Framework | 3.15.x | API REST |
| Djoser | 2.2.x | Auth endpoints |
| SimpleJWT | 5.x | JWT tokens |
| Celery | 5.2.x | Task queue |
| Redis | 7.x | Message broker + caché |
| django-simple-history | 3.x | Auditoría de cambios |
| django-filter | 24.x | Filtrado de querysets |
| PostgreSQL / SQLite | - | Base de datos |

---

## 2. Estructura de Apps

```
backend/
├── sw_erp/                    # Configuración Django
│   ├── settings.py            # Config REST_FRAMEWORK, DATABASES, CELERY
│   ├── urls.py                # Router principal
│   ├── celery.py              # Config Celery
│   └── asgi.py                # ASGI para WebSockets
│
├── core/                      # App base (multi-tenancy, auditoría)
│   ├── models.py              # PersonalizacionUsuario, ModeloBaseHistorico
│   ├── serializers.py         # Serializadores base
│   ├── views.py               # PersonalizacionUsuarioViewSet, SoftwareViewSet
│   ├── email.py               # Funciones de email
│   ├── tasks.py               # Tareas Celery
│   ├── signals.py             # Signals de Django
│   ├── filters.py             # Filtros DRF
│   ├── managers.py            # QuerySet managers
│   ├── indicators.py          # KPIs y métricas
│   └── migrations/
│
├── cuentas/                   # Autenticación
│   ├── models.py              # User (AbstractUser)
│   ├── serializers.py         # UserSerializer, ActivationSerializer
│   ├── views.py               # UserViewSet, activate_account (AllowAny)
│   ├── functions.py           # obtener_usuario_empresa()
│   └── migrations/
│
├── empresas/                  # Estructura multi-empresa
│   ├── models.py              # Empresa, SucursalEmpresa, UsuarioEmpresa
│   ├── serializers.py         # EmpresaSerializer, UsuarioEmpresaSerializer
│   ├── views.py               # EmpresaViewSet, UsuarioEmpresaViewSet
│   └── migrations/
│
├── items/                     # Catálogo de productos
│   ├── models.py              # Categoria, Fabricante, Item, ItemEmpresa
│   ├── serializers.py         # ItemSerializer, ItemEmpresaSerializer
│   ├── views.py               # CategoriaViewSet, ItemEmpresaViewset
│   ├── filters.py             # Filtros por empresa
│   └── migrations/
│
├── bodegas/                   # Inventario y compras
│   ├── models.py              # Bodega, StockItemEnBodega, OrdenCompra, GuiaSalida
│   ├── serializers.py         # BodegaSerializer, GuiaSalidaSerializer
│   ├── views.py               # BodegaViewSet, OrdenCompraViewSet (IsAuthenticated)
│   ├── movimientos.py         # registrar_entrada(), registrar_salida()
│   ├── signals.py             # Auto-actualizar stock
│   ├── estados_modelo.py      # Estados de guía
│   ├── functions.py           # Funciones helper
│   └── migrations/
│
├── cotizaciones/              # Presupuestos
│   ├── models.py              # Cotizacion, ItemCotizacion, SolicitanteCotizacion
│   ├── serializers.py         # CotizacionSerializer
│   ├── views.py               # CotizacionViewSet, endpoint público
│   ├── tasks.py               # Tareas async (actualizar tipo cambio)
│   └── migrations/
│
├── ordentrabajov2/            # ⚠️ VERSIÓN ACTIVA
│   ├── models.py              # OrdenDeTrabajo, SoporteTecnico, ServicioEnOT
│   ├── serializers.py         # OrdenDeTrabajoSerializer
│   ├── views.py               # OrdenDeTrabajoViewSet (IsAuthenticated)
│   ├── estados_modelo.py      # Estados: pendiente, en_proceso, completada, cerrada, facturada
│   ├── filters.py             # Filtros por estado, empresa
│   └── migrations/
│
├── ordentrabajo/              # ❌ VERSIÓN ANTIGUA - DESACTIVADA
│   └── ...
│
├── rendiciones/               # Rendición de gastos
│   ├── models.py              # Rendicion, ItemRendicion
│   ├── serializers.py         # RendicionSerializer
│   ├── views.py               # RendicionViewSet
│   └── migrations/
│
├── contratos/                 # Contratos y licencias
│   ├── models.py              # ContratoEmpresaCliente, Licencia, Servicio, CondicionEspecial
│   ├── serializers.py         # ContratoSerializer, LicenciaSerializer
│   ├── views.py               # ContratoEmpresaClienteViewSet, LicenciaViewSet
│   ├── funciones.py           # generar_contrato_en_memoria()
│   ├── signals.py             # Auto-generar PDFs
│   ├── tareas_2do_plano.py    # Celery tasks
│   ├── estados_modelo.py      # Estados de contrato
│   └── migrations/
│
├── visitas/                   # Visitas de soporte
│   ├── models.py              # VisitaSoporte, AsistenciaUsuario, EntregaDeEquipo
│   ├── serializers.py         # VisitaSoporteSerializer
│   ├── views.py               # VisitaSoporteViewSet (filtra por empresa)
│   └── migrations/
│
├── recursos/                  # Equipos y recursos
│   ├── models.py              # Equipo, UsuarioEquipo, Software, SoftwareDeEmpresa
│   ├── serializers.py         # EquipoSerializer, SoftwareSerializer
│   ├── views.py               # EquipoViewSet, SoftwareDeEmpresaViewSet
│   ├── signals.py             # Sincronización de equipos
│   └── migrations/
│
├── calendario/                # Calendario
│   ├── models.py              # DiasCalendario
│   ├── serializers.py         # DiasCalendarioSerializer
│   ├── views.py               # DiasCalendarioViewSet
│   └── migrations/
│
├── vacaciones/                # Vacaciones
│   ├── models.py              # SolicitudVacaciones
│   ├── serializers.py         # SolicitudVacacionesSerializer
│   ├── views.py               # SolicitudVacacionesViewSet
│   └── migrations/
│
├── retroalimentacion/         # Feedback público
│   ├── models.py              # Retroalimentacion, RetroalimentacionAplicada, LogDeAcceso
│   ├── serializers.py         # RetroalimentacionSerializer
│   ├── views.py               # RetroalimentacionPorTokenView (AllowAny)
│   └── migrations/
│
├── manage.py
├── requirements.txt
└── entrypoint.sh
```

---

## 3. Modelos Django

### 3.1 Clase Base: ModeloBaseHistorico

**Ubicación:** `backend/core/models.py`

```python
from django.db import models
from django.contrib.auth import get_user_model
from simple_history.models import HistoricalRecords

User = get_user_model()

class ModeloBaseHistorico(models.Model):
    """
    Clase abstracta que proporciona auditoría automática.
    Todos los modelos que necesiten tracking heredan de esta.
    """
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='%(class)s_created',
        null=True,
        blank=True
    )
    updated_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='%(class)s_updated',
        null=True,
        blank=True
    )
    
    # Tracking automático de cambios
    history = HistoricalRecords()

    class Meta:
        abstract = True
```

**Uso:**
```python
class OrdenDeTrabajo(ModeloBaseHistorico):
    numero = CharField(max_length=50, unique=True)
    empresa = ForeignKey(Empresa, on_delete=models.PROTECT)
    # ...
    
    class Meta:
        db_table = 'ordenes_de_trabajo'
```

### 3.2 Multi-tenancy: PersonalizacionUsuario

**Ubicación:** `backend/core/models.py`

```python
class PersonalizacionUsuario(models.Model):
    """
    Vínculo entre Usuario y su Sucursal principal.
    OBLIGATORIO para cada usuario del sistema.
    
    Uso en ViewSets:
        personalizacion = PersonalizacionUsuario.objects.filter(usuario=user).first()
        empresa = personalizacion.sucursal_principal.empresa
    """
    usuario = models.OneToOneField(User, on_delete=models.CASCADE)
    sucursal_principal = models.ForeignKey(SucursalEmpresa, on_delete=models.PROTECT)
    
    class Meta:
        db_table = 'personalizacion_usuario'
        verbose_name = 'Personalización Usuario'
        verbose_name_plural = 'Personalizaciones Usuario'
```

---

## 4. ViewSets - Convenciones Obligatorias

### 4.1 Patrón Base

```python
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from core.models import PersonalizacionUsuario

class MiViewSet(viewsets.ModelViewSet):
    """
    ViewSet para Mi Modelo.
    
    - GET /api/mi_modelo/              # Listar (filtrado por empresa)
    - POST /api/mi_modelo/             # Crear
    - PATCH /api/mi_modelo/{id}/       # Actualizar
    - DELETE /api/mi_modelo/{id}/      # Eliminar
    """
    
    # ⚠️ OBLIGATORIOS
    queryset = MiModelo.objects.all()
    serializer_class = MiModeloSerializer
    permission_classes = [permissions.IsAuthenticated]  # ← EXPLÍCITO, NUNCA OMITIR
    
    # Opcionales
    filterset_class = MiModeloFilter
    filter_backends = [DjangoFilterBackend]
    ordering_fields = ['id', 'created_at']
    
    def get_queryset(self):
        """
        PATRÓN OBLIGATORIO: Filtrar por empresa del usuario.
        Si no se implementa: FUGA DE DATOS.
        """
        user = self.request.user
        personalizacion = PersonalizacionUsuario.objects.filter(usuario=user).first()
        
        if personalizacion and personalizacion.sucursal_principal:
            return MiModelo.objects.filter(
                empresa=personalizacion.sucursal_principal.empresa
            )
        
        # CRÍTICO: Retornar none(), no []
        return MiModelo.objects.none()
    
    def perform_create(self, serializer):
        """Hook para agregar lógica antes de guardar."""
        serializer.save(created_by=self.request.user)
    
    def perform_update(self, serializer):
        """Hook para actualizar usuario que modificó."""
        serializer.save(updated_by=self.request.user)
    
    @action(detail=True, methods=['patch'], permission_classes=[permissions.IsAuthenticated])
    def activar(self, request, pk=None):
        """Acción personalizada."""
        obj = self.get_object()
        obj.estado = True
        obj.save()
        return Response({'detail': 'Activado'})
```

### 4.2 Permisos

**REGLA CRÍTICA:** `DEFAULT_PERMISSION_CLASSES = [AllowAny]` en settings.

Cada ViewSet DEBE definir `permission_classes` explícitamente:

```python
from rest_framework.permissions import (
    AllowAny,
    IsAuthenticated,
    IsAdminUser,
    IsAuthenticatedOrReadOnly,
)

# Autenticación requerida
class OrdenDeTrabajoViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]

# Acceso público (feedback, cotización)
class RetroalimentacionPorTokenView(generics.RetrieveUpdateAPIView):
    permission_classes = [AllowAny]

# Mixto: Lectura pública, escritura autenticada
class CotizacionPublicaViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticatedOrReadOnly]
```

### 4.3 Auditoría de Seguridad - Estado Actual

**CRÍTICO:** Los siguientes ViewSets **NO TIENEN** `permission_classes` definido:

| App | ViewSet | Riesgo |
|-----|---------|--------|
| **items** | `CategoriaViewSet` | 🔴 Acceso público a catálogo |
| **items** | `FabricanteViewSet` | 🔴 Acceso público a fabricantes |
| **contratos** | `ServicioViewSet` | 🔴 Acceso público a servicios |
| **contratos** | `PlanServicioViewSet` | 🔴 Acceso público a planes |
| **contratos** | `CaracteristicaServicioViewSet` | 🔴 Acceso público a características |
| **contratos** | `VisitaViewSet` | 🔴 Acceso público a plantilla de visitas |
| **contratos** | `LicenciaViewSet` | 🔴 Acceso público a licencias (SIN multi-tenancy) |
| **contratos** | `CondicionEspecialViewSet` | 🔴 Acceso público a condiciones |
| **core** | `SoftwareViewSet` | 🔴 Acceso público a catálogo software |
| **core** | `AcuerdoConfidencialidadBaseViewSet` | 🔴 Acceso público a acuerdos |
| **visitas** | `AsistenciaUsuarioViewSet` | ⚠️ Sin filtro multi-tenancy claro |
| **visitas** | `EntregaDeEquipoViewSet` | ⚠️ Sin filtro multi-tenancy claro |
| **recursos** | `SoftwareInstaladoViewSet` | ⚠️ Sin permission_classes, sin filtro |
| **recursos** | `MonitorEquipoViewSet` | ⚠️ Sin permission_classes |
| **recursos** | `UsuarioEquipoViewSet` | ⚠️ Sin permission_classes |
| **recursos** | `AlmacenamientoEquipoViewSet` | ⚠️ Sin permission_classes |
| **recursos** | `FotoEquipoViewSet` | ⚠️ Sin permission_classes |
| **cuentas** | `UserViewSet` | ⚠️ Sin permission_classes (verificar) |

**VER RISKLOG.md para vulnerabilidades documentadas.**

---

## 5. Filtros

### 5.1 DjangoFilterBackend

```python
from django_filters import rest_framework as filters
from django_filters import FilterSet, CharFilter, DateFromToRangeFilter

class OrdenDeTrabajoFilter(FilterSet):
    numero = CharFilter(field_name='numero', lookup_expr='icontains')
    fecha = DateFromToRangeFilter(field_name='created_at')
    
    class Meta:
        model = OrdenDeTrabajo
        fields = ['estado', 'empresa', 'numero']

class OrdenDeTrabajoViewSet(viewsets.ModelViewSet):
    queryset = OrdenDeTrabajo.objects.all()
    serializer_class = OrdenDeTrabajoSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_class = OrdenDeTrabajoFilter
    filter_backends = [DjangoFilterBackend]
    ordering_fields = ['created_at', 'numero']
```

**URL:**
```
GET /api/ordenes/?estado=pendiente&numero=OT-001
```

---

## 6. Serializers

### 6.1 Patrón Base

```python
from rest_framework import serializers
from .models import OrdenDeTrabajo, ServicioEnOT

class ServicioEnOTSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServicioEnOT
        fields = ['id', 'nombre', 'costo']

class OrdenDeTrabajoSerializer(serializers.ModelSerializer):
    # Relación anidada (lectura)
    servicios = ServicioEnOTSerializer(
        source='servicios_en_ot',
        many=True,
        read_only=True
    )
    
    # Campo computado
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    
    # Validador personalizado
    def validate_numero(self, value):
        if not value.startswith('OT-'):
            raise serializers.ValidationError("Número debe empezar con OT-")
        return value
    
    class Meta:
        model = OrdenDeTrabajo
        fields = [
            'id', 'numero', 'estado', 'estado_display', 'empresa',
            'descripcion', 'servicios', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
```

### 6.2 Validadores

```python
class OrdenDeTrabajoSerializer(serializers.ModelSerializer):
    def validate(self, data):
        """Validación a nivel de objeto (múltiples campos)."""
        if data['estado'] == 'facturada' and not data.get('fecha_facturacion'):
            raise serializers.ValidationError(
                {'fecha_facturacion': 'Requerida si estado es facturada'}
            )
        return data
```

---

## 7. Señales (Signals)

### 7.1 Patrón

```python
# backend/bodegas/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import MovimientoStock, StockItemEnBodega

@receiver(post_save, sender=MovimientoStock)
def actualizar_stock_en_bodega(sender, instance, created, **kwargs):
    """
    Cuando se crea un MovimientoStock, actualizar StockItemEnBodega.
    """
    if created:
        stock, _ = StockItemEnBodega.objects.get_or_create(
            bodega=instance.bodega,
            item=instance.item
        )
        
        if instance.tipo == 'entrada':
            stock.cantidad += instance.cantidad
        elif instance.tipo == 'salida':
            stock.cantidad -= instance.cantidad
        
        stock.save()

# En apps.py
class BodegasConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'bodegas'
    
    def ready(self):
        import bodegas.signals  # Registrar signals
```

---

## 8. Tareas Asincrónicas (Celery)

### 8.1 Configuración

**Ubicación:** `backend/sw_erp/celery.py`

```python
import os
from celery import Celery
from celery.schedules import crontab

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sw_erp.settings')

app = Celery('sw_erp')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

app.conf.beat_schedule = {
    'actualizar-tipo-cambio-cotizaciones': {
        'task': 'cotizaciones.tasks.actualizar_tipo_cambio_cotizacion',
        'schedule': crontab(hour=9, minute=0),  # 9 AM diario
    },
}
```

### 8.2 Task

```python
# backend/cotizaciones/tasks.py
from celery import shared_task

@shared_task
def actualizar_tipo_cambio_cotizacion(cotizacion_id):
    """
    Actualiza el tipo de cambio de una cotización.
    Ejecutable desde celery beat (automático) o desde view.
    """
    from .models import Cotizacion
    from datetime import datetime
    
    try:
        cotizacion = Cotizacion.objects.get(id=cotizacion_id)
        # Lógica de actualización...
        cotizacion.save()
        return f"Cotización {cotizacion.numero} actualizada"
    except Cotizacion.DoesNotExist:
        return f"Cotización {cotizacion_id} no encontrada"
```

**Uso en ViewSet:**

```python
from cotizaciones.tasks import actualizar_tipo_cambio_cotizacion

class CotizacionViewSet(viewsets.ModelViewSet):
    @action(detail=True, methods=['post'])
    def actualizar_cambio(self, request, pk=None):
        cotizacion = self.get_object()
        # Ejecutar async
        actualizar_tipo_cambio_cotizacion.delay(cotizacion.id)
        return Response({'detail': 'Actualización en progreso'})
```

---

## 9. URLs y Rutas

### 9.1 Router de DRF

```python
# backend/sw_erp/urls.py
from rest_framework.routers import DefaultRouter
from cuentas.views import UserViewSet
from empresas.views import EmpresaViewSet, SucursalEmpresaViewSet
from ordentrabajov2.views import OrdenDeTrabajoViewSet, SoporteTecnicoViewSet
from bodegas.views import BodegaViewSet, StockItemEnBodegaViewSet

router = DefaultRouter()

# Rutas principales
router.register(r'users', UserViewSet, basename='user')
router.register(r'empresas', EmpresaViewSet, basename='empresa')
router.register(r'ordenes', OrdenDeTrabajoViewSet, basename='orden')
router.register(r'bodegas', BodegaViewSet, basename='bodega')

# Rutas anidadas (nested)
# /api/empresas/{empresa_pk}/sucursales/
empresas_router = SimpleRouter()
empresas_router.register(r'sucursales', SucursalEmpresaViewSet, basename='empresa-sucursales')
router.registry.extend(empresas_router.registry)

urlpatterns = [
    path('api/', include(router.urls)),
    path('api/auth/', include('djoser.urls.jwt')),
    path('api/public/cotizacion/<uuid:token>/', cotizacion_public_view, name='cotizacion-public'),
]
```

---

## 10. Bodegas - Movimientos de Stock

### 10.1 Funciones de Movimiento

**Ubicación:** `backend/bodegas/movimientos.py`

```python
from django.db import transaction
from .models import StockItemEnBodega, MovimientoStock

def registrar_entrada(bodega, item, cantidad, motivo=''):
    """
    Incrementa el stock en una bodega.
    
    Args:
        bodega: Instancia de Bodega
        item: Instancia de Item
        cantidad: Cantidad a sumar (DELTA, no saldo absoluto)
        motivo: Razón del movimiento (opcional)
    """
    with transaction.atomic():
        stock, created = StockItemEnBodega.objects.get_or_create(
            bodega=bodega,
            item=item,
            defaults={'cantidad': 0}
        )
        
        stock.cantidad += cantidad
        stock.save()
        
        # Registrar en historial
        MovimientoStock.objects.create(
            bodega=bodega,
            item=item,
            tipo='entrada',
            cantidad=cantidad,
            motivo=motivo
        )
        
        return stock

def registrar_salida(bodega, item, cantidad, motivo=''):
    """
    Decrementa el stock en una bodega.
    
    Args:
        bodega: Instancia de Bodega
        item: Instancia de Item
        cantidad: Cantidad a restar (DELTA)
        motivo: Razón del movimiento
        
    Raises:
        ValueError: Si cantidad > stock disponible
    """
    with transaction.atomic():
        stock = StockItemEnBodega.objects.filter(
            bodega=bodega,
            item=item
        ).first()
        
        if not stock or stock.cantidad < cantidad:
            raise ValueError(f"Stock insuficiente. Disponible: {stock.cantidad if stock else 0}")
        
        stock.cantidad -= cantidad
        stock.save()
        
        MovimientoStock.objects.create(
            bodega=bodega,
            item=item,
            tipo='salida',
            cantidad=cantidad,
            motivo=motivo
        )
        
        return stock
```

**Uso en ViewSet:**

```python
from bodegas.movimientos import registrar_salida

class GuiaSalidaViewSet(viewsets.ModelViewSet):
    def perform_create(self, serializer):
        guia = serializer.save()
        
        # Registrar salida en bodega
        for item_data in self.request.data.get('items', []):
            registrar_salida(
                bodega=guia.bodega,
                item_id=item_data['item_id'],
                cantidad=item_data['cantidad'],
                motivo='Guía de salida'
            )
```

---

## 11. Estados de Modelos

### 11.1 Estados: OrdenDeTrabajo

**Archivo:** `backend/ordentrabajov2/estados_modelo.py`

```python
class EstadosOrdenDeTrabajo(models.TextChoices):
    PENDIENTE = 'pendiente', 'Pendiente'
    EN_PROCESO = 'en_proceso', 'En Proceso'
    COMPLETADA = 'completada', 'Completada'
    CERRADA = 'cerrada', 'Cerrada'
    FACTURADA = 'facturada', 'Facturada'

class OrdenDeTrabajo(ModeloBaseHistorico):
    estado = models.CharField(
        max_length=20,
        choices=EstadosOrdenDeTrabajo.choices,
        default=EstadosOrdenDeTrabajo.PENDIENTE
    )
    
    def puede_pasar_a(self, nuevo_estado):
        """Validar transiciones de estado permitidas."""
        transiciones_validas = {
            'pendiente': ['en_proceso'],
            'en_proceso': ['completada', 'pendiente'],
            'completada': ['cerrada'],
            'cerrada': ['facturada'],
            'facturada': []
        }
        return nuevo_estado in transiciones_validas.get(self.estado, [])
```

---

## 12. Configuración Django (settings.py)

### 12.1 REST Framework

```python
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.AllowAny",  # ⚠️ Ver párrafo 4.2
    ],
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
    "DEFAULT_PARSER_CLASSES": [
        "rest_framework.parsers.JSONParser",
    ],
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
    ],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 50,
}
```

### 12.2 SimpleJWT

```python
from datetime import timedelta

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=5),
    "REFRESH_TOKEN_LIFETIME": timedelta(hours=10),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "ALGORITHM": "HS256",
}
```

### 12.3 Djoser

```python
DJOSER = {
    "PASSWORD_RESET_CONFIRM_URL": "password/reset/confirm/{uid}/{token}/",
    "USERNAME_RESET_CONFIRM_URL": "username/reset/confirm/{uid}/{token}/",
    "ACTIVATION_URL": "activate/{uid}/{token}/",
    "SEND_ACTIVATION_EMAIL": True,
    "SEND_CONFIRMATION_EMAIL": True,
    "PASSWORD_CHANGED_EMAIL_CONFIRMATION": True,
    "USER_CREATE_PASSWORD_RETYPE": True,
    "SET_PASSWORD_RETYPE": True,
}
```

---

## 13. Migraciones

### 13.1 Crear Migraciones

```bash
python manage.py makemigrations [app]       # Crear migraciones
python manage.py migrate                    # Aplicar migraciones
python manage.py migrate [app] [number]     # Ir a migración específica
```

### 13.2 Workflow

1. **Modificar modelo:**
   ```python
   class OrdenDeTrabajo(Model):
       nueva_campo = CharField(null=True)  # Nuevo campo
   ```

2. **Crear migración:**
   ```bash
   python manage.py makemigrations ordentrabajov2
   ```

3. **Revisar migración generada:**
   ```bash
   cat backend/ordentrabajov2/migrations/0123_*.py
   ```

4. **Aplicar:**
   ```bash
   python manage.py migrate
   ```

---

## 14. Testing

### 14.1 Estructura

```
backend/
├── app/
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── test_models.py
│   │   ├── test_views.py
│   │   ├── test_serializers.py
│   │   └── test_signals.py
```

### 14.2 Ejemplo Test ViewSet

```python
# backend/ordentrabajov2/tests/test_views.py
from django.test import TestCase
from rest_framework.test import APITestCase, APIClient
from django.contrib.auth import get_user_model
from .models import OrdenDeTrabajo

User = get_user_model()

class OrdenDeTrabajoViewSetTest(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )
        self.client.force_authenticate(user=self.user)
    
    def test_listar_ordenes(self):
        response = self.client.get('/api/ordenes/')
        self.assertEqual(response.status_code, 200)
    
    def test_crear_orden_sin_autenticacion(self):
        self.client.force_authenticate(user=None)
        response = self.client.post('/api/ordenes/', {})
        self.assertEqual(response.status_code, 401)
```

**Ejecutar:**
```bash
python manage.py test ordentrabajov2.tests.test_views
```

---

## 15. Reglas Críticas

### 🔴 MUST HAVE

1. **Permission Classes:** Siempre explícito, nunca omitir
2. **Multi-tenancy:** Filtro por empresa en `get_queryset()`
3. **Migraciones:** Crear siempre al cambiar modelos
4. **Auditoría:** Usar `ModeloBaseHistorico` cuando sea posible

### 🟡 SHOULD HAVE

5. Filtros personalizados para querysets complejos
6. Validadores en serializers para reglas de negocio
7. Signals para mantener integridad de datos
8. Docstrings en ViewSets y métodos públicos

### 🟢 NICE TO HAVE

9. Tests unitarios para modelos y serializadores
10. Celery tasks para operaciones largas
11. Caché en queries frecuentes (Redisvia Django ORM)

---

Última actualización: 2025-02-12  
Responsable: Equipo backend  
**AUDITORÍA DE SEGURIDAD:** Ver `RISKLOG.md` para vulnerabilidades identificadas
