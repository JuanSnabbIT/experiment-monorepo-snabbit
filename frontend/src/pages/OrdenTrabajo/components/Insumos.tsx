import { Fragment, useCallback, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
import { toast } from 'react-toastify';
import Icon from '@/components/icon/Icon';
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
import { useAppSelector } from '@/store';
import {
    useComprobarGuiaSalidaMutation,
    useGetDetalleGuiaSalidaQuery,
    useGetDetalleOrdenTrabajoQuery,
    useGetInsumosOrdenTrabajoQuery,
    useGetItemsGuiaSalidaQuery,
} from '@/store/slices/ordenTrabajo/ordenTrabajoApi';
import TableCardFooterTemplateV2 from '@/templates/Table/TableFooterTemplateV2';
import { getErrorMessage } from '@/utils/errorHandlers';
import { confirmAlert } from '@/utils/sweetAlert';
import { IInsumo } from '@/interface/ordenTrabajo.interface';
import ModalConfirmarRecepcionGuia from '../modals/ModalConfirmarRecepcionGuia';
import ModalVincularGuia from '../modals/ModalVincularGuia';
import VincularCotizacion from '../modals/VincularCotizacion';
import AprobarGuiaSalida from '@/pages/Bodegas/GuiaSalida/modals/AprobarGuiaSalida';

type InsumoItemRow = {
    guiaId: number;
    guiaMotivo: string | null;
    guiaEstado: string | null;
    guiaEstadoLabel: string | null;
    guiaClienteNombre: string | null;
    itemId: number;
    itemNombre: string;
    cantidadRebajada: number;
    cantidadDevuelta: number;
    cantidadPendiente: number;
    numeroSerie?: string | null;
    tipoOrigen?: IInsumo['tipo'];
};

const columnHelper = createColumnHelper<InsumoItemRow>();

type ItemEditado = {
    item_guia_id: number;
    cantidad_a_devolver: number;
};

function Insumos() {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const ordenId = id ? Number(id) : undefined;
    const { data: detalleOrdenTrabajo, refetch: refetchDetalleOrdenTrabajo } =
        useGetDetalleOrdenTrabajoQuery(ordenId ?? 0, {
            skip: !ordenId,
        });
    const {
        data: listaInsumos = [],
        refetch: refetchInsumosOrdenTrabajo,
    } = useGetInsumosOrdenTrabajoQuery(ordenId ?? 0, {
        skip: !ordenId,
    });
    const { listaVouchers = [] } = useAppSelector((state) => state.bodega ?? { listaVouchers: [] });

    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState<string>('');
    const [isOpenDetail, setIsOpenDetail] = useState(false);
    const [selectedGuiaId, setSelectedGuiaId] = useState<number | null>(null);
    const {
        data: selectedGuia,
        isFetching: cargandoGuia,
        refetch: refetchDetalleGuia,
    } = useGetDetalleGuiaSalidaQuery(selectedGuiaId ?? 0, {
        skip: !selectedGuiaId,
    });
    const {
        data: itemsGuia = [],
        isFetching: cargandoItems,
    } = useGetItemsGuiaSalidaQuery(selectedGuiaId ?? 0, {
        skip: !selectedGuiaId,
    });
    const [isOpenConfirmar, setIsOpenConfirmar] = useState(false);
    const [isOpenVincular, setIsOpenVincular] = useState(false);
    const [isOpenVincularCotizacion, setIsOpenVincularCotizacion] = useState(false);
    const [isEditingDevolucion, setIsEditingDevolucion] = useState(false);
    const [itemsEditados, setItemsEditados] = useState<ItemEditado[]>([]);
    const [itemsPendientesFirma, setItemsPendientesFirma] = useState<ItemEditado[]>([]);
    const [errorDevolucion, setErrorDevolucion] = useState('');
    const [cargandoDevolucion, setCargandoDevolucion] = useState(false);
    const [comprobarGuiaSalida] = useComprobarGuiaSalidaMutation();
    const [completandoGuia, setCompletandoGuia] = useState(false);
    const [isOpenAprobar, setIsOpenAprobar] = useState(false);
    const completarGuia = async () => {
        if (!selectedGuia?.id) return;
        const ok = await confirmAlert({
            title: 'Completar guía de salida',
            text: '¿Estás seguro de completar esta guía de salida?',
            confirmText: 'Completar',
            cancelText: 'Cancelar',
            icon: 'warning',
        });
        if (!ok) return;
        setCompletandoGuia(true);
        try {
            await comprobarGuiaSalida(selectedGuia.id).unwrap();
            toast.success('Guía completada', { autoClose: 1200 });
            // RTK Query invalidatesTags automatically refreshes caches
        } catch (e: unknown) {
            toast.error(getErrorMessage(e) || 'No se pudo completar la guía');
        } finally {
            setCompletandoGuia(false);
        }
    };

    const hayDevolucionesDesdeGuias = useMemo(() => {
        if (!detalleOrdenTrabajo) return false;
        return listaVouchers
            .filter((voucher) => voucher.orden_trabajo === detalleOrdenTrabajo.id)
            .some((voucher) =>
                (Array.isArray(voucher.movimientos_agrupados)
                    ? voucher.movimientos_agrupados
                    : []
                ).some((grupo) => grupo.origen_tipo === 'GuíaSalida'),
            );
    }, [detalleOrdenTrabajo, listaVouchers]);

    const buildItemsEditados = useCallback((): ItemEditado[] => {
        return (itemsGuia || []).map((item) => ({
            item_guia_id: item.id,
            cantidad_a_devolver: 0,
        }));
    }, [itemsGuia]);

    const handleStartEditing = () => {
        setItemsEditados(buildItemsEditados());
        setIsEditingDevolucion(true);
        setErrorDevolucion('');
    };

    const handleCancelEditing = () => {
        setIsEditingDevolucion(false);
        setErrorDevolucion('');
    };

    const handleChangeCantidadDevuelta = (itemId: number, valor: number) => {
        const item = itemsGuia.find((i) => i.id === itemId);
        if (!item) return;
        const max = Math.max(item.cantidad_rebajada - item.cantidad_devuelta, 0);
        const normalizado = Math.max(0, Math.min(valor, max));
        setItemsEditados((prev) =>
            prev.map((it) =>
                it.item_guia_id === itemId ? { ...it, cantidad_a_devolver: normalizado } : it,
            ),
        );
    };

    const handleConfirmarDevoluciones = async () => {
        if (!selectedGuia) return;
        const payloadBase = itemsEditados.length ? itemsEditados : buildItemsEditados();
        const payload = payloadBase
            .map((it) => ({
                item_guia_id: it.item_guia_id,
                cantidad_a_devolver: Math.max(0, it.cantidad_a_devolver || 0),
            }))
            .filter((it) => it.cantidad_a_devolver > 0);

        setCargandoDevolucion(true);
        setErrorDevolucion('');
        try {
            setItemsPendientesFirma(payload);
            setIsEditingDevolucion(false);
            setIsOpenConfirmar(true);
        } finally {
            setCargandoDevolucion(false);
        }
    };

    const openDetail = useCallback(async (guiaId: number | null) => {
        if (!guiaId) {
            toast.error('No se pudo abrir el detalle: guía sin identificador');
            return;
        }
        setSelectedGuiaId(guiaId);
        setIsOpenDetail(true);
    }, []);

    const columns = useMemo(
        () => [
            columnHelper.accessor((row) => row.itemNombre, {
                id: 'item_nombre',
                header: 'Item',
                cell: (info) => info.getValue(),
            }),
            columnHelper.accessor((row) => row.cantidadRebajada, {
                id: 'cant_rebajada',
                header: 'Cant. rebajada',
                size: 120,
                cell: (info) => info.getValue(),
            }),
            columnHelper.accessor((row) => row.cantidadDevuelta, {
                id: 'cant_devuelta',
                header: 'Cant. devuelta',
                size: 120,
                cell: (info) => info.getValue(),
            }),
            columnHelper.accessor((row) => row.cantidadPendiente, {
                id: 'cant_pendiente',
                header: 'Pendiente',
                size: 110,
                cell: (info) => info.getValue(),
            }),
            columnHelper.accessor((row) => row.numeroSerie ?? null, {
                id: 'numero_serie',
                header: 'N° Serie',
                size: 140,
                cell: (info) => info.getValue() || '-',
            }),
        ],
        [openDetail],
    );

    const dataFiltrada: InsumoItemRow[] = useMemo(() => {
        if (!listaInsumos) return [];
        const filas: InsumoItemRow[] = [];
        listaInsumos.forEach((insumo) => {
            if (!insumo.guia || !insumo.items?.length) return;
            insumo.items.forEach((item) => {
                const rebajada = item.cantidad_rebajada ?? 0;
                const devuelta = item.cantidad_devuelta ?? 0;
                filas.push({
                    guiaId: insumo.guia?.id ?? item.guia_id ?? item.guia ?? 0,
                    guiaMotivo: insumo.guia?.motivo ?? null,
                    guiaEstado: insumo.guia?.estado ?? null,
                    guiaEstadoLabel: insumo.guia?.estado_label ?? null,
                    guiaClienteNombre: insumo.guia?.cliente_nombre ?? null,
                    itemId: item.id,
                    itemNombre:
                        item.datos_stock?.datos_item?.nombre ||
                        item.datos_stock?.datos_item?.descripcion_corta ||
                        'Sin nombre',
                    cantidadRebajada: rebajada,
                    cantidadDevuelta: devuelta,
                    cantidadPendiente: Math.max(rebajada - devuelta, 0),
                    numeroSerie: item.numero_serie?.serie ?? null,
                    tipoOrigen: insumo.tipo,
                });
            });
        });
        return filas;
    }, [listaInsumos]);

    const table = useReactTable({
        data: dataFiltrada,
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

    const paginatedRows = table.getRowModel().rows;
    const columnCount = table.getVisibleFlatColumns().length;

    const groupedRows = useMemo(() => {
        const map = new Map<
            number | null,
            {
                guiaId: number | null;
                guiaEstadoLabel: string | null;
                guiaClienteNombre: string | null;
                tipoOrigen?: IInsumo['tipo'];
                rows: typeof paginatedRows;
                totalRebajada: number;
                totalDevuelta: number;
                totalPendiente: number;
            }
        >();

        paginatedRows.forEach((row) => {
            const {
                guiaId = null,
                guiaEstadoLabel = null,
                guiaClienteNombre = null,
                tipoOrigen = undefined,
                cantidadRebajada = 0,
                cantidadDevuelta = 0,
                cantidadPendiente = 0,
            } = row.original;
            if (!map.has(guiaId)) {
                map.set(guiaId, {
                    guiaId,
                    guiaEstadoLabel,
                    guiaClienteNombre,
                    tipoOrigen,
                    rows: [],
                    totalRebajada: 0,
                    totalDevuelta: 0,
                    totalPendiente: 0,
                });
            }
            const grupo = map.get(guiaId)!;
            grupo.rows.push(row);
            grupo.totalRebajada += cantidadRebajada;
            grupo.totalDevuelta += cantidadDevuelta;
            grupo.totalPendiente += cantidadPendiente;
        });

        return Array.from(map.values());
    }, [paginatedRows]);

    return (
        <>
            <Card>
                <CardHeader>
                    <CardHeaderChild>
                        <Badge className='text-xl'>Insumos ({dataFiltrada.length})</Badge>
                    </CardHeaderChild>
                    <CardHeaderChild className='ml-auto flex items-center gap-3'>
                        {detalleOrdenTrabajo && hayDevolucionesDesdeGuias && (
                            <Tooltip text='Ver devoluciones de guías'>
                                <Button
                                    variant='outline'
                                    size='sm'
                                    color='blue'
                                    icon='HeroDocumentDuplicate'
                                    onClick={() =>
                                        navigate(
                                            `/bodega/devoluciones?orden_trabajo=${detalleOrdenTrabajo.id}`,
                                        )
                                    }
                                />
                            </Tooltip>
                        )}
                        <div className='flex items-center gap-2'>
                            {detalleOrdenTrabajo?.estado === 'pendiente' && (
                                <Tooltip text='Vincular guía de salida'>
                                    <Button
                                        variant='solid'
                                        size='sm'
                                        color='blue'
                                        icon='HeroPlus'
                                        onClick={() => setIsOpenVincular(true)}
                                    />
                                </Tooltip>
                            )}
                            {detalleOrdenTrabajo?.estado === 'pendiente' && (
                                <Tooltip text='Vincular cotización'>
                                    <Button
                                        variant='solid'
                                        size='sm'
                                        color='emerald'
                                        icon='HeroLink'
                                        onClick={() => setIsOpenVincularCotizacion(true)}
                                    />
                                </Tooltip>
                            )}
                            <AnimacionDeInputModoMovil
                                globalFilter={globalFilter}
                                setGlobalFilter={setGlobalFilter}
                                anchoInput={220}
                            />
                        </div>
                    </CardHeaderChild>
                </CardHeader>
                <CardBody className='z-0'>
                    {dataFiltrada.length > 0 ? (
                        <div className='overflow-x-auto'>
                            <Table className='min-w-[1000px]'>
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
                                    {groupedRows.map((group) => (
                                        <Fragment key={`guia-${group.guiaId ?? 'sin'}`}>
                                            <Tr className='border-l-4 border-blue-500 bg-gradient-to-r from-blue-50 to-indigo-50'>
                                                <Td colSpan={columnCount} className='px-4 py-3'>
                                                    <div className='flex flex-wrap items-center justify-between gap-4'>
                                                        <div className='flex flex-wrap items-center gap-4'>
                                                            <div className='flex items-center gap-2'>
                                                                <Icon
                                                                    icon='HeroDocumentText'
                                                                    className='text-blue-600'
                                                                    size='text-lg'
                                                                />
                                                                <span className='text-base font-bold text-slate-800'>
                                                                    {group.guiaId
                                                                        ? `Guía de salida #${group.guiaId}`
                                                                        : 'Guía sin número'}
                                                                </span>
                                                            </div>

                                                            <div className='h-6 w-px bg-slate-300' />

                                                            <div className='flex flex-wrap items-center gap-3'>
                                                                <Badge
                                                                    color='zinc'
                                                                    variant='solid'
                                                                    className='font-medium'>
                                                                    {group.guiaEstadoLabel ||
                                                                        'Sin estado'}
                                                                </Badge>

                                                                {group.tipoOrigen && (
                                                                    <Badge
                                                                        color='blue'
                                                                        variant='outline'
                                                                        className='font-medium'>
                                                                        {group.tipoOrigen}
                                                                    </Badge>
                                                                )}

                                                                {group.guiaClienteNombre && (
                                                                    <div className='flex items-center gap-1.5 text-sm text-slate-600'>
                                                                        <Icon
                                                                            icon='HeroUser'
                                                                            size='text-sm'
                                                                        />
                                                                        <span className='font-medium'>
                                                                            {
                                                                                group.guiaClienteNombre
                                                                            }
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            <div className='h-6 w-px bg-slate-300' />

                                                            <div className='flex flex-wrap items-center gap-4 text-xs'>
                                                                <div className='flex flex-col'>
                                                                    <span className='text-[10px] uppercase tracking-wide text-slate-500'>
                                                                        Items
                                                                    </span>
                                                                    <span className='text-sm font-bold text-slate-700'>
                                                                        {group.rows.length}
                                                                    </span>
                                                                </div>
                                                                <div className='flex flex-col'>
                                                                    <span className='text-[10px] uppercase tracking-wide text-slate-500'>
                                                                        Rebajada
                                                                    </span>
                                                                    <span className='text-sm font-bold text-slate-700'>
                                                                        {group.totalRebajada}
                                                                    </span>
                                                                </div>
                                                                <div className='flex flex-col'>
                                                                    <span className='text-[10px] uppercase tracking-wide text-slate-500'>
                                                                        Devuelta
                                                                    </span>
                                                                    <span className='text-sm font-bold text-green-600'>
                                                                        {group.totalDevuelta}
                                                                    </span>
                                                                </div>
                                                                <div className='flex flex-col'>
                                                                    <span className='text-[10px] uppercase tracking-wide text-slate-500'>
                                                                        Pendiente
                                                                    </span>
                                                                    <span className='text-sm font-bold text-orange-600'>
                                                                        {group.totalPendiente}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className='flex items-center gap-2'>
                                                            <Tooltip text='Ver detalle de guía de salida'>
                                                                <Button
                                                                    variant='solid'
                                                                    size='sm'
                                                                    color='violet'
                                                                    icon='HeroEye'
                                                                    onClick={(event) => {
                                                                        event.stopPropagation();
                                                                        openDetail(
                                                                            group.guiaId ?? null,
                                                                        );
                                                                    }}
                                                                    isDisable={!group.guiaId}>
                                                                    Detalle
                                                                </Button>
                                                            </Tooltip>
                                                        </div>
                                                    </div>
                                                </Td>
                                            </Tr>
                                            {group.rows.map((row) => (
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
                                        </Fragment>
                                    ))}
                                </TBody>
                            </Table>
                            <div className='mt-2'>
                                <TableCardFooterTemplateV2 table={table} />
                            </div>
                        </div>
                    ) : (
                        <div className='py-6 text-center text-gray-500'>
                            <p>No hay items de guías vinculados a esta Orden de Trabajo</p>
                        </div>
                    )}
                </CardBody>
            </Card>

            <Modal isOpen={isOpenDetail} setIsOpen={setIsOpenDetail}>
                <ModalHeader className='flex items-center justify-between'>
                    <Badge>Detalle Guía de Salida</Badge>
                    {selectedGuia && (
                        <Tooltip text='Ver detalle completo de la guía'>
                            <Button
                                color='blue'
                                variant='solid'
                                size='sm'
                                icon='HeroArrowTopRightOnSquare'
                                onClick={() => {
                                    navigate(
                                        `/bodega/detalle-guia-salida-bodega/${selectedGuia.id}`,
                                    );
                                    setIsOpenDetail(false);
                                }}>
                                Ir a
                            </Button>
                        </Tooltip>
                    )}
                </ModalHeader>
                <ModalBody>
                    {selectedGuia ? (
                        <>
                            <div className='grid grid-cols-2 gap-4'>
                                <div>
                                    <Badge>Estado</Badge>
                                    <div className='ml-4 flex items-center gap-2'>
                                        <Button
                                            size='sm'
                                            variant='solid'
                                            color='blue'
                                            isDisable={true}>
                                            {selectedGuia.estado_label}
                                        </Button>
                                        {selectedGuia.estado === 'P' && (
                                            <Button
                                                size='sm'
                                                variant='solid'
                                                color='emerald'
                                                isDisable={completandoGuia}
                                                onClick={completarGuia}>
                                                Completar
                                            </Button>
                                        )}
                                        {/* Botón para firmar/aprobar guía desde la OT */}
                                        {selectedGuia.estado === 'ER' && (
                                            <Button
                                                size='sm'
                                                variant='solid'
                                                color='blue'
                                                onClick={() => setIsOpenAprobar(true)}>
                                                Firmar
                                            </Button>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <Badge>Creado Por</Badge>
                                    <div className='ml-4'>
                                        {selectedGuia.nombre_creado_por || '-'}
                                    </div>
                                </div>
                                <div>
                                    <Badge>Recibido Por</Badge>
                                    <div className='ml-4'>
                                        {selectedGuia.nombre_recibido_por || '-'}
                                    </div>
                                </div>
                                <div>
                                    <Badge>Cliente</Badge>
                                    <div className='ml-4'>{selectedGuia.cliente_nombre || '-'}</div>
                                </div>
                                <div>
                                    <Badge>Motivo</Badge>
                                    <div className='ml-4'>
                                        {selectedGuia.motivo || 'Sin Motivo'}
                                    </div>
                                </div>
                                <div>
                                    <Badge>Fecha Creación</Badge>
                                    <div className='ml-4'>
                                        {dayjs(selectedGuia.fecha_creacion)
                                            .locale('es')
                                            .format('DD/MM/YYYY')}
                                    </div>
                                </div>
                            </div>
                            <div className='mt-4'>
                                <div className='mb-3 flex items-center justify-between gap-3'>
                                    <Badge className='text-base'>Items en la Guía</Badge>
                                    <div className='flex items-center gap-3'>
                                        <span className='text-xs text-gray-500'>
                                            {itemsGuia.length} item
                                            {itemsGuia.length !== 1 ? 's' : ''}
                                        </span>
                                    </div>
                                </div>
                                <div className='mt-2 max-h-64 overflow-auto rounded-lg border border-gray-200 bg-gray-50'>
                                    {cargandoItems || cargandoGuia ? (
                                        <div className='flex items-center justify-center py-8'>
                                            <div className='text-sm text-gray-500'>
                                                Cargando items...
                                            </div>
                                        </div>
                                    ) : itemsGuia.length > 0 ? (
                                        <div className='overflow-x-auto'>
                                            <table className='min-w-full divide-y divide-gray-200'>
                                                <thead className='bg-gray-100'>
                                                    <tr>
                                                        <th className='px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700'>
                                                            Item
                                                        </th>
                                                        <th className='px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700'>
                                                            Cantidad Original
                                                        </th>
                                                        <th className='px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700'>
                                                            Cantidad Rebajada
                                                        </th>
                                                        <th className='px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700'>
                                                            Cantidad Devuelta
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className='divide-y divide-gray-200 bg-white'>
                                                    {itemsGuia.map((item, idx) => (
                                                        <tr
                                                            key={item.id}
                                                            className={
                                                                idx % 2 === 0
                                                                    ? 'bg-white'
                                                                    : 'bg-gray-50'
                                                            }>
                                                            <td className='px-4 py-3 text-sm text-gray-900'>
                                                                {item.datos_stock?.datos_item
                                                                    ?.nombre || 'Sin nombre'}
                                                            </td>
                                                            <td className='px-4 py-3 text-sm text-gray-900'>
                                                                {item.cantidad_original}
                                                            </td>
                                                            <td className='px-4 py-3 text-sm text-gray-900'>
                                                                {item.cantidad_rebajada}
                                                            </td>
                                                            <td className='px-4 py-3 text-sm text-gray-900'>
                                                                {isEditingDevolucion ? (
                                                                    <div>
                                                                        <input
                                                                            type='number'
                                                                            min='0'
                                                                            max={Math.max(
                                                                                item.cantidad_rebajada -
                                                                                    item.cantidad_devuelta,
                                                                                0,
                                                                            )}
                                                                            value={
                                                                                itemsEditados.find(
                                                                                    (it) =>
                                                                                        it.item_guia_id ===
                                                                                        item.id,
                                                                                )
                                                                                    ?.cantidad_a_devolver ||
                                                                                0
                                                                            }
                                                                            onChange={(e) =>
                                                                                handleChangeCantidadDevuelta(
                                                                                    item.id,
                                                                                    parseInt(
                                                                                        e.target
                                                                                            .value,
                                                                                    ) || 0,
                                                                                )
                                                                            }
                                                                            className='w-full rounded border border-gray-300 px-2 py-1 text-sm'
                                                                        />
                                                                        <p className='mt-1 text-xs text-gray-500'>
                                                                            Actual:{' '}
                                                                            {item.cantidad_devuelta}
                                                                        </p>
                                                                    </div>
                                                                ) : (
                                                                    item.cantidad_devuelta
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <div className='flex flex-col items-center justify-center py-8'>
                                            <span className='mb-2 text-4xl'>📦</span>
                                            <p className='text-sm font-medium text-gray-600'>
                                                No hay items registrados
                                            </p>
                                            <p className='text-xs text-gray-500'>
                                                Esta guía no tiene items asociados
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
                    <ModalFooterChild>
                        {errorDevolucion && (
                            <span className='text-sm text-red-600'>{errorDevolucion}</span>
                        )}
                    </ModalFooterChild>
                    <ModalFooterChild className='flex gap-2'>
                        {isEditingDevolucion ? (
                            <>
                                <Button
                                    variant='outline'
                                    color='gray'
                                    onClick={handleCancelEditing}>
                                    Cancelar
                                </Button>
                                <Button
                                    color='blue'
                                    variant='solid'
                                    isLoading={cargandoDevolucion}
                                    onClick={handleConfirmarDevoluciones}>
                                    Aceptar
                                </Button>
                            </>
                        ) : (
                            <>
                                {selectedGuia && selectedGuia.estado === 'ET' && (
                                    <Button
                                        color='emerald'
                                        variant='solid'
                                        onClick={handleStartEditing}>
                                        Completar
                                    </Button>
                                )}
                                <Button color='red' onClick={() => setIsOpenDetail(false)}>
                                    Cerrar
                                </Button>
                            </>
                        )}
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>

            {selectedGuia && detalleOrdenTrabajo && (
                <ModalConfirmarRecepcionGuia
                    isOpen={isOpenConfirmar}
                    setIsOpen={setIsOpenConfirmar}
                    guiaId={selectedGuia.id}
                    items={itemsPendientesFirma}
                    clienteSolicitanteId={detalleOrdenTrabajo.cliente_solicitante}
                    clienteSolicitanteNombre={detalleOrdenTrabajo.nombre_solicitante}
                    onSuccess={() => {
                        refetchDetalleGuia();
                        refetchInsumosOrdenTrabajo();
                        refetchDetalleOrdenTrabajo();
                        setIsOpenConfirmar(false);
                        setItemsPendientesFirma([]);
                        setIsOpenDetail(false);
                        // RTK Query cache invalidates automatically
                    }}
                />
            )}

            {/* Modal para que el técnico firme y apruebe la guía */}
            {selectedGuia && detalleOrdenTrabajo && (
                <AprobarGuiaSalida
                    id_guia={selectedGuia.id}
                    bodegaSelected={detalleOrdenTrabajo?.empresa?.toString()}
                    isOpen={isOpenAprobar}
                    setIsOpen={setIsOpenAprobar}
                    onSuccess={() => {
                        refetchDetalleGuia();
                        refetchInsumosOrdenTrabajo();
                        refetchDetalleOrdenTrabajo();
                        setIsOpenAprobar(false);
                        setIsOpenDetail(false);
                        // RTK Query cache invalidates automatically
                    }}
                />
            )}
            {detalleOrdenTrabajo && (
                <VincularCotizacion
                    isOpen={isOpenVincularCotizacion}
                    setIsOpen={setIsOpenVincularCotizacion}
                    entityType='orden-trabajo'
                    entityId={detalleOrdenTrabajo.id}
                    ordenId={detalleOrdenTrabajo.id}
                    entityName='Orden de Trabajo'
                    clienteId={detalleOrdenTrabajo.cliente}
                    onSuccess={() => {
                        setIsOpenVincularCotizacion(false);
                    }}
                />
            )}
            {detalleOrdenTrabajo && (
                <ModalVincularGuia
                    isOpen={isOpenVincular}
                    setIsOpen={setIsOpenVincular}
                    otId={detalleOrdenTrabajo.id}
                    targetType='direct_ot'
                    onSuccess={() => {
                        refetchInsumosOrdenTrabajo();
                        refetchDetalleOrdenTrabajo();
                    }}
                />
            )}
        </>
    );
}

export default Insumos;
