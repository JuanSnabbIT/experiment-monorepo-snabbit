import Input from '@/components/form/Input';
import SelectReact from '@/components/form/SelectReact';
import Icon from '@/components/icon/Icon';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal, {
    ModalBody,
    ModalFooter,
    ModalFooterChild,
    ModalHeader,
} from '@/components/ui/Modal';
import Tooltip from '@/components/ui/Tooltip';
import type { IBodega, ICompra, IItemEnCompra, IItemGuiaSalida, IVoucherDevolucion } from '@/interface/bodega.interface';
import ApiService from '@/services/ApiService';
import {
    checkCompletibilidadOTThunk,
    detalleOrdenTrabajoThunk,
    listaSoportesTecnicosThunk,
    listaVouchersThunk,
    useAppDispatch,
    useAppSelector,
} from '@/store';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';

type CompraItemDevolucion = {
	compraId: number;
	itemId: number;
	nombre: string;
	cantidad_total: number;
	cantidad_a_devolver: number;
	seleccionado: boolean;
};

type GuiaItemDevolucion = {
	guiaId: number;
	itemId: number;
	nombre: string;
	cantidad_total: number;
	cantidad_disponible: number;
	cantidad_a_devolver: number;
	seleccionado: boolean;
};

function CompletarOT() {
	const dispatch = useAppDispatch();
	const { detalleOrdenTrabajo, checkCompletibilidadOT, listaSoportesTecnicos } = useAppSelector(
		(state) => state.ordenTrabajo,
	);
	const [isOpen, setIsOpen] = useState<boolean>(false);
	const [tieneCompras, setTieneCompras] = useState<boolean>(false);
	const [tieneGuiasParciales, setTieneGuiasParciales] = useState<boolean>(false);
	const [cargandoInsumos, setCargandoInsumos] = useState<boolean>(false);
	const [todosItemsCompradosUsados, setTodosItemsCompradosUsados] = useState<boolean>(true);
	const [procesando, setProcesando] = useState<boolean>(false);
	const [comprasItems, setComprasItems] = useState<CompraItemDevolucion[]>([]);
	const [guiasItems, setGuiasItems] = useState<GuiaItemDevolucion[]>([]);
	const [listaBodegas, setListaBodegas] = useState<IBodega[]>([]);
	const [bodegaSeleccionada, setBodegaSeleccionada] = useState<number | null>(null);

	useEffect(() => {
		if (detalleOrdenTrabajo && isOpen) {
			dispatch(checkCompletibilidadOTThunk({ id_orden: detalleOrdenTrabajo.id }));
			dispatch(listaSoportesTecnicosThunk({ id_orden: detalleOrdenTrabajo.id }));
			cargarInsumos();
		}
	}, [detalleOrdenTrabajo, isOpen]);

	const cargarInsumos = async () => {
		if (!detalleOrdenTrabajo) return;

		setCargandoInsumos(true);
		try {
			const comprasResponse = await ApiService.fetchData<ICompra[]>({
				url: `/api/compras/?orden_trabajo=${detalleOrdenTrabajo.id}`,
				method: 'get',
			});
			const compras = comprasResponse.data || [];

			const comprasConItems = await Promise.all(
				compras.map(async (compra) => {
					const itemsResponse = await ApiService.fetchData<IItemEnCompra[]>({
						url: `/api/compras/${compra.id}/items-compras/`,
						method: 'get',
					});
					return { compra, items: itemsResponse.data || [] };
				}),
			);

			const itemsCompra: CompraItemDevolucion[] = [];
			comprasConItems.forEach((compraData) => {
				compraData.items.forEach((item) => {
					itemsCompra.push({
						compraId: compraData.compra.id,
						itemId: item.id,
						nombre: item.nombre_item,
						cantidad_total: item.cantidad,
						cantidad_a_devolver: 0,
						seleccionado: false,
					});
				});
			});

			setComprasItems(itemsCompra);
			setTieneCompras(itemsCompra.length > 0);

			const insumosResponse = await ApiService.fetchData({
				url: `/api/ordenes-de-trabajo/${detalleOrdenTrabajo.id}/insumos/?solo_pr=true`,
				method: 'get',
			});
			const insumos = Array.isArray(insumosResponse.data) ? insumosResponse.data : [];
			const guiaIds = Array.from(
				new Set(insumos.map((item) => item?.guia?.id).filter(Boolean)),
			) as number[];

			const guiasConItems = await Promise.all(
				guiaIds.map(async (guiaId) => {
					const itemsResponse = await ApiService.fetchData<IItemGuiaSalida[]>({
						url: `/api/guia-salida/${guiaId}/items-guia/`,
						method: 'get',
					});
					return { guiaId, items: itemsResponse.data || [] };
				}),
			);

			const itemsGuia: GuiaItemDevolucion[] = [];
			guiasConItems.forEach((guiaData) => {
				guiaData.items.forEach((item) => {
					const disponible = item.cantidad_rebajada - item.cantidad_devuelta;
					if (disponible > 0) {
						itemsGuia.push({
							guiaId: guiaData.guiaId,
							itemId: item.id,
							nombre: item.datos_stock?.datos_item?.nombre || 'Item sin nombre',
							cantidad_total: item.cantidad_rebajada,
							cantidad_disponible: disponible,
							cantidad_a_devolver: 0,
							seleccionado: false,
						});
					}
				});
			});

			setGuiasItems(itemsGuia);
			setTieneGuiasParciales(itemsGuia.length > 0);

			const bodegasResponse = await ApiService.fetchData<IBodega[]>({
				url: '/api/bodegas/',
				method: 'get',
			});
			setListaBodegas(bodegasResponse.data || []);
		} catch (error) {
			console.error('Error al cargar insumos:', error);
			setComprasItems([]);
			setGuiasItems([]);
			setTieneCompras(false);
			setTieneGuiasParciales(false);
		} finally {
			setCargandoInsumos(false);
		}
	};

	const finalizarTrabajosEnProceso = async () => {
		if (!detalleOrdenTrabajo) return;
		const soportes = listaSoportesTecnicos || [];
		for (const sop of soportes) {
			if (sop.estado === 'en_proceso' && sop.guia_salida) {
				try {
					await ApiService.fetchData({
						url: `/api/ordenes-de-trabajo/${detalleOrdenTrabajo.id}/soportes-tecnicos/${sop.id}/finalizar-trabajo/`,
						method: 'post',
						headers: { 'Content-Type': 'application/json' },
						data: JSON.stringify({ todos_usados: true, devoluciones: [] }),
					});
				} catch (error: any) {
					const msg =
						error?.response?.data?.detail ||
						`No se pudo finalizar el soporte ${sop.nombre}`;
					throw new Error(msg);
				}
			}
		}
	};

	useEffect(() => {
		if (!isOpen) {
			setTodosItemsCompradosUsados(true);
			setComprasItems([]);
			setGuiasItems([]);
			setBodegaSeleccionada(null);
			setTieneCompras(false);
			setTieneGuiasParciales(false);
		}
	}, [isOpen]);

	const actualizarCompraCantidad = (itemId: number, value: number) => {
		setComprasItems((prev) =>
			prev.map((item) =>
				item.itemId === itemId
					? {
							...item,
							cantidad_a_devolver: Math.max(
								0,
								Math.min(value, item.cantidad_total),
							),
						}
					: item,
			),
		);
	};

	const toggleCompraSeleccion = (itemId: number, seleccionado: boolean) => {
		setComprasItems((prev) =>
			prev.map((item) =>
				item.itemId === itemId
					? {
							...item,
							seleccionado,
							cantidad_a_devolver: seleccionado ? item.cantidad_a_devolver : 0,
						}
					: item,
			),
		);
	};

	const actualizarGuiaCantidad = (itemId: number, value: number) => {
		setGuiasItems((prev) =>
			prev.map((item) =>
				item.itemId === itemId
					? {
							...item,
							cantidad_a_devolver: Math.max(
								0,
								Math.min(value, item.cantidad_disponible),
							),
						}
					: item,
			),
		);
	};

	const toggleGuiaSeleccion = (itemId: number, seleccionado: boolean) => {
		setGuiasItems((prev) =>
			prev.map((item) =>
				item.itemId === itemId
					? {
							...item,
							seleccionado,
							cantidad_a_devolver: seleccionado ? item.cantidad_a_devolver : 0,
						}
					: item,
			),
		);
	};

	const procesarDevoluciones = async () => {
		const devolucionesCompras = comprasItems.filter((item) => item.seleccionado);
		const devolucionesGuias = guiasItems.filter((item) => item.seleccionado);

		if (devolucionesCompras.length === 0 && devolucionesGuias.length === 0) {
			throw new Error('Debes indicar al menos un item para devolver.');
		}

		if (devolucionesCompras.length > 0 && !bodegaSeleccionada) {
			throw new Error('Selecciona una bodega para las devoluciones de compras.');
		}

		const errores: string[] = [];
		devolucionesCompras.forEach((item) => {
			if (item.cantidad_a_devolver <= 0) {
				errores.push(`Item ${item.nombre}: indica una cantidad a devolver.`);
				return;
			}
			if (item.cantidad_a_devolver > item.cantidad_total) {
				errores.push(
					`Item ${item.nombre}: cantidad a devolver excede el total comprado.`,
				);
			}
		});
		devolucionesGuias.forEach((item) => {
			if (item.cantidad_a_devolver <= 0) {
				errores.push(`Item ${item.nombre}: indica una cantidad a devolver.`);
				return;
			}
			if (item.cantidad_a_devolver > item.cantidad_disponible) {
				errores.push(
					`Item ${item.nombre}: cantidad a devolver excede lo disponible.`,
				);
			}
		});

		if (errores.length > 0) {
			throw new Error(errores.join('\n'));
		}

		const devolucionesPorGuia = devolucionesGuias.reduce<
			Record<number, { item_guia_id: number; cantidad_a_devolver: number }[]>
		>((acc, item) => {
			if (!acc[item.guiaId]) {
				acc[item.guiaId] = [];
			}
			acc[item.guiaId].push({
				item_guia_id: item.itemId,
				cantidad_a_devolver: item.cantidad_a_devolver,
			});
			return acc;
		}, {});

		for (const guiaId of Object.keys(devolucionesPorGuia)) {
			await ApiService.fetchData({
				url: `/api/guia-salida/${guiaId}/devolver_a_bodega/`,
				method: 'post',
				headers: { 'Content-Type': 'application/json' },
				data: JSON.stringify({ items: devolucionesPorGuia[Number(guiaId)] }),
			});
		}

		const devolucionesPorCompra = devolucionesCompras.reduce<
			Record<number, { item_en_compra_id: number; cantidad_a_devolver: number }[]>
		>((acc, item) => {
			if (!acc[item.compraId]) {
				acc[item.compraId] = [];
			}
			acc[item.compraId].push({
				item_en_compra_id: item.itemId,
				cantidad_a_devolver: item.cantidad_a_devolver,
			});
			return acc;
		}, {});

		for (const compraId of Object.keys(devolucionesPorCompra)) {
			await ApiService.fetchData({
				url: `/api/compras/${compraId}/devolver-a-bodega/`,
				method: 'post',
				headers: { 'Content-Type': 'application/json' },
				data: JSON.stringify({
					bodega: bodegaSeleccionada,
					items: devolucionesPorCompra[Number(compraId)],
				}),
			});
		}
	};

	const crearVoucherDevolucion = async () => {
		if (!detalleOrdenTrabajo) return;

		try {
			const response = await ApiService.fetchData<IVoucherDevolucion>({
				url: '/api/vouchers-devolucion/',
				method: 'post',
				headers: { 'Content-Type': 'application/json' },
				data: { orden_trabajo: detalleOrdenTrabajo.id } as unknown as Record<string, unknown>,
			});
			const voucher = response.data;
			dispatch(listaVouchersThunk({ orden_trabajo: detalleOrdenTrabajo.id }));
			toast.success(`Voucher ${voucher.numero} generado`, { autoClose: 1200 });
		} catch (error: any) {
			const status = error?.response?.status;
			if (status === 409) {
				dispatch(listaVouchersThunk({ orden_trabajo: detalleOrdenTrabajo.id }));
				return;
			}

			const msg =
				error?.response?.data?.detail ||
				error?.message ||
				'Error al generar voucher de devolución';
			throw new Error(msg);
		}
	};

	const completarOrden = async (finalizarTrabajos: boolean) => {
		if (finalizarTrabajos) {
			await finalizarTrabajosEnProceso();
		}

		const response = await ApiService.fetchData({
			url: `/api/ordenes-trabajo/${detalleOrdenTrabajo?.id}/`,
			method: 'patch',
			headers: { 'Content-Type': 'application/json' },
			data: JSON.stringify({ estado: 'completada' }),
		});
		return response;
	};

	const handleCompletar = async () => {
		if (!detalleOrdenTrabajo) return;

		try {
			setProcesando(true);

			const requiereDevoluciones =
				(!todosItemsCompradosUsados && comprasItems.length > 0) ||
				guiasItems.length > 0;

			if (requiereDevoluciones) {
				await procesarDevoluciones();
				await crearVoucherDevolucion();
				await completarOrden(false);
			} else {
				await completarOrden(true);
			}

			toast.success('Orden de Trabajo actualizada', { autoClose: 1000 });
			dispatch(detalleOrdenTrabajoThunk({ id_ordenTrabajo: detalleOrdenTrabajo?.id }));
			setIsOpen(false);
		} catch (error: any) {
			const msg =
				error?.response?.data?.detail ||
				error?.message ||
				'Error al completar la OT';
			toast.error(msg, { toastId: 'Error al completar la OT' });
		} finally {
			setProcesando(false);
		}
	};

	const tieneDevolucionesCompra = comprasItems.some((item) => item.seleccionado);

	return (
		<>
			<Tooltip text='Cambiar a Completada'>
				<Button
					variant='solid'
					color='amber'
					icon='HeroHandThumbUp'
					onClick={() => {
						setIsOpen(true);
					}}
				/>
			</Tooltip>
			<Modal isOpen={isOpen} setIsOpen={setIsOpen}>
				<ModalHeader>
					<Badge className='text-xl'>Cambiar a Completada</Badge>
				</ModalHeader>
				<ModalBody>
					<div className='flex flex-col gap-4'>
						{checkCompletibilidadOT ? (
							<>
								{checkCompletibilidadOT.se_puede_completar ? (
									<div>
										<div className='mb-2'>
											Al cambiar a Completada no se puede deshacer
										</div>
										{cargandoInsumos && (
											<div className='text-sm text-gray-500'>
												Cargando insumos...
											</div>
										)}
										{!cargandoInsumos && tieneCompras && (
											<div className='rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700'>
												Esta OT tiene compras registradas.
											</div>
										)}
										{!cargandoInsumos && tieneGuiasParciales && (
											<div className='rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700'>
												Esta OT tiene Guias de Salida parcialmente revertidas.
											</div>
										)}
										{tieneCompras && (
											<div className='rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm'>
												<label className='flex items-center gap-2'>
													<input
														type='checkbox'
														checked={todosItemsCompradosUsados}
														onChange={(e) =>
															setTodosItemsCompradosUsados(
																e.target.checked,
															)
														}
													/>
													<span className='font-medium text-amber-700'>
														Confirmo que todos los items comprados fueron
														utilizados
													</span>
												</label>
											</div>
										)}

										{(!todosItemsCompradosUsados || guiasItems.length > 0) && (
											<div className='mt-4 flex flex-col gap-4'>
												{!todosItemsCompradosUsados && comprasItems.length > 0 && (
													<div className='rounded-lg border border-gray-200 bg-gray-50 p-3'>
														<div className='mb-3'>
															<Badge>Items de Compras</Badge>
														</div>
														<div className='mb-3'>
															<Badge>Bodega para devoluciones de compras</Badge>
															<SelectReact
																name='bodega_devolucion'
																options={listaBodegas.map((b) => ({
																	value: String(b.id),
																	label: b.nombre,
																}))}
																value={
																	bodegaSeleccionada
																		? {
																				value: String(bodegaSeleccionada),
																				label:
																					listaBodegas.find(
																						(b) =>
																							b.id === bodegaSeleccionada,
																					)?.nombre || '',
																			}
																		: undefined
																}
																onChange={(option: any) =>
																	setBodegaSeleccionada(
																		Number(option?.value) || null,
																	)
																}
																placeholder='Seleccionar bodega'
															/>
															{tieneDevolucionesCompra &&
																!bodegaSeleccionada && (
																	<div className='mt-1 text-xs text-red-600'>
																		Selecciona una bodega para continuar.
																	</div>
																)}
														</div>
														<div className='grid grid-cols-1 gap-2 text-sm text-gray-500 md:grid-cols-12'>
															<div className='md:col-span-6'>Item</div>
															<div className='md:col-span-2 text-center'>
																Comprado
															</div>
															<div className='md:col-span-2 text-center'>
																Seleccionar
															</div>
															<div className='md:col-span-2 text-center'>
																Devolver
															</div>
														</div>
														<div className='mt-2 flex flex-col gap-2'>
															{comprasItems.map((item) => (
																<div
																	key={`compra-${item.itemId}`}
																	className='grid grid-cols-1 gap-2 rounded border border-gray-200 bg-white p-2 md:grid-cols-12'>
																	<div className='md:col-span-6'>
																		<div className='font-medium'>
																			{item.nombre}
																		</div>
																		<div className='text-xs text-gray-500'>
																			Compra #{item.compraId}
																		</div>
																	</div>
																	<div className='md:col-span-2 text-center'>
																		{item.cantidad_total}
																	</div>
																	<div className='md:col-span-2 flex justify-center'>
																		<input
																			type='checkbox'
																			checked={item.seleccionado}
																			onChange={(e) =>
																				toggleCompraSeleccion(
																					item.itemId,
																					e.target.checked,
																				)
																			}
																		/>
																	</div>
																	<div className='md:col-span-2'>
																		<Input
																			name={`compra_devolver_${item.itemId}`}
																			type='number'
																			min='0'
																			max={item.cantidad_total}
																			value={item.cantidad_a_devolver}
																			disabled={!item.seleccionado}
																			onChange={(e) =>
																				actualizarCompraCantidad(
																					item.itemId,
																					Number(e.target.value),
																				)
																			}
																		/>
																	</div>
																</div>
															))}
														</div>
													</div>
												)}

												{guiasItems.length > 0 && (
													<div className='rounded-lg border border-gray-200 bg-gray-50 p-3'>
														<div className='mb-3'>
															<Badge>Items de Guias de Salida</Badge>
														</div>
														<div className='grid grid-cols-1 gap-2 text-sm text-gray-500 md:grid-cols-12'>
															<div className='md:col-span-6'>Item</div>
															<div className='md:col-span-2 text-center'>
																Disponible
															</div>
															<div className='md:col-span-2 text-center'>
																Seleccionar
															</div>
															<div className='md:col-span-2 text-center'>
																Devolver
															</div>
														</div>
														<div className='mt-2 flex flex-col gap-2'>
															{guiasItems.map((item) => (
																<div
																	key={`guia-${item.itemId}`}
																	className='grid grid-cols-1 gap-2 rounded border border-gray-200 bg-white p-2 md:grid-cols-12'>
																	<div className='md:col-span-6'>
																		<div className='font-medium'>
																			{item.nombre}
																		</div>
																		<div className='text-xs text-gray-500'>
																			Guia #{item.guiaId}
																		</div>
																	</div>
																	<div className='md:col-span-2 text-center'>
																		{item.cantidad_disponible}
																	</div>
																	<div className='md:col-span-2 flex justify-center'>
																		<input
																			type='checkbox'
																			checked={item.seleccionado}
																			onChange={(e) =>
																				toggleGuiaSeleccion(
																					item.itemId,
																					e.target.checked,
																				)
																			}
																		/>
																	</div>
																	<div className='md:col-span-2'>
																		<Input
																			name={`guia_devolver_${item.itemId}`}
																			type='number'
																			min='0'
																			max={item.cantidad_disponible}
																			value={item.cantidad_a_devolver}
																			disabled={!item.seleccionado}
																			onChange={(e) =>
																				actualizarGuiaCantidad(
																					item.itemId,
																					Number(e.target.value),
																				)
																			}
																		/>
																	</div>
																</div>
															))}
														</div>
													</div>
												)}

											</div>
										)}
									</div>
								) : !checkCompletibilidadOT.se_puede_completar &&
								  checkCompletibilidadOT.razones.length > 0 ? (
									checkCompletibilidadOT.razones.map((raz, index) => (
										<div
											key={index}
											className='flex flex-wrap items-center gap-2'>
											<Icon icon='DuoCircle'></Icon>
											{raz}
										</div>
									))
								) : (
									<div></div>
								)}
							</>
						) : (
							'No se pudo obtener si la OT se puede completar'
						)}
					</div>
				</ModalBody>
				<ModalFooter>
					<ModalFooterChild></ModalFooterChild>
					<ModalFooterChild>
						<Button
							color='red'
							onClick={() => {
								setIsOpen(false);
							}}>
							Cancelar
						</Button>
						{checkCompletibilidadOT && checkCompletibilidadOT.se_puede_completar ? (
							<Button
								variant='solid'
								onClick={handleCompletar}
								isDisable={cargandoInsumos || procesando}>
								Completar
							</Button>
						) : (
							<Button variant='solid' isDisable>
								Completar
							</Button>
						)}
					</ModalFooterChild>
				</ModalFooter>
			</Modal>
		</>
	);
}

export default CompletarOT;
