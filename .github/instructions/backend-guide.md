# 🧠 Backend Guide – Django 5.1 & DRF

Guía práctica para trabajar con modelos, serializers, views y tasks en el backend.

---

## 📋 Estructura de una App Django

Cada app en `backend/` sigue este patrón:

```
app_name/
├── migrations/
│   ├── 0001_initial.py
│   └── __init__.py
├── __init__.py
├── admin.py             # Admin panel (registro de modelos)
├── apps.py              # Configuración de la app
├── models.py            # ORM models (dominio)
├── serializers.py       # DRF serializers (API contracts)
├── views.py             # ViewSets + custom views
├── urls.py              # Rutas específicas de la app
├── filters.py           # Django Filters (query filters)
├── tasks.py             # Celery tasks (async jobs)
├── signals.py           # Django signals (pre/post save)
├── tests.py             # Unit tests
└── functions.py         # Funciones auxiliares (lógica)
```

---

## 🎯 Modelos (models.py)

### Principios
- **Idioma:** Español (nombres, docstrings)
- **Nombrado:** PascalCase
- **Herencia:** Utiliza `TimeStampedModel` o similar cuando sea repetitivo

### Estructura típica

```python
from django.db import models
from simple_history.models import HistoricalRecords

class OrdenTrabajo(models.Model):
    """Modelo para órdenes de trabajo."""
    
    # Relaciones
    empresa = models.ForeignKey('empresas.Empresa', on_delete=models.CASCADE)
    usuario_asignado = models.ForeignKey('cuentas.User', on_delete=models.SET_NULL, null=True)
    
    # Atributos
    numero = models.CharField(max_length=50, unique=True)
    descripcion = models.TextField()
    estado = models.CharField(
        max_length=20,
        choices=[
            ('pendiente', 'Pendiente'),
            ('en_progreso', 'En Progreso'),
            ('completada', 'Completada'),
        ],
        default='pendiente'
    )
    
    # Timestamps
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    
    # Auditoría
    history = HistoricalRecords()
    
    class Meta:
        db_table = 'ordentrabajo'
        ordering = ['-fecha_creacion']
        indexes = [
            models.Index(fields=['empresa', 'estado']),
        ]
    
    def __str__(self):
        return f"OT-{self.numero}"
    
    def marcar_completada(self):
        """Marca la OT como completada."""
        self.estado = 'completada'
        self.save()
```

### Buenas Prácticas
✅ **Haz:**
- Usar `on_delete=models.CASCADE` o `SET_NULL` explícitamente
- Índices en campos frecuentemente filtrados
- `TimeStampedModel` para reutilizar `created_at`, `updated_at`
- Validación en `clean()` method
- `__str__()` descriptivo

❌ **Evita:**
- Lógica compleja en modelos (mueve a services)
- Llamadas HTTP desde models
- Cambios sin migración (`makemigrations`)
- Renombrar campos sin data migration

---

## 📝 Serializers (serializers.py)

### Patrón DRF estándar

```python
from rest_framework import serializers
from .models import OrdenTrabajo, DetalleOrdenTrabajo

class DetalleOrdenTrabajoSerializer(serializers.ModelSerializer):
    """Serializer anidado para detalles de OT."""
    
    class Meta:
        model = DetalleOrdenTrabajo
        fields = ['id', 'item', 'cantidad', 'precio_unitario', 'subtotal']
        read_only_fields = ['subtotal']


class OrdenTrabajoSerializer(serializers.ModelSerializer):
    """Serializer principal para órdenes de trabajo."""
    
    # Campos anidados
    detalles = DetalleOrdenTrabajoSerializer(many=True, read_only=True)
    usuario_asignado_nombre = serializers.CharField(
        source='usuario_asignado.get_full_name',
        read_only=True
    )
    
    class Meta:
        model = OrdenTrabajo
        fields = [
            'id',
            'numero',
            'descripcion',
            'estado',
            'empresa',
            'usuario_asignado',
            'usuario_asignado_nombre',
            'detalles',
            'fecha_creacion',
            'fecha_actualizacion',
        ]
        read_only_fields = ['id', 'fecha_creacion', 'fecha_actualizacion']
    
    def validate_numero(self, value):
        """Validación personalizada para número de OT."""
        if not value.startswith('OT-'):
            raise serializers.ValidationError("El número debe comenzar con 'OT-'")
        return value
    
    def create(self, validated_data):
        """Crear OT con lógica personalizada."""
        ot = OrdenTrabajo.objects.create(**validated_data)
        # Aquí puedes trigger tasks, enviar emails, etc.
        return ot
```

