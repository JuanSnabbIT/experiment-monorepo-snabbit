---
Responsable: Fabián
Email: -
Proxima_revision: 2026-08-04
Estado: canonical
---

# Flujos Operativos – Monorepo ERP

**Propósito único:** Documentar paso a paso los procesos de negocio (flujos de usuario, estados, transiciones, validaciones).

**Qué va aquí:**
- Procesos operativos completos (Cotización → OC → Guía → OT → Facturación)
- Estados y transiciones permitidas
- Validaciones y reglas por estado
- Casos de uso reales
- Checklists de validación

**Qué NO va aquí:**
- ❌ Decisiones arquitectónicas → usa `analisis.md`
- ❌ Planes de mejora futuro → usa `planificacion.md`
- ❌ Detalles técnicos de implementación → usa `sistemas.md`

**Mantenimiento:**
- Actualizar cuando estados/transiciones cambien
- Usar diagramas de estado cuando sea necesario
- Incluir siempre: prerequisitos, acciones, transiciones, requisitos para avanzar

---

## Estructura por Módulos

- Secciones por módulo: `cotizaciones`, `compras`, `bodegas`, `guias`, `ordentrabajo`, `rendiciones`.
- En cada módulo: estados clave, transiciones permitidas, checklists rápidos y pruebas recomendadas.

## Referencia Rápida: Cotización → OC → Guía → OT
- Empresas y relacion prestador/cliente creadas.
- Proveedores de la empresa (ProveedorEmpresa).
- Items de la empresa (ItemEmpresa) asociados a proveedores.
- Usuario autenticado con empresa principal configurada (PersonalizacionUsuario).

## Módulo: Cotizaciones
## Cotizacion (estado a estado)
### Flujo de creacion desde la lista
- Ingresar a `Cotizacion > Cotizaciones Clientes` (lista). Boton `+` / “Añadir cotizacion” abre el modal “Crear Cotización”.
- Campos obligatorios: Nombre, Cliente, Tipo de Moneda. Campos opcionales: Descripcion, Observaciones.
- Accion `Crear`: genera una nueva fila en la lista con estado inicial `Pendiente`.
- Acciones en la fila: `Ver detalles` (navega al detalle de la cotizacion) y `Eliminar`.

### Campos al crear (UI)
- Nombre, Cliente, Tipo de Moneda (obligatorios); Descripcion, Observaciones (opcionales).
- En backend, la moneda efectiva se toma del proveedor del item.
- Opcional: ppm; si no se envia, se usa ppm del cliente.

### Acciones disponibles en el detalle
- Agregar items, agregar solicitantes (internos/externos), editar campos generales, ver/anadir seguimiento, enviar.

### Flujo en el detalle (edicion y envio)
- Edicion solo en `Pendiente`: secciones "Informacion de la Cotizacion" y "Uso Interno" muestran boton "Editar"; permite modificar y luego aceptar/cancelar cambios. En estados distintos de `Pendiente` la edicion de datos generales, items y solicitantes queda bloqueada.
- Solicitantes: seccion "Solicitantes" con boton "Anadir Solicitantes". Permite agregar solicitantes externos (Nombre, Email) o marcar "Es Usuario?" y elegir usuarios internos de la empresa cliente. "Crear" guarda los solicitantes; "Cancelar" descarta.
- Enviar para aprobar: boton "Enviar Cotizacion para Aprobar" abre modal con lista de correos destino. Requiere al menos 1 solicitante y 1 item asociados; si faltan, muestra alerta y no envia.
- Seguimiento: boton "Seguimiento" despliega el historial de comentarios de la cotizacion y permite anadir nuevos comentarios.

