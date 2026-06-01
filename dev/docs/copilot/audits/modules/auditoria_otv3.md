# Auditoria Funcional: Ordenes de Trabajo V3 (OTV3)

**Fecha:** 2026-04-15 | **Modulo:** ordentrabajov3 | **Estado:** EN REVISION  
**Referencia cruzada:** `dev/docs/analisis.md` (analisis de prefacturacion/matching manual)

---

## 1. Modelos y Estados

| Modelo | Campo estado | Valores posibles |
|--------|-------------|------------------|
| `OrdenDeTrabajoV3` | `estado` | `borrador` / `preparacion` / `en_ejecucion` / `retroalimentacion` / `por_facturar` / `facturada` / `cerrada` / `cancelada` |
| `TareaOTV3` | `estado` | `pendiente` / `en_proceso` / `completada` / `no_realizada` |
| `PrefacturaOTV3` | `estado_cierre` | `borrador` / `por_facturar` / `facturado` |
| `ContratoLicencia` | *(referenciado desde contratos)* | — |

### Mapa de transicion de OrdenDeTrabajoV3

```
borrador
  └→ preparacion (requiere tecnico_responsable O lider asignado)
       └→ en_ejecucion (requiere cotizacion o descripcion; sin items sin receptor; sin guias sin firmar de cotizaciones)
            └→ retroalimentacion (requiere: sin tareas incompletas; sin guias sin firmar)
                 └→ por_facturar (transicion manual tras proceso de retroalimentacion)
                      └→ facturada (requiere prefactura en estado por_facturar o facturado)
                           └→ cerrada (cierre definitivo)

Desde cualquier estado:
  → cancelada (cleanup atomico: elimina prefacturas borrador si OT es unica, libera series, limpia M2M)
```

---

## 2. Flujos

### Flujo 1: Creacion de OT V3

| # | Paso / Comportamiento | Estado actual (codigo) | OK | Discrepancia / Debe hacer |
|---|----------------------|----------------------|----|--------------------------|
| 1 | `POST /api/v3/ordenes/` crea OT en estado `borrador` | Implementado en `OrdenDeTrabajoV3ViewSet.create()` | | |
| 2 | `modalidad` se asigna automaticamente segun `tipo_servicio` | Implementado en `OrdenDeTrabajoV3WriteSerializer.create()` | | |
| 3 | Signal `post_save` crea registro inicial en `HistorialEstadoOTV3` con comentario "OT creada" | Implementado en `ordentrabajov3/signals.py` | | |
| 4 | Multi-tenancy: queryset filtra por empresa del usuario autenticado | Implementado en `get_queryset()` | | |

### Flujo 2: Configuracion inicial (Borrador → Preparacion)

| # | Paso / Comportamiento | Estado actual (codigo) | OK | Discrepancia / Debe hacer |
|---|----------------------|----------------------|----|--------------------------|
| 1 | Asignar `tecnico_responsable` o crear `AsignacionTecnicoOTV3` con `rol=lider` | Bloqueador validado en `_validar_bloqueadores_transicion()` | | |
| 2 | Vincular cotizacion via `POST /ordenes/{id}/vincular-cotizacion/` | Implementado. Auto-propaga OCs derivadas y guias vinculadas | | |
| 3 | Vincular `cliente_solicitante` (puede crear prospecto con `crear-solicitante-prospecto`) | Implementado. Crea `User` + `UsuarioEmpresa` si es prospecto | | |
| 4 | `POST /ordenes/{id}/cambiar-estado/ {estado: "preparacion"}` | Valida bloqueadores antes de transicionar | | |
| 5 | Historial de estado se actualiza automaticamente por signal | `HistorialEstadoOTV3` con `estado_anterior`, `estado_nuevo` | | |

### Flujo 3: Ejecucion (Preparacion → En Ejecucion → Retroalimentacion)

