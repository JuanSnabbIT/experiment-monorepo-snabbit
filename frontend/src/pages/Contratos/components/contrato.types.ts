import { ICondicionEspecial, IContratoEmpresaCliente, ILicencia, IVisita } from '@/interface/contrato.interface';
import { IUsuarioEmpresa } from '@/interface/empresas.interface';
import { FormikProps } from 'formik';

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
    }[];
    // USUARIOS VINCULADOS
    eliminar_usuarios: number[];
    usuarios_vinculados: {
        id?: number;
        usuario_id?: number;
        tipo_usuario: string;
    }[];
}

/** Props base para todos los sub-componentes de tabs del contrato */
export interface ITabContratoBaseProps {
    formik: FormikProps<IContratoEdicion>;
    editando: boolean;
    detalleContratoEmpresaCliente: IContratoEmpresaCliente;
}

/** Servicios */
export interface ITabServiciosProps extends ITabContratoBaseProps {
    listaContentType: { id: number; model: string }[];
}

/** Condiciones */
export interface ITabCondicionesProps extends ITabContratoBaseProps {
    listaCondicionesEspeciales: ICondicionEspecial[];
}

/** Usuarios */
export interface ITabUsuariosProps extends ITabContratoBaseProps {
    listaUsuariosTodoElCliente: IUsuarioEmpresa[];
}

/** Visitas */
export interface ITabVisitasProps extends ITabContratoBaseProps {
    listaVisitas: IVisita[];
}

/** Licencias */
export interface ITabLicenciasProps extends ITabContratoBaseProps {
    listaLicencias: ILicencia[];
}
