import Checkbox from '@/components/form/Checkbox';
import Input from '@/components/form/Input';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal, {
    ModalBody,
    ModalFooter,
    ModalFooterChild,
    ModalHeader,
} from '@/components/ui/Modal';
import Tooltip from '@/components/ui/Tooltip';
import ApiService from '@/services/ApiService';
import {
    useAppDispatch
} from '@/store';
import dayjs from 'dayjs';
import { useFormik } from 'formik';
import { Fragment, useEffect, useState } from 'react';
import { toast } from 'react-toastify';

import { ICotizacion, IItemCotizacion, ISolicitanteCotizacion } from '@/interface/cotizaciones.interface';

function AprobarCotizacion({ 
	cotizacion, 
	solicitantes = [], 
	items = [],
	onAprobarChange
}: { 
	cotizacion: ICotizacion; 
	solicitantes: ISolicitanteCotizacion[]; 
	items: IItemCotizacion[];
	onAprobarChange?: () => void;
}) {
	const dispatch = useAppDispatch();
	// Eliminado useAppSelector innecesario que causaba stale data
	const [isOpen, setIsOpen] = useState<boolean>(false);
	const [isAllItems, setIsAllItems] = useState<boolean>(false);
	const [itemsSeleccionado, setItemsSeleccionado] = useState<string[]>([]);
	const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
	const formik = useFormik({
		enableReinitialize: true,
		initialValues: {
			solicitante: '',
			fecha_aprobacion: '',
		},
		onSubmit: async (values) => {
			try {
				if (!values.solicitante || !values.fecha_aprobacion) {
					toast.error('Seleccione un solicitante y fecha de aprobación');
					return;
				}

				const itemIds = isAllItems
					? items.map((item) => item.id)
					: itemsSeleccionado.map((id) => Number(id)).filter((id) => !Number.isNaN(id));

				if (itemIds.length === 0) {
					toast.error('Seleccione al menos un ítem para aprobar');
					return;
				}

				const payload = {
					solicitante_id: values.solicitante,
					fecha_aprobacion: dayjs(values.fecha_aprobacion).format('YYYY-MM-DD'),
					item_ids: itemIds,
				};

				setIsSubmitting(true);
				const response = await ApiService.fetchData({
					url: `/api/cotizaciones/${cotizacion?.id}/aprobar-cotizacion/`,
					method: 'post',
					headers: { 'Content-Type': 'application/json' },
					data: JSON.stringify(payload),
				});
				if (response.data) {
					toast.success('Cotización Aprobada', { autoClose: 1000 });
					if (onAprobarChange) onAprobarChange();
					setIsOpen(false);
				}
			} catch (error: any) {
				const errorMessage = error.response?.data?.detail || error.message || 'Error al aprobar la cotización';
				toast.error(errorMessage, {
					toastId: 'Error al aprobar la cotizacion',
				});
			} finally {
				setIsSubmitting(false);
			}
		},
	});

	useEffect(() => {
		if (isOpen) {
			formik.resetForm();
		}
	}, [isOpen]);


	useEffect(() => {
		if (!isOpen) {
			return;
		}
		if (!formik.values.fecha_aprobacion) {
			formik.setFieldValue('fecha_aprobacion', dayjs().format('YYYY-MM-DD'));
		}
	}, [isOpen, formik]);

	useEffect(() => {
		if (!isOpen) {
			return;
		}
		if (!formik.values.solicitante && solicitantes.length > 0) {
			formik.setFieldValue('solicitante', solicitantes[0].id.toString());
		}
	}, [isOpen, solicitantes, formik]);


	return (
		<>
			<Tooltip text='Aprobar Cotizacion'>
				<Button
					variant='solid'
					color='emerald'
					onClick={() => {
						setIsOpen(true);
					}}
					icon='HeroHandThumbUp'
				/>
			</Tooltip>
			<Modal isOpen={isOpen} setIsOpen={setIsOpen} isStaticBackdrop isStaticBackdropAnimation>
				<ModalHeader>
					<Badge className='text-xl'>Aprobar Cotización</Badge>
				</ModalHeader>
				<ModalBody>
					<div className='flex flex-col gap-4'>
						<div>
							<Badge>Solicitante</Badge>
							<SelectReact
								name='solicitante'
								options={solicitantes.map((soli) => ({
									value: soli.id.toString(),
									label: soli.nombre_usuario,
								}))}
								noOptionsMessage={(e) => `No Existe ${e.inputValue}`}
								placeholder='Seleccione un Solicitante'
								value={{
									value: formik.values.solicitante,
									label:
										solicitantes.find(
											(soli) =>
												soli.id.toString() === formik.values.solicitante,
										)?.nombre_usuario || '',
								}}
								onBlur={formik.handleBlur}
								onChange={(e) => {
									formik.setFieldValue('solicitante', (e as TSelectOption).value);
								}}
							/>
						</div>
						<div>
							<Badge>Fecha de Aprobación</Badge>
							<Input
								type='date'
								name='fecha_aprobacion'
								onChange={formik.handleChange}
								onBlur={formik.handleBlur}
								value={formik.values.fecha_aprobacion}
							/>
						</div>
						{items.length > 0 && (
							<div className='flex flex-col gap-4'>
								<div className='flex flex-row gap-4'>
									<Badge className='text-xl'>Aprobar Items</Badge>
									<Checkbox
										name='aprobar'
										label='¿Aprobar todos los items?'
										onChange={(e) => {
											setIsAllItems(e.target.checked);
											if (e.target.checked) {
												setItemsSeleccionado(
													items.map((it) =>
														it.id.toString(),
													),
												);
											} else {
												setItemsSeleccionado([]);
											}
										}}
										checked={isAllItems}
									/>
								</div>
								<div className='grid grid-cols-3 gap-4'>
									{items.map((item, index) => (
										<Fragment key={index}>
											<div>
												<Badge>
													Nombre
													{!item.item_empresa && (
														<Tooltip text='Sin relacion a la empresa'>
															<Button
																size='xs'
																icon='HeroInformationCircle'></Button>
														</Tooltip>
													)}
												</Badge>
												<div className='ml-4'>{item.nombre_item}</div>
											</div>
											<div>
												<Badge>Cantidad</Badge>
												<div className='ml-4'>{item.cantidad}</div>
											</div>
											<div>
												<Checkbox
													name='item_seleccionado'
													onChange={(e) => {
														setIsAllItems(false)
														if (!e.target.checked) {
															setItemsSeleccionado((prevLista) =>
																prevLista.filter(
																	(val) =>
																		val !== item.id.toString(),
																),
															);
														} else {
															setItemsSeleccionado((prevLista) => [
																...prevLista,
																item.id.toString(),
															]);
														}
													}}
													checked={itemsSeleccionado.includes(
														item.id.toString(),
													)}
												/>
											</div>
										</Fragment>
									))}
								</div>
							</div>
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
						<Button
							variant='solid'
							isDisable={isSubmitting}
							onClick={() => {
								formik.handleSubmit();
							}}>
							{isSubmitting ? 'Guardando...' : 'Guardar'}
						</Button>
					</ModalFooterChild>
				</ModalFooter>
			</Modal>
		</>
	);
}

export default AprobarCotizacion;