| # | Paso / Comportamiento | Estado actual (codigo) | OK | Discrepancia / Debe hacer |
|---|----------------------|----------------------|----|--------------------------|
| 1 | Bloqueadores para `en_ejecucion`: cotizacion O descripcion rellenada | Validado en `_validar_bloqueadores_transicion()` | | |
| 2 | Bloqueadores: sin items serializados sin `usuario_receptor` asignado | Validado antes de transicion | | |
| 3 | Bloqueadores: sin guias vinculadas a cotizaciones sin firmar | Validado antes de transicion | | |
| 4 | Al pasar a `en_ejecucion`: `fecha_inicio_real = now()` | Implementado automaticamente | | |
| 5 | Creacion de tareas y checklist via endpoints nested `/ordenes/{id}/tareas/` | Implementado en `TareaOTV3ViewSet` | | |
| 6 | Bloqueadores para `retroalimentacion`: sin tareas en estado `pendiente` o `en_proceso` | Validado en `_validar_bloqueadores_transicion()` | | |
| 7 | Al pasar a `retroalimentacion`: `fecha_finalizacion_real = now()` | Implementado automaticamente | | |
| 8 | Al pasar a `retroalimentacion`: Celery task `crear_y_enviar_retroalimentacion_v3.delay(ot.id)` | Implementado via Celery | | |
| 9 | `POST /ordenes/{id}/check-avance/` retorna proximo estado posible + lista de bloqueadores | Implementado en `OrdenDeTrabajoV3ViewSet.check_avance()` | | |

### Flujo 4: Guia Rapida (despacho de items)

| # | Paso / Comportamiento | Estado actual (codigo) | OK | Discrepancia / Debe hacer |
|---|----------------------|----------------------|----|--------------------------|
| 1 | `POST /ordenes/{id}/crear-guia-rapida/` crea `GuiaSalida` en estado `P` (pendiente firma) | Implementado en accion `crear-guia-rapida` | | |
| 2 | Si item tiene serie (serializado): valida serie disponible, registra salida, reserva serie | Implementado con `registrar_salida(cantidad=1)` | | |
| 3 | Si item NO tiene serie: valida stock suficiente, registra salida de cantidad N | Implementado con `registrar_salida(cantidad=N)` | | |
| 4 | Ingresos externos opcionales: crea `StockItemEnBodega` si no existe, registra entrada, luego despacha | Implementado | | |
| 5 | Toda la operacion (guia + items + movimientos) es una transaccion atomica. Si falla → rollback total | Implementado con `transaction.atomic()` | | |
| 6 | OT puede tener multiples guias; cada una puede tener items mixtos (serializados y no serializados) | Implementado | | |

### Flujo 5: Tareas con firma (entrega de equipo)

| # | Paso / Comportamiento | Estado actual (codigo) | OK | Discrepancia / Debe hacer |
|---|----------------------|----------------------|----|--------------------------|
| 1 | `TareaOTV3` con `tipo_tarea=entrega_equipo` requiere guia firmada antes de completarse | Validado en `TareaOTV3ViewSet` antes de completar | | |
| 2 | `POST /ordenes/{id}/tareas/{tk}/completar-con-firma/` acepta `firma_datos` (nombre + firma_base64) | Implementado | | |
| 3 | Si item serializado: crea `UsuarioEquipo` (equipo → usuario_receptor), desactiva asignaciones previas | Implementado | | |
| 4 | Si item NO serializado: crea `ItemAsignadoUsuario` (cantidad → usuario_receptor), desactiva previos | Implementado | | |
| 5 | Solo puede crearse `ItemAsignadoUsuario` desde `ItemsGuiaSalida` de OT V3 (version=3) | Validado por constraint en modelo | | |
| 6 | Se persisten `firma_datos`, `usuario_equipo_ids` / `item_asignado_ids` en `TareaOTV3` | Implementado | | |
| 7 | `POST /ordenes/{id}/crear-tareas-entrega-guia/` crea tareas tipo `entrega_equipo` con `usuario_receptor` | Implementado | | |

### Flujo 6: Prefacturacion (Por Facturar → Facturada)

