````markdown
# Backend Guide - Django + DRF (Documento Exhaustivo)

Guía completa de convenciones, apps y patrones del backend Django.

---

## 1. Estructura Estándar de Apps

Cada app en `backend/` sigue esta estructura:

```
app/
├── migrations/          # Migraciones Django
├── __init__.py
├── admin.py             # Configuración del admin
├── apps.py              # Configuración de la app
├── models.py            # Modelos de datos
├── serializers.py       # Serializers DRF
├── views.py             # ViewSets y vistas
├── urls.py              # Rutas de la app
├── estados_modelo.py    # (opcional) Choices de estados
├── filters.py           # (opcional) Filtros django-filter
├── functions.py         # (opcional) Lógica pesada, PDFs
├── tasks.py             # (opcional) Tareas Celery
├── signals.py           # (opcional) Signals de Django
├── movimientos.py       # (solo bodegas) Lógica de stock
├── pdfs/                # (solo bodegas) Generadores PDF
└── tests.py             # Tests de la app
```

---

## 2. Multi-tenancy - Patrón Obligatorio

Todo ViewSet debe filtrar por empresa del usuario. El patrón estándar es:

```python
from core.models import PersonalizacionUsuario
from cuentas.functions import obtener_usuario_empresa

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

**Función auxiliar:** Usar `obtener_usuario_empresa(request.user)` de `cuentas.functions` para obtener el UsuarioEmpresa del usuario logueado.

---

## 3. Estados de Modelos

Cada app define sus estados en `estados_modelo.py`. Estados clave:

### 3.1 Orden de Compra (bodegas)
```python
ESTADOS_OC = (
    ("-", "Borrador"),
    ("0", "Pendiente de aprobación"),
    ("1", "Aprobada"),
    ("2", "Rechazada"),
    ("3", "Enviada al proveedor"),
    ("4", "Parcialmente recibida"),
    ("5", "Completada"),
    ("6", "Cancelada"),
    ("7", "Cerrada"),
)
```

### 3.2 Guía de Salida (bodegas)
```python
ESTADOS_REBAJE = (
    ("P", "Pendiente"),
    ("ER", "Espera firma técnico"),
    ("FR", "Firmada por técnico"),
    ("ET", "En Tránsito"),
    ("R", "Revertida"),
    ("PR", "Parcialmente Revertida"),
    ("E", "Entregada"),
    ("T", "Terminada"),
)
```

### 3.3 Orden de Trabajo (ordentrabajov2)
```python
ESTADOS_ORDEN = [
    ("pendiente", "Pendiente"),
    ("en_proceso", "En Proceso"),
    ("completada", "Completada"),
    ("cerrada", "Validada y Cerrada"),
    ("facturada", "En proceso Factura"),
    ("cancelada", "Cancelada"),
]

ESTADOS_DETALLE_TRABAJO = [  # Para SoporteTecnico y ServicioEnOT
    ("pendiente", "Pendiente"),
    ("en_proceso", "En Proceso"),
    ("medianamente_completado", "Medianamente Completado"),
    ("completado", "Completado"),
    ("no_realizado", "No Realizado"),
]

ESTADOS_CIERRE_OT = [
    ("borrador", "Borrador"),
    ("en_revision", "En Revisión"),
    ("aprobado", "Aprobado"),
    ("facturado", "Facturado"),
    ("pagado", "Pagado"),
    ("anulado", "Anulado"),
]
```

### 3.4 Cotización (cotizaciones)
```python
ESTADOS_COTIZACION = [
    ('pendiente', 'Pendiente'),
    ('enviada', 'Enviada'),
    ('aceptada', 'Aceptada'),
    ('rechazada', 'Rechazada'),
    ('expirada', 'Expirada'),
]

TIPOS_MONEDA = [
    ('1', 'USD'),
    ('2', 'CLP'),
    ('3', 'UF'),
]
```

---

## 4. Movimientos de Stock (bodegas)

Los movimientos de inventario se registran vía `bodegas/movimientos.py`:

```python
from bodegas.movimientos import (
    registrar_entrada,    # Compras, recepciones OC
    registrar_salida,     # Guías de salida
    registrar_devolucion, # Devoluciones de OT
    registrar_ajuste_inventario,  # Ajustes manuales
)

