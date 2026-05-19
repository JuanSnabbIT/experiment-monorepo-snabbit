import Input from '@/components/form/Input';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Icon from '@/components/icon/Icon';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import Tooltip from '@/components/ui/Tooltip';
import { ESTADOS_CONTRATO, TIPO_CONTRATO } from '@/constants/contrato.constant';
import { IContratoEmpresaCliente } from '@/interface/contrato.interface';
import { IRelacionEmpresa } from '@/interface/empresas.interface';
import CrearContratoDelCliente from '@/pages/Contratos/modals/CrearContratoDelCliente';
import { useAppSelector } from '@/store';
import { useGetContratosPorEmpresaClienteQuery } from '@/store/slices/contratos/contratoApi';
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

const columnHelper = createColumnHelper<IContratoEmpresaCliente>();

interface ITablaDeContratosDelClienteProps {
    detalleCliente?: IRelacionEmpresa;
}

function TablaDeContratosDelCliente({ detalleCliente }: ITablaDeContratosDelClienteProps) {
    const { personalizacionUsuario } = useAppSelector((state) => state.auth);
    const navigate = useNavigate();

    // ── Estado de tabla ──
    const [sorting, setSorting] = useState<SortingState>([{ id: 'id', desc: true }]);
    const [globalFilter, setGlobalFilter] = useState<string>('');
    const [filtroEstado, setFiltroEstado] = useState<TSelectOption | null>(null);
    const [filtroTipo, setFiltroTipo] = useState<TSelectOption | null>(null);
    const [wizardAbierto, setWizardAbierto] = useState(false);

    // ── RTK Query ──
    const { data: contratos = [], isLoading } = useGetContratosPorEmpresaClienteQuery(
        {
            empresaId: personalizacionUsuario?.empresa ?? '',
            clienteId: detalleCliente?.cliente ?? '',
        },
        { skip: !personalizacionUsuario?.empresa || !detalleCliente?.cliente },
    );

    // ── Métricas calculadas localmente del cliente ──
    const metricas = useMemo(() => {
        const total = contratos.length;
        const activos = contratos.filter((c) => c.estado === 'activo').length;
        const borradores = contratos.filter((c) => c.estado === 'borrador').length;
        const vencidos = contratos.filter(
            (c) => c.estado === 'finalizado' || c.estado === 'suspendido',
        ).length;
        const porVencer = contratos.filter((c) => {
            if (!c.fecha_fin) return false;
            const dias = dayjs(c.fecha_fin).diff(dayjs(), 'day');
            return dias >= 0 && dias <= 30;
        }).length;
        return { total, activos, borradores, vencidos, porVencer };
    }, [contratos]);

    // ── Filtrado ──
    const contratosFiltrados = useMemo(() => {
        let resultado = contratos;
        if (filtroEstado) resultado = resultado.filter((c) => c.estado === filtroEstado.value);
        if (filtroTipo) resultado = resultado.filter((c) => c.tipo === filtroTipo.value);
        return resultado;
    }, [contratos, filtroEstado, filtroTipo]);

    const contratosOrdenados = useMemo(() => {
        return [...contratosFiltrados].sort((a, b) => b.id - a.id);
    }, [contratosFiltrados]);

    // ── Columnas de la tabla ──
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
                    <Badge
                        variant='solid'
                        color={colorEstado(info.getValue())}
                        className='capitalize'>
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
                    if (!valor)
                        return <span className='italic text-zinc-400'>Indefinido</span>;
                    const diasRestantes = dayjs(valor).diff(dayjs(), 'day');
                    const esProximo = diasRestantes >= 0 && diasRestantes <= 30;
                    return (
                        <span
                            className={
                                esProximo ? 'font-semibold text-red-500' : 'text-zinc-500'
                            }>
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
                                onClick={() =>
                                    navigate(
                                        `/empresa/detalle-cliente/${detalleCliente?.id}/contrato/${info.row.original.id}?tab=contratos`,
                                    )
                                }
                            />
                        </Tooltip>
                    </div>
                ),
            }),
        ],
        [],
    );

    // ── React Table ──
    const table = useReactTable({
        data: contratosOrdenados,
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

    const opcionesEstado: TSelectOption[] = ESTADOS_CONTRATO.map((e) => ({
        value: e.value,
        label: e.label,
    }));
    const opcionesTipo: TSelectOption[] = TIPO_CONTRATO.map((t) => ({
        value: t.value,
        label: t.label,
    }));

    // ── Vista: listado con métricas y tabla ──
    return (
        <div className='flex flex-col gap-4'>
            {/* ── Métricas del cliente ── */}
            {contratos.length > 0 && (
                <div className='grid grid-cols-2 gap-3 lg:grid-cols-5'>
                    <Card>
                        <CardBody className='flex items-center gap-3 py-3'>
                            <Icon
                                icon='HeroDocumentDuplicate'
                                size='text-2xl'
                                className='text-blue-500'
                            />
                            <div>
                                <p className='text-xs text-zinc-500'>Total</p>
                                <p className='text-xl font-bold'>{metricas.total}</p>
                            </div>
                        </CardBody>
                    </Card>
                    <Card>
                        <CardBody className='flex items-center gap-3 py-3'>
                            <Icon
                                icon='HeroCheckCircle'
                                size='text-2xl'
                                className='text-emerald-500'
                            />
                            <div>
                                <p className='text-xs text-zinc-500'>Activos</p>
                                <p className='text-xl font-bold'>{metricas.activos}</p>
                            </div>
                        </CardBody>
                    </Card>
                    <Card>
                        <CardBody className='flex items-center gap-3 py-3'>
                            <Icon
                                icon='HeroPencilSquare'
                                size='text-2xl'
                                className='text-amber-500'
                            />
                            <div>
                                <p className='text-xs text-zinc-500'>Borradores</p>
                                <p className='text-xl font-bold'>{metricas.borradores}</p>
                            </div>
                        </CardBody>
                    </Card>
                    <Card>
                        <CardBody className='flex items-center gap-3 py-3'>
                            <Icon
                                icon='HeroExclamationTriangle'
                                size='text-2xl'
                                className='text-red-500'
                            />
                            <div>
                                <p className='text-xs text-zinc-500'>Vencidos/Susp.</p>
                                <p className='text-xl font-bold'>{metricas.vencidos}</p>
                            </div>
                        </CardBody>
                    </Card>
                    <Card>
                        <CardBody className='flex items-center gap-3 py-3'>
                            <Icon
                                icon='HeroClock'
                                size='text-2xl'
                                className='text-violet-500'
                            />
                            <div>
                                <p className='text-xs text-zinc-500'>Por vencer</p>
                                <p className='text-xl font-bold'>{metricas.porVencer}</p>
                            </div>
                        </CardBody>
                    </Card>
                </div>
            )}

            {/* ── Tabla principal ── */}
            <Card>
                <CardHeader>
                    <CardHeaderChild>
                        <Badge className='text-xl'>Contratos</Badge>
                    </CardHeaderChild>
                    <CardHeaderChild>
                        <div className='flex flex-wrap items-center gap-2'>
                            <Input
                                name='buscar'
                                placeholder='Buscar...'
                                value={globalFilter}
                                onChange={(e) => setGlobalFilter(e.target.value)}
                                className='max-w-[150px]'
                            />
                            <div className='min-w-[130px]'>
                                <SelectReact
                                    name='filtroEstado'
                                    options={opcionesEstado}
                                    value={filtroEstado}
                                    onChange={(val) =>
                                        setFiltroEstado(val as TSelectOption | null)
                                    }
                                    isClearable
                                    placeholder='Estado...'
                                />
                            </div>
                            <div className='min-w-[130px]'>
                                <SelectReact
                                    name='filtroTipo'
                                    options={opcionesTipo}
                                    value={filtroTipo}
                                    onChange={(val) =>
                                        setFiltroTipo(val as TSelectOption | null)
                                    }
                                    isClearable
                                    placeholder='Tipo...'
                                />
                            </div>
                            <Button
                                variant='solid'
                                color='blue'
                                icon='HeroPlus'
                                onClick={() => setWizardAbierto(true)}>
                                Crear contrato
                            </Button>
                            {wizardAbierto && (
                                <CrearContratoDelCliente
                                    detalleCliente={detalleCliente}
                                    externalIsOpen
                                    onExternalClose={() => setWizardAbierto(false)}
                                />
                            )}
                        </div>
                    </CardHeaderChild>
                </CardHeader>
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
                            <Table className='min-w-[800px] table-fixed'>
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
                                            <Td colSpan={7}>
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
                            <div className='mt-2 min-w-[800px]'>
                                <TableCardFooterTemplateV2 table={table} />
                            </div>
                        </div>
                    )}
                </CardBody>
            </Card>
        </div>
    );
}

export default TablaDeContratosDelCliente;
