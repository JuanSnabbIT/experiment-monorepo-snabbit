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
# Changelog - Orden de Trabajo V2

Documentación técnica y de producto de los cambios aplicados al flujo de Orden de Trabajo (OT), desde backend hasta frontend. El documento sigue el flujo de negocio de la OT: creación → planificación → asignaciones → ejecución → seguimiento → cierre.

---

## Resumen ejecutivo

- Ámbito: Cambios principalmente frontend con algunas comprobaciones y fixes backend no destructivos.
- Objetivo: Separar y clarificar los flujos para distintos tipos de servicio (servicio general vs soportes) y mejorar UX y validaciones para evitar avanzar trabajos sin datos mínimos.
- Enfoque: Cambios incrementales y reversibles, la mayoría frontend-only; backend modificado sólo cuando fue necesario para corregir comportamiento observable (ej. nested routes).

---

## Flujo de negocio — Cambios por etapa

**1) Creación de la OT**
- Nuevo campo `tipo_servicio` en el formulario de creación (frontend). Opciones: `general`, `soporte_remoto`, `soporte_presencial`.
- Efecto: prepara la UI para mostrar vistas separadas según tipo y condicionar opciones en detalle/trabajo.

Archivos:
- `frontend/src/pages/OrdenTrabajo/modals/CrearOrdenOT.tsx`
- `frontend/src/constants/tipoServicio.constant.ts`

Impacto backend:
- Ninguno obligatorio. Si el backend no tiene el campo, el frontend lo deixa en el payload y se marca pendiente la implementación server-side.

---

**2) Planificación (detalles del trabajo dentro de la OT)**
- Se añadió campo `tipo_trabajo` en el formulario de `DetalleTrabajo` con valores condicionales según `tipo_servicio` (por ejemplo, tipos específicos para soporte presencial).
- La tabla de `Detalles del Trabajo` se reestructuró (columna "Tipo de Trabajo" + reordenamiento) para mejorar trazabilidad.

Archivos:
- `frontend/src/pages/OrdenTrabajo/modals/CrearDetalleTrabajoOT.tsx`
- `frontend/src/constants/tipoTrabajo.constant.ts`
- `frontend/src/pages/OrdenTrabajo/components/ListaDetalleTrabajoOT.tsx`

Impacto backend:
- El frontend envía `tipo_trabajo` (pendiente de añadir en el modelo Django). Se documenta como requisito de backend pendiente.

---

**3) Asignaciones (técnico y fecha) — Servicios Generales**
- Se implementó una tabla dedicada para `Servicios Generales` con columnas específicas:
  - `Técnico Asignado` (muestra nombre del técnico o "Sin Técnico").
  - `Fecha trabajo` (muestra fecha si existe, o `Sin fecha`).
- Botón `Asignar Técnico`: inspirado en el flujo existente de `ListaDetalleTrabajoOT`, ahora disponible para servicios generales. Abre un modal con Formik + validación (Yup) que PATCHea el servicio y crea un seguimiento.
- Botón `Asignar Fecha`: modal para asignar `fecha_servicio` vía PATCH.

Archivos principales modificados:
- `frontend/src/pages/OrdenTrabajo/components/ListaServiciosOT.tsx`  ← componente principal con tabla, columnas, modales y lógica.
- `frontend/src/pages/OrdenTrabajo/modals/AsignarTecnicoDT.tsx` (referencia de flujo reutilizado / inspiración).

Endpoints usados:
- `PATCH /api/ordenes-de-trabajo/{id_orden}/servicios-generales/{id_servicio}/` (actualizar `tecnico_asignado` o `fecha_servicio` o `estado`).
- `POST /.../{id_servicio}/seguimientos/` (crear comentario/seguimiento opcional tras asignación).

Notas técnicas:
- `fecha_servicio` en el backend (modelo `ServicioEnOT`) es `null=True, blank=True` — por eso el frontend muestra `Sin fecha` cuando está ausente y no requiere migración.

---

**4) Ejecución y Control de Estado por Servicio**
- UX para `Estado` de cada servicio:
  - Se renderiza como botón icon-only (sin texto) en la columna `Estado`.
  - Si el servicio está `pendiente` se muestra el icono `Play`.
  - Si faltan prerequisitos (técnico y/o fecha) el botón se muestra en estilo outline/amber y se deshabilita.
  - Tooltip visible al pasar el cursor con la razón: "Requiere técnico asignado y fecha de trabajo para iniciar".
  - Para que el tooltip funcione aun cuando el botón está deshabilitado, el botón está envuelto en un contenedor inline (solución conocida: los elementos deshabilitados no emiten eventos de mouse).
- Cambio de estado (desde ese botón): abre un modal "Cambiar Estado" que permite seleccionar el nuevo estado. Si se selecciona `en_proceso` y faltan técnico/fecha, el modal muestra campos para asignarlos antes de enviar el PATCH. El modal también permite añadir un comentario de seguimiento y crea el seguimiento si existe comentario.

Documentación del comportamiento de validación (frontend-enforced):
- `Pendiente → En Proceso`: Requiere `tecnico_asignado` y `fecha_servicio`.
- El modal verifica que, si el servicio no tiene esos valores, sean provistos dentro del mismo modal; solo entonces se hace el PATCH.

Archivos:
- `frontend/src/pages/OrdenTrabajo/components/ListaServiciosOT.tsx` (Estado button + modal de cambio de estado).

---

