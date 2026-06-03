# 🎯 AUDITORÍA NIELSEN HEURISTICS: RRHH Contratos Laborales

**Análisis:** Aplicación de 10 heurísticas de usabilidad de Nielsen  
**Sistema:** Módulo RRHH - Gestión de contratos laborales  
**Fecha:** 2026-06-03

---

## 📋 RESUMEN EJECUTIVO

```
Puntuación Nielsen: 5.8/10 (REGULAR)
├─ Heurísticas cumplidas: 4/10 (40%)
├─ Heurísticas parciales: 4/10 (40%)
└─ Heurísticas no cumplidas: 2/10 (20%)

UX Severity: MEDIA-ALTA
├─ Crítica (riesgo pérdida datos): 2
├─ Alta (sin confirmaciones): 3
└─ Media (validación duplicada): 3
```

---

## 1️⃣ VISIBILIDAD DEL ESTADO DEL SISTEMA

### Heurística
> El sistema debe mantener a los usuarios informados en tiempo real sobre qué está pasando (feedback visible, preciso, oportuno)

### Estado Actual: ⚠️ PARCIAL (5/10)

```
✅ LO QUE FUNCIONA:
├─ Toast notifications (success/error) en todas las mutaciones
├─ Loading spinners en botones durante POST/PATCH
├─ Badges de estado en lista (vigente/borrador/pendiente)
└─ Timeline de historial en detalle (qué cambió, cuándo, quién)

❌ LO QUE FALTA:
├─ Spinner en navegación entre pasos del wizard (sin visual)
├─ Indicador de progreso: "Paso 3/7" sin barra visual
├─ Sin confirmación pre-acción crítica (generar contrato)
├─ Toast genérico en error: "Error al actualizar" (no dice QUÉ falló)
├─ AutoSave silencioso: usuario no sabe si datos se guardaron
└─ Estado de EnvioAprobacionEmpleador: mostrado en sidebar pero no actualiza en tiempo real
```

### Problema Crítico

```tsx
// Paso 6 → Paso 7: ¿Se guardó? ¿Se perdió?
// Usuario no tiene visibilidad si datos en memoria se sincronizaron con BD

const handleNextStep = () => {
    setCurrentStep(7);  // ← Visual change
    // Pero datos en Formik no se sincronizaron a BD
    // Sin PATCH endpoint, usuario cree que está guardado
};
```

### Recomendación

```
Implementar:
1. Barra de progreso: "Paso 3/7 - Términos Laborales" (visual clara)
2. AutoSave con indicador: "🔄 Guardando..." → "✓ Guardado" (en barra inferior)
3. Error granular: "Error al sincronizar AFP (intenta de nuevo)" no "Error"
4. Real-time subscription a EnvioAprobacionEmpleador (WebSocket o polling cada 10s)
5. Modal de confirmación antes de generar (último "¿Estás seguro?")
```

**Score Recomendado:** 7/10 (con cambios)

---

## 2️⃣ CORRESPONDENCIA ENTRE SISTEMA Y MUNDO REAL

### Heurística
> El sistema debe hablar el idioma del usuario, usando palabras, frases y conceptos familiares (no jerga técnica)

### Estado Actual: ✅ BUENO (7/10)

```
✅ LO QUE FUNCIONA:
├─ "Contrato laboral" no "Contract" ✓
├─ "Cargo" no "job_title" ✓
├─ "Sueldo base" no "base_compensation" ✓
├─ "Términos laborales" lenguaje legal chileno ✓
├─ Estados: "Vigente", "Borrador", "Pendiente aprobación" (entienden usuarios) ✓
├─ Campo: "Motivo de término" (renuncia, mutuo acuerdo, etc.) - lenguaje laboral ✓
└─ "Anexo" conocido en contexto legal ✓

❌ LO QUE FALTA:
├─ "EnvioAprobacionEmpleador" internamente; UI muestra "Aprobación pendiente" (confuso)
├─ "Datos trabajador nuevo": término técnico, debería ser "Trabajador pendiente de activación"
├─ "Sucursal" no explicitado para usuario (usa empresa_id internamente)
└─ Error "UsuarioEmpresa no pertenece a tu alcance" → usuario: "¿Qué es UsuarioEmpresa?"
```

### Problema

```python
# Backend retorna
{"detail": "UsuarioEmpresa no encontrado o fuera de tu alcance"}

# Usuario RRHH piensa
"¿Qué es UsuarioEmpresa? ¿Hablamos del mismo trabajador?"
```

### Recomendación

```
Cambiar mensajes de error:
- "UsuarioEmpresa no encontrado" → "El trabajador no pertenece a tu empresa"
- "datos_trabajador_nuevo" (JSON field) → "Trabajador pendiente de activación"
- "sucursal_id" en validación → "Sucursal seleccionada no es válida"
- Explicar en tooltips qué significa cada campo (Fonasa, Isapre, etc.)
```

**Score Recomendado:** 8/10 (con cambios de mensajes)

---

## 3️⃣ CONTROL Y LIBERTAD DEL USUARIO

### Heurística
> Los usuarios deben poder deshacer/rehacer acciones; salir de flujos sin penalización

### Estado Actual: ❌ MALO (4/10)