### Buenas Prácticas
✅ **Haz:**
- Herencia de `ModelSerializer` cuando sea posible
- Validación en `validate_*()` methods
- Campos read-only para computed properties
- Nested serializers para relaciones
- Personalizaciones en `create()` / `update()`

❌ **Evita:**
- Lógica de negocio dentro de serializers
- Querys no optimizadas (usa `select_related`, `prefetch_related`)
- Cambiar datos en `to_representation()` (usa `SerializerMethodField`)

---

## 👁️ Views (views.py)

### Patrón ViewSet con DRF

```python
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from core.models import PersonalizacionUsuario
from .models import OrdenTrabajo
from .serializers import OrdenTrabajoSerializer
from .filters import OrdenTrabajoFilter


class OrdenTrabajoViewSet(viewsets.ModelViewSet):
    """
    API para gestión de órdenes de trabajo.
    
    Actions:
    - GET    /api/ordentrabajov2/           → list()
    - POST   /api/ordentrabajov2/           → create()
    - GET    /api/ordentrabajov2/{id}/      → retrieve()
    - PATCH  /api/ordentrabajov2/{id}/      → partial_update()
    - POST   /api/ordentrabajov2/{id}/cierre/ → cierre()
    """
    
    queryset = OrdenTrabajo.objects.all()
    serializer_class = OrdenTrabajoSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = OrdenTrabajoFilter
    search_fields = ['numero', 'descripcion']
    ordering_fields = ['fecha_creacion', 'numero']
    ordering = ['-fecha_creacion']
    
    def get_queryset(self):
        """
        OBLIGATORIO: Filtrar por empresa/sucursal del usuario.
        Usa PersonalizacionUsuario para obtener contexto multi-tenant.
        """
        user = self.request.user
        personalizacion = PersonalizacionUsuario.objects.filter(usuario=user).first()
        
        if not personalizacion or not personalizacion.sucursal_principal:
            return OrdenTrabajo.objects.none()
        
        return OrdenTrabajo.objects.filter(
            sucursal=personalizacion.sucursal_principal
        ).select_related('usuario_asignado')
    
    def perform_create(self, serializer):
        """Asigna la empresa/sucursal actual al crear."""
        user = self.request.user
        personalizacion = PersonalizacionUsuario.objects.filter(usuario=user).first()
        if personalizacion and personalizacion.sucursal_principal:
            serializer.save(sucursal=personalizacion.sucursal_principal)
    
    @action(detail=True, methods=['post'], url_path='cerrar-orden')
    def cerrar_orden(self, request, pk=None):
        """
        Endpoint personalizado para cerrar OT.
        Nota: url_path usa kebab-case según convención.
        """
        ot = self.get_object()
        
        try:
            ot.marcar_completada()
            # Trigger async task si es necesario
            from core.tasks import generar_resumen_ot
            generar_resumen_ot.delay(ot.id)
        except Exception as e:
            return Response(
                {'detail': str(e)},  # Siempre usar 'detail' para errores
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return Response(
            {'detail': f'OT {ot.numero} cerrada exitosamente'},
            status=status.HTTP_200_OK
        )
```

### ⚠️ Convención CRÍTICA: PersonalizacionUsuario

**Todos los ViewSets DEBEN filtrar por empresa/sucursal** usando el patrón:

```python
from core.models import PersonalizacionUsuario

def get_queryset(self):
    user = self.request.user
    personalizacion = PersonalizacionUsuario.objects.filter(usuario=user).first()
    
    if not personalizacion or not personalizacion.sucursal_principal:
        return self.model.objects.none()  # NUNCA retornar all() sin filtrar
    
    empresa = personalizacion.sucursal_principal.empresa
    return self.model.objects.filter(empresa=empresa)
```

**Riesgo:** Retornar `objects.all()` sin filtrar expone datos de otras empresas (data leak).

