import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Icon from '@/components/icon/Icon';
import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, { SubheaderLeft, SubheaderRight } from '@/components/layouts/Subheader/Subheader';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import Tooltip from '@/components/ui/Tooltip';
import AnimacionDeInputModoMovil from '@/components/utils/AnimacionDeIntputModoMovil';
import type { IOrdenDeTrabajoV3List, TEstadoOTV3, TModalidadOTV3 } from '@/interface/ordenTrabajoV3.interface';
import { useAppSelector } from '@/store';
import { useGetOrdenesV3Query } from '@/store/slices/ordenTrabajoV3/ordenTrabajoV3Api';
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
import dayjs from 'dayjs';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CrearOTV3 from './modals/CrearOTV3';

const COLOR_ESTADO: Record<TEstadoOTV3, string> = {
    borrador: 'zinc',
    preparacion: 'blue',
    en_ejecucion: 'amber',
    retroalimentacion: 'violet',
    por_facturar: 'emerald',
    completada: 'emerald',
    parcialmente_facturada: 'sky',
    facturada: 'violet',
    cerrada: 'zinc',
    cancelada: 'red',
};

const COLOR_MODALIDAD: Record<TModalidadOTV3, string> = {
    presencial: 'blue',
    remoto: 'emerald',
    hibrido: 'violet',
};

const COLOR_PRIORIDAD: Record<string, string> = {
    baja: 'zinc',
    normal: 'blue',
    alta: 'amber',
    critica: 'red',
};

const ESTADO_OPCIONES: TSelectOption[] = [
    { value: 'borrador', label: 'Borrador' },
    { value: 'preparacion', label: 'Preparación' },
    { value: 'en_ejecucion', label: 'En ejecución' },
    { value: 'retroalimentacion', label: 'Retroalimentación' },
    { value: 'por_facturar', label: 'Por facturar' },
    { value: 'completada', label: 'Completada' },
    { value: 'parcialmente_facturada', label: 'Parcialmente facturada' },
    { value: 'facturada', label: 'Facturada' },
    { value: 'cerrada', label: 'Cerrada' },
    { value: 'cancelada', label: 'Cancelada' },
];

const columnHelper = createColumnHelper<IOrdenDeTrabajoV3List>();