```
✅ LO QUE FUNCIONA:
├─ Botón "Cancelar" en wizard (cierra modal)
└─ Contrato en borrador: se puede editar/eliminar

❌ LO QUE FALTA (CRÍTICO):
├─ SI usuario está en paso 5/7 y cierra modal → PIERDE TODOS LOS DATOS
│  └─ No hay "Guardar como borrador" intermedio
│  └─ No hay local storage backup
│
├─ Cambio de estado (vigente → terminado) es IRREVERSIBLE
│  └─ Sin confirmación final después del modal inicial
│  └─ Sin opción "Deshacer" (aunque sea 10 segundos)
│
├─ Envío a aprobación es PARCIALMENTE reversible
│  └─ Puede editar en borrador nuevamente
│  └─ Pero no hay botón "Retirar del envío" claro
│
├─ Historial es READ-ONLY
│  └─ No puedes ver "quién cambió qué" en borrador (no tracked)
│
└─ Acciones destructivas sin doble confirmación
   ├─ Generar contrato: clic accidental = contrato generado
   ├─ Enviar aprobación: clic accidental = email enviado al empleador
   └─ Cambiar a terminado: clic accidental = contrato cerrado
```

### Problema Crítico

```tsx
// Paso 6/7: Usuario rellena datos de previsión
const [formValues, setFormValues] = useState({...})  // En Formik

// Usuario accidental: cierra modal
// ¿Qué pasa? Todos esos datos se pierden (no fueron a BD)
// No hay botón "Guardar como borrador"

// Consecuencia: Usuario tiene que volver a rellenar TODO

handleModalClose = () => {
    // ❌ NO GUARDA automáticamente
    setIsOpen(false);
}
```

### Recomendación

```
1. AutoSave en cada paso (PATCH /api/rrhh/contratos/{id}/)
   └─ Debounced a 1 segundo después de último cambio
   └─ Con indicador visual "🔄 Guardando..." → "✓ Guardado"

2. Confirmación 2-paso para acciones irreversibles:
   └─ Modal 1: "¿Enviar contrato a gerente@empresa.com?"
   └─ Modal 2 (después de revisar): "¿Confirmas el envío?" (SÍ/NO)
   └─ Botón "Cancelar y volver a borrador" en pendiente_aprobacion

3. Historial de cambios en BORRADOR (no actual)
   └─ Usar JSON field para tracking de versiones
   └─ Mostrar "Historial de cambios en borrador"

4. Undo/Redo en wizard (10 segundos después de mutación)
   └─ Toast: "Contrato creado" [DESHACER]
   └─ Si clic en DESHACER: DELETE /api/rrhh/contratos/{id}/

5. Retirar de aprobación
   └─ Si estado pendiente_aprobacion:
      └─ Botón "Retirar solicitud" (vuelve a borrador + anula envío)
```

**Score Recomendado:** 8/10 (con AutoSave + confirmaciones 2-paso)

---

## 4️⃣ CONSISTENCIA Y ESTÁNDARES

### Heurística
> El sistema debe seguir convenciones y estándares de la plataforma; usuarios no deben preguntarse si palabras/acciones significan lo mismo

### Estado Actual: ⚠️ PARCIAL (6/10)

```
✅ LO QUE FUNCIONA:
├─ Botón azul = acción positiva (Crear, Guardar, Aceptar)
├─ Botón rojo = acción negativa (Anular, Rechazar, Eliminar)
├─ Colores de badge: verde=vigente, amarillo=pendiente, gris=borrador
├─ Modal pattern consistente (header + body + footer)
├─ Toast pattern: success (verde), error (rojo), warning (naranja)
├─ Tabs consistentes en DetalleContratoTrabajador
└─ Iconografía clara: PDF (descarga), edit (lápiz), trash (eliminar)

❌ LO QUE FALTA:
├─ En wizard: "Siguiente" vs "Avanzar" vs "Continuar" (inconsistencia léxica)
├─ En modal de aprobación: email en input + botón en footer (confusión de flujo)
├─ Estados de contrato:
│  ├─ Backend: "pendiente_aprobacion" (snake_case)
│  ├─ Frontend: "Pendiente aprobación" (space)
│  └─ Historial: "Cambio de estado a pendiente_aprobacion" (técnico)
│
├─ Breadcrumbs en Detalle: "/RRHH/Contratos/ID" pero Wizard no tiene breadcrumbs
├─ Validación feedback:
│  ├─ En wizard: inline errors bajo input
│  ├─ En Detalle: inline errors pero sin color rojo consistente
│  └─ En formularios: a veces error message en tooltip (inconsistente)
│
├─ Loading state:
│  ├─ En buttons: spinner (correcto)
│  ├─ En list: skeleton (correcto)
│  └─ En wizard: NADA (usuario no sabe si se está validando)
│
├─ Confirmación de eliminación:
│  ├─ Descartar: sin modal de confirmación
│  ├─ Anular: con modal (inconsistencia)
│  └─ Terminar: sin modal (inconsistencia)
│
└─ Fechas:
   ├─ En formulario: DD/MM/YYYY (text input)
   ├─ En mostrador: "02 de junio de 2025" (texto)
   ├─ En historial: "2025-06-02 14:30" (ISO)
   └─ Inconsistencia de formato
```

### Problema

```tsx
// Inconsistencia 1: Estados
const ESTADO_OPTIONS = [
    { value: 'vigente', label: 'Vigente' },
    { value: 'borrador', label: 'Borrador' },
    { value: 'pendiente_aprobacion', label: 'Pendiente aprobación' }  // ← Aquí space
];

// Inconsistencia 2: Labels de botones
<Button>Siguiente</Button>  // En Paso 1
<Button>Continuar</Button>  // En Paso 3
<Button>Avanzar</Button>    // En Paso 5

// Inconsistencia 3: Validaciones
// Paso 1: erro inline rojo
// Paso 5: error en tooltip hover
```

### Recomendación

