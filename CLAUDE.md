# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This System Is

Multi-empresa ERP for IT service management. It lets service-provider companies manage work orders, quotations, inventory, contracts, expense reports, equipment assets, support visits, and scheduling. The backend is the authority for business logic; the frontend is a thin React SPA that reads and mutates state exclusively through RTK Query → DRF.

---

## Development Commands

### Backend (run from `backend/`)

```bash
python manage.py runserver 0.0.0.0:8000
python manage.py makemigrations
python manage.py migrate
python manage.py makemigrations --dry-run   # preview before applying

# Tests
python manage.py test                                             # all
python manage.py test nombre_app                                  # single app
python manage.py test nombre_app.tests.TestClass.test_method      # single test
python manage.py test -v 2                                        # verbose

# Workers (separate terminals)
celery -A sw_erp worker --loglevel=info
celery -A sw_erp beat --loglevel=info
```

### Frontend (run from `frontend/`)

```bash
npm run dev            # Vite dev server → http://localhost:5173
npm run build          # tsc + vite build (also type-checks)
npm run lint           # ESLint check
npm run lint:fix       # ESLint auto-fix
npm run prettier:fix   # Prettier format
npx tsc --noEmit       # type-check only, no output
```

### Pre-commit checklist

```bash
# Backend
python manage.py makemigrations --dry-run && python manage.py test

# Frontend
npm run lint && npm run build
```

### VS Code Tasks

`.vscode/tasks.json` has pre-configured tasks for: Backend runserver, Celery Worker, Celery Beat, Migrations, Frontend dev server, Docker build+push.

---

## Architecture

### Stack

| Layer | Technology |
|-------|------------|
| Backend | Python 3.12, Django 5.1, DRF, Celery + Redis, Daphne ASGI |
| Auth | Djoser + SimpleJWT — 5h access / 10h refresh, login via email |
| Database | PostgreSQL (prod), dev DB selected by `TESTING = True` in `settings.py` |
| Frontend | React 18, TypeScript 5 strict, Vite 5, Redux Toolkit + RTK Query |
| HTTP | Axios (`BaseService.ts`) → JWT injected automatically |

### Multi-Tenancy — CRITICAL

Every ViewSet **must** filter by the authenticated user's company. Omitting this causes data leakage between companies.

```python
from core.models import PersonalizacionUsuario

def get_queryset(self):
    user = self.request.user
    personalizacion = PersonalizacionUsuario.objects.filter(usuario=user).first()
    if personalizacion and personalizacion.sucursal_principal:
        empresa = personalizacion.sucursal_principal.empresa
        return MiModelo.objects.filter(empresa=empresa)
    return MiModelo.objects.none()
```

`PersonalizacionUsuario` (in `core/models.py`) is the tenant anchor: user → `SucursalEmpresa` → `Empresa`.

**Known gap:** `OrdenDeTrabajoViewSet` in `ordentrabajov2/views.py` does not yet implement this filter.

### Backend Conventions

- All models inherit `ModeloBase` or `ModeloBaseHistorico` (from `core/models.py`).
- `ModeloBaseHistorico` adds `django-simple-history` audit trail.
- URL naming: **kebab-case** (e.g., `/api/ordenes-de-trabajo/`), all under `/api/` prefix.
- Naming: models PascalCase, ViewSets `{Modelo}ViewSet`, serializers `{Modelo}Serializer`, files snake_case.
- Custom ViewSet actions use `@action(detail=True/False, methods=[...], url_path="kebab-name")`.
- State transitions validated explicitly — map of `{current_state: [allowed_next_states]}` before saving.
- **`ordentrabajo` (V1) is disabled** — use `ordentrabajov2` only.
- Work order states: `pendiente → en_proceso → completada → cerrada → facturada`.

### Stock Movements

All inventory mutations go through `backend/bodegas/movimientos.py`. The `cantidad` parameter is always a **delta** (not an absolute balance):

```python
from bodegas.movimientos import registrar_entrada, registrar_salida, registrar_ajuste_inventario
registrar_salida(bodega, item, cantidad=5, ...)   # 5 units removed, NOT "set stock to 5"
```

