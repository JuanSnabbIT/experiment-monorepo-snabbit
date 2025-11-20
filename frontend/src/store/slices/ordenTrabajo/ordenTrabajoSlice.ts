import { IUsuarioEmpresa } from '@/interface/empresas.interface';
import {
	IAdjuntoDeOrden,
	ICheckCompletibilidad,
	IDetalleGastoRendicionOT,
	IDetalleOrdenDeTrabajo,
	IDetalleOrdenDeTrabajoCompra,
	IDetalleRetroalimentacionOT,
	IHistorialCambiosOrden,
	IHistorialSimple,
	IInsumo,
	IListaDetallesSeguimientosOT,
	IListaTrabajosFiltrado,
	IOrdenDeTrabajo,
	IRetroalimentacionOT,
	IRetroalimentacionSinPermisosOT,
	ISeguimientoOrden,
	IServicioEnOT,
	IUsuarioVinculado,
} from '@/interface/ordenTrabajo.interface';
import { IVisitaEnOT } from '@/interface/visitas.interface';
import ApiService from '@/services/ApiService';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

export interface OrdenTrabajoState {
	loading: boolean;
	error: string | undefined;
	listaOrdenTrabajo: IOrdenDeTrabajo[];
	detalleOrdenTrabajo: IOrdenDeTrabajo | undefined;
	listaAdjuntos: IAdjuntoDeOrden[];
	detalleAdjunto: IAdjuntoDeOrden | undefined;
	listaHistorialCambios: IHistorialCambiosOrden[];
	detalleHistorialCambio: IHistorialCambiosOrden | undefined;
	listaDetalleTrabajoOT: IDetalleOrdenDeTrabajo[];
	listaTrabajosFiltrados: IListaTrabajosFiltrado | undefined;
	detalleDelDetalleTrabajo: IDetalleOrdenDeTrabajo | undefined;
	listarSimpleHistorial: IHistorialSimple[];
	listaSeguimientos: ISeguimientoOrden[];
	detalleSeguimiento: ISeguimientoOrden | undefined;
	// listaGuiasDisponibles: IGuiaSalida[]
	// listarInsumosCotizacion: IInsumoCotizacion[]
	listaDetalleTrabajoSinInsumo: IDetalleOrdenDeTrabajo[];
	detalleConvisita: IVisitaEnOT | undefined;
	listaDetallesSeguimientosOT: IListaDetallesSeguimientosOT | undefined;
	listaComprasOrdenTrabajo: IDetalleOrdenDeTrabajoCompra[];
	listaTecnicos: IUsuarioEmpresa[];
	listaInsumos: IInsumo[];
	checkCompletibilidadOT: ICheckCompletibilidad | undefined;
	listaRetroalimentacionesOT: IRetroalimentacionOT[];
	detalleSinPermisosRetroalimentacionOT: IRetroalimentacionSinPermisosOT | undefined;
	listaDetalleGastoRendicionOT: IDetalleGastoRendicionOT[];
	listaDetalleGastoRendicionOTDisponibles: IDetalleGastoRendicionOT[];
	listaUsuariosVinculadosOT: IUsuarioVinculado[];
	detalleRetroalimentacionOT: IDetalleRetroalimentacionOT | undefined;
	// Servicios Generales
	listaServiciosGenerales: IServicioEnOT[];
	detalleServicioGeneral: IServicioEnOT | undefined;
}

const initialState: OrdenTrabajoState = {
	loading: false,
	error: undefined,
	listaOrdenTrabajo: [],
	detalleOrdenTrabajo: undefined,
	listaAdjuntos: [],
	detalleAdjunto: undefined,
	listaHistorialCambios: [],
	detalleHistorialCambio: undefined,
	listaDetalleTrabajoOT: [],
	listaTrabajosFiltrados: undefined,
	detalleDelDetalleTrabajo: undefined,
	listarSimpleHistorial: [],
	listaSeguimientos: [],
	detalleSeguimiento: undefined,
	// listaGuiasDisponibles: [],
	// listarInsumosCotizacion: [],
	listaDetalleTrabajoSinInsumo: [],
	detalleConvisita: undefined,
	listaDetallesSeguimientosOT: undefined,
	listaComprasOrdenTrabajo: [],
	listaTecnicos: [],
	listaInsumos: [],
	checkCompletibilidadOT: undefined,
	listaRetroalimentacionesOT: [],
	detalleSinPermisosRetroalimentacionOT: undefined,
	listaDetalleGastoRendicionOT: [],
	listaDetalleGastoRendicionOTDisponibles: [],
	listaUsuariosVinculadosOT: [],
	detalleRetroalimentacionOT: undefined,
	// Servicios Generales
	listaServiciosGenerales: [],
	detalleServicioGeneral: undefined,
};

export const detalleRetroalimentacionOTThunk = createAsyncThunk<
	IDetalleRetroalimentacionOT,
	{ id_retro: string | number | undefined },
	{ rejectValue: string }
