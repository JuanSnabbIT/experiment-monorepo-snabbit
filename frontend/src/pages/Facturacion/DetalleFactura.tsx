import Icon from '@/components/icon/Icon';
import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, { SubheaderLeft, SubheaderRight } from '@/components/layouts/Subheader/Subheader';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader, CardHeaderChild, CardTitle } from '@/components/ui/Card';
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import Tooltip from '@/components/ui/Tooltip';
import ItemDetailModal from '@/pages/Facturacion/ItemDetailModal';
import ApiService from '@/services/ApiService';
import TableCardFooterTemplateV2 from '@/templates/Table/TableFooterTemplateV2';
import {
	createColumnHelper,
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	SortingState,
	useReactTable,
} from '@tanstack/react-table';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { confirmAlert } from '@/utils/sweetAlert';

interface PrefacturaResumen {
	total_items?: number;
	total_facturar?: number;
	total_excluidos?: number;
	[key: string]: unknown;
}

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
	parent_id?: number;
	guia_id?: number;
	rendicion_id?: number;
	stock_item_id?: number | null;
	[key: string]: unknown;
}

interface PrefacturaItemsPayload {
	cliente_id?: number | null;
	ots_incluidas?: number[];
	items?: PrefacturaItem[];
	resumen?: PrefacturaResumen;
	[key: string]: unknown;
}

interface PrefacturaDetalle {
	id: number;
	cliente: number | null;
	cliente_nombre?: string | null;
	estado_cierre: string;
	comentario?: string | null;
	resultado?: PrefacturaItemsPayload;
	fecha_creacion?: string;
	fecha_modificacion?: string;
	creado_por?: number | null;
	actualizado_por?: number | null;
}

const columnHelper = createColumnHelper<PrefacturaItem>();

const getItemDetailUrl = (item: PrefacturaItem): string | null => {
	const { tipo, id, ot_id } = item;

	switch (tipo) {
		case 'servicio_ot':
		case 'soporte_tecnico':
			// Navegar al detalle de la Orden de Trabajo
			return `/orden-trabajo/detalle-orden-trabajo/${ot_id}`;
		case 'guia_salida': {
			// Navegar al detalle de la Guía de Salida usando parent_id (puede venir como guia_id antiguo)
			const parentId = (item as any).parent_id ?? (item as any).guia_id;
			return parentId ? `/bodega/detalle-guia-salida-bodega/${parentId}` : null;
		}
		case 'rendicion_gasto':
		case 'compra_material': {
			// Navegar al detalle de la Rendición
			const parentId = (item as any).parent_id ?? (item as any).rendicion_id;
			return parentId ? `/rendicion/detalle-rendicion/${parentId}` : null;
		}
		default:
			return null;
	}
};