```
1. Crear "Component Library Guidelines" (design system interno)
   ├─ Estados: único formato, único display
   ├─ Botones: único léxico ("Siguiente" solo, no "Continuar"/"Avanzar")
   ├─ Validaciones: siempre inline rojo + icon
   ├─ Fechas: siempre DD/MM/YYYY en entrada, "2 de junio 2025" en display
   └─ Modales de confirmación: siempre 2-botones (Sí/Cancelar)

2. Aplicar consistencia a RRHH:
   ├─ Reemplazar "Continuar" con "Siguiente"
   ├─ Usar DATE picker (html5) no text input para fechas
   ├─ Agregar confirmación modal para: Descartar, Terminar, Anular
   ├─ Standardizar error messages (no mezclar técnico con user-friendly)
   └─ Timestamp historial: siempre ISO pero display como "hace 2 horas"
```

**Score Recomendado:** 8/10 (con design system)

---

## 5️⃣ PREVENCIÓN DE ERRORES

### Heurística
> Mejor prevenir el error que mostrar un buen mensaje de error; anticipar problemas

### Estado Actual: ❌ MALO (3/10)

```
✅ LO QUE FUNCIONA:
├─ Validación frontend: Yup schema previene envío con datos incompletos
├─ Validación backend: serializers descartan payloads inválidos
├─ Máquina de estados: no permite transiciones imposibles (backend)
└─ Email validation: regex en frontend antes de enviar al empleador

❌ LO QUE FALTA (CRÍTICO):
├─ SIN AutoSave → posible pérdida de datos
├─ SIN prevención de clic doble:
│  ├─ Usuario hace clic "Generar PDF" 2x rápido
│  ├─ Resultado: 2 PDFs generados, confusión
│  ├─ No hay button disabled durante POST
│  └─ Podría causar: creación duplicada de contratos
│
├─ SIN validación de estado en frontend (solo backend):
│  ├─ Usuario A accede a contrato
│  ├─ Usuario B lo cambia a vigente
│  ├─ Usuario A sigue editando en UI stale
│  ├─ Clic "Guardar" → error 400 (estado cambió)
│  └─ Mejor: polling cada 5s para estado fresco
│
├─ SIN prevención de navegar sin guardar:
│  ├─ Usuario en paso 4/7, rellena datos
│  ├─ Sin clic "Siguiente", cierra modal
│  ├─ Datos perdidos SIN advertencia
│  └─ Debería: "¿Salir sin guardar? Perderás cambios"
│
├─ SIN validación de email antes de envío a empleador:
│  ├─ Usuario escribe "jefe@empresa.co" (typo .co vs .com)
│  ├─ Email invalid pero formulario acepta
│  ├─ Empleador nunca recibe contrato
│  └─ Deberá: validar MX record o al menos regex + sugerencias
│
├─ SIN prevención de cambios concurrentes:
│  ├─ Usuario A intenta cambiar a vigente mientras Usuario B genera PDF
│  ├─ Race condition: ¿quién gana?
│  ├─ No hay optimistic locking o versionado
│  └─ Debería: agregar version_id a contrato, 409 Conflict si stale
│
└─ SIN confirmación si usuario cierra modal durante carga:
   ├─ Usuario hace clic "Generar contrato"
   ├─ Loading spinner aparece
   ├─ Usuario (impaciente) cierra modal
   ├─ Backend sigue procesando → crea de todas formas
   └─ Resultado: contrato huérfano
```

### Problema Crítico

```python
# views.py línea 618 - Clic doble problema
@action(detail=True, methods=["post"], url_path="generar-pdf")
def generar_pdf(self, request, pk=None):
    # ❌ NO hay idempotencia
    # Si usuario hace clic 2x rápido:
    # - Primer clic: genera PDF
    # - Segundo clic: genera OTRO PDF
    # - Contrato.archivo_pdf ahora apunta al 2do
    # Solución: Agregar IF archivo_pdf EXISTS
    
    contrato = self.get_object()
    try:
        _generar_pdf(contrato, persistir=True)  # Sin idempotencia
    except PlantillaNoDisponibleError as exc:
        return Response({"detail": str(exc)}, status=400)
    return Response(ContratoTrabajadorSerializer(contrato).data)
```

### Recomendación

```
1. Prevención de clic doble:
   ├─ Button.disabled = isLoading durante POST/PATCH
   └─ O: Idempotency key (UUID temporal para deduplicación)

2. AutoSave = prevención natural de pérdida:
   ├─ Guardar automáticamente cada 1 segundo (debounced)
   └─ Usuario nunca pierde datos aunque cierre modal

3. Validación concurrente:
   ├─ Agregar version_id a ContratoTrabajador
   ├─ En updates: validar version_id no cambió
   └─ Si cambió: 409 Conflict + "Contrato fue modificado por otro usuario"

4. Confirmación pre-navegación:
   ├─ En wizard: window.onbeforeunload si hay cambios sin guardar
   └─ Modal: "¿Salir? Los cambios se guardarán como borrador"

5. Validación de email mejorada:
   ├─ Usar regex + MX record check (backend) antes de enviar
   ├─ Tooltip en input: mostrar dominios similares si hay typo
   └─ "¿Quisiste decir empresa.com?" (autocorrect)

6. Idempotencia en generar_pdf:
   ├─ Check: if contrato.archivo_pdf exists: return existing
   └─ O: Check hash de PDF anterior vs plantilla actual
```

**Score Recomendado:** 7/10 (con AutoSave + validaciones preventivas)

---

## 6️⃣ RECONOCIMIENTO vs RECORDACIÓN

### Heurística
> Minimizar carga cognitiva del usuario; usar reconocimiento visual antes que pedir recordación

