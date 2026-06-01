# Auditoria Funcional: Cotizaciones

**Fecha:** 2026-04-15 | **Modulo:** cotizaciones | **Estado:** EN REVISION

---

## 1. Modelos y Estados

| Modelo | Campo estado | Valores posibles |
|--------|-------------|------------------|
| `Cotizacion` | `estado` | `pendiente` / `enviada` / `aceptada` / `rechazada` / `expirada` |
| `Cotizacion` | `estado_tipo_cambio` | `pendiente` / `actualizado` / `error` / `manual` |
| `SolicitanteCotizacion` | `token_usado` | `False` (disponible) / `True` (consumido) |

### Mapa de transicion de Cotizacion

```
pendiente
  └→ enviada  (enviar-cotizacion / enviar-cotizacion-solicitantes)
       ├→ aceptada   (POST /api/public/cotizacion/{token}/aprobar/ O aprobar internamente)
       ├→ rechazada  (POST /api/public/cotizacion/{token}/rechazar/)
       └→ expirada   (task diaria automatica si fecha_vencimiento < hoy)

rechazada
  └→ pendiente (crear-copia-rechazada: clona cotizacion en nueva)
```

### Tipos de moneda

| Codigo | Descripcion |
|--------|-------------|
| `"1"` | USD (dolar) |
| `"2"` | CLP (peso chileno, default) |
| `"3"` | UF |

---

## 2. Flujos

### Flujo 1: Creacion de Cotizacion

| # | Paso / Comportamiento | Estado actual (codigo) | OK | Discrepancia / Debe hacer |
|---|----------------------|----------------------|----|--------------------------|
| 1 | `POST /api/cotizaciones/` crea cotizacion en estado `pendiente` | Implementado en `CotizacionViewSet.perform_create()` | | |
| 2 | `numero_cotizacion` se genera automaticamente (auto-incremento por empresa) | Implementado en `Cotizacion.save()` | | |
| 3 | `fecha_facturacion` toma `localdate()` si no se envia | Implementado en `CotizacionSerializer.create()` | | |
| 4 | `fecha_vencimiento` se calcula 2 semanas despues de creacion | Implementado en `Cotizacion.establecer_fecha_vencimiento()` | | |
| 5 | Si `tipo_moneda != "2"` (CLP): Celery encola `actualizar_tipo_cambio_cotizacion.delay()` async | Implementado en `perform_create()` | | |
| 6 | `ppm` y `porcentaje_recargo` se heredan del cliente si no se envian en el request | Implementado en `perform_create()` | | |
| 7 | Se crea un `SeguimientoCotizacion` inicial automaticamente | Implementado en `perform_create()` | | |
| 8 | Multi-tenancy: ⚠️ `get_queryset()` NO filtra por empresa (riesgo de fuga de datos) | NO implementado en `CotizacionViewSet` | | |

### Flujo 2: Gestion de Items

| # | Paso / Comportamiento | Estado actual (codigo) | OK | Discrepancia / Debe hacer |
|---|----------------------|----------------------|----|--------------------------|
| 1 | Items se crean via `POST /api/items-cotizacion/` vinculados a la cotizacion | Implementado | | |
| 2 | `costo_total` de item se calcula automaticamente: `cantidad * precio_unitario` | Implementado en `ItemCotizacion.save()` | | |
| 3 | Item hereda `tipo_moneda` del proveedor si no se especifica | Implementado en `ItemCotizacion.save()` | | |
| 4 | `total_estimado` de la cotizacion es la suma ponderada de items en moneda base | Implementado como `property` de `Cotizacion` | | |
| 5 | IVA venta (19%), IVA compra (19%), PPM, ganancia se calculan como propiedades del item | Implementados como `@property` en `ItemCotizacion` | | |
| 6 | Item puede tener su propia moneda distinta a la cotizacion (se convierte con tasas) | Implementado via `_costo_total_en_clp` | | |

### Flujo 3: Tipo de cambio (USD / UF)

