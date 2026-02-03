import Input from '@/components/form/Input';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Textarea from '@/components/form/Textarea';
import Icon from '@/components/icon/Icon';
import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, { SubheaderLeft, SubheaderRight } from '@/components/layouts/Subheader/Subheader';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import Tooltip from '@/components/ui/Tooltip';
import { IItemGuiaSalida, IStockItemEnBodega } from '@/interface/bodega.interface';
import ApiService from '@/services/ApiService';
import { listaUsuariosTodaLaEmpresaThunk, useAppDispatch, useAppSelector } from '@/store';
import {
    useAgregarItemGuiaMutation,
    useComprobarGuiaMutation,
    useDeleteGuiaSalidaMutation,
    useDevolverABodegaMutation,
    useEditarItemGuiaMutation,
    useEliminarItemGuiaMutation,
    useGetDetalleGuiaSalidaQuery,
    useGetItemsGuiaSalidaQuery,
    useGetStockItemsEnBodegaQuery,
    useUpdateGuiaSalidaMutation,
} from '@/store/slices/bodega/guiaSalidaApi';
import TableCardFooterTemplateV2 from '@/templates/Table/TableFooterTemplateV2';
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
import { useFormik } from 'formik';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import { toast } from 'react-toastify';
import * as Yup from 'yup';
import AprobarGuiaSalida from './modals/AprobarGuiaSalida';
import AsignarNumeroDeSerie from './modals/AsignarNumeroDeSerie';
import FirmarEntregarGuia from './modals/FirmarEntregarGuia';
import VolverAPendienteGuiaSalida from './modals/VolverAPendienteGuiaSalida';

const columnHelperItem = createColumnHelper<IItemGuiaSalida>();
const columnHelperStock = createColumnHelper<IStockItemEnBodega>();

