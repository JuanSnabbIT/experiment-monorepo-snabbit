# Fase 3: Trazabilidad y Auditoría Completa

## Objetivo

Implementar un sistema de trazabilidad y auditoría que permita:

1. **Reconstruir el historial completo** de cada ítem y serie en cualquier momento
2. **Auditar quién hizo qué, cuándo y por qué** en cada operación
3. **Detectar anomalías e inconsistencias** silenciosas en el inventario
4. **Generar reportes de conciliación** entre stock registrado y calculado

## Componentes Implementados

### 1. Modelos de Datos

#### BitácoraMovimiento
```python
class BitácoraMovimiento(ModeloBase):
    """Registro immutable de cada evento relevante en el sistema."""
    
    - tipo_evento: ingreso_compra, salida_guia, devolucion, ajuste_inventario, 
                   anulacion, reverso, ajuste_serie, transferencia_bodega
    - documento_origen: Referencia al documento que originó el evento (OC, Guía, etc)
    - bodega_origen / bodega_destino: Contexto de movimiento
    - cantidad: Cantidad movida (puede ser negativa)
    - cantidad_anterior / cantidad_posterior: Estados antes/después
    - usuario: Quién realizó la acción
    - descripcion / observaciones: Contexto del evento
    - movimiento_reversado: Si es reverso, referencia al original
```

**Indices:**
- `(empresa, fecha_creacion)` - Consultas históricas por empresa
- `(tipo_evento, fecha_creacion)` - Análisis por tipo de evento
- `(stock_item, fecha_creacion)` - Historial por ítem
- `numero_documento` - Búsqueda rápida por documento

#### BitácoraSerieMovimiento
```python
class BitácoraSerieMovimiento(ModeloBase):
    """Historial de cambios de estado para cada serie."""
    
    - serie_item: Serie afectada
    - estado_anterior → estado_nuevo: disponible, reservada, despachada, devuelta
    - bitacora_movimiento: Movimiento que causó el cambio
    - bodega: Ubicación del cambio
    - usuario: Quién realizó el cambio
    - documento_referencia: Documento asociado
```

**Índices:**
- `(serie_item, fecha_creacion)` - Historial completo de una serie
- `(empresa, fecha_creacion)` - Análisis temporal por empresa

#### ReporteTrazabilidadSerie
```python
class ReporteTrazabilidadSerie(models.Model):
    """Vista materializada para consultas rápidas de trazabilidad."""
    
    Almacena:
    - Estado actual
    - Bodega actual
    - Cadena de custodia (JSON): lista de eventos ordenados
    - Documentos relacionados (OC, Guía, Voucher)
    - Anomalías detectadas
    
    Se actualiza automáticamente con cada cambio de estado.
```

#### ReporteConciliación
```python
class ReporteConciliación(ModeloBase):
    """Reporte de discrepancias entre stock registrado y calculado."""
    
    Compara:
    1. cantidad_stock_registrado (en StockItemEnBodega)
    2. cantidad_stock_calculado (suma de BitácoraMovimiento)
    3. Series activas (conteo por estado)
    
    Detecta:
    - Sobrestock (stock registrado > calculado)
    - Substock (stock registrado < calculado)
    - Inconsistencia de series (más series que stock)
    
    Período: fecha_inicio → fecha_cierre
```

#### AnomalíaMovimiento
```python
class AnomalíaMovimiento(ModeloBase):
    """Registro de anomalías detectadas automáticamente."""
    
    Tipos:
    - stock_negativo: Inventario negativo
    - movimiento_huerfano: Movimiento sin documento
    - salida_sin_entrada: Salida sin ingreso previo
    - devolucion_sin_salida: Devolución sin salida previa
    - inconsistencia_series: Más series que stock
    - diferencia_stock: Discrepancia stock vs bitácora
    - serie_duplicada: Series duplicadas
    
    Resolución:
    - resuelta: bool (default: False)
    - resuelto_por: UsuarioEmpresa
    - nota_resolucion: Explicación de la solución
```

### 2. Servicios de Auditoría

#### AuditoríaMovimientoService

**`registrar_movimiento(...) → BitácoraMovimiento`**
- Registra un movimiento con contexto completo
- Captura estados anterior/posterior
- Vincula documento origen automáticamente
- Transacción ACID

