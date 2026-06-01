# dev/docs/ — Documentación Viva del Proyecto

Documentación única y viva del ERP Snabbit.  
Organizada por **agente IA** que la generó. Si se desconoce el origen, va en `/copilot`.

---

## Estructura

```
dev/docs/
├── README.md                          # Este archivo
├── claude/                            # 🤖 Generado por Claude (Claude Code, Claude Sonnet)
│   └── audits/
│       └── infrastructure/
│           ├── AUDIT.md               # Cobertura de estructura .claude/
│           ├── AUDIT-FCM.md           # Auditoría motor de notificaciones FCM
│           ├── AUDIT-VISUAL-STYLES.md # Auditoría skill visual-styles
│           └── PLAN-IMPLEMENTACION.md # Plan consolidado de auditorías
└── copilot/                           # 🤖 Generado por Copilot (o agente desconocido)
    ├── analysis/
    │   └── analisis.md                # Análisis de consistencia visitas OT V3
    ├── architecture/
    │   └── adr-rrhh.md                # ADR Módulo RRHH (backlog de implementación)
    ├── audits/
    │   └── modules/
    │       ├── auditoria_otv3.md
    │       ├── auditoria_contratos.md
    │       ├── auditoria_cotizaciones.md
    │       ├── auditoria_bodegas.md
    │       ├── auditoria_bodega_series_issue_37.md
    │       ├── auditoria_rendiciones.md
    │       ├── auditoria_visitas.md
    │       └── auditoria_recursos.md
    └── plans/
        ├── detalle-contrato-plan.html
        ├── motor-plantillas-v2-plan.html
        └── wizard-contratos-v2-plan.html
```

---

## Reglas

| Regla | Descripción |
|-------|-------------|
| **Un archivo por dominio** | No duplicar documentación del mismo módulo |
| **Agente conocido** | Crear en la carpeta del agente correcto (`claude/`, `copilot/`, `codex/`) |
| **Agente desconocido** | Usar `/copilot` por defecto |
| **No crear carpetas nuevas** de agente sin que ese agente haya generado el contenido |
| **Solo documentación viva** | Sin análisis efímeros, bugs, ni notas diarias |

---

## Qué Va Dónde

### 🤖 claude/audits/infrastructure/
Auditorías de infraestructura, arquitectura y documentación transversal generadas por Claude.  
Contenido: cobertura de decisiones, validación de patrones, consistencia global.

### 🤖 copilot/architecture/
Decisiones de Arquitectura (ADRs) de largo plazo. Solo si describen sistemas vigentes.

### 🤖 copilot/audits/modules/
Auditorías de módulos específicos (OT, contratos, bodegas, etc.).  
**Nota:** Estas son auditorías históricas/operacionales, generadas antes de adoptar separación por agente.

### 🤖 copilot/analysis/
Análisis técnicos puntuales vinculados a decisiones de negocio o implementación.

### 🤖 copilot/plans/
Planes visuales: mockups, wireframes, flujos en HTML.

---

Última actualización: 2026-06-01