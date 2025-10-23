import Icon from "@/components/icon/Icon"
import Badge from "@/components/ui/Badge"
import Card, { CardBody, CardHeader, CardHeaderChild } from "@/components/ui/Card"
import Table, { TBody, Td, Th, THead, Tr } from "@/components/ui/Table"
import AnimacionDeInputModoMovil from "@/components/utils/AnimacionDeIntputModoMovil"
import { IItemCotizacion } from "@/interface/cotizaciones.interface"
import { listaItemsEnCotizacionThunk, useAppDispatch, useAppSelector } from "@/store"
import TableCardFooterTemplateV2 from "@/templates/Table/TableFooterTemplateV2"
import { createColumnHelper, flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, SortingState, useReactTable } from "@tanstack/react-table"
import { useEffect, useState } from "react"


const columnHelper = createColumnHelper<IItemCotizacion>();

function TablaImpuestos() {
    const dispatch = useAppDispatch()
    const { detalleCotizacion, listaItemsEnCotizacion } = useAppSelector((state) => state.cotizacion)
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState<string>('');

    useEffect(() => {
        if (detalleCotizacion) {
            dispatch(listaItemsEnCotizacionThunk({id_cotizacion: detalleCotizacion.id}));
        }
    }, [detalleCotizacion])

    const columns = [
        columnHelper.accessor("nombre_item", {
            cell: (info) => (
                <div>
                    <div>{info.getValue()}</div>
                    <div className='text-xs'>{info.row.original.descripcion}</div>
                </div>
            ),
            header: "Nombre"
        }),
        columnHelper.display({
            cell: (info) => (
                <div>
                    {
                        detalleCotizacion?.tipo_moneda === "1" ? `${Number(Number(info.row.original.costo_total).toFixed(2)).toLocaleString()} USD` :
                        detalleCotizacion?.tipo_moneda === "2" ? `$${Number(Number(info.row.original.costo_total).toFixed(0)).toLocaleString()}` :
                        detalleCotizacion?.tipo_moneda === "3" ? `${Number(Number(info.row.original.costo_total).toFixed(2)).toLocaleString()} UF` : `${Number(Number(info.row.original.costo_total).toFixed(0)).toLocaleString()}`
                    }
                </div>
            ),
            header: "Total Neto"
        }),
        columnHelper.accessor("recargo_iva_venta", {
            cell: (info) => (
                <div>
                    {
                        detalleCotizacion?.tipo_moneda === "1" ? `${Number(info.getValue().toFixed(1)).toLocaleString()} USD` : 
                        detalleCotizacion?.tipo_moneda === "2" ? `$${Number(info.getValue().toFixed(0)).toLocaleString()}` : 
                        detalleCotizacion?.tipo_moneda === "3" ? `${Number(info.getValue().toFixed(2)).toLocaleString()} UF` : 
                        `${Number(info.getValue().toFixed(0)).toLocaleString()}`
                    }
                </div>
            ),
            header: "IVA Venta"
        }),
        columnHelper.accessor("iva_compra", {
            cell: (info) => (
                <div>
                    {
                        detalleCotizacion?.tipo_moneda === "1" ? `${Number(info.getValue().toFixed(1)).toLocaleString()} USD` : 
                        detalleCotizacion?.tipo_moneda === "2" ? `$${Number(info.getValue().toFixed(0)).toLocaleString()}` : 
                        detalleCotizacion?.tipo_moneda === "3" ? `${Number(info.getValue().toFixed(2)).toLocaleString()} UF` : 
                        `${Number(info.getValue().toFixed(0)).toLocaleString()}`
                    }
                </div>
            ),
            header: "IVA Compra"
        }),
        columnHelper.accessor("valor_ppm", {
            cell: (info) => (
                <div>
                    {
                        detalleCotizacion?.tipo_moneda === "1" ? `${Number(info.getValue().toFixed(1)).toLocaleString()} USD` : 
                        detalleCotizacion?.tipo_moneda === "2" ? `$${Number(info.getValue().toFixed(0)).toLocaleString()}` : 
                        detalleCotizacion?.tipo_moneda === "3" ? `${Number(info.getValue().toFixed(2)).toLocaleString()} UF` : 
                        `${Number(info.getValue().toFixed(0)).toLocaleString()}`
                    }
                </div>
            ),
            header: "PPM"
        }),
        columnHelper.accessor("total_impuesto", {
            cell: (info) => (
                <div>
                    {
                        detalleCotizacion?.tipo_moneda === "1" ? `${Number(info.getValue().toFixed(1)).toLocaleString()} USD` : 
                        detalleCotizacion?.tipo_moneda === "2" ? `$${Number(info.getValue().toFixed(0)).toLocaleString()}` : 
                        detalleCotizacion?.tipo_moneda === "3" ? `${Number(info.getValue().toFixed(2)).toLocaleString()} UF` : 
                        `${Number(info.getValue().toFixed(0)).toLocaleString()}`
                    }
                </div>
            ),
            header: "Total Impuesto"
        }),
        columnHelper.accessor("ganancia", {
            cell: (info) => (
                <div>
                    {
                        detalleCotizacion?.tipo_moneda === "1" ? `${Number(info.getValue().toFixed(1)).toLocaleString()} USD` : 
                        detalleCotizacion?.tipo_moneda === "2" ? `$${Number(info.getValue().toFixed(0)).toLocaleString()}` : 
                        detalleCotizacion?.tipo_moneda === "3" ? `${Number(info.getValue().toFixed(2)).toLocaleString()} UF` : 
                        `${Number(info.getValue().toFixed(0)).toLocaleString()}`
                    }
                </div>
            ),
            header: "Ganancia"
        })
    ]

    const table = useReactTable({
        data: listaItemsEnCotizacion,
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
                    <Badge className="text-xl">Cotización</Badge>
                </CardHeaderChild>
                <CardHeaderChild>
                    <AnimacionDeInputModoMovil globalFilter={globalFilter} setGlobalFilter={setGlobalFilter} anchoInput={200} />
                </CardHeaderChild>
            </CardHeader>
            <CardBody className="z-0">
                <div className="overflow-auto">
                    <Table className='table-fixed min-w-[700px]'>
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
                    <div className="mt-2 min-w-[700px]">
                        <TableCardFooterTemplateV2 table={table} />
                    </div>
                </div>
            </CardBody>
        </Card>
    )
}

export default TablaImpuestos