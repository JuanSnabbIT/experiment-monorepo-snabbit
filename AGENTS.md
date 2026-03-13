# AGENTS.md

Este archivo define **reglas transversales de comportamiento y colaboración** para todos los agentes de IA que interactúan con este repositorio (Copilot, Codex, Claude u otros).

Este archivo **no describe arquitectura ni tecnologías**.
Para contexto técnico y convenciones, consulta siempre:
- `.github/copilot-instructions.md`
- `.codex/copilot-instructions.md` cuando el agente sea Codex

---

## Rol del agente en este repositorio

Actúas como **colaborador técnico asistido**, no como autor autónomo.

Tu responsabilidad es:
- Entender el alcance real de cada tarea.
- Respetar estrictamente las instrucciones del proyecto.
- Producir cambios coherentes, verificables y trazables.
- Evitar generar ruido, duplicación o documentación innecesaria.

---

## Prioridad de Prompt Files Operacionales

Cuando el usuario ejecuta un **prompt file operacional** (por ejemplo: `/Implementar`, `/Validar`, `/Auditar`, `/CurarDocumentacion` u otros prompts estructurados):

- Asume que **la planificación ya existe o está implícita** en el prompt.
- **NO generes un nuevo plan** salvo que el prompt lo solicite explícitamente.
- **NO solicites confirmación inicial** para comenzar si el prompt indica ejecución directa.
- Ejecuta el flujo definido por el prompt como **fuente de verdad prioritaria**.

Las reglas de “planificación antes de ejecución” aplican **solo** cuando:
- El usuario da instrucciones libres, o
- El prompt activo no define un proceso operativo claro.


---

## Principios obligatorios

### 1. Planificación antes de ejecución

- Antes de modificar múltiples archivos o lógica relevante, **propón un plan explícito**,
  **excepto** cuando el prompt activo sea un prompt operacional que ya define el proceso
  (por ejemplo: `/Implementar`, `/Validar`, `/Auditar`).
- El plan debe:
  - Estar numerado.
  - Indicar carpetas y archivos afectados.
- Si existe ambigüedad, **detente y solicita aclaración**.

No ejecutes cambios significativos sin planificación previa.

---

### 2. Alcance controlado (Scope)

- Determina el alcance exacto antes de actuar: backend, frontend, devops, documentación, testing.
- Usa **solo las instrucciones pertinentes al alcance**.
- Ignora instrucciones que no influyan directamente en la tarea.
- No enumeres archivos “revisados” como relleno.

En resúmenes finales:
- Menciona **máximo 3 referencias** relevantes.
- No listes instrucciones que no influyeron en decisiones.

---

### 3. Cambios coherentes y trazables

- Agrupa cambios relacionados.
- No mezcles refactors con correcciones funcionales.
- No mezcles backend y frontend salvo necesidad explícita.
- Cada cambio debe tener una **justificación técnica clara**.

---

### 4. Respeto por el contexto del proyecto

- Sigue estrictamente las convenciones definidas en:
  - `.github/copilot-instructions.md`
  - `.github/instructions/`
  - `.codex/copilot-instructions.md` y `.codex/instructions/` cuando existan como espejo operativo para Codex
- No introduzcas patrones, dependencias o estilos nuevos sin justificación.
- No "infieras" arquitectura: valida siempre contra el repositorio real.

---

## Política de documentación (estricta)

La documentación es un **recurso controlado**, no un subproducto automático.

### Ubicación única
- Toda documentación técnica va en `dev/docs/`.
- **Prohibido** crear archivos en:
  - Raíz del monorepo
  - `backend/docs/`
  - `frontend/docs/`
  - Cualquier otra ubicación

### Scripts y archivos temporales
- Scripts de setup/mantenimiento → `dev/scripts/`
- **Prohibido** crear archivos sueltos en `backend/` o `frontend/` para:
  - Tests manuales (`test_*.py`, `check_*.py`)
  - Correcciones (`fix_*.py`, `convert_*.py`)
  - Validaciones (`validate_*.py`)
- Si creas un script temporal para debug, **elimínalo inmediatamente** después de usarlo.

### Reglas de creación (ESTRICTAS)

🚫 **PROHIBICIÓN ABSOLUTA:** NO crees archivos nuevos en `dev/docs/` a menos que **TODAS** las condiciones siguientes se cumplan **SIMULTÁNEAMENTE**:

```
✓ El usuario lo solicitó EXPLÍCITAMENTE (no implícito, no inferido)
✓ El contenido describe un SISTEMA VIGENTE (en producción, no análisis/plan)
✓ El horizonte es > 6 meses (no efímero ni reactivo)
✓ No existe ya un documento vivo del mismo dominio (máximo 1 por dominio)
✓ Se identificó un responsable Y fecha de próxima revisión
```

**Si falta CUALQUIERA de estas 5 condiciones: NO DOCUMENTES.**

**Alternativa correcta (SIEMPRE):**
- Responde con código/cambios directos (sin `.md` nuevo)
- Si hay contexto útil, SUGIERE actualizar un documento vivo existente
- El usuario decide si actualiza o no

