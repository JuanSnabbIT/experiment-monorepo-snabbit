# 📚 Documentación del Monorepo ERP

Bienvenido a la documentación centralizada del sistema ERP. Esta carpeta contiene toda la información necesaria para comprender, desarrollar y mantener el proyecto.

---

## 🗺️ Navegación Rápida

### Para Nuevos Desarrolladores
👋 **Empieza aquí**: [Guía de Inicialización](./guias/inicializacion.md) → [Arquitectura del Sistema](./arquitectura/sistema.md)

### Para Desarrolladores Activos
🔍 **Explorando el sistema**: [Tracking de Hallazgos](./tracking/hallazgos-y-mejoras.md)  
📖 **Referencias técnicas**: [Instrucciones Backend](./instrucciones/backend/) | [Frontend](./instrucciones/frontend/)

### Para GitHub Copilot y Agentes IA
🤖 **Índice principal**: [copilot-instructions.md](./copilot-instructions.md)  
📊 **Resumen estructurado**: [meta/REPO_SUMMARY.json](./meta/REPO_SUMMARY.json)

---

## 📂 Estructura de Esta Carpeta

```
.github/
├── 📖 README.md (este archivo)
├── 🗺️ INDICE_MAESTRO.md               # Índice completo con guías de lectura
├── 🤖 copilot-instructions.md          # Instrucciones para agentes IA
│
├── 🏛️ arquitectura/                    # Diseño y decisiones técnicas
│   ├── sistema.md                      # Visión general del monorepo
│   ├── frontend.md                     # React + Redux + routing
│   ├── base-de-datos.md                # Modelo de datos
│   ├── modelo-negocio.md               # Lógica de negocio ERP
│   └── decisiones/ (futuro)            # Architecture Decision Records
│
├── 🔍 exploracion/                     # Exploraciones de módulos
│   ├── README.md                       # Guía de exploración
│   ├── empresas.md                     # Módulo 1: Empresas
│   ├── contratos.md                    # Módulo 2: Contratos
│   └── template.md                     # Plantilla para nuevas exploraciones
│
├── 📚 guias/                           # Tutoriales prácticos
│   ├── inicializacion.md               # Setup desde cero
│   ├── desarrollo.md                   # VS Code, tasks, debugging
│   ├── exploracion-sistema.md          # Cómo explorar el sistema
│   └── scripts.md                      # Scripts de utilidad
│
├── 📖 instrucciones/                   # Referencias técnicas detalladas
│   ├── README.md                       # Índice de instrucciones
│   ├── backend/                        # Django, DRF, Celery
│   ├── frontend/                       # React, Redux, TypeScript
│   ├── procesos/                       # Standards, security, testing
│   └── soporte/                        # Glossary, playbooks, tasks
│
├── 📊 tracking/                        # Seguimiento de progreso
│   ├── hallazgos-y-mejoras.md          # Bugs, mejoras, notas técnicas
│   ├── estado-documentacion.md         # Estado de la documentación
│   ├── roadmap.md (futuro)             # Roadmap de desarrollo
│   └── changelog.md (futuro)           # Cambios implementados
│
├── 📋 plantillas/                      # Templates para documentación
│   ├── exploracion-modulo.md
│   ├── hallazgo.md
│   ├── adr.md (futuro)
│   └── guia-practica.md (futuro)
│
├── 🔧 meta/                            # Metadata estructurada
│   ├── REPO_SUMMARY.json               # Resumen completo del repo
│   └── doc-structure.json (futuro)
│
├── 💬 prompts/                         # Prompts para agentes IA
│   └── repo-analyzer.prompt.md
│
└── 📄 PLAN_REORGANIZACION.md           # Plan de reorganización de docs
```

---

## 🎯 Guías de Lectura por Objetivo

### 🆕 Onboarding (Primer día)

**Tiempo estimado**: 2-3 horas

1. 📖 [README.md](./README.md) (este archivo) - 5 min
2. 📚 [Guía de Inicialización](./guias/inicializacion.md) - 45 min
3. 🏛️ [Arquitectura del Sistema](./arquitectura/sistema.md) - 30 min
4. 📚 [Configuración de Desarrollo](./guias/desarrollo.md) - 30 min
5. 🏛️ [Arquitectura Frontend](./arquitectura/frontend.md) - 30 min

**Resultado**: Entorno configurado, comprensión básica del sistema

---

### 🔨 Desarrollar Nueva Feature

**Flujo recomendado**:

