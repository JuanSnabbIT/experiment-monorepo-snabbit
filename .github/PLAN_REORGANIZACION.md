---
title: "Plan de Reorganización de Documentación"
scope: "documentación"
status: "active"
last_updated: "2025-11-07"
---

# 📂 Plan de Reorganización de Documentación

## 🎯 Objetivo

Reorganizar la documentación del proyecto en una estructura lógica y escalable que facilite:

1. **Navegación intuitiva** por categorías temáticas
2. **Tracking de hallazgos** durante la exploración
3. **Separación de concerns** (arquitectura, guías, instrucciones, exploración)
4. **Mantenimiento** a largo plazo sin duplicación ni confusión

---

## 📁 Nueva Estructura Propuesta

```
.github/
├── 📖 README.md                          # Landing page de documentación
├── 🗺️ INDICE_MAESTRO.md                 # Índice principal mejorado
│
├── 🏛️ arquitectura/                      # Documentos de arquitectura y diseño
│   ├── sistema.md                        # Actual ARQUITECTURA_SISTEMA.md
│   ├── frontend.md                       # Actual ARQUITECTURA_FRONTEND.md
│   ├── backend.md                        # Organización de apps Django
│   ├── base-de-datos.md                  # Modelo de datos, relaciones
│   ├── seguridad.md                      # Arquitectura de seguridad
│   └── decisiones/                       # Architecture Decision Records (ADRs)
│       ├── 001-monorepo.md
│       ├── 002-uuid-vs-autoid.md
│       └── 003-soft-delete.md
│
├── 🔍 exploracion/                        # Exploraciones de módulos
│   ├── README.md                         # Guía de exploración
│   ├── empresas.md                       # Actual EXPLORACION_EMPRESAS.md
│   ├── contratos.md                      # Actual EXPLORACION_CONTRATOS.md
│   ├── ordentrabajo.md                   # Futuro análisis OT
│   ├── cotizaciones.md                   # Futuro
│   ├── bodegas.md                        # Futuro
│   └── template.md                       # Plantilla para nuevas exploraciones
│
├── 📚 guias/                              # Guías prácticas y tutoriales
│   ├── inicializacion.md                 # Actual INICIALIZACION.md
│   ├── desarrollo.md                     # Actual CONFIGURACION_DESARROLLO.md
│   ├── exploracion-sistema.md            # Actual GUIA_EXPLORACION_SISTEMA.md
│   ├── scripts.md                        # Actual SCRIPTS_UTILIDADES.md
│   ├── onboarding-desarrollador.md       # Nuevo: guía día a día
│   └── troubleshooting.md                # Nuevo: problemas comunes
│
├── 📖 instrucciones/                      # Instrucciones técnicas (mantener estructura)
│   ├── README.md                         # Índice de instrucciones
│   ├── backend/
│   │   ├── general.md                    # Actual backend-instructions.md
│   │   ├── core-cuentas.md
│   │   ├── empresas-cotizaciones.md
│   │   ├── contratos-bodegas-items.md
│   │   ├── ordentrabajo-recursos-rendiciones-visitas.md
│   │   └── vacaciones-calendario-activos-retroalimentacion.md
│   ├── frontend/
│   │   ├── general.md                    # Actual frontend-instructions.md
│   │   ├── redux-thunks.md
│   │   └── store-structure.md
│   ├── procesos/
│   │   ├── standards.md
│   │   ├── security.md
│   │   ├── pr-flow.md
│   │   ├── ci-cd.md
│   │   ├── testing.md
│   │   ├── performance.md
│   │   └── observability.md
│   └── soporte/
│       ├── glossary.md
│       ├── playbooks.md
│       └── tasks.instructions.md
│
├── 📊 tracking/                           # Tracking de progreso y hallazgos
│   ├── hallazgos-y-mejoras.md            # Actual HALLAZGOS_Y_MEJORAS.md (NUEVO)
│   ├── estado-documentacion.md           # Actual ESTADO_DOCUMENTACION.md
│   ├── roadmap.md                        # Roadmap de desarrollo
│   └── changelog.md                      # Cambios implementados
│
├── 📋 plantillas/                         # Plantillas para documentación
│   ├── exploracion-modulo.md
│   ├── hallazgo.md
│   ├── mejora.md
│   ├── adr.md                            # Architecture Decision Record
│   └── guia-practica.md
│
├── 🔧 meta/                               # Metadata del repositorio
│   ├── REPO_SUMMARY.json                 # Resumen estructurado
│   └── doc-structure.json                # Estructura de docs (navegación)
│
├── 💬 prompts/                            # Prompts para agentes IA (mantener)
│   └── repo-analyzer.prompt.md
│
└── 🎓 copilot-instructions.md             # Índice principal para IA (raíz)
```

