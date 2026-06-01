# Auditoria Funcional: Contratos

**Fecha:** 2026-04-15 | **Modulo:** contratos | **Estado:** EN REVISION

---

## 1. Modelos y Estados

| Modelo | Campo estado | Valores posibles |
|--------|-------------|------------------|
| `ContratoEmpresaCliente` | `estado` | `borrador` / `en_aprobacion_cliente` / `cambios_solicitados` / `aprobado_cliente` / `rechazado_cliente` / `en_firma` / `activo` / `suspendido` / `finalizado` |
| `ContratoLicencia` | `estado` | `activa` / `vencida` / `suspendida` / `cancelada` |
| `FacturaContrato` | `estado` | `borrador` / `por_facturar` / `facturado` |
| `EnvioContratoAprobacion` | `aprobado` | `None` (sin respuesta) / `True` (aprobado) / `False` (rechazado) |
| `EnvioContratoFirmaUsuario` | `firmado` | `False` / `True` |

### Tipos de contrato

| Tipo | Descripcion | Diferencia de flujo |
|------|-------------|---------------------|
| `"servicios"` | Servicios/planes mensuales o unicos (default) | Flujo completo estandar |
| `"licencia"` | Software con gestion de cupos y ventana de edicion | Signal auto-crea "Servicio de Licencias" al crear |
| `"venta"` | Contrato de venta con cotizaciones vinculadas | Usa `forma_pago_venta` y `cuotas_venta` |

### Mapa de transicion de ContratoEmpresaCliente

```
borrador ──────────────────────────────────────────────────→ en_aprobacion_cliente
  ↑                                                                      ↓
  └──────────────── cambios_solicitados ←────────────────────────────────┘
                                                  (cliente rechaza = solicita cambios)
                          ↓
            (usuario re-edita y reenvía)
                          ↓
                  en_aprobacion_cliente
                          ↓
             [cliente aprueba / rechaza definitivo]
                          ↓
         aprobado_cliente ←┘          rechazado_cliente (TERMINAL)
                ↓
         en_firma  (usuario envía para firma digital)
                ↓
            activo  (todos los usuarios firmaron)
                ↓
         suspendido  (suspension temporal)
                ↓
            activo  (reactivacion)
         ─ o ─
         finalizado  (manual o auto si fecha_fin < hoy)
```

### Mapa de transicion de ContratoLicencia

```
activa
  ├→ suspendida  (dentro de ventana 7 dias)
  └→ cancelada   (dentro de ventana)

suspendida
  ├→ activa      (dentro de ventana)
  └→ cancelada   (dentro de ventana)

vencida
  └→ cancelada   (unica transicion disponible)

cancelada  (TERMINAL)
```

---

## 2. Flujos

### Flujo 1: Creacion y edicion de contrato (Borrador)

| # | Paso / Comportamiento | Estado actual (codigo) | OK | Discrepancia / Debe hacer |
|---|----------------------|----------------------|----|--------------------------|
| 1 | `POST /api/contratos/` crea contrato en estado `borrador` | Implementado | | |
| 2 | Si `tipo = "licencia"`: signal auto-crea `ContratoServicio` con "Servicio de Licencias" | Implementado en signal `post_save` | | |
| 3 | Validacion: `fecha_inicio` no puede ser en el futuro | Validado en serializer | | |
| 4 | Validacion: `fecha_fin >= fecha_inicio` | Validado en serializer | | |
| 5 | En estado `borrador` o `cambios_solicitados`: permite editar contenido (`puede_editar_contenido = True`) | Propiedad calculada, validada en ViewSet | | |
| 6 | En estados posteriores a `en_aprobacion_cliente`: no permite editar contenido | Validado en ViewSet antes de PATCH | | |
| 7 | Crear `ContratoItemComercial`: `total_mensual`, `total_anual`, `total_pago_unico` se calculan en `recalcular_totales()` | Implementado automaticamente | | |
| 8 | Al crear item comercial: `snapshot_*` se congela cuando el contrato se manda a aprobacion | Implementado al enviar a aprobacion | | |
| 9 | Agregar `UsuarioVinculadoContrato`: solo puede haber 1 con `es_destinatario_principal = True` por contrato | Validado via constraint en modelo | | |
| 10 | Auto-finalizacion: si `fecha_fin < date.today()` y estado = `activo` → estado = `finalizado` | Implementado en `ContratoEmpresaCliente.save()` via signal | | |