>('ordenTrabajo/detalleRetroalimentacionOTThunk', async ({ id_retro }, { rejectWithValue }) => {
	try {
		const response = await ApiService.fetchData<IDetalleRetroalimentacionOT>({
			url: `/api/retroalimentacion/${id_retro}/`,
			method: 'get',
		});
		return response.data;
	} catch (error: any) {
		return rejectWithValue(error.response.data || 'Error al obtener la retroalimentacion');
	}
});

export const listaUsuariosVinculadosOTThunk = createAsyncThunk<
	IUsuarioVinculado[],
	{ id_orden: string | number | undefined },
	{ rejectValue: string }
>('ordenTrabajo/listaUsuariosVinculadosOTThunk', async ({ id_orden }, { rejectWithValue }) => {
	try {
		const response = await ApiService.fetchData<IUsuarioVinculado[]>({
			url: `/api/ordenes-de-trabajo/${id_orden}/usuarios-vinculados/`,
			method: 'get',
		});
		return response.data;
	} catch (error: any) {
		return rejectWithValue(error.response.data || 'Error al obtener la lista de usuarios');
	}
});

export const listaDetalleGastoRendicionOTDisponiblesThunk = createAsyncThunk<
	IDetalleGastoRendicionOT[],
	undefined,
	{ rejectValue: string }
>('ordenTrabajo/listaDetalleGastoRendicionOTDisponiblesThunk', async (_, { rejectWithValue }) => {
	try {
		const response = await ApiService.fetchData<IDetalleGastoRendicionOT[]>({
			url: `/api/rendiciones/detalles-ot-libres/`,
			method: 'get',
		});
		return response.data;
	} catch (error: any) {
		return rejectWithValue(error.response.data || 'Error al obtener la lista de gastos');
	}
});

export const listaDetalleGastoRendicionOTThunk = createAsyncThunk<
	IDetalleGastoRendicionOT[],
	{ id_orden: string | number | undefined },
	{ rejectValue: string }
>('ordenTrabajo/listaDetalleGastoRendicionOTThunk', async ({ id_orden }, { rejectWithValue }) => {
	try {
		const response = await ApiService.fetchData<[]>({
			url: `/api/ordenes-de-trabajo/${id_orden}/gastos-rendicion/`,
			method: 'get',
		});
		return response.data;
	} catch (error: any) {
		return rejectWithValue(error.response.data || 'Error al obtener la lista de gastos');
	}
});

export const detalleSinPermisosRetroalimentacionOTThunk = createAsyncThunk<
	IRetroalimentacionSinPermisosOT,
	{ uuid: string | undefined },
	{ rejectValue: string }
>(
	'ordenTrabajo/detalleSinPermisosRetroalimentacionOTThunk',
	async ({ uuid }, { rejectWithValue }) => {
		try {
			const response = await ApiService.fetchData<IRetroalimentacionSinPermisosOT>({
				url: `/api/retroalimentacion/pub/${uuid}/`,
				method: 'get',
				isLoginRequest: true,
			});
			return response.data;
		} catch (error: any) {
			return rejectWithValue(
				error.response.data || 'Error al obtener el detalle de retroalimentación',
			);
		}
	},
);

export const listaRetroalimentacionesOTThunk = createAsyncThunk<
	IRetroalimentacionOT[],
	{ id_orden: string | number | undefined },
	{ rejectValue: string }
>('ordenTrabajo/listaRetroalimentacionesOTThunk', async ({ id_orden }, { rejectWithValue }) => {
	try {
		const response = await ApiService.fetchData<[]>({
			url: `/api/ordenes-trabajo/${id_orden}/retroalimentaciones/`,
			method: 'get',
		});
		return response.data;
	} catch (error: any) {
		return rejectWithValue(error.response.data || 'Error al obtener las retroalimentaciones');
	}
});

export const checkCompletibilidadOTThunk = createAsyncThunk<
	ICheckCompletibilidad,
	{ id_orden: string | number | undefined },
	{ rejectValue: string }
>('ordenTrabajo/checkCompletibilidadOTThunk', async ({ id_orden }, { rejectWithValue }) => {
	try {
		const response = await ApiService.fetchData<ICheckCompletibilidad>({
			url: `/api/ordenes-de-trabajo/${id_orden}/check-completabilidad`,
			method: 'get',
		});
		return response.data;
	} catch (error: any) {
		return rejectWithValue(
			error.response.data || 'Error al obtener el check de completibilidad',
		);
	}
});

export const listaTecnicosThunk = createAsyncThunk<
	IUsuarioEmpresa[],
	{ id_empresa: string | number | undefined },
	{ rejectValue: string }
