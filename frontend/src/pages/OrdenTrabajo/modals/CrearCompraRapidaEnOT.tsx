import Input from '@/components/form/Input';
import Radio, { RadioGroup } from '@/components/form/Radio';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Textarea from '@/components/form/Textarea';
import Validation from '@/components/form/Validation';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal, {
    ModalBody,
    ModalFooter,
    ModalFooterChild,
    ModalHeader,
} from '@/components/ui/Modal';
import Tooltip from '@/components/ui/Tooltip';
import { IItemEmpresa } from '@/interface/items.interface';
import ApiService from '@/services/ApiService';
import {
    listaCategoriasThunk,
    listaComprasEnOTThunk,
    listaFabricanteThunk,
    listaItemsEmpresaThunk,
    useAppDispatch,
    useAppSelector,
} from '@/store';
import { IDetectedBarcode, Scanner } from '@yudiel/react-qr-scanner';
import { useFormik } from 'formik';
import type { ComponentProps } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import * as Yup from 'yup';

type CompraItemForm = {
	id: string;
	item: string;
	nombre: string;
	cantidad: number;
	precio: number;
	creando: boolean;
	descripcion_corta: string;
	fabricante: string;
	categoria: string;
	comentarios: string;
	codigo_barras: string;
};

type CompraItemDraft = Omit<CompraItemForm, 'id'>;

