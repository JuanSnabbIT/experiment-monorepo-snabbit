# Copilot Instructions – Monorepo ERP

Índice maestro de instrucciones para **agentes de IA** (Copilot, Codex, Claude u otros).
Este archivo define **cómo y qué instrucciones deben cargarse**, evitando contexto innecesario.

Este archivo **no es documentación técnica** ni manual operativo.

---

## Rol de este archivo

- Dirigir al agente hacia las instrucciones correctas según el alcance de la tarea.
- Evitar la carga automática o indiscriminada de todas las instrucciones disponibles.
- Reducir ruido, referencias innecesarias y sobrecontextualización.
- Actuar como punto de entrada único y liviano.

---

## 📚 Política Obligatoria: Archivos de Documentación Viva

**Archivos canónicos para documentación (ÚNICOS):**
```
dev/docs/
├── analisis.md              # Decisiones técnicas y hallazgos críticos
├── changelog.md             # Timeline de entregas completadas
├── flujos_operativos.md     # Procesos de negocio paso a paso
├── matching-manual.md       # Estrategia de emparejamiento para facturación
├── notas.md                 # Pautas operativas y próximos pasos (cortos)
├── orden_trabajo_ui_permissions.md  # Matriz de permisos de UI
├── planificacion.md         # Roadmap vivo de épicas activas
└── sistemas.md              # Inventario de sistemas vivos en producción
```

**⚠️ POLÍTICA CENTRALIZADA EN `AGENTS.md`**

Por favor consulta `AGENTS.md` → Sección "Reglas de creación (ESTRICTAS)" para la política completa de documentación.

Resumen:
- ✅ **Actualizar** un archivo existente si la información ya está documentada
- ❌ **PROHIBIDO** crear nuevos archivos sin solicitud explícita del usuario
- ❌ **NO dumpear** contenido al final de un archivo

**Ubicación de contenidos (referencia rápida):**

| Contenido | Archivo | ¿Crear sin solicitud? |
|-----------|---------|---|
| Decisión técnica, hallazgo crítico, análisis | `analisis.md` | ❌ NO |
| Fecha de entrega, release completada | `changelog.md` | ❌ NO |
| Procedimiento operativo: paso 1, paso 2, paso 3 | `flujos_operativos.md` | ❌ NO |
| Especificación de UI/matching de facturación | `matching-manual.md` | ❌ NO |
| Item pendiente, checklist, próxima acción corta | `notas.md` | ❌ NO |
| Matriz de permisos por estado/acción | `orden_trabajo_ui_permissions.md` | ❌ NO |
| Épica planificada, roadmap, timeline futuro | `planificacion.md` | ❌ NO (actualiza si existe) |
| Sistema en producción, patterns técnicos, módulos | `sistemas.md` | ❌ NO |

**REGLA ÚNICA:** El usuario debe pedir explícitamente "Documenta en `dev/docs/` que..." para crear un archivo nuevo.

---

## Estructura del Monorepo (Real)

```
monorepo_erp/
├── .github/                     # Instrucciones para agentes AI
│   ├── copilot-instructions.md  # Este archivo (índice maestro)
│   └── instructions/            # Guías específicas por tecnología
├── backend/                     # Django 5.1 + DRF + Celery
│   ├── sw_erp/                  # Proyecto raíz (settings, celery, asgi)
│   ├── <apps>/                  # Apps por dominio de negocio
│   ├── ENV/                     # Entorno virtual (no versionado)
│   └── db.sqlite3               # BD local (desarrollo)
├── frontend/                    # React 18 + TypeScript + Redux + Vite
│   ├── src/                     # Código fuente
│   └── node_modules/            # Dependencias (no versionadas)
├── dev/                         # Recursos de desarrollo
│   ├── docs/                    # Documentación técnica viva
│   └── scripts/                 # Scripts de setup y mantenimiento
├── postman/                     # Colecciones Postman
├── AGENTS.md                    # Guía operativa para agentes AI
└── README.md                    # Setup rápido
```

