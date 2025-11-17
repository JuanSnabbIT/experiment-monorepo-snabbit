# Changelog - Orden de Trabajo V2

Documentación de cambios realizados en el módulo de Orden de Trabajo desde la versión 1 a la versión 2.

---

## Fecha de inicio de cambios: Noviembre 2025

### Contexto del Proyecto

Se está realizando una transición gradual del sistema de Orden de Trabajo hacia una versión V2 que separa los flujos por tipo de servicio. El backend está siendo refactorizado por el superior del equipo para crear 3 modelos distintos de OT.

---

## 📝 Cambios Implementados

### 1. Campo `tipo_servicio` en Orden de Trabajo

**Archivo:** `frontend/src/pages/OrdenTrabajo/modals/CrearOrdenOT.tsx`

**Fecha:** Noviembre 2025

**Cambio:**

- Agregado campo `tipo_servicio` al formulario de creación de OT
- Selector con 3 opciones: `general`, `soporte_remoto`, `soporte_presencial`
- Validación: campo requerido

**Constantes creadas:**

```typescript
// frontend/src/constants/tipoServicio.constant.ts
export const TIPO_SERVICIO = [
	{ value: 'general', label: 'Servicio General' },
	{ value: 'soporte_remoto', label: 'Soporte Remoto' },
	{ value: 'soporte_presencial', label: 'Soporte Presencial' },
];

export const TIPO_SERVICIO_SOLO_PROSPECTO = [{ value: 'general', label: 'Servicio General' }];
```

**Lógica de restricción:**

- Si el cliente es **Prospecto** → Solo permite `tipo_servicio: 'general'`
- Si el cliente es **Cliente registrado** → Permite los 3 tipos de servicio

**Razón del cambio:**
Preparar el frontend para la separación de modelos de OT en el backend (soporte presencial, soporte remoto, y servicio general)

---

### 2. Campo `tipo_trabajo` en Detalle de Trabajo

**Archivo:** `frontend/src/pages/OrdenTrabajo/modals/CrearDetalleTrabajoOT.tsx`

**Fecha:** Noviembre 2025

**Cambio:**

- Agregado campo `tipo_trabajo` al formulario de creación de DetalleTrabajo
- Opciones **condicionales** según el `tipo_servicio` de la OT padre
- Validación: campo requerido

**Constantes creadas:**

```typescript
// frontend/src/constants/tipoTrabajo.constant.ts
export const TIPO_TRABAJO_POR_SERVICIO = {
	general: [
		{ value: 'instalacion', label: 'Instalación', icon: 'HeroWrenchScrewdriver' },
		{ value: 'configuracion', label: 'Configuración', icon: 'HeroCog6Tooth' },
		{ value: 'mantenimiento', label: 'Mantenimiento', icon: 'HeroWrench' },
		{ value: 'consultoria', label: 'Consultoría', icon: 'HeroAcademicCap' },
	],
	soporte_presencial: [
		{
			value: 'diagnostico_presencial',
			label: 'Diagnóstico Presencial',
			icon: 'HeroMagnifyingGlass',
		},
		{
			value: 'reparacion_hardware',
			label: 'Reparación Hardware',
			icon: 'HeroWrenchScrewdriver',
		},
		{
			value: 'instalacion_equipos',
			label: 'Instalación de Equipos',
			icon: 'HeroComputerDesktop',
		},
		{ value: 'reemplazo_componentes', label: 'Reemplazo de Componentes', icon: 'HeroCpuChip' },
		{
			value: 'cableado_infraestructura',
			label: 'Cableado/Infraestructura',
			icon: 'HeroServerStack',
		},
		{ value: 'capacitacion_sitio', label: 'Capacitación en Sitio', icon: 'HeroUserGroup' },
	],
	soporte_remoto: [
		{
			value: 'diagnostico_remoto',
			label: 'Diagnóstico Remoto',
			icon: 'HeroMagnifyingGlassCircle',
		},
		{ value: 'configuracion_software', label: 'Configuración Software', icon: 'HeroCog8Tooth' },
		{ value: 'actualizaciones', label: 'Actualizaciones', icon: 'HeroArrowPath' },
		{ value: 'soporte_usuario', label: 'Soporte a Usuario', icon: 'HeroUserCircle' },
	],
};
```