### Estado Actual: ⚠️ PARCIAL (6/10)

```
✅ LO QUE FUNCIONA:
├─ Autocomplete en "Cargo" (busca en CargoCatalogo, no requiere recordar nombres)
├─ Dropdown para AFP, Banco, Sistema de salud (reconocimiento, no escritura)
├─ Date picker (calendario visual, no escribir "02/06/2025")
├─ Checkboxes para días de semana (visual, no recordar "LMXJV")
├─ Historial timeline (visual, scroll para ver qué pasó)
├─ Breadcrumbs en detalle (dónde estoy)
├─ Badges de estado (color + texto, no solo código)
└─ Resumen en paso 7 (antes de crear, recordatorio de datos)

❌ LO QUE FALTA:
├─ SIN sugerencias mientras usuario está escribiendo:
│  ├─ Campo "Email" en modo nuevo: sin autocomplete de dominios (empresa.com)
│  └─ Campo "Funciones": sin sugerencias de funciones comunes (por cargo)
│
├─ SIN visualización de cambios antes de confirmación:
│  ├─ Modal "Enviar a aprobación": ingresa email pero NO muestra resumen contrato
│  ├─ Usuario debe cerrar modal, volver a paso 7, revisar, volver a modal
│  └─ Debería: mostrar mini-preview en modal
│
├─ SIN información sobre estado actual del flujo:
│  ├─ Detalle contrato: Estados posibles (vigente → terminado/anulado)
│  ├─ No hay botones "Cambiar a..." claramente disponibles
│  ├─ Usuario debe recordar transiciones de estados_modelo.py
│  └─ Debería: mostrar botones contextuales solo para transiciones válidas
│
├─ SIN información sobre permisos:
│  ├─ Usuario abre contrato terminado
│  ├─ ¿Puede editarlo? ¿No puede? No hay pista visual
│  └─ Debería: inputs disabled + tooltip "No editable: contrato terminado"
│
├─ Historial: muestra qué cambió pero NO por qué:
│  ├─ "Estado cambió de vigente a terminado"
│  ├─ No muestra motivo (renuncia, vencimiento, etc.)
│  └─ Debería: "Terminado por: RENUNCIA (registrado por Juan)"
│
├─ SIN contextual help:
│  ├─ Campo "Tipo de gratificación": Art. 47 vs Art. 50 ¿Qué significa?
│  ├─ Usuario debe abrir Código del Trabajo
│  └─ Debería: icon info con tooltip explicativo
│
└─ Transiciones de estado confusas:
   ├─ Usuario en borrador → Puede ir a qué?
   ├─ Usuario en pendiente → Puede ir a qué?
   └─ No hay diagrama visual (flujo state machine visual)
```

### Problema

```tsx
// Paso 7 resumen - usuario debe RECORDAR datos
// No hay visual comparison antes de enviar

<div className="resumen">
    <p>Trabajador: {form.trab_first_name}</p>
    <p>Cargo: {form.cargo}</p>
    // Usuario debe recordar: "¿Eso está bien?"
</div>

// Mejor: Card visual style con datos destacados
<Card className="resumen">
    <Badge color="blue">{form.trab_first_name}</Badge>
    <Badge color="gray">{form.cargo}</Badge>
    <Badge color="green">{form.sueldo_base} CLP</Badge>
    // Visual recognition, no recordación
</Card>
```

### Recomendación

```
1. Autocomplete + sugerencias inteligentes:
   ├─ Email en nuevo trabajador: sugerir dominios de empresa
   ├─ Funciones: basado en cargo seleccionado (API GET /cargos/{id}/funciones/)
   └─ Lugares de trabajo: historial de lugares usados

2. Preview de acciones:
   ├─ Modal de envío: mostrar mini-resumen contrato
   ├─ Antes de generar PDF: "PDF se creará con plantilla X"
   └─ Antes de cambiar estado: mostrar nueva cadena de transiciones

3. Diagrama de máquina de estados visual:
   ├─ En detalle contrato: mostrar flowchart interactivo
   ├─ Resaltar estado actual en verde
   ├─ Mostrar transiciones posibles en azul
   └─ Mostrar transiciones no permitidas en gris

4. Contextual help ubiquo:
   ├─ Agregar icon info junto a cada campo complejo
   ├─ Tooltip: "Art. 50: Gratificación mensual garantizada, mínimo 2 UF/mes"
   ├─ Link: "Aprende más sobre tipos de contrato"
   └─ Video inline para operaciones complejas (generar PDF, aprobar, etc.)

5. Campos disabled visual:
   ├─ Contrato vigente: campos editables resaltados, otros disabled
   ├─ Contrato borrador: inputs blancos, editable
   ├─ Contrato terminado: inputs grises, read-only + tooltip
   └─ Consistencia visual de "qué puedo hacer aquí"

6. Historial mejorado:
   ├─ No solo "cambio de estado" sino "MOTIVO: Renuncia voluntaria"
   ├─ No solo fecha sino "Hace 3 días" + fecha exacta en hover
   ├─ Avatar del usuario que cambió (no solo nombre)
   └─ Agrupar cambios por "sesión" o "evento" (envío + aprobación como grupo)
```

**Score Recomendado:** 8/10 (con sugerencias + diagrama + contextual help)

---

## 7️⃣ FLEXIBILIDAD Y EFICIENCIA DE USO

### Heurística
> Usuarios expertos deben poder trabajar rápido; atajos, personalizaciones, búsqueda avanzada

### Estado Actual: ❌ MALO (4/10)

