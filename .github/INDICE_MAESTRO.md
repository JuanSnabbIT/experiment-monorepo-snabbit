---
title: "Índice Maestro de Documentación"
scope: "documentación"
status: "active"
last_updated: "2025-11-05"
---

# 📚 Índice Maestro de Documentación del Monorepo ERP

## 🎯 Propósito

Este índice centraliza toda la documentación del monorepo ERP, organizándola por categorías y proveyendo caminos de lectura según tu rol y objetivo.

---

## 🗺️ Mapa Visual de Documentación

```
📁 .github/
│
├── 🏛️ ARQUITECTURA (3 documentos, ~2,300 líneas)
│   ├── ARQUITECTURA_SISTEMA.md          ⭐ Visión general del sistema
│   ├── ARQUITECTURA_FRONTEND.md         ⭐ Arquitectura React + Redux
│   └── CONFIGURACION_DESARROLLO.md      ⭐ Setup VS Code y workflows
│
├── 🚀 INICIALIZACIÓN Y SETUP (2 documentos, ~1,500 líneas)
│   ├── INICIALIZACION.md                📘 Guía paso a paso de setup
│   └── SCRIPTS_UTILIDADES.md            📘 Scripts de utilidad técnica
│
├── 🔍 EXPLORACIÓN Y ANÁLISIS (4 documentos)
│   ├── EXPLORACION_EMPRESAS.md                🔬 Módulo 1: Empresas (bugs, lecciones)
│   ├── GUIA_EXPLORACION_SISTEMA.md            🔬 Guía de exploración completa
│   ├── MODULO_CONFIDENCIALIDAD.md             📄 Módulo de Acuerdos de Confidencialidad (NDA)
│   └── MODULO_CONTRATOS_FLUJO_COMPLETO.md     📋 Flujo completo de contratos + gaps identificados
│
├── 📊 ESTADO Y TRACKING (1 documento)
│   └── ESTADO_DOCUMENTACION.md          📈 Progreso de documentación (80%)
│
├── 🧭 INSTRUCCIONES CENTRALES (1 documento)
│   └── copilot-instructions.md          🎓 Índice principal para IA/devs
│
└── 📂 instructions/
    │
    ├── 🔧 BACKEND (6 documentos, ~19,000 líneas)
    │   ├── backend/
    │   │   ├── core-cuentas.md                                      📄 Core + Auth (~2,400 líneas)
    │   │   ├── empresas-cotizaciones.md                             📄 Empresas + Quotes (~2,500 líneas)
    │   │   ├── contratos-bodegas-items.md                           📄 Contratos + Inventory (~4,500 líneas)
    │   │   ├── ordentrabajo-recursos-rendiciones-visitas.md         📄 Operations (~6,000 líneas)
    │   │   └── vacaciones-calendario-activos-retroalimentacion.md   📄 Support (~3,500 líneas)
    │   └── backend-instructions.md          📖 Instrucciones generales backend
    │
    ├── 🎨 FRONTEND (4 documentos, ~1,500 líneas)
    │   ├── frontend-instructions.md         📖 Instrucciones generales frontend
    │   ├── redux-thunks.md                  📖 Redux Toolkit y thunks
    │   └── store-structure.md               📖 Índice de slices Redux
    │
    ├── 🔐 PROCESOS Y ESTÁNDARES (8 documentos, ~2,000 líneas)
    │   ├── standards.md                     📋 Estándares de código
    │   ├── security.md                      🔒 Seguridad (JWT, CORS, secretos)
    │   ├── pr-flow.md                       🔄 Flujo de PRs y commits
    │   ├── ci-cd.md                         🚀 Pipelines CI/CD
    │   ├── testing.md                       🧪 Estrategias de testing
    │   ├── performance.md                   ⚡ Optimización y performance
    │   ├── observability.md                 📊 Logging, métricas, tracing
    │   └── playbooks.md                     📕 Troubleshooting operativo
    │
    └── 📖 SOPORTE (2 documentos, ~500 líneas)
        ├── glossary.md                      📚 Glosario de términos
        └── tasks.instructions.md            ⚙️ VS Code tasks
```

