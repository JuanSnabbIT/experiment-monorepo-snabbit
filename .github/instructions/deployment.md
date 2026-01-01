# 🚀 Deployment – Docker, CI/CD & Production

Guía de deployment para ambiente local, staging y producción.

---

## 🐳 Docker (Local Development)

### docker-compose.yml

```yaml
version: '3.9'

services:
  # PostgreSQL Database
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: ${POSTGRES_DB:-sw_erp}
      POSTGRES_USER: ${POSTGRES_USER:-postgres}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-postgres}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis Cache
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Django Backend
  web:
    build:
      context: ./backend
      dockerfile: Dockerfile
    command: python manage.py runserver 0.0.0.0:8001
    environment:
      - DEBUG_ENABLE=True
      - POSTGRES_DB=${POSTGRES_DB:-sw_erp}
      - POSTGRES_USER=${POSTGRES_USER:-postgres}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-postgres}
      - POSTGRES_HOST=db
      - POSTGRES_PORT=5432
      - REDIS_HOST=redis
      - REDIS_PORT=6379
    ports:
      - "8001:8001"
    volumes:
      - ./backend:/codigo_proyecto
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy

  # Celery Worker
  celery_worker:
    build:
      context: ./backend
      dockerfile: Dockerfile
    command: celery -A sw_erp worker --loglevel=info
    environment:
      - POSTGRES_DB=${POSTGRES_DB:-sw_erp}
      - POSTGRES_USER=${POSTGRES_USER:-postgres}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-postgres}
      - POSTGRES_HOST=db
      - REDIS_HOST=redis
    depends_on:
      - db
      - redis

  # Celery Beat (Scheduler)
  celery_beat:
    build:
      context: ./backend
      dockerfile: Dockerfile
    command: celery -A sw_erp beat --loglevel=info
    environment:
      - POSTGRES_DB=${POSTGRES_DB:-sw_erp}
      - POSTGRES_USER=${POSTGRES_USER:-postgres}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-postgres}
      - POSTGRES_HOST=db
      - REDIS_HOST=redis
    depends_on:
      - db
      - redis

  # React Frontend
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        VITE_API_URL: http://localhost:8001/api
    ports:
      - "5174:5174"
    volumes:
      - ./frontend:/app
    environment:
      - VITE_API_URL=http://localhost:8001/api

volumes:
  postgres_data:
```

### Iniciar local

```bash
# Desarrollo con docker-compose
docker-compose up -d

# Ver logs
docker-compose logs -f web

# Ejecutar migraciones
docker-compose exec web python manage.py migrate

# Crear superusuario
docker-compose exec web python manage.py createsuperuser

# Detener
docker-compose down
```

---

## 📦 Backend Dockerfile (Producción)

```dockerfile
FROM python:3.11-slim

WORKDIR /codigo_proyecto

# Instalar dependencias del sistema
RUN apt-get update && apt-get install -y --no-install-recommends \
    postgresql-client \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copiar requirements
COPY req.txt .
RUN pip install --no-cache-dir -r req.txt

# Copiar código
COPY . .

# Crear usuario no-root
RUN useradd -m -u 1000 appuser && chown -R appuser /codigo_proyecto
USER appuser

# Exponer puerto
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD python -c "import requests; requests.get('http://localhost:8000/health')"

# Comando por defecto (Daphne ASGI)
CMD ["daphne", "-b", "0.0.0.0", "-p", "8000", "sw_erp.asgi:application"]
```

---

## 📦 Frontend Dockerfile (Producción)

```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage (Nginx)
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### nginx.conf

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;

    # SPA: redirige rutas a index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api/ {
        proxy_pass http://backend:8000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Cache estático
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css text/javascript application/json;
    gzip_min_length 1000;
}
```

---

## 🚀 Deployment a Producción

### 1. Preparar Variables de Entorno

**.env.production:**
```bash
DEBUG_ENABLE=False
SECRET_KEY=tu-secret-key-super-largo
POSTGRES_DB=sw_erp_prod
POSTGRES_USER=postgres_user
POSTGRES_PASSWORD=super-secure-password
POSTGRES_HOST=db.producción.com
POSTGRES_PORT=5432
REDIS_HOST=redis.producción.com
REDIS_PORT=6379
ALLOWED_HOSTS=gestion.snabbit.cl,api.snabbit.cl
CORS_ALLOWED_ORIGINS=https://gestion.snabbit.cl
EMAIL_HOST=smtp.gmail.com
EMAIL_HOST_USER=noreply@snabbit.cl
EMAIL_HOST_PASSWORD=app-password-gmail
```

