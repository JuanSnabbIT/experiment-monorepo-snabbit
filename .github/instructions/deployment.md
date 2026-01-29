# Deployment - Docker y build

Basado en archivos presentes en el repo.

---

## Dockerfiles reales

- Backend: `backend/Dockerfile` (python:3.12-slim, entrypoint.sh)
- Frontend: `frontend/Dockerfile` (node:22-alpine build + nginx:stable-alpine)

---

## Scripts de build/push

En la raiz:
- `build-and-push-backend.ps1`
- `build-and-push-frontend.ps1`

Hay tasks en `.vscode/tasks.json` que invocan estos scripts.

---

## Lo que NO existe en el repo

- No hay `docker-compose.yml`.
- No hay workflows de GitHub Actions en `.github/workflows/`.

Si se requiere, deben agregarse explicitamente.

---

Ultima actualizacion: 2026-01-29