**Total**: 23 documentos organizados  
**Líneas documentadas**: ~21,100 líneas (9 nuevos + 14 preexistentes)  
**Cobertura**: Backend (15 apps), Frontend (14 slices Redux), Scripts (8 utilidades), Procesos (8 documentos)

---

## 🎓 Guías de Lectura por Rol

### 👨‍💻 Nuevo Desarrollador (Onboarding)

**Día 1: Comprensión del Sistema**
1. 📖 [copilot-instructions.md](./copilot-instructions.md) - Índice principal (15 min)
2. ⭐ [ARQUITECTURA_SISTEMA.md](./arquitectura/sistema.md) - Visión general (30 min)
3. 📘 [INICIALIZACION.md](./guias/inicializacion.md) - Setup del proyecto (45 min)
4. 📘 [SCRIPTS_UTILIDADES.md](./guias/scripts.md) - Scripts disponibles (20 min)

**Día 2-3: Setup y Configuración**
1. ⭐ [CONFIGURACION_DESARROLLO.md](./guias/desarrollo.md) - VS Code setup (30 min)
2. 📖 [instructions/backend-instructions.md](./instrucciones/backend-instructions.md) - Backend general (45 min)
3. 📖 [instructions/frontend-instructions.md](./instrucciones/frontend-instructions.md) - Frontend general (45 min)
4. 🔒 [instructions/security.md](./instrucciones/security.md) - Prácticas de seguridad (30 min)

**Día 4-5: Profundización**
1. 📄 [instructions/backend/core-cuentas.md](./instrucciones/backend/core-cuentas.md) - Auth y usuarios (1 hora)
2. ⭐ [ARQUITECTURA_FRONTEND.md](./arquitectura/frontend.md) - Redux y componentes (1 hora)
3. 📖 [instructions/redux-thunks.md](./instrucciones/redux-thunks.md) - Estado global (30 min)
4. 📖 [instructions/store-structure.md](./instrucciones/store-structure.md) - Índice de slices (30 min)

**Primera Semana: Práctica**
1. 🔬 [EXPLORACION_EMPRESAS.md](./exploracion/empresas.md) - Caso práctico (1 hora)
2. 📋 [instructions/standards.md](./instrucciones/standards.md) - Estándares de código (30 min)
3. 🔄 [instructions/pr-flow.md](./instrucciones/pr-flow.md) - Flujo de trabajo (30 min)
4. 🧪 [instructions/testing.md](./instrucciones/testing.md) - Testing (45 min)

**Lectura Opcional (Referencia)**
- 📚 [instructions/glossary.md](./instrucciones/glossary.md) - Términos técnicos
- 📕 [instructions/playbooks.md](./instrucciones/playbooks.md) - Troubleshooting
- ⚙️ [instructions/tasks.instructions.md](./instrucciones/tasks.instructions.md) - VS Code tasks

---

### 🚀 Desarrollar Nueva Feature

**Fase 1: Investigación (30-60 min)**
1. 📖 [copilot-instructions.md](./copilot-instructions.md) - Verificar ubicación de módulo
2. 📄 Backend: Buscar en [instructions/backend/](./instrucciones/backend/) el dominio correspondiente:
   - Empresas/Cotizaciones → [empresas-cotizaciones.md](./instrucciones/backend/empresas-cotizaciones.md)
   - Contratos/Bodegas/Items → [contratos-bodegas-items.md](./instrucciones/backend/contratos-bodegas-items.md)
   - OT/Recursos/Rendiciones/Visitas → [ordentrabajo-recursos-rendiciones-visitas.md](./instrucciones/backend/ordentrabajo-recursos-rendiciones-visitas.md)
   - Vacaciones/Calendario/Activos → [vacaciones-calendario-activos-retroalimentacion.md](./instrucciones/backend/vacaciones-calendario-activos-retroalimentacion.md)