---

## 🔄 Mapeo de Archivos Existentes → Nueva Ubicación

### Documentos de Arquitectura

| Archivo Actual | Nueva Ubicación | Acción |
|----------------|-----------------|--------|
| `arquitectura/sistema.md` | `arquitectura/sistema.md` | Mover |
| `arquitectura/frontend.md` | `arquitectura/frontend.md` | Mover |
| `MODELO_DATOS_SISTEMA.md` | `arquitectura/base-de-datos.md` | Mover |
| `MODELO_NEGOCIO.md` | `arquitectura/modelo-negocio.md` | Mover |

### Exploraciones

| Archivo Actual | Nueva Ubicación | Acción |
|----------------|-----------------|--------|
| `exploracion/empresas.md` | `exploracion/empresas.md` | Mover |
| `EXPLORACION_CONTRATOS.md` | `exploracion/contratos.md` | Mover |
| `EXPLORACION_ORDENTRABAJO.md` | `exploracion/ordentrabajo.md` | Mover (si existe) |

### Guías

| Archivo Actual | Nueva Ubicación | Acción |
|----------------|-----------------|--------|
| `guias/inicializacion.md` | `guias/inicializacion.md` | Mover |
| `guias/desarrollo.md` | `guias/desarrollo.md` | Mover |
| `GUIA_EXPLORACION_SISTEMA.md` | `guias/exploracion-sistema.md` | Mover |
| `guias/scripts.md` | `guias/scripts.md` | Mover |

### Instrucciones (Reorganizar en Subcarpetas)

| Archivo Actual | Nueva Ubicación | Acción |
|----------------|-----------------|--------|
| `instructions/backend-instructions.md` | `instrucciones/backend/general.md` | Mover |
| `instructions/frontend-instructions.md` | `instrucciones/frontend/general.md` | Mover |
| `instructions/redux-thunks.md` | `instrucciones/frontend/redux-thunks.md` | Mover |
| `instructions/store-structure.md` | `instrucciones/frontend/store-structure.md` | Mover |
| `instructions/standards.md` | `instrucciones/procesos/standards.md` | Mover |
| `instructions/security.md` | `instrucciones/procesos/security.md` | Mover |
| `instructions/pr-flow.md` | `instrucciones/procesos/pr-flow.md` | Mover |
| `instructions/ci-cd.md` | `instrucciones/procesos/ci-cd.md` | Mover |
| `instructions/testing.md` | `instrucciones/procesos/testing.md` | Mover |
| `instructions/performance.md` | `instrucciones/procesos/performance.md` | Mover |
| `instructions/observability.md` | `instrucciones/procesos/observability.md` | Mover |
| `instructions/playbooks.md` | `instrucciones/soporte/playbooks.md` | Mover |
| `instructions/glossary.md` | `instrucciones/soporte/glossary.md` | Mover |
| `instructions/tasks.instructions.md` | `instrucciones/soporte/tasks.md` | Mover |
| `instructions/backend/*.md` | `instrucciones/backend/*.md` | Mantener ubicación |

### Tracking y Metadata

| Archivo Actual | Nueva Ubicación | Acción |
|----------------|-----------------|--------|
| `ESTADO_DOCUMENTACION.md` | `tracking/estado-documentacion.md` | Mover |
| `HALLAZGOS_Y_MEJORAS.md` | `tracking/hallazgos-y-mejoras.md` | Ya creado ✅ |
| (nuevo) | `tracking/roadmap.md` | Crear |
| (nuevo) | `tracking/changelog.md` | Crear |

### Otros

| Archivo Actual | Nueva Ubicación | Acción |
|----------------|-----------------|--------|
| `INDICE_MAESTRO.md` | `INDICE_MAESTRO.md` | Renombrar y actualizar |
| `copilot-instructions.md` | `copilot-instructions.md` | Mantener en raíz (actualizar) |
| `COPILOT_SETUP.md` | `guias/copilot-setup.md` | Mover |
| `REFERENCIA_RAPIDA_ENDPOINTS.md` | `instrucciones/backend/referencia-endpoints.md` | Mover |
| Documentos de flujos específicos (ej. `FLUJO_FACTURACION_CONTRATOS_OT.md`) | `arquitectura/flujos/` | Mover a nueva subcarpeta |
| Documentos de módulos específicos (ej. `MODULO_AUTENTICACION_Y_CONTRATOS.md`) | `exploracion/` o `arquitectura/` según contenido | Evaluar y mover |