---

## Estructura de Instrucciones

### Fundacionales
- `AGENTS.md` — Reglas transversales de comportamiento, planificación y checklist final.

### Arquitectura
- `instructions/architecture.md` — Arquitectura del sistema, stack y estructura.

### Backend
- `instructions/backend-guide.md` — Convenciones Django: modelos, serializers, views, tasks.

### Frontend
- `instructions/frontend-guide.md` — Convenciones React, Redux y estructura de componentes.
- `instructions/typescript.instructions.md` — Estándares TypeScript.

### Seguridad y Testing
- `instructions/security.md` — Autenticación, autorización, validaciones.
- `instructions/testing.md` — Estrategia de testing, frameworks y cobertura.

### Deployment
- `instructions/deployment.md` — Docker, CI/CD y variables de entorno.

### Referencias
- `instructions/glossary.md` — Términos, abreviaturas y contexto del dominio.

---

## 🚫 Políticas Estrictas de Limpieza

### Documentación
- **Ubicación única:** Toda documentación va en `dev/docs/`, nunca en raíz ni en `backend/docs/` o `frontend/docs/`.
- **Máximo 1 documento vivo por dominio**; actualiza el existente en lugar de crear otro.
- Cualquier archivo nuevo requiere responsable y fecha de próxima revisión.
- Usa `dev/docs/changelog.md` solo al cerrar features/releases, no para notas diarias.

### Scripts y Archivos Temporales
- **Scripts de setup/mantenimiento:** Solo en `dev/scripts/`.
- **Prohibido** crear archivos `.py`, `.js`, `.ts` sueltos en `backend/` o `frontend/` para pruebas o diagnósticos.
- Si creas un script temporal para debug, **elimínalo inmediatamente** después de usarlo.
- No dejar archivos huérfanos: `test_*.py`, `check_*.py`, `fix_*.py`, `validate_*.py`.

### Archivos a Limpiar del Backend (Conocidos)
Los siguientes archivos residuales **deben eliminarse** o moverse a ubicaciones apropiadas:
- `backend/nombre_prueba` — Archivo sin extensión (eliminar)
- `backend/*.xlsx` — Archivos Excel de importación (mover a `dev/scripts/data/` o eliminar)
- `backend/Pruebas_*.ipynb` — Notebooks fuera de `jupyter_notebooks/` (mover o eliminar)
- `backend/Reportlab_*.ipynb` — Notebooks fuera de `jupyter_notebooks/` (mover o eliminar)
- `backend/pdf_*.pdf` — PDFs de prueba (eliminar)

**Regla:** Los notebooks de desarrollo van en `backend/jupyter_notebooks/`, no en raíz de backend.

### Encoding
- **Todos los archivos** deben ser UTF-8 (sin BOM).
- Antes de crear archivos nuevos, verifica que tu editor guarde en UTF-8.
- Caracteres especiales (ó, ñ, á, etc.) deben verse correctamente, no como `├│` o `├▒`.

---

## Política de Alcance (Context Routing)

Antes de responder o ejecutar cualquier acción, el agente **debe determinar el alcance exacto**.

Carga **únicamente** las instrucciones necesarias según el tipo de tarea:

### Backend
- `AGENTS.md`
- `instructions/backend-guide.md`

### Frontend
- `AGENTS.md`
- `instructions/frontend-guide.md`
- `instructions/typescript.instructions.md`

### DevOps / Deployment
- `AGENTS.md`
- `instructions/deployment.md`

### Seguridad / Autenticación
- `AGENTS.md`
- `instructions/security.md`

### Testing
- `AGENTS.md`
- `instructions/testing.md`

### Documentación
- `AGENTS.md`
- `instructions/architecture.md` o `instructions/glossary.md` (según corresponda)