### Flujo financiero en el detalle (estado `pendiente`)
- Pestañas: Preparacion (interna), Impuestos (calculo fiscal), Cotizacion Final (vista cliente), Comentarios.
- Preparacion: lista interna de items a comprar. Boton `+` / "Crear Item" abre modal:
  - Seleccionar ItemEmpresa y luego Proveedor del item (se muestra la moneda).
  - Si el proveedor vende en USD, aparece "Recargo por Dolar" para ajuste financiero.
  - Completar Cantidad y Precio unitario; opcional Descripcion. "Guardar" agrega; "Cancelar" descarta.
  - La tabla muestra Nombre, Proveedor, Cantidad, Precio Unitario, Total Neto y acciones Editar/Eliminar. Solo visible para administradores.
- Impuestos: calcula IVA venta/compra, PPM, total impuesto y ganancia segun los items cargados. Vista interna.
- Cotizacion Final: vista para el cliente con items, cantidad, valor unitario y total de la cotizacion.
- Comentarios: notas internas alineadas con Seguimiento.

### Envio, aprobacion y rechazo
- Enviar cotizacion a cliente: boton "Enviar Cotizacion solicitantes" (requiere solicitantes + al menos 1 item). Modal muestra correos destino; "Enviar" dispara el mail y cambia el estado a `Enviada`.
- Estado `Enviada`: se bloquea edicion de detalles, items y solicitantes. Acciones: "Enviar copia de la cotizacion" (usuarios internos/externos), "Aprobar Cotizacion" (modal con solicitante, fecha de aprobacion e items), "Rechazar Cotizacion" (confirmacion).
- Aprobacion: al aceptar en el modal, la cotizacion pasa a `Aceptada` con los items seleccionados aprobados.
- Rechazo: al confirmar, pasa a `Rechazada` y queda solo para consulta.
- Seguimiento sigue disponible para notas internas, sin cambiar estados.

### Estado `pendiente`
- Entrada: creacion.
- Acciones: agregar/editar items, solicitantes, campos, seguimientos; enviar cotizacion (edicion solo permitida en este estado).
- Transiciones:
  - `enviada` via `enviar-cotizacion-solicitantes` (requiere solicitantes y al menos 1 item; dispara correo y cambia estado).
  - `aceptada` via `aprobar-cotizacion` (requiere `solicitante_id`, `fecha_aprobacion`, `item_ids`).
  - `rechazada` via UI.
  - `expirada`: Cambio automático diario (si `fecha_vencimiento` < hoy) o manual.
- Requisitos para aprobar: los `item_ids` quedan `aprobado=True`; se crea `ItemEmpresa` si falta.

### Estado `enviada`
- Entrada: `enviar-cotizacion-solicitantes`.
- Acciones (UI): enviar copia por correo (internos/externos), aprobar (modal con solicitante/fecha/items), rechazar (confirmacion).
- Restricciones: sin edicion de items, solicitantes ni datos generales (todo bloqueado fuera de `Pendiente`).
- Transiciones: `aceptada` via aprobar; `rechazada` via UI; `expirada` automática/manual.
- Nota: puede quedar en `enviada` si el cliente solo recibe la cotizacion sin decidir.

### Estado `aceptada`

- Entrada: `aprobar-cotizacion`.
- Acciones (UI): enviar copia por correo, descargar PDF, crear/gestionar OC por proveedor (`crear-orden-compra` con `proveedor_id`):
  - Boton "Crear OC": lista proveedores y crea una OC por cada uno.
  - Si ya existe OC para un proveedor, boton "Detalle OC"/"Gestionar OC" permite ver la OC existente; solo muestra "Crear OC" para proveedores faltantes.
- Requisitos para crear OC: cada item debe tener `item_empresa` y `proveedor_empresa` igual al `proveedor_id`; si hay varios proveedores, se crean varias OC.
- Transiciones: sin accion de retroceso; solo cambios manuales (no recomendados).

### Estado `rechazada` / `expirada`
- Entrada: rechazo UI o cambio manual.
- Acciones: solo consulta; no se crean OC ni se editan campos.
- Transiciones: manual si se requiere reabrir.

## Módulo: Compras
## Orden de Compra (OC)

