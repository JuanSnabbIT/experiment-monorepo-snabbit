import Input from '@/components/form/Input';
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
import ApiService from '@/services/ApiService';
import { listaServiciosGeneralesThunk, useAppDispatch, useAppSelector } from '@/store';
import { useFormik } from 'formik';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import * as Yup from 'yup';

function CrearServicioEnOT() {
	const dispatch = useAppDispatch();
	const { detalleOrdenTrabajo } = useAppSelector((state) => state.ordenTrabajo);
	const [isOpen, setIsOpen] = useState<boolean>(false);

	const formik = useFormik({
		enableReinitialize: true,
		initialValues: {
			nombre: '',
			descripcion: '',
		},
		validationSchema: Yup.object().shape({
			nombre: Yup.string()
				.required('Requerido')
				.nonNullable('Requerido')
				.max(100, 'Maximo 100 Caracteres'),
			descripcion: Yup.string().required('Requerido').nonNullable('Requerido'),
		}),
		onSubmit: async (values) => {
			try {
				const data = {
					nombre: values.nombre,
					orden: detalleOrdenTrabajo?.id,
					descripcion: values.descripcion,
				};
				const response = await ApiService.fetchData({
					url: `/api/ordenes-de-trabajo/${detalleOrdenTrabajo?.id}/servicios-generales/`,
					method: 'post',
					headers: { 'Content-Type': 'application/json' },
					data: JSON.stringify(data),
				});
				if (response.data) {
					toast.success('Servicio creado', { autoClose: 1000 });
					formik.resetForm();
					setIsOpen(false);
					dispatch(listaServiciosGeneralesThunk({ id_orden: detalleOrdenTrabajo?.id }));
				}
			} catch (error: any) {
				toast.error(error.response?.data || 'Error al crear el servicio en OT', {
					toastId: 'Error crear servicio OT',
				});
			}
		},
	});

	useEffect(() => {
		if (!isOpen) {
			formik.resetForm();
		}
	}, [isOpen]);

	return (
		<>
			<Tooltip text='Crear Servicio'>
				<Button
					variant='solid'
					icon='HeroPlus'
					onClick={() => {
						setIsOpen(true);
					}}></Button>
			</Tooltip>
			<Modal isOpen={isOpen} setIsOpen={setIsOpen} isStaticBackdrop={true}>
				<ModalHeader>
					<Badge className='text-xl'>Crear Servicio</Badge>
				</ModalHeader>
				<ModalBody>
					<div className='flex flex-col gap-4'>
						<div>
							<Badge>Nombre</Badge>
							<Validation
								isValid={formik.isValid}
								isTouched={formik.touched.nombre}
								invalidFeedback={formik.errors.nombre}>
								<Input
									name='nombre'
									onBlur={formik.handleBlur}
									onChange={formik.handleChange}
									value={formik.values.nombre}
								/>
							</Validation>
							<div className='text-xs'>
								Caracteres restantes: {100 - formik.values.nombre.length}
							</div>
						</div>
						<div>
							<Badge>Descripción</Badge>
							<Validation
								isValid={formik.isValid}
								isTouched={formik.touched.descripcion}
								invalidFeedback={formik.errors.descripcion}>
								<Textarea
									name='descripcion'
									onBlur={formik.handleBlur}
									onChange={formik.handleChange}
									value={formik.values.descripcion}
								/>
							</Validation>
						</div>
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
							onClick={() => {
								formik.handleSubmit();
							}}>
							Crear
						</Button>
					</ModalFooterChild>
				</ModalFooter>
			</Modal>
		</>
	);
}

export default CrearServicioEnOT;
