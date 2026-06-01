# PLAN-IMPLEMENTACION.md — Análisis de Auditorías & Status

**Generado:** 2026-06-01  
**Objetivo:** Consolidar recomendaciones de las 3 auditorías y planificar implementación

---

## 📊 Matriz de Auditorías Creadas

| Auditoría | Status | Recomendaciones | Plan | Prioridad |
|-----------|--------|-----------------|------|-----------|
| [AUDIT.md](AUDIT.md) | 🟡 PARCIAL | 14 memory files a crear | En Fase 1 | 🔴 CRÍTICA |
| [AUDIT-VISUAL-STYLES.md](AUDIT-VISUAL-STYLES.md) | ❌ SIN PLAN | Eliminar tema_base refs, documentar nuevos componentes | Pendiente | 🔴 CRÍTICA |
| [AUDIT-FCM.md](AUDIT-FCM.md) | ❌ SIN PLAN | Actualizar SKILL.md, 17 eventos, 9 grupos | Pendiente | 🔴 CRÍTICA |

---

## 1️⃣ AUDIT.md — Cobertura de `.claude/`

### Recomendaciones

#### 🔴 CRÍTICA Fase 1 (20 min)
```
1. arch-monorepo.md            (100 líneas) — Estructura física del monorepo
2. contratos-b2b.md            (120 líneas) — Modelos, flujos, plantillas, servicios
3. contratos-rrhh.md           (120 líneas) — Modelos laborales, firma, estados
```

#### 🟠 ALTA Fase 2 (15 min)
```
4. cotizaciones.md             (100 líneas) — Monedas, aprobación, solicitud cambios
5. componentes-ui.md           (90 líneas)  — Fyr theme, 12 UI + 9 form componentes
6. typescript-conventions.md    (80 líneas)  — Interfaces I*, types, strict mode
```

#### 🟡 MEDIA Fase 3 (25 min)
```
7. deployment.md               (70 líneas)  — Docker, scripts PowerShell
8. jira-integration.md         (60 líneas)  — Scripts, credenciales proyecto SEB
9. testing-status.md           (80 líneas)  — Sin cobertura, patrones esperados
10. plantillas-v2-polimorfismo.md (100 líneas) — Decisión diseño, adaptadores
11. snapshot-tasas.md          (70 líneas)  — Por qué snapshots, volatilidad
```

#### Fase 4: ÍNDICES (10 min)
```
12. Actualizar MEMORY.md con todas las entradas
13. Verificar cross-references
```

### Status Actual
- ✅ MEMORY.md actualizado (14 archivos indexados, incluyendo **fcm-notifications.md recién creado**)
- ❌ Memory files Fase 1 no creados (arch-monorepo, contratos-b2b, contratos-rrhh)
- ❌ Memory files Fase 2 no creados
- ❌ Memory files Fase 3 no creados

### Plan Implementación
```
[ ] Fase 1 — Crear arch-monorepo.md, contratos-b2b.md, contratos-rrhh.md
[ ] Fase 2 — Crear cotizaciones.md, componentes-ui.md, typescript-conventions.md
[ ] Fase 3 — Crear deployment.md, jira-integration.md, testing-status.md, 2 archivos diseño
[ ] Fase 4 — Verificar cross-references en MEMORY.md
```

**Estimación:** ~70 minutos totales

---

## 2️⃣ AUDIT-VISUAL-STYLES.md — Documentación Visual

### Recomendaciones

#### 🔴 CRÍTICA (10 min cada)

**#1: Eliminar referencias fantasma a tema_base/fyr-vite/**
- Ubicación: `visual-consistency.md` línea 14-17
- Ubicación: `visual-consistency.md` línea 279-286
- Ubicación: `.github/copilot-instructions.md` (si menciona tema_base)
- Acción: Cambiar a "Componentes en `frontend/src/components/`" (READ-ONLY en proyecto)
- **Status:** ❌ NO IMPLEMENTADO

**#2: Documentar nuevos componentes Sprint 21**
- `FileInput.tsx` — Crear entrada en visual-consistency.md o nuevo archivo
- `RadioCard.tsx` — Crear entrada en visual-consistency.md o nuevo archivo
- Actualizar SKILL.md con links
- **Status:** ❌ NO IMPLEMENTADO

#### 🟠 ALTA (Próxima sesión)

**#3: Auditar componentes ocultos**
- `components/utils/` — ¿qué es reutilizable?
- `components/helper/` — ¿debería ser público?
- `components/icon/` — ¿SVG custom o Heroicons?
- `components/router/` — ¿componentes especializados de ruteo?
- **Status:** ❌ NO AUDITADO

**#4: Limpiar SKILL.md**
- Verificar que todos los links `[./file.md#anchor]` existan
- Actualizar índice si hay nuevos patrones
- **Status:** ❌ NO VALIDADO

### Plan Implementación
```
[ ] Eliminar referencias a tema_base/fyr-vite en visual-consistency.md (2 lugares)
[ ] Eliminar referencias en copilot-instructions.md (si existe)
[ ] Crear documentación FileInput.tsx
[ ] Crear documentación RadioCard.tsx
[ ] Auditar componentes en utils/, helper/, icon/, router/
[ ] Actualizar SKILL.md con nuevos links
[ ] Validar que todos los anchors en SKILL.md existen
```

**Estimación:** ~60 minutos (crítica + alta)

---

## 3️⃣ AUDIT-FCM.md — Motor de Notificaciones

### Recomendaciones

#### 🔴 CRÍTICA (30 min)

**#1: Actualizar `.github/skills/notificaciones/SKILL.md`**
- Problema: Documenta solo 3 eventos (Lote 1)
- Solución: Agregar tabla de **17 eventos** (Lote 1 + Lote 2)
- Formato: Evento | Grupo | Módulo | Cuándo se dispara
- **Status:** ❌ NO ACTUALIZADO

