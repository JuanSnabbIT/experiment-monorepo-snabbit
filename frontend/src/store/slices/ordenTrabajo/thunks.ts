import { createAction, createAsyncThunk } from '@reduxjs/toolkit';
import { IOrdenTrabajo } from '@/types/ordentrabajoTypes';

// TODO: These thunks are placeholders to keep DetalleOT running.
// Align with real API-backed thunks from ordenTrabajo slice when available.
export const getOrdenTrabajo = createAsyncThunk<IOrdenTrabajo | undefined, number>(
  'ordentrabajo/getOrdenTrabajo',
  async () => undefined,
);

export const obtenerHistorialEstados = createAsyncThunk<IOrdenTrabajo['historial_estados'] | undefined, number>(
  'ordentrabajo/obtenerHistorialEstados',
  async () => undefined,
);

export const updateNumero = createAsyncThunk<undefined, { id: number; numero: string | null }>(
  'ordentrabajo/updateNumero',
  async () => undefined,
);

export const updateEstado = createAsyncThunk<undefined, { id: number; estado: IOrdenTrabajo['estado'] | null }>(
  'ordentrabajo/updateEstado',
  async () => undefined,
);

export const updateSucursal = createAsyncThunk<undefined, { id: number; sucursal: number | null }>(
  'ordentrabajo/updateSucursal',
  async () => undefined,
);

export const resetOrdenTrabajo = createAction('ordentrabajo/resetOrdenTrabajo');
