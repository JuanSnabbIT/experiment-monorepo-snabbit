import Input from '@/components/form/Input';
import Label from '@/components/form/Label';
import Validation from '@/components/form/Validation';
import Button from '@/components/ui/Button';
import Modal, { ModalBody, ModalFooter, ModalHeader } from '@/components/ui/Modal';
import { useCrearSolicitanteProspectoOTV3Mutation } from '@/store/slices/ordenTrabajoV3/ordenTrabajoV3Api';
import { getErrorMessage } from '@/utils/errorHandlers';
import { useFormik } from 'formik';
import { toast } from 'react-toastify';
import * as Yup from 'yup';

interface IProps {
    isOpen: boolean;
    setIsOpen: (v: boolean) => void;
    ordenId: number;
    clienteId: number;
}

const validationSchema = Yup.object({
    email: Yup.string().email('Ingrese un correo válido').required('El email es requerido'),
    first_name: Yup.string().required('El nombre es requerido'),
    last_name: Yup.string().required('El apellido es requerido'),
    celular: Yup.string().nullable().optional(),
});

const CrearSolicitanteProspectoOTV3 = ({ isOpen, setIsOpen, ordenId, clienteId }: IProps) => {
    const [crearSolicitante, { isLoading }] = useCrearSolicitanteProspectoOTV3Mutation();

    const formik = useFormik({
        initialValues: {
            email: '',
            first_name: '',
            last_name: '',
            celular: '',
        },
        validationSchema,
        onSubmit: async (values, { resetForm }) => {
            try {
                await crearSolicitante({
                    id: ordenId,
                    clienteId,
                    data: {
                        email: values.email,
                        first_name: values.first_name,
                        last_name: values.last_name,
                        ...(values.celular ? { celular: values.celular } : {}),
                    },
                }).unwrap();
                toast.success('Solicitante creado');
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
        <Modal isOpen={isOpen} setIsOpen={handleClose}>
            <ModalHeader>Crear solicitante</ModalHeader>
            <form onSubmit={formik.handleSubmit}>
                <ModalBody className='grid grid-cols-1 gap-4'>
                    <div>
                        <Label htmlFor='email' className='mb-1'>
                            Email <span className='text-red-500'>*</span>
                        </Label>
                        <Validation
                            isValid={formik.isValid}
                            isTouched={formik.touched.email}
                            invalidFeedback={formik.errors.email}>
                            <Input
                                id='email'
                                name='email'
                                type='email'
                                value={formik.values.email}
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                                placeholder='correo@empresa.com'
                            />
                        </Validation>
                    </div>

                    <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                        <div>
                            <Label htmlFor='first_name' className='mb-1'>
                                Nombre <span className='text-red-500'>*</span>
                            </Label>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.first_name}
                                invalidFeedback={formik.errors.first_name}>
                                <Input
                                    id='first_name'
                                    name='first_name'
                                    value={formik.values.first_name}
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                    placeholder='Nombre'
                                />
                            </Validation>
                        </div>
                        <div>
                            <Label htmlFor='last_name' className='mb-1'>
                                Apellido <span className='text-red-500'>*</span>
                            </Label>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.last_name}
                                invalidFeedback={formik.errors.last_name}>
                                <Input
                                    id='last_name'
                                    name='last_name'
                                    value={formik.values.last_name}
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                    placeholder='Apellido'
                                />
                            </Validation>
                        </div>
                    </div>

                    <div>
                        <Label htmlFor='celular' className='mb-1'>
                            Celular
                            <span className='ml-1 text-xs font-normal text-gray-400'>(opcional)</span>
                        </Label>
                        <Input
                            id='celular'
                            name='celular'
                            value={formik.values.celular}
                            onChange={formik.handleChange}
                            placeholder='+569...'
                        />
                    </div>
                </ModalBody>
                <ModalFooter>
                    <Button onClick={handleClose} isDisable={isLoading}>
                        Cancelar
                    </Button>
                    <Button
                        variant='solid'
                        isLoading={isLoading}
                        onClick={() => {
                            void formik.submitForm();
                        }}>
                        Crear solicitante
                    </Button>
                </ModalFooter>
            </form>
        </Modal>
    );
};

export default CrearSolicitanteProspectoOTV3;