| # | Paso / Comportamiento | Estado actual (codigo) | OK | Discrepancia / Debe hacer |
|---|----------------------|----------------------|----|--------------------------|
| 1 | `GET /api/v3/prefacturas-otv3/ots-elegibles/?cliente_id=X` retorna OTs en `por_facturar` sin prefactura activa | Implementado | | |
| 2 | `POST /api/v3/prefacturas-otv3/` crea prefactura. Valida: todas OTs mismo cliente, en `por_facturar`, sin prefacturas activas | Implementado con lock atomico (SELECT FOR UPDATE) | | |
| 3 | Prefactura puede agrupar multiples OTs (M2M `ots`) y multiples contratos (M2M `contratos`) | Implementado | | |
| 4 | Si resultado enviado en creacion, se valida y persiste en `PrefacturaOTV3.resultado` (JSON snapshot) | Implementado | | |
| 5 | Tasas de cambio (dolar/UF) se resuelven al crear la prefactura (de mindicador o override manual) | Implementado en `resolver_tasas_cambio_prefactura()` | | |
| 6 | `POST /api/v3/prefacturas-otv3/{id}/finalizar/` transiciona prefactura `borrador → por_facturar` | Implementado | | |
| 7 | `POST /api/v3/prefacturas-otv3/{id}/asociar-documento/` transiciona `por_facturar → facturado` | Implementado | | |
| 8 | Al asociar documento: OTs avanzan automaticamente. Si hay items excluidos → `parcialmente_facturada`; sino → `facturada` | Implementado en `asociar_documento` action | | |
| 9 | `PrefacturaOTV3` persiste `moneda_prefactura`, `tasa_dolar_usada`, `tasa_uf_usada` como snapshot economico | Implementado | | |

### Flujo 7: Matching Manual (Comparativa pactado vs ejecutado)

| # | Paso / Comportamiento | Estado actual (codigo) | OK | Discrepancia / Debe hacer |
|---|----------------------|----------------------|----|--------------------------|
| 1 | `POST /api/v3/prefacturas-otv3/comparativa/` recibe `ot_ids[]`, `contrato_ids[]`, `fecha`, `moneda_objetivo` | Implementado en `PrefacturaOTV3ViewSet.comparativa()` | | |
| 2 | Pactado: fuente primaria es `ContratoItemComercial.num_visitas_mensuales` (NO `ContratoVisita`) | Implementado en `_resolve_visitas_mensuales_item()` (ver `dev/docs/analisis.md`) | | |
| 3 | Fallback de pactado: `ContratoItemComercial.snapshot_num_visitas_mensuales` → `PlanServicio.num_visitas_mensuales` | Implementado en `helpers_prefactura.py` | | |
| 4 | Ejecutado: suma de 5 fuentes: `TareaOTV3` completadas, Cotizaciones, GuiasSalida, OrdenesCompra, `GastoOTV3` | Implementado en `calcular_ejecutado_de_ots_v3()` | | |
| 5 | Visitas: calcula `incluidas_mes`, `confirmadas_mes`, `ots_marcadas_visitas`, `consistencia_visitas` | Implementado en `_build_visitas_v3()` | | |
| 6 | `consistencia_visitas` lanza warning si hay delta entre incluidas y confirmadas | Implementado | | |
| 7 | Retorna `pactado`, `ejecutado`, `diferencia`, `visitas_contrato`, `meta_monedas` | Implementado | | |
| 8 | Conversion de monedas: usa `convertir_monto_a_clp()` y `convertir_monto_desde_clp()` con cuantizacion | Implementado en `helpers_prefactura.py` | | |

### Flujo 8: Cancelacion de OT

| # | Paso / Comportamiento | Estado actual (codigo) | OK | Discrepancia / Debe hacer |
|---|----------------------|----------------------|----|--------------------------|
| 1 | `POST /ordenes/{id}/cambiar-estado/ {estado: "cancelada"}` desde cualquier estado | Implementado | | |
| 2 | Si OT es unica en prefactura en estado `borrador` → prefactura se elimina atomicamente | Implementado | | |
| 3 | Series ocupadas en guias de esta OT se liberan | Implementado | | |
| 4 | M2M cotizaciones, guias, ordenes_compra se limpian | Implementado | | |
| 5 | Toda la operacion de cleanup es atomica (rollback si falla algo) | Implementado con `transaction.atomic()` | | |

