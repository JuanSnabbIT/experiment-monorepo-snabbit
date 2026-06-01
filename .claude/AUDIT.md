# AUDIT.md — Auditoría de Cobertura de Documentación

Documento ejecutivo de cobertura de `.claude/` vs código real. Identifica gaps y prioridades.

**Última auditoría:** 2026-06-01  
**Coverage actual:** 3/14 memory files (21%)  
**Status global:** 🟡 PARCIAL — Estructura base presente, memoria específica incompleta

---

## 1️⃣ ESTADO: Archivos de Memoria

### ✅ CREADOS (3/14 = 21%)

| Archivo | Líneas | Cobertura | Actualidad |
|---------|--------|-----------|-----------|
| `multi-tenancy.md` | 45 | 100% | ✅ 2026-06-01 |
| `ordenes-trabajo.md` | 110 | 100% | ✅ 2026-06-01 |
| `rtk-query.md` | 180 | 100% | ✅ 2026-06-01 |

### ❌ FALTANTES (11/14 = 79%)

| Archivo | Prioridad | Líneas Est. | Requiere |
|---------|-----------|-------------|----------|
| `arch-monorepo.md` | 🔴 CRÍTICA | 100 | Estructura, convenciones, carpetas clave |
| `contratos-b2b.md` | 🔴 CRÍTICA | 120 | Modelos, flujos, plantillas, servicios |
| `contratos-rrhh.md` | 🔴 CRÍTICA | 120 | Modelos laborales, firma, estados |
| `cotizaciones.md` | 🟠 ALTA | 100 | Monedas, aprobación pública, solicitud cambios |
| `componentes-ui.md` | 🟠 ALTA | 90 | Fyr theme, sincronización, 12+9 componentes |
| `typescript-conventions.md` | 🟠 ALTA | 80 | Interfaces, types, strict mode |
| `deployment.md` | 🟡 MEDIA | 70 | Docker, build, scripts PowerShell |
| `jira-integration.md` | 🟡 MEDIA | 60 | Scripts, credenciales, proyecto SEB |
| `testing-status.md` | 🟡 MEDIA | 80 | Sin cobertura, patrones esperados |
| `plantillas-v2-polimorfismo.md` | 🟡 MEDIA | 100 | Decisión de diseño, adaptadores, NOT_HANDLED |
| `snapshot-tasas.md` | 🟡 MEDIA | 70 | Por qué snapshots, volatilidad, campos |

---

## 2️⃣ ANÁLISIS: Qué Debe Ir en Cada Archivo

### 🔴 CRÍTICA — Crealas INMEDIATAMENTE

#### **arch-monorepo.md**
```
- Estructura física del monorepo (qué va dónde)
- Convenciones de nombres por capa
- Carpetas de entrada (entry points)
- Dónde viven los assets críticos
```
**Contexto:** Nuevo miembro necesita orientación rápida de "dónde está X"

#### **contratos-b2b.md**
```
- Qué es ContratoEmpresaCliente
- Relación con servicios, licencias, cuotas
- Plantillas V2 (nueva)
- Flujos de aprobación
- Snapshot de tasas
- Monedas soportadas
```
**Contexto:** Módulo complejo, B2B vs laboral es separado

#### **contratos-rrhh.md**
```
- Qué es ContratoTrabajador
- Relación UsuarioEmpresa
- Firma digital (nuevo)
- Estados y transiciones
- Anexos
- Diferencias vs B2B
```
**Contexto:** Nueva funcionalidad (sprint 21), compleja

---

### 🟠 ALTA — Crear en esta sesión

#### **cotizaciones.md**
```
- Estructura de cotizaciones (Cotizacion, ItemCotizacion, Solicitante)
- Monedas y conversión
- Token de aprobación pública
- Solicitud de cambios
- Estados
```

#### **componentes-ui.md**
```
- Fyr theme (read-only)
- 12 componentes base
- 9 componentes form
- Sincronización desde tema_base
- Cómo agregar componente nuevo
```

#### **typescript-conventions.md**
```
- Interfaces (prefijo I)
- Types (sin prefijo)
- Strict mode
- Archivos .interface.ts vs .ts
```

---

### 🟡 MEDIA — Crear después

Deployment, Jira, Testing, decisiones técnicas...

---

## 3️⃣ CHECKLIST: Validación contra Código Real

### ✅ Validados
- [x] Multi-tenancy pattern → BodegaViewSet, OrdenDeTrabajoViewSet OK
- [x] RTK Query tags → 75+ tags en RtkQueryService.ts
- [x] OT versiones → V3 activa, V2 deprecada confirmada

### 🔄 Necesita Validación
- [ ] Estructura monorepo — mapear contra directorios reales
- [ ] Contratos B2B — revisar modelos completos en contratos/models.py
- [ ] Contratos RRHH — revisar modelos en rrhh/models.py
- [ ] Cotizaciones — revisar flujo estado en cotizaciones/estados_modelo.py
- [ ] Componentes UI — verificar que 12+9 son correctos en frontend/src/components/
- [ ] TypeScript strict — confirmar en frontend/tsconfig.json

---

## 4️⃣ PLAN DE ACCIÓN

### Fase 1: CRÍTICA (Hoy)
```
1. arch-monorepo.md      (validar contra directorios)
2. contratos-b2b.md      (validar contra models.py)
3. contratos-rrhh.md     (validar contra rrhh/models.py)
```

### Fase 2: ALTA (Hoy)
```
4. cotizaciones.md       (validar contra cotizaciones/)
5. componentes-ui.md     (contar contra components/)
6. typescript-conventions.md (validar tsconfig.json)
```

### Fase 3: MEDIA (Hoy)
```
7. deployment.md         (revisar Dockerfiles, scripts)
8. jira-integration.md   (validar dev/scripts/jira/)
9. testing-status.md     (documentar estado actual)
10. plantillas-v2-polimorfismo.md (decisión de diseño)
11. snapshot-tasas.md    (contexto económico)
```

### Fase 4: ÍNDICES (Último)
```
12. Actualizar MEMORY.md con todas las entradas
13. Verificar cross-references en MEMORY.md
```

---

## 5️⃣ ESTIMACIÓN

| Fase | Archivos | Est. Líneas | Est. Tiempo |
|------|----------|-------------|-------------|
| **1 (CRÍTICA)** | 3 | 340 | 20 min |
| **2 (ALTA)** | 3 | 250 | 15 min |
| **3 (MEDIA)** | 5 | 380 | 25 min |
| **4 (ÍNDICES)** | — | — | 10 min |
| **TOTAL** | 11 | ~970 | ~70 min |

---

## 6️⃣ ÉXITO: Criterios de Aceptación

✅ Todos los 14 memory files creados y indexados en MEMORY.md  
✅ Cada archivo tiene frontmatter YAML (name, description, lastUpdated, relatedFiles)  
✅ Cada archivo validado contra código real (no teórico)  
✅ Cross-references verificados (no links rotos)  
✅ MEMORY.md actualizado con todas las entradas  
✅ Coverage: 14/14 = 100%  

---

**Próximo paso:** Ejecutar Fase 1 (CRÍTICA)