>('ordenTrabajo/listaTecnicosThunk', async ({ id_empresa }, { rejectWithValue }) => {
	try {
		const response = await ApiService.fetchData<IUsuarioEmpresa[]>({
			url: `/api/usuarios-empresa/empresa/${id_empresa}/tecnicos/`,
			method: 'get',
		});
		return response.data;
	} catch (error: any) {
		return rejectWithValue(error.response.data || 'Error al obtener los técnicos');
	}
});

export const listaComprasOrdenTrabajoThunk = createAsyncThunk<
	IDetalleOrdenDeTrabajoCompra[],
	{ id_orden: string | number | undefined },
	{ rejectValue: string }
>('ordenTrabajo/listaComprasOrdenTrabajoThunk', async ({ id_orden }, { rejectWithValue }) => {
	try {
		const response = await ApiService.fetchData<IDetalleOrdenDeTrabajoCompra[]>({
			url: `/api/ordenes-de-trabajo/${id_orden}/detalles-trabajo/lista-compras/`,
			method: 'get',
		});
		return response.data;
	} catch (error: any) {
		return rejectWithValue(error.response.data || 'Error al obtener las compras');
	}
});

export const listaOrdenTrabajoThunk = createAsyncThunk<
	IOrdenDeTrabajo[],
	undefined,
	{ rejectValue: string }
>('ordenTrabajo/listaOrdenTrabajoThunk', async (_, { rejectWithValue }) => {
	try {
		const response = await ApiService.fetchData<IOrdenDeTrabajo[]>({
			url: `/api/ordenes-de-trabajo/`,
			method: 'get',
		});
		return response.data;
	} catch (error: any) {
		return rejectWithValue(error.response.data);
	}
});

export const detalleOrdenTrabajoThunk = createAsyncThunk<
	IOrdenDeTrabajo,
	{ id_ordenTrabajo: number | string | any },
	{ rejectValue: string }
>('ordenTrabajo/detalleOrdenTrabajoThunk', async ({ id_ordenTrabajo }, { rejectWithValue }) => {
	try {
		const response = await ApiService.fetchData<IOrdenDeTrabajo>({
			url: `/api/ordenes-de-trabajo/${id_ordenTrabajo}/`,
			method: 'get',
		});
		return response.data;
	} catch (error: any) {
		return rejectWithValue(error.response.data);
	}
});

export const listaSeguimientosThunk = createAsyncThunk<
	ISeguimientoOrden[],
	{ id_orden: number | string | undefined; id_detalle: number | string | undefined },
	{ rejectValue: string }
>('ordenTrabajo/listaSeguimientosThunk', async ({ id_orden, id_detalle }, { rejectWithValue }) => {
	try {
		const response = await ApiService.fetchData<ISeguimientoOrden[]>({
			url: `/api/ordenes-de-trabajo/${id_orden}/detalles-trabajo/${id_detalle}/seguimientos/`,
			method: 'get',
		});
		return response.data;
	} catch (error: any) {
		return rejectWithValue(error.response.data || 'Error al obtener la lista de seguimientos');
	}
});

export const detalleSeguimientoThunk = createAsyncThunk<
	ISeguimientoOrden,
	{ ordenId: number | string | undefined; idDetalle: number | string | any },
	{ rejectValue: string }
>('ordenTrabajo/detalleSeguimientoThunk', async ({ ordenId, idDetalle }, { rejectWithValue }) => {
	try {
		const response = await ApiService.fetchData<ISeguimientoOrden>({
			url: `/api/ordenes-de-trabajo/${ordenId}/seguimientos/${idDetalle}/`,
			method: 'get',
		});
		return response.data;
	} catch (error: any) {
		return rejectWithValue(
			error.response.data || 'Error al obtener el detalle del seguimiento',
		);
	}
});

export const listaAdjuntosThunk = createAsyncThunk<
	IAdjuntoDeOrden[],
	{ ordenId: number | undefined },
	{ rejectValue: string }
>('ordenTrabajo/listaAdjuntosThunk', async ({ ordenId }, { rejectWithValue }) => {
	try {
		const response = await ApiService.fetchData<IAdjuntoDeOrden[]>({
			url: `/api/ordenes-de-trabajo/${ordenId}/archivos-adjuntos/`,
			method: 'get',
		});
		return response.data;
	} catch (error: any) {
		return rejectWithValue(error.response.data);
	}
});

export const detalleAdjuntoThunk = createAsyncThunk<
	IAdjuntoDeOrden,
	{ id_adjunto: number | string | undefined; id_orden: string | number | undefined },
	{ rejectValue: string }
>('ordenTrabajo/detalleAdjuntoThunk', async ({ id_adjunto, id_orden }, { rejectWithValue }) => {
	try {
		const response = await ApiService.fetchData<IAdjuntoDeOrden>({
			url: `/api/ordenes-de-trabajo/${id_orden}/archivos-adjuntos/${id_adjunto}/`,
			method: 'get',
		});
		return response.data;
	} catch (error: any) {
		return rejectWithValue(error.response.data);
	}
});