---

## ✅ Checklist de Reorganización

### Fase 1: Crear Estructura (COMPLETADO ✅)

- [x] Crear carpeta `arquitectura/`
- [x] Crear carpeta `exploracion/`
- [x] Crear carpeta `guias/`
- [x] Reorganizar `instrucciones/` en subcarpetas
- [x] Crear carpeta `tracking/`
- [x] Crear carpeta `plantillas/`
- [x] Crear carpeta `meta/`

### Fase 2: Crear Plantillas

- [ ] `plantillas/exploracion-modulo.md` (template para explorar nuevos módulos)
- [ ] `plantillas/hallazgo.md` (template para bugs/mejoras)
- [ ] `plantillas/adr.md` (Architecture Decision Record)
- [ ] `plantillas/guia-practica.md` (template para guías paso a paso)

### Fase 3: Mover Archivos Existentes

**Arquitectura** (4 archivos):
- [ ] Mover `arquitectura/sistema.md` → `arquitectura/sistema.md`
- [ ] Mover `arquitectura/frontend.md` → `arquitectura/frontend.md`
- [ ] Mover `MODELO_DATOS_SISTEMA.md` → `arquitectura/base-de-datos.md`
- [ ] Mover `MODELO_NEGOCIO.md` → `arquitectura/modelo-negocio.md`

**Exploraciones** (2+ archivos):
- [ ] Mover `exploracion/empresas.md` → `exploracion/empresas.md`
- [ ] Mover `EXPLORACION_CONTRATOS.md` → `exploracion/contratos.md`
- [ ] Crear `exploracion/README.md` (guía de exploración)

**Guías** (4 archivos):
- [ ] Mover `guias/inicializacion.md` → `guias/inicializacion.md`
- [ ] Mover `guias/desarrollo.md` → `guias/desarrollo.md`
- [ ] Mover `GUIA_EXPLORACION_SISTEMA.md` → `guias/exploracion-sistema.md`
- [ ] Mover `guias/scripts.md` → `guias/scripts.md`

**Instrucciones Backend** (mantener estructura actual):
- [ ] Crear `instrucciones/backend/README.md` (índice)
- [ ] Mover `instructions/backend-instructions.md` → `instrucciones/backend/general.md`
- [ ] Verificar que `instrucciones/backend/*.md` están bien organizados

**Instrucciones Frontend** (reorganizar):
- [ ] Crear `instrucciones/frontend/` (carpeta nueva)
- [ ] Mover `instructions/frontend-instructions.md` → `instrucciones/frontend/general.md`
- [ ] Mover `instructions/redux-thunks.md` → `instrucciones/frontend/redux-thunks.md`
- [ ] Mover `instructions/store-structure.md` → `instrucciones/frontend/store-structure.md`
- [ ] Crear `instrucciones/frontend/README.md`

**Instrucciones Procesos** (reorganizar):
- [ ] Crear `instrucciones/procesos/` (carpeta nueva)
- [ ] Mover `instructions/standards.md` → `instrucciones/procesos/standards.md`
- [ ] Mover `instructions/security.md` → `instrucciones/procesos/security.md`
- [ ] Mover `instructions/pr-flow.md` → `instrucciones/procesos/pr-flow.md`
- [ ] Mover `instructions/ci-cd.md` → `instrucciones/procesos/ci-cd.md`
- [ ] Mover `instructions/testing.md` → `instrucciones/procesos/testing.md`
- [ ] Mover `instructions/performance.md` → `instrucciones/procesos/performance.md`
- [ ] Mover `instructions/observability.md` → `instrucciones/procesos/observability.md`

**Instrucciones Soporte** (reorganizar):
- [ ] Crear `instrucciones/soporte/` (carpeta nueva)
- [ ] Mover `instructions/playbooks.md` → `instrucciones/soporte/playbooks.md`
- [ ] Mover `instructions/glossary.md` → `instrucciones/soporte/glossary.md`
- [ ] Mover `instructions/tasks.instructions.md` → `instrucciones/soporte/tasks.md`

