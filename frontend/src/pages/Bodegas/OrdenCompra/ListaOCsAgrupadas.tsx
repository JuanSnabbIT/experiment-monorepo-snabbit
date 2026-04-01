import Icon from '@/components/icon/Icon';
import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, { SubheaderLeft, SubheaderRight } from '@/components/layouts/Subheader/Subheader';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody } from '@/components/ui/Card';
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import Tooltip from '@/components/ui/Tooltip';
import AnimacionDeInputModoMovil from '@/components/utils/AnimacionDeIntputModoMovil';
import { IOrdenCompraAgrupada } from '@/interface/bodega.interface';
import CrearOCDeCotizacion from '@/pages/Cotizaciones/modals/CrearOCDeCotizacion';
import { useAppSelector } from '@/store';
import { useGetOCsAgrupadasPorEmpresaQuery } from '@/store/slices/bodega/ordenCompraApi';
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
import 'dayjs/locale/es';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const columnHelper = createColumnHelper<IOrdenCompraAgrupada>();

function colorEstadoAgrupada(
    estado: string,
): 'emerald' | 'amber' | 'red' | 'blue' | 'zinc' {
    if (estado === 'completada') return 'emerald';
    if (estado === 'en_proceso') return 'blue';
    if (estado === 'parcialmente_completada') return 'amber';
    if (estado === 'cancelada') return 'red';
    return 'zinc';
}

function ListaOCsAgrupadas() {
    const navigate = useNavigate();
    const { personalizacionUsuario } = useAppSelector((state) => state.auth);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState<string>('');

    const empresaId = personalizacionUsuario?.empresa ?? '';

    const { data: listaOCsAgrupadas = [], isLoading } = useGetOCsAgrupadasPorEmpresaQuery(
        { id_empresa: empresaId },
        { skip: !empresaId },
    );

    const columns = [
        columnHelper.accessor('codigo', {
            cell: (info) => (
                <span className='font-bold text-gray-600 dark:text-gray-400'>
                    {info.getValue()}
                </span>
            ),
            header: 'Código',
        }),
        columnHelper.display({
            id: 'cliente',
            header: 'Cliente',
            cell: (info) => (
                <div className='flex items-center gap-2'>
                    <span className='font-semibold text-gray-700 dark:text-gray-300'>
                        {info.row.original.nombre_cliente ?? '—'}
                    </span>
                    {info.row.original.es_prospecto && (
                        <Badge color='amber' variant='outline'>
                            Prospecto
                        </Badge>
                    )}
                </div>
            ),
        }),
        columnHelper.display({
            id: 'grupos',
            header: 'Grupos proveedor',
            cell: (info) => (
                <span className='text-gray-500'>
                    {info.row.original.grupos_proveedor?.length ?? 0} grupo(s)
                </span>
            ),
        }),
        columnHelper.accessor('estado_derivado_label', {
            cell: (info) => {
                const estado = info.row.original.estado_derivado;
                return (
                    <Badge variant='solid' color={colorEstadoAgrupada(estado)}>
                        {info.getValue()}
                    </Badge>
                );
            },
            header: 'Estado',
        }),
        columnHelper.accessor('fecha_creacion', {
            cell: (info) => (
                <span className='text-gray-500'>
                    {dayjs(info.getValue()).format('DD/MM/YYYY')}
                </span>
            ),
            header: 'Fecha',
        }),
        columnHelper.display({
            id: 'acciones',
            header: 'Acciones',
            cell: (info) => (
                <div className='flex gap-2'>
                    <Tooltip text='Ver detalle'>
                        <Button
                            variant='solid'
                            color='violet'
                            icon='HeroEye'
                            onClick={() =>
                                navigate(`/compras/oc-agrupada/${info.row.original.id}`)
                            }
                        />
                    </Tooltip>
                </div>
            ),
        }),
    ];

    const table = useReactTable({
        data: listaOCsAgrupadas,
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
        <PageWrapper isProtectedRoute={true} name='OCs Agrupadas' title='OCs Agrupadas'>
            <Subheader>
                <SubheaderLeft>
                    <AnimacionDeInputModoMovil
                        globalFilter={globalFilter}
                        setGlobalFilter={setGlobalFilter}
                        anchoInput={200}
                    />
                </SubheaderLeft>
                <SubheaderRight>
                    <CrearOCDeCotizacion />
                </SubheaderRight>
            </Subheader>
            <Container className='h-full w-full'>
                <Card>
                    <CardBody className='z-0'>
                        {isLoading ? (
                            <div className='py-8 text-center text-gray-400'>Cargando...</div>
                        ) : (
                            <div className='overflow-auto'>
                                <Table className='min-w-[800px] table-fixed'>
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
                                <div className='mt-2 min-w-[800px]'>
                                    <TableCardFooterTemplateV2 table={table} />
                                </div>
                            </div>
                        )}
                    </CardBody>
                </Card>
            </Container>
        </PageWrapper>
    );
}

export default ListaOCsAgrupadas;