**Lógica implementada:**

- El selector de `tipo_trabajo` muestra opciones según el `tipo_servicio` de la OT
- Ejemplo: Si OT tiene `tipo_servicio: 'soporte_presencial'` → Muestra 6 opciones específicas de soporte presencial

**Interface actualizada:**

```typescript
// frontend/src/interface/ordenTrabajo.interface.ts
export interface IDetalleOrdenDeTrabajo {
	// ... campos existentes
	tipo_trabajo?: string; // Nuevo campo opcional (hasta que backend lo implemente)
}
```

**Estado:** Campo enviado al backend pero aún no implementado en el modelo Django

**Razón del cambio:**
Clasificar los trabajos específicos dentro de cada tipo de servicio para mejor trazabilidad y reportería

---

### 3. Reestructuración de Tabla de Detalles de Trabajo

**Archivo:** `frontend/src/pages/OrdenTrabajo/components/ListaDetalleTrabajoOT.tsx`

**Fecha:** Noviembre 2025

**Cambios:**

#### **3.1. Nueva columna "Tipo de Trabajo"**

- Columna agregada con icono + label
- Muestra el tipo de trabajo clasificado (ej: "Instalación de Equipos" con ícono de computadora)
- Si no tiene tipo: muestra "Por definir" con ícono de interrogación en gris

#### **3.2. Reordenamiento de columnas**

**Antes:**

```
# | Solicitud | Estado | Técnico Asignado | Acciones
```

**Ahora:**

```
# | Tipo de Trabajo | Solicitud | Estado | Técnico Asignado | Acciones
```

#### **3.3. Simplificación de columna "Estado"**

**Antes:**

- Botones interactivos en la columna para cambiar estado
- Confusión con botones en acciones

**Ahora:**

- **Solo badges visuales** (sin interacción)
- Estados con emojis y colores:
    - ⏳ Pendiente (amber)
    - 🔄 En Proceso (blue)
    - ✅ Completado (emerald)
    - 🔶 Medianamente Completado (sky)
    - ❌ No Realizado (red)

#### **3.4. Botón "Seguimientos" movido a Acciones**

**Antes:**

- Columna separada para botón de Seguimientos

**Ahora:**

- Botón integrado en columna de Acciones
- Solo visible cuando `estado === 'en_proceso'`

---

### 4. Unificación de Cambios de Estado

**Archivo:** `frontend/src/pages/OrdenTrabajo/components/ListaDetalleTrabajoOT.tsx`

**Fecha:** Noviembre 2025

**Cambio:**

- Eliminados múltiples botones de cambio de estado en la columna
- Creado **botón único "Cambiar Estado"** en columna de Acciones
- Modal centralizado para seleccionar nuevo estado

**Lógica de opciones condicionales:**

```typescript
const getOpcionesEstado = (estadoActual: string) => {
	switch (estadoActual) {
		case 'pendiente':
			return [{ value: 'en_proceso', label: 'En Proceso' }];
		case 'en_proceso':
			return [
				{ value: 'pendiente', label: 'Pendiente' },
				{ value: 'completado', label: 'Completado' },
				{ value: 'medianamente_completado', label: 'Medianamente Completado' },
				{ value: 'no_realizado', label: 'No Realizado' },
			];
		case 'medianamente_completado':
			return [
				{ value: 'en_proceso', label: 'En Proceso' },
				{ value: 'completado', label: 'Completado' },
			];
		case 'completado':
		case 'no_realizado':
			return [{ value: 'en_proceso', label: 'Reabrir (En Proceso)' }];
		default:
			return [];
	}
};
```

**Razón del cambio:**
Mejorar UX eliminando confusión entre múltiples botones de estado

---

### 5. Validación de Requisitos para Cambio de Estado

**Archivo:** `frontend/src/pages/OrdenTrabajo/components/ListaDetalleTrabajoOT.tsx`

**Fecha:** Noviembre 2025

**Cambio:**

- El botón "Cambiar Estado" (Pendiente → En Proceso) se **deshabilita** hasta cumplir requisitos:
    - ✅ OT debe tener `fecha_inicio_ot`
    - ✅ OT debe tener `fecha_finalizacion_ot`
    - ✅ DetalleTrabajo debe tener `tecnico_asignado`

