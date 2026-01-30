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
import { useState } from 'react';

const columnHelper = createColumnHelper<IItemCotizacion>();

function TablaImpuestos({ items = [] }: { items: IItemCotizacion[] }) {
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState<string>('');

    // Forzado a CLP para la pestaña de impuestos (uso interno)
    const monedaImpuestos = 'CLP';

    const columns = [
        columnHelper.accessor('nombre_item', {
            cell: (info) => (
                <div>
                    <div>{info.getValue()}</div>
                    <div className='text-xs'>{info.row.original.descripcion}</div>
                </div>
            ),
            header: 'Nombre',
        }),
        columnHelper.display({
            cell: (info) => {
                const item = info.row.original;
                const monto = item.precio_total_backend.clp;
                return <div>{formatCurrency(monto, monedaImpuestos)}</div>;
            },
            header: 'Total Neto',
        }),
        columnHelper.accessor('recargo_iva_venta', {
            cell: (info) => {
                const monto = Number(info.getValue() || 0);
                return <div>{formatCurrency(monto, monedaImpuestos)}</div>;
            },
            header: 'IVA Venta',
        }),
        columnHelper.accessor('iva_compra', {
            cell: (info) => {
                const monto = Number(info.getValue() || 0);
                return <div>{formatCurrency(monto, monedaImpuestos)}</div>;
            },
            header: 'IVA Compra',
        }),
        columnHelper.accessor('valor_ppm', {
            cell: (info) => {
                const monto = Number(info.getValue() || 0);
                return <div>{formatCurrency(monto, monedaImpuestos)}</div>;
            },
            header: 'PPM',
        }),
        columnHelper.accessor('total_impuesto', {
            cell: (info) => {
                const monto = Number(info.getValue() || 0);
                return <div>{formatCurrency(monto, monedaImpuestos)}</div>;
            },
            header: 'Total Impuesto',
        }),
        columnHelper.accessor('ganancia', {
            cell: (info) => {
                const monto = Number(info.getValue() || 0);
                return <div>{formatCurrency(monto, monedaImpuestos)}</div>;
            },
            header: 'Ganancia',
        }),
    ];

    const table = useReactTable({
        data: items,
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
                    <Badge className='text-xl'>Cotización</Badge>
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
                    <Table className='min-w-[700px] table-fixed'>
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
                    <div className='mt-2 min-w-[700px]'>
                        <TableCardFooterTemplateV2 table={table} />
                    </div>
                </div>
            </CardBody>
        </Card>
    );
}

export default TablaImpuestos;
