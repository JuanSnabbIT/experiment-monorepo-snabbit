import Icon from '@/components/icon/Icon';
import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, { SubheaderLeft, SubheaderRight } from '@/components/layouts/Subheader/Subheader';
import ConfirmarEliminar from '@/components/modals/ConfirmarEliminar';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody } from '@/components/ui/Card';
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import Tooltip from '@/components/ui/Tooltip';
import AnimacionDeInputModoMovil from '@/components/utils/AnimacionDeIntputModoMovil';
import { IRendicion } from '@/interface/rendicion.interface';
import {
    listaMisRendicionesThunk,
    listaRendicionesThunk,
    useAppDispatch,
    useAppSelector,
} from '@/store';
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
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const columnHelper = createColumnHelper<IRendicion>();

const ListaMisRendiciones = () => {
    const dispatch = useAppDispatch();
    const { listaMisRendiciones } = useAppSelector((state) => state.rendicion);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState<string>('');
    const navigate = useNavigate();

    useEffect(() => {
        dispatch(listaMisRendicionesThunk());
    }, [dispatch]);

    const getEstadoColor = (estado: string): 'emerald' | 'red' | 'amber' | 'zinc' => {
        const estadoLower = estado?.toLowerCase() || '';

        if (estadoLower.includes('borrador')) return 'zinc';
        if (estadoLower.includes('pendiente') || estadoLower.includes('espera')) return 'amber';
        if (estadoLower.includes('aprobada') || estadoLower.includes('pagada')) return 'emerald';
        if (estadoLower.includes('rechazada')) return 'red';

        return 'zinc';
    };

    const columns = [
        columnHelper.accessor('datos_usuario.nombre_usuario', {
            cell: (info) => (
                <div className='font-semibold text-zinc-900 dark:text-zinc-100'>
                    {info.getValue()}
                </div>
            ),
            header: 'Usuario',
        }),
        columnHelper.accessor('estado', {
            cell: (info) => (
                <Badge
                    variant='solid'
                    color={getEstadoColor(info.row.original.estado_label)}
                    className='capitalize shadow-sm'>
                    {info.row.original.estado_label}
                </Badge>
            ),
            header: 'Estado',
        }),
        columnHelper.accessor('fecha_rendicion', {
            cell: (info) => (
                <div className='text-sm text-zinc-500 dark:text-zinc-400'>
                    {dayjs(info.getValue()).format('DD/MM/YYYY')}
                </div>
            ),
            header: 'Fecha Rendición',
        }),
        columnHelper.accessor('total', {
            cell: (info) => (
                <div className='font-mono font-medium text-zinc-700 dark:text-zinc-300'>
                    ${Number(info.getValue() ?? 0).toLocaleString()}
                </div>
            ),
            header: 'Total',
        }),
        columnHelper.display({
            id: 'acciones',
            header: 'Acciones',
            cell: (info) => (
                <div className='flex justify-center space-x-2'>
                    <Tooltip text='Ver Detalle'>
                        <Button
                            variant='solid'
                            color='violet'
                            onClick={() => {
                                navigate(`/rendicion/detalle-rendicion/${info.row.original.id}`);
                            }}
                            icon='HeroEye'></Button>
                    </Tooltip>
                    {(info.row.original.estado === '0' ||
                        info.row.original.estado === '1' ||
                        info.row.original.estado === '3') && (
                        <ConfirmarEliminar
                            mensaje={`Estás a punto de eliminar la Rendición del ${info.row.original.fecha_rendicion} ¿deseas continuar?`}
                            peticionUrl={`/api/rendiciones/${info.row.original.id}/`}
                            onDispatch={() => dispatch(listaRendicionesThunk())}
                        />
                    )}
                </div>
            ),
        }),
    ];

    const table = useReactTable({
        data: listaMisRendiciones,
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

    return (
        <PageWrapper isProtectedRoute={true} name='Mis Rendiciones' title='Mis Rendiciones'>
            <Subheader>
                <SubheaderLeft>
                    <AnimacionDeInputModoMovil
                        globalFilter={globalFilter}
                        setGlobalFilter={setGlobalFilter}
                        anchoInput={200}
                    />
                </SubheaderLeft>
                <SubheaderRight />
            </Subheader>
            <Container className='h-full w-full'>
                <Card className='h-full border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900'>
                    <CardBody className='z-0 overflow-auto'>
                        <div className='overflow-auto'>
                            <Table className='min-w-[1000px] table-fixed'>
                                <THead>
                                    {table.getHeaderGroups().map((headerGroup) => (
                                        <Tr key={headerGroup.id}>
                                            {headerGroup.headers.map((header) => (
                                                <Th
                                                    key={header.id}
                                                    isColumnBorder={false}
                                                    className='text-left font-semibold text-zinc-500 dark:text-zinc-400'>
                                                    {header.isPlaceholder ? null : (
                                                        <div
                                                            key={header.id}
                                                            aria-hidden='true'
                                                            {...{
                                                                className: header.column.getCanSort()
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
                                                                        className='text-zinc-400 ltr:ml-1.5 rtl:mr-1.5'
                                                                    />
                                                                ),
                                                                desc: (
                                                                    <Icon
                                                                        icon='HeroChevronDown'
                                                                        className='text-zinc-400 ltr:ml-1.5 rtl:mr-1.5'
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
                                        <Tr
                                            key={row.id}
                                            className='transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50'>
                                            {row.getVisibleCells().map((cell) => (
                                                <Td
                                                    key={cell.id}
                                                    className='border-b border-zinc-100 dark:border-zinc-800/50'>
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
                            <div className='mt-2 min-w-[1000px]'>
                                <TableCardFooterTemplateV2 table={table} />
                            </div>
                        </div>
                    </CardBody>
                </Card>
            </Container>
        </PageWrapper>
    );
};

export default ListaMisRendiciones;
