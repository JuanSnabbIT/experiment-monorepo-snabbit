---
title: "Observabilidad"
scope: "full-stack"
status: "active"
last_updated: "2025-11-03"
---

# Observabilidad

## Objetivo
Establecer prácticas de logging, métricas y tracing para monitorear, diagnosticar y mejorar la salud del sistema ERP. Aplicable a backend (Django) y frontend (React).

## Reglas clave

### 1. Logging

#### Backend (Django)
- **Niveles**: `DEBUG` (desarrollo), `INFO` (eventos normales), `WARNING` (anomalías), `ERROR` (fallos), `CRITICAL` (fallos graves).
- **Configuración**: en `settings.py` definir handlers, formatters y loggers.
- Ejemplo:
  ```python
  LOGGING = {
      'version': 1,
      'disable_existing_loggers': False,
      'formatters': {
          'verbose': {
              'format': '{levelname} {asctime} {module} {message}',
              'style': '{',
          },
      },
      'handlers': {
          'file': {
              'level': 'INFO',
              'class': 'logging.FileHandler',
              'filename': '/var/log/erp/django.log',
              'formatter': 'verbose',
          },
      },
      'loggers': {
          'django': {
              'handlers': ['file'],
              'level': 'INFO',
              'propagate': True,
          },
          'bodegas': {
              'handlers': ['file'],
              'level': 'DEBUG',
          },
      },
  }
  ```

- **No loguear secretos**: evitar tokens, passwords, datos sensibles.
- **Contexto útil**: incluir IDs de usuario, transacción, request path.
- Ejemplo de uso:
  ```python
  import logging
  
  logger = logging.getLogger(__name__)
  
  def crear_contrato(data):
      logger.info(f"Creando contrato para cliente {data['cliente_id']}")
      try:
          # lógica
          logger.info(f"Contrato {contrato.id} creado exitosamente")
      except Exception as e:
          logger.error(f"Error al crear contrato: {e}", exc_info=True)
          raise
  ```

#### Frontend (React)
- **Console.log en desarrollo**: evitar en producción (usar linter para detectar).
- **Servicios de logging**: usar Sentry, LogRocket o similar para capturar errores y eventos.
- Ejemplo:
  ```typescript
  import * as Sentry from '@sentry/react';
  
  Sentry.init({ dsn: import.meta.env.VITE_SENTRY_DSN });
  
  try {
    // lógica
  } catch (error) {
    Sentry.captureException(error);
    console.error('Error en componente:', error);
  }
  ```

### 2. Métricas

#### Backend (Django)
- **Prometheus**: usar `django-prometheus` para exponer métricas en `/metrics`.
- **Métricas clave**:
  - Latencia de endpoints (p50, p95, p99).
  - Tasa de errores (4xx, 5xx).
  - Throughput (requests/segundo).
  - Uso de recursos (CPU, memoria, conexiones DB).
- Ejemplo de configuración:
  ```python
  # settings.py
  INSTALLED_APPS += ['django_prometheus']
  MIDDLEWARE = [
      'django_prometheus.middleware.PrometheusBeforeMiddleware',
      ...
      'django_prometheus.middleware.PrometheusAfterMiddleware',
  ]
  ```

#### Frontend (React)
- **Web Vitals**: medir LCP (Largest Contentful Paint), FID (First Input Delay), CLS (Cumulative Layout Shift).
- **Custom metrics**: tiempos de carga de páginas, clicks, errores HTTP.
- Ejemplo:
  ```typescript
  import { getCLS, getFID, getLCP } from 'web-vitals';
  
  getCLS(console.log);
  getFID(console.log);
  getLCP(console.log);
  ```

### 3. Tracing (opcional, avanzado)

- **Distributed tracing**: usar OpenTelemetry o Jaeger para seguir requests a través de servicios.
- **Útil en**: arquitecturas de microservicios, debugging de latencia entre servicios.

### 4. Health checks

#### Backend
- **Endpoint `/api/health/`**: validar DB, Redis, Celery.
- Ejemplo:
  ```python
  from rest_framework.decorators import api_view
  from rest_framework.response import Response
  from django.db import connection
  
  @api_view(['GET'])
  def health_check(request):
      try:
          connection.ensure_connection()
          return Response({'status': 'ok', 'db': 'connected'})
      except Exception as e:
          return Response({'status': 'error', 'detail': str(e)}, status=503)
  ```

#### Frontend
- **Endpoint de status**: llamar a `/api/health/` al cargar app; mostrar banner si backend está down.

### 5. Alertas

- **Umbrales**: definir para métricas críticas (latencia > 2s, tasa de error > 5%, uso de CPU > 80%).
- **Notificaciones**: Slack, PagerDuty, email.
- **Escalamiento**: alertas críticas → pager on-call; warnings → canal de monitoreo.

### 6. Dashboards

- **Grafana**: visualizar métricas de Prometheus; dashboards por servicio (backend, Celery, frontend).
- **Paneles clave**:
  - Latencia de endpoints (timeseries).
  - Tasa de error (gauge).
  - Throughput (graph).
  - Uso de recursos (CPU, memoria).

### 7. Retención y rotación de logs

- **Rotación**: usar `logrotate` (Linux) para rotar logs diariamente/semanalmente.
- **Retención**: conservar logs 30-90 días; archivar logs críticos más tiempo.
- **Almacenamiento**: ELK (Elasticsearch, Logstash, Kibana) o similar para búsqueda y análisis.

## Checklist de observabilidad

- [ ] Logging configurado en backend (niveles, handlers, formatters).
- [ ] No se loguean secretos ni datos sensibles.
- [ ] Contexto útil en logs (user_id, request_id, timestamps).
- [ ] Métricas expuestas en `/metrics` (Prometheus).
- [ ] Web Vitals medidas en frontend (LCP, FID, CLS).
- [ ] Health check endpoint implementado y monitoreado.
- [ ] Alertas configuradas para métricas críticas (latencia, tasa de error).
- [ ] Dashboards de Grafana o similar para visualización.
- [ ] Logs rotados y almacenados con retención definida.
- [ ] Sentry o similar habilitado en frontend para captura de errores.

## Referencias cruzadas
- [Backend (Django)](./backend-instructions.md): logging, métricas, health checks.
- [Frontend (React)](./frontend-instructions.md): Web Vitals, captura de errores.
- [Performance](./performance.md): métricas de latencia y throughput.
- [CI/CD](./ci-cd.md): validación de health checks post-deploy.
- [Playbooks](./playbooks.md): uso de logs y métricas en troubleshooting.

---
