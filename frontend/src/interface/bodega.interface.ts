import { ICategoria, IFabricante } from './items.interface';

export interface IBodega {
	id: number;
	nombre: string;
	fecha_creacion: string;
	fecha_modificacion: string;
	sucursal: number;
}

export interface IStockItemEnBodega {
	id: number;
	datos_item: IItemEmpresaEnOrden;
	numeros_series: string[];
	fecha_creacion: string;
	fecha_modificacion: string;
	cantidad: number;
	cantidad_no_disponible: number;
	pmp: number;
	bodega: number;
	item: number;
	compras: number[];
}

export interface IItemEmpresaEnOrden {
	id: number;
	datos_categoria: ICategoria | null;
	datos_fabricante: IFabricante | null;
	fecha_creacion: string;
	fecha_modificacion: string;
	nombre: string;
	descripcion_corta: string;
	comentarios: string;
	codigo_barras: string;
	fabricante: number;
	categoria: number;
	empresa: number;
	proveedores_empresa: number[];
}

export interface IItemEnOrdenCompra {
	id: number;
	item_empresa: IItemEmpresaEnOrden;
	fecha_creacion: string;
	fecha_modificacion: string;
	cantidad: number;
	precio: number;
	orden_compra: number;
	item: number;
	cantidad_recibida: number | null;
}

export interface IOrdenCompra {
	id: number;
	items: number[];
	datos_item: IItemEnOrdenCompra[];
	fecha_creacion: string;
	fecha_modificacion: string;
	codigo: string;
	observaciones: string;
	estado: string;
	proveedor: number;
	sucursal: number;
	creado_por: number;
	nombre_proveedor: string;
	estado_label: string;
	cotizacion: string;
	nombre_cotizacion: string;
	nombre_cliente: string;
	oc_cliente: number | null;
	oc_empresa: number | null;
	relacion_cotizacion?: number | null;
	dolar_observado: number | null;
	dolar_final: number | null;
	fecha_compra: string | null;
	tipo_moneda?: string;
	tipo_moneda_label?: string;
	proveedor_empresa?: { tipo_moneda?: string };
}

export interface IGuiaSalida {
	id: number;
	estado_label: string;
	fecha_creacion: string;
	fecha_modificacion: string;
	firma_recibido_por: string;
	motivo: string;
	estado: string;
	bodega: number;
	cliente: number | null;
	cliente_nombre: string;
	entregado_a: number | null;
	recibido_por: number | null;
	creado_por: number;
	nombre_creado_por: string;
	nombre_recibido_por: string | null;
	firma_entrega?: string;
	orden_trabajo?: number | null;
	soporte_tecnico?: number | { falta_datos?: boolean } | null;
}

export interface IItemGuiaSalida {
	id: number;
	datos_stock: IStockItemEnBodega;
	fecha_creacion: string;
	fecha_modificacion: string;
	cantidad_rebajada: number;
	cantidad_devuelta: number;
	guia: number;
	stock_item: number;
	cantidad_original: number;
	guia_id: number;
	numero_serie: { serie: string };
	individualizado: boolean;
}

export interface IIndicadorDolar {
	version: string;
	autor: string;
	codigo: string;
	nombre: string;
	unidad_medida: string;
	serie: {
		fecha: string;
		valor: number;
	}[];
}

export interface IItemOrdenCompraEnStock {
	id: number;
	fecha_creacion: string;
	fecha_modificacion: string;
	item_oc_id: number;
	numeros_serie: { numeros_serie: { serie: string; modelo: string; object_id: number }[] };
	cantidad: number;
	content_type: number;
	stock_item: null | number;
	bodega_temporal: null | number;
	nombre_bodega: string;
	id_documento: number | null;
	tipo_documento: string | null;
}

export interface IEventoOc {
	codigo_orden: string;
	tipo: string;
	fecha: string;
	detalle: string;
	usuario: string;
	observacion: string;
}

export interface ICompra {
	id: number;
	fecha_creacion: string;
	fecha_modificacion: string;
	codigo: string;
	observaciones: string;
	estado: string;
	estado_label: string;
	nombre_creado_por: string;
	sucursal: number;
	creado_por: number;
	archivos: IArchivoCompra[];
	items: number[];
	total_compra: number;
	fecha_compra: string | null;
	orden_trabajo: number | null;
}

