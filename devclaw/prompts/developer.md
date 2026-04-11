# DEVELOPER Worker Instructions

## Context You Receive

When you start work, you're given:

- **Issue:** number, title, body, URL, labels, state
- **Comments:** full discussion thread on the issue
- **Project:** repo path, base branch, project name, projectSlug

Read the comments carefully — they often contain clarifications, decisions, or scope changes that aren't in the original issue body.

## Workflow — ORDEN ESTRICTO (no saltar pasos)

> ⚠️ CRÍTICO: `work_finish` solo se puede llamar DESPUÉS de tener un PR abierto.
> Hacer el edit antes de crear la rama = commit va a `main` = PR imposible.
> **El orden correcto es: rama → editar → commit → push → PR → work_finish**

### 1. Crear la feature branch

**PRIMER PASO — antes de leer o editar cualquier archivo:**

```bash
cd <repo_path>   # workdir del proyecto (viene en el contexto)
git checkout main
git pull origin main
git checkout -b feature/<issue-id>-<slug>
```

Verifica que estás en la rama correcta antes de continuar:
```bash
git branch --show-current   # debe mostrar feature/<issue-id>-...
```

### 2. Implementar los cambios

- Lee el issue y sus comentarios completos antes de editar
- Los comentarios tienen precedencia sobre el cuerpo original del issue
- Usa `read` para leer archivos, `edit` para modificarlos
- Sigue los patrones existentes del proyecto

### 3. Commit y push

```bash
git add <archivos>
git commit -m "feat: descripción del cambio (#<issue-id>)"
git push -u origin feature/<issue-id>-<slug>
```

Prefijos Conventional Commits: `feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`

### 4. Crear el Pull Request

```bash
gh pr create \
  --base main \
  --head feature/<issue-id>-<slug> \
  --title "feat: descripción (#<issue-id>)" \
  --body "Addresses issue #<issue-id>: <resumen>"
```

**No usar closing keywords** (no "Closes #X", "Fixes #X") — DevClaw gestiona el ciclo de vida del issue.

### 5. Llamar work_finish

Solo AQUÍ, con el PR ya creado:

```
work_finish({ role: "developer", result: "done", projectSlug: "<from task message>", summary: "<what you did>" })
```

Si estás bloqueado: `work_finish({ role: "developer", result: "blocked", projectSlug: "<from task message>", summary: "<qué necesitas>" })`

**Siempre llama work_finish** — incluso si encontraste errores o no pudiste completar la tarea.

---

### Feedback de PR (cambios solicitados / To Improve)

Cuando el mensaje incluye una sección **PR Feedback**, debes actualizar el PR existente — **NO crear uno nuevo**.

Los comentarios del reviewer tienen precedencia sobre el issue original. No revertir el trabajo hecho, solo abordar lo que pide el feedback.

1. Checkout de la rama existente del PR:
   ```bash
   git fetch origin
   git checkout <branch-from-pr>
   ```
2. Hacer solo los cambios del feedback
3. Commit y push a la **misma rama** — el PR se actualiza automáticamente
4. Llamar `work_finish` como siempre

### Identificación de rama en PR Feedback

El mensaje incluirá:
```
🔹 PR: https://github.com/.../pull/123
🔹 Branch: `feature/456-description`
```

Usa ESA rama. No crear una nueva ni adivinar el nombre.

---

## Reglas importantes

- **No hacer merge de PRs** — dejarlos abiertos para review. El sistema auto-mergea cuando se aprueba.
- **Nunca commitear directamente a `main`** — todo cambio va en una feature branch.
- Si encuentras bugs no relacionados, créalos con `task_create({ projectSlug: "...", title: "...", description: "..." })`.

## Herramientas que NO debes usar

Son tools del orquestador. No las llames:
- `task_start`, `tasks_status`, `health`, `project_register`

