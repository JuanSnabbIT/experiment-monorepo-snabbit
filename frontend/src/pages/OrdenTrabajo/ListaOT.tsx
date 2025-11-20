import Icon from '@/components/icon/Icon';
import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, { SubheaderLeft, SubheaderRight } from '@/components/layouts/Subheader/Subheader';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody } from '@/components/ui/Card';
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import Tooltip from '@/components/ui/Tooltip';
import AnimacionDeInputModoMovil from '@/components/utils/AnimacionDeIntputModoMovil';
import { IOrdenDeTrabajo } from '@/interface/ordenTrabajo.interface';
import ModalEliminar from '@/pages/Items/Proveedor/modals/ModalEliminar';
import { listaOrdenTrabajoThunk, RootState, useAppDispatch, useAppSelector } from '@/store';
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
import { useNavigate } from 'react-router-dom';
import CrearOrdenOT from './modals/CrearOrdenOT';

const columnHelper = createColumnHelper<IOrdenDeTrabajo>();

const ListaOT = () => {
	const dispatch = useAppDispatch();
	const navigate = useNavigate();
	const { listaOrdenTrabajo } = useAppSelector((state: RootState) => state.ordenTrabajo);
	const { personalizacionUsuario } = useAppSelector((state) => state.auth);
	const [sorting, setSorting] = useState<SortingState>([]);
	const [globalFilter, setGlobalFilter] = useState<string>('');

	useEffect(() => {
		if (personalizacionUsuario && personalizacionUsuario.empresa) {
			dispatch(listaOrdenTrabajoThunk());
		}
	}, [personalizacionUsuario]);

	const columns = [
		columnHelper.accessor('id', {
			cell: (info) => info.getValue(),
			header: 'N°',
			size: 20,
		}),
		columnHelper.accessor('tipo_servicio_label', {
			cell: (info) => info.getValue(),
			header: 'Tipo Servicio',
		}),
		columnHelper.accessor('empresa_nombre', {
			cell: (info) => info.getValue(),
			header: 'Empresa',
		}),
		columnHelper.accessor('cliente_nombre', {
			cell: (info) => info.getValue(),
			header: 'Cliente',
		}),
		columnHelper.accessor('fecha_inicio_ot', {
			cell: (info) => (
				<div className={!info.row.original.fecha_inicio_ot ? 'italic text-gray-400' : ''}>
					{info.row.original.fecha_inicio_ot
						? dayjs(info.row.original.fecha_inicio_ot).format('DD/MM/YYYY')
						: 'Por confirmar'}
				</div>
			),
			header: 'Fecha Inicio',
		}),
		columnHelper.accessor('fecha_finalizacion_ot', {
			cell: (info) => (
				<div
					className={
						!info.row.original.fecha_finalizacion_ot ? 'italic text-gray-400' : ''
					}>
					{info.row.original.fecha_finalizacion_ot
						? dayjs(info.row.original.fecha_finalizacion_ot).format('DD/MM/YYYY')
						: 'Por confirmar'}
				</div>
			),
			header: 'Fecha Finalización',
		}),
		columnHelper.accessor('estado_label', {
			cell: (info) => info.getValue(),
			header: 'Estado',
		}),
		columnHelper.accessor('prioridad_label', {
			cell: (info) => info.getValue(),
			header: 'Prioridad',
		}),
		columnHelper.display({
			id: 'acciones',
			cell: (info) => (
				<div className='flex justify-center gap-2'>
					<Tooltip text='Detalle Orden'>
						<Button
							color='violet'
							variant='solid'
							onClick={() => {
								navigate(
									`/orden-trabajo/detalle-orden-trabajo/${info.row.original.id}/`,
								);
							}}
							icon='HeroEye'></Button>
					</Tooltip>
					<ModalEliminar
						mensaje={`Estas a punto de eliminar la orden de trabajo #${info.row.original.id}${info.row.original.fecha_inicio_ot ? ` del ${dayjs(info.row.original.fecha_inicio_ot).format('DD/MM/YYYY')}` : ''} ¿desea continuar?`}
						peticionUrl={`/api/ordenes-de-trabajo/${info.row.original.id}/`}
						onDispatch={() => dispatch(listaOrdenTrabajoThunk())}>
						Eliminar
					</ModalEliminar>
				</div>
			),
		}),
	];

	const table = useReactTable({
		data: listaOrdenTrabajo,
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
		<PageWrapper isProtectedRoute={true} name='Ordenes de Trabajo' title='Ordenes de Trabajo'>
			<Subheader>
				<SubheaderLeft>
					<Badge className='text-xl'>Ordenes de Trabajo</Badge>
				</SubheaderLeft>
				<SubheaderRight>
					<AnimacionDeInputModoMovil
						globalFilter={globalFilter}
						setGlobalFilter={setGlobalFilter}
						anchoInput={100}>
						<CrearOrdenOT />
					</AnimacionDeInputModoMovil>
				</SubheaderRight>
			</Subheader>
			<Container className='h-full w-full'>
				<Card>
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
			</Container>
		</PageWrapper>
	);
};

export default ListaOT;
