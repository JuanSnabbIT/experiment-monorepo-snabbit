import Icon from '@/components/icon/Icon';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import Tooltip from '@/components/ui/Tooltip';
import AnimacionDeInputModoMovil from '@/components/utils/AnimacionDeIntputModoMovil';
import { ICompra } from '@/interface/bodega.interface';
import { listaComprasEnOTThunk, useAppDispatch, useAppSelector } from '@/store';
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

	const columns = [
		columnHelper.accessor('codigo', {
			cell: (info) => info.getValue(),
			header: 'CИdigo',
		}),
		columnHelper.accessor('observaciones', {
			cell: (info) => info.getValue() || '-',
			header: 'DescripciИn',
		}),
		columnHelper.accessor('fecha_compra', {
			cell: (info) => {
				const fecha = info.getValue();
				if (!fecha) return '-';
				return new Date(fecha).toLocaleDateString('es-CL');
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
							onClick={() => {
								navigate(`/compras/detalle-compra/${info.row.original.id}`);
							}}></Button>
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
								<CrearCompraRapidaEnOT />
								<VincularCompraEnOT />
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
						<div className='overflow-auto'>
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
										Usa el botИn de arriba para vincular una compra existente
									</p>
								</div>
							)}
						</div>
					)}
				</CardBody>
			</Card>
		</>
	);
}

export default ComprasEnOT;