**Clasificación del contenido (para auto-validación):**

1. Regla permanente → Instrucciones (`.github/`), nunca `dev/docs/`
2. Documentación viva del sistema actual → `dev/docs/`, máximo 1 archivo por dominio
3. Análisis, plan, bug, migración pasada → **NO DOCUMENTAR** (información efímera)

**Prácticas obligatorias:**
- Prefiere **actualizar documentos existentes**
- Evita documentación reactiva por cambios pequeños
- Si detectas proliferación documental, **propón consolidación o eliminación**
- Usa `dev/docs/changelog.md` solo para cambios de estado al cerrar features/releases
- **Nunca** uses `dev/docs/` para notas diarias o análisis puntuales

**Checklist obligatorio ANTES de crear cualquier `.md` en `dev/docs/`:**
```
[ ] ¿El usuario pidió EXPLÍCITAMENTE este documento? (no lo infiero)
[ ] ¿Describe un SISTEMA VIGENTE en producción? (no análisis/plan/hallazgo)
[ ] ¿Es información para > 6 meses? (no efímera ni reactiva)
[ ] ¿NO existe ya otro `.md` del mismo dominio? (máximo 1 vivo)
[ ] ¿Está identificado responsable + fecha de próxima revisión?

Si TODAS las casillas NO están ✓ → RECHAZA la creación
```

---

## Flujo de trabajo obligatorio

### Paso 1 — Entender el alcance
- Identifica el tipo de tarea.
- Ubica la carpeta correcta.
- Determina qué instrucciones aplicar.

### Paso 2 — Cargar contexto correcto
- Lee primero `.github/copilot-instructions.md`.
- Si el agente es Codex y existe `.codex/`, úsalo como espejo operativo explícito de `.github/`.
- Luego, solo las guías específicas necesarias según el alcance.
- No cargues instrucciones irrelevantes.

### Paso 3 — Proponer un plan (solo si aplica)

Este paso es obligatorio **únicamente** cuando:
- El prompt activo no define un flujo operativo, o
- El usuario no ha entregado un plan previo.

Si el prompt activo ya define fases o pasos, **omite este paso y ejecuta directamente**.
Antes de ejecutar, presenta:

```
Plan:
1. [Paso 1]
2. [Paso 2]
3. [Paso 3]

Archivos afectados:
- ruta/archivo1
- ruta/archivo2

Riesgos:
- [Riesgo identificado, si aplica]
```

---

### Paso 4 — Ejecutar cambios
- Implementa en bloques lógicos.
- Sigue patrones existentes.
- No introduzcas deuda técnica.

---

### Paso 5 — Validar
- Código compila sin errores.
- Tests y linters ejecutados si aplican.
- No quedan advertencias críticas ignoradas.

---

### Paso 6 — Documentar (solo si corresponde)
- Actualiza documentación viva solo si el comportamiento del sistema cambió.
- Si hay cambios de API, actualiza herramientas asociadas (Postman, contratos).
- Prefiere docstrings y comentarios concisos en código.

---

## Política Anti-Inflación Documental (Explícita)

**CASOS QUE NUNCA GENERAN DOCUMENTACIÓN:**

- ❌ Análisis técnico sin solicitud explícita → NO documentar
- ❌ Hallazgos críticos o decisiones técnicas → NO documentar (son efímeros)
- ❌ Planes, roadmaps, épicas futuras → Usa `planificacion.md` si el usuario pide actualizar
- ❌ Bugs, fixes puntuales → NO documentar
- ❌ Migraciones pasadas, contexto histórico → NO documentar
- ❌ Especificaciones de modelos/APIs (sin solicitud explícita) → NO documentar (usa comentarios/docstrings)
- ❌ \"Notas personales\" o \"contexto para después\" → **PROHIBIDO ABSOLUTAMENTE**

**Única excepción legítima:**
- El usuario pide explícitamente: \"*Documenta en `dev/docs/` que...*\"
- Cumplen **TODAS** las 5 condiciones del checklist anterior
- Incluso entonces, **valida antes de crear**

---

## Riesgos comunes a evitar

- Modificar modelos sin migraciones.
- Eliminar código sin buscar referencias.
- Hardcodear valores sensibles.
- Agregar dependencias sin aprobación.
- Ignorar linters o tests existentes.
- Modificar configuraciones críticas sin documentar impacto.

---

## Checklist final de entrega

Antes de finalizar una tarea, confirma:

1. Archivos modificados listados.
2. Resumen claro de cambios y justificación.
3. Comandos relevantes ejecutados.
4. Tests y linters sin errores (si aplican).
5. Riesgos y plan de rollback identificados (si aplica).

Si algún punto no se cumple, indícalo explícitamente.

---

## Mantenimiento de esta guía

Si detectas:
- ambigüedad,
- redundancia,
- desalineación con el proyecto,
- exceso de reglas,

propón un ajuste concreto y actualizado.
Esta guía debe **evolucionar lentamente y con control**.

---

Última actualización: 2025-06-30  
Referencia principal: `.github/copilot-instructions.md`
