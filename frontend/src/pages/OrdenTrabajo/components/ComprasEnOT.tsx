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
import { ICompra, IItemEnCompra } from '@/interface/bodega.interface';
import { useAppSelector } from '@/store';
import {
    useGetComprasEnOTQuery,
    useGetDetalleOrdenTrabajoQuery,
    useLazyGetItemsCompraQuery,
} from '@/store/slices/ordenTrabajo/ordenTrabajoApi';
import { toast } from 'react-toastify';
import TableCardFooterTemplateV2 from '@/templates/Table/TableFooterTemplateV2';
import { getErrorMessage } from '@/utils/errorHandlers';
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
import { Fragment, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import CrearCompraRapidaEnOT from '../modals/CrearCompraRapidaEnOT';
import VincularCompraEnOT from '../modals/VincularCompraEnOT';

type CompraItemRow = {
    compraId: number;
    compraCodigo: string;
    compraFecha: string | null;
    compraTotal: number;
    compraEstadoLabel: string;
    compraComprador: string;
    itemId: number;
    itemNombre: string;
    cantidad: number;
    precio: number;
    subtotal: number;
    isPlaceholder?: boolean;
    placeholderLabel?: string;
};

const columnHelper = createColumnHelper<CompraItemRow>();

function ComprasEnOT() {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const ordenId = id ? Number(id) : undefined;
    const { data: detalleOrdenTrabajo } = useGetDetalleOrdenTrabajoQuery(ordenId ?? 0, {
        skip: !ordenId,
    });
    const { data: listaComprasEnOT = [] } = useGetComprasEnOTQuery(ordenId ?? 0, {
        skip: !ordenId,
    });
    const [getItemsCompra] = useLazyGetItemsCompraQuery();
    const { listaVouchers = [] } = useAppSelector((state) => state.bodega ?? { listaVouchers: [] });
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState<string>('');
    const [isOpenDetail, setIsOpenDetail] = useState(false);
    const [selectedCompra, setSelectedCompra] = useState<ICompra | null>(null);
    const [itemsCompra, setItemsCompra] = useState<IItemEnCompra[]>([]);
    const [cargandoItems, setCargandoItems] = useState(false);
    const [itemsPorCompra, setItemsPorCompra] = useState<Record<number, IItemEnCompra[]>>({});
    const [loadingItemsPorCompra, setLoadingItemsPorCompra] = useState<Record<number, boolean>>({});

    useEffect(() => {
        const cargarItems = async () => {
            if (!listaComprasEnOT.length) {
                setItemsPorCompra({});
                setLoadingItemsPorCompra({});
                return;
            }

            const nuevasCargas: Record<number, boolean> = {};
            listaComprasEnOT.forEach((compra) => {
                nuevasCargas[compra.id] = true;
            });
            setLoadingItemsPorCompra(nuevasCargas);

            try {
                const respuestas = await Promise.all(
                    listaComprasEnOT.map(async (compra) => {
                        const items = await getItemsCompra(compra.id).unwrap();
                        return { compraId: compra.id, items: items || [] };
                    }),
                );

                const itemsMap: Record<number, IItemEnCompra[]> = {};
                const loadingMap: Record<number, boolean> = {};
                respuestas.forEach(({ compraId, items }) => {
                    itemsMap[compraId] = items;
                    loadingMap[compraId] = false;
                });
                setItemsPorCompra(itemsMap);
                setLoadingItemsPorCompra(loadingMap);
            } catch (error: unknown) {
                toast.error(getErrorMessage(error) || 'No se pudieron cargar los items');
                setLoadingItemsPorCompra({});
            }
        };

        cargarItems();
    }, [getItemsCompra, listaComprasEnOT]);

    const hayDevolucionesDesdeCompras = useMemo(() => {
        if (!detalleOrdenTrabajo) return false;
        return listaVouchers
            .filter((voucher) => voucher.orden_trabajo === detalleOrdenTrabajo.id)
            .some((voucher) =>
                (Array.isArray(voucher.movimientos_agrupados)
                    ? voucher.movimientos_agrupados
                    : []
                ).some((grupo) => grupo.origen_tipo === 'Compra'),
            );
    }, [detalleOrdenTrabajo, listaVouchers]);

    const fetchItemsCompra = async (compraId: number) => {
        setCargandoItems(true);
        try {
            const items = await getItemsCompra(compraId).unwrap();
            setItemsCompra(items || []);
            setItemsPorCompra((prev) => ({ ...prev, [compraId]: items || [] }));
        } catch (error: unknown) {
            toast.error(getErrorMessage(error) || 'No se pudieron cargar los items de la compra');
        } finally {
            setCargandoItems(false);
        }
    };

    const openDetail = (compra: ICompra) => {
        setSelectedCompra(compra);
        setIsOpenDetail(true);
    };

    useEffect(() => {
        if (isOpenDetail && selectedCompra?.id) {
            fetchItemsCompra(selectedCompra.id);
        }
        if (!isOpenDetail) {
            setItemsCompra([]);
        }
    }, [isOpenDetail, selectedCompra]);

    const columns = [
        columnHelper.accessor('itemNombre', {
            cell: (info) =>
                info.row.original.isPlaceholder
                    ? info.row.original.placeholderLabel || 'Sin items'
                    : info.getValue(),
            header: 'Item',
        }),
        columnHelper.accessor('cantidad', {
            cell: (info) => (info.row.original.isPlaceholder ? '-' : info.getValue()),
            header: 'Cantidad',
        }),
        columnHelper.accessor('precio', {
            cell: (info) => {
                if (info.row.original.isPlaceholder) return '-';
                const precio = info.getValue();
                return `$${precio.toLocaleString('es-CL')}`;
            },
            header: 'Precio Unitario',
        }),
        columnHelper.accessor('subtotal', {
            cell: (info) => {
                if (info.row.original.isPlaceholder) return '-';
                const subtotal = info.getValue();
                return `$${subtotal.toLocaleString('es-CL')}`;
            },
            header: 'Subtotal',
        }),
    ];

    const dataFiltrada: CompraItemRow[] = useMemo(() => {
        if (!listaComprasEnOT.length) return [];
        const filas: CompraItemRow[] = [];
        listaComprasEnOT.forEach((compra) => {
            const items = itemsPorCompra[compra.id] || [];
            const estaCargando = loadingItemsPorCompra[compra.id];
            if (!items.length) {
                filas.push({
                    compraId: compra.id,
                    compraCodigo: compra.codigo,
                    compraFecha: compra.fecha_compra,
                    compraTotal: compra.total_compra,
                    compraEstadoLabel: compra.estado_label || compra.estado,
                    compraComprador: compra.nombre_creado_por || '-',
                    itemId: -compra.id,
                    itemNombre: estaCargando ? 'Cargando items...' : 'Sin items',
                    cantidad: 0,
                    precio: 0,
                    subtotal: 0,
                    isPlaceholder: true,
                    placeholderLabel: estaCargando ? 'Cargando items...' : 'Sin items',
                });
                return;
            }

            items.forEach((item) => {
                const subtotal = item.cantidad * item.precio;
                filas.push({
                    compraId: compra.id,
                    compraCodigo: compra.codigo,
                    compraFecha: compra.fecha_compra,
                    compraTotal: compra.total_compra,
                    compraEstadoLabel: compra.estado_label || compra.estado,
                    compraComprador: compra.nombre_creado_por || '-',
                    itemId: item.id,
                    itemNombre: item.nombre_item,
                    cantidad: item.cantidad,
                    precio: item.precio,
                    subtotal,
                });
            });
        });
        return filas;
    }, [itemsPorCompra, listaComprasEnOT, loadingItemsPorCompra]);

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
            number,
            {
                compraId: number;
                compraCodigo: string;
                compraFecha: string | null;
                compraTotal: number;
                compraEstadoLabel: string;
                compraComprador: string;
                rows: typeof paginatedRows;
                totalItems: number;
                totalCantidad: number;
                totalSubtotal: number;
            }
        >();

        paginatedRows.forEach((row) => {
            const {
                compraId,
                compraCodigo,
                compraFecha,
                compraTotal,
                compraEstadoLabel,
                compraComprador,
                cantidad,
                subtotal,
                isPlaceholder,
            } = row.original;

            if (!map.has(compraId)) {
                map.set(compraId, {
                    compraId,
                    compraCodigo,
                    compraFecha,
                    compraTotal,
                    compraEstadoLabel,
                    compraComprador,
                    rows: [],
                    totalItems: 0,
                    totalCantidad: 0,
                    totalSubtotal: 0,
                });
            }

            const grupo = map.get(compraId)!;
            grupo.rows.push(row);
            if (!isPlaceholder) {
                grupo.totalItems += 1;
                grupo.totalCantidad += cantidad;
                grupo.totalSubtotal += subtotal;
            }
        });

        return Array.from(map.values());
    }, [paginatedRows]);

    return (
        <>
            <Card>
                <CardHeader>
                    <CardHeaderChild>
                        <Badge className='text-xl'>Compras en OT ({listaComprasEnOT.length})</Badge>
                    </CardHeaderChild>
                    <CardHeaderChild className='flex gap-2'>
                        <AnimacionDeInputModoMovil
                            globalFilter={globalFilter}
                            setGlobalFilter={setGlobalFilter}
                            anchoInput={200}
                        />
                        {detalleOrdenTrabajo && (
                            <>
                                {detalleOrdenTrabajo.estado === 'en_proceso' && (
                                    <>
                                        <CrearCompraRapidaEnOT />
                                        <VincularCompraEnOT />
                                    </>
                                )}
                                {hayDevolucionesDesdeCompras && (
                                    <Tooltip text='Ver devoluciones de compras'>
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
                            </>
                        )}
                    </CardHeaderChild>
                </CardHeader>
                <CardBody className='z-0'>
                    {listaComprasEnOT.length > 0 ? (
                        <div className='overflow-y-scroll'>
                            <Table className='min-w-full'>
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
                                        <Fragment key={`compra-${group.compraId}`}>
                                            <Tr className='border-l-4 border-emerald-500 bg-gradient-to-r from-emerald-50 to-teal-50 dark:border-emerald-400 dark:from-emerald-950/40 dark:to-teal-950/30'>
                                                <Td colSpan={columnCount} className='px-4 py-3'>
                                                    <div className='flex flex-wrap items-center justify-between gap-4'>
                                                        <div className='flex flex-wrap items-center gap-4'>
                                                            <div className='flex items-center gap-2'>
                                                                <Icon
                                                                    icon='HeroShoppingCart'
                                                                    className='text-emerald-600'
                                                                    size='text-lg'
                                                                />
                                                                <span className='text-base font-bold text-slate-800 dark:text-zinc-100'>
                                                                    Compra{' '}
                                                                    {group.compraCodigo ||
                                                                        `#${group.compraId}`}
                                                                </span>
                                                            </div>

                                                            <div className='h-6 w-px bg-slate-300 dark:bg-zinc-700' />

                                                            <div className='flex flex-wrap items-center gap-3'>
                                                                <Badge
                                                                    color='zinc'
                                                                    variant='solid'
                                                                    className='font-medium'>
                                                                    {group.compraEstadoLabel ||
                                                                        'Sin estado'}
                                                                </Badge>
                                                                <div className='flex items-center gap-1.5 text-sm text-slate-600 dark:text-zinc-300'>
                                                                    <Icon
                                                                        icon='HeroUser'
                                                                        size='text-sm'
                                                                    />
                                                                    <span className='font-medium'>
                                                                        {group.compraComprador ||
                                                                            '-'}
                                                                    </span>
                                                                </div>
                                                                {group.compraFecha && (
                                                                    <div className='flex items-center gap-1.5 text-sm text-slate-600 dark:text-zinc-300'>
                                                                        <Icon
                                                                            icon='HeroCalendarDays'
                                                                            size='text-sm'
                                                                        />
                                                                        <span className='font-medium'>
                                                                            {dayjs(
                                                                                group.compraFecha,
                                                                            )
                                                                                .locale('es')
                                                                                .format(
                                                                                    'DD/MM/YYYY',
                                                                                )}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            <div className='h-6 w-px bg-slate-300 dark:bg-zinc-700' />

                                                            <div className='flex flex-wrap items-center gap-4 text-xs'>
                                                                <div className='flex flex-col'>
                                                                    <span className='text-[10px] uppercase tracking-wide text-slate-500 dark:text-zinc-400'>
                                                                        Items
                                                                    </span>
                                                                    <span className='text-sm font-bold text-slate-700 dark:text-zinc-200'>
                                                                        {group.totalItems}
                                                                    </span>
                                                                </div>
                                                                <div className='flex flex-col'>
                                                                    <span className='text-[10px] uppercase tracking-wide text-slate-500 dark:text-zinc-400'>
                                                                        Cantidad
                                                                    </span>
                                                                    <span className='text-sm font-bold text-slate-700 dark:text-zinc-200'>
                                                                        {group.totalCantidad}
                                                                    </span>
                                                                </div>
                                                                <div className='flex flex-col'>
                                                                    <span className='text-[10px] uppercase tracking-wide text-slate-500 dark:text-zinc-400'>
                                                                        Subtotal
                                                                    </span>
                                                                    <span className='text-sm font-bold text-emerald-700'>
                                                                        $
                                                                        {group.totalSubtotal.toLocaleString(
                                                                            'es-CL',
                                                                        )}
                                                                    </span>
                                                                </div>
                                                                <div className='flex flex-col'>
                                                                    <span className='text-[10px] uppercase tracking-wide text-slate-500 dark:text-zinc-400'>
                                                                        Total
                                                                    </span>
                                                                    <span className='text-sm font-bold text-slate-700 dark:text-zinc-200'>
                                                                        $
                                                                        {group.compraTotal.toLocaleString(
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
                                                                        const compra =
                                                                            listaComprasEnOT.find(
                                                                                (item) =>
                                                                                    item.id ===
                                                                                    group.compraId,
                                                                            );
                                                                        if (compra) {
                                                                            openDetail(compra);
                                                                        }
                                                                    }}>
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
                        <div className='py-6 text-center text-gray-500 dark:text-gray-400'>
                            <p>No hay compras vinculadas a esta Orden de Trabajo</p>
                            {detalleOrdenTrabajo && (
                                <div className='mt-2'>
                                    <p className='text-sm'>
                                        Usa el botón de arriba para vincular una compra existente
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </CardBody>
            </Card>

            {/* Modal de Detalle de Compra */}
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
                                    <span className='text-xs text-gray-500 dark:text-gray-400'>
                                        {itemsCompra.length} item
                                        {itemsCompra.length !== 1 ? 's' : ''}
                                    </span>
                                </div>
                                <div className='mt-2 max-h-64 overflow-auto rounded-lg border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800'>
                                    {cargandoItems ? (
                                        <div className='flex items-center justify-center py-8'>
                                            <div className='text-sm text-gray-500 dark:text-gray-400'>
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
                                            <p className='text-sm font-medium text-gray-600 dark:text-gray-400'>
                                                No hay items registrados
                                            </p>
                                            <p className='text-xs text-gray-500 dark:text-gray-400'>
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
        </>
    );
}

export default ComprasEnOT;
