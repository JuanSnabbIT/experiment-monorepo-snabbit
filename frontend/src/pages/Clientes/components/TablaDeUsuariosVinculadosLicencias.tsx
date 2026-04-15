import Input from '@/components/form/Input';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Icon from '@/components/icon/Icon';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import Tooltip from '@/components/ui/Tooltip';
import { IContratoLicencia } from '@/interface/contrato.interface';
import { IRelacionEmpresa } from '@/interface/empresas.interface';
import { useAppSelector } from '@/store';
import {
    useGetContratoLicenciasVinculosQuery,
    useGetUsuariosVinculadosLicenciaQuery,
} from '@/store/slices/contratos/contratoApi';
import TableCardFooterTemplateV2 from '@/templates/Table/TableFooterTemplateV2';
import {
    createColumnHelper,
    ExpandedState,
    flexRender,
    getCoreRowModel,
    getExpandedRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    SortingState,
    useReactTable,
} from '@tanstack/react-table';
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ModalCambiarEstadoLicencia from '../../Contratos/modals/ModalCambiarEstadoLicencia';
import CrearUsuarioVinculadoLicencia from '../modals/CrearUsuarioVinculadoLicencia';
import ItemsTablaDeUsuariosVinculadosLicencias from './ItemsTablaDeUsuariosVinculadosLicencias';

const ESTADOS_LICENCIA: TSelectOption[] = [
    { value: 'activa', label: 'Activa' },
    { value: 'suspendida', label: 'Suspendida' },
    { value: 'vencida', label: 'Vencida' },
    { value: 'cancelada', label: 'Cancelada' },
];

// ── Sub-componente para el cuerpo expandido de cada licencia ──
function ExpandedLicenciaRow({
    licencia,
    detalleCliente,
}: {
    licencia: IContratoLicencia;
    detalleCliente?: IRelacionEmpresa;
}) {
    const { data: listaUsuariosVinculados = [] } = useGetUsuariosVinculadosLicenciaQuery(
        licencia.id.toString(),
    );

    return (
        <div className='border-t border-zinc-100 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800/50'>
            <div className='mb-2 flex items-center justify-between'>
                <span className='text-sm font-medium'>
                    Usuarios vinculados ({listaUsuariosVinculados.length})
                </span>
                <CrearUsuarioVinculadoLicencia
                    licenciaIdFijo={licencia.id.toString()}
                    clienteId={detalleCliente?.cliente.toString()}
                />
            </div>
            {listaUsuariosVinculados.length > 0 ? (
                <Table>
                    <THead>
                        <Tr>
                            <Th>Usuario / Nombre</Th>
                            <Th>Fecha Asignación</Th>
                            <Th>Acciones</Th>
                        </Tr>
                    </THead>
                    <TBody>
                        {listaUsuariosVinculados.map((user) => (
                            <ItemsTablaDeUsuariosVinculadosLicencias key={user.id} user={user} />
                        ))}
                    </TBody>
                </Table>
            ) : (
                <p className='py-2 text-center text-sm text-zinc-500'>
                    No hay usuarios vinculados a esta licencia
                </p>
            )}
        </div>
    );
}

const columnHelper = createColumnHelper<IContratoLicencia>();

interface TablaDeUsuariosVinculadosLicenciasProps {
    detalleCliente?: IRelacionEmpresa;
    onIrAContratos?: () => void;
}

