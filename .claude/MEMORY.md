# MEMORY.md — Índice de Memoria Persistente

Este archivo indexa la memoria persistente para futuras sesiones de Claude Code. Cada entrada apunta a un archivo en `.claude/memory/` que contiene información específica del proyecto.

Accede a estos archivos cuando notes referencias a estos temas en solicitudes del usuario.

---

## Arquitectura & Patrones

- **[arch-monorepo](memory/arch-monorepo.md)** — Estructura del monorepo Django + React, carpetas clave, convenciones

- **[multi-tenancy](memory/multi-tenancy.md)** — Patrón obligatorio de filtrado por empresa, `PersonalizacionUsuario`, riesgos de fuga de datos

- **[currency-system](memory/currency-system.md)** — Conversión de monedas (CLP/USD/UF), snapshots, APIs de currency_utils.py

---

## Módulos Específicos

- **[contratos-b2b](memory/contratos-b2b.md)** — Contratos comerciales, servicios, licencias, plantillas V2

- **[contratos-rrhh](memory/contratos-rrhh.md)** — Contratos laborales, firma digital, estados, transiciones

- **[ordenes-trabajo](memory/ordenes-trabajo.md)** — Versiones (V1 desactivada, V2 deprecada, V3 activa), estados, flujos

- **[cotizaciones](memory/cotizaciones.md)** — Sistema de cotizaciones, monedas, aprobación pública, solicitud de cambios

---

## Frontend & Estado

- **[rtk-query](memory/rtk-query.md)** — Tags, invalidación, anti-patrón refetch(), deuda técnica documentada

- **[componentes-ui](memory/componentes-ui.md)** — Fyr theme (read-only), 12 componentes base, 9 form, sincronización desde tema_base

- **[typescript-conventions](memory/typescript-conventions.md)** — Interfaz con prefijo I, types sin prefijo, strict mode

---

## DevOps & Tooling

- **[deployment](memory/deployment.md)** — Dockerfiles, build scripts PowerShell, sin docker-compose ni GitHub Actions (aún)

- **[jira-integration](memory/jira-integration.md)** — Scripts en dev/scripts/jira/, proyecto SEB, credenciales en .env

- **[testing-status](memory/testing-status.md)** — Sin cobertura funcional implementada, patrones documentados en testing.md

---

## Decisiones de Diseño

- **[plantillas-v2-polimorfismo](memory/plantillas-v2-polimorfismo.md)** — Patrón IContratoBase, adaptadores B2B/laboral, NOT_HANDLED sentinel

- **[snapshot-tasas](memory/snapshot-tasas.md)** — Por qué congelar tasas de cambio al enviar a aprobación, volatilidad en contratos

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

**Última actualización**: 2026-06-01
**Archivos en memoria**: 13 documentos
**Próxima revisión sugerida**: 2026-07-01
