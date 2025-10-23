import Icon from "@/components/icon/Icon"
import Badge from "@/components/ui/Badge"
import Button from "@/components/ui/Button"
import Card, { CardBody, CardHeader, CardHeaderChild } from "@/components/ui/Card"
import Table, { TBody, Td, Th, THead, Tr } from "@/components/ui/Table"
import Tooltip from "@/components/ui/Tooltip"
import AnimacionDeInputModoMovil from "@/components/utils/AnimacionDeIntputModoMovil"
import { IOrdenCompra } from "@/interface/bodega.interface"
import { listaOrdenesCompraRecientesItemThunk, useAppDispatch, useAppSelector } from "@/store"
import TableCardFooterTemplateV2 from "@/templates/Table/TableFooterTemplateV2"
import { createColumnHelper, flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, SortingState, useReactTable } from "@tanstack/react-table"
import dayjs from "dayjs"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"


const columnHelper = createColumnHelper<IOrdenCompra>()

function TablaOCEnItem() {
    const dispatch = useAppDispatch()
    const navigate = useNavigate()
    const { personalizacionUsuario } = useAppSelector((state) => state.auth)
    const { detalleItemEmpresa, listaOrdenesCompraRecientesItem } = useAppSelector((state) => state.item)
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState<string>('');

    useEffect(() => {
        if (personalizacionUsuario && personalizacionUsuario.empresa && detalleItemEmpresa && detalleItemEmpresa.id) {
            dispatch(listaOrdenesCompraRecientesItemThunk({dias: 30, id_item: detalleItemEmpresa.id}))
        }
    }, [detalleItemEmpresa, personalizacionUsuario]);

    const columns = [
        columnHelper.accessor("codigo", {
            cell: (info) => info.getValue(),
            header: "Codigo"
        }),
        columnHelper.accessor("nombre_cliente", {
            cell: (info) => info.getValue(),
            header: "Cliente"
        }),
        columnHelper.accessor("fecha_creacion", {
            cell: (info) => (
                <div>{dayjs(info.row.original.fecha_creacion).format("DD/MM/YYYY")}</div>
            ),
            header: "Fecha"
        }),
        columnHelper.display({
            id: "acciones",
            cell: (info) => (
                <div>
                    <Tooltip text="Detalle">
                        <Button variant="solid" icon="HeroEye" color="violet" onClick={() => {navigate(`/compras/detalle-orden-compra/${info.row.original.id}`)}} />
                    </Tooltip>
                </div>
            ),
        })
    ]

    const table = useReactTable({
        data: listaOrdenesCompraRecientesItem,
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
                    <Badge className="text-xl">Ordenes de Compra Recientes</Badge>
                </CardHeaderChild>
                <CardHeaderChild>
                    <AnimacionDeInputModoMovil globalFilter={globalFilter} setGlobalFilter={setGlobalFilter} anchoInput={200} />
                </CardHeaderChild>
            </CardHeader>
            <CardBody className="z-0">
                <div className="overflow-auto">
                    <Table className='table-fixed min-w-[550px]'>
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
                    <div className="mt-2 min-w-[550px]">
                        <TableCardFooterTemplateV2 table={table} />
                    </div>
                </div>
            </CardBody>
        </Card>
    )
}

export default TablaOCEnItem