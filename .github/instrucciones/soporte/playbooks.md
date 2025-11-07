---
title: "Playbooks"
scope: "proceso"
status: "active"
last_updated: "2025-11-03"
---

# Playbooks

## Objetivo
Proporcionar procedimientos operativos para onboarding, manejo de incidentes, rollback y troubleshooting común. Destinado a desarrolladores, DevOps y equipos de soporte.

## Reglas clave

### 1. Onboarding (nuevo desarrollador)

#### Prerrequisitos
- [ ] Acceso a repositorio (GitHub).
- [ ] Acceso a servicios: Redis, PostgreSQL (staging/production).
- [ ] Herramientas instaladas: Python 3.11+, Node.js 18+, Docker, Git.

#### Configuración local

1. **Clonar repositorio**:
   ```cmd
   git clone https://github.com/Suikunstito/monorepo_erp.git
   cd monorepo_erp
   ```

2. **Backend**:
   ```cmd
   cd backend
   python -m venv ENV
   ENV\Scripts\activate
   pip install -r req.txt
   copy .env.example .env
   REM Editar .env con valores locales
   ENV\Scripts\python.exe manage.py migrate
   ENV\Scripts\python.exe manage.py createsuperuser
   ENV\Scripts\python.exe manage.py runserver
   ```

3. **Frontend**:
   ```cmd
   cd frontend
   npm install
   copy .env.example .env
   REM Editar .env con VITE_API_URL=http://localhost:8000
   npm run dev
   ```

4. **Redis** (necesario para Celery/Channels):
   - Docker: `docker run -d -p 6379:6379 redis:latest`
   - O instalar servicio local.

5. **Validar**:
   - Backend: `http://localhost:8000/api/health/` → 200.
   - Frontend: `http://localhost:5173` → página de login.

#### Lectura recomendada
- [copilot-instructions.md](../copilot-instructions.md): visión general.
- [backend-instructions.md](./backend/general.md), [frontend-instructions.md](./frontend/general.md): guías técnicas.
- [pr-flow.md](./procesos/pr-flow.md): proceso de contribución.

### 2. Manejo de incidentes

#### Severidad

- **P1 (Crítico)**: servicio caído, pérdida de datos, seguridad comprometida.
  - **Respuesta**: inmediata; escalar a on-call.
  - **Comunicación**: notificar en canal de incidentes cada 30 min.
- **P2 (Alto)**: funcionalidad clave afectada, degradación significativa.
  - **Respuesta**: < 1h; asignar a equipo responsable.
- **P3 (Medio)**: funcionalidad no crítica afectada.
  - **Respuesta**: < 4h; priorizar en sprint.
- **P4 (Bajo)**: mejoras, bugs menores.
  - **Respuesta**: backlog.

#### Procedimiento (P1/P2)

1. **Detectar**: alerta, reporte de usuario, monitoreo.
2. **Contener**: rollback si es necesario (ver sección 3).
3. **Investigar**:
   - Revisar logs: `backend/logs/django.log`, `/var/log/erp/`.
   - Validar métricas: Grafana, Prometheus.
   - Reproducir en staging si es posible.
4. **Corregir**:
   - Aplicar hotfix en rama `hotfix/<descripcion>`.
   - PR expedito con revisión rápida.
   - Deploy a producción tras tests.
5. **Comunicar**:
   - Actualizar status en canal de incidentes.
   - Postmortem en 48h (causa raíz, acciones correctivas, prevención).

### 3. Rollback

#### Backend

1. **Identificar versión estable anterior**:
   ```cmd
   docker images contenedores.snabbit.cl/erp_snabbit
   ```

2. **Revertir imagen**:
   ```cmd
   kubectl set image deployment/erp-backend backend=contenedores.snabbit.cl/erp_snabbit:backend-<version-estable>
   ```
   O con Docker Compose:
   ```cmd
   docker-compose up -d --force-recreate backend
   ```

3. **Revertir migraciones** (si es necesario):
   ```cmd
   docker exec -it erp-backend python manage.py migrate <app> <migration_name>
   ```
   **Precaución**: validar con DBA; backup de DB antes de revertir.

