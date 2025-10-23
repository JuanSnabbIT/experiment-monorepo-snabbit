export interface IDiaCalendario {
    id: number
    fecha: string
    es_feriado: boolean
    descripcion: string
    tipo: string
    empresa: number
    es_irrenunciable: boolean
}

export interface ISolicitudVacaciones {
    id: number
    fecha_inicio: string
    fecha_fin: string
    estado: string
    es_extraordinaria: boolean
    fecha_solicitud: string
    comentario: string
    usuario_empresa: number
    papeleta: {
        nombre_empleado: string
        años_servicio: number
        dias_acumulados: number
        dias_tomados: number
        dias_disponibles: number
        rut: string
    }
    estado_label: string
    nombre_creado_por: string
    nombre_aprobado_rechazado_por: string
    firma_usuario: string | null
    logo_empresa: string
    firma_empresa: string
}