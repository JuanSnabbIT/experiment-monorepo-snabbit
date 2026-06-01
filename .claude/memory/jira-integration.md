---
name: jira-integration
description: Integración Jira CLI — scripts, proyecto SEB, credenciales
lastUpdated: 2026-06-01
relatedFiles:
  - dev/scripts/jira/
  - .github/instructions/jira-guide.md
---

# Jira Integration — CLI Scripts

## Proyecto

**Nombre:** SEB (Snabbit ERP Backend)  
**URL:** https://snabbit.atlassian.net/  
**Tipo:** SCRUM

## Credenciales

**`dev/scripts/jira/.env`** (NO en git):
```
JIRA_URL=https://snabbit.atlassian.net
JIRA_USER=juan@snabbit.cl
JIRA_API_TOKEN=<token_generado_en_atlassian>
JIRA_PROJECT_KEY=SEB
```

**Cómo generar token:**
1. https://id.atlassian.com/manage-profile/security/api-tokens
2. Click "Create API token"
3. Copiar token a `.env`

## Scripts Disponibles

**`listar_proyectos.py`** — Ver todos los proyectos

```bash
python dev/scripts/jira/listar_proyectos.py
# Output: Proyecto SEB (key=SEB), otros...
```

**`crear_historia.py`** — Crear issue de tipo Historia

```bash
python dev/scripts/jira/crear_historia.py \
  --titulo "Agregar notificaciones FCM" \
  --descripcion "Implementar push notifications via Firebase" \
  --assignee juan@snabbit.cl \
  --sprint "Sprint 22"
```

**`gestionar_sprint.py`** — Sprint backlog

```bash
python dev/scripts/jira/gestionar_sprint.py --list
# Muestra issues del sprint actual

python dev/scripts/jira/gestionar_sprint.py --transition SEB-123 "In Progress"
# Cambia estado de issue
```

## Estados de Issue

```
To Do → In Progress → In Review → Done
```

## Labels Usados

- `backend` — Django
- `frontend` — React
- `bug` — Defecto
- `enhancement` — Mejora
- `documentation` — Docs
- `rrhh` — Módulo RRHH
- `contratos` — Módulo contratos
- `ot` — Órdenes de trabajo

## API Usage

```python
from jira_client import JiraClient

client = JiraClient()

# Crear issue
issue = client.create_issue(
    project='SEB',
    issue_type='Story',
    summary='Mi historia',
    description='Descripción detallada',
    assignee='juan@snabbit.cl',
    labels=['backend', 'enhancement'],
    sprint_id=42
)
print(f"Creada: {issue.key}")

# Obtener issue
issue = client.get_issue('SEB-123')
print(f"Estado: {issue.fields.status.name}")

# Transicionar
client.transition_issue('SEB-123', 'In Progress')

# Listar issues del sprint
issues = client.get_sprint_issues('Sprint 22')
```

## Workflow Típico

1. **Crear issue en Jira** (o vía CLI)
2. **Branch local:** `git checkout -b SEB-123-nombre-feature`
3. **Trabajar** en feature
4. **Pull request:** Mencionar issue en descripción (`Closes SEB-123`)
5. **Review** en PR
6. **Merge** → automáticamente cierra issue en Jira

---

**Cuándo usar:** Crear historias, cambiar status de issues, tracking de work
