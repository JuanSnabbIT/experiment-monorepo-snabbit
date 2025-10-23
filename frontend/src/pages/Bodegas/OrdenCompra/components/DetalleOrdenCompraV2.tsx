import Icon from "@/components/icon/Icon"
import Container from "@/components/layouts/Container/Container"
import PageWrapper from "@/components/layouts/PageWrapper/PageWrapper"
import Subheader, { SubheaderLeft, SubheaderRight } from "@/components/layouts/Subheader/Subheader"
import Badge from "@/components/ui/Badge"
import Button from "@/components/ui/Button"
import Card, { CardBody, CardHeader, CardHeaderChild } from "@/components/ui/Card"
import { useAppDispatch, useAppSelector } from "@/store"
import { detalleOrdenCompraThunk, listaItemsEnOrdenCompraThunk } from "@/store/slices/bodega/bodegaSlice"
import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { IItemEnOrdenCompra } from "@/interface/bodega.interface"
import { createColumnHelper, flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, SortingState, useReactTable } from "@tanstack/react-table"
import Table, { TBody, Td, Th, THead, Tr } from "@/components/ui/Table"
import TableCardFooterTemplateV2 from "@/templates/Table/TableFooterTemplateV2"
import Tooltip from "@/components/ui/Tooltip"
import { toast } from "react-toastify"
import ApiService from "@/services/ApiService"


const columnHelper = createColumnHelper<IItemEnOrdenCompra>()