### Buenas Prácticas
✅ **Haz:**
- Heredar de `viewsets.ModelViewSet` o `ViewSet` base
- **SIEMPRE** implementar `get_queryset()` filtrando por PersonalizacionUsuario
- Usar `perform_create()` / `perform_update()` para lógica
- `@action(url_path='kebab-case')` para acciones custom
- Documentación clara en docstrings
- Retornar errores con `{'detail': 'mensaje'}` (no `{'error': ...}`)
- Permiso `IsAuthenticated` mínimo

❌ **Evita:**
- Lógica pesada en views (mueve a services/tasks)
- N+1 querys (usa `select_related`, `prefetch_related`)
- Querys sin filtro (siempre filtra por empresa/usuario)

---

## 🔗 Rutas (urls.py)

```python
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import OrdenTrabajoViewSet

router = DefaultRouter()
router.register(r'ordentrabajov2', OrdenTrabajoViewSet, basename='ot')

urlpatterns = [
    path('', include(router.urls)),
]
```

### En `sw_erp/urls.py` (raíz)
```python
from django.urls import path, include

urlpatterns = [
    path('api/', include('ordentrabajov2.urls')),
    # Más apps...
]
```

---

## 🚀 Tasks Celery (tasks.py)

### Patrón Celery + Django

```python
from celery import shared_task
from django.core.mail import send_mail
from django.conf import settings
from .models import OrdenTrabajo

@shared_task(bind=True, max_retries=3)
def generar_resumen_ot(self, ot_id):
    """
    Genera resumen de OT y envía por email (async).
    
    Args:
        ot_id: ID de la OT
    
    Retries si hay error temporal.
    """
    try:
        ot = OrdenTrabajo.objects.get(id=ot_id)
        
        # Lógica pesada
        resumen = ot.generar_resumen_pdf()
        
        # Enviar email
        send_mail(
            subject=f'Resumen OT {ot.numero}',
            message='Ver adjunto',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[ot.usuario_asignado.email],
            fail_silently=False,
            attachments=[(f'resumen_{ot.numero}.pdf', resumen, 'application/pdf')],
        )
        
        return f'Resumen generado para OT {ot.numero}'
    
    except OrdenTrabajo.DoesNotExist:
        return 'OT no encontrada'
    except Exception as exc:
        # Reintentar en 60 segundos
        raise self.retry(exc=exc, countdown=60)
```

### Disparo desde View

```python
@action(detail=True, methods=['post'])
def generar_resumen(self, request, pk=None):
    ot = self.get_object()
    generar_resumen_ot.delay(ot.id)  # Fire and forget
    return Response({'task_id': task.id}, status=202)
```

### Buenas Prácticas
✅ **Haz:**
- `@shared_task` para compartir entre proyectos
- `bind=True` si necesitas acceso a `self`
- Manejo de excepciones y retries
- Logging claro
- Idempotence (safe to retry)

❌ **Evita:**
- Tasks con dependencias entre sí (deadlock)
- No pasar objetos directamente (pasa IDs)
- Ignorar errores silenciosamente

---

## 📊 Filtros (filters.py)

```python
from django_filters import rest_framework as filters
from .models import OrdenTrabajo

class OrdenTrabajoFilter(filters.FilterSet):
    """Filtros para OTs."""
    
    estado = filters.ChoiceFilter(
        choices=OrdenTrabajo._meta.get_field('estado').choices
    )
    fecha_desde = filters.DateTimeFilter(
        field_name='fecha_creacion',
        lookup_expr='gte'
    )
    fecha_hasta = filters.DateTimeFilter(
        field_name='fecha_creacion',
        lookup_expr='lte'
    )
    usuario = filters.ModelChoiceFilter(
        field_name='usuario_asignado',
        queryset=User.objects.all()
    )
    
    class Meta:
        model = OrdenTrabajo
        fields = ['estado', 'empresa']
```

### Uso en View
```python
filter_backends = [DjangoFilterBackend]
filterset_class = OrdenTrabajoFilter
```

### Query
```
GET /api/ordentrabajov2/?estado=pendiente&fecha_desde=2025-01-01
```

---

## 🧪 Tests (tests.py)

