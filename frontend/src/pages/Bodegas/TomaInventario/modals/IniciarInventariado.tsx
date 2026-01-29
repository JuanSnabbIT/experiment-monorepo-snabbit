import Input from '@/components/form/Input';
import Textarea from '@/components/form/Textarea';
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
import { ITomaInventario } from '@/interface/bodega.interface';
import ApiService from '@/services/ApiService';
import {
    detalleTomaInventarioThunk,
    useAppDispatch,
    useAppSelector,
    usuarioEmpresaLogeadoThunk,
} from '@/store';
import { useFormik } from 'formik';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import * as Yup from 'yup';

function IniciarInventariado({ toma }: { toma: ITomaInventario }) {
    const dispatch = useAppDispatch();
    const { usuarioEmpresaLogeado } = useAppSelector((state) => state.empresa);
    const { userMe } = useAppSelector((state) => state.auth);
    const [isOpen, setIsOpen] = useState<boolean>(false);

    useEffect(() => {
        if (!usuarioEmpresaLogeado && userMe) {
            dispatch(usuarioEmpresaLogeadoThunk({ id_usuario: userMe.pk }));
        }
    }, [usuarioEmpresaLogeado, userMe]);

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            fecha_inicio: '',
            observaciones: '',
        },
        validationSchema: Yup.object().shape({
            fecha_inicio: Yup.string().required('Requerido').nonNullable('Requerido'),
            observaciones: Yup.string().notRequired().nullable(),
        }),
        onSubmit: async (values) => {
            try {
                const response = await ApiService.fetchData({
                    url: `/api/tomas-inventario/${toma.id}/`,
                    method: 'patch',
                    headers: { 'Content-Type': 'application/json' },
                    data: JSON.stringify({
                        fecha_inicio: values.fecha_inicio,
                    }),
                });
                if (response.data) {
                    const responseEstado = await ApiService.fetchData({
                        url: `/api/estados-toma-inventario/`,
                        method: 'post',
                        headers: { 'Content-Type': 'application/json' },
                        data: JSON.stringify({
                            toma_inventario: toma.id,
                            estado: 'en_proceso',
                            usuario: usuarioEmpresaLogeado?.id,
                            fecha_cambio: values.fecha_inicio,
                            observaciones: values.observaciones,
                        }),
                    });
                    if (responseEstado) {
                        toast.success('Toma de inventario iniciada', { autoClose: 1000 });
                        dispatch(detalleTomaInventarioThunk({ id_toma: toma.id }));
                        setIsOpen(false);
                    }
                }
            } catch (error: any) {
                const mensajesError = Object.values(error.response.data).flat().join(' ');
                toast.error(mensajesError || 'Error al iniciar el inventariado', {
                    toastId: 'Error al iniciar el inventariado',
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
            <Tooltip text='Iniciar Inventariado'>
                <Button
                    variant='solid'
                    color='emerald'
                    icon='HeroPlay'
                    onClick={() => {
                        setIsOpen(true);
                    }}
                />
            </Tooltip>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
                <ModalHeader>
                    <Badge className='text-xl'>Iniciar Inventariado</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className='flex flex-col gap-4'>
                        <div>
                            <Badge>Fecha de Inicio</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.fecha_inicio}
                                invalidFeedback={formik.errors.fecha_inicio}>
                                <Input
                                    type='datetime-local'
                                    name='fecha_inicio'
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                    value={formik.values.fecha_inicio}
                                />
                            </Validation>
                        </div>
                        <div>
                            <Badge>Observaciones</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.observaciones}
                                invalidFeedback={formik.errors.observaciones}>
                                <Textarea
                                    name='observaciones'
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                    value={formik.values.observaciones}
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
                            color='emerald'
                            onClick={() => {
                                formik.handleSubmit();
                            }}>
                            Iniciar
                        </Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    );
}

export default IniciarInventariado;
