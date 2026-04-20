# FASE 5: Dashboard de Indicadores de Salud del Inventario

Documento de referencia para monitoreo post-despliegue.

## Indicadores de Salud en Tiempo Real

### 1. Integridad de Stock

**Métrica:** % de ítems con stock consistente
- **Fórmula:** (items_sin_stock_negativo / total_items) * 100
- **Objetivo:** > 99.9%
- **Alerta Crítica:** < 99%
- **Cómo calcular:**
  ```sql
  SELECT COUNT(*) FILTER (WHERE cantidad >= 0 AND cantidad_no_disponible >= 0) 
  / COUNT(*) * 100 as pct_stock_sano
  FROM bodegas_stock_item_en_bodega;
  ```

### 2. Validez de Series

**Métrica:** % de series en estado válido
- **Estados válidos:** available, reserved, in_transit, sold, returned, blocked
- **Objetivo:** 100%
- **Alerta Crítica:** < 99%
- **Cómo calcular:**
  ```sql
  SELECT COUNT(*) FILTER (WHERE estado IN ('available','reserved','in_transit','sold','returned','blocked'))
  / COUNT(*) * 100 as pct_estados_validos
  FROM bodegas_serie_item;
  ```

### 3. Auditoría de Movimientos

**Métrica:** % de movimientos auditados
- **Fórmula:** (movimientos_con_bitacora / total_movimientos) * 100
- **Ventana temporal:** últimas 24 horas
- **Objetivo:** 100%
- **Alerta:** < 95%
- **Cómo calcular:**
  ```sql
  SELECT COUNT(DISTINCT bm.movimiento_stock_id)::float 
  / COUNT(DISTINCT ms.id) * 100 as pct_auditado
  FROM bodegas_movimiento_stock ms
  LEFT JOIN bodegas_bitacora_movimiento bm ON ms.id = bm.movimiento_stock_id
  WHERE ms.fecha >= NOW() - INTERVAL '24 hours';
  ```

### 4. Detectabilidad de Anomalías

**Métrica:** Anomalías detectadas por día
- **Fórmula:** COUNT(anomalías en últimas 24h)
- **Objetivo:** 0 (o < 2 con resolución planificada)
- **Alerta Crítica:** > 5 en 24h
- **Cómo calcular:**
  ```sql
  SELECT COUNT(*) as anomalias_hoy
  FROM bodegas_anomalia_movimiento
  WHERE fecha_deteccion >= NOW() - INTERVAL '24 hours';
  ```

### 5. Consistencia Stock vs Series (Seriados)

**Métrica:** % de ítems seriados sin discrepancia
- **Discrepancia permitida:** ±1 unidad (redondeo)
- **Cómo verificar:**
  ```sql
  -- Por cada bodega/item seriado:
  SELECT bs.bodega_id, bs.item_id, 
         bs.cantidad as stock_agregado,
         COUNT(si.id) FILTER (WHERE si.estado IN ('available','reserved'))
         as series_activas,
         ABS(bs.cantidad - COUNT(si.id) FILTER (WHERE si.estado IN ('available','reserved')))
         as discrepancia
  FROM bodegas_stock_item_en_bodega bs
  LEFT JOIN bodegas_serie_item si ON bs.item_id = si.item_id 
                                  AND bs.bodega_id = si.bodega_actual_id
  WHERE bs.item.requiere_serie = true
  GROUP BY bs.bodega_id, bs.item_id
  HAVING discrepancia > 1;
  ```

### 6. Performance de Operaciones

**Métrica:** Latencia P95 de operaciones críticas

| Operación | P95 Objetivo | Alerta |
|-----------|--------------|--------|
| Recepción de ítem | 500ms | > 1000ms |
| Despacho de ítem | 800ms | > 2000ms |
| Transferencia de serie | 400ms | > 1000ms |
| Consulta de serie | 200ms | > 500ms |
| Búsqueda en bodega | 300ms | > 800ms |

**Cómo medir:** Usar APM (Application Performance Monitoring) o logs de Django

### 7. Disponibilidad del Sistema

**Métrica:** Uptime del servicio de bodega
- **Objetivo:** 99.9% (máx 43 segundos downtime/día)
- **Alerta:** Cualquier downtime no planificado
- **Cómo medir:** Health checks cada 60 segundos

### 8. Cobertura de Trazabilidad