### Creacion de OC (lista o desde cotizacion)
- Origenes:
  - Desde cotizacion aceptada (modal "Ordenes de Compra" muestra proveedores y permite crear/ver OC por proveedor).
  - Desde lista `Compras > Ordenes Compra` via boton `+` / "Crear Orden de Compra" (modal pide Empresa responsable, Cliente solicitante, Proveedor, Observaciones; acciones Crear/Cancelar).
- Estado inicial: `Borrador` al crear.
- Detalle de OC: secciones "Datos Orden de Compra" (codigo, proveedor, cliente, moneda, observaciones, estado) e "Items de la Compra".
  - Boton "Agregar items del proveedor" abre panel lateral para seleccionar item del proveedor, cantidad y precio unitario; guardar o cancelar.
  - Lista de items muestra Nombre, Cantidad, Precio, Total y acciones Editar/Eliminar.
- Acciones globales en detalle:
  - "Cotizacion previa" (solo si viene de cotizacion) navega al detalle de la cotizacion.
  - "Terminar Borrador" avanza el estado y bloquea edicion de items/campos segun flujos siguientes.

Estados relevantes: `-` borrador, `0` pendiente de aprobacion, `1` aprobada, `2` rechazada, `3` enviada, `4` parcial, `5` completa (otros 6/7 manuales).

### Estado `-` (Borrador)
- Entrada:
  - Crear OC directa en lista de OCs (Empresa, Cliente, Proveedor, Observaciones), o
  - Crear OC desde cotizacion aceptada (detalle de cotizacion, `crear-orden-compra` con `proveedor_id`).
- Acciones (UI detalle): Terminar borrador, Agregar items del proveedor, Ver PDF; Cotizacion previa si aplica.
- Backend: agregar items (`add_item`/`add_item_no_proveedor`), editar campos, eliminar items.
- Transicion: `0` via Terminar borrador (confirma) o `3` via `pasar_enviado_proveedor` (salta aprobacion y crea placeholders `ItemOrdenCompraEnStock`).
- Nota: en borrador se pueden seguir agregando/editar items; al salir de borrador se bloquea edicion segun el estado siguiente.

### Estado `0` (Pendiente de aprobacion)

- Entrada: confirmar “Terminar borrador”.
- Acciones (UI): “Aceptar o Rechazar Orden”, “Volver a borrador”, “Ver PDF”; “Cotizacion previa” si aplica.
- Transiciones: `1` aprobar; `2` rechazar; `-` volver a borrador.

### Estado `1` (Aprobada)
- Entrada: aprobar desde `0`.
- Acciones (UI): enviar al proveedor (pasa a `3`), ver PDF, “Cotizacion previa”.
- Nota: enviar al proveedor permite luego completar (4/5).

### Estado `2` (Rechazada)
- Entrada: rechazar desde `0`.
- Acciones (UI): “Ver PDF”; “Cotizacion previa” si aplica.
- Transiciones: manual si se reabre.

### Estado `3` (Enviada al proveedor)
- Entrada: desde `1`, accion UI “Enviar al proveedor” (modal pide correo) o backend `pasar_enviado_proveedor`.
- Efecto: crea placeholders `ItemOrdenCompraEnStock` sin bodega.
- Acciones (UI): “Reenviar correo”, “Completar Orden de Compra”, “Volver a borrador”, “Descargar PDF”, “Cotizacion previa”.
- Completar OC (UI): modo recepcion; se pide Fecha de compra y por item se puede “Editar Item” (bodega, cantidad recibida, numeros de serie).
- Siguiente: `4` o `5` via `completar_orden_compra`.

### Estado `4` (Parcialmente recibida)
- Entrada: desde `3`, “Confirmar Recibir Items” parcial o `completar_orden_compra` parcial.
- Requiere `bodega_temporal` en cada placeholder.
- Efecto: ingreso parcial a `StockItemEnBodega`.

### Estado `5` (Completada)
- Entrada: desde `3`, “Confirmar Recibir Items” total o `completar_orden_compra` full.
- Requiere `bodega_temporal`.
- Efecto: ingreso total a `StockItemEnBodega`.
- Acciones (UI): “Ver PDF”, “Cotizacion previa”. Sin mas cambios en frontend.