### Flujo 2: Envio a aprobacion del cliente

| # | Paso / Comportamiento | Estado actual (codigo) | OK | Discrepancia / Debe hacer |
|---|----------------------|----------------------|----|--------------------------|
| 1 | `POST /api/contratos/{id}/enviar-para-aprobacion/` inicia el flujo de aprobacion | Implementado en ViewSet action | | |
| 2 | Se crea `EnvioContratoAprobacion` con `uuid` unico | Implementado | | |
| 3 | Se genera PDF via ReportLab con el contrato actual (`construir_pdf_contrato`) | Implementado en `flow_helpers.py` | | |
| 4 | `snapshot_contrato` (JSON completo) se congela en el momento de envio | Implementado | | |
| 5 | `pdf_congelado` (BinaryField) se genera y guarda (no se regenera despues) | Implementado | | |
| 6 | Email se envia al `destinatario_principal` del contrato | Implementado | | |
| 7 | Estado del contrato → `en_aprobacion_cliente` | Implementado | | |
| 8 | Si contrato ya habia sido enviado antes: los `EnvioContratoAprobacion` previos se marcan `deprecado = True` | Implementado | | |
| 9 | Nuevo envio incrementa `version_envio` | Implementado | | |
| 10 | Items comerciales se congelan en `snapshot_*` al enviar | Implementado | | |

### Flujo 3: Respuesta del cliente (aprobacion/rechazo)

| # | Paso / Comportamiento | Estado actual (codigo) | OK | Discrepancia / Debe hacer |
|---|----------------------|----------------------|----|--------------------------|
| 1 | `GET /public/contrato-aprobacion/{uuid}/` muestra contrato al cliente (sin autenticacion) | Implementado en `public_views.py` | | |
| 2 | `POST /public/contrato-aprobacion/{uuid}/aprobar/` aprueba el contrato | Implementado | | |
| 3 | Al aprobar: `EnvioContratoAprobacion.aprobado = True`, `respondido = True`, `fecha_respuesta = now()`, `ip_respuesta` = IP | Implementado | | |
| 4 | Al aprobar: estado del contrato → `aprobado_cliente` | Implementado | | |
| 5 | Al aprobar: se envia email de confirmacion al prestador | Implementado | | |
| 6 | `POST /public/contrato-aprobacion/{uuid}/rechazar/` rechaza con comentarios | Implementado | | |
| 7 | Rechazo puede ser "solicita cambios" (→ `cambios_solicitados`) o "rechaza definitivo" (→ `rechazado_cliente`) | Implementado en public_views: 2 endpoints distintos | | |
| 8 | Si rechaza con cambios: contrato vuelve a `cambios_solicitados` y usuario puede editar y reenviar | Implementado | | |
| 9 | UUID del envio es de uso unico (no puede responderse dos veces una vez marcado `respondido`) | Implementado | | |
| 10 | `deprecado = True` en envios anteriores invalida links viejos | Implementado | | |

### Flujo 4: Firma digital

