# FASE 5: Checklist de Rollout y Procedimiento de Contingencia

**Documento de referencia para la go-live del sistema de inventario y series actualizado.**

**Última actualización:** 2026-04-20
**Estado:** Draft pre-despliegue
**Responsable:** Equipo de DevOps + Operaciones

> Restricción conocida del modelo actual: la transferencia entre bodegas del mismo item no está implementada como flujo nativo porque `StockItemEnBodega.item` es `OneToOneField`. Antes de activar ese flujo en producción, se requiere ajuste de modelo y pruebas dedicadas.

---

## 1. Pre-Despliegue (48 horas antes)

### 1.1 Validaciones Técnicas

- [ ] **Backup completo de base de datos**
  - Ejecutar: `pg_dump erp_snabbit > backup_$(date +%Y%m%d_%H%M%S).sql`
  - Verificar integridad: `pg_restore --list backup_*.sql | head -20`
  - Almacenar en ubicación segura (AWS S3, servidor de respaldo)

- [ ] **Ejecución de suite de pruebas**
  - Tests unitarios: `python manage.py test bodegas.tests`
  - Tests de integración (Fase 5): `python manage.py test bodegas.tests_fase5_integracion`
  - Cobertura mínima: 85% en módulos críticos
  - Verificar no hay warnings o errores deprecados

- [ ] **Validación de migraciones pendientes**
  - Listar migraciones: `python manage.py showmigrations`
  - Verificar que todas las fases (1-4) están aplicadas
  - Hacer dry-run: `python manage.py migrate --plan`

- [ ] **Performance baseline en staging**
  - Carga típica de queries
  - Tiempo promedio de operaciones críticas
  - Verificar índices de BD están creados

### 1.2 Preparación de Datos

- [ ] **Saneamiento de datos históricos completado (Fase 4)**
  - Reporte de inconsistencias ejecutado
  - Series duplicadas identificadas
  - Diferencias de stock reconciliadas
  - Archivo de log archivado

- [ ] **Snapshot de estado actual**
  - Total de items por bodega
  - Total de series por estado
  - Movimientos pendientes
  - Usuarios activos

- [ ] **Feature flags configurados**
  - Validaciones en modo observación
  - Alertas configuradas
  - Rollback documentado

### 1.3 Comunicación y Soporte

- [ ] **Notificación a usuarios finales**
  - Email a operarios de bodega
  - Incluir horario y número de soporte
  - Confirmar lectura de usuarios

- [ ] **Equipo de soporte en standby**
  - Turnos asignados para 24 horas
  - Contactos de escalamiento
  - Script de troubleshooting disponible

- [ ] **Documentación operativa actualizada**
  - Guía de rollback disponible
  - Indicadores documentados
  - Procedimiento de reporte de anomalías

---

## 2. Despliegue (Ventana de Mantenimiento)

### 2.1 Pre-Despliegue Inmediato (T-30 min)

- [ ] **Notificación de inicio inmediato**
- [ ] **Snapshots finales de estado de BD**
- [ ] **Verificación de espacio disco**

### 2.2 Despliegue (T-0)

- [ ] Paso 1: Detener aplicación
- [ ] Paso 2: Aplicar migraciones
- [ ] Paso 3: Recopilar archivos estáticos
- [ ] Paso 4: Cargar feature flags
- [ ] Paso 5: Ejecutar jobs de post-despliegue
- [ ] Paso 6: Reiniciar aplicación
- [ ] Paso 7: Verificar logs de inicio

### 2.3 Validación Post-Despliegue Inmediata (T+5 min)

- [ ] **Health check de API**
- [ ] **Prueba de acceso de usuario**
- [ ] **Monitoreo de errores iniciales**

---

## 3. Monitoreo Post-Despliegue (Primeras 24 horas)

### 3.1 Métricas de Salud (Check cada 30 min)

- [ ] **Integridad de stock**
- [ ] **Series en estado anómalo**
- [ ] **Consistencia: stock vs series**
- [ ] **Movimientos con errores de validación**
- [ ] **Performance de operaciones críticas**

### 3.2 Operaciones Supervisadas

- [ ] **Operarios de bodega ejecutan flujo piloto**
- [ ] **Trazabilidad: verificar una serie completa**
- [ ] **Devolución parcial: test de reverso**

### 3.3 Logs y Alertas

- [ ] **Monitoreo de logs**
- [ ] **Alertas configuradas**
- [ ] **Dashboard de monitoreo visible**

### 3.4 Escalamiento de Soporte

- Severidad CRÍTICA: Activar rollback inmediato
- Severidad ALTA: Investigar max 30 min, considerar rollback
- Severidad MEDIA: Logging intenso, no interrumpir, planificar hotfix

---

## 4. Procedimiento de Rollback (Contingencia)

**Activar SOLO si:**
- Stock se corrompe o se vuelve inconsistente
- Pérdida de datos de series o movimientos
- Aplicación completamente no responsiva
- Más de 10 movimientos fallidos consecutivos

### 4.1 Rollback Rápido (< 10 min)

```bash
systemctl stop gunicorn-erp-snabbit
cd /app/erp-snabbit
git checkout main && git pull
python manage.py migrate bodegas 0012
# Restore database
systemctl start gunicorn-erp-snabbit
curl http://localhost:8000/api/health
```

### 4.2 Rollback Controlado

- Disable Feature Flags
- Revertir migraciones en modo seguro
- Verificar integridad
- Reiniciar si OK

### 4.3 Post-Rollback

- [ ] **Notificar a stakeholders**
- [ ] **Investigación post-mortem**
- [ ] **Archivado de logs e incidentes**

---

## 5. Indicadores de Éxito

Después de 24 horas, sistema está **GREEN** si:

- [ ] **Disponibilidad:** 99.5%+ (máx 4 min downtime)
- [ ] **Errores:** < 0.1% de operaciones fallidas
- [ ] **Latencia:** P95 < 1 segundo
- [ ] **Inconsistencias detectadas:** 0 (o < 2 con plan)
- [ ] **Problemas reportados:** 0 (o solo edge cases)
- [ ] **Trazabilidad:** 100% auditada
- [ ] **Series:** 100% sin duplicados
- [ ] **Stock:** consistencia +/- 1%

---

## 6. Estabilización (Días 2-7)

- [ ] **Reducir intensidad de monitoreo**
- [ ] **Auditorías de datos**
- [ ] **Optimización post-despliegue**
- [ ] **Comunicación de éxito**

---

## 7. Apéndice: Scripts de Utilidad

### 7.1 Health Check Post-Despliegue

Ver archivo: `backend/bodegas/management/commands/post_deployment_health_check.py`

### 7.2 Verificación de Integridad de Series

Usar las consultas operables de `dev/docs/fase5_indicadores_salud.md`.

---

## 8. Contactos de Escalamiento

| Rol | Disponibilidad |
|-----|-----------------|
| VP Operaciones | Oficina horas |
| Tech Lead | En standby 24h |
| DBA | En standby 24h |
| Ops Manager | En standby 24h |

---

## 9. Historial de Despliegues

| Fecha | Versión | Resultado | Duración |
|-------|---------|-----------|----------|
| 2026-04-20 | v1.0-fase5 | Pendiente | - |

---

**Documento preparado por:** DevClaw - Fase 5

> Nota de control: los claims de cobertura y monitoreo deben validarse siempre contra los artefactos reales del repositorio y la salida adjunta de tests, sin sobredeclaración.
**Revisado por:** Pendiente
**Aprobado por:** Pendiente

_Última actualización: 2026-04-20_
