import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
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
import ApiService from '@/services/ApiService';
import {
    listaAsistenciaUsuariosThunk,
    listaDetalleTrabajoOTThunk,
    listaUsuariosDelEquipoPorClienteThunk,
    useAppDispatch,
    useAppSelector,
} from '@/store';
import { useFormik } from 'formik';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import * as Yup from 'yup';

function CrearAsistenciaUsuarioEnOT() {
    const dispatch = useAppDispatch();
    const { listaUsuariosDelEquipoPorCliente } = useAppSelector((state) => state.recursos);
    const { detalleOrdenTrabajo, detalleDelDetalleTrabajo } = useAppSelector(
        (state) => state.ordenTrabajo,
    );
    const [optionsEquipos, setOptionsEquipos] = useState<TSelectOption[]>([]);
    const [isOpen, setIsOpen] = useState<boolean>(false);

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            observaciones: '',
            usuario_equipo: '',
        },
        validationSchema: Yup.object().shape({
            observaciones: Yup.string().nullable(),
            usuario_equipo: Yup.string().required('Requerido').nullable(),
        }),
        onSubmit: async (values) => {
            try {
                const response = await ApiService.fetchData({
                    url: `/api/visitas-soporte/${detalleDelDetalleTrabajo?.trabajo_id}/asistencias-usuarios/`,
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    data: JSON.stringify({
                        ...values,
                        estado_revision: 'por_revisar',
                        visita: detalleDelDetalleTrabajo?.trabajo_id,
                    }),
                });
                if (response.data) {
                    toast.success('Asistencia de usuario creada', { autoClose: 1000 });
                    formik.resetForm();
                    dispatch(
                        listaAsistenciaUsuariosThunk({
                            id_visita: detalleDelDetalleTrabajo?.trabajo_id,
                        }),
                    );
                    setIsOpen(false);
                }
            } catch (error: any) {
                const mensajesError = Object.values(error.response.data).flat().join(' ');
                toast.error(mensajesError || 'Error al crear la asistencia usuario', {
                    toastId: 'Error al crear la asistencia usuario',
                });
            }
        },
    });

    useEffect(() => {
        if (!isOpen) {
            formik.resetForm();
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && detalleDelDetalleTrabajo) {
            dispatch(
                listaUsuariosDelEquipoPorClienteThunk({ cliente_id: detalleOrdenTrabajo?.cliente }),
            );
        }
    }, [isOpen, detalleDelDetalleTrabajo]);

    useEffect(() => {
        if (listaUsuariosDelEquipoPorCliente) {
            setOptionsEquipos(
                listaUsuariosDelEquipoPorCliente.map((user) => ({
                    value: user.id.toString(),
                    label: `${user.datos_equipo.numero_serie} - ${user.nombre_usuario}`,
                })),
            );
        }
    }, [listaUsuariosDelEquipoPorCliente]);

    return (
        <>
            <Tooltip text='Crear Asistencia de Usuario'>
                <Button
                    variant='solid'
                    icon='HeroPlus'
                    onClick={() => {
                        setIsOpen(true);
                    }}></Button>
            </Tooltip>
            <Modal size={'lg'} isOpen={isOpen} setIsOpen={setIsOpen} isStaticBackdrop={true}>
                <ModalHeader>
                    <Badge className='text-xl'>Crear Asistencia de Usuario</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className='flex flex-col gap-4'>
                        <div>
                            <Badge>Usuario Equipo</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.usuario_equipo}
                                invalidFeedback={formik.errors.usuario_equipo}>
                                <SelectReact
                                    name='usuario_equipo'
                                    placeholder='Seleccione un Usuario'
                                    noOptionsMessage={(e) => `No existe ${e.inputValue}`}
                                    options={optionsEquipos}
                                    onBlur={formik.handleBlur}
                                    value={{
                                        value: formik.values.usuario_equipo,
                                        label:
                                            optionsEquipos.find(
                                                (user) =>
                                                    user.value === formik.values.usuario_equipo,
                                            )?.label || '',
                                    }}
                                    onChange={(option: any) => {
                                        formik.setFieldValue('usuario_equipo', option?.value);
                                    }}
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
                                    onBlur={formik.handleBlur}
                                    onChange={formik.handleChange}
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
                                formik.resetForm();
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

export default CrearAsistenciaUsuarioEnOT;
