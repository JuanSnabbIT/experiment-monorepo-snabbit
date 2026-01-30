import Checkbox, { CheckboxGroup } from '@/components/form/Checkbox';
import Input from '@/components/form/Input';
import Validation from '@/components/form/Validation';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal, {
    ModalBody,
    ModalFooter,
    ModalFooterChild,
    ModalHeader,
} from '@/components/ui/Modal';

import {
    useDevolverABodegaGuiaMutation,
    useGetDetalleTrabajoQuery,
    useGetItemsGuiaSalidaQuery,
    useUpdateGuiaSalidaMutation,
} from '@/store/slices/ordenTrabajo/ordenTrabajoApi';
import { useFormik } from 'formik';
import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import * as Yup from 'yup';
import { useParams } from 'react-router-dom';

function TerminarInsumoDT({
    isOpen,
    setIsOpen,
    detalleSeleccionado,
    setDetalleSeleccionado,
}: {
    isOpen: boolean;
    setIsOpen: Dispatch<SetStateAction<boolean>>;
    detalleSeleccionado: number | null;
    setDetalleSeleccionado: Dispatch<SetStateAction<number | null>>;
}) {
    const { id } = useParams<{ id: string }>();
    const ordenId = id ? Number(id) : undefined;
    const { data: detalleDelDetalleTrabajo } = useGetDetalleTrabajoQuery(
        { ordenId: ordenId ?? 0, detalleId: detalleSeleccionado ?? 0 },
        { skip: !ordenId || !detalleSeleccionado },
    );
    const { data: listaItemsEnGuiaSalidaBodega = [] } = useGetItemsGuiaSalidaQuery(
        detalleDelDetalleTrabajo?.insumo ?? 0,
        { skip: !detalleDelDetalleTrabajo?.insumo },
    );
    const [devolverABodegaGuia] = useDevolverABodegaGuiaMutation();
    const [updateGuiaSalida] = useUpdateGuiaSalidaMutation();
    const [aprobado, setAprobado] = useState<string>('1');
    const [terminado, setTerminado] = useState<boolean>(true);


    useEffect(() => {
        if (listaItemsEnGuiaSalidaBodega.length > 0 && isOpen) {
            formik.setValues({
                items: listaItemsEnGuiaSalidaBodega.map((item) => ({
                    id: item.id,
                    cantidad: item.cantidad_rebajada,
                    cantidad_a_devolver: item.cantidad_rebajada,
                    nombre: item.datos_stock.datos_item.nombre,
                })),
            });
        }
    }, [listaItemsEnGuiaSalidaBodega, isOpen]);

    useEffect(() => {
        if (!isOpen) {
            setDetalleSeleccionado(null);
            formik.resetForm();
        }
    }, [isOpen]);

    const formik = useFormik<{
        items: { id: number; cantidad: number; nombre: string; cantidad_a_devolver: number }[];
    }>({
        enableReinitialize: true,
        initialValues: {
            items: [],
        },
        validationSchema: Yup.object({
            items: Yup.array().of(
                Yup.object({
                    id: Yup.number().required(),
                    nombre: Yup.string().required(),
                    cantidad: Yup.number().required(),
                    cantidad_a_devolver: Yup.number()
                        .min(0, 'No puede ser negativo')
                        .max(Yup.ref('cantidad'), 'No puede ser mayor que la cantidad entregada')
                        .required('Obligatorio'),
                }),
            ),
        }),
        onSubmit: async (values) => {
            try {
                if (aprobado === '1') {
                    await devolverABodegaGuia({
                        id: detalleDelDetalleTrabajo?.insumo ?? 0,
                    }).unwrap();
                    toast.success('Insumos devueltos a la bodega', { autoClose: 1000 });
                    setIsOpen(false);
                } else {
                    await devolverABodegaGuia({
                        id: detalleDelDetalleTrabajo?.insumo ?? 0,
                        data: {
                            items: values.items.map((item) => ({
                                item_guia_id: item.id,
                                cantidad_a_devolver: item.cantidad_a_devolver,
                            })),
                        },
                    }).unwrap();
                    toast.success('Insumos devueltos de manera parcial a la bodega', {
                        autoClose: 1000,
                    });
                    setIsOpen(false);
                }
            } catch (error: any) {
                const mensajesError = Object.values(error.response.data).flat().join(' ');
                toast.error(mensajesError || 'Error al devolver el insumo', {
                    toastId: 'Error al devolver el insumo',
                });
            }
        },
    });

    return (
        <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
            <ModalHeader>
                <Badge className='text-xl'>Devolver/Terminar Insumo de Bodega</Badge>
            </ModalHeader>
            <ModalBody>
                <div className='flex flex-col gap-4'>
                    <div>
                        <Badge>¿Se ocuparon todos los items?</Badge>
                        <CheckboxGroup isInline>
                            <Checkbox
                                label='Si'
                                id='1'
                                onChange={() => {
                                    setTerminado(true);
                                }}
                                checked={terminado}
                            />
                            <Checkbox
                                label='No'
                                id='2'
                                onChange={() => {
                                    setTerminado(false);
                                }}
                                checked={!terminado}
                            />
                        </CheckboxGroup>
                    </div>
                    {!terminado && (
                        <>
                            <div>
                                <Badge>¿Se devolveran todos los items?</Badge>
                                <CheckboxGroup isInline>
                                    <Checkbox
                                        label='Si'
                                        id='1'
                                        onChange={() => {
                                            setAprobado('1');
                                        }}
                                        checked={aprobado === '1'}
                                    />
                                    <Checkbox
                                        label='No'
                                        id='2'
                                        onChange={() => {
                                            setAprobado('2');
                                        }}
                                        checked={aprobado === '2'}
                                    />
                                </CheckboxGroup>
                            </div>
                            {aprobado === '1' ? (
                                <>
                                    <div className='grid grid-cols-2 gap-2'>
                                        <div>
                                            <Badge>Nombre</Badge>
                                        </div>
                                        <div>
                                            <Badge>Cantidad Rebajada</Badge>
                                        </div>
                                    </div>
                                    {listaItemsEnGuiaSalidaBodega.length > 0 &&
                                        listaItemsEnGuiaSalidaBodega.map((item, index) => (
                                            <div
                                                className='grid grid-cols-2 gap-2 rounded-xl border border-blue-500 p-4'
                                                key={index}>
                                                <div>{item.datos_stock.datos_item.nombre}</div>
                                                <div>{item.cantidad_rebajada}</div>
                                            </div>
                                        ))}
                                </>
                            ) : (
                                <>
                                    <div className='grid grid-cols-3 gap-2'>
                                        <div>
                                            <Badge>Nombre</Badge>
                                        </div>
                                        <div>
                                            <Badge>Cantidad Rebajada</Badge>
                                        </div>
                                        <div>
                                            <Badge>Cantidad a Devolver</Badge>
                                        </div>
                                    </div>
                                    {formik.values.items.length > 0 &&
                                        formik.values.items.map((item, index) => {
                                            const err = formik.errors.items?.[index];
                                            return (
                                                <div
                                                    className='grid grid-cols-3 gap-2 rounded-xl border border-blue-500 p-2'
                                                    key={index}>
                                                    <div>{item.nombre}</div>
                                                    <div>{item.cantidad}</div>
                                                    <div>
                                                        <Validation
                                                            isValid={formik.isValid}
                                                            isTouched={
                                                                !!formik.touched.items?.[index]
                                                                    ?.cantidad_a_devolver
                                                            }
                                                            invalidFeedback={
                                                                typeof err === 'object' &&
                                                                err?.cantidad_a_devolver
                                                                    ? err.cantidad_a_devolver
                                                                    : undefined
                                                            }>
                                                            <Input
                                                                name={`items[${index}].cantidad_a_devolver`}
                                                                type='number'
                                                                onBlur={formik.handleBlur}
                                                                onChange={formik.handleChange}
                                                                value={item.cantidad_a_devolver}
                                                            />
                                                        </Validation>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                </>
                            )}
                        </>
                    )}
                </div>
            </ModalBody>
            <ModalFooter>
                <ModalFooterChild>
                    {/* <Button variant="solid" color="amber" onClick={async () => {
                        try {
                            const response = await ApiService.fetchData({url: `/api/guia-salida/${detalleDelDetalleTrabajo?.insumo}/devolver_a_bodega/`, method: 'post', headers: {'Content-Type': 'application/json'}})
                                if (response.data) {
                                    toast.success("Se devolvieron todos los items a bodega", {autoClose: 1000})
                                    dispatch(listaDetalleTrabajoOTThunk({id_orden: detalleOrdenTrabajo?.id}))
                                    setIsOpen(false)
                                }
                        } catch (error: any) {
                            const mensajesError = Object.values(error.response.data).flat().join(" ");
                            toast.error(mensajesError || "Error al hacer la devolucion completa", {toastId: "Error al hacer la devolucion completa"})
                        }
                    }}>Devolución Completa</Button> */}
                </ModalFooterChild>
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
                        onClick={async () => {
                            if (terminado) {
                                try {
                                    await updateGuiaSalida({
                                        id: detalleDelDetalleTrabajo?.insumo ?? 0,
                                        data: { estado: 'T' },
                                    }).unwrap();
                                    toast.success('Insumos terminados', { autoClose: 1000 });
                                    setIsOpen(false);
                                } catch (error: any) {
                                    const mensajesError = Object.values(error.response.data)
                                        .flat()
                                        .join(' ');
                                    toast.error(mensajesError || 'Error al terminar el insumo', {
                                        toastId: 'Error al terminar el insumo',
                                    });
                                }
                            } else {
                                formik.handleSubmit();
                            }
                        }}>
                        {terminado
                            ? 'Terminar Insumo'
                            : aprobado === '1'
                              ? 'Devolución Completa'
                              : 'Devolución Parcial'}
                    </Button>
                </ModalFooterChild>
            </ModalFooter>
        </Modal>
    );
}

export default TerminarInsumoDT;
