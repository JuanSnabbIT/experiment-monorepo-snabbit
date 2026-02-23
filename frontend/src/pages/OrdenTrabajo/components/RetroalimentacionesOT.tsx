import Icon from '@/components/icon/Icon';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import Tooltip from '@/components/ui/Tooltip';
import { IRetroalimentacionOT } from '@/interface/ordenTrabajo.interface';
import {
    useGetDetalleOrdenTrabajoQuery,
    useGetRetroalimentacionesOTQuery,
} from '@/store/slices/ordenTrabajo/ordenTrabajoApi';
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
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const columnHelper = createColumnHelper<IRetroalimentacionOT>();

function RetroalimentacionesOT() {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const ordenId = id ? Number(id) : undefined;
    const { data: detalleOrdenTrabajo } = useGetDetalleOrdenTrabajoQuery(ordenId ?? 0, {
        skip: !ordenId,
    });
    const { data: listaRetroalimentacionesOT = [] } = useGetRetroalimentacionesOTQuery(
        ordenId ?? 0,
        { skip: !ordenId },
    );
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState<string>('');

    const columns = [
        columnHelper.display({
            id: 'usuario',
            cell: (info) => (
                <div>
                    {info.row.original.usuario_empresa ? (
                        <>
                            <div>{info.row.original.datos_usuario?.nombre}</div>
                            <div className='text-sm text-gray-500'>
                                {info.row.original.datos_usuario?.correo}
                            </div>
                        </>
                    ) : (
                        <>
                            <div>{info.row.original.usuario_externo}</div>
                            <div className='text-sm text-gray-500'>
                                {info.row.original.correo_usuario_externo}
                            </div>
                        </>
                    )}
                </div>
            ),
            header: 'Destinatario',
        }),
        columnHelper.display({
            id: 'estado',
            cell: (info) => (
                <div>
                    {info.row.original.fecha_retroalimentacion ? (
                        <Badge color='emerald' variant='solid'>
                            Respondida {dayjs(info.row.original.fecha_retroalimentacion).format('DD/MM/YYYY')}
                        </Badge>
                    ) : (
                        <Badge color='amber' variant='solid'>
                            Pendiente
                        </Badge>
                    )}
                </div>
            ),
            header: 'Estado',
        }),
        columnHelper.accessor('cantidad_visitas', {
            cell: (info) => info.getValue(),
            header: 'Visitas',
            size: 80,
        }),
        columnHelper.display({
            id: 'acciones',
            cell: (info) => (
                <div>
                    <Tooltip text='Ver detalle'>
                        <Button
                            variant='solid'
                            color='violet'
                            icon='HeroEye'
                            onClick={() => {
                                navigate(
                                    `/orden-trabajo/detalle-retroalimentacion/${info.row.original.id}/`,
                                );
                            }}></Button>
                    </Tooltip>
                </div>
            ),
        }),
    ];

    const table = useReactTable({
        data: listaRetroalimentacionesOT,
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
                    <Badge className='text-xl'>Retroalimentaciones</Badge>
                </CardHeaderChild>
                <CardHeaderChild></CardHeaderChild>
            </CardHeader>
            <CardBody className='z-0'>
                <div className='overflow-auto'>
                    {listaRetroalimentacionesOT.length > 0 ? (
                        <>
                            <Table className='min-w-[500px] table-fixed'>
                                <THead>
                                    {table.getHeaderGroups().map((headerGroup) => (
                                        <Tr key={headerGroup.id}>
                                            {headerGroup.headers.map((header) => (
                                                <Th
                                                    key={header.id}
                                                    style={{ width: header.column.getSize() }}
                                                    isColumnBorder={false}
                                                    className='text-left'>
                                                    {header.isPlaceholder ? null : (
                                                        <div
                                                            key={header.id}
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
                            <div className='mt-2 min-w-[500px]'>
                                <TableCardFooterTemplateV2 table={table} />
                            </div>
                        </>
                    ) : (
                        <div className='text-center'>No se encontraron retroalimentaciones</div>
                    )}
                </div>
            </CardBody>
        </Card>
    );
}

export default RetroalimentacionesOT;
