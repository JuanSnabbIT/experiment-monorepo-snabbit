import type { TColors } from '@/types/colors.type';

/**
 * Devuelve el color del Badge según el estado del contrato.
 *
 * Mapeo:
 *  - borrador  → amber
 *  - activo    → emerald
 *  - suspendido / finalizado → red
 *  - default   → zinc
 */
export const colorEstadoContrato = (estado: string): TColors => {
    switch (estado) {
        case 'borrador':
            return 'amber';
        case 'activo':
            return 'emerald';
        case 'suspendido':
        case 'finalizado':
            return 'red';
        default:
            return 'zinc';
    }
};

/**
 * Devuelve el color del Badge según el tipo de contrato.
 *
 * Mapeo:
 *  - licencia  → violet
 *  - venta     → blue
 *  - servicios → sky
 *  - default   → zinc
 */
export const colorTipoContrato = (tipo: string): TColors => {
    switch (tipo) {
        case 'licencia':
            return 'violet';
        case 'venta':
            return 'blue';
        case 'servicios':
            return 'sky';
        default:
            return 'zinc';
    }
};
