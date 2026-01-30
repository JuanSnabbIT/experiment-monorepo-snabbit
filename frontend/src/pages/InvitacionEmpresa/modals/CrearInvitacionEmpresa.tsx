import Input from '@/components/form/Input';
import Label from '@/components/form/Label';
import Validation from '@/components/form/Validation';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal, {
    ModalBody,
    ModalFooter,
    ModalFooterChild,
    ModalHeader,
} from '@/components/ui/Modal';
import Tooltip from '@/components/ui/Tooltip';
import ApiService from '@/services/ApiService';
import { useAppDispatch } from '@/store';
import { listaInvitacionesThunk } from '@/store/slices/invitacion/invitacionSlice';
import { useFormik } from 'formik';
import { useState } from 'react';
import { toast } from 'react-toastify';
import * as Yup from 'yup';

function CrearInvitacionEmpresa({ sucural }: { sucural: number | string }) {
    const dispatch = useAppDispatch();
    const [isOpen, setIsOpen] = useState<boolean>(false);

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            email: '',
            first_name: '',
            last_name: '',
        },
        validationSchema: Yup.object().shape({
            email: Yup.string().email('Ingrese un Correo Valido').required('Requerido'),
            first_name: Yup.string().max(250, 'Maximo 250 Caracteres').required('Requerido'),
            last_name: Yup.string().max(250, 'Maximo 250 Caracteres').required('Requerido'),
        }),
        onSubmit: async (values) => {
            try {
                const response = await ApiService.fetchData({
                    url: `/api/invitaciones-empresa/`,
                    method: 'post',
                    headers: { 'Content-Type': 'application/json' },
                    data: JSON.stringify({ ...values, sucursal: sucural }),
                });
                if (response.data) {
                    toast.success('Invitacion Creada', { autoClose: 1000 });
                    dispatch(listaInvitacionesThunk());
                    formik.resetForm();
                    setIsOpen(false);
                }
            } catch (error: any) {
                toast.error(error.response.data.detail);
            }
        },
    });

    return (
        <>
            <Tooltip text='Crear Invitación'>
                <Button
                    variant='solid'
                    onClick={() => {
                        setIsOpen(true);
                    }}
                    icon='HeroPlus'></Button>
            </Tooltip>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
                <ModalHeader>
                    <Badge className='text-xl'>Crear Invitación para la Empresa</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className='flex flex-col gap-4'>
                        <div>
                            <Badge>Correo Electronico</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.email}
                                invalidFeedback={formik.errors.email}>
                                <Input
                                    name='email'
                                    id='email'
                                    type='email'
                                    onBlur={formik.handleBlur}
                                    onChange={formik.handleChange}
                                    value={formik.values.email}
                                />
                            </Validation>
                        </div>
                        <div>
                            <Badge>Primer Nombre</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.first_name}
                                invalidFeedback={formik.errors.first_name}>
                                <Input
                                    id='first_name'
                                    name='first_name'
                                    type='text'
                                    onBlur={formik.handleBlur}
                                    onChange={formik.handleChange}
                                    value={formik.values.first_name}
                                />
                            </Validation>
                        </div>
                        <div>
                            <Badge>Apellido Paterno</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.last_name}
                                invalidFeedback={formik.errors.last_name}>
                                <Input
                                    id='last_name'
                                    name='last_name'
                                    type='text'
                                    onBlur={formik.handleBlur}
                                    onChange={formik.handleChange}
                                    value={formik.values.last_name}
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
                                formik.resetForm();
                                setIsOpen(false);
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

export default CrearInvitacionEmpresa;
