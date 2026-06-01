---
name: deployment
description: Docker, build scripts PowerShell, deploy backend/frontend
lastUpdated: 2026-06-01
relatedFiles:
  - Dockerfile
  - docker-compose.yml
  - build-and-push-backend.ps1
  - build-and-push-frontend.ps1
---

# Deployment — Docker & Build

## Docker Compose (Dev)

**`docker-compose.yml`** — Stack local con PostgreSQL + Redis

```bash
docker-compose up -d
# Servicios:
# - postgres:latest (puerto 5432)
# - redis:latest (puerto 6379)
# - Django runserver (puerto 8000)
# - Vite dev server (puerto 5173)
```

## Backend Build

**`Dockerfile`** — Django + Gunicorn

```bash
# Build image
docker build -t snabbit-backend:latest -f Dockerfile .

# Run container
docker run -p 8000:8000 \
  -e DATABASE_URL=postgresql://... \
  -e REDIS_URL=redis://... \
  snabbit-backend:latest
```

**Scripts PowerShell** (Windows):

```powershell
# build-and-push-backend.ps1
cd backend
pip install -r requirements.txt
python manage.py collectstatic --noinput
docker build -t snabbit-backend:$(date +%Y%m%d) .
docker push <registry>/snabbit-backend:latest
```

## Frontend Build

**Vite Production:**

```bash
cd frontend
npm run build  # Genera dist/
# Output: dist/index.html + assets/

npm run preview  # Preview local (puerto 4173)
```

**`Dockerfile` Frontend:**

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json .
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
```

## Environment Variables

**Backend (`backend/.env`)**
```
DEBUG=False
DATABASE_URL=postgresql://user:pass@localhost:5432/snabbit
REDIS_URL=redis://localhost:6379
SECRET_KEY=...
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY=...
```

**Frontend (`frontend/.env`)**
```
VITE_API_URL=https://api.snabbit.cl
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_VAPID_KEY=...
```

## Production Checklist

```
Backend:
☐ DEBUG=False
☐ ALLOWED_HOSTS configurado
☐ SECRET_KEY secreto
☐ Database: PostgreSQL (no SQLite)
☐ Redis para Celery
☐ Collectstatic ejecutado
☐ Migrations aplicadas
☐ Gunicorn configurado

Frontend:
☐ npm run build exitoso
☐ dist/ generado correctamente
☐ VITE_API_URL apunta a backend correcto
☐ Firebase vars configuradas
☐ Gzip/Brotli enabled en nginx
```

---

**Cuándo usar:** Deploy a prod, Docker troubleshooting, CI/CD setup