---

## 3. Reglas de Negocio

| # | Regla | Implementada en | OK | Observacion |
|---|-------|----------------|----|-----------  |
| 1 | Para avanzar a `preparacion`: debe haber tecnico responsable O un lider asignado | `_validar_bloqueadores_transicion()` | | |
| 2 | Para avanzar a `en_ejecucion`: items serializados deben tener `usuario_receptor` asignado | `_validar_bloqueadores_transicion()` | | |
| 3 | Para avanzar a `retroalimentacion`: todas las tareas deben estar en `completada` o `no_realizada` | `_validar_bloqueadores_transicion()` | | |
| 4 | Para avanzar a `retroalimentacion`: guias vinculadas a cotizaciones deben estar firmadas | `_validar_bloqueadores_transicion()` | | |
| 5 | Para avanzar a `facturada`: debe existir prefactura en estado `por_facturar` o `facturado` | Validado en `cambiar-estado` | | |
| 6 | Tarea de `tipo=entrega_equipo`: la guia vinculada debe estar firmada antes de completarse | `TareaOTV3ViewSet.cambiar_estado()` y `completar_con_firma()` | | |
| 7 | Cotizacion vinculada no puede duplicarse en la misma OT | Validado en `vincular-cotizacion` | | |
| 8 | Series de stock disponible se validan antes de crear guia rapida | `crear-guia-rapida` | | |
| 9 | OTs en prefactura activa no pueden crear nueva prefactura hasta que la existente termine | `create()` de `PrefacturaOTV3ViewSet` | | |
| 10 | Multiples OTs en una prefactura deben pertenecer al mismo cliente | Validado en `PrefacturaOTV3WriteSerializer.validate()` | | |
| 11 | Fuente de visitas para prefacturacion es `ContratoItemComercial`, NO `ContratoVisita` | `helpers_prefactura._resolve_visitas_mensuales_item()` | | |
| 12 | `cantidad` en movimientos de stock es siempre DELTA (no saldo total) | `movimientos.py` en bodegas | | |

---

## 4. Side-effects (signals, Celery, auto-transiciones)

| Evento disparador | Efecto automatico | Ubicacion |
|------------------|-------------------|-----------|
| Crear `OrdenDeTrabajoV3` | Crea `HistorialEstadoOTV3` inicial con mensaje "OT creada" | `ordentrabajov3/signals.py` |
| Cambio de `estado` en `OrdenDeTrabajoV3` | Crea nuevo `HistorialEstadoOTV3` con estado anterior y nuevo | `ordentrabajov3/signals.py` |
| Transicion a `en_ejecucion` | `fecha_inicio_real = now()` | `cambiar-estado` action |
| Transicion a `retroalimentacion` | `fecha_finalizacion_real = now()` + Celery task `crear_y_enviar_retroalimentacion_v3` | `cambiar-estado` action |
| Cancelacion | Cleanup atomico: prefacturas borrador eliminadas, series liberadas, M2M limpiados | `cambiar-estado` action |

---

## 5. Endpoints principales

