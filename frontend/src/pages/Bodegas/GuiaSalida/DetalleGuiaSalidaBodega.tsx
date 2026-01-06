import Input from "@/components/form/Input"
import Textarea from "@/components/form/Textarea"
import Icon from "@/components/icon/Icon"
import Container from "@/components/layouts/Container/Container"
import PageWrapper from "@/components/layouts/PageWrapper/PageWrapper"
import Subheader, { SubheaderLeft, SubheaderRight } from "@/components/layouts/Subheader/Subheader"
import Badge from "@/components/ui/Badge"
import Button from "@/components/ui/Button"
import Card, { CardBody, CardHeader, CardHeaderChild } from "@/components/ui/Card"
import Table, { TBody, Td, Th, THead, Tr } from "@/components/ui/Table"
import Tooltip from "@/components/ui/Tooltip"
import { IItemGuiaSalida, IStockItemEnBodega } from "@/interface/bodega.interface"
import ModalEliminar from "@/pages/Items/Proveedor/modals/ModalEliminar"
import ApiService from "@/services/ApiService"
import { useAppDispatch, useAppSelector } from "@/store"
import { detalleGuiaSalidaBodegaThunk, listaComprasDeStockThunk, listaItemsEnGuiaSalidaBodegaThunk, listaStockItemsEnBodegaThunk } from "@/store/slices/bodega/bodegaSlice"
import TableCardFooterTemplateV2 from "@/templates/Table/TableFooterTemplateV2"
import { confirmAlert } from "@/utils/sweetAlert"
import { createColumnHelper, flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, SortingState, useReactTable } from "@tanstack/react-table"
import { useFormik } from "formik"
import { useEffect, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { toast } from "react-toastify"
import * as Yup from 'yup'
import AprobarGuiaSalida from "./modals/AprobarGuiaSalida"
import AsignarNumeroDeSerie from "./modals/AsignarNumeroDeSerie"
import FirmarEntregarGuia from "./modals/FirmarEntregarGuia"
import VolverAPendienteGuiaSalida from "./modals/VolverAPendienteGuiaSalida"

const columnHelperItem = createColumnHelper<IItemGuiaSalida>()
const columnHelperStock = createColumnHelper<IStockItemEnBodega>()

function DetalleGuiaSalidaBodega() {
    const dispatch = useAppDispatch()
    const navigate = useNavigate()
    const { id } = useParams()
    const { detalleGuiaSalidaBodega, listaItemsEnGuiaSalidaBodega, listaStockItemsEnBodega } = useAppSelector((state) => state.bodega)
    const [isEditting, setIsEditting] = useState<boolean>(false)
    const [sorting, setSorting] = useState<SortingState>([])
    const [globalFilter, setGlobalFilter] = useState<string>('')
    const [stockSorting, setStockSorting] = useState<SortingState>([])
    const [stockGlobalFilter, setStockGlobalFilter] = useState<string>('')
    const [itemsSorting, setItemsSorting] = useState<SortingState>([])
    const [itemsGlobalFilter, setItemsGlobalFilter] = useState<string>('')
    const [isCreating, setIsCreating] = useState<boolean>(false)
    const [itemStockSelected, setItemStockSelected] = useState<IStockItemEnBodega | undefined>()
    const [itemRebajaSelected, setItemRebajaSelected] = useState<IItemGuiaSalida | undefined>()
    const [isOpenNumero, setIsOpenNumero] = useState<boolean>(false)
    const [completando, setCompletando] = useState<boolean>(false)

    const [isOpen, setIsOpen] = useState<boolean>(false)
    const [isOpenFirma, setIsOpenFirma] = useState<boolean>(false)

    const isPendiente = detalleGuiaSalidaBodega?.estado === "P"

    useEffect(() => {
        if (id) {
            dispatch(detalleGuiaSalidaBodegaThunk({id_guia: id}))
            dispatch(listaItemsEnGuiaSalidaBodegaThunk({id_guia: id}))
        }
    }, [dispatch, id])

    useEffect(() => {
        if (itemRebajaSelected) {
            dispatch(listaComprasDeStockThunk({id_bodega: itemRebajaSelected.datos_stock.bodega, id_stock: itemRebajaSelected.datos_stock.id}))
        }
    }, [dispatch, itemRebajaSelected])

    useEffect(() => {
        if (detalleGuiaSalidaBodega && isPendiente) {
            dispatch(listaStockItemsEnBodegaThunk({id_bodega: detalleGuiaSalidaBodega.bodega}))
        }
    }, [dispatch, detalleGuiaSalidaBodega, isPendiente])

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            motivo: "",
        },
        validationSchema: Yup.object().shape({
            motivo: Yup.string().notRequired().nullable()
        }),
        onSubmit: async (values) => {
            try {
                const response = await ApiService.fetchData({url: `/api/guia-salida/${id}/`, method: 'patch', headers: {'Content-Type': 'application/json'}, data: JSON.stringify(values)})
                if (response.data) {
                    setIsEditting(false)
                    dispatch(detalleGuiaSalidaBodegaThunk({id_guia: id}))
                    dispatch(listaItemsEnGuiaSalidaBodegaThunk({id_guia: id}))
                    toast.success("Guia de salida editada", {autoClose: 1000})
                }
            } catch (error: any) {
                toast.error(error.response.data || "Error al editar la guia de salida", {toastId: "Error al editar la guia de salida"})
            }
        }
    })

    useEffect(() => {
        if (isEditting && detalleGuiaSalidaBodega) {
            formik.setFieldValue("motivo", detalleGuiaSalidaBodega.motivo)
        }
    }, [isEditting, detalleGuiaSalidaBodega])

    const columnsReadOnly = [
        columnHelperItem.accessor("datos_stock.datos_item.nombre", {
            cell: (info) => info.getValue(),
            header: "Item"
        }),
        columnHelperItem.accessor("cantidad_original", {
            cell: (info) => info.getValue(),
            header: "Cantidad Original"
        }),
        columnHelperItem.accessor("cantidad_rebajada", {
            cell: (info) => info.getValue(),
            header: "Cantidad Rebajada"
        }),
        columnHelperItem.accessor("cantidad_devuelta", {
            cell: (info) => info.getValue(),
            header: "Cantidad Devuelta"
        }),
        columnHelperItem.accessor("individualizado", {
            cell: (info) => (
                <div>{info.row.original.individualizado ? info.row.original.numero_serie.serie : "No"}</div>
            ),
            header: "Serializado"
        }),
    ]

    const tableReadOnly = useReactTable({
        data: listaItemsEnGuiaSalidaBodega,
        columns: columnsReadOnly,
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

    const columnsStock = [
        columnHelperStock.accessor(row => row.datos_item?.nombre || "Sin Nombre", {
            id: "nombre_item",
            cell: (info) => info.getValue(),
            header: "Nombre"
        }),
        columnHelperStock.accessor("cantidad", {
            cell: (info) => (
                <div>
                    <Tooltip text={`Cantidad no disponible: ${info.row.original.cantidad_no_disponible}`}>
                        <div>{info.getValue()}</div>
                    </Tooltip>
                </div>
            ),
            header: "Cantidad"
        }),
        columnHelperStock.accessor(row => row.datos_item?.datos_categoria?.nombre || "Sin Categoria", {
            id: "categoria",
            cell: (info) => <div>{info.getValue()}</div>,
            header: "Categoria"
        }),
        columnHelperStock.accessor(row => row.datos_item?.datos_fabricante?.nombre || "Sin Fabricante", {
            id: "fabricante",
            cell: (info) => <div>{info.getValue()}</div>,
            header: "Fabricante"
        }),
        columnHelperStock.display({
            id: "acciones",
            cell: (info) => {
                const inputRef = useRef<HTMLInputElement>(null)
                return (
                    <div>
                        {!isCreating && itemStockSelected === info.row.original ? (
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
                                        if (!id) return
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
                                                    setItemStockSelected(undefined)
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
                                        if (!id) return
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
                                                setItemStockSelected(undefined)
                                            }
                                        } catch(error: any) {
                                            toast.error(error.response.data.detail)
                                        }
                                        setIsCreating(false)
                                    }}></Button>
                                </Tooltip>
                            </div>
                        ) : (
                            <Button isDisable={isCreating} variant="solid" icon="HeroPlus" rounded="rounded-full" onClick={() => {setItemStockSelected(info.row.original)}}></Button>
                        )}
                    </div>
                )
            },
            header: ""
        })
    ]

    const stockTable = useReactTable({
        data: listaStockItemsEnBodega,
        columns: columnsStock,
        state: {
            sorting: stockSorting,
            globalFilter: stockGlobalFilter,
        },
        onSortingChange: setStockSorting,
        enableGlobalFilter: true,
        onGlobalFilterChange: setStockGlobalFilter,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel()
    })

    const columnsItems = [
        columnHelperItem.accessor("id", {
            cell: (info) => (
                <div className="flex flex-col">
                    <div className="w-full">{info.row.original.datos_stock.datos_item.nombre}</div>
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
        columnHelperItem.accessor("cantidad_rebajada", {
            cell: (info) => {
                const [cantidad, setCantidad] = useState<number>(info.row.original.cantidad_rebajada)
                const [isEdittingCantidad, setIsEdittingCantidad] = useState<boolean>(false)

                return (
                    <div>
                        {isEdittingCantidad ? (
                            <>
                                <Input
                                    name="cantidad_rebajada"
                                    type="number"
                                    value={cantidad}
                                    onChange={(e) => {setCantidad(parseInt(e.target.value))}}
                                />
                                <div>
                                    <Tooltip text="Cancelar">
                                        <Button className="m-2" variant="solid" icon="HeroXMark" color="red" onClick={() => {setIsEdittingCantidad(false); setCantidad(info.row.original.cantidad_rebajada)}}></Button>
                                    </Tooltip>
                                    <Tooltip text="Guardar">
                                        <Button className="m-2" variant="solid" icon="DuoSave" onClick={async () => {
                                            if (!id) return
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
                                {!info.row.original.individualizado && (<Button className="m-2" variant="solid" onClick={() => {setIsEdittingCantidad(true)}}>Editar</Button>)}
                            </>
                        )}
                    </div>
                )
            },
            header: "Cantidad"
        }),
        columnHelperItem.accessor("individualizado", {
            cell: (info) => {
                return (
                    <div>
                        {info.row.original.individualizado ? (
                            <div className="flex flex-col gap-2">
                                {info.row.original.numero_serie.serie ? info.row.original.numero_serie.serie : ("Sin Numero")}
                                <div>
                                    <Button variant="solid" onClick={() => {setItemRebajaSelected(info.row.original); setIsOpenNumero(true)}}>Editar</Button>
                                </div>
                            </div>
                        ) : "No"}
                    </div>
                )
            },  
            header: "Serializado"
        }),
        columnHelperItem.display({
            id: "acciones",
            cell: (info) => (
                <div>
                    <Button className="m-2" variant="solid" color="red" onClick={async () => {
                        if (!id) return
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
            sorting: itemsSorting,
            globalFilter: itemsGlobalFilter,
        },
        onSortingChange: setItemsSorting,
        enableGlobalFilter: true,
        onGlobalFilterChange: setItemsGlobalFilter,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel()
    })

    const completarGuia = async () => {
        if (!id) return
        const ok = await confirmAlert({
            title: "Completar guia de salida",
            text: "Estas seguro de completar la guia de salida?",
            confirmText: "Completar",
            cancelText: "Cancelar",
            icon: "warning",
        })
        if (!ok) return
        setCompletando(true)
        try {
            const response = await ApiService.fetchData({url: `/api/guia-salida/${id}/comprobar-guia/`, method: 'post'})
            if (response.data) {
                toast.success("Guia completada", {autoClose: 1000})
                dispatch(detalleGuiaSalidaBodegaThunk({id_guia: id}))
                dispatch(listaItemsEnGuiaSalidaBodegaThunk({id_guia: id}))
            }
        } catch (error: any) {
            toast.error(error.response?.data?.detail || "Error al completar la guia", {toastId: "Error al completar la guia"})
        }
        setCompletando(false)
    }

    return (
        <PageWrapper isProtectedRoute={true} name="Detalle de Guia de Salida de Items de Bodega" title="Detalle de Guia de Salida de Items de Bodega">
            <Subheader>
                <SubheaderLeft>
                    <Badge className="text-xl">Detalle de Guia de Salida de Items de Bodega</Badge>

                </SubheaderLeft>
                <SubheaderRight>
                    <div className="flex flex-wrap gap-2">
                        {detalleGuiaSalidaBodega?.orden_trabajo && (
                            <Tooltip text="Ver OT Vinculada">
                                <Button 
                                    variant="solid" 
                                    color="violet"
                                    icon="HeroDocumentText"
                                    onClick={() => navigate(`/orden-trabajo/detalle-orden-trabajo/${detalleGuiaSalidaBodega.orden_trabajo}`)}
                                >
                                    OT Vinculada
                                </Button>
                            </Tooltip>
                        )}
                        {isPendiente && (
                            <ModalEliminar
                                mensaje={`Estas a punto de eliminar esta asistencia en ${detalleGuiaSalidaBodega?.id} ¿desea continuar?`}
                                onDispatch={() => { navigate('/bodega/guias-salida-bodega') }}
                                peticionUrl={`/api/guia-salida/${detalleGuiaSalidaBodega?.id}/`}
                            />
                        )}
                        {detalleGuiaSalidaBodega?.estado === "ER" && (
                            (() => {
                                const soporte = detalleGuiaSalidaBodega?.soporte_tecnico;
                                const faltaDatosSoporte = typeof soporte === 'object' && soporte !== null ? !!soporte.falta_datos : false;
                                const disabled = !!faltaDatosSoporte;
                                const tooltip = disabled ? "Faltan datos en la OT (asignar técnico y fecha)" : "Firmar para Aprobar Guia";
                                return (
                                    <Tooltip text={tooltip}>
                                        <div className={disabled ? "opacity-60 cursor-not-allowed" : ""}>
                                            <Button
                                                variant="solid"
                                                isDisable={disabled}
                                                onClick={() => {
                                                    if (disabled) return;
                                                    setIsOpen(true);
                                                }}
                                                icon="HeroPencil"
                                                color="emerald"
                                            />
                                        </div>
                                    </Tooltip>
                                );
                            })()
                        )}
                        {detalleGuiaSalidaBodega?.estado === "ER" && (
                            <VolverAPendienteGuiaSalida
                                guia_salida={detalleGuiaSalidaBodega}
                                onSuccess={() => { id && dispatch(detalleGuiaSalidaBodegaThunk({ id_guia: id })) }}
                            />
                        )}
                        {(detalleGuiaSalidaBodega?.estado === "ET" || detalleGuiaSalidaBodega?.estado === "C" || detalleGuiaSalidaBodega?.estado === "T") && (
                            <>
                                <Tooltip text="Devolución Parcial">
                                    <Button variant="solid" color="amber" icon="DuoIncomingBox" onClick={() => { navigate(`/bodega/devolucion-parcial-guia-salida-bodega/${id}`) }} />
                                </Tooltip>
                                <Tooltip text="Devolución Completa">
                                    <Button variant="solid" color="emerald" icon="HeroInboxArrowDown" onClick={async () => {
                                        try {
                                            const response = await ApiService.fetchData({ url: `/api/guia-salida/${id}/devolver_a_bodega/`, method: 'post', headers: { 'Content-Type': 'application/json' } })
                                            if (response.data) {
                                                toast.success("Se devolvieron todos los items a bodega", { autoClose: 1000 })
                                                id && dispatch(detalleGuiaSalidaBodegaThunk({ id_guia: id }))
                                            }
                                        } catch (error: any) {
                                            toast.error(error.response.data.detail)
                                        }
                                    }} />
                                </Tooltip>
                            </>
                        )}
                        {detalleGuiaSalidaBodega?.estado === "ET" && (
                            <>
                                <Tooltip text="Firmar para Entregar">
                                    <Button variant="solid" color="lime" icon="DuoArchive" onClick={() => { setIsOpenFirma(true) }}></Button>
                                </Tooltip>
                                <Tooltip text="Terminar Guia">
                                    <Button variant="solid" color="sky" icon="DuoBox3" onClick={async () => {
                                        try {
                                            const response = await ApiService.fetchData({ url: `/api/guia-salida/${id}/`, method: 'patch', headers: { 'Content-Type': 'application/json' }, data: JSON.stringify({ estado: "T" }) })
                                            if (response.data) {
                                                toast.success("Guia terminada", { autoClose: 1000 })
                                                id && dispatch(detalleGuiaSalidaBodegaThunk({ id_guia: id }))
                                            }
                                        } catch (error: any) {
                                            const mensajesError = Object.values(error.response.data).flat().join(" ");
                                            toast.error(mensajesError || "Error al terminar la guia", { toastId: "Error al terminar la guia" })
                                        }
                                    }}></Button>
                                </Tooltip>
                            </>
                        )}
                    </div>
                </SubheaderRight>
            </Subheader>
            <Container className="w-full h-full">
                <div className="flex flex-col gap-4">
                    <div className="w-full">
                        <Card>
                            <CardHeader>
                                <CardHeaderChild>
                                    <Badge className="text-xl">Datos</Badge>
                                </CardHeaderChild>
                                <CardHeaderChild>
                                    {isEditting ? (
                                        <div className="flex gap-4">
                                            <Button variant="solid" color="red" onClick={() => {setIsEditting(false)}}>Cancelar</Button>
                                            <Button variant="solid" onClick={() => {formik.handleSubmit()}}>Guardar</Button>
                                        </div>
                                    ) : (
                                        <Button variant="solid" onClick={() => {setIsEditting(true)}} icon="HeroPencil"></Button>
                                    )}
                                </CardHeaderChild>
                            </CardHeader>
                            <CardBody>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {isEditting ? (
                                        <>
                                            <div className="w-full">
                                                <Badge>Estado</Badge>
                                                <div className="ml-4">{detalleGuiaSalidaBodega?.estado_label}</div>
                                            </div>
                                            <div className="w-full">
                                                <Badge>Creado Por</Badge>
                                                <div className="ml-4">{detalleGuiaSalidaBodega?.nombre_creado_por}</div>
                                            </div>
                                            <div className="w-full">
                                                <Badge>Recibido Por</Badge>
                                                <div className="ml-4">{detalleGuiaSalidaBodega?.nombre_recibido_por}</div>
                                            </div>
                                            <div className="w-full">
                                                <Badge>Cliente</Badge>
                                                <div className="ml-4">{detalleGuiaSalidaBodega?.cliente_nombre}</div>
                                            </div>
                                            <div className="col-span-full">
                                                <Badge>Motivo</Badge>
                                                <Textarea
                                                    name="motivo"
                                                    value={formik.values.motivo}
                                                    onChange={formik.handleChange}
                                                    onBlur={formik.handleBlur}
                                                />
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="w-full">
                                                <Badge>Estado</Badge>
                                                <div className="ml-4">{detalleGuiaSalidaBodega?.estado_label}</div>
                                            </div>
                                            <div className="w-full">
                                                <Badge>Creado Por</Badge>
                                                <div className="ml-4">{detalleGuiaSalidaBodega?.nombre_creado_por}</div>
                                            </div>
                                            <div className="w-full">
                                                <Badge>Recibido Por</Badge>
                                                <div className="ml-4">{detalleGuiaSalidaBodega?.nombre_recibido_por}</div>
                                            </div>
                                            <div className="w-full">
                                                <Badge>Cliente</Badge>
                                                <div className="ml-4">{detalleGuiaSalidaBodega?.cliente_nombre}</div>
                                            </div>
                                            <div className="col-span-full">
                                                <Badge>Motivo</Badge>
                                                <div className="ml-4">{detalleGuiaSalidaBodega?.motivo || "Sin Motivo"}</div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </CardBody>
                        </Card>
                    </div>
                    {isPendiente && (
                        <>
                            <div className="w-full">
                                <Card>
                                    <CardHeader>
                                        <CardHeaderChild>
                                            <Badge className="text-xl">Items en stock de la bodega</Badge>
                                        </CardHeaderChild>
                                    </CardHeader>
                                    <CardBody className="z-0">
                                        <div className="overflow-auto">
                                            <Table className='table-fixed min-w-[1000px]'>
                                                <THead>
                                                    {stockTable.getHeaderGroups().map((headerGroup) => (
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
                                                    {stockTable.getRowModel().rows.map((row) => (
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
                                                <TableCardFooterTemplateV2 table={stockTable} />
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
                                                <Button variant="solid" isDisable={completando} onClick={completarGuia}>Completar Guia de Salida</Button>
                                            </div>
                                        </CardHeaderChild>
                                    </CardHeader>
                                    <CardBody className="z-0">
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
                        </>
                    )}
                    {!isPendiente && (
                        <div className="w-full">
                            <Card>
                                <CardHeader>
                                    <CardHeaderChild>
                                        <Badge className="text-xl">Items en la Guia</Badge>
                                    </CardHeaderChild>
                                    <CardHeaderChild>
                                    </CardHeaderChild>
                                </CardHeader>
                                <CardBody className="z-0">
                                    <div className="overflow-auto">
                                        <Table className='table-fixed min-w-[600px]'>
                                            <THead>
                                                {tableReadOnly.getHeaderGroups().map((headerGroup) => (
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
                                                {tableReadOnly.getRowModel().rows.map((row) => (
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
                                            <TableCardFooterTemplateV2 table={tableReadOnly} />
                                        </div>
                                    </div>
                                </CardBody>
                            </Card>
                        </div>
                    )}
                </div>
                {isPendiente && (
                    <AsignarNumeroDeSerie isOpen={isOpenNumero} setIsOpen={setIsOpenNumero} itemRebajaSelected={itemRebajaSelected} setItemRebajaSelected={setItemRebajaSelected} />
                )}
                <AprobarGuiaSalida id_guia={id ? parseInt(id) : undefined} bodegaSelected={detalleGuiaSalidaBodega?.bodega.toString()} isOpen={isOpen} setIsOpen={setIsOpen} onSuccess={() => { id && dispatch(detalleGuiaSalidaBodegaThunk({ id_guia: id })) }} />
                <FirmarEntregarGuia id_guia={id ? parseInt(id) : undefined} bodegaSelected={detalleGuiaSalidaBodega?.bodega.toString()} isOpen={isOpenFirma} setIsOpen={setIsOpenFirma} onSuccess={() => { id && dispatch(detalleGuiaSalidaBodegaThunk({ id_guia: id })) }} />
            </Container>
        </PageWrapper>
    )
}

export default DetalleGuiaSalidaBodega
