import Checkbox from "@/components/form/Checkbox"
import Input from "@/components/form/Input"
import Label from "@/components/form/Label"
import Validation from "@/components/form/Validation"
import Badge from "@/components/ui/Badge"
import Button from "@/components/ui/Button"
import Modal, { ModalBody, ModalFooter, ModalFooterChild, ModalHeader } from "@/components/ui/Modal"
import Tooltip from "@/components/ui/Tooltip"
import ApiService from "@/services/ApiService"
import { useAppDispatch, useAppSelector } from "@/store"
import { ordenCompraApi } from "@/store/slices/bodega/ordenCompraApi"
import { detalleProveedorEmpresaThunk } from "@/store/slices/item/itemSlice"
import { useFormik } from "formik"
import { useState } from "react"
import { toast } from "react-toastify"
import * as Yup from 'yup'


function ModalEnviarProveedor({id_empresa, id_proveedor, id_orden, onSuccess} : {id_empresa: string | number | null | undefined, id_proveedor: string | number | undefined | null, id_orden: string | number | undefined, onSuccess?: () => void}) {
    const dispatch = useAppDispatch()
    const [isOpen, setIsOpen] = useState<boolean>(false)
    const [isUsingEmail, setIsUsingEmail] = useState<boolean>(false)
    const { detalleProveedorEmpresa } = useAppSelector((state) => state.item)
    const { personalizacionUsuario } = useAppSelector((state) => state.auth)
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
    const [isTakingLong, setIsTakingLong] = useState<boolean>(false)

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            correo: ""
        },
        validationSchema: Yup.object().shape({
            correo: Yup.string().email("Correo Invalido").required("Requerido")
        }),
        onSubmit: async (values) => {
            setIsSubmitting(true)
            setIsTakingLong(false)
            
            const timer = setTimeout(() => {
                setIsTakingLong(true)
            }, 5000)

            try {
                const response = await ApiService.fetchData({
                    url: `/api/ordenes-compra/${id_orden}/pasar_enviado_proveedor/`, 
                    method: 'post', 
                    headers: {'Content-Type' : 'application/json'}, 
                    data: JSON.stringify({email: values.correo, reenviar: false}),
                    timeout: 90000 // Aumentar timeout a 90s para generación de PDF
                })
                if (response.data) {
                    toast.success("Correo Enviado a Proveedor", {autoClose: 1000})
                    dispatch(ordenCompraApi.util.invalidateTags(['OrdenCompraList', 'MisOrdenesCompraList', { type: 'OrdenCompra', id: id_orden }]))
                    if (onSuccess) onSuccess()
                    setIsOpen(false)
                }
            } catch (error: any) {
                console.error("Error al enviar orden a proveedor", error?.response?.data || error)
                if (error?.code === "ECONNABORTED") {
                    toast.info("El proceso de envío ha sido delegado al servidor. Recibirá una notificación al finalizar.", { autoClose: 3000 })
                    setIsOpen(false)
                } else {
                    const errorMessage = error.response?.data?.detail || error.response?.data || error.message || "Error al enviar al proveedor"
                    toast.error(typeof errorMessage === 'string' ? errorMessage : "Error al enviar al proveedor", {
                        toastId: "error-enviar-proveedor"
                    })
                }
            } finally {
                clearTimeout(timer)
                setIsSubmitting(false)
                setIsTakingLong(false)
            }
        }
    })

    return (
        <>
            <Tooltip text="Enviar al Proveedor">
                <Button variant="solid" onClick={() => {dispatch(detalleProveedorEmpresaThunk({id_empresa, id_proveedor})); setIsOpen(true)}} icon="DuoMail"></Button>
            </Tooltip>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
                <ModalHeader>
                    <Badge className="text-xl">Enviar al Proveedor</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className="flex">
                        <div className="w-full">
                            {detalleProveedorEmpresa && (
                                detalleProveedorEmpresa.email_ejecutivo ? (
                                    <>
                                        <div className="w-full">
                                            <Checkbox
                                                variant="switch"
                                                checked={isUsingEmail}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        formik.setFieldValue("correo", detalleProveedorEmpresa.email_ejecutivo)
                                                    } else {
                                                        formik.resetForm()
                                                    }
                                                    setIsUsingEmail(e.target.checked)
                                                }}
                                                label="Usar Correo del Ejecutivo del Proveedor"
                                            />
                                        </div>
                                        <div className="w-full">
                                            <Label htmlFor={''}>Correo</Label>
                                            <Validation
                                                isValid={formik.isValid}
                                                isTouched={formik.touched.correo}
                                                invalidFeedback={formik.errors.correo}
                                            >
                                                <Input 
                                                    name="correo"
                                                    type="email"
                                                    onBlur={formik.handleBlur}
                                                    onChange={formik.handleChange}
                                                    value={formik.values.correo}
                                                    disabled={isUsingEmail}
                                                />
                                            </Validation>
                                        </div>
                                    </>
                                ) : (
                                    <div className="w-full">
                                        <Label htmlFor={''}>Correo</Label>
                                        <Validation
                                            isValid={formik.isValid}
                                            isTouched={formik.touched.correo}
                                            invalidFeedback={formik.errors.correo}
                                        >
                                            <Input 
                                                name="correo"
                                                type="email"
                                                onBlur={formik.handleBlur}
                                                onChange={formik.handleChange}
                                                value={formik.values.correo}
                                                disabled={isUsingEmail}
                                            />
                                        </Validation>
                                    </div>
                                )
                            )}
                        </div>
                    </div>
                    {isTakingLong && (
                        <div className="mt-4 p-4 rounded-xl border border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-700 text-blue-800 dark:text-blue-200 text-sm animate-pulse shadow-sm">
                            <div className="font-semibold mb-1">Nota informativa:</div>
                            El proceso de envío está tomando más tiempo de lo habitual debido a la generación del PDF. Si lo prefiere, puede cerrar esta ventana; la operación continuará en segundo plano.
                        </div>
                    )}
                </ModalBody>
                <ModalFooter>
                    <ModalFooterChild>
                        <Button variant="solid" color="amber" isDisable={isSubmitting} onClick={async () => {
                            setIsSubmitting(true)
                            try {
                                const response = await ApiService.fetchData({url: `/api/ordenes-compra/${id_orden}/`, method: 'patch', headers: {'Content-Type': 'application/json'}, data: JSON.stringify({estado: "3"})})
                                if (response.data) {
                                    toast.success("Orden de compra cambiada de estado", {autoClose: 1000})
                                    dispatch(ordenCompraApi.util.invalidateTags(['OrdenCompraList', 'MisOrdenesCompraList', { type: 'OrdenCompra', id: id_orden }]))
                                    if (onSuccess) onSuccess()
                                    setIsOpen(false)
                                }
                            } catch (error: any) {
                                const errorData = error.response?.data
                                const mensajesError = errorData ? (typeof errorData === 'object' ? Object.values(errorData).flat().join(" ") : errorData) : error.message || "Error al pasar de estado la OC"
                                toast.error(mensajesError, {toastId: "error-cambiar-estado-oc"})
                            } finally {
                                setIsSubmitting(false)
                            }
                        }}>{isSubmitting ? "Procesando..." : "No Enviar al Proveedor"}</Button>
                    </ModalFooterChild>
                    <ModalFooterChild>
                        <Button color="red" onClick={() => {setIsOpen(false); formik.resetForm(); setIsTakingLong(false)}}>Cancelar</Button>
                        <Button variant="solid" isDisable={isSubmitting} onClick={() => {formik.handleSubmit()}}>
                            {isSubmitting ? "Enviando..." : "Enviar Correo"}
                        </Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    )
}

export default ModalEnviarProveedor
