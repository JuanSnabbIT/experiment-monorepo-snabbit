import Badge from "@/components/ui/Badge"
import Card, { CardBody, CardHeader, CardHeaderChild } from "@/components/ui/Card"
import { listaItemsCompraThunk, useAppDispatch, useAppSelector } from "@/store"
import CrearItemEnCompra from "../modals/CrearItemEnCompra"
import Button from "@/components/ui/Button"
import { useNavigate } from "react-router-dom"
import { toast } from "react-toastify"
import ApiService from "@/services/ApiService"
import { useEffect, useState } from "react"
import { ICompra, IItemEnCompra } from "@/interface/bodega.interface"
import { useFormik } from "formik"
import Validation from "@/components/form/Validation"
import Input from "@/components/form/Input"
import SelectReact, { TSelectOption } from "@/components/form/SelectReact"
import * as Yup from "yup"


export function ItemEnTabla({item, detalleCompra} : {item: IItemEnCompra, detalleCompra: ICompra | undefined}) {
    const dispatch = useAppDispatch()
    const navigate = useNavigate()
    const { listaBodegas } = useAppSelector((state) => state.bodega)
    const [editando, setEditando] = useState<boolean>(false)

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            cantidad: 0,
            precio: 0,
            bodega_temporal: "",
        },
        validationSchema: Yup.object().shape({
            cantidad: Yup.number().required("Requerido").nonNullable("Requerido").min(1, "Minimo 1"),
            precio: Yup.number().required("Requerido").nonNullable("Requerido").min(1, "Minimo 1"),
            bodega_temporal: Yup.string().required("Requerido").nonNullable("Requerido"),
        }),
        onSubmit: async (values) => {
            try {
                const response = await ApiService.fetchData({url: `/api/compras/${detalleCompra?.id}/items-compras/${item.id}/`, method: 'patch', headers: {'Content-Type': 'application/json'}, data: JSON.stringify({
                    cantidad: values.cantidad,
                    precio: values.precio,
                })})
                if (response.data) {
                    const responseStock = await ApiService.fetchData({url: `/api/items-orden-compra-en-stock/${item.item_stock?.id}/`, method: 'patch', headers: {'Content-Type': 'application/json'}, data: JSON.stringify({
                        cantidad: values.cantidad,
                        bodega_temporal: values.bodega_temporal
                    })})
                    if (responseStock) {
                        toast.success("Item actualizado", {autoClose: 1000})
                        setEditando(false)
                        dispatch(listaItemsCompraThunk({id_compra: detalleCompra?.id}))
                    }
                }
            } catch (error: any) {
                toast.error(error.response.data || "Error al actualizar el item", {toastId: "Error al actualizar el item"})
            }
        }
    })

    useEffect(() => {
        if (editando) {
            formik.setValues({
                cantidad: item.cantidad,
                precio: item.precio,
                bodega_temporal: item.item_stock?.bodega_temporal?.toString() || ""
            })
        } else {
            formik.resetForm()
        }
    }, [editando])

    return (
        <>
            <div className="border border-blue-500 rounded-xl py-2 grid grid-cols-5 gap-4 items-center">
                <div>
                    <div className="ml-4">{item.nombre_item}</div>
                </div>
                <div>
                    {editando ? (
                        <Validation
                            isValid={formik.isValid}
                            isTouched={formik.touched.cantidad}
                            invalidFeedback={formik.errors.cantidad}
                        >
                            <Input
                                type="number"
                                name="cantidad"
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                                value={formik.values.cantidad}
                            />
                        </Validation>
                    ) : (
                        <div className="ml-4">{item.cantidad}</div>
                    )}
                </div>
                <div>
                    {editando ? (
                        <Validation
                        isValid={formik.isValid}
                        isTouched={formik.touched.precio}
                        invalidFeedback={formik.errors.precio}
                    >
                        <Input
                            type="number"
                            name="precio"
                            onChange={formik.handleChange}
                            onBlur={formik.handleBlur}
                            value={formik.values.precio}
                        />
                    </Validation>
                    ) : (
                        <div className="ml-4">${item.precio}</div>
                    )}
                </div>
                <div>
                    {editando ? (
                        <Validation
                            isValid={formik.isValid}
                            isTouched={formik.touched.bodega_temporal}
                            invalidFeedback={formik.errors.bodega_temporal}
                        >
                            <SelectReact
                                name="bodega_temporal"
                                className="z-50"
                                options={listaBodegas.map(bode => ({value: bode.id.toString(), label: bode.nombre}))}
                                onChange={(e) => {formik.setFieldValue("bodega_temporal", (e as TSelectOption).value)}}
                                value={{value: formik.values.bodega_temporal, label: listaBodegas.find(bode => bode.id.toString() === formik.values.bodega_temporal)?.nombre || ""}}
                                noOptionsMessage={(e) => (`No Existe ${e.inputValue}`)}
                                onBlur={formik.handleBlur}
                            />
                        </Validation>
                    ) : (
                        <div className="ml-4">{item.item_stock?.nombre_bodega || "Sin Bodega"}</div>
                    )}
                </div>
                <div className="flex flex-wrap gap-2">
                    {detalleCompra && detalleCompra.estado === "-" && (
                        editando ? (
                            <>
                                <Button variant="solid" color="emerald" icon="HeroCheck" onClick={() => {formik.handleSubmit()}} />
                                <Button variant="solid" color="red" icon="HeroXMark" onClick={() => {setEditando(false)}} />
                            </>
                        ) : (
                            <>
                                <Button variant="solid" icon="HeroPencil" onClick={() => {setEditando(true)}}></Button>
                                <Button variant="solid" color="violet" icon="HeroEye" onClick={() => {navigate(`/registros/detalle-item-empresa/${item.item}`)}}></Button>
                                <Button variant="solid" color="red" icon="HeroTrash" onClick={async () => {
                                    try {
                                        const response = await ApiService.fetchData({url: `/api/compras/${detalleCompra?.id}/items-compras/${item.id}/`, method: 'delete'})
                                        if (response.status === 204) {
                                            dispatch(listaItemsCompraThunk({id_compra: detalleCompra?.id}))
                                            toast.success("Item eliminado", {autoClose: 1000})
                                        }
                                    } catch (error: any) {
                                        toast.error(error.response.data || "Error al eliminar el item", {toastId: "Error al eliminar el item"})
                                    }
                                }}/>
                            </>
                        )
                    )}
                </div>
            </div>
        </>
    )
}