**Implementación:**

```typescript
const tieneFechaInicio =
	detalleOrdenTrabajo?.fecha_inicio_ot && detalleOrdenTrabajo.fecha_inicio_ot !== '';
const tieneFechaFin =
	detalleOrdenTrabajo?.fecha_finalizacion_ot && detalleOrdenTrabajo.fecha_finalizacion_ot !== '';
const tieneTecnico = !!detalleOrdenTrabajo?.tecnico_asignado;
const cumpleRequisitos = tieneFechaInicio && tieneFechaFin && tieneTecnico;
```

**Tooltip dinámico:**

- Si botón deshabilitado → muestra: `"Faltan: Fecha de Inicio de OT, Técnico asignado"`
- Si botón habilitado → muestra: `"Cambiar Estado"`

**Fix técnico:**

- Botón envuelto en `<span>` para que tooltip funcione en estado deshabilitado

**Razón del cambio:**
Prevenir que trabajos avancen a "En Proceso" sin tener la información mínima necesaria (fechas y responsable)

---

### 6. Botón "Reasignar Técnico"

**Archivo:** `frontend/src/pages/OrdenTrabajo/components/ListaDetalleTrabajoOT.tsx`

**Fecha:** Noviembre 2025

**Cambio:**
**Antes:**

- Botón "Asignar Técnico" desaparecía después de asignar
- Usuario no podía cambiar el técnico asignado

**Ahora:**

- Botón **no desaparece**, cambia de apariencia:
    - **Sin técnico:** Botón azul (sky) con ícono `DuoAddUser` y texto "Asignar Técnico"
    - **Con técnico:** Botón ámbar (amber) con ícono `HeroArrowPath` y texto "Reasignar Técnico"
- Disponible solo en estado `pendiente`

**Razón del cambio:**
Permitir reasignación de técnicos cuando sea necesario (ej: técnico enfermó, cambio de disponibilidad)

---

### 7. Lógica de Estados según Estado de OT Padre

**Archivo:** `frontend/src/pages/OrdenTrabajo/components/ListaDetalleTrabajoOT.tsx`

**Fecha:** Noviembre 2025

**Cambio:**

- Agregada lógica para **respetar el estado de la OT padre**
- Variables de control:
    ```typescript
    const estadoOT = detalleOrdenTrabajo?.estado;
    const otPendiente = estadoOT === 'pendiente';
    const otEnProceso = estadoOT === 'en_proceso';
    ```

**Reglas implementadas:**

#### **7.1. Visibilidad de botones de acción**

- Botones de cambio de estado **solo visibles** si OT está en `Pendiente` o `En Proceso`
- Si OT está `Completada` o `Cerrada` → No se pueden modificar estados de trabajos

#### **7.2. Restricción de estados finales**

- Los estados finales (Completado, No Realizado) **solo disponibles** cuando OT está `En Proceso`
- Si OT está `Pendiente` → DetalleTrabajo puede cambiar entre `Pendiente` ↔ `En Proceso` (para ajustes)
- Modificación en `getOpcionesEstado()`:
    ```typescript
    else if (estadoActual === "en_proceso") {
        const opciones = [{ value: "pendiente", label: "Pendiente" }];
        if (otEnProceso) {  // Solo agregar estados finales si OT está En Proceso
            opciones.push(completado, medianamente_completado, no_realizado);
        }
        return opciones;
    }
    ```

#### **7.3. Botón Eliminar**

- Solo visible si OT está en estado `Pendiente`
- Condición: `otPendiente`

**Razón del cambio:**
Mantener coherencia entre OT y sus trabajos:

- **Pendiente:** Fase de planificación/ajustes
- **En Proceso:** Fase de ejecución (permite completar trabajos)
- **Completada/Cerrada:** No se modifican trabajos

---

### 8. Validación en Botón de Estado de OT

**Archivo:** `frontend/src/pages/OrdenTrabajo/DetalleOT.tsx`

**Fecha:** Noviembre 2025

**Cambio:**

