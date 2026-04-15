# Auditoria Funcional: Rendiciones de Gastos

**Fecha:** 2026-04-15 | **Modulo:** rendiciones | **Estado:** EN REVISION

---

## 1. Modelos y Estados

| Modelo | Campo estado | Valores posibles |
|--------|-------------|------------------|
| `Rendicion` | `estado` | `"0"` borrador / `"1"` en_espera_aprobacion / `"2"` aprobada / `"3"` rechazada / `"4"` pagada |
| `ItemRendicion` | tipo (GenericFK) | `GastoOperativoEnOt` / `DetalleGastoRendicion` / `Compra` |

### Mapa de transicion de Rendicion

```
"0" (Borrador)
  └→ "1" (En espera de aprobacion)  ← usuario envia para revision
       ├→ "2" (Aprobada)   ← revisado_por + fecha_revision
       │     └→ "4" (Pagada)  ← final
       └→ "3" (Rechazada)   ← motivo_rechazo obligatorio (min 10 chars)
              └→ "1" (Re-enviada para revision)  ← usuario puede reenviar
```

---

## 2. Flujos

### Flujo 1: Creacion de Rendicion

| # | Paso / Comportamiento | Estado actual (codigo) | OK | Discrepancia / Debe hacer |
|---|----------------------|----------------------|----|--------------------------|
| 1 | `POST /api/rendiciones/` crea rendicion en estado `"0"` (borrador) | Implementado | | |
| 2 | Creacion automatica: cuando OT v2 se completa y tiene gastos operativos, se crea `Rendicion` automaticamente | Implementado via signal en `ordentrabajov2` | | |
| 3 | Creacion automatica vincula `orden_trabajo` via campo OneToOne | Implementado | | |
| 4 | Estado inicial siempre `"0"` (borrador) ya sea manual o automatica | Implementado | | |
| 5 | Multi-tenancy: ⚠️ `get_queryset()` NO filtra por empresa | NO implementado — riesgo de fuga de datos | | **CRITICO: usuarios ven rendiciones de otras empresas** |

### Flujo 2: Gestion de Items de Rendicion

| # | Paso / Comportamiento | Estado actual (codigo) | OK | Discrepancia / Debe hacer |
|---|----------------------|----------------------|----|--------------------------|
| 1 | `ItemRendicion` usa GenericForeignKey — puede referenciar 3 tipos de gasto | Implementado via GenericFK | | |
| 2 | Tipo `GastoOperativoEnOt`: gasto registrado directamente en la OT | Implementado | | |
| 3 | Tipo `DetalleGastoRendicion`: gasto libre con categoria y monto | Implementado | | |
| 4 | Tipo `Compra`: compra rapida ya registrada en bodegas | Implementado | | |
| 5 | `CategoriaGastoRendicion`: catalogo de categorias por empresa para organizar gastos | Implementado | | |
| 6 | `total_reembolso_tecnico` = suma de todos los `ItemRendicion.monto` | Calculado automaticamente | | |

### Flujo 3: Envio a aprobacion

| # | Paso / Comportamiento | Estado actual (codigo) | OK | Discrepancia / Debe hacer |
|---|----------------------|----------------------|----|--------------------------|
| 1 | Usuario envia rendicion via accion (o cambio de estado a `"1"`) | Implementado | | |
| 2 | Estado → `"1"` (en espera de aprobacion) | Implementado | | |
| 3 | Solo rendiciones en estado `"1"` pueden ser aprobadas o rechazadas | Validado en actions `aprobar` y `rechazar` | | |

### Flujo 4: Aprobacion

| # | Paso / Comportamiento | Estado actual (codigo) | OK | Discrepancia / Debe hacer |
|---|----------------------|----------------------|----|--------------------------|
| 1 | `POST /api/rendiciones/{id}/aprobar/` aprueba la rendicion | Implementado | | |
| 2 | Validacion: estado debe ser `"1"` | Implementado | | |
| 3 | Al aprobar: `estado = "2"`, `revisado_por = request.user`, `fecha_revision = now()` | Implementado | | |
| 4 | Compras asociadas via `ItemRendicion`: estado → `"R"` (rendida) | Implementado en `rendiciones/views.py` | | |
| 5 | `POST /api/rendiciones/{id}/pagar/` marca rendicion como pagada | Implementado | | |
| 6 | Validacion para pagar: estado debe ser `"2"` (aprobada) | Implementado | | |
| 7 | Al pagar: estado → `"4"` (pagada) — estado terminal | Implementado | | |

### Flujo 5: Rechazo