export interface IArchivoCompra {
	id: number;
	fecha_creacion: string;
	fecha_modificacion: string;
	archivo: null | string;
	imagen: string | null;
	tipo: string;
	creado_por: number | null;
	compra: number;
	nombre_archivo: string;
	nombre_creado_por: string;
	observaciones: string;
	tipo_label: string;
	opcion_label: string;
}

export interface IItemEnCompra {
	id: number;
	fecha_creacion: string;
	fecha_modificacion: string;
	compra: number;
	item: number;
	cantidad: number;
	precio: number;
	nombre_item: string;
	item_stock: IItemOrdenCompraEnStock | null;
}

export interface IItemGuiaSalidaMovimiento {
	id: number;
	fecha_creacion: string;
	fecha_modificacion: string;
	cantidad_original: number;
	cantidad_rebajada: number;
	cantidad_devuelta: number;
	numero_serie: { serie: string };
	individualizado: boolean;
	guia: number;
	stock_item: number;
}

export interface IMovimientoStock {
	id: number;
	datos_origen: IItemOrdenCompraEnStock | IItemGuiaSalidaMovimiento;
	fecha_creacion: string;
	fecha_modificacion: string;
	tipo_movimiento: string;
	cantidad: number;
	descripcion: string;
	object_id: number;
	stock_item: number;
	usuario: number;
	content_type: number;
	nombre_usuario: string;
	// Campos adicionales calculados en backend para el gráfico
	cantidad_delta?: number; // Delta del movimiento (mismo que cantidad)
	saldo_acumulado?: number; // Saldo total acumulado hasta este movimiento
}

export interface ITomaInventario {
	id: number;
	nombre_creado_por: string;
	datos_bodegas: {
		id: number;
		nombre: string;
	}[];
	fecha_creacion: string;
	fecha_modificacion: string;
	fecha_inicio: null | string;
	fecha_termino: null | string;
	motivo: string;
	creado_por: null | string;
	bodegas: number[];
	items_a_inventariar: number[];
	ultimo_estado: IEstadoTomaInventario | null;
}

export interface IItemEnTomaInventario {
	id: number;
	fecha_creacion: string;
	fecha_modificacion: string;
	cantidad_original: number;
	cantidad_encontrada: number;
	estado: string;
	observaciones: string;
	toma_inventario: number;
	stock_item: number;
	nombre_item: string;
	estado_label: string;
	nombre_bodega: string;
}

export interface IEstadoTomaInventario {
	id: number;
	estado_label: string;
	fecha_creacion: string;
	fecha_modificacion: string;
	estado: string;
	fecha_cambio: null | string;
	observaciones: string;
	toma_inventario: number;
	usuario: number;
}

// Interfaces para tracking de items en completar OT con compras
export interface ICompraConItems {
	compra: ICompra;
	items: IItemEnCompra[];
}

export interface IItemTracking {
	item_en_compra_id: number;
	cantidad_usada: number;
	cantidad_sobrante: number;
	bodega_destino: number | null;
}

export interface ICompletarOTConComprasPayload {
	items_tracking: IItemTracking[];
}

// ========== Vouchers de Devolución ==========

export interface IMovimientoEnVoucher {
	id: number;
	orden: number;
	notas: string;
	movimiento: number;
	voucher: number;
	fecha_creacion: string;
}

export interface IMovimientoDevolucion {
	item_id: number;
	item_nombre: string;
	cantidad: number;
	descripcion?: string;
}

export interface IMovimientoAgrupado {
	origen_tipo: 'GuíaSalida' | 'Compra';
	origen_id: number;
	origen_nombre?: string;
	origen_detalle: string;
	cantidad: number;
	movimientos: IMovimientoDevolucion[];
	items?: Array<{
		item_nombre: string;
		item_codigo: string;
		cantidad_devuelta: number;
		bodega: string;
		usuario: string;
		fecha: string;
	}>;
}

export interface IVoucherDevolucion {
	id: number;
	numero: string;
	orden_trabajo: number;
	orden_trabajo_numero?: string;
	fecha_creacion: string;
	fecha_modificacion: string;
	total_items_devueltos: number;
	observaciones?: string;
	movimientos_agrupados: IMovimientoAgrupado[];
	movimientos_voucher?: IMovimientoEnVoucher[];
}
