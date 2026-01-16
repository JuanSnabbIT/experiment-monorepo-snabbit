import Icon from '@/components/icon/Icon';
import Badge from '@/components/ui/Badge';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import { IDetalleGastoRendicionOT } from '@/interface/ordenTrabajo.interface';
import ModalEliminar from '@/pages/Items/Proveedor/modals/ModalEliminar';
import { listaDetalleGastoRendicionOTThunk, useAppDispatch, useAppSelector } from '@/store';
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
import { useEffect, useState } from 'react';
import CrearRendicionesOT from '../modals/CrearRendicionesOT';

const columnHelper = createColumnHelper<IDetalleGastoRendicionOT>();

function RendicionesOT() {
	const dispatch = useAppDispatch();
	const { detalleOrdenTrabajo, listaDetalleGastoRendicionOT } = useAppSelector(
		(state) => state.ordenTrabajo,
	);
	const [sorting, setSorting] = useState<SortingState>([]);
	const [globalFilter, setGlobalFilter] = useState<string>('');

	useEffect(() => {
		if (detalleOrdenTrabajo) {
			dispatch(listaDetalleGastoRendicionOTThunk({ id_orden: detalleOrdenTrabajo.id }));
		}
	}, [detalleOrdenTrabajo]);

	const columns = [
		columnHelper.accessor('detalle', {
			cell: (info) => info.getValue() || 'Sin detalle',
			header: 'Detalle',
		}),
		columnHelper.accessor('descripcion_categoria', {
			cell: (info) => <div>{info.getValue() ? info.getValue() : 'Sin Categoria'}</div>,
			header: 'Categoria',
		}),
		columnHelper.accessor('cantidad', {
			cell: (info) => info.getValue(),
			header: 'Cantidad',
		}),
		columnHelper.accessor('monto_unitario', {
			cell: (info) => <div>${info.getValue()}</div>,
			header: 'Monto Unitario',
		}),
		columnHelper.accessor('monto_total', {
			cell: (info) => <div>${info.getValue()}</div>,
			header: 'Monto Total',
		}),
		columnHelper.accessor('fecha_gasto', {
			cell: (info) => <div>{dayjs(info.getValue()).format('DD/MM/YYYY')}</div>,
			header: 'Fecha del Gasto',
		}),
		columnHelper.display({
			id: 'acciones',
			cell: (info) => (
				<div>
					<ModalEliminar
						mensaje='¿Esta seguro(a) de querer eliminar el gasto?'
						nombre='Gasto'
						onDispatch={() => {
							dispatch(
								listaDetalleGastoRendicionOTThunk({
									id_orden: detalleOrdenTrabajo?.id,
								}),
							);
						}}
						peticionUrl={`/api/ordenes-de-trabajo/${detalleOrdenTrabajo?.id}/gastos-operativos/${info.row.original.id}/`}></ModalEliminar>
				</div>
			),
			header: '',
		}),
	];

	const table = useReactTable({
		data: listaDetalleGastoRendicionOT,
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
		<Card>
			<CardHeader>
				<CardHeaderChild>
					<Badge className='text-xl'>Gastos Operativos de la OT</Badge>
				</CardHeaderChild>
				<CardHeaderChild>
				{detalleOrdenTrabajo?.estado === 'en_proceso' && <CrearRendicionesOT />}
				</CardHeaderChild>
			</CardHeader>
			<CardBody className='z-0'>
				<div className='overflow-auto'>
					<Table className='min-w-[800px] table-fixed'>
						<THead>
							{table.getHeaderGroups().map((headerGroup) => (
								<Tr key={headerGroup.id}>
									{headerGroup.headers.map((header) => (
										<Th
											key={header.id}
											style={{ width: header.column.getSize() }}
											isColumnBorder={false}
											className='text-left'>
											{header.isPlaceholder ? null : (
												<div
													key={header.id}
													aria-hidden='true'
													{...{
														className: header.column.getCanSort()
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
													}[header.column.getIsSorted() as string] ??
														null}
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
					<div className='mt-2 min-w-[800px]'>
						<TableCardFooterTemplateV2 table={table} />
					</div>
				</div>
			</CardBody>
		</Card>
	);
}

export default RendicionesOT;