**Métrica:** % de series con historial completo
- **Criterio:** Serie debe tener al menos 1 movimiento registrado en BitácoraSerieMovimiento
- **Objetivo:** 100%
- **Cómo calcular:**
  ```sql
  SELECT COUNT(DISTINCT bsm.serie_id)::float / COUNT(DISTINCT si.id) * 100
  as pct_series_con_historial
  FROM bodegas_serie_item si
  LEFT JOIN bodegas_bitacora_serie_movimiento bsm ON si.id = bsm.serie_id;
  ```

### 9. Detección de Series Duplicadas

**Métrica:** Cantidad de series duplicadas detectadas
- **Objetivo:** 0
- **Alerta:** > 0 (alerta inmediata)
- **Cómo detectar:**
  ```sql
  SELECT numero_serie, COUNT(*) as cantidad
  FROM bodegas_serie_item
  GROUP BY numero_serie
  HAVING COUNT(*) > 1
  ORDER BY cantidad DESC;
  ```

### 10. Tasa de Errores en Operaciones

**Métrica:** % de operaciones rechazadas por validación
- **Fórmula:** (operaciones_validacion_fallida / total_intentos) * 100
- **Ventana:** últimas 24 horas
- **Objetivo:** < 0.5% (solo errores legítimos)
- **Alerta Crítica:** > 2%
- **Cómo medir:** Contar excepciones de validación en logs

---

## Dashboard Recomendado (Grafana / Kibana)

### Panel 1: Heartbeat
```
Indicador grande en verde: ✓ SANO si todos los checks están OK
Indicador rojo si hay problemas críticos
Última actualización: [timestamp]
```

### Panel 2: Stock Overview
```
Gráfico de barras:
- Total items en bodega
- Stock disponible vs no disponible
- Ítems con cantidad negativa (rojo)
```

### Panel 3: Series Status
```
Pie chart:
- Available (verde)
- Reserved (amarillo)
- In_transit (azul)
- Sold (gris)
- Returned (naranja)
- Blocked (rojo)
- Invalid state (rojo oscuro)
```

### Panel 4: Anomalías Detectadas
```
Time series (últimas 24h):
- Línea de anomalías por hora
- Threshold de alerta en Y=5
- Tabla debajo listando anomalías recientes
```

### Panel 5: Auditoría de Movimientos
```
Gauche meter:
- % de movimientos auditados
- Verde si >= 95%
- Naranja si 90-94%
- Rojo si < 90%
```

### Panel 6: Consistencia Series vs Stock
```
Scatter plot:
- X: número de series en bodega
- Y: stock agregado
- Punto = ítem en bodega
- Punto rojo si hay discrepancia > 1
```

### Panel 7: Performance Latency
```
Box plot por operación:
- P50, P95, P99
- Línea de objetivo
- Alertar si P95 > threshold
```

### Panel 8: Histórico de Inconsistencias
```
Table con columnas:
- Fecha detección
- Tipo de inconsistencia
- Bodega afectada
- Item afectado
- Descripción
- Estado (resuelto / pendiente)
```

---

## Alertas Recomendadas

### Severidad: CRÍTICA

Disparar alerta inmediata (pager + email):

1. **Stock Negativo Detectado**
   - Condición: EXISTS (SELECT FROM stock WHERE cantidad < 0)
   - Acción: Page on-call DBA + Ops Manager
   - Timeout: 5 minutos

2. **Serie Duplicada Encontrada**
   - Condición: COUNT(numero_serie) > 1 for any serie
   - Acción: Page Tech Lead
   - Timeout: 15 minutos

3. **Pérdida de Auditoría**
   - Condición: % movimientos sin bitácora > 5% en última hora
   - Acción: Email a Tech Lead + log en Slack
   - Timeout: 30 minutos

4. **Sistema No Disponible**
   - Condición: Health check falla por > 1 minuto
   - Acción: Page on-call
   - Timeout: Inmediato

### Severidad: ALTA

Email + Slack:

1. **Discrepancia Stock/Series**
   - Condición: Discrepancia > 1 en 3+ bodegas
   - Acción: Email a Operaciones + Tech Lead
   - Investigación: < 1 hora

2. **Múltiples Anomalías Detectadas**
   - Condición: > 5 anomalías en 24 horas
   - Acción: Email a Team
   - Investigación: < 4 horas

3. **Performance Degradado**
   - Condición: P95 latencia > 2x baseline
   - Acción: Email a Tech Lead
   - Investigación: < 2 horas

