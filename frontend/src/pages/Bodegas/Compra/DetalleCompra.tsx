import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Textarea from '@/components/form/Textarea';
import Validation from '@/components/form/Validation';
import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, { SubheaderLeft, SubheaderRight } from '@/components/layouts/Subheader/Subheader';
import ConfirmarEliminar from '@/components/modals/ConfirmarEliminar';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import Tooltip from '@/components/ui/Tooltip';
import ApiService from '@/services/ApiService';
import {
    LIMPIAR_DETALLE_COMPRA,
    LIMPIAR_ITEMS_COMPRA,
    detalleCompraThunk,
    listaBodegasThunk,
    useAppDispatch,
    useAppSelector,
} from '@/store';
import { getImageSize } from '@/utils/getImageSize';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { useFormik } from 'formik';
import { useEffect, useState } from 'react';
import { Gallery } from 'react-grid-gallery';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import Lightbox from 'yet-another-react-lightbox';
import 'yet-another-react-lightbox/styles.css';
import * as Yup from 'yup';
import TablaItemsCompra from './components/TablaItemsCompra';
import AgregarArchivoCompra from './modals/AgregarArchivoCompra';
import AgregarImagenCompra from './modals/AgregarImagenCompra';

function DetalleCompra() {
	const dispatch = useAppDispatch();
	const navigate = useNavigate();
	const { id } = useParams();
	const { detalleCompra: detalleCompraState, listaBodegas, listaItemsCompra } = useAppSelector(
		(state) => state.bodega,
	);
	const detalleCompra =
		detalleCompraState && detalleCompraState.id.toString() === id
			? detalleCompraState
			: undefined;
	const [editando, setEditando] = useState<boolean>(false);
	const [activeComponent, setActiveComponent] = useState<string>('Items');
	const [completando, setCompletando] = useState<boolean>(false);
	const [bodegaDestino, setBodegaDestino] = useState<string>('');
	const [imagenesConTamanio, setImagenesConTamanio] = useState<
		{ src: string; height: number; width: number }[]
	>([]);
	const [index, setIndex] = useState<number>(-1);

	useEffect(() => {
		if (activeComponent === 'Imagenes' || activeComponent === 'Archivos') {
			dispatch(detalleCompraThunk({ id_compra: id }));
		}
	}, [activeComponent, dispatch, id]);

	useEffect(() => {
		dispatch(LIMPIAR_DETALLE_COMPRA());
		dispatch(LIMPIAR_ITEMS_COMPRA());
		dispatch(detalleCompraThunk({ id_compra: id }));
		dispatch(listaBodegasThunk());
	}, [id, dispatch]);

	useEffect(() => {
		if (editando && detalleCompra) {
			formik.setValues({
				observaciones: detalleCompra.observaciones,
			});
		}
		if (!editando) {
			formik.resetForm();
		}
	}, [editando, detalleCompra]);

	useEffect(() => {
		if (!completando) {
			setBodegaDestino('');
		}
	}, [completando]);

	useEffect(() => {
		async function tamanioImagenes() {
			const imagenes: { src: string; height: number; width: number }[] = [];
			detalleCompra?.archivos
				.filter((archivo) => archivo.tipo === '2')
				.forEach(async (archivo) => {
					const size = await getImageSize(archivo.imagen || '');
					imagenes.push({
						src: archivo.imagen || '',
						height: size.height,
						width: size.width,
					});
				});
			setImagenesConTamanio(imagenes);
		}
		if (
			detalleCompra &&
			detalleCompra.archivos.length > 0 &&
			detalleCompra.archivos.filter((archivo) => archivo.tipo === '2').length > 0
		) {
			tamanioImagenes();
		}
	}, [detalleCompra]);

	const formik = useFormik<{
		observaciones: string;
	}>({
		enableReinitialize: true,
		initialValues: {
			observaciones: '',
		},
		validationSchema: Yup.object().shape({
			observaciones: Yup.string().nullable().notRequired(),
		}),
		onSubmit: async (values) => {
			try {
				const response = await ApiService.fetchData({
					url: `/api/compras/${detalleCompra?.id}/`,
					method: 'patch',
					headers: { 'Content-Type': 'application/json' },
					data: JSON.stringify({
						...values,
					}),
				});
				if (response.data) {
					setEditando(false);
					dispatch(detalleCompraThunk({ id_compra: detalleCompra?.id }));
					toast.success('Compra editada', { autoClose: 1000 });
				}
			} catch (error: any) {
				toast.error(error.response.data || 'Error al editar la compra', {
					toastId: 'Error al editar la compra',
				});
			}
		},
	});

	const requiereBodegaDestino = !detalleCompra?.orden_trabajo;
	const itemsInvalidos = listaItemsCompra.some(
		(item) => item.cantidad <= 0 || item.precio <= 0,
	);
	const completarDeshabilitado = itemsInvalidos || (requiereBodegaDestino && !bodegaDestino);

	return (
		<PageWrapper isProtectedRoute={true} name='Detalle Compra' title='Detalle Compra'>
			<Subheader>
				<SubheaderLeft>
					<Badge className='text-xl'>Detalle Compra</Badge>
				</SubheaderLeft>
				<SubheaderRight>
					{detalleCompra &&
						detalleCompra.estado === '-' &&
						(completando ? (
							<>
								<Tooltip text='Cancelar'>
									<Button
										variant='solid'
										color='red'
										icon='HeroXMark'
										onClick={() => {
											setCompletando(false);
										}}
									/>
								</Tooltip>
								<Tooltip text='Completar'>
									<Button
										variant='solid'
										color='emerald'
										icon='DuoDoubleCheck'
										onClick={async () => {
											try {
												const payload = requiereBodegaDestino
													? { bodega: Number(bodegaDestino) }
													: undefined;
												const response = await ApiService.fetchData({
													url: `/api/compras/${detalleCompra.id}/completar/`,
													method: 'post',
													headers: { 'Content-Type': 'application/json' },
													data: payload ? JSON.stringify(payload) : undefined,
												});
												if (response.data) {
													dispatch(detalleCompraThunk({ id_compra: id }));
													setCompletando(false);
												}
											} catch (error: any) {
												toast.error(error.response.data);
											}
										}}
										isDisable={completarDeshabilitado}
									/>
								</Tooltip>
							</>
						) : (
							<Tooltip text='Completar Compra'>
								<Button
									variant='solid'
									color='emerald'
									icon='HeroCheck'
									onClick={() => {
										setCompletando(true);
									}}
								/>
							</Tooltip>
						))}
				</SubheaderRight>
			</Subheader>
			<Container className='h-full w-full'>
				<div className='flex flex-col gap-4'>
					{completando && (
					<Card>
						<CardHeader>
							<Badge className='text-xl'>
								Estas seguro(a) de querer completar la compra?
							</Badge>
						</CardHeader>
						<CardBody>
							{detalleCompra?.orden_trabajo ? (
								<div className='ml-4'>
									Esta compra esta asociada a una OT. Los items se ingresaran al
									sistema cuando se complete la OT y se definan los sobrantes.
								</div>
							) : (
								<div className='flex flex-col gap-3'>
									<div className='ml-4'>
										Selecciona la bodega donde se ingresaran los items.
									</div>
									<Validation
										isValid={!!bodegaDestino}
										isTouched={true}
										invalidFeedback={!bodegaDestino ? 'Debes seleccionar una bodega' : undefined}>
										<SelectReact
											name='bodega_destino'
											placeholder='Seleccione una Bodega'
											onChange={(e) => {
												setBodegaDestino((e as TSelectOption).value);
											}}
											options={listaBodegas.map((bode) => ({
												value: bode.id.toString(),
												label: bode.nombre,
											}))}
											value={
												bodegaDestino
													? {
															value: bodegaDestino,
															label:
																listaBodegas.find(
																	(bode) =>
																		bode.id.toString() ===
																		bodegaDestino,
																)?.nombre || '',
														}
													: undefined
											}
										/>
									</Validation>
								</div>
							)}
						</CardBody>
					</Card>
				)}

					<Card>
						<CardHeader>
							<CardHeaderChild>
								<div className='flex items-center gap-2'>
									<Badge className='text-xl'>Datos</Badge>
									{detalleCompra?.orden_trabajo && (
										<Tooltip text='Ir a la OT vinculada'>
											<Button
												size='sm'
												variant='outline'
												onClick={() => {
													navigate(
														`/orden-trabajo/detalle-orden-trabajo/${detalleCompra.orden_trabajo}`,
													);
												}}>
												OT vinculada
											</Button>
										</Tooltip>
									)}
								</div>
							</CardHeaderChild>
							<CardHeaderChild>
								{detalleCompra &&
									detalleCompra.estado === '-' &&
									(editando ? (
										<>
											<Tooltip text='Guardar'>
												<Button
													variant='solid'
													icon='HeroCheck'
													color='emerald'
													onClick={() => {
														formik.handleSubmit();
													}}
												/>
											</Tooltip>
											<Tooltip text='Cancelar'>
												<Button
													variant='solid'
													icon='HeroXMark'
													color='red'
													onClick={() => {
														setEditando(false);
													}}
												/>
											</Tooltip>
										</>
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
									))}
							</CardHeaderChild>
						</CardHeader>
						<CardBody>
							{detalleCompra ? (
								<div className='grid grid-cols-2 gap-4 md:grid-cols-3'>
									<div>
										<Badge>Código</Badge>
										<div className='ml-4'>{detalleCompra.codigo}</div>
									</div>

									<div>
										<Badge>Origen</Badge>
										<div className='ml-4'>
											{detalleCompra.orden_trabajo
												? `OT #${detalleCompra.orden_trabajo}`
												: 'Independiente'}
										</div>
									</div>

								{/* Fecha de Compra - Para compras rápidas */}
									{detalleCompra.fecha_compra && (
										<div>
											<Badge>Fecha de Compra</Badge>
											<div className='ml-4'>
												{new Date(
													detalleCompra.fecha_compra,
												).toLocaleDateString('es-CL')}
											</div>
										</div>
									)}

									<div>
										<Badge>Creado Por</Badge>
										<div className='ml-4'>
											{detalleCompra.nombre_creado_por}
										</div>
									</div>
									<div>
										<Badge>Estado</Badge>
										<div className='ml-4'>{detalleCompra.estado_label}</div>
									</div>

									<div className='col-span-full'>
										<Badge>Observaciones</Badge>
										{editando ? (
											<Validation
												isValid={formik.isValid}
												isTouched={formik.touched.observaciones}
												invalidFeedback={formik.errors.observaciones}>
												<Textarea
													name='observaciones'
													onChange={formik.handleChange}
													onBlur={formik.handleBlur}
													value={formik.values.observaciones}
												/>
											</Validation>
										) : (
											<div className='ml-4'>
												{detalleCompra.observaciones}
											</div>
										)}
									</div>
								</div>
							) : (
								<div>No se encontró la compra</div>
							)}
						</CardBody>
					</Card>

					<Card>
						<CardBody>
							<div className='flex flex-row gap-4 overflow-auto'>
								<Button
									{...(activeComponent === 'Items'
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
										setActiveComponent('Items');
									}}>
									Items
								</Button>
								<Button
									{...(activeComponent === 'Imagenes'
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
										setActiveComponent('Imagenes');
									}}>
									Imagenes
								</Button>
								<Button
									{...(activeComponent === 'Archivos'
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
										setActiveComponent('Archivos');
									}}>
									Archivos
								</Button>
							</div>
						</CardBody>
					</Card>

					{activeComponent === 'Items' && <TablaItemsCompra />}

					{activeComponent === 'Imagenes' && (
						<Card>
							<CardHeader>
								<CardHeaderChild>
									<Badge className='text-xl'>Imagenes</Badge>
								</CardHeaderChild>
								<CardHeaderChild>
									{detalleCompra && <AgregarImagenCompra />}
								</CardHeaderChild>
							</CardHeader>
							<CardBody>
								<div className='rounded-xl border border-blue-500 p-4'>
									{detalleCompra &&
									detalleCompra.archivos.length > 0 &&
									detalleCompra.archivos.filter((archivo) => archivo.tipo === '2')
										.length > 0 ? (
										<>
											<Gallery
												images={imagenesConTamanio}
												onClick={(index) => {
													setIndex(index);
												}}
												enableImageSelection={false}
												thumbnailImageComponent={(image) => (
													<div
														className='relative h-full w-full bg-cover bg-center'
														style={{
															backgroundImage: `url(${detalleCompra.archivos.filter((archivo) => archivo.tipo === '2')[image.index].imagen})`,
														}}>
														<div className='absolute inset-0 bg-black opacity-30'></div>
														<div className='absolute left-0 top-0 m-2 rounded bg-black bg-opacity-60 p-2 text-white'>
															<p className='font-bold'>
																{
																	detalleCompra.archivos.filter(
																		(archivo) =>
																			archivo.tipo === '2',
																	)[image.index].nombre_creado_por
																}
																,{' '}
																{dayjs(
																	detalleCompra.archivos.filter(
																		(archivo) =>
																			archivo.tipo === '2',
																	)[image.index].fecha_creacion,
																).format('DD/MM/YYYY')}
															</p>
															<p className='mt-1'>
																{
																	detalleCompra.archivos.filter(
																		(archivo) =>
																			archivo.tipo === '2',
																	)[image.index].opcion_label
																}
															</p>
														</div>
													</div>
												)}
											/>
											<Lightbox
												slides={detalleCompra.archivos
													.filter((archivo) => archivo.tipo === '2')
													.map((archivo) => ({
														src: archivo.imagen || '',
													}))}
												open={index >= 0}
												index={index}
												close={() => setIndex(-1)}
											/>
										</>
									) : (
										<div>Sin Imagenes</div>
									)}
								</div>
							</CardBody>
						</Card>
					)}

					{activeComponent === 'Archivos' && (
						<Card>
							<CardHeader>
								<CardHeaderChild>
									<Badge className='text-xl'>Archivos</Badge>
								</CardHeaderChild>
								<CardHeaderChild>
									{detalleCompra && (
										<AgregarArchivoCompra compra={detalleCompra} />
									)}
								</CardHeaderChild>
							</CardHeader>
							<CardBody>
								<div className='flex flex-col gap-4'>
									{detalleCompra &&
									detalleCompra.archivos.length > 0 &&
									detalleCompra.archivos.filter((archivo) => archivo.tipo === '1')
										.length > 0 ? (
										detalleCompra.archivos
											.filter((archivo) => archivo.tipo === '1')
											.map((archivo, index) => (
												<Tooltip
													text={`
                                            Creado por: ${archivo.nombre_creado_por} el ${dayjs(archivo.fecha_creacion).locale('es').format('dddd D [de] MMMM [de] YYYY [a las] HH:mm')}
                                            Observaciones: ${archivo.observaciones}
                                        `}
													key={index}>
													<div className='grid grid-cols-12 gap-2 rounded-xl border border-blue-500 p-4'>
														<Badge className='col-span-10'>
															{archivo.nombre_archivo}
														</Badge>
														<div className='col-span-2 flex flex-wrap gap-2'>
															<Tooltip text='Descargar'>
																<Button
																	variant='solid'
																	icon='HeroDocumentArrowDown'
																	color='emerald'
																	onClick={() => {
																		window.open(
																			`${archivo.archivo}`,
																			'_blank',
																		);
																	}}></Button>
															</Tooltip>
															<ConfirmarEliminar
																mensaje='¿Esta seguro(a) de querer eliminar el archivo?'
																nombre='Archivo'
																onDispatch={() => {
																	dispatch(
																		detalleCompraThunk({
																			id_compra:
																				detalleCompra.id,
																		}),
																	);
																}}
																peticionUrl={`/api/archivos-compras/${archivo.id}/`}></ConfirmarEliminar>
														</div>
													</div>
												</Tooltip>
											))
									) : (
										<div className='rounded-xl border border-blue-500 p-4'>
											Sin Archivos
										</div>
									)}
								</div>
							</CardBody>
						</Card>
					)}
				</div>
			</Container>
		</PageWrapper>
	);
}

export default DetalleCompra;