| Metodo | URL | Descripcion | Auth |
|--------|-----|-------------|------|
| GET | `/api/v3/ordenes/` | Lista OTs del usuario (filtro empresa) | JWT |
| POST | `/api/v3/ordenes/` | Crear nueva OT en borrador | JWT |
| GET | `/api/v3/ordenes/{id}/` | Detalle completo de OT | JWT |
| PATCH | `/api/v3/ordenes/{id}/` | Editar OT | JWT |
| POST | `/api/v3/ordenes/{id}/cambiar-estado/` | Transiciona estado (validando bloqueadores) | JWT |
| GET | `/api/v3/ordenes/{id}/check-avance/` | Retorna proximo estado + bloqueadores actuales | JWT |
| POST | `/api/v3/ordenes/{id}/vincular-cotizacion/` | Vincula cotizacion (propaga OCs y guias) | JWT |
| POST | `/api/v3/ordenes/{id}/crear-guia-rapida/` | Crea GuiaSalida con movimientos de stock (atomico) | JWT |
| POST | `/api/v3/ordenes/{id}/crear-tareas-entrega-guia/` | Crea tareas tipo `entrega_equipo` | JWT |
| GET | `/api/v3/ordenes/{id}/equipos-disponibles/` | Series en guias + equipos libres del cliente | JWT |
| POST | `/api/v3/ordenes/{id}/crear-solicitante-prospecto/` | Crea usuario prospecto (User + UsuarioEmpresa) | JWT |
| POST | `/api/v3/ordenes/{id}/solicitar-retroalimentacion/` | Reenvio de correo de retroalimentacion | JWT |
| GET | `/api/v3/ordenes/{id}/tareas/` | Lista tareas de la OT | JWT |
| POST | `/api/v3/ordenes/{id}/tareas/` | Crear tarea | JWT |
| POST | `/api/v3/ordenes/{id}/tareas/{tk}/completar-con-firma/` | Completar tarea con firma digital | JWT |
| GET | `/api/v3/ordenes/{id}/historial/` | Historial de cambios de estado | JWT |
| GET | `/api/v3/prefacturas-otv3/ots-elegibles/` | OTs en `por_facturar` disponibles para prefactura | JWT |
| POST | `/api/v3/prefacturas-otv3/` | Crear prefactura (multi-OT + multi-contrato) | JWT |
| POST | `/api/v3/prefacturas-otv3/comparativa/` | Matching pactado vs ejecutado | JWT |
| POST | `/api/v3/prefacturas-otv3/{id}/finalizar/` | Prefactura borrador → por_facturar | JWT |
| POST | `/api/v3/prefacturas-otv3/{id}/asociar-documento/` | Prefactura por_facturar → facturado + avance OTs | JWT |

---

## 6. Checklist general del modulo OTV3

### Creacion y configuracion
- [ ] POST `/api/v3/ordenes/` → estado inicial = `borrador`
- [ ] `modalidad` se asigna bien segun `tipo_servicio`
- [ ] Historial de estado se crea automaticamente al crear OT
- [ ] `check-avance` retorna bloqueadores correctos antes de pasar a `preparacion`

### Ejecucion
- [ ] Transicion `borrador → preparacion` bloquea si no hay tecnico
- [ ] Transicion `preparacion → en_ejecucion` bloquea si hay items sin receptor
- [ ] `fecha_inicio_real` se registra al pasar a `en_ejecucion`
- [ ] Guia rapida crea GuiaSalida + movimientos de stock en transaccion atomica
- [ ] Tareas tipo `entrega_equipo` validan guia firmada antes de completarse
- [ ] Firma en `completar-con-firma` genera `UsuarioEquipo` o `ItemAsignadoUsuario` correctamente

### Cierre y facturacion
- [ ] Transicion `en_ejecucion → retroalimentacion` bloquea si hay tareas incompletas
- [ ] `fecha_finalizacion_real` se registra y Celery task se encola al pasar a `retroalimentacion`
- [ ] Prefactura multi-OT valida que todas sean del mismo cliente
- [ ] Lock atomico previene dos prefacturas sobre la misma OT
- [ ] `comparativa` retorna pactado desde `ContratoItemComercial` (NO `ContratoVisita`)
- [ ] `asociar-documento` avanza estado de OTs correctamente (total vs parcial)

### Cancelacion
- [ ] Cancelacion desde cualquier estado funciona
- [ ] Prefacturas borrador se eliminan si OT era la unica
- [ ] Series de stock se liberan correctamente
- [ ] M2M se limpia sin dejar registros huerfanos

---

*Ultima revision:* ___________  *Revisado por:* ___________
