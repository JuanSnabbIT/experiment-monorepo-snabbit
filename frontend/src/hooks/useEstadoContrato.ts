import { useMemo } from 'react';

interface IContratoEstado {
    id: number;
    estado: string;
    fecha_inicio?: string | null;
    fecha_fin?: string | null;
    tipo?: string;
}

interface IAccionesContratoPermitidas {
    puedeEditar: boolean;
    puedeActivar: boolean;
    puedeSuspender: boolean;
    puedeFinalizar: boolean;
    puedeRenovar: boolean;
    esEstadoTerminal: boolean;
    mensajeBloqueo: string | null;
}

export const useEstadoContrato = (
    contrato: IContratoEstado | null | undefined,
): IAccionesContratoPermitidas => {
    return useMemo(() => {
        if (!contrato) {
            return {
                puedeEditar: false,
                puedeActivar: false,
                puedeSuspender: false,
                puedeFinalizar: false,
                puedeRenovar: false,
                esEstadoTerminal: false,
                mensajeBloqueo: 'No hay contrato cargado',
            };
        }

        const estado = (contrato.estado || '').toLowerCase();
        const transiciones: Record<string, string[]> = {
            borrador: ['en_aprobacion_cliente'],
            cambios_solicitados: ['en_aprobacion_cliente'],
            en_aprobacion_cliente: ['aprobado_cliente', 'cambios_solicitados'],
            aprobado_cliente: ['en_firma'],
            en_firma: ['activo'],
            activo: ['suspendido', 'finalizado'],
            suspendido: ['activo'],
        };

        const estadosPermitidos = transiciones[estado] || [];
        const esEstadoTerminal = estado === 'finalizado';
        const puedeEditar = ['borrador', 'cambios_solicitados'].includes(estado);
        const puedeRenovar = ['activo', 'suspendido', 'finalizado'].includes(estado);

        let mensajeBloqueo: string | null = null;
        if (esEstadoTerminal) {
            mensajeBloqueo =
                'El contrato esta finalizado, no se pueden realizar modificaciones';
        } else if (['en_aprobacion_cliente', 'aprobado_cliente', 'en_firma'].includes(estado)) {
            mensajeBloqueo =
                'El contrato esta en revision del cliente o en firma, por lo que queda bloqueado para edicion.';
        }

        return {
            puedeEditar,
            puedeActivar: estadosPermitidos.includes('activo'),
            puedeSuspender: estadosPermitidos.includes('suspendido'),
            puedeFinalizar: estadosPermitidos.includes('finalizado'),
            puedeRenovar,
            esEstadoTerminal,
            mensajeBloqueo,
        };
    }, [contrato]);
};