### Severidad: MEDIA

Log + Panel Visible:

1. **Estados de Serie Inválidos**
   - Condición: > 0 series con estado no reconocido
   - Acción: Log en Slack, visible en dashboard
   - Investigación: < 24 horas

2. **Cobertura de Auditoría Baja**
   - Condición: < 95% movimientos auditados
   - Acción: Log en Slack
   - Investigación: < 24 horas

---

## Queries para Monitoreo Manual

### Verificar salud general (60 segundos)

```sql
-- 1. Stock sin issues
SELECT COUNT(*) as items_sanos
FROM bodegas_stock_item_en_bodega
WHERE cantidad >= 0 AND cantidad_no_disponible >= 0;

-- 2. Series activas sin issues
SELECT COUNT(*) as series_activas_sanas
FROM bodegas_serie_item
WHERE estado IN ('available','reserved','in_transit') 
  AND bodega_actual_id IS NOT NULL;

-- 3. Movimientos sin auditoría (últimas 2h)
SELECT COUNT(DISTINCT ms.id) as movimientos_sin_auditoria
FROM bodegas_movimiento_stock ms
LEFT JOIN bodegas_bitacora_movimiento bm ON ms.id = bm.movimiento_stock_id
WHERE ms.fecha >= NOW() - INTERVAL '2 hours'
  AND bm.id IS NULL;

-- 4. Anomalías en última hora
SELECT COUNT(*) as anomalias_recientes
FROM bodegas_anomalia_movimiento
WHERE fecha_deteccion >= NOW() - INTERVAL '1 hour';
```

### Investigación de inconsistencias

```sql
-- 1. Bodegas con discrepancia stock vs series
SELECT 
    sb.nombre as bodega,
    si.nombre as item,
    bs.cantidad as stock_agregado,
    COUNT(ser.id) as series_activas,
    ABS(bs.cantidad - COUNT(ser.id)) as discrepancia
FROM bodegas_stock_item_en_bodega bs
JOIN bodegas_bodega sb ON bs.bodega_id = sb.id
JOIN items_item_empresa si ON bs.item_id = si.id
LEFT JOIN bodegas_serie_item ser ON bs.item_id = ser.item_id
  AND bs.bodega_id = ser.bodega_actual_id
  AND ser.estado IN ('available', 'reserved')
WHERE si.requiere_serie = true
GROUP BY bs.id, sb.id, si.id
HAVING ABS(bs.cantidad - COUNT(ser.id)) > 1
ORDER BY discrepancia DESC;

-- 2. Series en estado inválido
SELECT numero_serie, estado, COUNT(*) as qty
FROM bodegas_serie_item
WHERE estado NOT IN ('available','reserved','in_transit','sold','returned','blocked')
GROUP BY numero_serie, estado;

-- 3. Series sin bodega en estado activo
SELECT numero_serie, estado, COUNT(*) as qty
FROM bodegas_serie_item
WHERE bodega_actual_id IS NULL
  AND estado IN ('available', 'reserved')
GROUP BY numero_serie, estado;
```

---

## Procedimiento de Respuesta a Alertas

### Si se dispara alerta CRÍTICA:

1. **Primeros 5 minutos:**
   - Verificar alerta es verdadera (ejecutar query manualmente)
   - Notificar al on-call engineer
   - Iniciar investigación

2. **Próximos 15 minutos:**
   - Recolectar evidencia (logs, snapshots)
   - Determinar impacto operativo
   - Decidir: Fix en vivo o Rollback

3. **Si Rollback es necesario:**
   - Consultar FASE5_ROLLOUT_CHECKLIST.md sección 4
   - Ejecutar procedimiento de rollback

### Si se dispara alerta ALTA:

1. **Primeros 30 minutos:**
   - Investigar causa
   - Recolectar logs relevantes
   - Escalamiento si es necesario

2. **Plan de acción:**
   - Fix en vivo (si es seguro)
   - Planificar hotfix
   - Comunicar a stakeholders si impacta operación

---

## Checklist de Monitoreo Diario

- [ ] Revisar dashboard a primera hora
- [ ] Ejecutar queries de salud general
- [ ] Revisar logs de errores del día anterior
- [ ] Verificar no hay alertas pendientes
- [ ] Documentar cualquier anomalía
- [ ] Revisar trends de performance
- [ ] Comunicar status a stakeholders
