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
    usuario: number;
    contrato: number;
    datos_usuario: {
        nombre: string;
        email: string;
    };
    tipo_usuario_label: string;
    existe_envio: number | null;
    fecha_creacion: string;
    fecha_modificacion: string;
    fecha_vinculacion: string;
    tipo_usuario: string;
}

export interface IContratoCondicionEspecial {
    id: number;
    contrato: number;
    fecha_creacion: string;
    fecha_modificacion: string;
    condicion: number;
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
    nombre_contrato: string;
    se_puede_reducir: boolean;
    dias_restantes_licencia: number;
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

export interface IUsuarioVinculadoLicencia {
    id: number;
    fecha_creacion: string;
    fecha_modificacion: string;
    fecha_asignacion: string;
    nombre: null | string;
    correo_generico: null | string;
    usuario: number;
    licencia: number;
    datos_usuario: {
        nombre: string;
        correo: string;
    } | null;
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