# Uso
registrar_entrada(
    stock_item=stock,
    cantidad=10,  # DELTA, no saldo total
    usuario=usuario_empresa,
    origen=item_en_compra,
    descripcion="Entrada por OC #123"
)
```

**⚠️ IMPORTANTE:** `cantidad` es SIEMPRE el delta (diferencia), no el saldo final.

**Tipos de movimiento:**
- `ENTRADA` - Compras, recepciones
- `SALIDA` - Guías de salida
- `DEVOLUCION` - Devoluciones de OT
- `AJUSTE` - Ajustes manuales
- `INICIAL` - Stock inicial
- `AJUSTE_INVENTARIO` - Tomas de inventario

---

## 5. Guías de Salida y OT

### Flujo de estados de GuiaSalida:
1. `P` (Pendiente) → Recién creada
2. `FR` (Firmada) → Firmada por técnico, lista para usar
3. `ET` (En Tránsito) → Vinculada a OT que inició trabajo
4. `E` (Entregada) → Items entregados al cliente
5. `T` (Terminada) → Cerrada, devoluciones procesadas

### Vinculación con OT:
```python
# Las guías se vinculan a OT directamente (campo orden_trabajo)
guia.orden_trabajo = orden_de_trabajo
guia.save()

# ⚠️ DEPRECATED: guia_salida en SoporteTecnico
# No usar: soporte.guia_salida = guia
```

### Validación de guías para OT:
```python
from ordentrabajov2.views import validar_guia_para_trabajo

error = validar_guia_para_trabajo(guia, orden)
if error:
    raise ValidationError(error)
```

---

## 6. Lógica de Negocio

### 6.1 Ubicación
- `functions.py` → Lógica compleja, generación de PDFs
- `views.py` → Orquestación, no lógica extensa
- `tasks.py` → Tareas asíncronas Celery

### 6.2 PDFs
Cada app con PDFs tiene su generador:
```python
# bodegas
from bodegas.functions import generar_pdf_bodega, generar_pdf_bodega_resumido
from bodegas.pdfs.guia_salida import generar_pdf_guia_salida

# cotizaciones
from cotizaciones.functions import generar_pdf_cotizacion

# ordentrabajov2
from ordentrabajov2.functions import generar_pdf_orden_trabajo
```

### 6.3 Tipos de Cambio
```python
# Actualización automática vía Celery
from cotizaciones.tasks import actualizar_tipo_cambio_cotizacion, obtener_tipo_cambio_mindicador_con_fallback

# Uso en views
actualizar_tipo_cambio_cotizacion.delay(
    cotizacion_id=cotizacion.id,
    actualizar_dolar=True,
    actualizar_uf=True,
)
```

---

## 7. Serializers - Patrones

### 7.1 Serializer con campos calculados
```python
class ItemCotizacionSerializer(serializers.ModelSerializer):
    precio_total_backend = serializers.DecimalField(
        max_digits=20, decimal_places=4, read_only=True
    )
    
    class Meta:
        model = ItemCotizacion
        fields = [..., 'precio_total_backend']
```

### 7.2 Nested serializers
```python
class OrdenDeTrabajoSerializer(serializers.ModelSerializer):
    soportes_tecnicos = SoporteTecnicoSerializer(
        many=True, read_only=True, source='soportetecnico_set'
    )
```

### 7.3 Serializer para crear vs listar
```python
# Crear
class OrdenCompraCreateSerializer(serializers.ModelSerializer):
    items = ItemEnOrdenCompraSerializer(many=True, write_only=True)

# Listar
class OrdenCompraSerializer(serializers.ModelSerializer):
    items = ItemEnOrdenCompraSerializer(many=True, read_only=True)
```

---

## 8. ViewSets - Patrones

### 8.1 Actions personalizadas
```python
class OrdenDeTrabajoViewSet(viewsets.ModelViewSet):
    
    @action(detail=True, methods=['get'])
    def pdf(self, request, pk=None):
        orden = self.get_object()
        pdf_buffer = generar_pdf_orden_trabajo(orden)
        return HttpResponse(pdf_buffer, content_type='application/pdf')
    
    @action(detail=True, methods=['post'])
    def vincular_guias(self, request, pk=None):
        orden = self.get_object()
        # ... lógica
        return Response({'status': 'ok'})
```

### 8.2 Nested ViewSets (drf-nested-routers)
```python
# urls.py
router = DefaultRouter()
router.register(r'ordenes-de-trabajo', OrdenDeTrabajoViewSet)

ot_router = NestedDefaultRouter(router, r'ordenes-de-trabajo', lookup='orden')
ot_router.register(r'soportes-tecnicos', SoporteTecnicoViewSet)
```

---

## 9. Celery - Tareas Asíncronas

### Definición de tarea:
```python
# app/tasks.py
from celery import shared_task