const ListaOTV3 = () => {
    const navigate = useNavigate();
    const { personalizacionUsuario } = useAppSelector((state) => state.auth);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState('');
    const [filtroEstado, setFiltroEstado] = useState<string[]>([]);
    const [crearOpen, setCrearOpen] = useState(false);

    const { data: ordenes = [], isLoading } = useGetOrdenesV3Query(undefined, {
        skip: !personalizacionUsuario?.empresa,
    });

    const ordenesFiltradas = filtroEstado.length > 0
        ? ordenes.filter((o) => filtroEstado.includes(o.estado))
        : ordenes;

    const columns = [
        columnHelper.accessor('id', {
            header: 'N°',
            size: 60,
            cell: (info) => (
                <span className='font-bold text-zinc-500 dark:text-zinc-400'>#{info.getValue()}</span>
            ),
        }),
        columnHelper.accessor('titulo', {
            header: 'Título',
            cell: (info) => (
                <span className='font-semibold text-zinc-800 dark:text-zinc-200'>{info.getValue()}</span>
            ),
        }),
        columnHelper.accessor('cliente_nombre', {
            header: 'Cliente',
            cell: (info) => info.getValue() ?? '-',
        }),
        columnHelper.accessor('modalidad_display', {
            header: 'Modalidad',
            cell: (info) => (
                <Badge color={COLOR_MODALIDAD[info.row.original.modalidad] as any}>
                    {info.getValue()}
                </Badge>
            ),
        }),
        columnHelper.accessor('estado_display', {
            header: 'Estado',
            cell: (info) => (
                <Badge color={COLOR_ESTADO[info.row.original.estado] as any}>
                    {info.getValue()}
                </Badge>
            ),
        }),
        columnHelper.accessor('prioridad_display', {
            header: 'Prioridad',
            cell: (info) => (
                <Badge color={COLOR_PRIORIDAD[info.row.original.prioridad] as any}>
                    {info.getValue()}
                </Badge>
            ),
        }),
        columnHelper.accessor('fecha_programada', {
            header: 'Fecha programada',
            cell: (info) =>
                info.getValue() ? dayjs(info.getValue()).format('DD/MM/YYYY HH:mm') : '-',
        }),
        columnHelper.accessor('tecnico_responsable_nombre', {
            header: 'Técnico',
            cell: (info) => info.getValue() ?? '-',
        }),
        columnHelper.display({
            id: 'progreso',
            header: 'Tareas',
            cell: ({ row }) => (
                <span className='text-sm text-zinc-500'>
                    {row.original.tareas_completadas}/{row.original.total_tareas}
                </span>
            ),
        }),
        columnHelper.display({
            id: 'acciones',
            header: '',
            size: 80,
            cell: ({ row }) => (
                <div className='flex justify-center'>
                    <Tooltip text='Ver detalle'>
                        <Button
                            variant='solid'
                            color='violet'
                            icon='HeroEye'
                            size='sm'
                            onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/orden-trabajo-v3/${row.original.id}`);
                            }}
                        />
                    </Tooltip>
                </div>
            ),
        }),
    ];

    const table = useReactTable({
        data: ordenesFiltradas,
        columns,
        state: { sorting, globalFilter },
        onSortingChange: setSorting,
        onGlobalFilterChange: setGlobalFilter,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    return (
        <PageWrapper>
            <Subheader>
                <SubheaderLeft>
                    <AnimacionDeInputModoMovil
                        globalFilter={globalFilter}
                        setGlobalFilter={setGlobalFilter}
                    />
                </SubheaderLeft>
                <SubheaderRight>
                    <SelectReact
                        name='filtroEstado'
                        placeholder='Filtrar por estado...'
                        options={ESTADO_OPCIONES}
                        isMulti
                        value={ESTADO_OPCIONES.filter((o) => filtroEstado.includes(o.value))}
                        onChange={(selected) =>
                            setFiltroEstado(
                                (selected as TSelectOption[]).map((s) => s.value),
                            )
                        }
                        className='min-w-[220px]'
                    />
                    <Button
                        variant='solid'
                        icon='HeroPlus'
                        onClick={() => setCrearOpen(true)}
                    >
                        Nueva OT
                    </Button>
                </SubheaderRight>
            </Subheader>

            <Container className='h-full w-full'>
                <Card>
                    <CardHeader>
                        <CardHeaderChild>
                            <span className='font-semibold'>Órdenes de Trabajo V3</span>
                            <Badge color='zinc'>{table.getFilteredRowModel().rows.length}</Badge>
                        </CardHeaderChild>
                    </CardHeader>
                    <CardBody className='z-0'>
                        <div className='overflow-auto'>
                            {isLoading ? (
                                <div className='py-10 text-center text-zinc-400'>Cargando...</div>
                            ) : (
                                <>
                                    <Table className='min-w-[1200px] table-fixed'>
                                        <THead>
                                            {table.getHeaderGroups().map((hg) => (
                                                <Tr key={hg.id}>
                                                    {hg.headers.map((h) => (
                                                        <Th
                                                            key={h.id}
                                                            isColumnBorder={false}
                                                            className='text-left'>
                                                            {h.isPlaceholder ? null : (
                                                                <div
                                                                    aria-hidden='true'
                                                                    className={
                                                                        h.column.getCanSort()
                                                                            ? 'flex cursor-pointer select-none items-center'
                                                                            : ''
                                                                    }
                                                                    onClick={h.column.getToggleSortingHandler()}>
                                                                    {flexRender(
                                                                        h.column.columnDef.header,
                                                                        h.getContext(),
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
                                                                        h.column.getIsSorted() as string
                                                                    ] ?? null}
                                                                </div>
                                                            )}
                                                        </Th>
                                                    ))}
                                                </Tr>
                                            ))}
                                        </THead>
                                        <TBody>
                                            {table.getRowModel().rows.length === 0 ? (
                                                <Tr>
                                                    <Td
                                                        colSpan={columns.length}
                                                        className='py-8 text-center text-zinc-400'>
                                                        No hay órdenes de trabajo registradas.
                                                    </Td>
                                                </Tr>
                                            ) : (
                                                table.getRowModel().rows.map((row) => (
                                                    <Tr
                                                        key={row.id}
                                                        className='cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                                                        onClick={() =>
                                                            navigate(
                                                                `/orden-trabajo-v3/${row.original.id}`,
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
                                                ))
                                            )}
                                        </TBody>
                                    </Table>
                                    <div className='mt-2 min-w-[1200px]'>
                                        <TableCardFooterTemplateV2 table={table} />
                                    </div>
                                </>
                            )}
                        </div>
                    </CardBody>
                </Card>
            </Container>

            {crearOpen && <CrearOTV3 isOpen={crearOpen} setIsOpen={setCrearOpen} />}
        </PageWrapper>
    );
};

export default ListaOTV3;
