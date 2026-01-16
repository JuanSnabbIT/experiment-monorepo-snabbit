import Icon from '@/components/icon/Icon';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import Modal, {
	ModalBody,
	ModalFooter,
	ModalFooterChild,
	ModalHeader,
} from '@/components/ui/Modal';
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import Tooltip from '@/components/ui/Tooltip';
import AnimacionDeInputModoMovil from '@/components/utils/AnimacionDeIntputModoMovil';
import { ICompra, IItemEnCompra } from '@/interface/bodega.interface';
import { listaComprasEnOTThunk, useAppDispatch, useAppSelector } from '@/store';
import ApiService from '@/services/ApiService';
import { toast } from 'react-toastify';
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
import 'dayjs/locale/es';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CrearCompraRapidaEnOT from '../modals/CrearCompraRapidaEnOT';
import VincularCompraEnOT from '../modals/VincularCompraEnOT';

const columnHelper = createColumnHelper<ICompra>();

function ComprasEnOT() {
	const dispatch = useAppDispatch();
	const navigate = useNavigate();
	const { detalleOrdenTrabajo, listaComprasEnOT } = useAppSelector((state) => state.ordenTrabajo);
	const { listaVouchers = [] } = useAppSelector((state) => state.bodega ?? { listaVouchers: [] });
	const [sorting, setSorting] = useState<SortingState>([]);
	const [globalFilter, setGlobalFilter] = useState<string>('');
	const [isOpenDetail, setIsOpenDetail] = useState(false);
	const [selectedCompra, setSelectedCompra] = useState<ICompra | null>(null);
	const [itemsCompra, setItemsCompra] = useState<IItemEnCompra[]>([]);
	const [cargandoItems, setCargandoItems] = useState(false);

	useEffect(() => {
		if (detalleOrdenTrabajo) {
			dispatch(listaComprasEnOTThunk({ id_orden: detalleOrdenTrabajo.id }));
		}
	}, [detalleOrdenTrabajo, dispatch]);

	const hayDevolucionesDesdeCompras = useMemo(() => {
		if (!detalleOrdenTrabajo) return false;
		return listaVouchers
			.filter((voucher) => voucher.orden_trabajo === detalleOrdenTrabajo.id)
			.some((voucher) =>
				(Array.isArray(voucher.movimientos_agrupados) ? voucher.movimientos_agrupados : [])
					.some((grupo) => grupo.origen_tipo === 'Compra'),
			);
	}, [detalleOrdenTrabajo, listaVouchers]);

	const fetchItemsCompra = async (compraId: number) => {
		setCargandoItems(true);
		try {
			const resp = await ApiService.fetchData<IItemEnCompra[]>({
				url: `/api/compras/${compraId}/items/`,
				method: 'get',
			});
			setItemsCompra(resp.data || []);
		} catch (e) {
			toast.error('No se pudieron cargar los items de la compra');
		} finally {
			setCargandoItems(false);
		}
	};

	const openDetail = (compra: ICompra) => {
		setSelectedCompra(compra);
		setIsOpenDetail(true);
	};

	useEffect(() => {
		if (isOpenDetail && selectedCompra?.id) {
			fetchItemsCompra(selectedCompra.id);
		}
		if (!isOpenDetail) {
			setItemsCompra([]);
		}
	}, [isOpenDetail, selectedCompra]);

	const columns = [
		columnHelper.accessor('codigo', {
			cell: (info) => info.getValue(),
			header: 'Código',
		}),
		columnHelper.accessor('observaciones', {
			cell: (info) => info.getValue() || '-',
			header: 'Descripción',
		}),
		columnHelper.accessor('fecha_compra', {
			cell: (info) => {
				const fecha = info.getValue();
				if (!fecha) return '-';
				return dayjs(fecha).locale('es').format('DD/MM/YYYY');
			},
			header: 'Fecha Compra',
		}),
		columnHelper.accessor('total_compra', {
			cell: (info) => {
				const total = info.getValue();
				return total ? `$${total.toLocaleString('es-CL')}` : '$0';
			},
			header: 'Total',
		}),
		columnHelper.accessor('estado_label', {
			cell: (info) => info.getValue(),
			header: 'Estado',
		}),
		columnHelper.accessor('nombre_creado_por', {
			cell: (info) => info.getValue() || '-',
			header: 'Comprador',
		}),
		columnHelper.display({
			id: 'acciones',
			cell: (info) => (
				<div className='flex flex-wrap gap-2'>
					<Tooltip text='Ver detalles de la compra'>
						<Button
							variant='solid'
							size='sm'
							color='violet'
							icon='HeroEye'
							onClick={() => openDetail(info.row.original)}
						/>
					</Tooltip>
				</div>
			),
			header: '',
		}),
	];

	const table = useReactTable({
		data: listaComprasEnOT || [],
		columns: columns,
		state: {
			sorting: sorting,
			globalFilter: globalFilter,
		},
		onSortingChange: setSorting,
		enableGlobalFilter: true,
		onGlobalFilterChange: setGlobalFilter,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
	});

	return (
		<>
			<Card>
				<CardHeader>
					<CardHeaderChild>
						<Badge className='text-xl'>Compras en OT ({listaComprasEnOT.length})</Badge>
					</CardHeaderChild>
					<CardHeaderChild className='flex gap-2'>
						<AnimacionDeInputModoMovil
							globalFilter={globalFilter}
							setGlobalFilter={setGlobalFilter}
							anchoInput={200}
						/>
						{detalleOrdenTrabajo && (
							<>
								{detalleOrdenTrabajo.estado === 'en_proceso' && (
									<>
										<CrearCompraRapidaEnOT />
										<VincularCompraEnOT />
									</>
								)}
								{hayDevolucionesDesdeCompras && (
									<Tooltip text='Ver devoluciones de compras'>
										<Button
											variant='outline'
											size='sm'
											color='blue'
											icon='HeroDocumentDuplicate'
											onClick={() =>
												navigate(`/bodega/devoluciones?orden_trabajo=${detalleOrdenTrabajo.id}`)
											}
										/>
									</Tooltip>
								)}
							</>
						)}
					</CardHeaderChild>
				</CardHeader>
				<CardBody className='z-0'>
					{listaComprasEnOT.length > 0 ? (
						<div className='overflow-y-scroll'>
							<Table className='min-w-full'>
								<THead>
									{table.getHeaderGroups().map((headerGroup) => (
										<Tr key={headerGroup.id}>
											{headerGroup.headers.map((header) => (
												<Th
													key={header.id}
													isColumnBorder={false}
													className='text-left'>
													{header.isPlaceholder ? null : (
														<div
															key={header.id}
															aria-hidden='true'
															{...{
																className:
																	header.column.getCanSort()
																		? 'cursor-pointer select-none flex items-center'
																		: '',
																onClick:
																	header.column.getToggleSortingHandler(),
															}}>
															{flexRender(
																header.column.columnDef.header,
																header.getContext(),
															)}
															{{
																asc: (
																	<Icon
																		icon='HeroChevronUp'
																		className='ltr:ml-1.5 rtl:mr-1.5'
																	/>
																),
																desc: (
																	<Icon
																		icon='HeroChevronDown'
																		className='ltr:ml-1.5 rtl:mr-1.5'
																	/>
																),
															}[header.column.getIsSorted() as string] ?? null}
														</div>
													)}
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
							<div className='mt-2'>
								<TableCardFooterTemplateV2 table={table} />
							</div>
						</div>
					) : (
						<div className='py-6 text-center text-gray-500'>
							<p>No hay compras vinculadas a esta Orden de Trabajo</p>
							{detalleOrdenTrabajo && (
								<div className='mt-2'>
									<p className='text-sm'>
										Usa el botón de arriba para vincular una compra existente
									</p>
								</div>
							)}
						</div>
					)}
				</CardBody>
			</Card>

			{/* Modal de Detalle de Compra */}
			<Modal isOpen={isOpenDetail} setIsOpen={setIsOpenDetail}>
				<ModalHeader className='flex justify-between items-center'>
					<Badge>Detalle Compra</Badge>
					{selectedCompra && (
						<Tooltip text='Ver detalle completo de la compra'>
							<Button
								color='blue'
								variant='solid'
								size='sm'
								icon='HeroArrowTopRightOnSquare'
								onClick={() => {
									navigate(`/compras/detalle-compra/${selectedCompra.id}`);
									setIsOpenDetail(false);
								}}
							>
								Ir a
							</Button>
						</Tooltip>
					)}
				</ModalHeader>
				<ModalBody>
					{selectedCompra ? (
						<>
							<div className='grid grid-cols-2 gap-4'>
								<div>
									<Badge>Código</Badge>
									<div className='ml-4'>{selectedCompra.codigo}</div>
								</div>
								<div>
									<Badge>Estado</Badge>
									<div className='ml-4'>
										<Button
											size='sm'
											variant='solid'
											color='blue'
											isDisable={true}>
											{selectedCompra.estado_label || selectedCompra.estado}
										</Button>
									</div>
								</div>
								<div>
									<Badge>Fecha Compra</Badge>
									<div className='ml-4'>
										{selectedCompra.fecha_compra ? (
											dayjs(selectedCompra.fecha_compra)
												.locale('es')
												.format('DD/MM/YYYY')
										) : (
											<span className='italic text-gray-400'>Sin fecha</span>
										)}
									</div>
								</div>
								<div>
									<Badge>Total</Badge>
									<div className='ml-4'>
										{selectedCompra.total_compra ? (
											`$${selectedCompra.total_compra.toLocaleString('es-CL')}`
										) : (
											'$0'
										)}
									</div>
								</div>
								<div>
									<Badge>Comprador</Badge>
									<div className='ml-4'>
										{selectedCompra.nombre_creado_por || '-'}
									</div>
								</div>
								<div>
									<Badge>Descripción</Badge>
									<div className='ml-4'>
										{selectedCompra.observaciones || '-'}
									</div>
								</div>
							</div>
							<div className='col-span-2 mt-4'>
								<div className='mb-3 flex items-center justify-between'>
									<Badge className='text-base'>Items de la Compra</Badge>
									<span className='text-xs text-gray-500'>
										{itemsCompra.length} item{itemsCompra.length !== 1 ? 's' : ''}
									</span>
								</div>
								<div className='mt-2 max-h-64 overflow-auto rounded-lg border border-gray-200 bg-gray-50'>
									{cargandoItems ? (
										<div className='flex items-center justify-center py-8'>
											<div className='text-sm text-gray-500'>Cargando items...</div>
										</div>
									) : itemsCompra.length > 0 ? (
										<div className='overflow-x-auto'>
											<table className='min-w-full divide-y divide-gray-200'>
												<thead className='bg-gray-100'>
													<tr>
														<th className='px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider'>
															Nombre
														</th>
														<th className='px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider'>
															Cantidad
														</th>
														<th className='px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider'>
															Precio Unitario
														</th>
														<th className='px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider'>
															Subtotal
														</th>
													</tr>
												</thead>
												<tbody className='bg-white divide-y divide-gray-200'>
													{itemsCompra.map((item, idx) => (
														<tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
															<td className='px-4 py-3 text-sm text-gray-900'>
																{item.nombre_item}
															</td>
															<td className='px-4 py-3 text-sm text-gray-900'>
																{item.cantidad}
															</td>
															<td className='px-4 py-3 text-sm text-gray-900'>
																${item.precio.toLocaleString('es-CL')}
															</td>
															<td className='px-4 py-3 text-sm font-semibold text-gray-900'>
																${(item.cantidad * item.precio).toLocaleString('es-CL')}
															</td>
														</tr>
													))}
												</tbody>
											</table>
										</div>
									) : (
										<div className='flex flex-col items-center justify-center py-8'>
											<span className='mb-2 text-4xl'>📦</span>
											<p className='text-sm font-medium text-gray-600'>No hay items registrados</p>
											<p className='text-xs text-gray-500'>Esta compra no tiene items asociados</p>
										</div>
									)}
								</div>
							</div>
						</>
					) : (
						<div>No hay detalle seleccionado.</div>
					)}
				</ModalBody>
				<ModalFooter>
					<ModalFooterChild />
					<ModalFooterChild>
						<Button color='red' onClick={() => setIsOpenDetail(false)}>
							Cerrar
						</Button>
					</ModalFooterChild>
				</ModalFooter>
			</Modal>
		</>
	);
}

export default ComprasEnOT;