- Aplicada misma lógica de validación al botón "Cambiar a En Proceso" de la OT
- Requisitos para habilitar botón:
    - ✅ `fecha_inicio_ot` presente
    - ✅ `fecha_finalizacion_ot` presente
    - ✅ `responsable_empresa` asignado

**Implementación:**

```typescript
{detalleOrdenTrabajo.estado === 'pendiente' && (() => {
	const tieneFechaInicio = detalleOrdenTrabajo.fecha_inicio_ot && detalleOrdenTrabajo.fecha_inicio_ot !== '';
	const tieneFechaFin = detalleOrdenTrabajo.fecha_finalizacion_ot && detalleOrdenTrabajo.fecha_finalizacion_ot !== '';
	const tieneResponsable = !!detalleOrdenTrabajo.responsable_empresa;
	const cumpleRequisitos = tieneFechaInicio && tieneFechaFin && tieneResponsable;

	const getMensajeRequisitos = () => {
		const faltantes = [];
		if (!tieneFechaInicio) faltantes.push('Fecha de Inicio');
		if (!tieneFechaFin) faltantes.push('Fecha de Finalización');
		if (!tieneResponsable) faltantes.push('Responsable');
		return faltantes.length > 0 ? `Faltan: ${faltantes.join(', ')}` : 'Cambiar a en Proceso';
	};

	return (
		<Tooltip text={getMensajeRequisitos()}>
			<span>
				<Button
					variant='solid'
					color='emerald'
					icon='HeroPlay'
					isDisable={!cumpleRequisitos}
					onClick={async () => { /* cambio de estado */ }}
				/>
			</span>
		</Tooltip>
	);
})()}
```

**Razón del cambio:**
Coherencia con validación de DetalleTrabajo - la OT también debe cumplir requisitos mínimos antes de iniciar ejecución

---

### 9. Botón "Crear Cotización" desde Trabajo

**Archivo:** `frontend/src/pages/OrdenTrabajo/modals/CrearCotizacionDesdeOT.tsx` (nuevo)  
**Archivo:** `frontend/src/pages/OrdenTrabajo/components/ListaDetalleTrabajoOT.tsx` (modificado)

**Fecha:** Noviembre 2025

**Cambio:**

- Agregado botón "Crear Cotización" en acciones de DetalleTrabajo
- Visible solo cuando `estado === 'en_proceso'` y OT está `en_proceso`
- Modal especializado para crear cotizaciones desde el contexto del trabajo

**Implementación:**

Modal muestra información contextual pre-cargada:

```typescript
Cliente: Heredado de la OT
Vinculado a: DetalleTrabajo específico
Nombre: "Cotización - [nombre del trabajo]"
Descripción: Heredada del trabajo
```

**Flujo:**

1. Usuario hace click en botón 📋 en acciones del trabajo
2. Modal se abre con datos pre-cargados
3. Usuario completa: nombre, tipo moneda, descripción, observaciones
4. Al crear:
    - Se crea la cotización en `/api/cotizaciones/`
    - Se intenta vincular al DetalleTrabajo vía PATCH
    - Se muestra mensaje de éxito
    - Se recargan los datos de la OT

**Ubicación del botón:**

```
ListaDetalleTrabajoOT → Columna Acciones → Estado "En Proceso" → Botón azul con ícono de clipboard
```

**Casos de uso:**

- Técnico detecta necesidad de materiales no contemplados
- Se crea incidencia en seguimiento
- Se crea cotización directamente desde el trabajo
- Cliente aprueba y se genera orden de compra

**Razón del cambio:**
Facilitar creación de cotizaciones cuando surgen necesidades durante la ejecución del trabajo, manteniendo trazabilidad completa

---

## 📊 Resumen de Acciones por Estado

### DetalleTrabajo - Acciones Disponibles

| Estado              | OT Pendiente                                                       | OT En Proceso                                         |
| ------------------- | ------------------------------------------------------------------ | ----------------------------------------------------- |
| **Pendiente**       | 👁️ Ver<br>👤 Asignar Técnico<br>🗑️ Eliminar<br>🔄 Cambiar Estado\* | 👁️ Ver<br>🔄 Reasignar Técnico<br>🔄 Cambiar Estado\* |
| **En Proceso**      | 👁️ Ver<br>🔄 Cambiar Estado\*\*                                    | 👁️ Ver<br>💬 Seguimiento<br>🔄 Cambiar Estado\*\*     |
| **Med. Completado** | 👁️ Ver<br>🔄 Cambiar Estado\*\*\*                                  | 👁️ Ver<br>🔄 Cambiar Estado\*\*                       |
| **Completado**      | 👁️ Ver                                                             | 👁️ Ver<br>↩️ Reabrir                                  |
| **No Realizado**    | 👁️ Ver                                                             | 👁️ Ver<br>↩️ Reabrir                                  |

