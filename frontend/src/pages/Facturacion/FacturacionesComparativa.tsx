import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, { SubheaderLeft, SubheaderRight } from '@/components/layouts/Subheader/Subheader';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardTitle } from '@/components/ui/Card';
import { IOrdenDeTrabajo } from '@/interface/ordenTrabajo.interface';
import ApiService from '@/services/ApiService';
import { useAppDispatch, useAppSelector } from '@/store';
import { listaContratosDeEmpresaYClienteThunk } from '@/store/slices/contratos/contratoSlice';
import { listaOrdenTrabajoThunk } from '@/store/slices/ordenTrabajo/ordenTrabajoSlice';
import dayjs from 'dayjs';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

interface ItemEjecutado {
	id: string;
	nombre: string;
	cantidad: number;
	precio_unitario: number;
	total: number;
	tipo: string;
	ot_id?: number;
	estado?: string;
}

interface ItemPrefactura {
	itemId: string;
	facturar: boolean;
	comentario: string;
	precioAsignado: number | null;
	precioAjustado?: number | null;
}

interface IComparativaData {
	pactado: {
		items: any[];
		total: number;
		moneda: string;
	};
	ejecutado: {
		items: ItemEjecutado[];
		total: number;
		moneda: string;
		resumen?: {
			trabajos: number;
			guias: number;
			rendiciones: number;
		};
	};
	diferencia: number;
}

