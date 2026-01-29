import Checkbox from "@/components/form/Checkbox"
import Input from "@/components/form/Input"
import Icon from "@/components/icon/Icon"
import Container from "@/components/layouts/Container/Container"
import PageWrapper from "@/components/layouts/PageWrapper/PageWrapper"
import Subheader, { SubheaderLeft, SubheaderRight } from "@/components/layouts/Subheader/Subheader"
import Badge from "@/components/ui/Badge"
import Button from "@/components/ui/Button"
import Card, { CardBody, CardHeader, CardHeaderChild } from "@/components/ui/Card"
import Table, { TBody, Td, Th, THead, Tr } from "@/components/ui/Table"
import Tooltip from "@/components/ui/Tooltip"
import { IIndicadorDolar, IItemEnOrdenCompra, IItemOrdenCompraEnStock } from "@/interface/bodega.interface"
import ApiService from "@/services/ApiService"
import { detalleEmpresaThunk, listaBodegasPorEmpresaThunk, useAppDispatch } from "@/store"
import { useGetDetalleOrdenCompraQuery, useGetItemsEnOrdenCompraQuery, useGetItemsOrdenCompraEnStockQuery } from "@/store/slices/bodega/ordenCompraApi"
import TableCardFooterTemplateV2 from "@/templates/Table/TableFooterTemplateV2"
import { createColumnHelper, flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, SortingState, useReactTable } from "@tanstack/react-table"
import dayjs from "dayjs"
import "dayjs/locale/es"
import { useEffect, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { toast } from "react-toastify"
import ConfirmarRecibirOrden from "../modals/ConfirmarRecibirOrden"
import EditarItemOrdenStock from "../modals/EditarItemOrdenStock"


const columnHelper = createColumnHelper<{item_orden: IItemEnOrdenCompra, item_stock: IItemOrdenCompraEnStock | undefined}>()

function CompletarOrdenDeCompra() {
    const dispatch = useAppDispatch()
    const navigate = useNavigate()
    const { id } = useParams()
    
    // Stabilize references for RTK Query data
    const { data: dataDetalle, isLoading: isLoadingDetalle, refetch: refetchDetalle } = useGetDetalleOrdenCompraQuery(id || '', { skip: !id, refetchOnMountOrArgChange: true });
    const detalleOrdenCompra = dataDetalle;
    
    const shouldFetchItems = Boolean(id && detalleOrdenCompra && (detalleOrdenCompra.estado === "3" || detalleOrdenCompra.estado === "4"));

    const { data: dataItems, isLoading: isLoadingItems } = useGetItemsEnOrdenCompraQuery(id || '', { 
        skip: !shouldFetchItems,
        refetchOnMountOrArgChange: true 
    });
    const listaItemsEnOrdenCompra = useMemo(() => dataItems || [], [dataItems]);

    const { data: dataStock, isLoading: isLoadingStock } = useGetItemsOrdenCompraEnStockQuery(id || '', { 
        skip: !shouldFetchItems,
        refetchOnMountOrArgChange: true 
    });
    const listaItemsOrdenCompraEnStock = useMemo(() => dataStock || [], [dataStock]);

    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState<string>('');
    const [isEdittingCompra, setIsEdittingCompra] = useState<boolean>(false)
    const [fechaCompra, setFechaCompra] = useState<string>("")
    const [isLoading, setIsLoading] = useState<boolean>(false)
    
    // Derived state itemsARecibir
    const itemsARecibir = useMemo(() => {
        if (listaItemsEnOrdenCompra.length > 0 && listaItemsOrdenCompraEnStock.length > 0) {
            return listaItemsEnOrdenCompra.map((item: IItemEnOrdenCompra) => ({
                item_orden: item,
                item_stock: listaItemsOrdenCompraEnStock.find(
                    (it: IItemOrdenCompraEnStock) => it.item_oc_id === item.id
                )
            }))
        }
        return []
    }, [listaItemsEnOrdenCompra, listaItemsOrdenCompraEnStock])

    const [dolarManual, setDolarManual] = useState<boolean>(false)
    const [dolarObservado, setDolarObservado] = useState<number>(0)

    useEffect(() => {
        if (detalleOrdenCompra && detalleOrdenCompra.oc_cliente) {
             dispatch(detalleEmpresaThunk({id_empresa: detalleOrdenCompra.oc_cliente}))
        }
        if (detalleOrdenCompra && detalleOrdenCompra.fecha_compra) {
            setFechaCompra(detalleOrdenCompra.fecha_compra)
        }
        if (detalleOrdenCompra && detalleOrdenCompra.dolar_observado) {
            setDolarObservado(detalleOrdenCompra.dolar_observado)
        }
        if (detalleOrdenCompra && detalleOrdenCompra.oc_empresa) {
            dispatch(listaBodegasPorEmpresaThunk({id_empresa: detalleOrdenCompra?.oc_empresa}))
        }
    }, [detalleOrdenCompra])

    const columns = [
        columnHelper.accessor("item_orden.id", {
            cell: (info) => (
                <div className="flex flex-col">
                    <div className="w-full">{info.row.original.item_orden.item_empresa.nombre}</div>
                    {/* <div className="w-full text-xs ml-2 flex gap-1"><Icon icon="DuoPenRuler" size="text-base" /> {info.row.original.item_orden.item_empresa.tamanio || "Sin Tamaño"} {info.row.original.item_orden.item_empresa.unidad_label}</div> */}
                    <div className="w-full mt-2">
                        <Button size="xs" className="!px-1" icon="DuoBox3" onClick={() => { if (info.row.original.item_orden.item_empresa.fabricante) navigate(`/registros/detalle-fabricante/${info.row.original.item_orden.item_empresa.fabricante}`) }}>{info.row.original.item_orden.item_empresa.datos_fabricante?.nombre}</Button>
                    </div>
                    <div className="w-full">
                        <Button size="xs" className="!px-1" icon="DuoAlignJustify" onClick={() => { if (info.row.original.item_orden.item_empresa.categoria) navigate(`/registros/detalle-categoria/${info.row.original.item_orden.item_empresa.categoria}`) }}>{info.row.original.item_orden.item_empresa.datos_categoria?.nombre || "Sin Categoria"}</Button>
                    </div>
                </div>
            ),
            header: "Item"
        }),
        columnHelper.accessor("item_orden.cantidad", {
            cell: (info) => (
                <div>{info.row.original.item_orden.cantidad}</div>
            ),
            header: "Cantidad Esperada"
        }),
        columnHelper.display({
            id: "nueva_cantidad",
            cell: (info) => (
                <div>{info.row.original.item_stock?.cantidad || 0}</div>
            ),
            header: "Cantidad Recibida"
        }),
        columnHelper.display({
            id: "bodega",
            cell: (info) => (
                <div>{info.row.original.item_stock?.nombre_bodega}</div>
            ),
            header: "Bodega"
        }),
        columnHelper.display({
            id: "item_stock",
            cell: (info) => (
                <div>
                    <EditarItemOrdenStock item_orden={info.row.original.item_orden} item_stock={info.row.original.item_stock} id_orden={id} />
                </div>
            ),
            header: ""
        })
    ]

    const table = useReactTable({
        data: itemsARecibir,
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
        <PageWrapper isProtectedRoute={true} title="Completar Orden" name="Completar Orden">
            <Subheader>
                <SubheaderLeft>
                    <Badge className="text-xl">Completar Orden</Badge>
                </SubheaderLeft>
                <SubheaderRight>
                    <ConfirmarRecibirOrden itemsARecibir={itemsARecibir} detalleOrdenCompra={detalleOrdenCompra} />
                </SubheaderRight>
            </Subheader>
            <Container className="w-full h-full">
                {detalleOrdenCompra ? (
                    <div className="flex flex-col w-full gap-4">
                        <Card className="w-full">
                            <CardHeader>
                                <CardHeaderChild>
                                    <Badge className="text-xl">Detalle Orden</Badge>
                                </CardHeaderChild>
                            </CardHeader>
                            <CardBody>
                                <div className="w-full grid grid-cols-2 lg:grid-cols-4">
                                    <div className="w-full">
                                        <Badge>Codigo</Badge>
                                        <div className="ml-4">{detalleOrdenCompra.codigo}</div>
                                    </div>
                                    <div className="w-full">
                                        <Badge>Cliente</Badge>
                                        <div className="ml-4">{detalleOrdenCompra.nombre_cliente}</div>
                                    </div>
                                    <div className="w-full">
                                        <Badge>Proveedor</Badge>
                                        <div className="ml-4">{detalleOrdenCompra.nombre_proveedor}</div>
                                    </div>
                                    <div className="w-full">
                                        <Badge>Estado</Badge>
                                        <div className="ml-4">{detalleOrdenCompra.estado_label}</div>
                                    </div>
                                </div>
                            </CardBody>
                        </Card>
                        <Card className="w-full">
                            <CardHeader>
                                <CardHeaderChild>
                                    <Badge className="text-xl">Detalle Compra</Badge>
                                </CardHeaderChild>
                                <CardHeaderChild>
                                    {isEdittingCompra ? (
                                        <div className="flex gap-2">
                                            <Tooltip text="Guardar">
                                                <Button variant="solid" isDisable={isLoading} size="sm" onClick={async () => {
                                                    setIsLoading(true)
                                                    try {
                                                        if (dolarManual) {
                                                            if (dolarObservado > 0) {
                                                                const responseFecha = await ApiService.fetchData({url: `/api/ordenes-compra/${id}/`, method: 'patch', headers: {'Content-Type': 'application/json'}, data: JSON.stringify({fecha_compra: fechaCompra, dolar_observado: dolarObservado})})
                                                                if (responseFecha.data) {
                                                                    toast.success("Fecha y dolar actualizado", {autoClose: 1000})
                                                                    refetchDetalle()
                                                                }
                                                            } else {
                                                                toast.error("Los dolares no pueden ser menor a 0")
                                                            }
                                                        } else {
                                                            const responseDolar = await ApiService.fetchData<IIndicadorDolar>({baseURL: 'https://mindicador.cl/', url: `api/dolar/${dayjs(fechaCompra).format("DD-MM-YYYY")}`, method: 'get', isLoginRequest: true})
                                                            if (responseDolar.data) {
                                                                const responseFecha = await ApiService.fetchData({url: `/api/ordenes-compra/${id}/`, method: 'patch', headers: {'Content-Type': 'application/json'}, data: JSON.stringify({fecha_compra: fechaCompra, dolar_observado: responseDolar.data.serie[0].valor.toFixed(0) || 0})})
                                                                if (responseFecha.data) {
                                                                    toast.success("Fecha y dolar actualizado", {autoClose: 1000})
                                                                    refetchDetalle()
                                                                }
                                                            }
                                                        }
                                                    } catch (error: any) {
                                                        try {
                                                            const response = await ApiService.fetchData({url: `/api/ordenes-compra/${id}/`, method: 'patch', headers: {'Content-Type': 'application/json'}, data: JSON.stringify({fecha_compra: fechaCompra})})
                                                            if (response.data) {
                                                                toast.success("Fecha actualizada", {autoClose: 1000})
                                                                refetchDetalle()
                                                            }
                                                        } catch (error: any) {
                                                            toast.error(error.response.data)
                                                        }
                                                    }
                                                    setIsEdittingCompra(false)
                                                    setIsLoading(false)
                                                }}>Guardar</Button>
                                            </Tooltip>
                                            <Tooltip text="Cancelar">
                                                <Button color="red" isDisable={isLoading} size="sm" variant="solid" onClick={() => {
                                                    setIsEdittingCompra(false)
                                                    setFechaCompra(detalleOrdenCompra.fecha_compra ? detalleOrdenCompra.fecha_compra : "")
                                                }}>Cancelar</Button>
                                            </Tooltip>
                                        </div>
                                    ) : (
                                        <div>
                                            <Tooltip text="Editar Fecha de Compra">
                                                <Button size="sm" variant="solid" onClick={() => {setIsEdittingCompra(true)}} icon="HeroPencil"></Button>
                                            </Tooltip>
                                        </div>
                                    )}
                                </CardHeaderChild>
                            </CardHeader>
                            <CardBody>
                                <div className="w-full grid grid-cols-2 gap-4">
                                    {isEdittingCompra ? (
                                        <>
                                            <div className="w-full">
                                                <Badge>Fecha de Compra</Badge>
                                                <Input
                                                    disabled={isLoading}
                                                    name="fecha_compra"
                                                    type="date"
                                                    value={fechaCompra}
                                                    onChange={(e) => {setFechaCompra(e.target.value)}}
                                                />
                                            </div>
                                            <div className="w-full">
                                                <Badge>Dolar Observado</Badge>
                                                <div className="w-full flex items-center gap-2">
                                                    {dolarManual ? (
                                                        <Input
                                                            name="dolar_observado"
                                                            type="number"
                                                            disabled={isLoading}
                                                            value={dolarObservado}
                                                            onChange={(e) => {setDolarObservado(Number(e.target.value))}}
                                                        />
                                                    ) : (
                                                        <div className="ml-4">${detalleOrdenCompra.dolar_observado ? detalleOrdenCompra.dolar_observado : "Sin Dolar Observado"}</div>
                                                    )}
                                                    <Checkbox
                                                        checked={dolarManual}
                                                        label="¿Manual?"
                                                    onChange={(e) => {setDolarManual(e.target.checked)}}
                                                />
                                            </div>
                                            <div className="w-full mt-2">
                                                <Badge>Dolar Final</Badge>
                                                <div className="ml-4">{detalleOrdenCompra.dolar_final ?? "Sin Dolar Final"}</div>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                        <>
                                            <div className="w-full">
                                                <Badge>Fecha de Compra</Badge>
                                                <div className="ml-4">{detalleOrdenCompra.fecha_compra ? dayjs(detalleOrdenCompra.fecha_compra).format("DD-MM-YYYY") : "Sin Fecha"}</div>
                                            </div>
                                            <div className="w-full">
                                                <Badge>Dolar Observado</Badge>
                                                <div className="ml-4">${detalleOrdenCompra.dolar_observado ? detalleOrdenCompra.dolar_observado : "Sin Dolar Observado"}</div>
                                            </div>
                                            <div className="w-full">
                                                <Badge>Dolar Final</Badge>
                                                <div className="ml-4">{detalleOrdenCompra.dolar_final ? detalleOrdenCompra.dolar_final : "Sin Dolar Final"}</div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </CardBody>
                        </Card>
                        <Card className="w-full">
                            <CardHeader>
                                <CardHeaderChild>
                                    <Badge className="text-xl">Items</Badge>
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
                    </div>
                ) : (
                    <div className="w-full">No hay orden de compra</div>
                )}
            </Container>
        </PageWrapper>
    )
}

export default CompletarOrdenDeCompra
