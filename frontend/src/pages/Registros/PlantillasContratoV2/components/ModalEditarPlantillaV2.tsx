import Checkbox from '@/components/form/Checkbox';
import Input from '@/components/form/Input';
import Label from '@/components/form/Label';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Textarea from '@/components/form/Textarea';
import Validation from '@/components/form/Validation';
import Alert from '@/components/ui/Alert';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal, { ModalBody, ModalFooter, ModalHeader } from '@/components/ui/Modal';
import { TIPO_CONTRATO } from '@/constants/contrato.constant';
import { IPlantillaContratoV2 } from '@/interface/plantillaContratoV2.interface';
import { useUpdatePlantillaV2Mutation } from '@/store/slices/contratos/plantillaContratoV2Api';
import { getErrorMessage } from '@/utils/errorHandlers';
import { useFormik } from 'formik';
import { Dispatch, SetStateAction, useEffect } from 'react';
import { toast } from 'react-toastify';
import * as Yup from 'yup';

const SUBTIPO_TRABAJADOR_OPTIONS: TSelectOption[] = [
    { value: '',           label: 'Todos los subtipos (plantilla genérica)' },
    { value: 'indefinido', label: 'Solo contratos indefinidos' },
    { value: 'plazo_fijo', label: 'Solo contratos a plazo fijo' },
    { value: 'reemplazo',  label: 'Solo contratos de reemplazo' },
];

interface IModalEditarPlantillaV2Props {
    isOpen: boolean;
    setIsOpen: Dispatch<SetStateAction<boolean>>;
    plantilla: IPlantillaContratoV2 | null;
}

const tipoOptions: TSelectOption[] = TIPO_CONTRATO.map((t) => ({
    value: t.value,
    label: t.label,
}));

const validationSchema = Yup.object({
    titulo: Yup.string().required('El título es requerido'),
    tipo_contrato: Yup.string().required('El tipo es requerido'),
    descripcion: Yup.string().nullable(),
});

const ModalEditarPlantillaV2 = ({
    isOpen,
    setIsOpen,
    plantilla,
}: IModalEditarPlantillaV2Props) => {
    const [updatePlantilla, { isLoading }] = useUpdatePlantillaV2Mutation();

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            titulo: plantilla?.titulo || '',
            tipo_contrato: plantilla?.tipo_contrato || '',
            subtipo_trabajador: plantilla?.subtipo_trabajador || '',
            descripcion: plantilla?.descripcion || '',
            activa: plantilla?.activa ?? true,
            version_editor: (plantilla?.version_editor ?? 'v2') as 'v2' | 'v29',
        },
        validationSchema,
        onSubmit: async (values) => {
            if (!plantilla) return;
            try {
                await updatePlantilla({
                    id: plantilla.id,
                    ...values,
                    subtipo_trabajador: values.subtipo_trabajador || null,
                }).unwrap();
                toast.success('Configuración actualizada');
                setIsOpen(false);
            } catch (error: unknown) {
                toast.error(getErrorMessage(error));
            }
        },
    });

    useEffect(() => {
        if (!isOpen) formik.resetForm();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    return (
        <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
            <ModalHeader>
                <div className='flex items-center gap-3'>
                    <span>Configuración de plantilla</span>
                    {plantilla?.version && (
                        <Badge variant='outline' color='amber'>
                            v{plantilla.version}
                        </Badge>
                    )}
                </div>
            </ModalHeader>
            <ModalBody>
                <div className='flex flex-col gap-4'>
                    {plantilla?.es_default && (
                        <Alert color='blue' icon='HeroInformationCircle' variant='outline'>
                            Esta plantilla del sistema es editable. Puedes actualizarla
                            directamente o duplicarla para crear una variante.
                        </Alert>
                    )}
                    <div>
                        <Label htmlFor='edit-v2-titulo'>Título</Label>
                        <Validation
                            isValid={formik.isValid}
                            isTouched={formik.touched.titulo}
                            invalidFeedback={formik.errors.titulo}>
                            <Input
                                id='edit-v2-titulo'
                                name='titulo'
                                value={formik.values.titulo}
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                            />
                        </Validation>
                    </div>
                    <div>
                        <Label htmlFor='edit-v2-tipo'>Tipo de contrato</Label>
                        <Validation
                            isValid={formik.isValid}
                            isTouched={formik.touched.tipo_contrato}
                            invalidFeedback={formik.errors.tipo_contrato}>
                            <SelectReact
                                id='edit-v2-tipo'
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
                    {formik.values.tipo_contrato === 'trabajador' && (
                        <div>
                            <Label htmlFor='edit-v2-subtipo'>Subtipo de contrato laboral</Label>
                            <p className='mb-1.5 text-xs text-zinc-500 dark:text-zinc-400'>
                                Define si esta plantilla aplica a un tipo específico de contrato o a todos.
                            </p>
                            <SelectReact
                                id='edit-v2-subtipo'
                                name='subtipo_trabajador'
                                options={SUBTIPO_TRABAJADOR_OPTIONS}
                                value={
                                    SUBTIPO_TRABAJADOR_OPTIONS.find(
                                        (o) => o.value === (formik.values.subtipo_trabajador ?? ''),
                                    ) ?? SUBTIPO_TRABAJADOR_OPTIONS[0]
                                }
                                onChange={(option) =>
                                    formik.setFieldValue(
                                        'subtipo_trabajador',
                                        (option as TSelectOption)?.value || '',
                                    )
                                }
                            />
                        </div>
                    )}
                    <div>
                        <Label htmlFor='edit-v2-descripcion'>Descripción (opcional)</Label>
                        <Textarea
                            id='edit-v2-descripcion'
                            name='descripcion'
                            value={formik.values.descripcion}
                            onChange={formik.handleChange}
                            rows={3}
                        />
                    </div>
                    <div>
                        <Label>Editor</Label>
                        <div className='mt-1.5 flex gap-4'>
                            {(['v2', 'v29'] as const).map((v) => (
                                <label key={v} className='flex cursor-pointer items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300'>
                                    <input
                                        type='radio'
                                        name='version_editor'
                                        value={v}
                                        checked={formik.values.version_editor === v}
                                        onChange={() => formik.setFieldValue('version_editor', v)}
                                        className='accent-blue-600'
                                    />
                                    {v === 'v2' ? 'Editor de secciones (v2)' : 'Documento único (v2.9)'}
                                </label>
                            ))}
                        </div>
                        {plantilla?.version_editor === 'v29' && formik.values.version_editor === 'v2' && (
                            <Alert color='amber' icon='HeroExclamationTriangle' variant='outline' className='mt-2'>
                                Cambiar a v2 no elimina el documento guardado, pero dejará de ser editable desde el editor de documento único.
                            </Alert>
                        )}
                    </div>
                    <div className='rounded-lg border border-zinc-200 p-3 dark:border-zinc-700'>
                        <Checkbox
                            id='edit-v2-activa'
                            name='activa'
                            checked={formik.values.activa}
                            onChange={formik.handleChange}
                            label='Plantilla activa'
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
                    icon='HeroCheck'
                    onClick={() => formik.handleSubmit()}
                    isLoading={isLoading}
                    isDisable={isLoading}>
                    Guardar configuración
                </Button>
            </ModalFooter>
        </Modal>
    );
};

export default ModalEditarPlantillaV2;