```
✅ LO QUE FUNCIONA:
├─ Búsqueda/filtro en lista de trabajadores
├─ Crear copia de contrato (reutilización rápida)
└─ Saltos de pasos en formulario? NO, wizard es lineal

❌ LO QUE FALTA (CRÍTICO):
├─ SIN atajos de teclado:
│  ├─ Tab entre campos (standard HTML)
│  ├─ Enter para guardar (Ctrl+S)
│  ├─ Esc para cerrar modal
│  └─ No hay "quick actions": /nuevo-contrato / /mis-contratos
│
├─ SIN edición rápida desde lista:
│  ├─ Usuario ve lista de contratos
│  ├─ Quiere editar sueldo rápido (inline edit)
│  ├─ Debe: clic → detalle → pestaña → editar → guardar
│  └─ Debería: doble clic en fila → editar inline
│
├─ SIN batch operations:
│  ├─ Usuario quiere cambiar estado de 5 contratos a vigente
│  ├─ Debe: clic en cada uno, "Aceptar", "Cambiar estado"
│  └─ Debería: checkbox múltiple + "Cambiar estado masivo"
│
├─ SIN búsqueda avanzada:
│  ├─ Solo busca por nombre de trabajador
│  ├─ No puede buscar por: rango sueldo, tipo contrato, estado, fecha
│  └─ Usuario experto querría: "contratos vigente + sueldo > 2M + tipo indefinido"
│
├─ Wizard NO permite saltos:
│  ├─ Usuario está en paso 1, quiere ir a paso 5
│  ├─ Debe completar pasos 2,3,4 aunque ya los rellenó antes
│  └─ Debería: permitir saltos si steps anteriores están válidos
│
├─ SIN modo "quick create" simplificado:
│  ├─ Usuario crea 20 contratos al día con datos similares
│  ├─ 7 pasos + wizard cada vez = 140 clics/día
│  └─ Debería: modo "rápido" con solo campos obligatorios
│
├─ SIN remember de valores previos:
│  ├─ Usuario creó 3 contratos con mismo cargo "Ingeniero"
│  ├─ En 4to contrato, debe escribir "Ingeniero" de nuevo
│  └─ Debería: local storage de últimos valores (campos recientes)
│
└─ SIN templates de contrato guardados:
   ├─ Usuario crea contrato con configuración específica (AFP, banco, jornada)
   ├─ Quiere repetir la misma config en 10 contratos más
   ├─ Debe: anotar mentalmente o en papel los datos
   └─ Debería: "Guardar como template" + seleccionar template en paso 1
```

### Problema

```tsx
// Wizard lineal fuerza secuencia
const steps = [1, 2, 3, 4, 5, 6, 7];  // ← No se puede saltar
const handleNextStep = () => currentStep < 7 ? setCurrentStep(+1) : submit();

// Usuario en paso 3, ya rellenó pasos 1-2
// Quiere ir a paso 5 para cambiar sueldo
// NO PUEDE: debe pasar por paso 4 (jornada)
// Resultado: usuario frustrante, workflow ineficiente
```

### Recomendación

```
1. Atajos de teclado:
   ├─ Ctrl+S: guardar/siguiente en wizard
   ├─ Esc: cerrar modal/wizard
   ├─ Tab: navegar campos (estándar HTML, ampliar)
   ├─ / seguido de comando: /nuevo-contrato, /mis-contratos
   └─ Alt+N: nuevo contrato (sin abrir modal)

2. Edición inline desde lista:
   ├─ Doble clic en fila → editar campos inline
   ├─ Presionar Enter para guardar, Esc para cancelar
   ├─ Validación en tiempo real mientras edita
   └─ Indicador visual de qué campos están editables

3. Batch operations:
   ├─ Checkbox en header de lista (select all)
   ├─ Acciones bulk: "Cambiar estado a...", "Agregar etiqueta", "Exportar"
   └─ Confirmación: "¿Cambiar 5 contratos a vigente?"

4. Búsqueda avanzada:
   ├─ Barra: agregar filtros (tipo select, rango sueldo, estado, fecha)
   ├─ Guardar búsquedas frecuentes como "vistas" (Mi Vista: Vigentes)
   └─ Export resultados (CSV, PDF)

5. Wizard con saltos:
   ├─ Permitir saltos SI pasos anteriores son válidos
   ├─ Sidebar con índice de pasos (clic = salta)
   ├─ Validación en tiempo real por paso (no al final)
   └─ Indicador: "Paso 3/7 - 80% completado"

6. Modo quick-create simplificado:
   ├─ Toggle: "Modo completo" vs "Modo rápido"
   ├─ Rápido: solo 3 campos (trabajador, tipo, sueldo base)
   ├─ Resto autofill desde defaults o últimos valores
   └─ Permite editar después de crear

7. Remember de valores previos:
   ├─ Local storage: últimos 10 valores de cada campo
   ├─ Dropdown con historial: "Últimos cargos: Ingeniero, Contador, ..."
   └─ Respeta por empresa (no mezcla empresas diferentes)

8. Templates de contrato:
   ├─ Botón "Guardar como template" en paso 7
   ├─ Guarda: todos los datos (jornada, previsión, bonos, etc.)
   ├─ Paso 1: "Usar template: Ingeniero Senior" (pre-rellena todo)
   └─ CRUD de templates: crear, listar, editar, eliminar
```

**Score Recomendado:** 8/10 (con atajos + templates + batch)

---

## 8️⃣ DISEÑO ESTÉTICO Y MINIMALISTA

### Heurística
> Interfaz limpia; nada superfluo; comunicar claramente; buena espaciación

### Estado Actual: ✅ BUENO (7/10)