| # | Paso / Comportamiento | Estado actual (codigo) | OK | Discrepancia / Debe hacer |
|---|----------------------|----------------------|----|--------------------------|
| 1 | Al crear cotizacion con moneda USD o UF: Celery task busca tipo de cambio async | Implementado en `perform_create()` | | |
| 2 | `estado_tipo_cambio` empieza en `pendiente` mientras se resuelve async | Implementado | | |
| 3 | Si Celery resuelve bien: `estado_tipo_cambio = "actualizado"` + guarda `dolar_observado` / `valor_uf` | Implementado en task `actualizar_tipo_cambio_cotizacion` | | |
| 4 | Si Celery falla: `estado_tipo_cambio = "error"` + mensaje en `error_tipo_cambio` | Implementado | | |
| 5 | `POST /api/cotizaciones/{id}/refrescar-tipo-cambio/` encola refresco manual async (retorna inmediatamente) | Implementado en `refrescar-tipo-cambio` action | | |
| 6 | `GET /api/cotizaciones/tipo-cambio/?fecha=YYYY-MM-DD` retorna USD y UF sin crear cotizacion | Implementado en action `tipo-cambio` | | |
| 7 | Si el usuario envia valores manuales de tipo de cambio: `estado_tipo_cambio = "manual"` (no se auto-refresca) | Implementado en `perform_update()` | | |
| 8 | Si cambio `fecha_facturacion` sin valores manuales → re-encola refresco automatico | Implementado en `perform_update()` con deteccion inteligente | | |
| 9 | `fecha_facturacion_congelada = True` bloquea cambios de fecha (vinculado a prefactura) | Validado en `CotizacionSerializer.validate()` | | |

### Flujo 4: Envio a solicitantes

| # | Paso / Comportamiento | Estado actual (codigo) | OK | Discrepancia / Debe hacer |
|---|----------------------|----------------------|----|--------------------------|
| 1 | `POST /api/cotizaciones/{id}/enviar-cotizacion/` envia PDF a correos CC (sin mecanismo de aprobacion individual) | Implementado | | |
| 2 | `POST /api/cotizaciones/{id}/enviar-cotizacion-solicitantes/` envia a cada `SolicitanteCotizacion` con su token unico | Implementado. Crea email por solicitante con link publico | | |
| 3 | Al enviar: cotizacion pasa a estado `enviada` | Implementado | | |
| 4 | Se crea registro `EnvioCorreoCotizacion` con destinatarios | Implementado | | |
| 5 | `POST /api/cotizaciones/{id}/enviar-copia-solicitante/` reenvio individual (requiere `solicitante_id`) | Implementado. Regenera token si ya fue usado | | |
| 6 | `SolicitanteCotizacion` puede ser `SolicitanteExterno` (email+nombre) o `UsuarioEmpresa` (GenericForeignKey) | Implementado via GenericForeignKey | | |
| 7 | Validacion: no se puede agregar el mismo email dos veces como solicitante | Validado en `SolicitanteCotizacionSerializer.validate()` | | |

### Flujo 5: Aprobacion publica (por token)

| # | Paso / Comportamiento | Estado actual (codigo) | OK | Discrepancia / Debe hacer |
|---|----------------------|----------------------|----|--------------------------|
| 1 | `GET /api/public/cotizacion/{token}/` retorna datos publicos de la cotizacion (sin autenticacion) | Implementado en `public_views.py` | | |
| 2 | Response incluye `puede_responder` (bool) que verifica: token no usado + estado `enviada` + vigencia | Implementado en `SolicitanteInfoSerializer` | | |
| 3 | `POST /api/public/cotizacion/{token}/aprobar/` acepta `item_ids[]` (vacio = todos aprobados) | Implementado en `AprobarCotizacionPublicSerializer` | | |
| 4 | Al aprobar: cotizacion pasa a estado `aceptada` + `token_usado = True` + `fecha_respuesta = now()` + registra IP | Implementado | | |
| 5 | `POST /api/public/cotizacion/{token}/rechazar/` acepta `motivo` (opcional) | Implementado en `RechazarCotizacionPublicSerializer` | | |
| 6 | Al rechazar: cotizacion pasa a estado `rechazada` + token consumido | Implementado | | |
| 7 | Token es de uso unico (`token_usado = True` tras la primera respuesta) | Implementado | | |
| 8 | Si cotizacion esta expirada (fecha_vencimiento < hoy): `puede_responder = False` | Implementado via `es_vigente` property | | |

### Flujo 6: Aprobacion interna

| # | Paso / Comportamiento | Estado actual (codigo) | OK | Discrepancia / Debe hacer |
|---|----------------------|----------------------|----|--------------------------|
| 1 | `POST /api/cotizaciones/{id}/aprobar-cotizacion/` aprueba desde panel interno | Implementado | | |
| 2 | Requiere `solicitante_id`, `fecha_aprobacion`, `item_ids` | Implementado | | |
| 3 | Al aprobar internamente: cotizacion pasa a `aceptada` | Implementado | | |
| 4 | Se crea `SeguimientoCotizacion` de tipo `aprobacion` | Implementado | | |
| 5 | Items seleccionados en aprobacion se marcan `aprobado=True` en `ItemCotizacion` | Implementado | | |

