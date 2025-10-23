import { useEffect, useState } from 'react';
import { listaHistorialCambiosThunk, useAppDispatch, useAppSelector } from '@/store';
import Badge from '@/components/ui/Badge';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import { IHistorialCambiosOrden } from '@/interface/ordenTrabajo.interface';
import Icon from '@/components/icon/Icon';
import Table, { THead, Tr, Th, TBody, Td } from '@/components/ui/Table';
import TableCardFooterTemplateV2 from '@/templates/Table/TableFooterTemplateV2';
import { createColumnHelper, flexRender, getCoreRowModel, getFilteredRowModel, getSortedRowModel, SortingState, useReactTable } from '@tanstack/react-table';
import Collapse from '@/components/utils/Collapse';
import Button from '@/components/ui/Button';
import dayjs from 'dayjs';


const columnHelper = createColumnHelper<IHistorialCambiosOrden>()

const HistorialCambios = ({ordenId} : {ordenId: number | string | undefined}) => {
    const dispatch = useAppDispatch()
    const { listaHistorialCambios } = useAppSelector((state) => state.ordenTrabajo)
    const [historialAbierto, setHistorialAbierto] = useState<number | undefined>()
    const [isOpening, setIsOpening] = useState<boolean>(false)
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState<string>('');

    useEffect(() => {
        dispatch(listaHistorialCambiosThunk({id_orden: ordenId}))
    }, [])

    const columns = [
        columnHelper.accessor("fecha_cambio", {
            cell: (info) => (
                <div>{dayjs(info.row.original.fecha_cambio).format("DD-MM-YYYY")}</div>
            ),
            header: "Fecha del Cambio"
        }),
        columnHelper.accessor("nombre_usuario", {
            cell: (info) => info.getValue(),
            header: "Usuario"
        }),
        columnHelper.display({
            id: "estados",
            cell: (info) => (
                <div>
                    <Button isDisable={isOpening} variant='solid' icon={historialAbierto === info.row.original.id ? "DuoAngleDown" : "DuoAngleUp"} color='sky' onClick={() => {
                        if (isOpening) return;
                        setIsOpening(true);
                        if (historialAbierto === info.row.original.id) {
                            setHistorialAbierto(undefined);
                        } else {
                            setHistorialAbierto(info.row.original.id);
                        }
                        setTimeout(() => setIsOpening(false), 300);
                    }}></Button>
                    <Collapse isOpen={historialAbierto === info.row.original.id} className="transition-opacity">
                        <div className="p-3 rounded-md shadow-sm">
                            <Badge className="mb-1">Estado Anterior</Badge>
                            <div className="ml-4">
                                <p className="text-sm">{info.row.original.estado_anterior}</p>
                            </div>
                        </div>
                        <div className="p-3 rounded-md shadow-sm">
                            <Badge className="mb-1">Estado Actual</Badge>
                            <div className="ml-4">
                                <p className="text-sm">{info.row.original.estado_actual}</p>
                            </div>
                        </div>
                        <div className="p-3 rounded-md shadow-sm">
                            <Badge className="mb-1">Comeentario</Badge>
                            <div className="ml-4">
                                <p className="text-sm">{info.row.original.comentario}</p>
                            </div>
                        </div>
                    </Collapse>
                </div>
            ),
            header: "Comentario"
        })
    ]

    const table = useReactTable({
        data: listaHistorialCambios,
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
    });

    return (
        <Card>
            <CardHeader>
                <CardHeaderChild>
                    <Badge className='text-xl'>Historial de Cambios</Badge>
                </CardHeaderChild>
            </CardHeader>
            <CardBody className='z-0'>
                <div className='overflow-auto'>
                    {listaHistorialCambios.length > 0 ? (
                        <>
                            <Table className='table-fixed min-w-[500px]'>
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
                                                            }[header.column.getIsSorted() as string] ?? null}
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
                                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                </Td>
                                            ))}
                                        </Tr>
                                    ))}
                                </TBody>
                            </Table>
                            <div className="mt-2 min-w-[500px]">
                                <TableCardFooterTemplateV2 table={table} />
                            </div>
                        </>
                    ) : (
                        <div className="text-center text-gray-500">No hay cambios sobre la OT.</div>
                    )}
                </div>
            </CardBody>
        </Card>
    )

};

export default HistorialCambios;
