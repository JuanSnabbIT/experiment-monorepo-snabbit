import Input from '@/components/form/Input';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Icon from '@/components/icon/Icon';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import Tooltip from '@/components/ui/Tooltip';
import TableCardFooterTemplateV2 from '@/templates/Table/TableFooterTemplateV2';
import { Pages } from '@/config/pages.config';
import { IRelacionEmpresa } from '@/interface/empresas.interface';
import { IContratoTrabajador } from '@/interface/rrhh.interface';
import CrearContratoTrabajadorWizard from '@/pages/RRHH/modals/CrearContratoTrabajadorWizard';
import { useGetContratosTrabajadorPorEmpresaClienteQuery } from '@/store/slices/rrhh/contratoTrabajadorApi';
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
import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const BADGE_COLOR: Record<string, 'amber' | 'emerald' | 'red' | 'violet' | 'zinc'> = {
    borrador: 'amber',
    pendiente_aprobacion: 'amber',
    vigente: 'emerald',
    terminado: 'violet',
    anulado: 'red',
    descartado: 'zinc',
};

const OPCIONES_ESTADO: TSelectOption[] = [
    { value: 'borrador', label: 'Borrador' },
    { value: 'pendiente_aprobacion', label: 'Pendiente aprobación' },
    { value: 'vigente', label: 'Vigente' },
    { value: 'terminado', label: 'Terminado' },
    { value: 'anulado', label: 'Anulado' },
    { value: 'descartado', label: 'Descartado' },
];

const columnHelper = createColumnHelper<IContratoTrabajador>();

interface ITablaContratosLaboralesClienteProps {
    detalleCliente?: IRelacionEmpresa;
}

const TablaContratosLaboralesCliente = ({ detalleCliente }: ITablaContratosLaboralesClienteProps) => {
    const navigate = useNavigate();

    const [sorting, setSorting] = useState<SortingState>([{ id: 'id', desc: true }]);
    const [inputBuscar, setInputBuscar] = useState('');
    const [globalFilter, setGlobalFilter] = useState('');
    const [filtroEstado, setFiltroEstado] = useState<TSelectOption | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleBuscarChange = (value: string) => {
        setInputBuscar(value);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => setGlobalFilter(value), 300);
    };
    const [wizardOpen, setWizardOpen] = useState(false);

    const empresaClienteId = detalleCliente?.info_cliente?.id;

    const { data: contratos = [], isLoading } = useGetContratosTrabajadorPorEmpresaClienteQuery(
        empresaClienteId ?? '',
        { skip: !empresaClienteId },
    );

    const contratosFiltradosPorEstado = useMemo(() => {
        if (!filtroEstado) return contratos;
        return contratos.filter((contrato) => contrato.estado === filtroEstado.value);
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
            columnHelper.accessor('rut_trabajador', {
                header: 'RUT',
                cell: (info) => <span className='text-zinc-600 dark:text-zinc-400'>{info.getValue() ?? '—'}</span>,
            }),
            columnHelper.accessor('cargo', {
                header: 'Cargo',
                cell: (info) => <span className='text-zinc-600 dark:text-zinc-400'>{info.getValue() || '—'}</span>,
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
                header: 'Término',
                cell: (info) => {
                    const value = info.getValue();
                    if (!value) return <span className='italic text-zinc-400'>Indefinido</span>;
                    return <span className='text-zinc-500'>{dayjs(value).format('DD/MM/YYYY')}</span>;
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
                                    // TODO RBAC: validar permiso explicito de lectura de contrato laboral por cliente.
                                    navigate(
                                        Pages.rrhh.subPages.detalleContratoTrabajador.to.replace(
                                            ':contratoId',
                                            `${info.row.original.id}`,
                                        ) + `?from=cliente&clienteId=${detalleCliente?.id}`,
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
        data: contratosFiltradosPorEstado,
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
        <Card>
            <CardHeader className='flex justify-between items-start'>
                <div className='flex flex-col gap-1'>
                    <h2 className='text-xl font-semibold text-blue-600'>Contratos laborales</h2>
                    <p className='text-xs text-zinc-500 dark:text-zinc-400'>
                        Se muestran contratos laborales asociados a la empresa cliente seleccionada.
                    </p>
                </div>
                <div className='flex items-center gap-2'>
                    <div className='flex items-center gap-2'>
                        <Input
                            type='text'
                            value={inputBuscar}
                            onChange={(e) => handleBuscarChange(e.target.value)}
                            placeholder='Buscar nombre, RUT...'
                            name='buscarContratoLaboralCliente'
                            className='max-w-[180px]'
                        />
                        <div className='min-w-[180px]'>
                            <SelectReact
                                name='filtroEstadoLaboral'
                                options={OPCIONES_ESTADO}
                                value={filtroEstado}
                                onChange={(value) => setFiltroEstado(value as TSelectOption | null)}
                                isClearable
                                placeholder='Estado...'
                            />
                        </div>
                    </div>
                    <Tooltip text='Crear un nuevo contrato laboral para este cliente'>
                        <Button
                            variant='solid'
                            color='blue'
                            icon='HeroPlus'
                            onClick={() => {
                                // TODO RBAC: validar permiso de creacion de contratos laborales.
                                setWizardOpen(true);
                            }}>
                            Nuevo contrato laboral
                        </Button>
                    </Tooltip>
                </div>
            </CardHeader>
            <CardBody>
                <Table>
                    <THead>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <Tr key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <Th key={header.id} isColumnBorder={false} className='text-left'>
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
                            <Tr>
                                <Td colSpan={columns.length} className='text-center'>
                                    Cargando contratos laborales...
                                </Td>
                            </Tr>
                        ) : table.getRowModel().rows.length === 0 ? (
                            <Tr>
                                <Td colSpan={columns.length} className='text-center text-zinc-400'>
                                    {filtroEstado || globalFilter
                                        ? 'No hay contratos que coincidan con los filtros aplicados.'
                                        : 'No hay contratos laborales asociados a este cliente.'}
                                </Td>
                            </Tr>
                        ) : (
                            table.getRowModel().rows.map((row) => (
                                <Tr key={row.id}>
                                    {row.getVisibleCells().map((cell) => (
                                        <Td key={cell.id}>
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </Td>
                                    ))}
                                </Tr>
                            ))
                        )}
                    </TBody>
                </Table>
                <div className='mt-2'>
                    <TableCardFooterTemplateV2 table={table} />
                </div>
            </CardBody>

            <CrearContratoTrabajadorWizard
                detalleCliente={detalleCliente}
                externalIsOpen={wizardOpen}
                onExternalClose={() => setWizardOpen(false)}
            />
        </Card>
    );
};

export default TablaContratosLaboralesCliente;
