import Input from '@/components/form/Input';
import Validation from '@/components/form/Validation';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import { ICompra, IItemEnCompra } from '@/interface/bodega.interface';
import ApiService from '@/services/ApiService';
import { listaItemsCompraThunk, useAppDispatch, useAppSelector } from '@/store';
import { useFormik } from 'formik';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import * as Yup from 'yup';
import CrearItemEnCompra from '../modals/CrearItemEnCompra';

export function ItemEnTabla({
    item,
    detalleCompra,
}: {
    item: IItemEnCompra;
    detalleCompra: ICompra | undefined;
}) {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const [editando, setEditando] = useState<boolean>(false);

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            cantidad: 0,
            precio: 0,
        },
        validationSchema: Yup.object().shape({
            cantidad: Yup.number()
                .required('Requerido')
                .nonNullable('Requerido')
                .min(1, 'Minimo 1'),
            precio: Yup.number().required('Requerido').nonNullable('Requerido').min(1, 'Minimo 1'),
        }),
        onSubmit: async (values) => {
            try {
                const response = await ApiService.fetchData({
                    url: `/api/compras/${detalleCompra?.id}/items-compras/${item.id}/`,
                    method: 'patch',
                    headers: { 'Content-Type': 'application/json' },
                    data: JSON.stringify({
                        cantidad: values.cantidad,
                        precio: values.precio,
                    }),
                });
                if (response.data) {
                    if (item.item_stock?.id) {
                        await ApiService.fetchData({
                            url: `/api/items-orden-compra-en-stock/${item.item_stock.id}/`,
                            method: 'patch',
                            headers: { 'Content-Type': 'application/json' },
                            data: JSON.stringify({
                                cantidad: values.cantidad,
                            }),
                        });
                    }
                    toast.success('Item actualizado', { autoClose: 1000 });
                    setEditando(false);
                    dispatch(listaItemsCompraThunk({ id_compra: detalleCompra?.id }));
                }
            } catch (error: any) {
                toast.error(error.response.data || 'Error al actualizar el item', {
                    toastId: 'Error al actualizar el item',
                });
            }
        },
    });

    useEffect(() => {
        if (editando) {
            formik.setValues({
                cantidad: item.cantidad,
                precio: item.precio,
            });
        } else {
            formik.resetForm();
        }
    }, [editando]);

    return (
        <>
            <div className='grid grid-cols-6 items-center gap-4 rounded-xl border border-blue-500 py-2'>
                <div>
                    <div className='ml-4'>{item.nombre_item}</div>
                </div>
                <div>
                    {editando ? (
                        <Validation
                            isValid={formik.isValid}
                            isTouched={formik.touched.cantidad}
                            invalidFeedback={formik.errors.cantidad}>
                            <Input
                                type='number'
                                name='cantidad'
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                                value={formik.values.cantidad}
                            />
                        </Validation>
                    ) : (
                        <div className='ml-4'>{item.cantidad}</div>
                    )}
                </div>
                <div>
                    {editando ? (
                        <Validation
                            isValid={formik.isValid}
                            isTouched={formik.touched.precio}
                            invalidFeedback={formik.errors.precio}>
                            <Input
                                type='number'
                                name='precio'
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                                value={formik.values.precio}
                            />
                        </Validation>
                    ) : (
                        <div className='ml-4'>${item.precio}</div>
                    )}
                </div>
                <div>
                    <div className='ml-4'>{item.cantidad_devuelta ?? 0}</div>
                </div>
                <div>
                    <div className='ml-4'>
                        {item.cantidad_usada ?? 0} {item.estado_uso_label ? `(${item.estado_uso_label})` : ''}
                    </div>
                </div>
                <div className='flex flex-wrap gap-2'>
                    {detalleCompra &&
                        detalleCompra.estado === '-' &&
                        (editando ? (
                            <>
                                <Button
                                    variant='solid'
                                    color='emerald'
                                    icon='HeroCheck'
                                    onClick={() => {
                                        formik.handleSubmit();
                                    }}
                                />
                                <Button
                                    variant='solid'
                                    color='red'
                                    icon='HeroXMark'
                                    onClick={() => {
                                        setEditando(false);
                                    }}
                                />
                            </>
                        ) : (
                            <>
                                <Button
                                    variant='solid'
                                    icon='HeroPencil'
                                    onClick={() => {
                                        setEditando(true);
                                    }}></Button>
                                <Button
                                    variant='solid'
                                    color='violet'
                                    icon='HeroEye'
                                    onClick={() => {
                                        navigate(`/registros/detalle-item-empresa/${item.item}`);
                                    }}></Button>
                                <Button
                                    variant='solid'
                                    color='red'
                                    icon='HeroTrash'
                                    onClick={async () => {
                                        try {
                                            const response = await ApiService.fetchData({
                                                url: `/api/compras/${detalleCompra?.id}/items-compras/${item.id}/`,
                                                method: 'delete',
                                            });
                                            if (response.status === 204) {
                                                dispatch(
                                                    listaItemsCompraThunk({
                                                        id_compra: detalleCompra?.id,
                                                    }),
                                                );
                                                toast.success('Item eliminado', {
                                                    autoClose: 1000,
                                                });
                                            }
                                        } catch (error: any) {
                                            toast.error(
                                                error.response.data || 'Error al eliminar el item',
                                                { toastId: 'Error al eliminar el item' },
                                            );
                                        }
                                    }}
                                />
                            </>
                        ))}
                </div>
            </div>
        </>
    );
}

function TablaItemsCompra() {
    const dispatch = useAppDispatch();
    const { id } = useParams();
    const { detalleCompra, listaItemsCompra } = useAppSelector((state) => state.bodega);
    const detalleCompraValida = detalleCompra && detalleCompra.id.toString() === (id ?? '');
    const items = detalleCompraValida ? listaItemsCompra : [];

    useEffect(() => {
        if (detalleCompraValida) {
            dispatch(listaItemsCompraThunk({ id_compra: detalleCompra.id }));
        }
    }, [detalleCompraValida, detalleCompra, dispatch]);

    return (
        <Card>
            <CardHeader>
                <CardHeaderChild>
                    <Badge className='text-xl'>Items</Badge>
                </CardHeaderChild>
                <CardHeaderChild>
                    {detalleCompraValida && detalleCompra.estado === '-' && (
                        <CrearItemEnCompra compra={detalleCompra} />
                    )}
                </CardHeaderChild>
            </CardHeader>
            <CardBody className='h-full'>
                <div className='h-full overflow-auto'>
                    <div className='flex h-full flex-col gap-4'>
                        {items.length > 0 ? (
                            <>
                                <div className='grid grid-cols-6 items-center gap-4'>
                                    <div>
                                        <Badge>Nombre</Badge>
                                    </div>
                                    <div>
                                        <Badge>Cantidad</Badge>
                                    </div>
                                    <div>
                                        <Badge>Precio</Badge>
                                    </div>
                                    <div>
                                        <Badge>Devuelto</Badge>
                                    </div>
                                    <div>
                                        <Badge>Usado</Badge>
                                    </div>
                                </div>
                                {items.map((item, index) => (
                                    <ItemEnTabla
                                        detalleCompra={detalleCompra}
                                        item={item}
                                        key={index}
                                    />
                                ))}
                            </>
                        ) : (
                            <div className='rounded-xl border border-blue-500 p-4'>Sin Items</div>
                        )}
                    </div>
                </div>
            </CardBody>
        </Card>
    );
}

export default TablaItemsCompra;