1. **Investigar** → Buscar módulo en [INDICE_MAESTRO.md](./INDICE_MAESTRO.md)
2. **Leer arquitectura** → [arquitectura/sistema.md](./arquitectura/sistema.md) + [backend](./instrucciones/backend/) o [frontend](./instrucciones/frontend/)
3. **Revisar estándares** → [instrucciones/procesos/standards.md](./instrucciones/procesos/standards.md)
4. **Implementar** → Seguir [pr-flow.md](./instrucciones/procesos/pr-flow.md)
5. **Testear** → Ver [testing.md](./instrucciones/procesos/testing.md)
6. **Documentar** → Actualizar [tracking/hallazgos-y-mejoras.md](./tracking/hallazgos-y-mejoras.md) si encuentras hallazgos

---

### 🔍 Explorar Módulo Nuevo

**Flujo de exploración sistemática**:

1. **Preparar** → Copiar [plantillas/exploracion-modulo.md](./plantillas/exploracion-modulo.md)
2. **Explorar** → Seguir [guias/exploracion-sistema.md](./guias/exploracion-sistema.md)
3. **Documentar hallazgos** → Usar [plantillas/hallazgo.md](./plantillas/hallazgo.md)
4. **Registrar en tracking** → Agregar a [tracking/hallazgos-y-mejoras.md](./tracking/hallazgos-y-mejoras.md)
5. **Completar exploración** → Guardar en [exploracion/](./exploracion/)

**Ejemplo completo**: [exploracion/empresas.md](./exploracion/empresas.md)

---

### 🐛 Resolver Bug o Problema

**Quick troubleshooting**:

1. **Revisar hallazgos conocidos** → [tracking/hallazgos-y-mejoras.md](./tracking/hallazgos-y-mejoras.md)
2. **Buscar en exploraciones** → [exploracion/](./exploracion/) (bugs documentados)
3. **Consultar playbooks** → [instrucciones/soporte/playbooks.md](./instrucciones/soporte/playbooks.md)
4. **Revisar seguridad** → [instrucciones/procesos/security.md](./instrucciones/procesos/security.md)
5. **Registrar nuevo bug** → Usar [plantillas/hallazgo.md](./plantillas/hallazgo.md)

---

## 📊 Estado Actual del Proyecto

