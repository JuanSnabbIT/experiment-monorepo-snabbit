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
import { IInsumo } from '@/interface/ordenTrabajo.interface';
import { IGuiaSalida, IItemGuiaSalida } from '@/interface/bodega.interface';
import { listaInsumosThunk, useAppDispatch, useAppSelector } from '@/store';
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
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const columnHelper = createColumnHelper<IInsumo>();

function Insumos() {
	const dispatch = useAppDispatch();
	const navigate = useNavigate();
	const { detalleOrdenTrabajo, listaInsumos = [] } = useAppSelector(
		(state) => state.ordenTrabajo ?? { listaInsumos: [] }
	);
	const { listaVouchers = [] } = useAppSelector(
		(state) => state.bodega ?? { listaVouchers: [] }
	);

	const [sorting, setSorting] = useState<SortingState>([]);
	const [globalFilter, setGlobalFilter] = useState<string>('');
	const [isOpenDetail, setIsOpenDetail] = useState(false);
	const [selectedGuia, setSelectedGuia] = useState<IGuiaSalida | null>(null);
	const [itemsGuia, setItemsGuia] = useState<IItemGuiaSalida[]>([]);
	const [cargandoItems, setCargandoItems] = useState(false);

	useEffect(() => {
		if (detalleOrdenTrabajo) {
			dispatch(
				listaInsumosThunk({
					id_orden_trabajo: detalleOrdenTrabajo.id,
				})
			);
		}
	}, [detalleOrdenTrabajo, dispatch]);

	const hayDevolucionesDesdeGuias = useMemo(() => {
		if (!detalleOrdenTrabajo) return false;
		return listaVouchers
			.filter((voucher) => voucher.orden_trabajo === detalleOrdenTrabajo.id)
			.some((voucher) =>
				(Array.isArray(voucher.movimientos_agrupados)
					? voucher.movimientos_agrupados
					: []
				).some((grupo) => grupo.origen_tipo === 'GuíaSalida')
			);
	}, [detalleOrdenTrabajo, listaVouchers]);

	const fetchItemsGuia = async (guiaId: number) => {
		setCargandoItems(true);
		try {
			const resp = await ApiService.fetchData<IItemGuiaSalida[]>({
				url: `/api/guia-salida/${guiaId}/items/`,
				method: 'get',
			});
			setItemsGuia(resp.data || []);
		} catch (e) {
			console.error('Error al cargar items:', e);
			toast.error('No se pudieron cargar los items de la guía');
		} finally {
			setCargandoItems(false);
		}
	};

	const openDetail = useCallback(async (insumo: IInsumo) => {
		if (!insumo.guia?.id) {
			toast.error('No se pudo abrir el detalle: guía sin identificador');
			return;
		}
		try {
			const resp = await ApiService.fetchData<IGuiaSalida>({
				url: `/api/guia-salida/${insumo.guia.id}/`,
				method: 'get',
			});
			setSelectedGuia(resp.data);
			setIsOpenDetail(true);
		} catch (e) {
			console.error('Error obteniendo guía:', e);
			toast.error('No se pudo obtener el detalle de la guía');
		}
	}, []);

	useEffect(() => {
		if (isOpenDetail && selectedGuia?.id) {
			fetchItemsGuia(selectedGuia.id);
		}
		if (!isOpenDetail) {
			setItemsGuia([]);
		}
	}, [isOpenDetail, selectedGuia]);

	const columns = useMemo(() => [
		columnHelper.accessor('id', {
			cell: (info) => info.getValue(),
			header: 'N° de Trabajo',
			size: 80,
		}),
		columnHelper.accessor('nombre', {
			cell: (info) => info.getValue(),
			header: 'Nombre de Trabajo',
		}),
		columnHelper.accessor('estado_label', {
			cell: (info) => info.getValue(),
			header: 'Estado de Trabajo',
		}),
		columnHelper.accessor('tipo', {
			cell: (info) =>
				info.getValue() === 'servicio' ? 'Servicio' : 'Soporte',
			header: 'Tipo',
			size: 80,
		}),
		columnHelper.accessor((row) => row.guia?.id ?? null, {
			id: 'guia_id',
			cell: (info) => info.getValue() ?? '-',
			header: 'N° de Guia',
			size: 80,
		}),
		columnHelper.accessor((row) => row.guia?.estado_label ?? null, {
			id: 'guia_estado_label',
			cell: (info) => info.getValue() ?? '-',
			header: 'Estado de Guia',
		}),
		columnHelper.accessor((row) => row.guia?.cantidad_items ?? null, {
			id: 'guia_cantidad_items',
			cell: (info) => info.getValue() ?? 0,
			header: 'Cantidad de Items',
		}),
		columnHelper.display({
			id: 'acciones',
			cell: (info) => {
				return (
					<div className="flex flex-wrap gap-2">
						{info.row.original.guia && (
							<Tooltip text="Ver detalle de guía de salida">
								<Button
									variant="solid"
									size="sm"
									color="violet"
									icon="HeroEye"
									onClick={(event) => {
										event.stopPropagation();
										openDetail(info.row.original);
									}}
								/>
							</Tooltip>
						)}
					</div>
				);
			},
			header: '',
		}),
	], [openDetail]);

	const dataFiltrada = useMemo(() => (listaInsumos || []).filter(
		(insumo) => !!insumo.guia
	), [listaInsumos]);

	const table = useReactTable({
		data: dataFiltrada,
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
						<Badge className="text-xl">
							Insumos ({dataFiltrada.length})
						</Badge>
					</CardHeaderChild>
					<CardHeaderChild className="flex gap-2">
						<AnimacionDeInputModoMovil
							globalFilter={globalFilter}
							setGlobalFilter={setGlobalFilter}
							anchoInput={200}
						/>
						{detalleOrdenTrabajo && hayDevolucionesDesdeGuias && (
							<Tooltip text="Ver devoluciones de guías">
								<Button
									variant="outline"
									size="sm"
									color="blue"
									icon="HeroDocumentDuplicate"
									onClick={() =>
										navigate(
											`/bodega/devoluciones?orden_trabajo=${detalleOrdenTrabajo.id}`
										)
									}
								/>
							</Tooltip>
						)}
					</CardHeaderChild>
				</CardHeader>
				<CardBody className="z-0">
					{dataFiltrada.length > 0 ? (
						<div className="overflow-y-scroll">
							<Table className="min-w-full">
								<THead>
									{table.getHeaderGroups().map((headerGroup) => (
										<Tr key={headerGroup.id}>
											{headerGroup.headers.map((header) => (
												<Th
													key={header.id}
													isColumnBorder={false}
													className="text-left"
												>
													{header.isPlaceholder ? null : (
														<div
															key={header.id}
															aria-hidden="true"
															{...{
																className:
																	header.column.getCanSort()
																		? 'cursor-pointer select-none flex items-center'
																		: '',
																onClick:
																	header.column.getToggleSortingHandler(),
															}}
														>
															{flexRender(
																header.column.columnDef
																	.header,
																header.getContext()
															)}
															{{
																asc: (
																	<Icon
																		icon="HeroChevronUp"
																		className="ltr:ml-1.5 rtl:mr-1.5"
																	/>
																),
																desc: (
																	<Icon
																		icon="HeroChevronDown"
																		className="ltr:ml-1.5 rtl:mr-1.5"
																	/>
																),
															}[
																header.column.getIsSorted() as string
															] ?? null}
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
														cell.getContext()
													)}
												</Td>
											))}
										</Tr>
									))}
								</TBody>
							</Table>
							<div className="mt-2">
								<TableCardFooterTemplateV2 table={table} />
							</div>
						</div>
					) : (
						<div className="py-6 text-center text-gray-500">
							<p>
								No hay guías de salida vinculadas a esta Orden de
								Trabajo
							</p>
						</div>
					)}
				</CardBody>
			</Card>

			<Modal isOpen={isOpenDetail} setIsOpen={setIsOpenDetail}>
				<ModalHeader className="flex justify-between items-center">
					<Badge>Detalle Guía de Salida</Badge>
					{selectedGuia && (
						<Tooltip text="Ver detalle completo de la guía">
							<Button
								color="blue"
								variant="solid"
								size="sm"
								icon="HeroArrowTopRightOnSquare"
								onClick={() => {
									navigate(
										`/bodega/detalle-guia-salida-bodega/${selectedGuia.id}`
									);
									setIsOpenDetail(false);
								}}
							>
								Ir a
							</Button>
						</Tooltip>
					)}
				</ModalHeader>
				<ModalBody>
					{selectedGuia ? (
						<>
							<div className="grid grid-cols-2 gap-4">
								<div>
									<Badge>Estado</Badge>
									<div className="ml-4">
										<Button
											size="sm"
											variant="solid"
											color="blue"
											isDisable={true}
										>
											{selectedGuia.estado_label}
										</Button>
									</div>
								</div>
								<div>
									<Badge>Creado Por</Badge>
									<div className="ml-4">
										{selectedGuia.nombre_creado_por || '-'}
									</div>
								</div>
								<div>
									<Badge>Recibido Por</Badge>
									<div className="ml-4">
										{selectedGuia.nombre_recibido_por || '-'}
									</div>
								</div>
								<div>
									<Badge>Cliente</Badge>
									<div className="ml-4">
										{selectedGuia.cliente_nombre || '-'}
									</div>
								</div>
								<div>
									<Badge>Motivo</Badge>
									<div className="ml-4">
										{selectedGuia.motivo ||
											'Sin Motivo'}
									</div>
								</div>
								<div>
									<Badge>Fecha Creación</Badge>
									<div className="ml-4">
										{dayjs(selectedGuia.fecha_creacion)
											.locale('es')
											.format('DD/MM/YYYY')}
									</div>
								</div>
							</div>
							<div className="mt-4">
								<div className="mb-3 flex items-center justify-between">
									<Badge className="text-base">
										Items en la Guía
									</Badge>
									<span className="text-xs text-gray-500">
										{itemsGuia.length} item
										{itemsGuia.length !== 1
											? 's'
											: ''}
									</span>
								</div>
								<div className="mt-2 max-h-64 overflow-auto rounded-lg border border-gray-200 bg-gray-50">
									{cargandoItems ? (
										<div className="flex items-center justify-center py-8">
											<div className="text-sm text-gray-500">
												Cargando items...
											</div>
										</div>
									) : itemsGuia.length > 0 ? (
										<div className="overflow-x-auto">
											<table className="min-w-full divide-y divide-gray-200">
												<thead className="bg-gray-100">
													<tr>
														<th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
															Item
														</th>
														<th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
															Cantidad
															Original
														</th>
														<th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
															Cantidad
															Rebajada
														</th>
														<th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
															Cantidad
															Devuelta
														</th>
													</tr>
												</thead>
												<tbody className="bg-white divide-y divide-gray-200">
													{itemsGuia.map(
														(item, idx) => (
															<tr
																key={
																	item.id
																}
																className={
																	idx %
																		2 ===
																	0
																		? 'bg-white'
																		: 'bg-gray-50'
																}
															>
																<td className="px-4 py-3 text-sm text-gray-900">
																	{item
																		.datos_stock
																		?.datos_item
																		?.nombre ||
																		'Sin nombre'}
																</td>
																<td className="px-4 py-3 text-sm text-gray-900">
																	{
																		item.cantidad_original
																	}
																</td>
																<td className="px-4 py-3 text-sm text-gray-900">
																	{
																		item.cantidad_rebajada
																	}
																</td>
																<td className="px-4 py-3 text-sm text-gray-900">
																	{
																		item.cantidad_devuelta
																	}
																</td>
															</tr>
														)
													)}
												</tbody>
											</table>
										</div>
									) : (
										<div className="flex flex-col items-center justify-center py-8">
											<span className="mb-2 text-4xl">
												📦
											</span>
											<p className="text-sm font-medium text-gray-600">
												No hay items registrados
											</p>
											<p className="text-xs text-gray-500">
												Esta guía no tiene items
												asociados
											</p>
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
						<Button
							color="red"
							onClick={() => setIsOpenDetail(false)}
						>
							Cerrar
						</Button>
					</ModalFooterChild>
				</ModalFooter>
			</Modal>
		</>
	);
}

export default Insumos;
