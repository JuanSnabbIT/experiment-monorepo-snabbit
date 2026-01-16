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
- Revisar: creación de items, porcentaje de recargo, título en la vista y manejo de usuarios externos.
  
## Órdenes de Compra
- Revisar generación de PDF y opciones rápidas en UI.
- Revisar los estados de la OC y agregar un boton de "avanzar a recepción" de manera que el sistema permita hacer todo el proceso "largo" de la Orden de Compra, o una vez generada, avanzar directamente a la recepción de los items.

## Guías de Salida
- Vincular GS ↔ OT: permitir múltiples GS por OT (evitar 1:1 automática).
- Mantener guías como fuente de lo entregado vs cotización como lo pactado.
- Actualmente el sistema permite vincular GS mediante un trabajo dentro de la OT, osea un trabajo puede tener una GS. Estoy pensando en hacer que una cotización pueda tener múltiples GS asociadas y luego se pueda vincular cotizaciones a las OTs. El razonamiento es que el proceso actualmente no es tan "fluido" y que no hay actualmente una forma de seguir el flujo de: Un cliente solicita una cotización -> la cotización puede generar una o varias OCs ->  los items de las OCs se recepcionan en bodega -> se genera la guia de salida y la OT -> se vincula la GS a la OT, ya que no hay forma de decir que items de una cotización/OC fueron los que se entregaron en la GS y luego en la OT.

## Órdenes de Trabajo (OT)
- Mejorar pestañas: Compras, Insumos, Usuarios, Gastos Operativos, Devoluciones (EN DESARROLLO). 
- UX: mostrar detalles en modal + enlace a vista completa. (COMPLETA?: MODAL PARA COMPRAS Y GUIAS, DEBE GASTOS TENER?)
- Gastos Operatios: Crear tabla maestra dentro de Core/Models para la preestableción de los preciós de los gastos operativos según la categoria (ejemplo: Si se selecciona "Transporte Publico" como categoria de gasto, que prellene el precio según la tabla maestra).

## Rendiciones
- Seguir modificaciones, la forma actual es una idea antigua.

## Facturación (manual por OTs)
- Flujo: OT completada → Rendición (auto) → disponible para facturación (excluir rechazadas).
- Regla práctica: incluir estados `0,1,2,4` en queries de facturación.
- Estructura: items individuales (compra / gasto_operativo) referenciados desde `Rendicion`.

Migraciones / Especificaciones
- Especificación `CierreAdministrativoOT` (2026-01-12) — ✅ Migrado a `dev/docs/analisis.md` (2026-01-15)

## Bodegas
- Arreglar registro de stock de items

## Otros / Infra
- Revisar Celery: `send_email` task (estabilidad/retry).  

--------------------------------------------------
Notas de proceso
- Mantener `notas.md` como staging; cuando una nota se estabiliza, copiar al doc canónico y añadir en la nota original la marca: `✅ Migrado a <archivo> (YYYY-MM-DD)`.

- Revisar el funcionamiento de el celery, puntualmente el de send email task