function DetalleGuiaSalidaBodega() {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { id } = useParams();

    // RTK Query Hooks
    const { data: detalleGuiaSalidaBodega, isLoading: isLoadingDetalle, refetch: refetchDetalleGuia } =
        useGetDetalleGuiaSalidaQuery(id!, { skip: !id });
    const { data: listaItemsEnGuiaSalidaBodega = [], isLoading: isLoadingItems } =
        useGetItemsGuiaSalidaQuery(id!, { skip: !id });
    const { data: listaStockItemsEnBodega = [], isLoading: isLoadingStock } =
        useGetStockItemsEnBodegaQuery(detalleGuiaSalidaBodega?.bodega!, {
            skip: !detalleGuiaSalidaBodega?.bodega || detalleGuiaSalidaBodega?.estado !== 'P',
        });

    // Mutations
    const [updateGuia] = useUpdateGuiaSalidaMutation();
    const [agregarItem] = useAgregarItemGuiaMutation();
    const [editarItem] = useEditarItemGuiaMutation();
    const [eliminarItem] = useEliminarItemGuiaMutation();
    const [deleteGuia] = useDeleteGuiaSalidaMutation();
    const [comprobarGuiaMutation] = useComprobarGuiaMutation();
    const [devolverABodegaMutation] = useDevolverABodegaMutation();

    const { listaUsuariosTodaLaEmpresa } = useAppSelector((state) => state.empresa);
    const { personalizacionUsuario } = useAppSelector((state) => state.auth);
    const [isEditting, setIsEditting] = useState<boolean>(false);
    const [stockSorting, setStockSorting] = useState<SortingState>([]);
    const [stockGlobalFilter, setStockGlobalFilter] = useState<string>('');
    const [itemsSorting, setItemsSorting] = useState<SortingState>([]);
    const [itemsGlobalFilter, setItemsGlobalFilter] = useState<string>('');
    const [isCreating, setIsCreating] = useState<boolean>(false);
    const [itemStockSelected, setItemStockSelected] = useState<IStockItemEnBodega | undefined>();
    const [itemRebajaSelected, setItemRebajaSelected] = useState<IItemGuiaSalida | undefined>();
    const [isOpenNumero, setIsOpenNumero] = useState<boolean>(false);
    const [completando, setCompletando] = useState<boolean>(false);

    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [isOpenFirma, setIsOpenFirma] = useState<boolean>(false);

    const isPendiente = detalleGuiaSalidaBodega?.estado === 'P';

    useEffect(() => {
        if (!id) navigate('/bodega/guias-salida-bodega');
    }, [id]);

    useEffect(() => {
        if (isEditting && personalizacionUsuario?.empresa) {
            dispatch(
                listaUsuariosTodaLaEmpresaThunk({ id_empresa: personalizacionUsuario.empresa }),
            );
        }
    }, [dispatch, isEditting, personalizacionUsuario?.empresa]);

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            motivo: '',
            recibido_por: '',
        },
        validationSchema: Yup.object().shape({
            motivo: Yup.string().notRequired().nullable(),
            recibido_por: Yup.string().notRequired().nullable(),
        }),
        onSubmit: async (values) => {
            try {
                const payload: any = {
                    motivo: values.motivo,
                };

                if (values.recibido_por) {
                    payload.recibido_por = Number(values.recibido_por);
                }

                await updateGuia({ id: id!, ...payload }).unwrap();
                setIsEditting(false);
                toast.success('Guia de salida editada', { autoClose: 1000 });
            } catch (error: any) {
                toast.error(error.data || 'Error al editar la guia de salida', {
                    toastId: 'Error al editar la guia de salida',
                });
            }
        },
    });

    useEffect(() => {
        if (isEditting && detalleGuiaSalidaBodega) {
            formik.setFieldValue('motivo', detalleGuiaSalidaBodega.motivo);
            formik.setFieldValue(
                'recibido_por',
                detalleGuiaSalidaBodega.recibido_por
                    ? detalleGuiaSalidaBodega.recibido_por.toString()
                    : '',
            );
        }
    }, [isEditting, detalleGuiaSalidaBodega]);

    useEffect(() => {
        if (isEditting && personalizacionUsuario?.empresa) {
            dispatch(
                listaUsuariosTodaLaEmpresaThunk({ id_empresa: personalizacionUsuario.empresa }),
            );
        }
    }, [dispatch, isEditting, personalizacionUsuario?.empresa]);

    const recibidoPorOptions = listaUsuariosTodaLaEmpresa.map((user) => ({
        value: user.id.toString(),
        label: user.nombre_usuario,
    }));

    const recibidoPorSeleccionado = recibidoPorOptions.find(
        (option) => option.value === formik.values.recibido_por,
    );

    const columnsReadOnly = [
        columnHelperItem.accessor('datos_stock.datos_item.nombre', {
            cell: (info) => info.getValue(),
            header: 'Item',
        }),
        columnHelperItem.accessor('cantidad_original', {
            cell: (info) => info.getValue(),
            header: 'Cantidad Original',
        }),
        columnHelperItem.accessor('cantidad_rebajada', {
            cell: (info) => info.getValue(),
            header: 'Cantidad Rebajada',
        }),
        columnHelperItem.accessor('cantidad_devuelta', {
            cell: (info) => info.getValue(),
            header: 'Cantidad Devuelta',
        }),
        columnHelperItem.accessor('individualizado', {
            cell: (info) => (
                <div>
                    {info.row.original.individualizado
                        ? info.row.original.numero_serie.serie
                        : 'No'}
                </div>
            ),
            header: 'Serializado',
        }),
    ];

    const tableReadOnly = useReactTable({
        data: listaItemsEnGuiaSalidaBodega,
        columns: columnsReadOnly,
        state: {
            sorting: itemsSorting,
            globalFilter: itemsGlobalFilter,
        },
        onSortingChange: setItemsSorting,
        enableGlobalFilter: true,
        onGlobalFilterChange: setItemsGlobalFilter,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    const columnsStock = [
        columnHelperStock.accessor((row) => row.datos_item?.nombre || 'Sin Nombre', {
            id: 'nombre_item',
            cell: (info) => info.getValue(),
            header: 'Nombre',
        }),
        columnHelperStock.accessor('cantidad', {
            cell: (info) => (
                <div>
                    <Tooltip
                        text={`Cantidad no disponible: ${info.row.original.cantidad_no_disponible}`}>
                        <div>{info.getValue()}</div>
                    </Tooltip>
                </div>
            ),
            header: 'Cantidad',
        }),
        columnHelperStock.accessor(
            (row) => row.datos_item?.datos_categoria?.nombre || 'Sin Categoria',
            {
                id: 'categoria',
                cell: (info) => <div>{info.getValue()}</div>,
                header: 'Categoria',
            },
        ),
        columnHelperStock.accessor(
            (row) => row.datos_item?.datos_fabricante?.nombre || 'Sin Fabricante',
            {
                id: 'fabricante',
                cell: (info) => <div>{info.getValue()}</div>,
                header: 'Fabricante',
            },
        ),
        columnHelperStock.display({
            id: 'acciones',
            cell: (info) => {
                const inputRef = useRef<HTMLInputElement>(null);
                return (
                    <div>
                        {!isCreating && itemStockSelected === info.row.original ? (
                            <div className='flex flex-row gap-4'>
                                <Input
                                    name='cantidad'
                                    type='number'
                                    ref={inputRef}
                                    max={info.row.original.cantidad}
                                    min={0}
                                />
                                <Tooltip text='Cancelar'>
                                    <Button
                                        variant='solid'
                                        color='red'
                                        icon='HeroXMark'
                                        onClick={() => {
                                            if (inputRef.current) {
                                                inputRef.current.valueAsNumber = 0;
                                            }
                                            setItemStockSelected(undefined);
                                        }}></Button>
                                </Tooltip>
                                <Tooltip text='Guardar con Cantidad'>
                                    <Button
                                        variant='solid'
                                        icon='DuoSave'
                                        onClick={async () => {
                                            if (!id) return;
                                            setIsCreating(true);
                                            try {
                                                if (
                                                    inputRef.current &&
                                                    inputRef.current.valueAsNumber > 0
                                                ) {
                                                    await agregarItem({
                                                        id_guia: id,
                                                        stock_item_id: info.row.original.id,
                                                        cantidad_rebajada:
                                                            inputRef.current.valueAsNumber,
                                                    }).unwrap();
                                                    toast.success('Item agregado a la guia', {
                                                        autoClose: 1000,
                                                    });
                                                    setItemStockSelected(undefined);
                                                }
                                            } catch (error: any) {
                                                toast.error(
                                                    error.data?.detail || 'Error al agregar item',
                                                );
                                            }
                                            setIsCreating(false);
                                        }}></Button>
                                </Tooltip>
                                <Tooltip text='Guardar Individualizado'>
                                    <Button
                                        variant='solid'
                                        icon='DuoBox3'
                                        onClick={async () => {
                                            if (!id) return;
                                            setIsCreating(true);
                                            try {
                                                await agregarItem({
                                                    id_guia: id,
                                                    stock_item_id: info.row.original.id,
                                                    cantidad_rebajada: 1,
                                                    individualizado: true,
                                                }).unwrap();
                                                toast.success('Item agregado a la guia', {
                                                    autoClose: 1000,
                                                });
                                                setItemStockSelected(undefined);
                                            } catch (error: any) {
                                                toast.error(
                                                    error.data?.detail || 'Error al agregar item',
                                                );
                                            }
                                            setIsCreating(false);
                                        }}></Button>
                                </Tooltip>
                            </div>
                        ) : (
                            <Button
                                isDisable={isCreating}
                                variant='solid'
                                icon='HeroPlus'
                                rounded='rounded-full'
                                onClick={() => {
                                    setItemStockSelected(info.row.original);
                                }}></Button>
                        )}
                    </div>
                );
            },
            header: '',
        }),
    ];

    const stockTable = useReactTable({
        data: listaStockItemsEnBodega,
        columns: columnsStock,
        state: {
            sorting: stockSorting,
            globalFilter: stockGlobalFilter,
        },
        onSortingChange: setStockSorting,
        enableGlobalFilter: true,
        onGlobalFilterChange: setStockGlobalFilter,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    const columnsItems = [
        columnHelperItem.accessor('id', {
            cell: (info) => (
                <div className='flex flex-col'>
                    <div className='w-full'>{info.row.original.datos_stock.datos_item.nombre}</div>
                    <div className='mt-2 w-full'>
                        <Button
                            size='xs'
                            className='!px-1'
                            icon='DuoBox3'
                            onClick={() => {
                                if (info.row.original.datos_stock.datos_item.fabricante)
                                    navigate(
                                        `/registros/detalle-fabricante/${info.row.original.datos_stock.datos_item.fabricante}`,
                                    );
                            }}>
                            {info.row.original.datos_stock.datos_item.datos_fabricante?.nombre ||
                                'Sin Fabricante'}
                        </Button>
                    </div>
                    <div className='w-full'>
                        <Button
                            size='xs'
                            className='!px-1'
                            icon='DuoAlignJustify'
                            onClick={() => {
                                if (info.row.original.datos_stock.datos_item.categoria)
                                    navigate(
                                        `/registros/detalle-categoria/${info.row.original.datos_stock.datos_item.categoria}`,
                                    );
                            }}>
                            {info.row.original.datos_stock.datos_item.datos_categoria?.nombre ||
                                'Sin Categoria'}
                        </Button>
                    </div>
                </div>
            ),
            header: 'Item',
        }),
        columnHelperItem.accessor('cantidad_rebajada', {
            cell: (info) => {
                const [cantidad, setCantidad] = useState<number>(
                    info.row.original.cantidad_rebajada,
                );
                const [isEdittingCantidad, setIsEdittingCantidad] = useState<boolean>(false);

                return (
                    <div>
                        {isEdittingCantidad ? (
                            <>
                                <Input
                                    name='cantidad_rebajada'
                                    type='number'
                                    value={cantidad}
                                    onChange={(e) => {
                                        setCantidad(parseInt(e.target.value));
                                    }}
                                />
                                <div>
                                    <Tooltip text='Cancelar'>
                                        <Button
                                            className='m-2'
                                            variant='solid'
                                            icon='HeroXMark'
                                            color='red'
                                            onClick={() => {
                                                setIsEdittingCantidad(false);
                                                setCantidad(info.row.original.cantidad_rebajada);
                                            }}></Button>
                                    </Tooltip>
                                    <Tooltip text='Guardar'>
                                        <Button
                                            className='m-2'
                                            variant='solid'
                                            icon='DuoSave'
                                            onClick={async () => {
                                                if (!id) return;
                                                try {
                                                    await editarItem({
                                                        id_guia: id,
                                                        item_id: info.row.original.id,
                                                        nueva_cantidad: cantidad,
                                                    }).unwrap();
                                                    toast.success('Item de la guia editado', {
                                                        autoClose: 1000,
                                                    });
                                                    setIsEdittingCantidad(false);
                                                } catch (error: any) {
                                                    toast.error(
                                                        error.data || 'Error al editar la cantidad',
                                                        { toastId: 'Error al editar la cantidad' },
                                                    );
                                                }
                                            }}
                                        />
                                    </Tooltip>
                                </div>
                            </>
                        ) : (
                            <>
                                <div>{info.getValue()}</div>
                                {!info.row.original.individualizado && (
                                    <Button
                                        className='m-2'
                                        variant='solid'
                                        onClick={() => {
                                            setIsEdittingCantidad(true);
                                        }}>
                                        Editar
                                    </Button>
                                )}
                            </>
                        )}
                    </div>
                );
            },
            header: 'Cantidad',
        }),
        columnHelperItem.accessor('individualizado', {
            cell: (info) => {
                return (
                    <div>
                        {info.row.original.individualizado ? (
                            <div className='flex flex-col gap-2'>
                                {info.row.original.numero_serie.serie
                                    ? info.row.original.numero_serie.serie
                                    : 'Sin Numero'}
                                <div>
                                    <Button
                                        variant='solid'
                                        onClick={() => {
                                            setItemRebajaSelected(info.row.original);
                                            setIsOpenNumero(true);
                                        }}>
                                        Editar
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            'No'
                        )}
                    </div>
                );
            },
            header: 'Serializado',
        }),
        columnHelperItem.display({
            id: 'acciones',
            cell: (info) => (
                <div>
                    <Button
                        className='m-2'
                        variant='solid'
                        color='red'
                        onClick={async () => {
                            if (!id) return;
                            const result = await Swal.fire({
                                title: '¿Eliminar item de la guía?',
                                text: '¿Está seguro(a) de querer eliminar el item de la guía?',
                                icon: 'warning',
                                showCancelButton: true,
                                confirmButtonText: 'Eliminar',
                                cancelButtonText: 'Cancelar',
                                confirmButtonColor: '#dc2626',
                            });
                            if (result.isConfirmed) {
                                try {
                                    await eliminarItem({
                                        id_guia: id,
                                        item_id: info.row.original.id,
                                    }).unwrap();
                                    toast.success('Item eliminado de la guia', { autoClose: 1000 });
                                } catch (error: any) {
                                    toast.error(error.data || 'Error al eliminar el item');
                                }
                            }
                        }}>
                        Eliminar
                    </Button>
                </div>
            ),
        }),
    ];

    const tableItems = useReactTable({
        data: listaItemsEnGuiaSalidaBodega,
        columns: columnsItems,
        state: {
            sorting: itemsSorting,
            globalFilter: itemsGlobalFilter,
        },
        onSortingChange: setItemsSorting,
        enableGlobalFilter: true,
        onGlobalFilterChange: setItemsGlobalFilter,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    const completarGuia = async () => {
        if (!id) return;
        const result = await Swal.fire({
            title: '¿Completar guía de salida?',
            text: '¿Está seguro de completar la guía de salida?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Completar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#3085d6',
        });
        if (result.isConfirmed) {
            setCompletando(true);
            try {
                await comprobarGuiaMutation(id).unwrap();
                toast.success('Guia completada', { autoClose: 1000 });
            } catch (error: any) {
                toast.error(error.data?.detail || 'Error al completar la guia', {
                    toastId: 'Error al completar la guia',
                });
            }
            setCompletando(false);
        }
    };

    return (
        <PageWrapper
            isProtectedRoute={true}
            name='Detalle de Guia de Salida de Items de Bodega'
            title='Detalle de Guia de Salida de Items de Bodega'>
            <Subheader>
                <SubheaderLeft>
                    <Badge className='text-xl'>Detalle de Guia de Salida de Items de Bodega</Badge>
                </SubheaderLeft>
                <SubheaderRight>
                    <div className='flex flex-wrap gap-2'>
                        {/* Botón "Volver al Listado" eliminado */}
                        {detalleGuiaSalidaBodega?.orden_trabajo && (
                            <Tooltip text='Ver OT Vinculada'>
                                <Button
                                    variant='solid'
                                    color='violet'
                                    icon='HeroDocumentText'
                                    onClick={() =>
                                        navigate(
                                            `/orden-trabajo/detalle-orden-trabajo/${detalleGuiaSalidaBodega.orden_trabajo}`,
                                        )
                                    }>
                                    OT Vinculada
                                </Button>
                            </Tooltip>
                        )}
                        {isPendiente && (
                            <Tooltip text='Eliminar Guía'>
                                <Button
                                    variant='solid'
                                    color='red'
                                    icon='HeroTrash'
                                    onClick={async () => {
                                        const result = await Swal.fire({
                                            title: '¿Eliminar Guía de Salida?',
                                            text: `Está a punto de eliminar la guía N°${detalleGuiaSalidaBodega?.id}. Esta acción no se puede deshacer.`,
                                            icon: 'warning',
                                            showCancelButton: true,
                                            confirmButtonText: 'Eliminar',
                                            cancelButtonText: 'Cancelar',
                                            confirmButtonColor: '#dc2626',
                                        });
                                        if (result.isConfirmed) {
                                            try {
                                                await deleteGuia(id!).unwrap();
                                                toast.success('Guía eliminada exitosamente', {
                                                    autoClose: 1000,
                                                });
                                                navigate('/bodega/guias-salida-bodega');
                                            } catch (error: any) {
                                                toast.error(
                                                    error?.data?.detail ||
                                                        'Error al eliminar la guía',
                                                );
                                            }
                                        }
                                    }}
                                />
                            </Tooltip>
                        )}
                        {detalleGuiaSalidaBodega?.estado === 'ER' &&
                            (() => {
                                const soporte = detalleGuiaSalidaBodega?.soporte_tecnico;
                                const faltaDatosSoporte =
                                    typeof soporte === 'object' && soporte !== null
                                        ? !!soporte.falta_datos
                                        : false;
                                const disabled = !!faltaDatosSoporte;
                                const tooltip = disabled
                                    ? 'Faltan datos en la OT (asignar técnico y fecha)'
                                    : 'Firmar para Aprobar Guia';
                                return (
                                    <Tooltip text={tooltip}>
                                        <div
                                            className={
                                                disabled ? 'cursor-not-allowed opacity-60' : ''
                                            }>
                                            <Button
                                                variant='solid'
                                                isDisable={disabled}
                                                onClick={() => {
                                                    if (disabled) return;
                                                    setIsOpen(true);
                                                }}
                                                icon='HeroPencil'
                                                color='emerald'
                                            />
                                        </div>
                                    </Tooltip>
                                );
                            })()}
                        {detalleGuiaSalidaBodega?.estado === 'ER' && (
                            <VolverAPendienteGuiaSalida guia_salida={detalleGuiaSalidaBodega} onSuccess={() => {
                                refetchDetalleGuia();
                            }} />
                        )}
                        {(detalleGuiaSalidaBodega?.estado === 'ET' ||
                            detalleGuiaSalidaBodega?.estado === 'C' ||
                            detalleGuiaSalidaBodega?.estado === 'T') && (
                            <>
                                <Tooltip text='Devolución Parcial'>
                                    <Button
                                        variant='solid'
                                        color='amber'
                                        icon='DuoIncomingBox'
                                        onClick={() => {
                                            navigate(
                                                `/bodega/devolucion-parcial-guia-salida-bodega/${id}`,
                                            );
                                        }}
                                    />
                                </Tooltip>
                                <Tooltip text='Devolución Completa'>
                                    <Button
                                        variant='solid'
                                        color='emerald'
                                        icon='HeroInboxArrowDown'
                                        onClick={async () => {
                                            const result = await Swal.fire({
                                                title: '¿Devolver todos los items?',
                                                text: 'Se devolverán todos los items de esta guía a la bodega.',
                                                icon: 'question',
                                                showCancelButton: true,
                                                confirmButtonText: 'Devolver',
                                                cancelButtonText: 'Cancelar',
                                                confirmButtonColor: '#10b981',
                                            });
                                            if (result.isConfirmed) {
                                                try {
                                                    await devolverABodegaMutation({ id: id! }).unwrap();
                                                    toast.success(
                                                        'Se devolverieron todos los items a bodega',
                                                        { autoClose: 1000 },
                                                    );
                                                } catch (error: any) {
                                                    toast.error(
                                                        error.data?.detail ||
                                                            'Error al devolver items',
                                                    );
                                                }
                                            }
                                        }}
                                    />
                                </Tooltip>
                            </>
                        )}
                        {detalleGuiaSalidaBodega?.estado === 'ET' && (
                            <>
                                <Tooltip text='Firmar para Entregar'>
                                    <Button
                                        variant='solid'
                                        color='lime'
                                        icon='DuoArchive'
                                        onClick={() => {
                                            setIsOpenFirma(true);
                                        }}></Button>
                                </Tooltip>
                                <Tooltip text='Terminar Guia'>
                                    <Button
                                        variant='solid'
                                        color='sky'
                                        icon='DuoBox3'
                                        onClick={async () => {
                                            const result = await Swal.fire({
                                                title: '¿Terminar Guía?',
                                                text: 'Marcará esta guía como terminada.',
                                                icon: 'question',
                                                showCancelButton: true,
                                                confirmButtonText: 'Terminar',
                                                cancelButtonText: 'Cancelar',
                                                confirmButtonColor: '#0ea5e9',
                                            });
                                            if (result.isConfirmed) {
                                                try {
                                                    await updateGuia({
                                                        id: id!,
                                                        estado: 'T',
                                                    }).unwrap();
                                                    toast.success('Guia terminada', {
                                                        autoClose: 1000,
                                                    });
                                                } catch (error: any) {
                                                    const mensajesError = error.data
                                                        ? Object.values(error.data).flat().join(' ')
                                                        : 'Error al terminar la guia';
                                                    toast.error(
                                                        mensajesError ||
                                                            'Error al terminar la guia',
                                                        { toastId: 'Error al terminar la guia' },
                                                    );
                                                }
                                            }
                                        }}></Button>
                                </Tooltip>
                            </>
                        )}
                        {['ER', 'FR', 'R', 'PR', 'E', 'T'].includes(
                            detalleGuiaSalidaBodega?.estado || '',
                        ) && (
                            <Tooltip text='Descargar PDF'>
                                <Button
                                    variant='solid'
                                    color='red'
                                    icon='HeroDocumentArrowDown'
                                    onClick={async () => {
                                        if (!id) return;
                                        try {
                                            const response = await ApiService.fetchData<Blob>({
                                                url: `/api/guia-salida/${id}/descargar-pdf/`,
                                                method: 'get',
                                                responseType: 'blob',
                                            });
                                            const url = window.URL.createObjectURL(response.data);
                                            const link = document.createElement('a');
                                            link.href = url;
                                            link.setAttribute('download', `Guia_Salida_${id}.pdf`);
                                            document.body.appendChild(link);
                                            link.click();
                                            link.remove();
                                            window.URL.revokeObjectURL(url);
                                        } catch (error: any) {
                                            toast.error('Error al descargar PDF');
                                        }
                                    }}
                                />
                            </Tooltip>
                        )}
                    </div>
                </SubheaderRight>
            </Subheader>
            <Container className='h-full w-full'>
                <div className='flex flex-col gap-4'>
                    <div className='w-full'>
                        <Card>
                            <CardHeader>
                                <CardHeaderChild>
                                    <Badge className='text-xl'>Datos</Badge>
                                </CardHeaderChild>
                                <CardHeaderChild>
                                    {isEditting ? (
                                        <div className='flex gap-4'>
                                            <Button
                                                variant='solid'
                                                color='red'
                                                onClick={() => {
                                                    setIsEditting(false);
                                                }}>
                                                Cancelar
                                            </Button>
                                            <Button
                                                variant='solid'
                                                color='emerald'
                                                onClick={() => {
                                                    formik.handleSubmit();
                                                }}>
                                                Guardar
                                            </Button>
                                        </div>
                                    ) : (
                                        <Button
                                            variant='solid'
                                            color='blue'
                                            onClick={() => {
                                                setIsEditting(true);
                                            }}
                                            icon='HeroPencil'></Button>
                                    )}
                                </CardHeaderChild>
                            </CardHeader>
                            <CardBody>
                                <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
                                    {isEditting ? (
                                        <>
                                            <div className='w-full'>
                                                <Badge>Estado</Badge>
                                                <div className='ml-4 mt-1'>
                                                    {(() => {
                                                        let color: 'sky' | 'amber' | 'indigo' | 'emerald' | 'cyan' | 'zinc' | 'violet' | 'blue' = 'zinc';
                                                        switch (detalleGuiaSalidaBodega?.estado) {
                                                            case 'P': color = 'sky'; break;
                                                            case 'ER': color = 'blue'; break;
                                                            case 'ET': color = 'amber'; break;
                                                            case 'FR': color = 'violet'; break;
                                                            case 'E': color = 'emerald'; break;
                                                            case 'PR': color = 'sky'; break;
                                                            case 'R': color = 'zinc'; break;
                                                            case 'T': color = 'violet'; break;
                                                        }
                                                        return <Badge color={color}>{detalleGuiaSalidaBodega?.estado_label}</Badge>;
                                                    })()}
                                                </div>
                                            </div>
                                            <div className='w-full'>
                                                <Badge>Creado Por</Badge>
                                                <div className='ml-4'>
                                                    {detalleGuiaSalidaBodega?.nombre_creado_por}
                                                </div>
                                            </div>
                                            <div className='w-full'>
                                                <Badge>Recibido Por</Badge>
                                                <SelectReact
                                                    name='recibido_por'
                                                    placeholder='Seleccione un usuario'
                                                    options={recibidoPorOptions}
                                                    value={recibidoPorSeleccionado}
                                                    onChange={(option) => {
                                                        formik.setFieldValue(
                                                            'recibido_por',
                                                            option
                                                                ? (option as TSelectOption).value
                                                                : '',
                                                        );
                                                    }}
                                                    onBlur={formik.handleBlur}
                                                />
                                            </div>
                                            <div className='w-full'>
                                                <Badge>Cliente</Badge>
                                                <div className='ml-4'>
                                                    {detalleGuiaSalidaBodega?.cliente_nombre}
                                                </div>
                                            </div>
                                            <div className='col-span-full'>
                                                <Badge>Motivo</Badge>
                                                <Textarea
                                                    name='motivo'
                                                    value={formik.values.motivo}
                                                    onChange={formik.handleChange}
                                                    onBlur={formik.handleBlur}
                                                />
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className='w-full'>
                                                <Badge>Estado</Badge>
                                                <div className='ml-4 mt-1'>
                                                    {(() => {
                                                        let color: 'sky' | 'amber' | 'indigo' | 'emerald' | 'cyan' | 'zinc' | 'violet' | 'blue' = 'zinc';
                                                        switch (detalleGuiaSalidaBodega?.estado) {
                                                            case 'P': color = 'sky'; break;
                                                            case 'ER': color = 'blue'; break;
                                                            case 'ET': color = 'amber'; break;
                                                            case 'FR': color = 'violet'; break;
                                                            case 'E': color = 'emerald'; break;
                                                            case 'PR': color = 'sky'; break;
                                                            case 'R': color = 'zinc'; break;
                                                            case 'T': color = 'violet'; break;
                                                        }
                                                        return <Badge color={color}>{detalleGuiaSalidaBodega?.estado_label}</Badge>;
                                                    })()}
                                                </div>
                                            </div>
                                            <div className='w-full'>
                                                <Badge>Creado Por</Badge>
                                                <div className='ml-4'>
                                                    {detalleGuiaSalidaBodega?.nombre_creado_por}
                                                </div>
                                            </div>
                                            <div className='w-full'>
                                                <Badge>Recibido Por</Badge>
                                                <div className='ml-4'>
                                                    {detalleGuiaSalidaBodega?.nombre_recibido_por}
                                                </div>
                                            </div>
                                            <div className='w-full'>
                                                <Badge>Cliente</Badge>
                                                <div className='ml-4'>
                                                    {detalleGuiaSalidaBodega?.cliente_nombre}
                                                </div>
                                            </div>
                                            <div className='col-span-full'>
                                                <Badge>Motivo</Badge>
                                                <div className='ml-4'>
                                                    {detalleGuiaSalidaBodega?.motivo ||
                                                        'Sin Motivo'}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </CardBody>
                        </Card>
                    </div>
                    {isPendiente && (
                        <>
                            <div className='w-full'>
                                <Card>
                                    <CardHeader>
                                        <CardHeaderChild>
                                            <Badge className='text-xl'>
                                                Items en stock de la bodega
                                            </Badge>
                                        </CardHeaderChild>
                                    </CardHeader>
                                    <CardBody className='z-0'>
                                        <div className='overflow-auto'>
                                            <Table className='min-w-[1000px] table-fixed'>
                                                <THead>
                                                    {stockTable
                                                        .getHeaderGroups()
                                                        .map((headerGroup) => (
                                                            <Tr key={headerGroup.id}>
                                                                {headerGroup.headers.map(
                                                                    (header) => (
                                                                        <Th
                                                                            key={header.id}
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
                                                                                        header
                                                                                            .column
                                                                                            .columnDef
                                                                                            .header,
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
                                                                    ),
                                                                )}
                                                            </Tr>
                                                        ))}
                                                </THead>
                                                <TBody>
                                                    {stockTable.getRowModel().rows.map((row) => (
                                                        <Tr key={row.id}>
                                                            {row.getVisibleCells().map((cell) => (
                                                                <Td key={cell.id}>
                                                                    {flexRender(
                                                                        cell.column.columnDef.cell,
                                                                        cell.getContext(),
                                                                    )}
                                                                </Td>
                                                            ))}
                                                        </Tr>
                                                    ))}
                                                </TBody>
                                            </Table>
                                            <div className='mt-2 min-w-[1000px]'>
                                                <TableCardFooterTemplateV2 table={stockTable} />
                                            </div>
                                        </div>
                                    </CardBody>
                                </Card>
                            </div>
                            <div className='w-full'>
                                <Card>
                                    <CardHeader>
                                        <CardHeaderChild>
                                            <Badge className='text-xl'>
                                                Items de la Guia de Salida
                                            </Badge>
                                        </CardHeaderChild>
                                        <CardHeaderChild>
                                            <div className='flex gap-4'>
                                                <Button
                                                    variant='solid'
                                                    color='emerald'
                                                    isDisable={completando}
                                                    onClick={completarGuia}>
                                                    Completar Guia de Salida
                                                </Button>
                                            </div>
                                        </CardHeaderChild>
                                    </CardHeader>
                                    <CardBody className='z-0'>
                                        <div className='overflow-auto'>
                                            <Table className='min-w-[800px] table-fixed'>
                                                <THead>
                                                    {tableItems
                                                        .getHeaderGroups()
                                                        .map((headerGroup) => (
                                                            <Tr key={headerGroup.id}>
                                                                {headerGroup.headers.map(
                                                                    (header) => (
                                                                        <Th
                                                                            key={header.id}
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
                                                                                        header
                                                                                            .column
                                                                                            .columnDef
                                                                                            .header,
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
                                                                    ),
                                                                )}
                                                            </Tr>
                                                        ))}
                                                </THead>
                                                <TBody>
                                                    {tableItems.getRowModel().rows.map((row) => (
                                                        <Tr key={row.id}>
                                                            {row.getVisibleCells().map((cell) => (
                                                                <Td key={cell.id}>
                                                                    {flexRender(
                                                                        cell.column.columnDef.cell,
                                                                        cell.getContext(),
                                                                    )}
                                                                </Td>
                                                            ))}
                                                        </Tr>
                                                    ))}
                                                </TBody>
                                            </Table>
                                            <div className='mt-2 min-w-[800px]'>
                                                <TableCardFooterTemplateV2 table={tableItems} />
                                            </div>
                                        </div>
                                    </CardBody>
                                </Card>
                            </div>
                        </>
                    )}
                    {!isPendiente && (
                        <div className='w-full'>
                            <Card>
                                <CardHeader>
                                    <CardHeaderChild>
                                        <Badge className='text-xl'>Items en la Guia</Badge>
                                    </CardHeaderChild>
                                    <CardHeaderChild></CardHeaderChild>
                                </CardHeader>
                                <CardBody className='z-0'>
                                    <div className='overflow-auto'>
                                        <Table className='min-w-[600px] table-fixed'>
                                            <THead>
                                                {tableReadOnly
                                                    .getHeaderGroups()
                                                    .map((headerGroup) => (
                                                        <Tr key={headerGroup.id}>
                                                            {headerGroup.headers.map((header) => (
                                                                <Th
                                                                    key={header.id}
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
                                                                                header.column
                                                                                    .columnDef
                                                                                    .header,
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
                                                {tableReadOnly.getRowModel().rows.map((row) => (
                                                    <Tr key={row.id}>
                                                        {row.getVisibleCells().map((cell) => (
                                                            <Td key={cell.id}>
                                                                {flexRender(
                                                                    cell.column.columnDef.cell,
                                                                    cell.getContext(),
                                                                )}
                                                            </Td>
                                                        ))}
                                                    </Tr>
                                                ))}
                                            </TBody>
                                        </Table>
                                        <div className='mt-2 min-w-[600px]'>
                                            <TableCardFooterTemplateV2 table={tableReadOnly} />
                                        </div>
                                    </div>
                                </CardBody>
                            </Card>
                        </div>
                    )}
                </div>
                {isPendiente && (
                    <AsignarNumeroDeSerie
                        isOpen={isOpenNumero}
                        setIsOpen={setIsOpenNumero}
                        itemRebajaSelected={itemRebajaSelected}
                        setItemRebajaSelected={setItemRebajaSelected}
                    />
                )}
                <AprobarGuiaSalida
                    id_guia={id ? parseInt(id) : undefined}
                    bodegaSelected={detalleGuiaSalidaBodega?.bodega.toString()}
                    isOpen={isOpen}
                    setIsOpen={setIsOpen}
                />
                <FirmarEntregarGuia
                    id_guia={id ? parseInt(id) : undefined}
                    bodegaSelected={detalleGuiaSalidaBodega?.bodega.toString()}
                    isOpen={isOpenFirma}
                    setIsOpen={setIsOpenFirma}
                    onSuccess={() => {
                        refetchDetalleGuia();
                    }}
                />
            </Container>
        </PageWrapper>
    );
}

export default DetalleGuiaSalidaBodega;