### Flujo 7: Post-aprobacion y OC derivada

| # | Paso / Comportamiento | Estado actual (codigo) | OK | Discrepancia / Debe hacer |
|---|----------------------|----------------------|----|--------------------------|
| 1 | Al aceptar cotizacion: `estado_oc_derivado` puede ser `pendiente_oc` si no tiene OC vinculada | Calculado como property en `Cotizacion` | | |
| 2 | `GET /api/cotizaciones/aprobadas-para-oc/?cliente_id=X` lista cotizaciones aceptadas con resumen de proveedores | Implementado en action `aprobadas-para-oc` | | |
| 3 | `GET /api/cotizaciones/{id}/ordenes-compras/` lista todas las OC derivadas | Implementado | | |
| 4 | `GET /api/cotizaciones/{id}/items-resumen/` muestra cantidad pedida vs recibida | Implementado | | |
| 5 | Cuando todas las OC estan completadas/canceladas: `estado_oc_derivado = "cerrada_comercialmente"` | Calculado automaticamente como property | | |

### Flujo 8: Copia de cotizacion rechazada

| # | Paso / Comportamiento | Estado actual (codigo) | OK | Discrepancia / Debe hacer |
|---|----------------------|----------------------|----|--------------------------|
| 1 | `POST /api/cotizaciones/{id}/crear-copia-rechazada/` clona cotizacion rechazada | Implementado en action `crear-copia-rechazada` | | |
| 2 | Copia incluye todos los items y solicitantes de la original | Implementado | | |
| 3 | Copia empieza en estado `pendiente` | Implementado | | |
| 4 | `copia_de` FK apunta a la cotizacion original | Implementado | | |
| 5 | `GET /api/cotizaciones/{id}/copias/` lista todas las copias derivadas | Implementado | | |

---

## 3. Reglas de Negocio

| # | Regla | Implementada en | OK | Observacion |
|---|-------|----------------|----|-----------  |
| 1 | Token de aprobacion es de uso unico (no puede aprobarse dos veces) | `SolicitanteCotizacion.token_usado` | | |
| 2 | Solo cotizaciones en estado `enviada` y vigentes pueden ser aprobadas/rechazadas publicamente | `CotizacionPublicSerializer.puede_responder` | | |
| 3 | Cotizacion expirada (fecha_vencimiento < hoy): `puede_responder = False` | `Cotizacion.es_vigente` property | | |
| 4 | No se puede agregar el mismo email como solicitante dos veces | `SolicitanteCotizacionSerializer.validate()` | | |
| 5 | Si `tipo_moneda = USD` o `UF` y no hay valores manuales: se encola refresco de tipo de cambio automatico | `perform_create()` y `perform_update()` | | |
| 6 | Si `fecha_facturacion_congelada = True`: no se puede cambiar `fecha_facturacion` | `CotizacionSerializer.validate()` | | |
| 7 | `ppm` y `porcentaje_recargo` se heredan del cliente si no se especifican | `perform_create()` | | |
| 8 | Cotizacion expirada: task diaria `expirar_cotizaciones_vencidas()` transiciona automaticamente a `expirada` | Celery Beat + task programada | | |
| 9 | `total_estimado` es calculado automaticamente (no editable directamente) | `Cotizacion.calcular_total_estimado` property | | |
| 10 | `numero_cotizacion` es unico y auto-generado por empresa | `Cotizacion.save()` | | |
| 11 | ⚠️ Multi-tenancy NO implementada en `CotizacionViewSet.get_queryset()` | FALTA implementar | | **RIESGO: usuarios ven cotizaciones de otras empresas** |

---

## 4. Side-effects (signals, Celery, auto-transiciones)

| Evento disparador | Efecto automatico | Ubicacion |
|------------------|-------------------|-----------|
| Crear cotizacion con moneda USD/UF | Celery encola `actualizar_tipo_cambio_cotizacion.delay()` | `CotizacionViewSet.perform_create()` |
| Cambiar `fecha_facturacion` sin valores manuales | Celery reencola refresco de tipo de cambio | `CotizacionViewSet.perform_update()` |
| `refrescar-tipo-cambio` action | Celery encola refresco async | `CotizacionViewSet.refrescar_tipo_cambio()` |
| Task diaria (Celery Beat) | `expirar_cotizaciones_vencidas()` transiciona a `expirada` | Task Celery programada |
| Aprobar cotizacion | `SeguimientoCotizacion` de tipo `aprobacion` se crea | `aprobar-cotizacion` action |

