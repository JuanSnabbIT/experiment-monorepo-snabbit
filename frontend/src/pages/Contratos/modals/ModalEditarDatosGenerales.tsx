import Input from '@/components/form/Input';
import Label from '@/components/form/Label';
import Textarea from '@/components/form/Textarea';
import Validation from '@/components/form/Validation';
import Button from '@/components/ui/Button';
import Modal, {
    ModalBody,
    ModalFooter,
    ModalFooterChild,
    ModalHeader,
} from '@/components/ui/Modal';
import { IContratoEmpresaCliente } from '@/interface/contrato.interface';
import { usePatchContratoMutation } from '@/store/slices/contratos/contratoApi';
import { getErrorMessage } from '@/utils/errorHandlers';
import { useFormik } from 'formik';
import { Dispatch, SetStateAction, useEffect } from 'react';
import { toast } from 'react-toastify';
import * as Yup from 'yup';

interface IModalEditarDatosGeneralesProps {
    contrato: IContratoEmpresaCliente;
    isOpen: boolean;
    setIsOpen: Dispatch<SetStateAction<boolean>>;
}

const validationSchema = Yup.object().shape({
    nombre: Yup.string()
        .required('Requerido')
        .nonNullable('Requerido')
        .max(100, 'Máximo 100 caracteres'),
    fecha_inicio: Yup.string().required('Requerido').nonNullable('Requerido'),
    fecha_fin: Yup.string().notRequired().nullable(),
    observaciones: Yup.string().notRequired().nullable(),
});

function ModalEditarDatosGenerales({
    contrato,
    isOpen,
    setIsOpen,
}: IModalEditarDatosGeneralesProps) {
    const [patchContrato] = usePatchContratoMutation();

    const formik = useFormik({
        initialValues: {
            nombre: contrato.nombre,
            fecha_inicio: contrato.fecha_inicio ?? '',
            fecha_fin: contrato.fecha_fin ?? '',
            observaciones: contrato.observaciones ?? '',
        },
        validationSchema,
        enableReinitialize: true,
        onSubmit: async (values) => {
            try {
                await patchContrato({
                    id: contrato.id,
                    data: {
                        nombre: values.nombre,
                        fecha_inicio: values.fecha_inicio || undefined,
                        fecha_fin: values.fecha_fin || undefined,
                        observaciones: values.observaciones || undefined,
                    } as Partial<IContratoEmpresaCliente>,
                }).unwrap();
                toast.success('Datos actualizados', { autoClose: 1000 });
                setIsOpen(false);
            } catch (error: unknown) {
                toast.error(getErrorMessage(error));
            }
        },
    });

    useEffect(() => {
        if (isOpen) {
            formik.resetForm({
                values: {
                    nombre: contrato.nombre,
                    fecha_inicio: contrato.fecha_inicio ?? '',
                    fecha_fin: contrato.fecha_fin ?? '',
                    observaciones: contrato.observaciones ?? '',
                },
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    return (
        <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
            <ModalHeader>Editar Datos Generales</ModalHeader>
            <ModalBody>
                <div className='grid grid-cols-2 gap-4'>
                    <div className='col-span-full'>
                        <Label htmlFor='nombre'>Nombre</Label>
                        <Validation
                            isValid={formik.isValid}
                            isTouched={formik.touched.nombre}
                            invalidFeedback={formik.errors.nombre}>
                            <Input
                                id='nombre'
                                name='nombre'
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                                value={formik.values.nombre}
                            />
                        </Validation>
                    </div>
                    <div>
                        <Label htmlFor='fecha_inicio'>Fecha de inicio</Label>
                        <Validation
                            isValid={formik.isValid}
                            isTouched={formik.touched.fecha_inicio}
                            invalidFeedback={formik.errors.fecha_inicio}>
                            <Input
                                id='fecha_inicio'
                                name='fecha_inicio'
                                type='date'
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                                value={formik.values.fecha_inicio}
                            />
                        </Validation>
                    </div>
                    <div>
                        <Label htmlFor='fecha_fin'>Fecha de fin</Label>
                        <Validation
                            isValid={formik.isValid}
                            isTouched={formik.touched.fecha_fin}
                            invalidFeedback={formik.errors.fecha_fin}>
                            <Input
                                id='fecha_fin'
                                name='fecha_fin'
                                type='date'
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                                value={formik.values.fecha_fin}
                            />
                        </Validation>
                    </div>
                    <div className='col-span-full'>
                        <Label htmlFor='observaciones'>Observaciones</Label>
                        <Textarea
                            id='observaciones'
                            name='observaciones'
                            rows={4}
                            onChange={formik.handleChange}
                            onBlur={formik.handleBlur}
                            value={formik.values.observaciones}
                        />
                    </div>
                </div>
            </ModalBody>
            <ModalFooter>
                <ModalFooterChild />
                <ModalFooterChild>
                    <Button onClick={() => setIsOpen(false)}>Cancelar</Button>
                    <Button
                        variant='solid'
                        isLoading={formik.isSubmitting}
                        onClick={() => formik.handleSubmit()}>
                        Guardar
                    </Button>
                </ModalFooterChild>
            </ModalFooter>
        </Modal>
    );
}

export default ModalEditarDatosGenerales;
