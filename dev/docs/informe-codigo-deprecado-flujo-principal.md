# Informe de código deprecado del flujo principal (Backend y Frontend)

Fecha: 2026-04-15
Issue: #33
Repositorio: `erp-snabbit`

## 1. Resumen ejecutivo

Se revisó el flujo principal asociado a contratos, órdenes de trabajo y prefacturación, considerando el recorrido end-to-end más visible hoy en el sistema:

- **Contratos**
- **Órdenes de trabajo** (coexistencia de V2 y V3)
- **Prefacturación / cierre administrativo OTV3**
- **Pantallas frontend y capas API que consumen ese flujo**

### Conclusión breve

El repositorio muestra una **migración incremental, no cerrada**, donde conviven:

- código **vigente** del flujo actual,
- código **legacy mantenido por compatibilidad**,
- y código **probablemente en desuso** pero aún presente en rutas, modelos, adaptadores o archivos de respaldo.

Los focos principales detectados son:

1. **Coexistencia de OT V2 y OTV3** en backend y frontend.
2. **Compatibilidad legacy en prefacturación OTV3** (`ot` / `ot_id`) mientras el modelo nuevo ya usa M2M (`ots` / `ot_ids`).
3. **Campos, endpoints y UI deprecated** para vincular guías 1:1 a servicios/soportes de OT V2.
4. **Campos y serialización legacy** en contratos, rendiciones y otros módulos del flujo.
5. **Artefactos de respaldo (`.bkp`, `frontend/bkp`) y placeholders** que aumentan ruido técnico y riesgo de mantener código muerto.

---

## 2. Alcance analizado

### Backend

Se revisaron principalmente:

- `backend/sw_erp/urls.py`
- `backend/ordentrabajov2/*`
- `backend/ordentrabajov3/*`
- `backend/contratos/*`
- `backend/rendiciones/*`

### Frontend

Se revisaron principalmente:

- `frontend/src/routes/contentRoutes.tsx`
- `frontend/src/pages/OrdenTrabajo/*`
- `frontend/src/pages/OrdenTrabajoV3/*`
- `frontend/src/store/slices/ordenTrabajo/*`
- `frontend/src/store/slices/ordenTrabajoV3/*`
- `frontend/src/interface/ordenTrabajoV3.interface.ts`
- archivos de respaldo en `frontend/bkp` y `*.bkp`

### Criterio usado

Se consideró como código deprecado / legado / en desuso todo lo que cumple uno o más de estos puntos:

- explícitamente marcado como `deprecated`, `legacy`, `compatibilidad`, `backward`, `V1 desactivada`, etc.;
- sustituido por una implementación nueva pero aún conservado;
- rutas o capas de integración mantenidas solo para clientes antiguos;
- archivos de respaldo o placeholders que no forman parte clara del flujo vigente;
- zonas donde el código actual ya expresa que el camino recomendado es otro.

---

## 3. Hallazgos Backend

### B1. Backend mantiene OT V1 desactivada, pero el módulo sigue presente en el repo

**Evidencia**

- `backend/sw_erp/urls.py`
  - `# path('api/', include('ordentrabajo.urls')),  # V1 - DESACTIVADA - Usar ordentrabajov2`
- El directorio `backend/ordentrabajo/` sigue existiendo con modelos, views y urls.

**Qué indica**

La app antigua de órdenes de trabajo (**V1**) ya no está conectada al enrutado principal, pero su código permanece en el repositorio.

**Impacto / riesgo**

- Aumenta el costo de comprensión del dominio OT.
- Puede inducir a error en futuras búsquedas o refactors.
- Favorece regressions si alguien reutiliza por accidente lógica no vigente.

**Prioridad sugerida**: Alta.

---

### B2. OT V2 sigue siendo capa de compatibilidad mientras OTV3 ya es el flujo nuevo

**Evidencia**

- `backend/sw_erp/urls.py`
  - `path("api/", include("ordentrabajov2.urls"))`
  - `path("api/v3/", include("ordentrabajov3.urls"))`
- `backend/ordentrabajov2/urls.py`
  - comentarios como `Alias para compatibilidad con clientes que usan "ordenes-trabajo"`
  - alias `cierres-administrativos` para compatibilidad frontend
  - rutas `usuarios-vinculados` y `retroalimentaciones` anotadas como `Compatibilidad: rutas antiguas usadas por frontend (v1)`

**Qué indica**

La V2 no parece ser puro flujo nuevo: también cumple rol de **puente de compatibilidad** para consumidores previos.

**Impacto / riesgo**