const crearIdTemporal = () =>
	`tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const nuevoItemDraft = (): CompraItemDraft => ({
	item: '',
	nombre: '',
	cantidad: 1,
	precio: 0,
	creando: false,
	descripcion_corta: '',
	fabricante: '',
	categoria: '',
	comentarios: '',
	codigo_barras: '',
});

const getErrorMessage = (error: unknown): string => {
	if (typeof error === 'object' && error !== null && 'response' in error) {
		const response = (error as { response?: { data?: { error?: string } } }).response;
		if (response?.data?.error) {
			return response.data.error;
		}
	}
	return 'Error al crear la compra';
};

type ScannerFormats = NonNullable<ComponentProps<typeof Scanner>['formats']>;
type ScannerFormat = ScannerFormats[number];

const formatosPermitidos: ScannerFormats = ['ean_13', 'code_128', 'code_93', 'code_39', 'upc_a', 'upc_e'];

function CrearCompraRapidaEnOT() {
	const dispatch = useAppDispatch();
	const { detalleOrdenTrabajo } = useAppSelector((state) => state.ordenTrabajo);
	const { personalizacionUsuario } = useAppSelector((state) => state.auth);
	const { listaItemsEmpresa, listaCategorias, listaFabricante } = useAppSelector(
		(state) => state.item,
	);
	const [isOpen, setIsOpen] = useState<boolean>(false);
	const [items, setItems] = useState<CompraItemForm[]>([]);
	const [guardando, setGuardando] = useState<boolean>(false);
	const [modoIngreso, setModoIngreso] = useState<'seleccionar' | 'escanear'>(
		'seleccionar',
	);
	const [paused, setPaused] = useState<boolean>(false);
	const [hasCameraPermission, setHasCameraPermission] = useState(false);
	const [permissionChecked, setPermissionChecked] = useState(false);
	const [escaneado, setEscaneado] = useState<boolean>(false);
	const [mostrarCamara, setMostrarCamara] = useState<boolean>(true);

	const formik = useFormik({
		enableReinitialize: true,
		initialValues: {
			descripcion: '',
			fecha_compra: new Date().toISOString().split('T')[0],
			notas: '',
		},
		validationSchema: Yup.object().shape({
			descripcion: Yup.string().nonNullable('Requerido').required('Requerido'),
			fecha_compra: Yup.date().required('Requerido'),
			notas: Yup.string().nullable().notRequired(),
		}),
		onSubmit: async (values) => {
			const itemsNuevos = items.filter((item) => item.creando);
			const itemsExistentes = items.filter((item) => !item.creando);
			const empresaId = detalleOrdenTrabajo?.empresa ?? personalizacionUsuario?.empresa;

			if (itemsNuevos.length > 0 && !empresaId) {
				toast.error('No se pudo determinar la empresa para crear items.');
				return;
			}

			try {
				setGuardando(true);
				const observaciones = values.notas
					? `${values.descripcion}\nNotas: ${values.notas}`
					: values.descripcion;
				const response = await ApiService.fetchData<{ id: number }>({
					url: `/api/compras/`,
					method: 'post',
					data: {
						observaciones,
						fecha_compra: values.fecha_compra,
						orden_trabajo: detalleOrdenTrabajo?.id,
					},
				});

				if (response.data) {
					const compraId = response.data.id;
					if (itemsExistentes.length > 0) {
						await Promise.all(
							itemsExistentes.map((item) =>
								ApiService.fetchData({
									url: `/api/compras/${compraId}/items-compras/`,
									method: 'post',
									headers: { 'Content-Type': 'application/json' },
									data: JSON.stringify({
										compra: compraId,
										item: item.item,
										cantidad: item.cantidad,
										precio: item.precio,
									}),
								}),
							),
						);
					}

					if (itemsNuevos.length > 0) {
						await Promise.all(
							itemsNuevos.map((item) =>
								ApiService.fetchData({
									url: `/api/compras/${compraId}/items-compras/crear-item-empresa/`,
									method: 'post',
									headers: { 'Content-Type': 'application/json' },
									data: JSON.stringify({
										imagenes: [],
										cantidad: item.cantidad,
										precio: item.precio,
										item_empresa: {
											nombre: item.nombre,
											descripcion_corta: item.descripcion_corta || null,
											fabricante: item.fabricante || null,
											categoria: item.categoria || null,
											comentarios: item.comentarios || '',
											codigo_barras: item.codigo_barras || '',
											empresa: empresaId,
										},
									}),
								}),
							),
						);
					}

					toast.success('Compra creada correctamente.', {
						autoClose: 2000,
					});
					dispatch(listaComprasEnOTThunk({ id_orden: detalleOrdenTrabajo?.id }));
					setIsOpen(false);
				}
			} catch (error) {
				toast.error(getErrorMessage(error), { toastId: 'Error crear compra' });
			} finally {
				setGuardando(false);
			}
		},
	});

	const itemFormik = useFormik<CompraItemDraft>({
		enableReinitialize: true,
		initialValues: nuevoItemDraft(),
		validationSchema: Yup.object().shape({
			nombre: Yup.string().when(['creando'], ([creando], schema) => {
				return creando ? schema.required('Requerido') : schema.notRequired();
			}),
			item: Yup.string().when(['creando'], ([creando], schema) => {
				return !creando ? schema.required('Requerido') : schema.notRequired();
			}),
			descripcion_corta: Yup.string().notRequired().nullable().max(45, 'Maximo 45'),
			fabricante: Yup.string().notRequired().nullable(),
			categoria: Yup.string().notRequired().nullable(),
			comentarios: Yup.string().notRequired().nullable(),
			codigo_barras: Yup.string().notRequired().nullable(),
			cantidad: Yup.number().required('Requerido').nonNullable('Requerido').min(1, 'Minimo 1'),
			precio: Yup.number().required('Requerido').nonNullable('Requerido').min(1, 'Minimo 1'),
		}),
		onSubmit: (values) => {
			if (!values.creando && values.item) {
				if (items.some((item) => item.item === values.item)) {
					toast.error('El item ya esta agregado.', { toastId: 'item-duplicado' });
					return;
				}
			}

			if (values.creando) {
				const nombreNormalizado = values.nombre.trim().toLowerCase();
				if (
					nombreNormalizado &&
					items.some(
						(item) => item.nombre.trim().toLowerCase() === nombreNormalizado,
					)
				) {
					toast.error('El item ya esta agregado.', { toastId: 'item-duplicado' });
					return;
				}
			}

			const nuevoItem: CompraItemForm = {
				id: crearIdTemporal(),
				item: values.creando ? '' : values.item,
				nombre: values.nombre.trim(),
				cantidad: Number(values.cantidad),
				precio: Number(values.precio),
				creando: values.creando,
				descripcion_corta: values.descripcion_corta,
				fabricante: values.fabricante,
				categoria: values.categoria,
				comentarios: values.comentarios,
				codigo_barras: values.codigo_barras,
			};

			if (!nuevoItem.creando && !nuevoItem.nombre) {
				const nombreItem = listaItemsEmpresa.find(
					(item) => item.id.toString() === nuevoItem.item,
				)?.nombre;
				nuevoItem.nombre = nombreItem || '';
			}

			setItems((prev) => [...prev, nuevoItem]);
			itemFormik.resetForm();
			setEscaneado(false);
			setPaused(false);
			setMostrarCamara(true);
		},
	});

	useEffect(() => {
		if (!isOpen) {
			formik.resetForm();
			setItems([]);
			setGuardando(false);
			itemFormik.resetForm();
			setModoIngreso('seleccionar');
			setPaused(false);
			setEscaneado(false);
			setMostrarCamara(true);
		}
	}, [isOpen]);

	useEffect(() => {
		if (isOpen) {
			const empresaId = detalleOrdenTrabajo?.empresa ?? personalizacionUsuario?.empresa;
			dispatch(listaCategoriasThunk());
			dispatch(listaFabricanteThunk());
			dispatch(listaItemsEmpresaThunk({ id_empresa: empresaId }));
		}
	}, [isOpen, detalleOrdenTrabajo, personalizacionUsuario, dispatch]);

	useEffect(() => {
		async function checkCameraPermission() {
			try {
				const stream = await navigator.mediaDevices.getUserMedia({ video: true });
				stream.getTracks().forEach((track) => track.stop());
				setHasCameraPermission(true);
			} catch (error) {
				console.error('Error al obtener permisos de la camara:', error);
				setHasCameraPermission(false);
			} finally {
				setPermissionChecked(true);
			}
		}

		if (isOpen && modoIngreso === 'escanear') {
			checkCameraPermission();
		}
	}, [isOpen, modoIngreso]);

	const opcionesItems = useMemo(
		() =>
			listaItemsEmpresa
				.filter(
					(item) => !items.some((seleccionado) => seleccionado.item === item.id.toString()),
				)
				.map((item) => ({
					value: item.id.toString(),
					label: item.nombre,
				})),
		[listaItemsEmpresa, items],
	);

	const eliminarItem = (id: string) => {
		setItems((prev) => prev.filter((item) => item.id !== id));
	};

	const manejarEscaneo = async (detectedCodes: IDetectedBarcode[]) => {
		if (escaneado || paused) {
			return;
		}

		if (detectedCodes.length === 0) {
			toast.error('No se detectaron codigos de barras');
			return;
		}

		for (const code of detectedCodes) {
			if (!formatosPermitidos.includes(code.format as ScannerFormat)) {
				toast.error('Formato de codigo de barras no soportado');
				continue;
			}

			setPaused(true);
			try {
				const response = await ApiService.fetchData<IItemEmpresa[]>({
					url: `/api/items-empresa/?codigo_barras=${code.rawValue}`,
					method: 'get',
				});
				const item = response.data?.[0];

				if (!item) {
					toast.error(`Codigo ${code.rawValue} no encontrado`);
					setPaused(false);
					continue;
				}

				if (items.some((existente) => existente.item === item.id.toString())) {
					toast.error('El item ya esta agregado.');
					setPaused(false);
					continue;
				}

				itemFormik.setFieldValue('item', item.id.toString());
				itemFormik.setFieldValue('nombre', item.nombre);
				itemFormik.setFieldValue('creando', false);
				itemFormik.setFieldValue('codigo_barras', item.codigo_barras || '');
				setEscaneado(true);
			} catch (error) {
				toast.error('Error al buscar el item');
			} finally {
				setPaused(false);
			}
			break;
		}
	};

	const fabricanteSeleccionado = itemFormik.values.fabricante
		? {
				value: itemFormik.values.fabricante,
				label:
					listaFabricante.find(
						(fab) => fab.id.toString() === itemFormik.values.fabricante,
					)?.nombre || '',
			}
		: null;

	const categoriaSeleccionada = itemFormik.values.categoria
		? {
				value: itemFormik.values.categoria,
				label:
					listaCategorias.find(
						(cat) => cat.id.toString() === itemFormik.values.categoria,
					)?.nombre || '',
			}
		: null;

	return (
		<>
			<Tooltip text='Crear Compra Rapida'>
				<Button
					variant='solid'
					color='lime'
					icon='HeroPlusCircle'
					onClick={() => {
						setIsOpen(true);
					}}></Button>
			</Tooltip>
			<Modal isOpen={isOpen} setIsOpen={setIsOpen} size='lg'>
				<ModalHeader>
					<Badge className='text-xl'>Crear Compra Rapida</Badge>
				</ModalHeader>
				<ModalBody>
					<div className='flex flex-col gap-4'>
						<div>
							<Badge>Descripcion de la Compra *</Badge>
							<Validation
								isValid={formik.isValid}
								isTouched={formik.touched.descripcion}
								invalidFeedback={formik.errors.descripcion}>
								<Textarea
									name='descripcion'
									placeholder='Ej: Cable HDMI 2m, adaptador USB-C, tornillos M6'
									onChange={formik.handleChange}
									value={formik.values.descripcion}
									onBlur={formik.handleBlur}
									rows={3}
								/>
							</Validation>
						</div>

						<div>
							<Badge>Fecha de Compra *</Badge>
							<Validation
								isValid={formik.isValid}
								isTouched={formik.touched.fecha_compra}
								invalidFeedback={formik.errors.fecha_compra as string}>
								<Input
									type='date'
									name='fecha_compra'
									onChange={formik.handleChange}
									value={formik.values.fecha_compra}
									onBlur={formik.handleBlur}
								/>
							</Validation>
						</div>

						<div>
							<Badge>Notas Adicionales</Badge>
							<Validation
								isValid={formik.isValid}
								isTouched={formik.touched.notas}
								invalidFeedback={formik.errors.notas}>
								<Textarea
									name='notas'
									placeholder='Notas sobre la compra (opcional)'
									onChange={formik.handleChange}
									value={formik.values.notas}
									onBlur={formik.handleBlur}
									rows={2}
								/>
							</Validation>
						</div>

						<div className='rounded border border-gray-200 bg-white p-3'>
							<div className='mb-3 flex items-center justify-between'>
								<Badge>Agregar Item</Badge>
							</div>
							<div className='flex flex-col gap-4'>
								<div>
									<Badge>Modo de Ingreso</Badge>
									<RadioGroup isInline>
										<Radio
											name='modoIngreso'
											label='Seleccionar'
											value='seleccionar'
											selectedValue={modoIngreso}
											onChange={() => {
												setModoIngreso('seleccionar');
											}}
										/>
										<Radio
											name='modoIngreso'
											label='Escanear'
											value='escanear'
											selectedValue={modoIngreso}
											onChange={() => {
												setModoIngreso('escanear');
											}}
										/>
									</RadioGroup>
								</div>

								{modoIngreso === 'seleccionar' && (
									<>
										<div className='grid grid-cols-1 gap-3 md:grid-cols-12'>
											<div className='md:col-span-6'>
											<Badge>Item</Badge>
											<Validation
												isValid={itemFormik.isValid}
												isTouched={
													itemFormik.touched.item || itemFormik.touched.nombre
												}
												invalidFeedback={
													itemFormik.errors.item || itemFormik.errors.nombre
												}>
												<SelectReact
													name='item'
													placeholder='Seleccionar o crear item...'
													isCreatable={true}
													isClearable={true}
													options={opcionesItems}
													formatCreateLabel={(inputValue) =>
														`Crear item "${inputValue}"`
													}
													value={
														itemFormik.values.creando
															? {
																	value: itemFormik.values.nombre,
																	label: itemFormik.values.nombre,
																}
															: itemFormik.values.item
																? {
																		value: itemFormik.values.item,
																		label:
																			listaItemsEmpresa.find(
																				(item) =>
																					item.id.toString() ===
																					itemFormik.values.item,
																			)?.nombre || '',
																	}
																: null
													}
													onCreateOption={(inputValue) => {
														itemFormik.setFieldValue('creando', true);
														itemFormik.setFieldValue('nombre', inputValue);
														itemFormik.setFieldValue('item', '');
														itemFormik.setFieldValue('descripcion_corta', '');
														itemFormik.setFieldValue('fabricante', '');
														itemFormik.setFieldValue('categoria', '');
														itemFormik.setFieldValue('comentarios', '');
														itemFormik.setFieldValue('codigo_barras', '');
													}}
													onChange={(e) => {
														if (e) {
															const selected = e as TSelectOption;
															itemFormik.setFieldValue('creando', false);
															itemFormik.setFieldValue('item', selected.value);
															itemFormik.setFieldValue('nombre', selected.label);
															itemFormik.setFieldValue('descripcion_corta', '');
															itemFormik.setFieldValue('fabricante', '');
															itemFormik.setFieldValue('categoria', '');
															itemFormik.setFieldValue('comentarios', '');
															itemFormik.setFieldValue('codigo_barras', '');
														} else {
															itemFormik.setFieldValue('creando', false);
															itemFormik.setFieldValue('item', '');
															itemFormik.setFieldValue('nombre', '');
														}
													}}
													onBlur={itemFormik.handleBlur}
												/>
											</Validation>
											</div>
											<div className='md:col-span-3'>
												<Badge>Cantidad</Badge>
												<Validation
													isValid={itemFormik.isValid}
													isTouched={itemFormik.touched.cantidad}
													invalidFeedback={itemFormik.errors.cantidad}>
													<Input
														name='cantidad'
														type='number'
														value={itemFormik.values.cantidad}
														onChange={itemFormik.handleChange}
														onBlur={itemFormik.handleBlur}
													/>
												</Validation>
											</div>
											<div className='md:col-span-3'>
												<Badge>Precio</Badge>
												<Validation
													isValid={itemFormik.isValid}
													isTouched={itemFormik.touched.precio}
													invalidFeedback={itemFormik.errors.precio}>
													<Input
														name='precio'
														type='number'
														value={itemFormik.values.precio}
														onChange={itemFormik.handleChange}
														onBlur={itemFormik.handleBlur}
													/>
												</Validation>
											</div>
										</div>

										{itemFormik.values.creando && (
											<>
												<div className='grid grid-cols-1 gap-3 md:grid-cols-12'>
													<div className='md:col-span-6'>
													<Badge>Fabricante</Badge>
													<Validation
														isValid={itemFormik.isValid}
														isTouched={itemFormik.touched.fabricante}
														invalidFeedback={itemFormik.errors.fabricante}>
														<SelectReact
															name='fabricante'
															placeholder='Seleccione un fabricante'
															isClearable
															options={listaFabricante.map((fab) => ({
																value: fab.id.toString(),
																label: fab.nombre,
															}))}
															onChange={(e) => {
																if (e) {
																	itemFormik.setFieldValue(
																		'fabricante',
																		(e as TSelectOption).value,
																	);
																} else {
																	itemFormik.setFieldValue('fabricante', '');
																}
															}}
															onBlur={itemFormik.handleBlur}
															value={fabricanteSeleccionado}
														/>
													</Validation>
													</div>

													<div className='md:col-span-6'>
													<Badge>Categoria</Badge>
													<Validation
														isValid={itemFormik.isValid}
														isTouched={itemFormik.touched.categoria}
														invalidFeedback={itemFormik.errors.categoria}>
														<SelectReact
															name='categoria'
															placeholder='Seleccione una categoria'
															isClearable
															options={listaCategorias.map((cat) => ({
																value: cat.id.toString(),
																label: cat.nombre,
															}))}
															onChange={(e) => {
																if (e) {
																	itemFormik.setFieldValue(
																		'categoria',
																		(e as TSelectOption).value,
																	);
																} else {
																	itemFormik.setFieldValue('categoria', '');
																}
															}}
															onBlur={itemFormik.handleBlur}
															value={categoriaSeleccionada}
														/>
													</Validation>
													</div>
												</div>

												<div className='grid grid-cols-1 gap-3 md:grid-cols-12'>
													<div className='md:col-span-6'>
													<Badge>Descripcion Corta</Badge>
													<Validation
														isValid={itemFormik.isValid}
														isTouched={itemFormik.touched.descripcion_corta}
														invalidFeedback={
															itemFormik.errors.descripcion_corta
														}>
														<Textarea
															name='descripcion_corta'
															onChange={itemFormik.handleChange}
															onBlur={itemFormik.handleBlur}
															value={itemFormik.values.descripcion_corta}
															rows={2}
														/>
													</Validation>
													</div>

													<div className='md:col-span-6'>
													<Badge>Comentarios</Badge>
													<Validation
														isValid={itemFormik.isValid}
														isTouched={itemFormik.touched.comentarios}
														invalidFeedback={itemFormik.errors.comentarios}>
														<Textarea
															name='comentarios'
															onChange={itemFormik.handleChange}
															onBlur={itemFormik.handleBlur}
															value={itemFormik.values.comentarios}
															rows={2}
														/>
													</Validation>
													</div>
												</div>

												<div className='md:w-1/2'>
													<Badge>Codigo de Barras</Badge>
													<Validation
														isValid={itemFormik.isValid}
														isTouched={itemFormik.touched.codigo_barras}
														invalidFeedback={itemFormik.errors.codigo_barras}>
														<Input
															name='codigo_barras'
															onChange={itemFormik.handleChange}
														onBlur={itemFormik.handleBlur}
														value={itemFormik.values.codigo_barras}
													/>
												</Validation>
											</div>
											</>
										)}
									</>
								)}

								{modoIngreso === 'escanear' && (
									<>
										{permissionChecked &&
											hasCameraPermission &&
											!escaneado &&
											mostrarCamara && (
												<Scanner
													onScan={manejarEscaneo}
													onError={(error) => {
														console.error('Error en el escaner:', error);
														toast.error('Error al acceder a la camara.');
													}}
													formats={formatosPermitidos}
													paused={paused}
													allowMultiple={false}
													constraints={{
														facingMode: 'environment',
														width: { ideal: 1280 },
														height: { ideal: 720 },
													}}
													scanDelay={300}
													styles={{
														container: { width: '100%', aspectRatio: '1 / 1' },
														video: { width: '100%', height: '100%', objectFit: 'cover' },
													}}
													components={{ finder: false }}
													classNames={{ container: 'relative' }}
												/>
											)}
										{!mostrarCamara && hasCameraPermission && (
											<Button
												variant='solid'
												onClick={() => setMostrarCamara(true)}>
												Mostrar Escaner
											</Button>
										)}
										{!hasCameraPermission && permissionChecked && (
											<div>No hay permisos de camara</div>
										)}
										{escaneado && (
											<Button
												variant='solid'
												onClick={() => {
													setEscaneado(false);
													itemFormik.resetForm();
													setPaused(false);
												}}>
												Volver a escanear
											</Button>
										)}
										<div className='grid grid-cols-1 gap-3 md:grid-cols-12'>
											<div className='md:col-span-3'>
												<Badge>Cantidad</Badge>
												<Validation
													isValid={itemFormik.isValid}
													isTouched={itemFormik.touched.cantidad}
													invalidFeedback={itemFormik.errors.cantidad}>
													<Input
														name='cantidad'
														type='number'
														value={itemFormik.values.cantidad}
														onChange={itemFormik.handleChange}
														onBlur={itemFormik.handleBlur}
													/>
												</Validation>
											</div>

											<div className='md:col-span-3'>
												<Badge>Precio</Badge>
												<Validation
													isValid={itemFormik.isValid}
													isTouched={itemFormik.touched.precio}
													invalidFeedback={itemFormik.errors.precio}>
													<Input
														name='precio'
														type='number'
														value={itemFormik.values.precio}
														onChange={itemFormik.handleChange}
														onBlur={itemFormik.handleBlur}
													/>
												</Validation>
											</div>
										</div>
									</>
								)}
							</div>
							<div className='mt-4 flex justify-end gap-2'>
								<Button variant='solid' onClick={() => itemFormik.handleSubmit()}>
									{itemFormik.values.creando ? 'Crear y Agregar' : 'Agregar'}
								</Button>
							</div>
						</div>

						<div className='rounded border border-gray-200 bg-gray-50 p-3'>
							<div className='mb-2 flex items-center justify-between'>
								<Badge>Items comprados</Badge>
							</div>
							<div className='grid grid-cols-1 gap-2 text-sm text-gray-500 md:grid-cols-12'>
								<div className='md:col-span-6'>Item</div>
								<div className='md:col-span-2'>Cantidad</div>
								<div className='md:col-span-2'>Precio</div>
								<div className='md:col-span-2'>Total</div>
							</div>
							<div className='mt-2 flex flex-col gap-2'>
								{items.length > 0 ? (
									items.map((item) => (
										<div
											key={item.id}
											className='grid grid-cols-1 gap-2 rounded border border-gray-200 bg-white p-2 md:grid-cols-12'>
											<div className='md:col-span-6'>
												<div className='font-medium'>
													{item.nombre || 'Item sin nombre'}
												</div>
												<div className='text-xs text-gray-500'>
													{item.creando ? 'Nuevo' : 'Existente'}
												</div>
											</div>
											<div className='md:col-span-2'>{item.cantidad}</div>
											<div className='md:col-span-2'>{item.precio}</div>
											<div className='md:col-span-2'>
												<div>{item.cantidad * item.precio}</div>
												<Button color='red' onClick={() => eliminarItem(item.id)}>
													Eliminar
												</Button>
											</div>
										</div>
									))
								) : (
									<div className='text-sm text-gray-500'>Sin items</div>
								)}
							</div>
							<p className='mt-2 text-xs text-gray-500'>
								Si dejas los items vacios, podras agregarlos despues desde el
								detalle de compra.
							</p>
						</div>
					</div>
				</ModalBody>
				<ModalFooter>
					<ModalFooterChild>
						<Button
							variant='outline'
							onClick={() => {
								setIsOpen(false);
							}}>
							Cancelar
						</Button>
						<Button
							variant='solid'
							color='lime'
							isDisable={guardando}
							onClick={() => formik.handleSubmit()}>
							{guardando ? 'Guardando...' : 'Crear Compra'}
						</Button>
					</ModalFooterChild>
				</ModalFooter>
			</Modal>
		</>
	);
}

export default CrearCompraRapidaEnOT;