function DetalleOrdenCompraV2() {
    const dispatch = useAppDispatch()
    const navigate = useNavigate()
    const { id } = useParams()
    const { detalleOrdenCompra, listaItemsEnOrdenCompra } = useAppSelector((state) => state.bodega)
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState<string>('');

    useEffect(() => {
        if (id) {
            dispatch(detalleOrdenCompraThunk({ id_orden: id }))
        }
    }, [id])

    useEffect(() => {
        if (detalleOrdenCompra) {
            dispatch(listaItemsEnOrdenCompraThunk({id_orden: detalleOrdenCompra.id}))
        }
    }, [detalleOrdenCompra])

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
        columnHelper.accessor("cantidad_recibida", {
            cell: (info) => (
                <div>{info.getValue() || "Sin Cantidad Recibida"}</div>
            ),
            header: "Cantidad Recibida"
        }),
        columnHelper.accessor("cantidad", {
            cell: (info) => (
                <div className="flex flex-row gap-2 items-center">
                    <div>{info.row.original.cantidad}</div>
                    <div>X</div>
                    <div>${info.row.original.precio}</div>
                    <div>=</div>
                    <div>${info.row.original.cantidad * info.row.original.precio}</div>
                </div>
            ),
            header: "Cantidad X Precio"
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
        getPaginationRowModel: getPaginationRowModel(),
    });

    return (
        <PageWrapper isProtectedRoute={true} name="Detalle Orden Compra" title="Detalle Orden Compra">
            <Subheader>
                <SubheaderLeft>
                    <Badge className="text-xl">Orden {detalleOrdenCompra?.codigo}</Badge>
                </SubheaderLeft>
                <SubheaderRight>
                    <Button></Button>
                </SubheaderRight>
            </Subheader>
            <Container className="w-full h-full">
                <div className="flex flex-col w-full gap-4">
                    <Card>
                        <CardHeader>
                            <CardHeaderChild>
                                <Badge className="text-xl">Datos Orden de Compra</Badge>
                            </CardHeaderChild>
                            <CardHeaderChild>
                                <Tooltip text="Ver PDF">
                                    <Button variant="solid" color="red" icon="HeroDocumentText" onClick={async () => {
                                        try {
                                            const response = await ApiService.fetchData<BlobPart>({url: `/api/ordenes-compra/${detalleOrdenCompra?.id}/pdf/`, method: 'get', headers: {'Content-Type': 'application/pdf'}})
                                            const url = window.URL.createObjectURL(new Blob([response.data]))
                                            const a = document.createElement('a');
                                            a.href = url;
                                            a.download = `orden_compra_${detalleOrdenCompra?.id}.pdf`;
                                            document.body.appendChild(a);
                                            a.click();
                                            a.remove();
                                            window.URL.revokeObjectURL(url);
                                        } catch (error: any) {
                                            toast.error(error.response.data)
                                        }
                                    }}></Button>
                                </Tooltip>
                            </CardHeaderChild>
                        </CardHeader>
                        <CardBody>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 items-center">
                                <div className="w-full">
                                    <Badge>Codigo</Badge>
                                    <div className="ml-4">{detalleOrdenCompra?.codigo}</div>
                                </div>
                                <div className="w-full">
                                    <Badge>Proveedor</Badge>
                                    <div className="ml-4">{detalleOrdenCompra?.nombre_proveedor}</div>
                                </div>
                                <div className="w-full">
                                    <Badge>Estado</Badge>
                                    <div className="ml-4">{detalleOrdenCompra?.estado_label}</div>
                                </div>
                                <div className="w-full">
                                    <Badge>Cliente</Badge>
                                    <div className="ml-4">{detalleOrdenCompra?.nombre_cliente}</div>
                                </div>
                                {detalleOrdenCompra?.cotizacion && (
                                    <div className="w-full">
                                        <Badge>Cotización</Badge>
                                        <div className="ml-4">
                                            <a href={detalleOrdenCompra.cotizacion} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline hover:text-blue-700 transition duration-300">Ver Cotización</a>
                                        </div>
                                    </div>
                                )}
                                {(detalleOrdenCompra?.estado === "4" || detalleOrdenCompra?.estado === "5" || detalleOrdenCompra?.estado === "6" || detalleOrdenCompra?.estado === "7") && (
                                    <>
                                        <div className="w-full">
                                            <Badge>Dolar</Badge>
                                            <div className="ml-4">{detalleOrdenCompra.dolar_observado}</div>
                                        </div>
                                        <div className="w-full">
                                            <Badge>Dolar Final</Badge>
                                            <div className="ml-4">{detalleOrdenCompra.dolar_final}</div>
                                        </div>
                                        <div className="w-full">
                                            <Badge>Fecha de Compra</Badge>
                                            <div className="ml-4">{detalleOrdenCompra.fecha_compra}</div>
                                        </div>
                                    </>
                                )}
                                <div className="w-full col-span-full">
                                    <Badge>Observaciones</Badge>
                                    <div className="ml-4">{detalleOrdenCompra?.observaciones}</div>
                                </div>
                            </div>
                        </CardBody>
                    </Card>

                    {detalleOrdenCompra?.estado !== "-" && (
                        <Card>
                            <CardHeader>
                                <CardHeaderChild>
                                    <Badge className="text-xl">Items de la Compra</Badge>
                                </CardHeaderChild>
                            </CardHeader>
                            <CardBody className="z-0">
                                <div className="overflow-auto">
                                    <Table className='table-fixed min-w-[600px]'>
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
                                    <div className="mt-2 min-w-[600px]">
                                        <TableCardFooterTemplateV2 table={table} />
                                    </div>
                                </div>
                            </CardBody>
                        </Card>
                    )}

                    {detalleOrdenCompra?.estado === "2" && (
                        <Card className=" flex justify-center bg-red-100 border border-red-500">
                            <CardBody className="flex items-center gap-4 justify-center">
                                <Icon icon="HeroInformationCircle" size="text-3xl" className="text-red-700" />
                                <Badge className="text-red-700 text-2xl">Su solicitud ha sido rechazada</Badge>
                            </CardBody>
                        </Card>
                    )}

                    {detalleOrdenCompra?.estado === "3" && (
                        <Card className=" flex justify-center bg-green-100 border border-emerald-500">
                            <CardBody className="flex items-center gap-4 justify-center">
                                <Icon icon="HeroInformationCircle" size="text-3xl" className="text-emerald-700" />
                                <Badge className="text-green-700 text-2xl">Su orden ha sido enviada a su proveedor</Badge>
                            </CardBody>
                        </Card>
                    )}

                    {detalleOrdenCompra?.estado === "4" && (
                        <Card className="flex justify-center bg-yellow-100 border border-yellow-500">
                            <CardBody className="flex items-center gap-4 justify-center">
                                <Icon icon="HeroInformationCircle" size="text-3xl" className="text-yellow-700" />
                                <Badge className="text-yellow-700 text-2xl">Su orden ha sido parcialmente recibida</Badge>
                            </CardBody>
                        </Card>
                    )}

                    {detalleOrdenCompra?.estado === "5" && (
                        <Card className="flex justify-center bg-green-100 border border-green-500">
                            <CardBody className="flex items-center gap-4 justify-center">
                                <Icon icon="HeroInformationCircle" size="text-3xl" className="text-green-700" />
                                <Badge className="text-green-700 text-2xl ">¡Su orden ha sido completada exitosamente!</Badge>
                            </CardBody>
                        </Card>
                    )}
                </div>
            </Container>
        </PageWrapper>
    )
}

export default DetalleOrdenCompraV2