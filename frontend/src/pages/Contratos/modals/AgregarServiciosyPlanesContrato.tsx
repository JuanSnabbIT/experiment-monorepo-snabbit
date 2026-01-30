import Input from '@/components/form/Input';
import SelectReact from '@/components/form/SelectReact';
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
    detalleContratoEmpresaClienteThunk,
    listaContentTypeThunk,
    listaPlanServiciosThunk,
    listaServiciosThunk,
    useAppDispatch,
    useAppSelector,
} from '@/store';
import { useFormik } from 'formik';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';

interface IServicioGenericoEdicion {
    servicios_genericos: {
        cantidad: number;
        precio_unitario: number;
        object_id: number;
        content_type: number;
        nombre: string;
    }[];
}

function AgregarServiciosyPlanesContrato() {
    const dispatch = useAppDispatch();
    const { listaContentType } = useAppSelector((state) => state.core);
    const { detalleContratoEmpresaCliente, listaServicios, listaPlanServicios } = useAppSelector(
        (state) => state.contrato,
    );
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [optionsSerGenericos, setOptionsSerGenericos] = useState<
        { label: string; options: { value: string; label: string; content_type: number }[] }[]
    >([]);
    const [nuevoServicio, setNuevoServicio] = useState<
        { value: string; label: string; content_type: number } | undefined
    >();

    useEffect(() => {
        if (detalleContratoEmpresaCliente && isOpen) {
            dispatch(listaServiciosThunk());
            dispatch(listaPlanServiciosThunk());
        }
    }, [detalleContratoEmpresaCliente, isOpen]);

    useEffect(() => {
        if (listaContentType.length === 0) {
            dispatch(listaContentTypeThunk());
        }
    }, []);

    useEffect(() => {
        if (detalleContratoEmpresaCliente && isOpen) {
            formik.setValues({
                servicios_genericos: detalleContratoEmpresaCliente.contrato_servicios.map(
                    (ser) => ({
                        nombre: ser.nombre,
                        cantidad: ser.cantidad,
                        content_type: ser.content_type,
                        object_id: ser.object_id,
                        precio_unitario: Number(ser.precio_unitario),
                    }),
                ),
            });
        }
    }, [detalleContratoEmpresaCliente, isOpen]);

    const formik = useFormik<IServicioGenericoEdicion>({
        enableReinitialize: true,
        initialValues: {
            servicios_genericos: [],
        },
        onSubmit: async (values) => {
            try {
                const response = await ApiService.fetchData({
                    url: `/api/contratos/${detalleContratoEmpresaCliente?.id}/editar-servicios-genericos/`,
                    method: 'put',
                    headers: { 'Content-Type': 'application/json' },
                    data: JSON.stringify({
                        servicios_genericos: values.servicios_genericos.map((ser) => ({
                            content_type: ser.content_type,
                            object_id: ser.object_id,
                            cantidad: ser.cantidad,
                            precio_unitario: ser.precio_unitario,
                        })),
                    }),
                });
                if (response.data) {
                    dispatch(
                        detalleContratoEmpresaClienteThunk({
                            id_contrato: detalleContratoEmpresaCliente?.id,
                        }),
                    );
                    setIsOpen(false);
                }
            } catch (error: any) {
                toast.error(error.response.data || 'Error al agregar los servicio/planes', {
                    toastId: 'Error al agregar los servicio/planes',
                });
            }
        },
    });

    useEffect(() => {
        if (listaPlanServicios && listaServicios && isOpen) {
            const ctPlan = listaContentType.find((ct) => ct.model === 'planservicio');
            const ctSer = listaContentType.find((ct) => ct.model === 'servicio');
            if (ctPlan && ctSer) {
                setOptionsSerGenericos([
                    {
                        label: 'Planes',
                        options: listaPlanServicios.map((plan) => ({
                            value: plan.id.toString(),
                            label: plan.nombre,
                            content_type: ctPlan.id,
                        })),
                    },
                    {
                        label: 'Servicios',
                        options: listaServicios.map((ser) => ({
                            value: ser.id.toString(),
                            label: ser.nombre,
                            content_type: ctSer.id,
                        })),
                    },
                ]);
            }
        }
    }, [listaPlanServicios, listaServicios, isOpen]);

    useEffect(() => {
        if (!isOpen) {
            formik.resetForm();
            setNuevoServicio(undefined);
        }
    }, [isOpen]);

    return (
        <>
            <Tooltip text='Agregar Servicios/Planes'>
                <Button
                    variant='outline'
                    color='blue'
                    icon='HeroPlus'
                    className='text-blue-500'
                    onClick={() => {
                        setIsOpen(true);
                    }}>
                    Agregar
                </Button>
            </Tooltip>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
                <ModalHeader>
                    <Badge className='text-xl'>Agregar Servicios/Planes</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className='flex flex-col gap-4'>
                        {formik.values.servicios_genericos.map((servicio, index) => (
                            <div
                                className='grid grid-cols-3 gap-2 rounded-xl border border-blue-500 p-4'
                                key={index}>
                                <div>
                                    <Badge>
                                        Nombre
                                        <Button
                                            color='red'
                                            icon='HeroTrash'
                                            size='sm'
                                            onClick={() => {
                                                // const servicioEliminado = formik.values.servicios_genericos[index];
                                                const nuevasCondiciones =
                                                    formik.values.servicios_genericos.filter(
                                                        (_, i) => i !== index,
                                                    );
                                                // Agregamos al array de eliminación solo si la condición eliminada posee un id (esto es útil si ya estaba registrada en la BD).
                                                // let nuevosEliminados = [...formik.values.eliminar_condiciones];
                                                // if (servicioEliminado.id) {
                                                //     nuevosEliminados.push(servicioEliminado.id);
                                                // }
                                                formik.setFieldValue(
                                                    'servicios_genericos',
                                                    nuevasCondiciones,
                                                );
                                                // formik.setFieldValue("eliminar_condiciones", nuevosEliminados);
                                            }}
                                        />
                                    </Badge>
                                    <div className='ml-2'>{servicio.nombre}</div>
                                </div>
                                <div>
                                    <Badge>Cantidad</Badge>
                                    <Input
                                        name={`servicios_genericos[${index}].cantidad`}
                                        type='number'
                                        // onChange={(e) => {formik.setFieldValue(`servicios_genericos[${index}].cantidad`)}}
                                        onChange={formik.handleChange}
                                        value={servicio.cantidad}
                                    />
                                </div>
                                <div>
                                    <Badge>Precio Unitario</Badge>
                                    <Input
                                        name={`servicios_genericos[${index}].precio_unitario`}
                                        type='number'
                                        onChange={formik.handleChange}
                                        value={servicio.precio_unitario}
                                    />
                                </div>
                            </div>
                        ))}
                        <div className='flex flex-row items-center justify-center'>
                            <div className='w-full'>
                                <Badge>Servicio/Plan</Badge>
                                <SelectReact
                                    name='servicio_plan'
                                    options={optionsSerGenericos}
                                    onChange={(e: any) => {
                                        // formik.setFieldValue(`servicios_genericos`,
                                        //     {cantidad: 1, precio_unitario: 1, object_id: (e as TSelectOption).value, content_type: 0}
                                        // )
                                        setNuevoServicio(e);
                                    }}
                                    value={nuevoServicio}
                                    placeholder='Agregue un Servicio/Plan'
                                />
                            </div>
                            <div>
                                <Button
                                    onClick={() => {
                                        if (!nuevoServicio) {
                                            toast.error(
                                                'Seleccione un servicio o plan para agregarlo',
                                                {
                                                    toastId:
                                                        'Seleccione un servicio o plan para agregarlo',
                                                },
                                            );
                                            return;
                                        }
                                        formik.setFieldValue('servicios_genericos', [
                                            ...formik.values.servicios_genericos,
                                            {
                                                cantidad: 1,
                                                precio_unitario: 1,
                                                object_id: nuevoServicio.value,
                                                content_type: nuevoServicio.content_type,
                                                nombre: nuevoServicio.label,
                                            },
                                        ]);
                                        setNuevoServicio(undefined);
                                    }}>
                                    Agregar
                                </Button>
                            </div>
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

export default AgregarServiciosyPlanesContrato;