export const listaHistorialCambiosThunk = createAsyncThunk<
	IHistorialCambiosOrden[],
	{ id_orden: string | number | undefined },
	{ rejectValue: string }
>('ordenTrabajo/listaHistorialCambiosThunk', async ({ id_orden }, { rejectWithValue }) => {
	try {
		const response = await ApiService.fetchData<IHistorialCambiosOrden[]>({
			url: `/api/ordenes-de-trabajo/${id_orden}/historial-cambios/`,
			method: 'get',
		});
		return response.data;
	} catch (error: any) {
		return rejectWithValue(
			error.response.data || 'Error al obtener el historial de cambios de la orden',
		);
	}
});

export const detalleHistorialCambioThunk = createAsyncThunk<
	IHistorialCambiosOrden,
	{ id_orden: string | number | undefined; id_historial: number | string | undefined },
	{ rejectValue: string }
>(
	'ordenTrabajo/detalleHistorialCambioThunk',
	async ({ id_orden, id_historial }, { rejectWithValue }) => {
		try {
			const response = await ApiService.fetchData<IHistorialCambiosOrden>({
				url: `/api/ordenes-de-trabajo/${id_orden}/historial-cambios/${id_historial}/`,
				method: 'get',
			});
			return response.data;
		} catch (error: any) {
			return rejectWithValue(error.response.data);
		}
	},
);

export const listaDetalleTrabajoOTThunk = createAsyncThunk<
	IDetalleOrdenDeTrabajo[],
	{ id_orden: string | number | undefined },
	{ rejectValue: string }
>('ordenTrabajo/listaDetalleTrabajoOTThunk', async ({ id_orden }, { rejectWithValue }) => {
	try {
		const response = await ApiService.fetchData<IDetalleOrdenDeTrabajo[]>({
			url: `/api/ordenes-de-trabajo/${id_orden}/soportes-tecnicos`,
			method: 'get',
		});
		return response.data;
	} catch (error: any) {
		return rejectWithValue(error.response.data || 'Error al obtener la lista detalle trabajo');
	}
});

export const listaTrabajosFiltradasThunk = createAsyncThunk<
	IListaTrabajosFiltrado,
	{ id_orden: number | string | undefined },
	{ rejectValue: string }
>('ordenTrabajo/listaTrabajosFiltradasThunk', async ({ id_orden }, { rejectWithValue }) => {
	try {
		const response = await ApiService.fetchData<IListaTrabajosFiltrado>({
			url: `/api/ordenes-de-trabajo/${id_orden}/soportes-tecnicos/trabajos-disponibles/`,
			method: 'get',
		});
		return response.data;
	} catch (error: any) {
		return rejectWithValue(
			error.response.data || 'Error al obtener la lista de cotizaciones filtrada',
		);
	}
});

export const detalleDelDetalleTrabajoThunk = createAsyncThunk<
	IDetalleOrdenDeTrabajo,
	{ id_orden: number | string | undefined; id_detalle: string | number | undefined },
	{ rejectValue: string }
>(
	'ordenTrabajo/detalleDelDetalleTrabajoThunk',
	async ({ id_detalle, id_orden }, { rejectWithValue }) => {
		try {
			const response = await ApiService.fetchData<IDetalleOrdenDeTrabajo>({
				url: `/api/ordenes-de-trabajo/${id_orden}/detalles-trabajo/${id_detalle}/`,
				method: 'get',
			});
			return response.data;
		} catch (error: any) {
			return rejectWithValue(
				error.response.data || 'Error al obtener el detalle del detalle del trabajo',
			);
		}
	},
);

export const listarSimpleHistorialThunk = createAsyncThunk<
	IHistorialSimple[],
	{ id: number | undefined },
	{ rejectValue: string }
>('ordenTrabajo/listarSimpleHistorialThunk', async ({ id }, { rejectWithValue }) => {
	try {
		const response = await ApiService.fetchData<IHistorialSimple[]>({
			url: `/api/ordenes-de-trabajo/${id}/history/`,
			method: 'get',
		});
		return response.data;
	} catch (error: any) {
		return rejectWithValue(error.response.data || 'Error al obtener el historial');
	}
});

export const listaInsumosThunk = createAsyncThunk<
	IInsumo[],
	{ id_orden_trabajo: number },
	{ rejectValue: string }
>('ordenTrabajo/listaInsumosThunk', async ({ id_orden_trabajo }, { rejectWithValue }) => {
	try {
		const response = await ApiService.fetchData<IInsumo[]>({
			url: `/api/ordenes-de-trabajo/${id_orden_trabajo}/insumos/`,
			method: 'get',
		});
		return response.data;
	} catch (error: any) {
		return rejectWithValue(error.response.data || 'Error al obtener los insumos');
	}
});

