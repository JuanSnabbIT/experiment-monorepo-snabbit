import { IUsuarioEmpresa } from './empresas.interface';

export interface IContratoEmpresaCliente {
    id: number;
    contrato_servicios: IContratoServicio[];
    contrato_visitas: IContratoVisita[];
    contrato_licencias: IContratoLicencia[];
    contrato_condiciones_especiales: IContratoCondicionEspecial[];
    vinculos_contrato: IVinculoContrato[];
    firmas_confidencialidad: IFirmaConfidencialidad[];
    fecha_creacion: string;
    fecha_modificacion: string;
    fecha_inicio: string;
    fecha_fin: string | null;
    estado: string;
    observaciones: string;
    empresa_prestadora: number;
    empresa_cliente: number;
    servicios_genericos: number[];
    visitas: number[];
    licencias: number[];
    condiciones_especiales: number[];
    usuarios_vinculados: number[];
    nombre: string;
    estado_label: string;
    datos_empresa: IEmpresaContrato;
    datos_cliente: IEmpresaContrato;
    tipo: string;
    tipo_label: string;
    destinatario_principal?: IVinculoContrato | null;
    ultimo_envio_aprobacion?: IContratoAprobacionEstado | null;
    ultimo_envio_firma?: IContratoFirmaEstado | null;
    ultimo_comentario_cliente?: string | null;
}

export interface IEmpresaContrato {
    id: number;
    representantes_legales: IUsuarioEmpresa[];
    fecha_creacion: string;
    fecha_modificacion: string;
    nombre: string;
    sitio_web: string;
    direccion_principal: string;
    logo: string;
    firma_empresa: string;
    recargo: number;
    rut_empresa: null | string;
    telefono: null | string;
    email: null | string;
    ppm: string;
    clientes: number[];
}

export interface IFirmaConfidencialidad {
    id: number;
    contrato: number;
    acuerdo_base: number;
    firma_usuario_empresa: number;
    nombre_usuario: string;
    titulo_acuerdo: string;
    contenido_acuerdo: string;
    fecha_creacion: string;
    fecha_modificacion: string;
    fecha_envio: string;
    fecha_firma: string;
    firmado: boolean;
    archivo_firma: string;
}

export interface IVinculoContrato {
    id: number;
    usuario: number | null;
    contrato: number;
    datos_usuario: {
        nombre: string;
        email: string;
    } | null;
    tipo_usuario_label: string;
    existe_envio: number | null;
    fecha_creacion: string;
    fecha_modificacion: string;
    fecha_vinculacion: string;
    tipo_usuario: string;
    nombre: string | null;
    correo_generico: string | null;
    correo_normalizado: string | null;
    nombre_display: string;
    correo_display: string;
    es_externo: boolean;
    es_destinatario_principal: boolean;
    aprobacion_pendiente?: IContratoAprobacionEstado | null;
    firma_pendiente?: IContratoFirmaEstado | null;
}

export interface IContratoAprobacionEstado {
    id: number;
    uuid: string;
    enviado: boolean;
    respondido: boolean;
    aprobado: boolean | null;
    fecha_envio: string | null;
    fecha_respuesta: string | null;
    comentario_respuesta: string | null;
    version_envio: number;
}

export interface IContratoFirmaEstado {
    id: number;
    uuid: string;
    enviado: boolean;
    firmado: boolean;
    fecha_envio: string | null;
    fecha_firma: string | null;
}

export interface IContratoPublicoAprobacion {
    uuid: string;
    puede_responder: boolean;
    ya_respondio: boolean;
    aprobado: boolean | null;
    fecha_envio: string | null;
    fecha_respuesta: string | null;
    comentario_respuesta: string | null;
    version_envio: number;
    destinatario: {
        id: number;
        nombre: string;
        email: string;
        es_externo: boolean;
    };
    contrato: IContratoEmpresaCliente;
}

export interface IContratoPublicoFirma {
    uuid: string;
    puede_firmar: boolean;
    firmado: boolean;
    fecha_envio: string | null;
    fecha_firma: string | null;
    destinatario: {
        id: number;
        nombre: string;
        email: string;
        es_externo: boolean;
    };
    contrato: IContratoEmpresaCliente;
}

export interface IContratoCondicionEspecial {
    id: number;
    contrato: number;
    fecha_creacion: string;
    fecha_modificacion: string;
    condicion: number | null;
    texto: string | null;
    titulo_condicion: string;
    descripcion_condicion: string;
}

export interface IContratoLicencia {
    id: number;
    tipo_modalidad_label: string;
    nombre_licencia: string;
    proveedor_licencia: string;
    tipo_moneda_label: string;
    licencias_disponibles: number;
    fecha_inicio_edicion: string | null;
    fecha_fin_edicion: string | null;
    dias_hasta_fin_edicion: number | null;
    nombre_contrato: string;
    se_puede_reducir: boolean;
    se_puede_cancelar: boolean;
    se_puede_desvincular: boolean;
    se_puede_aumentar: boolean;
    mensaje_ventana_edicion: string;
    dias_restantes_licencia: number;
    estado: string;
    estado_label: string;
    color_estado: 'emerald' | 'red' | 'amber' | 'zinc';
    fecha_creacion: string;
    fecha_modificacion: string;
    tipo_modalidad: string;
    otro_tipo: null | string;
    cantidad: number;
    precio_unitario: string;
    tipo_moneda: string;
    fecha_inicio: null | string;
    fecha_fin: null | string;
    partner: boolean;
    contrato: number;
    licencia: number;
    usuarios: number[];
    empresa_cliente: number;
}

