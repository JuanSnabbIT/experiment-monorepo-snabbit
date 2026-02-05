import Input from '@/components/form/Input';
import Textarea from '@/components/form/Textarea';
import Validation from '@/components/form/Validation';
import Icon from '@/components/icon/Icon';
import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, { SubheaderLeft, SubheaderRight } from '@/components/layouts/Subheader/Subheader';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import Modal, {
    ModalBody,
    ModalFooter,
    ModalFooterChild,
    ModalHeader,
} from '@/components/ui/Modal';
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import Tooltip from '@/components/ui/Tooltip';
import AnimacionDeInputModoMovil from '@/components/utils/AnimacionDeIntputModoMovil';
import { ICompra, IItemEnCompra } from '@/interface/bodega.interface';
import { IItemRendicion } from '@/interface/rendicion.interface';
import ApiService from '@/services/ApiService';
import {
    useDeleteRendicionItemMutation,
    useGetRendicionItemsQuery,
    useGetRendicionQuery,
    useLazyGetCompraItemsQuery,
    useUpdateRendicionMutation,
} from '@/store';
import TableCardFooterTemplateV2 from '@/templates/Table/TableFooterTemplateV2';
import { getErrorMessage } from '@/utils/errorHandlers';
import { confirmAlert } from '@/utils/sweetAlert';
import {
    createColumnHelper,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    SortingState,
    useReactTable,
} from '@tanstack/react-table';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { useFormik } from 'formik';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import CambiarEstadoRendicion from '../modals/CambiarEstadoRendicion';
import CrearItemRendicion from '../modals/CrearItemRendicion';

const columnHelper = createColumnHelper<IItemRendicion>();

const formatCurrency = (value?: number | null) => `$${(value ?? 0).toLocaleString('es-CL')}`;

