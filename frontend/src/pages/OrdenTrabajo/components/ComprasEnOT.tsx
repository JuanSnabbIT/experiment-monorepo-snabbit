import Icon from "@/components/icon/Icon"
import Badge from "@/components/ui/Badge"
import Card, { CardBody, CardHeader, CardHeaderChild } from "@/components/ui/Card"
import Table, { TBody, Td, Th, THead, Tr } from "@/components/ui/Table"
import AnimacionDeInputModoMovil from "@/components/utils/AnimacionDeIntputModoMovil"
import { IDetalleOrdenDeTrabajoCompra } from "@/interface/ordenTrabajo.interface"
import { listaComprasOrdenTrabajoThunk, useAppDispatch, useAppSelector } from "@/store"
import TableCardFooterTemplateV2 from "@/templates/Table/TableFooterTemplateV2"
import { createColumnHelper, flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, SortingState, useReactTable } from "@tanstack/react-table"
import { useEffect, useState } from "react"
import Button from "@/components/ui/Button"
import { useNavigate } from "react-router-dom"
import Tooltip from "@/components/ui/Tooltip"


const columnHelper = createColumnHelper<IDetalleOrdenDeTrabajoCompra>()

function ComprasEnOT() {
    const dispatch = useAppDispatch()
    const navigate = useNavigate()
    const { detalleOrdenTrabajo, listaComprasOrdenTrabajo } = useAppSelector((state) => state.ordenTrabajo)
    const [sorting, setSorting] = useState<SortingState>([])
    const [globalFilter, setGlobalFilter] = useState<string>('')

    useEffect(() => {
        if (detalleOrdenTrabajo) {
            dispatch(listaComprasOrdenTrabajoThunk({id_orden: detalleOrdenTrabajo.id}))
        }
    }, [detalleOrdenTrabajo])

    const columns = [
        columnHelper.accessor("id", {
            cell: (info) => info.getValue(),
            header: "N° de Trabajo"
        }),
        columnHelper.accessor("compra.codigo", {
            cell: (info) => info.getValue(),
            header: "Codigo"
        }),
        columnHelper.accessor("compra.nombre_proveedor", {
            cell: (info) => info.getValue(),
            header: "Proveedor"
        }),
        columnHelper.accessor("compra.estado_label", {
            cell: (info) => info.getValue(),
            header: "Estado"
        }),
        columnHelper.accessor("compra.nombre_bodega", {
            cell: (info) => info.getValue(),
            header: "Bodega"
        }),
        columnHelper.display({
            id: "acciones",
            cell: (info) => (
            <div className="flex flex-wrap gap-4">
                    {/* <AgregarItemsACompraDT detalleOTCompra={info.row.original} /> */}
                    <Tooltip text="Items en la Compra">
                        <Button variant="solid" color="violet" icon="HeroEye" onClick={() => {navigate(`/orden-trabajo/${detalleOrdenTrabajo?.id}/detalle-orden-trabajo/${info.row.original.id}/agregar-items-compra`)}}></Button>
                    </Tooltip>
                    {/* {info.row.original.compra.estado === "-" && (
                        <CompletarCompraDT detalleOTCompra={info.row.original} />
                    )} */}
                    {info.row.original.compra.estado === "1" && (
                        <Tooltip text="Ir al Detalle de Guia de Salida">
                            <Button variant="solid" icon="HeroDocument" onClick={() => {navigate(`/bodega/detalle-guia-salida-bodega/${info.row.original.insumo}`)}} />
                        </Tooltip>  
                    )}
                </div>
            ),
            header: ""
        })
    ]

    const table = useReactTable({
        data: listaComprasOrdenTrabajo,
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
    })

    return (
        <>
            <Card>
                <CardHeader>
                    <CardHeaderChild>
                        <Badge className="text-xl">Compras</Badge>
                    </CardHeaderChild>
                    <CardHeaderChild>
                        <AnimacionDeInputModoMovil globalFilter={globalFilter} setGlobalFilter={setGlobalFilter} anchoInput={200} />
                    </CardHeaderChild>
                </CardHeader>
                <CardBody className="z-0">
                    {listaComprasOrdenTrabajo.length > 0 ? (
                        <div className="overflow-auto">
                            <Table className='table-fixed min-w-[800px]'>
                                <THead>
                                    {table.getHeaderGroups().map((headerGroup) => (
                                        <Tr key={headerGroup.id}>
                                            {headerGroup.headers.map((header) => (
                                                <Th
                                                    style={{ width: header.column.getSize() }}
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
                                                                onClick: header.column.getToggleSortingHandler(),
                                                        }}>
                                                            {flexRender(
                                                                header.column.columnDef.header,
                                                                header.getContext(),
                                                            )}
                                                            {{
                                                                asc: (<Icon icon='HeroChevronUp' className='ltr:ml-1.5 rtl:mr-1.5' />),
                                                                desc: (<Icon icon='HeroChevronDown' className='ltr:ml-1.5 rtl:mr-1.5' />),
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
                            <div className="mt-2 min-w-[800px]">
                                <TableCardFooterTemplateV2 table={table} />
                            </div>
                        </div>
                    ) : (
                        <div className="text-center">No se encontraron compras</div>
                    )}
                </CardBody>
            </Card>
        </>
    )
}

export default ComprasEnOT