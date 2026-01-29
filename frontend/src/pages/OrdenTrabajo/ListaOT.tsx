import Icon from '@/components/icon/Icon';
import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, { SubheaderLeft, SubheaderRight } from '@/components/layouts/Subheader/Subheader';
import ConfirmarEliminar from '@/components/modals/ConfirmarEliminar';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody } from '@/components/ui/Card';
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import Tooltip from '@/components/ui/Tooltip';
import AnimacionDeInputModoMovil from '@/components/utils/AnimacionDeIntputModoMovil';
import { IOrdenDeTrabajo } from '@/interface/ordenTrabajo.interface';
import ApiService from '@/services/ApiService';
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
import { toast } from 'react-toastify';
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
			cell: (info) => (
				<div className='font-bold text-gray-600 dark:text-gray-400'>
					{info.getValue()}
				</div>
			),
			header: 'N°',
			size: 20,
		}),
		columnHelper.accessor('tipo_servicio_label', {
			cell: (info) => (
				<div className='font-semibold text-gray-700 dark:text-gray-300'>
					{info.getValue()}
				</div>
			),
			header: 'Tipo Servicio',
		}),
		columnHelper.accessor('empresa_nombre', {
			cell: (info) => (
				<div className='font-medium text-gray-700 dark:text-gray-300'>
					{info.getValue()}
				</div>
			),
			header: 'Empresa',
		}),
		columnHelper.accessor('cliente_nombre', {
			cell: (info) => (
				<div className='font-medium text-gray-700 dark:text-gray-300'>
					{info.getValue()}
				</div>
			),
			header: 'Cliente',
		}),
		columnHelper.accessor('fecha_inicio_ot', {
			cell: (info) => (
				<div className={!info.row.original.fecha_inicio_ot ? 'italic text-gray-400' : 'text-gray-500'}>
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
						!info.row.original.fecha_finalizacion_ot ? 'italic text-gray-400' : 'text-gray-500'
					}>
					{info.row.original.fecha_finalizacion_ot
						? dayjs(info.row.original.fecha_finalizacion_ot).format('DD/MM/YYYY')
						: 'Por confirmar'}
				</div>
			),
			header: 'Fecha Finalización',
		}),
		columnHelper.accessor('estado_label', {
			cell: (info) => {
				const estado = info.getValue();
				let color: 'emerald' | 'amber' | 'red' | 'blue' | 'gray' = 'gray';
				const estadoLower = estado?.toLowerCase() || '';

				if (estadoLower.includes('completada')) color = 'emerald';
				else if (estadoLower.includes('pendiente')) color = 'amber';
				else if (estadoLower.includes('reprogr') || estadoLower.includes('cancelada')) color = 'red';
				else if (estadoLower.includes('en proceso')) color = 'blue';

				return (
					<Badge variant='solid' color={color} className='capitalize'>
						{estado}
					</Badge>
				);
			},
			header: 'Estado',
		}),
		columnHelper.accessor('prioridad_label', {
			cell: (info) => {
				const prioridad = info.getValue();
				let color: 'emerald' | 'amber' | 'red' | 'blue' | 'gray' = 'gray';
				const prioridadLower = prioridad?.toLowerCase() || '';

				if (prioridadLower.includes('alta')) color = 'red';
				else if (prioridadLower.includes('media')) color = 'amber';
				else if (prioridadLower.includes('baja')) color = 'blue';
				else if (prioridadLower.includes('normal')) color = 'gray';

				return (
					<Badge variant='solid' color={color} className='capitalize'>
						{prioridad}
					</Badge>
				);
			},
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
					{info.row.original.estado !== 'pendiente' && (
						<Tooltip text="Descargar PDF">
							<Button 
								variant="solid" 
								color="red" 
								icon="HeroDocumentArrowDown" 
								onClick={async () => {
									try {
										const response = await ApiService.fetchData<BlobPart>({
											url: `/api/ordenes-de-trabajo/${info.row.original.id}/pdf/`,
											method: 'get',
											responseType: 'blob',
										});
										if (response.data) {
											const url = window.URL.createObjectURL(new Blob([response.data]));
											const link = document.createElement('a');
											link.href = url;
											link.setAttribute(
												'download',
												`OrdenTrabajo_${info.row.original.id}.pdf`,
											);
											document.body.appendChild(link);
											link.click();
											link.remove();
											window.URL.revokeObjectURL(url);
										}
									} catch (error: any) {
										toast.error("Error al descargar PDF");
									}
								}} 
							/>
						</Tooltip>
					)}
					{info.row.original.estado === 'pendiente' && (
						<ConfirmarEliminar
							mensaje={`Estas a punto de eliminar la orden de trabajo #${info.row.original.id}${info.row.original.fecha_inicio_ot ? ` del ${dayjs(info.row.original.fecha_inicio_ot).format('DD/MM/YYYY')}` : ''} ¿desea continuar?`}
							peticionUrl={`/api/ordenes-de-trabajo/${info.row.original.id}/`}
							onDispatch={() => dispatch(listaOrdenTrabajoThunk())}
						/>
					)}
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
