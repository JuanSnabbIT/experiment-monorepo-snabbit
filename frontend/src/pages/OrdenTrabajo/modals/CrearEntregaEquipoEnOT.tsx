import { useEffect, useState } from 'react';
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
import ApiService from '@/services/ApiService';
import {
    useAppDispatch,
    useAppSelector,
    listaEntregaEquipoThunk,
    listaDeEquiposParaEntregarThunk,
    listaUsuariosTodoElClienteThunk,
} from '@/store';
import { toast } from 'react-toastify';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Tooltip from '@/components/ui/Tooltip';

function CrearEntregaEquipoEnOT() {
    const dispatch = useAppDispatch();
    const { detalleDelDetalleTrabajo, detalleOrdenTrabajo } = useAppSelector(
        (state) => state.ordenTrabajo,
    );
    const { listaUsuariosTodoElCliente } = useAppSelector((state) => state.empresa);
    const { listaDeEquiposParaEntregar } = useAppSelector((state) => state.visita);
    const [optionsUsuarios, setOptionsUsuarios] = useState<{ value: string; label: string }[]>([]);
    const [optionsEquipos, setOptionsEquipos] = useState<TSelectOption[]>([]);
    const [isOpen, setIsOpen] = useState<boolean>(false);

    useEffect(() => {
        if (isOpen && detalleDelDetalleTrabajo && detalleOrdenTrabajo) {
            dispatch(listaUsuariosTodoElClienteThunk({ id_empresa: detalleOrdenTrabajo.cliente }));
            dispatch(
                listaDeEquiposParaEntregarThunk({
                    id_guia_salida: detalleDelDetalleTrabajo.insumo,
                }),
            );
        }
    }, [isOpen, detalleOrdenTrabajo, detalleDelDetalleTrabajo]);

    useEffect(() => {
        if (listaUsuariosTodoElCliente) {
            setOptionsUsuarios(
                listaUsuariosTodoElCliente.map((user) => ({
                    value: user.id.toString(),
                    label: user.nombre_usuario,
                })),
            );
        }
    }, [listaUsuariosTodoElCliente]);

    const formik = useFormik({
        initialValues: {
            usuario_a_entregar: '',
            observaciones: '',
            equipo: '',
        },
        validationSchema: Yup.object().shape({
            usuario_a_entregar: Yup.string()
                .required('Seleccione un usuario')
                .nonNullable('Requerido'),
            observaciones: Yup.string().nullable().notRequired(),
            equipo: Yup.string().required('Seleccione un equipo').nonNullable('Requerido'),
        }),
        onSubmit: async (values) => {
            try {
                const response = await ApiService.fetchData({
                    url: `/api/visitas-soporte/${detalleDelDetalleTrabajo?.trabajo_id}/entregas-equipos/crear-con-item-guia/`,
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    data: JSON.stringify({
                        usuario_a_entregar: Number(values.usuario_a_entregar),
                        observaciones: values.observaciones,
                        visita: detalleDelDetalleTrabajo?.trabajo_id,
                        equipo: Number(values.equipo),
                    }),
                });
                if (response.data) {
                    toast.success('Entrega de equipo creada exitosamente', { autoClose: 1000 });
                    dispatch(
                        listaEntregaEquipoThunk({
                            id_visita: detalleDelDetalleTrabajo?.trabajo_id,
                        }),
                    );
                    setIsOpen(false);
                    formik.resetForm();
                }
            } catch (error: any) {
                toast.error(error.response.data || 'Error al crear entrega de equipo', {
                    toastId: 'Error al crear entrega de equipo',
                });
            }
        },
    });

    useEffect(() => {
        if (listaDeEquiposParaEntregar) {
            setOptionsEquipos(
                listaDeEquiposParaEntregar.map((equ) => ({
                    value: equ.id.toString(),
                    label: `${equ.numero_serie} - ${equ.nombre_equipo || 'Sin Nombre'}`,
                })),
            );
        }
    }, [listaDeEquiposParaEntregar]);

    useEffect(() => {
        if (!isOpen) {
            formik.resetForm();
        }
    }, [isOpen]);

    return (
        <>
            <Tooltip text='Añadir Entrega de Equipo'>
                <Button variant='solid' icon='HeroPlus' onClick={() => setIsOpen(true)} />
            </Tooltip>
            <Modal size={'lg'} isOpen={isOpen} setIsOpen={setIsOpen} isStaticBackdrop={true}>
                <ModalHeader>
                    <Badge className='text-xl'>Añadir Entrega de Equipo</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className='flex flex-col gap-4'>
                        <div>
                            <Badge>Usuario a Entregar</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.usuario_a_entregar}
                                invalidFeedback={formik.errors.usuario_a_entregar}>
                                <SelectReact
                                    noOptionsMessage={(e) => `No existe ${e.inputValue}`}
                                    placeholder='Seleccione un usuario'
                                    name='usuario_a_entregar'
                                    options={optionsUsuarios}
                                    onBlur={formik.handleBlur}
                                    onChange={(e) => {
                                        formik.setFieldValue(
                                            'usuario_a_entregar',
                                            (e as { value: string; label: string }).value,
                                        );
                                    }}
                                    value={optionsUsuarios.find(
                                        (option) =>
                                            option.value === formik.values.usuario_a_entregar,
                                    )}
                                />
                            </Validation>
                        </div>
                        <div>
                            <Badge>Equipo</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.equipo}
                                invalidFeedback={formik.errors.equipo}>
                                <SelectReact
                                    noOptionsMessage={(e) => `No existe ${e.inputValue}`}
                                    placeholder='Seleccione un equipo'
                                    name='equipo'
                                    options={optionsEquipos}
                                    onBlur={formik.handleBlur}
                                    onChange={(e) => {
                                        formik.setFieldValue('equipo', (e as TSelectOption).value);
                                    }}
                                    value={optionsEquipos.find(
                                        (option) => option.value === formik.values.equipo,
                                    )}
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
                                    value={formik.values.observaciones}
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
        </>
    );
}

export default CrearEntregaEquipoEnOT;
