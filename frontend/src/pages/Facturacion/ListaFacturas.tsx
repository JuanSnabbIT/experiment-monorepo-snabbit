import Input from '@/components/form/Input';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Icon from '@/components/icon/Icon';
import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, { SubheaderLeft, SubheaderRight } from '@/components/layouts/Subheader/Subheader';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody } from '@/components/ui/Card';
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import Tooltip from '@/components/ui/Tooltip';
import ApiService from '@/services/ApiService';
import TableCardFooterTemplateV2 from '@/templates/Table/TableFooterTemplateV2';
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
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MultiValue } from 'react-select';
import { toast } from 'react-toastify';

interface PrefacturaResumen {
    total_items?: number;
    total_facturar?: number;
    [key: string]: unknown;
}

interface PrefacturaItem {
    [key: string]: unknown;
}

interface PrefacturaItemsPayload {
    items?: PrefacturaItem[];
    ots_incluidas?: number[];
    resumen?: PrefacturaResumen;
    [key: string]: unknown;
}

interface Prefactura {
    id: number;
    cliente: number | null;
    cliente_nombre?: string | null;
    estado_cierre: string;
    resultado?: PrefacturaItemsPayload;
    fecha_creacion?: string;
}

const columnHelper = createColumnHelper<Prefactura>();

const estadoOptions: TSelectOption[] = [
    { value: 'borrador', label: 'Borrador' },
    { value: 'por_facturar', label: 'Por facturar' },
    { value: 'facturado', label: 'Facturado' },
];