**#2: Documentar 9 grupos Django**
- Problema: Solo 3 documentados (contabilidad, tecnico, comprador)
- Solución: Agregar **6 grupos nuevos** (ventas, operaciones, finanzas, rrhh, contratos, bodega)
- Qué eventos recibe cada uno
- **Status:** ❌ NO DOCUMENTADO

#### 🟠 ALTA (Próxima sesión)

**#3: Documentar funciones `notificar_X()` en services.py**
- Crear tabla con signatures
- Parámetros, validaciones, ejemplos
- **Status:** ❌ NO DOCUMENTADO

**#4: Verificar Celery Beat schedule**
- Confirmar `purgar_notificaciones_antiguas` está en `CELERY_BEAT_SCHEDULE`
- Documentar dónde ver configuración
- **Status:** ⚠️ CÓDIGO OK, documentación incompleta

### Plan Implementación
```
[ ] Actualizar SKILL.md con tabla de 17 eventos (Lote 1 + 2)
[ ] Actualizar SKILL.md con tabla de 9 grupos Django
[ ] Agregar módulo y cuándo se dispara cada evento
[ ] Crear tabla de funciones notificar_X() con signatures
[ ] Verificar en settings.py que Celery Beat está configurado
[ ] Documentar dónde ver purga_notificaciones_antiguas
```

**Estimación:** ~50 minutos (crítica + alta)

---

## 📈 Resumen de Pendientes

### 🔴 CRÍTICA (Hacer ya - 60 min)

| Tarea | Archivo | Líneas | Tiempo |
|-------|---------|--------|--------|
| Crear 3 memory files (Fase 1) | `.claude/memory/` | 340 | 20 min |
| Eliminar refs tema_base | `visual-consistency.md` | — | 10 min |
| Documentar FileInput + RadioCard | `visual-consistency.md` | 50 | 10 min |
| Actualizar SKILL.md con 17 eventos | `.github/skills/notificaciones/` | 80 | 15 min |
| Documentar 9 grupos Django | `.github/skills/notificaciones/` | 30 | 5 min |
| **TOTAL CRÍTICA** | — | — | **60 min** |

### 🟠 ALTA (Esta sesión o próxima - 75 min)

| Tarea | Archivo | Líneas | Tiempo |
|-------|---------|--------|--------|
| Crear 3 memory files (Fase 2) | `.claude/memory/` | 250 | 15 min |
| Crear 5 memory files (Fase 3) | `.claude/memory/` | 380 | 25 min |
| Auditar componentes ocultos | `frontend/src/components/` | — | 20 min |
| Documentar funciones notificar_X() | `.github/skills/notificaciones/` | 60 | 15 min |
| **TOTAL ALTA** | — | — | **75 min** |

---

## 🎯 Propuesta de Ejecución

### Opción A: Prioridades Máximas (60 min ahora)

```
SESIÓN HOY:
1. Crear memory files Fase 1 (20 min) — AUDIT.md crítica
2. Eliminar tema_base refs + documentar componentes nuevos (20 min) — AUDIT-VISUAL-STYLES crítica
3. Actualizar SKILL.md FCM (17 eventos + 9 grupos) (20 min) — AUDIT-FCM crítica
```

### Opción B: Completo (135 min)

```
SESIÓN HOY:
1. Ejecutar Opción A (60 min)
2. Crear memory files Fases 2-3 (40 min) — AUDIT.md alta
3. Auditar componentes ocultos (20 min) — AUDIT-VISUAL-STYLES alta
4. Documentar servicios notificar_X() (15 min) — AUDIT-FCM alta
```

---

## 📋 Checklist Consolidado

### AUDIT.md
```
CRÍTICA:
☐ Crear arch-monorepo.md
☐ Crear contratos-b2b.md
☐ Crear contratos-rrhh.md

ALTA:
☐ Crear cotizaciones.md
☐ Crear componentes-ui.md
☐ Crear typescript-conventions.md

MEDIA:
☐ Crear deployment.md
☐ Crear jira-integration.md
☐ Crear testing-status.md
☐ Crear plantillas-v2-polimorfismo.md
☐ Crear snapshot-tasas.md

ÍNDICES:
☐ Verificar cross-references en MEMORY.md
```

### AUDIT-VISUAL-STYLES.md
```
CRÍTICA:
☐ Eliminar refs a tema_base/fyr-vite en visual-consistency.md (línea 14-17)
☐ Eliminar refs en visual-consistency.md (línea 279-286)
☐ Eliminar refs en copilot-instructions.md (si existen)
☐ Documentar FileInput.tsx
☐ Documentar RadioCard.tsx

ALTA:
☐ Auditar componentes en components/utils/
☐ Auditar componentes en components/helper/
☐ Auditar componentes en components/icon/
☐ Auditar componentes en components/router/
☐ Validar todos los links en SKILL.md
```

### AUDIT-FCM.md
```
CRÍTICA:
☐ Actualizar SKILL.md con tabla de 17 eventos
☐ Actualizar SKILL.md con tabla de 9 grupos Django
☐ Agregar "cuándo se dispara" para cada evento

ALTA:
☐ Documentar funciones notificar_X() con signatures
☐ Verificar Celery Beat schedule en settings.py
☐ Documentar dónde ver configuración de purga
```

---

## 🚀 Siguientes Pasos

**¿Qué quieres hacer?**

1. **Ejecutar Opción A (60 min)** — Todas las críticas hoy
2. **Ejecutar Opción B (135 min)** — Críticas + altas
3. **Otra prioridad** — ¿Cuál?

---

**Última actualización:** 2026-06-01  
**Documento:** Plan de implementación de auditorías Claude
