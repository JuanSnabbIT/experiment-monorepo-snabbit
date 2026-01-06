import { useMemo } from 'react';

interface OrdenDeTrabajo {
	id: number;
	estado: string;
	fecha_inicio_ot?: string | null;
	tecnico_responsable_ot?: number | null;
	responsable_empresa?: number | null;
	tipo_servicio?: string;
}

interface AccionesPermitidas {
	puedeEditar: boolean;
	puedeCompletar: boolean;
	puedeCerrar: boolean;
	puedeFacturar: boolean;
	puedeCancelar: boolean;
	puedeAgregarTrabajos: boolean;
	puedeModificarTrabajos: boolean;
	mensajeBloqueo: string | null;
}

/**
 * Hook personalizado para gestionar permisos y acciones disponibles
 * según el estado actual de la Orden de Trabajo.
 * 
 * Flujo de estados:
 * pendiente → en_proceso → completada → cerrada → facturada
 *                     ↘ cancelada
 */
export const useEstadoOT = (ordenTrabajo: OrdenDeTrabajo | null | undefined): AccionesPermitidas => {
	return useMemo(() => {
		if (!ordenTrabajo) {
			return {
				puedeEditar: false,
				puedeCompletar: false,
				puedeCerrar: false,
				puedeFacturar: false,
				puedeCancelar: false,
				puedeAgregarTrabajos: false,
				puedeModificarTrabajos: false,
				mensajeBloqueo: 'No hay orden de trabajo cargada',
			};
		}

		const estado = (ordenTrabajo.estado || '').toLowerCase();
		const tieneFechaInicio = !!ordenTrabajo.fecha_inicio_ot;
		const tieneResponsable = !!(ordenTrabajo.tecnico_responsable_ot || ordenTrabajo.responsable_empresa);

		// Estados finales no permiten edición
		const estadosFinales = ['cerrada', 'facturada', 'cancelada'];
		const esEstadoFinal = estadosFinales.includes(estado);

		// Estados donde se pueden agregar trabajos
		const puedeAgregarTrabajos = ['pendiente', 'en_proceso'].includes(estado);

		// Estados donde se pueden modificar trabajos existentes
		const puedeModificarTrabajos = ['pendiente', 'en_proceso'].includes(estado);

		// Validación para completar: requiere fecha y responsable
		const puedeCompletar = estado === 'en_proceso' && tieneFechaInicio && tieneResponsable;
		const mensajeBloqueoCompletar = estado === 'en_proceso'
			? !tieneFechaInicio && !tieneResponsable
				? 'La OT debe tener fecha de inicio y responsable asignado'
				: !tieneFechaInicio
					? 'La OT debe tener fecha de inicio'
					: 'La OT debe tener un responsable asignado'
			: null;

		let mensajeBloqueo: string | null = null;
		if (esEstadoFinal) {
			mensajeBloqueo = `La OT está en estado ${estado}, no se pueden realizar modificaciones`;
		} else if (estado === 'en_proceso' && !puedeCompletar) {
			mensajeBloqueo = mensajeBloqueoCompletar;
		}

		return {
			puedeEditar: !esEstadoFinal,
			puedeCompletar,
			puedeCerrar: estado === 'completada',
			puedeFacturar: estado === 'cerrada',
			puedeCancelar: ['pendiente', 'en_proceso'].includes(estado),
			puedeAgregarTrabajos,
			puedeModificarTrabajos,
			mensajeBloqueo,
		};
	}, [ordenTrabajo]);
};

interface ValidacionTrabajo {
	puedeIniciar: boolean;
	puedeCambiarEstado: boolean;
	puedeAsignarTecnico: boolean;
	puedeAsignarFecha: boolean;
	puedeEliminar: boolean;
	mensajeBloqueo: string | null;
}

/**
 * Hook para validar acciones disponibles en un trabajo específico (servicio o soporte)
 */
export const useEstadoTrabajo = (
	trabajo: {
		estado: string;
		tecnico_asignado?: number | null;
		fecha_soporte?: string | null;
		fecha_servicio?: string | null;
		guia_salida?: { estado: string } | null;
	} | null,
	ordenTrabajo: OrdenDeTrabajo | null | undefined,
): ValidacionTrabajo => {
	return useMemo(() => {
		if (!trabajo || !ordenTrabajo) {
			return {
				puedeIniciar: false,
				puedeCambiarEstado: false,
				puedeAsignarTecnico: false,
				puedeAsignarFecha: false,
				puedeEliminar: false,
				mensajeBloqueo: 'Datos insuficientes',
			};
		}

		const estadoTrabajo = (trabajo.estado || '').toLowerCase();
		const estadoOT = (ordenTrabajo.estado || '').toLowerCase();

		// Validaciones OT padre
		const tieneFechaOT = !!ordenTrabajo.fecha_inicio_ot;
		const tieneResponsableOT = !!(ordenTrabajo.tecnico_responsable_ot || ordenTrabajo.responsable_empresa);
		const otListaParaTrabajos = tieneFechaOT && tieneResponsableOT;

		// Validaciones trabajo específico
		const tieneTecnico = !!trabajo.tecnico_asignado;
		const tieneFecha = !!(trabajo.fecha_soporte || trabajo.fecha_servicio);
		const guia = trabajo.guia_salida;
		const guiaLista = !guia || ['FR', 'ET', 'E', 'T'].includes(guia.estado);

		// Estados válidos
		const isPendiente = estadoTrabajo === 'pendiente';
		const isEnProceso = estadoTrabajo === 'en_proceso' || estadoTrabajo === 'en proceso';
		const estadosFinales = ['completado', 'medianamente_completado', 'no_realizado'];
		const esEstadoFinal = estadosFinales.includes(estadoTrabajo);

		// Validar si puede iniciar
		const requisitosInicioOK = tieneTecnico && tieneFecha && guiaLista && otListaParaTrabajos;
		const puedeIniciar = isPendiente && requisitosInicioOK;

		// Mensajes de bloqueo para inicio
		let mensajeBloqueo: string | null = null;
		if (isPendiente && !puedeIniciar) {
			if (!otListaParaTrabajos) {
				mensajeBloqueo = 'La OT debe tener fecha de inicio y responsable asignado';
			} else if (!tieneTecnico) {
				mensajeBloqueo = 'Debe asignar un técnico al trabajo';
			} else if (!tieneFecha) {
				mensajeBloqueo = 'Debe asignar una fecha al trabajo';
			} else if (!guiaLista) {
				mensajeBloqueo = 'La guía de salida debe estar firmada o en tránsito';
			}
		}

		return {
			puedeIniciar,
			puedeCambiarEstado: isEnProceso || isPendiente,
			puedeAsignarTecnico: isPendiente,
			puedeAsignarFecha: isPendiente,
			puedeEliminar: isPendiente,
			mensajeBloqueo: esEstadoFinal ? 'El trabajo ya finalizó' : mensajeBloqueo,
		};
	}, [trabajo, ordenTrabajo]);
};