const ListaFacturas = () => {
    const navigate = useNavigate();
    const [facturas, setFacturas] = useState<Prefactura[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState<string>('');
    const [filtroEstado, setFiltroEstado] = useState<string[]>([]);

    const fetchFacturas = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            filtroEstado.forEach((estado) => params.append('estado_cierre', estado));

            const url = params.toString()
                ? `/api/cierres-administrativos/?${params.toString()}`
                : '/api/cierres-administrativos/';

            const response = await ApiService.fetchData<{ results: Prefactura[] }>({
                url,
                method: 'get',
            });

            if (Array.isArray(response.data)) {
                setFacturas(response.data);
            } else if (response.data?.results) {
                setFacturas(response.data.results);
            }
        } catch (error: any) {
            const message =
                error?.response?.data?.detail || error?.message || 'Error al cargar prefacturas';
            toast.error(message);
        } finally {
            setLoading(false);
        }
    }, [filtroEstado]);

    useEffect(() => {
        fetchFacturas();
    }, [filtroEstado, fetchFacturas]);

    const handleEliminarPrefactura = async (prefactura: Prefactura) => {
        if (prefactura.estado_cierre !== 'borrador') return;

        const ok = await confirmAlert({
            title: 'Eliminar prefactura',
            text: `Â¿Confirmas eliminar la prefactura #${prefactura.id}?`,
            confirmText: 'Eliminar',
            cancelText: 'Cancelar',
            icon: 'warning',
            confirmColor: '#dc2626',
        });

        if (!ok) return;

        try {
            await ApiService.fetchData({
                url: `/api/cierres-administrativos/${prefactura.id}/`,
                method: 'delete',
            });
            toast.success(`Prefactura #${prefactura.id} eliminada`);
            fetchFacturas();
        } catch (error: any) {
            toast.error(error?.response?.data?.detail || 'Error al eliminar prefactura');
        }
    };

    const columns = [
        columnHelper.accessor('id', {
            cell: (info) => (
                <div className='font-bold text-gray-600 dark:text-gray-400'>#{info.getValue()}</div>
            ),
            header: 'NÂ°',
        }),
        columnHelper.accessor('cliente_nombre', {
            cell: (info) => (
                <div className='font-semibold text-gray-900 dark:text-gray-100'>
                    {info.getValue() || 'Sin nombre'}
                </div>
            ),
            header: 'Cliente',
        }),
        columnHelper.accessor((row) => row.resultado?.ots_incluidas ?? [], {
            id: 'ots',
            cell: (info) => {
                const ots = info.getValue();
                if (!ots || ots.length === 0) {
                    return <div className='text-sm text-gray-500'>â€”</div>;
                }
                return (
                    <div className='flex flex-wrap gap-1'>
                        {ots.map((otId) => (
                            <Badge key={otId} variant='outline' color='gray' className='text-xs'>
                                OT #{otId}
                            </Badge>
                        ))}
                    </div>
                );
            },
            header: 'OTs',
        }),
        columnHelper.accessor('estado_cierre', {
            cell: (info) => {
                const estado = info.getValue();
                let color: 'emerald' | 'red' | 'amber' | 'blue' | 'gray' = 'gray';
                let label = estado;
                let variant: 'solid' | 'outline' | 'default' = 'outline';

                switch (estado) {
                    case 'borrador':
                        color = 'amber';
                        label = 'Borrador';
                        variant = 'outline';
                        break;
                    case 'por_facturar':
                        color = 'blue';
                        label = 'Por facturar';
                        variant = 'solid';
                        break;
                    case 'facturado':
                        color = 'emerald';
                        label = 'Facturado';
                        variant = 'solid';
                        break;
                    default:
                        variant = 'outline';
                }

                return (
                    <Badge
                        variant={variant}
                        color={color}
                        className='px-3 py-1 text-sm font-semibold capitalize'>
                        {label}
                    </Badge>
                );
            },
            header: 'Estado',
        }),
        columnHelper.accessor((row) => row.resultado?.resumen?.total_facturar ?? 0, {
            id: 'total',
            cell: (info) => {
                const val = Number(info.getValue());
                const formatted = `$${Math.ceil(val).toLocaleString('es-CL')}`;
                return <div className='font-mono font-medium'>{formatted}</div>;
            },
            header: 'Total',
        }),
        columnHelper.accessor(
            (row) => row.resultado?.resumen?.total_items ?? row.resultado?.items?.length ?? 0,
            {
                id: 'items',
                cell: (info) => (
                    <div className='text-center text-gray-700 dark:text-gray-300'>
                        {info.getValue()}
                    </div>
                ),
                header: 'Items',
            },
        ),
        columnHelper.accessor('fecha_creacion', {
            cell: (info) => {
                const date = info.getValue();
                return (
                    <div className='text-gray-500'>
                        {date ? dayjs(date).format('DD/MM/YYYY') : 'â€”'}
                    </div>
                );
            },
            header: 'Fecha',
        }),
        columnHelper.display({
            id: 'acciones',
            cell: (info) => {
                const factura = info.row.original;
                return (
                    <div className='flex gap-2'>
                        <Tooltip text='Ver detalle'>
                            <Button
                                variant='solid'
                                color='blue'
                                icon='HeroEye'
                                onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/facturacion/facturas/${factura.id}`);
                                }}
                            />
                        </Tooltip>
                        {factura.estado_cierre === 'borrador' && (
                            <Tooltip text='Eliminar prefactura en borrador'>
                                <Button
                                    variant='outline'
                                    color='red'
                                    icon='HeroTrash'
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleEliminarPrefactura(factura);
                                    }}
                                />
                            </Tooltip>
                        )}
                    </div>
                );
            },
            header: 'Acciones',
        }),
    ];

    const table = useReactTable({
        data: facturas,
        columns,
        state: {
            sorting,
            globalFilter,
        },
        onSortingChange: setSorting,
        onGlobalFilterChange: setGlobalFilter,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        initialState: {
            pagination: {
                pageSize: 10,
            },
        },
    });

    const handleEstadoChange = (newValue: MultiValue<TSelectOption> | null) => {
        setFiltroEstado(newValue ? newValue.map((option) => option.value) : []);
    };

    return (
        <PageWrapper>
            <Subheader>
                <SubheaderLeft>{null}</SubheaderLeft>
                <SubheaderRight>
                    <Button
                        variant='solid'
                        color='blue'
                        icon='HeroPlus'
                        onClick={() => navigate('/facturacion/facturas/crear')}>
                        Nueva Prefactura
                    </Button>
                </SubheaderRight>
            </Subheader>

            <Container>
                <Card>
                    <CardBody>
                        <div className='mb-4 flex flex-col gap-4 md:flex-row'>
                            <div className='w-full md:w-64'>
                                <SelectReact
                                    id='filtroEstado'
                                    name='filtroEstado'
                                    placeholder='Filtrar por estado'
                                    options={estadoOptions}
                                    value={estadoOptions.filter((opt) =>
                                        filtroEstado.includes(opt.value),
                                    )}
                                    onChange={(newValue: any) => handleEstadoChange(newValue)}
                                    isMulti
                                    isClearable
                                />
                            </div>
                            <div className='flex-1'>
                                <Input
                                    id='globalFilter'
                                    name='globalFilter'
                                    placeholder='Buscar...'
                                    value={globalFilter}
                                    onChange={(e) => setGlobalFilter(e.target.value)}
                                />
                            </div>
                        </div>

                        {loading ? (
                            <div className='py-12 text-center text-sm text-gray-600'>
                                Cargando facturas...
                            </div>
                        ) : facturas.length === 0 ? (
                            <div className='py-12 text-center text-sm text-gray-600'>
                                No hay facturas registradas.
                            </div>
                        ) : (
                            <>
                                <Table>
                                    <THead>
                                        {table.getHeaderGroups().map((headerGroup) => (
                                            <Tr key={headerGroup.id}>
                                                {headerGroup.headers.map((header) => (
                                                    <Th
                                                        key={header.id}
                                                        isColumnBorder={false}
                                                        className='cursor-pointer select-none'
                                                        onClick={header.column.getToggleSortingHandler()}>
                                                        <div className='flex items-center gap-2'>
                                                            {flexRender(
                                                                header.column.columnDef.header,
                                                                header.getContext(),
                                                            )}
                                                            {{
                                                                asc: (
                                                                    <Icon
                                                                        icon='HeroChevronUp'
                                                                        className='size-4'
                                                                    />
                                                                ),
                                                                desc: (
                                                                    <Icon
                                                                        icon='HeroChevronDown'
                                                                        className='size-4'
                                                                    />
                                                                ),
                                                            }[
                                                                header.column.getIsSorted() as string
                                                            ] ?? null}
                                                        </div>
                                                    </Th>
                                                ))}
                                            </Tr>
                                        ))}
                                    </THead>
                                    <TBody>
                                        {table.getRowModel().rows.map((row) => (
                                            <Tr
                                                key={row.id}
                                                className='cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800'
                                                onClick={() =>
                                                    navigate(
                                                        `/facturacion/facturas/${row.original.id}`,
                                                    )
                                                }>
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
                                <TableCardFooterTemplateV2 table={table} />
                            </>
                        )}
                    </CardBody>
                </Card>
            </Container>
        </PageWrapper>
    );
};

export default ListaFacturas;

