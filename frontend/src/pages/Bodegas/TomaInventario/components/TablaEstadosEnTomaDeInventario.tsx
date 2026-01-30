import Icon from '@/components/icon/Icon';
import Badge from '@/components/ui/Badge';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import { IEstadoTomaInventario } from '@/interface/bodega.interface';
import { listaEstadosTomaInventarioThunk, useAppDispatch, useAppSelector } from '@/store';
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
import { useEffect, useState } from 'react';

const columnHelper = createColumnHelper<IEstadoTomaInventario>();

function TablaEstadosEnTomaDeInventario() {
    const dispatch = useAppDispatch();
    const { detalleTomaInventario, listaEstadosTomaInventario } = useAppSelector(
        (state) => state.bodega,
    );
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState<string>('');

    useEffect(() => {
        if (detalleTomaInventario) {
            dispatch(listaEstadosTomaInventarioThunk({ id_toma: detalleTomaInventario.id }));
        }
    }, [detalleTomaInventario]);

    const columns = [
        columnHelper.accessor('estado_label', {
            cell: (info) => info.getValue(),
            header: 'Estado',
        }),
        columnHelper.accessor('fecha_cambio', {
            cell: (info) => (
                <div>
                    {info.getValue()
                        ? dayjs(info.getValue()).locale('es').format('DD/MM/YYYY HH:mm:ss')
                        : 'Fecha Invalida'}
                </div>
            ),
            header: 'Fecha de Cambio',
        }),
        columnHelper.accessor('observaciones', {
            cell: (info) => <div>{info.getValue() || 'Sin Observaciones'}</div>,
            header: 'Observaciones',
        }),
    ];

    const table = useReactTable({
        data: listaEstadosTomaInventario,
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
                    <Badge className='text-xl'>Estados</Badge>
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

export default TablaEstadosEnTomaDeInventario;
