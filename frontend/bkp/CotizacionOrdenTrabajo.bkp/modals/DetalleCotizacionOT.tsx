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
import { ICotizacionEnOT } from '@/interface/ordenTrabajo.interface';
import ApiService from '@/services/ApiService';
import {
    listaCotizacionesOTThunk,
    listaCotizacionesThunk,
    listaUsuariosEmpresaYClienteThunk,
    useAppDispatch,
    useAppSelector,
} from '@/store';
import { id, is } from 'date-fns/locale';
import { useFormik } from 'formik';
import { values } from 'lodash';
import { useEffect, useState } from 'react';
import { SingleValue } from 'react-select';
import { toast } from 'react-toastify';
import * as Yup from 'yup';

const DetalleCotizacionOT = ({ valuess }: { valuess: ICotizacionEnOT }) => {
    const dispatch = useAppDispatch();
    const { personalizacionUsuario } = useAppSelector((state) => state.auth);
    const { listaCotizacionesOT, detalleOrdenTrabajo } = useAppSelector(
        (state) => state.ordenTrabajo,
    );
    const { listaUsuariosEmpresaYCliente } = useAppSelector((state) => state.empresa);
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [isEditing, setIsEditing] = useState<boolean>(false);

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            aceptada_por: '',
        },
        onSubmit: async (values) => {
            try {
                const response = await ApiService.fetchData({
                    url: `/api/ordenes-trabajo/${detalleOrdenTrabajo?.id}/cotizaciones/${valuess.id}/`,
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    data: JSON.stringify(values),
                });
                if (response.data) {
                    toast.success('Cotizacion en orden de trabajo creada', { autoClose: 1000 });
                    dispatch(listaCotizacionesOTThunk({ id_ot: valuess.id }));
                    formik.resetForm();
                    setIsOpen(false);
                }
            } catch (error: any) {
                toast.error(
                    error.response.data || 'Error al editar la cotizacion en orden de trabajo',
                    { toastId: 'Error al editar la cotizacion en orden de trabajo' },
                );
            }
        },
    });

    useEffect(() => {
        if (isEditing) {
            formik.setValues({
                aceptada_por: valuess.aceptada_por.toString(),
            });
        }
    }, [isEditing, valuess]);

    return (
        <>
            <Tooltip text='Editar Cotización en Orden de Trabajo'>
                <Button
                    color='violet'
                    variant='solid'
                    onClick={() => {
                        setIsOpen(true);
                    }}
                    icon='HeroEye'
                />
            </Tooltip>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
                <ModalHeader>
                    <Badge className='text-xl'>Editar Cotización en Orden de Trabajo</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className='flex flex-col gap-4'>
                        {isEditing ? (
                            <>
                                <div className='w-full'>
                                    <Badge>Cotizacion</Badge>
                                    <div className='ml-4'>{valuess.numero_cotizacion}</div>
                                </div>
                                <div className='w-full'>
                                    <Badge>Aceptada Por</Badge>
                                    <Validation
                                        isValid={formik.isValid}
                                        isTouched={formik.touched.aceptada_por}
                                        invalidFeedback={formik.errors.aceptada_por}>
                                        <SelectReact
                                            name='aceptada_por'
                                            onBlur={formik.handleBlur}
                                            isClearable={true}
                                            onChange={(e: any) => {
                                                formik.setFieldValue('aceptada_por', e.value);
                                            }}
                                            options={listaUsuariosEmpresaYCliente.map((user) => ({
                                                value: user.id.toString(),
                                                label: user.nombre_usuario,
                                            }))}
                                            value={{
                                                value: formik.values.aceptada_por,
                                                label:
                                                    listaUsuariosEmpresaYCliente.find(
                                                        (user) =>
                                                            user.id.toString() ===
                                                            formik.values.aceptada_por,
                                                    )?.nombre_usuario || '',
                                            }}
                                        />
                                    </Validation>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className='w-full'>
                                    <Badge>Cotizacion</Badge>
                                    <div className='ml-4'>{valuess.numero_cotizacion}</div>
                                </div>
                                <div className='w-full'>
                                    <Badge>Aceptada Por</Badge>
                                    <div className='ml-4'>{valuess.usuario_nombre}</div>
                                </div>
                            </>
                        )}
                    </div>
                </ModalBody>
                <ModalFooter>
                    <ModalFooterChild></ModalFooterChild>
                    <ModalFooterChild>
                        {isEditing ? (
                            <>
                                <Button
                                    color='red'
                                    onClick={() => {
                                        setIsEditing(false);
                                        formik.resetForm();
                                    }}>
                                    Cancelar
                                </Button>
                                <Button
                                    variant='solid'
                                    onClick={() => {
                                        formik.handleSubmit();
                                        setIsOpen(false);
                                    }}>
                                    Actualizar
                                </Button>
                            </>
                        ) : (
                            <Button
                                variant='solid'
                                onClick={() => {
                                    setIsEditing(true);
                                }}>
                                Modificar
                            </Button>
                        )}
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    );
};

export default DetalleCotizacionOT;
