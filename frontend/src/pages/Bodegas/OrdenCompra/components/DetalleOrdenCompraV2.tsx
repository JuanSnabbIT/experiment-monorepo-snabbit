import Checkbox from '@/components/form/Checkbox';
import Input from '@/components/form/Input';
import Icon from '@/components/icon/Icon';
import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, { SubheaderLeft, SubheaderRight } from '@/components/layouts/Subheader/Subheader';
import ConfirmarEliminar from '@/components/modals/ConfirmarEliminar';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import Tooltip from '@/components/ui/Tooltip';
import AnimacionDeInputModoMovil from '@/components/utils/AnimacionDeIntputModoMovil';
import useAuthority from '@/hooks/useAuthority';
import { IItemEnOrdenCompra, IItemOrdenCompraEnStock } from '@/interface/bodega.interface';
import ApiService from '@/services/ApiService';
import { useAppDispatch, useAppSelector } from '@/store';
import { listaBodegasPorEmpresaThunk } from '@/store/slices/bodega/bodegaSlice';
import {
    useGetDetalleOrdenCompraQuery,
    useGetItemsEnOrdenCompraQuery,
    useGetItemsOrdenCompraEnStockQuery,
} from '@/store/slices/bodega/ordenCompraApi';
import TableCardFooterTemplateV2 from '@/templates/Table/TableFooterTemplateV2';
import { formatPrice } from '@/utils/currency';
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
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import AceptarORechazarOrdenCompra from '../modals/AceptarORechazarOrdenCompra';
import ConfirmarRecibirOrden from '../modals/ConfirmarRecibirOrden';
import EditarItemEnOrdenCompra from '../modals/EditarItemEnOrdenCompra';
import EditarItemOrdenStock from '../modals/EditarItemOrdenStock';
import ModalEnviarProveedor from '../modals/ModalEnviarProveedor';
import ModalReenviarAlProveedor from '../modals/ModalReenviarAlProveedor';
import ModalVolverABorradorOC from '../modals/ModalVolverABorradorOC';
import TerminarBorradorOC from '../modals/TerminarBorradorOC';
import OffCanvasAgregarItemsOrdenCompra from './OffCanvasAgregarItemsOrdenCompra';

const columnHelper = createColumnHelper<IItemEnOrdenCompra>();
const columnHelperRecepcion = createColumnHelper<{
    item_orden: IItemEnOrdenCompra;
    item_stock: IItemOrdenCompraEnStock | undefined;
}>();
const estadosPdfPermitidos = new Set(['0', '1', '2', '3', '4', '5']);

