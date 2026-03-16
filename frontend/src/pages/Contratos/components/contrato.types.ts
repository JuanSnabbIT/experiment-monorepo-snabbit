import { IContratoEmpresaCliente, ILicencia, IVisita } from '@/interface/contrato.interface';

// ─── Tipos para SelectorPlanServicios ───

/** Representa un servicio seleccionado (addon o personalizado) con cantidad y precio */
export interface IServicioSeleccionado {
    servicio_id: number;
    cantidad: number;
    precio_unitario: number;
}

/** Estado completo de la selección de plan/servicios */
export interface ISeleccionPlanServicios {
    /** 'plan' = se eligió un PlanServicio del catálogo, 'personalizado' = armado a medida */
    modo: 'plan' | 'personalizado';
    /** ID del PlanServicio seleccionado (null si modo='personalizado') */
    plan_id: number | null;
    /** Cantidad del plan */
    plan_cantidad: number;
    /** Precio unitario del plan */
    plan_precio_unitario: number;
    /** Servicios agregados como addon (modo plan) o seleccionados (modo personalizado) */
    servicios: IServicioSeleccionado[];
}

/** Props del componente SelectorPlanServicios */
export interface ISelectorPlanServiciosProps {
    /** Valor actual de la selección */
    value: ISeleccionPlanServicios;
    /** Callback cuando la selección cambia */
    onChange: (value: ISeleccionPlanServicios) => void;
}

/**
 * Tipo del formulario Formik utilizado en la edición de contratos.
 * Centralizado aquí para que los sub-componentes de tabs puedan tiparlo sin depender del padre.
 */
export interface IContratoEdicion {
    // Contrato
    fecha_inicio: string;
    fecha_fin: string | null;
    observaciones: string | null;
    nombre: string;
    // CONTRATO VISITAS
    eliminar_visitas: number[];
    visitas: {
        id?: number;
        visita_id?: number;
        frecuencia: string;
        cantidad: number;
    }[];
    // CONTRATO LICENCIAS
    eliminar_licencias: number[];
    licencias: {
        id?: number;
        licencia_id?: number;
        tipo_modalidad: string;
        otro_tipo: string | null;
        cantidad: number;
        precio_unitario: number;
        fecha_inicio: string | null;
        fecha_fin: string | null;
        tipo_moneda: string;
    }[];
    // CONTRATO CONDICIONES ESPECIALES
    eliminar_condiciones: number[];
    condiciones_especiales: {
        id?: number;
        condicion_id?: number;
        texto?: string;
    }[];
    // USUARIOS VINCULADOS
    eliminar_usuarios: number[];
    usuarios_vinculados: {
        id?: number;
        usuario_id?: number;
        nombre?: string | null;
        correo_generico?: string | null;
        tipo_usuario: string;
        es_destinatario_principal?: boolean;
    }[];
}

/** Props base para todos los sub-componentes de tabs del contrato */
export interface ITabContratoBaseProps {
    detalleContratoEmpresaCliente: IContratoEmpresaCliente;
    puedeEditar: boolean;
}

/** Servicios */
export interface ITabServiciosProps extends ITabContratoBaseProps {
    listaContentType: { id: number; model: string }[];
}

/** Condiciones */
export interface ITabCondicionesProps extends ITabContratoBaseProps {}

/** Usuarios */
export interface ITabUsuariosProps extends ITabContratoBaseProps {}

/** Visitas */
export interface ITabVisitasProps extends ITabContratoBaseProps {
    listaVisitas: IVisita[];
}

/** Licencias */
export interface ITabLicenciasProps extends ITabContratoBaseProps {
    listaLicencias: ILicencia[];
}
