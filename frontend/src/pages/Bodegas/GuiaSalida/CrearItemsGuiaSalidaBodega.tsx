import Input from "@/components/form/Input"
import Icon from "@/components/icon/Icon"
import Container from "@/components/layouts/Container/Container"
import PageWrapper from "@/components/layouts/PageWrapper/PageWrapper"
import Subheader, { SubheaderLeft } from "@/components/layouts/Subheader/Subheader"
import Badge from "@/components/ui/Badge"
import Button from "@/components/ui/Button"
import Card, { CardBody, CardHeader, CardHeaderChild } from "@/components/ui/Card"
import Table, { TBody, Td, Th, THead, Tr } from "@/components/ui/Table"
import Tooltip from "@/components/ui/Tooltip"
import { IItemGuiaSalida, IStockItemEnBodega } from "@/interface/bodega.interface"
import ApiService from "@/services/ApiService"
import { useAppDispatch, useAppSelector } from "@/store"
import { detalleGuiaSalidaBodegaThunk, listaComprasDeStockThunk, listaItemsEnGuiaSalidaBodegaThunk, listaStockItemsEnBodegaThunk } from "@/store/slices/bodega/bodegaSlice"
import TableCardFooterTemplateV2 from "@/templates/Table/TableFooterTemplateV2"
import { createColumnHelper, flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, SortingState, useReactTable } from "@tanstack/react-table"
import { useEffect, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { toast } from "react-toastify"
import AsignarNumeroDeSerie from "./modals/AsignarNumeroDeSerie"


const columnHelper = createColumnHelper<IStockItemEnBodega>()
const columnHelperItems = createColumnHelper<IItemGuiaSalida>()

function CrearItemsGuiaSalidaBodega() {
    const dispatch = useAppDispatch()
    const navigate = useNavigate()
    const { id } = useParams()
    const { listaStockItemsEnBodega, detalleGuiaSalidaBodega, listaItemsEnGuiaSalidaBodega } = useAppSelector((state) => state.bodega)
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState<string>('');
    const [isCreating, setIsCreating] = useState<boolean>(false)
    const [itemStockSeleted, setItemStockSelected] = useState<IStockItemEnBodega | undefined>()
    const [itemRebajaSelected, setItemRebajaSelected] = useState<IItemGuiaSalida | undefined>()
    const [isOpenNumero, setIsOpenNumero] = useState<boolean>(false)

    useEffect(() => {
        if (itemRebajaSelected) {
            dispatch(listaComprasDeStockThunk({id_bodega: itemRebajaSelected.datos_stock.bodega, id_stock: itemRebajaSelected.datos_stock.id}))
        }
    }, [itemRebajaSelected])

    useEffect(() => {
        if (id) {
            dispatch(detalleGuiaSalidaBodegaThunk({id_guia: id}))
            dispatch(listaItemsEnGuiaSalidaBodegaThunk({id_guia: id}))
        }
    }, [id])

    useEffect(() => {
        if (detalleGuiaSalidaBodega) {
            dispatch(listaStockItemsEnBodegaThunk({id_bodega: detalleGuiaSalidaBodega.bodega}))
        }
    }, [detalleGuiaSalidaBodega])

    const columns = [
        columnHelper.accessor("datos_item.nombre", {
            cell: (info) => info.getValue(),
            header: "Nombre"
        }),
        columnHelper.accessor("cantidad", {
            cell: (info) => (
                <div>
                    <Tooltip text={`Cantidad no disponible: ${info.row.original.cantidad_no_disponible}`}>
                        <div>{info.getValue()}</div>
                    </Tooltip>
                </div>
            ),
            header: "Cantidad"
        }),
        columnHelper.accessor("datos_item.datos_categoria.nombre", {
            cell: (info) => (
                <div>{info.getValue() || "Sin Categoria"}</div>
            ),
            header: "Categoria"
        }),
        columnHelper.accessor("datos_item.datos_fabricante.nombre", {
            cell: (info) => (
                <div>{info.getValue() || "Sin Fabricante"}</div>
            ),
            header: "Fabricante"
        }),
        columnHelper.display({
            id: "acciones",
            cell: (info) => {
                const inputRef = useRef<HTMLInputElement>(null);
                return (
                    <div>
                        {!isCreating && itemStockSeleted === info.row.original ? (
                            <div className="flex gap-4 flex-row">
                                <Input name="cantidad" type="number" ref={inputRef} max={info.row.original.cantidad} min={0} />
                                <Tooltip text="Cancelar">
                                    <Button variant="solid" color="red" icon="HeroXMark" onClick={() => {
                                        if (inputRef.current) {
                                            inputRef.current.valueAsNumber = 0
                                        }
                                        setItemStockSelected(undefined)
                                    }}></Button>
                                </Tooltip>
                                <Tooltip text="Guardar con Cantidad">
                                    <Button variant="solid" icon="DuoSave" onClick={async () => {
                                        setIsCreating(true)
                                        try {
                                            if (inputRef.current && inputRef.current.valueAsNumber > 0) {
                                                const response = await ApiService.fetchData({url: `/api/guia-salida/${id}/agregar-item/`, method: 'post', headers: {'Content-Type': 'application/json'}, data: JSON.stringify({
                                                    stock_item_id: info.row.original.id,
                                                    cantidad_rebajada: inputRef.current?.valueAsNumber,
                                                })})
                                                if (response.data) {
                                                    toast.success("Item agregado a la guia", {autoClose: 1000})
                                                    dispatch(listaItemsEnGuiaSalidaBodegaThunk({id_guia: id}))
                                                    dispatch(detalleGuiaSalidaBodegaThunk({id_guia: id}))
                                                }
                                            }
                                        } catch (error: any) {
                                            toast.error(error.response.data.detail)
                                        }
                                        setIsCreating(false)
                                    }}></Button>
                                </Tooltip>
                                <Tooltip text="Guardar Individualizado">
                                    <Button variant="solid" icon="DuoBox3" onClick={async () => {
                                        setIsCreating(true)
                                        try {
                                            const response = await ApiService.fetchData({url: `/api/guia-salida/${id}/agregar-item/`, method: 'post', headers: {'Content-Type': 'application/json'}, data: JSON.stringify({
                                                stock_item_id: info.row.original.id,
                                                cantidad_rebajada: 1,
                                                individualizado: true
                                            })})
                                            if (response.data) {
                                                toast.success("Item agregado a la guia", {autoClose: 1000})
                                                dispatch(listaItemsEnGuiaSalidaBodegaThunk({id_guia: id}))
                                                dispatch(detalleGuiaSalidaBodegaThunk({id_guia: id}))
                                            }
                                        } catch(error: any) {
                                            toast.error(error.response.data.detail)
                                        }
                                        setIsCreating(false)
                                    }}></Button>
                                </Tooltip>
                            </div>
                        ) : (
                            <Button isDisable={isCreating} variant="solid" icon="HeroPlus" rounded="rounded-full" onClick={async () => {setItemStockSelected(info.row.original)}}></Button>
                        )}
                    </div>
                )
            },
            header: ""
        })
    ]

    const table = useReactTable({
        data: listaStockItemsEnBodega,
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

    const columnsItems = [
        columnHelperItems.accessor("id", {
            cell: (info) => (
                <div className="flex flex-col">
                    <div className="w-full">{info.row.original.datos_stock.datos_item.nombre}</div>
                    {/* <div className="w-full text-xs ml-2 flex gap-1"><Icon icon="DuoPenRuler" size="text-base" /> {info.row.original.datos_stock.datos_item.tamanio} {info.row.original.datos_stock.datos_item.unidad_label}</div> */}
                    <div className="w-full mt-2">
                        <Button size="xs" className="!px-1" icon="DuoBox3" onClick={() => { if (info.row.original.datos_stock.datos_item.fabricante) navigate(`/registros/detalle-fabricante/${info.row.original.datos_stock.datos_item.fabricante}`) }}>{info.row.original.datos_stock.datos_item.datos_fabricante?.nombre || "Sin Fabricante"}</Button>
                    </div>
                    <div className="w-full">
                        <Button size="xs" className="!px-1" icon="DuoAlignJustify" onClick={() => { if (info.row.original.datos_stock.datos_item.categoria) navigate(`/registros/detalle-categoria/${info.row.original.datos_stock.datos_item.categoria}`) }}>{info.row.original.datos_stock.datos_item.datos_categoria?.nombre || "Sin Categoria"}</Button>
                    </div>
                </div>
            ),
            header: "Item"
        }),
        // columnHelperItems.accessor("datos_stock.cantidad", {
        //     cell: (info) => info.getValue(),
        //     header: "Stock"
        // }),
        columnHelperItems.accessor("cantidad_rebajada", {
            cell: (info) => {
                const [cantidad, setCantidad] = useState<number>(info.row.original.cantidad_rebajada)
                const [isEditting, setIsEditting] = useState<boolean>(false)

                return (
                    <div>
                        {isEditting ? (
                            <>
                                <Input
                                    name="cantidad_rebajada"
                                    type="number"
                                    value={cantidad}
                                    onChange={(e) => {setCantidad(parseInt(e.target.value))}}
                                />
                                <div>
                                    <Tooltip text="Cancelar">
                                        <Button className="m-2" variant="solid" icon="HeroXMark" color="red" onClick={() => {setIsEditting(false); setCantidad(info.row.original.cantidad_rebajada)}}></Button>
                                    </Tooltip>
                                    <Tooltip text="Guardar">
                                        <Button className="m-2" variant="solid" icon="DuoSave" onClick={async () => {
                                            try {
                                                const response = await ApiService.fetchData({url: `/api/guia-salida/${id}/items-guia/${info.row.original.id}/editar-item/`, method: 'patch', headers: {'Content-Type': 'application/json'}, data: JSON.stringify({nueva_cantidad: cantidad})})
                                                if (response.data) {
                                                    toast.success("Item de la guia editado", {autoClose: 1000})
                                                    dispatch(listaItemsEnGuiaSalidaBodegaThunk({id_guia: id}))
                                                    dispatch(detalleGuiaSalidaBodegaThunk({id_guia: id}))
                                                }
                                            } catch (error: any) {
                                                toast.error(error.response.data || "Error al editar la cantidad", {toastId: "Error al editar la cantidad"})
                                            }
                                        }}/>
                                    </Tooltip>
                                </div>
                            </>
                        ) : (
                            <>
                                <div>{info.getValue()}</div>
                                {!info.row.original.individualizado && (<Button className="m-2" variant="solid" onClick={() => {setIsEditting(true)}}>Editar</Button>)}
                            </>
                        )}
                    </div>
                )
            },
            header: "Cantidad"
        }),
        columnHelperItems.accessor("individualizado", {
            cell: (info) => {
                return (
                    <div>
                        {info.row.original.individualizado ? (
                            <div className="flex flex-col gap-2">
                                {info.row.original.numero_serie.serie ? info.row.original.numero_serie.serie : ("Sin Numero")}
                                <div>
                                    <Button variant="solid" onClick={async () => {setItemRebajaSelected(info.row.original); setIsOpenNumero(true)}}>Editar</Button>
                                </div>
                            </div>
                        ) : "No"}
                        {/* {isEditting ? (
                            <>
                                <SelectReact
                                    name="numero_serie"
                                    options={optionsNumeros}
                                />
                                <Button className="m-2" variant="solid" icon="HeroXMark" color="red" onClick={() => {setIsEditting(false); setNumero(info.row.original.numero_serie.serie)}}/>
                                <Button className="m-2" variant="solid" icon="DuoSave" onClick={async () => {
                                    try {
                                        const response = await ApiService.fetchData({url: `/api/guia-salida/${id}/items-guia/${info.row.original.id}/`, method: 'patch', headers: {'Content-Type': 'application/json'}})
                                    } catch (error: any) {
                                        toast.error(error.response.data || "Error al editar el numero de serie")
                                    }
                                }}/>
                            </>
                        ) : (
                            <>
                                {info.row.original.numero_serie.serie}
                                <Button variant="solid" onClick={async () => {setIsEditting(true); dispatch(listaComprasDeStockThunk({id_bodega: info.row.original.datos_stock.bodega, id_stock: info.row.original.datos_stock.id}))}}>Editar</Button>
                            </>
                        )} */}
                    </div>
                )
            },  
            header: "Serializado"
        }),
        columnHelperItems.display({
            id: "acciones",
            cell: (info) => (
                <div>
                    <Button className="m-2" variant="solid" color="red" onClick={async () => {
                        try {
                            const response = await ApiService.fetchData({url: `/api/guia-salida/${id}/items-guia/${info.row.original.id}/eliminar-item/`, method: 'delete'})
                            if (response.data) {
                                dispatch(listaItemsEnGuiaSalidaBodegaThunk({id_guia: id}))
                                dispatch(detalleGuiaSalidaBodegaThunk({id_guia: id}))
                                toast.success("Item eliminado de la guia", {autoClose: 1000})
                            }
                        } catch (error: any) {
                            toast.error(error.response.data || "Error al eliminar la guia")
                        }
                    }}>Eliminar</Button>
                </div>
            )
        })
    ]

    const tableItems = useReactTable({
        data: listaItemsEnGuiaSalidaBodega,
        columns: columnsItems,
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

    // const formikEditingItem = useFormik({
    //     enableReinitialize: true,
    //     initialValues: {
    //         cantidad_rebajada: 0
    //     },
    //     validationSchema: Yup.object().shape({
    //         cantidad_rebajada: Yup.number().required("Requerido").test("cantidad-maxima", "La cantidad no puede ser mayor al stock disponible", function (value) {
    //             if (itemRebajaSelected) {
    //                 return value !== undefined && value <= itemRebajaSelected.datos_stock.cantidad;
    //             }
    //             return true;
    //         }),
    //     }),
    //     onSubmit: async (values) => {
    //         try {
    //             const response = await ApiService.fetchData({url: `/api/guia-salida/${id}/items-guia/${itemRebajaSelected?.id}/`, method: 'patch', headers: {'Content-Type': 'application/json'}, data: JSON.stringify(values)})
    //             if (response.data) {
    //                 toast.success("Item de la guia editado", {autoClose: 1000})
    //                 dispatch(listaItemsEnGuiaSalidaBodegaThunk({id_guia: id}))
    //                 dispatch(detalleGuiaSalidaBodegaThunk({id_guia: id}))
    //                 formikEditingItem.resetForm()
    //                 setItemRebajaSelected(undefined)
    //             }
    //         } catch (error: any) {
    //             toast.error(error.response.data)
    //         }
    //     }
    // })

    return (
        <PageWrapper isProtectedRoute={true} name="Crear Items para Guia Salida Bodega" title="Crear Items para Guia Salida Bodega">
            <Subheader>
                <SubheaderLeft>
                    <Badge className="text-xl">Agregar Items a Guia de Salida de Bodega</Badge>
                </SubheaderLeft>
            </Subheader>
            <Container className="w-full h-full">
                <div className="flex flex-col gap-4">
                    <div className="w-full">
                        <Card>
                            <CardHeader>
                                <CardHeaderChild>
                                    <Badge className="text-xl">Items en Stock de la Bodega</Badge>
                                </CardHeaderChild>
                                <CardHeaderChild>
                                    <Input
                                        name="globalFilter"
                                        placeholder="Buscar..."
                                        value={globalFilter}
                                        onChange={(e) => { setGlobalFilter(e.target.value) }}
                                    />
                                </CardHeaderChild>
                            </CardHeader>
                            <CardBody className="z-0">
                                <div className="overflow-auto">
                                    <Table className='table-fixed min-w-[1000px]'>
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
                                    <div className="mt-2 min-w-[1000px]">
                                        <TableCardFooterTemplateV2 table={table} />
                                    </div>
                                </div>
                            </CardBody>
                        </Card>
                    </div>
                    <div className="w-full">
                        <Card>
                            <CardHeader>
                                <CardHeaderChild>
                                    <Badge className="text-xl">Items de la Guia de Salida</Badge>
                                </CardHeaderChild>
                                <CardHeaderChild>
                                    <div className="flex gap-4">
                                        <Button variant="solid" onClick={async () => {
                                            try {
                                                const response = await ApiService.fetchData({url: `/api/guia-salida/${id}/comprobar-guia/`, method: 'post'})
                                                if (response.data) {
                                                    toast.success("Guia completada", {autoClose: 1000})
                                                    dispatch(detalleGuiaSalidaBodegaThunk({id_guia: id}))
                                                    navigate(`/bodega/lista-guia-salida`)
                                                }
                                            } catch (error: any) {
                                                toast.error(error.response.data.detail || "Error al completar la guia", {toastId: "Error al completar la guia"})
                                            }
                                        }}>Completar Guia de Salida</Button>
                                    </div>
                                </CardHeaderChild>
                            </CardHeader>
                            <CardBody className="z-0">
                                {/* <div className="grid grid-cols-4">
                                    <div className="col-span-1 border">
                                        <Badge>Item</Badge>
                                    </div>
                                    <div className="col-span-1 border">
                                        <Badge>Stock</Badge>
                                    </div>
                                    <div className="col-span-1 border">
                                        <Badge>Cantidad Rebajada</Badge>
                                    </div>
                                    <div className="col-span-1 border">
                                        <Badge>Acciones</Badge>
                                    </div>
                                    {listaItemsEnGuiaSalidaBodega.map((item, index) => (
                                        <Fragment key={index}>
                                            <div className="col-span-1 border p-2">
                                                <div className="flex flex-col ml-4">
                                                    <div className="w-full">{item.datos_stock.datos_item.nombre}</div>
                                                    <div className="w-full text-xs ml-2 flex gap-1"><Icon icon="DuoPenRuler" size="text-base" /> {item.datos_stock.datos_item.tamanio} {item.datos_stock.datos_item.unidad_label}</div>
                                                    <div className="w-full mt-2">
                                                        <Button size="xs" className="!px-1" icon="DuoBox3" onClick={() => { if (item.datos_stock.datos_item.fabricante) navigate(`/registros/detalle-fabricante/${item.datos_stock.datos_item.fabricante}`) }}>{item.datos_stock.datos_item.datos_fabricante?.nombre || "Sin Fabricante"}</Button>
                                                    </div>
                                                    <div className="w-full">
                                                        <Button size="xs" className="!px-1" icon="DuoAlignJustify" onClick={() => { if (item.datos_stock.datos_item.categoria) navigate(`/registros/detalle-categoria/${item.datos_stock.datos_item.categoria}`) }}>{item.datos_stock.datos_item.datos_categoria?.nombre || "Sin Categoria"}</Button>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="col-span-1 border p-2">
                                                <div className="ml-4">{item.datos_stock.cantidad}</div>
                                            </div>
                                            <div className="col-span-1 border p-2">
                                                {itemRebajaSelected ? (
                                                    itemRebajaSelected.id === item.id ? (
                                                        <Validation
                                                            isValid={formikEditingItem.isValid}
                                                            isTouched={formikEditingItem.touched.cantidad_rebajada}
                                                            invalidFeedback={formikEditingItem.errors.cantidad_rebajada}
                                                        >
                                                            <Input 
                                                                name="cantidad_rebajada"
                                                                type="number"
                                                                disabled={itemRebajaSelected != item}
                                                                value={formikEditingItem.values.cantidad_rebajada}
                                                                onChange={formikEditingItem.handleChange}
                                                            />
                                                        </Validation>
                                                    ) : (
                                                        <div className="ml-4">{item.cantidad_rebajada}</div>
                                                    )
                                                ) : (
                                                    <div className="ml-4">{item.cantidad_rebajada}</div>
                                                )}
                                            </div>
                                            <div className="col-span-1 border p-2">
                                                {itemRebajaSelected ? (
                                                    itemRebajaSelected.id === item.id && (
                                                        <div>
                                                            <Button className="m-2" variant="solid" color="red" onClick={() => {formikEditingItem.resetForm(); setItemRebajaSelected(undefined)}}>Cancelar</Button>
                                                            <Button className="m-2" variant="solid" onClick={async () => {formikEditingItem.handleSubmit()}}>Guardar</Button>
                                                        </div>
                                                    )
                                                ) : (
                                                    <div>
                                                        <Button className="m-2" variant="solid" onClick={() => {formikEditingItem.setFieldValue('cantidad_rebajada', item.cantidad_rebajada); setItemRebajaSelected(item)}}>Editar</Button>
                                                        <Button className="m-2" variant="solid" color="red" onClick={async () => {
                                                            try {
                                                                const response = await ApiService.fetchData({url: `/api/guia-salida/${id}/items-guia/${item.id}/`, method: 'delete'})
                                                                if (response.status === 204) {
                                                                    setItemRebajaSelected(undefined)
                                                                    formikEditingItem.resetForm()
                                                                    dispatch(listaItemsEnGuiaSalidaBodegaThunk({id_guia: id}))
                                                                    dispatch(detalleGuiaSalidaBodegaThunk({id_guia: id}))
                                                                    toast.success("Item eliminado de la guia", {autoClose: 1000})
                                                                }
                                                            } catch (error: any) {
                                                                toast.error(error.response.data)
                                                            }
                                                        }}>Eliminar</Button>
                                                    </div>
                                                )}
                                            </div>
                                        </Fragment>
                                    ))}
                                </div> */}
                                <div className="overflow-auto">
                                    <Table className='table-fixed min-w-[800px]'>
                                        <THead>
                                            {tableItems.getHeaderGroups().map((headerGroup) => (
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
                                            {tableItems.getRowModel().rows.map((row) => (
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
                                        <TableCardFooterTemplateV2 table={tableItems} />
                                    </div>
                                </div>
                            </CardBody>
                        </Card>
                    </div>
                </div>
                <AsignarNumeroDeSerie isOpen={isOpenNumero} setIsOpen={setIsOpenNumero} itemRebajaSelected={itemRebajaSelected} setItemRebajaSelected={setItemRebajaSelected} />
            </Container>
        </PageWrapper>
    )
}

export default CrearItemsGuiaSalidaBodega