// export const listaGuiasDisponiblesThunk = createAsyncThunk<IGuiaSalida[], {ordenTrabajoId: number}, {rejectValue: string}>(
//     'ordenTrabajo/listaGuiasDisponiblesThunk',
//     async ({ordenTrabajoId}, {rejectWithValue}) => {
//         try {
//             const response = await ApiService.fetchData<IGuiaSalida[]>({url: `/api/ordenes-trabajo/${ordenTrabajoId}/detalles-trabajo/guias-disponibles/`, method: 'get'});
//             return response.data;
//         } catch (error: any) {
//             return rejectWithValue(error.response.data || "Error al obtener las guias disponibles");
//         }
//     }
// );

// export const listarInsumosCotizacionThunk = createAsyncThunk<IInsumoCotizacion[], {id: number | undefined}, {rejectValue: string}>(
//     'ordenTrabajo/listarInsumosCotizacionThunk',
//     async ({id}, {rejectWithValue}) => {
//         try {
//             const response = await ApiService.fetchData<IInsumoCotizacion[]>({url: `/api/ordenes-trabajo/${id}/detalles-trabajo/insumos-cotizacion/`, method: 'get'});
//             return response.data;
//         } catch (error: any) {
//             return rejectWithValue(error.response.data || "Error al obtener los insumos");
//         }
//     }
// );

export const listaDetalleTrabajoSinInsumoThunk = createAsyncThunk<
	IDetalleOrdenDeTrabajo[],
	{ id_orden: string | number | undefined },
	{ rejectValue: string }
>('ordenTrabajo/listaDetalleTrabajoSinInsumoThunk', async ({ id_orden }, { rejectWithValue }) => {
	try {
		const response = await ApiService.fetchData<IDetalleOrdenDeTrabajo[]>({
			url: `/api/ordenes-de-trabajo/${id_orden}/detalles-trabajo/detalles-sin-insumo/`,
			method: 'get',
		});
		return response.data;
	} catch (error: any) {
		return rejectWithValue(
			error.response.data || 'Error al obtener la lista de detalles de trabajo sin insumo',
		);
	}
});

export const detalleConVisitaThunk = createAsyncThunk<
	IVisitaEnOT,
	{ ordenId: number | string | undefined; detalleTrabajoId: number | string | undefined | null },
	{ rejectValue: string }
>(
	'ordenTrabajo/detalleConVisitaThunk',
	async ({ ordenId, detalleTrabajoId }, { rejectWithValue }) => {
		try {
			const response = await ApiService.fetchData<IVisitaEnOT>({
				url: `/api/ordenes-de-trabajo/${ordenId}/detalles-trabajo/${detalleTrabajoId}/detalles-con-visitas/`,
				method: 'get',
			});
			return response.data;
		} catch (error: any) {
			return rejectWithValue(
				error.response?.data || 'Error al obtener los detalles con visitas',
			);
		}
	},
);

export const listaDetallesSeguimientosOTThunk = createAsyncThunk<
	IListaDetallesSeguimientosOT,
	{ id_orden: number | string | undefined },
	{ rejectValue: string }
>('ordenTrabajo/listaDetallesSeguimientosOTThunk', async ({ id_orden }, { rejectWithValue }) => {
	try {
		const response = await ApiService.fetchData<IListaDetallesSeguimientosOT>({
			url: `/api/ordenes-de-trabajo/${id_orden}/detalles-seguimientos-visitas/`,
			method: 'get',
		});
		return response.data;
	} catch (error: any) {
		return rejectWithValue(error.response.data || 'Error al obtener la lista');
	}
});

// ========== SERVICIOS GENERALES ==========
export const listaServiciosGeneralesThunk = createAsyncThunk<
	IServicioEnOT[],
	{ id_orden: number | string | undefined },
	{ rejectValue: string }
>('ordenTrabajo/listaServiciosGeneralesThunk', async ({ id_orden }, { rejectWithValue }) => {
	try {
		const response = await ApiService.fetchData<IServicioEnOT[]>({
			url: `/api/ordenes-de-trabajo/${id_orden}/servicios-generales/`,
			method: 'get',
		});
		return response.data;
	} catch (error: any) {
		return rejectWithValue(error.response?.data || 'Error al obtener los servicios generales');
	}
});

export const crearServicioGeneralThunk = createAsyncThunk<
	IServicioEnOT,
	{ id_orden: number | string | undefined; data: Partial<IServicioEnOT> },
	{ rejectValue: string }
>('ordenTrabajo/crearServicioGeneralThunk', async ({ id_orden, data }, { rejectWithValue }) => {
	try {
		const response = await ApiService.fetchData<IServicioEnOT>({
			url: `/api/ordenes-de-trabajo/${id_orden}/servicios-generales/`,
			method: 'post',
			data,
		});
		return response.data;
	} catch (error: any) {
		return rejectWithValue(error.response?.data || 'Error al crear el servicio general');
	}
});