\* Cambiar Estado deshabilitado hasta cumplir requisitos (fechas + técnico)  
\*\* Puede avanzar a estados finales solo si OT En Proceso  
\*\*\* Solo puede volver a En Proceso o avanzar a Completado

---

## 🔄 Flujo de Estados

### Máquina de Estados de DetalleTrabajo

```
         ┌─────────────┐
         │  Pendiente  │◄──────────┐
         └──────┬──────┘           │
                │ (requiere        │
                │  fechas +        │
                │  técnico)        │
                ▼                  │
         ┌─────────────┐           │
    ┌───►│ En Proceso  │───────────┤
    │    └──────┬──────┘           │
    │           │                  │
    │           │ (solo si         │
    │           │  OT En Proceso)  │
    │           ▼                  │
    │    ┌──────────────────┐     │
    │    │  Medianamente    │     │
    │    │   Completado     │─────┤
    │    └──────────────────┘     │
    │           │                  │
    │           ▼                  │
    │    ┌─────────────┐           │
    └────┤ Completado  │           │
         └─────────────┘           │
                                   │
         ┌─────────────┐           │
         │No Realizado │───────────┘
         └─────────────┘

Leyenda:
─►  Transición permitida
◄─  Transición de retorno (Reabrir)
```

**Restricciones:**

- `Pendiente → En Proceso`: Requiere fechas de OT + técnico asignado
- `En Proceso → Estados Finales`: Solo si OT está en estado `En Proceso`
- `Estados Finales → En Proceso`: Permitido para reapertura

---

## 📁 Archivos Modificados

### Creados

- ✅ `frontend/src/constants/tipoServicio.constant.ts`
- ✅ `frontend/src/constants/tipoTrabajo.constant.ts`

### Modificados

- ✅ `frontend/src/pages/OrdenTrabajo/modals/CrearOrdenOT.tsx`
- ✅ `frontend/src/pages/OrdenTrabajo/modals/CrearDetalleTrabajoOT.tsx`
- ✅ `frontend/src/pages/OrdenTrabajo/components/ListaDetalleTrabajoOT.tsx`
- ✅ `frontend/src/pages/OrdenTrabajo/DetalleOT.tsx`
- ✅ `frontend/src/interface/ordenTrabajo.interface.ts`

### Nuevos Modales

- ✅ `frontend/src/pages/OrdenTrabajo/modals/CrearCotizacionDesdeOT.tsx`

---

## ⏳ Pendientes en Backend

1. **Campo `tipo_servicio` en modelo `OrdenDeTrabajo`**
    - Actualmente solo en frontend
    - Backend debe agregar campo con choices: `general`, `soporte_remoto`, `soporte_presencial`

2. **Campo `tipo_trabajo` en modelo `DetalleTrabajo`**
    - Frontend ya envía el campo
    - Backend debe agregar campo con choices según tipo de servicio

3. **Posible refactorización a OrdenTrabajoV2**
    - Podría separar en 3 modelos distintos (presencial, remoto, general)
    - Incluiría vinculación con `UsuarioEquipo` para soportes técnicos

---

## 🎯 Principios de Diseño Aplicados

1. **Coherencia:** Estados de trabajos respetan estado de OT padre
2. **Validación Preventiva:** No permite avances sin requisitos mínimos
3. **Feedback Visual:** Tooltips informativos sobre requisitos faltantes
4. **Flexibilidad:** Permite ajustes en fase de planificación
5. **Trazabilidad:** Clasificación por tipo de servicio y tipo de trabajo

---

## 📞 Contacto

Para dudas sobre estos cambios, contactar al equipo de desarrollo frontend.

**Última actualización:** 17 de Noviembre, 2025
