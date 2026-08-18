import Input from '@/components/form/Input';
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
import Collapse from '@/components/utils/Collapse';
import { useCreateEmpresaMutation } from '@/store/slices/empresa/empresaApi';
import { useFormik } from 'formik';
import { useState } from 'react';
import { toast } from 'react-toastify';
import * as Yup from 'yup';

function CrearEmpresa() {
    const [createEmpresa] = useCreateEmpresaMutation();
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [mostrarAvanzado, setMostrarAvanzado] = useState<boolean>(false);

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            nombre: '',
            rut: '',
            telefono: '',
            email: '',
            sitio_web: '',
            direccion_principal: '',
            recargo: '',
            representante_legal: '',
            rut_representante: '',
        },
        validationSchema: Yup.object().shape({
            nombre: Yup.string().required('Requerido').max(255, 'Maximo 255 Caracteres'),
            rut: Yup.string().notRequired().nullable().max(100, 'Maximo 100 Caracteres'),
            telefono: Yup.string().notRequired().nullable().max(20, 'Maximo 20 Caracteres'),
            email: Yup.string().email('No es un email valido').notRequired().nullable(),
            sitio_web: Yup.string().nullable().notRequired(),
            direccion_principal: Yup.string()
                .required('Requerido')
                .max(250, 'Maximo 250 Caracteres'),
            recargo: Yup.number().required('Requerido').min(0, 'Debe ser mayor o igual a 0'),
            representante_legal: Yup.string().notRequired().nullable().max(255, 'Maximo 255 Caracteres'),
            rut_representante: Yup.string().notRequired().nullable().max(20, 'Maximo 20 Caracteres'),
        }),
        onSubmit: async (values) => {
            try {
                await createEmpresa({
                    nombre: values.nombre,
                    sitio_web: values.sitio_web,
                    direccion_principal: values.direccion_principal,
                    rut_empresa: values.rut,
                    telefono: values.telefono,
                    email: values.email,
                    recargo: Number(values.recargo),
                    representante_legal: values.representante_legal || null,
                    rut_representante: values.rut_representante || null,
                }).unwrap();
                toast.success('Empresa creada', { autoClose: 1000 });
                formik.resetForm();
                setMostrarAvanzado(false);
                setIsOpen(false);
            } catch (error: any) {
                toast.error(error.response?.data || 'Error al crear la empresa');
            }
        },
    });

    return (
        <>
            <Tooltip text='Crear Empresa'>
                <Button
                    variant='solid'
                    onClick={() => {
                        setIsOpen(true);
                    }}
                    icon='HeroPlus'
                />
            </Tooltip>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen} isStaticBackdrop={true}>
                <ModalHeader>
                    <Badge className='text-xl'>Crear Empresa</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className='flex flex-col gap-4'>
                        <div>
                            <Badge>Nombre</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.nombre}
                                invalidFeedback={formik.errors.nombre}>
                                <Input
                                    name='nombre'
                                    id='nombre'
                                    type='text'
                                    onBlur={formik.handleBlur}
                                    onChange={formik.handleChange}
                                    value={formik.values.nombre}
                                />
                            </Validation>
                        </div>
                        <div>
                            <Badge>Rut</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.rut}
                                invalidFeedback={formik.errors.rut}>
                                <Input
                                    name='rut'
                                    id='rut'
                                    type='text'
                                    onBlur={formik.handleBlur}
                                    onChange={formik.handleChange}
                                    value={formik.values.rut}
                                />
                            </Validation>
                        </div>
                        <div>
                            <Badge>Recargo</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.recargo}
                                invalidFeedback={formik.errors.recargo}>
                                <Input
                                    name='recargo'
                                    id='recargo'
                                    type='text'
                                    onBlur={formik.handleBlur}
                                    onChange={formik.handleChange}
                                    value={formik.values.recargo}
                                />
                            </Validation>
                        </div>
                        <div>
                            <Badge>Telefono</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.telefono}
                                invalidFeedback={formik.errors.telefono}>
                                <Input
                                    name='telefono'
                                    id='telefono'
                                    type='text'
                                    onBlur={formik.handleBlur}
                                    onChange={formik.handleChange}
                                    value={formik.values.telefono}
                                />
                            </Validation>
                        </div>
                        <div>
                            <Badge>Email</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.email}
                                invalidFeedback={formik.errors.email}>
                                <Input
                                    name='email'
                                    id='email'
                                    type='text'
                                    onBlur={formik.handleBlur}
                                    onChange={formik.handleChange}
                                    value={formik.values.email}
                                />
                            </Validation>
                        </div>
                        <div>
                            <Badge>Sitio Web</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.sitio_web}
                                invalidFeedback={formik.errors.sitio_web}>
                                <Input
                                    id='sitio_web'
                                    name='sitio_web'
                                    type='text'
                                    onBlur={formik.handleBlur}
                                    onChange={formik.handleChange}
                                    value={formik.values.sitio_web}
                                />
                            </Validation>
                        </div>
                        <div>
                            <Badge>Direccion Principal</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.direccion_principal}
                                invalidFeedback={formik.errors.direccion_principal}>
                                <Input
                                    id='direccion_principal'
                                    name='direccion_principal'
                                    type='text'
                                    onBlur={formik.handleBlur}
                                    onChange={formik.handleChange}
                                    value={formik.values.direccion_principal}
                                />
                            </Validation>
                        </div>

                        <button
                            type='button'
                            onClick={() => setMostrarAvanzado((prev) => !prev)}
                            className='flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'>
                            <Icon icon={mostrarAvanzado ? 'HeroChevronUp' : 'HeroChevronDown'} />
                            Avanzado
                        </button>
                        <Collapse isOpen={mostrarAvanzado}>
                            <div className='flex flex-col gap-4 border-l-2 border-zinc-200 pl-4 dark:border-zinc-700'>
                                <div>
                                    <Badge>Representante Legal</Badge>
                                    <Validation
                                        isValid={formik.isValid}
                                        isTouched={formik.touched.representante_legal}
                                        invalidFeedback={formik.errors.representante_legal}>
                                        <Input
                                            name='representante_legal'
                                            id='representante_legal'
                                            type='text'
                                            onBlur={formik.handleBlur}
                                            onChange={formik.handleChange}
                                            value={formik.values.representante_legal}
                                        />
                                    </Validation>
                                </div>
                                <div>
                                    <Badge>RUT del Representante Legal</Badge>
                                    <Validation
                                        isValid={formik.isValid}
                                        isTouched={formik.touched.rut_representante}
                                        invalidFeedback={formik.errors.rut_representante}>
                                        <Input
                                            name='rut_representante'
                                            id='rut_representante'
                                            type='text'
                                            onBlur={formik.handleBlur}
                                            onChange={formik.handleChange}
                                            value={formik.values.rut_representante}
                                        />
                                    </Validation>
                                </div>
                            </div>
                        </Collapse>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <ModalFooterChild></ModalFooterChild>
                    <ModalFooterChild>
                        <Button
                            color='red'
                            onClick={() => {
                                setIsOpen(false);
                                formik.resetForm();
                                setMostrarAvanzado(false);
                            }}>
                            Cancelar
                        </Button>
                        <Button
                            variant='solid'
                            onClick={() => {
                                formik.handleSubmit();
                            }}>
                            Crear
                        </Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    );
}

export default CrearEmpresa;
