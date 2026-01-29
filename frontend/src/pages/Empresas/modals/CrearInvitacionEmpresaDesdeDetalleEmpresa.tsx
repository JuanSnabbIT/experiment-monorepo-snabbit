import Input from '@/components/form/Input';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
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
import {
    listaInvitacionesThunk,
    listaMisSucursalesThunk,
    useAppDispatch,
    useAppSelector,
} from '@/store';
import { useFormik } from 'formik';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import * as Yup from 'yup';

function CrearInvitacionEmpresaDesdeDetalleEmpresa({
    id_empresa,
}: {
    id_empresa: number | string | undefined;
}) {
    const dispatch = useAppDispatch();
    const { listaMisSucursales } = useAppSelector((state) => state.empresa);
    const [isOpen, setIsOpen] = useState<boolean>(false);

    useEffect(() => {
        if (isOpen) {
            dispatch(listaMisSucursalesThunk({ id_empresa }));
        }
    }, [isOpen]);

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            email: '',
            first_name: '',
            last_name: '',
            sucursal: '',
        },
        validationSchema: Yup.object().shape({
            email: Yup.string()
                .email('Ingrese un Correo Valido')
                .required('Requerido')
                .nonNullable('Requerido'),
            first_name: Yup.string()
                .max(250, 'Maximo 250 Caracteres')
                .required('Requerido')
                .nonNullable('Requerido'),
            last_name: Yup.string()
                .max(250, 'Maximo 250 Caracteres')
                .required('Requerido')
                .nonNullable('Requerido'),
            sucursal: Yup.string().required('Requerido').nonNullable('Requerido'),
        }),
        onSubmit: async (values) => {
            try {
                const response = await ApiService.fetchData({
                    url: `/api/invitaciones-empresa/`,
                    method: 'post',
                    headers: { 'Content-Type': 'application/json' },
                    data: JSON.stringify(values),
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
                    icon='HeroPlus'
                    onClick={() => {
                        setIsOpen(true);
                    }}></Button>
            </Tooltip>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
                <ModalHeader>
                    <Badge className='text-xl'>Crear Invitación</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className='flex flex-col gap-4'>
                        <div>
                            <Badge>Sucursal</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.sucursal}
                                invalidFeedback={formik.errors.sucursal}>
                                <SelectReact
                                    name='sucursal'
                                    options={listaMisSucursales.map((suc) => ({
                                        value: suc.id.toString(),
                                        label: suc.nombre,
                                    }))}
                                    onBlur={formik.handleBlur}
                                    onChange={(e) => {
                                        formik.setFieldValue(
                                            'sucursal',
                                            (e as TSelectOption).value,
                                        );
                                    }}
                                    noOptionsMessage={(e) => `No Existe ${e.inputValue}`}
                                    value={{
                                        value: formik.values.sucursal,
                                        label:
                                            listaMisSucursales.find(
                                                (suc) =>
                                                    suc.id.toString() === formik.values.sucursal,
                                            )?.nombre || '',
                                    }}
                                />
                            </Validation>
                        </div>
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
}

export default CrearInvitacionEmpresaDesdeDetalleEmpresa;