| # | Paso / Comportamiento | Estado actual (codigo) | OK | Discrepancia / Debe hacer |
|---|----------------------|----------------------|----|--------------------------|
| 1 | `POST /api/contratos/{id}/enviar-para-firma/` inicia flujo de firmas digitales | Implementado en ViewSet action | | |
| 2 | Se crea un `EnvioContratoFirmaUsuario` por cada `UsuarioVinculadoContrato` activo | Implementado | | |
| 3 | Cada envio tiene su propio `uuid` unico como token de acceso | Implementado | | |
| 4 | Se genera PDF congelado (`pdf_congelado`) y `snapshot_contrato` para cada envio | Implementado | | |
| 5 | Email con link unico se envia a cada firmante | Implementado | | |
| 6 | Estado del contrato → `en_firma` | Implementado | | |
| 7 | `GET /public/contrato-firma/{uuid}/` muestra formulario de firma al usuario (sin autenticacion) | Implementado en `public_views.py` | | |
| 8 | `POST /public/contrato-firma/{uuid}/firmar/` recibe firma en base64 (canvas) | Implementado | | |
| 9 | Validacion: base64 debe ser imagen valida (`data:image/png;base64,...`) | Implementado | | |
| 10 | Firma guardada: `EnvioContratoFirmaUsuario.firma = base64`, `firmado = True`, `fecha_firma = now()`, `ip_respuesta` = IP | Implementado | | |
| 11 | Cuando TODOS los firmantes han firmado: contrato pasa automaticamente a estado `activo` | Implementado (check en cada firma guardada) | | |
| 12 | Al activarse el contrato: signal crea primera `FacturaContrato` automaticamente | Implementado en signal | | |

### Flujo 5: Gestion de licencias

| # | Paso / Comportamiento | Estado actual (codigo) | OK | Discrepancia / Debe hacer |
|---|----------------------|----------------------|----|--------------------------|
| 1 | `ContratoLicencia` se crea vinculada al contrato para gestionar cupos de software | Implementado | | |
| 2 | Ventana de edicion de 7 dias: se calcula desde `inicio_periodo_actual` (fecha_inicio o renovacion anual) | Implementado en `ContratoLicencia` | | |
| 3 | Dentro de la ventana: `puede_reducir_cupos = True`, `puede_cancelar = True` | Calculado en propiedad del modelo | | |
| 4 | Fuera de la ventana: solo `puede_aumentar_cupos = True` | Calculado en propiedad del modelo | | |
| 5 | `mensajes_ventana_edicion` comunica al usuario el estado actual de la ventana | Implementado como metodo del modelo | | |
| 6 | Auto-actualizacion de estado: si `fecha_fin < date.today()` y estado = `activa` → `vencida` | Implementado en `ContratoLicencia.save()` | | |
| 7 | Transiciones de estado de licencia estan limitadas por reglas de ventana | Validado en ViewSet | | |

### Flujo 6: Motor de plantillas

| # | Paso / Comportamiento | Estado actual (codigo) | OK | Discrepancia / Debe hacer |
|---|----------------------|----------------------|----|--------------------------|
| 1 | `PlantillaContrato` se define por empresa y tipo de contrato | Implementado | | |
| 2 | Plantilla tiene `SeccionPlantilla` con texto que puede contener tokens `[nombre_etiqueta]` | Implementado en `motor_plantillas.py` | | |
| 3 | `EtiquetaPlantilla` define las etiquetas disponibles y las rutas de datos para resolver cada una | Implementado | | |
| 4 | `SeccionContratoGenerada` guarda el texto renderizado para cada contrato | Implementado | | |
| 5 | Tipos de seccion: `encabezado`, `clausula`, `condiciones_generales`, `firmas`, `libre` | Implementado | | |
| 6 | Slots documentales definen el orden: antes_alcance, entre_alcance_y_operacion, entre_operacion_y_condiciones, despues_condiciones | Implementado | | |
| 7 | Preview de plantilla disponible sin crear contrato real | Implementado si hay action `preview` | | |

### Flujo 7: Prefacturacion automatica del contrato (FacturaContrato)

| # | Paso / Comportamiento | Estado actual (codigo) | OK | Discrepancia / Debe hacer |
|---|----------------------|----------------------|----|--------------------------|
| 1 | Al activar contrato: signal crea primera `FacturaContrato` automaticamente | Implementado en signal post_save | | |
| 2 | Task Celery diaria: si `dia_facturacion == today` crea nueva `FacturaContrato` para el periodo anterior | Implementado en `tareas_2do_plano.py` | | |
| 3 | `FacturaContrato` estado inicial: `borrador` | Implementado | | |
| 4 | `FacturaContrato.resultado` (JSONField) guarda el desglose de items facturados | Implementado | | |
| 5 | `monto_total` se calcula automaticamente desde los items | Implementado | | |
| 6 | Flujo: `borrador → por_facturar → facturado` (similar a PrefacturaOTV3) | Implementado | | |