### Frontend Conventions

**Page structure:** Every page follows `PageWrapper → Subheader (SubheaderLeft/Right) → Container → Card (CardHeader/CardBody)`.

**UI components:** Import exclusively from `@/components/ui/` and `@/components/form/`. Never create new base UI components — the source of truth is `tema_base/fyr-vite/` (read-only).

**Data fetching:** RTK Query only. Use `invalidatesTags` after mutations — never call `.refetch()` manually.

**Error handling:** Always use `getErrorMessage` from `@/utils/errorHandlers.ts` inside catch blocks.

**Naming:**
- TypeScript interfaces: prefix `I` (e.g., `IOrdenDeTrabajo`)
- TypeScript types: no prefix (e.g., `TSelectOption`)
- Slice files: `{modulo}Slice.ts` / `{modulo}Api.ts`

**Icons:** Use Heroicons via the `icon` prop with `'Hero'` prefix: `<Button icon='HeroArrowLeft'>`.

**Forms:** Formik + Yup for all form state and validation.

### Frontend ↔ Backend Communication

- `BaseService.ts` reads `VITE_API_URL` and injects `Authorization: Bearer <token>` from Redux `auth.access`.
- 401 → auto token refresh at `/auth/jwt/refresh/` with a semaphore to queue concurrent requests. If refresh fails: toast + store purge + redirect to `/login`.
- `RtkQueryService.ts` wraps Axios as `axiosBaseQuery` for RTK Query. Has 75+ registered tag types.
- Legacy imperative calls use `ApiService.fetchData<T>()` — prefer RTK Query for new code.

---

## Environment Setup

No docker-compose exists. PostgreSQL and Redis must be started externally.

### Backend `.env` (in `backend/`)

```
SECRET_KEY, DEBUG, HOSTAPIV2, LOCALHOST_IP
POSTGRES_DB_ERP_DEV, POSTGRES_DB_ERP_PRODUC, POSTGRES_DB_COMUNAS
POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_HOST, POSTGRES_PORT
REDIS_HOST, REDIS_PORT
FRONTEND_URL
HOSTCORREO, CORREO_APPWEB, PASSWORDCORREO
```

`TESTING = True` in `settings.py` selects the dev DB — change manually to switch.

### Frontend `.env`

```
VITE_API_URL=http://localhost:8000
```

---

## Documentation Policy

- Technical docs go **only** in `dev/docs/` — never in root, `backend/docs/`, or `frontend/docs/`.
- Temporary/debug scripts go in `dev/scripts/` and must be deleted after use.
- Do not create new `.md` files in `dev/docs/` unless explicitly requested by the user AND the content describes a live production system with a horizon > 6 months. Default: update existing docs or respond without creating files.
- Prefer updating existing documents over creating new ones.

---

## Encoding

All files must be saved as **UTF-8 without BOM**. Spanish characters corrupt silently if encoding is wrong. If you see mojibake (`Ã³`, `Ã±`, `â€"`), fix encoding before editing. In Python scripts, use `open(path, 'w', encoding='utf-8')`. In PowerShell, use `[System.IO.File]::WriteAllText(path, content, New-Object System.Text.UTF8Encoding $false)` — never `Set-Content` or `Out-File` without `-Encoding UTF8`.

---

## Key Reference Files

| File | Purpose |
|------|---------|
| `AGENTS.md` | Cross-cutting AI agent behavior rules and documentation policy |
| `.github/copilot-instructions.md` | Master index of all instruction files |
| `.github/instructions/backend-guide.md` | Django/DRF ViewSet patterns |
| `.github/instructions/frontend-patterns.md` | React page and component patterns |
| `.github/instructions/rtk-query-best-practices.md` | RTK Query tag/invalidation rules |
| `.github/instructions/visual-consistency.md` | UI component usage rules |
| `.github/instructions/glossary.md` | Business and technical glossary |
| `dev/docs/` | Living documentation for production systems |
| `postman/` | API collections (base_url: `http://localhost:8000`, auth: Bearer JWT) |
