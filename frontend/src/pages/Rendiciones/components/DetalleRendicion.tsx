import Input from '@/components/form/Input';
import Textarea from '@/components/form/Textarea';
import Validation from '@/components/form/Validation';
import Icon from '@/components/icon/Icon';
import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, { SubheaderLeft, SubheaderRight } from '@/components/layouts/Subheader/Subheader';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import Tooltip from '@/components/ui/Tooltip';
import AnimacionDeInputModoMovil from '@/components/utils/AnimacionDeIntputModoMovil';
import { IItemRendicion } from '@/interface/rendicion.interface';
import ModalEliminar from '@/pages/Items/Proveedor/modals/ModalEliminar';
import ApiService from '@/services/ApiService';
import {
	detalleRendicionThunk,
	listaItemsRendicionThunk,
	useAppDispatch,
	useAppSelector,
} from '@/store';
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
import { useFormik } from 'formik';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import CambiarEstadoRendicion from '../modals/CambiarEstadoRendicion';
import CrearItemRendicion from '../modals/CrearItemRendicion';

const columnHelper = createColumnHelper<IItemRendicion>();

const DetalleRendicion = () => {
	const dispatch = useAppDispatch();
	const navigate = useNavigate();
	const { id } = useParams();
	const { detalleRendicion, listaItemsRendicion } = useAppSelector((state) => state.rendicion);
	const [sorting, setSorting] = useState<SortingState>([]);
	const [globalFilter, setGlobalFilter] = useState<string>('');
	const [editando, setEditando] = useState<boolean>(false);

	useEffect(() => {
		if (id) {
			dispatch(detalleRendicionThunk({ id_rendicion: id }));
			dispatch(listaItemsRendicionThunk({ id_rendicion: id }));
		}
	}, [id]);

	const formik = useFormik({
		enableReinitialize: true,
		initialValues: {
			fecha_rendicion: '',
			observaciones: '',
		},
		onSubmit: async (values) => {
			try {
				const response = await ApiService.fetchData({
					url: `/api/rendiciones/${detalleRendicion?.id}/`,
					method: 'patch',
					headers: { 'Content-Type': 'application/json' },
					data: JSON.stringify({
						fecha_rendicion: values.fecha_rendicion,
						observaciones: values.observaciones,
					}),
				});
				if (response.data) {
					toast.success('Rendición editada', { autoClose: 1000 });
					dispatch(detalleRendicionThunk({ id_rendicion: id }));
					formik.resetForm();
					setEditando(false);
				}
			} catch (error: any) {
				const mensajesError = Object.values(error.response.data).flat().join(' ');
				toast.error(mensajesError || 'Error al crear la empresa', {
					toastId: 'Error al crear la empresa',
				});
			}
		},
	});

	// const formikDetalle = useFormik({
	//     enableReinitialize: true,
	//     initialValues: {
	//         detalle: "",
	//         categoria: "",
	//         cantidad: 0,
	//         monto_unitario: 0,
	//         fecha_gasto: ""
	//     },
	//     onSubmit: async (values) => {
	//         console.log(values)
	//     }
	// })

	const columns = [
		columnHelper.accessor('id', {
			cell: (info) => info.getValue(),
			header: 'N°',
			size: 20,
		}),
		columnHelper.display({
			id: 'detalle',
			cell: (info) => (
				<div>
					{'codigo' in info.row.original.detalle_data
						? info.row.original.detalle_data.codigo
						: 'detalle' in info.row.original.detalle_data
							? info.row.original.detalle_data.detalle
							: 'Sin detalle'}
				</div>
			),
			header: 'Detalle',
		}),
		columnHelper.display({
			id: 'categoria',
			cell: (info) => (
				<div>
					{'codigo' in info.row.original.detalle_data
						? 'Compra'
						: info.row.original.detalle_data.nombre_categoria}
				</div>
			),
			header: 'Categoria',
		}),
		columnHelper.display({
			id: 'cantidad',
			cell: (info) => (
				<div>
					{'codigo' in info.row.original.detalle_data
						? `${info.row.original.detalle_data.items.length} Items`
						: info.row.original.detalle_data.cantidad}
				</div>
			),
			header: 'Cantidad',
		}),
		columnHelper.display({
			id: 'monto_unitario',
			cell: (info) => (
				<div>
					{'codigo' in info.row.original.detalle_data
						? 'No Disponible'
						: `$${info.row.original.detalle_data.monto_unitario}`}
				</div>
			),
			header: 'Monto Unitario',
		}),
		columnHelper.display({
			id: 'Monto Total',
			cell: (info) => (
				<div>
					$
					{'codigo' in info.row.original.detalle_data
						? info.row.original.detalle_data.total_compra
						: info.row.original.detalle_data.monto_total}
				</div>
			),
			header: 'Monto Total',
		}),
		columnHelper.display({
			id: 'fecha_gasto',
			cell: (info) => (
				<div>
					{dayjs(
						'codigo' in info.row.original.detalle_data
							? info.row.original.detalle_data.fecha_creacion
							: info.row.original.detalle_data.fecha_gasto,
					)
						.locale('es')
						.format('DD/MM/YYYY')}
				</div>
			),
			header: 'Fecha del Gasto',
		}),
		columnHelper.display({
			id: 'acciones',
			cell: (info) => (
				<div className='flex justify-end gap-2'>
					{/* Ver Compra - solo si es de tipo Compra */}
					{'codigo' in info.row.original.detalle_data && (
						<Tooltip text='Ver Compra'>
							<Button
								variant='solid'
								color='violet'
								icon='HeroEye'
								onClick={() =>
									navigate(
										`/compras/detalle-compra/${info.row.original.detalle_data.id}`,
									)
								}
							/>
						</Tooltip>
					)}
					{/* Eliminar */}
					<ModalEliminar
						mensaje={`Estas seguro que deseas eliminar el item ¿desea continuar?`}
						peticionUrl={`/api/rendiciones/${detalleRendicion?.id}/items-rendicion/${info.row.original.id}/`}
						onDispatch={() => {
							dispatch(detalleRendicionThunk({ id_rendicion: detalleRendicion?.id }));
							dispatch(
								listaItemsRendicionThunk({ id_rendicion: detalleRendicion?.id }),
							);
						}}
					/>
				</div>
			),
			header: '',
		}),
	];

	const table = useReactTable({
		data: listaItemsRendicion,
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

	useEffect(() => {
		if (detalleRendicion) {
			formik.setFieldValue('fecha_rendicion', detalleRendicion.fecha_rendicion);
			formik.setFieldValue('observaciones', detalleRendicion.observaciones);
		}
	}, [detalleRendicion]);

	return (
		<PageWrapper isProtectedRoute={true} name='Detalle Rendición' title='Detalle Rendición'>
			<Subheader>
				<SubheaderLeft>
					<Badge className='text-xl'>Detalle Rendición</Badge>
				</SubheaderLeft>
				<SubheaderRight>
					<div className='flex gap-2'>
						{detalleRendicion?.orden_trabajo && (
							<Tooltip text='Ver Orden de Trabajo'>
								<Button
									variant='solid'
									color='violet'
									icon='HeroEye'
									onClick={() =>
										navigate(
											`/orden-trabajo/detalle-orden-trabajo/${detalleRendicion.orden_trabajo}`,
										)
									}
								/>
							</Tooltip>
						)}
						<CambiarEstadoRendicion />
					</div>
				</SubheaderRight>
			</Subheader>
			<Container className='h-full w-full'>
				<div className='flex flex-col gap-4'>
					<Card>
						<CardHeader>
							<CardHeaderChild>
								<Badge className='text-xl'>Datos</Badge>
							</CardHeaderChild>
							<CardHeaderChild>
								{detalleRendicion && detalleRendicion.estado === '0' && (
									<div className='flex items-center justify-end'>
										{editando ? (
											<div className='flex gap-2'>
												<Tooltip text='Guardar Cambios'>
													<Button
														variant='solid'
														icon='HeroCheck'
														onClick={() => {
															formik.handleSubmit();
														}}
													/>
												</Tooltip>
												<Tooltip text='Cancelar'>
													<Button
														color='red'
														variant='solid'
														onClick={() => {
															setEditando(false);
														}}
														icon='HeroXMark'
													/>
												</Tooltip>
											</div>
										) : (
											<Tooltip text='Editar'>
												<Button
													variant='solid'
													icon='HeroPencil'
													onClick={() => {
														setEditando(true);
													}}
												/>
											</Tooltip>
										)}
									</div>
								)}
								{detalleRendicion &&
									detalleRendicion.estado != '0' &&
									detalleRendicion.estado != '3' && (
										<Tooltip text='Descargar PDF'>
											<Button
												variant='solid'
												color='red'
												icon='DuoDownloadedFile'
												onClick={async () => {
													try {
														const response =
															await ApiService.fetchData<BlobPart>({
																url: `/api/rendiciones/${detalleRendicion.id}/descargar-pdf`,
																method: 'get',
																headers: {
																	'Content-Type':
																		'application/pdf',
																},
															});
														const url = window.URL.createObjectURL(
															new Blob([response.data]),
														);
														const a = document.createElement('a');
														a.href = url;
														a.download = `rendicion_${id}.pdf`;
														document.body.appendChild(a);
														a.click();
														a.remove();
														window.URL.revokeObjectURL(url);
													} catch (error: any) {
														toast.error(
															error.response.data ||
																'Error al descargar el pdf',
															{
																toastId:
																	'Error al descargar el pdf',
															},
														);
													}
												}}
											/>
										</Tooltip>
									)}
							</CardHeaderChild>
						</CardHeader>
						<CardBody>
							<div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
								{editando ? (
									<>
										<div>
											<Badge>Fecha de la Rendición</Badge>
											<Validation
												isValid={formik.isValid}
												isTouched={formik.touched.fecha_rendicion}
												invalidFeedback={formik.errors.fecha_rendicion}>
												<Input
													name='fecha_rendicion'
													id='fecha_rendicion'
													type='date'
													onBlur={formik.handleBlur}
													onChange={formik.handleChange}
													value={formik.values.fecha_rendicion}
												/>
											</Validation>
										</div>
										<div>
											<Badge>Observaciones</Badge>
											<Validation
												isValid={formik.isValid}
												isTouched={formik.touched.observaciones}
												invalidFeedback={formik.errors.observaciones}>
												<Textarea
													name='observaciones'
													id='observaciones'
													placeholder='Observaciones'
													onBlur={formik.handleBlur}
													onChange={formik.handleChange}
													value={formik.values.observaciones}
												/>
											</Validation>
										</div>
									</>
								) : (
									<>
										<div className='w-full'>
											<Badge>Fecha de la Rendición</Badge>
											<div className='ml-4'>
												{detalleRendicion?.fecha_rendicion
													? dayjs(
															detalleRendicion.fecha_rendicion,
														).format('DD/MM/YYYY')
													: ''}
											</div>
										</div>
										<div className='w-full'>
											<Badge>Observaciones</Badge>
											<div className='ml-4'>
												{detalleRendicion?.observaciones ||
													'Sin Observaciones'}
											</div>
										</div>
										<div className='w-full'>
											<Badge>Nombre del Usuario</Badge>
											<div className='ml-4'>
												{detalleRendicion?.datos_usuario.nombre_usuario}
											</div>
										</div>
										<div className='w-full'>
											<Badge>Rut del Usuario</Badge>
											<div className='ml-4'>
												{detalleRendicion?.datos_usuario.papeleta.rut ||
													'Sin Rut'}
											</div>
										</div>
									</>
								)}
							</div>
						</CardBody>
					</Card>
					<Card>
						<CardHeader>
							<CardHeaderChild>
								<Badge className='text-xl'>Totales y Política</Badge>
							</CardHeaderChild>
						</CardHeader>
						<CardBody>
							<div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
								<div>
									<Badge>Estado</Badge>
									<div className='ml-4'>{detalleRendicion?.estado_label}</div>
								</div>
								<div>
									<Badge color='blue'>Total Reembolso Técnico</Badge>
									<div className='ml-4 font-semibold text-blue-600'>
										${' '}
										{detalleRendicion?.total_reembolso_tecnico?.toLocaleString(
											'es-CL',
										) || 0}
									</div>
									<div className='ml-4 text-xs text-gray-500'>
										Todo lo que gastó el técnico
									</div>
								</div>
								<div>
									<Badge color='emerald'>Total Facturable Cliente</Badge>
									<div className='ml-4 font-semibold text-green-600'>
										${' '}
										{detalleRendicion?.total_facturable_cliente?.toLocaleString(
											'es-CL',
										) || 0}
									</div>
									<div className='ml-4 text-xs text-gray-500'>
										Se cobra en factura
									</div>
								</div>
								<div>
									<Badge color='amber'>Total No Facturable</Badge>
									<div className='ml-4 font-semibold text-amber-600'>
										${' '}
										{detalleRendicion?.total_no_facturable?.toLocaleString(
											'es-CL',
										) || 0}
									</div>
									<div className='ml-4 text-xs text-gray-500'>
										Empresa asume (viáticos incluidos)
									</div>
								</div>
							</div>
						</CardBody>
					</Card>
					<Card>
						<CardHeader>
							<CardHeaderChild>
								<Badge className='text-xl'>Items de la Rendición</Badge>
							</CardHeaderChild>
							<CardHeaderChild>
								<div className='flex items-center justify-between'>
									<AnimacionDeInputModoMovil
										globalFilter={globalFilter}
										setGlobalFilter={setGlobalFilter}
										anchoInput={200}>
										{detalleRendicion && detalleRendicion.estado === '0' && (
											<CrearItemRendicion />
										)}
									</AnimacionDeInputModoMovil>
								</div>
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
				</div>
			</Container>
		</PageWrapper>
	);
};

export default DetalleRendicion;
