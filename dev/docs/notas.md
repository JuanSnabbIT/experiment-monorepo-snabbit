---
Responsable: Fabián
Email: -
Proxima_revision: 2026-08-04
Estado: staging
---

# Notas de Desarrollo — Bloc Rápido

Última edición: 2026-02-04

Propósito: notas rápidas y tareas personales; mantener breve, agrupado por módulo, con enlaces a docs canónicos.

Quick links
- Decisiones y especificaciones: [dev/docs/analisis.md](dev/docs/analisis.md)
- Inventario de sistemas: [dev/docs/sistemas.md](dev/docs/sistemas.md)
- Roadmap: [dev/docs/planificacion.md](dev/docs/planificacion.md)

Template rápido para una nota
- Título — 1 línea
- Contexto — 1 línea
- Próximo paso/TODO — 1 línea

## Notas activas (breves)
- Sin notas activas; ver planificacion.md para backlog.

---

## Notas migradas a planificacion.md (2026-02-04)

### Cotizaciones
- [✅] Revisar: manejo de usuarios externos.
- [✅] Dólar observado: carga asíncrona al crear (rápido), actualización automática en tiempo real al cambiar fecha en edición (2026-01-27).
- [✅] Revisar el añadir items a la cotización: actualmente en el modal al seleccionar un item, rellena el proveedor, pero no rellena correctamente los datos que vienen con el proveedor; quizá no se deba rellenar el proveedor al seleccionar el item, ya que un mismo item puede tener varios proveedores con distintos precios y condiciones.
- [✅] Revisar renderizado del frontend: al abrir el detalle de una cotización y luego entrar a otra, se ve por un momento la cotización anterior y luego se recargan los datos.
- [✅] Revisar modals para aplicar SweetAlert2 en frontend (Eliminar solicitante, eliminar item de cotización, etc.).
- [✅] UI: revisar colores en pestaña "Cotización Final".
- [✅] Revisar modo claro y modo oscuro.
- Revisar la capacidad de crear items nuevos desde el modal de agregar items a la cotización.
✅ Migrado a planificacion.md (2026-02-04)

### Órdenes de Compra
- Revisar generación de PDF y opciones rápidas en UI.
- [✅] Revisar estados de la OC y agregar botón de "avanzar a recepción".
- [✅] Ver función botón "Subir cotización".
- Revisar botones de acción en la lista de OCs (p.ej., eliminar solo en borrador).
- Revisar dólar observado; no permitir fechas de compra futuras.
- [✅] Recepción: si el item ya existe en bodega pero stock es 0, permitir vincular a nueva bodega.
- [✅] Botón "Guardar" más informativo: "Guardar en bodega".
- Revisar capacidad de crear items nuevos desde el modal de agregar items a la OC.
✅ Migrado a planificacion.md (2026-02-04)

### Guías de Salida
- [✅] Vincular GS ↔ OT: permitir múltiples GS por OT (evitar 1:1 automática).
- Mantener guías como fuente de lo entregado vs cotización como lo pactado.
- Se propone: cotización con múltiples GS asociadas y vincular cotizaciones a OTs para seguir el flujo completo.
- Revisar UI de lista y detalle de guías de salida (botones y funcionalidad).
✅ Migrado a planificacion.md (2026-02-04)

### Órdenes de Trabajo (OT)
- Mejorar pestañas: Compras, Insumos, Usuarios, Gastos Operativos, Devoluciones.
- UX: mostrar detalles en modal + enlace a vista completa (validar si aplica a gastos).
- Gastos operativos: tabla maestra en Core/Models para preestablecer precios según categoría.
- Revisar y modificar vinculación GS ↔ OT usando cotizaciones como punto de partida.
- Rapidez en asignación de fechas (rápida y manual), y agregar horas.
- Si una guía vinculada no tiene responsable, asignar el responsable de la OT.
- Firmas: Guías, Serializados y Trabajos (opcional por técnico); permitir “otro” con nombre + firma.
- Tab "Insumos": mostrar items de la guía (tabla anidada) y cotizaciones asociadas.
✅ Migrado a planificacion.md (2026-02-04)

### Rendiciones
- Seguir modificaciones; la forma actual es una idea antigua.
- Revisar modelos con campos desactualizados o no usados.
- Revisar generación del PDF de rendiciones.
✅ Migrado a planificacion.md (2026-02-04)

