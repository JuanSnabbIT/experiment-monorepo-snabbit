import { Dispatch, SetStateAction, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
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
import { useAppDispatch, useAppSelector, usuarioEmpresaLogeadoThunk } from '@/store';
import {
    useCrearSeguimientoDetalleMutation,
    useGetDetalleOrdenTrabajoQuery,
} from '@/store/slices/ordenTrabajo/ordenTrabajoApi';
import { toast } from 'react-toastify';
import { getErrorMessage } from '@/utils/errorHandlers';
import SelectReact from '@/components/form/SelectReact';
import { TIPO_SEGUIMIENTO } from '@/constants/ordentrabajo.constant';

function CrearSeguimientoDT({
    detalleSeleccionado,
    isOpen,
    setIsOpen,
    setDetalleSeleccionado,
}: {
    detalleSeleccionado: number | null;
    isOpen: boolean;
    setIsOpen: Dispatch<SetStateAction<boolean>>;
    setDetalleSeleccionado: Dispatch<SetStateAction<number | null>>;
}) {
    const dispatch = useAppDispatch();
    const { id } = useParams<{ id: string }>();
    const ordenId = id ? Number(id) : undefined;
    const { data: detalleOrdenTrabajo } = useGetDetalleOrdenTrabajoQuery(ordenId ?? 0, {
        skip: !ordenId,
    });
        const [crearSeguimientoDetalle] = useCrearSeguimientoDetalleMutation();
const { userMe } = useAppSelector((state) => state.auth);
    const { usuarioEmpresaLogeado } = useAppSelector((state) => state.empresa);

    useEffect(() => {
        if (!usuarioEmpresaLogeado && userMe) {
            dispatch(usuarioEmpresaLogeadoThunk({ id_usuario: userMe.pk }));
        }
    }, [usuarioEmpresaLogeado, userMe]);

    const formik = useFormik({
        initialValues: {
            tipo_seguimiento: 'comentario',
            comentario: '',
        },
        validationSchema: Yup.object().shape({
            comentario: Yup.string().required('Requerido').nonNullable('Requerido'),
        }),
        onSubmit: async (values) => {
            try {
                if (!detalleOrdenTrabajo || !detalleSeleccionado) return;
                const seguimientoResponse = await crearSeguimientoDetalle({
                    ordenId: detalleOrdenTrabajo.id,
                    detalleId: detalleSeleccionado,
                    data: {
                        detalle_trabajo: detalleSeleccionado,
                        usuario: usuarioEmpresaLogeado?.id,
                        tipo: values.tipo_seguimiento,
                        comentario: values.comentario,
                    },
                }).unwrap();
                if (seguimientoResponse && seguimientoResponse.data) {
                    toast.success('Seguimiento creado exitosamente');
                    setIsOpen(false);
                } else {
                    toast.error('Error al crear el seguimiento', {
                        toastId: 'Error al crear el seguimiento',
                    });
                }
            } catch (error: any) {
                const mensajesError = error?.response?.data
                    ? Object.values(error.response.data).flat().join(' ')
                    : getErrorMessage(error) || 'Error al crear el seguimiento';
                toast.error(mensajesError, {
                    toastId: 'Error al crear el seguimiento',
                });
            }
        },
    });

    useEffect(() => {
        if (!isOpen) {
            setDetalleSeleccionado(null);
            formik.resetForm();
        }
    }, [isOpen]);

    return (
        <Modal isOpen={isOpen} setIsOpen={setIsOpen} isStaticBackdrop={true}>
            <ModalHeader>
                <Badge className='text-xl'>Crear Seguimiento</Badge>
            </ModalHeader>
            <ModalBody>
                <div className='flex flex-col gap-4'>
                    <div>
                        <Badge>Tipo de Seguimiento</Badge>
                        <Validation
                            isValid={formik.isValid}
                            isTouched={formik.touched.tipo_seguimiento}
                            invalidFeedback={formik.errors.tipo_seguimiento}>
                            <SelectReact
                                name='tipo_seguimiento'
                                options={TIPO_SEGUIMIENTO}
                                value={TIPO_SEGUIMIENTO.find(
                                    (option) => option.value === formik.values.tipo_seguimiento,
                                )}
                                onChange={(option: any) =>
                                    formik.setFieldValue('tipo_seguimiento', option.value)
                                }
                                onBlur={formik.handleBlur}
                                className='form-select'
                            />
                        </Validation>
                    </div>
                    <div>
                        <Badge>Comentario del Seguimiento</Badge>
                        <Validation
                            isValid={formik.isValid}
                            isTouched={formik.touched.comentario}
                            invalidFeedback={formik.errors.comentario}>
                            <Textarea
                                name='comentario'
                                value={formik.values.comentario}
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                            />
                        </Validation>
                    </div>
                </div>
            </ModalBody>
            <ModalFooter>
                <ModalFooterChild />
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
    );
}

export default CrearSeguimientoDT;