### 2. Build Docker Images

```bash
# Backend
docker build -t snabbit-backend:latest ./backend

# Frontend
docker build -t snabbit-frontend:latest ./frontend

# Push a registry (ej: Docker Hub, ECR, etc.)
docker tag snabbit-backend:latest myregistry/snabbit-backend:latest
docker push myregistry/snabbit-backend:latest
```

### 3. Kubernetes Deployment (Opcional)

**backend-deployment.yaml:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: snabbit-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: snabbit-backend
  template:
    metadata:
      labels:
        app: snabbit-backend
    spec:
      containers:
      - name: backend
        image: myregistry/snabbit-backend:latest
        ports:
        - containerPort: 8000
        env:
        - name: POSTGRES_HOST
          valueFrom:
            secretKeyRef:
              name: db-secrets
              key: host
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db-secrets
              key: password
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
```

### 4. Migración de BD

```bash
# Antes de deploying
docker run --rm -e POSTGRES_HOST=prod-db snabbit-backend:latest \
  python manage.py migrate

# Crear superusuario
docker run --rm -it -e POSTGRES_HOST=prod-db snabbit-backend:latest \
  python manage.py createsuperuser
```

---

## 📋 CI/CD Pipeline (GitHub Actions)

**.github/workflows/deploy.yml:**
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.11'
    
    - name: Install dependencies
      run: |
        pip install -r backend/req.txt
    
    - name: Run backend tests
      env:
        POSTGRES_HOST: localhost
      run: |
        cd backend && python manage.py test

    - name: Set up Node
      uses: actions/setup-node@v3
      with:
        node-version: '18'
    
    - name: Install frontend dependencies
      run: |
        cd frontend && npm ci
    
    - name: Run frontend tests
      run: |
        cd frontend && npm run test
    
    - name: Build frontend
      run: |
        cd frontend && npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Build and push Docker images
      env:
        REGISTRY: ghcr.io
        IMAGE_NAME: ${{ github.repository }}
      run: |
        docker build -t $REGISTRY/$IMAGE_NAME/backend:${{ github.sha }} ./backend
        docker push $REGISTRY/$IMAGE_NAME/backend:${{ github.sha }}
    
    - name: Deploy to production
      run: |
        # Ejemplo: kubectl apply -f k8s/
        # O: docker-compose pull && docker-compose up -d
        echo "Deploying..."
```

---

## ⚙️ Health Checks

### Backend

```python
# sw_erp/urls.py
from django.http import JsonResponse

def health_check(request):
    return JsonResponse({'status': 'healthy'})

urlpatterns = [
    path('health/', health_check),
    # ...
]
```

### Frontend

```typescript
// Nginx ya sirve index.html en /
// Health check: GET / → 200 OK
```

---

## 📊 Monitoring & Logging

### Backend (Prometheus)

```python
# settings.py
INSTALLED_APPS = [
    'django_prometheus',
    # ...
]

MIDDLEWARE = [
    'django_prometheus.middleware.PrometheusBeforeMiddleware',
    # ...
    'django_prometheus.middleware.PrometheusAfterMiddleware',
]
```

**Métricas en:** `http://backend:8000/metrics`

### Logs

```bash
# Ver logs del container
docker logs -f snabbit-backend

# O enviar a ELK/Splunk (configurar en Django logging)
```

---

## 🔐 Production Checklist

- [ ] `DEBUG_ENABLE = False`
- [ ] `SECRET_KEY` largo y seguro
- [ ] Variables de entorno en `.env.production`
- [ ] HTTPS/TLS habilitado
- [ ] CORS configurado (solo dominios permitidos)
- [ ] Database backups automáticos
- [ ] Logs centralizados
- [ ] Monitoreo de performance
- [ ] Rate limiting en API
- [ ] WAF (Web Application Firewall)
- [ ] Secrets rotados regularmente

---

## 🔗 Referencias

- [Docker Documentation](https://docs.docker.com)
- [Docker Compose Documentation](https://docs.docker.com/compose)
- [Kubernetes Documentation](https://kubernetes.io/docs)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Nginx Documentation](https://nginx.org/en/docs)

**Última actualización:** 2025-12-28

