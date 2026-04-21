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
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import Input from '@/components/form/Input';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, { SubheaderLeft, SubheaderRight } from '@/components/layouts/Subheader/Subheader';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import Tooltip from '@/components/ui/Tooltip';
import Pages from '@/config/pages.config';
import { useGetPrefacturasOTV3Query } from '@/store/slices/ordenTrabajoV3/ordenTrabajoV3Api';
import TableCardFooterTemplateV2 from '@/templates/Table/TableFooterTemplateV2';
import {
    buildPrefacturaOTDetailPath,
    calculatePrefacturaMetricas,
    createPrefacturacionSearchParams,
    getPrefacturaEstadoColor,
    getPrefacturaEstadoLabel,
    IPrefacturacionRouteState,
    IPrefacturaListItemVM,
    parsePrefacturacionSearchParams,
    TPrefacturaEstado,
} from '../prefacturacion.shared';

const estadoOptions: TSelectOption[] = [
    { value: 'borrador', label: 'Borrador' },
    { value: 'por_facturar', label: 'Por facturar' },
    { value: 'facturado', label: 'Facturado' },
];

const columnHelper = createColumnHelper<IPrefacturaListItemVM>();

const formatDateRange = (start?: string | null, end?: string | null) => {
    if (!start || !end) {
        return '-';
    }

    return `${dayjs(start).format('DD/MM/YYYY')} -> ${dayjs(end).format('DD/MM/YYYY')}`;
};