---

## 3. Reglas de Negocio

| # | Regla | Implementada en | OK | Observacion |
|---|-------|----------------|----|-----------  |
| 1 | `fecha_inicio` del contrato no puede ser en el futuro | `serializer.validate()` | | |
| 2 | `fecha_fin >= fecha_inicio` | `serializer.validate()` | | |
| 3 | Solo 1 `UsuarioVinculadoContrato` puede ser `es_destinatario_principal = True` | Constraint en modelo | | |
| 4 | Contrato solo editable en estado `borrador` o `cambios_solicitados` | `puede_editar_contenido` property + ViewSet | | |
| 5 | UUID de aprobacion/firma es de uso unico (no puede responderse dos veces) | Validado en public_views | | |
| 6 | Envios de aprobacion previos se invalidan (deprecados) cuando contrato vuelve a borrador | Signal / ViewSet action | | |
| 7 | Contrato pasa a `activo` solo cuando TODOS los firmantes han firmado | Check en cada guardado de firma | | |
| 8 | Auto-finalizacion: si `fecha_fin < today` y estado = `activo` → `finalizado` automaticamente | `ContratoEmpresaCliente.save()` signal | | |
| 9 | Licencia: reducir cupos o cancelar solo posible dentro de ventana de 7 dias | `ContratoLicencia` metodos de ventana | | |
| 10 | Licencia: aumentar cupos siempre posible (fuera de ventana tambien) | `puede_aumentar_cupos = True` siempre | | |
| 11 | Tipo `"licencia"`: signal auto-crea el servicio de base al guardar | Signal `post_save` de `ContratoEmpresaCliente` | | |
| 12 | `ContratoItemComercial.total_mensual = cantidad * precio * veces_por_mes` | `recalcular_totales()` | | |
| 13 | `ContratoItemComercial.num_visitas_mensuales` es la fuente de verdad para prefacturacion OTV3 | `helpers_prefactura._resolve_visitas_mensuales_item()` | | |

---

## 4. Side-effects (signals, Celery, auto-transiciones)

| Evento disparador | Efecto automatico | Ubicacion |
|------------------|-------------------|-----------|
| Crear contrato tipo `"licencia"` | Signal `post_save` auto-crea `ContratoServicio` de licencias | `contratos/signals.py` |
| Guardar contrato con `fecha_fin < today` y `estado = "activo"` | Estado → `finalizado` automaticamente | `check_contrato_vencido()` en signals |
| Enviar a aprobacion | Depreca envios previos, crea nuevo `EnvioContratoAprobacion`, genera PDF, envia email | ViewSet action + `flow_helpers.py` |
| Contrato vuelve a `cambios_solicitados` | `EnvioContratoAprobacion` previos → `deprecado = True` | ViewSet action |
| Contrato pasa a `activo` (todos firmaron) | Signal crea primera `FacturaContrato` | `contratos/signals.py` |
| Task diaria Celery (Beat) | Crea `FacturaContrato` si `dia_facturacion == today` | `tareas_2do_plano.py` |
| GuardarContratoLicencia con `fecha_fin < today` y `estado = "activa"` | Estado → `vencida` automaticamente | `ContratoLicencia.save()` |

---

## 5. Endpoints principales