**Tracking**:
- [ ] Mover `ESTADO_DOCUMENTACION.md` → `tracking/estado-documentacion.md`
- [ ] `tracking/hallazgos-y-mejoras.md` ya creado ✅
- [ ] Crear `tracking/roadmap.md`
- [ ] Crear `tracking/changelog.md`

### Fase 4: Crear Nuevos Documentos

- [ ] `meta/REPO_SUMMARY.json` (resumen estructurado según prompt)
- [ ] `meta/doc-structure.json` (estructura de navegación)
- [ ] `arquitectura/decisiones/` (carpeta para ADRs)
- [ ] `arquitectura/decisiones/001-monorepo.md` (primer ADR)
- [ ] `exploracion/template.md` (copiar de plantillas/)
- [ ] `instrucciones/README.md` (índice general de instrucciones)
- [ ] `INDICE_MAESTRO.md` (actualizar INDICE_MAESTRO.md)
- [ ] `.github/README.md` (landing page de documentación)

### Fase 5: Actualizar Referencias

**Actualizar enlaces internos en**:
- [ ] `copilot-instructions.md` (referencias a nueva estructura)
- [ ] `INDICE_MAESTRO.md` (todos los enlaces)
- [ ] Todos los archivos movidos (actualizar enlaces relativos)
- [ ] `README.md` del proyecto raíz (si aplica)

**Verificar integridad**:
- [ ] Todos los enlaces internos funcionan
- [ ] No hay archivos huérfanos (sin referencia)
- [ ] Frontmatter YAML correcto en todos los archivos

### Fase 6: Limpieza

- [ ] Eliminar carpeta `instructions/` vacía (después de mover todo)
- [ ] Verificar que no quedan duplicados en raíz de `.github/`
- [ ] Actualizar `.copilotignore` si es necesario

---

## 🎯 Beneficios de la Nueva Estructura

### 1. Navegación Intuitiva

**Antes**: 23 archivos en `.github/` + `instructions/` sin organización clara

**Después**: 6 categorías temáticas con propósito claro:
- 🏛️ `arquitectura/` → Diseño y decisiones técnicas
- 🔍 `exploracion/` → Análisis de módulos
- 📚 `guias/` → Tutoriales prácticos
- 📖 `instrucciones/` → Referencias técnicas
- 📊 `tracking/` → Progreso y hallazgos
- 📋 `plantillas/` → Templates reutilizables

### 2. Separación de Concerns

- **Arquitectura**: Documentos estables, actualizan raramente (decisiones de diseño)
- **Exploraciones**: Documentos dinámicos durante fase de análisis
- **Guías**: Documentos prácticos para onboarding y desarrollo
- **Instrucciones**: Referencias técnicas detalladas (código, APIs, procesos)
- **Tracking**: Estado actual, hallazgos, cambios planificados

### 3. Escalabilidad

- Fácil agregar nueva exploración: copiar `plantillas/exploracion-modulo.md`
- Fácil documentar decisión arquitectónica: crear ADR en `arquitectura/decisiones/`
- Fácil rastrear hallazgo: agregar a `tracking/hallazgos-y-mejoras.md`

### 4. Mantenibilidad

- Enlaces relativos claros: `../arquitectura/sistema.md`, `./exploracion/empresas.md`
- README.md en cada carpeta explica propósito y contenido
- Plantillas estandarizan formato (consistencia)

---

## 🚀 Comandos para Ejecutar Reorganización

### Windows (cmd.exe)