```
✅ LO QUE FUNCIONA:
├─ Diseño limpio (tema_base/fyr es profesional)
├─ Espaciado consistente (padding, margin)
├─ Tipografía clara (sans-serif)
├─ Uso de colores restringido (azul, rojo, verde, gris)
├─ Iconografía minimalista
├─ Modal centrado, sin distracciones
├─ Wizard con pasos claros (no información innecesaria)
└─ Detalle contrato: tabs bien organizados

❌ LO QUE FALTA:
├─ Wizard: resumen en barra lateral (toma espacio)
│  ├─ Podría ser: colapsable o inline tooltip
│  └─ Actualmente: 30% de ancho sin usar interactivamente
│
├─ Detalle: 8 tabs (datos, trabajador, sueldo, previsión, documento, anexos, historial, finiquito)
│  ├─ Muchos tabs = usuario se pierde
│  └─ Podría agruparse: "Contrato" (datos+términos), "Trabajador", "Económico" (sueldo+prev)
│
├─ Modal de aprobación empleador:
│  ├─ Email en input + botón "Enviar" en footer
│  ├─ Confusión de flujo: ¿dónde hago clic primero?
│  └─ Podría: email + "Enviar a empleador" como componente cohesivo
│
├─ Historial timeline:
│  ├─ Muestra cada evento en línea temporal
│  ├─ Si hay muchos eventos: scroll largo
│  └─ Podría: agrupar por día, colapsables
│
├─ List view: muchas columnas (nombre, cargo, tipo, estado, fechas)
│  ├─ Responsive: en móvil, muy comprimido
│  └─ Podría: agregar toggle "Columnas visibles"
│
└─ Campos opcionales:
   ├─ Algunos campos son opcionales (funciones, observaciones)
   ├─ No hay pista visual (asterisco, color, label)
   └─ Usuario no sabe qué es obligatorio vs opcional
```

### Recomendación

```
1. Simplificar wizard layout:
   ├─ Resumen en barra lateral: colapsable (toggle)
   ├─ Desktop: 70% contenido, 30% resumen
   ├─ Tablet/móvil: 100% contenido, resumen en modal desplegable
   └─ Visual: "← Resumen" (icono) en esquina

2. Reorganizar tabs en detalle:
   ├─ "Información" (datos laborales + trabajador)
   ├─ "Económico" (sueldo + previsión)
   ├─ "Documentos" (PDF + anexos)
   ├─ "Historial" (cambios)
   └─ Total: 4 tabs, no 8

3. Modal de aprobación más clara:
   ├─ Header: "Enviar contrato a aprobación"
   ├─ Body: "Email del empleador" (input)
   ├─ Footer: "Revisar contrato" (link) | "Enviar" (button)
   └─ Flujo visual: arriba → abajo

4. Historial colapsable:
   ├─ Agrupar por fecha: "Hoy (3 eventos)" ▼
   ├─ "Hace 2 días (5 eventos)" ▼
   ├─ Expandible si quiere ver detalles
   └─ Scroll reducido

5. Columnas dinámicas en list:
   ├─ Mostrar: nombre, cargo, estado (siempre)
   ├─ Toggle: "Más columnas" (tipo, sueldo, fecha_inicio)
   └─ Guardar preferencia (localStorage)

6. Claridad de campos obligatorios vs opcionales:
   ├─ Obligatorios: red asterisk *
   ├─ Opcionales: "(opcional)" en label
   ├─ Estándares HTML5: required attribute
   └─ Validación: solo obligatorios son validados
```

**Score Recomendado:** 8/10 (con simplificaciones)

---

## 9️⃣ AYUDA PARA RECONOCER, DIAGNOSTICAR Y RECUPERARSE DE ERRORES

### Heurística
> Los errores deben ser claros, en lenguaje del usuario, sugerir soluciones

### Estado Actual: ❌ MALO (3/10)

```
✅ LO QUE FUNCIONA:
├─ Validación frontend rechaza datos inválidos (RUT, email)
└─ Toast error muestra qué validación falló

❌ LO QUE FALTA (CRÍTICO):
├─ Errores genéricos:
│  ├─ "Error al guardar contrato" (¿por qué? ¿dónde?)
│  ├─ "Validación fallida" (¿qué campo?)
│  ├─ "El servidor respondió un error" (código 500, no útil)
│  └─ Usuario: "¿Qué hago?" - sin opciones
│
├─ Errores técnicos expuestos:
│  ├─ "UsuarioEmpresa no encontrado"
│  ├─ "KeyError: 'datos_trabajador_nuevo'"
│  ├─ "SQL constraint violation"
│  └─ Usuario no entiende jerga
│
├─ SIN sugerencias de recuperación:
│  ├─ "Email inválido" (sin sugerencias)
│  │  └─ Debería: "¿Quisiste decir empresa.com en lugar de empresa.co?"
│  │
│  ├─ "Trabajador no existe"
│  │  └─ Debería: "¿Quisiste seleccionar a Juan García?"
│  │
│  ├─ "Transición no permitida"
│  │  └─ Debería: "Contrato es BORRADOR. Transiciones permitidas: [botones]"
│  │
│  └─ "PDF no se pudo generar"
│     └─ Debería: "Plantilla 'Ingeniero' no disponible. [Crear plantilla] [Usar global]"
│
├─ SIN contexto de error:
│  ├─ "Error en paso 5"
│  ├─ Usuario: "¿Cuál de todos los campos de jornada?"
│  └─ Debería: resaltar input con error en rojo + foco automático
│
├─ SIN retry automático:
│  ├─ Cambiar estado falla (timeout)
│  ├─ Usuario debe rellenar el formulario otra vez
│  └─ Debería: botón "Reintentar" (no regenerar form)
│
├─ SIN feedback de operaciones lentas:
│  ├─ Generar PDF toma 3 segundos (silencio)
│  ├─ Usuario piensa que nada pasa
│  └─ Debería: progress bar "Generando PDF... 60%"
│
└─ SIN historial de intentos fallidos:
   ├─ Usuario falla 3 veces al crear contrato
   ├─ No hay registro de por qué falló (logs)
   └─ Debería: "Últimos errores: [lista expandible]"
```

