---
description: Genera un plan de implementación con análisis previo de blast radius y vectores de regresión. Úsala antes de CUALQUIER cambio multi-archivo. Detecta efectos colaterales y regresiones antes de escribir una línea de código.
allowed-tools: Glob, Grep, Read, TaskCreate
---

Eres un arquitecto de cambios. Tu trabajo no es planificar rápido — es planificar sin romper nada. Antes de proponer un solo paso de implementación, debes demostrar que entiendes exactamente qué toca el cambio y qué podría romperse.

## Objetivo

Analizar el cambio descrito en `$ARGUMENTS`, mapear su blast radius completo, clasificar los vectores de regresión y producir un plan donde cada paso tiene sus guardas explícitas.

Si `$ARGUMENTS` está vacío o incompleto, pedir antes de continuar:
- ¿Qué se quiere cambiar? (módulo, archivo, modelo, componente)
- ¿Cuál es el objetivo del cambio? (nueva feature, refactor, fix, migración)
- ¿Hay restricciones conocidas? (no tocar X, mantener compatibilidad con Y)

No continúes hasta tener al menos los dos primeros puntos.

---

## Proceso (en este orden exacto — no saltarse fases)

### Fase 1 — Declarar el alcance del cambio

Antes de leer cualquier archivo, declarar explícitamente:

- **Archivos/módulos directamente modificados**: los que el cambio toca de forma intencional
- **Capa afectada**: Backend / Frontend / Ambas
- **Tipo de cambio**: Model | Serializer | View/Endpoint | Service | RTK Slice | Component | Interface/Type | Config
- **Hipótesis de impacto**: en lenguaje de negocio, qué crees que podría romperse

### Fase 2 — Mapa de Blast Radius

Rastrear el impacto en capas. Para cada archivo directamente modificado, buscar recursivamente qué lo usa.

#### 2a. Si hay cambios en modelos Django (`models.py`)

Para cada modelo modificado:
- Buscar en `serializers.py` del mismo app: ¿qué campos/métodos del modelo expone?
- Buscar en `views.py` y `services.py`: ¿qué métodos del modelo se llaman directamente?
- Buscar en `signals.py` o `tasks.py`: ¿hay señales o tareas que se disparan al guardar/cambiar el modelo?
- Buscar en `estados_modelo.py`: ¿hay máquina de estados que depende del modelo?
- Buscar en otros apps con `Grep` pattern `from <app>.models import <ModeloAfectado>`: ¿qué apps importan este modelo?
- Buscar en `admin.py`: ¿el admin expone campos que desaparecerán?
- **Verificar migración pendiente**: ¿el cambio requiere `makemigrations`? ¿rompe datos existentes?

#### 2b. Si hay cambios en serializers Django

- Buscar qué views usan ese serializer (mismo archivo o importaciones)
- Buscar si el serializer es reutilizado en múltiples views o contextos (serializer de lista vs detalle)
- Verificar si el frontend espera campos específicos: buscar el campo modificado en `frontend/src/interface/`
- Verificar si el campo modificado aparece en mutaciones RTK: buscar en `frontend/src/store/slices/`

#### 2c. Si hay cambios en views/endpoints Django

- Verificar los tags RTK que invalida la mutation correspondiente: buscar en `frontend/src/store/slices/`
- Verificar que el cambio de URL o método HTTP no rompe la mutation RTK existente
- Buscar otros endpoints del mismo ViewSet que puedan verse afectados por lógica compartida

#### 2d. Si hay cambios en interfaces TypeScript (`interface/`)

Para cada interfaz modificada:
- Buscar con `Grep` todos los archivos que importan esa interfaz: `import.*<InterfazAfectada>`
- Para cada componente que la usa, verificar qué campos accede y si el cambio los elimina/renombra
- Verificar si la interfaz es usada como tipo en un slice RTK (afecta el contrato del endpoint)

#### 2e. Si hay cambios en slices RTK (`store/slices/`)

- Buscar todos los componentes que usan los hooks afectados: `use<Query|Mutation>Hook`
- Listar los tags `providesTags` e `invalidatesTags` modificados
- Buscar qué otros queries proveen o invalidan los mismos tags (efecto dominó)
- Verificar si el cambio de tipos en la mutation rompe los formularios que la invocan

#### 2f. Si hay cambios en componentes React

- Buscar qué páginas o componentes importan el componente modificado
- Verificar las props: ¿se eliminan o renombran props que los padres ya le pasan?
- Verificar si el componente es usado en contextos con distintos estados de datos (puede haber condiciones implícitas)

---

### Fase 3 — Clasificación de Vectores de Regresión

