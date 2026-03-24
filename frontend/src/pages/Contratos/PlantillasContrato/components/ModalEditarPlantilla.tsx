import Checkbox from '@/components/form/Checkbox';
import Input from '@/components/form/Input';
import Label from '@/components/form/Label';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Textarea from '@/components/form/Textarea';
import Validation from '@/components/form/Validation';
import Button from '@/components/ui/Button';
import Modal, { ModalBody, ModalFooter, ModalHeader } from '@/components/ui/Modal';
import {
    FORMAS_PAGO_COMERCIALES,
    TIPO_CONTRATO,
    TIPO_MONEDA_LICENCIA,
} from '@/constants/contrato.constant';
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

const monedaOptions: TSelectOption[] = TIPO_MONEDA_LICENCIA.map((m) => ({
    value: m.value,
    label: m.label,
}));

const formaPagoOptions: TSelectOption[] = FORMAS_PAGO_COMERCIALES.map((f) => ({
    value: f.value,
    label: f.label,
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

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            titulo: plantilla?.titulo || '',
            tipo_contrato: plantilla?.tipo_contrato || '',
            descripcion: plantilla?.descripcion || '',
            activa: plantilla?.activa ?? true,
            moneda_cobro: plantilla?.moneda_cobro || 'CLP',
            forma_pago_contractual: plantilla?.forma_pago_contractual || 'mensual',
            lugar_firma: plantilla?.lugar_firma || '',
            renovacion_automatica: plantilla?.renovacion_automatica ?? true,
            dias_aviso_termino: plantilla?.dias_aviso_termino ?? 60,
        },
        validationSchema,
        onSubmit: async (values) => {
            if (!plantilla) return;
            try {
                await updatePlantilla({
                    id: plantilla.id,
                    data: {
                        ...values,
                        tipo_contrato: values.tipo_contrato as IPlantillaContrato['tipo_contrato'],
                        lugar_firma: values.lugar_firma || null,
                    },
                }).unwrap();
                toast.success('Configuracion actualizada');
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
            <ModalHeader>Configuracion de plantilla</ModalHeader>
            <ModalBody>
                <div className='flex flex-col gap-4'>
                    <div>
                        <Label htmlFor='edit-pl-titulo'>Titulo</Label>
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
                            />
                        </Validation>
                    </div>
                    <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
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
                                />
                            </Validation>
                        </div>
                        <div>
                            <Label htmlFor='edit-pl-moneda'>Moneda de cobro</Label>
                            <SelectReact
                                id='edit-pl-moneda'
                                name='moneda_cobro'
                                options={monedaOptions}
                                value={monedaOptions.find(
                                    (o) => o.value === formik.values.moneda_cobro,
                                )}
                                onChange={(option) =>
                                    formik.setFieldValue(
                                        'moneda_cobro',
                                        (option as TSelectOption)?.value || 'CLP',
                                    )
                                }
                            />
                        </div>
                    </div>
                    <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                        <div>
                            <Label htmlFor='edit-pl-forma-pago'>Forma de pago</Label>
                            <SelectReact
                                id='edit-pl-forma-pago'
                                name='forma_pago_contractual'
                                options={formaPagoOptions}
                                value={formaPagoOptions.find(
                                    (o) => o.value === formik.values.forma_pago_contractual,
                                )}
                                onChange={(option) =>
                                    formik.setFieldValue(
                                        'forma_pago_contractual',
                                        (option as TSelectOption)?.value || 'mensual',
                                    )
                                }
                            />
                        </div>
                        <div>
                            <Label htmlFor='edit-pl-lugar-firma'>Lugar de firma</Label>
                            <Input
                                id='edit-pl-lugar-firma'
                                name='lugar_firma'
                                value={formik.values.lugar_firma}
                                onChange={formik.handleChange}
                                placeholder='Ej: Santiago, Chile'
                            />
                        </div>
                    </div>
                    <div>
                        <Label htmlFor='edit-pl-descripcion'>Descripcion (opcional)</Label>
                        <Textarea
                            id='edit-pl-descripcion'
                            name='descripcion'
                            value={formik.values.descripcion}
                            onChange={formik.handleChange}
                            rows={3}
                        />
                    </div>
                    <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                        <div className='rounded-lg border border-zinc-200 p-3 dark:border-zinc-700'>
                            <Checkbox
                                id='edit-pl-activa'
                                name='activa'
                                checked={formik.values.activa}
                                onChange={formik.handleChange}
                                label='Plantilla activa'
                            />
                        </div>
                        <div className='rounded-lg border border-zinc-200 p-3 dark:border-zinc-700'>
                            <Checkbox
                                id='edit-pl-renovacion'
                                name='renovacion_automatica'
                                checked={formik.values.renovacion_automatica}
                                onChange={formik.handleChange}
                                label='Renovación automática'
                            />
                            <p className='mt-1 text-xs text-zinc-500'>
                                Default para contratos creados con esta plantilla.
                            </p>
                        </div>
                    </div>
                    <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                        <div>
                            <Label htmlFor='edit-pl-dias-aviso'>Días de aviso de término</Label>
                            <Input
                                id='edit-pl-dias-aviso'
                                name='dias_aviso_termino'
                                type='number'
                                value={formik.values.dias_aviso_termino}
                                onChange={formik.handleChange}
                            />
                        </div>
                        <div className='rounded-lg border border-zinc-200 p-3 dark:border-zinc-700'>
                            <p className='text-sm font-semibold text-zinc-900 dark:text-zinc-100'>
                                Version actual
                            </p>
                            <p className='mt-1 text-sm text-zinc-500'>
                                v{plantilla?.version ?? '-'}
                            </p>
                        </div>
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
                    icon='HeroCheck'
                    onClick={() => formik.handleSubmit()}
                    isLoading={isLoading}
                    isDisable={isLoading}>
                    Guardar configuracion
                </Button>
            </ModalFooter>
        </Modal>
    );
};

export default ModalEditarPlantilla;
