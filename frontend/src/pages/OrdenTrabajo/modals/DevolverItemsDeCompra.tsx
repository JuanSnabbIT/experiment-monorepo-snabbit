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
import Tooltip from '@/components/ui/Tooltip';
import { IDetalleOrdenDeTrabajoCompra } from '@/interface/ordenTrabajo.interface';
import ApiService from '@/services/ApiService';
import {
    listaComprasOrdenTrabajoThunk,
    listaItemsCompraThunk,
    listaItemsEnGuiaSalidaBodegaThunk,
    useAppDispatch,
    useAppSelector,
} from '@/store';
import { FormikErrors, useFormik } from 'formik';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import * as Yup from 'yup';

interface IItemCompraDevolucionFormik {
    items: {
        cantidad_devuelta: number;
        id: number | null | undefined;
        nombre: string;
        cantidad_rebajada: number;
    }[];
}

const validationSchema = Yup.object().shape({
    items: Yup.array().of(
        Yup.object().shape({
            id: Yup.number().required(), // si quieres validar que exista
            nombre: Yup.string().required(),
            cantidad_rebajada: Yup.number().required(),
            cantidad_devuelta: Yup.number()
                .required('Debes indicar una cantidad a devolver')
                .min(0, 'La cantidad no puede ser menor a 0')
                .max(Yup.ref('cantidad_rebajada'), 'No puedes devolver más de lo comprado'),
        }),
    ),
});

function DevolverItemsDeCompra({
    detalleOTCompra,
}: {
    detalleOTCompra: IDetalleOrdenDeTrabajoCompra;
}) {
    const dispatch = useAppDispatch();
    const { listaItemsEnGuiaSalidaBodega } = useAppSelector((state) => state.bodega);
    const [isOpen, setIsOpen] = useState<boolean>(false);

    useEffect(() => {
        if (detalleOTCompra && isOpen && detalleOTCompra.insumo) {
            // dispatch(listaItemsCompraThunk({id_compra: detalleOTCompra.compra.id}))
            dispatch(listaItemsEnGuiaSalidaBodegaThunk({ id_guia: detalleOTCompra.insumo }));
        }
    }, [detalleOTCompra, isOpen]);

    useEffect(() => {
        if (listaItemsEnGuiaSalidaBodega.length > 0) {
            formik.setValues({
                items: listaItemsEnGuiaSalidaBodega.map((item) => ({
                    id: item.id,
                    cantidad_devuelta: item.cantidad_rebajada,
                    nombre: item.datos_stock.datos_item.nombre,
                    cantidad_rebajada: item.cantidad_rebajada,
                })),
            });
        }
    }, [listaItemsEnGuiaSalidaBodega]);

    const formik = useFormik<IItemCompraDevolucionFormik>({
        enableReinitialize: true,
        initialValues: {
            items: [],
        },
        validationSchema,
        onSubmit: async (values) => {
            try {
                const response = await ApiService.fetchData({
                    url: `/api/guia-salida/${detalleOTCompra.insumo}/devolver_a_bodega/`,
                    method: 'post',
                    headers: { 'Content-Type': 'application/json' },
                    data: JSON.stringify({
                        items: values.items.map((item) => ({
                            item_guia_id: item.id,
                            cantidad_a_devolver: item.cantidad_devuelta,
                        })),
                    }),
                });
                if (response.data) {
                    toast.success('Items devueltos a bodega', { autoClose: 1000 });
                    setIsOpen(false);
                    dispatch(listaComprasOrdenTrabajoThunk({ id_orden: detalleOTCompra.orden }));
                }
            } catch (error: any) {
                toast.error(error.response.data.detail || 'Error al devolver los items', {
                    toastId: 'Error al devolver los items',
                });
            }
        },
    });

    return (
        <>
            <Tooltip text='Devolver Items a Bodega'>
                <Button
                    variant='solid'
                    color='zinc'
                    icon='DuoIncomingBox'
                    onClick={() => {
                        setIsOpen(true);
                    }}></Button>
            </Tooltip>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
                <ModalHeader>
                    <Badge className='text-xl'>Devolver Items a Bodega</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className='flex flex-col gap-4'>
                        {formik.values.items.length > 0 &&
                            formik.values.items.map((item, index) => (
                                <div key={index} className='rounded-xl border border-blue-500 p-4'>
                                    <div>
                                        <Badge>Nombre</Badge>
                                        <div className='ml-4'>{item.nombre}</div>
                                    </div>
                                    <div className='grid grid-cols-2 gap-4'>
                                        <div>
                                            <Badge>Cantidad Comprada</Badge>
                                            <Input
                                                name='cantidad_rebajada'
                                                disabled={true}
                                                value={item.cantidad_rebajada}
                                            />
                                        </div>
                                        <div>
                                            <Badge>Cantidad a Devolver</Badge>
                                            <Validation
                                                isValid={formik.isValid}
                                                isTouched={
                                                    formik.touched.items &&
                                                    formik.touched.items[index] &&
                                                    formik.touched.items[index].cantidad_devuelta
                                                }
                                                invalidFeedback={
                                                    formik.errors.items &&
                                                    Array.isArray(formik.errors.items) &&
                                                    formik.errors.items[index] &&
                                                    typeof formik.errors.items[index] ===
                                                        'object' &&
                                                    // @ts-ignore
                                                    'cantidad_devuelta' in
                                                        formik.errors.items[index]
                                                        ? (
                                                              formik.errors.items[
                                                                  index
                                                              ] as FormikErrors<{
                                                                  cantidad_devuelta: number;
                                                              }>
                                                          ).cantidad_devuelta
                                                        : ''
                                                }>
                                                <Input
                                                    name={`items[${index}].cantidad_devuelta`}
                                                    type='number'
                                                    onChange={formik.handleChange}
                                                    onBlur={formik.handleBlur}
                                                    value={item.cantidad_devuelta}
                                                />
                                            </Validation>
                                        </div>
                                    </div>
                                </div>
                            ))}
                    </div>
                </ModalBody>
                <ModalFooter>
                    <ModalFooterChild>
                        <Button
                            variant='solid'
                            color='zinc'
                            onClick={async () => {
                                try {
                                    const response = await ApiService.fetchData({
                                        url: `/api/guia-salida/${detalleOTCompra.insumo}/devolver_a_bodega/`,
                                        method: 'post',
                                        headers: { 'Content-Type': 'application/json' },
                                    });
                                    if (response.data) {
                                        toast.success('Se devolvieron todos los items a bodega', {
                                            autoClose: 1000,
                                        });
                                        dispatch(
                                            listaComprasOrdenTrabajoThunk({
                                                id_orden: detalleOTCompra.orden,
                                            }),
                                        );
                                    }
                                } catch (error: any) {
                                    toast.error(
                                        error.response.data.detail || 'Error al devolver los items',
                                        { toastId: 'Error al devolver los items' },
                                    );
                                }
                            }}>
                            Devolución Completa
                        </Button>
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
                            onClick={() => {
                                formik.handleSubmit();
                            }}>
                            Devolución Parcial
                        </Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    );
}

export default DevolverItemsDeCompra;
