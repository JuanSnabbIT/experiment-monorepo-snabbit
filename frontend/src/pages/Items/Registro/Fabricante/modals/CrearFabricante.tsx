import { useFormik } from 'formik';
import Validation from '@/components/form/Validation';
import * as yup from 'yup';
import { useEffect, useState } from 'react';
import { listaFabricanteThunk } from '@/store/slices/item/itemSlice';
import ApiService from '@/services/ApiService';
import { toast } from 'react-toastify';
import Button from '@/components/ui/Button';
import Modal, {
    ModalBody,
    ModalFooter,
    ModalFooterChild,
    ModalHeader,
} from '@/components/ui/Modal';
import Input from '@/components/form/Input';
import { useAppDispatch } from '@/store';
import Tooltip from '@/components/ui/Tooltip';
import Badge from '@/components/ui/Badge';

const validationSchema = yup.object().shape({
    nombre: yup.string().required('El nombre es requerido'),
    pagina_web: yup.string().url('La página web no es válida'),
    email_soporte: yup.string().email('El email no es válido'),
    telefono_soporte: yup.string().matches(/^[0-9]+$/, 'El teléfono no es válido'),
});

const CrearFabricante = () => {
    const dispatch = useAppDispatch();
    const [isOpen, setIsOpen] = useState<boolean>(false);

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            nombre: '',
            pagina_web: '',
            email_soporte: '',
            telefono_soporte: '',
        },
        validationSchema,
        onSubmit: async (values) => {
            try {
                const response = await ApiService.fetchData({
                    url: `/api/fabricantes/`,
                    method: 'post',
                    data: values,
                });
                if (response) {
                    toast.success('Fabricante creado correctamente', { autoClose: 1000 });
                    dispatch(listaFabricanteThunk());
                    setIsOpen(false);
                }
            } catch (error: any) {
                toast.error(error.response.data || 'Error creando fabricante', {
                    toastId: 'Error creando fabricante',
                });
            }
        },
    });

    useEffect(() => {
        if (!isOpen) {
            formik.resetForm();
        }
    }, [isOpen]);

    return (
        <>
            <Tooltip text='Crear Fabricante'>
                <Button
                    variant='solid'
                    onClick={() => {
                        setIsOpen(true);
                    }}
                    icon='HeroPlus'></Button>
            </Tooltip>
            <Modal
                isStaticBackdrop={true}
                isStaticBackdropAnimation={false}
                isOpen={isOpen}
                setIsOpen={setIsOpen}>
                <ModalHeader>
                    <Badge className='text-xl'>Crear Fabricante</Badge>
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
                                    type='text'
                                    name='nombre'
                                    placeholder='Nombre del Fabricante'
                                    onChange={formik.handleChange}
                                    value={formik.values.nombre}
                                    onBlur={formik.handleBlur}
                                />
                            </Validation>
                        </div>
                        <div>
                            <Badge>Pagina Web</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.pagina_web}
                                invalidFeedback={formik.errors.pagina_web}>
                                <Input
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                    value={formik.values.pagina_web}
                                    type='text'
                                    name='pagina_web'
                                    placeholder='Página Web'
                                />
                            </Validation>
                        </div>
                        <div>
                            <Badge>Email Soporte</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.email_soporte}
                                invalidFeedback={formik.errors.email_soporte}>
                                <Input
                                    type='text'
                                    name='email_soporte'
                                    placeholder='Email de Soporte'
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                    value={formik.values.email_soporte}
                                />
                            </Validation>
                        </div>
                        <div>
                            <Badge>Telefono Soporte</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.telefono_soporte}
                                invalidFeedback={formik.errors.telefono_soporte}>
                                <Input
                                    type='text'
                                    name='telefono_soporte'
                                    placeholder='Teléfono de Soporte'
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                    value={formik.values.telefono_soporte}
                                />
                            </Validation>
                        </div>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <ModalFooterChild></ModalFooterChild>
                    <ModalFooterChild>
                        <Button
                            color='red'
                            onClick={() => {
                                setIsOpen(false);
                            }}>
                            Cancelar
                        </Button>
                        <Button
                            variant='solid'
                            onClick={() => {
                                formik.handleSubmit();
                            }}>
                            Guardar
                        </Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    );
};

export default CrearFabricante;