```python
from django.test import TestCase
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from .models import OrdenTrabajo

User = get_user_model()

class OrdenTrabajoTests(APITestCase):
    """Tests para API de órdenes de trabajo."""
    
    @classmethod
    def setUpTestData(cls):
        """Datos compartidos por todos los tests."""
        cls.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123'
        )
        cls.ot = OrdenTrabajo.objects.create(
            numero='OT-001',
            descripcion='Test OT',
            empresa=cls.user.empresa_activa,
            usuario_asignado=cls.user
        )
    
    def setUp(self):
        """Ejecuta antes de cada test."""
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
    
    def test_list_ordenes_trabajo(self):
        """Test: listar órdenes de trabajo."""
        response = self.client.get('/api/ordentrabajov2/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
    
    def test_create_orden_trabajo(self):
        """Test: crear orden de trabajo."""
        data = {
            'numero': 'OT-002',
            'descripcion': 'Nueva OT',
        }
        response = self.client.post('/api/ordentrabajov2/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(OrdenTrabajo.objects.filter(numero='OT-002').exists())
```

---

## 🛡️ Permisos Personalizados

```python
from rest_framework import permissions

class EsAdminEmpresa(permissions.BasePermission):
    """Permiso: usuario es admin de la empresa."""
    
    def has_object_permission(self, request, view, obj):
        return request.user.usuarioempresa_set.filter(
            empresa=obj.empresa,
            es_admin_empresa=True
        ).exists()


class EsPropietarioOT(permissions.BasePermission):
    """Permiso: usuario es el asignado de la OT."""
    
    def has_object_permission(self, request, view, obj):
        return request.user == obj.usuario_asignado


# En ViewSet:
permission_classes = [IsAuthenticated, EsPropietarioOT]
```

---

## 🚨 Manejo de Errores Común

### Validación de Negocio
```python
from rest_framework.exceptions import ValidationError

def create(self, validated_data):
    # Validación de negocio
    if validated_data['cantidad'] < 0:
        raise ValidationError({'cantidad': 'No puede ser negativa'})
    return super().create(validated_data)
```

### Error 404
```python
from django.shortcuts import get_object_or_404

ot = get_object_or_404(OrdenTrabajo, id=pk, empresa=request.user.empresa_activa)
```

### Error 403 (Forbidden)
```python
from rest_framework.exceptions import PermissionDenied

if not user_is_admin:
    raise PermissionDenied('No tienes permisos para esta acción')
```

---

## � Convenciones Implícitas del Proyecto

Esta sección documenta patrones descubiertos en el código actual. **Seguir estas convenciones es obligatorio** para mantener consistencia.

### 🔐 Multi-tenancy: Filtrado por Empresa/Sucursal

**Patrón obligatorio en TODOS los ViewSets:**

```python
from core.models import PersonalizacionUsuario

class MiViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        """SIEMPRE filtrar por empresa/sucursal del usuario."""
        user = self.request.user
        
        # Patrón estándar:
        try:
            personalizacion = PersonalizacionUsuario.objects.get(usuario=user)
            sucursal = personalizacion.sucursal_principal
            empresa = sucursal.empresa
        except (PersonalizacionUsuario.DoesNotExist, AttributeError):
            return MiModelo.objects.none()
        
        # Filtrar por empresa o sucursal según corresponda
        return MiModelo.objects.filter(empresa=empresa)
        
        # Alternativa con filter().first():
        personalizacion = PersonalizacionUsuario.objects.filter(usuario=user).first()
        if personalizacion and personalizacion.sucursal_principal:
            return MiModelo.objects.filter(sucursal=personalizacion.sucursal_principal)
        return MiModelo.objects.none()
```

**🚫 Nunca retornes `MiModelo.objects.all()` directamente sin filtrar por empresa.**

---

### 🔧 functions.py: Lógica de Negocio Pesada

**NO coloques lógica compleja en views o models. Usa `functions.py`:**

```python
# ✅ bodegas/functions.py
def generar_pdf_bodega(bodega_id, filtros=None):
    """
    Genera PDF de inventario de bodega.
    
    Args:
        bodega_id: ID de la bodega
        filtros: Filtros opcionales para items
    
    Returns:
        BytesIO: Buffer del PDF generado
    """
    bodega = Bodega.objects.get(id=bodega_id)
    items = StockItemEnBodega.objects.filter(bodega=bodega)
    
    # Lógica de generación PDF
    buffer = BytesIO()
    # ... reportlab logic ...
    return buffer

# ✅ Llamada desde view
from .functions import generar_pdf_bodega

@action(detail=True, methods=['get'], url_path='generar-pdf')
def generar_pdf(self, request, pk=None):
    try:
        pdf_buffer = generar_pdf_bodega(pk)
        return HttpResponse(pdf_buffer.getvalue(), content_type='application/pdf')
    except Bodega.DoesNotExist:
        return Response({'detail': 'Bodega no encontrada'}, status=404)
```

