import Input from '@/components/form/Input';
import Label from '@/components/form/Label';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Textarea from '@/components/form/Textarea';
import Validation from '@/components/form/Validation';
import Button from '@/components/ui/Button';
import Modal, { ModalBody, ModalFooter, ModalHeader } from '@/components/ui/Modal';
import { useCreateAdjuntoV3Mutation } from '@/store/slices/ordenTrabajoV3/ordenTrabajoV3Api';
import { getErrorMessage } from '@/utils/errorHandlers';
import { useFormik } from 'formik';
import { useRef } from 'react';
import { toast } from 'react-toastify';
import * as Yup from 'yup';

interface IProps {
    isOpen: boolean;
    setIsOpen: (v: boolean) => void;
    ordenId: number;
}

const TIPO_OPTIONS: TSelectOption[] = [
    { value: 'foto', label: 'Foto' },
    { value: 'documento', label: 'Documento' },
    { value: 'comprobante', label: 'Comprobante' },
    { value: 'firma', label: 'Firma' },
    { value: 'otro', label: 'Otro' },
];

const ACCEPT_POR_TIPO: Record<string, string> = {
    foto: 'image/*',
    firma: 'image/*',
    documento: '.pdf,.doc,.docx,.xls,.xlsx,.txt',
    comprobante: '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png',
    otro: '*',
};

const HINT_POR_TIPO: Record<string, string> = {
    foto: 'Acepta: JPG, PNG, GIF, WEBP y otros formatos de imagen.',
    firma: 'Acepta: JPG, PNG, GIF, WEBP y otros formatos de imagen.',
    documento: 'Acepta: PDF, Word (.doc, .docx), Excel (.xls, .xlsx), TXT.',
    comprobante: 'Acepta: PDF, Word, Excel, JPG, PNG.',
    otro: 'Acepta cualquier tipo de archivo.',
};

const validationSchema = Yup.object({
    tipo: Yup.string().required('El tipo es requerido'),
    archivo: Yup.mixed().required('Debe seleccionar un archivo'),
});

const AgregarAdjuntoOTV3 = ({ isOpen, setIsOpen, ordenId }: IProps) => {
    const [createAdjunto, { isLoading }] = useCreateAdjuntoV3Mutation();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const formik = useFormik({
        initialValues: {
            tipo: 'documento',
            descripcion: '',
            archivo: null as File | null,
        },
        validationSchema,
        onSubmit: async (values, { resetForm }) => {
            if (!values.archivo) return;
            try {
                const formData = new FormData();
                formData.append('archivo', values.archivo);
                formData.append('tipo', values.tipo);
                if (values.descripcion) {
                    formData.append('descripcion', values.descripcion);
                }
                await createAdjunto({ ordenId, formData }).unwrap();
                toast.success('Adjunto subido correctamente');
                resetForm();
                if (fileInputRef.current) fileInputRef.current.value = '';
                setIsOpen(false);
            } catch (error: unknown) {
                toast.error(getErrorMessage(error));
            }
        },
    });

    const handleClose = () => {
        formik.resetForm();
        if (fileInputRef.current) fileInputRef.current.value = '';
        setIsOpen(false);
    };

    return (
        <Modal isOpen={isOpen} setIsOpen={handleClose}>
            <ModalHeader>Agregar Adjunto</ModalHeader>
            <form onSubmit={formik.handleSubmit}>
                <ModalBody className='grid grid-cols-1 gap-4'>
                    {/* Tipo */}
                    <div>
                        <Label htmlFor='tipo' className='mb-1'>
                            Tipo <span className='text-red-500'>*</span>
                        </Label>
                        <SelectReact
                            id='tipo'
                            name='tipo'
                            options={TIPO_OPTIONS}
                            value={TIPO_OPTIONS.find((o) => o.value === formik.values.tipo)}
                            onChange={(opt) =>
                                formik.setFieldValue('tipo', (opt as TSelectOption).value)
                            }
                        />
                    </div>

                    {/* Archivo */}
                    <div>
                        <Label htmlFor='archivo' className='mb-1'>
                            Archivo <span className='text-red-500'>*</span>
                        </Label>
                        <Validation
                            isValid={formik.isValid}
                            isTouched={!!formik.touched.archivo}
                            invalidFeedback={formik.errors.archivo as string}>
                            <Input
                                ref={fileInputRef}
                                id='archivo'
                                name='archivo'
                                type='file'
                                accept={ACCEPT_POR_TIPO[formik.values.tipo] ?? '*'}
                                onChange={(e) => {
                                    const file = e.target.files?.[0] ?? null;
                                    formik.setFieldValue('archivo', file);
                                }}
                                onBlur={formik.handleBlur}
                            />
                        </Validation>
                        <p className='mt-1 text-xs text-gray-400 dark:text-gray-500'>
                            {HINT_POR_TIPO[formik.values.tipo] ?? ''}
                        </p>
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
                            placeholder='Descripcion opcional del archivo...'
                        />
                    </div>
                </ModalBody>
                <ModalFooter>
                    <Button onClick={handleClose} isDisable={isLoading}>
                        Cancelar
                    </Button>
                    <Button variant='solid' isLoading={isLoading} onClick={() => { void formik.submitForm(); }}>
                        Subir Adjunto
                    </Button>
                </ModalFooter>
            </form>
        </Modal>
    );
};

export default AgregarAdjuntoOTV3;