| Aspecto | Estado | Notas |
|---------|--------|-------|
| Documentación | 🟡 80% | Ver [tracking/estado-documentacion.md](./tracking/estado-documentacion.md) |
| Exploración | 🟡 60% | Empresas ✅, OT 🟡, Cotizaciones ⏳ |
| Bugs P0 | 🔴 2 | Ver [tracking/hallazgos-y-mejoras.md#p0---crítico](./tracking/hallazgos-y-mejoras.md) |
| Mejoras propuestas | 🟡 5 | Ver [tracking/hallazgos-y-mejoras.md#mejoras](./tracking/hallazgos-y-mejoras.md) |

**Última actualización**: 2025-11-07

---

## 🔧 Herramientas y Configuración

### VS Code Tasks Disponibles

Ver lista completa en [guias/desarrollo.md](./guias/desarrollo.md#tasks-de-vs-code)

**Más usados**:
- `Backend: Runserver` - Iniciar Django dev server
- `Frontend: Dev Server` - Iniciar Vite dev server
- `Start: All (Backend + Frontend)` - Iniciar todo en paralelo
- `Setup: Seed Completo (RECOMENDADO)` - Seed completo de datos

### Scripts de Utilidad

Ver documentación completa en [guias/scripts.md](./guias/scripts.md)

**Setup**:
- `setup_superuser.py` - Crear superusuario + empresa
- `seed_data.py` - Seed datos base
- `reset_db.py` - Resetear base de datos

**Development**:
- `create_groups.py` - Crear grupos y permisos
- `check_personalizacion.py` - Diagnosticar permisos

**Maintenance**:
- `backup_db.py` - Backup de base de datos

---

## 📝 Convenciones de Documentación

### Frontmatter YAML

Todos los archivos markdown deben incluir:

```yaml
---
title: "Título del Documento"
scope: "arquitectura | exploración | guía | instrucciones | tracking"
status: "active | draft | deprecated | template"
last_updated: "YYYY-MM-DD"
---
```

### Estructura de Documento

```markdown
# Título Principal

## Objetivo
[Propósito del documento]

## Contenido Principal
[...]

## Referencias Cruzadas
- [Doc relacionado 1](./path/to/doc1.md)
- [Doc relacionado 2](./path/to/doc2.md)
```

### Enlaces Relativos

Siempre usar rutas relativas desde el archivo actual:

```markdown
✅ CORRECTO:
- [Arquitectura](./arquitectura/sistema.md)
- [Backend](./instrucciones/backend/general.md)
- [Hallazgos](../tracking/hallazgos-y-mejoras.md)

❌ INCORRECTO:
- [Arquitectura](/arquitectura/sistema.md)
- [Backend](instrucciones/backend/general.md)
```

---

## 🤝 Contribuir a la Documentación

### Agregar Nueva Documentación

1. **Determinar categoría**: arquitectura, exploración, guía, instrucciones, tracking
2. **Copiar plantilla apropiada** desde [plantillas/](./plantillas/)
3. **Seguir convenciones** de frontmatter y estructura
4. **Actualizar índices**:
   - [INDICE_MAESTRO.md](./INDICE_MAESTRO.md)
   - [tracking/estado-documentacion.md](./tracking/estado-documentacion.md)
   - [copilot-instructions.md](./copilot-instructions.md) (si es relevante para IA)
5. **Commitear** con mensaje descriptivo

### Actualizar Documentación Existente

1. Hacer cambios en el archivo apropiado
2. Actualizar campo `last_updated` en frontmatter
3. Si cambia estructura, actualizar referencias en otros docs
4. Commitear con mensaje: `docs: actualizar <sección> de <archivo> - <razón>`

### Reportar Problemas en Documentación

Crear issue con etiqueta `documentation`:
- Título: `docs: [archivo] - [problema breve]`
- Describir: qué está mal, qué debería decir, evidencia

---

## 🔗 Enlaces Importantes

### Documentos Esenciales
- 🗺️ [Índice Maestro](./INDICE_MAESTRO.md) - Navegación completa
- 🤖 [Copilot Instructions](./copilot-instructions.md) - Para agentes IA
- 📊 [Resumen del Repo (JSON)](./meta/REPO_SUMMARY.json) - Metadata estructurada

### Arquitectura
- 🏛️ [Sistema](./arquitectura/sistema.md) - Visión general
- 🎨 [Frontend](./arquitectura/frontend.md) - React + Redux
- 🗄️ [Base de Datos](./arquitectura/base-de-datos.md) - Modelo de datos
- 💼 [Modelo de Negocio](./arquitectura/modelo-negocio.md) - Lógica ERP

### Guías Prácticas
- 🚀 [Inicialización](./guias/inicializacion.md) - Setup desde cero
- ⚙️ [Desarrollo](./guias/desarrollo.md) - VS Code + workflows
- 🔍 [Exploración](./guias/exploracion-sistema.md) - Cómo explorar
- 🛠️ [Scripts](./guias/scripts.md) - Utilidades disponibles

### Tracking
- 📋 [Hallazgos y Mejoras](./tracking/hallazgos-y-mejoras.md) - Bugs, mejoras, notas
- 📈 [Estado Documentación](./tracking/estado-documentacion.md) - Progreso

---

## 📞 Soporte

### ¿No Encuentras lo que Buscas?

1. **Buscar en INDICE_MAESTRO.md**: [./INDICE_MAESTRO.md](./INDICE_MAESTRO.md)
2. **Buscar en archivos** (desde raíz del proyecto):
   ```cmd
   findstr /s /i "término de búsqueda" .github\*.md
   ```
3. **Consultar REPO_SUMMARY.json**: [./meta/REPO_SUMMARY.json](./meta/REPO_SUMMARY.json)
4. **Revisar hallazgos conocidos**: [./tracking/hallazgos-y-mejoras.md](./tracking/hallazgos-y-mejoras.md)

### Preguntas Frecuentes

**¿Cómo inicio el sistema?**
→ Ver [guias/inicializacion.md](./guias/inicializacion.md)

**¿Cómo creo un nuevo módulo?**
→ Ver [instrucciones/backend/general.md](./instrucciones/backend/general.md) o [instrucciones/frontend/general.md](./instrucciones/frontend/general.md)

**¿Dónde reporto un bug?**
→ Agregar a [tracking/hallazgos-y-mejoras.md](./tracking/hallazgos-y-mejoras.md) usando [plantillas/hallazgo.md](./plantillas/hallazgo.md)

**¿Cómo exploro un módulo nuevo?**
→ Copiar [plantillas/exploracion-modulo.md](./plantillas/exploracion-modulo.md) y seguir [guias/exploracion-sistema.md](./guias/exploracion-sistema.md)

---

## 📅 Historial de Cambios

| Fecha | Cambio | Autor |
|-------|--------|-------|
| 2025-11-07 | Reorganización completa de documentación | Fabian |
| 2025-11-07 | Creación de sistema de tracking de hallazgos | Fabian |
| 2025-11-07 | Creación de plantillas reutilizables | Fabian |
| 2025-11-07 | Creación de REPO_SUMMARY.json | Fabian |

---

**¡Bienvenido al proyecto! 🚀**

Si tienes dudas, revisa el [INDICE_MAESTRO.md](./INDICE_MAESTRO.md) o consulta [tracking/hallazgos-y-mejoras.md](./tracking/hallazgos-y-mejoras.md) para ver hallazgos conocidos.

---

**Última actualización**: 2025-11-07  
**Mantenido por**: Fabian  
**Versión de documentación**: 1.0
