# MEMORY.md — Índice de Memoria Persistente

Este archivo indexa la memoria persistente para futuras sesiones de Claude Code. Cada entrada apunta a un archivo en `.claude/memory/` que contiene información específica del proyecto.

Accede a estos archivos cuando notes referencias a estos temas en solicitudes del usuario.

---

## Arquitectura & Patrones

- **[arch-monorepo](memory/arch-monorepo.md)** — Estructura física, convenciones, entry points, archivos críticos

- **[multi-tenancy](memory/multi-tenancy.md)** — Patrón obligatorio de filtrado por empresa, `PersonalizacionUsuario`, riesgos de fuga

- **[currency-system](memory/currency-system.md)** — Conversión (CLP/USD/UF), snapshots, APIs de currency_utils.py

---

## Features en Desarrollo

- **[afp-consulta-afiliacion](memory/afp-consulta-afiliacion.md)** — Endpoint spensiones.cl analizado, decisiones de scraping + Redis + Celery para consulta AFP en ficha trabajador y wizard contrato

---

## Módulos Específicos

- **[contratos-b2b](memory/contratos-b2b.md)** — ContratoEmpresaCliente, servicios, licencias, plantillas V2, snapshots

- **[contratos-rrhh](memory/contratos-rrhh.md)** — ContratoTrabajador, UsuarioEmpresa, firma digital, anexos

- **[ordenes-trabajo](memory/ordenes-trabajo.md)** — V1/V2/V3 (V3 activa), estados, modelos, tags RTK

- **[cotizaciones](memory/cotizaciones.md)** — Estructura, monedas, aprobación, solicitud cambios, estados

- **[fcm-notifications](memory/fcm-notifications.md)** — Motor FCM, 17 eventos, Celery, multi-tenancy, token lifecycle

---

## Frontend & Estado

- **[rtk-query](memory/rtk-query.md)** — Tags, invalidación, anti-patrón refetch(), deuda técnica documentada

- **[componentes-ui](memory/componentes-ui.md)** — 25 componentes (12 UI + 9 form + 4 layout), Tailwind, Heroicons, FileInput/RadioCard

- **[typescript-conventions](memory/typescript-conventions.md)** — Interface (prefijo I), Type (prefijo T), strict mode, patrones, errores comunes

## DevOps & Validación

- **[build-testing](memory/build-testing.md)** — Skill `/build-test`, 5 modos, checklist, top 5 errores

- **[deployment](memory/deployment.md)** — Docker, build scripts PowerShell, env vars, production checklist

- **[jira-integration](memory/jira-integration.md)** — Proyecto SEB, scripts Python, workflow (issue → PR → cierre automático)

- **[testing-status](memory/testing-status.md)** — 357 tests backend reales, brechas críticas: empresas/cuentas/vacaciones/rendiciones. Frontend sin runner.

---

## Decisiones de Diseño

- **[plantillas-v2-polimorfismo](memory/plantillas-v2-polimorfismo.md)** — Patrón polimórfico, IContratoBase, adaptadores B2B/laboral, orden resolución etiquetas

- **[snapshot-tasas](memory/snapshot-tasas.md)** — Por qué congelar tasas en aprobación, volatilidad, cuando/cómo usar snapshots, audit trail

---

## Historias & Contexto

- **[sprint-semana-21](memory/sprint-semana-21.md)** — Última actualización de estado (commit c9ff086), trabajo en contratos laborales

---

## Cómo Usar Esta Memoria

1. **Búsqueda por tema:** Si el usuario menciona "multi-tenancy", "currency", "RTK", etc., busca la entrada relevante.

2. **Verificar antes de decidir:** Algunos archivos de memoria contendrán decisiones previas. **Valida contra el código actual** antes de asumir que aún son válidas.

3. **Actualizar si está obsoleta:** Si descubres que un archivo de memoria describe algo que ya cambió, actualiza el archivo. La memoria debe evolucionar con el código.

4. **Crear nueva memoria cuando sea necesario:** Si tras una sesión identificas información útil para futuras sesiones (una decisión compleja, un patrón no documentado en `.github/`), crea un nuevo archivo en `.claude/memory/` y actualiza este índice.

---

## Pautas para Crear Nuevas Memorias

Crea un archivo de memoria **SOLO SI**:

- [ ] Contiene información **no documentada en `.github/`** (que es la fuente de verdad)
- [ ] Es **contexto histórico o decisiones** que serán útiles en futuras sesiones
- [ ] **NO es** análisis puntual, hallazgos de una sola sesión, o estado efímero
- [ ] Es **más de 1 párrafo** (si es muy breve, incluye en este MEMORY.md directamente)

**Estructura del archivo:**

```markdown
---
name: {{nombre-kebab-case}}
description: {{una línea — qué es y cuándo es relevante}}
lastUpdated: YYYY-MM-DD
relatedFiles:
  - .github/instructions/xxx.md
  - backend/path/to/file.py
---

# Título

Contenido de la memoria...

## Cuándo usar esto

Menciona en qué contextos futuro esta info será útil.

## Cómo cambió

Si se conoce históricamente cómo cambió, documenta.
```

---

## Skills del Sistema (no son memoria, son referencia)

Los skills activos reemplazan los .md de contexto desactualizados para hechos del sistema:
- `/system-map` → lee endpoints, modelos, estados, routes, RTK tags **en vivo desde el código**
- `/doc-sync` → actualiza esta memoria después de cada implementación crítica

---

**Última actualización**: 2026-06-22
**Archivos en memoria**: 16 documentos
**Skills para hechos en vivo**: `/system-map`, `/doc-sync`
**Próxima revisión sugerida**: usar `/doc-sync --check` al inicio de cada sesión
