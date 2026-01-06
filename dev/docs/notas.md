# Notas de Desarrollo y Mejoras

Manejar bien lo de los estados y flujos, el tecnico solo interactua en la OT, la Guia de Salida avanza sola


revision de Items y serializados para la correcta asginación en las OTs y la devolución en caso de uso/no uso de estas

- Customalert para los modals

- Boucher de registro de devoluciones de items

# Cotizaciones: 
- Filtro en la lista para ver por tipos, Cotizaciones rechazadas permiten crear copias para retomarlas.
- Revisar como se genera el pdf
- Crear OC: Boton rapido crear todas OC

# Ordenes de Compra: 
- Revisar como se genera el pdf.
- Revisar Dolar observado; no permitir fechas de compras superiores al dia actual.
- Cambiar flujo OC: al crear en borrador se agregan los items, al enviar al proveedor que pida Fecha de Compra, al cambiar de estado a "entregado" pedir Fecha de Entrega, Agregar fotos a OC

# Guias de salida:
- Al crearla, referenciar al cliente.
De esta manera, se puede buscar solamente las guias de salida de ese cliente en las OTs
- Mejorar UI de Vista Lista Guias de Salida

# Ordenes de Trabajos: 
- Generar una vista para las rendiciones, no debe de quedar guardado, debe ser solo frontend y referenciar lo que existe
- Gestionar los botones para que se pueda/no se pueda hacer ciertas acciones durante cierto estado
- Permitir borrar Compras hechas en la pestaña "Compras"
- Seguimiento/Comentarios: Deben ser de tipo Comentario Tecnico, Incidencia y Comunicación al Usuario
- Actualizar botones para mayor orden; regla de los 3 clicks para crear/setear una OT
- Cambiar el boton de avanzar estado de los trabajos en la OT, esta bien que el cambio de "pendiente" a "en proceso" sea solo un click sin opciones, pero cuando se esta en estado "en proceso" debe ser un dropdown con los estados "Completado", "Medianamente Completado" y "No realizado"

# Datos de prueba: 
- EmpresasCliente con PPM y Recargo asignados. 
- DetalleProveedor no tiene TipoMoneda

# Bodegas:
- arreglar stock de items


# Reglon de facturización:
- Traer detalles de cotizaciones y detalles de OTs.
- modificar tabla CierreAdministrativoOT, agregar tabla de detalle y constraste, guardar estos datos para la correcta facturación en campos jsonfield

# Rendiciones:
- Crear tabla maestra dentro de Core/Models para la tabla "VariableRendicion" en donde preestablecer las categorias de rendición y sus respectivos montos de cargo, para que al momento de crear una rendición solo se seleccione la categoria y el sistema automáticamente asigne el monto correspondiente según la tabla maestra creada.