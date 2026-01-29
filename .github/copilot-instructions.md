# Copilot Instructions - Monorepo ERP

Indice maestro de instrucciones para agentes de IA. Define que cargar segun el alcance y evita contexto innecesario.

---

## Rol de este archivo

- Punto de entrada unico para agentes.
- Dirige al conjunto minimo de instrucciones segun el alcance.
- No es documentacion tecnica del sistema.

---

## Politica de documentacion viva (ver AGENTS.md)

- Documentacion tecnica viva vive en `dev/docs/`.
- Archivos actuales en `dev/docs/`:
  - `analisis.md`
  - `changelog.md`
  - `flujos_operativos.md`
  - `notas.md`
  - `planificacion.md`
  - `sistemas.md`
- Existe `backend/docs/` en el repositorio (legado). No agregar nuevos documentos ahi.
- Crear nuevos documentos solo con solicitud explicita del usuario y cumpliendo el checklist de `AGENTS.md`.

---

## Instrucciones disponibles (reales)

- `AGENTS.md` - reglas transversales y checklist final.
- `.github/instructions/architecture.md` - estructura real del repo y stack.
- `.github/instructions/backend-guide.md` - convenciones backend.
- `.github/instructions/frontend-guide.md` - convenciones frontend.
- `.github/instructions/typescript.instructions.md` - estandares TS/React.
- `.github/instructions/security.md` - seguridad y auth.
- `.github/instructions/testing.md` - pruebas y validaciones.
- `.github/instructions/deployment.md` - build y despliegue.
- `.github/instructions/glossary.md` - glosario del dominio.

---

## Estructura del monorepo (resumen real)

```
monorepo_erp/
├── .github/                # Instrucciones para agentes
├── .vscode/                # Tasks de VS Code
├── backend/                # Django + DRF + Celery + Channels
├── frontend/               # React + TypeScript + Vite
├── dev/                    # docs y scripts de desarrollo
├── postman/                # colecciones
├── build-and-push-backend.ps1
├── build-and-push-frontend.ps1
├── AGENTS.md
└── README.md
```

---

## Routing por alcance (cargar solo lo necesario)

- Backend: `AGENTS.md` + `backend-guide.md`
- Frontend: `AGENTS.md` + `frontend-guide.md` + `typescript.instructions.md`
- Seguridad: `AGENTS.md` + `security.md`
- Testing/validacion: `AGENTS.md` + `testing.md`
- Deployment: `AGENTS.md` + `deployment.md`
- Arquitectura / glosario: `AGENTS.md` + `architecture.md` / `glossary.md`

---

## Ejecucion del entorno

- Hay tareas en `.vscode/tasks.json` para levantar backend, frontend y tareas Celery.
- Si las tasks no estan disponibles, usa comandos documentados en `README.md` y `dev/scripts/`.

---

## Encoding

- Archivos deben guardarse en UTF-8.
- Si ves texto con caracteres corruptos, corrige el archivo y re-guardalo en UTF-8.

---

Ultima actualizacion: 2026-01-29