### Otros estados (6,7)
- Solo manual; sin flujo validado en vistas.

### Notas y riesgos OC
- Si se salta `pasar_enviado_proveedor`, no hay placeholders y `completar_orden_compra` falla.
- Sin `bodega_temporal` en placeholders, no se puede completar (4/5).

## Módulo: Bodegas/Guias
## Guia de Salida (estado a estado)
Estados: P pendiente, ER revisada, ET en transito, E entregada, T terminada; retrocesos R revertida, PR parcialmente revertida.

### Estado `Pendiente`
- Entrada (UI): submodulo de Guias en Bodega; requiere Bodega, Motivo, Tecnico asignado.
- Acciones: agregar items desde stock (reserva: baja stock disponible, sube cantidad_no_disponible), definir receptor (cliente). Bloquear avance sin items (deseado).
- Transicion: `ER` via “Completar Guia de Salida” (si falta receptor, lo solicita).

### Estado `ER` (Espera Firma Recibido / Revisada)
- Entrada: completar guia desde `Pendiente`.
- Acciones: aprobacion/entrega; hoy puede crear OT y soporte (1:1 GS->OT->Soporte).
- Transiciones:
  - `ET` via `aprobar_guia` (firma, valida tecnico/fecha si hay soporte).
  - Retrocesos `R/PR` via `devolver_a_bodega`; `volver_pendiente` reinicia a P.

### Estado `ET` (En transito)
- Entrada: `aprobar_guia`.
- Acciones: entrega final; soportes pueden pasar a `en_proceso`; OT pasa a `en_proceso` si aplica.
- Transicion: entrega efectiva `E/T`.

### Estado `E/T` (Entregada/Terminada)
- Entrada: entrega con destinatario. Si no existia OT, se crea y se asocia soporte (actual 1:1).
- Acciones: cierre operativo; posibles devoluciones (`R/PR`).

### Estados `R/PR` (Revertida / Parcialmente revertida)
- Entrada: `devolver_a_bodega` total/parcial.
- Acciones: ajusta stock y series; puede volver a P con `volver_pendiente`.

### Notas y ajuste propuesto GS/OT
- Las guias se crean contra stock disponible (no contra estado de OC); se puede guiar aunque la OC este parcial.
- Buen patron: no mezclar items sin stock; guiar lo disponible y emitir otra guia cuando lleguen faltantes.
- Actual: cada guia crea su propia OT y soporte (1:1); no se pueden ligar varias guias a una misma OT.
- Propuesto: no crear OT automatica; permitir GS y OT por separado y vincular una o varias GS a trabajos (Servicio/Soporte) en la OT, soportando multiples GS por OT y entregas parciales/multiples viajes.

## Módulo: Ordenes de Trabajo
## Orden de Trabajo (OT) y soportes (estado a estado)
Estados OT: pendiente, en_proceso, completada, cerrada, facturada/cancelada.
- Estado `pendiente`: entrada por creacion manual de OT (soporte inicial o servicio) o creacion automatica desde GS (flujo actual 1:1). Acciones: asignar tecnico/cliente solicitante, agregar servicios/soportes, adjuntos, seguimientos. Transicion: `en_proceso` cuando un soporte pasa a `en_proceso` (requiere tecnico y fecha; si tiene guia, que este ET/E/T).
- Estado `en_proceso`: ejecutar trabajos, seguimientos, adjuntar guias (propuesto: permitir multiples GS). Transicion: `completada` / `cerrada`.
- Estado `completada` / `cerrada`: trabajos finalizados; cierre administrativo puede generarse al poner `cerrada` (validaciones factura/retroalimentacion/compra/guia).
- Otros (`facturada` / `cancelada`): uso manual/operativo.

### Matriz de permisos UI — Órdenes de Trabajo

Resumen de reglas de visibilidad/habilitación en la UI para OTs.

