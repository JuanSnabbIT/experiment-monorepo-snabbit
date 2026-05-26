import Input from '@/components/form/Input';
import Label from '@/components/form/Label';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Textarea from '@/components/form/Textarea';
import Validation from '@/components/form/Validation';
import Button from '@/components/ui/Button';
import Modal, { ModalBody, ModalFooter, ModalHeader } from '@/components/ui/Modal';
import { TIPO_CONTRATO } from '@/constants/contrato.constant';
import { IPlantillaContrato } from '@/interface/plantillaContrato.interface';
import { useCreatePlantillaMutation } from '@/store/slices/contratos/plantillaContratoApi';
import { getErrorMessage } from '@/utils/errorHandlers';
import { useFormik } from 'formik';
import { Dispatch, SetStateAction } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import * as Yup from 'yup';

interface IModalCrearPlantillaProps {
    isOpen: boolean;
    setIsOpen: Dispatch<SetStateAction<boolean>>;
    onCreated?: (id: number) => void;
}

const tipoOptions: TSelectOption[] = TIPO_CONTRATO.map((t) => ({
    value: t.value,
    label: t.label,
}));

const validationSchema = Yup.object({
    titulo: Yup.string().required('El título es requerido'),
    tipo_contrato: Yup.string().required('El tipo de contrato es requerido'),
    descripcion: Yup.string().nullable(),
});

const ModalCrearPlantilla = ({ isOpen, setIsOpen, onCreated }: IModalCrearPlantillaProps) => {
    const navigate = useNavigate();
    const [createPlantilla, { isLoading }] = useCreatePlantillaMutation();

    const formik = useFormik({
        initialValues: {
            titulo: '',
            tipo_contrato: '',
            descripcion: '',
        },
        validationSchema,
        onSubmit: async (values, { resetForm }) => {
            try {
                const nueva = await createPlantilla({
                    ...values,
                    tipo_contrato: values.tipo_contrato as IPlantillaContrato['tipo_contrato'],
                }).unwrap();
                toast.success('Plantilla creada correctamente');
                resetForm();
                setIsOpen(false);
                if (onCreated) {
                    onCreated(nueva.id);
                } else {
                    navigate(`/registros/plantillas-contrato/${nueva.id}`);
                }
            } catch (error: unknown) {
                toast.error(getErrorMessage(error));
            }
        },
    });

    return (
        <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
            <ModalHeader>Nueva Plantilla de Contrato</ModalHeader>
            <ModalBody>
                <div className='flex flex-col gap-4'>
                    <div>
                        <Label htmlFor='modal-titulo'>Título</Label>
                        <Validation
                            isValid={formik.isValid}
                            isTouched={formik.touched.titulo}
                            invalidFeedback={formik.errors.titulo}>
                            <Input
                                id='modal-titulo'
                                name='titulo'
                                value={formik.values.titulo}
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                            />
                        </Validation>
                    </div>
                    <div>
                        <Label htmlFor='modal-tipo_contrato'>Tipo de Contrato</Label>
                        <Validation
                            isValid={formik.isValid}
                            isTouched={formik.touched.tipo_contrato}
                            invalidFeedback={formik.errors.tipo_contrato}>
                            <SelectReact
                                id='modal-tipo_contrato'
                                name='tipo_contrato'
                                options={tipoOptions}
                                value={tipoOptions.find(
                                    (o) => o.value === formik.values.tipo_contrato,
                                )}
                                onChange={(option) =>
                                    formik.setFieldValue(
                                        'tipo_contrato',
                                        (option as TSelectOption)?.value || '',
                                    )
                                }
                            />
                        </Validation>
                    </div>
                    <div>
                        <Label htmlFor='modal-descripcion'>Descripción (opcional)</Label>
                        <Textarea
                            id='modal-descripcion'
                            name='descripcion'
                            value={formik.values.descripcion}
                            onChange={formik.handleChange}
                            rows={3}
                        />
                    </div>
                </div>
            </ModalBody>
            <ModalFooter>
                <Button
                    onClick={() => {
                        formik.resetForm();
                        setIsOpen(false);
                    }}>
                    Cancelar
                </Button>
                <Button
                    variant='solid'
                    onClick={() => formik.handleSubmit()}
                    isLoading={isLoading}
                    isDisable={isLoading}>
                    Crear Plantilla
                </Button>
            </ModalFooter>
        </Modal>
    );
};

export default ModalCrearPlantilla;