### Problema Crítico

```python
# views.py línea 813 - Error genérico
except PlantillaNoDisponibleError as exc:
    return Response({"detail": str(exc)}, status=400)
    # Usuario recibe: "detail": "Plantilla de contrato no disponible"
    # Qué falta:
    # - ¿Plantilla de qué tipo? (trabajador, B2B, etc.)
    # - ¿Cuál es el fallback? (usar global)
    # - ¿Cómo crear una? (link a admin)
    # - ¿Quién contactar? (soporte)
```

### Recomendación

```
1. Mensajes de error user-friendly + técnico:
   Backend:
   {
     "detail": "No se pudo generar el contrato. Intenta nuevamente.",  // User
     "error_code": "TEMPLATE_NOT_FOUND",                              // Técnico
     "error_details": "Plantilla 'contrato_trabajador' para Empresa A no existe",
     "suggestions": [
       "Crear plantilla desde [Admin > Plantillas]",
       "Usar plantilla global",
       "Contactar soporte@empresa.com"
     ],
     "retry_after_seconds": 5
   }

2. Validación con sugerencias:
   // Email
   {
     "field": "enviado_a",
     "error": "Email no parece válido",
     "value": "jefe@empresa.co",
     "suggestions": ["jefe@empresa.com"],  // Fuzzy match
     "help_text": "Verifica el dominio. ¿Quisiste decir .com?"
   }

3. Transiciones bloqueadas con opciones:
   {
     "detail": "No se puede cambiar a vigente desde BORRADOR sin aprobación empleador",
     "current_state": "borrador",
     "possible_transitions": [
       { "to": "pendiente_aprobacion", "action": "Enviar a aprobación" },
       { "to": "descartado", "action": "Descartar contrato" }
     ]
   }

4. Errores contextuales:
   - Resaltar input con error en UI (red border + icon)
   - Focus automático en primer campo con error
   - Tooltip junto a input: "Teléfono debe ser 9 dígitos"
   - No genérico "Validation failed"

5. Retry inteligente:
   - Botón "Reintentar" (no rellenar form otra vez)
   - Exponential backoff: 1s, 2s, 4s si falla múltiples veces
   - Toast: "Reintentando en 2 segundos..." (contador)

6. Feedback de operaciones lentas:
   - Progress bar con etapas: "1. Validando... 2. Generando PDF... 3. Guardando..."
   - Tiempo estimado: "Esto suele tomar ~5 segundos"
   - Cancelar operación: botón "Cancelar" (no bloquear UI)

7. Historial de errores recientes:
   - Link "¿Problemas? Ver últimos errores"
   - Mostrar: error, cuándo, acción sugerida
   - Permite diagnosticar patrón ("siempre falla al generar PDF")
```

**Score Recomendado:** 8/10 (con mensajes + sugerencias + retry)

---

## 🔟 AYUDA Y DOCUMENTACIÓN

### Heurística
> Fácil buscar ayuda; documentación orientada a tareas; pasos concretos

### Estado Actual: ❌ MUY MALO (2/10)

```
✅ LO QUE FUNCIONA:
├─ Tooltips en algunos campos (hover)
└─ Colores y badges claros

❌ LO QUE FALTA (CRÍTICO):
├─ SIN documentación dentro de la app:
│  ├─ Usuario: "¿Qué es una gratificación Art. 47?"
│  ├─ No hay link "Aprende más" o documentación inline
│  └─ Debe ir a Google o Código del Trabajo
│
├─ SIN guía de inicio (onboarding):
│  ├─ Usuario nuevo abre app
│  ├─ Ve lista vacía + botón "Crear contrato"
│  ├─ "¿Por dónde empiezo?" sin guía
│  └─ Debería: tour interactivo o guía paso a paso
│
├─ SIN videos de ayuda:
│  ├─ Operaciones complejas: generar PDF, enviar aprobación, crear anexo
│  ├─ Usuario debe aprender por trial-and-error
│  └─ Debería: videos de 1-2 minutos (inline)
│
├─ SIN FAQ:
│  ├─ "¿Qué diferencia hay entre descartado y anulado?"
│  ├─ "¿Puedo cambiar el sueldo después de vigente?"
│  ├─ No hay respuestas centralizadas
│  └─ Debería: FAQ sección (busqueda + categorías)
│
├─ SIN formulario de ayuda/soporte:
│  ├─ Usuario con problema: "¿A quién contacto?"
│  ├─ No hay botón "Reportar problema"
│  └─ Debería: chat, form, o email directo
│
├─ SIN glosario:
│  ├─ Términos técnicos sin definiciones
│  ├─ Código del Trabajo: Art. 47, Art. 50 sin contexto
│  └─ Debería: glosario popup clickeable
│
├─ Tooltips escasos:
│  ├─ Pocos campos tienen help text
│  ├─ Usuario: "¿Por qué me pide esto?"
│  └─ Debería: tooltip en TODOS los campos complejos
│
└─ SIN contexto de documentación:
   ├─ Error: "Plantilla no disponible"
   ├─ Usuario: "¿Cómo creo una plantilla?"
   ├─ No hay link a documentación
   └─ Debería: error + link directo a "Crear plantillas"
```

