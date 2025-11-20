/**
 * Helpers para OrdenTrabajo V2
 *
 * Funciones utilitarias para manejar la lógica de tipos de servicio
 * y construcción de URLs dinámicas según el tipo de orden de trabajo.
 */

export type TipoServicio = 'general' | 'soporte_r' | 'soporte_p';
export type EndpointDetalleTrabajo = 'soportes-tecnicos' | 'servicios-generales';

/**
 * Determina si una orden de trabajo es de tipo soporte técnico
 * (presencial o remoto)
 */
export const isSoporteTecnico = (tipoServicio: TipoServicio | string): boolean => {
	return ['soporte_p', 'soporte_r'].includes(tipoServicio);
};

/**
 * Obtiene el endpoint correcto para detalles de trabajo según el tipo de servicio
 *
 * @param tipoServicio - Tipo de servicio de la OT
 * @returns 'soportes-tecnicos' para soporte | 'servicios-generales' para general
 */
export const getDetalleTrabajoEndpoint = (
	tipoServicio: TipoServicio | string,
): EndpointDetalleTrabajo => {
	return isSoporteTecnico(tipoServicio) ? 'soportes-tecnicos' : 'servicios-generales';
};

/**
 * Construye la URL completa para operaciones con detalles de trabajo
 *
 * @param ordenId - ID de la orden de trabajo
 * @param tipoServicio - Tipo de servicio de la OT
 * @param detalleId - (Opcional) ID del detalle específico
 * @returns URL completa para el endpoint
 *
 * @example
 * // Para listar detalles
 * buildDetalleTrabajoURL(123, 'soporte_p')
 * // => "/api/ordenes-de-trabajo/123/soportes-tecnicos/"
 *
 * @example
 * // Para detalle específico
 * buildDetalleTrabajoURL(123, 'general', 456)
 * // => "/api/ordenes-de-trabajo/123/servicios-generales/456/"
 */
export const buildDetalleTrabajoURL = (
	ordenId: number | string,
	tipoServicio: TipoServicio | string,
	detalleId?: number | string,
): string => {
	const endpoint = getDetalleTrabajoEndpoint(tipoServicio);
	const base = `/api/ordenes-de-trabajo/${ordenId}/${endpoint}/`;
	return detalleId ? `${base}${detalleId}/` : base;
};

/**
 * Construye la URL para actualizar el estado de un detalle de trabajo
 *
 * @param ordenId - ID de la orden de trabajo
 * @param tipoServicio - Tipo de servicio de la OT
 * @param detalleId - ID del detalle de trabajo
 * @returns URL para el endpoint de actualizar-estado
 */
export const buildActualizarEstadoURL = (
	ordenId: number | string,
	tipoServicio: TipoServicio | string,
	detalleId: number | string,
): string => {
	const base = buildDetalleTrabajoURL(ordenId, tipoServicio, detalleId);
	return `${base}actualizar-estado/`;
};

/**
 * Obtiene el label de tipo de servicio para mostrar en la UI
 */
export const getTipoServicioLabel = (tipoServicio: TipoServicio | string): string => {
	const labels: Record<string, string> = {
		general: 'Servicios Generales',
		soporte_r: 'Soporte Técnico Remoto',
		soporte_p: 'Soporte Técnico Presencial',
	};
	return labels[tipoServicio] || tipoServicio;
};

/**
 * Determina si un detalle requiere asignación de usuarios con equipos
 * (Solo para soporte técnico con usuarios)
 */
export const requiereUsuariosEquipo = (tipoServicio: TipoServicio | string): boolean => {
	return isSoporteTecnico(tipoServicio);
};