| # | Paso / Comportamiento | Estado actual (codigo) | OK | Discrepancia / Debe hacer |
|---|----------------------|----------------------|----|--------------------------|
| 1 | `POST /api/rendiciones/{id}/rechazar/` rechaza con motivo obligatorio | Implementado | | |
| 2 | Validacion: estado debe ser `"1"` | Implementado | | |
| 3 | Validacion: `motivo_rechazo` minimo 10 caracteres | Implementado | | |
| 4 | Al rechazar: `estado = "3"`, `revisado_por = request.user`, `fecha_revision = now()` | Implementado | | |
| 5 | Compras asociadas via `ItemRendicion`: estado → `"C"` (cancelada) | Implementado en `rendiciones/views.py` | | |
| 6 | Usuario puede re-enviar rendicion rechazada (vuelve a `"1"`) | Implementado | | |

---

## 3. Reglas de Negocio

| # | Regla | Implementada en | OK | Observacion |
|---|-------|----------------|----|-----------  |
| 1 | `motivo_rechazo` es obligatorio y debe tener al menos 10 caracteres | `rendiciones/views.py` action `rechazar` | | |
| 2 | Solo estado `"1"` puede ser aprobado o rechazado (no `"0"` ni `"3"`) | Validado en actions | | |
| 3 | Solo estado `"2"` puede ser marcado como pagado | Validado en action `pagar` | | |
| 4 | Compras asociadas cambian de estado al aprobar/rechazar la rendicion | `rendiciones/views.py` | | |
| 5 | Creacion automatica al completar OT v2 con gastos operativos | Signal en `ordentrabajov2` | | |
| 6 | Una OT v2 solo puede tener una rendicion (relacion `OneToOne`) | `Rendicion.orden_trabajo` OneToOne | | |
| 7 | ⚠️ Multi-tenancy NO implementada en `RendicionViewSet.get_queryset()` | FALTA implementar | | **CRITICO** |

---

## 4. Side-effects (signals, auto-transiciones)

| Evento disparador | Efecto automatico | Ubicacion |
|------------------|-------------------|-----------|
| OT v2 pasa a estado `completada` con gastos operativos | Crea `Rendicion` en borrador vinculada a la OT | Signal en `ordentrabajov2` |
| Aprobar rendicion | Compras vinculadas → estado `"R"` (rendida) | `rendiciones/views.py` |
| Rechazar rendicion | Compras vinculadas → estado `"C"` (cancelada) | `rendiciones/views.py` |

---

## 5. Endpoints principales

| Metodo | URL | Descripcion | Auth |
|--------|-----|-------------|------|
| GET | `/api/rendiciones/` | Lista ALL rendiciones (⚠️ sin filtro empresa) | JWT |
| POST | `/api/rendiciones/` | Crear rendicion manualmente | JWT |
| GET | `/api/rendiciones/{id}/` | Detalle de rendicion | JWT |
| POST | `/api/rendiciones/{id}/aprobar/` | Aprobar rendicion | JWT |
| POST | `/api/rendiciones/{id}/rechazar/` | Rechazar con motivo obligatorio | JWT |
| POST | `/api/rendiciones/{id}/pagar/` | Marcar como pagada | JWT |
| GET | `/api/items-rendicion/` | Lista items de rendicion | JWT |
| POST | `/api/items-rendicion/` | Agregar item a rendicion | JWT |
| GET | `/api/categorias-gasto/` | Catalogo de categorias | JWT |
| POST | `/api/categorias-gasto/` | Crear categoria | JWT |

---

## 6. Checklist general del modulo Rendiciones

### Creacion
- [ ] Rendicion manual empieza en estado `"0"` (borrador)
- [ ] Creacion automatica al completar OT v2 con gastos: vinculada via `OneToOne`
- [ ] Una OT v2 no puede tener mas de una rendicion

### Items
- [ ] Items de tipo `GastoOperativoEnOt` se agregan correctamente
- [ ] Items de tipo `DetalleGastoRendicion` se agregan con categoria y monto
- [ ] Items de tipo `Compra` referencian compras existentes en bodegas
- [ ] `total_reembolso_tecnico` suma correctamente todos los items

### Flujo de aprobacion
- [ ] Solo estado `"1"` puede aprobarse o rechazarse
- [ ] Aprobar: `revisado_por` y `fecha_revision` se registran
- [ ] Compras vinculadas pasan a `"R"` al aprobar
- [ ] Rechazo requiere `motivo_rechazo` de al menos 10 caracteres
- [ ] Compras vinculadas pasan a `"C"` al rechazar
- [ ] Rendicion rechazada puede re-enviarse (vuelve a `"1"`)
- [ ] Solo estado `"2"` puede marcarse como pagado → estado terminal `"4"`

### Seguridad
- [ ] ⚠️ PENDIENTE: implementar filtro multi-tenancy en `get_queryset()` para evitar fuga de datos entre empresas

---

*Ultima revision:* ___________  *Revisado por:* ___________
