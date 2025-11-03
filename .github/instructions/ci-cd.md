---
title: "CI/CD"
scope: "proceso"
status: "active"
last_updated: "2025-11-03"
---

# CI/CD

## Objetivo
Definir pipelines de integración continua (CI) y despliegue continuo (CD) para garantizar calidad del código, automatizar tests y desplegar de forma segura y repetible.

## Reglas clave

### 1. Pipeline de CI

#### Triggers
- **Push a ramas**: `main`, `develop`, `feature/*`, `fix/*`.
- **Pull Requests**: validar antes de merge.

#### Jobs principales

1. **Linting y formato**
   - Backend: `ruff` o `flake8` + `black --check` + `isort --check`.
   - Frontend: `eslint` + `prettier --check`.
   - Fallo si hay warnings/errors.

2. **Type checking**
   - Backend: `mypy` (opcional, si se habilita tipado estricto).
   - Frontend: `tsc --noEmit` (validar tipos sin compilar).

3. **Tests**
   - Backend: `python manage.py test` (todos los tests de Django).
   - Frontend: `npm run test` (Jest + RTL).
   - Reportar cobertura (mínimo 70% en módulos críticos).

4. **Build**
   - Backend: validar que `manage.py` y dependencias carguen sin errores.
   - Frontend: `npm run build` (Vite); verificar `dist/` se genera correctamente.

5. **Security scan**
   - Backend: `safety check` (vulnerabilidades en dependencias Python).
   - Frontend: `npm audit` (vulnerabilidades en dependencias Node).

#### Ejemplo de configuración (GitHub Actions)

```yaml
name: CI

on:
  push:
    branches: [main, develop, 'feature/*', 'fix/*']
  pull_request:
    branches: [main, develop]

jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - name: Install dependencies
        run: |
          cd backend
          pip install -r req.txt
      - name: Lint
        run: |
          cd backend
          ruff check .
          black --check .
          isort --check .
      - name: Tests
        run: |
          cd backend
          python manage.py test
  
  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: |
          cd frontend
          npm ci
      - name: Lint
        run: |
          cd frontend
          npm run lint
      - name: Tests
        run: |
          cd frontend
          npm run test
      - name: Build
        run: |
          cd frontend
          npm run build
```

### 2. Pipeline de CD

#### Estrategias de despliegue

- **Manual approval**: deploy a producción requiere aprobación manual (botón en CI).
- **Automated staging**: merge a `develop` → deploy automático a staging.
- **Automated production**: merge a `main` → deploy automático a producción (tras tests).

#### Entornos

- **Development**: local (Docker Compose o servicios manuales).
- **Staging**: réplica de producción con datos de prueba; deploy automático desde `develop`.
- **Production**: deploy desde `main`; validaciones adicionales (smoke tests post-deploy).

#### Pasos de deploy (backend)

1. **Build de imagen Docker**:
   ```bash
   cd backend
   docker build -t contenedores.snabbit.cl/erp_snabbit:backend-$VERSION .
   ```

2. **Push a registry**:
   ```bash
   docker push contenedores.snabbit.cl/erp_snabbit:backend-$VERSION
   ```

3. **Ejecutar migraciones**:
   ```bash
   docker run --rm -e DATABASE_URL=$DB_URL contenedores.snabbit.cl/erp_snabbit:backend-$VERSION python manage.py migrate
   ```

4. **Reiniciar servicios**:
   - Kubernetes: `kubectl rollout restart deployment/erp-backend`
   - Docker Compose: `docker-compose up -d --force-recreate backend`

5. **Smoke tests**:
   - Verificar `/api/health/` responde 200.
   - Validar login y endpoint crítico (ej. `/api/productos/`).

#### Pasos de deploy (frontend)

1. **Build**:
   ```bash
   cd frontend
   npm run build
   ```

2. **Upload a CDN/S3** o **servir desde Nginx**:
   ```bash
   rsync -avz dist/ user@server:/var/www/erp-frontend/
   ```

3. **Invalidar caché** (si usa CDN).

4. **Smoke tests**:
   - Verificar página de login carga.
   - Validar llamadas a API desde UI.

### 3. Rollback

- **Backend**: revertir a versión anterior de imagen Docker; re-ejecutar migraciones si es necesario (con backup de DB).
- **Frontend**: revertir contenido de CDN/Nginx a versión anterior.
- **Proceso**: documentar en [playbooks.md](./playbooks.md); automatizar con scripts.

### 4. Monitoreo post-deploy

- **Logs**: revisar logs de backend (errores 5xx, excepciones no capturadas).
- **Métricas**: validar tráfico, latencia, tasa de error no incrementaron.
- **Alertas**: configurar notificaciones (Slack, PagerDuty) para errores críticos.

### 5. Secretos en CI/CD

- **No hardcodear**: usar variables de entorno seguras (GitHub Secrets, GitLab CI Variables).
- **Rotación**: secretos de CI deben rotarse trimestralmente.
- **Acceso limitado**: solo administradores pueden modificar secretos.

## Checklist de CI/CD

- [ ] Pipeline de CI configurado (linters, tests, build).
- [ ] Cobertura de tests >= 70% en módulos críticos.
- [ ] Scan de seguridad en dependencias (safety, npm audit).
- [ ] Deploy automático a staging desde `develop`.
- [ ] Deploy a producción requiere aprobación manual (o tests adicionales).
- [ ] Migraciones ejecutadas antes de reiniciar servicios.
- [ ] Smoke tests post-deploy (health check, login, endpoints críticos).
- [ ] Rollback documentado y probado (playbooks).
- [ ] Secretos en variables de entorno seguras; rotación trimestral.
- [ ] Monitoreo y alertas configuradas post-deploy.

## Referencias cruzadas
- [Testing](./testing.md): estrategias de tests en CI.
- [Seguridad](./security.md): manejo de secretos, scan de vulnerabilidades.
- [Playbooks](./playbooks.md): procedimientos de rollback y troubleshooting.
- [PR Flow](./pr-flow.md): validaciones pre-merge en CI.

---