### Facturación (manual por OTs)
- Flujo: OT completada → Rendición (auto) → disponible para facturación (excluir rechazadas).
- Regla práctica: incluir estados `0,1,2,4` en queries de facturación.
- Estructura: items individuales (compra / gasto_operativo) referenciados desde `Rendicion`.
✅ Migrado a planificacion.md (2026-02-04)

### Bodegas
- [✅] Arreglar registro de stock de items.
- Botones en “movimientos del stock” deben abrir modal similar a OTs.
✅ Migrado a planificacion.md (2026-02-04)

### Otros / Infra
- Revisar Celery: `send_email` task (estabilidad/retry).
- Revisar funcionamiento de Celery, puntualmente `send_email`.
- Mejorar menú sidebar: iconos y desplazamiento con contenido largo.
✅ Migrado a planificacion.md (2026-02-04)

### Equipos
- Evaluar JSONField para historial de mantenimientos/asignaciones/usuarios.
✅ Migrado a planificacion.md (2026-02-04)

---

## Notas migradas a planificacion.md (detalles adicionales)

### Empresas
- La ubicación de los campos cambia al entrar/salir del modo edición.
- Permite añadir como empresa cliente a la misma empresa en sesión.
✅ Migrado a planificacion.md (2026-02-04)

### Sucursales
- Región/Provincia/Comuna no reaccionan al cambiar región.
✅ Migrado a planificacion.md (2026-02-04)

### Items
- En modal de items, permitir crear Fabricante/Categoría si no existen.
- Formato de precio: aceptar `123.456,78`.
✅ Migrado a planificacion.md (2026-02-04)

### Órdenes de Trabajo — Servicios de Soporte Técnico
- En asignación de usuarios, se pueden agregar duplicados.
✅ Migrado a planificacion.md (2026-02-04)

### Órdenes de Trabajo — Insumos
- Si una cotización con item A genera OC con item B adicional, al vincular cotización en OT solo aparece A pero la GS incluye A+B. Definir comportamiento esperado.
- No permite desvincular guías o cotizaciones.
✅ Migrado a planificacion.md (2026-02-04)

### Órdenes de Trabajo — Gastos Operativos
- No es posible editar gastos operativos una vez creados.
✅ Migrado a planificacion.md (2026-02-04)

### Órdenes de Trabajo — Facturación Manual
- Faltan botones para ir a vistas de items (solo OTs).
- Filtro en lista de prefacturas no funciona.
✅ Migrado a planificacion.md (2026-02-04)

---

Notas de proceso
- Mantener `notas.md` como staging; cuando una nota se estabiliza, copiar al doc canónico y añadir `✅ Migrado a <archivo> (YYYY-MM-DD)`.

## Cotizaciones
- Se crean cotizaciones correctamente, se pueden agregar items (si no existen tambien permite crearlos), permite agregar los solicitantes.
- El correo no se esta enviando correctamente en producción, tampoco el reenvio.
- Tampoco permite aprobar manualmente desde el detalle.
- El pdf se descarga correctamente.

## Órdenes de Compra
- Se crean OCs correctamente, se pueden agregar items (si no existen tambien permite crearlos).
- El avance de estados funciona correctamente.
- El pdf se descarga correctamente.
- Permite crear seriales de los items correctamente.
- Existe la funcionalidad previa de subir una cotización, pero no he interactuado con ella.

## Bodegas
- Permite crear bodeegas correctamente.
- El stock de items y el historico es correcto.
- Las bodegas tienen opción de descarga de PDF, no funciona.

## Guias de Salida
- Permite crear guías de salida correctamente, se pueden agregar items.
- El pdf se descarga correctamente.
- Se avanza de estados sin problemas.
- Se estan creando sin "Creado Por"
- Permite agregar items serializados correctamente.

## Órdenes de Trabajo
- Se crean correctamente las Ordenes de trabajo de tipo Servicio General
- Se crean correctamente las Ordenes de trabajo de tipo Soporte Tecnico Remoto y Presencial
- Permite asignar correctamente a usuarios que se le haran soporte, aunque tambien lo permite en el soporte tecnico remoto.
- Permite agregar guías de salida correctamente.
- No esta permitiendo el desvinculado de guias de salida.