---
viewId: plantillas-contrato-lista
titulo: Lista de Plantillas de Contrato
ruta: /registros/plantillas-contrato
estado: borrador
actualizado: 2026-07-28
---

# Plantillas de Contrato

Esta guía explica la pantalla de gestión de plantillas: cómo encontrarlas, crearlas y administrarlas.

## Qué es una plantilla

![[fragmentos/que-es-una-plantilla]]

## La pantalla de lista

La pantalla muestra todas las plantillas de tu empresa en una tabla. En la parte superior encuentras:

- **Filtro por tipo**: limita la lista a un tipo de contrato (Licenciamiento, Venta, Servicios o Contrato Laboral).
- **Buscador por título**: filtra las plantillas por su nombre a medida que escribes.
- **Nueva plantilla**: abre el formulario de creación.

### Columnas de la tabla

- **Título**: el nombre de la plantilla. Al hacer clic se abre el editor.
- **Tipo contrato**: para qué tipo de contrato sirve la plantilla. El tipo determina qué etiquetas y bloques estarán disponibles en el editor, y no puede cambiarse después de creada.
- **Scope**: a quién aplica la plantilla.
    - **Global**: disponible para contratos con cualquier cliente.
    - **Nombre de un cliente**: plantilla exclusiva para contratos con ese cliente (por ejemplo, un cliente que exige cláusulas propias).
- **Versión**: número de versión actual de la plantilla.
- **Estado**: **Activa** significa que puede usarse para generar contratos; **Inactiva**, que está guardada pero no disponible.
- **Secciones**: cantidad de secciones del documento (aplica a plantillas del editor por secciones).
- **Acciones**: editar (abre el editor) y eliminar.

## Crear una plantilla

El botón **Nueva plantilla** abre un formulario con estos campos:

- **Título** (obligatorio): nombre con el que identificarás la plantilla.
- **Tipo de contrato** (obligatorio): elige con cuidado — define el catálogo de datos variables del editor y no se puede cambiar después. Si te equivocas, deberás crear una plantilla nueva.
- **Descripción** (opcional): notas internas sobre el propósito de la plantilla.
- **Cliente**: deja **Global** para que sirva con cualquier cliente, o elige un cliente específico para restringirla.
- **Editor**: elige con qué editor se redactará la plantilla.
    - **Documento único (v2.9)**: el editor recomendado, similar a un procesador de texto, con contenido condicional, zona de firmas y vista previa idéntica al PDF final.
    - **Editor de secciones (v2)**: el editor anterior, que organiza el documento en secciones separadas.

    Esta elección puede cambiarse más adelante desde la configuración de la plantilla, pero con precaución: al pasar una plantilla de v2.9 a v2, el documento guardado no se pierde, pero deja de ser editable desde el editor de documento único.

Al crear la plantilla, el sistema te lleva directamente al editor para redactar su contenido.

## Eliminar una plantilla

El botón de eliminar pide confirmación antes de borrar. Ten en cuenta:

- Las **plantillas globales del sistema** (las que vienen incluidas para todas las empresas) solo pueden ser eliminadas por un superadministrador; para el resto de los usuarios el botón aparece deshabilitado.
- Si solo quieres dejar de usar una plantilla sin perderla, es preferible marcarla como inactiva desde su configuración en el editor, en lugar de eliminarla.
