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
import { Pages } from '@/config/pages.config';
import { ESTADOS_CONTRATO, TIPO_CONTRATO } from '@/constants/contrato.constant';
import { IContratoEmpresaCliente } from '@/interface/contrato.interface';
import { useAppSelector } from '@/store';
import {
  useGetContratosQuery,
  useGetMetricasDashboardQuery,
} from '@/store/slices/contratos/contratoApi';
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
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// ── Helpers de color ──

const colorEstado = (estado: string): 'amber' | 'emerald' | 'red' | 'violet' | 'zinc' => {
    switch (estado) {
        case 'borrador':
            return 'amber';
        case 'activo':
            return 'emerald';
        case 'suspendido':
            return 'red';
        case 'finalizado':
            return 'violet';
        default:
            return 'zinc';
    }
};

const colorTipo = (tipo: string): 'blue' | 'emerald' | 'amber' | 'zinc' => {
    switch (tipo) {
        case 'licencia':
            return 'blue';
        case 'venta':
            return 'emerald';
        case 'servicios':
            return 'amber';
        default:
            return 'zinc';
    }
};

// ── Componente de tarjeta de métrica ──

interface IMetricCardProps {
    label: string;
    value: number | string;
    icon: string;
    color: string;
}

const MetricCard = ({ label, value, icon, color }: IMetricCardProps) => (
    <Card className='col-span-1'>
        <CardBody>
            <div className='flex items-center gap-4'>
                <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl bg-${color}-100 dark:bg-${color}-950`}>
                    <Icon icon={icon} size='text-2xl' className={`text-${color}-500`} />
                </div>
                <div>
                    <p className='text-sm text-zinc-500 dark:text-zinc-400'>{label}</p>
                    <p className='text-2xl font-bold'>{value}</p>
                </div>
            </div>
        </CardBody>
    </Card>
);

// ── Columnas de la tabla ──

const columnHelper = createColumnHelper<IContratoEmpresaCliente>();

// ── Página principal ──

const ListaContratos = () => {
    const navigate = useNavigate();
    const { personalizacionUsuario } = useAppSelector((state) => state.auth);

    // ── RTK Query ──
    const { data: contratos = [], isLoading } = useGetContratosQuery(undefined, {
        skip: !personalizacionUsuario?.empresa,
    });
    const { data: metricas } = useGetMetricasDashboardQuery(undefined, {
        skip: !personalizacionUsuario?.empresa,
    });

    // ── Estado local de tabla ──
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState<string>('');
    const [filtroEstado, setFiltroEstado] = useState<TSelectOption | null>(null);
    const [filtroTipo, setFiltroTipo] = useState<TSelectOption | null>(null);

    // ── Filtrado local ──
    const contratosFiltrados = useMemo(() => {
        let resultado = contratos;
        if (filtroEstado) {
            resultado = resultado.filter((c) => c.estado === filtroEstado.value);
        }
        if (filtroTipo) {
            resultado = resultado.filter((c) => c.tipo === filtroTipo.value);
        }
        return resultado;
    }, [contratos, filtroEstado, filtroTipo]);

    // ── Columnas ──
    const columns = useMemo(
        () => [
            columnHelper.accessor('id', {
                header: 'N°',
                size: 60,
                cell: (info) => (
                    <span className='font-bold text-zinc-600 dark:text-zinc-400'>
                        {info.getValue()}
                    </span>
                ),
            }),
            columnHelper.accessor('nombre', {
                header: 'Nombre',
                cell: (info) => (
                    <span className='font-semibold text-zinc-700 dark:text-zinc-300'>
                        {info.getValue()}
                    </span>
                ),
            }),
            columnHelper.accessor('datos_cliente', {
                header: 'Cliente',
                cell: (info) => (
                    <span className='text-zinc-600 dark:text-zinc-400'>
                        {info.getValue()?.nombre ?? '—'}
                    </span>
                ),
            }),
            columnHelper.accessor('tipo', {
                header: 'Tipo',
                cell: (info) => (
                    <Badge variant='outline' color={colorTipo(info.getValue())}>
                        {info.row.original.tipo_label}
                    </Badge>
                ),
            }),
            columnHelper.accessor('estado', {
                header: 'Estado',
                cell: (info) => (
                    <Badge variant='solid' color={colorEstado(info.getValue())} className='capitalize'>
                        {info.row.original.estado_label}
                    </Badge>
                ),
            }),
            columnHelper.accessor('fecha_inicio', {
                header: 'Inicio',
                cell: (info) => (
                    <span className='text-zinc-500'>
                        {info.getValue()
                            ? dayjs(info.getValue()).format('DD/MM/YYYY')
                            : '—'}
                    </span>
                ),
            }),
            columnHelper.accessor('fecha_fin', {
                header: 'Fin',
                cell: (info) => {
                    const valor = info.getValue();
                    if (!valor) return <span className='italic text-zinc-400'>Indefinido</span>;
                    const diasRestantes = dayjs(valor).diff(dayjs(), 'day');
                    const esProximo = diasRestantes >= 0 && diasRestantes <= 30;
                    return (
                        <span className={esProximo ? 'font-semibold text-red-500' : 'text-zinc-500'}>
                            {dayjs(valor).format('DD/MM/YYYY')}
                            {esProximo && (
                                <span className='ml-1 text-xs'>({diasRestantes}d)</span>
                            )}
                        </span>
                    );
                },
            }),
            columnHelper.display({
                id: 'acciones',
                header: 'Acciones',
                cell: (info) => (
                    <div className='flex justify-center gap-2'>
                        <Tooltip text='Ver detalle'>
                            <Button
                                color='violet'
                                variant='solid'
                                icon='HeroEye'
                                size='sm'
                                onClick={() => {
                                    const c = info.row.original;
                                    navigate(
                                        Pages.empresa.subPages.detalleContrato.to
                                            .replace(':clienteId', `${c.empresa_cliente}`)
                                            .replace(':contratoId', `${c.id}`),
                                    );
                                }}
                            />
                        </Tooltip>
                    </div>
                ),
            }),
        ],
        [navigate],
    );

    // ── React Table ──
    const table = useReactTable({
        data: contratosFiltrados,
        columns,
        state: { sorting, globalFilter },
        onSortingChange: setSorting,
        enableGlobalFilter: true,
        onGlobalFilterChange: setGlobalFilter,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    // ── Opciones de filtros ──
    const opcionesEstado: TSelectOption[] = ESTADOS_CONTRATO.map((e) => ({
        value: e.value,
        label: e.label,
    }));
    const opcionesTipo: TSelectOption[] = TIPO_CONTRATO.map((t) => ({
        value: t.value,
        label: t.label,
    }));

    return (
        <PageWrapper isProtectedRoute name='Contratos' title='Contratos'>
            <Subheader>
                <SubheaderLeft>
                    <AnimacionDeInputModoMovil
                        globalFilter={globalFilter}
                        setGlobalFilter={setGlobalFilter}
                        anchoInput={100}
                    />
                </SubheaderLeft>
                <SubheaderRight>
                    <div className='flex items-center gap-2'>
                        <div className='min-w-[150px]'>
                            <SelectReact
                                name='filtroEstado'
                                options={opcionesEstado}
                                value={filtroEstado}
                                onChange={(val) => setFiltroEstado(val as TSelectOption | null)}
                                isClearable
                                placeholder='Estado...'
                            />
                        </div>
                        <div className='min-w-[150px]'>
                            <SelectReact
                                name='filtroTipo'
                                options={opcionesTipo}
                                value={filtroTipo}
                                onChange={(val) => setFiltroTipo(val as TSelectOption | null)}
                                isClearable
                                placeholder='Tipo...'
                            />
                        </div>
                    </div>
                </SubheaderRight>
            </Subheader>

            <Container className='h-full w-full'>
                {/* ── Dashboard de métricas ── */}
                {metricas && (
                    <div className='mb-4 grid grid-cols-2 gap-4 lg:grid-cols-5'>
                        <MetricCard
                            label='Total contratos'
                            value={metricas.resumen.total_contratos}
                            icon='HeroDocumentDuplicate'
                            color='blue'
                        />
                        <MetricCard
                            label='Activos'
                            value={metricas.resumen.contratos_activos}
                            icon='HeroCheckCircle'
                            color='emerald'
                        />
                        <MetricCard
                            label='Vencidos'
                            value={metricas.resumen.contratos_vencidos}
                            icon='HeroExclamationTriangle'
                            color='red'
                        />
                        <MetricCard
                            label='Firmas pendientes'
                            value={metricas.resumen.firmas_pendientes}
                            icon='HeroPencilSquare'
                            color='amber'
                        />
                        <MetricCard
                            label='Licencias por vencer'
                            value={metricas.resumen.licencias_por_vencer}
                            icon='HeroClock'
                            color='violet'
                        />
                    </div>
                )}

                {/* ── Alertas: contratos por vencer ── */}
                {metricas &&
                    metricas.contratos_por_vencer &&
                    metricas.contratos_por_vencer.length > 0 && (
                        <Card className='mb-4 border-l-4 border-red-500'>
                            <CardHeader>
                                <CardHeaderChild>
                                    <Icon
                                        icon='HeroExclamationTriangle'
                                        className='mr-2 text-red-500'
                                    />
                                    <span className='font-semibold text-red-600 dark:text-red-400'>
                                        Contratos próximos a vencer
                                    </span>
                                </CardHeaderChild>
                            </CardHeader>
                            <CardBody>
                                <div className='flex flex-wrap gap-3'>
                                    {metricas.contratos_por_vencer.map((c) => (
                                        <button
                                            key={c.id}
                                            type='button'
                                            className='cursor-pointer'
                                            onClick={() =>
                                                navigate(
                                                    Pages.empresa.subPages.contratosDelCliente.to.replace(
                                                        ':id',
                                                        `${c.id}`,
                                                    ),
                                                )
                                            }>
                                            <Badge color='red' variant='outline'>
                                                {c.nombre} — {c.cliente} ({c.dias_restantes}d)
                                            </Badge>
                                        </button>
                                    ))}
                                </div>
                            </CardBody>
                        </Card>
                    )}

                {/* ── Tabla principal ── */}
                <Card>
                    <CardBody className='z-0'>
                        {isLoading ? (
                            <div className='flex items-center justify-center py-10'>
                                <Icon
                                    icon='HeroArrowPath'
                                    className='animate-spin text-2xl text-blue-500'
                                />
                                <span className='ml-2 text-zinc-500'>Cargando contratos...</span>
                            </div>
                        ) : (
                            <div className='overflow-auto'>
                                <Table className='min-w-[900px] table-fixed'>
                                    <THead>
                                        {table.getHeaderGroups().map((headerGroup) => (
                                            <Tr key={headerGroup.id}>
                                                {headerGroup.headers.map((header) => (
                                                    <Th
                                                        key={header.id}
                                                        style={{
                                                            width: header.column.getSize(),
                                                        }}
                                                        isColumnBorder={false}
                                                        className='text-left'>
                                                        {header.isPlaceholder ? null : (
                                                            <div
                                                                aria-hidden='true'
                                                                className={
                                                                    header.column.getCanSort()
                                                                        ? 'flex cursor-pointer select-none items-center'
                                                                        : ''
                                                                }
                                                                onClick={header.column.getToggleSortingHandler()}>
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
                                        {table.getRowModel().rows.length === 0 ? (
                                            <Tr>
                                                <Td colSpan={8}>
                                                    <div className='py-8 text-center text-zinc-400'>
                                                        No se encontraron contratos
                                                    </div>
                                                </Td>
                                            </Tr>
                                        ) : (
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
                                        )}
                                    </TBody>
                                </Table>
                                <div className='mt-2 min-w-[900px]'>
                                    <TableCardFooterTemplateV2 table={table} />
                                </div>
                            </div>
                        )}
                    </CardBody>
                </Card>
            </Container>
        </PageWrapper>
    );
};

export default ListaContratos;