---

## 5. Endpoints principales

| Metodo | URL | Descripcion | Auth |
|--------|-----|-------------|------|
| GET | `/api/cotizaciones/cotizaciones-empresa/` | Lista filtrada por empresa con filtros adicionales | JWT |
| POST | `/api/cotizaciones/` | Crear cotizacion | JWT |
| GET | `/api/cotizaciones/{id}/` | Detalle de cotizacion | JWT |
| POST | `/api/cotizaciones/{id}/enviar-cotizacion/` | Enviar via email (sin tokens individuales) | JWT |
| POST | `/api/cotizaciones/{id}/enviar-cotizacion-solicitantes/` | Enviar a solicitantes con tokens unicos | JWT |
| POST | `/api/cotizaciones/{id}/enviar-copia-solicitante/` | Reenvio individual a solicitante | JWT |
| POST | `/api/cotizaciones/{id}/aprobar-cotizacion/` | Aprobar desde panel interno | JWT |
| POST | `/api/cotizaciones/{id}/refrescar-tipo-cambio/` | Encolar refresco async de tipo de cambio | JWT |
| GET | `/api/cotizaciones/tipo-cambio/` | Consultar USD/UF para una fecha sin crear cotizacion | JWT |
| POST | `/api/cotizaciones/{id}/crear-copia-rechazada/` | Clonar cotizacion rechazada en nueva | JWT |
| GET | `/api/cotizaciones/{id}/copias/` | Listar copias derivadas | JWT |
| GET | `/api/cotizaciones/{id}/ordenes-compras/` | Listar OC derivadas | JWT |
| GET | `/api/cotizaciones/{id}/items-resumen/` | Resumen pedido vs recibido | JWT |
| GET | `/api/cotizaciones/aprobadas-para-oc/` | Cotizaciones aprobadas elegibles para OC | JWT |
| GET | `/api/public/cotizacion/{token}/` | Vista publica (sin auth) | Ninguna |
| POST | `/api/public/cotizacion/{token}/aprobar/` | Aprobar desde link publico | Ninguna |
| POST | `/api/public/cotizacion/{token}/rechazar/` | Rechazar desde link publico | Ninguna |

---

## 6. Checklist general del modulo Cotizaciones

### Creacion y configuracion
- [ ] POST `/api/cotizaciones/` → estado inicial = `pendiente`
- [ ] `numero_cotizacion` se auto-genera correctamente por empresa
- [ ] `fecha_vencimiento` se calcula 2 semanas despues (configurable)
- [ ] Con moneda USD/UF → `estado_tipo_cambio = "pendiente"` y Celery task encola
- [ ] `ppm` y `porcentaje_recargo` heredados del cliente si no se envian

### Items y calculos
- [ ] `costo_total` de item = `cantidad * precio_unitario` auto-calculado
- [ ] `total_estimado` de cotizacion suma correctamente en moneda base
- [ ] IVA venta, IVA compra y PPM calculan correctamente
- [ ] Conversion de moneda de items a moneda base de cotizacion funciona

### Tipo de cambio
- [ ] Task async de tipo de cambio se ejecuta y actualiza `dolar_observado` / `valor_uf`
- [ ] `estado_tipo_cambio` refleja el estado correctamente: pendiente → actualizado / error
- [ ] Regreso manual de tipo de cambio marca `estado_tipo_cambio = "manual"` y no se auto-refresca
- [ ] Cambio de `fecha_facturacion` re-encola refresco si valores no son manuales
- [ ] `fecha_facturacion_congelada` bloquea edicion de fecha correctamente

### Flujo publico de aprobacion
- [ ] Link publico `/api/public/cotizacion/{token}/` funciona sin autenticacion
- [ ] `puede_responder = True` solo si: token no usado + estado `enviada` + cotizacion vigente
- [ ] Aprobar con `item_ids` vacio aprueba todos los items
- [ ] Token se consume tras la primera respuesta (no puede usarse dos veces)
- [ ] IP del cliente se registra en `SolicitanteCotizacion.ip_respuesta`

### Expiracion y copias
- [ ] Task diaria expira cotizaciones con `fecha_vencimiento < hoy`
- [ ] Copia de cotizacion rechazada incluye todos los items y solicitantes
- [ ] Copia nace en estado `pendiente` con `copia_de` apuntando a original

---

*Ultima revision:* ___________  *Revisado por:* ___________
