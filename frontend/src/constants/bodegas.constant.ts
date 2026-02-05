export const ESTADOS_OC = [
    { value: '-', label: 'Borrador' },
    { value: '0', label: 'Pendiente de aprobación' },
    { value: '1', label: 'Aprobada' },
    { value: '2', label: 'Rechazada' },
    { value: '3', label: 'Enviada al proveedor' },
    { value: '4', label: 'Parcialmente recibida' },
    { value: '5', label: 'Completada' },
    { value: '6', label: 'Cancelada' },
    { value: '7', label: 'Cerrada' },
];

export const ESTADOS_COMPRA = [
    { value: '-', label: 'Borrador' },
    { value: 'P', label: 'Pendiente de rendición' },
    { value: '1', label: 'Completada' },
    { value: 'R', label: 'Rendida' },
    { value: 'C', label: 'Cancelada' },
];

export const TIPO_COMPRA = [
    { value: 'nacional', label: 'Nacional' },
    { value: 'internacional', label: 'Internacional' },
];

export const TIPO_ARCHIVO = [
    { value: '1', label: 'archivo' },
    { value: '2', label: 'imagen' },
];

export const OPCIONES_ARCHIVO = [
    { value: 'boleta', label: 'Boleta' },
    { value: 'factura', label: 'Factura' },
    { value: 'informacion_adicional', label: 'Información Adicional' },
];

// export const ESTADOS_GUIA_SALIDA = [
//     {value: "P", label: "Pendiente"},
//     {value: "ER", label: "Espera Firma Recibido"},
//     {value: "ET", label: "En Transito"},
//     {value: "R", label: "Revertida"},
//     {value: "PR", label: "Parcialmente Revertida"},
//     {value: "E", label: "Entregada"}
// ]
