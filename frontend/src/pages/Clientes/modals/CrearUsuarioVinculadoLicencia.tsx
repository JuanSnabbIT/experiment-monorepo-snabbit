import Input from "@/components/form/Input"
import SelectReact, { TSelectOption } from "@/components/form/SelectReact"
import Validation from "@/components/form/Validation"
import Badge from "@/components/ui/Badge"
import Button from "@/components/ui/Button"
import Modal, { ModalBody, ModalFooter, ModalFooterChild, ModalHeader } from "@/components/ui/Modal"
import Tooltip from "@/components/ui/Tooltip"
import ApiService from "@/services/ApiService"
import { detalleContratoLicenciaThunk, LIMPIAR_USUARIOS_VINCULADOS_LICENCIA, listaContratoLicenciaDeEmpresaYClienteThunk, listaUsuariosDisponiblesLicenciaThunk, listaUsuariosVinculadosLicenciaThunk, useAppDispatch, useAppSelector } from "@/store"
import { useFormik } from "formik"
import { Dispatch, SetStateAction, useEffect, useState } from "react"
import { toast } from "react-toastify"
import * as Yup from 'yup'


function CrearUsuarioVinculadoLicencia() {
    const dispatch = useAppDispatch()
    const { detalleCliente } = useAppSelector((state) => state.empresa)
    const { listaUsuariosDisponiblesLicencia, listaContratoLicenciaDeEmpresaYCliente, detalleContratoLicencia } = useAppSelector((state) => state.contrato)
    const [isOpen, setIsOpen] = useState<boolean>(false)
    const [isUser, setIsUser] = useState<boolean>(false)

    useEffect(() => {
        if (detalleCliente && isOpen) {
            dispatch(listaContratoLicenciaDeEmpresaYClienteThunk({id_cliente: detalleCliente.cliente, id_empresa: detalleCliente.prestador_servicios}))
        }
    }, [detalleCliente, isOpen])

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            nombre: "",
            correo_generico: "",
            usuario: "",
            licencia: "",
        },
        validationSchema: Yup.object().shape({
            licencia: Yup.string().required("Requerido").nonNullable("Requerido"),
            // Si isUser es true, 'usuario' es requerido; si no, no lo es
            usuario: isUser
            ? Yup.string()
                .required("Requerido")
                .nonNullable("Requerido")
            : Yup.string()
                .notRequired()
                .nullable(),

            // Si isUser es false, 'nombre' es requerido; si no, no lo es
            nombre: !isUser
            ? Yup.string()
                .required("Requerido")
                .nonNullable("Requerido")
            : Yup.string()
                .notRequired()
                .nullable(),

            // Igual para correo_generico: requerido solo cuando isUser es false
            correo_generico: !isUser
            ? Yup.string()
                .required("Requerido")
                .email("Debe ser un correo válido").
                nonNullable("Requerido")
            : Yup.string()
                .notRequired()
                .nullable(),
        }),
        onSubmit: async (values) => {
            try {
                let data = {licencia: values.licencia}
                if (isUser) {
                    Object.assign(data, {usuario: values.usuario})
                } else {
                    Object.assign(data, {nombre: values.nombre, correo_generico: values.correo_generico})
                }
                const response = await ApiService.fetchData({url: `/api/contrato-licencias/${values.licencia}/usuarios-vinculados/`, method: 'post', headers: {'Content-Type': 'application/json'}, data: JSON.stringify(data)})
                if (response.data) {
                    toast.success("Vinculo creado", {autoClose: 1000})
                    dispatch(listaContratoLicenciaDeEmpresaYClienteThunk({id_cliente: detalleCliente?.cliente, id_empresa: detalleCliente?.prestador_servicios}))
                    dispatch(detalleContratoLicenciaThunk({id_licencia: detalleContratoLicencia?.id}))
                    dispatch(listaUsuariosVinculadosLicenciaThunk({id_licencia: detalleContratoLicencia?.id}))
                    setIsOpen(false)
                }
            } catch (error: any) {
                const mensajesError = Object.values(error.response.data).flat().join(" ");
                toast.error(mensajesError || "Error al vincular al usuario con la licencia", {toastId: "Error al vincular al usuario con la licencia"})
            }
        }
    })

    useEffect(() => {
        if (formik.values.licencia && detalleCliente) {
            dispatch(listaUsuariosDisponiblesLicenciaThunk({id_empresa: detalleCliente.cliente, id_licencia: formik.values.licencia}))
            dispatch(detalleContratoLicenciaThunk({id_licencia: formik.values.licencia}))
        }
    }, [formik.values.licencia, detalleCliente])

    useEffect(() => {
        if (!isOpen) {
            formik.resetForm()
        }
    }, [isOpen])

    return (
        <>
            <Tooltip text="Vincular Usuario">
                <Button variant="solid" icon="HeroPlus" onClick={() => {setIsOpen(true)}} />
            </Tooltip>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
                <ModalHeader>
                    <Badge className="text-xl">Vincular Usuario a una Licencia</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className="flex flex-col gap-4">
                        <div>
                            <Badge>Licencia</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.licencia}
                                invalidFeedback={formik.errors.licencia}
                            >
                                <SelectReact
                                    name="licencia"
                                    onBlur={formik.handleBlur}
                                    options={listaContratoLicenciaDeEmpresaYCliente.map((con) => ({value: con.id.toString(), label: `${con.nombre_contrato}: ${con.nombre_licencia}`}))}
                                    onChange={(e) => {formik.setFieldValue("licencia", (e as TSelectOption).value)}}
                                    value={formik.values.licencia ? {value: formik.values.licencia, label: `${listaContratoLicenciaDeEmpresaYCliente.find(lic => lic.id.toString() === formik.values.licencia)?.nombre_contrato}: ${listaContratoLicenciaDeEmpresaYCliente.find(lic => lic.id.toString() === formik.values.licencia)?.nombre_licencia}`} : {value: "", label: ""}}
                                />
                            </Validation>
                        </div>
                        {formik.values.licencia != "" && detalleContratoLicencia && (
                            <div>
                                <Badge>Cantidad / Disponibles</Badge>
                                <div className="ml-4">{detalleContratoLicencia.cantidad} / {detalleContratoLicencia.licencias_disponibles}</div>
                            </div>
                        )}
                        {formik.values.licencia != "" && (detalleContratoLicencia && detalleContratoLicencia.licencias_disponibles > 0) && (
                            <>
                                <div>
                                    <Badge>Usuario / Nombre</Badge>
                                    <Validation
                                        isValid={formik.isValid}
                                        isTouched={isUser ? formik.touched.usuario : formik.touched.nombre}
                                        invalidFeedback={isUser ? formik.errors.usuario : formik.errors.nombre}
                                    >
                                        <SelectReact
                                            name={isUser ? "usuario" : "nombre"}
                                            isClearable
                                            isCreatable
                                            onBlur={formik.handleBlur}
                                            formatCreateLabel={(e) => (`Nombre: ${e}`)}
                                            noOptionsMessage={(e) => (`No Existe ${e.inputValue}`)}
                                            options={listaUsuariosDisponiblesLicencia.map((user) => ({value: user.id.toString(), label: user.nombre_usuario}))}
                                            value={isUser ?
                                                {value: formik.values.usuario, label: listaUsuariosDisponiblesLicencia.find(user => user.id.toString() === formik.values.usuario)?.nombre_usuario || ""}
                                            :
                                                {value: formik.values.nombre, label: formik.values.nombre}
                                            }
                                            onCreateOption={(e) => {
                                                if (e) {
                                                    setIsUser(false)
                                                    formik.setFieldValue("nombre", e)
                                                    formik.setFieldValue("usuario", "")
                                                } else {
                                                    setIsUser(true)
                                                    formik.setFieldValue("nombre", "")
                                                    formik.setFieldValue("correo", "")
                                                }
                                            }}
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
                                        />
                                    </Validation>
                                </div>
                                {(!isUser) && (formik.values.nombre) && (
                                    <div>
                                        <Badge>Correo</Badge>
                                        <Validation
                                            isValid={formik.isValid}
                                            isTouched={formik.touched.correo_generico}
                                            invalidFeedback={formik.errors.correo_generico}
                                        >
                                            <Input
                                                name="correo_generico"
                                                onChange={formik.handleChange}
                                                onBlur={formik.handleBlur}
                                                value={formik.values.correo_generico}
                                            />
                                        </Validation>
                                    </div>
                                )}
                            </>
                        )}
                        {formik.values.licencia != "" && (detalleContratoLicencia && detalleContratoLicencia.licencias_disponibles === 0) && (
                            <div>No hay licencias disponibles</div>
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


export default CrearUsuarioVinculadoLicencia