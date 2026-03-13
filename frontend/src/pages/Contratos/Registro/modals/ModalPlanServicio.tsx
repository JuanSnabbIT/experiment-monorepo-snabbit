import Input from '@/components/form/Input';
import Label from '@/components/form/Label';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Textarea from '@/components/form/Textarea';
import Validation from '@/components/form/Validation';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal, { ModalBody, ModalFooter, ModalFooterChild, ModalHeader } from '@/components/ui/Modal';
import { IPlanServicio } from '@/interface/contrato.interface';
import {
    useCreatePlanServicioMutation,
    useGetServiciosQuery,
    useUpdatePlanServicioMutation,
} from '@/store/slices/contratos/contratoApi';
import { getErrorMessage } from '@/utils/errorHandlers';
import { useFormik } from 'formik';
import { Dispatch, SetStateAction, useEffect } from 'react';
import { toast } from 'react-toastify';
import * as Yup from 'yup';

interface IModalPlanServicioProps {
    isOpen: boolean;
    setIsOpen: Dispatch<SetStateAction<boolean>>;
    plan?: IPlanServicio;
}

const validationSchema = Yup.object({
    nombre: Yup.string()
        .min(2, 'Mínimo 2 caracteres')
        .max(255, 'Máximo 255 caracteres')
        .required('El nombre es requerido'),
    descripcion: Yup.string().max(1000, 'Máximo 1000 caracteres').nullable(),
    servicios_ids: Yup.array().of(Yup.number()).min(1, 'Debe incluir al menos un servicio'),
});

const ModalPlanServicio = ({ isOpen, setIsOpen, plan }: IModalPlanServicioProps) => {
    const isEditing = !!plan;
    const [createPlan] = useCreatePlanServicioMutation();
    const [updatePlan] = useUpdatePlanServicioMutation();
    const { data: servicios = [] } = useGetServiciosQuery();

    const serviciosOptions: TSelectOption[] = servicios.map((s) => ({
        value: String(s.id),
        label: `${s.nombre} (${s.categoria_label})`,
    }));

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            nombre: plan?.nombre || '',
            descripcion: plan?.descripcion || '',
            servicios_ids: plan?.servicios?.map((s) => s.id) || [],
        },
        validationSchema,
        onSubmit: async (values) => {
            try {
                const payload = {
                    nombre: values.nombre,
                    descripcion: values.descripcion,
                    servicios_ids: values.servicios_ids,
                };
                if (isEditing) {
                    await updatePlan({ id: plan.id, data: payload }).unwrap();
                    toast.success('Plan actualizado correctamente');
                } else {
                    await createPlan(payload).unwrap();
                    toast.success('Plan creado correctamente');
                }
                setIsOpen(false);
            } catch (error: unknown) {
                toast.error(getErrorMessage(error));
            }
        },
    });

    useEffect(() => {
        if (!isOpen) {
            formik.resetForm();
        }
    }, [isOpen]);

    return (
        <Modal isStaticBackdrop isOpen={isOpen} setIsOpen={setIsOpen} size='lg'>
            <ModalHeader>
                <Badge className='text-xl'>
                    {isEditing ? 'Editar Plan de Servicio' : 'Crear Plan de Servicio'}
                </Badge>
            </ModalHeader>
            <ModalBody>
                <div className='flex flex-col gap-4'>
                    <div>
                        <Label htmlFor='nombre'>Nombre</Label>
                        <Validation
                            isValid={formik.isValid}
                            isTouched={formik.touched.nombre}
                            invalidFeedback={formik.errors.nombre}>
                            <Input
                                id='nombre'
                                name='nombre'
                                placeholder='Nombre del plan'
                                value={formik.values.nombre}
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                            />
                        </Validation>
                    </div>
                    <div>
                        <Label htmlFor='descripcion'>Descripción</Label>
                        <Validation
                            isValid={formik.isValid}
                            isTouched={formik.touched.descripcion}
                            invalidFeedback={formik.errors.descripcion}>
                            <Textarea
                                id='descripcion'
                                name='descripcion'
                                placeholder='Descripción del plan (opcional)'
                                value={formik.values.descripcion}
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                                rows={3}
                            />
                        </Validation>
                    </div>
                    <div>
                        <Label htmlFor='servicios'>Servicios incluidos</Label>
                        <Validation
                            isValid={formik.isValid}
                            isTouched={formik.touched.servicios_ids}
                            invalidFeedback={
                                typeof formik.errors.servicios_ids === 'string'
                                    ? formik.errors.servicios_ids
                                    : undefined
                            }>
                            <SelectReact
                                isMulti
                                options={serviciosOptions}
                                value={serviciosOptions.filter((o) =>
                                    formik.values.servicios_ids.includes(Number(o.value)),
                                )}
                                onChange={(options) => {
                                    const selected = options as TSelectOption[];
                                    formik.setFieldValue(
                                        'servicios_ids',
                                        selected.map((o) => Number(o.value)),
                                    );
                                }}
                                name='servicios'
                                placeholder='Seleccionar servicios...'
                            />
                        </Validation>
                    </div>
                </div>
            </ModalBody>
            <ModalFooter>
                <ModalFooterChild />
                <ModalFooterChild>
                    <Button color='red' onClick={() => setIsOpen(false)}>
                        Cancelar
                    </Button>
                    <Button
                        variant='solid'
                        onClick={() => formik.handleSubmit()}
                        isDisable={formik.isSubmitting}>
                        {isEditing ? 'Actualizar' : 'Guardar'}
                    </Button>
                </ModalFooterChild>
            </ModalFooter>
        </Modal>
    );
};

export default ModalPlanServicio;