**Tipos de funciones que van en `functions.py`:**
- Generación de PDFs (ReportLab)
- Cálculos complejos (financieros, estadísticas)
- Transformaciones de datos multi-modelo
- Integración con APIs externas
- Helpers específicos del dominio

---

### 🎬 @action: Endpoints Personalizados

**Convenciones de nombrado y estructura:**

```python
@action(detail=True, methods=['post'], url_path='cerrar-orden')
def cerrar_orden(self, request, pk=None):
    """
    Cierra una orden de trabajo específica.
    
    URL: POST /api/ordentrabajov2/{id}/cerrar-orden/
    """
    obj = self.get_object()
    # Lógica de cierre
    return Response({'detail': 'Orden cerrada exitosamente'}, status=200)

@action(detail=False, methods=['get'], url_path='por-empresa/(?P<empresa_id>[^/.]+)')
def por_empresa(self, request, empresa_id=None):
    """
    Lista recursos filtrados por empresa específica.
    
    URL: GET /api/recursos/por-empresa/123/
    """
    objetos = self.get_queryset().filter(empresa_id=empresa_id)
    serializer = self.get_serializer(objetos, many=True)
    return Response(serializer.data)
```

**Reglas:**
- `url_path` en **kebab-case** (guiones): `cerrar-orden`, `por-empresa`
- Nombre del método en **snake_case**: `cerrar_orden`, `por_empresa`
- `detail=True` → opera sobre UN objeto (requiere `pk`)
- `detail=False` → opera sobre colección o sin objeto específico

---

### 📦 Orden de Imports

**Patrón estricto:**

```python
# 1. Django core
from django.db import models, transaction
from django.shortcuts import get_object_or_404
from django.http import HttpResponse
from django.utils.timezone import now

# 2. Third-party libraries
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from celery import shared_task

# 3. Local apps
from core.models import PersonalizacionUsuario
from empresas.models import Empresa, UsuarioEmpresa
from .models import MiModelo
from .serializers import MiSerializer
from .filters import MiFilter
from .functions import mi_helper_function
```

**Orden dentro de cada grupo:** alfabético

---

### ⚠️ Manejo de Errores: Formato de Response

**Siempre retornar con key `detail` para errores:**

```python
# ✅ Correcto
return Response(
    {'detail': 'No tienes permisos para esta acción'},
    status=status.HTTP_403_FORBIDDEN
)

return Response(
    {'detail': 'Bodega no encontrada'},
    status=status.HTTP_404_NOT_FOUND
)

# ❌ Incorrecto
return Response(
    {'error': 'Bodega no encontrada'},  # NO usar 'error'
    status=404
)

# ✅ Para validaciones con múltiples campos
return Response(
    {
        'cantidad': ['Debe ser mayor a 0'],
        'precio': ['No puede estar vacío']
    },
    status=status.HTTP_400_BAD_REQUEST
)
```

**Frontend espera `detail` para mostrar mensajes de error consistentes.**

---

### 🔄 Transacciones Atómicas

**Cuando modificas múltiples modelos relacionados:**

```python
from django.db import transaction

@action(detail=True, methods=['post'])
def completar_orden(self, request, pk=None):
    orden = self.get_object()
    
    try:
        with transaction.atomic():
            # Modificaciones múltiples
            orden.estado = 'completada'
            orden.save()
            
            # Actualizar soportes técnicos
            for soporte in orden.soportes_tecnicos.all():
                soporte.estado = 'finalizado'
                soporte.save()
            
            # Generar voucher de devolución
            voucher = VoucherDevolucion.objects.create(orden_trabajo=orden)
            
    except Exception as e:
        return Response({'detail': str(e)}, status=400)
    
    return Response({'detail': 'Orden completada'}, status=200)
```

**Sin `transaction.atomic()`, si falla el voucher, el orden quedará marcada como completada pero sin voucher (estado inconsistente).**

---

### 📄 Generación de PDFs

**Patrón centralizado en functions.py:**