- Mantiene mayor superficie API de la necesaria.
- Complica cerrar contratos de interfaz entre frontend y backend.
- La coexistencia con OTV3 hace más costosa cualquier simplificación de negocio o reporting.

**Prioridad sugerida**: Alta.

---

### B3. Funcionalidad 1:1 de guías en OT V2 está formalmente deprecada, pero sigue en modelos y endpoints

**Evidencia**

- `backend/ordentrabajov2/DEPRECATION_NOTICE.md`
  - declara deprecated la vinculación de guías 1:1 a servicios y soportes.
- `backend/ordentrabajov2/models.py`
  - `SoporteTecnico.guia_salida` con comentario `⚠️ DEPRECATED (2026-01): No usar para vincular guías.`
  - `ServicioEnOT.guia_salida` con el mismo comentario.
- `backend/ordentrabajov2/DEPRECATION_NOTICE.md`
  - lista endpoints deprecated:
    - `.../soportes-tecnicos/{id}/asociar-guia/`
    - `.../soportes-tecnicos/{id}/desasociar-guia/`
    - `.../servicios-generales/{id}/asociar-guia/`
    - `.../servicios-generales/{id}/desasociar-guia/`

**Qué indica**

El camino viejo todavía existe por compatibilidad, aunque el modelo operativo nuevo es **vincular guías a la OT directamente**.

**Impacto / riesgo**

- Riesgo de doble comportamiento en producción según qué cliente consuma la API.
- Mayor dificultad para migrar datos históricos y simplificar modelos.
- Posibles errores si un cambio futuro asume que solo existe la relación nueva OT↔guías.

**Prioridad sugerida**: Muy alta.

---

### B4. Prefacturación OTV3 sigue cargando compatibilidad legacy `ot`/`ot_id` aunque el modelo nuevo ya es multi-OT

**Evidencia**

- `backend/ordentrabajov3/models.py`
  - campo `ot = models.OneToOneField(... verbose_name="Orden de trabajo V3 (legacy, usar ots)")`
  - campo nuevo `ots = models.ManyToManyField(...)`
- `backend/ordentrabajov3/views.py`
  - docstring del `PrefacturaOTV3ViewSet`: `compat legacy: { ot_id: int } mapea a ot_ids=[ot_id]`
  - lógica `ot_id_legacy = request.data.get("ot_id") or request.data.get("ot")`
- `backend/ordentrabajov3/tests/test_prefactura_otv3.py`
  - tests explícitos de compatibilidad legacy (detectados por búsqueda)

**Qué indica**

El flujo de prefacturación V3 ya migró a **multi-OT**, pero sigue arrastrando un contrato legacy de entrada y persistencia para clientes viejos o datos históricos.

**Impacto / riesgo**

- Duplica reglas de validación y mantenimiento.
- Hace más difícil razonar sobre la fuente de verdad de una prefactura.
- Puede romper integraciones si se elimina sin inventario previo de consumidores.

**Prioridad sugerida**: Muy alta.

---

### B5. Helper de prefactura OTV3 todavía hace fallback a modelos legacy de contratos

**Evidencia**

- `backend/ordentrabajov3/helpers_prefactura.py`
  - `Fuente primaria: ContratoItemComercial (modelo vigente)`
  - `Fallback: ContratoServicio + ContratoLicencia (legacy) si no hay items_comerciales.`
  - comentario `Fallback: modelos legacy ContratoServicio + ContratoLicencia`

**Qué indica**

El flujo actual ya reconoce como modelo vigente `ContratoItemComercial`, pero necesita seguir soportando contratos antiguos o incompletamente migrados.

**Impacto / riesgo**

- Riesgo de diferencias funcionales entre contratos nuevos y antiguos.
- Mantiene lógica de facturación más compleja de lo necesario.
- Un refactor puede romper contratos históricos si no hay migración de datos previa.

**Prioridad sugerida**: Alta.

---

### B6. Contratos mantiene sincronización de campos legacy en vínculos de licencias

**Evidencia**

- `backend/contratos/models.py`
  - método `_sincronizar_campos_legacy()`
  - sincroniza `usuario`, `nombre` y `correo_generico` a partir de `correo_persona`

**Qué indica**

La capa de contratos tiene datos y/o consumidores que todavía dependen de un esquema previo. El modelo nuevo convive con columnas antiguas para no romper compatibilidad.

**Impacto / riesgo**

- Riesgo de inconsistencias si la sincronización falla o se salta.
- Más complejidad en validaciones y saves.
- Dificulta entender cuál es la fuente de verdad del vínculo.

**Prioridad sugerida**: Media-Alta.

---

### B7. Rendiciones conserva campos legacy que ya no representan el modelo actual

