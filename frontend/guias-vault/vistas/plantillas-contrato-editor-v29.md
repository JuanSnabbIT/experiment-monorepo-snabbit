---
viewId: plantillas-contrato-editor-v29
titulo: Editor de Plantillas de Contrato (v2.9)
ruta: /registros/plantillas-contrato/:plantillaId
estado: borrador
actualizado: 2026-07-28
---

# Editor de Plantillas de Contrato

Esta guía explica cómo usar el editor de plantillas para crear y mantener los documentos base desde los cuales el sistema genera contratos.

## Qué es una plantilla

![[fragmentos/que-es-una-plantilla]]

## La pantalla del editor

Al abrir una plantilla se muestra una sola hoja de trabajo, similar a un procesador de texto, con una barra superior de acciones.

### Barra superior

- **Flecha de retorno**: vuelve a la lista de plantillas.
- **Título y estado**: junto al nombre se muestran indicadores de la plantilla:
    - **Borrador vN**: número de versión actual.
    - **Activa**: la plantilla está disponible para generar contratos.
    - **Default**: es la plantilla que el sistema propone por defecto para su tipo de contrato.
    - **Cambios sin guardar**: hay ediciones pendientes de guardar.
- **Vista previa / Editor**: alterna entre el modo de edición y la vista previa paginada.
- **Guardar cambios**: guarda el documento. El guardado es manual — el editor no guarda automáticamente. Si intentas cerrar o recargar la página con cambios pendientes, el navegador pedirá confirmación.
- **Más opciones (botón de tres puntos)**: abre la configuración de la plantilla (nombre y datos generales).
- **Duplicar**: crea una copia completa de la plantilla y abre esa copia. Útil para crear una variante sin arriesgar la original.

## Escribir el documento

El documento se edita directamente sobre la hoja: escribe, aplica formato al texto, inserta tablas y saltos de página donde necesites que el contenido comience en una hoja nueva. La hoja refleja el tamaño de página configurado, de modo que lo que ves corresponde a cómo se distribuirá el PDF final.

## Etiquetas: datos que se completan solos

Las etiquetas son los datos variables del contrato. En el documento se ven como fichas de color (por ejemplo, el nombre del cliente o la fecha de inicio); al generar un contrato real, cada etiqueta se reemplaza por el dato correspondiente.

- El catálogo de etiquetas disponibles depende del tipo de contrato de la plantilla: una plantilla de contrato laboral ofrece datos del trabajador; una de servicios, datos del cliente y del acuerdo comercial.
- Inserta una etiqueta posicionando el cursor donde debe ir el dato y seleccionándola desde el catálogo.
- Nunca escribas un dato variable a mano (por ejemplo, un nombre o un monto): quedaría congelado en la plantilla y saldría igual en todos los contratos generados.

## Bloques dinámicos (plantillas comerciales)

En plantillas de tipo servicios, venta o licencias puedes insertar bloques que el sistema completa con los datos reales del contrato al momento de generarlo:

- **Tabla de servicios contratados** (plantillas de servicios).
- **Ítems cotizados y cuotas** (plantillas de venta; los ítems provienen de las cotizaciones aceptadas vinculadas al contrato).
- **Tabla de licencias** (plantillas de licencia).
- **Condiciones especiales** y **Resumen comercial** (disponibles en los tres tipos).

En el editor, estos bloques se muestran como una tabla que indica qué campo llenará cada columna — no muestran datos de ejemplo, porque la plantilla no pertenece a ningún contrato en particular.

## Contenido condicional (plantillas laborales)

En plantillas de contrato laboral puedes marcar partes del documento para que aparezcan solo cuando el contrato cumple una condición: por ejemplo, un párrafo que solo se incluye si el contrato es de plazo fijo, si el trabajador tiene bono de colación o si el pago es por banco. Al generar el contrato, el sistema incluye u omite esos bloques automáticamente según los datos del contrato.

## Firmas

Puedes insertar la zona de firmas eligiendo uno de los formatos disponibles:

- Solo firma del trabajador.
- Solo firma del empleador.
- Trabajador y empleador (dos líneas lado a lado).

Los rótulos de cada línea de firma pueden editarse después de insertarla.

## Encabezado y pie de página

El encabezado y el pie son opcionales y se configuran desde el propio editor:

- **Encabezado**: admite texto libre. Si la empresa tiene un logo registrado en el sistema, este se incluye automáticamente en el PDF — no es necesario subirlo en el editor.
- **Pie de página**: admite texto libre y numeración automática de páginas.

## Vista previa

El botón **Vista previa** muestra el documento paginado tal como quedará el PDF final, hoja por hoja. Úsala antes de dar por terminada una edición: es la forma de verificar cortes de página, tablas y zonas de firma sin generar un contrato de prueba.

## Recomendaciones

- Guarda con frecuencia: el guardado es manual.
- Para experimentar con cambios grandes, usa **Duplicar** y trabaja sobre la copia.
- Revisa la vista previa después de insertar tablas o bloques dinámicos: son los elementos que más afectan la paginación.
