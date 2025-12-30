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
import { listaOrdenesCompraThunk } from "@/store/slices/bodega/bodegaSlice"
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

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            correo: ""
        },
        validationSchema: Yup.object().shape({
            correo: Yup.string().email("Correo Invalido").required("Requerido")
        }),
        onSubmit: async (values) => {
            try {
                const response = await ApiService.fetchData({url: `/api/ordenes-compra/${id_orden}/pasar_enviado_proveedor/`, method: 'post', headers: {'Content-Type' : 'application/json'}, data: JSON.stringify({email: values.correo, reenviar: false})})
                if (response.data) {
                    toast.success("Correo Enviado a Proveedor", {autoClose: 1000})
                    dispatch(listaOrdenesCompraThunk({id_empresa: personalizacionUsuario?.empresa}))
                    if (onSuccess) onSuccess()
                    setIsOpen(false)
                }
            } catch (error: any) {
                toast.error(error.response.data)
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
                </ModalBody>
                <ModalFooter>
                    <ModalFooterChild>
                        <Button variant="solid" color="amber" onClick={async () => {
                            try {
                                const response = await ApiService.fetchData({url: `/api/ordenes-compra/${id_orden}/`, method: 'patch', headers: {'Content-Type': 'application/json'}, data: JSON.stringify({estado: "3"})})
                                if (response.data) {
                                    toast.success("Orden de compra cambiada de estado", {autoClose: 1000})
                                    dispatch(listaOrdenesCompraThunk({id_empresa}))
                                    if (onSuccess) onSuccess()
                                    setIsOpen(false)
                                }
                            } catch (error: any) {
                                const mensajesError = Object.values(error.response.data).flat().join(" ");
                                toast.error(mensajesError || "Error al pasar de estado la OC", {toastId: "Error al pasar de estado la OC"})
                            }
                        }}>No Enviar al Proveedor</Button>
                    </ModalFooterChild>
                    <ModalFooterChild>
                        <Button color="red" onClick={() => {setIsOpen(false); formik.resetForm()}}>Cancelar</Button>
                        <Button variant="solid" onClick={() => {formik.handleSubmit()}}>Enviar Correo</Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    )
}

export default ModalEnviarProveedor
