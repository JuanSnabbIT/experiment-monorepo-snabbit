import Input from '@/components/form/Input';
import Label from '@/components/form/Label';
import Textarea from '@/components/form/Textarea';
import Validation from '@/components/form/Validation';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal, { ModalBody, ModalFooter, ModalFooterChild, ModalHeader } from '@/components/ui/Modal';
import { ICaracteristicaServicio } from '@/interface/contrato.interface';
import {
    useCreateCaracteristicaServicioMutation,
    useUpdateCaracteristicaServicioMutation,
} from '@/store/slices/contratos/contratoApi';
import { getErrorMessage } from '@/utils/errorHandlers';
import { useFormik } from 'formik';
import { Dispatch, SetStateAction, useEffect } from 'react';
import { toast } from 'react-toastify';
import * as Yup from 'yup';

interface IModalCaracteristicaServicioProps {
    isOpen: boolean;
    setIsOpen: Dispatch<SetStateAction<boolean>>;
    caracteristica?: ICaracteristicaServicio;
}

const validationSchema = Yup.object({
    nombre: Yup.string()
        .min(2, 'Mínimo 2 caracteres')
        .max(255, 'Máximo 255 caracteres')
        .required('El nombre es requerido'),
    descripcion: Yup.string().max(1000, 'Máximo 1000 caracteres').nullable(),
});

const ModalCaracteristicaServicio = ({
    isOpen,
    setIsOpen,
    caracteristica,
}: IModalCaracteristicaServicioProps) => {
    const isEditing = !!caracteristica;
    const [createCaracteristica] = useCreateCaracteristicaServicioMutation();
    const [updateCaracteristica] = useUpdateCaracteristicaServicioMutation();

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            nombre: caracteristica?.nombre || '',
            descripcion: caracteristica?.descripcion || '',
        },
        validationSchema,
        onSubmit: async (values) => {
            try {
                if (isEditing) {
                    await updateCaracteristica({
                        id: caracteristica.id,
                        data: values,
                    }).unwrap();
                    toast.success('Característica actualizada correctamente');
                } else {
                    await createCaracteristica(values).unwrap();
                    toast.success('Característica creada correctamente');
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
        <Modal isStaticBackdrop isOpen={isOpen} setIsOpen={setIsOpen}>
            <ModalHeader>
                <Badge className='text-xl'>
                    {isEditing ? 'Editar Característica' : 'Crear Característica'}
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
                                placeholder='Nombre de la característica'
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
                                placeholder='Descripción (opcional)'
                                value={formik.values.descripcion}
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                                rows={3}
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

export default ModalCaracteristicaServicio;