@shared_task
def mi_tarea_async(param1, param2):
    # Lógica que no debe bloquear
    pass
```

### Invocación:
```python
# Asíncrona (recomendada)
mi_tarea_async.delay(param1, param2)

# Con opciones
mi_tarea_async.apply_async(
    args=[param1, param2],
    countdown=60  # Ejecutar en 60 segundos
)
```

### Tareas programadas (Beat):
Configuradas en `sw_erp/settings.py` → `CELERY_BEAT_SCHEDULE`

---

## 10. Signals

```python
# app/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver

@receiver(post_save, sender=MiModelo)
def mi_handler(sender, instance, created, **kwargs):
    if created:
        # Lógica post-creación
        pass
```

**Conectar en apps.py:**
```python
class MiAppConfig(AppConfig):
    def ready(self):
        import miapp.signals
```

---

## 11. Apps Detalladas

### 11.1 bodegas
**Archivos clave:**
- `models.py` - Bodega, StockItemEnBodega, OrdenCompra, GuiaSalida, etc.
- `movimientos.py` - Funciones de registro de stock
- `functions.py` - Generación de PDFs, lógica de recepción
- `pdfs/guia_salida.py` - PDF de guía de salida
- `views.py` - 3163 líneas, múltiples ViewSets

**ViewSets principales:**
- `BodegaViewSet` - CRUD bodegas
- `StockItemEnBodegaViewSet` - Stock por bodega
- `OrdenCompraViewSet` - Órdenes de compra
- `GuiaSalidaViewSet` - Guías de salida
- `CompraViewSet` - Compras rápidas
- `TomaInventarioViewSet` - Inventarios físicos

### 11.2 ordentrabajov2
**Archivos clave:**
- `models.py` - OrdenDeTrabajo, SoporteTecnico, ServicioEnOT, etc.
- `functions.py` - PDF, vinculación de guías/cotizaciones
- `cierre_validaciones.py` - Validaciones para cierre administrativo
- `views.py` - 2265 líneas

**⚠️ DEPRECATION_NOTICE.md:** `ordentrabajo` (V1) está desactivada. Usar siempre `ordentrabajov2`.

### 11.3 cotizaciones
**Archivos clave:**
- `models.py` - Cotizacion, ItemCotizacion, SolicitanteCotizacion
- `functions.py` - PDF, creación de OC
- `tasks.py` - Actualización de tipos de cambio
- `public_views.py` - Endpoints públicos (sin auth)
- `views.py` - 979 líneas

**Flujo público:**
1. Se genera token para cada solicitante
2. URL: `/api/public/cotizacion/{token}/`
3. Solicitante puede aprobar/rechazar sin login

---

## 12. Convenciones de Código

### 12.1 Imports
```python
# Orden: stdlib, django, third-party, local
import os
from decimal import Decimal

from django.db import models
from django.utils import timezone

from rest_framework import viewsets
from rest_framework.response import Response

from core.models import PersonalizacionUsuario
from .models import MiModelo
```

### 12.2 Docstrings
```python
def mi_funcion(param1, param2):
    """
    Descripción breve.
    
    Args:
        param1: Descripción
        param2: Descripción
    
    Returns:
        Descripción del retorno
    
    Raises:
        ValidationError: Cuándo ocurre
    """
```

### 12.3 Transacciones
```python
from django.db import transaction

with transaction.atomic():
    # Operaciones que deben ser atómicas
    obj1.save()
    obj2.save()
```

---

## 13. Migraciones

```bash
# Crear migraciones
python manage.py makemigrations

# Crear migración para app específica
python manage.py makemigrations nombre_app

# Aplicar migraciones
python manage.py migrate

# Ver SQL de migración
python manage.py sqlmigrate nombre_app 0001

# Mostrar migraciones pendientes
python manage.py showmigrations
```

**⚠️ Regla:** SIEMPRE crear y aplicar migraciones al modificar modelos.

---

## 14. Tests

```bash
# Ejecutar todos los tests
python manage.py test

# Tests de una app
python manage.py test nombre_app

# Test específico
python manage.py test nombre_app.tests.TestClass.test_method

# Con verbosidad
python manage.py test -v 2
```

---

## 15. Debug y Logs

```python
import logging
logger = logging.getLogger(__name__)

logger.debug("Mensaje debug")
logger.info("Información")
logger.warning("Advertencia")
logger.error(f"Error: {e}")
```

Configuración de logs en `sw_erp/settings.py` → `LOGGING`.

---

Última actualización: 2026-02-03
````
