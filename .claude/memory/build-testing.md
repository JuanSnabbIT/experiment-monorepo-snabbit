---
name: build-testing
description: Validación de build y testing. Comandos, modos, checklist, errores comunes. Usar skill /build-test
lastUpdated: 2026-06-01
relatedFiles:
  - .github/instructions/build-testing.md
  - .github/skills/build-testing/SKILL.md
  - .vscode/tasks.json
---

# Build & Testing Validation

## Cuándo Validar

**OBLIGATORIO antes de:**
- ✅ Commit
- ✅ PR
- ✅ Cambios en backend (`*.py`)
- ✅ Cambios en frontend (`*.tsx`, `*.ts`)

---

## Skill: `/build-test`

**Ubicación:** `.github/skills/build-testing/SKILL.md`

### Modos

```bash
/build-test              # Completo (2-3 min)
/build-test --fast      # Rápido: lint + type check (30s)
/build-test --backend   # Solo backend (1 min)
/build-test --frontend  # Solo frontend (1 min)
/build-test --migration # Migraciones (30s)
```

---

## Validaciones Backend

**Secuencial:**
1. `python manage.py check` — Type check modelos/settings
2. `flake8 backend/` — Linting (0 errores críticos)
3. `python manage.py test` — Tests (si existen)
4. `python manage.py migrate` — BD actualizada

**Ubicación instrucciones:** `.github/skills/build-testing/references/backend-validation.md`

---

## Validaciones Frontend

**Secuencial:**
1. `npm run lint` — ESLint (Airbnb + TS)
2. `npm run prettier:fix` — Formatting
3. `npm run build` — Type check + bundling

**Ubicación instrucciones:** `.github/skills/build-testing/references/frontend-validation.md`

---

## Top 5 Errores

| Error | Fix |
|-------|-----|
| `ModuleNotFoundError: No module named 'X'` | `pip install -r requirements.txt` |
| `Cannot find module '@/X'` | Revisar path alias en tsconfig.json |
| `Type 'X' is not assignable to 'Y'` | Revisar interfaces en `frontend/src/interface/*.interface.ts` |
| `You have unapplied migrations` | `python manage.py migrate` |
| `Property 'X' does not exist on type 'Y'` | Agregar campo en interface (prefijo I) |

**Ubicación completa:** `.github/skills/build-testing/references/error-resolution.md`

---

## Reglas Críticas

🔴 **NUNCA commitear si:**
- `npm run build` falla (frontend)
- `python manage.py check` falla (backend)
- `npm run lint` tiene errores
- Migraciones sin aplicar

🟠 **Verificar primero si:**
- Tests fallan
- ESLint tiene warnings
- Prettier detecta cambios

---

## Checklist Rápida

```
☐ /build-test --fast (o completo)
☐ Revisar errores
☐ Arreglar si aplica (usar error-resolution.md)
☐ Re-ejecutar /build-test
☐ Confirmar: "Ready to commit"
```

---

## Diferencias vs Antiguo Sistema

| Aspecto | Antiguo | Nuevo |
|---------|---------|-------|
| **Validación manual** | Ejecutar 6+ comandos | `/build-test` automático |
| **Documentación** | Fragmentada | Centralizada en .github/skills/build-testing/ |
| **Error help** | Nada | `.github/skills/build-testing/references/error-resolution.md` |
| **Modes** | No había | 5 modos: fast, backend, frontend, migration |
| **Referencia** | No havia | `.github/instructions/build-testing.md` |

---

## Ubicaciones

- **Skill:** `.github/skills/build-testing/SKILL.md`
- **Instrucción:** `.github/instructions/build-testing.md`
- **Backend detalles:** `.github/skills/build-testing/references/backend-validation.md`
- **Frontend detalles:** `.github/skills/build-testing/references/frontend-validation.md`
- **Error resolution:** `.github/skills/build-testing/references/error-resolution.md`

---

## Memoria en Claude

- **Cargada automáticamente** cuando menciones build/test/lint/validate
- **Referencia rápida** a modos, checklist, top errores
- **Link a docs completos** para detalles exhaustivos