**Evidencia**

- `backend/rendiciones/serializers.py`
  - comentario `Campos legacy (mantener compatibilidad)`
  - campo `total` con docstring `Legacy field - mantiene compatibilidad con frontend existente`
- `backend/rendiciones/models.py`
  - propiedad `total_no_facturable`: `Se mantiene por compatibilidad pero no se usa.`
  - propiedad `total_rendicion`: `Mantener compatibilidad: retorna total reembolso`

**Qué indica**

La API de rendiciones sigue exponiendo nombres y semánticas heredadas para no romper el frontend actual o integraciones previas.

**Impacto / riesgo**

- Riesgo de que consumidores sigan dependiendo de campos que conceptualmente ya quedaron viejos.
- Dificulta saneamiento del modelo económico de rendiciones.

**Prioridad sugerida**: Media.

---

## 4. Hallazgos Frontend

### F1. El frontend sigue exponiendo OT clásica y OTV3 en paralelo

**Evidencia**

- `frontend/src/routes/contentRoutes.tsx`
  - rutas activas para `Pages.ordenTrabajo.*` (`ListaOT`, `DetalleOT`)
  - rutas activas para `Pages.ordenTrabajoV3.*` (`ListaOTV3`, `DetalleOTV3`)

**Qué indica**

El frontend todavía mantiene dos experiencias de OT dentro del flujo principal. Eso suele ser señal de transición incompleta o convivencia operacional.

**Impacto / riesgo**

- Duplicación de UI, estado, bugs y soporte.
- Más difícil unificar métricas, onboarding y documentación interna.
- Mayor fricción para nuevos desarrolladores.

**Prioridad sugerida**: Muy alta.

---

### F2. Ruta legacy de creación de prefactura OTV3 redirige al flujo nuevo, pero la compatibilidad sigue viva

**Evidencia**

- `frontend/src/routes/contentRoutes.tsx`
  - componente `RedirectCrearPrefacturaOTV3Legacy`
  - redirige desde `Pages.facturacion.subPages.crearPrefacturaOTV3.to` a `matchingManualOTV3`

**Qué indica**

Ya hubo reemplazo de pantalla / entrypoint, pero se mantiene la URL antigua para no romper bookmarks, navegación o dependencias externas.

**Impacto / riesgo**

- La compatibilidad es razonable en el corto plazo, pero mantiene deuda si nunca se retira.
- Puede ocultar dependencias reales sobre la ruta vieja.

**Prioridad sugerida**: Media-Alta.

---

### F3. Tipos y normalización frontend de OTV3 siguen aceptando campos deprecated (`ot`, `ot_id`)

**Evidencia**

- `frontend/src/interface/ordenTrabajoV3.interface.ts`
  - `IPrefacturaOTV3.ot` documentado con `@deprecated Usar ots (M2M)`
  - `ICreatePrefacturaV3Payload.ot_id` documentado con `@deprecated Compatibilidad legacy — usar ot_ids`
- `frontend/src/store/slices/ordenTrabajoV3/ordenTrabajoV3Api.ts`
  - `normalizePrefacturaOTV3` sigue mapeando respuesta tolerante a payloads viejos/nuevos

**Qué indica**

El frontend todavía soporta payloads y estructuras heredadas en la capa de integración, aunque el dominio nuevo ya migró.

**Impacto / riesgo**

- Aumenta complejidad de tipos y adapters.
- Puede esconder errores de contrato API al “normalizar demasiado”.
- Hace más difícil cerrar la migración multi-OT.

**Prioridad sugerida**: Alta.

---

### F4. UI de OT clásica aún contiene llamadas explícitas a endpoints deprecated de guías 1:1

**Evidencia**

- `frontend/src/pages/OrdenTrabajo/components/ListaServiciosOT.tsx`
  - comentario `DEPRECATED NOTICE (2026-01)`
  - llamadas a:
    - `/api/ordenes-de-trabajo/{id}/servicios-generales/{id}/asociar-guia/`
    - `/api/ordenes-de-trabajo/{id}/servicios-generales/{id}/desasociar-guia/`
- `frontend/src/pages/OrdenTrabajo/components/ListaSoportesTecnicosOT.tsx`
  - llamada a `/api/ordenes-de-trabajo/{id}/soportes-tecnicos/{id}/desasociar-guia/`
- `frontend/src/pages/OrdenTrabajo/modals/ModalVincularGuia.tsx`
  - todavía contempla ramas que usan endpoints antiguos sobre servicio/soporte

**Qué indica**

Aunque existe la nueva UX para vincular guías directamente a la OT, parte del frontend sigue invocando el camino viejo.