export const actualizarServicioGeneralThunk = createAsyncThunk<
	IServicioEnOT,
	{ id_orden: number | string | undefined; id_servicio: number; data: Partial<IServicioEnOT> },
	{ rejectValue: string }
>(
	'ordenTrabajo/actualizarServicioGeneralThunk',
	async ({ id_orden, id_servicio, data }, { rejectWithValue }) => {
		try {
			const response = await ApiService.fetchData<IServicioEnOT>({
				url: `/api/ordenes-de-trabajo/${id_orden}/servicios-generales/${id_servicio}/`,
				method: 'patch',
				data,
			});
			return response.data;
		} catch (error: any) {
			return rejectWithValue(
				error.response?.data || 'Error al actualizar el servicio general',
			);
		}
	},
);

export const eliminarServicioGeneralThunk = createAsyncThunk<
	number,
	{ id_orden: number | string | undefined; id_servicio: number },
	{ rejectValue: string }
>(
	'ordenTrabajo/eliminarServicioGeneralThunk',
	async ({ id_orden, id_servicio }, { rejectWithValue }) => {
		try {
			await ApiService.fetchData({
				url: `/api/ordenes-de-trabajo/${id_orden}/servicios-generales/${id_servicio}/`,
				method: 'delete',
			});
			return id_servicio;
		} catch (error: any) {
			return rejectWithValue(error.response?.data || 'Error al eliminar el servicio general');
		}
	},
);

export const cambiarEstadoServicioGeneralThunk = createAsyncThunk<
	IServicioEnOT,
	{ id_orden: number | string | undefined; id_servicio: number; estado: string },
	{ rejectValue: string }
>(
	'ordenTrabajo/cambiarEstadoServicioGeneralThunk',
	async ({ id_orden, id_servicio, estado }, { rejectWithValue }) => {
		try {
			const response = await ApiService.fetchData<IServicioEnOT>({
				url: `/api/ordenes-de-trabajo/${id_orden}/servicios-generales/${id_servicio}/actualizar-estado/`,
				method: 'post',
				data: { estado },
			});
			return response.data;
		} catch (error: any) {
			return rejectWithValue(
				error.response?.data || 'Error al cambiar el estado del servicio',
			);
		}
	},
);