### Recomendación

```
1. Documentación inline (contextual):
   ├─ Tooltip junto a cada campo (icon info)
   ├─ Ejemplos de valores válidos
   ├─ Link a documentación externa (Código del Trabajo)
   └─ Video inline si la operación es compleja
   
   Ejemplo:
   "Tipo de gratificación (Art. 47)"  ← Link clickeable
   i ← Icon info
   Tooltip: "Art. 47: Gratificación anual, máx 1 sueldo/año.
            Art. 50: Gratificación mensual garantizada, mín 2 UF.
            Aprende más → [link]"

2. Onboarding interactivo:
   ├─ Primera vez que usuario abre: "¿Primera vez? Ver tutorial" (modal)
   ├─ Paso 1: "Crear un contrato" (resalta botón, tooltip)
   ├─ Paso 2: "Completar datos del trabajador"
   ├─ Paso 3: "Enviar a aprobación del empleador"
   └─ Skip si lo desea: checkbox "No mostrar nuevamente"

3. Videos de ayuda:
   ├─ Generar PDF: 60s video (pantalla + voz)
   ├─ Enviar aprobación: 90s video
   ├─ Cambiar estado: 45s video
   ├─ Embebidos en modal (no popup)
   └─ Transcripción: texto debajo del video

4. FAQ section:
   ├─ Búsqueda: "¿Descartado vs Anulado?"
   ├─ Categorías: Creación, Aprobación, Estados, Finiquito, Anexos
   ├─ Cards expandibles (mostrar respuesta en expand)
   └─ Rating: "¿Útil esta respuesta?" (feedback)

5. Glosario clickeable:
   ├─ Términos subrayados: "Art. 47" → click abre glosario
   ├─ Definición popup: "Gratificación anual según Art. 47 CT"
   ├─ Link a ley completa (si aplica)
   └─ Guardable como "Mis términos" (personalizados)

6. Soporte integrado:
   ├─ Botón en footer o esquina: "¿Necesitas ayuda?"
   ├─ Opciones:
   │  ├─ Live chat (si hay soporte online)
   │  ├─ Formulario de problema (con contextual info)
   │  ├─ Email a soporte
   │  └─ Link a documentación
   └─ Respuesta automática: "Nos responderemos en 2 horas"

7. Documentación contextual en errores:
   ├─ Error + sugerencias + link a documentación
   Ejemplo:
   {
     "detail": "PDF no se pudo generar",
     "help_link": "/docs/generar-pdf/",
     "video_help": "/videos/generar-pdf.mp4"
   }

8. Guía de procedimientos (paso a paso):
   ├─ Documento interactivo: "Cómo crear un contrato"
   ├─ Pasos 1-7 con screenshots
   ├─ Cada paso resaltable en la app (click en paso → UI brilla)
   └─ Descargable como PDF
```

**Score Recomendado:** 8/10 (con documentación + videos + soporte)

---

## 📊 RESUMEN FINAL DE SCORES

| Heurística | Actual | Recomendado | Gap | Prioridad |
|---|---|---|---|---|
| 1. Visibilidad estado | 5/10 | 7/10 | -2 | ALTA |
| 2. Correspondencia mundo real | 7/10 | 8/10 | -1 | MEDIA |
| 3. Control y libertad usuario | 4/10 | 8/10 | **-4** | **CRÍTICA** |
| 4. Consistencia estándares | 6/10 | 8/10 | -2 | ALTA |
| 5. Prevención errores | 3/10 | 7/10 | **-4** | **CRÍTICA** |
| 6. Reconocimiento vs recordación | 6/10 | 8/10 | -2 | ALTA |
| 7. Flexibilidad y eficiencia | 4/10 | 8/10 | **-4** | **CRÍTICA** |
| 8. Diseño estético/minimalista | 7/10 | 8/10 | -1 | MEDIA |
| 9. Recuperación de errores | 3/10 | 8/10 | **-5** | **CRÍTICA** |
| 10. Ayuda y documentación | 2/10 | 8/10 | **-6** | **CRÍTICA** |
| **PROMEDIO** | **4.7/10** | **7.9/10** | **-3.2** | **MEDIA-ALTA** |

---

## 🎯 CONCLUSIONES

**Heurísticas CRÍTICAS con mayor impacto UX:**
1. Control y libertad (sin AutoSave = pérdida de datos)
2. Prevención de errores (sin confirmaciones = clicks accidentales)
3. Flexibilidad (wizard lineal = ineficiente para expertos)
4. Recuperación de errores (mensajes genéricos = confusión)
5. Ayuda (documentación nula = usuario perdido)

**Impacto en usuario:**
- ⏱️ **Tiempo:** Wizard sin saltos + sin templates = 10-15 min por contrato
- 😤 **Frustración:** Pérdida de datos + mensajes genéricos = alta
- 🚀 **Adopción:** Sin onboarding + sin documentación = curva aprendizaje larga
- 📉 **Errores:** Clic doble, email typos = alto riesgo de re-trabajo

**Recomendación Global:**
Implementar en este orden:
1. **AutoSave** (resuelve control + prevención + frustración)
2. **Confirmaciones 2-paso** (resuelve accidentes)
3. **Mensajes contextuales** (resuelve recuperación)
4. **Documentación + video** (resuelve ayuda + onboarding)
5. **Wizard con saltos + templates** (resuelve eficiencia)

**Timeline estimado para mejoras críticas:** 3-4 sprints

