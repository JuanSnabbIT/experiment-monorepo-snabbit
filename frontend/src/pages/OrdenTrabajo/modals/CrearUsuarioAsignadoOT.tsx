import Input from "@/components/form/Input"
import SelectReact, { TSelectOption } from "@/components/form/SelectReact"
import Validation from "@/components/form/Validation"
import Badge from "@/components/ui/Badge"
import Button from "@/components/ui/Button"
import Modal, { ModalBody, ModalFooter, ModalFooterChild, ModalHeader } from "@/components/ui/Modal"
import Tooltip from "@/components/ui/Tooltip"
import ApiService from "@/services/ApiService"
import { listaUsuariosTodoElClienteThunk, listaUsuariosVinculadosOTThunk, useAppDispatch, useAppSelector } from "@/store"
import { useFormik } from "formik"
import { useEffect, useState } from "react"
import { toast } from "react-toastify"
import * as Yup from 'yup'


function CrearUsuarioAsignadoOT() {
    const dispatch = useAppDispatch()
    const { detalleOrdenTrabajo } = useAppSelector((state) => state.ordenTrabajo)
    const { listaUsuariosTodoElCliente } = useAppSelector((state) => state.empresa)
    const [isOpen, setIsOpen] = useState<boolean>(false)
    const [isUser, setIsUser] = useState<boolean>(false)

    useEffect(() => {
        if (detalleOrdenTrabajo && isOpen) {
            dispatch(listaUsuariosTodoElClienteThunk({id_empresa: detalleOrdenTrabajo.cliente}))
        }
    }, [detalleOrdenTrabajo, isOpen])

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            usuario: "",
            nombre: "",
            correo: "",
        },
        validationSchema: Yup.object().shape({
            usuario: isUser ? 
                Yup.string().required("Requerido").nonNullable("Requerido") :
                Yup.string().notRequired().nullable(),
            nombre: isUser ?
                Yup.string().notRequired().nullable() :
                Yup.string().required("Requerido").nonNullable("Requerido").max(250, "Maximo 250 caracteres"),
            correo: isUser ?
                Yup.string().notRequired().nullable() :
                Yup.string().required("Requerido").nonNullable("Requerido").email("Correo no valido"),
        }),
        onSubmit: async (values) => {
            try {
                let data = {orden: detalleOrdenTrabajo?.id}
                if (isUser) {
                    Object.assign(data, {usuario_empresa: values.usuario})
                } else {
                    Object.assign(data, {usuario_externo: values.nombre, correo_usuario_externo: values.correo})
                }
                const response = await ApiService.fetchData({url: `/api/ordenes-trabajo/${detalleOrdenTrabajo?.id}/usuarios-vinculados/`, method: 'post', headers: {'Content-Type': 'application/json'}, data: JSON.stringify(data)})
                if (response.data) {
                    toast.success("Usuario vinculado", {autoClose: 1000})
                    dispatch(listaUsuariosVinculadosOTThunk({id_orden: detalleOrdenTrabajo?.id}))
                    setIsOpen(false)
                }
            } catch (error: any) {
                const mensajesError = Object.values(error.response.data).flat().join(" ");
                toast.error(mensajesError || "Error al agregar el usuario", {toastId: "Error al agregar el usuario"})
            }
        }
    })

    useEffect(() => {
        if (!isOpen) {
            formik.resetForm()
            setIsUser(false)
        }
    }, [isOpen])

    return (
        <>
            {detalleOrdenTrabajo && (detalleOrdenTrabajo.estado === "pendiente" || detalleOrdenTrabajo.estado === "en_proceso") && (
                <Tooltip text="Agregar Usuario">
                    <Button variant="solid" icon="HeroPlus" onClick={() => {setIsOpen(true)}}></Button>
                </Tooltip>
            )}
            <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
                <ModalHeader>
                    <Badge className="text-xl">Agregar Usuario</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className="flex flex-col gap-4">
                        <div>
                            <Badge>Usuario / Nombre</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={isUser ? formik.touched.usuario : formik.touched.nombre}
                                invalidFeedback={isUser ? formik.errors.usuario : formik.errors.nombre}
                            >
                                <SelectReact
                                    placeholder="Seleccione un usuario o Ingrese un nombre"
                                    isClearable
                                    isCreatable
                                    name={isUser ? "usuario" : "nombre"}
                                    options={listaUsuariosTodoElCliente.map(user => ({value: user.id.toString(), label: user.nombre_usuario}))}
                                    onBlur={formik.handleBlur}
                                    formatCreateLabel={(e) => (`Crear ${e}`)}
                                    noOptionsMessage={(e) => (`No Existe ${e.inputValue}`)}
                                    onChange={(e) => {
                                        if (e) {
                                            setIsUser(true)
                                            formik.setFieldValue("usuario", (e as TSelectOption).value)
                                            formik.setFieldValue("nombre", "")
                                            formik.setFieldValue("correo", "")
                                        } else {
                                            setIsUser(false)
                                            formik.setFieldValue("usuario", "")
                                            formik.setFieldValue("nombre", "")
                                            formik.setFieldValue("correo", "")
                                        }
                                    }}
                                    onCreateOption={(e) => {
                                        if (e) {
                                            setIsUser(false)
                                            formik.setFieldValue("nombre", e)
                                            formik.setFieldValue("usuario", "")
                                        } else {
                                            setIsUser(true)
                                            formik.setFieldValue("nombre", "")
                                            formik.setFieldValue("correo", "")
                                            formik.setFieldValue("usuario", "")
                                        }
                                    }}
                                    value={isUser ? {value: formik.values.usuario, label: listaUsuariosTodoElCliente.find(user => user.id.toString() === formik.values.usuario)?.nombre_usuario || ""} : {value: formik.values.nombre, label: formik.values.nombre}}
                                />
                            </Validation>
                        </div>
                        {(!isUser) && (formik.values.nombre.length > 0) && (
                            <div>
                                <Badge>Correo</Badge>
                                <Validation
                                    isValid={formik.isValid}
                                    isTouched={formik.touched.correo}
                                    invalidFeedback={formik.errors.correo}
                                >
                                    <Input
                                        name="correo"
                                        onChange={formik.handleChange}
                                        onBlur={formik.handleBlur}
                                        value={formik.values.correo}
                                    />
                                </Validation>
                            </div>
                        )}
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

export default CrearUsuarioAsignadoOT