export const ordenTrabajoSlice = createSlice({
	name: 'ordenTrabajo/ordenTrabajoSlice',
	initialState,
	reducers: {},
	extraReducers(builder) {
		builder
			.addCase(listaOrdenTrabajoThunk.pending, (state) => {
				state.loading = true;
			})
			.addCase(listaOrdenTrabajoThunk.fulfilled, (state, action) => {
				state.loading = false;
				state.listaOrdenTrabajo = action.payload;
			})
			.addCase(listaOrdenTrabajoThunk.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload as string;
			})
			.addCase(detalleOrdenTrabajoThunk.pending, (state) => {
				state.loading = true;
			})
			.addCase(detalleOrdenTrabajoThunk.fulfilled, (state, action) => {
				state.loading = false;
				state.detalleOrdenTrabajo = action.payload;
			})
			.addCase(detalleOrdenTrabajoThunk.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload as string;
			})
			// .addCase(listaSeguimientosThunk.pending, (state) => {
			//     state.loading = true
			// })
			// .addCase(listaSeguimientosThunk.fulfilled, (state, action) => {
			//     state.loading = false
			//     state.listaSeguimientos = action.payload
			// })
			// .addCase(listaSeguimientosThunk.rejected, (state, action) => {
			//     state.loading = false
			//     state.error = action.payload as string
			// })
			// .addCase(detalleSeguimientoThunk.pending, (state) => {
			//     state.loading = true
			// })
			// .addCase(detalleSeguimientoThunk.fulfilled, (state, action) => {
			//     state.loading = false
			//     state.detalleSeguimiento = action.payload
			// })
			// .addCase(detalleSeguimientoThunk.rejected, (state, action) => {
			//     state.loading = false
			//     state.error = action.payload as string
			// })
			.addCase(listaAdjuntosThunk.pending, (state) => {
				state.loading = true;
			})
			.addCase(listaAdjuntosThunk.fulfilled, (state, action) => {
				state.loading = false;
				state.listaAdjuntos = action.payload;
			})
			.addCase(listaAdjuntosThunk.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload as string;
			})
			.addCase(detalleAdjuntoThunk.pending, (state) => {
				state.loading = true;
			})
			.addCase(detalleAdjuntoThunk.fulfilled, (state, action) => {
				state.loading = false;
				state.detalleAdjunto = action.payload;
			})
			.addCase(detalleAdjuntoThunk.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload as string;
			})
			.addCase(listaHistorialCambiosThunk.pending, (state) => {
				state.loading = true;
			})
			.addCase(listaHistorialCambiosThunk.fulfilled, (state, action) => {
				state.loading = false;
				state.listaHistorialCambios = action.payload;
			})
			.addCase(listaHistorialCambiosThunk.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			})
			// .addCase(detalleHistorialCambioThunk.pending, (state) => {
			//     state.loading = true
			//     state.error = null
			// })
			// .addCase(detalleHistorialCambioThunk.fulfilled, (state, action) => {
			//     state.loading = false
			//     state.error = null
			//     state.detalleHistorialCambio = action.payload
			// })
			// .addCase(detalleHistorialCambioThunk.rejected, (state, action) => {
			//     state.loading = false
			//     state.error = action.payload as string
			// })
			.addCase(listaDetalleTrabajoOTThunk.pending, (state) => {
				state.loading = true;
			})
			.addCase(listaDetalleTrabajoOTThunk.fulfilled, (state, action) => {
				state.loading = false;
				state.listaDetalleTrabajoOT = action.payload;
			})
			.addCase(listaDetalleTrabajoOTThunk.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			})
			.addCase(listaTrabajosFiltradasThunk.pending, (state) => {
				state.loading = true;
			})
			.addCase(listaTrabajosFiltradasThunk.fulfilled, (state, action) => {
				state.loading = false;
				state.listaTrabajosFiltrados = action.payload;
			})
			.addCase(listaTrabajosFiltradasThunk.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			})
			.addCase(detalleDelDetalleTrabajoThunk.pending, (state) => {
				state.loading = true;
			})
			.addCase(detalleDelDetalleTrabajoThunk.fulfilled, (state, action) => {
				state.loading = false;
				state.detalleDelDetalleTrabajo = action.payload;
			})
			.addCase(detalleDelDetalleTrabajoThunk.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			})
			.addCase(listarSimpleHistorialThunk.pending, (state) => {
				state.loading = true;
			})
			.addCase(listarSimpleHistorialThunk.fulfilled, (state, action) => {
				state.loading = false;
				state.listarSimpleHistorial = action.payload;
			})
			.addCase(listarSimpleHistorialThunk.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			})
			.addCase(listaInsumosThunk.pending, (state) => {
				state.loading = true;
			})
			.addCase(listaInsumosThunk.fulfilled, (state, action) => {
				state.loading = false;
				state.listaInsumos = action.payload;
			})
			.addCase(listaInsumosThunk.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			})
			// .addCase(listaGuiasDisponiblesThunk.pending, (state) => {
			//     state.loading = true;
			// })
			// .addCase(listaGuiasDisponiblesThunk.fulfilled, (state, action) => {
			//     state.loading = false;
			//     state.listaGuiasDisponibles = action.payload;
			// })
			// .addCase(listaGuiasDisponiblesThunk.rejected, (state, action) => {
			//     state.loading = false;
			//     state.error = action.payload;
			// })
			.addCase(listaSeguimientosThunk.pending, (state) => {
				state.loading = true;
			})
			.addCase(listaSeguimientosThunk.fulfilled, (state, action) => {
				state.loading = false;
				state.listaSeguimientos = action.payload;
			})
			.addCase(listaSeguimientosThunk.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			})
			.addCase(detalleSeguimientoThunk.pending, (state) => {
				state.loading = true;
			})
			.addCase(detalleSeguimientoThunk.fulfilled, (state, action) => {
				state.loading = false;
				state.detalleSeguimiento = action.payload;
			})
			.addCase(detalleSeguimientoThunk.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			})
			// .addCase(listarInsumosCotizacionThunk.pending, (state) => {
			//     state.loading = true;
			// })
			// .addCase(listarInsumosCotizacionThunk.fulfilled, (state, action) => {
			//     state.loading = false;
			//     state.listarInsumosCotizacion = action.payload;
			// })
			// .addCase(listarInsumosCotizacionThunk.rejected, (state, action) => {
			//     state.loading = false;
			//     state.error = action.payload;
			// })
			.addCase(listaDetalleTrabajoSinInsumoThunk.pending, (state) => {
				state.loading = true;
			})
			.addCase(listaDetalleTrabajoSinInsumoThunk.fulfilled, (state, action) => {
				state.loading = false;
				state.listaDetalleTrabajoSinInsumo = action.payload;
			})
			.addCase(listaDetalleTrabajoSinInsumoThunk.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			})
			.addCase(detalleConVisitaThunk.pending, (state) => {
				state.loading = true;
			})
			.addCase(detalleConVisitaThunk.fulfilled, (state, action) => {
				state.loading = false;
				state.detalleConvisita = action.payload;
			})
			.addCase(detalleConVisitaThunk.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			})
			.addCase(listaDetallesSeguimientosOTThunk.pending, (state) => {
				state.loading = true;
			})
			.addCase(listaDetallesSeguimientosOTThunk.fulfilled, (state, action) => {
				state.loading = false;
				state.listaDetallesSeguimientosOT = action.payload;
			})
			.addCase(listaDetallesSeguimientosOTThunk.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			})
			.addCase(listaComprasOrdenTrabajoThunk.pending, (state) => {
				state.loading = true;
			})
			.addCase(listaComprasOrdenTrabajoThunk.fulfilled, (state, action) => {
				state.loading = false;
				state.listaComprasOrdenTrabajo = action.payload;
			})
			.addCase(listaComprasOrdenTrabajoThunk.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			})
			.addCase(listaTecnicosThunk.pending, (state) => {
				state.loading = true;
			})
			.addCase(listaTecnicosThunk.fulfilled, (state, action) => {
				state.loading = false;
				state.listaTecnicos = action.payload;
			})
			.addCase(listaTecnicosThunk.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			})
			.addCase(checkCompletibilidadOTThunk.pending, (state) => {
				state.loading = true;
			})
			.addCase(checkCompletibilidadOTThunk.fulfilled, (state, action) => {
				state.loading = false;
				state.checkCompletibilidadOT = action.payload;
			})
			.addCase(checkCompletibilidadOTThunk.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			})
			.addCase(listaRetroalimentacionesOTThunk.pending, (state) => {
				state.loading = true;
			})
			.addCase(listaRetroalimentacionesOTThunk.fulfilled, (state, action) => {
				state.loading = false;
				state.listaRetroalimentacionesOT = action.payload;
			})
			.addCase(listaRetroalimentacionesOTThunk.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			})
			.addCase(detalleSinPermisosRetroalimentacionOTThunk.pending, (state) => {
				state.loading = true;
			})
			.addCase(detalleSinPermisosRetroalimentacionOTThunk.fulfilled, (state, action) => {
				state.loading = false;
				state.detalleSinPermisosRetroalimentacionOT = action.payload;
			})
			.addCase(detalleSinPermisosRetroalimentacionOTThunk.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			})
			.addCase(listaDetalleGastoRendicionOTThunk.pending, (state) => {
				state.loading = true;
			})
			.addCase(listaDetalleGastoRendicionOTThunk.fulfilled, (state, action) => {
				state.loading = false;
				state.listaDetalleGastoRendicionOT = action.payload;
			})
			.addCase(listaDetalleGastoRendicionOTThunk.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			})
			.addCase(listaDetalleGastoRendicionOTDisponiblesThunk.pending, (state) => {
				state.loading = true;
			})
			.addCase(listaDetalleGastoRendicionOTDisponiblesThunk.fulfilled, (state, action) => {
				state.loading = false;
				state.listaDetalleGastoRendicionOTDisponibles = action.payload;
			})
			.addCase(listaDetalleGastoRendicionOTDisponiblesThunk.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			})
			.addCase(listaUsuariosVinculadosOTThunk.pending, (state) => {
				state.loading = true;
			})
			.addCase(listaUsuariosVinculadosOTThunk.fulfilled, (state, action) => {
				state.loading = false;
				state.listaUsuariosVinculadosOT = action.payload;
			})
			.addCase(listaUsuariosVinculadosOTThunk.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			})
			.addCase(detalleRetroalimentacionOTThunk.pending, (state) => {
				state.loading = true;
			})
			.addCase(detalleRetroalimentacionOTThunk.fulfilled, (state, action) => {
				state.loading = false;
				state.detalleRetroalimentacionOT = action.payload;
			})
			.addCase(detalleRetroalimentacionOTThunk.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			})
			// Servicios Generales
			.addCase(listaServiciosGeneralesThunk.pending, (state) => {
				state.loading = true;
			})
			.addCase(listaServiciosGeneralesThunk.fulfilled, (state, action) => {
				state.loading = false;
				state.listaServiciosGenerales = action.payload;
			})
			.addCase(listaServiciosGeneralesThunk.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			})
			.addCase(crearServicioGeneralThunk.pending, (state) => {
				state.loading = true;
			})
			.addCase(crearServicioGeneralThunk.fulfilled, (state, action) => {
				state.loading = false;
				state.listaServiciosGenerales.push(action.payload);
			})
			.addCase(crearServicioGeneralThunk.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			})
			.addCase(actualizarServicioGeneralThunk.fulfilled, (state, action) => {
				const index = state.listaServiciosGenerales.findIndex(
					(s) => s.id === action.payload.id,
				);
				if (index !== -1) {
					state.listaServiciosGenerales[index] = action.payload;
				}
			})
			.addCase(eliminarServicioGeneralThunk.fulfilled, (state, action) => {
				state.listaServiciosGenerales = state.listaServiciosGenerales.filter(
					(s) => s.id !== action.payload,
				);
			})
			.addCase(cambiarEstadoServicioGeneralThunk.fulfilled, (state, action) => {
				const index = state.listaServiciosGenerales.findIndex(
					(s) => s.id === action.payload.id,
				);
				if (index !== -1) {
					state.listaServiciosGenerales[index] = action.payload;
				}
			});
	},
});
export const {} = ordenTrabajoSlice.actions;
export default ordenTrabajoSlice.reducer;