const ListaPrefacturasOTV3 = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [sorting, setSorting] = useState<SortingState>([]);

    const routeState = useMemo(
        () => parsePrefacturacionSearchParams(searchParams, 'ot'),
        [searchParams],
    );
    const { estado: filtroEstado, q: globalFilter, historico: verHistorico } = routeState;

    const createOTSearchParams = useCallback(
        (state: Partial<IPrefacturacionRouteState>) => {
            const params = createPrefacturacionSearchParams(state, 'ot');
            params.delete('tab');
            return params;
        },
        [],
    );

    const updateRouteState = useCallback(
        (patch: Partial<IPrefacturacionRouteState>) => {
            const nextState: IPrefacturacionRouteState = {
                tab: 'ot',
                estado: patch.estado ?? routeState.estado,
                q: patch.q ?? routeState.q,
                historico: patch.historico ?? routeState.historico,
            };

            const nextParams = createOTSearchParams(nextState);
            if (nextParams.toString() !== searchParams.toString()) {
                setSearchParams(nextParams, { replace: true });
            }
        },
        [routeState, searchParams, setSearchParams, createOTSearchParams],
    );

    useEffect(() => {
        const parsed = parsePrefacturacionSearchParams(searchParams, 'ot');
        const normalizedParams = createOTSearchParams(parsed);
        if (normalizedParams.toString() !== searchParams.toString()) {
            setSearchParams(normalizedParams, { replace: true });
        }
    }, [searchParams, setSearchParams, createOTSearchParams]);

    const otQueryArgs = useMemo(() => {
        if (filtroEstado.length === 1) {
            return { estado: filtroEstado[0] };
        }
        return undefined;
    }, [filtroEstado]);

    const { data: facturasOT = [], isLoading } = useGetPrefacturasOTV3Query(otQueryArgs);

    const facturasOTFiltradas = useMemo(() => {
        if (filtroEstado.length <= 1) {
            return facturasOT;
        }

        return facturasOT.filter((prefactura) =>
            filtroEstado.includes(prefactura.estado_cierre as never),
        );
    }, [facturasOT, filtroEstado]);

    const listItems = useMemo<IPrefacturaListItemVM[]>(
        () =>
            facturasOTFiltradas.map((prefactura) => {
                const otIds = prefactura.ots ?? [];
                return {
                    id: prefactura.id,
                    tipo: 'ot',
                    tipoLabel: 'OT',
                    referencia:
                        otIds.length > 0
                            ? `${otIds.length} OT${otIds.length === 1 ? '' : 's'} incluidas`
                            : prefactura.ot_titulo || 'Sin OTs asociadas',
                    cliente: prefactura.cliente_nombre || 'Sin nombre',
                    contexto:
                        prefactura.resultado?.resumen?.total_items !== undefined
                            ? `${prefactura.resultado.resumen.total_items} item(s)`
                            : 'Sin resumen',
                    estado: prefactura.estado_cierre,
                    estadoLabel: getPrefacturaEstadoLabel(prefactura.estado_cierre),
                    totalLabel: `$${Math.ceil(
                        Number(prefactura.resultado?.resumen?.total_facturar ?? 0),
                    ).toLocaleString('es-CL')}`,
                    fechaLabel: prefactura.fecha_creacion
                        ? dayjs(prefactura.fecha_creacion).format('DD/MM/YYYY')
                        : '-',
                    otIds,
                    detailPath: buildPrefacturaOTDetailPath(prefactura.id, routeState),
                };
            }),
        [facturasOTFiltradas, routeState],
    );

    const currentMetricas = useMemo(
        () => calculatePrefacturaMetricas(listItems, (item) => item.estado),
        [listItems],
    );

    const columns = useMemo(
        () => [
            columnHelper.accessor('id', {
                header: '#',
                cell: (info) => <span className='font-bold'>#{info.getValue()}</span>,
                size: 70,
            }),
            columnHelper.accessor('tipoLabel', {
                header: 'Tipo',
                cell: (info) => (
                    <Badge
                        variant='outline'
                        color={info.row.original.tipo === 'contrato' ? 'violet' : 'sky'}>
                        {info.getValue()}
                    </Badge>
                ),
            }),
            columnHelper.accessor('referencia', {
                header: 'Referencia',
                cell: (info) => (
                    <div>
                        <p className='font-semibold'>{info.getValue()}</p>
                        <p className='text-xs text-zinc-500'>{info.row.original.contexto}</p>
                    </div>
                ),
            }),
            columnHelper.accessor('cliente', {
                header: 'Cliente',
                cell: (info) => info.getValue(),
            }),
            columnHelper.display({
                id: 'contexto',
                header: 'OTs',
                cell: ({ row }) => {
                    if (row.original.otIds.length === 0) {
                        return row.original.contexto;
                    }
                    return (
                        <div className='flex flex-wrap gap-1'>
                            {row.original.otIds.map((otId) => (
                                <Badge
                                    key={otId}
                                    variant='outline'
                                    color='zinc'
                                    className='text-xs'>
                                    OT #{otId}
                                </Badge>
                            ))}
                        </div>
                    );
                },
            }),
            columnHelper.accessor('totalLabel', {
                header: 'Total',
                cell: (info) => info.getValue(),
            }),
            columnHelper.accessor('estadoLabel', {
                header: 'Estado',
                cell: (info) => (
                    <Badge color={getPrefacturaEstadoColor(info.row.original.estado)}>
                        {info.getValue()}
                    </Badge>
                ),
            }),
            columnHelper.accessor('fechaLabel', {
                header: 'Fecha',
                cell: (info) => info.getValue(),
            }),
            columnHelper.display({
                id: 'acciones',
                header: 'Acciones',
                cell: ({ row }) => (
                    <Tooltip text='Ver detalle'>
                        <Button
                            size='sm'
                            icon='HeroEye'
                            color='blue'
                            onClick={() => navigate(row.original.detailPath)}
                        />
                    </Tooltip>
                ),
            }),
        ],
        [navigate],
    );

    const table = useReactTable({
        data: listItems,
        columns,
        state: { sorting, globalFilter },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    return (
        <PageWrapper>
            <Subheader>
                <SubheaderLeft>
                    <h1 className='text-xl font-bold'>Prefacturas OT</h1>
                </SubheaderLeft>
                <SubheaderRight>
                    <Button
                        variant='solid'
                        icon='HeroDocumentPlus'
                        onClick={() => navigate(Pages.facturacion.subPages.matchingManualOTV3.to)}>
                        Nueva Prefactura OT
                    </Button>
                </SubheaderRight>
            </Subheader>

            <Container>
                <div className='mb-4 grid grid-cols-2 gap-4 md:grid-cols-4'>
                    <Card>
                        <CardBody>
                            <p className='text-sm text-zinc-500'>Total</p>
                            <p className='text-2xl font-bold'>{currentMetricas.total}</p>
                        </CardBody>
                    </Card>
                    <Card>
                        <CardBody>
                            <p className='text-sm text-zinc-500'>Borrador</p>
                            <p className='text-2xl font-bold text-amber-500'>
                                {currentMetricas.borrador}
                            </p>
                        </CardBody>
                    </Card>
                    <Card>
                        <CardBody>
                            <p className='text-sm text-zinc-500'>Por facturar</p>
                            <p className='text-2xl font-bold text-blue-500'>
                                {currentMetricas.por_facturar}
                            </p>
                        </CardBody>
                    </Card>
                    <Card>
                        <CardBody>
                            <p className='text-sm text-zinc-500'>Facturado</p>
                            <p className='text-2xl font-bold text-emerald-500'>
                                {currentMetricas.facturado}
                            </p>
                        </CardBody>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardHeaderChild>
                            <Input
                                id='buscar'
                                name='buscar'
                                placeholder='Buscar...'
                                value={globalFilter}
                                onChange={(event) => updateRouteState({ q: event.target.value })}
                                className='w-64'
                            />
                        </CardHeaderChild>
                        <CardHeaderChild>
                            <div className='flex items-center gap-2'>
                                <SelectReact
                                    name='filtroEstado'
                                    isMulti
                                    options={estadoOptions}
                                    value={estadoOptions.filter((option) =>
                                        filtroEstado.includes(option.value as never),
                                    )}
                                    onChange={(value) =>
                                        updateRouteState({
                                            estado:
                                                (value as TSelectOption[])?.map(
                                                    (option) => option.value,
                                                ) as TPrefacturaEstado[] | undefined,
                                        })
                                    }
                                    placeholder='Filtrar estado...'
                                    className='w-64'
                                />
                                <Button
                                    variant={verHistorico ? 'solid' : 'outline'}
                                    color={verHistorico ? 'violet' : 'zinc'}
                                    icon='HeroArchiveBox'
                                    onClick={() => updateRouteState({ historico: !verHistorico })}>
                                    Historico
                                </Button>
                            </div>
                        </CardHeaderChild>
                    </CardHeader>
                    <CardBody>
                        {isLoading ? (
                            <p className='py-8 text-center text-zinc-400'>Cargando...</p>
                        ) : table.getRowModel().rows.length === 0 ? (
                            <p className='py-8 text-center text-zinc-400'>
                                No hay prefacturas para mostrar.
                            </p>
                        ) : (
                            <Table>
                                <THead>
                                    {table.getHeaderGroups().map((headerGroup) => (
                                        <Tr key={headerGroup.id}>
                                            {headerGroup.headers.map((header) => (
                                                <Th
                                                    key={header.id}
                                                    className='cursor-pointer select-none'
                                                    onClick={header.column.getToggleSortingHandler()}>
                                                    {flexRender(
                                                        header.column.columnDef.header,
                                                        header.getContext(),
                                                    )}
                                                    {{
                                                        asc: ' ↑',
                                                        desc: ' ↓',
                                                    }[header.column.getIsSorted() as string] ?? ''}
                                                </Th>
                                            ))}
                                        </Tr>
                                    ))}
                                </THead>
                                <TBody>
                                    {table.getRowModel().rows.map((row) => (
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
                        )}
                    </CardBody>
                    <TableCardFooterTemplateV2 table={table as never} />
                </Card>
            </Container>
        </PageWrapper>
    );
};

export default ListaPrefacturasOTV3;
