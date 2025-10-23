import Input from "@/components/form/Input"
import Icon from "@/components/icon/Icon"
import Badge from "@/components/ui/Badge"
import Card, { CardBody, CardHeader, CardHeaderChild } from "@/components/ui/Card"
import Table, { TBody, Td, Th, THead, Tr } from "@/components/ui/Table"
import { IComentarioCotizacion } from "@/interface/cotizaciones.interface"
import { listaComentarioCotizacionThunk, useAppDispatch, useAppSelector } from "@/store"
import TableCardFooterTemplateV2 from "@/templates/Table/TableFooterTemplateV2"
import { createColumnHelper, flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, SortingState, useReactTable } from "@tanstack/react-table"
import dayjs from "dayjs"
import { useEffect, useState } from "react"
import ModalCrearComentario from "../modals/ModalCrearComentario"
import AnimacionDeInputModoMovil from "@/components/utils/AnimacionDeIntputModoMovil"


const columnHelper = createColumnHelper<IComentarioCotizacion>()

function TablaComentarios() {
    const dispatch = useAppDispatch()
    const { detalleCotizacion, listaComentariosCotizacion } = useAppSelector((state) => state.cotizacion)
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState<string>('');

    useEffect(() => {
        if (detalleCotizacion) {
            dispatch(listaComentarioCotizacionThunk({id_cotizacion: detalleCotizacion.id}))
        }
    }, [detalleCotizacion])

    const columns = [
        columnHelper.accessor("nombre_creado_por", {
            cell: (info) => info.getValue(),
            header: "Nombre"
        }),
        columnHelper.accessor("fecha_creacion", {
            cell: (info) => (
                <div>{dayjs(info.row.original.fecha_creacion).format("DD/MM/YYYY")}</div>
            ),
            header: "Fecha de Creación"
        }),
        columnHelper.accessor("comentario", {
            cell: (info) => info.row.original.comentario,
            header: "Comentario"
        })
    ]

    const table = useReactTable({
        data: listaComentariosCotizacion,
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
        getPaginationRowModel: getPaginationRowModel()
    });

    return (
        <Card>
            <CardHeader>
                <CardHeaderChild>
                    <Badge className="text-xl">Comentarios</Badge>
                </CardHeaderChild>
                <CardHeaderChild>
                    <AnimacionDeInputModoMovil globalFilter={globalFilter} setGlobalFilter={setGlobalFilter} anchoInput={130}>
                        <ModalCrearComentario />
                    </AnimacionDeInputModoMovil>
                </CardHeaderChild>
            </CardHeader>
            <CardBody className="z-0">
                <div className="overflow-auto">
                    <Table className='table-fixed min-w-[900px]'>
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
                    <div className="mt-2 min-w-[900px]">
                        <TableCardFooterTemplateV2 table={table} />
                    </div>
                </div>
            </CardBody>
        </Card>
    )
}

export default TablaComentarios