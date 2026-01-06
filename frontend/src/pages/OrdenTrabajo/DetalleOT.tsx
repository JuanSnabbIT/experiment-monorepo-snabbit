import Input from '@/components/form/Input';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Textarea from '@/components/form/Textarea';
import Validation from '@/components/form/Validation';
import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, { SubheaderLeft, SubheaderRight } from '@/components/layouts/Subheader/Subheader';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import Tooltip from '@/components/ui/Tooltip';
import { PRIORIDAD } from '@/constants/ordentrabajo.constant';
import ApiService from '@/services/ApiService';
import {
	detalleOrdenTrabajoThunk,
	listaHistorialCambiosThunk,
	listarSimpleHistorialThunk,
	listaUsuariosTodaLaEmpresaThunk,
	listaUsuariosTodoElClienteThunk,
	listaVouchersThunk,
	useAppDispatch,
	useAppSelector,
	usuarioEmpresaLogeadoThunk,
	obtenerPersonalizacionThunk,
} from '@/store';
import { selectEmpresasThunk } from '@/store/slices/empresa/empresaSlice';
import dayjs from 'dayjs';
import { useFormik } from 'formik';
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import * as Yup from 'yup';
import Adjuntos from './components/Adjuntos';
import ComprasEnOT from './components/ComprasEnOT';
import DevolucionesOT from './components/DevolucionesOT';
import FotosAdjuntosOT from './components/FotosAdjuntosOT';
import HistorialCambios from './components/HistorialCambios';
import HistorialOT from './components/HistorialOT';
import Insumos from './components/Insumos';
import ListaServiciosOT from './components/ListaServiciosOT';
import ListaSoportesTecnicosOT from './components/ListaSoportesTecnicosOT';

import MarqueeCompletibilidad from './components/MarqueeCompletibilidad';
import RendicionesOT from './components/RendicionesOT';
import RetroalimentacionesOT from './components/RetroalimentacionesOT';
import UsuariosVinculadosOT from './components/UsuariosVinculadosOT';
import CerrarOT from './modals/CerrarOT';
import CompletarOT from './modals/CompletarOT';
import FacturarOT from './modals/FacturarOT';

