import type { IContratoEmpresaCliente } from '@/interface/contrato.interface';
import type { TColors } from '@/types/colors.type';
import type { IContratoEdicion } from './contrato.types';

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
        case 'rechazado_cliente':
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

/**
 * Construye el payload completo para PUT /api/contratos/{id}/actualizar/.
 * Las secciones sin override se rellenan con datos actuales del contrato.
 */
export function buildUpdatePayload(
    contrato: IContratoEmpresaCliente,
    overrides?: Partial<{
        contrato: {
            nombre: string;
            fecha_inicio: string | null;
            fecha_fin: string | null;
            observaciones: string | null;
        };
        visitas: IContratoEdicion['visitas'];
        eliminar_visitas: number[];
        licencias: IContratoEdicion['licencias'];
        eliminar_licencias: number[];
        condiciones_especiales: IContratoEdicion['condiciones_especiales'];
        eliminar_condiciones: number[];
        usuarios_vinculados: IContratoEdicion['usuarios_vinculados'];
        eliminar_usuarios: number[];
    }>,
): Record<string, unknown> {
    return {
        contrato: overrides?.contrato ?? {
            nombre: contrato.nombre,
            fecha_inicio: contrato.fecha_inicio,
            fecha_fin: contrato.fecha_fin,
            observaciones: contrato.observaciones,
        },
        visitas:
            overrides?.visitas ??
            contrato.contrato_visitas.map((v) => ({
                id: v.id,
                cantidad: v.cantidad,
                frecuencia: v.frecuencia,
                precio_visita_adicional: v.precio_visita_adicional
                    ? Number(v.precio_visita_adicional)
                    : null,
            })),
        eliminar_visitas: overrides?.eliminar_visitas ?? [],
        licencias:
            overrides?.licencias ??
            contrato.contrato_licencias.map((l) => ({
                id: l.id,
                cantidad: l.cantidad,
                tipo_modalidad: l.tipo_modalidad,
                otro_tipo: l.otro_tipo,
                precio_unitario: Number(l.precio_unitario),
                fecha_inicio: l.fecha_inicio,
                fecha_fin: l.fecha_fin,
                tipo_moneda: l.tipo_moneda,
            })),
        eliminar_licencias: overrides?.eliminar_licencias ?? [],
        condiciones_especiales:
            overrides?.condiciones_especiales ??
            contrato.contrato_condiciones_especiales.map((c) => ({
                id: c.id,
                nombre: c.nombre_condicion,
                detalle: c.detalle_condicion,
                multa: c.multa_condicion || 0,
            })),
        eliminar_condiciones: overrides?.eliminar_condiciones ?? [],
        usuarios_vinculados:
            overrides?.usuarios_vinculados ??
            contrato.vinculos_contrato.map((u) => ({
                id: u.id,
                tipo_usuario: u.tipo_usuario,
            })),
        eliminar_usuarios: overrides?.eliminar_usuarios ?? [],
    };
}