function TablaItemsCompra() {
    const dispatch = useAppDispatch()
    const { detalleCompra, listaItemsCompra } = useAppSelector((state) => state.bodega)

    useEffect(() => {
        if (detalleCompra) {
            dispatch(listaItemsCompraThunk({id_compra: detalleCompra.id}))
        }
    }, [detalleCompra])

    return (
        <Card>
            <CardHeader>
                <CardHeaderChild>
                    <Badge className="text-xl">Items</Badge>
                </CardHeaderChild>
                <CardHeaderChild>
                    {detalleCompra && detalleCompra.estado === "-" && (
                        <CrearItemEnCompra compra={detalleCompra} />
                    )}
                </CardHeaderChild>
            </CardHeader>
            <CardBody className="h-full">
                <div className="overflow-auto h-full">
                    <div className="flex flex-col gap-4 h-full">
                        {listaItemsCompra.length > 0 ? (
                            <>
                                <div className="grid grid-cols-5 gap-4 items-center">
                                    <div>
                                        <Badge>Nombre</Badge>
                                    </div>
                                    <div>
                                        <Badge>Cantidad</Badge>
                                    </div>
                                    <div>
                                        <Badge>Precio</Badge>
                                    </div>
                                    <div>
                                        <Badge>Bodega</Badge>
                                    </div>
                                </div>
                                {listaItemsCompra.map((item, index) => (
                                    <ItemEnTabla detalleCompra={detalleCompra} item={item} key={index} />
                                ))}
                            </>
                        ) : (
                            <div className="border border-blue-500 rounded-xl p-4">Sin Items</div>
                        )}
                    </div>
                </div>
            </CardBody>
        </Card>
    )
}

export default TablaItemsCompra