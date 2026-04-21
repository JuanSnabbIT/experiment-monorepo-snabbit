# Fase 4 - Deteccion y Saneamiento de Datos Historicos

## Contexto

Plan de saneamiento de datos historicos - Fase 4 del proyecto de alineacion.
Depende de: Fases 0-3 (issues #41-#44). Issue de referencia: #45.

## Inconsistencias detectadas y abordadas

1. Series duplicadas: misma serie+empresa -> AnomaliaMovimiento (revision manual)
2. Series huerfanas: stock_item=NULL -> AnomaliaMovimiento (revision manual)
3. Series en estado invalido: corregidas automaticamente a 'disponible'
4. Series activas > stock disponible -> AnomaliaMovimiento (revision manual)
5. Stock negativo -> AnomaliaMovimiento (revision manual)
6. MovimientoStock huerfanos: content_type=NULL -> AnomaliaMovimiento

## Modelos creados (migracion 0013)

- BitacoraMovimiento: Registro inmutable de eventos de stock
- BitacoraSerieMovimiento: Historial de cambios de estado por serie
- ReporteTrazabilidadSerie: Cache de trazabilidad por serie
- ReporteConciliacion: Reporte de conciliacion stock vs bitacora
- AnomaliaMovimiento: Registro de anomalias con ciclo de resolucion

## Comando de saneamiento

    python manage.py sanear_datos_historicos --reporte
    python manage.py sanear_datos_historicos --sanear
    python manage.py sanear_datos_historicos --sanear --dry-run
    python manage.py sanear_datos_historicos --sanear --empresa-id 5
    python manage.py sanear_datos_historicos --reporte --output /tmp/reporte_fase4.json

## Proceso recomendado

1. Ejecutar --reporte para linea base de inconsistencias
2. Verificar con --dry-run antes de aplicar
3. Aplicar con --sanear
4. Revisar AnomaliaMovimiento en Django Admin para casos pendientes
5. Usar ConciliacionService para conciliacion periodica post-deploy

## Trazabilidad

Correcciones registradas en AnomaliaMovimiento (nota_resolucion, fecha_resolucion).
Logs del comando en logging.INFO/WARNING para auditoria.
