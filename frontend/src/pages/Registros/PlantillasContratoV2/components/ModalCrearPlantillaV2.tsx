import Input from '@/components/form/Input';
import Label from '@/components/form/Label';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Textarea from '@/components/form/Textarea';
import Validation from '@/components/form/Validation';
import Button from '@/components/ui/Button';
import Modal, { ModalBody, ModalFooter, ModalHeader } from '@/components/ui/Modal';
import { TIPO_CONTRATO } from '@/constants/contrato.constant';
import { useAppSelector } from '@/store';
import { useCreatePlantillaV2Mutation } from '@/store/slices/contratos/plantillaContratoV2Api';
import { useGetMisClientesQuery } from '@/store/slices/empresa/empresaApi';
import { getErrorMessage } from '@/utils/errorHandlers';
import { useFormik } from 'formik';
import { Dispatch, SetStateAction } from 'react';
import { toast } from 'react-toastify';
import * as Yup from 'yup';

interface IModalCrearPlantillaV2Props {
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

const ModalCrearPlantillaV2 = ({ isOpen, setIsOpen, onCreated }: IModalCrearPlantillaV2Props) => {
    const { personalizacionUsuario } = useAppSelector((state) => state.auth);
    const [createPlantilla, { isLoading }] = useCreatePlantillaV2Mutation();

    const empresaId = personalizacionUsuario?.empresa ?? undefined;
    const { data: misClientes = [], isLoading: cargandoClientes } = useGetMisClientesQuery(
        empresaId,
        { skip: !empresaId },
    );

    const clienteOptions: TSelectOption[] = [
        { value: '', label: 'Global' },
        ...misClientes.map((rel) => ({
            value: String(rel.cliente),
            label: rel.info_cliente.nombre,
        })),
    ];

    const formik = useFormik({
        initialValues: {
            titulo: '',
            tipo_contrato: '',
            descripcion: '',
            empresa_cliente: null as number | null,
            version_editor: 'v2' as 'v2' | 'v29',
        },
        validationSchema,
        onSubmit: async (values, { resetForm }) => {
            try {
                const nueva = await createPlantilla({
                    titulo: values.titulo,
                    tipo_contrato: values.tipo_contrato,
                    descripcion: values.descripcion,
                    empresa_cliente: values.empresa_cliente,
                    version_editor: values.version_editor,
                }).unwrap();
                toast.success('Plantilla creada correctamente');
                resetForm();
                setIsOpen(false);
                onCreated?.(nueva.id);
            } catch (error: unknown) {
                toast.error(getErrorMessage(error));
            }
        },
    });

    return (
        <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
            <ModalHeader>Nueva Plantilla de Contrato V2</ModalHeader>
            <ModalBody>
                <div className='flex flex-col gap-4'>
                    <div>
                        <Label htmlFor='v2-crear-titulo'>Título</Label>
                        <Validation
                            isValid={formik.isValid}
                            isTouched={formik.touched.titulo}
                            invalidFeedback={formik.errors.titulo}>
                            <Input
                                id='v2-crear-titulo'
                                name='titulo'
                                value={formik.values.titulo}
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                            />
                        </Validation>
                    </div>
                    <div>
                        <Label htmlFor='v2-crear-tipo'>Tipo de Contrato</Label>
                        <Validation
                            isValid={formik.isValid}
                            isTouched={formik.touched.tipo_contrato}
                            invalidFeedback={formik.errors.tipo_contrato}>
                            <SelectReact
                                id='v2-crear-tipo'
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
                        <Label htmlFor='v2-crear-descripcion'>Descripción (opcional)</Label>
                        <Textarea
                            id='v2-crear-descripcion'
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
                        {formik.values.version_editor === 'v29' && (
                            <p className='mt-1.5 text-xs text-blue-600'>
                                Editor Word-like con bloques condicionales, firma digital y PDF 1:1.
                            </p>
                        )}
                    </div>
                    <div>
                        <Label htmlFor='v2-crear-cliente'>Empresa cliente</Label>
                        <p className='mb-1 text-xs text-zinc-500'>
                            Deja en "Global" para que aplique a todos los clientes.
                        </p>
                        <SelectReact
                            isLoading={cargandoClientes}
                            id='v2-crear-cliente'
                            name='empresa_cliente'
                            options={clienteOptions}
                            menuPortalTarget={document.body}
                            menuPosition='fixed'
                            styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
                            value={
                                clienteOptions.find(
                                    (o) =>
                                        o.value === (formik.values.empresa_cliente === null ? '' : String(formik.values.empresa_cliente)),
                                ) ?? clienteOptions[0]
                            }
                            onChange={(option) => {
                                const val = (option as TSelectOption)?.value;
                                formik.setFieldValue(
                                    'empresa_cliente',
                                    val ? Number(val) : null,
                                );
                            }}
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
                    icon='HeroPlus'
                    onClick={() => formik.handleSubmit()}
                    isLoading={isLoading}
                    isDisable={isLoading}>
                    Crear plantilla
                </Button>
            </ModalFooter>
        </Modal>
    );
};

export default ModalCrearPlantillaV2;