const DetalleOT = () => {
	const dispatch = useAppDispatch();
	const navigate = useNavigate();
	const { id } = useParams<{ id: string }>();
	const { personalizacionUsuario, access } = useAppSelector((state) => state.auth);
	const { detalleOrdenTrabajo, listaHistorialCambios } = useAppSelector(
		(state) => state.ordenTrabajo,
	);
	const { usuarioEmpresaLogeado, listaUsuariosTodoElCliente, listaUsuariosTodaLaEmpresa } =
		useAppSelector((state) => state.empresa);
	const { selectEmpresas } = useAppSelector((state) => state.empresa);
	const { userMe } = useAppSelector((state) => state.auth);
	const [isEditing, setIsEditing] = useState<boolean>(false);
	const [activeComponent, setActiveComponent] = useState<string>('Trabajos en OT');
	const renderDetalleListado = (
		detalle?: string | null,
		emptyLabel: string = 'Sin informacion',
	) => {
		if (!detalle) {
			return <p className='text-sm text-gray-500'>{emptyLabel}</p>;
		}

		const partes = detalle
			.split(';')
			.map((item) => item.trim())
			.filter(Boolean);

		if (partes.length === 0) {
			return <p className='text-sm text-gray-500'>{emptyLabel}</p>;
		}

		return (
			<ul className='ml-4 list-disc space-y-1 text-sm'>
				{partes.map((item, index) => (
					<li key={`${item}-${index}`}>{item}</li>
				))}
			</ul>
		);
	};

	useEffect(() => {
		if (personalizacionUsuario && personalizacionUsuario.empresa) {
			dispatch(detalleOrdenTrabajoThunk({ id_ordenTrabajo: id }));
			dispatch(listaHistorialCambiosThunk({ id_orden: id }));
		}
	}, [personalizacionUsuario, id, dispatch]);

	useEffect(() => {
		if (detalleOrdenTrabajo) {
			// Ajustar el tab activo según el tipo de servicio
			if (detalleOrdenTrabajo.tipo_servicio === 'general') {
				setActiveComponent('Servicios Generales');
			} else {
				setActiveComponent('Trabajos en OT');
				// Alinear empresa activa con la empresa de la OT si difiere
				(async () => {
					try {
						// Asegurar que las empresas y sus sucursales estén cargadas
						if (!selectEmpresas || selectEmpresas.length === 0) {
							await dispatch(selectEmpresasThunk());
						}

						// Buscar una sucursal de la empresa de la OT
						const grupoEmpresa = (selectEmpresas || []).find(
							(emp) => emp.id?.toString() === detalleOrdenTrabajo.empresa?.toString(),
						);

						const sucursalIdTarget = grupoEmpresa?.sucursales?.[0]?.id;
						const sucursalActual = personalizacionUsuario?.sucursal_principal;

						// Si la sucursal activa no pertenece a la empresa de la OT, actualizar preferencia
						if (sucursalIdTarget && sucursalIdTarget !== sucursalActual) {
							await ApiService.fetchData({
								url: `/api/personalizacion-usuarios/${personalizacionUsuario?.id}/`,
								method: 'patch',
								headers: { 'Content-Type': 'application/json' },
								data: JSON.stringify({ sucursal_principal: sucursalIdTarget }),
							});
							await dispatch(obtenerPersonalizacionThunk({ access }));
						}

						// Cargar vouchers de devolución para mostrar botones "Ver devoluciones"
						await dispatch(
							listaVouchersThunk({ orden_trabajo: detalleOrdenTrabajo.id, page: 1 }),
						);
					} catch (e) {
						// Si algo falla, al menos intenta cargar vouchers sin cambiar sucursal
						await dispatch(
							listaVouchersThunk({ orden_trabajo: detalleOrdenTrabajo.id, page: 1 }),
						);
					}
				})();
			}
		}
	}, [detalleOrdenTrabajo?.id, dispatch, selectEmpresas, personalizacionUsuario?.sucursal_principal, access]);

	useEffect(() => {
		if (isEditing && detalleOrdenTrabajo) {
			dispatch(listaUsuariosTodaLaEmpresaThunk({ id_empresa: detalleOrdenTrabajo.empresa }));
			dispatch(listaUsuariosTodoElClienteThunk({ id_empresa: detalleOrdenTrabajo.cliente }));
		}
	}, [isEditing, detalleOrdenTrabajo]);

	useEffect(() => {
		if (!usuarioEmpresaLogeado) {
			dispatch(usuarioEmpresaLogeadoThunk({ id_usuario: userMe?.pk }));
		}
	}, [usuarioEmpresaLogeado]);

	const formik = useFormik({
		enableReinitialize: true,
		initialValues: {
			fecha_inicio_ot: '',
			fecha_finalizacion_ot: '',
			prioridad: '',
			notas_internas: '',
			solicitante_empresa: '',
			responsable_empresa: '',
			// Historial
			estado_anterior: '',
			estado_actual: '',
			comentario: '',
		},
		validationSchema: Yup.object().shape({
			fecha_inicio_ot: Yup.string().required('Requerido').nonNullable('Requerido'),
			fecha_finalizacion_ot: Yup.string().required('Requerido').nonNullable('Requerido'),
			prioridad: Yup.string().required('Requerido').nonNullable('Requerido'),
			notas_internas: Yup.string().notRequired().nullable(),
			solicitante_empresa: Yup.string().notRequired().nullable(),
			responsable_empresa: Yup.string().notRequired().nullable(),
		}),
		onSubmit: async (values) => {
			try {
				if (usuarioEmpresaLogeado) {
					const clienteSolicitanteId = values.solicitante_empresa
						? Number(values.solicitante_empresa)
						: null;
					const responsableId = values.responsable_empresa
						? Number(values.responsable_empresa)
						: null;
					const hasManualHistorial =
						Boolean(values.estado_actual?.trim()) ||
						Boolean(values.comentario?.trim());

					if (hasManualHistorial) {
						const responseHistorial = await ApiService.fetchData({
							url: `/api/ordenes-de-trabajo/${detalleOrdenTrabajo?.id}/historial-cambios/`,
							method: 'post',
							headers: { 'Content-Type': 'application/json' },
							data: JSON.stringify({
								estado_anterior: values.estado_anterior,
								estado_actual: values.estado_actual,
								comentario: values.comentario,
								usuario: usuarioEmpresaLogeado.id,
								orden: detalleOrdenTrabajo?.id,
							}),
						});
						if (!responseHistorial.data) {
							toast.error('No se pudo crear el historial', {
								toastId: 'No se pudo crear el historial',
							});
							return;
						}
					}

					const updatePayload = {
						fecha_inicio_ot: values.fecha_inicio_ot || null,
						fecha_finalizacion_ot: values.fecha_finalizacion_ot || null,
						prioridad: values.prioridad,
						notas_internas: values.notas_internas,
						cliente_solicitante: clienteSolicitanteId,
						tecnico_responsable_ot: responsableId,
					};
					const response = await ApiService.fetchData({
						url: `/api/ordenes-de-trabajo/${detalleOrdenTrabajo?.id}/`,
						method: 'patch',
						headers: { 'Content-Type': 'application/json' },
						data: JSON.stringify(updatePayload),
					});
					if (response.data) {
						toast.success('Orden de trabajo actualizada', { autoClose: 1000 });
						dispatch(detalleOrdenTrabajoThunk({ id_ordenTrabajo: id }));
						dispatch(listaHistorialCambiosThunk({ id_orden: detalleOrdenTrabajo?.id }));
						dispatch(
							listarSimpleHistorialThunk({ id: detalleOrdenTrabajo?.id || 0 }),
						);
						setIsEditing(false);
						formik.resetForm();
					}
				}
			} catch (error: any) {
				toast.error(error.response.data || 'Error al actualizar la Orden de Trabajo', {
					toastId: 'Error al actualizar la orden de trabajo',
				});
			}
		},
	});

	useEffect(() => {
		if (detalleOrdenTrabajo && isEditing) {
			formik.setValues({
				fecha_inicio_ot: detalleOrdenTrabajo.fecha_inicio_ot || '',
				fecha_finalizacion_ot: detalleOrdenTrabajo.fecha_finalizacion_ot || '',
				prioridad: detalleOrdenTrabajo.prioridad,
				notas_internas: detalleOrdenTrabajo.notas_internas || '',
				solicitante_empresa:
					detalleOrdenTrabajo.cliente_solicitante?.toString() ||
					detalleOrdenTrabajo.solicitante_empresa?.toString() ||
					'',
				responsable_empresa:
					detalleOrdenTrabajo.tecnico_responsable_ot?.toString() ||
					detalleOrdenTrabajo.responsable_empresa?.toString() ||
					'',
				comentario: '',
				estado_actual: '',
				estado_anterior: '',
			});
			if (listaHistorialCambios.length === 0) {
				formik.setFieldValue('estado_anterior', detalleOrdenTrabajo.descripcion);
			} else if (listaHistorialCambios.length > 0) {
				formik.setFieldValue('estado_anterior', listaHistorialCambios[0].estado_actual);
			}
		}
	}, [detalleOrdenTrabajo, isEditing, listaHistorialCambios]);

	return (
		<PageWrapper isProtectedRoute={true} name='Detalle OT' title='Detalle OT'>
			<Subheader>
				<SubheaderLeft>
					<Badge className='text-xl'>
						Orden de Trabajo N°{detalleOrdenTrabajo?.id} del{' '}
						{dayjs(detalleOrdenTrabajo?.fecha_creacion).format('DD/MM/YYYY')}
					</Badge>
				</SubheaderLeft>
				<SubheaderRight>
					{detalleOrdenTrabajo && (
						<div className='flex gap-2'>
							{detalleOrdenTrabajo.estado === 'completada' && detalleOrdenTrabajo.rendicion_asociada_id && (
								<Tooltip text='Ver Rendición Asociada'>
									<Button 
										variant='solid' 
										color='violet'
										icon='HeroEye'
										onClick={() => navigate(`/rendicion/detalle-rendicion/${detalleOrdenTrabajo.rendicion_asociada_id}`)}
									/>
								</Tooltip>
							)}
							{detalleOrdenTrabajo.estado === 'en_proceso' && <CompletarOT />}
							{detalleOrdenTrabajo.estado === 'completada' && <CerrarOT />}
							{detalleOrdenTrabajo.estado === 'cerrada' && <FacturarOT />}
						</div>
					)}
				</SubheaderRight>
			</Subheader>
			<Container className='h-full w-full'>
				<div className='grid grid-cols-1 gap-4'>
					{detalleOrdenTrabajo && detalleOrdenTrabajo.estado === 'en_proceso' && (
						<MarqueeCompletibilidad />
					)}
					<Card>
						<CardHeader>
							<CardHeaderChild>
								<Badge className='text-xl'>Datos de Orden de Trabajo</Badge>
							</CardHeaderChild>
							<CardHeaderChild>
								<div className='flex items-center justify-end'>
									{isEditing ? (
										<div className='flex gap-2'>
											<Tooltip text='Guardar Cambios'>
												<Button
													variant='solid'
													color='emerald'
													icon='HeroCheck'
													onClick={() => formik.handleSubmit()}
												/>
											</Tooltip>
											<Tooltip text='Cancelar'>
												<Button
													color='red'
													variant='solid'
													onClick={() => {
														setIsEditing(false);
														formik.resetForm();
													}}
													icon='HeroXMark'
												/>
											</Tooltip>
										</div>
									) : (
										detalleOrdenTrabajo &&
										detalleOrdenTrabajo.estado === 'pendiente' && (
											<Tooltip text='Editar'>
												<Button
													variant='solid'
													icon='HeroPencil'
													onClick={() => {
														setIsEditing(true);
													}}
												/>
											</Tooltip>
										)
									)}
								</div>
							</CardHeaderChild>
						</CardHeader>
						<CardBody className='flex flex-col gap-4'>
							<div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
								{isEditing ? (
									<>
										<div className='w-full'>
											<Badge>Empresa</Badge>
											<div className='ml-4'>
												{detalleOrdenTrabajo?.empresa_nombre}
											</div>
										</div>
										<div className='w-full'>
											<Badge>Tipo de Servicio</Badge>
											<div className='ml-4'>
												{detalleOrdenTrabajo?.tipo_servicio_label}
											</div>
										</div>
										<div className='w-full'>
											<Badge>Estado</Badge>
											<div className='ml-4'>
												{detalleOrdenTrabajo?.estado_label}
											</div>
										</div>
										<div className='w-full'>
											<Badge>Cliente</Badge>
											<div className='ml-4'>
												{detalleOrdenTrabajo?.cliente_nombre}
											</div>
										</div>
										<div className='w-full'>
											<Badge>Fecha de Inicio</Badge>
											<Validation
												isValid={formik.isValid}
												isTouched={formik.touched.fecha_inicio_ot}
												invalidFeedback={formik.errors.fecha_inicio_ot}>
												<Input
													name='fecha_inicio_ot'
													id='fecha_inicio_ot'
													type='date'
													onBlur={formik.handleBlur}
													onChange={formik.handleChange}
													value={formik.values.fecha_inicio_ot}
												/>
											</Validation>
										</div>
										<div className='w-full'>
											<Badge>Fecha de Finalización</Badge>
											<Validation
												isValid={formik.isValid}
												isTouched={formik.touched.fecha_finalizacion_ot}
												invalidFeedback={
													formik.errors.fecha_finalizacion_ot
												}>
												<Input
													name='fecha_finalizacion_ot'
													id='fecha_finalizacion_ot'
													type='date'
													onBlur={formik.handleBlur}
													onChange={formik.handleChange}
													value={formik.values.fecha_finalizacion_ot}
												/>
											</Validation>
										</div>
										<div className='w-full'>
											<Badge>Prioridad</Badge>
											<Validation
												isValid={formik.isValid}
												isTouched={formik.touched.prioridad}
												invalidFeedback={formik.errors.prioridad}>
												<SelectReact
													name='prioridad'
													id='prioridad'
													options={PRIORIDAD}
													value={{
														value: formik.values.prioridad,
														label:
															PRIORIDAD.find(
																(val) =>
																	val.value ===
																	formik.values.prioridad,
															)?.label || '',
													}}
													onBlur={formik.handleBlur}
													onChange={(e) => {
														formik.setFieldValue(
															'prioridad',
															(e as TSelectOption).value,
														);
													}}
												/>
											</Validation>
										</div>
										<div className='w-full'>
											<Badge>Responsable</Badge>
											<Validation
												isValid={formik.isValid}
												isTouched={formik.touched.responsable_empresa}
												invalidFeedback={formik.errors.responsable_empresa}>
												<SelectReact
													name='responsable_empresa'
													isClearable={true}
													placeholder='Seleccione un responsable'
													noOptionsMessage={(e) =>
														`No existe ${e.inputValue}`
													}
													options={listaUsuariosTodaLaEmpresa.map(
														(user) => ({
															value: user.id.toString(),
															label: user.nombre_usuario,
														}),
													)}
													onBlur={formik.handleBlur}
													value={{
														value: formik.values.responsable_empresa,
														label:
															listaUsuariosTodaLaEmpresa.find(
																(us) =>
																	us.id.toString() ===
																	formik.values
																		.responsable_empresa,
															)?.nombre_usuario || '',
													}}
													onChange={(e) => {
														if (e) {
															formik.setFieldValue(
																'responsable_empresa',
																(e as TSelectOption).value,
															);
														} else {
															formik.setFieldValue(
																'responsable_empresa',
																'',
															);
														}
													}}
												/>
											</Validation>
										</div>
										<div className='w-full'>
											<Badge>Solicitante</Badge>
											<Validation
												isValid={formik.isValid}
												isTouched={formik.touched.solicitante_empresa}
												invalidFeedback={formik.errors.solicitante_empresa}>
												<SelectReact
													name='solicitante_empresa'
													isClearable={true}
													placeholder='Seleccione a un solicitante'
													noOptionsMessage={(e) =>
														`No existe ${e.inputValue}`
													}
													options={listaUsuariosTodoElCliente.map(
														(user) => ({
															value: user.id.toString(),
															label: user.nombre_usuario,
														}),
													)}
													onBlur={formik.handleBlur}
													value={{
														value: formik.values.solicitante_empresa,
														label:
															listaUsuariosTodoElCliente.find(
																(user) =>
																	user.id.toString() ===
																	formik.values
																		.solicitante_empresa,
															)?.nombre_usuario || '',
													}}
													onChange={(e) => {
														if (e) {
															formik.setFieldValue(
																'solicitante_empresa',
																(e as TSelectOption).value,
															);
														} else {
															formik.setFieldValue(
																'solicitante_empresa',
																'',
															);
														}
													}}
												/>
											</Validation>
										</div>
										<div className='col-span-full'>
											<Badge>Instrucciones OT</Badge>
											<div className='ml-4'>
												{detalleOrdenTrabajo?.descripcion ||
													'Sin Instrucciones OT'}
											</div>
										</div>
										<div className='col-span-full'>
											<Badge>Notas Internas</Badge>
											<Validation
												isValid={formik.isValid}
												isTouched={formik.touched.notas_internas}
												invalidFeedback={formik.errors.notas_internas}>
												<Textarea
													name='notas_internas'
													id='notas_internas'
													onBlur={formik.handleBlur}
													onChange={formik.handleChange}
													value={formik.values.notas_internas}
												/>
											</Validation>
										</div>
									</>
								) : (
									<>
										<div className='w-full'>
											<Badge>Empresa</Badge>
											<div className='ml-4'>
												{detalleOrdenTrabajo?.empresa_nombre}
											</div>
										</div>
										<div className='w-full'>
											<Badge>Tipo de Servicio</Badge>
											<div className='ml-4'>
												{detalleOrdenTrabajo?.tipo_servicio_label}
											</div>
										</div>
										<div className='w-full'>
											<Badge>Estado</Badge>
											<div className='ml-4'>
												{detalleOrdenTrabajo?.estado_label}
											</div>
										</div>
										<div className='w-full'>
											<Badge>Cliente</Badge>
											<div className='ml-4'>
												{detalleOrdenTrabajo?.cliente_nombre}
											</div>
										</div>
										<div className='w-full'>
											<Badge>Fecha de Inicio</Badge>
											<div
												className={`ml-4 ${!detalleOrdenTrabajo?.fecha_inicio_ot ? 'italic text-gray-400' : ''}`}>
												{detalleOrdenTrabajo?.fecha_inicio_ot
													? dayjs(
															detalleOrdenTrabajo?.fecha_inicio_ot,
														).format('DD/MM/YYYY')
													: 'Por confirmar'}
											</div>
										</div>
										<div className='w-full'>
											<Badge>Fecha de Finalización</Badge>
											<div
												className={`ml-4 ${!detalleOrdenTrabajo?.fecha_finalizacion_ot ? 'italic text-gray-400' : ''}`}>
												{detalleOrdenTrabajo?.fecha_finalizacion_ot
													? dayjs(
															detalleOrdenTrabajo?.fecha_finalizacion_ot,
														).format('DD/MM/YYYY')
													: 'Por confirmar'}
											</div>
										</div>
										<div className='w-full'>
											<Badge>Prioridad</Badge>
											<div className='ml-4'>
												{detalleOrdenTrabajo?.prioridad_label}
											</div>
										</div>
										<div className='w-full'>
											<Badge>Responsable</Badge>
											<div
												className={`ml-4 ${!detalleOrdenTrabajo?.nombre_responsable ? 'italic text-gray-400' : ''}`}>
												{detalleOrdenTrabajo?.nombre_responsable ||
													'Por confirmar'}
											</div>
										</div>
										<div className='w-full'>
											<Badge>Solicitante</Badge>
											<div
												className={`ml-4 ${!detalleOrdenTrabajo?.nombre_solicitante ? 'italic text-gray-400' : ''}`}>
												{detalleOrdenTrabajo?.nombre_solicitante ||
													'Por confirmar'}
											</div>
										</div>
										<div className='col-span-full'>
											<Badge>Instrucciones OT</Badge>
											<div className='ml-4'>
												{detalleOrdenTrabajo?.descripcion ||
													'Sin Instrucciones OT'}
											</div>
										</div>
										<div className='col-span-full'>
											<Badge>Notas Internas</Badge>
											<div className='ml-4'>
												{detalleOrdenTrabajo?.notas_internas || 'Sin Notas'}
											</div>
										</div>
									</>
								)}
							</div>
						</CardBody>
					</Card>
					{listaHistorialCambios.length > 0 && (
						<Card>
							<CardHeader>
								<CardHeaderChild>
									<Badge className='text-xl'>
										Nueva Instrucción en OT del{' '}
										{dayjs(
											detalleOrdenTrabajo?.ultimo_historial?.fecha_cambio,
										).format('DD/MM/YYYY')}{' '}
										por {detalleOrdenTrabajo?.ultimo_historial?.nombre_usuario}
									</Badge>
								</CardHeaderChild>
							</CardHeader>
							<CardBody>
								<div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
									{isEditing ? (
										<>
											<div className='w-full'>
												<Badge>Instrucción Inicial</Badge>
												<div className='ml-4'>
													{formik.values.estado_anterior ||
														'Sin Nueva Instrucción'}
												</div>
											</div>
											<div className='w-full'>
												<Badge>Nueva Instrucción</Badge>
												<Validation
													isValid={formik.isValid}
													isTouched={formik.touched.estado_actual}
													invalidFeedback={formik.errors.estado_actual}>
													<Textarea
														name='estado_actual'
														id='estado_actual'
														onBlur={formik.handleBlur}
														onChange={formik.handleChange}
														value={formik.values.estado_actual}
													/>
												</Validation>
											</div>
											<div className='w-full'>
												<Badge>Comentario</Badge>
												<Validation
													isValid={formik.isValid}
													isTouched={formik.touched.comentario}
													invalidFeedback={formik.errors.comentario}>
													<Textarea
														name='comentario'
														id='comentario'
														onBlur={formik.handleBlur}
														onChange={formik.handleChange}
														value={formik.values.comentario}
													/>
												</Validation>
											</div>
										</>
									) : (
										<>
											<div className='w-full'>
												<Badge>Instrucción Inicial</Badge>
												<div className='ml-4'>
													{renderDetalleListado(
														detalleOrdenTrabajo?.ultimo_historial?.estado_anterior,
														'Sin Instrucción Inicial',
														)}
												</div>
											</div>
											<div className='w-full'>
												<Badge>Nueva Instrucción</Badge>
												<div className='ml-4'>
													{renderDetalleListado(
														detalleOrdenTrabajo?.ultimo_historial?.estado_actual,
														'Sin Nueva Instrucción',
														)}
												</div>
											</div>
											<div className='w-full'>
												<Badge>Comentario</Badge>
												<div className='ml-4'>
													{detalleOrdenTrabajo?.ultimo_historial
														?.comentario || 'Sin Comentario'}
												</div>
											</div>
										</>
									)}
								</div>
							</CardBody>
						</Card>
					)}
					<Card>
						<CardBody>
							<div className='flex flex-row gap-4 overflow-auto'>
								{detalleOrdenTrabajo?.tipo_servicio === 'general' ? (
									<Button
										{...(activeComponent === 'Servicios Generales'
											? {
													size: 'sm',
													rounded: 'rounded-full',
													className: 'border',
													isActive: true,
													color: 'blue',
													colorIntensity: '500',
													variant: 'solid',
												}
											: {
													size: 'sm',
													color: 'zinc',
													rounded: 'rounded-full',
													className: 'border',
												})}
										onClick={() => {
											setActiveComponent('Servicios Generales');
										}}>
										Servicios Generales
									</Button>
								) : (
									<Button
										{...(activeComponent === 'Trabajos en OT'
											? {
													size: 'sm',
													rounded: 'rounded-full',
													className: 'border',
													isActive: true,
													color: 'blue',
													colorIntensity: '500',
													variant: 'solid',
												}
											: {
													size: 'sm',
													color: 'zinc',
													rounded: 'rounded-full',
													className: 'border',
												})}
										onClick={() => {
											setActiveComponent('Trabajos en OT');
										}}>
										Trabajos en OT
									</Button>
								)}
								<Button
									{...(activeComponent === 'Compras'
										? {
												size: 'sm',
												rounded: 'rounded-full',
												className: 'border',
												isActive: true,
												color: 'blue',
												colorIntensity: '500',
												variant: 'solid',
											}
										: {
												size: 'sm',
												color: 'zinc',
												rounded: 'rounded-full',
												className: 'border',
											})}
									onClick={() => {
										setActiveComponent('Compras');
									}}>
									Compras
								</Button>
								<Button
									{...(activeComponent === 'Adjuntos'
										? {
												size: 'sm',
												rounded: 'rounded-full',
												className: 'border',
												isActive: true,
												color: 'blue',
												colorIntensity: '500',
												variant: 'solid',
											}
										: {
												size: 'sm',
												color: 'zinc',
												rounded: 'rounded-full',
												className: 'border',
											})}
									onClick={() => {
										setActiveComponent('Adjuntos');
									}}>
									Adjuntos
								</Button>
								<Button
									{...(activeComponent === 'Historial de cambios'
										? {
												size: 'sm',
												rounded: 'rounded-full',
												className: 'border',
												isActive: true,
												color: 'blue',
												colorIntensity: '500',
												variant: 'solid',
											}
										: {
												size: 'sm',
												color: 'zinc',
												rounded: 'rounded-full',
												className: 'border',
											})}
									onClick={() => {
										setActiveComponent('Historial de cambios');
									}}>
									Historial de cambios
								</Button>
								<Button
									{...(activeComponent === 'Insumos'
										? {
												size: 'sm',
												rounded: 'rounded-full',
												className: 'border',
												isActive: true,
												color: 'blue',
												colorIntensity: '500',
												variant: 'solid',
											}
										: {
												size: 'sm',
												color: 'zinc',
												rounded: 'rounded-full',
												className: 'border',
											})}
									onClick={() => {
										setActiveComponent('Insumos');
									}}>
									Insumos
								</Button>
								<Button
									{...(activeComponent === 'Historial OT'
										? {
												size: 'sm',
												rounded: 'rounded-full',
												className: 'border',
												isActive: true,
												color: 'blue',
												colorIntensity: '500',
												variant: 'solid',
											}
										: {
												size: 'sm',
												color: 'zinc',
												rounded: 'rounded-full',
												className: 'border',
											})}
									onClick={() => {
										setActiveComponent('Historial OT');
									}}>
									Historial OT
								</Button>
								<Button
									{...(activeComponent === 'Fotos'
										? {
												size: 'sm',
												rounded: 'rounded-full',
												className: 'border',
												isActive: true,
												color: 'blue',
												colorIntensity: '500',
												variant: 'solid',
											}
										: {
												size: 'sm',
												color: 'zinc',
												rounded: 'rounded-full',
												className: 'border',
											})}
									onClick={() => {
										setActiveComponent('Fotos');
									}}>
									Fotos
								</Button>
								<Button
									{...(activeComponent === 'Usuarios'
										? {
												size: 'sm',
												rounded: 'rounded-full',
												className: 'border',
												isActive: true,
												color: 'blue',
												colorIntensity: '500',
												variant: 'solid',
											}
										: {
												size: 'sm',
												color: 'zinc',
												rounded: 'rounded-full',
												className: 'border',
											})}
									onClick={() => {
										setActiveComponent('Usuarios');
									}}>
									Usuarios
								</Button>
								<Button
									{...(activeComponent === 'Retroalimentaciones'
										? {
												size: 'sm',
												rounded: 'rounded-full',
												className: 'border',
												isActive: true,
												color: 'blue',
												colorIntensity: '500',
												variant: 'solid',
											}
										: {
												size: 'sm',
												color: 'zinc',
												rounded: 'rounded-full',
												className: 'border',
											})}
									onClick={() => {
										setActiveComponent('Retroalimentaciones');
									}}>
									Retroalimentaciones
								</Button>

								<Button
									{...(activeComponent === 'Rendiciones'
										? {
												size: 'sm',
												rounded: 'rounded-full',
												className: 'border',
												isActive: true,
												color: 'blue',
												colorIntensity: '500',
												variant: 'solid',
											}
										: {
												size: 'sm',
												color: 'zinc',
												rounded: 'rounded-full',
												className: 'border',
											})}
									onClick={() => {
										setActiveComponent('Rendiciones');
									}}>
									Rendiciones
								</Button>
								<Button
									{...(activeComponent === 'Devoluciones'
										? {
												size: 'sm',
												rounded: 'rounded-full',
												className: 'border',
												isActive: true,
												color: 'blue',
												colorIntensity: '500',
												variant: 'solid',
											}
										: {
												size: 'sm',
												color: 'zinc',
												rounded: 'rounded-full',
												className: 'border',
											})}
									onClick={() => {
										setActiveComponent('Devoluciones');
									}}>
									Devoluciones
								</Button>
							</div>
						</CardBody>
					</Card>
					{activeComponent === 'Trabajos en OT' && <ListaSoportesTecnicosOT />}
					{activeComponent === 'Servicios Generales' && <ListaServiciosOT />}
					{activeComponent === 'Compras' && <ComprasEnOT />}{' '}
					{activeComponent === 'Adjuntos' && (
						<Adjuntos ordenId={detalleOrdenTrabajo?.id} />
					)}
					{activeComponent === 'Historial de cambios' && (
						<HistorialCambios ordenId={detalleOrdenTrabajo?.id} />
					)}
					{activeComponent === 'Insumos' && <Insumos />}
					{activeComponent === 'Historial OT' && (
						<HistorialOT ordenId={detalleOrdenTrabajo?.id} />
					)}
					{activeComponent === 'Fotos' && <FotosAdjuntosOT />}
					{activeComponent === 'Usuarios' && <UsuariosVinculadosOT />}
					{activeComponent === 'Retroalimentaciones' && <RetroalimentacionesOT />}
					{activeComponent === 'Rendiciones' && <RendicionesOT />}
					{activeComponent === 'Devoluciones' && (
						<DevolucionesOT ordenId={detalleOrdenTrabajo?.id} />
					)}
				</div>
			</Container>
		</PageWrapper>
	);
};

export default DetalleOT;
