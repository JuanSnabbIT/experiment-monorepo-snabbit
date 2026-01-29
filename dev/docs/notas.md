# ---
---
Responsable: -
Email: -
Proxima_revision: -
Estado: staging
---

# Notas de Desarrollo — Bloc Rápido

Última edición: 2026-01-15

Propósito: notas rápidas y tareas personales; mantener breve, agrupado por módulo, con enlaces a docs canónicos.

Quick links
- Decisiones y especificaciones: [dev/docs/analisis.md](dev/docs/analisis.md)
- Inventario de sistemas: [dev/docs/sistemas.md](dev/docs/sistemas.md)
- Roadmap: [dev/docs/planificacion.md](dev/docs/planificacion.md)

Template rápido para una nota
- Título — 1 línea
- Contexto — 1 línea
- Próximo paso/TODO — 1 línea

Ejemplos rápidos (activos)
- [ ] Actualizar PDF de Rendiciones — mostrar 3 totales (reembolso técnico, facturable cliente, no facturable)
- [ ] Revisar filtros `PersonalizacionUsuario` en ViewSets sospechosos
- [ ] Añadir `empresa_propietaria` a `Equipo` (ver `analisis.md`)

--------------------------------------------------

## Cotizaciones
- [✅] Revisar: manejo de usuarios externos. 
- [✅] Dolar observado: carga asíncrona al crear (rápido), actualización automática en tiempo real al cambiar fecha en edición (2026-01-27)
- [✅] Revisar el añadir items a la cotización: actualmente en el modal al seleccionar un item, rellena el proveedor, pero no rellena correctamente los datos que vienen con el proveedor, talvez no se deba rellenar el proveedor al seleccionar el item, ya que un mismo item puede tener varios proveedores con distintos precios y condiciones. 
- Revisar el renderizado del frontend: al abrir la vista del detalle de una cotizacion y luego salir y entrar nuevamene a la vista del detalle de otra cotización, se ve por un momento los datos de la cotización anterior y luego se recargan los datos y muestran los datos de la cotización actual.
- Revisar SweetAlert2 en frontend en los modals (Eliminar solicitante, eliminar item de cotización, etc)
- UI: Revisar colores en pestaña "Cotización Final"
- Revisar modo claro y modo oscuro.
  
## Órdenes de Compra
- Revisar generación de PDF y opciones rápidas en UI.
- [✅] Revisar los estados de la OC y agregar un boton de "avanzar a recepción" de manera que el sistema permita hacer todo el proceso "largo" de la Orden de Compra, o una vez generada, avanzar directamente a la recepción de los items.
-   Ver función boton "Subir cotización"
- Revisarar los botones de acción en la lista de OCs, por ejemplo el boton de Eliminar deberia de desaparecer si la OC esta en otro estado que no sea "Borrador".
- Revisar Dolar observado; no permitir fechas de compras superiores al dia actual.
- En ordenes de Compra, al recepcionar si el item ya existe en bodega pero su stock es 0, permita vincular a una nueva bodega la compra entrante.
- Boton de "Guardar" sea mas informativo visualmente, "Guardar en bodega"

## Guías de Salida
- [✅] Vincular GS ↔ OT: permitir múltiples GS por OT (evitar 1:1 automática).
- Mantener guías como fuente de lo entregado vs cotización como lo pactado.
- Actualmente el sistema permite vincular GS mediante un trabajo dentro de la OT, osea un trabajo puede tener una GS. Estoy pensando en hacer que una cotización pueda tener múltiples GS asociadas y luego se pueda vincular cotizaciones a las OTs. El razonamiento es que el proceso actualmente no es tan "fluido" y que no hay actualmente una forma de seguir el flujo de: Un cliente solicita una cotización -> la cotización puede generar una o varias OCs ->  los items de las OCs se recepcionan en bodega -> se genera la guia de salida y la OT -> se vincula la GS a la OT, ya que no hay forma de decir que items de una cotización/OC fueron los que se entregaron en la GS y luego en la OT.
- Revisar UI de la vista de la lista y la vista detalle de guias de salida, revisar botones y funcionalidad

## Órdenes de Trabajo (OT)
- Mejorar pestañas: Compras, Insumos, Usuarios, Gastos Operativos, Devoluciones (EN DESARROLLO). 
- UX: mostrar detalles en modal + enlace a vista completa. (COMPLETA?: MODAL PARA COMPRAS Y GUIAS, DEBE GASTOS TENER?)
- Gastos Operatios: Crear tabla maestra dentro de Core/Models para la preestableción de los preciós de los gastos operativos según la categoria (ejemplo: Si se selecciona "Transporte Publico" como categoria de gasto, que prellene el precio según la tabla maestra).
- Revisar y modificar la vinculación de guias de salida y OTs: ocupar las cotizaciones como "punto de partida" sobre
lo que se pide y las guias de salida sobre "lo que se tiene"
- Rapidez en la asignación de fechas (2 formas, rapida y manual), tambien agregar horas en la fecha.
- Que las guias vinculadas sin Responsable, asignarle el responsable en la OT a las guias de salida.
- Firmas: Tres tipos de firmas, Guias, Serializados y Trabajos (opcional por el tecnico), no pedir usuarioEmpresa, para casos de prospectos, poner el nombre como string y la firma. (lista de usuarios y "otro" que permita escribir)
- Tab "Insumos": Que muestre los items de la guia y no la guia en si.
		Aplicar tabla anidada: que muestre primero la fila de la Guia y luego las filas de sus items.
- Tambien deberia de mostrarse las cotizaciones asociadas a la OT en la misma pestaña de "Insumos", ya que actualmente no hay forma de ver que items de que cotizacion estan asociados a la OT.

## Rendiciones
- Seguir modificaciones, la forma actual es una idea antigua.
- Revisar los modelos: veo varios campos de varios modelos desactualizados o que no se usan.
- Revisar la generación del PDF de rendiciones.

## Facturación (manual por OTs)
- Flujo: OT completada → Rendición (auto) → disponible para facturación (excluir rechazadas).
- Regla práctica: incluir estados `0,1,2,4` en queries de facturación.
- Estructura: items individuales (compra / gasto_operativo) referenciados desde `Rendicion`.

Migraciones / Especificaciones
- Especificación `CierreAdministrativoOT` (2026-01-12) — ✅ Migrado a `dev/docs/analisis.md` (2026-01-15)

## Bodegas
- Arreglar registro de stock de items [✅]
- Que los botones en "movimientos del stock" abran un modal similar a los de las OTs


## Otros / Infra
- Revisar Celery: `send_email` task (estabilidad/retry).  
- Revisar el funcionamiento de el celery, puntualmente el de send email task
- Revisar y mejorar menu sidebar: agregar/mejorar iconos, agregar función de desplazamiento cuando el contenido es muy largo.

## Equipos
- Estaba pensando en añadir un campo JSONField al modelo de equipos, ya que como ultimamente he usado JSONField para las facturaciones y ahora para las firmas en las OTs. Esto permitiria tener un control mas flexible sobre las asignaciones de los equipos, por ejemplo crear el registro historico de mantenimientos, asignaciones a usuarios, etc.

--------------------------------------------------

Notas de proceso
- Mantener `notas.md` como staging; cuando una nota se estabiliza, copiar al doc canónico y añadir en la nota original la marca: `✅ Migrado a <archivo> (YYYY-MM-DD)`.

