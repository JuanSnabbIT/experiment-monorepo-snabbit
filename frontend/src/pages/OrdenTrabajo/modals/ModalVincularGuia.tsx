import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal, {
    ModalBody,
    ModalFooter,
    ModalFooterChild,
    ModalHeader,
} from '@/components/ui/Modal';
import ApiService from '@/services/ApiService';
import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { getErrorMessage } from '@/utils/errorHandlers';

// ⚠️ DEPRECATED (2026-01): Las opciones 'soporte' y 'servicio' están deprecadas.
// Solo 'direct_ot' debe usarse. Los endpoints antiguos serán removidos en futuras versiones.
// Ver: backend/ordentrabajov2/DEPRECATION_NOTICE.md

interface IModalVincularGuiaProps {
	isOpen: boolean;
	setIsOpen: Dispatch<SetStateAction<boolean>>;
	otId: number;
	// ⚠️ DEPRECATED: 'soporte' y 'servicio' están deprecados. Usar solo 'direct_ot'
	targetType: 'direct_ot' | 'soporte' | 'servicio';
	targetId?: number;
	onSuccess: () => void;
}

const ModalVincularGuia = ({
	isOpen,
	setIsOpen,
	otId,
	targetType,
	targetId,
	onSuccess,
}: IModalVincularGuiaProps) => {
	void targetId;
	const [guiasDisponibles, setGuiasDisponibles] = useState<TSelectOption[]>([]);
	const [guiaALinkear, setGuiaALinkear] = useState<TSelectOption | null>(null);
	const [cargandoGuias, setCargandoGuias] = useState(false);
	const [cargandoVinculo, setCargandoVinculo] = useState(false);
	const [itemsGuia, setItemsGuia] = useState<any[]>([]);
	const [cargandoItems, setCargandoItems] = useState(false);

	const cargarGuiasDisponibles = async () => {
		setCargandoGuias(true);
		try {
			const resp = await ApiService.fetchData<any[]>({
				url: `/api/ordenes-de-trabajo/${otId}/guias-disponibles/`,
				method: 'get',
			});
			const options = (resp.data || []).map((g) => ({
				label: `#${g.id} - ${g.motivo || 'Sin motivo'} (${g.estado_label}) - ${g.descripcion_items || '0 ítems'}`,
				value: g.id,
			}));
			setGuiasDisponibles(options);
		} catch (e: unknown) {
			console.error('Error al cargar guías disponibles:', e);
			toast.error(getErrorMessage(e) || 'No se pudieron cargar las guías disponibles');
		} finally {
			setCargandoGuias(false);
		}
	};

	const cargarItemsGuia = async (guiaId: number) => {
		setCargandoItems(true);
		try {
			const resp = await ApiService.fetchData<any[]>({
				url: `/api/guia-salida/${guiaId}/items/`,
				method: 'get',
			});
			setItemsGuia(resp.data || []);
		} catch (e: unknown) {
			console.error('Error al cargar items de la guía:', e);
			toast.error(getErrorMessage(e) || 'No se pudieron cargar los items de la guía');
		} finally {
			setCargandoItems(false);
		}
	};

	useEffect(() => {
		if (isOpen) {
			cargarGuiasDisponibles();
			setGuiaALinkear(null);
			setItemsGuia([]);
		}
	}, [isOpen, otId]);

	const handleVincularGuia = async () => {
		if (!guiaALinkear) return;
		setCargandoVinculo(true);
		try {
			if (targetType === 'direct_ot') {
				// ✅ NUEVO: Vincular guía directamente a OT
				await ApiService.fetchData({
					url: `/api/ordenes-de-trabajo/${otId}/vincular-guias/`,
					method: 'post',
					data: { guias_ids: [Number(guiaALinkear.value)] },
				});
			}
			// ⚠️ FUNCIONALIDAD ANTIGUA DESHABILITADA (2026-01)
			// Para reactivar vincular guías a servicios/soportes, descomenta:
			/*
			else if (targetType === 'soporte') {
				await ApiService.fetchData({
					url: `/api/ordenes-de-trabajo/${otId}/soportes-tecnicos/${targetId}/asociar-guia/`,
					method: 'post',
					headers: { 'Content-Type': 'application/json' },
					data: JSON.stringify({ guia_salida: guiaALinkear.value }),
				});
			} else if (targetType === 'servicio') {
				await ApiService.fetchData({
					url: `/api/ordenes-de-trabajo/${otId}/servicios-generales/${targetId}/asociar-guia/`,
					method: 'post',
					headers: { 'Content-Type': 'application/json' },
					data: JSON.stringify({ guia_salida: guiaALinkear.value }),
				});
			}
			*/
			toast.success('Guía vinculada correctamente');
			onSuccess();
			setIsOpen(false);
		} catch (e: unknown) {
			console.error('Error al vincular guía:', e);
			toast.error(getErrorMessage(e) || 'Error al vincular guía');
		} finally {
			setCargandoVinculo(false);
		}
	};

	return (
		<Modal isOpen={isOpen} setIsOpen={setIsOpen}>
			<ModalHeader>
				<Badge className='text-xl'>Vincular Guía de Salida</Badge>
			</ModalHeader>
			<ModalBody>
				<div className='flex flex-col gap-4'>
					<p className='text-sm text-gray-500'>
						Seleccione una guía de salida disponible para vincularla a{' '}
						{targetType === 'direct_ot' ? 'esta Orden de Trabajo' : 'este trabajo'}.
					</p>
					<div>
						<Badge className='mb-2'>Guía disponible</Badge>
						<SelectReact
							name='guia_vinculo'
							placeholder='Selecciona una guía'
							options={guiasDisponibles}
							isLoading={cargandoGuias}
							value={guiaALinkear}
							onChange={(e) => {
								setGuiaALinkear(e as TSelectOption);
								const val = (e as TSelectOption)?.value;
								if (val) {
									cargarItemsGuia(Number(val));
								} else {
									setItemsGuia([]);
								}
							}}
							noOptionsMessage={() => (
								<span className='text-xs'>
									No hay guías disponibles (Estados ER/FR, sin vínculo previo).
								</span>
							)}
						/>
					</div>
						{guiaALinkear && (
							<div className='mt-4'>
								<div className='mb-2 flex items-center justify-between'>
									<Badge className='text-base'>Items en la Guía</Badge>
									<span className='text-xs text-gray-500'>
										{itemsGuia.length} item{itemsGuia.length !== 1 ? 's' : ''}
									</span>
								</div>
								<div className='max-h-64 overflow-auto rounded-lg border border-gray-200 bg-gray-50'>
									{cargandoItems ? (
										<div className='flex items-center justify-center py-6 text-sm text-gray-500'>
											Cargando items...
										</div>
									) : itemsGuia.length > 0 ? (
										<div className='overflow-x-auto'>
											<table className='min-w-full divide-y divide-gray-200'>
												<thead className='bg-gray-100'>
													<tr>
														<th className='px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700'>Item</th>
														<th className='px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700'>Cantidad original</th>
														<th className='px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700'>Cantidad rebajada</th>
														<th className='px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700'>Cantidad devuelta</th>
														<th className='px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700'>Serializado</th>
													</tr>
												</thead>
												<tbody className='divide-y divide-gray-200 bg-white'>
													{itemsGuia.map((item, idx) => (
														<tr key={item.id || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
															<td className='px-4 py-3 text-sm text-gray-900'>
																{item.datos_stock?.datos_item?.nombre || 'Sin nombre'}
															</td>
															<td className='px-4 py-3 text-sm text-gray-900'>{item.cantidad_original}</td>
															<td className='px-4 py-3 text-sm text-gray-900'>{item.cantidad_rebajada}</td>
															<td className='px-4 py-3 text-sm text-gray-900'>{item.cantidad_devuelta}</td>
															<td className='px-4 py-3 text-sm text-gray-900'>{item.individualizado ? 'Sí' : 'No'}</td>
														</tr>
													))}
												</tbody>
											</table>
										</div>
									) : (
										<div className='py-6 text-center text-sm text-gray-500'>No hay items en esta guía</div>
									)}
								</div>
							</div>
						)}
				</div>
			</ModalBody>
			<ModalFooter>
				<ModalFooterChild>
					<Button
						color='red'
						variant='outline'
						onClick={() => setIsOpen(false)}>
						Cancelar
					</Button>
				</ModalFooterChild>
				<ModalFooterChild>
					<Button
						color='emerald'
						variant='solid'
						icon='HeroLink'
						isDisable={!guiaALinkear || cargandoVinculo}
						onClick={handleVincularGuia}>
						{cargandoVinculo ? 'Vinculando...' : 'Vincular'}
					</Button>
				</ModalFooterChild>
			</ModalFooter>
		</Modal>
	);
};

export default ModalVincularGuia;