```cmd
REM Desde .github/

REM Fase 1: Mover arquitectura
move ARQUITECTURA_SISTEMA.md arquitectura\sistema.md
move ARQUITECTURA_FRONTEND.md arquitectura\frontend.md
move MODELO_DATOS_SISTEMA.md arquitectura\base-de-datos.md
move MODELO_NEGOCIO.md arquitectura\modelo-negocio.md

REM Fase 2: Mover exploraciones
move EXPLORACION_EMPRESAS.md exploracion\empresas.md
move EXPLORACION_CONTRATOS.md exploracion\contratos.md

REM Fase 3: Mover guías
move INICIALIZACION.md guias\inicializacion.md
move CONFIGURACION_DESARROLLO.md guias\desarrollo.md
move GUIA_EXPLORACION_SISTEMA.md guias\exploracion-sistema.md
move SCRIPTS_UTILIDADES.md guias\scripts.md

REM Fase 4: Reorganizar instrucciones (backend)
mkdir instrucciones\backend
move instructions\backend-instructions.md instrucciones\backend\general.md
xcopy /E /I instructions\backend instrucciones\backend

REM Fase 5: Reorganizar instrucciones (frontend)
mkdir instrucciones\frontend
move instructions\frontend-instructions.md instrucciones\frontend\general.md
move instructions\redux-thunks.md instrucciones\frontend\redux-thunks.md
move instructions\store-structure.md instrucciones\frontend\store-structure.md

REM Fase 6: Reorganizar instrucciones (procesos)
mkdir instrucciones\procesos
move instructions\standards.md instrucciones\procesos\standards.md
move instructions\security.md instrucciones\procesos\security.md
move instructions\pr-flow.md instrucciones\procesos\pr-flow.md
move instructions\ci-cd.md instrucciones\procesos\ci-cd.md
move instructions\testing.md instrucciones\procesos\testing.md
move instructions\performance.md instrucciones\procesos\performance.md
move instructions\observability.md instrucciones\procesos\observability.md

REM Fase 7: Reorganizar instrucciones (soporte)
mkdir instrucciones\soporte
move instructions\playbooks.md instrucciones\soporte\playbooks.md
move instructions\glossary.md instrucciones\soporte\glossary.md
move instructions\tasks.instructions.md instrucciones\soporte\tasks.md

REM Fase 8: Mover tracking
move ESTADO_DOCUMENTACION.md tracking\estado-documentacion.md

REM Fase 9: Renombrar índice
move INDICE_MAESTRO.md INDICE_MAESTRO.md

REM Fase 10: Limpiar carpeta instructions/ vacía
rmdir /S /Q instructions
```

**⚠️ IMPORTANTE**: Ejecutar comandos UNO A UNO, verificando que el archivo existe antes de mover.

---

## 📋 Script de Reorganización Automatizado

**Opción recomendada**: Crear script Python para reorganización segura:

```python
# reorganize_docs.py
import os
import shutil
from pathlib import Path

# Mapeo: origen → destino
MOVES = {
    'ARQUITECTURA_SISTEMA.md': 'arquitectura/sistema.md',
    'ARQUITECTURA_FRONTEND.md': 'arquitectura/frontend.md',
    'MODELO_DATOS_SISTEMA.md': 'arquitectura/base-de-datos.md',
    'MODELO_NEGOCIO.md': 'arquitectura/modelo-negocio.md',
    # ... más movimientos
}

def reorganize(base_path='.github', dry_run=True):
    """Reorganiza documentación según PLAN_REORGANIZACION.md."""
    base = Path(base_path)
    
    for src, dst in MOVES.items():
        src_path = base / src
        dst_path = base / dst
        
        if not src_path.exists():
            print(f"⚠️  SKIP: {src} no existe")
            continue
        
        # Crear carpeta de destino si no existe
        dst_path.parent.mkdir(parents=True, exist_ok=True)
        
        if dry_run:
            print(f"🔍 DRY-RUN: {src} → {dst}")
        else:
            shutil.move(str(src_path), str(dst_path))
            print(f"✅ MOVED: {src} → {dst}")

if __name__ == '__main__':
    import sys
    dry_run = '--execute' not in sys.argv
    
    if dry_run:
        print("🔍 DRY-RUN MODE (use --execute to apply changes)")
    
    reorganize(dry_run=dry_run)
```

**Uso**:
```cmd
REM Ver qué se haría (sin cambios)
python reorganize_docs.py

REM Ejecutar reorganización
python reorganize_docs.py --execute
```

---

## 📝 Próximos Pasos

1. **Revisar este plan** y ajustar según necesidades
2. **Crear plantillas** en `plantillas/`
3. **Ejecutar reorganización** (preferiblemente con script)
4. **Actualizar todos los enlaces** en documentos movidos
5. **Actualizar INDICE_MAESTRO.md** con nueva estructura
6. **Actualizar copilot-instructions.md** con referencias actualizadas
7. **Verificar integridad** de enlaces
8. **Commit y push** con mensaje descriptivo

---

## ⚠️ Advertencias

- **Hacer backup** antes de reorganizar (o trabajar en branch)
- **Verificar links rotos** después de mover archivos
- **Actualizar copilot-instructions.md** para que agentes IA conozcan nueva estructura
- **Comunicar cambios** al equipo si es proyecto compartido

---

**Última actualización**: 2025-11-07  
**Estado**: Plan aprobado, pendiente ejecución  
**Mantenido por**: Fabian
