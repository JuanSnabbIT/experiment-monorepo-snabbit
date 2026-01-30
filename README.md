# Monorepo ERP Snabbit

Repositorio monorepo con backend Django y frontend React.

---

## Estructura (resumen)

```
monorepo_erp/
├── .github/                # instrucciones para agentes
├── .vscode/                # tasks VS Code
├── backend/                # Django + DRF + Celery + Channels
├── frontend/               # React + TypeScript + Vite
├── dev/                    # docs y scripts de desarrollo
├── postman/
├── build-and-push-*.ps1
├── AGENTS.md
└── README.md
```

---

## Inicio rapido

### Backend

```
cd backend
python -m venv ENV
ENV\Scripts\activate
pip install -r req.txt
python manage.py migrate
python manage.py runserver
```

### Frontend

```
cd frontend
npm install
npm run dev
```

### VS Code Tasks

- Ver `.vscode/tasks.json` para tareas de backend, frontend y Celery.

---

## Scripts de setup (dev/scripts)

- `dev/scripts/setup/setup_superuser.py`
- `dev/scripts/setup/seed_base.py`
- `dev/scripts/setup/reset_db.py` (destructivo)

---

## Instrucciones para agentes

- `AGENTS.md`
- `.github/copilot-instructions.md`
- `.github/instructions/architecture.md`
- `.github/instructions/backend-guide.md`
- `.github/instructions/frontend-guide.md`
- `.github/instructions/typescript.instructions.md`
- `.github/instructions/security.md`
- `.github/instructions/testing.md`
- `.github/instructions/deployment.md`
- `.github/instructions/glossary.md`

---

## Documentacion

- Documentacion viva en `dev/docs/`.
- Existe `backend/docs/` como legado (no agregar nuevos documentos ahi).

---

Ultima actualizacion: 2026-01-29
