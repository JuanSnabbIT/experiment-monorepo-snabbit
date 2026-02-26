# Instrucciones Backend — Django + DRF

> Instrucciones específicas para trabajar en `backend/`.
> Aplican cuando el alcance de la tarea es backend.

---

## Checklist antes de modificar código

1. ¿El modelo hereda de `ModeloBase` o `ModeloBaseHistorico`?
2. ¿El ViewSet filtra por empresa del usuario autenticado?
3. ¿Los estados usan slugs descriptivos (`'pendiente'`, `'en_proceso'`)? 
4. ¿Se generaron migraciones (`makemigrations`) tras cambiar modelos?
5. ¿Las URLs siguen kebab-case español?

---

## Crear un nuevo modelo

```python
from core.models import ModeloBase  # o ModeloBaseHistorico si requiere auditoría
from .estados_modelo import *

class MiModelo(ModeloBase):
    nombre       = models.CharField(max_length=200, verbose_name="Nombre")
    estado       = models.CharField(max_length=30, choices=ESTADOS_MI_MODELO, default='pendiente')
    empresa      = models.ForeignKey('empresas.Empresa', on_delete=models.CASCADE, related_name='mis_modelos')
    creado_por   = models.ForeignKey('cuentas.User', on_delete=models.SET_NULL, null=True, blank=True)
    
    class Meta:
        verbose_name = "Mi Modelo"
        verbose_name_plural = "Mis Modelos"
        ordering = ['-fecha_creacion']
    
    def __str__(self):
        return self.nombre
```

### Reglas de campos
- `on_delete=CASCADE`: relaciones de ownership (empresa → modelo)
- `on_delete=SET_NULL, null=True`: referencias opcionales (creado_por, asignado_a)
- `on_delete=PROTECT`: referencias críticas que no deben eliminarse
- `related_name` siempre explícito y en plural español
- `verbose_name` siempre en español con tildes

---

## Crear estados

Archivo: `app/estados_modelo.py`

```python
ESTADOS_MI_MODELO = [
    ('pendiente', 'Pendiente'),
    ('en_proceso', 'En Proceso'),
    ('completado', 'Completado'),
    ('cancelado', 'Cancelado'),
]

# Transiciones válidas (usado en views)
TRANSICIONES_MI_MODELO = {
    'pendiente': ['en_proceso', 'cancelado'],
    'en_proceso': ['completado', 'cancelado'],
    'completado': [],
    'cancelado': [],
}
```

---

## Crear un serializer

```python
from rest_framework import serializers
from .models import MiModelo

class MiModeloSerializer(serializers.ModelSerializer):
    # Campos de lectura enriquecidos
    estado_label = serializers.SerializerMethodField()
    empresa_nombre = serializers.SerializerMethodField()
    
    class Meta:
        model = MiModelo
        fields = '__all__'
    
    def get_estado_label(self, obj):
        return obj.get_estado_display()
    
    def get_empresa_nombre(self, obj):
        return obj.empresa.nombre if obj.empresa else None
    
    def validate(self, data):
        # Validación cruzada aquí
        return data
```

---

## Crear un ViewSet

```python
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import MiModelo
from .serializers import MiModeloSerializer
from .estados_modelo import TRANSICIONES_MI_MODELO

class MiModeloViewSet(viewsets.ModelViewSet):
    serializer_class = MiModeloSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filtra siempre por empresa del usuario autenticado."""
        user = self.request.user
        from cuentas.models import PersonalizacionUsuario
        personalizacion = PersonalizacionUsuario.objects.filter(usuario=user).first()
        if not personalizacion or not personalizacion.sucursal_principal:
            return MiModelo.objects.none()
        empresa = personalizacion.sucursal_principal.empresa
        return MiModelo.objects.filter(empresa=empresa)
    
    @action(detail=True, methods=["post"], url_path="cambiar-estado")
    def cambiar_estado(self, request, pk=None):
        """Transición de estado validada."""
        obj = self.get_object()
        nuevo_estado = request.data.get('estado')
        
        estados_permitidos = TRANSICIONES_MI_MODELO.get(obj.estado, [])
        if nuevo_estado not in estados_permitidos:
            return Response(
                {"error": f"Transición de '{obj.estado}' a '{nuevo_estado}' no permitida."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        obj.estado = nuevo_estado
        obj.save()
        return Response(self.get_serializer(obj).data)
```

---

## Crear URLs

```python
from rest_framework.routers import DefaultRouter
from rest_framework_nested.routers import NestedDefaultRouter
from .views import MiModeloViewSet

router = DefaultRouter()
router.register(r'mis-modelos', MiModeloViewSet, basename='mis-modelos')

# Si hay recursos anidados:
# nested_router = NestedDefaultRouter(router, r'mis-modelos', lookup='mi_modelo')
# nested_router.register(r'sub-recursos', SubRecursoViewSet, basename='sub-recursos')

urlpatterns = router.urls
# urlpatterns += nested_router.urls  # si hay anidados
```

---

## Crear tarea Celery

```python
from celery import shared_task
from celery.exceptions import CeleryError

@shared_task
def mi_tarea_asincrona(param_id):
    """Descripción de la tarea en español."""
    from .models import MiModelo  # Import lazy para evitar circular
    try:
        obj = MiModelo.objects.get(id=param_id)
        # ... lógica ...
    except MiModelo.DoesNotExist:
        return f"MiModelo {param_id} no encontrado"
```

Llamar desde views:
```python
from kombu.exceptions import OperationalError
from celery.exceptions import CeleryError

try:
    mi_tarea_asincrona.delay(obj.id)
except (OperationalError, CeleryError):
    return Response(
        {"error": "Servicio de tareas no disponible"},
        status=status.HTTP_503_SERVICE_UNAVAILABLE
    )
```

---

## Crear signal (solo si es necesario)

Solo usar signals para:
- Auto-crear perfiles/entidades relacionadas en `post_save`
- Recalcular agregados en cascada

**NUNCA** para lógica de negocio ni transiciones de estado.

```python
from django.db.models.signals import post_save
from django.dispatch import receiver

@receiver(post_save, sender=MiModelo)
def crear_perfil_asociado(sender, instance, created, **kwargs):
    if created:
        PerfilAsociado.objects.create(mi_modelo=instance)
```

Registrar en `apps.py`:
```python
class MiAppConfig(AppConfig):
    name = 'mi_app'
    
    def ready(self):
        import mi_app.signals
```

---

## GenericForeignKey (Relaciones polimórficas)

El proyecto usa `ContentType` framework para relaciones polimórficas:

```python
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType

class Comentario(ModeloBase):
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    objeto_relacionado = GenericForeignKey('content_type', 'object_id')
```

---

## Generación de PDFs

Usar `reportlab` para PDFs server-side. Patrón existente: funciones en `functions.py` de cada app.

---

## Testing

- Archivo: `tests.py` en cada app.
- Framework: Django TestCase + DRF APITestCase.
- **Nunca** crear archivos `test_*.py` sueltos en `backend/` (los existentes son legacy).