function DetalleOrdenCompraV2() {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { id } = useParams();

    // Stabilize references for RTK Query data
    const {
        data: dataDetalle,
        isLoading: isLoadingDetalle,
        refetch: refetchDetalle,
    } = useGetDetalleOrdenCompraQuery(id || '', { skip: !id, refetchOnMountOrArgChange: true });
    const detalleOrdenCompra = dataDetalle;

    const {
        data: dataItems,
        isLoading: isLoadingItems,
        refetch: refetchItems,
    } = useGetItemsEnOrdenCompraQuery(id || '', { skip: !id, refetchOnMountOrArgChange: true });
    // Use useMemo to ensure stable array reference when data is undefined
    const listaItemsEnOrdenCompra = useMemo(() => dataItems || [], [dataItems]);

    // Solo cargar stock si el estado es Aprobada (1), Enviada (3), o Recibida Parcial (4)
    const cargarStock = Boolean(
        id && detalleOrdenCompra && ['1', '3', '4'].includes(detalleOrdenCompra.estado || ''),
    );
    const {
        data: dataStock,
        isLoading: isLoadingStock,
        refetch: refetchStock,
    } = useGetItemsOrdenCompraEnStockQuery(id || '', {
        skip: !cargarStock,
        refetchOnMountOrArgChange: true,
    });
    const listaItemsOrdenCompraEnStock = useMemo(() => dataStock || [], [dataStock]);

    const { personalizacionUsuario, listaGrupos } = useAppSelector((state) => state.auth);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState<string>('');
    const [valorNeto, setValorNeto] = useState<number>(0);
    const [valorIva, setValorIva] = useState<number>(0);
    const [valorTotal, setValorTotal] = useState<number>(0);
    const tieneCotizacion = Boolean(detalleOrdenCompra?.relacion_cotizacion);
    const isStaff = useAuthority(listaGrupos?.grupos, ['staff']);

    // Derived state instead of useEffect+useState to avoid loops
    const itemsARecibir = useMemo(() => {
        if (listaItemsEnOrdenCompra.length > 0) {
            return listaItemsEnOrdenCompra.map((item) => ({
                item_orden: item,
                item_stock: listaItemsOrdenCompraEnStock.find((it) => it.item_oc_id === item.id),
            }));
        }
        return [];
    }, [listaItemsEnOrdenCompra, listaItemsOrdenCompraEnStock]);

    const [isEdittingCompra, setIsEdittingCompra] = useState<boolean>(false);
    const [fechaCompra, setFechaCompra] = useState<string>('');
    const [dolarManual, setDolarManual] = useState<boolean>(false);
    const [dolarObservado, setDolarObservado] = useState<number>(0);
    const [isLoadingCompra, setIsLoadingCompra] = useState<boolean>(false);
    const [mostrarCompletar, setMostrarCompletar] = useState<boolean>(false);
    const modoCompletarDisponible =
        detalleOrdenCompra?.estado === '1' ||
        detalleOrdenCompra?.estado === '3' ||
        detalleOrdenCompra?.estado === '4';
    const estaCompletandoOC = modoCompletarDisponible && mostrarCompletar;
    const puedeDescargarPdf = Boolean(
        detalleOrdenCompra?.estado && estadosPdfPermitidos.has(detalleOrdenCompra.estado),
    );
    const fechaCompraDefault = dayjs().format('YYYY-MM-DD');
    const [guiaSalidaId, setGuiaSalidaId] = useState<number | null>(null);

    const refrescarDetalle = () => {
        refetchDetalle();
        refetchItems();
        if (cargarStock) refetchStock();
    };

    useEffect(() => {
        if (id) {
            setMostrarCompletar(false);
            setIsEdittingCompra(false);
            // setItemsARecibir([]); // Removed as it is now derived
            setValorNeto(0);
            setValorIva(0);
            setValorTotal(0);
            setFechaCompra('');
            setDolarObservado(0);
            setDolarManual(false);
            setSorting([]);
            setGlobalFilter('');
        }
    }, [id]);

    useEffect(() => {
        if (detalleOrdenCompra) {
            if (
                detalleOrdenCompra.estado === '1' ||
                detalleOrdenCompra.estado === '3' ||
                detalleOrdenCompra.estado === '4'
            ) {
                if (detalleOrdenCompra.oc_empresa) {
                    dispatch(
                        listaBodegasPorEmpresaThunk({ id_empresa: detalleOrdenCompra.oc_empresa }),
                    );
                }
            }
            setFechaCompra(detalleOrdenCompra.fecha_compra || fechaCompraDefault);
            setDolarObservado(detalleOrdenCompra.dolar_observado || 0);
        }
    }, [detalleOrdenCompra, dispatch]);

    useEffect(() => {
        const obtenerGuiaSalida = async () => {
            if (!detalleOrdenCompra?.id) {
                setGuiaSalidaId(null);
                return;
            }

            try {
                const response = await ApiService.fetchData<{ guia_id: number | null }>({
                    url: `/api/ordenes-compra/${detalleOrdenCompra.id}/guia-por-orden/`,
                    method: 'get',
                });
                setGuiaSalidaId(response.data.guia_id);
            } catch (error: unknown) {
                setGuiaSalidaId(null);
            }
        };

        obtenerGuiaSalida();
    }, [detalleOrdenCompra?.id]);

    const columns = [
        columnHelper.accessor('item_empresa.nombre', {
            cell: (info) => (
                <div className='flex flex-col'>
                    <div className='w-full'>{info.row.original.item_empresa.nombre}</div>
                    <div className='mt-2 w-full'>
                        <Button
                            size='xs'
                            className='!px-1'
                            icon='DuoBox3'
                            onClick={() => {
                                if (info.row.original.item_empresa.fabricante)
                                    navigate(
                                        `/registros/detalle-fabricante/${info.row.original.item_empresa.fabricante}`,
                                    );
                            }}>
                            {info.row.original.item_empresa.datos_fabricante?.nombre}
                        </Button>
                    </div>
                    <div className='w-full'>
                        <Button
                            size='xs'
                            className='!px-1'
                            icon='DuoAlignJustify'
                            onClick={() => {
                                if (info.row.original.item_empresa.categoria)
                                    navigate(
                                        `/registros/detalle-categoria/${info.row.original.item_empresa.categoria}`,
                                    );
                            }}>
                            {info.row.original.item_empresa.datos_categoria?.nombre ||
                                'Sin Categoria'}
                        </Button>
                    </div>
                </div>
            ),
            header: 'Nombre',
        }),
        columnHelper.accessor('cantidad', {
            cell: (info) => <div>{info.row.original.cantidad}</div>,
            header: 'Cantidad',
        }),
        columnHelper.accessor('precio', {
            cell: (info) => (
                <div>
                    ${formatPrice(info.getValue())} {detalleOrdenCompra?.tipo_moneda_label}
                </div>
            ),
            header: 'Precio',
        }),
        columnHelper.display({
            id: 'total',
            cell: (info) => (
                <div>
                    ${formatPrice(info.row.original.cantidad * info.row.original.precio)}{' '}
                    {detalleOrdenCompra?.tipo_moneda_label}
                </div>
            ),
            header: 'Total',
        }),
        columnHelper.display({
            id: 'acciones',
            cell: (info) =>
                detalleOrdenCompra?.estado === '-' ? (
                    <div className='flex flex-wrap gap-2'>
                        <ConfirmarEliminar
                            mensaje={'¿Esta seguro de eliminar este item de la orden?'}
                            peticionUrl={`/api/ordenes-compra/${id}/items-en-orden-compra/${info.row.original.id}/`}
                            onDispatch={() => {
                                refetchItems();
                                refetchDetalle();
                            }}
                        />
                        <EditarItemEnOrdenCompra item={info.row.original} id_orden={id} />
                    </div>
                ) : null,
            header: detalleOrdenCompra?.estado === '-' ? '' : undefined,
        }),
    ];

    const columnsRecepcion = [
        columnHelperRecepcion.accessor('item_orden.id', {
            cell: (info) => (
                <div className='flex flex-col'>
                    <div className='w-full'>{info.row.original.item_orden.item_empresa.nombre}</div>
                    <div className='mt-2 w-full'>
                        <Button
                            size='xs'
                            className='!px-1'
                            icon='DuoBox3'
                            onClick={() => {
                                if (info.row.original.item_orden.item_empresa.fabricante)
                                    navigate(
                                        `/registros/detalle-fabricante/${info.row.original.item_orden.item_empresa.fabricante}`,
                                    );
                            }}>
                            {info.row.original.item_orden.item_empresa.datos_fabricante?.nombre}
                        </Button>
                    </div>
                    <div className='w-full'>
                        <Button
                            size='xs'
                            className='!px-1'
                            icon='DuoAlignJustify'
                            onClick={() => {
                                if (info.row.original.item_orden.item_empresa.categoria)
                                    navigate(
                                        `/registros/detalle-categoria/${info.row.original.item_orden.item_empresa.categoria}`,
                                    );
                            }}>
                            {info.row.original.item_orden.item_empresa.datos_categoria?.nombre ||
                                'Sin Categoria'}
                        </Button>
                    </div>
                </div>
            ),
            header: 'Item',
        }),
        columnHelperRecepcion.accessor('item_orden.cantidad', {
            cell: (info) => <div>{info.row.original.item_orden.cantidad}</div>,
            header: 'Cantidad Esperada',
        }),
        columnHelperRecepcion.display({
            id: 'cantidad_recibida',
            cell: (info) => <div>{info.row.original.item_stock?.cantidad ?? 0}</div>,
            header: 'Cantidad Recibida',
        }),
        columnHelperRecepcion.display({
            id: 'bodega',
            cell: (info) => (
                <div>{info.row.original.item_stock?.nombre_bodega ?? 'Sin Bodega'}</div>
            ),
            header: 'Bodega',
        }),
        columnHelperRecepcion.display({
            id: 'acciones',
            cell: (info) => (
                <EditarItemOrdenStock
                    item_orden={info.row.original.item_orden}
                    item_stock={info.row.original.item_stock}
                    id_orden={id}
                />
            ),
            header: '',
        }),
    ];

    const table = useReactTable({
        data: listaItemsEnOrdenCompra,
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

    const tableRecepcion = useReactTable({
        data: itemsARecibir,
        columns: columnsRecepcion,
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

    const handleIrACotizacion = async () => {
        try {
            if (!detalleOrdenCompra?.relacion_cotizacion) {
                toast.error('No se encontr cotizacin relacionada');
                return;
            }
            const resp = await ApiService.fetchData<{ numero_cotizacion: number }>({
                url: `/api/cotizaciones/${detalleOrdenCompra.relacion_cotizacion}/`,
                method: 'get',
            });
            const num = resp.data?.numero_cotizacion;
            if (num) {
                navigate(`/cotizacion/detalle-cotizacion/${num}`);
                return;
            }
            toast.error('No se pudo determinar la cotizacin relacionada');
        } catch (error: any) {
            toast.error(error?.response?.data || 'No se pudo abrir la cotizacin previa');
        }
    };

    useEffect(() => {
        if (listaItemsEnOrdenCompra.length > 0) {
            const neto = listaItemsEnOrdenCompra.reduce(
                (acc, item) => acc + item.cantidad * item.precio,
                0,
            );
            const iva = neto * 0.19;
            const total = iva + neto;
            setValorTotal(parseInt(total.toFixed(0)));
            setValorIva(parseInt(iva.toFixed(0)));
            setValorNeto(parseInt(neto.toFixed(0)));
        } else {
            setValorNeto(0);
            setValorIva(0);
            setValorTotal(0);
        }
    }, [listaItemsEnOrdenCompra]);

    return (
        <PageWrapper
            isProtectedRoute={true}
            name='Detalle Orden Compra'
            title='Detalle Orden Compra'>
            <Subheader>
                <SubheaderLeft>{null}</SubheaderLeft>
                <SubheaderRight>
                    <div className='flex flex-wrap gap-2'>
                        {/* Botones que NO aparecen en modo recepción */}
                        {!estaCompletandoOC && (
                            <>
                                {guiaSalidaId && (
                                    <Tooltip text='Guía de salida'>
                                        <Button
                                            variant='solid'
                                            color='emerald'
                                            icon='HeroEye'
                                            onClick={() => {
                                                navigate(
                                                    `/bodega/detalle-guia-salida-bodega/${guiaSalidaId}`,
                                                );
                                            }}
                                        />
                                    </Tooltip>
                                )}
                                {tieneCotizacion && (
                                    <Tooltip text='Cotización previa'>
                                        <Button
                                            variant='solid'
                                            color='blue'
                                            icon='DuoArrowLeft'
                                            onClick={handleIrACotizacion}
                                        />
                                    </Tooltip>
                                )}
                                {detalleOrdenCompra?.estado === '-' && (
                                    <TerminarBorradorOC
                                        id_orden={id}
                                        onSuccess={refrescarDetalle}
                                    />
                                )}
                                {detalleOrdenCompra?.estado === '0' && (
                                    <>
                                        <AceptarORechazarOrdenCompra
                                            id_orden={id}
                                            onSuccess={refrescarDetalle}
                                        />
                                        {isStaff && (
                                            <ModalVolverABorradorOC
                                                id_orden={id as string}
                                                onSuccess={refrescarDetalle}
                                            />
                                        )}
                                    </>
                                )}
                                {detalleOrdenCompra?.estado === '1' && (
                                    <ModalEnviarProveedor
                                        id_empresa={detalleOrdenCompra?.oc_empresa}
                                        id_proveedor={detalleOrdenCompra?.proveedor}
                                        id_orden={detalleOrdenCompra?.id}
                                        onSuccess={refrescarDetalle}
                                    />
                                )}
                                {detalleOrdenCompra?.estado === '3' && (
                                    <ModalReenviarAlProveedor
                                        id_orden={detalleOrdenCompra?.id}
                                        id_empresa={detalleOrdenCompra?.oc_empresa}
                                        id_proveedor={detalleOrdenCompra?.proveedor}
                                        onSuccess={refrescarDetalle}
                                    />
                                )}
                            </>
                        )}
                        {/* Botón de recepción (estados 1, 3, 4) */}
                        {modoCompletarDisponible && (
                            <Tooltip
                                text={
                                    mostrarCompletar
                                        ? 'Cancelar y volver'
                                        : 'Recepcionar items de la compra'
                                }>
                                <Button
                                    variant='solid'
                                    color={mostrarCompletar ? 'zinc' : 'sky'}
                                    icon='DuoBox2'
                                    onClick={() => setMostrarCompletar((prev) => !prev)}></Button>
                            </Tooltip>
                        )}
                        {/* Botón confirmar recepción (solo en modo recepción) */}
                        {estaCompletandoOC && (
                            <ConfirmarRecibirOrden
                                itemsARecibir={itemsARecibir}
                                detalleOrdenCompra={detalleOrdenCompra}
                            />
                        )}
                        {/* Botón PDF (solo fuera de modo recepción y estados permitidos) */}
                        {!estaCompletandoOC && puedeDescargarPdf && (
                            <Tooltip text='Ver PDF'>
                                <Button
                                    variant='solid'
                                    color='red'
                                    icon='HeroDocumentText'
                                    onClick={async () => {
                                        try {
                                            const response = await ApiService.fetchData<BlobPart>({
                                                url: `/api/ordenes-compra/${detalleOrdenCompra?.id}/pdf/`,
                                                method: 'get',
                                                headers: { 'Content-Type': 'application/pdf' },
                                            });
                                            const url = window.URL.createObjectURL(
                                                new Blob([response.data]),
                                            );
                                            const a = document.createElement('a');
                                            a.href = url;
                                            a.download = `orden_compra_${detalleOrdenCompra?.id}.pdf`;
                                            document.body.appendChild(a);
                                            a.click();
                                            a.remove();
                                            window.URL.revokeObjectURL(url);
                                        } catch (error: any) {
                                            toast.error(
                                                error.response?.data ||
                                                    'No se pudo descargar la OC',
                                            );
                                        }
                                    }}></Button>
                            </Tooltip>
                        )}
                    </div>
                </SubheaderRight>
            </Subheader>
            <Container className='h-full w-full'>
                <div className='flex w-full flex-col gap-4'>
                    <Card>
                        <CardHeader>
                            <CardHeaderChild>
                                <Badge className='text-xl'>Datos Orden de Compra</Badge>
                            </CardHeaderChild>
                        </CardHeader>
                        <CardBody>
                            <div className='grid grid-cols-2 items-center gap-4 md:grid-cols-3 lg:grid-cols-5'>
                                <div className='w-full'>
                                    <Badge>Codigo</Badge>
                                    <div className='ml-4'>{detalleOrdenCompra?.codigo}</div>
                                </div>
                                <div className='w-full'>
                                    <Badge>Proveedor</Badge>
                                    <div className='ml-4'>
                                        {detalleOrdenCompra?.nombre_proveedor}
                                    </div>
                                </div>
                                <div className='w-full'>
                                    <Badge>Estado</Badge>
                                    <div className='ml-4'>{detalleOrdenCompra?.estado_label}</div>
                                </div>
                                <div className='w-full'>
                                    <Badge>Cliente</Badge>
                                    <div className='ml-4'>{detalleOrdenCompra?.nombre_cliente}</div>
                                </div>
                                <div className='w-full'>
                                    <Badge>Tipo Moneda</Badge>
                                    <div className='ml-4'>
                                        {detalleOrdenCompra?.tipo_moneda_label}
                                    </div>
                                </div>
                                {detalleOrdenCompra?.cotizacion && (
                                    <div className='w-full'>
                                        <Badge>Cotización</Badge>
                                        <div className='ml-4'>
                                            <a
                                                href={detalleOrdenCompra.cotizacion}
                                                target='_blank'
                                                rel='noopener noreferrer'
                                                className='text-blue-500 underline transition duration-300 hover:text-blue-700'>
                                                Ver Cotización
                                            </a>
                                        </div>
                                    </div>
                                )}
                                {(detalleOrdenCompra?.estado === '4' ||
                                    detalleOrdenCompra?.estado === '5' ||
                                    detalleOrdenCompra?.estado === '6' ||
                                    detalleOrdenCompra?.estado === '7') && (
                                    <>
                                        <div className='w-full'>
                                            <Badge>Dolar</Badge>
                                            <div className='ml-4'>
                                                {detalleOrdenCompra.dolar_observado}
                                            </div>
                                        </div>
                                        <div className='w-full'>
                                            <Badge>Dolar Final</Badge>
                                            <div className='ml-4'>
                                                {detalleOrdenCompra.dolar_final}
                                            </div>
                                        </div>
                                        <div className='w-full'>
                                            <Badge>Fecha de Compra</Badge>
                                            <div className='ml-4'>
                                                {detalleOrdenCompra.fecha_compra}
                                            </div>
                                        </div>
                                    </>
                                )}
                                <div className='col-span-full w-full'>
                                    <Badge>Observaciones</Badge>
                                    <div className='ml-4'>{detalleOrdenCompra?.observaciones}</div>
                                </div>
                            </div>
                        </CardBody>
                    </Card>

                    {estaCompletandoOC && (
                        <Card>
                            <CardHeader>
                                <CardHeaderChild>
                                    <Badge className='text-xl'>Detalle de Compra</Badge>
                                </CardHeaderChild>
                                <CardHeaderChild>
                                    {isEdittingCompra ? (
                                        <div className='flex gap-2'>
                                            <Tooltip text='Guardar'>
                                                <Button
                                                    variant='solid'
                                                    isDisable={isLoadingCompra}
                                                    size='sm'
                                                    onClick={async () => {
                                                        setIsLoadingCompra(true);
                                                        try {
                                                            const necesitaRefreshDolar =
                                                                !dolarManual &&
                                                                Boolean(fechaCompra);
                                                            const payload: any = {
                                                                fecha_compra: fechaCompra,
                                                            };
                                                            if (dolarManual) {
                                                                payload.dolar_observado =
                                                                    dolarObservado;
                                                            }
                                                            const responseFecha =
                                                                await ApiService.fetchData({
                                                                    url: `/api/ordenes-compra/${id}/`,
                                                                    method: 'patch',
                                                                    headers: {
                                                                        'Content-Type':
                                                                            'application/json',
                                                                    },
                                                                    data: JSON.stringify(payload),
                                                                });
                                                            if (responseFecha.data) {
                                                                toast.success(
                                                                    'Detalle de compra actualizado',
                                                                    { autoClose: 1000 },
                                                                );
                                                                refrescarDetalle();
                                                                if (necesitaRefreshDolar) {
                                                                    let intentos = 0;
                                                                    const maxIntentos = 3;
                                                                    const baseDelayMs = 800;
                                                                    const refrescar = () => {
                                                                        intentos += 1;
                                                                        refrescarDetalle();
                                                                        if (
                                                                            intentos < maxIntentos
                                                                        ) {
                                                                            setTimeout(
                                                                                refrescar,
                                                                                baseDelayMs *
                                                                                    intentos,
                                                                            );
                                                                        }
                                                                    };
                                                                    setTimeout(
                                                                        refrescar,
                                                                        baseDelayMs,
                                                                    );
                                                                }
                                                            }
                                                        } catch (error: any) {
                                                            toast.error(
                                                                error.response?.data ||
                                                                    'Error al actualizar la compra',
                                                            );
                                                        }
                                                        setIsLoadingCompra(false);
                                                        setIsEdittingCompra(false);
                                                    }}>
                                                    Guardar
                                                </Button>
                                            </Tooltip>
                                            <Tooltip text='Cancelar'>
                                                <Button
                                                    color='red'
                                                    isDisable={isLoadingCompra}
                                                    size='sm'
                                                    variant='solid'
                                                    onClick={() => {
                                                        setIsEdittingCompra(false);
                                                        setFechaCompra(
                                                            detalleOrdenCompra?.fecha_compra ||
                                                                fechaCompraDefault,
                                                        );
                                                        setDolarObservado(
                                                            detalleOrdenCompra?.dolar_observado ||
                                                                0,
                                                        );
                                                    }}>
                                                    Cancelar
                                                </Button>
                                            </Tooltip>
                                        </div>
                                    ) : (
                                        <Tooltip text='Editar Fecha/Dolar'>
                                            <Button
                                                size='sm'
                                                variant='solid'
                                                onClick={() => {
                                                    setIsEdittingCompra(true);
                                                }}
                                                icon='HeroPencil'></Button>
                                        </Tooltip>
                                    )}
                                </CardHeaderChild>
                            </CardHeader>
                            <CardBody>
                                <div className='grid w-full grid-cols-2 gap-4'>
                                    {isEdittingCompra ? (
                                        <>
                                            <div className='w-full'>
                                                <Badge>Fecha de Compra</Badge>
                                                <Input
                                                    disabled={isLoadingCompra}
                                                    name='fecha_compra'
                                                    type='date'
                                                    value={fechaCompra}
                                                    onChange={(e) => {
                                                        setFechaCompra(e.target.value);
                                                    }}
                                                />
                                            </div>
                                            <div className='w-full'>
                                                <Badge>Dolar Observado</Badge>
                                                <div className='flex w-full items-center gap-2'>
                                                    {dolarManual ? (
                                                        <Input
                                                            name='dolar_observado'
                                                            type='number'
                                                            disabled={isLoadingCompra}
                                                            value={dolarObservado}
                                                            onChange={(e) => {
                                                                setDolarObservado(
                                                                    Number(e.target.value),
                                                                );
                                                            }}
                                                        />
                                                    ) : (
                                                        <div className='ml-4'>{`$${detalleOrdenCompra?.dolar_observado ?? 'Sin Dolar Observado'}`}</div>
                                                    )}
                                                    <Checkbox
                                                        checked={dolarManual}
                                                        label='Manual?'
                                                        onChange={(e) => {
                                                            setDolarManual(e.target.checked);
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                            <div className='mt-2 w-full'>
                                                <Badge>Dolar Final</Badge>
                                                <div className='ml-4'>
                                                    {detalleOrdenCompra?.dolar_final ??
                                                        'Sin Dolar Final'}
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className='w-full'>
                                                <Badge>Fecha de Compra</Badge>
                                                <div className='ml-4'>
                                                    {detalleOrdenCompra?.fecha_compra
                                                        ? dayjs(
                                                              detalleOrdenCompra.fecha_compra,
                                                          ).format('DD-MM-YYYY')
                                                        : 'Sin Fecha'}
                                                </div>
                                            </div>
                                            <div className='w-full'>
                                                <Badge>Dolar Observado</Badge>
                                                <div className='ml-4'>
                                                    {detalleOrdenCompra?.dolar_observado != null
                                                        ? `$${detalleOrdenCompra.dolar_observado}`
                                                        : 'Sin Dolar Observado'}
                                                </div>
                                            </div>
                                            <div className='w-full'>
                                                <Badge>Dolar Final</Badge>
                                                <div className='ml-4'>
                                                    {detalleOrdenCompra?.dolar_final != null
                                                        ? `$${detalleOrdenCompra.dolar_final}`
                                                        : 'Sin Dolar Final'}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </CardBody>
                        </Card>
                    )}

                    {!estaCompletandoOC && (
                        <Card>
                            <CardHeader>
                                <CardHeaderChild>
                                    <Badge className='text-xl'>Items de la Compra</Badge>
                                </CardHeaderChild>
                                <CardHeaderChild className='flex items-center gap-2'>
                                    <AnimacionDeInputModoMovil
                                        globalFilter={globalFilter}
                                        setGlobalFilter={setGlobalFilter}
                                        anchoInput={200}
                                    />
                                    {detalleOrdenCompra?.estado === '-' && (
                                        <OffCanvasAgregarItemsOrdenCompra
                                            id_orden={id}
                                            detalleOrdenCompra={detalleOrdenCompra}
                                        />
                                    )}
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
                                                                        header.column.columnDef
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
                                            {table.getRowModel().rows.length > 0 ? (
                                                table.getRowModel().rows.map((row) => (
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
                                                ))
                                            ) : (
                                                <Tr>
                                                    <Td
                                                        colSpan={columns.length}
                                                        className='py-6 text-center'>
                                                        Sin items en la orden de compra
                                                    </Td>
                                                </Tr>
                                            )}
                                        </TBody>
                                    </Table>
                                    <div className='mt-2 min-w-[600px]'>
                                        <TableCardFooterTemplateV2 table={table} />
                                    </div>
                                    <div className='mt-4 flex min-w-[600px] flex-wrap justify-end gap-6 text-right'>
                                        <div>
                                            <Badge>Neto:</Badge>
                                            <div className='font-semibold'>
                                                ${formatPrice(valorNeto)}{' '}
                                                {detalleOrdenCompra?.tipo_moneda_label}
                                            </div>
                                        </div>
                                        <div>
                                            <Badge>IVA:</Badge>
                                            <div className='font-semibold'>
                                                ${formatPrice(valorIva)}{' '}
                                                {detalleOrdenCompra?.tipo_moneda_label}
                                            </div>
                                        </div>
                                        <div>
                                            <Badge>Total:</Badge>
                                            <div className='font-semibold'>
                                                ${formatPrice(valorTotal)}{' '}
                                                {detalleOrdenCompra?.tipo_moneda_label}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardBody>
                        </Card>
                    )}

                    {estaCompletandoOC && (
                        <Card className='w-full'>
                            <CardHeader>
                                <CardHeaderChild>
                                    <Badge className='text-xl'>Items para recepcion</Badge>
                                </CardHeaderChild>
                            </CardHeader>
                            <CardBody className='z-0'>
                                <div className='overflow-auto'>
                                    <Table className='min-w-[800px] table-fixed'>
                                        <THead>
                                            {tableRecepcion.getHeaderGroups().map((headerGroup) => (
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
                                                                        header.column.columnDef
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
                                            {tableRecepcion.getRowModel().rows.length > 0 ? (
                                                tableRecepcion.getRowModel().rows.map((row) => (
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
                                                ))
                                            ) : (
                                                <Tr>
                                                    <Td
                                                        colSpan={columnsRecepcion.length}
                                                        className='py-6 text-center'>
                                                        Sin items para recepcion
                                                    </Td>
                                                </Tr>
                                            )}
                                        </TBody>
                                    </Table>
                                    <div className='mt-2 min-w-[600px]'>
                                        <TableCardFooterTemplateV2 table={tableRecepcion} />
                                    </div>
                                </div>
                            </CardBody>
                        </Card>
                    )}

                    {detalleOrdenCompra?.estado === '2' && (
                        <Card className='flex justify-center border border-red-500 bg-red-100'>
                            <CardBody className='flex items-center justify-center gap-4'>
                                <Icon
                                    icon='HeroInformationCircle'
                                    size='text-3xl'
                                    className='text-red-700'
                                />
                                <Badge className='text-2xl text-red-700'>
                                    Su solicitud ha sido rechazada
                                </Badge>
                            </CardBody>
                        </Card>
                    )}

                    {detalleOrdenCompra?.estado === '3' && (
                        <Card className='flex justify-center border border-emerald-500 bg-green-100'>
                            <CardBody className='flex items-center justify-center gap-4'>
                                <Icon
                                    icon='HeroInformationCircle'
                                    size='text-3xl'
                                    className='text-emerald-700'
                                />
                                <Badge className='text-2xl text-green-700'>
                                    Su orden ha sido enviada a su proveedor
                                </Badge>
                            </CardBody>
                        </Card>
                    )}

                    {detalleOrdenCompra?.estado === '4' && (
                        <Card className='flex justify-center border border-yellow-500 bg-yellow-100'>
                            <CardBody className='flex items-center justify-center gap-4'>
                                <Icon
                                    icon='HeroInformationCircle'
                                    size='text-3xl'
                                    className='text-yellow-700'
                                />
                                <Badge className='text-2xl text-yellow-700'>
                                    Su orden ha sido parcialmente recibida
                                </Badge>
                            </CardBody>
                        </Card>
                    )}

                    {detalleOrdenCompra?.estado === '5' && (
                        <Card className='flex justify-center border border-green-500 bg-green-100'>
                            <CardBody className='flex items-center justify-center gap-4'>
                                <Icon
                                    icon='HeroInformationCircle'
                                    size='text-3xl'
                                    className='text-green-700'
                                />
                                <Badge className='text-2xl text-green-700'>
                                    ¡Su orden ha sido completada exitosamente!
                                </Badge>
                            </CardBody>
                        </Card>
                    )}
                </div>
            </Container>
        </PageWrapper>
    );
}

export default DetalleOrdenCompraV2;
