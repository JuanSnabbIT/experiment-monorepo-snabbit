import Icon from "@/components/icon/Icon"
import Container from "@/components/layouts/Container/Container"
import PageWrapper from "@/components/layouts/PageWrapper/PageWrapper"
import Badge from "@/components/ui/Badge"
import Button from "@/components/ui/Button"
import ApiService from "@/services/ApiService"
import Card, { CardBody, CardHeader, CardHeaderChild } from "@/components/ui/Card"
import Subheader, { SubheaderLeft } from "@/components/layouts/Subheader/Subheader"
import { useAppDispatch, useAppSelector } from "@/store"
import { detalleGuiaSalidaBodegaThunk, listaItemsEnGuiaSalidaBodegaThunk } from "@/store/slices/bodega/bodegaSlice"
import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { toast } from "react-toastify"
import Textarea from "@/components/form/Textarea"
import { useFormik } from "formik"
import * as Yup from 'yup'
import { createColumnHelper, flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, SortingState, useReactTable } from "@tanstack/react-table"
import { IItemGuiaSalida } from "@/interface/bodega.interface"
import Table, { TBody, Td, Th, THead, Tr } from "@/components/ui/Table"
import TableCardFooterTemplateV2 from "@/templates/Table/TableFooterTemplateV2"


const columnHelper = createColumnHelper<IItemGuiaSalida>()

function DetalleGuiaSalidaBodega() {
    const dispatch = useAppDispatch()
    const navigate = useNavigate()
    const { id } = useParams()
    const { detalleGuiaSalidaBodega, listaItemsEnGuiaSalidaBodega } = useAppSelector((state) => state.bodega)
    const [isCompleting, setIsCompleting] = useState<boolean>(false)
    const [isEditting, setIsEditting] = useState<boolean>(false)
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState<string>('');

    useEffect(() => {
        if (id) {
            dispatch(detalleGuiaSalidaBodegaThunk({id_guia: id}))
            dispatch(listaItemsEnGuiaSalidaBodegaThunk({id_guia: id}))
        }
    }, [id])

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

    const columns = [
        columnHelper.accessor("datos_stock.datos_item.nombre", {
            cell: (info) => info.getValue(),
            header: "Item"
        }),
        columnHelper.accessor("cantidad_original", {
            cell: (info) => info.getValue(),
            header: "Cantidad Original"
        }),
        columnHelper.accessor("cantidad_rebajada", {
            cell: (info) => info.getValue(),
            header: "Cantidad Rebajada"
        }),
        columnHelper.accessor("cantidad_devuelta", {
            cell: (info) => info.getValue(),
            header: "Cantidad Devuelta"
        }),
        columnHelper.accessor("individualizado", {
            cell: (info) => (
                <div>{info.row.original.individualizado ? info.row.original.numero_serie.serie : "No"}</div>
            ),
            header: "Serializado"
        }),
    ]

    const table = useReactTable({
        data: listaItemsEnGuiaSalidaBodega,
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
        <PageWrapper isProtectedRoute={true} name="Detalle de Guia de Salida de Items de Bodega" title="Detalle de Guia de Salida de Items de Bodega">
            <Subheader>
                <SubheaderLeft>
                    <Badge className="text-xl">Detalle de Guia de Salida de Items de Bodega</Badge>
                </SubheaderLeft>
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
                    <div className="w-full">
                        <Card>
                            <CardHeader>
                                <CardHeaderChild>
                                    <Badge className="text-xl">Items en la Guia</Badge>
                                </CardHeaderChild>
                                <CardHeaderChild>
                                    <div className="flex gap-4">
                                        {detalleGuiaSalidaBodega?.estado === "C" && (
                                            <>
                                                <Button isDisable={isCompleting} variant="solid" onClick={() => {navigate(`/bodega/devolucion-parcial-guia-salida-bodega/${id}`)}}>Devolución Parcial</Button>
                                                <Button isDisable={isCompleting} variant="solid" onClick={async () => {
                                                    setIsCompleting(true)
                                                    try {
                                                        const response = await ApiService.fetchData({url: `/api/guia-salida/${id}/devolver_a_bodega/`, method: 'post', headers: {'Content-Type': 'application/json'}})
                                                        if (response.data) {
                                                            toast.success("Se devolvieron todos los items a bodega", {autoClose: 1000})
                                                            dispatch(detalleGuiaSalidaBodegaThunk({id_guia: id}))
                                                            setIsCompleting(false)
                                                        }
                                                    } catch (error:any) {
                                                        toast.error(error.response.data.detail)
                                                        setIsCompleting(false)
                                                    }
                                                }}>Devolución Completa</Button>
                                            </>
                                        )}
                                    </div>
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
                                {/* <div className={`grid ${(detalleGuiaSalidaBodega?.estado === "R" || detalleGuiaSalidaBodega?.estado === "PR") ? "grid-cols-4" : "grid-cols-3"}`}>
                                    <div className="col-span-1 border">
                                        <Badge>Item</Badge>
                                    </div>
                                    <div className="col-span-1 border">
                                        <Badge>Stock Original</Badge>
                                    </div>
                                    <div className="col-span-1 border">
                                        <Badge>Cantidad Rebajada</Badge>
                                    </div>
                                    {(detalleGuiaSalidaBodega?.estado === "R" || detalleGuiaSalidaBodega?.estado === "PR") && (
                                        <div className="col-span-1 border">
                                            <Badge>Cantidad Devuelta</Badge>
                                        </div>
                                    )}
                                    {listaItemsEnGuiaSalidaBodega.map((item, index) => (
                                        <Fragment key={index}>
                                            <div className="col-span-1 border">
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
                                            <div className="col-span-1 border">
                                                <div className="ml-4">{detalleGuiaSalidaBodega?.estado === "P" ? item.datos_stock.cantidad : item.cantidad_original}</div>
                                            </div>
                                            <div className="col-span-1 border">
                                                <div className="ml-4">{item.cantidad_rebajada}</div>
                                            </div>
                                            {(detalleGuiaSalidaBodega?.estado === "R" || detalleGuiaSalidaBodega?.estado === "PR") && (
                                                <div className="col-span-1 border">
                                                    <div className="ml-4">{item.cantidad_devuelta}</div>
                                                </div>
                                            )}
                                        </Fragment>
                                    ))}
                                </div> */}
                            </CardBody>
                        </Card>
                    </div>
                </div>
            </Container>
        </PageWrapper>
    )
}

export default DetalleGuiaSalidaBodega