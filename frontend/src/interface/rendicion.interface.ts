import { ICompra } from './bodega.interface';
import { IUsuarioEmpresa } from './empresas.interface';
import { IDetalleGastoRendicionOT } from './ordenTrabajo.interface';

export interface ICategoriaGasto {
    id: number;
    nombre: string;
    descripcion: string | null;
}

export interface IRendicion {
    id: number;
    datos_usuario: IUsuarioEmpresa;
    estado_label: string;
    fecha_creacion: string;
    fecha_modificacion: string;
    fecha_rendicion: string;
    observaciones: string;
    estado: string;
    usuario: number;
    total: number; // Legacy: mantener compatibilidad

    // BLOQUE 6 - Relación con cliente
    cliente: number | null;

    // BLOQUE 6 - FASE 2/3: Totales calculados
    total_reembolso_tecnico: number;
    total_facturable_cliente: number;
    total_no_facturable: number;

    // BLOQUE 6 - FASE 6: Relación con OT
    orden_trabajo: number | null;

    // FASE 2: Campos de revisión/aprobación/rechazo
    // Nota: El estado (2=aprobada, 3=rechazada, 4=pagada) determina el tipo de revisión
    motivo_rechazo: string | null;
    revisado_por: number | null;
    revisado_por_data?: IUsuarioEmpresa | null;
    fecha_revision: string | null;
}

// export interface IDetalleGasto {
//     id: number
//     nombre_categoria: string
//     fecha_creacion: string
//     fecha_modificacion: string
//     detalle: string
//     cantidad: number
//     monto_unitario: number
//     monto_total: number
//     fecha_gasto: string
//     categoria: number
// }

export interface IItemRendicion {
    id: number;
    detalle_data: ICompra | IDetalleGasto | IDetalleGastoRendicionOT;
    fecha_creacion: string;
    fecha_modificacion: string;
    detalle_id: number;
    rendicion: number;
    content_type: number;
}

export interface IDetalleGasto {
    id: number;
    nombre_categoria: string;
    fecha_creacion: string;
    fecha_modificacion: string;
    detalle: string;
    cantidad: number;
    monto_unitario: number;
    monto_total: number;
    fecha_gasto: string;
    categoria: number;
}

export interface ICompraRendicion {
    id: number;
    total_compra: number;
    fecha_creacion: string;
    fecha_modificacion: string;
    codigo: string;
    tipo: string;
    observaciones: string;
    estado: string;
    sucursal: number;
    proveedor: number;
    creado_por: number;
    bodega_temporal: number;
    items: number[];
}