const DetalleRendicion = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const rendicionId = id ?? '';
    const { data: detalleRendicion } = useGetRendicionQuery(rendicionId, { skip: !id });
    const { data: listaItemsRendicion = [] } = useGetRendicionItemsQuery(rendicionId, {
        skip: !id,
    });
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState<string>('');
    const [editando, setEditando] = useState<boolean>(false);
    const [updateRendicion] = useUpdateRendicionMutation();
    const [deleteRendicionItem] = useDeleteRendicionItemMutation();
    const [getCompraItems] = useLazyGetCompraItemsQuery();

    // Modal State
    const [isOpenDetail, setIsOpenDetail] = useState(false);
    const [selectedCompra, setSelectedCompra] = useState<ICompra | null>(null);
    const [itemsCompra, setItemsCompra] = useState<IItemEnCompra[]>([]);
    const [cargandoItems, setCargandoItems] = useState(false);

    // Cache for table items
    const [itemsCache, setItemsCache] = useState<Record<number, IItemEnCompra[]>>({});

    const fetchItemsCompra = async (compraId: number) => {
        setCargandoItems(true);
        try {
            const resp = await getCompraItems(compraId).unwrap();
            setItemsCompra(resp || []);
            // Also update cache when we fetch for modal
            setItemsCache((prev) => ({ ...prev, [compraId]: resp || [] }));
        } catch (error: unknown) {
            toast.error(getErrorMessage(error) || 'No se pudieron cargar los items de la compra');
        } finally {
            setCargandoItems(false);
        }
    };

    useEffect(() => {
        if (isOpenDetail && selectedCompra?.id) {
            fetchItemsCompra(selectedCompra.id);
        }
        if (!isOpenDetail) {
            setItemsCompra([]);
        }
    }, [isOpenDetail, selectedCompra]);

    useEffect(() => {
        if (!selectedCompra?.id || !listaItemsRendicion) return;
        const actualizado = listaItemsRendicion.find(
            (item) => item?.detalle_data?.id === selectedCompra.id,
        );
        if (actualizado?.detalle_data) {
            setSelectedCompra(actualizado.detalle_data as ICompra);
        }
    }, [listaItemsRendicion, selectedCompra?.id]);

    // Fetch items for all purchases in the list
    useEffect(() => {
        const fetchAllMissingItems = async () => {
            if (!listaItemsRendicion) return;

            for (const item of listaItemsRendicion) {
                const det = item?.detalle_data;
                if (isObject(det) && 'codigo' in det && typeof det.id === 'number') {
                    // It's a purchase. Check if we have items in cache
                    if (!itemsCache[det.id]) {
                        try {
                            const resp = await getCompraItems(det.id).unwrap();
                            setItemsCache((prev) => ({ ...prev, [det.id]: resp || [] }));
                        } catch (error) {
                        }
                    }
                }
            }
        };
        fetchAllMissingItems();
    }, [listaItemsRendicion, getCompraItems]); // We intentionally do not include itemsCache to avoid loops, only when list changes

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            fecha_rendicion: '',
            observaciones: '',
        },
        onSubmit: async (values) => {
            try {
                if (!detalleRendicion?.id) {
                    toast.error('No se encontró la rendición');
                    return;
                }
                await updateRendicion({
                    id: detalleRendicion.id,
                    data: {
                        fecha_rendicion: values.fecha_rendicion,
                        observaciones: values.observaciones,
                    },
                }).unwrap();
                toast.success('Rendición editada', { autoClose: 1000 });
                formik.resetForm();
                setEditando(false);
            } catch (error: unknown) {
                const mensajesError = getErrorMessage(error);
                toast.error(mensajesError || 'Error al editar la rendición', {
                    toastId: 'Error al editar la rendición',
                });
            }
        },
    });

    // const formikDetalle = useFormik({
    //     enableReinitialize: true,
    //     initialValues: {
    //         detalle: "",
    //         categoria: "",
    //         cantidad: 0,
    //         monto_unitario: 0,
    //         fecha_gasto: ""
    //     },
    //     onSubmit: async (values) => {
    //         console.log(values)
    //     }
    // })

    const isObject = (v: any): v is Record<string, any> => typeof v === 'object' && v !== null;

    const flattenedData = useMemo(() => {
        const rows: any[] = [];
        (listaItemsRendicion || []).forEach((item) => {
            const det = item?.detalle_data;
            if (isObject(det) && 'codigo' in det && Array.isArray(det.items)) {
                // push a parent header row
                rows.push({
                    id: `compra-${det.id}`,
                    is_parent: true,
                    detalle_data: det,
                });
                // then push each item as its own row (child)
                // Use fetched items from cache instead of the ID list
                const childItems = itemsCache[det.id] || [];

                if (childItems.length === 0 && det.items.length > 0) {
                    // We verify if we are verifying that we have ids but no cache yet
                    // Maybe show a skeleton or just wait?
                    // For now we just don't render them until loaded to avoid "Sin nombre" errors
                }

                childItems.forEach((sub: any, idx: number) => {
                    rows.push({
                        id: `${det.id}-${idx}`,
                        parent_compra_id: det.id,
                        is_subitem: true,
                        detalle_data: sub,
                    });
                });
            } else {
                rows.push(item);
            }
        });
        return rows;
    }, [listaItemsRendicion, itemsCache]);

    const columns = [
        columnHelper.accessor('id', {
            cell: (info) => {
                const original = info.row.original as any;
                if (original.is_parent) return null; // Parent row doesn't show in this column
                // For sub-items, show the item's ID from detalle_data
                if (original.is_subitem) {
                    return <div>{original.detalle_data?.id || '-'}</div>;
                }
                return info.getValue();
            },
            header: 'N°',
            size: 20,
        }),
        columnHelper.display({
            id: 'detalle',
            cell: (info) => {
                const original = info.row.original as any;
                const detObj = original.detalle_data;
                const indent = original.is_subitem ? 24 : 0;

                // Determine text to show
                let text = 'Sin detalle';
                if (original.is_subitem) {
                    // For sub-items, detObj IS the item itself
                    text = detObj?.nombre_item || 'Sin nombre';
                } else if (detObj && 'codigo' in detObj) {
                    // For parent compra rows (shouldn't render here)
                    text = detObj.codigo;
                } else if (detObj && detObj.detalle) {
                    // For regular expense items
                    text = detObj.detalle;
                }

                return (
                    <div style={{ paddingLeft: `${indent}px` }}>
                        <div>{text}</div>
                    </div>
                );
            },
            header: 'Detalle',
        }),
        columnHelper.display({
            id: 'categoria',
            cell: (info) => {
                const original = info.row.original as any;
                const detObj = original.detalle_data;
                
                if (original.is_subitem) {
                    // Para sub-items (items de compra), mostrar la categoría del item
                    return <div>{detObj?.nombre_categoria || '-'}</div>;
                }
                
                if (detObj && 'codigo' in detObj) {
                    // Para compras padre
                    return <div>Compra</div>;
                }
                
                // Para gastos regulares
                return <div>{detObj?.nombre_categoria || '-'}</div>;
            },
            header: 'Categoria',
        }),
        columnHelper.display({
            id: 'cantidad',
            cell: (info) => {
                const original = info.row.original as any;
                const detObj = original.detalle_data;

                if (original.is_subitem) {
                    // For sub-items, detObj IS the item
                    return <div>{detObj?.cantidad ?? '-'}</div>;
                }

                if (detObj && 'codigo' in detObj) {
                    // For parent compra rows (shouldn't render here)
                    return <div>{`${(detObj.items || []).length} Items`}</div>;
                }
                // For regular expense items
                return <div>{detObj?.cantidad ?? '-'}</div>;
            },
            header: 'Cantidad',
        }),
        columnHelper.display({
            id: 'monto_unitario',
            cell: (info) => {
                const original = info.row.original as any;
                const detObj = original.detalle_data;

                if (original.is_subitem) {
                    // For sub-items, use 'precio' property
                    const precio = detObj?.precio;
                    if (precio === undefined || precio === null) return <div>-</div>;
                    return <div>${precio.toLocaleString('es-CL')}</div>;
                }

                // For parent compra or regular items
                if (detObj && 'codigo' in detObj) {
                    return <div>-</div>;
                }
                const monto = detObj?.monto_unitario;
                if (monto === undefined || monto === null) return <div>-</div>;
                return <div>${monto.toLocaleString('es-CL')}</div>;
            },
            header: 'Monto Unitario',
        }),
        columnHelper.display({
            id: 'Monto Total',
            cell: (info) => {
                const original = info.row.original as any;
                const det = original.detalle_data;
                const detObj = typeof det === 'object' && det !== null ? det : null;

                if (original.is_subitem) {
                    // subitem detObj is the item object.
                    const precio = (detObj as any)?.precio || 0;
                    const cantidad = (detObj as any)?.cantidad || 0;
                    if (!precio && !cantidad) return <div>-</div>;
                    return <div>$ {(precio * cantidad).toLocaleString('es-CL')}</div>;
                }

                if (detObj && 'codigo' in detObj) {
                    return <div>$ {(detObj.total_compra || 0).toLocaleString('es-CL')}</div>;
                }

                const total = detObj?.monto_total;
                if (total === undefined || total === null) return <div>-</div>;
                return <div>$ {total.toLocaleString('es-CL')}</div>;
            },
            header: 'Monto Total',
        }),
        columnHelper.display({
            id: 'fecha_gasto',
            cell: (info) => {
                const original = info.row.original as any;
                const detObj = original.detalle_data;

                // For sub-items, use the parent purchase's fecha_creacion
                if (original.is_subitem && original.parent_compra_id) {
                    // Find the parent purchase in listaItemsRendicion
                    const parentItem = listaItemsRendicion?.find(
                        (item: any) => item?.detalle_data?.id === original.parent_compra_id,
                    );
                    const parentCompra = parentItem?.detalle_data;
                    if (parentCompra?.fecha_creacion) {
                        return <div>{dayjs(parentCompra.fecha_creacion).format('DD/MM/YYYY')}</div>;
                    }
                    return <div>-</div>;
                }

                // For regular expense items: fecha_gasto is in detalle_data (IDetalleGasto)
                const fecha = (detObj as any)?.fecha_gasto;
                if (!fecha) return <div>-</div>;
                return <div>{dayjs(fecha).format('DD/MM/YYYY')}</div>;
            },
            header: 'Fecha del Gasto',
        }),
        columnHelper.display({
            id: 'acciones',
            cell: (info) => {
                const original = info.row.original as any;
                // Logic for parent/subitem actions
                if (original.is_parent) return null; // Parent handled in row render

                // For subitems, we do NOT want "Ver Compra" button.
                // For non-subitems (regular expenses), we might show delete or other actions.
                if (original.is_subitem) return null;

                return (
                    <div className='flex justify-end gap-2'>
                        {!original.is_subitem && !original.is_parent && (
                            <Button
                                variant='solid'
                                color='red'
                                icon='HeroTrash'
                                onClick={async () => {
                                    if (!detalleRendicion?.id) return;
                                    const isConfirmed = await confirmAlert({
                                        title: '¿Eliminar item?',
                                        text: 'Esta acción no se puede deshacer',
                                        icon: 'warning',
                                        confirmText: 'Eliminar',
                                    });
                                    if (!isConfirmed) return;
                                    try {
                                        await deleteRendicionItem({
                                            rendicionId: detalleRendicion.id,
                                            itemId: info.row.original.id,
                                        }).unwrap();
                                        toast.success('Item eliminado', { autoClose: 1000 });
                                    } catch (error: unknown) {
                                        toast.error(
                                            getErrorMessage(error) ||
                                                'Error al eliminar el item',
                                        );
                                    }
                                }}
                            />
                        )}
                    </div>
                );
            },
            header: '',
        }),
    ];

    const table = useReactTable({
        data: flattenedData,
        columns: columns,
        state: {
            sorting: sorting,
            globalFilter: globalFilter,
        },
        onSortingChange: setSorting,
        enableGlobalFilter: true,
        onGlobalFilterChange: setGlobalFilter,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    useEffect(() => {
        if (detalleRendicion) {
            formik.setFieldValue('fecha_rendicion', detalleRendicion.fecha_rendicion);
            formik.setFieldValue('observaciones', detalleRendicion.observaciones);
        }
    }, [detalleRendicion]);

    return (
        <PageWrapper isProtectedRoute={true} name='Detalle Rendición' title='Detalle Rendición'>
            <Subheader>
                <SubheaderLeft>{null}</SubheaderLeft>
                <SubheaderRight>
                    <div className='flex gap-2'>
                        {detalleRendicion?.orden_trabajo && (
                            <Tooltip text='Ver Orden de Trabajo'>
                                <Button
                                    variant='solid'
                                    color='violet'
                                    icon='HeroEye'
                                    onClick={() =>
                                        navigate(
                                            `/orden-trabajo/detalle-orden-trabajo/${detalleRendicion.orden_trabajo}`,
                                        )
                                    }
                                />
                            </Tooltip>
                        )}
                        {detalleRendicion &&
                            detalleRendicion.estado != '0' &&
                            detalleRendicion.estado != '3' && (
                                <Tooltip text='Descargar PDF'>
                                    <Button
                                        variant='solid'
                                        color='red'
                                        icon='HeroDocumentArrowDown'
                                        onClick={async () => {
                                            try {
                                                const response =
                                                    await ApiService.fetchData<BlobPart>({
                                                        url: `/api/rendiciones/${detalleRendicion.id}/descargar-pdf`,
                                                        method: 'get',
                                                        headers: {
                                                            'Content-Type': 'application/pdf',
                                                        },
                                                    });
                                                const url = window.URL.createObjectURL(
                                                    new Blob([response.data]),
                                                );
                                                const a = document.createElement('a');
                                                a.href = url;
                                                a.download = `rendicion_${id}.pdf`;
                                                document.body.appendChild(a);
                                                a.click();
                                                a.remove();
                                                window.URL.revokeObjectURL(url);
                                            } catch (error: any) {
                                                toast.error(
                                                    error.response.data ||
                                                        'Error al descargar el pdf',
                                                    {
                                                        toastId: 'Error al descargar el pdf',
                                                    },
                                                );
                                            }
                                        }}
                                    />
                                </Tooltip>
                            )}
                        <CambiarEstadoRendicion />
                    </div>
                </SubheaderRight>
            </Subheader>
            <Container className='h-full w-full'>
                <div className='flex flex-col gap-4'>
                    <Card>
                        <CardHeader>
                            <CardHeaderChild>
                                <Badge className='text-xl'>Datos</Badge>
                            </CardHeaderChild>
                            <CardHeaderChild>
                                {detalleRendicion && detalleRendicion.estado === '0' ? (
                                    <div className='flex items-center justify-end'>
                                        {editando ? (
                                            <div className='flex gap-2'>
                                                <Tooltip text='Guardar Cambios'>
                                                    <Button
                                                        variant='solid'
                                                        icon='HeroCheck'
                                                        onClick={() => {
                                                            formik.handleSubmit();
                                                        }}
                                                    />
                                                </Tooltip>
                                                <Tooltip text='Cancelar'>
                                                    <Button
                                                        color='red'
                                                        variant='solid'
                                                        onClick={() => {
                                                            setEditando(false);
                                                        }}
                                                        icon='HeroXMark'
                                                    />
                                                </Tooltip>
                                            </div>
                                        ) : (
                                            <Tooltip text='Editar'>
                                                <Button
                                                    variant='solid'
                                                    icon='HeroPencil'
                                                    onClick={() => {
                                                        setEditando(true);
                                                    }}
                                                />
                                            </Tooltip>
                                        )}
                                    </div>
                                ) : (
                                    <Badge color='zinc'>
                                        No se puede editar en estado {detalleRendicion?.estado_label}
                                    </Badge>
                                )}
                            </CardHeaderChild>
                        </CardHeader>
                        <CardBody>
                            <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                                {editando ? (
                                    <>
                                        <div>
                                            <Badge className='text-zinc-700 dark:text-zinc-300'>Fecha de la Rendición</Badge>
                                            <Validation
                                                isValid={formik.isValid}
                                                isTouched={formik.touched.fecha_rendicion}
                                                invalidFeedback={formik.errors.fecha_rendicion}>
                                                <Input
                                                    name='fecha_rendicion'
                                                    id='fecha_rendicion'
                                                    type='date'
                                                    onBlur={formik.handleBlur}
                                                    onChange={formik.handleChange}
                                                    value={formik.values.fecha_rendicion}
                                                />
                                            </Validation>
                                        </div>
                                        <div>
                                            <Badge className='text-zinc-700 dark:text-zinc-300'>Observaciones</Badge>
                                            <Validation
                                                isValid={formik.isValid}
                                                isTouched={formik.touched.observaciones}
                                                invalidFeedback={formik.errors.observaciones}>
                                                <Textarea
                                                    name='observaciones'
                                                    id='observaciones'
                                                    placeholder='Observaciones'
                                                    onBlur={formik.handleBlur}
                                                    onChange={formik.handleChange}
                                                    value={formik.values.observaciones}
                                                />
                                            </Validation>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className='w-full'>
                                            <Badge>Fecha de la Rendición</Badge>
                                            <div className='ml-4'>
                                                {detalleRendicion?.fecha_rendicion
                                                    ? dayjs(
                                                          detalleRendicion.fecha_rendicion,
                                                      ).format('DD/MM/YYYY')
                                                    : ''}
                                            </div>
                                        </div>
                                        <div className='w-full'>
                                            <Badge>Observaciones</Badge>
                                            <div className='ml-4'>
                                                {detalleRendicion?.observaciones ||
                                                    'Sin Observaciones'}
                                            </div>
                                        </div>
                                        <div className='w-full'>
                                            <Badge>Nombre del Usuario</Badge>
                                            <div className='ml-4'>
                                                {detalleRendicion?.datos_usuario.nombre_usuario}
                                            </div>
                                        </div>
                                        <div className='w-full'>
                                            <Badge>Rut del Usuario</Badge>
                                            <div className='ml-4'>
                                                {detalleRendicion?.datos_usuario.papeleta.rut ||
                                                    'Sin Rut'}
                                            </div>
                                        </div>
                                        <div className='w-full'>
                                            <Badge>Estado</Badge>
                                            <div className='ml-4'>
                                                {detalleRendicion?.estado_label}
                                            </div>
                                        </div>
                                        <div className='w-full'>
                                            <Badge>Orden de Trabajo</Badge>
                                            <div className='ml-4 flex items-center gap-2'>
                                                <span className='font-semibold text-slate-700'>
                                                    {detalleRendicion?.orden_trabajo
                                                        ? `OT #${detalleRendicion.orden_trabajo}`
                                                        : 'Sin OT asociada'}
                                                </span>
                                                {detalleRendicion?.orden_trabajo && (
                                                    <Tooltip text='Ir al detalle de la OT'>
                                                        <Button
                                                            variant='default'
                                                            size='sm'
                                                            icon='HeroArrowTopRightOnSquare'
                                                            onClick={() =>
                                                                navigate(
                                                                    `/orden-trabajo/detalle-orden-trabajo/${detalleRendicion.orden_trabajo}`,
                                                                )
                                                            }
                                                        />
                                                    </Tooltip>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </CardBody>
                    </Card>

                    {/* FASE 2: Card de Revisión (Aprobación/Rechazo) */}
                    {(detalleRendicion?.estado === '2' || detalleRendicion?.estado === '3' || detalleRendicion?.estado === '4') && (
                        <Card>
                            <CardHeader>
                                <CardHeaderChild>
                                    <Badge className='text-xl'>
                                        {detalleRendicion?.estado === '3' ? 'Información de Rechazo' : 'Información de Revisión'}
                                    </Badge>
                                </CardHeaderChild>
                            </CardHeader>
                            <CardBody>
                                <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                                    {/* Revisado por - aplica para aprobación (2, 4) y rechazo (3) */}
                                    <div className='w-full'>
                                        <Badge>{detalleRendicion?.estado === '3' ? 'Rechazada Por' : 'Aprobada Por'}</Badge>
                                        <div className='ml-4'>
                                            {detalleRendicion?.revisado_por_data?.nombre_usuario || 'No disponible'}
                                        </div>
                                    </div>

                                    <div className='w-full'>
                                        <Badge>{detalleRendicion?.estado === '3' ? 'Fecha de Rechazo' : 'Fecha de Aprobación'}</Badge>
                                        <div className='ml-4'>
                                            {detalleRendicion?.fecha_revision
                                                ? dayjs(detalleRendicion.fecha_revision).format('DD/MM/YYYY HH:mm')
                                                : ''}
                                        </div>
                                    </div>

                                    {/* Motivo de rechazo - solo si estado = 3 */}
                                    {detalleRendicion?.estado === '3' && (
                                        <div className='w-full md:col-span-2'>
                                            <Badge>Motivo de Rechazo</Badge>
                                            <div className='ml-4 rounded border border-red-900/30 bg-red-950/20 p-3 text-sm text-red-400 dark:border-red-900/50 dark:text-red-300'>
                                                {detalleRendicion?.motivo_rechazo}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </CardBody>
                        </Card>
                    )}

                    <Card>
                        <CardHeader>
                            <CardHeaderChild>
                                <Badge className='text-xl'>Items de la Rendición</Badge>
                            </CardHeaderChild>
                            <CardHeaderChild>
                                <div className='flex items-center justify-between'>
                                    <AnimacionDeInputModoMovil
                                        globalFilter={globalFilter}
                                        setGlobalFilter={setGlobalFilter}
                                        anchoInput={200}>
                                        {detalleRendicion && detalleRendicion.estado === '0' && (
                                            <CrearItemRendicion />
                                        )}
                                    </AnimacionDeInputModoMovil>
                                </div>
                            </CardHeaderChild>
                        </CardHeader>
                        <CardBody className='z-0'>
                            <div className='overflow-auto'>
                                <Table className='min-w-[800px] table-fixed'>
                                    <THead>
                                        {table.getHeaderGroups().map((headerGroup) => (
                                            <Tr key={headerGroup.id}>
                                                {headerGroup.headers.map((header) => (
                                                    <Th
                                                        key={header.id}
                                                        style={{ width: header.column.getSize() }}
                                                        isColumnBorder={false}
                                                        className='text-left'>
                                                        {header.isPlaceholder ? null : (
                                                            <div
                                                                key={header.id}
                                                                aria-hidden='true'
                                                                {...{
                                                                    className:
                                                                        header.column.getCanSort()
                                                                            ? 'cursor-pointer select-none flex items-center'
                                                                            : '',
                                                                    onClick:
                                                                        header.column.getToggleSortingHandler(),
                                                                }}>
                                                                {flexRender(
                                                                    header.column.columnDef.header,
                                                                    header.getContext(),
                                                                )}
                                                                {{
                                                                    asc: (
                                                                        <Icon
                                                                            icon='HeroChevronUp'
                                                                            className='ltr:ml-1.5 rtl:mr-1.5'
                                                                        />
                                                                    ),
                                                                    desc: (
                                                                        <Icon
                                                                            icon='HeroChevronDown'
                                                                            className='ltr:ml-1.5 rtl:mr-1.5'
                                                                        />
                                                                    ),
                                                                }[
                                                                    header.column.getIsSorted() as string
                                                                ] ?? null}
                                                            </div>
                                                        )}
                                                    </Th>
                                                ))}
                                            </Tr>
                                        ))}
                                    </THead>
                                    <TBody>
                                        {table.getRowModel().rows.map((row) => {
                                            const original = row.original as any;
                                            if (original.is_parent) {
                                                const compra = original.detalle_data;
                                                return (
                                                    <Tr
                                                        key={row.id}
                                                        className='border-l-4 border-emerald-500 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30'>
                                                        <Td
                                                            colSpan={
                                                                table.getVisibleFlatColumns().length
                                                            }
                                                            className='px-4 py-3'>
                                                            <div className='flex flex-wrap items-center justify-between gap-4'>
                                                                <div className='flex flex-wrap items-center gap-4'>
                                                                    <div className='flex items-center gap-2'>
                                                                        <Icon
                                                                            icon='HeroShoppingCart'
                                                                            className='text-emerald-600 dark:text-emerald-400'
                                                                            size='text-lg'
                                                                        />
                                                                        <span className='text-base font-bold text-slate-800 dark:text-zinc-100'>
                                                                            Compra{' '}
                                                                            {compra.codigo ||
                                                                                `#${compra.id}`}
                                                                        </span>
                                                                    </div>

                                                                    <div className='h-6 w-px bg-slate-300' />

                                                                    <div className='flex flex-wrap items-center gap-4 text-xs'>
                                                                        <div className='flex flex-col'>
                                                                            <span className='text-[10px] uppercase tracking-wide text-slate-500'>
                                                                                Items
                                                                            </span>
                                                                            <span className='text-sm font-bold text-slate-700'>
                                                                                {
                                                                                    (
                                                                                        compra.items ||
                                                                                        []
                                                                                    ).length
                                                                                }
                                                                            </span>
                                                                        </div>
                                                                        <div className='flex flex-col'>
                                                                            <span className='text-[10px] uppercase tracking-wide text-slate-500'>
                                                                                Total
                                                                            </span>
                                                                            <span className='text-sm font-bold text-slate-700'>
                                                                                $
                                                                                {(
                                                                                    compra.total_compra ||
                                                                                    0
                                                                                ).toLocaleString(
                                                                                    'es-CL',
                                                                                )}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className='flex items-center gap-2'>
                                                                    <Tooltip text='Ver detalles de la compra'>
                                                                        <Button
                                                                            variant='solid'
                                                                            size='sm'
                                                                            color='violet'
                                                                            icon='HeroEye'
                                                                            onClick={() => {
                                                                                setSelectedCompra(
                                                                                    compra as ICompra,
                                                                                );
                                                                                setIsOpenDetail(
                                                                                    true,
                                                                                );
                                                                            }}>
                                                                            Detalle
                                                                        </Button>
                                                                    </Tooltip>
                                                                </div>
                                                            </div>
                                                        </Td>
                                                    </Tr>
                                                );
                                            }

                                            return (
                                                <Tr
                                                    key={row.id}
                                                    className={
                                                        original.is_subitem
                                                            ? 'border-l-2 border-blue-300 bg-blue-50/60 hover:bg-blue-100/70'
                                                            : 'hover:bg-gray-50 dark:hover:bg-zinc-800'
                                                    }>
                                                    {row.getVisibleCells().map((cell) => (
                                                        <Td
                                                            key={cell.id}
                                                            className={
                                                                original.is_subitem ? 'py-2' : ''
                                                            }>
                                                            {flexRender(
                                                                cell.column.columnDef.cell,
                                                                cell.getContext(),
                                                            )}
                                                        </Td>
                                                    ))}
                                                </Tr>
                                            );
                                        })}
                                    </TBody>
                                </Table>
                                <div className='mt-2 min-w-[800px]'>
                                    <TableCardFooterTemplateV2 table={table} />
                                </div>
                            </div>
                        </CardBody>
                        <div className='px-4 pb-4'>
                            <div className='flex justify-end gap-6 border-t border-slate-200 pt-4'>
                                <div className='text-right'>
                                    <div className='text-[11px] uppercase tracking-wide text-slate-400'>
                                        Total rendido
                                    </div>
                                    <div className='text-lg font-semibold text-slate-800'>
                                        {formatCurrency(detalleRendicion?.total)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            </Container>

            {/* Modal de Detalle de Compra - Copied from ComprasEnOT */}
            <Modal isOpen={isOpenDetail} setIsOpen={setIsOpenDetail}>
                <ModalHeader className='flex items-center justify-between'>
                    <Badge>Detalle Compra</Badge>
                    {selectedCompra && (
                        <Tooltip text='Ver detalle completo de la compra'>
                            <Button
                                color='blue'
                                variant='solid'
                                size='sm'
                                icon='HeroArrowTopRightOnSquare'
                                onClick={() => {
                                    navigate(`/compras/detalle-compra/${selectedCompra.id}`);
                                    setIsOpenDetail(false);
                                }}>
                                Ir a
                            </Button>
                        </Tooltip>
                    )}
                </ModalHeader>
                <ModalBody>
                    {selectedCompra ? (
                        <>
                            <div className='grid grid-cols-2 gap-4'>
                                <div>
                                    <Badge>Código</Badge>
                                    <div className='ml-4'>{selectedCompra.codigo}</div>
                                </div>
                                <div>
                                    <Badge>Estado</Badge>
                                    <div className='ml-4'>
                                        <Button
                                            size='sm'
                                            variant='solid'
                                            color='blue'
                                            isDisable={true}>
                                            {selectedCompra.estado_label || selectedCompra.estado}
                                        </Button>
                                    </div>
                                </div>
                                <div>
                                    <Badge>Fecha Compra</Badge>
                                    <div className='ml-4'>
                                        {selectedCompra.fecha_compra ? (
                                            dayjs(selectedCompra.fecha_compra)
                                                .locale('es')
                                                .format('DD/MM/YYYY')
                                        ) : (
                                            <span className='italic text-gray-400 dark:text-gray-300'>Sin fecha</span>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <Badge>Total</Badge>
                                    <div className='ml-4'>
                                        {selectedCompra.total_compra
                                            ? `$${selectedCompra.total_compra.toLocaleString('es-CL')}`
                                            : '$0'}
                                    </div>
                                </div>
                                <div>
                                    <Badge>Comprador</Badge>
                                    <div className='ml-4'>
                                        {selectedCompra.nombre_creado_por || '-'}
                                    </div>
                                </div>
                                <div>
                                    <Badge>Descripción</Badge>
                                    <div className='ml-4'>
                                        {selectedCompra.observaciones || '-'}
                                    </div>
                                </div>
                            </div>
                            <div className='col-span-2 mt-4'>
                                <div className='mb-3 flex items-center justify-between'>
                                    <Badge className='text-base'>Items de la Compra</Badge>
                                    <span className='text-xs text-gray-500 dark:text-gray-400 dark:text-gray-300'>
                                        {itemsCompra.length} item
                                        {itemsCompra.length !== 1 ? 's' : ''}
                                    </span>
                                </div>
                                <div className='mt-2 max-h-64 overflow-auto rounded-lg border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800'>
                                    {cargandoItems ? (
                                        <div className='flex items-center justify-center py-8'>
                                            <div className='text-sm text-gray-500 dark:text-gray-400 dark:text-gray-300'>
                                                Cargando items...
                                            </div>
                                        </div>
                                    ) : itemsCompra.length > 0 ? (
                                        <div className='overflow-x-auto'>
                                            <table className='min-w-full divide-y divide-gray-200 dark:divide-zinc-700'>
                                                <thead className='bg-gray-100 dark:bg-zinc-800'>
                                                    <tr>
                                                        <th className='px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300'>
                                                            Nombre
                                                        </th>
                                                        <th className='px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300'>
                                                            Cantidad
                                                        </th>
                                                        <th className='px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300'>
                                                            Precio Unitario
                                                        </th>
                                                        <th className='px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300'>
                                                            Devuelto
                                                        </th>
                                                        <th className='px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300'>
                                                            Usado
                                                        </th>
                                                        <th className='px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300'>
                                                            Subtotal
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className='divide-y divide-gray-200 dark:divide-zinc-700 bg-white dark:bg-zinc-900'>
                                                    {itemsCompra.map((item, idx) => (
                                                        <tr
                                                            key={item.id}
                                                            className={
                                                                idx % 2 === 0
                                                                    ? 'bg-white dark:bg-zinc-900'
                                                                    : 'bg-gray-50 dark:bg-zinc-800'
                                                            }>
                                                            <td className='px-4 py-3 text-sm text-gray-900 dark:text-gray-100'>
                                                                {item.nombre_item}
                                                            </td>
                                                            <td className='px-4 py-3 text-sm text-gray-900 dark:text-gray-100'>
                                                                {item.cantidad}
                                                            </td>
                                                            <td className='px-4 py-3 text-sm text-gray-900 dark:text-gray-100'>
                                                                $
                                                                {item.precio.toLocaleString(
                                                                    'es-CL',
                                                                )}
                                                            </td>
                                                            <td className='px-4 py-3 text-sm text-gray-900 dark:text-gray-100'>
                                                                {item.cantidad_devuelta ?? 0}
                                                            </td>
                                                            <td className='px-4 py-3 text-sm text-gray-900 dark:text-gray-100'>
                                                                {item.cantidad_usada ?? 0}
                                                                {item.estado_uso_label
                                                                    ? ` (${item.estado_uso_label})`
                                                                    : ''}
                                                            </td>
                                                            <td className='px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100'>
                                                                $
                                                                {(
                                                                    item.cantidad * item.precio
                                                                ).toLocaleString('es-CL')}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <div className='flex flex-col items-center justify-center py-8'>
                                            <span className='mb-2 text-4xl'>📦</span>
                                            <p className='text-sm font-medium text-gray-600 dark:text-gray-400 dark:text-gray-300'>
                                                No hay items registrados
                                            </p>
                                            <p className='text-xs text-gray-500 dark:text-gray-400 dark:text-gray-300'>
                                                Esta compra no tiene items asociados
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div>No hay detalle seleccionado.</div>
                    )}
                </ModalBody>
                <ModalFooter>
                    <ModalFooterChild />
                    <ModalFooterChild>
                        <Button color='red' onClick={() => setIsOpenDetail(false)}>
                            Cerrar
                        </Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </PageWrapper>
    );
};

export default DetalleRendicion;