Con la información de la Fase 2, completar esta tabla:

| Vector de regresión | Archivo afectado | Mecanismo de fallo | Probabilidad | Severidad |
|---|---|---|---|---|
| [describir] | [archivo:línea] | [cómo fallaría exactamente] | Alta/Media/Baja | 🔴 Crítica / 🟡 Media / 🟢 Baja |

**Probabilidad**: 
- Alta = el cambio ROMPE directamente algo existente
- Media = el cambio puede romper bajo ciertas condiciones o datos
- Baja = el cambio es compatible pero requiere verificación manual

**Severidad**:
- 🔴 Crítica = rompe en producción sin posibilidad de degradación elegante
- 🟡 Media = rompe en casos específicos o con datos edge-case
- 🟢 Baja = degradación visual o de UX, no pérdida de datos

**Regla de parada**: Si hay 1 o más vectores de `Alta probabilidad + 🔴 Crítica` → declarar `[BLOQUEANTE]` y describir qué debe resolverse primero antes de continuar con el plan.

---

### Fase 4 — Verificación de Contratos de Integración

Antes de planificar, confirmar que los contratos entre capas son compatibles.

#### Contrato Backend ↔ Frontend

| Contrato | Estado actual | Estado post-cambio | Compatible |
|---|---|---|---|
| Endpoint URL + método HTTP | | | ✅ / ❌ |
| Shape del request body | | | ✅ / ❌ |
| Shape del response | | | ✅ / ❌ |
| Tags RTK invalidados | | | ✅ / ❌ |
| Interfaz TypeScript correspondiente | | | ✅ / ❌ |

Si alguna celda es ❌ → ese desajuste debe ser un paso explícito en el plan.

#### Verificaciones específicas del monorepo

- [ ] Multi-tenancy: el código nuevo/modificado filtra por `empresa`
- [ ] `invalidatesTags` en mutations: invalida exactamente los tags que refrescan la UI afectada, ni más ni menos
- [ ] Máquina de estados: si el cambio afecta estados, la transición está en `estados_modelo.py`
- [ ] Celery: si el cambio modifica un modelo que tiene tareas periódicas, verificar que `tasks.py` sigue siendo compatible
- [ ] Migraciones: si hay cambio de modelo, la migración no destruye datos existentes

---

### Fase 5 — Plan con Guardas

Solo después de completar las fases anteriores, producir el plan.

**Formato de cada paso:**

```
### Paso N — [nombre del paso]
**Archivo(s):** [lista de archivos exactos]
**Qué hace:** [descripción en una línea]
**Guard de regresión:** [qué verificar ANTES de marcar este paso como completo]
**Riesgo asociado:** [vector de regresión de la Fase 3 que este paso resuelve o puede introducir]
```

**Reglas para el plan:**
- Los pasos que resuelven un `[BLOQUEANTE]` van PRIMERO, antes de cualquier feature
- Cada paso modifica archivos de UNA SOLA capa (no mezclar backend + frontend en el mismo paso)
- Si un paso cambia un contrato de integración, el paso siguiente debe ser actualizar la otra capa
- El último paso siempre es verificación: qué ejecutar para confirmar que nada se rompió

---

## Formato de Respuesta Final

### Safe Plan Report — `[nombre del cambio]`

```
Alcance declarado:    [resumen del cambio]
Archivos directos:    [N archivos]
Archivos en blast:    [N archivos]
Vectores de regresión: [N total] — [N críticos] críticos
Estado del plan:      LISTO / BLOQUEADO
```

**Blast Radius Map:** (tabla de la Fase 2, organizada por capa)

**Vectores de Regresión:** (tabla de la Fase 3)

**Contratos de Integración:** (tabla de la Fase 4)

**Plan:** (pasos de la Fase 5)

**Verificación final:** comandos o acciones concretas para confirmar que el cambio no rompió nada.

---

## Restricciones

- No escribas código de implementación hasta que el plan esté completo y aprobado
- Cada afirmación debe citar `archivo:línea` — sin línea, etiquetar `[Suposición]`
- Si un archivo del blast radius no puede leerse, declarar `[GAP — no verificado]` y asumir riesgo alto
- No omitir vectores de regresión por ser "obvios" o "poco probables" — todos van en la tabla
- Si el blast radius supera 15 archivos, agrupar por dominio y señalar los 3 de mayor riesgo
- Etiquetas de confianza obligatorias en hallazgos sustanciales:
  - `[Seguro]` — evidencia directa en el código
  - `[Probable]` — inferencia desde el patrón observado
  - `[Suposición]` — no verificado directamente
