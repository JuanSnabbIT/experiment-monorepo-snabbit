import Checkbox from '@/components/form/Checkbox';
import Input from '@/components/form/Input';
import Label from '@/components/form/Label';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Textarea from '@/components/form/Textarea';
import Validation from '@/components/form/Validation';
import Button from '@/components/ui/Button';
import Modal, { ModalBody, ModalFooter, ModalHeader } from '@/components/ui/Modal';
import { useCreateTareaV3Mutation } from '@/store/slices/ordenTrabajoV3/ordenTrabajoV3Api';
import { getErrorMessage } from '@/utils/errorHandlers';
import { FormikProvider, useFormik } from 'formik';
import { toast } from 'react-toastify';
import * as Yup from 'yup';

interface IProps {
    isOpen: boolean;
    setIsOpen: (v: boolean) => void;
    ordenId: number;
    tecnicosOptions: TSelectOption[];
    receptoresOptions?: TSelectOption[];
}

const validationSchema = Yup.object({
    titulo: Yup.string().required('El titulo es requerido'),
});

const AgregarTareaOTV3 = ({ isOpen, setIsOpen, ordenId, tecnicosOptions }: IProps) => {
    const [createTarea, { isLoading }] = useCreateTareaV3Mutation();

    const formik = useFormik({
        initialValues: {
            titulo: '',
            descripcion: '',
            tecnico_asignado: null as string | null,
            fecha_programada: '',
            requiere_firma: false,
            tipo_tarea: 'regular' as 'regular',
            checklist_pre: [] as string[],
            checklist_post: [] as string[],
        },
        validationSchema,
        onSubmit: async (values, { resetForm }) => {
            try {
                await createTarea({
                    ordenId,
                    data: {
                        titulo: values.titulo,
                        descripcion: values.descripcion || undefined,
                        tecnico_asignado: values.tecnico_asignado ? Number(values.tecnico_asignado) : undefined,
                        fecha_programada: values.fecha_programada || undefined,
                        requiere_firma: values.requiere_firma,
                        tipo_tarea: 'regular',
                    },
                }).unwrap();
                toast.success('Tarea agregada');
                resetForm();
                setIsOpen(false);
            } catch (error: unknown) {
                toast.error(getErrorMessage(error));
            }
        },
    });

    const handleClose = () => {
        formik.resetForm();
        setIsOpen(false);
    };

    return (
        <Modal isOpen={isOpen} setIsOpen={handleClose} size='lg'>
            <ModalHeader>Agregar Tarea</ModalHeader>
            <FormikProvider value={formik}>
                <form onSubmit={formik.handleSubmit}>
                    <ModalBody className='grid grid-cols-1 gap-4'>
                        {/* Titulo */}
                        <div>
                            <Label htmlFor='titulo' className='mb-1'>
                                Titulo <span className='text-red-500'>*</span>
                            </Label>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.titulo}
                                invalidFeedback={formik.errors.titulo}>
                                <Input
                                    id='titulo'
                                    name='titulo'
                                    value={formik.values.titulo}
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                    placeholder='Ej: Revision de sistema operativo'
                                />
                            </Validation>
                        </div>

                        {/* Tecnico y fecha */}
                        <div className='grid grid-cols-2 gap-4'>
                            <div>
                                <Label htmlFor='tecnico_asignado' className='mb-1'>
                                    Tecnico asignado
                                </Label>
                                <SelectReact
                                    id='tecnico_asignado'
                                    name='tecnico_asignado'
                                    options={tecnicosOptions}
                                    isClearable
                                    value={
                                        tecnicosOptions.find(
                                            (o) => o.value === formik.values.tecnico_asignado,
                                        ) ?? null
                                    }
                                    onChange={(opt) =>
                                        formik.setFieldValue(
                                            'tecnico_asignado',
                                            opt ? (opt as TSelectOption).value : null,
                                        )
                                    }
                                />
                            </div>
                            <div>
                                <Label htmlFor='fecha_programada' className='mb-1'>
                                    Fecha programada
                                </Label>
                                <Input
                                    id='fecha_programada'
                                    name='fecha_programada'
                                    type='datetime-local'
                                    value={formik.values.fecha_programada}
                                    onChange={formik.handleChange}
                                />
                            </div>
                        </div>

                        {/* Descripcion */}
                        <div>
                            <Label htmlFor='descripcion' className='mb-1'>
                                Descripcion
                            </Label>
                            <Textarea
                                id='descripcion'
                                name='descripcion'
                                value={formik.values.descripcion}
                                onChange={formik.handleChange}
                                rows={2}
                            />
                        </div>

                        {/* Requiere firma */}
                        <div className='flex items-center gap-2'>
                            <Checkbox
                                id='requiere_firma'
                                name='requiere_firma'
                                checked={formik.values.requiere_firma}
                                onChange={formik.handleChange}
                            />
                            <Label htmlFor='requiere_firma'>
                                Esta tarea requiere firma del cliente
                            </Label>
                        </div>

                    </ModalBody>
                    <ModalFooter>
                        <Button onClick={handleClose} isDisable={isLoading}>
                            Cancelar
                        </Button>
                        <Button variant='solid' isLoading={isLoading} onClick={() => { void formik.submitForm(); }}>
                            Agregar Tarea
                        </Button>
                    </ModalFooter>
                </form>
            </FormikProvider>
        </Modal>
    );
};

export default AgregarTareaOTV3;