Ejemplo:
```python
from bodegas.auditoria_servicios import AuditoríaMovimientoService

bitacora = AuditoríaMovimientoService.registrar_movimiento(
    empresa=empresa,
    tipo_evento='salida_guia',
    stock_item=stock,
    cantidad=-10,
    bodega_origen=bodega,
    usuario=usuario,
    documento_origen=guia_salida,
    numero_documento='GS-2025-00123',
    descripcion='Entrega a cliente ABC',
    cantidad_series=10
)
```

**`registrar_cambio_serie(...) → BitácoraSerieMovimiento`**
- Registra transición de estado en serie
- Actualiza estado actual en SerieItem
- Vincula con movimiento asociado
- Registra usuario responsable

Ejemplo:
```python
cambio = AuditoríaMovimientoService.registrar_cambio_serie(
    serie=serie,
    estado_anterior='disponible',
    estado_nuevo='reservada',
    empresa=empresa,
    usuario=usuario,
    documento_referencia='GS-2025-00123',
    bitacora_movimiento=bitacora
)
```

#### TrazabilidadService

**`obtener_historial_serie(serie: SerieItem) → dict`**
- Historial completo con cadena de custodia
- Cambios de estado ordenados
- Documentos relacionados
- Movimientos asociados

Respuesta:
```json
{
    "serie": "SN-123456",
    "estado_actual": "Despachada",
    "bodega_actual": "Bodega A",
    "fecha_creacion": "2025-01-15T10:30:00Z",
    "cantidad_movimientos": 3,
    "cantidad_cambios_estado": 3,
    "cadena_custodia": [
        {
            "fecha": "2025-01-15T10:30:00Z",
            "usuario": "Juan Pérez",
            "evento": "Disponible",
            "documento": "OC-2025-001",
            "bodega": "Bodega A"
        },
        {
            "fecha": "2025-01-16T14:00:00Z",
            "usuario": "María García",
            "evento": "Reservada",
            "documento": "GS-2025-001",
            "bodega": "Bodega A"
        },
        {
            "fecha": "2025-01-16T16:30:00Z",
            "usuario": "María García",
            "evento": "Despachada",
            "documento": "GS-2025-001",
            "bodega": "Bodega A"
        }
    ]
}
```

**`obtener_series_por_bodega(bodega) → list`**
- Todas las series activas de una bodega
- Estado actual
- Fecha de creación

**`obtener_series_por_documento(documento) → list`**
- Series asociadas a un documento (OC, Guía, etc)
- Trazabilidad de cada una

#### ConciliacionService

**`generar_reporte_conciliacion(bodega, stock_item, empresa) → ReporteConciliación`**
- Compara stock registrado vs calculado
- Valida consistencia de series
- Detecta anomalías automáticamente
- Almacena reporte para auditoría

Ejemplo:
```python
from bodegas.auditoria_servicios import ConciliacionService

reporte = ConciliacionService.generar_reporte_conciliacion(
    bodega=bodega,
    stock_item=stock,
    empresa=empresa,
    fecha_inicio=None,  # Por defecto, desde creación
    fecha_cierre=None   # Por defecto, ahora
)

# Acceso a resultados
print(f"Diferencia: {reporte.diferencia}")
print(f"Consistente: {reporte.es_consistente}")
print(f"Anomalías: {reporte.anomalias}")
```

**`generar_reporte_conciliacion_bodega(bodega, empresa) → list[ReporteConciliación]`**
- Genera reportes para todos los items de una bodega

#### DetectorAnomalíasService

**`detectar_anomalias(empresa: Empresa) → list[AnomalíaMovimiento]`**
- Ejecuta detección automática
- Stock negativo
- Movimientos huérfanos
- Salidas sin entrada previa
- Devueltas sin salida previa
- Inconsistencias de series

Ejemplo:
```python
from bodegas.auditoria_servicios import DetectorAnomalíasService

anomalias = DetectorAnomalíasService.detectar_anomalias(empresa)

for anomalia in anomalias:
    print(f"{anomalia.get_tipo_anomalia_display()}: {anomalia.descripcion}")
```

**`obtener_anomalias_sin_resolver(empresa) → QuerySet[AnomalíaMovimiento]`**
- Todas las anomalías sin resolver
- Ordenadas por fecha descendente

### 3. API REST

#### Endpoints de Bitácora

