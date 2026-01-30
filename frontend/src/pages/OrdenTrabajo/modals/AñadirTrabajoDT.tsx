import { Dispatch, SetStateAction, useEffect, useState } from 'react';
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
    useAsociarTrabajoDetalleMutation,
    useCrearSeguimientoDetalleMutation,
    useGetDetalleOrdenTrabajoQuery,
    useGetTrabajosDisponiblesQuery,
} from '@/store/slices/ordenTrabajo/ordenTrabajoApi';
import { toast } from 'react-toastify';
import { getErrorMessage } from '@/utils/errorHandlers';
import SelectReact from '@/components/form/SelectReact';

function AñadirTrabajoDT({
    detalleSeleccionado,
    isOpen,
    setIsOpen,
}: {
    detalleSeleccionado: number | null;
    isOpen: boolean;
    setIsOpen: Dispatch<SetStateAction<boolean>>;
}) {
    const dispatch = useAppDispatch();
    const { id } = useParams<{ id: string }>();
    const ordenId = id ? Number(id) : undefined;
    const { data: detalleOrdenTrabajo } = useGetDetalleOrdenTrabajoQuery(ordenId ?? 0, {
        skip: !ordenId,
    });
    const { data: listaTrabajosFiltrados } = useGetTrabajosDisponiblesQuery(ordenId ?? 0, {
        skip: !ordenId || !isOpen,
    });
    const { usuarioEmpresaLogeado } = useAppSelector((state) => state.empresa);
    const { userMe } = useAppSelector((state) => state.auth);
    const { listaContentType } = useAppSelector((state) => state.core);
        const [asociarTrabajoDetalle] = useAsociarTrabajoDetalleMutation();
    const [crearSeguimientoDetalle] = useCrearSeguimientoDetalleMutation();
const [optionsTrabajos, setOptionsTrabajos] = useState<
        { label: string; options: { value: string; label: string; ct: number }[] }[]
    >([]);

    useEffect(() => {
        if (!usuarioEmpresaLogeado && userMe) {
            dispatch(usuarioEmpresaLogeadoThunk({ id_usuario: userMe.pk }));
        }
    }, [usuarioEmpresaLogeado, userMe]);

    useEffect(() => {
        if (listaTrabajosFiltrados) {
            let lista: {
                label: string;
                options: { value: string; label: string; ct: number }[];
            }[] = [];
            if (listaTrabajosFiltrados.cotizaciones.length > 0) {
                const id_cotizacion = listaContentType.find(
                    (cont) => cont.model === 'cotizacion',
                )?.id;
                if (id_cotizacion) {
                    lista = lista.concat({
                        label: 'Cotizaciones',
                        options: listaTrabajosFiltrados.cotizaciones.map((coti) => ({
                            value: coti.id.toString(),
                            label: `${coti.numero_cotizacion} - ${coti.nombre}`,
                            ct: id_cotizacion,
                        })),
                    });
                }
            }
            if (listaTrabajosFiltrados.visitas_soporte.length > 0) {
                const id_visita = listaContentType.find(
                    (cont) => cont.model === 'visitasoporte',
                )?.id;
                if (id_visita) {
                    lista = lista.concat({
                        label: 'Visitas',
                        options: listaTrabajosFiltrados.visitas_soporte.map((vis) => ({
                            value: vis.id.toString(),
                            label: `${vis.id} - Empresa: ${vis.empresa_nombre} - Cliente: ${vis.cliente_nombre}`,
                            ct: id_visita,
                        })),
                    });
                }
            }
            setOptionsTrabajos(lista);
        }
    }, [listaTrabajosFiltrados]);

    const formik = useFormik({
        initialValues: {
            tipo_seguimiento: 'actualizacion',
            comentario: '',
            trabajo_id: '',
            content_type: '',
        },
        validationSchema: Yup.object().shape({
            comentario: Yup.string().required('Ingrese un comentario'),
            trabajo_id: Yup.string().nonNullable('Requerido').required('Requerido'),
            content_type: Yup.string().nonNullable('Requerido').required('Requerido'),
        }),
        onSubmit: async (values) => {
            try {
                if (!detalleOrdenTrabajo || !detalleSeleccionado) return;
                await asociarTrabajoDetalle({
                    ordenId: detalleOrdenTrabajo.id,
                    detalleId: detalleSeleccionado,
                    data: {
                        trabajo_id: Number(values.trabajo_id),
                        content_type: values.content_type,
                    },
                }).unwrap();
                await crearSeguimientoDetalle({
                    ordenId: detalleOrdenTrabajo.id,
                    detalleId: detalleSeleccionado,
                    data: {
                        detalle_trabajo: detalleSeleccionado,
                        usuario: usuarioEmpresaLogeado?.id,
                        tipo: values.tipo_seguimiento,
                        comentario: values.comentario,
                    },
                }).unwrap();
                toast.success('Trabajo a?adido', { autoClose: 1000 });
                setIsOpen(false);
                formik.resetForm();
            } catch (error: unknown) {
                toast.error(getErrorMessage(error) || 'Error en la solicitud');
            }
        },
    });
                    if (seguimientoResponse.data) {
                        toast.success('Trabajo añadido', { autoClose: 1000 });
                                                setIsOpen(false);
                        formik.resetForm();
                    }
                }
            } catch (error: any) {
                toast.error(error.response?.data || 'Error en la solicitud');
            }
        },
    });

    useEffect(() => {
        if (!isOpen) {
            formik.resetForm();
        }
    }, [isOpen]);

    return (
        <Modal isOpen={isOpen} setIsOpen={setIsOpen} isStaticBackdrop={true}>
            <ModalHeader>
                <Badge className='text-xl'>Añadir Cotizacion o Asistencia Técnica</Badge>
            </ModalHeader>
            <ModalBody>
                <div className='flex flex-col gap-4'>
                    <div>
                        <Badge>Añadir una cotizacion o asistencia técnica</Badge>
                        <Validation
                            isValid={formik.isValid}
                            isTouched={formik.touched.trabajo_id}
                            invalidFeedback={formik.errors.trabajo_id}>
                            <SelectReact
                                noOptionsMessage={(e) => `No existe ${e.inputValue}`}
                                placeholder='Eliga una cotización o asistencia técnica'
                                name='trabajo_id'
                                isClearable
                                options={optionsTrabajos}
                                onBlur={formik.handleBlur}
                                onChange={(e) => {
                                    if (e) {
                                        formik.setFieldValue(
                                            'trabajo_id',
                                            (e as { value: string; label: string; ct: number })
                                                .value,
                                        );
                                        formik.setFieldValue(
                                            'content_type',
                                            (e as { value: string; label: string; ct: number }).ct,
                                        );
                                    } else {
                                        formik.setFieldValue('trabajo_id', '');
                                        formik.setFieldValue('content_type', '');
                                    }
                                }}
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
                    <Button variant='solid' onClick={() => formik.handleSubmit()}>
                        Guardar
                    </Button>
                </ModalFooterChild>
            </ModalFooter>
        </Modal>
    );
}

export default AñadirTrabajoDT;
