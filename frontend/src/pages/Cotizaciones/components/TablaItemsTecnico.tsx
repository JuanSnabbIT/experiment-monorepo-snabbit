import Icon from '@/components/icon/Icon';
import Badge from '@/components/ui/Badge';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import AnimacionDeInputModoMovil from '@/components/utils/AnimacionDeIntputModoMovil';
import { IItemCotizacion } from '@/interface/cotizaciones.interface';
import TableCardFooterTemplateV2 from '@/templates/Table/TableFooterTemplateV2';
import { formatCurrency } from '@/utils/currency';
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
import { useMemo, useState } from 'react';

const columnHelper = createColumnHelper<IItemCotizacion>();

import { ICotizacion } from '@/interface/cotizaciones.interface';

function TablaItemsTecnico({
    items = [],
    cotizacion,
}: {
    items: IItemCotizacion[];
    cotizacion: ICotizacion | undefined;
}) {
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState<string>('');

    const tipoMoneda = cotizacion?.tipo_moneda;

    const columns = useMemo(
        () => [
            columnHelper.accessor('nombre_item', {
                cell: (info) => (
                    <div>
                        <div>{info.getValue()}</div>
                        <div className='text-xs text-gray-500'>{info.row.original.descripcion}</div>
                    </div>
                ),
                header: 'Nombre',
            }),
            columnHelper.accessor('nombre_proveedor', {
                cell: (info) => <div>{info.row.original.nombre_proveedor || 'Sin Proveedor'}</div>,
                header: 'Proveedor',
            }),
            columnHelper.accessor('cantidad', {
                cell: (info) => info.getValue(),
                header: 'Cantidad',
            }),
            columnHelper.accessor('precio_unitario', {
                cell: (info) =>
                    formatCurrency(info.getValue(), info.row.original.tipo_moneda_proveedor),
                header: 'Precio Unitario',
            }),
            columnHelper.accessor('costo_total', {
                cell: (info) => {
                    const costoTotal =
                        info.getValue() ||
                        parseFloat(info.row.original.precio_unitario || '0') *
                            info.row.original.cantidad;
                    return formatCurrency(costoTotal, info.row.original.tipo_moneda_proveedor);
                },
                header: 'Total Neto',
            }),
        ],
        [tipoMoneda],
    );

    const table = useReactTable({
        data: items || [],
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
        <Card>
            <CardHeader>
                <CardHeaderChild>
                    <Badge className='text-xl'>Items</Badge>
                </CardHeaderChild>
                <CardHeaderChild>
                    <AnimacionDeInputModoMovil
                        globalFilter={globalFilter}
                        setGlobalFilter={setGlobalFilter}
                        anchoInput={200}
                    />
                </CardHeaderChild>
            </CardHeader>
            <CardBody className='z-0'>
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
                                                                className='ltr:ml-1.5 rtl:mr-1.5'
                                                            />
                                                        ),
                                                        desc: (
                                                            <Icon
                                                                icon='HeroChevronDown'
                                                                className='ltr:ml-1.5 rtl:mr-1.5'
                                                            />
                                                        ),
                                                    }[header.column.getIsSorted() as string] ??
                                                        null}
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
            </CardBody>
        </Card>
    );
}

export default TablaItemsTecnico;