4. **Validar**:
   - Health check: `curl https://api.example.com/api/health/`.
   - Smoke tests: login, endpoints críticos.

#### Frontend

1. **Revertir contenido de CDN/Nginx**:
   ```cmd
   rsync -avz /backup/frontend-<version-estable>/dist/ user@server:/var/www/erp-frontend/
   ```

2. **Invalidar caché** (si usa CDN).

3. **Validar**:
   - Cargar página de login.
   - Validar llamadas a API desde UI.

### 4. Troubleshooting común

#### Backend: "No se conecta a Redis"
- **Síntoma**: Celery o Channels fallan al iniciar.
- **Diagnóstico**:
  ```cmd
  redis-cli ping
  REM Debe responder PONG
  ```
- **Solución**:
  - Verificar `REDIS_HOST` y `REDIS_PORT` en `.env`.
  - Iniciar Redis: `docker run -d -p 6379:6379 redis:latest`.

#### Backend: "JWT inválido/expirado"
- **Síntoma**: Frontend recibe 401 constantemente.
- **Diagnóstico**: revisar `SIMPLE_JWT` en `settings.py` (lifetimes).
- **Solución**:
  - Refrescar token en frontend (`/auth/jwt/refresh`).
  - Ajustar lifetimes si son muy cortos.

#### Frontend: "CORS error"
- **Síntoma**: requests bloqueadas en navegador.
- **Diagnóstico**: revisar `CORS_ALLOWED_ORIGINS` en backend `settings.py`.
- **Solución**:
  - Añadir dominio frontend a lista blanca.
  - En desarrollo: `CORS_ORIGIN_ALLOW_ALL=True` (solo local).

#### Frontend: "Rutas no resuelven en producción"
- **Síntoma**: 404 al recargar página en ruta interna.
- **Diagnóstico**: Nginx no redirige a `index.html`.
- **Solución**:
  ```nginx
  location / {
      try_files $uri $uri/ /index.html;
  }
  ```

#### Tests fallan localmente
- **Diagnóstico**:
  - Backend: validar migraciones aplicadas (`manage.py migrate`).
  - Frontend: limpiar caché (`npm run test -- --clearCache`).
- **Solución**: seguir mensajes de error; revisar fixtures/mocks.

### 5. Comandos útiles

#### Backend
```cmd
REM Crear superusuario
backend\ENV\Scripts\python.exe manage.py createsuperuser

REM Ejecutar shell Django
backend\ENV\Scripts\python.exe manage.py shell

REM Ver migraciones pendientes
backend\ENV\Scripts\python.exe manage.py showmigrations

REM Revertir última migración
backend\ENV\Scripts\python.exe manage.py migrate <app> <migration_name>

REM Ejecutar Celery worker
backend\ENV\Scripts\python.exe -m celery -A sw_erp worker --loglevel=info

REM Ver tareas Celery programadas
backend\ENV\Scripts\python.exe manage.py shell
>>> from django_celery_beat.models import PeriodicTask
>>> PeriodicTask.objects.all()
```

#### Frontend
```cmd
REM Build de producción
npm run build

REM Limpiar caché de tests
npm run test -- --clearCache

REM Analizar bundle
npm run build -- --mode=analyze
```

## Checklist de playbooks

- [ ] Onboarding completo: accesos, configuración local, lectura recomendada.
- [ ] Procedimiento de incidentes definido (P1-P4).
- [ ] Rollback documentado y probado (backend y frontend).
- [ ] Troubleshooting común actualizado con síntomas y soluciones.
- [ ] Comandos útiles documentados y validados.
- [ ] Postmortem realizado tras incidentes P1/P2.

## Referencias cruzadas
- [CI/CD](./procesos/ci-cd.md): rollback automatizado, pipelines.
- [Observabilidad](./procesos/observability.md): uso de logs y métricas en troubleshooting.
- [Seguridad](./procesos/security.md): manejo de secretos, rotación tras incidentes.
- [Backend (Django)](./backend/general.md), [Frontend (React)](./frontend/general.md): guías técnicas.

---