const DetalleFactura = () => {
	const navigate = useNavigate();
	const { id } = useParams<{ id: string }>();
	const [factura, setFactura] = useState<PrefacturaDetalle | null>(null);
	const [loading, setLoading] = useState<boolean>(false);
	const [sorting, setSorting] = useState<SortingState>([]);
	const [globalFilter, setGlobalFilter] = useState<string>('');
	const [selectedItem, setSelectedItem] = useState<PrefacturaItem | null>(null);
	const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
	const [detalleSeleccionado, setDetalleSeleccionado] = useState<number | null>(null);
	const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
	const [enrichedItems, setEnrichedItems] = useState<PrefacturaItem[]>([]);
	const [enriching, setEnriching] = useState<boolean>(false);

	useEffect(() => {
		if (!id) return;
		fetchFactura();
	}, [id]);

	const fetchFactura = () => {
		if (!id) return;
		setLoading(true);
		ApiService.fetchData<PrefacturaDetalle>({
			url: `/api/cierres-administrativos/${id}/`,
			method: 'get',
		})
			.then((response) => {
				setFactura(response.data);
				// Enriquecer items con datos adicionales que no vienen en JSON
				enrichItemsData(response.data.resultado?.items || []);
			})
			.catch((error) => {
				const message =
					error?.response?.data?.detail || error?.message || 'Error al cargar la factura';
				toast.error(message);
			})
			.finally(() => setLoading(false));
	};

	const handleEliminarPrefactura = async () => {
		if (!factura || factura.estado_cierre !== 'anulado') return;

		const ok = await confirmAlert({
			title: 'Eliminar prefactura',
			text: `¿Confirmas eliminar la prefactura #${factura.id}? Se podrá volver a crear una nueva.`,
			confirmText: 'Eliminar',
			cancelText: 'Cancelar',
			icon: 'warning',
			confirmColor: '#dc2626',
		});
		if (!ok) return;

		try {
			await ApiService.fetchData({
				url: `/api/cierres-administrativos/${factura.id}/`,
				method: 'delete',
			});
			toast.success(`Prefactura #${factura.id} eliminada`);
			navigate('/facturacion/facturas');
		} catch (error: any) {
			const message =
				error?.response?.data?.detail || error?.message || 'Error al eliminar prefactura';
			toast.error(message);
		}
	};

	// Enriquecer items: fetch SOLO los datos que faltan (nombre del item, etc)
	const enrichItemsData = async (items: PrefacturaItem[]) => {
		setEnriching(true);

		const enrichedPromises = items.map(async (item) => {
			try {
				// Copiar item base (ya tiene cantidad, precio_total, etc)
				const enriched = { ...item };

				// Fetch según tipo - SOLO para obtener nombre del item
				if (item.tipo === 'guia_salida') {
					// Fetch ItemsGuiaSalida usando item.id para obtener nombre
					const response = await ApiService.fetchData({
						url: `/api/items-guia/${item.id}/`,
						method: 'get',
					});
					const itemGuia = response.data as any;
					enriched.nombre = itemGuia.stock_item?.item?.nombre || `Item #${item.id}`;
					// store parent_id for generic parent reference (guia or compra)
					enriched.parent_id = itemGuia.guia?.id ?? (item as any).parent_id ?? null;
					enriched.guia_id = itemGuia.guia?.id;
					enriched.stock_item_id = itemGuia.stock_item?.id;
				}
				// TODO: servicio_ot y soporte_tecnico - fetch nombre desde OT
				// TODO: compra - fetch ItemEnCompra para nombre
				// TODO: gasto_operativo - fetch para nombre

				return enriched;
			} catch (error) {
				console.error(`Error enriqueciendo item ${item.tipo} #${item.id}:`, error);
				return { ...item, nombre: `${item.tipo} #${item.id}` };
			}
		});

		const results = await Promise.all(enrichedPromises);
		setEnrichedItems(results);
		setEnriching(false);
	};

	const items = enrichedItems;
	const resumen = factura?.resultado?.resumen;

	const columns = [
		columnHelper.accessor('ot_id', {
			cell: (info) => (
				<div className='font-semibold text-blue-600 dark:text-blue-400'>
					{info.getValue() || '—'}
				</div>
			),
			header: 'N° OT',
		}),
		columnHelper.accessor('tipo', {
			cell: (info) => {
				const tipo = info.getValue();
				let label = tipo || 'desconocido';
				let color: 'blue' | 'emerald' | 'amber' | 'gray' = 'gray';

				switch (tipo) {
					case 'servicio_ot':
						label = 'Servicio';
						color = 'blue';
						break;
					case 'soporte_tecnico':
						label = 'Soporte';
						color = 'emerald';
						break;
					case 'guia_salida':
						label = 'Guía';
						color = 'amber';
						break;
					case 'compra':
						label = 'Compra';
						color = 'violet';
						break;
					case 'rendicion_gasto':
						label = 'Gasto Operativo';
						color = 'blue';
						break;
					case 'gasto_operativo':
						label = 'Gasto Operativo';
						color = 'amber';
						break;
					case 'compra_material':
						label = 'Compra';
						color = 'blue';
						break;
				}

				return (
					<Badge variant='outline' color={color} className='capitalize'>
						{label}
					</Badge>
				);
			},
			header: 'Tipo Item',
		}),
		columnHelper.display({
			id: 'descripcion',
			size: 520,
			minSize: 420,
			maxSize: 720,
			cell: (info) => {
				const item = info.row.original;
				const rowKey = `${item.tipo}-${item.id}`;
				const isExpanded = expandedRows.has(rowKey);

				// Descripción principal: preferir campo 'descripcion' si existe, sino 'nombre'
				const descripcion = (item as any).descripcion || item.nombre || 'Sin descripción';

				// Generar subtítulo/información extra según tipo (se mostrará en el área expandible)
				let detalles = '';
				switch (item.tipo) {
					case 'servicio_ot':
						detalles = `Trabajo #${item.id} de la OT #${item.ot_id}`;
						break;
					case 'soporte_tecnico':
						detalles = `Soporte #${item.id} de la OT #${item.ot_id}`;
						break;
					case 'guia_salida':
						{
							const cantidadGuia = item.cantidad || 0;
							const guiaId = (item as any).parent_id ?? (item as any).guia_id ?? '?';
							detalles = `Item #${item.id} de la Guía #${guiaId} - Cantidad: ${cantidadGuia}`;
						}
						break;
					case 'compra':
						{
							const compraId =
								(item as any).parent_id ?? (item as any).compra_id ?? '?';
							detalles = `Item #${item.id} de la Compra #${compraId}`;
						}
						break;
					case 'gasto_operativo':
						detalles = `Gasto #${item.id} de la OT #${item.ot_id}`;
						break;
					default:
						detalles = `${item.tipo} #${item.id}`;
				}

				return (
					<div className='w-full space-y-1'>
						<div className='flex items-start gap-2'>
							<div className='flex-1 overflow-hidden'>
								<div className='truncate text-sm font-medium text-gray-900 dark:text-gray-100'>
									{descripcion}
								</div>
							</div>
							<Tooltip text='Ver detalles'>
								<Button
									variant='solid'
									color='sky'
									icon='HeroEye'
									size='sm'
									onClick={(e) => {
										e.stopPropagation();
										const newExpanded = new Set(expandedRows);
										if (newExpanded.has(rowKey)) {
											newExpanded.delete(rowKey);
										} else {
											newExpanded.add(rowKey);
										}
										setExpandedRows(newExpanded);
									}}
								/>
							</Tooltip>
						</div>

						{/* Contenido expandible con la info adicional (usando campos del JSON) */}
						{isExpanded && (
							<div className='space-y-2 border-t border-gray-300 pt-2 text-xs text-gray-600 dark:border-gray-600'>
								<div className='font-semibold text-gray-700 dark:text-gray-200'>
									{detalles}
								</div>
								{/* Comentario mostrado en la tabla; no repetir en el área expandida */}
							</div>
						)}
					</div>
				);
			},
			header: 'Descripción',
		}),
		columnHelper.accessor('precio_total', {
			cell: (info) => {
				const val = Number(info.getValue() ?? 0);
				const formatted = `$${Math.ceil(val).toLocaleString('es-CL')}`;
				return <div className='font-mono text-sm'>{formatted}</div>;
			},
			header: 'Precio Total',
		}),
		columnHelper.accessor('precio_ajustado', {
			cell: (info) => {
				const val = Number(info.getValue() ?? 0);
				if (val === 0) return <div className='text-center text-gray-400'>—</div>;
				const formatted = `$${Math.ceil(val).toLocaleString('es-CL')}`;
				return (
					<div className='font-mono text-sm font-semibold text-green-600'>
						{formatted}
					</div>
				);
			},
			header: 'Precio Ajustado',
		}),
		columnHelper.accessor('facturar', {
			cell: (info) => {
				const facturar = info.getValue();
				return facturar ? (
					<Badge variant='solid' color='emerald'>
						Sí
					</Badge>
				) : (
					<Badge variant='outline' color='gray'>
						No
					</Badge>
				);
			},
			header: 'Facturar',
		}),
		columnHelper.accessor('comentario', {
			cell: (info) => (
				<div className='max-w-xs truncate text-sm text-gray-600 dark:text-gray-400'>
					{info.getValue() || '—'}
				</div>
			),
			header: 'Comentario',
		}),
		columnHelper.display({
			id: 'acciones',
			cell: (info) => {
				const item = info.row.original;
				return (
					<div className='flex gap-2'>
						<Tooltip text={`Ver ${item.tipo?.replace(/_/g, ' ')}`}>
							<Button
								variant='solid'
								color='violet'
								icon='HeroEye'
								onClick={(e) => {
									e.stopPropagation();
									setSelectedItem(item);
									setIsModalOpen(true);
								}}
							/>
						</Tooltip>
					</div>
				);
			},
			header: 'Acciones',
		}),
	];

	const table = useReactTable({
		data: items,
		columns,
		state: {
			sorting,
			globalFilter,
		},
		onSortingChange: setSorting,
		onGlobalFilterChange: setGlobalFilter,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		initialState: {
			pagination: {
				pageSize: 10,
			},
		},
	});

	const renderEstado = (estado: string) => {
		let color: 'emerald' | 'red' | 'amber' | 'blue' | 'gray' = 'gray';
		let label = estado;

		switch (estado) {
			case 'borrador':
				color = 'gray';
				label = 'Borrador';
				break;
			case 'en_revision':
				color = 'amber';
				label = 'En revisión';
				break;
			case 'aprobado':
				color = 'emerald';
				label = 'Aprobado';
				break;
			case 'facturado':
				color = 'blue';
				label = 'Facturado';
				break;
			case 'pagado':
				color = 'blue';
				label = 'Pagado';
				break;
		}

		return (
			<Badge variant='solid' color={color} className='capitalize'>
				{label}
			</Badge>
		);
	};

	const renderVinculadosDetail = (item: PrefacturaItem) => {
		if (item.tipo === 'soporte_tecnico') {
			const usuarios = (item as any).usuarios_asignados || [];
			return (
				<div className='space-y-1 text-sm'>
					<div className='font-semibold text-gray-800 dark:text-gray-200'>
						Usuarios Asignados ({usuarios.length})
					</div>
					{usuarios.length === 0 ? (
						<div className='text-xs text-gray-500'>Sin usuarios asignados</div>
					) : (
						<div className='space-y-1'>
							{usuarios.map((usuario: any, idx: number) => (
								<div
									key={usuario.id || idx}
									className='flex items-center justify-between gap-1 rounded border border-gray-200 bg-white p-1 text-xs dark:border-gray-700 dark:bg-gray-800'>
									<div>
										<div className='font-medium text-gray-700 dark:text-gray-300'>
											{usuario.nombre_usuario}
										</div>
										{usuario.numero_serie_equipo && (
											<div className='text-gray-500 dark:text-gray-400'>
												📱 {usuario.numero_serie_equipo}
											</div>
										)}
									</div>
									<Badge
										color={usuario.resuelto ? 'emerald' : 'amber'}
										variant='solid'
										className='text-xs'>
										{usuario.resuelto ? '✓' : '○'}
									</Badge>
								</div>
							))}
						</div>
					)}
				</div>
			);
		} else if (item.tipo === 'guia_salida') {
			const cantItems = (item as any).cantidad_items || (item as any).cantidad || 0;
			const guiaId = (item as any).parent_id ?? (item as any).guia_id ?? '?';
			return (
				<div className='space-y-1 text-sm'>
					<div className='font-semibold text-gray-800 dark:text-gray-200'>
						Items en Guía ({cantItems})
					</div>
					<div className='text-xs text-gray-600 dark:text-gray-400'>
						Guía de Salida #{guiaId} con {cantItems} items
					</div>
				</div>
			);
		} else if (item.tipo === 'rendicion_gasto' || item.tipo === 'compra_material') {
			const cantDetalles = (item as any).cantidad_detalles || 0;
			return (
				<div className='space-y-1 text-sm'>
					<div className='font-semibold text-gray-800 dark:text-gray-200'>
						Detalles de Rendición ({cantDetalles})
					</div>
					<div className='text-xs text-gray-600 dark:text-gray-400'>
						Rendición #{(item as any).parent_id ?? (item as any).rendicion_id} con{' '}
						{cantDetalles} líneas
					</div>
				</div>
			);
		}
		return null;
	};

	return (
		<PageWrapper>
			<Subheader>
				<SubheaderLeft>
					<Button
						variant='outline'
						icon='HeroArrowLeft'
						onClick={() => navigate('/facturacion/facturas')}>
						Volver
					</Button>
				</SubheaderLeft>
				<SubheaderRight>
					{factura?.estado_cierre === 'anulado' && (
						<Tooltip text='Eliminar prefactura anulada'>
							<Button
								variant='outline'
								color='red'
								icon='HeroTrash'
								onClick={handleEliminarPrefactura}
							>
								Eliminar
							</Button>
						</Tooltip>
					)}

					{factura && factura.estado_cierre !== 'anulado' && (
						<Button
							variant='solid'
							color='amber'
							onClick={async () => {
								if (!factura) return;
								const ok = await confirmAlert({
									title: 'Anular prefactura',
									text: `¿Confirmas dejar en estado anulada la prefactura #${factura.id}? Las OTs podrán volver a seleccionarse.`,
									confirmText: 'Anular',
									cancelText: 'Cancelar',
									icon: 'warning',
									confirmColor: '#dc2626',
								});
								if (!ok) return;
								try {
									await ApiService.fetchData({ url: `/api/cierres-administrativos/${factura.id}/anular/`, method: 'post' });
									toast.success(`Prefactura #${factura.id} anulada`);
									navigate('/facturacion/facturas');
								} catch (error: any) {
									console.error('Error anulando prefactura:', error);
									toast.error(error?.response?.data?.detail || 'Ocurrió un error al anular');
								}
							}}
						>
							Anular
						</Button>
					)}
				</SubheaderRight>
			</Subheader>

			<Container>
				{loading ? (
					<Card>
						<CardBody>
							<div className='py-12 text-center text-sm text-gray-600'>
								Cargando factura...
							</div>
						</CardBody>
					</Card>
				) : !factura ? (
					<Card>
						<CardBody>
							<div className='py-12 text-center text-sm text-gray-600'>
								Factura no encontrada.
							</div>
						</CardBody>
					</Card>
				) : (
					<>
						<Card className='mb-4'>
							<CardHeader>
								<CardHeaderChild>
									<CardTitle className='text-2xl'>
										Prefactura #{factura.id}
									</CardTitle>
								</CardHeaderChild>
							</CardHeader>
							<CardBody>
								<div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
									<div>
										<div className='text-sm font-semibold uppercase text-gray-500'>
											Cliente
										</div>
										<div className='text-lg font-bold text-gray-900 dark:text-gray-100'>
											{factura.cliente_nombre || 'Sin nombre'}
										</div>
									</div>
									<div>
										<div className='text-sm font-semibold uppercase text-gray-500'>
											Estado
										</div>
										<div className='mt-1'>
											{renderEstado(factura.estado_cierre)}
										</div>
									</div>
									<div>
										<div className='text-sm font-semibold uppercase text-gray-500'>
											Fecha creación
										</div>
										<div className='text-lg text-gray-700 dark:text-gray-300'>
											{factura.fecha_creacion
												? dayjs(factura.fecha_creacion).format(
														'DD/MM/YYYY HH:mm',
													)
												: '—'}
										</div>
									</div>
								</div>
							</CardBody>
						</Card>

						<Card className='mb-4'>
							<CardHeader>
								<CardHeaderChild>
									<CardTitle>Resumen</CardTitle>
								</CardHeaderChild>
							</CardHeader>
							<CardBody>
								<div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
									<div className='rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20'>
										<div className='text-sm font-semibold uppercase text-blue-600 dark:text-blue-400'>
											Total facturar
										</div>
										<div className='mt-1 text-2xl font-bold text-blue-900 dark:text-blue-100'>
											$
											{(resumen?.total_facturar ?? 0).toLocaleString('es-CL')}
										</div>
									</div>
									<div className='rounded-lg bg-emerald-50 p-4 dark:bg-emerald-900/20'>
										<div className='text-sm font-semibold uppercase text-emerald-600 dark:text-emerald-400'>
											Total items
										</div>
										<div className='mt-1 text-2xl font-bold text-emerald-900 dark:text-emerald-100'>
											{resumen?.total_items ?? items.length}
										</div>
									</div>
									<div className='rounded-lg bg-purple-50 p-4 dark:bg-purple-900/20'>
										<div className='text-sm font-semibold uppercase text-purple-600 dark:text-purple-400'>
											OTs incluidas
										</div>
										<div className='mt-1 text-2xl font-bold text-purple-900 dark:text-purple-100'>
											{factura.resultado?.ots_incluidas?.length ?? 0}
										</div>
									</div>
								</div>
							</CardBody>
						</Card>

						<Card>
							<CardHeader>
								<CardHeaderChild>
									<CardTitle>Items</CardTitle>
								</CardHeaderChild>
							</CardHeader>
							<CardBody>
								{items.length === 0 ? (
									<div className='py-8 text-center text-sm text-gray-600'>
										No hay items en esta prefactura.
									</div>
								) : (
									<>
										<Table>
											<THead>
												{table.getHeaderGroups().map((headerGroup) => (
													<Tr key={headerGroup.id}>
														{headerGroup.headers.map((header) => (
															<Th
																key={header.id}
																isColumnBorder={false}
																className='cursor-pointer select-none'
																onClick={header.column.getToggleSortingHandler()}>
																<div className='flex items-center gap-2'>
																	{flexRender(
																		header.column.columnDef
																			.header,
																		header.getContext(),
																	)}
																	{{
																		asc: (
																			<Icon
																				icon='HeroChevronUp'
																				className='size-4'
																			/>
																		),
																		desc: (
																			<Icon
																				icon='HeroChevronDown'
																				className='size-4'
																			/>
																		),
																	}[
																		header.column.getIsSorted() as string
																	] ?? null}
																</div>
															</Th>
														))}
													</Tr>
												))}
											</THead>
											<TBody>
												{table.getRowModel().rows.map((row) => (
													<Tr key={row.id}>
														{row.getVisibleCells().map((cell) => (
															<Td key={cell.id}>
																{flexRender(
																	cell.column.columnDef.cell,
																	cell.getContext(),
																)}
															</Td>
														))}
													</Tr>
												))}
											</TBody>
										</Table>
										<TableCardFooterTemplateV2 table={table} />
									</>
								)}
							</CardBody>
						</Card>
					</>
				)}
			</Container>
			<ItemDetailModal
				open={isModalOpen}
				onClose={() => setIsModalOpen(false)}
				item={selectedItem}
			/>
		</PageWrapper>
	);
};

export default DetalleFactura;