function TablaDeUsuariosVinculadosLicencias({
    detalleCliente,
    onIrAContratos,
}: TablaDeUsuariosVinculadosLicenciasProps) {
    const navigate = useNavigate();
    const { personalizacionUsuario } = useAppSelector((state) => state.auth);

    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState<string>('');
    const [filtroEstado, setFiltroEstado] = useState<TSelectOption | null>(null);
    const [expanded, setExpanded] = useState<ExpandedState>({});
    const [modalEstado, setModalEstado] = useState<{
        open: boolean;
        licenciaId: number;
        estado: string;
        estadoLabel: string;
        color: 'emerald' | 'red' | 'amber' | 'zinc';
        sePuedeCancelar: boolean;
    }>({
        open: false,
        licenciaId: 0,
        estado: '',
        estadoLabel: '',
        color: 'zinc',
        sePuedeCancelar: false,
    });

    const { data: listaContratoLicencias = [] } = useGetContratoLicenciasVinculosQuery(
        {
            empresaId: personalizacionUsuario?.empresa ?? '',
            clienteId: detalleCliente?.cliente ?? '',
        },
        { skip: !personalizacionUsuario?.empresa || !detalleCliente?.cliente },
    );

    // ── Métricas ──
    const metricas = useMemo(() => {
        const total = listaContratoLicencias.length;
        const activas = listaContratoLicencias.filter((l) => l.estado === 'activa').length;
        const porVencer = listaContratoLicencias.filter(
            (l) =>
                l.estado === 'activa' &&
                l.dias_restantes_licencia != null &&
                l.dias_restantes_licencia >= 0 &&
                l.dias_restantes_licencia <= 30,
        ).length;
        const vencidas = listaContratoLicencias.filter(
            (l) => l.estado === 'vencida' || l.estado === 'cancelada',
        ).length;
        return { total, activas, porVencer, vencidas };
    }, [listaContratoLicencias]);

    // ── Filtrado por estado ──
    const licenciasFiltradas = useMemo(() => {
        if (!filtroEstado) return listaContratoLicencias;
        return listaContratoLicencias.filter((l) => l.estado === filtroEstado.value);
    }, [listaContratoLicencias, filtroEstado]);

    // ── Columnas ──
    const columns = useMemo(
        () => [
            columnHelper.display({
                id: 'expander',
                header: () => null,
                size: 48,
                cell: ({ row }) => (
                    <Button
                        icon={row.getIsExpanded() ? 'HeroChevronUp' : 'HeroChevronDown'}
                        size='sm'
                        onClick={row.getToggleExpandedHandler()}
                    />
                ),
            }),
            columnHelper.accessor('nombre_licencia', {
                header: 'Licencia',
                cell: (info) => (
                    <span className='font-semibold text-zinc-700 dark:text-zinc-300'>
                        {info.getValue()}
                    </span>
                ),
            }),
            columnHelper.accessor('estado', {
                header: 'Estado',
                cell: (info) => (
                    <Badge variant='solid' color={info.row.original.color_estado}>
                        {info.row.original.estado_label}
                    </Badge>
                ),
            }),
            columnHelper.display({
                id: 'cupos',
                header: 'Cupos',
                cell: ({ row }) => {
                    const usados =
                        row.original.cantidad - (row.original.licencias_disponibles ?? 0);
                    return (
                        <span className='text-sm text-zinc-500'>
                            {usados}/{row.original.cantidad}
                        </span>
                    );
                },
            }),
            columnHelper.accessor('fecha_fin', {
                header: 'Vencimiento',
                cell: (info) => {
                    const valor = info.getValue();
                    if (!valor)
                        return <span className='italic text-zinc-400'>Indefinido</span>;
                    const dias = info.row.original.dias_restantes_licencia;
                    const esProximo =
                        info.row.original.estado === 'activa' && dias != null && dias <= 30;
                    return (
                        <span>
                            <span className={esProximo ? 'font-semibold text-red-500' : 'text-zinc-500'}>
                                {dayjs(valor).format('DD/MM/YYYY')}
                            </span>
                            {esProximo && dias != null && dias > 0 && (
                                <span className='ml-1 text-xs text-amber-500'>({dias}d)</span>
                            )}
                            {esProximo && dias != null && dias <= 0 && (
                                <span className='ml-1 text-xs text-red-500'>(vencida)</span>
                            )}
                        </span>
                    );
                },
            }),
            columnHelper.display({
                id: 'acciones',
                header: 'Acciones',
                cell: ({ row }) => (
                    <div className='flex items-center justify-center gap-1'>
                        <Tooltip text='Ver detalle'>
                            <Button
                                color='violet'
                                variant='solid'
                                icon='HeroEye'
                                size='sm'
                                onClick={() =>
                                    navigate(
                                        `/empresa/detalle-cliente/${detalleCliente?.id}/contrato/${row.original.contrato}/licencia/${row.original.id}?tab=asignaciones`,
                                    )
                                }
                            />
                        </Tooltip>
                        <Tooltip text='Cambiar estado'>
                            <Button
                                icon='HeroArrowPath'
                                size='sm'
                                onClick={() =>
                                    setModalEstado({
                                        open: true,
                                        licenciaId: row.original.id,
                                        estado: row.original.estado,
                                        estadoLabel: row.original.estado_label,
                                        color: row.original.color_estado,
                                        sePuedeCancelar: row.original.se_puede_cancelar,
                                    })
                                }
                            />
                        </Tooltip>
                    </div>
                ),
            }),
        ],
        [detalleCliente?.id, navigate],
    );

    const table = useReactTable({
        data: licenciasFiltradas,
        columns,
        state: { sorting, globalFilter, expanded },
        onSortingChange: setSorting,
        onGlobalFilterChange: setGlobalFilter,
        onExpandedChange: setExpanded,
        enableGlobalFilter: true,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getExpandedRowModel: getExpandedRowModel(),
    });

    return (
        <div className='flex flex-col gap-4'>
            {/* ── Métricas ── */}
            {listaContratoLicencias.length > 0 && (
                <div className='grid grid-cols-2 gap-3 lg:grid-cols-4'>
                    <Card>
                        <CardBody className='flex items-center gap-3 py-3'>
                            <Icon
                                icon='HeroRectangleStack'
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
                                <p className='text-xs text-zinc-500'>Activas</p>
                                <p className='text-xl font-bold'>{metricas.activas}</p>
                            </div>
                        </CardBody>
                    </Card>
                    <Card>
                        <CardBody className='flex items-center gap-3 py-3'>
                            <Icon
                                icon='HeroClock'
                                size='text-2xl'
                                className='text-amber-500'
                            />
                            <div>
                                <p className='text-xs text-zinc-500'>Por vencer</p>
                                <p className='text-xl font-bold'>{metricas.porVencer}</p>
                            </div>
                        </CardBody>
                    </Card>
                    <Card>
                        <CardBody className='flex items-center gap-3 py-3'>
                            <Icon
                                icon='HeroXCircle'
                                size='text-2xl'
                                className='text-red-500'
                            />
                            <div>
                                <p className='text-xs text-zinc-500'>Vencidas/Canc.</p>
                                <p className='text-xl font-bold'>{metricas.vencidas}</p>
                            </div>
                        </CardBody>
                    </Card>
                </div>
            )}

            {/* ── Tabla principal ── */}
            <Card>
                <CardHeader>
                    <CardHeaderChild>
                        <Badge className='text-xl'>Asignaciones de licencias</Badge>
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
                                    options={ESTADOS_LICENCIA}
                                    value={filtroEstado}
                                    onChange={(val) =>
                                        setFiltroEstado(val as TSelectOption | null)
                                    }
                                    isClearable
                                    placeholder='Estado...'
                                />
                            </div>
                        </div>
                    </CardHeaderChild>
                </CardHeader>
                <CardBody className='z-0'>
                    {listaContratoLicencias.length === 0 ? (
                        <div className='flex flex-col items-center gap-3 py-8 text-center'>
                            <Icon
                                icon='HeroRectangleStack'
                                size='text-4xl'
                                className='text-zinc-300 dark:text-zinc-600'
                            />
                            <p className='text-sm text-zinc-500'>
                                Este cliente no tiene licencias asociadas.
                            </p>
                            {onIrAContratos && (
                                <Button
                                    variant='solid'
                                    color='blue'
                                    icon='HeroArrowRight'
                                    onClick={onIrAContratos}>
                                    Ir a Contratos para agregar una licencia
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className='overflow-auto'>
                            <Table className='min-w-[700px]'>
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
                                    {table.getRowModel().rows.map((row) => (
                                        <>
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
                                            {row.getIsExpanded() && (
                                                <Tr key={row.id + '-expanded'}>
                                                    <Td
                                                        colSpan={columns.length}
                                                        className='p-0'>
                                                        <ExpandedLicenciaRow
                                                            licencia={row.original}
                                                            detalleCliente={detalleCliente}
                                                        />
                                                    </Td>
                                                </Tr>
                                            )}
                                        </>
                                    ))}
                                </TBody>
                            </Table>
                            <div className='mt-2 min-w-[700px]'>
                                <TableCardFooterTemplateV2 table={table} />
                            </div>
                        </div>
                    )}
                </CardBody>
            </Card>

            {/* Modal cambiar estado */}
            <ModalCambiarEstadoLicencia
                isOpen={modalEstado.open}
                onClose={() => setModalEstado((prev) => ({ ...prev, open: false }))}
                licenciaId={modalEstado.licenciaId}
                estadoActual={modalEstado.estado}
                estadoActualLabel={modalEstado.estadoLabel}
                colorEstado={modalEstado.color}
                sePuedeCancelar={modalEstado.sePuedeCancelar}
            />
        </div>
    );
}

export default TablaDeUsuariosVinculadosLicencias;