const FacturacionesComparativa = () => {
	const dispatch = useAppDispatch();
	const navigate = useNavigate();
	const { listaOrdenTrabajo } = useAppSelector((state) => state.ordenTrabajo);
	const { listaContratosDeEmpresaYCliente } = useAppSelector((state) => state.contrato);

	// Estado para selección de empresa cliente
	const [selectedEmpresaClienteId, setSelectedEmpresaClienteId] = useState<number | null>(null);
	const [selectedContratoId, setSelectedContratoId] = useState<number | ''>('');
	const [selectedOts, setSelectedOts] = useState<number[]>([]);

	// Estado para búsqueda en dropdown OTs
	const [searchOtInput, setSearchOtInput] = useState<string>('');
	const [showOtDropdown, setShowOtDropdown] = useState<boolean>(false);
	const dropdownRef = useRef<HTMLDivElement>(null);

	// Estado para comparativa
	const [comparativaData, setComparativaData] = useState<IComparativaData | null>(null);
	const [loadingComparativa, setLoadingComparativa] = useState<boolean>(false);
	const [pactadoData, setPactadoData] = useState<any>(null);
	const [ejecutadoData, setEjecutadoData] = useState<any>(null);
	const [loadingPactado, setLoadingPactado] = useState<boolean>(false);
	const [loadingEjecutado, setLoadingEjecutado] = useState<boolean>(false);

	// Estado para controles de prefactura (por item)
	const [itemsConfig, setItemsConfig] = useState<Map<string, ItemPrefactura>>(new Map());

	const [creatingPrefactura, setCreatingPrefactura] = useState<boolean>(false);

	// OTs que ya están incluidas en otras prefacturas (excluirlas del dropdown)
	const [excludedOtIds, setExcludedOtIds] = useState<number[]>([]);

	// Función para crear prefactura (POST a API)
	const handleCrearPrefactura = async () => {
		try {
			setCreatingPrefactura(true);

			// Construir items con la estructura exacta que espera el backend
			// INCLUIR TODOS los items; el flag `facturar` viene en cada item
			const itemsFacturables =
				ejecutadoData?.ejecutado?.items
					?.map((item: any) => {
						const itemKey = `${item.tipo}_${item.id}`;
						const config = (itemsConfig.get(itemKey) as any) ?? {};
						return {
							tipo: item.tipo,
							id: item.id,
							descripcion: config?.descripcion || item.descripcion || item.nombre || '',
							ot_id: item.ot_id,
							cantidad: item.cantidad || 1,
							precio_total: Number(item.precio_unitario || 0) * (item.cantidad || 1),
							precio_ajustado: config?.precioAsignado ?? null,
							facturar: config?.facturar ?? true,
							comentario: config?.comentario || '',
							// Referencia al padre (guía o compra). Guardar único campo `parent_id`.
							parent_id: item.guia_id ?? item.compra_id ?? item.rendicion_id ?? null,
						};
					}) || [];

			if (itemsFacturables.length === 0) {
				toast.warning('No hay items seleccionados para facturar');
				setCreatingPrefactura(false);
				return;
			}

			// Estructura JSON que va en resultado
			const itemsJsonPayload = {
				cliente_id: selectedEmpresaClienteId,
				ots_incluidas: selectedOts,
				items: itemsFacturables,
				resumen: {
					total_items: itemsFacturables.length,
					total_facturar: totales.totalFacturable,
				},
			};

			// Payload final para POST
			const payloadPOST = {
				cliente: selectedEmpresaClienteId,
				resultado: itemsJsonPayload,
				comentario: '',
				estado_cierre: 'borrador',
			};

			// POST a /cierres-administrativos/
			const response = await ApiService.fetchData<{ id: number }>({
				url: '/api/cierres-administrativos/',
				method: 'post',
				data: payloadPOST,
			});

			const prefacturaId = response.data?.id;

			if (response.status === 201 && prefacturaId) {
				toast.success(`Prefactura #${prefacturaId} creada exitosamente`);
				// Esperar un poco y luego navegar a la prefactura
				setTimeout(() => {
					navigate(`/facturacion/facturas/${prefacturaId}`);
				}, 1000);
			}
		} catch (error: any) {
			const message =
				error?.response?.data?.detail || error?.message || 'Error al crear prefactura';
			toast.error(message);
			console.error('Error creando prefactura:', error);
		} finally {
			setCreatingPrefactura(false);
		}
	};

	// Cargar OTs al montar
	useEffect(() => {
		dispatch(listaOrdenTrabajoThunk(undefined));
	}, [dispatch]);

	// Cargar contratos cuando se selecciona empresa cliente
	useEffect(() => {
		if (selectedEmpresaClienteId) {
			// Obtener empresas prestatarias de las OTs de esta empresa cliente
			const otasDelCliente = otasDisponibles.filter(
				(ot) => ot.cliente === selectedEmpresaClienteId,
			);
			if (otasDelCliente.length > 0) {
				const empresasPrestadorasIds = Array.from(
					new Set(otasDelCliente.map((ot) => ot.empresa)),
				);
				if (empresasPrestadorasIds.length > 0) {
					dispatch(
						listaContratosDeEmpresaYClienteThunk({
							id_cliente: selectedEmpresaClienteId,
							id_empresa: empresasPrestadorasIds[0], // Usar la primera empresa prestadora encontrada
						}),
					);
				}
			}
		} else {
			setSelectedContratoId('');
		}
	}, [selectedEmpresaClienteId, dispatch]);

	// Cargar comparativa automáticamente cuando cambian contrato u OTs
	useEffect(() => {
		if (selectedContratoId && selectedOts.length > 0) {
			setLoadingComparativa(true);
			ApiService.fetchData<IComparativaData>({
				url: '/api/cierres-facturacion/comparativa/',
				method: 'post',
				data: {
					ots_ids: selectedOts,
					contrato_id: selectedContratoId,
				},
			})
				.then((response) => {
					setComparativaData(response.data);
					// Guardar la respuesta completa para mantener consistencia con otros useEffect
					setPactadoData(response.data);
					setEjecutadoData(response.data);
					console.log('Datos comparativa completa cargados:', response.data);
				})
				.catch((error) => {
					console.error('Error al obtener comparativa:', error);
					setComparativaData(null);
				})
				.finally(() => {
					setLoadingComparativa(false);
				});
		} else {
			setComparativaData(null);
		}
	}, [selectedContratoId, selectedOts]);

	// Cargar datos de OTs seleccionadas apenas se seleccionen (sin esperar contrato)
	useEffect(() => {
		if (selectedOts.length > 0) {
			setLoadingEjecutado(true);
			ApiService.fetchData<any>({
				url: '/api/cierres-facturacion/comparativa/',
				method: 'post',
				data: {
					ots_ids: selectedOts,
					// No enviar contrato_id, backend ahora soporta parámetros opcionales
				},
			})
				.then((response) => {
					// La respuesta debería tener estructura { ejecutado: {...}, pactado: null, diferencia: null }
					setEjecutadoData(response.data);
					console.log('Datos ejecutado cargados:', response.data);

					// Inicializar config de items (por defecto: facturar=true, sin comentario)
					if (response.data?.ejecutado?.items) {
						const newConfig = new Map<string, ItemPrefactura>();
						response.data.ejecutado.items.forEach((item: ItemEjecutado) => {
							newConfig.set(item.id, {
								itemId: item.id,
								facturar: true,
								comentario: '',
								precioAsignado:
									item.precio_unitario > 0 ? item.precio_unitario : null,
							});
						});
						setItemsConfig(newConfig);
					}
				})
				.catch((error) => {
					console.error('Error al obtener datos ejecutados:', error);
					setEjecutadoData(null);
				})
				.finally(() => {
					setLoadingEjecutado(false);
				});
		} else {
			setEjecutadoData(null);
			setItemsConfig(new Map());
		}
	}, [selectedOts]);

	// Cargar datos de contrato apenas se seleccione
	useEffect(() => {
		if (selectedContratoId) {
			setLoadingPactado(true);
			ApiService.fetchData<any>({
				url: '/api/cierres-facturacion/comparativa/',
				method: 'post',
				data: {
					contrato_id: selectedContratoId,
					// No enviar ots_ids, backend ahora soporta parámetros opcionales
				},
			})
				.then((response) => {
					// La respuesta debería tener estructura { pactado: {...}, ejecutado: null, diferencia: null }
					setPactadoData(response.data);
					console.log('Datos pactado cargados:', response.data);
				})
				.catch((error) => {
					console.error('Error al obtener datos pactados:', error);
					setPactadoData(null);
				})
				.finally(() => {
					setLoadingPactado(false);
				});
		} else {
			setPactadoData(null);
		}
	}, [selectedContratoId]);

	// Deseleccionar contrato si no hay empresa cliente seleccionada
	useEffect(() => {
		if (!selectedEmpresaClienteId && selectedContratoId) {
			setSelectedContratoId('');
		}
	}, [selectedEmpresaClienteId, selectedContratoId]);

	// Cerrar dropdown de OTs al hacer click fuera
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
				setShowOtDropdown(false);
			}
		};

		if (showOtDropdown) {
			document.addEventListener('mousedown', handleClickOutside);
			return () => document.removeEventListener('mousedown', handleClickOutside);
		}
	}, [showOtDropdown]);

	// Actualizar configuración de item
	const updateItemConfig = (itemId: string, updates: Partial<ItemPrefactura>) => {
		setItemsConfig((prev) => {
			const newMap = new Map(prev);
			const current = newMap.get(itemId) || {
				itemId,
				facturar: true,
				comentario: '',
				precioAsignado: null,
			};
			newMap.set(itemId, { ...current, ...updates });
			return newMap;
		});
	};

	// Obtener tipo de badge según tipo de item
	const getTipoBadge = (tipo: string) => {
		switch (tipo) {
			case 'servicio_ot':
			case 'soporte_tecnico':
				return { variant: 'solid' as const, color: 'blue' as const, label: 'Servicio' };
			case 'guia_salida':
				return { variant: 'solid' as const, color: 'emerald' as const, label: 'Material' };
			case 'compra':
				return { variant: 'solid' as const, color: 'violet' as const, label: 'Compra' };
			case 'gasto_operativo':
				return { variant: 'solid' as const, color: 'amber' as const, label: 'Gasto Operativo' };
			// Legacy (mantener compatibilidad)
			case 'compra_material':
				return { variant: 'solid' as const, color: 'violet' as const, label: 'Compra' };
			case 'rendicion_gasto':
				return { variant: 'solid' as const, color: 'amber' as const, label: 'Gasto Operativo' };
			default:
				return { variant: 'solid' as const, color: 'gray' as const, label: 'Otro' };
		}
	};

	// Filtrar OTs completadas, filtrar por cliente seleccionado y excluir OTs ya en prefacturas
	const otasDisponibles = useMemo(
		() =>
			listaOrdenTrabajo.filter(
				(ot: IOrdenDeTrabajo) =>
					ot.estado === 'completada' &&
					(!selectedEmpresaClienteId || ot.cliente === selectedEmpresaClienteId) &&
					!excludedOtIds.includes(ot.id),
			),
		[listaOrdenTrabajo, selectedEmpresaClienteId, excludedOtIds],
	);

	// Filtrar OTs por búsqueda
	const otasFiltradas = useMemo(() => {
		return otasDisponibles.filter((ot) =>
			`#${ot.id} - ${ot.cliente_nombre}`.toLowerCase().includes(searchOtInput.toLowerCase()),
		);
	}, [otasDisponibles, searchOtInput]);

	// Obtener contrato seleccionado
	const contratoSeleccionado = useMemo(
		() => listaContratosDeEmpresaYCliente.find((c) => c.id === selectedContratoId),
		[listaContratosDeEmpresaYCliente, selectedContratoId],
	);

	// Loguear datos del contrato para debugging
	useEffect(() => {
		if (contratoSeleccionado) {
			console.log('Contrato seleccionado:', contratoSeleccionado);
		}
	}, [contratoSeleccionado]);

	// Cargar facturas existentes para excluir OTs ya incluidas en otras prefacturas
	useEffect(() => {
		let mounted = true;
		const fetchFacturas = async () => {
			try {
				const resp: any = await ApiService.fetchData({ url: '/api/cierres-administrativos/', method: 'get' });
				const results = Array.isArray(resp.data) ? resp.data : resp.data?.results ?? [];
				const otIds: number[] = [];
					results.forEach((f: any) => {
						// Ignorar prefacturas anuladas: solo excluir OTs de prefacturas activas
						if (f?.estado_cierre === 'anulado') return;
						const ots = f?.resultado?.ots_incluidas || [];
						if (Array.isArray(ots)) otIds.push(...ots);
					});
				if (mounted) setExcludedOtIds(Array.from(new Set(otIds)));
			} catch (err) {
				console.warn('No se pudieron cargar facturas para excluir OTs', err);
			}
		};
		fetchFacturas();
		return () => {
			mounted = false;
		};
	}, []);

	// Obtener empresas cliente disponibles (desde todas las OTs completadas)
	const empresasClienteDisponibles = useMemo(() => {
		const clientesUnicos = Array.from(
			new Set(
				listaOrdenTrabajo
					.filter((ot: IOrdenDeTrabajo) => ot.estado === 'completada')
					.map((ot) => ot.cliente),
				),
		);
		return clientesUnicos;
	}, [listaOrdenTrabajo]);

	// Obtener nombre de empresa cliente por ID (buscar en TODAS las OTs, no solo en las filtradas)
	const getNombreEmpresaCliente = (empresaClienteId: number) => {
		return (
			listaOrdenTrabajo.find((ot: IOrdenDeTrabajo) => ot.cliente === empresaClienteId)
				?.cliente_nombre || `Empresa #${empresaClienteId}`
		);
	};

	// OTs seleccionadas (objetos completos)
	const otsSeleccionadas = useMemo(
		() => otasDisponibles.filter((ot) => selectedOts.includes(ot.id)),
		[otasDisponibles, selectedOts],
	);

	// Calcular totales dinámicamente
	const totales = useMemo(() => {
		let totalFacturable = 0;
		let countFacturables = 0;
		let countNoFacturables = 0;

		ejecutadoData?.ejecutado?.items?.forEach((item: ItemEjecutado) => {
			const itemKey = `${item.tipo}_${item.id}`;
			const config = itemsConfig.get(itemKey);
			if (config?.facturar !== false) {
				const cantidad = item.cantidad ?? 1;
				const totalBase =
					typeof item.total === 'number'
						? item.total
						: (item.precio_unitario ?? 0) * cantidad;
				const totalLinea = config?.precioAsignado ?? totalBase;
				totalFacturable += totalLinea;
				countFacturables++;
			} else {
				countNoFacturables++;
			}
		});

		return {
			totalFacturable,
			countFacturables,
			countNoFacturables,
			totalItems: ejecutadoData?.ejecutado?.items?.length || 0,
		};
	}, [ejecutadoData, itemsConfig]);

	// Manejar selección de contrato
	const handleSelectContrato = (contratoId: number | '') => {
		setSelectedContratoId(contratoId);
	};

	// Manejar selección de empresa cliente
	const handleSelectEmpresaCliente = (empresaClienteId: number | null) => {
		setSelectedEmpresaClienteId(empresaClienteId);
		setSelectedContratoId('');
		setSelectedOts([]);
	};

	// Manejar selección/deselección de OT
	const handleToggleOt = (ot: IOrdenDeTrabajo) => {
		const isSelected = selectedOts.includes(ot.id);
		const nextSelected = isSelected
			? selectedOts.filter((id) => id !== ot.id)
			: [...selectedOts, ot.id];

		setSelectedOts(nextSelected);
	};

	// Limpiar selección
	const handleLimpiar = () => {
		setSelectedEmpresaClienteId(null);
		setSelectedContratoId('');
		setSelectedOts([]);
		setComparativaData(null);
		setPactadoData(null);
		setEjecutadoData(null);
		setSearchOtInput('');
		setShowOtDropdown(false);
		setItemsConfig(new Map());
	};

	return (
		<PageWrapper name='Facturación - Matching Manual'>
			<Subheader>
				<SubheaderLeft>
					<h2 className='text-2xl font-bold'>Matching Manual de Facturación</h2>
					<p className='mt-1 text-sm text-gray-600'>
						Selecciona un contrato y sus órdenes de trabajo para comparar y hacer
						matching
					</p>
				</SubheaderLeft>
				<SubheaderRight>
					<Button icon='HeroXMark' variant='outline' onClick={() => navigate(-1)}>
						Volver
					</Button>
				</SubheaderRight>
			</Subheader>

			{/* SELECTORES: EmpresaCliente + Contrato + OTs */}
			<Container className='mb-6'>
				<div className='grid grid-cols-1 gap-6 lg:grid-cols-3'>
					{/* DROPDOWN EMPRESA CLIENTE */}
					<div className='flex flex-col gap-2'>
						<label className='text-sm font-semibold text-gray-700'>
							Selecciona Empresa Cliente
						</label>
						<select
							value={selectedEmpresaClienteId || ''}
							onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
								handleSelectEmpresaCliente(
									e.target.value ? Number(e.target.value) : null,
								)
							}
							className='w-full rounded-lg border-2 border-gray-300 bg-white px-4 py-3 font-semibold text-gray-900 transition focus:border-blue-500 focus:outline-none'>
							<option value=''>-- Selecciona una empresa --</option>
							{empresasClienteDisponibles.map((empresaId) => (
								<option key={empresaId} value={empresaId}>
									{getNombreEmpresaCliente(empresaId)}
								</option>
							))}
						</select>
					</div>

					{/* DROPDOWN CONTRATOS */}
					<div className='flex flex-col gap-2'>
						<label className='text-sm font-semibold text-gray-700'>
							Selecciona Contrato
						</label>
						<select
							value={selectedContratoId}
							onChange={(e) => handleSelectContrato(Number(e.target.value) || '')}
							disabled={selectedEmpresaClienteId === null}
							className={`w-full rounded-lg border-2 border-gray-300 px-4 py-3 font-semibold transition focus:border-blue-500 focus:outline-none ${
								selectedEmpresaClienteId === null
									? 'cursor-not-allowed bg-gray-100 text-gray-500'
									: 'bg-white text-gray-900'
							}`}>
							<option value=''>-- Selecciona un contrato --</option>
							{listaContratosDeEmpresaYCliente.map((contrato) => (
								<option key={contrato.id} value={contrato.id}>
									#{contrato.id} - {contrato.nombre}
								</option>
							))}
						</select>
						{selectedEmpresaClienteId === null && (
							<p className='text-xs italic text-gray-500'>
								Selecciona una empresa cliente primero
							</p>
						)}
					</div>

					{/* SELECTOR DE OTs */}
					<div className='flex flex-col gap-2'>
						<label className='text-sm font-semibold text-gray-700'>
							Selecciona Órdenes de Trabajo
						</label>
						<div className='relative' ref={dropdownRef}>
							<div
								onClick={() => {
									if (selectedEmpresaClienteId === null) return;
									setShowOtDropdown(!showOtDropdown);
								}}
								className={`w-full cursor-pointer rounded-lg border-2 border-gray-300 px-4 py-3 font-semibold transition focus:outline-none ${
									selectedEmpresaClienteId === null
										? 'pointer-events-none cursor-not-allowed bg-gray-100 text-gray-500'
										: 'bg-white text-gray-900 hover:border-gray-400'
								}`}>
								{selectedOts.length === 0 ? (
									<span className='text-sm text-gray-500'>
										-- Selecciona OTs --
									</span>
								) : (
									<span className='text-sm'>
										{selectedOts.length} OT{selectedOts.length !== 1 ? 's' : ''}
									</span>
								)}
							</div>

							{showOtDropdown && selectedEmpresaClienteId !== null && (
								<div className='absolute left-0 right-0 top-full z-20 mt-2 rounded-lg border-2 border-gray-300 bg-white shadow-lg'>
									<div className='border-b border-gray-200 p-3'>
										<input
											type='text'
											placeholder='Buscar OT por ID o cliente...'
											value={searchOtInput}
											onChange={(e) => setSearchOtInput(e.target.value)}
											className='w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none'
										/>
									</div>

									<div className='max-h-64 overflow-y-auto'>
										{otasFiltradas.length > 0 ? (
											otasFiltradas.map((ot) => (
												<label
													key={ot.id}
													className='flex cursor-pointer items-center gap-3 border-b border-gray-100 px-4 py-2 last:border-0 hover:bg-gray-100'>
													<input
														type='checkbox'
														checked={selectedOts.includes(ot.id)}
														onChange={() => handleToggleOt(ot)}
														className='h-4 w-4 cursor-pointer'
													/>
													<div className='flex-1 text-sm'>
														<p className='font-medium'>
															OT #{ot.id} - {ot.cliente_nombre}
														</p>
														<p className='text-xs text-gray-600'>
															Finalizada:{' '}
															{dayjs(ot.fecha_finalizacion_ot).format(
																'DD/MM/YYYY',
															)}
														</p>
													</div>
												</label>
											))
										) : (
											<div className='p-4 text-center text-sm text-gray-500'>
												No hay OTs disponibles
											</div>
										)}
									</div>
								</div>
							)}
						</div>
					</div>

					{/* CHIPS de OTs Seleccionadas */}
					{selectedOts.length > 0 && (
						<div className='mt-3 flex flex-wrap gap-2'>
							{otsSeleccionadas.map((ot) => (
								<div
									key={ot.id}
									className='inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1.5 text-sm font-medium text-blue-700'>
									OT #{ot.id}
									<button
										onClick={() => handleToggleOt(ot)}
										className='font-bold text-blue-700 hover:text-blue-900'>
										×
									</button>
								</div>
							))}
						</div>
					)}
				</div>
			</Container>

			{/* LAYOUT DOS COLUMNAS: Contrato (STICKY LEFT) + OTs + Ejecutado (RIGHT) */}
			{selectedEmpresaClienteId && (
				<div className='grid grid-cols-1 gap-4 lg:grid-cols-12'>
					{/* COLUMNA IZQUIERDA: Resumen del Contrato (Sticky) */}
					<div className='lg:col-span-4'>
						<div className='sticky top-4'>
							<Container>
								<Card className='shadow-md'>
									<CardBody className='space-y-3'>
										{selectedContratoId && contratoSeleccionado ? (
											<>
												{/* HEADER COMPACTO */}
												<div className='border-b pb-2'>
													<h3 className='text-sm font-bold text-blue-600'>
														{contratoSeleccionado.nombre}
													</h3>
													<p className='text-xs text-gray-500'>
														ID #{contratoSeleccionado.id} |{' '}
														{contratoSeleccionado.datos_empresa?.nombre}
													</p>
												</div>

												{/* SERVICIOS CONTRATADOS (TABLA COMPACTA) */}
												{(contratoSeleccionado as any)?.contrato_servicios
													?.length > 0 ? (
													<div>
														<h4 className='mb-2 text-xs font-semibold uppercase tracking-wide text-gray-600'>
															Servicios Contratados
														</h4>
														<div className='overflow-hidden rounded border'>
															<table className='w-full text-xs'>
																<thead className='bg-gray-100'>
																	<tr>
																		<th className='px-2 py-1 text-left font-medium text-gray-700'>
																			Servicio
																		</th>
																		<th className='px-2 py-1 text-right font-medium text-gray-700'>
																			Monto
																		</th>
																	</tr>
																</thead>
																<tbody className='divide-y bg-white'>
																	{(
																		contratoSeleccionado as any
																	).contrato_servicios.map(
																		(
																			servicio: any,
																			idx: number,
																		) => (
																			<tr
																				key={idx}
																				className='hover:bg-gray-50'>
																				<td className='px-2 py-1.5 text-gray-800'>
																					{servicio.nombre ||
																						servicio.descripcion ||
																						'Servicio'}
																				</td>
																				<td className='px-2 py-1.5 text-right font-medium text-gray-800'>
																					$
																					{(
																						servicio.precio ||
																						0
																					).toLocaleString(
																						'es-CL',
																					)}
																				</td>
																			</tr>
																		),
																	)}
																</tbody>
															</table>
														</div>
													</div>
												) : loadingPactado ? (
													<div className='py-4 text-center text-xs text-gray-600'>
														Cargando...
													</div>
												) : (
													<div className='py-4 text-center text-xs text-gray-500'>
														Sin servicios contratados
													</div>
												)}

												{/* CONDICIONES ESPECIALES */}
												{(contratoSeleccionado as any)
													?.contrato_condiciones_especiales &&
													(contratoSeleccionado as any)
														.contrato_condiciones_especiales.length >
														0 && (
														<div className='mt-3'>
															<h4 className='mb-2 text-xs font-semibold uppercase tracking-wide text-gray-600'>
																Condiciones Especiales
															</h4>
															<div className='space-y-2'>
																{(
																	contratoSeleccionado as any
																).contrato_condiciones_especiales.map(
																	(cond: any, idx: number) => (
																		<div
																			key={idx}
																			className='rounded-md bg-yellow-50 px-3 py-2 text-xs text-gray-800'>
																			<details className='cursor-pointer'>
																				<summary className='font-medium text-yellow-900'>
																					{typeof cond ===
																					'string'
																						? cond.substring(
																								0,
																								40,
																							) +
																							(cond.length >
																							40
																								? '...'
																								: '')
																						: cond.titulo_condicion ||
																							cond.nombre ||
																							'Condición'}
																				</summary>
																				<p className='mt-2 text-xs text-gray-700'>
																					{typeof cond ===
																					'string'
																						? cond
																						: cond.descripcion_condicion ||
																							cond.descripcion ||
																							'Sin descripción'}
																				</p>
																			</details>
																		</div>
																	),
																)}
															</div>
														</div>
													)}

												{/* OBSERVACIONES */}
												{(contratoSeleccionado as any)?.observaciones && (
													<div className='mt-3 rounded-md border-l-4 border-blue-400 bg-blue-50 p-3'>
														<p className='mb-1 text-xs font-semibold text-blue-900'>
															Observaciones
														</p>
														<p className='text-xs leading-relaxed text-blue-800'>
															{
																(contratoSeleccionado as any)
																	.observaciones
															}
														</p>
													</div>
												)}

												{/* VISITAS PROGRAMADAS */}
												{Array.isArray(
													(contratoSeleccionado as any)?.contrato_visitas,
												) &&
													(contratoSeleccionado as any).contrato_visitas
														.length > 0 && (
														<div className='mt-3'>
															<h4 className='mb-2 text-xs font-semibold uppercase tracking-wide text-gray-600'>
																Visitas Programadas
															</h4>
															<div className='space-y-2 rounded-md border border-green-300 bg-green-50 p-2'>
																{(
																	contratoSeleccionado as any
																).contrato_visitas.map(
																	(visita: any, idx: number) => (
																		<div
																			key={idx}
																			className='flex items-start justify-between rounded bg-white p-2'>
																			<div>
																				<p className='font-medium text-gray-800'>
																					{visita.tipo ||
																						visita.nombre ||
																						'Visita'}
																				</p>
																				<p className='text-xs text-gray-600'>
																					Frecuencia:{' '}
																					{visita.frecuencia ||
																						'Mensual'}
																				</p>
																			</div>
																		</div>
																	),
																)}
															</div>
														</div>
													)}

												{/* USUARIOS VINCULADOS */}
												{Array.isArray(
													(contratoSeleccionado as any)
														?.usuarios_vinculados,
												) &&
													(contratoSeleccionado as any)
														.usuarios_vinculados.length > 0 && (
														<div className='mt-3'>
															<h4 className='mb-2 text-xs font-semibold uppercase tracking-wide text-gray-600'>
																Usuarios Vinculados
															</h4>
															<div className='overflow-x-auto rounded-md border'>
																<table className='w-full text-xs'>
																	<thead className='bg-gray-100'>
																		<tr>
																			<th className='p-2 text-left font-semibold text-gray-700'>
																				Usuario
																			</th>
																		</tr>
																	</thead>
																	<tbody className='divide-y'>
																		{(
																			contratoSeleccionado as any
																		).usuarios_vinculados.map(
																			(
																				usuarioId: number,
																				idx: number,
																			) => (
																				<tr
																					key={idx}
																					className='hover:bg-gray-50'>
																					<td className='p-2 text-gray-800'>
																						Usuario #
																						{usuarioId}
																					</td>
																				</tr>
																			),
																		)}
																	</tbody>
																</table>
															</div>
														</div>
													)}
											</>
										) : (
											<div className='py-6 text-center'>
												<p className='text-sm font-semibold text-gray-600'>
													Selecciona un contrato para ver los detalles
												</p>
											</div>
										)}
									</CardBody>
								</Card>
							</Container>
						</div>
					</div>

					{/* COLUMNA DERECHA: OTs Ejecutado + Prefactura */}
					<div className='lg:col-span-8'>
						<Container className='mb-5'>
							{selectedOts.length > 0 && ejecutadoData && ejecutadoData.ejecutado ? (
								<Card>
									<CardBody>
										<CardTitle>
											<h3 className='text-lg font-bold text-green-600'>
												OTs Ejecutado y Prefactura ({selectedOts.length})
											</h3>
										</CardTitle>

										{/* Resumen */}
										<div className='mb-4 grid grid-cols-4 gap-2 text-center'>
											<div>
												<p className='text-xs text-gray-600'>Trabajos</p>
												<p className='text-lg font-bold text-green-600'>
													{ejecutadoData?.ejecutado?.resumen?.trabajos ||
														0}
												</p>
											</div>
											<div>
												<p className='text-xs text-gray-600'>Guías</p>
												<p className='text-lg font-bold text-green-600'>
													{ejecutadoData?.ejecutado?.resumen?.guias || 0}
												</p>
											</div>
											<div>
												<p className='text-xs text-gray-600'>Compras</p>
												<p className='text-lg font-bold text-green-600'>
													{ejecutadoData?.ejecutado?.resumen?.compras || 0}
												</p>
											</div>
											<div>
												<p className='text-xs text-gray-600'>Gastos Operativos</p>
												<p className='text-lg font-bold text-green-600'>
													{ejecutadoData?.ejecutado?.resumen
														?.gastos_operativos || 0}
												</p>
											</div>
										</div>

										{/* Acciones de prefactura */}
										<div className='mb-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm'>
											<h3 className='mb-3 text-base font-semibold'>
												Acciones
											</h3>
											<div className='flex flex-wrap items-center gap-3'>
												<Button
													isDisable={
														totales.countFacturables === 0 ||
														creatingPrefactura
													}
													color={
														totales.countFacturables > 0
															? 'blue'
															: 'gray'
													}
													onClick={handleCrearPrefactura}>
													Crear Prefactura ({totales.countFacturables}{' '}
													items)
												</Button>
												{totales.countNoFacturables > 0 && (
													<span className='text-sm text-gray-600'>
														{totales.countNoFacturables} items excluidos
													</span>
												)}
											</div>
										</div>

										{/* Tabla ejecutado con controles de prefactura */}
										{ejecutadoData?.ejecutado?.items &&
										Array.isArray(ejecutadoData.ejecutado.items) &&
										ejecutadoData.ejecutado.items.length > 0 ? (
											<div className='overflow-x-auto'>
												<table className='w-full text-xs'>
													<thead className='border-b-2 border-gray-300 bg-gray-100'>
														<tr>
															<th className='p-2 text-left font-semibold'>
																Tipo
															</th>
															<th className='p-2 text-left font-semibold'>
																Descripción
															</th>
															<th className='p-2 text-right font-semibold'>
																Cant
															</th>
															<th className='p-2 text-right font-semibold'>
																P.Unit
															</th>
															<th className='p-2 text-right font-semibold'>
																Total
															</th>
															<th className='border-l-2 border-gray-300 p-2 text-center font-semibold'>
																Facturar
															</th>
															<th className='p-2 text-left font-semibold'>
																Comentario
															</th>
															<th className='p-2 text-right font-semibold'>
																P.Ajustado
															</th>
														</tr>
													</thead>
													<tbody>
														{(() => {
															// Agrupar items por OT
															const itemsPorOT =
																ejecutadoData.ejecutado.items.reduce(
																	(
																		acc: any,
																		item: ItemEjecutado,
																	) => {
																		const otId =
																			item.ot_id || 'sin_ot';
																		if (!acc[otId])
																			acc[otId] = [];
																		acc[otId].push(item);
																		return acc;
																	},
																	{},
																);

															let rows: any[] = [];
															let isFirstOT = true;
															
															Object.entries(itemsPorOT).forEach(
																([otId, itemsDeOT]: [string, any]) => {
																	// Separador de OT
																	rows.push(
																		<tr
																			key={`sep-ot-${otId}`}
																			className={
																				isFirstOT
																					? 'bg-blue-50'
																					: 'border-t-2 border-blue-300 bg-blue-50'
																			}>
																			<td
																				colSpan={8}
																				className='p-2 font-bold text-gray-700'>
																				OT #{otId}
																			</td>
																		</tr>,
																	);
																	isFirstOT = false;

																	// Agrupar items de esta OT por tipo y contenedor
																	const grupos: {[key: string]: ItemEjecutado[]} = {};
																	
																	itemsDeOT.forEach((item: ItemEjecutado) => {
																		let grupoKey = '';
																		
																		if (item.tipo === 'guia_salida') {
																			// Agrupar por guia_id
																			const guiaId = (item as any).guia_id || 'sin_guia';
																			grupoKey = `guia_${guiaId}`;
																		} else if (item.tipo === 'servicio_ot' || item.tipo === 'soporte_tecnico') {
																			// Agrupar todos los trabajos juntos
																			grupoKey = 'trabajos';
																		} else if (item.tipo === 'compra') {
																			// Agrupar todas las compras juntas
																			grupoKey = 'compras';
																		} else if (item.tipo === 'gasto_operativo') {
																			// Agrupar todos los gastos juntos
																			grupoKey = 'gastos';
																		} else {
																			// Otros tipos
																			grupoKey = `otro_${item.tipo}`;
																		}
																		
																		if (!grupos[grupoKey]) {
																			grupos[grupoKey] = [];
																		}
																		grupos[grupoKey].push(item);
																	});

																	// Ordenar grupos: trabajos, guías, compras, gastos
																	const ordenGrupos = ['trabajos', 'guia_', 'compras', 'gastos'];
																	const gruposOrdenados = Object.entries(grupos).sort(([a], [b]) => {
																		const idxA = ordenGrupos.findIndex(prefix => a.startsWith(prefix));
																		const idxB = ordenGrupos.findIndex(prefix => b.startsWith(prefix));
																		if (idxA !== idxB) return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
																		return a.localeCompare(b);
																	});

																	// Renderizar cada grupo
																	gruposOrdenados.forEach(([grupoKey, itemsGrupo]) => {
																		// Generar nombre del separador
																		let nombreGrupo = '';
																		const primerItem = itemsGrupo[0];
																		
																		if (grupoKey === 'trabajos') {
																			nombreGrupo = `Trabajos - ${itemsGrupo.length} item(s)`;
																		} else if (grupoKey.startsWith('guia_')) {
																			const guiaId = (primerItem as any).guia_id;
																			nombreGrupo = `Guía de Salida #${guiaId} - ${itemsGrupo.length} item(s)`;
																		} else if (grupoKey === 'compras') {
																			nombreGrupo = `Compras - ${itemsGrupo.length} item(s)`;
																		} else if (grupoKey === 'gastos') {
																			nombreGrupo = `Gastos Operativos - ${itemsGrupo.length} item(s)`;
																		} else {
																			nombreGrupo = `${grupoKey} - ${itemsGrupo.length} item(s)`;
																		}

																		// Separador del grupo
																		rows.push(
																			<tr
																				key={`sep-grupo-${otId}-${grupoKey}`}
																				className='bg-gray-100'>
																				<td
																					colSpan={8}
																					className='p-1.5 pl-6 text-xs font-semibold text-gray-600'>
																					{nombreGrupo}
																				</td>
																			</tr>,
																		);

																		// Items del grupo
																		itemsGrupo.forEach(
																			(item: ItemEjecutado) => {
																				const itemId = `${item.tipo}_${item.id}`;
																				const config =
																					itemsConfig.get(
																						itemId,
																					);
																				const tipoBadge =
																					getTipoBadge(
																						item.tipo,
																					);
																				rows.push(
																					<tr
																						key={`${item.tipo}_${item.id}_${item.ot_id || 'no_ot'}`}
																						className='border-b hover:bg-gray-50'>
																						<td className='p-2 pl-8'>
																							<Badge
																								variant={
																									tipoBadge.variant
																								}
																								color={
																									tipoBadge.color
																								}
																								className='text-xs'>
																								{
																									tipoBadge.label
																								}
																							</Badge>
																						</td>
																						<td className='p-2 text-gray-800'>
																							<div className='font-medium'>
																								{item.nombre ||
																									'Sin nombre'}
																							</div>
																						</td>
																						<td className='p-2 text-right'>
																							{
																								item.cantidad
																							}
																						</td>
																						<td className='p-2 text-right'>
																							$
																							{item.precio_unitario.toLocaleString(
																								'es-CL',
																							)}
																						</td>
																						<td className='p-2 text-right font-semibold text-green-600'>
																							$
																							{item.total.toLocaleString(
																								'es-CL',
																							)}
																						</td>
																						<td className='border-l-2 border-gray-300 p-2 text-center'>
																							<input
																								type='checkbox'
																								checked={
																									config?.facturar ??
																									true
																								}
																								onChange={(
																									e,
																								) =>
																									updateItemConfig(
																										itemId,
																										{
																											facturar:
																												e
																													.target
																													.checked,
																										},
																									)
																								}
																								className='h-4 w-4 cursor-pointer'
																							/>
																						</td>
																						<td className='p-2'>
																							<input
																								type='text'
																								placeholder='Comentario...'
																								value={
																									config?.comentario ??
																									''
																								}
																								onChange={(
																									e,
																								) =>
																									updateItemConfig(
																										itemId,
																										{
																											comentario:
																												e
																													.target
																													.value,
																										},
																									)
																								}
																								className='w-full rounded border px-2 py-1 text-xs'
																							/>
																						</td>
																						<td className='p-2'>
																							<input
																								type='number'
																								placeholder='$'
																								value={
																									config?.precioAsignado ??
																									''
																								}
																								onChange={(
																									e,
																								) =>
																									updateItemConfig(
																										itemId,
																										{
																											precioAsignado:
																												e
																													.target
																													.value
																													? Number(
																															e
																																.target
																																.value,
																														)
																													: null,
																										},
																									)
																								}
																								className='w-20 rounded border px-2 py-1 text-right text-xs'
																							/>
																						</td>
																					</tr>,
																				);
																			},
																		);
																	});
																},
															);

															return rows;
														})()}
													</tbody>
												</table>

												{/* Totales de prefactura */}
												<div className='mt-4 grid grid-cols-4 gap-3'>
													<div className='rounded-lg bg-blue-50 p-3 text-center'>
														<p className='text-xs text-gray-600'>
															Items
														</p>
														<p className='text-lg font-bold'>
															{totales.totalItems}
														</p>
													</div>
													<div className='rounded-lg bg-green-50 p-3 text-center'>
														<p className='text-xs text-gray-600'>
															A Facturar
														</p>
														<p className='text-lg font-bold text-green-600'>
															{totales.countFacturables}
														</p>
													</div>
													<div className='rounded-lg bg-red-50 p-3 text-center'>
														<p className='text-xs text-gray-600'>
															No Facturar
														</p>
														<p className='text-lg font-bold text-red-600'>
															{totales.countNoFacturables}
														</p>
													</div>
													<div className='rounded-lg bg-purple-50 p-3 text-center'>
														<p className='text-xs text-gray-600'>
															Total
														</p>
														<p className='text-lg font-bold text-purple-600'>
															$
															{totales.totalFacturable.toLocaleString(
																'es-CL',
															)}
														</p>
													</div>
												</div>
											</div>
										) : (
											<div className='mt-4 rounded-lg border-2 border-dashed border-gray-300 p-4 text-center'>
												<p className='text-sm text-gray-500'>
													No hay servicios registrados
												</p>
											</div>
										)}
									</CardBody>
								</Card>
							) : (
								<Card>
									<CardBody>
										<p className='text-sm text-gray-500'>
											Selecciona OTs para ver el ejecutado.
										</p>
									</CardBody>
								</Card>
							)}
						</Container>
					</div>
				</div>
			)}

			{/* RESUMEN COMPARATIVO */}
			{comparativaData && (
				<Container className='mb-5'>
					<Card>
						<CardBody>
							<CardTitle>
								<h3 className='text-lg font-bold'>Resumen Comparativo</h3>
							</CardTitle>
							<div className='mt-4 grid grid-cols-1 gap-4 md:grid-cols-3'>
								<div className='rounded-lg bg-blue-50 p-4 text-center'>
									<p className='text-sm text-gray-600'>Total Pactado</p>
									<p className='text-3xl font-bold text-blue-600'>
										$
										{Number(comparativaData.pactado.total).toLocaleString(
											'es-CL',
										)}
									</p>
								</div>
								<div className='rounded-lg bg-green-50 p-4 text-center'>
									<p className='text-sm text-gray-600'>Total Ejecutado</p>
									<p className='text-3xl font-bold text-green-600'>
										$
										{Number(comparativaData.ejecutado.total).toLocaleString(
											'es-CL',
										)}
									</p>
								</div>
								<div
									className={`rounded-lg p-4 text-center ${
										comparativaData.diferencia >= 0
											? 'bg-emerald-50'
											: 'bg-red-50'
									}`}>
									<p className='text-sm text-gray-600'>Diferencia</p>
									<p
										className={`text-3xl font-bold ${
											comparativaData.diferencia >= 0
												? 'text-emerald-600'
												: 'text-red-600'
										}`}>
										$
										{Math.abs(comparativaData.diferencia).toLocaleString(
											'es-CL',
										)}
									</p>
									<p className='mt-2 text-xs text-gray-500'>
										{comparativaData.diferencia >= 0 ? '+ Sobra' : '- Falta'}
									</p>
								</div>
							</div>
						</CardBody>
					</Card>
				</Container>
			)}

			{/* BOTÓN LIMPIAR - solo si hay selección */}
			{(selectedEmpresaClienteId || selectedContratoId || selectedOts.length > 0) && (
				<Container className='mb-4 flex justify-end gap-4'>
					<Button variant='outline' color='gray' onClick={handleLimpiar}>
						Limpiar Selección
					</Button>
				</Container>
			)}
		</PageWrapper>
	);
};

export default FacturacionesComparativa;