**GET /api/auditoria/bitacora-movimientos/**
- Lista todos los movimientos con filtros
- Query params:
  - `tipo_evento` - Filtrar por tipo
  - `bodega_origen` - Filtrar por bodega origen
  - `bodega_destino` - Filtrar por bodega destino
  - `stock_item` - Filtrar por ítem
  - `usuario` - Filtrar por usuario
  - `numero_documento` - Búsqueda exacta/contiene
  - `empresa` - Filtrar por empresa

Respuesta:
```json
{
    "count": 1234,
    "next": "...",
    "results": [
        {
            "id": 1,
            "tipo_evento": "salida_guia",
            "numero_documento": "GS-2025-00123",
            "bodega_origen": 1,
            "bodega_origen_nombre": "Bodega A",
            "cantidad": -10,
            "cantidad_anterior": 50,
            "cantidad_posterior": 40,
            "usuario_nombre": "María García",
            "descripcion": "Entrega a cliente ABC",
            "fecha_creacion": "2025-01-16T14:00:00Z"
        }
    ]
}
```

**GET /api/auditoria/bitacora-movimientos/resumen_diario/**
- Resumen de movimientos de hoy

Respuesta:
```json
{
    "total_movimientos": 42,
    "ingresos": 5,
    "salidas": 20,
    "devoluciones": 2,
    "ajustes": 15
}
```

#### Endpoints de Series

**GET /api/auditoria/bitacora-series/**
- Lista cambios de estado de series
- Filtros: serie_item, estado_anterior, estado_nuevo, empresa

**GET /api/auditoria/trazabilidad-series/{serie_id}/**
- Historial completo de una serie
- Incluye cadena de custodia

**GET /api/auditoria/trazabilidad-series/por_bodega/?bodega_id=1**
- Todas las series activas de una bodega

#### Endpoints de Conciliación

**GET /api/auditoria/conciliacion/**
- Lista reportes de conciliación
- Filtros: bodega, stock_item, es_consistente, empresa

**POST /api/auditoria/conciliacion/generar_bodega/**
- Genera reportes para todos los items de una bodega
- Body: `{"bodega_id": 1, "empresa_id": 1}`

Respuesta:
```json
{
    "total_reportes": 25,
    "inconsistencias": 3,
    "detalles": [
        {
            "bodega_nombre": "Bodega A",
            "item_nombre": "Widget Pro",
            "cantidad_stock_registrado": 50,
            "cantidad_stock_calculado": 48,
            "diferencia": 2,
            "es_consistente": false,
            "anomalias": [
                {
                    "tipo": "sobrestock",
                    "descripcion": "Stock registrado 2 unidades mayor que calculado",
                    "cantidad": 2
                }
            ]
        }
    ]
}
```

#### Endpoints de Anomalías

**GET /api/auditoria/anomalias/**
- Lista anomalías detectadas
- Filtros: tipo_anomalia, resuelta, bodega, stock_item, empresa

**GET /api/auditoria/anomalias/sin_resolver/**
- Anomalías pendientes de resolver

**POST /api/auditoria/anomalias/{id}/resolver/**
- Marca anomalía como resuelta
- Body: `{"nota_resolucion": "Se ajustó manualmente el stock"}`

**POST /api/auditoria/anomalias/detectar_anomalias/**
- Ejecuta detección automática
- Body: `{"empresa_id": 1}`

## Flujo de Integración

### Registrar un Movimiento de Ingreso

```python
from bodegas.auditoria_servicios import AuditoríaMovimientoService
from bodegas.models import BitácoraMovimiento

# 1. Crear el documento de origen (ej: ItemOrdenCompraEnStock)
item_oc = ItemOrdenCompraEnStock.objects.create(...)

# 2. Registrar en bitácora
bitacora = AuditoríaMovimientoService.registrar_movimiento(
    empresa=empresa,
    tipo_evento='ingreso_compra',
    stock_item=stock_item,
    cantidad=100,
    bodega_origen=None,  # No aplica en ingreso
    bodega_destino=bodega,
    usuario=usuario,
    documento_origen=item_oc,
    numero_documento='OC-2025-001',
    descripcion='Ingreso de compra',
    cantidad_series=100  # Si la OC incluye 100 series
)

# 3. Actualizar stock (por separado)
stock_item.cantidad_disponible += 100
stock_item.save()

# 4. Si hay series, registrar cambios de estado
for serie in series_list:
    AuditoríaMovimientoService.registrar_cambio_serie(
        serie=serie,
        estado_anterior='',  # O el estado anterior
        estado_nuevo='disponible',
        empresa=empresa,
        usuario=usuario,
        documento_referencia='OC-2025-001',
        bitacora_movimiento=bitacora
    )
```

### Generar Reporte de Trazabilidad

```python
from bodegas.auditoria_servicios import TrazabilidadService
import json

# Obtener historial de una serie
serie = SerieItem.objects.get(serie='SN-123456')
historial = TrazabilidadService.obtener_historial_serie(serie)

# Generar JSON para exportación
print(json.dumps(historial, indent=2, default=str))

# O usar directamente en API
# GET /api/auditoria/trazabilidad-series/{serie_id}/
```

### Generar Reporte de Conciliación

```python
from bodegas.auditoria_servicios import ConciliacionService
from datetime import datetime

# Para un item específico
reporte = ConciliacionService.generar_reporte_conciliacion(
    bodega=bodega,
    stock_item=stock_item,
    empresa=empresa,
    fecha_inicio=datetime(2025, 1, 1),
    fecha_cierre=datetime(2025, 1, 31)
)

print(f"Stock registrado: {reporte.cantidad_stock_registrado}")
print(f"Stock calculado: {reporte.cantidad_stock_calculado}")
print(f"Diferencia: {reporte.diferencia}")
print(f"¿Consistente? {reporte.es_consistente}")

if reporte.anomalias:
    print("Anomalías detectadas:")
    for anomalia in reporte.anomalias:
        print(f"  - {anomalia['tipo']}: {anomalia['descripcion']}")

# Para todos los items de una bodega
reportes = ConciliacionService.generar_reporte_conciliacion_bodega(bodega, empresa)
inconsistentes = [r for r in reportes if not r.es_consistente]
print(f"Total inconsistencias: {len(inconsistentes)}")
```

### Detectar Anomalías

```python
from bodegas.auditoria_servicios import DetectorAnomalíasService

# Ejecutar detección automática
anomalias = DetectorAnomalíasService.detectar_anomalias(empresa)

print(f"Total anomalías detectadas: {len(anomalias)}")

# Agrupar por tipo
from collections import defaultdict
por_tipo = defaultdict(list)
for a in anomalias:
    por_tipo[a.get_tipo_anomalia_display()].append(a)

for tipo, items in por_tipo.items():
    print(f"\n{tipo} ({len(items)}):")
    for item in items:
        print(f"  - {item.descripcion}")

# Obtener anomalías sin resolver
sin_resolver = DetectorAnomalíasService.obtener_anomalias_sin_resolver(empresa)
print(f"\nAnomalías pendientes de resolver: {sin_resolver.count()}")
```

## Casos de Uso

### 1. Auditoría: ¿Qué pasó con la serie SN-123456?

```
GET /api/auditoria/trazabilidad-series/123/
```

Respuesta: Historial completo con fechas, usuarios, documentos y estados.

### 2. Control: ¿El stock de Widget Pro es correcto?

```
POST /api/auditoria/conciliacion/generar_bodega/
{
    "bodega_id": 1,
    "empresa_id": 1
}
```

Respuesta: Comparación stock registrado vs calculado, con anomalías.

### 3. Detección: ¿Hay problemas silenciosos en el inventario?

```
POST /api/auditoria/anomalias/detectar_anomalias/
{
    "empresa_id": 1
}
```

Respuesta: Lista de anomalías encontradas, con tipo y descripción.

### 4. Reporte: ¿Cuántas salidas hubo hoy?

```
GET /api/auditoria/bitacora-movimientos/resumen_diario/
```

Respuesta: Conteo por tipo de evento del día.

## Consideraciones Técnicas

### Performance

1. **Índices**: Todos los campos de búsqueda frecuente tienen índices
2. **Materialización**: ReporteTrazabilidadSerie cachea datos comunes
3. **Paginación**: API implementa paginación por defecto
4. **Lazy Loading**: Relaciones ForeignKey use `select_related` en vistas

### Integridad

1. **Transacciones ACID**: Registro de movimiento y cambio de estado son atómicos
2. **Auditoría**: BitácoraMovimiento es immutable (nunca se modifica)
3. **Referencia cruzada**: BitácoraSerieMovimiento vincula con BitácoraMovimiento

### Seguridad

1. **Permisos**: API filtra por empresa del usuario
2. **Solo lectura**: BitácoraMovimiento no permite POST/PUT
3. **Resolución de anomalías**: Requiere usuario explícito

## Próximas Fases

- **Fase 4**: Reportes avanzados (PDF, Excel, gráficos)
- **Fase 5**: Alertas automáticas (stock bajo, anomalías críticas)
- **Fase 6**: Integración con sistema de contabilidad
- **Fase 7**: Machine learning para predicción de inconsistencias

