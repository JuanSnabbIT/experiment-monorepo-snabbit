# Planes de Implementación — Módulo RRHH

Planes de implementación en HTML autónomo (un solo archivo, sin dependencias externas),
generados desde el backlog de `dev/docs/adr-rrhh.md` (sección "Planes de Implementación").

Cada archivo `PN-*.html` incluye:

- **Timeline** de milestones (cajas horizontales con dependencias entre planes).
- **Data flow** entre componentes (SVG inline, sin imágenes).
- **Mockups** de pantallas alineados al estilo del sistema (HTML/CSS, sin frameworks).
- **Changelog de mockups** — bitácora donde se registra cada corrección antes de tocar el frontend.
- **Tabla de riesgos** (riesgo · probabilidad · impacto · mitigación).
- **Snippets de código** de funciones críticas con resaltado de sintaxis (highlighter JS inline).

> ⚠️ **Los mockups son la fuente de verdad del frontend.** Toda corrección a un mockup
> debe quedar detallada en la sección **"Changelog de mockups" (§5)** del plan correspondiente,
> con formato `vN.M — [pantalla] qué cambió y por qué — fecha`, **antes** de implementar el cambio en código.

## Planes (P0–P7)

| Plan | Archivo | ADRs | Nivel | Prerequisito |
|------|---------|------|-------|--------------|
| **P0** · Seguridad y correcciones | [P0-seguridad-y-correcciones-plan.html](P0-seguridad-y-correcciones-plan.html) | 12, 15, 23 | L1 Hotfix | — |
| **P1** · Máquina de estados y tipos | [P1-maquina-estados-y-tipos-plan.html](P1-maquina-estados-y-tipos-plan.html) | 01, 02, 03, 07, 20, 21 | L2 Schema | P0 |
| **P2** · Campos legales del contrato | [P2-campos-legales-contrato-plan.html](P2-campos-legales-contrato-plan.html) | 04, 05, 19, 24, 25, 26 | L2 Additive | P0 |
| **P3** · AFP y datos previsionales | [P3-afp-y-datos-previsionales-plan.html](P3-afp-y-datos-previsionales-plan.html) | 10, 13, 27 | L2 + FK | P0 |
| **P4** · Validación de RUT | [P4-validacion-rut-plan.html](P4-validacion-rut-plan.html) | 09, 28 | L2 light | — |
| **P5** · Arquitectura frontend RRHH | [P5-arquitectura-frontend-rrhh-plan.html](P5-arquitectura-frontend-rrhh-plan.html) | 14, 29 | L4 Arquitectural | — |
| **P6** · Wizard de creación de contratos | [P6-wizard-creacion-contratos-plan.html](P6-wizard-creacion-contratos-plan.html) | 06, 07, 08, 11, 22 | L3 Feature | P1–P5 |
| **P7** · Anexos y Finiquitos | [P7-anexos-y-finiquitos-plan.html](P7-anexos-y-finiquitos-plan.html) | 16, 17, 18 | L3 New models | P1, P2 |

Cobertura: 30/30 ADRs (ADR-30 fuera de scope; ADR-31/32 notificaciones, dependientes de P0).

## Otros planes (dominios distintos, no parte de P0–P7)

- [detalle-contrato-plan.html](detalle-contrato-plan.html) — Detalle de contrato (estilo base de referencia de estos planes).
- [wizard-contratos-v2-plan.html](wizard-contratos-v2-plan.html) — Wizard de contratos laborales (versión previa).
- [motor-plantillas-v2-plan.html](motor-plantillas-v2-plan.html) — Motor de plantillas B2B.

---
Generado: 2026-06-01 · Estilo base: `detalle-contrato-plan.html`
