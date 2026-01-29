# Architecture - Monorepo ERP

Vision general de la estructura del repo y el stack real (segun archivos del repositorio).

---

## Estructura del monorepo (real)

```
monorepo_erp/
├── .github/
│   ├── copilot-instructions.md
│   └── instructions/
├── .vscode/
├── backend/
│   ├── activos/
│   ├── bd_ciudades/
│   ├── bodegas/
│   ├── calendario/
│   ├── contratos/
│   ├── core/
│   ├── cotizaciones/
│   ├── cuentas/
│   ├── empresas/
│   ├── items/
│   ├── ordentrabajo/
│   ├── ordentrabajov2/
│   ├── recursos/
│   ├── rendiciones/
│   ├── retroalimentacion/
│   ├── vacaciones/
│   ├── visitas/
│   ├── sw_erp/
│   ├── manage.py
│   ├── req.txt
│   ├── Dockerfile
│   ├── Dockerfile.optimized
│   ├── entrypoint.sh
│   └── db.sqlite3
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── tailwind.config.cjs
│   ├── .eslintrc.json
│   ├── prettier.config.cjs
│   ├── Dockerfile
│   └── nginx.conf
├── dev/
│   ├── docs/
│   └── scripts/
├── postman/
├── build-and-push-backend.ps1
├── build-and-push-frontend.ps1
├── AGENTS.md
└── README.md
```

---

## Stack principal (evidencia en `req.txt`, `settings.py`, `package.json`)

### Backend
- Django 5.1.x
- Django REST Framework
- Djoser + SimpleJWT (JWT)
- Celery + Redis
- Channels + Daphne
- django-prometheus
- SQLite en repo para desarrollo (`backend/db.sqlite3`)

### Frontend
- React 18
- TypeScript 5.x
- Vite 5
- Redux Toolkit
- TailwindCSS
- Axios

---

## Integracion y tooling

- Tasks de VS Code en `.vscode/tasks.json` (runserver, dev server, Celery, build/push).
- Scripts de build/push Docker en la raiz: `build-and-push-*.ps1`.
- Dockerfiles dedicados en `backend/` y `frontend/`.

---

## Notas de arquitectura verificables

- Backend publica rutas API via `sw_erp/urls.py` y monta apps bajo `/api/`.
- Auth se monta bajo `/auth/` (Djoser + JWT).
- Frontend usa rutas definidas en `frontend/src/routes/` (aside/content/header/footer).

---

Ultima actualizacion: 2026-01-29
