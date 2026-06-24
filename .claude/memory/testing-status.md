---
name: testing-status
description: Cobertura real de tests por módulo — 357 tests backend funcionales. Frontend sin runner configurado.
lastUpdated: 2026-06-22
relatedFiles:
  - backend/*/tests/
  - .github/skills/qa-suite/SKILL.md
---

# Testing Status — Cobertura Real

## Backend — Estado Actual (verificado 2026-06-22)

357 tests reales distribuidos en los módulos más críticos.

| App | Tests | Archivo(s) | Cobertura |
|-----|-------|-----------|-----------|
| contratos | 154 | test_views.py (110), test_models.py (32), test_plantilla_v2.py (12) | Multi-tenancy, estados, PDF, firma, licencias |
| notificaciones | 48 | tests.py | Eventos, grupos, Celery |
| rrhh | 43 | test_views.py (29), test_atomicity.py (14) | Tenancy, estados contrato, creación atómica |
| cotizaciones | 27 | tests.py | Flujo cotización |
| bodegas | 28 | tests_validaciones.py (22), tests_tenancy_series_plan.py (6) | Validaciones stock, tenancy |
| ordentrabajov3 | 34 | test_prefactura_otv3.py (30), test_solicitante_prospecto_otv3.py (4) | Prefactura, solicitantes |
| retroalimentacion | 12 | test_public_otv3.py | Rutas públicas |
| recursos | 7 | tests.py | — |
| core | 4 | tests.py | — |
| contratos (celery) | 2 | test_celery_schedule.py | Imports de tareas beat |

## Módulos sin tests (brechas críticas)

| App | Riesgo | Razón |
|-----|--------|-------|
| **empresas** | 🔴 CRÍTICO | Multi-tenancy base sin probar — si falla, todos los filtros de empresa fallan |
| **cuentas** | 🔴 CRÍTICO | Custom User Model sin ningún test |
| **vacaciones** | 🔴 Alto | Flujo de solicitud + aprobación sin cobertura |
| **rendiciones** | 🔴 Alto | Lógica financiera de rendición de gastos sin tests |
| activos, calendario, items, visitas, ordentrabajov2 | ⚠️ Bajo | Módulos menores o deprecados |

## Frontend — Estado Actual

- `setupTests.ts` existe con `@testing-library/jest-dom` — infraestructura parcial
- **Sin test runner configurado** (Vitest pendiente de instalar)
- Scripts `npm run test` no existe en package.json
- 4 archivos de utilidades puras testables sin tests: `rut.util.ts`, `currency.ts`, `errorHandlers.ts`, `contrato.helpers.ts`

## Comandos

```bash
# Backend (requiere venv activo)
cd backend && python manage.py test --verbosity=2    # Todos los tests
cd backend && python manage.py test rrhh.tests       # Por módulo
cd backend && python manage.py test contratos.tests

# Frontend (pendiente instalar Vitest)
cd frontend && npm run test  # No existe aún
```

## Próximos pasos

1. Tests críticos faltantes: `empresas/tests.py` — multi-tenancy isolation
2. Tests críticos faltantes: `cuentas/tests.py` — User model, auth flow
3. Instalar Vitest en frontend + primer test en `rut.util.ts`
4. Ver skill `/qa-suite` cuando esté disponible