export interface IContratoVisita {
    id: number;
    contrato: number;
    fecha_creacion: string;
    fecha_modificacion: string;
    frecuencia: string;
    cantidad: number;
    visita: number;
    descripcion_visita: string;
    frecuencia_label: string;
}

export interface IContratoServicio {
    id: number;
    servicio_generico: IPlanServicio | IServicio;
    contrato: number;
    fecha_creacion: string;
    fecha_modificacion: string;
    object_id: number;
    cantidad: number;
    precio_unitario: string;
    content_type: number;
    nombre: string;
}

export interface IPlanServicio {
    id: number;
    servicios: IServicio[];
    fecha_creacion: string;
    fecha_modificacion: string;
    nombre: string;
    descripcion: string;
}

export interface IServicio {
    id: number;
    caracteristicas: ICaracteristicaServicio[];
    fecha_creacion: string;
    fecha_modificacion: string;
    nombre: string;
    descripcion: string;
    categoria: string;
    categoria_label: string;
}

export interface ICaracteristicaServicio {
    id: number;
    fecha_creacion: string;
    fecha_modificacion: string;
    nombre: string;
    descripcion: string;
}

export interface ICondicionEspecial {
    id: number;
    fecha_creacion: string;
    fecha_modificacion: string;
    titulo: string;
    descripcion: string;
}

export interface IVisita {
    id: number;
    fecha_creacion: string;
    fecha_modificacion: string;
    descripcion: string;
}

export interface ILicencia {
    id: number;
    fecha_creacion: string;
    fecha_modificacion: string;
    nombre: string;
    proveedor: string | null;
}

export interface IPersonaLicenciatariaResumen {
    id: number;
    nombre: string;
    es_interno: boolean;
    usuario_empresa: number | null;
}

export interface ICorreoPersonaLicenciataria {
    id: number;
    fecha_creacion: string;
    fecha_modificacion: string;
    persona: number;
    empresa: number;
    correo: string;
    correo_normalizado: string;
    es_principal: boolean;
    es_corporativo: boolean;
    verificado: boolean;
    activo: boolean;
    persona_detalle: IPersonaLicenciatariaResumen;
}

export interface IUsuarioVinculadoLicencia {
    id: number;
    fecha_creacion: string;
    fecha_modificacion: string;
    fecha_asignacion: string;
    nombre: null | string;
    correo_generico: null | string;
    usuario: number | null;
    licencia: number;
    correo_persona: number | null;
    datos_usuario: {
        nombre: string;
        correo: string;
    } | null;
    es_externo: boolean;
    nombre_display: string;
    correo_display: string;
    persona: IPersonaLicenciatariaResumen | null;
    correo_persona_detalle: ICorreoPersonaLicenciataria | null;
}

export interface IDetalleEnvio {
    acuerdos_confidencialidad: {
        id: number;
        acuerdo_base_id: number;
        acuerdo_base_titulo: string;
        acuerdo_base_contenido: string;
        contrato_id: number;
        fecha_creacion: string;
        fecha_modificacion: string;
    }[];
}

export interface IFacturaContrato {
    id: number;
    contrato: number;
    empresa_prestadora: number;
    empresa_cliente: number;
    estado: string;
    estado_label: string;
    periodo_inicio: string;
    periodo_fin: string;
    fecha_emision: string | null;
    monto_total: string;
    moneda: string;
    moneda_label: string;
    resultado: Record<string, unknown> | null;
    comentario: string;
    documento_factura: string | null;
    creado_por: number | null;
    actualizado_por: number | null;
    creado_por_nombre: string | null;
    nombre_contrato: string;
    nombre_cliente: string;
    nombre_prestadora: string;
    fecha_creacion: string;
    fecha_modificacion: string;
}

export interface IFacturaContratoResumen {
    estado: string;
    cantidad: number;
    total: number | null;
}

// ── Interfaces para endpoints "por usuario" ──

export interface ILicenciaVinculadaPorUsuario {
    id: number;
    fecha_asignacion: string;
    nombre_licencia: string;
    proveedor_licencia: string | null;
    estado_licencia: string;
    estado_licencia_label: string;
    color_estado: 'emerald' | 'red' | 'amber' | 'zinc';
    fecha_fin_licencia: string | null;
    nombre_contrato: string;
    contrato_id: number;
    licencia_contrato_id: number;
}

export interface IContratoVinculadoPorUsuario {
    id: number;
    fecha_vinculacion: string;
    tipo_usuario: string;
    tipo_usuario_label: string;
    nombre_contrato: string;
    tipo_contrato: string;
    tipo_contrato_label: string;
    estado_contrato: string;
    estado_contrato_label: string;
    fecha_inicio_contrato: string;
    fecha_fin_contrato: string | null;
    contrato_id: number;
}
