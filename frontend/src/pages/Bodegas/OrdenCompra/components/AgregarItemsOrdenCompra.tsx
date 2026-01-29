import Icon from "@/components/icon/Icon"
import Container from "@/components/layouts/Container/Container"
import PageWrapper from "@/components/layouts/PageWrapper/PageWrapper"
import Subheader, { SubheaderLeft, SubheaderRight } from "@/components/layouts/Subheader/Subheader"
import ConfirmarEliminar from "@/components/modals/ConfirmarEliminar"
import Badge from "@/components/ui/Badge"
import Button from "@/components/ui/Button"
import Card, { CardBody, CardHeader, CardHeaderChild } from "@/components/ui/Card"
import Table, { TBody, Td, Th, THead, Tr } from "@/components/ui/Table"
import AnimacionDeInputModoMovil from "@/components/utils/AnimacionDeIntputModoMovil"
import { IItemEnOrdenCompra } from "@/interface/bodega.interface"
import { useAppDispatch } from "@/store"
import { useGetDetalleOrdenCompraQuery, useGetItemsEnOrdenCompraQuery } from "@/store/slices/bodega/ordenCompraApi"
import TableCardFooterTemplateV2 from "@/templates/Table/TableFooterTemplateV2"
import { createColumnHelper, flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, SortingState, useReactTable } from "@tanstack/react-table"
import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import EditarItemEnOrdenCompra from "../modals/EditarItemEnOrdenCompra"
import TerminarBorradorOC from "../modals/TerminarBorradorOC"
import OffCanvasAgregarItemsOrdenCompra from "./OffCanvasAgregarItemsOrdenCompra"


const columnHelper = createColumnHelper<IItemEnOrdenCompra>()

