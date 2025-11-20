import Input from '@/components/form/Input';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Textarea from '@/components/form/Textarea';
import Validation from '@/components/form/Validation';
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
import Collapse from '@/components/utils/Collapse';
import ApiService from '@/services/ApiService';
import {
	eliminarServicioGeneralThunk,
	listaServiciosGeneralesThunk,
	listaTecnicosThunk,
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
import { toast } from 'react-toastify';
import * as Yup from 'yup';
import CrearServicioEnOT from '../modals/CrearServicioEnOT';

function ListaServiciosOT() {
	const dispatch = useAppDispatch();
	const { detalleOrdenTrabajo, listaServiciosGenerales, listaTecnicos } = useAppSelector(
		(s) => s.ordenTrabajo,
	);
	const { personalizacionUsuario } = useAppSelector((s) => s.auth);

	const [selectedService, setSelectedService] = useState<any | null>(null);
	const [isOpenDetail, setIsOpenDetail] = useState(false);
	const [openedDescriptions, setOpenedDescriptions] = useState<number[]>([]);
	const [globalFilter, setGlobalFilter] = useState<string>('');
	const [sorting, setSorting] = useState<SortingState>([]);
	// Asignar fecha modal
	const [isOpenAsignarFecha, setIsOpenAsignarFecha] = useState<boolean>(false);
	const [fechaAsignar, setFechaAsignar] = useState<string | undefined>();
	// Para cambio de estado: (usado en acciones)
	const [isOpenEstado, setIsOpenEstado] = useState<boolean>(false);
	const [estadoNuevo, setEstadoNuevo] = useState<string | undefined>();
	const [comentario, setComentario] = useState<string | undefined>();
	// Para cambio de estado: posible asignación de técnico y fecha
	const [tecnicoSeleccionado, setTecnicoSeleccionado] = useState<string | undefined>();
	const [fechaEnModal, setFechaEnModal] = useState<string | undefined>();
	const [isOpenTecnico, setIsOpenTecnico] = useState<boolean>(false);
	const [detalleSeleccionado, setDetalleSeleccionado] = useState<number | null>(null);

	useEffect(() => {
		if (detalleOrdenTrabajo && detalleOrdenTrabajo.tipo_servicio === 'general') {
			dispatch(listaServiciosGeneralesThunk({ id_orden: detalleOrdenTrabajo.id }));
		}
	}, [detalleOrdenTrabajo]);

	const openDetail = (serv: any) => {
		setSelectedService(serv);
		setIsOpenDetail(true);
	};

	const toggleDescription = (id: number) => {
		setOpenedDescriptions((prev) =>
			prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id],
		);
	};

	const filtro = globalFilter?.toLowerCase()?.trim();
	const serviciosFiltrados = listaServiciosGenerales
		? filtro
			? listaServiciosGenerales.filter((s: any) => {
					return (
						String(s.nombre ?? '')
							.toLowerCase()
							.includes(filtro) ||
						String(s.descripcion ?? '')
							.toLowerCase()
							.includes(filtro) ||
						String(s.estado_label ?? s.estado ?? '')
							.toLowerCase()
							.includes(filtro)
					);
				})
			: listaServiciosGenerales
		: [];

	const estadoBadgeColor = (e: string) => {
		switch ((e || '').toString().toLowerCase()) {
			case 'pendiente':
				return 'amber';
			case 'en_proceso':
			case 'en proceso':
				return 'sky';
			case 'completado':
				return 'emerald';
			case 'no_realizado':
			case 'no realizado':
				return 'red';
			case 'medianamente_completado':
				return 'amber';
			default:
				return 'gray';
		}
	};

	const columnHelper = createColumnHelper<any>();

	const columns = [
		columnHelper.accessor('id', {
			cell: (info) => info.getValue(),
			header: 'N°',
			size: 15,
		}),
		columnHelper.accessor('nombre', {
			cell: (info) => {
				const id = info.row.original.id;
				return (
					<div className='flex flex-row gap-2'>
						<div>
							{info.getValue()}
							<Collapse
								isOpen={openedDescriptions.includes(id)}
								className='transition-opacity'>
								<div>
									<Badge className='text-sm'>Descripción:</Badge>
									<span className='text-sm'>
										{info.row.original.descripcion ?? ''}
									</span>
								</div>
							</Collapse>
						</div>
						<div>
							<Button
								size='xs'
								variant='solid'
								color='sky'
								icon={openedDescriptions.includes(id) ? 'HeroEyeSlash' : 'HeroEye'}
								onClick={() => toggleDescription(id)}
							/>
						</div>
					</div>
				);
			},
			header: 'Solicitud',
		}),
		columnHelper.accessor('estado_label', {
			cell: (info) => {
				const estado = info.getValue() ?? info.row.original.estado;
				const estadoStr = String(estado);
				const isPendiente = estadoStr.toLowerCase() === 'pendiente';
				const hasTecnico = !!info.row.original.tecnico_asignado;
				const hasFecha = !!info.row.original.fecha_servicio;
				const requierePrereqs = isPendiente;
				const canStart = !requierePrereqs || (hasTecnico && hasFecha);
				const tooltipText =
					!canStart && requierePrereqs
						? 'Requiere técnico asignado y fecha de trabajo para iniciar'
						: estadoStr;

				return (
					<Tooltip text={tooltipText}>
						<div className={!canStart ? 'inline-block' : ''}>
							<Button
								size='sm'
								variant={!canStart ? 'outline' : 'solid'}
								rounded='rounded-full'
								color={
									!canStart
										? 'amber'
										: isPendiente
											? 'emerald'
											: estadoBadgeColor(estadoStr)
								}
								icon={isPendiente ? 'HeroPlay' : undefined}
								isDisable={!canStart}
								onClick={() => {
									// Only open modal when prerequisites are met
									if (!canStart) return;
									setSelectedService(info.row.original);
									setIsOpenEstado(true);
								}}
								aria-label={estadoStr}
								title={estadoStr}
								className={!canStart ? 'opacity-95 ring-1 ring-amber-200' : ''}
							/>
						</div>
					</Tooltip>
				);
			},
			header: 'Estado',
			size: 100,
		}),
		columnHelper.accessor('nombre_tecnico', {
			cell: (info) => info.getValue() ?? 'Sin Técnico',
			header: 'Técnico Asignado',
		}),
		columnHelper.accessor('fecha_servicio', {
			cell: (info) =>
				info.getValue()
					? dayjs(info.getValue()).locale('es').format('DD/MM/YYYY')
					: 'Sin fecha',
			header: 'Fecha trabajo',
		}),
		columnHelper.display({
			id: 'acciones',
			cell: (info) => (
				<div className='flex flex-wrap gap-2'>
					<Tooltip text='Ver detalle'>
						<Button
							size='xs'
							variant='solid'
							color='violet'
							icon='HeroEye'
							onClick={() => openDetail(info.row.original)}
						/>
					</Tooltip>
					<Tooltip text='Asignar Técnico'>
						<Button
							size='xs'
							variant='solid'
							color='sky'
							icon='DuoAddUser'
							onClick={() => {
								setDetalleSeleccionado(info.row.original.id);
								setSelectedService(info.row.original);
								setIsOpenTecnico(true);
							}}
						/>
					</Tooltip>
					<Tooltip text='Asignar Fecha'>
						<Button
							size='xs'
							variant='solid'
							color='amber'
							icon='HeroCalendar'
							onClick={() => {
								setSelectedService(info.row.original);
								setFechaAsignar(info.row.original.fecha_servicio ?? undefined);
								setIsOpenAsignarFecha(true);
							}}
						/>
					</Tooltip>
					<Tooltip text='Eliminar servicio'>
						<Button
							size='xs'
							variant='solid'
							color='red'
							icon='HeroTrash'
							onClick={async () => {
								if (!detalleOrdenTrabajo) return;
								const ok = window.confirm(
									'¿Eliminar este servicio? Esta acción no se puede deshacer.',
								);
								if (!ok) return;
								try {
									await dispatch(
										eliminarServicioGeneralThunk({
											id_orden: detalleOrdenTrabajo.id,
											id_servicio: info.row.original.id,
										}),
									);
									toast.success('Servicio eliminado', { autoClose: 1000 });
									// ensure list refreshed
									dispatch(
										listaServiciosGeneralesThunk({
											id_orden: detalleOrdenTrabajo.id,
										}),
									);
								} catch (e: any) {
									const msg =
										e?.payload || e?.message || 'Error al eliminar servicio';
									toast.error(msg);
								}
							}}
						/>
					</Tooltip>
				</div>
			),
			header: 'Acciones',
		}),
	];

	const table = useReactTable({
		data: serviciosFiltrados,
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

	const quitarTecnico = async () => {
		if (!detalleOrdenTrabajo || !selectedService) return;
		try {
			const resp = await ApiService.fetchData({
				url: `/api/ordenes-de-trabajo/${detalleOrdenTrabajo.id}/servicios-generales/${selectedService.id}/`,
				method: 'patch',
				headers: { 'Content-Type': 'application/json' },
				data: JSON.stringify({ tecnico_asignado: null }),
			});
			if (resp.data) {
				toast.success('Técnico quitado', { autoClose: 1000 });
				dispatch(listaServiciosGeneralesThunk({ id_orden: detalleOrdenTrabajo.id }));
				setIsOpenDetail(false);
				setSelectedService(null);
			}
		} catch (e: any) {
			const msg = Object.values(e?.response?.data || {})
				.flat()
				.join(' ');
			toast.error(msg || 'Error al quitar técnico');
		}
	};

	useEffect(() => {
		if (isOpenTecnico) {
			if (personalizacionUsuario?.empresa) {
				dispatch(listaTecnicosThunk({ id_empresa: personalizacionUsuario.empresa }));
			}
		}
	}, [isOpenTecnico, personalizacionUsuario]);

	useEffect(() => {
		if (isOpenEstado) {
			if (personalizacionUsuario?.empresa) {
				dispatch(listaTecnicosThunk({ id_empresa: personalizacionUsuario.empresa }));
			}
			setTecnicoSeleccionado(undefined);
			setFechaEnModal(undefined);
		}
	}, [isOpenEstado, personalizacionUsuario]);

	// Formik para Asignar Técnico en servicios generales: se crea más abajo junto al modal

	// Nota: el control de cambio de estado se realiza desde la columna de Acciones

	// Formik para Asignar Técnico (servicios generales)
	const formikTecnico = useFormik({
		enableReinitialize: true,
		initialValues: {
			tipo_seguimiento: 'actualizacion',
			comentario: 'Técnico agregado',
			tecnico_asignado: '',
		},
		validationSchema: Yup.object().shape({
			tecnico_asignado: Yup.string().required('Requerido').nonNullable('Requerido'),
		}),
		onSubmit: async (values) => {
			try {
				const response = await ApiService.fetchData({
					url: `/api/ordenes-de-trabajo/${detalleOrdenTrabajo?.id}/servicios-generales/${detalleSeleccionado}/`,
					method: 'patch',
					headers: { 'Content-Type': 'application/json' },
					data: JSON.stringify({ tecnico_asignado: values.tecnico_asignado }),
				});
				if (response.data) {
					try {
						await ApiService.fetchData({
							url: `/api/ordenes-de-trabajo/${detalleOrdenTrabajo?.id}/servicios-generales/${detalleSeleccionado}/seguimientos/`,
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
							data: JSON.stringify({
								servicio: detalleSeleccionado,
								usuario: null,
								tipo: values.tipo_seguimiento,
								comentario: values.comentario,
							}),
						});
					} catch (e) {
						// ignore seguimiento error
					}
					toast.success('Técnico asignado', { autoClose: 1000 });
					formikTecnico.resetForm();
					dispatch(listaServiciosGeneralesThunk({ id_orden: detalleOrdenTrabajo?.id }));
					setIsOpenTecnico(false);
					setDetalleSeleccionado(null);
					setSelectedService(null);
				}
			} catch (error: any) {
				toast.error(error?.response?.data || 'Error al asignar el tecnico');
			}
		},
	});

	useEffect(() => {
		if (!isOpenTecnico) {
			formikTecnico.resetForm();
		}
	}, [isOpenTecnico]);

	return (
		<Card>
			<CardHeader>
				<CardHeaderChild>
					<Badge className='text-xl'>Servicios Generales</Badge>
				</CardHeaderChild>
				<CardHeaderChild>
					<AnimacionDeInputModoMovil
						globalFilter={globalFilter}
						setGlobalFilter={setGlobalFilter}
						anchoInput={200}>
						{detalleOrdenTrabajo &&
							(detalleOrdenTrabajo.estado === 'pendiente' ||
								detalleOrdenTrabajo.estado === 'en_proceso') && (
								<CrearServicioEnOT />
							)}
					</AnimacionDeInputModoMovil>
				</CardHeaderChild>
			</CardHeader>
			<CardBody>
				<div className='mt-2 overflow-auto'>
					{serviciosFiltrados && serviciosFiltrados.length > 0 ? (
						<>
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
						</>
					) : (
						<div className='text-center text-gray-500'>No hay servicios generales.</div>
					)}
				</div>

				<div className='mt-2 min-w-[800px]'>
					<TableCardFooterTemplateV2 table={table} />
				</div>
			</CardBody>

			<Modal isOpen={isOpenDetail} setIsOpen={setIsOpenDetail}>
				<ModalHeader>
					<Badge>Detalle Servicio</Badge>
				</ModalHeader>
				<ModalBody>
					{selectedService ? (
						<div className='grid grid-cols-2 gap-4'>
							<div>
								<Badge>Solicitud</Badge>
								<div className='ml-4'>{selectedService.nombre}</div>
							</div>
							<div>
								<Badge>Estado</Badge>
								<div className='ml-4'>
									<Button
										size='sm'
										variant='solid'
										color={estadoBadgeColor(
											String(
												selectedService.estado_label ??
													selectedService.estado,
											),
										)}
										isDisable={true}>
										{selectedService.estado_label ?? selectedService.estado}
									</Button>
								</div>
							</div>
							<div>
								<Badge>Técnico Asignado</Badge>
								<div className='ml-4'>
									{selectedService.nombre_tecnico ?? 'Sin Técnico'}
								</div>
							</div>
							<div>
								<Badge>Fecha trabajo</Badge>
								<div className='ml-4'>
									{selectedService.fecha_servicio
										? dayjs(selectedService.fecha_servicio)
												.locale('es')
												.format('DD/MM/YYYY')
										: 'Sin fecha'}
								</div>
							</div>
						</div>
					) : (
						<div>No hay detalle seleccionado.</div>
					)}
				</ModalBody>
				<ModalFooter>
					<ModalFooterChild />
					<ModalFooterChild>
						{selectedService && selectedService.tecnico_asignado != null && (
							<Button color='red' onClick={quitarTecnico}>
								Quitar Técnico
							</Button>
						)}
						<Button color='red' onClick={() => setIsOpenDetail(false)}>
							Cerrar
						</Button>
					</ModalFooterChild>
				</ModalFooter>
			</Modal>
			<Modal isOpen={isOpenTecnico} setIsOpen={setIsOpenTecnico} isStaticBackdrop={true}>
				<ModalHeader>
					<Badge className='text-xl'>Asignar Técnico</Badge>
				</ModalHeader>
				<ModalBody>
					<div className='flex flex-col gap-4'>
						<div className='w-full'>
							<Badge>Técnico</Badge>
							{listaTecnicos && listaTecnicos.length > 0 && (
								<Validation
									isValid={formikTecnico.isValid}
									isTouched={formikTecnico.touched.tecnico_asignado}
									invalidFeedback={formikTecnico.errors.tecnico_asignado}>
									<SelectReact
										name='tecnico_asignado'
										noOptionsMessage={(e) => `No Existe ${e.inputValue}`}
										placeholder='Seleccione un Técnico'
										options={listaTecnicos.map((user: any) => ({
											value: String(user.id),
											label: user.nombre_usuario,
										}))}
										onChange={(e: any) => {
											formikTecnico.setFieldValue(
												'tecnico_asignado',
												(e as TSelectOption).value,
											);
										}}
										onBlur={formikTecnico.handleBlur}
										value={{
											value: formikTecnico.values.tecnico_asignado,
											label:
												listaTecnicos.find(
													(us: any) =>
														String(us.id) ===
														formikTecnico.values.tecnico_asignado,
												)?.nombre_usuario || '',
										}}
									/>
								</Validation>
							)}
						</div>
					</div>
				</ModalBody>
				<ModalFooter>
					<ModalFooterChild />
					<ModalFooterChild>
						<Button
							color='red'
							onClick={() => {
								setIsOpenTecnico(false);
							}}>
							Cancelar
						</Button>
						<Button
							variant='solid'
							onClick={() => {
								formikTecnico.handleSubmit();
							}}>
							Guardar
						</Button>
					</ModalFooterChild>
				</ModalFooter>
			</Modal>
			{/* Modal para cambio de estado (Servicios Generales) */}
			<Modal isOpen={isOpenEstado} setIsOpen={setIsOpenEstado}>
				<ModalHeader>
					<Badge>Cambiar Estado</Badge>
				</ModalHeader>
				<ModalBody>
					<div className='flex flex-col gap-4'>
						<div>
							<Badge>Nuevo Estado</Badge>
							<div className='ml-4'>
								<SelectReact
									name='estadoNuevo'
									options={[
										{
											value: 'medianamente_completado',
											label: 'Medianamente Completado',
										},
										{ value: 'completado', label: 'Completado' },
										{ value: 'no_realizado', label: 'No Realizado' },
										{ value: 'en_proceso', label: 'En Proceso' },
									]}
									value={
										estadoNuevo
											? { value: estadoNuevo, label: estadoNuevo }
											: undefined
									}
									onChange={(e: any) => {
										if (e) setEstadoNuevo((e as TSelectOption).value);
										else setEstadoNuevo(undefined);
									}}
								/>
							</div>
						</div>
						<div>
							<Badge>Comentario del Seguimiento</Badge>
							<div className='ml-4'>
								<Textarea
									name='comentario'
									value={comentario}
									onChange={(e: any) => setComentario(e.target.value)}
								/>
							</div>
						</div>
						{estadoNuevo === 'en_proceso' && selectedService && (
							<div className='border-t pt-3'>
								<p className='text-sm font-medium'>
									Requisitos para poner en proceso
								</p>
								{!selectedService.tecnico_asignado && (
									<div className='mt-2'>
										<Badge>Asignar Técnico</Badge>
										<div className='ml-4'>
											<SelectReact
												name='tecnicoSeleccionado'
												placeholder='Seleccione un técnico'
												options={(listaTecnicos || []).map((t: any) => ({
													value: String(t.id),
													label: t.nombre_usuario,
												}))}
												value={(listaTecnicos || [])
													.map((t: any) => ({
														value: String(t.id),
														label: t.nombre_usuario,
													}))
													.find(
														(o: any) => o.value === tecnicoSeleccionado,
													)}
												onChange={(opt: any) =>
													setTecnicoSeleccionado(opt?.value)
												}
												isClearable={true}
											/>
										</div>
									</div>
								)}
								{!selectedService.fecha_servicio && (
									<div className='mt-2'>
										<Badge>Fecha de trabajo</Badge>
										<div className='ml-4'>
											<Input
												name='fecha_en_modal'
												type='date'
												value={fechaEnModal ?? ''}
												onChange={(e: any) =>
													setFechaEnModal(e.target.value)
												}
											/>
										</div>
									</div>
								)}
							</div>
						)}
					</div>
				</ModalBody>
				<ModalFooter>
					<ModalFooterChild />
					<ModalFooterChild>
						<Button
							color='red'
							onClick={() => {
								setIsOpenEstado(false);
								setEstadoNuevo(undefined);
								setComentario(undefined);
							}}>
							Cancelar
						</Button>
						<Button
							variant='solid'
							onClick={async () => {
								if (!detalleOrdenTrabajo || !selectedService) return;
								if (!estadoNuevo) {
									toast.error('Seleccione un estado');
									return;
								}

								const requiresTecnico =
									estadoNuevo === 'en_proceso' &&
									!selectedService.tecnico_asignado;
								const requiresFecha =
									estadoNuevo === 'en_proceso' && !selectedService.fecha_servicio;
								if (
									(requiresTecnico && !tecnicoSeleccionado) ||
									(requiresFecha && !fechaEnModal)
								) {
									toast.error(
										'Debe asignar técnico y fecha antes de poner en proceso',
									);
									return;
								}

								const payload: any = { estado: estadoNuevo };
								if (estadoNuevo === 'en_proceso') {
									if (requiresTecnico && tecnicoSeleccionado)
										payload.tecnico_asignado = tecnicoSeleccionado;
									if (requiresFecha && fechaEnModal)
										payload.fecha_servicio = fechaEnModal;
								}

								try {
									const resp = await ApiService.fetchData({
										url: `/api/ordenes-de-trabajo/${detalleOrdenTrabajo.id}/servicios-generales/${selectedService.id}/`,
										method: 'patch',
										headers: { 'Content-Type': 'application/json' },
										data: JSON.stringify(payload),
									});
									if (resp.data) {
										if (comentario) {
											try {
												await ApiService.fetchData({
													url: `/api/ordenes-de-trabajo/${detalleOrdenTrabajo.id}/servicios-generales/${selectedService.id}/seguimientos/`,
													method: 'post',
													headers: { 'Content-Type': 'application/json' },
													data: JSON.stringify({
														comentario,
														tipo: 'incidencia',
														usuario: null,
														servicio: selectedService.id,
													}),
												});
											} catch (e) {
												// ignore seguimiento error
											}
										}
										toast.success('Estado cambiado', { autoClose: 1000 });
										dispatch(
											listaServiciosGeneralesThunk({
												id_orden: detalleOrdenTrabajo.id,
											}),
										);
										setIsOpenEstado(false);
										setEstadoNuevo(undefined);
										setComentario(undefined);
										setSelectedService(null);
										setTecnicoSeleccionado(undefined);
										setFechaEnModal(undefined);
									}
								} catch (e: any) {
									const msg = Object.values(e?.response?.data || {})
										.flat()
										.join(' ');
									toast.error(msg || 'Error al cambiar el estado');
								}
							}}>
							Guardar
						</Button>
					</ModalFooterChild>
				</ModalFooter>
			</Modal>

			<Modal isOpen={isOpenAsignarFecha} setIsOpen={setIsOpenAsignarFecha}>
				<ModalHeader>
					<Badge>Asignar Fecha de Trabajo</Badge>
				</ModalHeader>
				<ModalBody>
					<div className='flex flex-col gap-4'>
						<div>
							<Badge>Fecha</Badge>
							<div className='ml-4'>
								<Input
									name='fecha_asignar'
									type='date'
									value={fechaAsignar ?? ''}
									onChange={(e: any) => setFechaAsignar(e.target.value)}
								/>
							</div>
						</div>
					</div>
				</ModalBody>
				<ModalFooter>
					<ModalFooterChild />
					<ModalFooterChild>
						<Button
							color='red'
							onClick={() => {
								setIsOpenAsignarFecha(false);
								setFechaAsignar(undefined);
								setSelectedService(null);
							}}>
							Cancelar
						</Button>
						<Button
							variant='solid'
							onClick={async () => {
								if (!detalleOrdenTrabajo || !selectedService) return;
								if (!fechaAsignar) {
									toast.error('Seleccione una fecha');
									return;
								}
								try {
									const resp = await ApiService.fetchData({
										url: `/api/ordenes-de-trabajo/${detalleOrdenTrabajo.id}/servicios-generales/${selectedService.id}/`,
										method: 'patch',
										headers: { 'Content-Type': 'application/json' },
										data: JSON.stringify({ fecha_servicio: fechaAsignar }),
									});
									if (resp.data) {
										toast.success('Fecha asignada', { autoClose: 1000 });
										dispatch(
											listaServiciosGeneralesThunk({
												id_orden: detalleOrdenTrabajo.id,
											}),
										);
										setIsOpenAsignarFecha(false);
										setFechaAsignar(undefined);
										setSelectedService(null);
									}
								} catch (e: any) {
									const msg = Object.values(e?.response?.data || {})
										.flat()
										.join(' ');
									toast.error(msg || 'Error al asignar fecha');
								}
							}}>
							Guardar
						</Button>
					</ModalFooterChild>
				</ModalFooter>
			</Modal>
		</Card>
	);
}

export default ListaServiciosOT;