**Impacto / riesgo**

- Mantiene vivo un comportamiento que backend ya considera deprecated.
- Riesgo alto de inconsistencia entre pantallas y datos.
- Hace más difícil retirar los endpoints viejos en backend.

**Prioridad sugerida**: Muy alta.

---

### F5. Slice de OT clásica mezcla endpoints nuevos, aliases y rutas antiguas

**Evidencia**

- `frontend/src/store/slices/ordenTrabajo/ordenTrabajoApi.ts`
  - usa `/api/ordenes-de-trabajo/...`
  - pero también conserva varias llamadas con `/api/ordenes-trabajo/...`
  - mantiene operaciones ligadas al modelo viejo `detalles-trabajo` y varias rutas de compatibilidad

**Qué indica**

La capa API del frontend es una de las principales concentraciones de deuda legacy. No es solo UI antigua: también el acceso a datos sigue cargando contratos heredados.

**Impacto / riesgo**

- Alto riesgo de romper compatibilidad en refactors.
- Mayor dificultad para auditar qué endpoints están realmente en uso productivo.
- Duplicidad semántica entre alias y endpoints canónicos.

**Prioridad sugerida**: Muy alta.

---

### F6. Existen thunks placeholder para sostener DetalleOT

**Evidencia**

- `frontend/src/store/slices/ordenTrabajo/thunks.ts`
  - comentario: `TODO: These thunks are placeholders to keep DetalleOT running.`
  - múltiples thunks retornan `undefined`

**Qué indica**

Hay parte del flujo OT clásico que sobrevive con andamiaje temporal o incompleto.

**Impacto / riesgo**

- Señal de deuda técnica estructural.
- Riesgo de errores silenciosos o comportamientos engañosos.
- Complica saber qué piezas siguen siendo relevantes.

**Prioridad sugerida**: Alta.

---

### F7. Archivos `.bkp` y directorios `frontend/bkp` sugieren código muerto o fuera del flujo real

**Evidencia**

Ejemplos detectados:

- `frontend/bkp/DetalleDelContratoDelCliente.tsx.bkp`
- `frontend/bkp/ListaClientes.tsx.bkp`
- `frontend/src/pages/OrdenTrabajo/components/CotizacionesEnOT.tsx.bkp`
- `frontend/src/pages/OrdenTrabajo/modals/CompletarCompraDT.tsx.bkp`
- decenas de archivos adicionales `*.bkp`

**Qué indica**

Hay material de respaldo dentro del árbol principal del frontend. Aunque no necesariamente entra al build, sí agrega ruido y puede confundir búsquedas, revisiones o herramientas.

**Impacto / riesgo**

- Ruido alto en mantenimiento.
- Riesgo de copiar código obsoleto al implementar cambios.
- Peor experiencia de búsqueda (`rg`, IDE, indexing).

**Prioridad sugerida**: Media-Alta.

---

## 5. Riesgos / impacto

### Riesgos técnicos

- **Duplicación funcional**: coexistencia OT clásica / OTV3 y contratos de compatibilidad múltiples.
- **Divergencia de negocio**: contratos o prefacturas antiguas pueden seguir caminos distintos a los nuevos.
- **Refactors peligrosos**: eliminar un alias o un campo “legacy” puede romper pantallas o datos históricos.
- **Mayor costo de testing**: cada cambio relevante debe validarse sobre varios caminos funcionales.
- **Complejidad cognitiva**: el repositorio mezcla código vigente, compatibilidad y backups en el mismo espacio.

### Riesgos operativos

- Usuarios o integraciones internas podrían seguir usando rutas legacy sin que eso sea evidente.
- La migración parcial dificulta cerrar políticas de soporte (“qué flujo es el oficial”).
- Eliminar deprecated sin telemetría o inventario previo puede producir fallas silenciosas.

---

## 6. Recomendaciones priorizadas

### Prioridad 1 — bloquear crecimiento de la deuda

1. **Definir oficialmente el flujo canónico** para OT y prefacturación:
   - confirmar si el flujo oficial es `OTV3 + prefactura multi-OT + contratos con items_comerciales`.
2. **Congelar nuevas integraciones sobre APIs legacy**:
   - no permitir nuevos consumos sobre `ot_id`, `ot`, `ordenes-trabajo`, endpoints 1:1 de guías, etc.
3. **Instrumentar uso real** de endpoints legacy antes de eliminar:
   - logs, métricas o auditoría temporal por endpoint/campo.

### Prioridad 2 — limpiar compatibilidad con mayor retorno