```python
# functions.py
from io import BytesIO
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

def generar_pdf_documento(titulo, datos):
    """Genera PDF genérico con ReportLab."""
    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=letter)
    
    # Configuración
    pdf.setTitle(titulo)
    pdf.setFont("Helvetica-Bold", 16)
    
    # Contenido
    pdf.drawString(100, 750, titulo)
    # ... más contenido ...
    
    pdf.save()
    buffer.seek(0)
    return buffer

# views.py
from django.http import HttpResponse
from .functions import generar_pdf_documento

@action(detail=True, methods=['get'], url_path='pdf')
def descargar_pdf(self, request, pk=None):
    obj = self.get_object()
    pdf_buffer = generar_pdf_documento(
        titulo=f'Documento {obj.numero}',
        datos=obj
    )
    
    response = HttpResponse(pdf_buffer.getvalue(), content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="doc_{obj.numero}.pdf"'
    return response
```

**🚫 NO generes PDFs directamente en views.**

---

### 🚨 Anti-Patrones a Evitar

#### ❌ NO: Servicios específicos de módulo

```python
# ❌ NO CREAR: services/MiModuloService.py
class MiModuloService:
    def listar(self, filtros):
        # Lógica HTTP
    
    def crear(self, data):
        # Lógica HTTP
```

**Usa `ApiService` directamente en componentes o `functions.py` para lógica.**

#### ❌ NO: Lógica de negocio en serializers

```python
# ❌ Incorrecto
class MiSerializer(serializers.ModelSerializer):
    def create(self, validated_data):
        # 50 líneas de lógica compleja
        # Cálculos financieros
        # Llamadas a otros modelos
        obj = super().create(validated_data)
        return obj
```

**Mueve a `functions.py` o `tasks.py`.**

#### ❌ NO: Queries sin filtro de empresa

```python
# ❌ PELIGRO: Retorna datos de TODAS las empresas
def get_queryset(self):
    return MiModelo.objects.all()
```

**SIEMPRE filtra por empresa/sucursal.**

---

### ✅ Checklist de Convenciones

Antes de hacer commit de un ViewSet nuevo:

- [ ] `get_queryset()` filtra por `PersonalizacionUsuario`
- [ ] `@action` usa `url_path` en kebab-case
- [ ] Imports ordenados: Django → Third-party → Local
- [ ] Errores retornan con key `detail`
- [ ] Lógica pesada está en `functions.py`, no en views
- [ ] Operaciones multi-modelo usan `transaction.atomic()`
- [ ] PDFs se generan en `functions.py` con ReportLab
- [ ] NO se crearon servicios específicos de módulo

---

## �📌 Checklist: Nuevo Endpoint

1. ✅ Crear `Model` en `models.py`
2. ✅ `python manage.py makemigrations`
3. ✅ Validar migración: `python manage.py migrate --plan`
4. ✅ Crear `Serializer` en `serializers.py`
5. ✅ Crear `ViewSet` en `views.py` (con permisos)
6. ✅ Registrar en `urls.py`
7. ✅ Crear tests en `tests.py`
8. ✅ Documentar en Postman
9. ✅ Ejecutar tests: `python manage.py test`
10. ✅ Validar linters (si existe pre-commit)

---

## ✅ Validación de Convenciones

Para verificar que tu código sigue estas convenciones implícitas:

### 1. get_queryset() siempre filtra
```bash
# Buscar ViewSets sin filtrado (riesgo de data leak)
grep -r "def get_queryset" backend/ | xargs grep -L "PersonalizacionUsuario"
```

### 2. @action url_path en kebab-case
```bash
# Buscar url_path con underscores (incorrecto)
grep -r 'url_path="[^"]*_' backend/
```

### 3. Errores retornan `detail`
```bash
# Buscar Response sin key `detail` en errores
grep -r 'Response({"' backend/ | grep -v 'detail' | grep -v 'success'
```

### 4. Import order correcto
```bash
# Verificar manualmente en archivos modificados
# Orden: Django core → Third-party → Local apps
```

### 5. Lógica en functions.py (no en views)
- Revisar que views.py tenga < 50 líneas por método
- Funciones pesadas (PDFs, cálculos) deben estar en functions.py

---

## 🔗 Referencias

- [Django Documentation](https://docs.djangoproject.com)
- [DRF Documentation](https://www.django-rest-framework.org)
- [Celery Documentation](https://docs.celeryproject.org)
- [architecture.md](./architecture.md) — Visión general
- [security.md](./security.md) — Seguridad

**Última actualización:** 2025-12-30