**Convención encontrada:**
- Checks inline en JSX (ternarios/condicionales en markup)
- Estados por componente: cada componente verifica `detalleOrdenTrabajo.estado`
- No existe centralización actual

**Cambios puntuales recomendados (resumen):**
1. `ListaOT` — Botón `Eliminar OT`: mostrar solo si `estado === 'pendiente'`
2. `ListaServiciosOT` / `ListaSoportesTecnicosOT` — Vincular/Desvincular Guías: mostrar solo en `pendiente`
3. `ComprasEnOT` / `RendicionesOT` — Crear Compra/Rendición: permitir solo en `en_proceso`
4. `Adjuntos` / `Fotos` — Permitir creación en `pendiente|en_proceso|completada`

**Tabla de cambios (resumen):**

| Componente | Acción | Recomendación |
|---|---:|---|
| ListaOT | Eliminar OT | Mostrar solo en `pendiente` |
| ListaServiciosOT | Vincular/Desvincular Guía | Mostrar solo en `pendiente` |
| ComprasEnOT | Crear Compra | Permitir solo en `en_proceso` |
| RendicionesOT | Crear Rendición | Permitir solo en `en_proceso` |

## Casos de uso (Cotizacion -> OC -> Guia -> OT)
### Caso 1: Entrega unica
- Cotizacion aceptada con items de varios proveedores.
- Se crean multiples OC (una por proveedor) y se completan para ingresar stock.
- Con todo disponible, se arma una sola Guia de Salida.
- Al comprobar/entregar, se crea 1 OT + soporte (1:1). Soporte y OT pasan a `en_proceso`; luego se cierran.

### Caso 2: Entregas parciales (multiples viajes)
- Cotizacion aceptada -> multiples OC. Llegan items parciales.
- Se genera una Guia por cada viaje con lo disponible. Cada guia hoy crea su propia OT y soporte.
- Resultado: varias OT si hay varios viajes; con el ajuste propuesto se buscaria permitir multiples GS ligadas a una misma OT.

---

## Checklist de Validación (BLOQUEs 1-5)

### BLOQUE 1: Cotizaciones Backend
```bash
cd backend
python manage.py test cotizaciones -v 2
```
✅ **Verificar:**
- Model `Cotizacion` tiene `porcentaje_recargo` (PositiveIntegerField, default=0)
- 6 propiedades en `ItemCotizacion` usan `porcentaje_recargo or 0`
- Tests pasan sin errores

### BLOQUE 2: Bodegas - Data-Leak Security
```bash
cd backend
python manage.py test bodegas.tests.test_views -v 2
```
✅ **Verificar (manual o unitario):**
- `VoucherDevolucionViewSet.get_queryset()`: Filtra por `orden_trabajo__sucursal` + `empresa`
- `ItemEnCompraViewSet.get_queryset()`: Filtra por `compra__sucursal`
- `ItemsGuiaSalidaViewSet.get_queryset()`: Filtra por `guia__bodega__sucursal` + `empresa`
- ⚠️ CRÍTICO: Previene data leaks cross-company

### BLOQUE 3: Frontend Core
```bash
cd frontend
npx tsc --noEmit
npm run build
npm run lint
```
✅ **Verificar (manual testing requerido):**
1. **Modal backdrop**: Click en scrollbar → NO cierra ✅ | Click en backdrop → SÍ cierra ✅
2. **Aside layout**: Responsive en mobile/desktop, scroll vertical funcional ✅
3. **priceFormat**: Muestra $123.456 (CLP, sin decimales), no USD ✅

### BLOQUE 4: Guías de Salida
✅ **Sistema completo con mismos filtros de seguridad que BLOQUE 2**
- `GuiaSalida` CRUD operativo
- Filtros PersonalizacionUsuario implementados
- No requiere validación adicional (patrón igual BLOQUE 2)

### BLOQUE 5: Órdenes Trabajo V2
✅ **Sistema completo:** `ordentrabajov2` activo, refactores frontend presentes
- No requiere migración adicional (ya en main)
- Refactores cosméticos deferred a próximo sprint
---