4. **Retirar gradualmente la vinculación 1:1 de guías en OT V2**:
   - primero frontend (`ListaServiciosOT`, `ListaSoportesTecnicosOT`, `ModalVincularGuia`),
   - luego endpoints backend,
   - finalmente campos de modelo `guia_salida`.
5. **Cerrar la migración de prefactura OTV3**:
   - deprecar efectivamente `ot` / `ot_id`,
   - migrar consumidores a `ots` / `ot_ids`,
   - dejar claro cuándo se eliminará el fallback.
6. **Reducir aliases API innecesarios**:
   - documentar uno canónico y uno temporal;
   - eliminar aliases una vez validado uso.

### Prioridad 3 — saneamiento estructural

7. **Separar o archivar código V1/V2 fuera del flujo principal**:
   - especialmente `backend/ordentrabajo/` si ya no tiene uso operativo.
8. **Mover backups fuera del árbol de aplicación**:
   - por ejemplo a `dev/archive/` o eliminarlos si ya están en Git.
9. **Eliminar placeholders frontend** que solo “mantienen vivo” DetalleOT sin implementación real.
10. **Documentar un mapa de migración** con fecha objetivo por cada pieza legacy.

---

## 7. Próximos pasos sugeridos

### Corto plazo

- Crear inventario de consumo real de:
  - `/api/ordenes-trabajo/*`
  - endpoints `asociar-guia` / `desasociar-guia`
  - payloads `ot_id` / `ot`
- Acordar una matriz de decisión:
  - **vigente**,
  - **compatibilidad temporal**,
  - **remover**.

### Mediano plazo

- Abrir tareas separadas para:
  1. limpieza de guías legacy OT V2,
  2. cierre de compatibilidad `PrefacturaOTV3.ot` / `ot_id`,
  3. retiro de aliases `ordenes-trabajo`,
  4. limpieza de `.bkp` y `frontend/bkp`,
  5. evaluación de archivo o remoción de `backend/ordentrabajo/`.

### Largo plazo

- Consolidar en documentación técnica un único flujo soportado de contratos → OT → prefactura → facturación.
- Convertir la deprecación en una política explícita con fechas y responsables.

---

## 8. Dudas / zonas grises

1. **No se puede confirmar solo por lectura estática** qué porcentaje del tráfico real sigue usando OT V2, aliases o endpoints deprecated.
2. La existencia de código V1/V2 no implica automáticamente que esté “muerto”; parte puede seguir siendo necesaria para datos históricos o clientes internos.
3. Los archivos `.bkp` probablemente no participan del build, pero sí son una señal clara de deuda de mantenimiento.
4. En contratos y rendiciones hay compatibilidad evidente, pero para una eliminación segura faltaría revisar migraciones, fixtures, uso productivo y dependencias externas.

---

## 9. Resumen de hallazgos más relevantes

### Backend

- `backend/sw_erp/urls.py`: OT V1 desactivada pero código aún presente.
- `backend/ordentrabajov2/urls.py`: múltiples aliases y rutas de compatibilidad.
- `backend/ordentrabajov2/models.py`: campos `guia_salida` deprecated en servicio/soporte.
- `backend/ordentrabajov3/models.py`: `PrefacturaOTV3.ot` legacy; `ots` es el modelo nuevo.
- `backend/ordentrabajov3/views.py`: aceptación explícita de `ot_id` / `ot` por compatibilidad.
- `backend/ordentrabajov3/helpers_prefactura.py`: fallback a contratos legacy.
- `backend/contratos/models.py`: sincronización de campos legacy.
- `backend/rendiciones/serializers.py` y `backend/rendiciones/models.py`: campos legacy aún expuestos.

### Frontend

- `frontend/src/routes/contentRoutes.tsx`: conviven OT clásica y OTV3; existe redirect legacy para prefactura.
- `frontend/src/interface/ordenTrabajoV3.interface.ts`: tipos deprecated `ot` y `ot_id`.
- `frontend/src/store/slices/ordenTrabajoV3/ordenTrabajoV3Api.ts`: normalización tolerante a payloads legacy.
- `frontend/src/pages/OrdenTrabajo/components/ListaServiciosOT.tsx`: consumo explícito de endpoints deprecated de guías.
- `frontend/src/pages/OrdenTrabajo/modals/ModalVincularGuia.tsx`: mantiene ramas de comportamiento antiguo.
- `frontend/src/store/slices/ordenTrabajo/ordenTrabajoApi.ts`: alta concentración de compatibilidad legacy y aliases.
- `frontend/src/store/slices/ordenTrabajo/thunks.ts`: placeholders.
- `frontend/bkp` y múltiples `*.bkp`: probable código muerto o fuera de uso.
