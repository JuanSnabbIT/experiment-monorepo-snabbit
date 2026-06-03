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
import { Pages } from '@/config/pages.config';
import { IContratoTrabajador } from '@/interface/rrhh.interface';
import { useAppSelector } from '@/store';
import { useGetContratosTrabajadorQuery } from '@/store/slices/rrhh/contratoTrabajadorApi';
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
import CrearContratoTrabajadorWizard from './modals/CrearContratoTrabajadorWizard';

// ── Colores de estado ──
const BADGE_COLOR: Record<string, 'amber' | 'blue' | 'emerald' | 'red' | 'zinc'> = {
    borrador: 'zinc',
    pendiente_aprobacion: 'amber',
    vigente: 'emerald',
    terminado: 'zinc',
    anulado: 'red',
    descartado: 'zinc',
};

const OPCIONES_ESTADO: TSelectOption[] = [
    { value: 'borrador', label: 'Borrador' },
    { value: 'pendiente_aprobacion', label: 'Pendiente aprobacion' },
    { value: 'vigente', label: 'Vigente' },
    { value: 'terminado', label: 'Terminado' },
    { value: 'anulado', label: 'Anulado' },
    { value: 'descartado', label: 'Descartado' },
];

const columnHelper = createColumnHelper<IContratoTrabajador>();

// ── Componente ──
const ListaContratosTrabajador = () => {
    const navigate = useNavigate();
    const { personalizacionUsuario } = useAppSelector((state) => state.auth);
    const sucursalPrincipalSeleccionada = personalizacionUsuario?.sucursal_principal;

    const { data: contratos = [], isLoading } = useGetContratosTrabajadorQuery(undefined, {
        skip: !personalizacionUsuario?.empresa || !sucursalPrincipalSeleccionada,
    });

    const [sorting, setSorting] = useState<SortingState>([{ id: 'id', desc: true }]);
    const [globalFilter, setGlobalFilter] = useState('');
    const [filtroEstado, setFiltroEstado] = useState<TSelectOption | null>(null);
    const [wizardOpen, setWizardOpen] = useState(false);

    const contratosFiltrados = useMemo(() => {
        if (!filtroEstado) return contratos;
        return contratos.filter((c) => c.estado === filtroEstado.value);
    }, [contratos, filtroEstado]);

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
            columnHelper.accessor('nombre_trabajador', {
                header: 'Trabajador',
                cell: (info) => (
                    <span className='font-semibold text-zinc-700 dark:text-zinc-300'>
                        {info.getValue() ?? '—'}
                    </span>
                ),
            }),
            columnHelper.accessor('cargo', {
                header: 'Cargo',
                cell: (info) => (
                    <span className='text-zinc-600 dark:text-zinc-400'>{info.getValue() || '—'}</span>
                ),
            }),
            columnHelper.accessor('tipo_contrato', {
                header: 'Tipo',
                cell: (info) => (
                    <Badge variant='outline' color='blue'>
                        {info.row.original.tipo_contrato_label ?? info.getValue()}
                    </Badge>
                ),
            }),
            columnHelper.accessor('estado', {
                header: 'Estado',
                cell: (info) => (
                    <Badge
                        variant='solid'
                        color={BADGE_COLOR[info.getValue()] ?? 'zinc'}
                        className='capitalize'>
                        {info.row.original.estado_label ?? info.getValue()}
                    </Badge>
                ),
            }),
            columnHelper.accessor('fecha_inicio', {
                header: 'Inicio',
                cell: (info) => (
                    <span className='text-zinc-500'>
                        {info.getValue() ? dayjs(info.getValue()).format('DD/MM/YYYY') : '—'}
                    </span>
                ),
            }),
            columnHelper.accessor('fecha_termino', {
                header: 'Termino',
                cell: (info) => {
                    const val = info.getValue();
                    if (!val) return <span className='italic text-zinc-400'>Indefinido</span>;
                    const dias = dayjs(val).diff(dayjs(), 'day');
                    const proximo = dias >= 0 && dias <= 30;
                    return (
                        <span className={proximo ? 'font-semibold text-red-500' : 'text-zinc-500'}>
                            {dayjs(val).format('DD/MM/YYYY')}
                            {proximo && <span className='ml-1 text-xs'>({dias}d)</span>}
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
                                    navigate(
                                        Pages.rrhh.subPages.detalleContratoTrabajador.to.replace(
                                            ':contratoId',
                                            `${info.row.original.id}`,
                                        ),
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

    return (
        <PageWrapper isProtectedRoute name='Contratos Laborales' title='Contratos Laborales'>
            <Subheader>
                <SubheaderLeft>
                    <Input
                        type='text'
                        value={globalFilter}
                        onChange={(e) => setGlobalFilter(e.target.value)}
                        placeholder='Buscar...'
                        name='busqueda'
                    />
                </SubheaderLeft>
                <SubheaderRight>
                    <div className='flex items-center gap-2'>
                        <div className='min-w-[180px]'>
                            <SelectReact
                                name='filtroEstado'
                                options={OPCIONES_ESTADO}
                                value={filtroEstado}
                                onChange={(val) => setFiltroEstado(val as TSelectOption | null)}
                                isClearable
                                placeholder='Estado...'
                            />
                        </div>
                        <Tooltip
                            text={
                                sucursalPrincipalSeleccionada
                                    ? 'Crear un nuevo contrato laboral'
                                    : 'Selecciona una sucursal antes de crear un contrato'
                            }>
                            <div className='inline-block'>
                                <Button
                                    variant='solid'
                                    color='blue'
                                    icon='HeroPlus'
                                    isDisable={!sucursalPrincipalSeleccionada}
                                    onClick={() => {
                                        if (sucursalPrincipalSeleccionada) {
                                            setWizardOpen(true);
                                        }
                                    }}>
                                    Nuevo Contrato
                                </Button>
                            </div>
                        </Tooltip>
                    </div>
                </SubheaderRight>
            </Subheader>

            <Container className='h-full w-full'>
                <Card>
                    <CardHeader>
                        <CardHeaderChild>
                            <span className='text-lg font-semibold'>Contratos Laborales</span>
                        </CardHeaderChild>
                        <CardHeaderChild>
                            <span className='text-sm text-zinc-500'>
                                {table.getFilteredRowModel().rows.length} contrato
                                {table.getFilteredRowModel().rows.length !== 1 ? 's' : ''}
                            </span>
                        </CardHeaderChild>
                    </CardHeader>
                    <CardBody>
                        <Table>
                            <THead>
                                {table.getHeaderGroups().map((hg) => (
                                    <Tr key={hg.id}>
                                        {hg.headers.map((h) => (
                                            <Th key={h.id}>
                                                {h.isPlaceholder
                                                    ? null
                                                    : flexRender(
                                                          h.column.columnDef.header,
                                                          h.getContext(),
                                                      )}
                                            </Th>
                                        ))}
                                    </Tr>
                                ))}
                            </THead>
                            <TBody>
                                {isLoading ? (
                                    <Tr>
                                        <Td colSpan={columns.length} className='text-center'>
                                            Cargando...
                                        </Td>
                                    </Tr>
                                ) : table.getRowModel().rows.length === 0 ? (
                                    <Tr>
                                        <Td
                                            colSpan={columns.length}
                                            className='text-center text-zinc-400'>
                                            No hay contratos laborales
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
                    </CardBody>
                </Card>
            </Container>

            <CrearContratoTrabajadorWizard
                externalIsOpen={wizardOpen}
                onExternalClose={() => setWizardOpen(false)}
            />
        </PageWrapper>
    );
};

export default ListaContratosTrabajador;