function AgregarItemsOrdenCompra() {
    const dispatch = useAppDispatch()
    const navigate = useNavigate()
    const { id } = useParams()

    const { data: detalleOrdenCompra, isLoading: isLoadingDetalle, refetch: refetchDetalle } = useGetDetalleOrdenCompraQuery(id || '', { skip: !id, refetchOnMountOrArgChange: true });
    const { data: listaItemsEnOrdenCompra = [], isLoading: isLoadingItems, refetch: refetchItems } = useGetItemsEnOrdenCompraQuery(id || '', { skip: !id, refetchOnMountOrArgChange: true });
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState<string>('');
    const [valorNeto, setValorNeto] = useState<number>(0)
    const [valorIva, setValorIva] = useState<number>(0)
    const [valorTotal, setValorTotal] = useState<number>(0)

    // Removed useEffect for fetching detail and items.


    const columns = [
        columnHelper.accessor("item_empresa.nombre", {
            cell: (info) => (
                <div className="flex flex-col">
                    <div className="w-full">{info.row.original.item_empresa.nombre}</div>
                    <div className="w-full mt-2">
                        <Button size="xs" className="!px-1" icon="DuoBox3" onClick={() => { if (info.row.original.item_empresa.fabricante) navigate(`/registros/detalle-fabricante/${info.row.original.item_empresa.fabricante}`) }}>{info.row.original.item_empresa.datos_fabricante?.nombre}</Button>
                    </div>
                    <div className="w-full">
                        <Button size="xs" className="!px-1" icon="DuoAlignJustify" onClick={() => { if (info.row.original.item_empresa.categoria) navigate(`/registros/detalle-categoria/${info.row.original.item_empresa.categoria}`) }}>{info.row.original.item_empresa.datos_categoria?.nombre || "Sin Categoria"}</Button>
                    </div>
                </div>
            ),
            header: "Nombre"
        }),
        columnHelper.accessor("cantidad", {
            cell: (info) => (
                <div>{info.row.original.cantidad}</div>
            ),
            header: "Cantidad"
        }),
        columnHelper.accessor("precio", {
            cell: (info) => info.getValue(),
            header: "Precio"
        }),
        columnHelper.display({
            id: "total",
            cell: (info) => (
                <div>${info.row.original.cantidad * info.row.original.precio}</div>
            ),
            header: "Total"
        }),
        columnHelper.display({
            id: "acciones",
            cell: (info) => (
                <div className="flex flex-wrap gap-2">
                    <ConfirmarEliminar mensaje={"¿Esta seguro de eliminar este item de la orden?"} peticionUrl={`/api/ordenes-compra/${id}/items-en-orden-compra/${info.row.original.id}/`} onDispatch={() => {
                        refetchItems()
                    }}/>
                    <EditarItemEnOrdenCompra item={info.row.original} id_orden={id} />
                </div>
            ),
            header: ""
        })
    ]

    const table = useReactTable({
        data: listaItemsEnOrdenCompra,
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

    useEffect(() => {
        if (listaItemsEnOrdenCompra.length > 0) {
            const neto = listaItemsEnOrdenCompra.reduce((acc, item) => acc + item.cantidad * item.precio, 0);
            const iva = neto * 0.19;
            const total = iva + neto
            setValorTotal(parseInt(total.toFixed(0)))
            setValorIva(parseInt(iva.toFixed(0)))
            setValorNeto(parseInt(neto.toFixed(0)))
        }
    }, [listaItemsEnOrdenCompra])

    return (
        <PageWrapper isProtectedRoute={true} title="Agregar Items" name="Agregar Items">
            <Subheader>
                <SubheaderLeft>
                    <Badge className="text-xl">Agregar Items</Badge>
                </SubheaderLeft>
                <SubheaderRight>
                    <TerminarBorradorOC id_orden={id} />
                    <OffCanvasAgregarItemsOrdenCompra id_orden={id} detalleOrdenCompra={detalleOrdenCompra} />
                </SubheaderRight>
            </Subheader>
            <Container className="w-full h-full">
                <div className="flex flex-col gap-4">
                    <Card className="w-full">
                        <CardHeader>
                            <CardHeaderChild>
                                <Badge className="text-xl">Datos Orden de Compra</Badge>
                            </CardHeaderChild>
                        </CardHeader>
                        <CardBody>
                            <div className="flex flex-wrap justify-between items-center">
                                <div className="min-w-[100px]">
                                    <Badge>Codigo</Badge>
                                    <div className="ml-4">{detalleOrdenCompra?.codigo}</div>
                                </div>
                                <div className="min-w-[100px]">
                                    <Badge>Cliente</Badge>
                                    <div className="ml-4">{detalleOrdenCompra?.nombre_cliente}</div>
                                </div>
                                <div className="min-w-[100px]">
                                    <Badge>Proveedor</Badge>
                                    <div className="ml-4">{detalleOrdenCompra?.nombre_proveedor}</div>
                                </div>
                                <div className="min-w-[100px]">
                                    <Badge>Estado</Badge>
                                    <div className="ml-4">{detalleOrdenCompra?.estado_label}</div>
                                </div>
                            </div>
                        </CardBody>
                    </Card>
                    <Card className="w-full">
                        <CardHeader>
                            <CardHeaderChild>
                                <Badge className="text-xl">Items en Orden de Compra</Badge>
                            </CardHeaderChild>
                            <CardHeaderChild>
                                <AnimacionDeInputModoMovil globalFilter={globalFilter} setGlobalFilter={setGlobalFilter} anchoInput={200} />
                            </CardHeaderChild>
                        </CardHeader>
                        <CardBody className="z-0">
                            <div className="overflow-auto">
                                <Table className='table-fixed min-w-[800px]'>
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
                                <div className="mt-2 min-w-[800px]">
                                    <TableCardFooterTemplateV2 table={table} />
                                </div>
                                <div className="flex flex-col text-end mr-20 gap-2 min-w-[500px] mt-2">
                                    <div>Neto: ${valorNeto.toLocaleString()}</div>
                                    <div>IVA: ${valorIva.toLocaleString()}</div>
                                    <div>Total: ${valorTotal.toLocaleString()}</div>
                                </div>
                            </div>
                        </CardBody>
                    </Card>
                </div>
            </Container>
        </PageWrapper>
    )
}

export default AgregarItemsOrdenCompra
