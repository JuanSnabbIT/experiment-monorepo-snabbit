import Input from '@/components/form/Input';
import Label from '@/components/form/Label';
import Textarea from '@/components/form/Textarea';
import Validation from '@/components/form/Validation';
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
    onSaved?: (caracteristica: ICaracteristicaServicio) => void;
}

const validationSchema = Yup.object({
    nombre: Yup.string()
        .min(2, 'Minimo 2 caracteres')
        .max(255, 'Maximo 255 caracteres')
        .required('El nombre es requerido'),
    descripcion: Yup.string().max(1000, 'Maximo 1000 caracteres').nullable(),
});

const ModalCaracteristicaServicio = ({
    isOpen,
    setIsOpen,
    caracteristica,
    onSaved,
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
                let savedCaracteristica: ICaracteristicaServicio;
                if (isEditing && caracteristica) {
                    savedCaracteristica = await updateCaracteristica({
                        id: caracteristica.id,
                        data: values,
                    }).unwrap();
                    toast.success('Caracteristica actualizada correctamente');
                } else {
                    savedCaracteristica = await createCaracteristica(values).unwrap();
                    toast.success('Caracteristica creada correctamente');
                }
                onSaved?.(savedCaracteristica);
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    return (
        <Modal isStaticBackdrop isOpen={isOpen} setIsOpen={setIsOpen}>
            <ModalHeader>
                <Badge className='text-xl'>
                    {isEditing ? 'Editar Caracteristica' : 'Crear Caracteristica'}
                </Badge>
            </ModalHeader>
            <ModalBody>
                <div className='flex flex-col gap-4'>
                    <div className='flex items-center gap-2'>
                        <Tooltip
                            text='Las características definen qué incluye o no un servicio. Ej: Soporte remoto, Backup diario, Tiempo de respuesta 4h, Instalación de parches de seguridad.'
                            placement='bottom'>
                            <span className='inline-flex cursor-help items-center text-blue-400'>
                                <Icon icon='HeroInformationCircle' className='text-lg' />
                            </span>
                        </Tooltip>
                        <span className='text-xs text-zinc-400'>¿Qué es una característica?</span>
                    </div>
                    <div>
                        <Label htmlFor='nombre'>Nombre</Label>
                        <Validation
                            isValid={formik.isValid}
                            isTouched={formik.touched.nombre}
                            invalidFeedback={formik.errors.nombre}>
                            <Input
                                id='nombre'
                                name='nombre'
                                placeholder='Nombre de la caracteristica'
                                value={formik.values.nombre}
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                            />
                        </Validation>
                    </div>
                    <div>
                        <Label htmlFor='descripcion'>Descripcion</Label>
                        <Validation
                            isValid={formik.isValid}
                            isTouched={formik.touched.descripcion}
                            invalidFeedback={formik.errors.descripcion}>
                            <Textarea
                                id='descripcion'
                                name='descripcion'
                                placeholder='Descripcion opcional'
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
