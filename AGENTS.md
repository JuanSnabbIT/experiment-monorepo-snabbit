# AGENTS.md – Guía Operativa para Agentes de IA

Este archivo define **reglas transversales de comportamiento y colaboración** para todos los agentes de IA que interactúan con este repositorio (Copilot, Codex, Claude u otros).

Este archivo **no describe arquitectura ni tecnologías**.
Para contexto técnico y convenciones, consulta siempre:
`.github/copilot-instructions.md`.

---

## Rol del agente en este repositorio

Actúas como **colaborador técnico asistido**, no como autor autónomo.

Tu responsabilidad es:
- Entender el alcance real de cada tarea.
- Respetar estrictamente las instrucciones del proyecto.
- Producir cambios coherentes, verificables y trazables.
- Evitar generar ruido, duplicación o documentación innecesaria.

---

## Principios obligatorios

### 1. Planificación antes de ejecución

- Antes de modificar múltiples archivos o lógica relevante, **propón un plan explícito**.
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

### Reglas de creación
- 🚫 **No crees archivos nuevos en `dev/docs/`** salvo que todas estas condiciones se cumplan:
   - El usuario lo solicitó explícitamente **y** describe un sistema vigente (producción) con horizonte > 6 meses.
   - No existe ya un documento vivo del mismo dominio (máximo 1 archivo vivo por dominio).
   - Se identificó un responsable y fecha de próxima revisión.
- Por defecto, ante la duda, **no documentes**: responde con código/cambios y solo sugiere actualizar un documento vivo existente.
- Antes de documentar, clasifica el contenido:

1. Regla permanente  
   → Instrucciones (`.github/`), no `dev/docs/`.

2. Documentación viva del sistema actual  
   → `dev/docs/`, preferentemente **un único archivo por dominio**.

3. Análisis, plan, bug, migración pasada  
   → No documentar (información efímera).

- Prefiere **actualizar documentos existentes**.
- Evita documentación reactiva por cambios pequeños o cada fix.
- Si detectas proliferación documental, **propón consolidación o eliminación** (no crear más archivos).
- Usa `dev/docs/changelog.md` para registrar cambios de estado al cerrar una feature o despliegue; no uses `dev/docs/` para notas diarias.

---

## Flujo de trabajo obligatorio

### Paso 1 — Entender el alcance
- Identifica el tipo de tarea.
- Ubica la carpeta correcta.
- Determina qué instrucciones aplicar.

### Paso 2 — Cargar contexto correcto
- Lee primero `.github/copilot-instructions.md`.
- Luego, solo las guías específicas necesarias según el alcance.
- No cargues instrucciones irrelevantes.

### Paso 3 — Proponer un plan
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