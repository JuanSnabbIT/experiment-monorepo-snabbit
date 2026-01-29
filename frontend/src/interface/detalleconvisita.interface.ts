import { IAsistenciaUsuario, IEntregaEquipo, IVisitaSoporte } from '@/interface/visitas.interface';
import { IDetalleOrdenDeTrabajo } from './ordenTrabajo.interface';

export interface IDetalleConVisitasResponse {
    orden_id: number;
    detalles_trabajo: IDetalleOrdenDeTrabajoExtendido[];
}

export interface IDetalleOrdenDeTrabajoExtendido extends IDetalleOrdenDeTrabajo {
    visitas: IVisitaExtendida[];
}

export interface IVisitaExtendida extends IVisitaSoporte {
    asistencias: IAsistenciaUsuario[];
    entregas: IEntregaEquipo[];
}