3. 🎨 Frontend: Revisar:
   - [ARQUITECTURA_FRONTEND.md](./arquitectura/frontend.md) - Estructura general
   - [instructions/store-structure.md](./instrucciones/store-structure.md) - Slice correspondiente

**Fase 2: Planificación (15-30 min)**
1. 📋 [instructions/standards.md](./instrucciones/standards.md) - Convenciones a seguir
2. 🔒 [instructions/security.md](./instrucciones/security.md) - Consideraciones de seguridad
3. 🔄 [instructions/pr-flow.md](./instrucciones/pr-flow.md) - Estrategia de branching

**Fase 3: Implementación**
1. 📖 [instructions/backend-instructions.md](./instrucciones/backend-instructions.md) - Crear modelos/serializers/vistas
2. 📖 [instructions/frontend-instructions.md](./instrucciones/frontend-instructions.md) - Crear componentes/servicios
3. 📖 [instructions/redux-thunks.md](./instrucciones/redux-thunks.md) - Estado global (si aplica)

**Fase 4: Testing y Calidad**
1. 🧪 [instructions/testing.md](./instrucciones/testing.md) - Estrategias de testing
2. ⚡ [instructions/performance.md](./instrucciones/performance.md) - Optimización
3. 📊 [instructions/observability.md](./instrucciones/observability.md) - Logging/métricas

**Fase 5: Deploy**
1. 🚀 [instructions/ci-cd.md](./instrucciones/ci-cd.md) - Pipeline CI/CD
2. 🔄 [instructions/pr-flow.md](./instrucciones/pr-flow.md) - Checklist de PR

---

### 🔧 Troubleshooting (Resolver Problemas)

