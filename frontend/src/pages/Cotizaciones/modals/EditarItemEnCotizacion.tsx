import Input from "@/components/form/Input"
import SelectReact, { TSelectOption } from "@/components/form/SelectReact"
import Validation from "@/components/form/Validation"
import Badge from "@/components/ui/Badge"
import Button from "@/components/ui/Button"
import Modal, { ModalBody, ModalFooter, ModalFooterChild, ModalHeader } from "@/components/ui/Modal"
import { ICotizacion, IItemCotizacion } from "@/interface/cotizaciones.interface"
import ApiService from "@/services/ApiService"
import { listaProveedoresDelItemThunk, listaProveedoresEmpresaThunk, useAppDispatch, useAppSelector } from "@/store"
import { useFormik } from "formik"
import { useEffect, useState } from "react"
import { toast } from "react-toastify"

function EditarItemEnCotizacion({
	item,
	cotizacion,
	onItemChange,
}: {
	item: IItemCotizacion;
	cotizacion: ICotizacion | undefined;
	onItemChange?: () => void;
}) {
	const dispatch = useAppDispatch();
	const { listaProveedoresEmpresa, listaProveedoresDelItem } = useAppSelector(
		(state) => state.item,
	);
    const [isOpen, setIsOpen] = useState<boolean>(false)

    useEffect(() => {
        if (isOpen && item) {
            if (!item.item_empresa) {
                dispatch(listaProveedoresEmpresaThunk({id_empresa: cotizacion?.empresa}))
            }
            if (item.item_empresa) {
                dispatch(listaProveedoresDelItemThunk({id_item: item.item_empresa}))
            }
            formik.setValues({
                cantidad: item.cantidad,
                porcentaje_recargo: item.porcentaje_recargo || 0,
                precio_unitario: Number(item.precio_unitario),
                proveedor_empresa: item.proveedor_empresa ? item.proveedor_empresa.toString() : "",
                recargo_dolar: item.recargo_dolar
            })
        }
        if (!isOpen) {
            formik.resetForm()
        }
    }, [isOpen, item])

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            proveedor_empresa: "",
            cantidad: 0,
            precio_unitario: 0,
            porcentaje_recargo: 0,
            recargo_dolar: 0,
        },
        onSubmit: async (values) => {
            try {
                const response = await ApiService.fetchData({url: `/api/items-cotizacion/${item.id}/`, method: 'patch', headers: {'Content-Type': 'application/json'}, data: JSON.stringify(values)})
                if (response.data) {
                    toast.success("Item editado", {autoClose: 1000})
                    setIsOpen(false)
                    if (onItemChange) onItemChange()
                }
            } catch (error: any) {
                toast.error(error.response.data || "Error al editar el item", {toastId: "Error al editar el item"})
            }
        }
    })

    return (
        <>
            <Button icon="HeroPencil" variant="solid" onClick={() => {setIsOpen(true)}} />
            <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
                <ModalHeader>
                    <Badge className="text-xl">Editar {item.nombre}</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-full">
                            <Badge>Proveedor</Badge>
                            <SelectReact
                                name="proveedor_empresa"
                                options={!item.item_empresa ? 
                                    listaProveedoresEmpresa.map(pro => ({value: pro.id.toString(), label: pro.nombre})) : 
                                    listaProveedoresDelItem.map(pro => ({value: pro.id.toString(), label: pro.nombre}))
                                }
                                noOptionsMessage={(e) => (`No Existe ${e.inputValue}`)}
                                onBlur={formik.handleBlur}
                                onChange={(e) => {formik.setFieldValue("proveedor_empresa", (e as TSelectOption).value)}}
                                value={{
                                    value: formik.values.proveedor_empresa,
                                    label: !item.item_empresa ? 
                                        (listaProveedoresEmpresa.find(pro => pro.id.toString() === formik.values.proveedor_empresa)?.nombre || "") :
                                        (listaProveedoresDelItem.find(pro => pro.id.toString() === formik.values.proveedor_empresa)?.nombre || "")
                                }}
                            />
                        </div>
                        <div>
                            <Badge>Porcentaje Recargo</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.porcentaje_recargo}
                                invalidFeedback={formik.errors.porcentaje_recargo}
                            >
                                <Input
                                    type="number"
                                    name="porcentaje_recargo"
                                    value={formik.values.porcentaje_recargo}
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                />
                            </Validation>
                        </div>
                        <div>
                            <Badge>Recargo Por Dolar</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.recargo_dolar}
                                invalidFeedback={formik.errors.recargo_dolar}
                            >
                                <Input
                                    name="recargo_dolar"
                                    type="number"
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                    value={formik.values.recargo_dolar}
                                />
                            </Validation>
                        </div>
                        <div>
                            <Badge>Cantidad</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.cantidad}
                                invalidFeedback={formik.errors.cantidad}
                            >
                                <Input
                                    type="number"
                                    name="cantidad"
                                    value={formik.values.cantidad}
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                />
                            </Validation>
                        </div>
                        <div>
                            <Badge>Precio Unitario</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.precio_unitario}
                                invalidFeedback={formik.errors.precio_unitario}
                            >
                                <Input
                                    type="number"
                                    name="precio_unitario"
                                    value={formik.values.precio_unitario}
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                />
                            </Validation>
                        </div>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <ModalFooterChild></ModalFooterChild>
                    <ModalFooterChild>
                        <Button color="red" onClick={() => {setIsOpen(false)}}>Cancelar</Button>
                        <Button variant="solid" onClick={() => {formik.handleSubmit()}}>Guardar</Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    )
}

export default EditarItemEnCotizacion