**5) Acciones complementarias y orden**
- Orden de botones en la columna `Acciones` para Servicios Generales: `Ver detalle`, `Asignar Técnico`, `Asignar Fecha`, `Eliminar servicio`.
- Delete usa thunk `eliminarServicioGeneralThunk` y refresca la lista.

Archivos relevantes:
- `frontend/src/store/slices/ordenTrabajo/ordenTrabajoSlice.ts` (thunks: listaServiciosGeneralesThunk, crear/actualizar/eliminar servicios, listaTecnicosThunk)
- `frontend/src/pages/OrdenTrabajo/components/ListaServiciosOT.tsx`

---

**6) Consistencia con flujo de Soportes (ListaDetalleTrabajoOT)**
- Se replicó el patrón de `Asignar Técnico` desde `ListaDetalleTrabajoOT` (misma UX, mismo modal/formik). Esto garantiza coherencia de interacción entre soportes y servicios.
- `ListaDetalleTrabajoOT.tsx` no se modificó en comportamiento esencial salvo organización visual previa; se mantuvo el flujo usado como referencia.

Archivo de referencia:
- `frontend/src/pages/OrdenTrabajo/components/ListaDetalleTrabajoOT.tsx`

---

## Archivos modificados (delta desde última versión)

- `frontend/src/pages/OrdenTrabajo/components/ListaServiciosOT.tsx`  — Tabla de Servicios Generales: columnas, botones, modales (Asignar Técnico, Asignar Fecha, Cambiar Estado), validaciones.
- `frontend/src/pages/OrdenTrabajo/modals/AsignarTecnicoDT.tsx` — flujo reutilizado/plantilla (Formik + Yup) (referencia).
- `frontend/src/store/slices/ordenTrabajo/ordenTrabajoSlice.ts` — thunks relacionados con servicios (list, create, update, delete, listar técnicos).
- `frontend/src/pages/OrdenTrabajo/modals/CrearServicioEnOT.tsx` — modal para crear servicios (se mantiene sin poner `fecha_servicio` por defecto).
- `backend/ordentrabajov2/models.py` — confirmación: `fecha_servicio = DateField(null=True, blank=True)` (no se cambió, pero se validó antes de la implementación frontend).
- `docs/CHANGELOG_ORDEN_TRABAJO_V2.md` — actualizado (este archivo).

---

## Comandos sugeridos para validar localmente

Frontend (dev):
```cmd
cd frontend
npm install   # si falta instalar dependencias
npm run dev
```

Backend (dev):
```cmd
cd backend
ENV\Scripts\activate
python manage.py runserver
```

Pruebas y validación manual (mínimo recomendado):
- Crear OT con `tipo_servicio = general`.
- Crear un servicio desde el detalle de la OT (no asignar fecha ni técnico inicialmente) y verificar que la columna `Fecha trabajo` muestre `Sin fecha`.
- Comprobar que el botón `Estado` de ese servicio aparece deshabilitado y que el tooltip muestra la razón.
- Probar `Asignar Técnico` → seleccionar técnico → revisar tabla.
- Probar `Asignar Fecha` → asignar fecha → revisar tabla.
- Abrir modal `Cambiar Estado` desde el botón `Estado` cuando el servicio tenga técnico y fecha y verificar transición a `en_proceso` y creación de seguimiento opcional.

---

## Pruebas automatizadas / Linter

- Ejecutar los linters y, en frontend:
```cmd
cd frontend
npm run lint
npm run prettier:fix
```
- Backend: ejecutar test suite si existe:
```cmd
cd backend
ENV\Scripts\activate
python manage.py test
```

---

## Riesgos y estrategia de rollback

- Riesgo: Diferencias en el formato esperado por el backend para `tecnico_asignado` (string vs number). Si las peticiones PATCH devuelven 400, convertir el `tecnico_asignado` a número antes de enviar.
- Riesgo: `personalizacionUsuario?.empresa` no presente → no se cargan técnicos. Estrategia: comprobar cascade de carga y mostrar mensaje si falta empresa.
- Riesgo: Cambios realizados en la UI pueden entrar en conflicto si el backend aplica reglas de negocio adicionales. Estrategia: agregar logs y toasts descriptivos y coordinar con backend para errores (400/422).

Rollback:
- Revertir cambios en Git por archivo si algo falla:
```cmd
git checkout -- frontend/src/pages/OrdenTrabajo/components/ListaServiciosOT.tsx
git checkout -- frontend/src/store/slices/ordenTrabajo/ordenTrabajoSlice.ts
git commit -m "Revertir: cambios temporales en ListaServiciosOT" # si usas commits
```
- En producción, revertir a commit anterior a la etiqueta de despliegue y redeploy.

---

## Buenas prácticas y recomendaciones posteriores

- Añadir tests E2E que cubran: crear servicio → asignar técnico → asignar fecha → cambiar a `en_proceso`.
- Normalizar el tipo de `tecnico_asignado` en frontend antes de enviar (Number) para evitar discrepancias.
- Añadir un pequeño loading/spinner al abrir modales que cargan `listaTecnicos` para mejor UX.
- Documentar en backend los campos nuevos esperados (`tipo_servicio`, `tipo_trabajo`) y coordinar la implementación de los campos en Django.

---

## Contacto

Para dudas o validaciones adicionales, contactar al equipo de frontend.

**Última actualización:** 20 de Noviembre, 2025
		case 'pendiente':
