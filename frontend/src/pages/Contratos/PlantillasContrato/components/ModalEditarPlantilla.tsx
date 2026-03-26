import Checkbox from '@/components/form/Checkbox';
import Input from '@/components/form/Input';
import Label from '@/components/form/Label';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Textarea from '@/components/form/Textarea';
import Validation from '@/components/form/Validation';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import Modal, { ModalBody, ModalFooter, ModalHeader } from '@/components/ui/Modal';
import { TIPO_CONTRATO } from '@/constants/contrato.constant';
import { IPlantillaContrato } from '@/interface/plantillaContrato.interface';
import { useUpdatePlantillaMutation } from '@/store/slices/contratos/plantillaContratoApi';
import { getErrorMessage } from '@/utils/errorHandlers';
import { useFormik } from 'formik';
import { Dispatch, SetStateAction, useEffect } from 'react';
import { toast } from 'react-toastify';
import * as Yup from 'yup';

interface IModalEditarPlantillaProps {
    isOpen: boolean;
    setIsOpen: Dispatch<SetStateAction<boolean>>;
    plantilla: IPlantillaContrato | null;
}

const tipoOptions: TSelectOption[] = TIPO_CONTRATO.map((t) => ({
    value: t.value,
    label: t.label,
}));

const validationSchema = Yup.object({
    titulo: Yup.string().required('El titulo es requerido'),
    tipo_contrato: Yup.string().required('El tipo es requerido'),
    descripcion: Yup.string().nullable(),
});

const ModalEditarPlantilla = ({
    isOpen,
    setIsOpen,
    plantilla,
}: IModalEditarPlantillaProps) => {
    const [updatePlantilla, { isLoading }] = useUpdatePlantillaMutation();
    const esDefault = plantilla?.es_default ?? false;

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            titulo: plantilla?.titulo || '',
            tipo_contrato: plantilla?.tipo_contrato || '',
            descripcion: plantilla?.descripcion || '',
            activa: plantilla?.activa ?? true,
        },
        validationSchema,
        onSubmit: async (values) => {
            if (!plantilla || esDefault) return;
            try {
                await updatePlantilla({
                    id: plantilla.id,
                    data: {
                        ...values,
                        tipo_contrato: values.tipo_contrato as IPlantillaContrato['tipo_contrato'],
                    },
                }).unwrap();
                toast.success('Configuración actualizada');
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
        <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
            <ModalHeader>Configuración de plantilla</ModalHeader>
            <ModalBody>
                <div className='flex flex-col gap-4'>
                    {esDefault && (
                        <Alert color='blue' icon='HeroInformationCircle' variant='outline'>
                            Esta es una plantilla del sistema y no se puede modificar. Puedes
                            duplicarla para crear una versión personalizada.
                        </Alert>
                    )}
                    <div>
                        <Label htmlFor='edit-pl-titulo'>Título</Label>
                        <Validation
                            isValid={formik.isValid}
                            isTouched={formik.touched.titulo}
                            invalidFeedback={formik.errors.titulo}>
                            <Input
                                id='edit-pl-titulo'
                                name='titulo'
                                value={formik.values.titulo}
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                                disabled={esDefault}
                            />
                        </Validation>
                    </div>
                    <div>
                        <Label htmlFor='edit-pl-tipo'>Tipo de contrato</Label>
                        <Validation
                            isValid={formik.isValid}
                            isTouched={formik.touched.tipo_contrato}
                            invalidFeedback={formik.errors.tipo_contrato}>
                            <SelectReact
                                id='edit-pl-tipo'
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
                                isDisabled={esDefault}
                            />
                        </Validation>
                    </div>
                    <div>
                        <Label htmlFor='edit-pl-descripcion'>Descripción (opcional)</Label>
                        <Textarea
                            id='edit-pl-descripcion'
                            name='descripcion'
                            value={formik.values.descripcion}
                            onChange={formik.handleChange}
                            rows={3}
                            disabled={esDefault}
                        />
                    </div>
                    <div className='rounded-lg border border-zinc-200 p-3 dark:border-zinc-700'>
                        <Checkbox
                            id='edit-pl-activa'
                            name='activa'
                            checked={formik.values.activa}
                            onChange={formik.handleChange}
                            label='Plantilla activa'
                            disabled={esDefault}
                        />
                    </div>
                    <div className='rounded-lg border border-zinc-200 p-3 dark:border-zinc-700'>
                        <p className='text-sm font-semibold text-zinc-900 dark:text-zinc-100'>
                            Versión actual
                        </p>
                        <p className='mt-1 text-sm text-zinc-500'>
                            v{plantilla?.version ?? '-'}
                        </p>
                    </div>
                </div>
            </ModalBody>
            <ModalFooter>
                <Button
                    onClick={() => {
                        formik.resetForm();
                        setIsOpen(false);
                    }}>
                    {esDefault ? 'Cerrar' : 'Cancelar'}
                </Button>
                {!esDefault && (
                    <Button
                        variant='solid'
                        icon='HeroCheck'
                        onClick={() => formik.handleSubmit()}
                        isLoading={isLoading}
                        isDisable={isLoading}>
                        Guardar configuración
                    </Button>
                )}
            </ModalFooter>
        </Modal>
    );
};

export default ModalEditarPlantilla;