| Metodo | URL | Descripcion | Auth |
|--------|-----|-------------|------|
| GET | `/api/contratos/` | Lista contratos | JWT |
| POST | `/api/contratos/` | Crear contrato | JWT |
| GET | `/api/contratos/{id}/` | Detalle completo | JWT |
| PATCH | `/api/contratos/{id}/` | Editar (solo en borrador o cambios_solicitados) | JWT |
| POST | `/api/contratos/{id}/enviar-para-aprobacion/` | Envia a cliente para aprobacion | JWT |
| POST | `/api/contratos/{id}/enviar-para-firma/` | Inicia flujo de firma digital | JWT |
| POST | `/api/contratos/{id}/cambiar-estado/` | Transiciones manuales (suspender, finalizar, etc.) | JWT |
| GET | `/api/contratos/{id}/items-comerciales/` | Items del contrato | JWT |
| POST | `/api/contratos/{id}/items-comerciales/` | Agregar item comercial | JWT |
| GET | `/api/contratos/{id}/usuarios-vinculados/` | Usuarios firmantes/contactos | JWT |
| POST | `/api/contratos/{id}/usuarios-vinculados/` | Agregar usuario firmante | JWT |
| GET | `/api/contratos/{id}/licencias/` | Licencias del contrato | JWT |
| GET | `/api/contratos/{id}/facturas/` | Prefacturas del contrato | JWT |
| GET | `/api/contratos/{id}/envios-aprobacion/` | Historial de envios a aprobacion | JWT |
| GET | `/api/plantillas/` | Plantillas disponibles | JWT |
| POST | `/api/plantillas/{id}/preview/` | Preview renderizado de plantilla | JWT |
| GET | `/public/contrato-aprobacion/{uuid}/` | Vista publica de aprobacion (sin auth) | Ninguna |
| POST | `/public/contrato-aprobacion/{uuid}/aprobar/` | Aprobar contrato | Ninguna |
| POST | `/public/contrato-aprobacion/{uuid}/rechazar/` | Rechazar solicitando cambios | Ninguna |
| POST | `/public/contrato-aprobacion/{uuid}/rechazar-definitivo/` | Rechazar definitivamente | Ninguna |
| GET | `/public/contrato-firma/{uuid}/` | Vista publica de firma (sin auth) | Ninguna |
| POST | `/public/contrato-firma/{uuid}/firmar/` | Enviar firma digital | Ninguna |

---

## 6. Checklist general del modulo Contratos

### Creacion y configuracion
- [ ] Crear contrato → estado `borrador`
- [ ] Tipo `"licencia"` crea automaticamente el servicio base
- [ ] `fecha_inicio` no es futuro y `fecha_fin >= fecha_inicio`
- [ ] Solo 1 usuario puede ser `destinatario_principal`
- [ ] Items comerciales calculan `total_mensual`, `total_anual`, `total_pago_unico` correctamente
- [ ] En `borrador` / `cambios_solicitados`: contrato puede editarse. En otros estados: bloqueado

### Flujo aprobacion
- [ ] `enviar-para-aprobacion` genera PDF congelado + snapshot + email al destinatario
- [ ] Link publico de aprobacion funciona sin autenticacion
- [ ] Aprobar → estado `aprobado_cliente`
- [ ] Rechazar con cambios → estado `cambios_solicitados` (usuario puede re-editar)
- [ ] Rechazar definitivo → estado `rechazado_cliente` (terminal)
- [ ] Reenvio incrementa `version_envio` y depreca links anteriores

### Firma digital
- [ ] `enviar-para-firma` crea `EnvioContratoFirmaUsuario` por cada usuario vinculado
- [ ] Links de firma son individuales por usuario (UUID unico cada uno)
- [ ] Firma en base64 se guarda con `fecha_firma` e `ip_respuesta`
- [ ] Cuando TODOS firman: contrato pasa a `activo` automaticamente
- [ ] PDF para firma es congelado (no cambia aunque se edite el contrato despues)

### Ciclo de vida
- [ ] Al activarse: primera `FacturaContrato` se crea automaticamente
- [ ] Auto-finalizacion: si `fecha_fin < hoy` y `activo` → `finalizado`
- [ ] Suspension y reactivacion manual funcionan
- [ ] Licencias: ventana de 7 dias permite reducir/cancelar cupos
- [ ] Licencias: fuera de ventana solo permite aumentar cupos
- [ ] Licencias: auto-vence si `fecha_fin < hoy`

### Prefacturacion del contrato
- [ ] `FacturaContrato` se crea automaticamente al activar contrato
- [ ] Task Celery diaria genera facturas mensuales segun `dia_facturacion`
- [ ] Flujo `borrador → por_facturar → facturado` funciona correctamente

---

*Ultima revision:* ___________  *Revisado por:* ___________
