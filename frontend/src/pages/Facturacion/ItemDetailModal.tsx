import React, { useEffect, useState } from 'react';
import Modal, { ModalBody, ModalFooter, ModalHeader } from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import ApiService from '@/services/ApiService';
import dayjs from 'dayjs';
import 'dayjs/locale/es';

interface PrefacturaItem {
	ot_id?: number;
	id?: number;
	item_id?: number;
	tipo?: string;
	cantidad?: number;
	precio_total?: number;
	precio_ajustado?: number | null;
	facturar?: boolean;
	comentario?: string;
	nombre?: string;
	guia_id?: number;
	rendicion_id?: number;
	stock_item_id?: number | null;
	compra_id?: number;
	parent_id?: number;
	[n: string]: any;
}

interface Props {
	open: boolean;
	onClose: () => void;
	item: PrefacturaItem | null;
}

// Normalizar item para usar item_id consistentemente (con fallback a id legacy)
const normalizePrefacturaItem = (item: PrefacturaItem | null): PrefacturaItem | null => {
	if (!item) return null;
	return {
		...item,
		item_id: item.item_id ?? (typeof item.id === 'number' ? item.id : undefined),
	};
};

const ItemDetailModal: React.FC<Props> = ({ open, onClose, item: rawItem }) => {
	const item = normalizePrefacturaItem(rawItem);
	const [data, setData] = useState<any>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [itemsGuia, setItemsGuia] = useState<any[]>([]);
	const [loadingItems, setLoadingItems] = useState(false);
	const [seguimientos, setSeguimientos] = useState<any[]>([]);
	const [loadingSeguimientos, setLoadingSeguimientos] = useState(false);
	const [expandVinculados, setExpandVinculados] = useState(false);
	const [vinculados, setVinculados] = useState<any[]>([]);

	// Reset estado cuando el modal se cierra
	useEffect(() => {
		if (!open) {
			setData(null);
			setSeguimientos([]);
			setVinculados([]);
			setExpandVinculados(false);
			setError(null);
			setLoading(false);
			setLoadingSeguimientos(false);
		}
	}, [open]);

	useEffect(() => {
		let mounted = true;
		const fetchDetail = async () => {
			if (!item || !open) return; // No fetch si no está abierto
			if (loading) return; // Evitar fetch si ya está cargando
			
			setError(null);
			setData(null);
			setSeguimientos([]);
			setLoading(true);
			try {
				const tipo = item.tipo;
				const itemId = item.item_id;
				if ((tipo === 'servicio_ot' || tipo === 'soporte_tecnico') && item.ot_id && itemId) {
					// Fetch trabajo detail (servicio o soporte)
					const endpoint = tipo === 'soporte_tecnico' ? 'soportes-tecnicos' : 'servicios-generales';
					const url = `/api/ordenes-de-trabajo/${item.ot_id}/${endpoint}/${itemId}/`;
					const resp = await ApiService.fetchData({ url, method: 'get' });
					if (!mounted) return;
					setData(resp.data);

					// Fetch usuarios vinculados para soportes
					if (tipo === 'soporte_tecnico') {
						try {
							const usuariosUrl = `/api/ordenes-de-trabajo/${item.ot_id}/soportes-tecnicos/${itemId}/usuarios-asignados/`;
							const usuariosResp = await ApiService.fetchData({ url: usuariosUrl, method: 'get' });
							if (mounted) {
								setVinculados(Array.isArray(usuariosResp.data) ? usuariosResp.data : []);
							}
						} catch (err) {
							console.warn('No se pudieron cargar usuarios vinculados', err);
							if (mounted) setVinculados([]);
						}
					}

					// Fetch seguimientos for servicio/soporte (NOT detalles-trabajo)
					setLoadingSeguimientos(true);
					try {
						const segUrl = `/api/ordenes-de-trabajo/${item.ot_id}/${endpoint}/${itemId}/seguimientos/`;
						const segResp = await ApiService.fetchData({ url: segUrl, method: 'get' });
						if (mounted) {
							// Filtrar seguimientos para excluir los de tipo 'actualizacion' como en ListaServiciosOT
							const seguimientosFiltrados = (Array.isArray(segResp.data) ? segResp.data : []).filter(
								(seg: any) => seg.tipo !== 'actualizacion'
							);
							setSeguimientos(seguimientosFiltrados);
						}
					} catch (segErr) {
						console.warn('No se pudieron cargar seguimientos', segErr);
					} finally {
						if (mounted) setLoadingSeguimientos(false);
					}
				} else if (tipo === 'guia_salida') {
					// Determine guia id: prefer explicit parent_id/guia_id; if missing,
					// try to resolve it by fetching the ItemsGuia record for this item
					let guiaId: number | null = (item as any).parent_id ?? (item as any).guia_id ?? null;

					// If guia id was not provided but we have an item id, try to fetch the items-guia record
					if (!guiaId && itemId) {
						try {
							const itemResp: any = await ApiService.fetchData({ url: `/api/items-guia/${itemId}/`, method: 'get' });
							if (!mounted) return;
							guiaId = itemResp.data?.guia?.id ?? null;
							// If items-guia returned, keep it as part of itemsGuia (single entry) to help rendering
							if (itemResp.data) {
								setItemsGuia([itemResp.data]);
							}
						} catch (err) {
							// Couldn't resolve via items-guia; leave guiaId null and let the later logic handle it
							console.warn('No se pudo resolver guia via items-guia:', err);
						}
					}

					if (!guiaId) {
						// No guia found for this item
						if (!mounted) return;
						setError('No se encontró la Guía asociada a este ítem');
						setData(null);
					} else {
						try {
							const resp: any = await ApiService.fetchData({ url: `/api/guia-salida/${guiaId}/`, method: 'get' });
							if (!mounted) return;
							console.log('🔍 Guía response completa:', resp.data);
							setData(resp.data);
							// Extraer items de la respuesta si existen
							if (resp.data?.items && Array.isArray(resp.data.items)) {
								setItemsGuia(resp.data.items);
							}
						} catch (err: any) {
							console.error('Error fetching guia by id', err);
							if (!mounted) return;
							setError(err?.response?.data?.detail || 'No se pudo cargar la Guía');
						}
					}
				} else if ((tipo === 'rendicion_gasto' || tipo === 'compra_material') && (item.rendicion_id || itemId)) {
					const rendId = item.rendicion_id ?? itemId;
					const resp = await ApiService.fetchData({ url: `/api/rendiciones/${rendId}/`, method: 'get' });
					if (!mounted) return;
					setData(resp.data);
			} else if (tipo === 'compra') {
				const compraId =
					item.compra_id ??
					item.parent_id ??
					item.item_id ??
					item.id;

				if (!compraId) {
					setError('No se pudo determinar la compra asociada');
					return;
				}

				// Fetch compra detail using compra_id/parent_id fallback
				try {
					const compraResp = await ApiService.fetchData({ 
						url: `/api/compras/${compraId}/`, 
						method: 'get' 
					});
					if (!mounted) return;
					setData(compraResp.data);
				} catch (err) {
					console.error('Error fetching compra', err);
					setError('No se pudo cargar el detalle de la compra');
				}
			} else if (tipo === 'gasto_operativo' && itemId) {
				// Fetch gasto operativo detail
				// Sin content_type en el JSON, intentamos ambos endpoints
				try {
					let gastoResp;
					let url = '';
					
					try {
						// Intentar primero: GastoOperativoEnOt from ordentrabajov2 app (más común en OTs)
						const otId = (item as any).ot_id;
						url = `/api/ordenes-de-trabajo/${otId}/gastos-operativos/${itemId}/`;
						gastoResp = await ApiService.fetchData({ 
							url: url, 
							method: 'get' 
						});
					} catch (err1) {
						// Si falla, intentar: DetalleGastoRendicion from rendiciones app
						try {
							url = `/api/detalles-gasto/${itemId}/`;
							gastoResp = await ApiService.fetchData({ 
								url: url, 
								method: 'get' 
							});
						} catch (err2) {
							console.error('Error en ambos endpoints:', { err1, err2 });
							throw new Error('No se encontró el gasto operativo en ningún endpoint');
						}
					}
					
					if (!mounted) return;
					setData(gastoResp.data);
				} catch (err) {
					console.error('Error fetching gasto operativo', err);
					setError('No se pudo cargar el detalle del gasto operativo');
				}
			} else {
				setData(null);
			}
			} catch (err: any) {
				console.error('Error fetching item detail', err);
				if (!mounted) return;
				setError(err?.response?.data?.detail || err?.message || 'Error al obtener detalle');
			} finally {
				if (mounted) setLoading(false);
			}
		};

		if (open && item) fetchDetail();
		return () => {
			mounted = false;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open, item?.item_id, item?.id, item?.tipo, item?.ot_id]); // Usar propiedades primitivas, no el objeto completo

	// Sección "Datos de Prefactura" eliminada - la información ya está visible en la tabla principal

	const renderTrabajoDetail = () => {
		if (!data) return null;
		const tipo = item?.tipo;
		if (tipo !== 'servicio_ot' && tipo !== 'soporte_tecnico') return null;

		const estadoBadgeColor = (estado: string) => {
			switch (estado) {
				case 'completado':
				case 'completada':
					return 'emerald';
				case 'en_proceso':
				case 'asignado':
					return 'blue';
				case 'pendiente':
					return 'amber';
				default:
					return 'gray';
			}
		};

			const tipoLabel = tipo === 'soporte_tecnico' ? 'Soporte Técnico' : 'Servicio General';

			return (
				<div className='space-y-4'>
					{/* Header del trabajo */}
					<div className='rounded-lg border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-4 shadow-sm'>
						<div className='mb-3 border-b border-blue-200 pb-2'>
						<span className='text-sm font-semibold uppercase tracking-wide text-blue-700'>
							{tipoLabel}
						</span>
					</div>
					<div className='grid grid-cols-2 gap-4'>
						<div>
							<Badge className='mb-1'>Solicitud</Badge>
							<div className='ml-4 text-base font-medium text-gray-900'>
								{data.nombre || 'Sin nombre'}
							</div>
						</div>
						<div>
							<Badge className='mb-1'>Estado</Badge>
							<div className='ml-4 mt-1'>
								<Badge
									variant='solid'
									color={estadoBadgeColor(data.estado || data.estado_label)}
									className='text-sm'>
									{data.estado_label || data.estado || 'Sin estado'}
								</Badge>
							</div>
						</div>
						<div>
							<Badge className='mb-1'>Técnico Asignado</Badge>
							<div className='ml-4 text-sm text-gray-700'>
								{data.nombre_tecnico || data.tecnico_asignado ? (
									<span className='font-medium'>{data.nombre_tecnico || 'Asignado'}</span>
								) : (
									<span className='italic text-gray-400'>Sin Técnico</span>
								)}
							</div>
						</div>
						<div>
							<Badge className='mb-1'>Fecha trabajo</Badge>
							<div className='ml-4 text-sm text-gray-700'>
								{data.fecha_servicio || data.fecha_trabajo ? (
									<span className='font-medium'>
										{dayjs(data.fecha_servicio || data.fecha_trabajo)
											.locale('es')
											.format('DD/MM/YYYY')}
									</span>
								) : (
									<span className='italic text-gray-400'>Sin fecha</span>
								)}
							</div>
						</div>
					</div>
					{/* Descripción si existe */}
					{(data.descripcion || data.descripcion_corta) && (
						<div className='mt-3 rounded bg-white p-3 shadow-sm'>
							<div className='mb-1 text-xs font-medium text-gray-600'>📝 Descripción</div>
							<div className='text-sm text-gray-700'>
								{data.descripcion || data.descripcion_corta}
							</div>
						</div>
					)}
				</div>

				{/* Seguimientos */}
				<div className='rounded-lg border border-gray-200 bg-white p-4 shadow-sm'>
					<div className='mb-4 flex items-center gap-2 border-b border-gray-200 pb-2'>
						<span className='text-sm font-semibold uppercase tracking-wide text-gray-700'>
							Seguimientos del Trabajo
						</span>
						<Badge color='gray' variant='outline' className='ml-auto'>
							{seguimientos.length}
						</Badge>
					</div>
					<div className='max-h-72 overflow-auto space-y-3'>
						{loadingSeguimientos ? (
							<div className='flex items-center justify-center py-8'>
								<div className='text-sm text-gray-500'>Cargando seguimientos...</div>
							</div>
						) : seguimientos.length > 0 ? (
							seguimientos.map((seg, idx) => {
								const tipoConfig: Record<
									string,
									{
										color: 'red' | 'blue' | 'violet' | 'zinc';
										bgColor: string;
										borderColor: string;
										icon: string;
									}
								> = {
									incidencia: {
										color: 'red',
										bgColor: 'bg-red-50',
										borderColor: 'border-l-red-500',
										icon: '⚠️',
									},
									comentario_tecnico: {
										color: 'blue',
										bgColor: 'bg-blue-50',
										borderColor: 'border-l-blue-500',
										icon: '�',
									},
									comunicacion_usuario: {
										color: 'violet',
										bgColor: 'bg-violet-50',
										borderColor: 'border-l-violet-500',
										icon: '📢',
									},
									default: {
										color: 'zinc',
										bgColor: 'bg-gray-50',
										borderColor: 'border-l-gray-500',
										icon: '📝',
									},
								};
								const config =
									tipoConfig[seg.tipo as keyof typeof tipoConfig] ||
									tipoConfig.default;
								
								const tipoLabelMap: Record<string, string> = {
									comentario_tecnico: 'Comentario Técnico',
									incidencia: 'Incidencia',
									comunicacion_usuario: 'Comunicación al Usuario',
									actualizacion: 'Actualización',
								};
								const tipoLabel = tipoLabelMap[seg.tipo] || seg.tipo;
								
								return (
									<div
										key={seg.id || idx}
										className={`rounded border-l-4 bg-white p-3 shadow-sm transition-all hover:shadow-md ${config.borderColor}`}>
										<div className='mb-2 flex items-center gap-2'>
											<span className='text-base'>{config.icon}</span>
											<Badge
												color={config.color}
												variant='solid'
												className='text-xs font-semibold uppercase'>
												{tipoLabel}
											</Badge>
											{idx === 0 && (
												<span className='ml-auto text-xs font-semibold uppercase tracking-wide text-emerald-600'>
													✓ Más reciente
												</span>
											)}
										</div>
										<div className='text-sm text-gray-700'>{seg.comentario}</div>
										<div className='mt-2 flex items-center justify-between text-xs text-gray-500'>
											{seg.usuario_nombre && <span>👤 {seg.usuario_nombre}</span>}
											<span className='ml-auto'>
												{dayjs(seg.fecha_creacion).locale('es').format('DD/MM/YY HH:mm')}
											</span>
										</div>
									</div>
								);
							})
						) : (
							<div className='py-8 text-center text-sm text-gray-500'>
								Sin seguimientos
							</div>
						)}
					</div>
				</div>
			</div>
		);
	};

	const renderGuiaDetail = () => {
		if (!data) return null;
		const tipo = item?.tipo;
		if (tipo !== 'guia_salida') return null;

		const estadoBadgeColor = (estado: string) => {
			switch (estado) {
				case 'E': // Entregada
				case 'FR': // Firmada
					return 'emerald';
				case 'P': // Pendiente
					return 'amber';
				case 'C': // Cancelada
					return 'red';
				default:
					return 'gray';
			}
		};

		const estadoLabel = (estado: string) => {
			const labels: Record<string, string> = {
				'P': 'Pendiente',
				'E': 'Entregada',
				'FR': 'Firmada',
				'C': 'Cancelada',
			};
			return labels[estado] || estado;
		};

		return (
			<div className='space-y-4'>
				{/* Header de la guía */}
				<div className='rounded-lg border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-4 shadow-sm'>
					<div className='mb-3 border-b border-amber-200 pb-2'>
						<span className='text-sm font-semibold uppercase tracking-wide text-amber-700'>
							GUÍA DE SALIDA
						</span>
					</div>
					<div className='grid grid-cols-2 gap-4'>
						<div>
							<Badge className='mb-1'>Estado</Badge>
							<div className='ml-4 mt-1'>
								<Badge
									variant='solid'
									color={estadoBadgeColor(data.estado)}
									className='text-sm'>
									{data.estado_label || estadoLabel(data.estado)}
								</Badge>
							</div>
						</div>
						{data.nombre_creado_por && (
							<div>
								<Badge className='mb-1'>Creado Por</Badge>
								<div className='ml-4 text-sm text-gray-700'>
									{data.nombre_creado_por}
								</div>
							</div>
						)}
						{data.nombre_recibido_por && (
							<div>
								<Badge className='mb-1'>Recibido Por</Badge>
								<div className='ml-4 text-sm text-gray-700'>
									{data.nombre_recibido_por}
								</div>
							</div>
						)}
						{data.cliente_nombre && (
							<div>
								<Badge className='mb-1'>Cliente</Badge>
								<div className='ml-4 text-sm text-gray-700'>
									{data.cliente_nombre}
								</div>
							</div>
						)}
						{data.motivo && (
							<div className='col-span-2'>
								<Badge className='mb-1'>Motivo</Badge>
								<div className='ml-4 text-sm text-gray-700'>
									{data.motivo || 'Sin motivo'}
								</div>
							</div>
						)}
					</div>
				</div>

				{/* Items en la guía (renombrado a Item de la guía) */}
				<div className='rounded-lg border border-gray-200 bg-white p-4 shadow-sm'>
					<div className='mb-3 border-b border-gray-200 pb-2'>
						<span className='text-sm font-semibold uppercase tracking-wide text-gray-600'>
							ITEM DE LA GUÍA
						</span>
					</div>
					{itemsGuia.length === 0 ? (
						<div className='py-8 text-center text-sm text-gray-500'>
							Sin items en esta guía
						</div>
					) : (
						<div className='overflow-x-auto'>
							<table className='min-w-full divide-y divide-gray-200'>
								<thead className='bg-gray-50'>
									<tr>
										<th className='px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>
											Item
										</th>
										<th className='px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>
											Cantidad Original
										</th>
										<th className='px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>
											Cantidad Rebajada
										</th>
										<th className='px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>
											Cantidad Devuelta
										</th>
										<th className='px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>
											Serializado
										</th>
									</tr>
								</thead>
								<tbody className='divide-y divide-gray-200 bg-white'>
									{itemsGuia.map((itemGuia: any, idx: number) => (
										<tr key={itemGuia.id || idx} className='hover:bg-gray-50'>
											<td className='whitespace-nowrap px-3 py-2 text-sm text-gray-900'>
												{itemGuia.datos_stock?.datos_item?.nombre || `Item ${itemGuia.id}`}
											</td>
											<td className='whitespace-nowrap px-3 py-2 text-sm text-gray-700'>
												{itemGuia.cantidad_original ?? '—'}
											</td>
											<td className='whitespace-nowrap px-3 py-2 text-sm text-gray-700'>
												{itemGuia.cantidad_rebajada ?? '—'}
											</td>
											<td className='whitespace-nowrap px-3 py-2 text-sm text-gray-700'>
												{itemGuia.cantidad_devuelta ?? 0}
											</td>
											<td className='whitespace-nowrap px-3 py-2 text-sm'>
												{(() => {
													const isSerializado = !!itemGuia.individualizado ||
														(Boolean(itemGuia.numero_serie) && Object.keys(itemGuia.numero_serie || {}).length > 0) ||
														(Boolean(itemGuia.datos_stock?.numeros_series) && itemGuia.datos_stock.numeros_series.length > 0);
													return (
														<span className={isSerializado ? 'text-sm font-medium text-gray-900' : 'text-sm text-gray-500'}>
															{isSerializado ? 'Sí' : 'No'}
														</span>
													);
												})()}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</div>
			</div>
		);
	};

	const renderVinculados = () => {
		if (!data) return null;
		const tipo = item?.tipo;
		const vinculados = data.vinculados;

		// Solo para soportes técnicos que tengan usuarios vinculados
		if (tipo !== 'soporte_tecnico' || !vinculados || vinculados.length === 0) return null;

		return (
			<div className='rounded-lg border border-gray-200 bg-white p-4 shadow-sm'>
				<div className='flex items-center justify-between border-b border-gray-200 pb-2 mb-3'>
					<span className='text-sm font-semibold uppercase tracking-wide text-gray-700'>
						Usuarios Vinculados
					</span>
					<button
						onClick={() => setExpandVinculados(!expandVinculados)}
						className='flex items-center gap-1 text-violet-600 hover:text-violet-700 transition-colors'>
						<span className='text-lg'>👁️</span>
						<Badge color='violet' variant='outline' className='text-xs'>
							{vinculados.length}
						</Badge>
					</button>
				</div>

				{expandVinculados && (
					<div className='space-y-2'>
						{vinculados.map((usuario: any, idx: number) => (
							<div
								key={usuario.id || idx}
								className='rounded border border-gray-200 bg-gray-50 p-3 hover:bg-gray-100 transition-colors'>
								<div className='flex items-start justify-between gap-3'>
									<div className='flex-1'>
										<div className='font-medium text-gray-900'>{usuario.nombre_usuario || usuario.nombre || '—'}</div>
										{usuario.numero_serie_equipo && (
											<div className='text-xs text-gray-500 mt-1'>
												📱 {usuario.numero_serie_equipo}
											</div>
										)}
										{usuario.tipo_equipo && (
											<div className='text-xs text-gray-500'>
												{usuario.tipo_equipo}
											</div>
										)}
									</div>
									<div className='text-right'>
										{usuario.resuelto !== undefined && (
											<Badge
												color={usuario.resuelto ? 'emerald' : 'amber'}
												variant='solid'
												className='text-xs'>
												{usuario.resuelto ? '✓ Resuelto' : 'Pendiente'}
											</Badge>
										)}
									</div>
								</div>
								{usuario.trabajo_realizado && (
									<div className='mt-2 text-xs text-gray-600 italic'>
										"{usuario.trabajo_realizado}"
									</div>
								)}
							</div>
						))}
					</div>
				)}
			</div>
		);
	};

	const renderCompraDetail = () => {
		if (!data) return null;
		const tipo = item?.tipo;
		if (tipo !== 'compra') return null;

		const itemsCompra = data.itemencompra_set || [];

		const estadoBadgeColor = (estado: string) => {
			switch (estado) {
				case '1': // Completada
				case 'C':
					return 'emerald';
				case '-': // Pendiente
				case 'P':
					return 'amber';
				case '0': // Cancelada
				case 'X':
					return 'red';
				default:
					return 'gray';
			}
		};

		const estadoLabel = (estado: string) => {
			const labels: Record<string, string> = {
				'-': 'Pendiente',
				'0': 'Cancelada',
				'1': 'Completada',
				'P': 'Pendiente',
				'C': 'Completada',
				'X': 'Cancelada',
			};
			return labels[estado] || data.estado_label || estado;
		};

		return (
			<div className='space-y-4'>
				{/* Header de la compra */}
				<div className='rounded-lg border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-4 shadow-sm'>
					<div className='mb-3 border-b border-violet-200 pb-2'>
						<span className='text-sm font-semibold uppercase tracking-wide text-violet-700'>
							DETALLE COMPRA
						</span>
					</div>

					{/* Primera fila: Código, Fecha, Comprador */}
					<div className='grid grid-cols-2 gap-4 mb-4'>
						<div>
							<Badge className='mb-1'>Código</Badge>
							<div className='ml-4 text-sm font-medium text-gray-900'>
								{data.codigo || '—'}
							</div>
						</div>
						<div>
							<Badge className='mb-1'>Estado</Badge>
							<div className='ml-4 mt-1'>
								<Badge
									variant='solid'
									color={estadoBadgeColor(data.estado)}
									className='text-sm'>
									{estadoLabel(data.estado)}
								</Badge>
							</div>
						</div>
						<div>
							<Badge className='mb-1'>Fecha Compra</Badge>
							<div className='ml-4 text-sm text-gray-700'>
								{data.fecha_compra ? new Date(data.fecha_compra).toLocaleDateString('es-CL') : '—'}
							</div>
						</div>
						<div>
							<Badge className='mb-1'>Total</Badge>
							<div className='ml-4 text-sm font-semibold text-violet-700'>
								${data.total_compra?.toLocaleString('es-CL') || '0'}
							</div>
						</div>
					</div>

					{/* Segunda fila: Comprador */}
					{data.nombre_creado_por && (
						<div>
							<Badge className='mb-1'>Comprador</Badge>
							<div className='ml-4 text-sm text-gray-700'>
								{data.nombre_creado_por}
							</div>
						</div>
					)}

					{/* Tercera fila: Descripción/Observaciones */}
					{data.observaciones && (
						<div className='mt-3 pt-3 border-t border-violet-100'>
							<Badge className='mb-1'>Descripción</Badge>
							<div className='ml-4 text-sm text-gray-700'>
								{data.observaciones}
							</div>
						</div>
					)}
				</div>

				{/* Items en la compra */}
				<div className='rounded-lg border border-gray-200 bg-white p-4 shadow-sm'>
					<div className='mb-3 border-b border-gray-200 pb-2'>
						<span className='text-sm font-semibold uppercase tracking-wide text-gray-600'>
							ITEM DE LA COMPRA
						</span>
					</div>
					{itemsCompra.length === 0 ? (
						<div className='py-8 text-center text-sm text-gray-500'>
							Sin items en esta compra
						</div>
					) : (
						<div className='overflow-x-auto'>
							<table className='min-w-full divide-y divide-gray-200'>
								<thead className='bg-gray-50'>
									<tr>
										<th className='px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>
											Nombre
										</th>
										<th className='px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>
											Cantidad
										</th>
										<th className='px-3 py-2 text-right text-xs font-medium uppercase tracking-wider text-gray-500'>
											Precio Unitario
										</th>
										<th className='px-3 py-2 text-right text-xs font-medium uppercase tracking-wider text-gray-500'>
											Subtotal
										</th>
									</tr>
								</thead>
								<tbody className='divide-y divide-gray-200 bg-white'>
									{itemsCompra.map((itemCompra: any, idx: number) => {
										const subtotal = (itemCompra.cantidad || 0) * (itemCompra.precio || 0);
										return (
											<tr key={itemCompra.id || idx} className='hover:bg-gray-50'>
												<td className='whitespace-nowrap px-3 py-2 text-sm text-gray-900'>
													{itemCompra.nombre_item || `Item ${itemCompra.id}`}
												</td>
												<td className='whitespace-nowrap px-3 py-2 text-sm text-gray-700'>
													{itemCompra.cantidad ?? '—'}
												</td>
												<td className='whitespace-nowrap px-3 py-2 text-sm text-gray-700 text-right'>
													${(itemCompra.precio ?? 0).toLocaleString('es-CL')}
												</td>
												<td className='whitespace-nowrap px-3 py-2 text-sm font-medium text-gray-900 text-right'>
													${subtotal.toLocaleString('es-CL')}
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					)}
				</div>
			</div>
		);
	};

	const renderGastoDetail = () => {
		if (!data) return null;
		const tipo = item?.tipo;
		if (tipo !== 'gasto_operativo') return null;

		return (
			<div className='space-y-4'>
				{/* Header del gasto operativo */}
				<div className='rounded-lg border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-4 shadow-sm'>
					<div className='mb-3 border-b border-amber-200 pb-2'>
						<span className='text-sm font-semibold uppercase tracking-wide text-amber-700'>
							DETALLE GASTO OPERATIVO
						</span>
					</div>

					<div className='grid grid-cols-2 gap-4'>
						<div>
							<Badge className='mb-1'>Categoría</Badge>
							<div className='ml-4 text-sm font-medium text-gray-900'>
								{data.nombre_categoria || data.categoria?.nombre || '—'}
							</div>
						</div>
						<div>
							<Badge className='mb-1'>Fecha Gasto</Badge>
							<div className='ml-4 text-sm text-gray-700'>
								{data.fecha_gasto || data.fecha_compra 
									? new Date(data.fecha_gasto || data.fecha_compra).toLocaleDateString('es-CL') 
									: '—'}
							</div>
						</div>
						<div>
							<Badge className='mb-1'>Cantidad</Badge>
							<div className='ml-4 text-sm text-gray-700'>
								{data.cantidad || 1}
							</div>
						</div>
						<div>
							<Badge className='mb-1'>Monto Unitario</Badge>
							<div className='ml-4 text-sm text-gray-700'>
								${data.monto_unitario?.toLocaleString('es-CL') || '0'}
							</div>
						</div>
						<div className='col-span-2'>
							<Badge className='mb-1'>Monto Total</Badge>
							<div className='ml-4 text-sm font-semibold text-amber-700'>
								${data.monto_total?.toLocaleString('es-CL') || '0'}
							</div>
						</div>
					</div>

					{/* Detalle/Descripción */}
					{data.detalle && (
						<div className='mt-3 pt-3 border-t border-amber-100'>
							<Badge className='mb-1'>Detalle</Badge>
							<div className='ml-4 text-sm text-gray-700'>
								{data.detalle}
							</div>
						</div>
					)}

					{/* Usuario Comprador */}
					{(data.usuario_comprador || data.nombre_creado_por) && (
						<div className='mt-2'>
							<Badge className='mb-1'>Comprador</Badge>
							<div className='ml-4 text-sm text-gray-700'>
								{typeof data.usuario_comprador === 'object' 
									? data.usuario_comprador?.nombre || data.usuario_comprador?.usuario?.nombre
									: data.nombre_creado_por || '—'}
							</div>
						</div>
					)}
				</div>
			</div>
		);
	};

	const renderEnriched = () => {
		if (!data) return null;
		const tipo = item?.tipo;
		if (tipo === 'servicio_ot' || tipo === 'soporte_tecnico' || tipo === 'guia_salida') {
			// Already rendered above in renderTrabajoDetail or renderGuiaDetail
			return null;
		}

		if (tipo === 'rendicion_gasto' || tipo === 'compra_material') {
			const estadoLabel = data.estado_label || data.estado || '—';
			const totalReembolso = data.total_reembolso_tecnico ?? data.total_reembolso ?? 0;
			const totalFacturable =
				data.total_facturable_cliente ?? data.total_facturable ?? data.total ?? data.monto_total ?? 0;
			const totalNoFacturable = data.total_no_facturable ?? 0;
			const itemsRend = Array.isArray(data.items)
				? data.items
				: Array.isArray(data.detalles)
					? data.detalles
					: [];

			return (
				<div className='space-y-4'>
					<div className='rounded-lg border border-blue-200 bg-blue-50 p-4'>
						<div className='mb-2 flex items-center gap-2 border-b border-blue-200 pb-2'>
							<span className='text-sm font-semibold uppercase tracking-wide text-blue-700'>
								Gastos Operativos
							</span>
							<Badge variant='solid' color='blue' className='text-xs'>
								{estadoLabel}
							</Badge>
						</div>
						<div className='grid grid-cols-3 gap-4'>
							<div>
								<Badge className='mb-1'>Total Reembolso Técnico</Badge>
								<div className='text-lg font-semibold text-gray-900'>
									${totalReembolso.toLocaleString('es-CL')}
								</div>
								<p className='text-xs text-gray-500'>Lo que paga la empresa al técnico</p>
							</div>
							<div>
								<Badge className='mb-1'>Total Facturable Cliente</Badge>
								<div className='text-lg font-semibold text-green-700'>
									${totalFacturable.toLocaleString('es-CL')}
								</div>
								<p className='text-xs text-gray-500'>Se cobrará en la factura</p>
							</div>
							<div>
								<Badge className='mb-1'>Total No Facturable</Badge>
								<div className='text-lg font-semibold text-amber-700'>
									${totalNoFacturable.toLocaleString('es-CL')}
								</div>
								<p className='text-xs text-gray-500'>Asumido por la empresa</p>
							</div>
						</div>
					</div>

					<div className='rounded-lg border border-gray-200 bg-white p-4 shadow-sm'>
						<div className='mb-3 border-b border-gray-200 pb-2'>
							<span className='text-sm font-semibold uppercase tracking-wide text-gray-600'>
								Items de la Rendición ({itemsRend.length})
							</span>
						</div>
						{itemsRend.length === 0 ? (
							<div className='py-6 text-center text-sm text-gray-500'>Sin gastos registrados</div>
						) : (
							<div className='overflow-x-auto'>
								<table className='min-w-full divide-y divide-gray-200'>
									<thead className='bg-gray-50'>
										<tr>
											<th className='px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>Detalle</th>
											<th className='px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>Categoría</th>
											<th className='px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>Cantidad</th>
											<th className='px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>Monto Total</th>
											<th className='px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>Fecha</th>
										</tr>
									</thead>
									<tbody className='divide-y divide-gray-200 bg-white'>
										{itemsRend.map((r: any, idx: number) => {
											const fecha = r.fecha_gasto || r.fecha_compra || r.fecha || '';
											return (
												<tr key={r.id || idx} className='hover:bg-gray-50'>
													<td className='whitespace-nowrap px-3 py-2 text-sm text-gray-900'>
														{r.detalle || r.descripcion || '—'}
													</td>
													<td className='whitespace-nowrap px-3 py-2 text-sm text-gray-700'>
														{r.categoria_nombre || r.nombre_categoria || r.descripcion_categoria || '—'}
													</td>
													<td className='whitespace-nowrap px-3 py-2 text-sm text-gray-700'>
														{r.cantidad ?? 1}
													</td>
													<td className='whitespace-nowrap px-3 py-2 text-sm text-gray-700'>
														${(r.monto_total ?? r.monto ?? r.monto_unitario ?? 0).toLocaleString('es-CL')}
													</td>
													<td className='whitespace-nowrap px-3 py-2 text-sm text-gray-700'>
														{fecha ? new Date(fecha).toLocaleDateString('es-CL') : '—'}
													</td>
												</tr>
											);
										})}
									</tbody>
								</table>
							</div>
						)}
					</div>
				</div>
			);
		}
		return null;
	};

	const getOriginUrl = (): string | null => {
		if (!item) return null;
		switch (item.tipo) {
			case 'servicio_ot':
			case 'soporte_tecnico':
				return `/orden-trabajo/detalle-orden-trabajo/${item.ot_id}`;
			case 'guia_salida':
				return item.guia_id ? `/bodega/detalle-guia-salida-bodega/${item.guia_id}` : null;
			case 'rendicion_gasto':
			case 'compra_material':
				return item.rendicion_id ? `/rendicion/detalle-rendicion/${item.rendicion_id}` : null;
			default:
				return null;
		}
	};

	return (
		<Modal isOpen={open} setIsOpen={onClose} isCentered={false} size='lg'>
			<ModalHeader>
				<Badge className='text-xl'>Detalle del Item</Badge>
			</ModalHeader>
			<ModalBody isScrollable>
				<div className='space-y-4'>
					{loading ? (
						<div className='py-8 text-center text-sm text-gray-500'>Cargando detalles...</div>
					) : error ? (
						<div className='rounded bg-red-50 p-3 text-sm text-red-600'>
							<strong>Error:</strong> {error}
						</div>
					) : (
						<>
							{renderTrabajoDetail()}
							{renderGuiaDetail()}
							{renderCompraDetail()}
							{renderGastoDetail()}
							{renderVinculados()}
							{renderEnriched()}
						</>
					)}
				</div>
			</ModalBody>
			<ModalFooter>
				<div className='flex w-full items-center justify-end gap-3'>
					{getOriginUrl() && (
						<Button
							variant='solid'
							color='violet'
							icon='HeroArrowTopRightOnSquare'
							onClick={() => window.open(getOriginUrl()!, '_blank')}>
							Ver origen completo
						</Button>
					)}
					<Button variant='solid' color='red' onClick={onClose}>
						Cerrar
					</Button>
				</div>
			</ModalFooter>
		</Modal>
	);
};

export default ItemDetailModal;
