import Icon from "@/components/icon/Icon"
import Container from "@/components/layouts/Container/Container"
import PageWrapper from "@/components/layouts/PageWrapper/PageWrapper"
import Subheader, { SubheaderLeft, SubheaderRight } from "@/components/layouts/Subheader/Subheader"
import Badge from "@/components/ui/Badge"
import Button from "@/components/ui/Button"
import Card, { CardBody } from "@/components/ui/Card"
import Table, { TBody, Td, Th, THead, Tr } from "@/components/ui/Table"
import AnimacionDeInputModoMovil from "@/components/utils/AnimacionDeIntputModoMovil"
import { ICompra } from "@/interface/bodega.interface"
import { listaComprasThunk, useAppDispatch, useAppSelector } from "@/store"
import TableCardFooterTemplateV2 from "@/templates/Table/TableFooterTemplateV2"
import { createColumnHelper, flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, SortingState, useReactTable } from "@tanstack/react-table"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import CrearCompra from "./modals/CrearCompra"
import Tooltip from "@/components/ui/Tooltip"
import EliminarCompra from "./modals/EliminarCompra"


const columnHelper = createColumnHelper<ICompra>()

function ListaCompra() {
    const dispatch = useAppDispatch()
    const navigate = useNavigate()
    const { listaCompras } = useAppSelector((state) => state.bodega)
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState<string>('');

    useEffect(() => {
        dispatch(listaComprasThunk())
    }, [])

    const columns = [
        columnHelper.accessor("codigo", {
            cell: (info) => info.getValue(),
            header: "Codigo"
        }),
        columnHelper.accessor("estado_label", {
            cell: (info) => info.getValue(),
            header: "Estado"
        }),
        columnHelper.accessor("orden_trabajo", {
            cell: (info) => {
                const orden = info.getValue()
                return orden ? <Badge>OT vinculada</Badge> : <Badge>Independiente</Badge>
            },
            header: "Origen"
        }),
        columnHelper.display({
            id: "acciones",
            cell: (info) => (
                <div className="flex flex-wrap gap-2">
                    <Tooltip text="Detalle">
                        <Button variant="solid" icon="HeroEye" color="violet" onClick={() => {navigate(`/compras/detalle-compra/${info.row.original.id}`)}} />
                    </Tooltip>
                    {info.row.original.estado === "-" && (
                        <EliminarCompra compra={info.row.original} />
                    )}
                </div>
            ),
            header: ""
        }),
    ]

    const table = useReactTable({
        data: listaCompras,
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
        <PageWrapper isProtectedRoute={true} title="Lista de Compras" name="Lista de Compras">
            <Subheader>
                <SubheaderLeft>
                    <Badge className="text-xl">Compras</Badge>
                </SubheaderLeft>
                <SubheaderRight>
                    <AnimacionDeInputModoMovil globalFilter={globalFilter} setGlobalFilter={setGlobalFilter}>
                        <CrearCompra />
                    </AnimacionDeInputModoMovil>
                </SubheaderRight>
            </Subheader>
            <Container className="w-full h-full">
                <Card>
                    <CardBody className="z-0">
                        <div className="overflow-auto">
                            <Table className='table-fixed min-w-[450px]'>
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
                            <div className="mt-2 min-w-[450px]">
                                <TableCardFooterTemplateV2 table={table} />
                            </div>
                        </div>
                    </CardBody>
                </Card>
            </Container>
        </PageWrapper>
    )
}

export default ListaCompra
