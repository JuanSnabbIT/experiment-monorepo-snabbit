import Input from "@/components/form/Input"
import Validation from "@/components/form/Validation"
import Badge from "@/components/ui/Badge"
import Button from "@/components/ui/Button"
import Modal, { ModalBody, ModalFooter, ModalFooterChild, ModalHeader } from "@/components/ui/Modal"
import Tooltip from "@/components/ui/Tooltip"
import { IItemEnOrdenCompra } from "@/interface/bodega.interface"
import ApiService from "@/services/ApiService"
import { useAppDispatch } from "@/store"
import { ordenCompraApi } from "@/store/slices/bodega/ordenCompraApi"
import { getErrorMessage } from "@/utils/errorHandlers"
import { useFormik } from "formik"
import { useEffect, useState } from "react"
import { toast } from "react-toastify"
import * as Yup from 'yup'


function EditarItemEnOrdenCompra({item, id_orden} : {item: IItemEnOrdenCompra, id_orden: string | number | undefined}) {
    const dispatch = useAppDispatch()
    const [isOpen, setIsOpen] = useState<boolean>(false)
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

    useEffect(() => {
        if (isOpen) {
            formik.setFieldValue("cantidad", item.cantidad)
            formik.setFieldValue("precio", item.precio)
        }
    }, [isOpen])

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            cantidad: 0,
            precio: 0,
        },
        validationSchema: Yup.object({
            cantidad: Yup.number()
                .required('Requerido')
                .nonNullable('Requerido')
                .min(1, 'La cantidad no puede ser menor a 0')
                .typeError('La cantidad debe ser un número'),
            precio: Yup.number()
                .required('Requerido')
                .nonNullable('Requerido')
                .min(1, 'El precio no puede ser menor a 0')
                .typeError('El precio debe ser un número'),
        }),
        onSubmit: async (values) => {
            setIsSubmitting(true)
            try {
                const response = await ApiService.fetchData({url: `/api/ordenes-compra/${id_orden}/items-en-orden-compra/${item.id}/`, method: 'patch', headers: {'Content-Type': 'application/json'},data: JSON.stringify(values)})
                if (response.data) {
                    dispatch(ordenCompraApi.util.invalidateTags([{ type: 'OrdenCompraItems', id: id_orden }]))
                    setIsOpen(false)
                }
            } catch (error: unknown) {
                const errorMessage = getErrorMessage(error) || "Error al guardar el item"
                toast.error(typeof errorMessage === 'string' ? errorMessage : "Error al guardar el item", {
                    autoClose: 1000,
                    toastId: "error-editar-item-oc"
                })
            } finally {
                setIsSubmitting(false)
            }
        }
    })

    return (
        <>
            <Tooltip text="Editar la Cantidad y Precio">
                <Button variant="solid" onClick={() => {setIsOpen(true)}} icon="HeroPencil"></Button>
            </Tooltip>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen} isStaticBackdrop={true}>
                <ModalHeader>
                    <Badge className="text-xl">Editar {item.item_empresa.nombre}</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className="flex flex-col">
                        <div className="w-full">
                            <Badge>Cantidad</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.cantidad}
                                invalidFeedback={formik.errors.cantidad}
                            >
                                <Input
                                    name="cantidad"
                                    type="number"
                                    value={formik.values.cantidad}
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                />
                            </Validation>
                        </div>
                        <div className="w-full">
                            <Badge>Precio</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.precio}
                                invalidFeedback={formik.errors.precio}
                            >
                                <Input
                                    name="precio"
                                    type="number"
                                    value={formik.values.precio}
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
                        <Button color="red" onClick={() => {setIsOpen(false); formik.resetForm()}}>Cancelar</Button>
                        <Button variant="solid" isDisable={isSubmitting} onClick={() => {formik.handleSubmit()}}>
                            {isSubmitting ? "Guardando..." : "Guardar"}
                        </Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    )
}

export default EditarItemEnOrdenCompra
