# FASE 5: Dashboard de Indicadores de Salud del Inventario

Documento de referencia para monitoreo post-despliegue, ajustado al esquema real actual del módulo `bodegas`.

> Nota funcional: el esquema actual usa `StockItemEnBodega.item` como `OneToOneField`, por lo que no existe hoy una transferencia nativa del mismo item entre dos bodegas. Para Fase 5, la cobertura deja esto explicitado como restricción del modelo actual y no como flujo operativo soportado.

## Indicadores de Salud en Tiempo Real

### 1. Integridad de Stock
- **Métrica:** % de registros de stock sin cantidades negativas
- **Objetivo:** 100%
- **Alerta crítica:** cualquier registro con `cantidad < 0` o `cantidad_no_disponible < 0`
- **Consulta SQL operable:**
```sql
SELECT
  COUNT(*) FILTER (WHERE cantidad >= 0 AND cantidad_no_disponible >= 0) * 100.0 / NULLIF(COUNT(*), 0) AS pct_stock_sano
FROM bodegas_stockitemenbodega;
```

### 2. Estados válidos de series
- **Estados válidos reales:** `disponible`, `reservada`, `despachada`, `devuelta`
- **Objetivo:** 100%
- **Consulta SQL operable:**
```sql
SELECT
  COUNT(*) FILTER (WHERE estado IN ('disponible','reservada','despachada','devuelta')) * 100.0 / NULLIF(COUNT(*), 0) AS pct_series_validas
FROM bodegas_serieitem;
```

### 3. Series duplicadas por empresa
- **Métrica:** cantidad de duplicados de `serie` por `empresa_id`
- **Objetivo:** 0
- **Consulta SQL operable:**
```sql
SELECT empresa_id, serie, COUNT(*) AS total
FROM bodegas_serieitem
GROUP BY empresa_id, serie
HAVING COUNT(*) > 1
ORDER BY total DESC, empresa_id, serie;
```

### 4. Consistencia stock vs series activas
- **Criterio:** para items seriados, `stock.cantidad` debe coincidir con la cantidad de series en estado `disponible` o `reservada` asociadas al mismo `stock_item`.
- **Tolerancia:** 0 para el gate de go-live.
- **Consulta SQL operable:**
```sql
SELECT
  s.id AS stock_item_id,
  s.bodega_id,
  s.item_id,
  s.cantidad AS stock_agregado,
  COUNT(sr.id) FILTER (WHERE sr.estado IN ('disponible','reservada')) AS series_activas
FROM bodegas_stockitemenbodega s
JOIN items_itemempresa i ON i.id = s.item_id
LEFT JOIN bodegas_serieitem sr ON sr.stock_item_id = s.id
WHERE i.requiere_serie = TRUE
GROUP BY s.id, s.bodega_id, s.item_id, s.cantidad
HAVING s.cantidad <> COUNT(sr.id) FILTER (WHERE sr.estado IN ('disponible','reservada'));
```

### 5. Cobertura de auditoría de movimientos
- **Métrica:** % de movimientos recientes con bitácora asociada
- **Objetivo:** >= 95% en últimas 24h
- **Consulta recomendada en Django shell:**
```python
from datetime import timedelta
from django.utils import timezone
from bodegas.models import BitácoraMovimiento, MovimientoStock

desde = timezone.now() - timedelta(hours=24)
total = MovimientoStock.objects.filter(fecha_creacion__gte=desde).count()
auditados = BitácoraMovimiento.objects.filter(fecha_creacion__gte=desde).exclude(movimiento_stock=None).values('movimiento_stock_id').distinct().count()
pct = 100 if total == 0 else auditados * 100 / total
print({'total': total, 'auditados': auditados, 'pct': pct})
```

### 6. Anomalías abiertas
- **Métrica:** anomalías sin resolver en últimas 24h
- **Objetivo:** 0 críticas, tendencia descendente del resto
- **Consulta recomendada en Django shell:**
```python
from datetime import timedelta
from django.utils import timezone
from bodegas.models import AnomalíaMovimiento

desde = timezone.now() - timedelta(hours=24)
print(AnomalíaMovimiento.objects.filter(fecha_creacion__gte=desde, resuelta=False).count())
```

### 7. Performance de operaciones críticas
| Operación | Objetivo P95 | Alerta |
|---|---:|---:|
| Recepción | < 500 ms | > 1000 ms |
| Transferencia | < 800 ms | > 1500 ms |
| Despacho | < 800 ms | > 2000 ms |
| Devolución | < 800 ms | > 2000 ms |
| Ajuste | < 500 ms | > 1000 ms |

### 8. Disponibilidad del servicio
- **Objetivo:** 99.9%
- **Fuente sugerida:** endpoint de health + comando `post_deployment_health_check`

## Dashboard recomendado
1. **Resumen general**: estado del comando `post_deployment_health_check`.
2. **Stock negativo**: conteo y detalle por bodega/item.
3. **Series por estado**: distribución por `estado`.
4. **Duplicados de serie**: tabla con `empresa`, `serie`, `total`.
5. **Consistencia stock/series**: discrepancias por `stock_item`.
6. **Movimientos auditados**: total vs auditados últimas 24h.
7. **Anomalías abiertas**: tendencia por hora.
8. **Latencia operativa**: P50/P95/P99 por flujo.

## Alertas recomendadas

### CRÍTICA
- Stock negativo detectado
- Serie duplicada por empresa
- Discrepancia stock/series en item seriado
- Downtime no planificado

### ALTA
- Cobertura de auditoría < 95%
- Más de 5 anomalías abiertas en 24h
- Latencia P95 > 2x baseline

### MEDIA
- Estados de serie inválidos
- Aumento sostenido de errores operacionales

## Checklist de monitoreo manual
- [ ] Ejecutar `python manage.py post_deployment_health_check`
- [ ] Revisar duplicados de serie por empresa
- [ ] Revisar discrepancias stock/series
- [ ] Revisar anomalías abiertas
- [ ] Revisar latencia P95 de operaciones críticas
