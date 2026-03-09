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
    /** El contrato está en un estado terminal (finalizado) */
    esEstadoTerminal: boolean;
    /** Mensaje descriptivo si hay restricciones */
    mensajeBloqueo: string | null;
}

/**
 * Hook para gestionar permisos y acciones disponibles según el estado
 * actual de un Contrato.
 *
 * Flujo de estados:
 * borrador → activo → suspendido ↔ activo
 *                   → finalizado (terminal)
 */
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

        // Transiciones válidas (idénticas al backend)
        const transiciones: Record<string, string[]> = {
            borrador: ['activo'],
            activo: ['suspendido', 'finalizado'],
            suspendido: ['activo'],
        };

        const estadosPermitidos = transiciones[estado] || [];
        const esEstadoTerminal = estado === 'finalizado';

        // Solo se edita en borrador o activo
        const puedeEditar = ['borrador', 'activo'].includes(estado);

        // Puede renovar si está activo, suspendido o finalizado
        const puedeRenovar = ['activo', 'suspendido', 'finalizado'].includes(estado);

        let mensajeBloqueo: string | null = null;
        if (esEstadoTerminal) {
            mensajeBloqueo =
                'El contrato está finalizado, no se pueden realizar modificaciones';
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