**Problema de Permisos / Usuario sin Acceso**
1. 🔬 [EXPLORACION_EMPRESAS.md](./exploracion/empresas.md) - Bugs documentados (#2 y #4)
2. 📘 [INICIALIZACION.md](./guias/inicializacion.md) - setup_superuser.py
3. 📘 [SCRIPTS_UTILIDADES.md](./guias/scripts.md) - Flujo 5: Diagnosticar permisos
4. 📄 [instructions/backend/core-cuentas.md](./instrucciones/backend/core-cuentas.md) - PersonalizacionUsuario

**Error en Estado Redux / Datos No Aparecen**
1. 📖 [instructions/redux-thunks.md](./instrucciones/redux-thunks.md) - Debugging de thunks
2. 📖 [instructions/store-structure.md](./instrucciones/store-structure.md) - Encontrar slice correcto
3. 🔬 [EXPLORACION_EMPRESAS.md](./exploracion/empresas.md) - Bug #2: Invitaciones vacías
4. ⭐ [ARQUITECTURA_FRONTEND.md](./arquitectura/frontend.md) - Flujo de datos

**Error de Migraciones / Base de Datos**
1. 📘 [SCRIPTS_UTILIDADES.md](./guias/scripts.md) - reset_db.py, backup_db.py
2. 📘 [INICIALIZACION.md](./guias/inicializacion.md) - Flujo 2: Resetear sistema
3. 📖 [instructions/backend-instructions.md](./instrucciones/backend-instructions.md) - Migraciones
4. 📕 [instructions/playbooks.md](./instrucciones/playbooks.md) - Troubleshooting común

**Problemas de Performance**
1. ⚡ [instructions/performance.md](./instrucciones/performance.md) - N+1, índices, caché
2. 📖 [instructions/backend-instructions.md](./instrucciones/backend-instructions.md) - select_related/prefetch_related
3. 📊 [instructions/observability.md](./instrucciones/observability.md) - Métricas

**Errores de Seguridad / JWT**
1. 🔒 [instructions/security.md](./instrucciones/security.md) - JWT, CORS, secretos
2. 📖 [instructions/backend-instructions.md](./instrucciones/backend-instructions.md) - Autenticación
3. 📕 [instructions/playbooks.md](./instrucciones/playbooks.md) - JWT inválido/expirado

**Scripts No Funcionan**
1. 📘 [SCRIPTS_UTILIDADES.md](./guias/scripts.md) - Troubleshooting general
2. 📘 [INICIALIZACION.md](./guias/inicializacion.md) - Prerequisitos
3. 📕 [instructions/playbooks.md](./instrucciones/playbooks.md) - Django no configurado

---

## 🔗 Quick Links (Documentos Más Consultados)

### 🌟 Esenciales (Lectura Obligatoria)
| Documento | Propósito | Tiempo Estimado |
|-----------|-----------|-----------------|
| [copilot-instructions.md](./copilot-instructions.md) | Índice principal, reglas para IA | 15 min |
| [ARQUITECTURA_SISTEMA.md](./arquitectura/sistema.md) | Visión general del sistema | 30 min |
| [INICIALIZACION.md](./guias/inicializacion.md) | Setup completo desde cero | 45 min |
| [CONFIGURACION_DESARROLLO.md](./guias/desarrollo.md) | VS Code setup y workflows | 30 min |

### 📖 Referencias Técnicas Frecuentes
| Documento | Uso | Cuando Consultar |
|-----------|-----|------------------|
| [SCRIPTS_UTILIDADES.md](./guias/scripts.md) | Scripts disponibles | Inicialización, reset, backup |
| [instructions/backend-instructions.md](./instrucciones/backend-instructions.md) | Django/DRF patterns | Crear modelos/serializers/vistas |
| [instructions/frontend-instructions.md](./instrucciones/frontend-instructions.md) | React/Redux patterns | Crear componentes/servicios |
| [instructions/redux-thunks.md](./instrucciones/redux-thunks.md) | Estado global asíncrono | Debugging estado, crear thunks |
| [instructions/store-structure.md](./instrucciones/store-structure.md) | Índice de slices | Encontrar slice correcto |

### 🔧 Troubleshooting y Debugging
| Documento | Resuelve | Problema Típico |
|-----------|----------|-----------------|
| [EXPLORACION_EMPRESAS.md](./exploracion/empresas.md) | Bugs conocidos | Dashboard sin empresa, invitaciones vacías |
| [instructions/playbooks.md](./instrucciones/playbooks.md) | Troubleshooting común | JWT inválido, CORS error, tests fallan |
| [instructions/security.md](./instrucciones/security.md) | Seguridad | JWT lifetimes, CORS, secretos |
| [instructions/performance.md](./instrucciones/performance.md) | Performance | N+1 queries, re-renders, caché |

### 📋 Procesos y Estándares
| Documento | Aplicable A | Cuándo Leer |
|-----------|-------------|-------------|
| [instructions/standards.md](./instrucciones/standards.md) | Todo el código | Antes de escribir código |
| [instructions/pr-flow.md](./instrucciones/pr-flow.md) | Pull Requests | Antes de crear branch |
| [instructions/testing.md](./instrucciones/testing.md) | Tests | Al crear nueva feature |
| [instructions/ci-cd.md](./instrucciones/ci-cd.md) | Deploy | Setup CI, deploy a staging/prod |

### 📚 Soporte y Referencias
| Documento | Contenido | Uso |
|-----------|-----------|-----|
| [instructions/glossary.md](./instrucciones/glossary.md) | Términos técnicos | Referencia de vocabulario |
| [instructions/tasks.instructions.md](./instrucciones/tasks.instructions.md) | VS Code tasks | Ejecutar servicios, tests |
| [instructions/observability.md](./instrucciones/observability.md) | Logging, métricas | Setup monitoreo, debugging |

---

## 📂 Organización por Categoría

### 🏛️ Arquitectura y Diseño

| Documento | Líneas | Contenido |
|-----------|--------|-----------|
| [ARQUITECTURA_SISTEMA.md](./arquitectura/sistema.md) | 800+ | Stack tecnológico, flujos de datos, decisiones de diseño |
| [ARQUITECTURA_FRONTEND.md](./arquitectura/frontend.md) | 900+ | React, Redux (14 slices), componentes, routing |
| [CONFIGURACION_DESARROLLO.md](./guias/desarrollo.md) | 600+ | VS Code tasks (18), extensions (15+), debug configs |

### 🔧 Backend (Django)

| Documento | Líneas | Apps Documentadas |
|-----------|--------|-------------------|
| [instructions/backend-instructions.md](./instrucciones/backend-instructions.md) | Preexist. | Instrucciones generales |
| [instructions/backend/core-cuentas.md](./instrucciones/backend/core-cuentas.md) | 2,400 | core, cuentas |
| [instructions/backend/empresas-cotizaciones.md](./instrucciones/backend/empresas-cotizaciones.md) | 2,500 | empresas, cotizaciones |
| [instructions/backend/contratos-bodegas-items.md](./instrucciones/backend/contratos-bodegas-items.md) | 4,500 | contratos, bodegas, items |
| [instructions/backend/ordentrabajo-recursos-rendiciones-visitas.md](./instrucciones/backend/ordentrabajo-recursos-rendiciones-visitas.md) | 6,000 | ordentrabajo, recursos, rendiciones, visitas |
| [instructions/backend/vacaciones-calendario-activos-retroalimentacion.md](./instrucciones/backend/vacaciones-calendario-activos-retroalimentacion.md) | 3,500 | vacaciones, calendario, activos, bd_ciudades, retroalimentacion |

**Total Backend**: ~19,000 líneas | 15 apps documentadas | 95 modelos | 6 signals | 6 GenericFK patterns

### 🎨 Frontend (React + Redux)

| Documento | Líneas | Contenido |
|-----------|--------|-----------|
| [ARQUITECTURA_FRONTEND.md](./arquitectura/frontend.md) | 900+ | Estructura, 14 slices Redux, servicios, routing |
| [instructions/frontend-instructions.md](./instrucciones/frontend-instructions.md) | Preexist. | Instrucciones generales |
| [instructions/redux-thunks.md](./instrucciones/redux-thunks.md) | Preexist. | Redux Toolkit, thunks asíncronos |
| [instructions/store-structure.md](./instrucciones/store-structure.md) | Preexist. | Índice completo de slices |

**Total Frontend**: ~1,500 líneas | 14 slices documentados | Routing con roles | BaseService.ts

### 🚀 Scripts y Utilidades

| Documento | Líneas | Scripts Documentados |
|-----------|--------|---------------------|
| [SCRIPTS_UTILIDADES.md](./guias/scripts.md) | 800+ | 8 scripts (setup: 3, development: 4, maintenance: 1) |
| [INICIALIZACION.md](./guias/inicializacion.md) | Preexist. | Guía de setup completa |

**Flujos documentados**: Inicialización, reset, nuevo rol, backup, diagnóstico permisos

### 🔐 Procesos y Estándares

| Documento | Líneas | Cubre |
|-----------|--------|-------|
| [instructions/standards.md](./instrucciones/standards.md) | Preexist. | PEP 8, ESLint, Prettier, convenciones |
| [instructions/security.md](./instrucciones/security.md) | Preexist. | JWT, CORS/CSRF, secretos, validaciones |
| [instructions/pr-flow.md](./instrucciones/pr-flow.md) | Preexist. | Commits, branches, reviews, merges |
| [instructions/ci-cd.md](./instrucciones/ci-cd.md) | Preexist. | Pipelines, linters, tests, deploy |
| [instructions/testing.md](./instrucciones/testing.md) | Preexist. | Unit, integración, e2e, cobertura |
| [instructions/performance.md](./instrucciones/performance.md) | Preexist. | N+1, índices, caché, memoización |
| [instructions/observability.md](./instrucciones/observability.md) | Preexist. | Logging, métricas, tracing, alertas |
| [instructions/playbooks.md](./instrucciones/playbooks.md) | Preexist. | Onboarding, incidentes, rollback |

### 📚 Soporte y Referencias

| Documento | Líneas | Propósito |
|-----------|--------|-----------|
| [instructions/glossary.md](./instrucciones/glossary.md) | Preexist. | Términos de negocio y técnicos |
| [instructions/tasks.instructions.md](./instrucciones/tasks.instructions.md) | Preexist. | VS Code tasks, cómo ejecutar servicios |

### 🔬 Exploración y Análisis

| Documento | Líneas | Contenido |
|-----------|--------|-----------|
| [EXPLORACION_EMPRESAS.md](./exploracion/empresas.md) | Preexist. | Módulo 1: bugs encontrados, lecciones |
| [GUIA_EXPLORACION_SISTEMA.md](./GUIA_EXPLORACION_SISTEMA.md) | Preexist. | Guía paso a paso de exploración |

---

## 🛠️ Contribuir a la Documentación

### Agregar Nueva Documentación

**1. Determinar categoría**:
- Arquitectura → `.github/ARQUITECTURA_*.md`
- Backend apps → `.github/instrucciones/backend/<apps>.md`
- Frontend → `.github/instrucciones/frontend-*.md` o `arquitectura/frontend.md`
- Scripts → `.github/SCRIPTS_UTILIDADES.md`
- Procesos → `.github/instrucciones/<proceso>.md`
- Soporte → `.github/instrucciones/<soporte>.md`

**2. Seguir estructura estándar**:
```markdown
---
title: "Título del Documento"
scope: "backend | frontend | full-stack | scripts | proceso | soporte"
status: "active | draft | deprecated"
last_updated: "YYYY-MM-DD"
---

# Título del Documento

## Objetivo
Descripción breve del propósito y audiencia.

## Contenido Principal
...

## Referencias Cruzadas
- [Documento relacionado 1](./path/to/doc1.md)
- [Documento relacionado 2](./path/to/doc2.md)
```

**3. Actualizar índices**:
- Agregar entrada en este archivo (`INDICE_MAESTRO.md`)
- Actualizar `ESTADO_DOCUMENTACION.md` si es nuevo documento principal
- Actualizar `copilot-instructions.md` si es relevante para IA

**4. Validar**:
- [ ] Frontmatter YAML completo
- [ ] Code blocks con language tags
- [ ] Enlaces internos funcionan
- [ ] Sin referencias a archivos inexistentes
- [ ] Ortografía revisada

### Actualizar Documentación Existente

**1. Hacer cambios** en el documento apropiado

**2. Actualizar metadata**:
```yaml
last_updated: "2025-11-05"  # Fecha actual
```

**3. Si cambia estructura significativa**:
- Actualizar este índice si cambia categoría o propósito
- Actualizar referencias cruzadas en docs relacionados

**4. Commit descriptivo**:
```bash
git add .github/<archivo>.md
git commit -m "docs: actualizar <sección> de <archivo> - <razón>"
```

### Mantener Calidad

**Checklist de revisión**:
- [ ] Código de ejemplo funciona y está actualizado
- [ ] Comandos tienen sintaxis correcta para Windows (cmd.exe)
- [ ] Rutas absolutas usadas consistentemente
- [ ] Ejemplos realistas del proyecto
- [ ] Sin información desactualizada
- [ ] Referencias cruzadas actualizadas

**Frecuencia de revisión**:
- Documentos de arquitectura: revisar cada 6 meses
- Documentos técnicos (backend/frontend): revisar cada 3 meses
- Documentos de procesos: revisar cada 3 meses
- Scripts: revisar al agregar nuevo script

---

## 📊 Métricas de Documentación

### Cobertura Actual

| Área | Documentos | Líneas | Cobertura |
|------|------------|--------|-----------|
| Arquitectura | 3 | 2,300+ | ✅ 100% |
| Backend (apps) | 6 | 19,000+ | ✅ 100% (15/15 apps) |
| Frontend | 4 | 1,500+ | ✅ 100% (14 slices) |
| Scripts | 2 | 1,500+ | ✅ 100% (8 scripts) |
| Procesos | 8 | 2,000+ | ✅ 100% |
| Soporte | 2 | 500+ | ✅ 100% |
| Exploración | 2 | Preexist. | ✅ Módulo 1 completo |

**Total**: 23 documentos | ~21,100 líneas | **80% progreso general**

### Próximas Mejoras

**Corto Plazo**:
- [ ] Reorganizar `backend-instructions.md` y `frontend-instructions.md` a subcarpetas
- [ ] Crear archivos VS Code config (`.vscode/settings.json`, `.vscode/launch.json`)
- [ ] Validar integridad de enlaces internos
- [ ] Completar exploración de módulos faltantes (Módulo 2: Usuarios Empresa, Módulo 3: OT, etc.)

**Medio Plazo**:
- [ ] Agregar diagramas visuales (arquitectura, flujos de datos)
- [ ] Crear videos tutoriales (setup, debugging común)
- [ ] Documentar patrones de UI/UX (componentes base, design tokens)
- [ ] Documentar estrategias de deployment (Docker, Kubernetes)

**Largo Plazo**:
- [ ] API documentation con Swagger/OpenAPI
- [ ] Storybook para componentes React
- [ ] Performance benchmarks documentados
- [ ] Documentación de migración entre versiones

---

## 🔄 Actualización de `copilot-instructions.md`

Este índice complementa `copilot-instructions.md`. Ambos deben mantenerse sincronizados:

- **`copilot-instructions.md`**: Reglas para IA, directivas operativas, prompts cortos
- **`INDICE_MAESTRO.md`** (este archivo): Navegación humana, guías de lectura

Al agregar documentación:
1. Actualizar este índice con ubicación y propósito
2. Agregar referencia en `copilot-instructions.md` si es relevante para IA
3. Mantener coherencia en descripciones entre ambos

---

## 🆘 Soporte

### ¿No Encuentras lo que Buscas?

**1. Buscar en este índice** por categoría o quick links

**2. Buscar en archivos**:
```cmd
REM Desde raíz del proyecto
findstr /s /i "término de búsqueda" .github\*.md
```

**3. Consultar `copilot-instructions.md`**:
- Sección 11: Enlaces a módulos temáticos
- Sección 12: Comandos de desarrollo

**4. Revisar `ESTADO_DOCUMENTACION.md`**:
- Ver qué está documentado y qué falta

**5. Preguntar en canal de equipo**:
- Equipo puede tener conocimiento no documentado aún

### Reportar Problemas en Documentación

**Documentación incorrecta o desactualizada**:
1. Crear issue en GitHub: "docs: [archivo] - [problema breve]"
2. Describir: qué está mal, qué debería decir, cómo probaste
3. Etiquetar como `documentation`

**Documentación faltante**:
1. Crear issue: "docs: agregar documentación para [tema]"
2. Justificar: por qué es importante, quién lo usaría
3. Etiquetar como `documentation`, `enhancement`

---

## 📅 Historial de Cambios

| Fecha | Cambio | Autor |
|-------|--------|-------|
| 2025-11-05 | Creación inicial del índice maestro | Fabian |
| 2025-11-05 | Agregados 9 documentos nuevos (~19,100 líneas) | Fabian |
| 2025-11-05 | Organizados 14 documentos preexistentes | Fabian |

---

**Última actualización**: 2025-11-05  
**Versión**: 1.0  
**Mantenido por**: Equipo de desarrollo  
**Contacto**: Crear issue en GitHub para sugerencias/correcciones

---

## 🎯 Siguiente Lectura Recomendada

**Si eres nuevo**: [INICIALIZACION.md](./guias/inicializacion.md) → [ARQUITECTURA_SISTEMA.md](./arquitectura/sistema.md)  
**Si desarrollas backend**: [instructions/backend-instructions.md](./instrucciones/backend-instructions.md)  
**Si desarrollas frontend**: [instructions/frontend-instructions.md](./instrucciones/frontend-instructions.md)  
**Si resuelves problemas**: [instructions/playbooks.md](./instrucciones/playbooks.md)  
**Si creas PR**: [instructions/pr-flow.md](./instrucciones/pr-flow.md)

¡Feliz coding! 🚀
