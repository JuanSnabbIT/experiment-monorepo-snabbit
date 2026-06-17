---
description: Genera commits semánticos agrupados por módulo con etiqueta de semana del año. Ejecuta pre-flight checks en paralelo, analiza el diff, agrupa por dominio y crea commits atómicos con referencia al sprint. Crea git tag al finalizar.
allowed-tools: Bash, PowerShell, Read, Glob, Grep, Agent, TodoWrite
---

Eres el orquestador del flujo de commit de sprint para el monorepo ERP Snabbit.
Tu trabajo es producir commits semánticos y atómicos, NO un commit monolítico por sprint.

## Argumentos

`$ARGUMENTS` puede contener:
- Número de semana override (ej: `25`) — si se omite, se calcula automáticamente
- Nombre de sprint Jira (ej: `SEB-Sprint-25`) — para incluir en el body del commit

---

## Paso 1 — Calcular semana del sprint

Ejecuta esto para obtener el número de semana ISO del año actual:

```powershell
python -c "from datetime import date; print(date.today().isocalendar()[1])"
```

Si `$ARGUMENTS` contiene un número de semana, úsalo en lugar del calculado.
Forma la etiqueta: `Sprint Semana {N}` (ej: `Sprint Semana 25`).

---

## Paso 2 — Pre-flight checks en paralelo (patrón orquestador)

Despacha DOS agentes en paralelo — uno por dominio, sin dependencia entre ellos:

**Agente A — TypeScript check:**
```
Ejecuta en c:/proyectos/experiment-monorepo-snabbit/frontend:
  npx tsc --noEmit --project tsconfig.app.json 2>&1

Reporta: PASS si exit 0, o lista de errores TS si falla.
No corrijas nada — solo reporta.
```

**Agente B — Django check:**
```
Ejecuta:
  & "C:\Users\soporte\.conda\envs\ENV\python.exe" "c:\proyectos\experiment-monorepo-snabbit\backend\manage.py" check 2>&1

Reporta: PASS si "System check identified no issues", o lista de issues si falla.
No corrijas nada — solo reporta.
```

**Si cualquier agente reporta FAIL → detente y muestra los errores. No continues al Paso 3 sin confirmación explícita del usuario.**

---

## Paso 3 — Analizar el diff completo

Ejecuta en secuencia:

```bash
git diff --stat HEAD
git diff --name-only HEAD
git status --short
```

Con los archivos modificados, agrúpalos por dominio usando esta lógica de mapeo:

| Patrón de ruta | Dominio | Prefijo commit |
|---|---|---|
| `backend/rrhh/` | rrhh | `feat/fix/refactor(rrhh):` |
| `backend/contratos/` | contratos | `feat/fix/refactor(contratos):` |
| `backend/cotizaciones/` | cotizaciones | `feat/fix/refactor(cotizaciones):` |
| `backend/bodegas/` | bodegas | `feat/fix/refactor(bodegas):` |
| `backend/empresas/` | empresas | `feat/fix/refactor(empresas):` |
| `backend/ordentrabajov3/` | ordentrabajov3 | `feat/fix/refactor(ordentrabajov3):` |
| `backend/core/` | core | `feat/fix/refactor(core):` |
| `backend/*/migrations/` | migrations | `chore(migrations):` |
| `frontend/src/pages/RRHH/` | rrhh | `feat/fix/refactor(rrhh):` |
| `frontend/src/pages/Clientes/` | clientes | `feat/fix/refactor(clientes):` |
| `frontend/src/pages/Contratos/` | contratos | `feat/fix/refactor(contratos):` |
| `frontend/src/pages/Bodegas/` | bodegas | `feat/fix/refactor(bodegas):` |
| `frontend/src/store/slices/` | store | `feat/fix(store):` |
| `frontend/src/interface/` | types | `chore(types):` |
| `frontend/src/hooks/` | hooks | `feat/fix(hooks):` |
| `.claude/` | claude | `chore(claude):` |
| `.github/` | docs | `docs:` |
| `dev/` | docs | `docs:` |

**Regla de agrupación:** Si un dominio tiene cambios tanto en frontend como en backend (ej: `rrhh` tiene archivos en `backend/rrhh/` y `frontend/src/pages/RRHH/`), agrúpalos en UN SOLO commit con scope `(rrhh)` y menciona ambas capas en el mensaje.

**Regla de tipo:** Determina el tipo (`feat`, `fix`, `refactor`, `chore`, `docs`) por el contenido del diff, no por el nombre del archivo:
- Nuevo endpoint / nueva vista / nueva funcionalidad → `feat`
- Corrección de bug / error TS / error runtime → `fix`
- Reorganización sin cambio de comportamiento → `refactor`
- Migraciones, configuración, dependencias → `chore`
- Solo documentación → `docs`

---

## Paso 4 — Mostrar plan de commits y pedir confirmación

Antes de ejecutar CUALQUIER commit, muestra al usuario el plan completo:

```
PLAN DE COMMITS — Sprint Semana {N}
=====================================

[1] fix(rrhh): corregir propiedad nombre_usuario en wizard de contrato
    Archivos: frontend/src/pages/RRHH/modals/CrearContratoTrabajadorWizard.tsx

[2] feat(clientes): actualizar tablas de contratos y usuarios del cliente
    Archivos: frontend/src/pages/Clientes/components/TablaContratosLaboralesCliente.tsx
              frontend/src/pages/Clientes/components/TablaUsuariosDelCliente.tsx

[3] chore(store): actualizar cargoCatalogoApi
    Archivos: frontend/src/store/slices/rrhh/cargoCatalogoApi.ts

Tag a crear: sprint-{N}

¿Proceder con estos commits? (confirma o ajusta)
```

**No hagas ningún commit hasta recibir confirmación.**

---

## Paso 5 — Ejecutar commits

Para cada grupo confirmado, ejecuta en este orden:

1. Stage solo los archivos del grupo:
   ```bash
   git add <archivo1> <archivo2> ...
   ```

2. Commit con body de sprint:
   ```bash
   git commit -m "$(cat <<'EOF'
   {tipo}({scope}): {descripción concisa en español}

   Sprint: Semana {N}
   Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
   EOF
   )"
   ```

3. Verifica que el commit fue exitoso antes de continuar con el siguiente grupo.

**Si un pre-commit hook falla:** muestra el error, NO uses `--no-verify`, pide al usuario que lo resuelva.

---

## Paso 6 — Crear git tag de sprint

Una vez todos los commits estén aplicados:

```bash
git tag sprint-{N} -m "Sprint Semana {N}"
```

Confirma al usuario: `Tag sprint-{N} creado en {hash corto del HEAD}`

---

## Paso 7 — Resumen final

Muestra:
- Lista de commits creados (hash + mensaje)
- Tag creado
- Comando para pushear: `git push && git push origin sprint-{N}`

**No ejecutes el push automáticamente.** El usuario decide cuándo pushear.

---

## Restricciones críticas

- NUNCA uses `git add .` o `git add -A` — siempre archivos específicos
- NUNCA uses `--no-verify` ni `--no-gpg-sign`
- NUNCA hagas `git commit --amend` — siempre commits nuevos
- NUNCA pushes sin confirmación explícita del usuario
- Si hay archivos en staging previo (`git status` muestra cambios ya en index), pregunta al usuario antes de incluirlos
- Archivos `.env`, `*.sqlite3`, `db*.sqlite3` nunca deben commitearse — advierte si aparecen en el diff
