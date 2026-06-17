import Checkbox from '@/components/form/Checkbox';
import Input from '@/components/form/Input';
import SelectReact from '@/components/form/SelectReact';
import Icon from '@/components/icon/Icon';
import Alert from '@/components/ui/Alert';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader } from '@/components/ui/Card';
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import Tooltip from '@/components/ui/Tooltip';
import { IRelacionEmpresa } from '@/interface/empresas.interface';
import { ITrabajadorCliente } from '@/interface/rrhh.interface';
import { useGetTrabajadoresClienteQuery } from '@/store/slices/empresa/empresaApi';
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
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const BADGE_COLOR_ESTADO: Record<string, 'emerald' | 'red' | 'amber' | 'violet' | 'zinc'> = {
    '1': 'emerald',
    '2': 'red',
    borrador: 'amber',
    pendiente_aprobacion: 'amber',
    vigente: 'emerald',
    terminado: 'violet',
    anulado: 'red',
    descartado: 'zinc',
};

const columnHelper = createColumnHelper<ITrabajadorCliente>();

interface TablaUsuariosDelClienteProps {
    detalleCliente?: IRelacionEmpresa;
}

function TablaUsuariosDelCliente({ detalleCliente }: TablaUsuariosDelClienteProps) {
    const navigate = useNavigate();
    const empresaClienteId = detalleCliente?.info_cliente?.id;

    const [sucursalSelected, setSucursalSelected] = useState<{ value: string; label: string }>();
    const [optionSucursal, setOptionSucursal] = useState<{ value: string; label: string }[]>([]);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [inputBuscar, setInputBuscar] = useState('');
    const [globalFilter, setGlobalFilter] = useState('');
    const [mostrarInactivos, setMostrarInactivos] = useState(false);
    const [filtroKpi, setFiltroKpi] = useState<'total' | 'activos' | 'inactivos' | 'pendientes' | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const { data: trabajadores = [], isLoading, isError } = useGetTrabajadoresClienteQuery(
        empresaClienteId ?? '',
        { skip: !empresaClienteId },
    );

    useEffect(() => {
        if (detalleCliente) {
            setOptionSucursal([
                { value: 'ALL', label: 'Todas las sucursales' },
                ...detalleCliente.info_cliente.sucursales.map((suc) => ({
                    value: suc.id.toString(),
                    label: suc.nombre,
                })),
            ]);
        }
    }, [detalleCliente]);

    useEffect(() => {
        setSucursalSelected(undefined);
    }, [detalleCliente?.id]);

    useEffect(() => {
        if (optionSucursal.length > 0 && !sucursalSelected) {
            setSucursalSelected(optionSucursal[0]);
        }
    }, [optionSucursal]);

    const handleBuscarChange = (value: string) => {
        setInputBuscar(value);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => setGlobalFilter(value), 300);
    };

    const trabajadoresFiltrados = useMemo(() => {
        let lista = trabajadores;

        // Filtro por KPI — aplica antes que los demás filtros
        if (filtroKpi && filtroKpi !== 'total') {
            lista = lista.filter((t) => {
                if (filtroKpi === 'activos') return t.tipo === 'confirmado' && t.estado === '1';
                if (filtroKpi === 'inactivos') return t.tipo === 'confirmado' && t.estado === '2';
                if (filtroKpi === 'pendientes') return t.tipo === 'pendiente';
                return true;
            });
        }

        // Filtro de sucursal — aplica solo a confirmados; pendientes se incluyen siempre
        if (sucursalSelected && sucursalSelected.value !== 'ALL') {
            lista = lista.filter(
                (t) =>
                    t.tipo === 'pendiente' ||
                    t.sucursal_id?.toString() === sucursalSelected.value,
            );
        }

        // Filtro de inactivos — solo si no hay un filtro KPI activo que ya filtre por estado
        if (!filtroKpi && !mostrarInactivos) {
            lista = lista.filter(
                (t) => !(t.tipo === 'confirmado' && t.estado === '2'),
            );
        }

        return lista;
    }, [trabajadores, sucursalSelected, mostrarInactivos, filtroKpi]);

    const metricas = useMemo(() => {
        const total = trabajadores.length;
        const activos = trabajadores.filter((t) => t.tipo === 'confirmado' && t.estado === '1').length;
        const inactivos = trabajadores.filter((t) => t.tipo === 'confirmado' && t.estado === '2').length;
        const pendientes = trabajadores.filter((t) => t.tipo === 'pendiente').length;
        return { total, activos, inactivos, pendientes };
    }, [trabajadores]);

    const columns = [
        columnHelper.accessor('nombre', {
            cell: (info) => <span className='font-medium'>{info.getValue() ?? '—'}</span>,
            header: 'Nombre',
        }),
        columnHelper.accessor('email', {
            cell: (info) => (
                <Tooltip text={info.getValue() ?? ''}>
                    <span className='block max-w-[180px] truncate text-zinc-500'>
                        {info.getValue() ?? '—'}
                    </span>
                </Tooltip>
            ),
            header: 'Email',
        }),
        columnHelper.accessor('rut', {
            cell: (info) => info.getValue() || 'Sin RUT',
            header: 'RUT',
        }),
        columnHelper.accessor('cargo', {
            cell: (info) => info.getValue() || '—',
            header: 'Cargo',
        }),
        columnHelper.accessor('estado_label', {
            cell: (info) => (
                <Badge
                    variant='solid'
                    color={BADGE_COLOR_ESTADO[info.row.original.estado] ?? 'zinc'}
                    className='capitalize'>
                    {info.getValue()}
                </Badge>
            ),
            header: 'Estado',
        }),
        columnHelper.display({
            id: 'acciones',
            header: 'Acciones',
            cell: (info) => {
                const fila = info.row.original;
                const destino =
                    fila.tipo === 'confirmado'
                        ? `/empresa/detalle-cliente/${detalleCliente?.id}/trabajador/${fila.ref_id}?tipo=confirmado`
                        : `/empresa/detalle-cliente/${detalleCliente?.id}/trabajador/${fila.ref_id}?tipo=pendiente`;
                return (
                    <div className='flex justify-center'>
                        <Tooltip text='Ver ficha'>
                            <Button
                                color='violet'
                                variant='solid'
                                icon='HeroEye'
                                size='sm'
                                onClick={() => navigate(destino)}
                            />
                        </Tooltip>
                    </div>
                );
            },
        }),
    ];

    const table = useReactTable({
        data: trabajadoresFiltrados,
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

    return (
        <div className='flex flex-col gap-4'>
            {/* ── Métricas ── */}
            {trabajadores.length > 0 && (
                <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
                    <button type='button' className='text-left' onClick={() => setFiltroKpi(null)}>
                        <Card className={`transition-all duration-200 ${!filtroKpi ? 'ring-2 ring-blue-500' : ''}`}>
                            <CardBody className='flex items-center gap-3 py-3'>
                                <Icon icon='HeroUserGroup' size='text-2xl' className='text-blue-500' />
                                <div>
                                    <p className='text-xs text-zinc-500'>Total</p>
                                    <p className='text-xl font-bold'>{metricas.total}</p>
                                </div>
                            </CardBody>
                        </Card>
                    </button>
                    <button type='button' className='text-left' onClick={() => setFiltroKpi(filtroKpi === 'activos' ? null : 'activos')}>
                        <Card className={`transition-all duration-200 ${filtroKpi === 'activos' ? 'ring-2 ring-emerald-500' : ''}`}>
                            <CardBody className='flex items-center gap-3 py-3'>
                                <Icon icon='HeroCheckCircle' size='text-2xl' className='text-emerald-500' />
                                <div>
                                    <p className='text-xs text-zinc-500'>Activos</p>
                                    <p className='text-xl font-bold'>{metricas.activos}</p>
                                </div>
                            </CardBody>
                        </Card>
                    </button>
                    <button type='button' className='text-left' onClick={() => setFiltroKpi(filtroKpi === 'inactivos' ? null : 'inactivos')}>
                        <Card className={`transition-all duration-200 ${filtroKpi === 'inactivos' ? 'ring-2 ring-red-500' : ''}`}>
                            <CardBody className='flex items-center gap-3 py-3'>
                                <Icon icon='HeroXCircle' size='text-2xl' className='text-red-500' />
                                <div>
                                    <p className='text-xs text-zinc-500'>Inactivos</p>
                                    <p className='text-xl font-bold'>{metricas.inactivos}</p>
                                </div>
                            </CardBody>
                        </Card>
                    </button>
                    <button type='button' className='text-left' onClick={() => setFiltroKpi(filtroKpi === 'pendientes' ? null : 'pendientes')}>
                        <Card className={`transition-all duration-200 ${filtroKpi === 'pendientes' ? 'ring-2 ring-amber-500' : ''}`}>
                            <CardBody className='flex items-center gap-3 py-3'>
                                <Icon icon='HeroClock' size='text-2xl' className='text-amber-500' />
                                <div>
                                    <p className='text-xs text-zinc-500'>Pendientes</p>
                                    <p className='text-xl font-bold'>{metricas.pendientes}</p>
                                </div>
                            </CardBody>
                        </Card>
                    </button>
                </div>
            )}

            {/* ── Tabla unificada ── */}
            <Card>
                <CardHeader className='flex justify-between items-start'>
                    <div className='flex flex-col gap-1'>
                        <h2 className='text-xl font-semibold text-blue-600'>Trabajadores</h2>
                        <p className='text-xs text-zinc-500 dark:text-zinc-400'>
                            Se muestran trabajadores asociados a la empresa cliente seleccionada.
                        </p>
                    </div>
                    <div className='flex items-center gap-2'>
                        <Input
                            name='globalFilter'
                            placeholder='Buscar nombre, email, RUT...'
                            value={inputBuscar}
                            onChange={(e) => handleBuscarChange(e.target.value)}
                            className='max-w-[180px]'
                        />
                        <div className='min-w-[160px]'>
                            <SelectReact
                                placeholder='Sucursal...'
                                name='sucursal'
                                options={optionSucursal}
                                value={sucursalSelected}
                                onChange={(e) =>
                                    setSucursalSelected(e as { value: string; label: string })
                                }
                            />
                        </div>
                        <div className='flex items-center gap-2'>
                            <Checkbox
                                id='mostrarInactivos'
                                checked={mostrarInactivos}
                                onChange={() => setMostrarInactivos(!mostrarInactivos)}
                            />
                            <label htmlFor='mostrarInactivos' className='cursor-pointer text-sm'>
                                Mostrar inactivos
                            </label>
                        </div>
                    </div>
                </CardHeader>
                <CardBody className='z-0'>
                    {isError ? (
                        <Alert color='red'>No se pudieron cargar los trabajadores.</Alert>
                    ) : (
                        <div className='overflow-auto'>
                            <Table className='min-w-[600px] table-fixed'>
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
                                                            }[header.column.getIsSorted() as string] ?? null}
                                                        </div>
                                                    )}
                                                </Th>
                                            ))}
                                        </Tr>
                                    ))}
                                </THead>
                                <TBody>
                                    {isLoading ? (
                                        Array.from({ length: 4 }).map((_, i) => (
                                            <Tr key={i}>
                                                {Array.from({ length: 6 }).map((__, j) => (
                                                    <Td key={j}>
                                                        <div className='h-4 w-24 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700' />
                                                    </Td>
                                                ))}
                                            </Tr>
                                        ))
                                    ) : table.getRowModel().rows.length === 0 ? (
                                        <Tr>
                                            <Td colSpan={columns.length} className='text-center text-zinc-400'>
                                                {globalFilter
                                                    ? 'No hay trabajadores que coincidan con la búsqueda.'
                                                    : 'No hay trabajadores registrados para este cliente.'}
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
                            <div className='mt-2 min-w-[600px]'>
                                <TableCardFooterTemplateV2 table={table} />
                            </div>
                        </div>
                    )}
                </CardBody>
            </Card>
        </div>
    );
}

export default TablaUsuariosDelCliente;