Reglas estrictas:
- No cargues instrucciones fuera del scope.
- No enumeres archivos que no influyeron en la decisión.
- En resúmenes finales, menciona **máximo 3 referencias** relevantes.
- Si el IDE cargó otras instrucciones automáticamente, ignóralas salvo necesidad explícita.

---

## 🚫 Política Anti-Inflación Documental

- Los agentes **solo** generan documentación si el usuario lo pide explícitamente **y** el contenido describe un sistema vivo en producción.
- **Prohibido** crear análisis puntuales, planes, resúmenes de tareas o “documentación por si acaso”.
- Si hay duda, **no documentes** y entrega únicamente el código/cambio solicitado.

---

## Ejecución del entorno

La ejecución del sistema se realiza mediante **VS Code Tasks** definidas en `.vscode/tasks.json`.

- No ejecutes comandos manuales salvo que la tarea lo requiera.
- No dupliques comandos en este archivo.

---

## Errores comunes a evitar

Estas reglas aplican **solo cuando el alcance lo requiere**.

- No modificar modelos sin migraciones.
- No hardcodear valores sensibles; usar variables de entorno.
- No agregar dependencias sin justificación y actualización de archivos correspondientes.
- No usar `any` en TypeScript.
- No mezclar cambios de frontend y backend sin justificación.
- No ignorar linters ni tests cuando apliquen.
- No modificar configuraciones críticas sin documentar el impacto.

### Backend específicos
- **SIEMPRE** filtrar `get_queryset()` por `PersonalizacionUsuario` → empresa/sucursal.
- **NO retornar** `objects.all()` sin filtrar por empresa (riesgo de data leak).
- **Lógica pesada** va en `functions.py`, no en views ni serializers.
- **@action url_path** en kebab-case: `cerrar-orden`, no `cerrar_orden`.
- **Errores** retornar con key `detail`: `{'detail': 'mensaje'}`.
- **PDFs** generar en `functions.py` con ReportLab, no en views.
- **Transacciones** usar `transaction.atomic()` para operaciones multi-modelo.
- **Imports** ordenar: Django core → Third-party → Local apps.

**Checklist de validación backend:**
- [ ] get_queryset() filtra por PersonalizacionUsuario → empresa/sucursal
- [ ] Lógica compleja movida a functions.py (< 50 líneas por método en views)
- [ ] @action url_path usa kebab-case
- [ ] Errores retornan `{detail: "..."}`
- [ ] transaction.atomic() usado en operaciones multi-modelo
- [ ] Imports ordenados correctamente

Ver detalles en: `instructions/backend-guide.md` > Convenciones Implícitas

### Frontend específicos
- **NO crear** `{Modulo}Service.ts` en `services/`; usar `ApiService` directamente.
- **Usar** `confirmAlert` (SweetAlert2) para confirmaciones/eliminaciones, nunca `window.confirm`.
- **Usar** `toast` (React-Toastify) solo para feedback post-acción, no para pedir confirmación.
- **Usar** `ModalEliminar` para eliminaciones estándar.
- **Seguir** estructura de módulos: `components/`, `modals/`, vistas principales.

Ver detalles en: `instructions/frontend-guide.md`

---

## Convenciones transversales

### Idioma
- Backend: español
- Frontend: inglés
- Documentación: español (funcional) / inglés (técnico)

### Naming
- Backend: snake_case
- Frontend: camelCase / PascalCase
- Constantes y enums: UPPER_SNAKE_CASE

### Commits
Formato esperado:
<tipo>(<scope>): descripción breve en imperativo

yaml
Copiar código

Tipos comunes:
- feat
- fix
- refactor
- docs
- chore

---

## Mantenimiento de estas instrucciones

Si detectas:
- instrucciones desactualizadas
- duplicación innecesaria
- sobrecarga de documentación
- falta de claridad en el routing

Debes:
1. Documentar el problema.
2. Proponer un ajuste concreto.
3. Actualizar este archivo o las instrucciones afectadas.

---

Última actualización: 2026-01-01 