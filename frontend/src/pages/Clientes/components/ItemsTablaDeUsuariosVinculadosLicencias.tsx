import Input from "@/components/form/Input"
import SelectReact, { TSelectOption } from "@/components/form/SelectReact"
import Validation from "@/components/form/Validation"
import Badge from "@/components/ui/Badge"
import Button from "@/components/ui/Button"
import { IUsuarioVinculadoLicencia } from "@/interface/contrato.interface"
import ModalEliminar from "@/pages/Items/Proveedor/modals/ModalEliminar"
import ApiService from "@/services/ApiService"
import { listaUsuariosDisponiblesLicenciaThunk, listaUsuariosVinculadosLicenciaThunk, useAppDispatch, useAppSelector } from "@/store"
import dayjs from "dayjs"
import "dayjs/locale/es"
import { useFormik } from "formik"
import { useEffect, useState } from "react"
import { toast } from "react-toastify"
import * as Yup from 'yup'


function ItemsTablaDeUsuariosVinculadosLicencias({user}: {user: IUsuarioVinculadoLicencia}) {
    const dispatch = useAppDispatch()
    const { detalleCliente } = useAppSelector((state) => state.empresa)
    const { detalleContratoLicencia, listaUsuariosDisponiblesLicencia } = useAppSelector((state) => state.contrato)
    const [editando, setEditando] = useState<boolean>(false)
    const [isUser, setIsUser] = useState<boolean>(true)

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            nombre: "",
            correo_generico: "",
            usuario: ""
        },
        validationSchema: Yup.object().shape({
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
                let data = {}
                if (isUser) {
                    Object.assign(data, {usuario: values.usuario})
                } else {
                    Object.assign(data, {nombre: values.nombre, correo_generico: values.correo_generico})
                }
                const response = await ApiService.fetchData({url: `/api/contrato-licencias/${detalleContratoLicencia?.id}/usuarios-vinculados/${user.id}/`, method: 'patch', headers: {'Content-Type': 'application/json'}, data: JSON.stringify(data)})
                if (response.data) {
                    toast.success("Usuario cambiado", {autoClose: 1000})
                    setIsUser(true)
                    setEditando(false)
                    dispatch(listaUsuariosVinculadosLicenciaThunk({id_licencia: detalleContratoLicencia?.id}))
                    formik.resetForm()
                }
            } catch (error: any) {
                const mensajesError = Object.values(error.response.data).flat().join(" ");
                toast.error(mensajesError || "Error al editar el usuario", {toastId: "Error al editar el usuario"})
            }
        }
    })

    useEffect(() => {
        if (detalleCliente && editando) {
            dispatch(listaUsuariosDisponiblesLicenciaThunk({id_empresa: detalleCliente.cliente, id_licencia: user.licencia}))
        }
    }, [detalleCliente, editando])

    return (
        <>
            <div className="grid grid-cols-3 border border-blue-500 rounded-xl">
                <div className="flex flex-col gap-2 p-4 border-r border-r-blue-500">
                    {editando ? (
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
                    ) : (
                        user.datos_usuario ? (
                            <>
                                <div className="font-bold">{user.datos_usuario.nombre}</div>
                                <div className="text-sm">Correo: {user.datos_usuario.correo}</div>
                            </>
                        ) : (
                            <>
                                <div className="font-bold">{user.nombre}</div>
                                <div className="text-sm">Correo: {user.correo_generico}</div>
                            </>
                        )
                    )}
                </div>
                <div className="p-4 border-r border-r-blue-500">
                    {dayjs(user.fecha_asignacion).locale("es").format("DD/MM/YYYY")}
                </div>
                <div className="p-4 flex flex-wrap gap-2">
                    {detalleContratoLicencia && (detalleContratoLicencia.se_puede_reducir || !detalleContratoLicencia.partner) && (
                        <>
                            {editando ? (
                                <>
                                    <div>
                                        <Button variant="solid" color="red" icon="HeroXMark" onClick={() => {setEditando(false)}}></Button>
                                    </div>
                                    <div>
                                        <Button variant="solid" color="emerald" icon="HeroCheck" onClick={() => {formik.handleSubmit()}}></Button>
                                    </div>
                                </>
                            ) : (
                                <div>
                                    <Button variant="solid" icon="HeroPencil" onClick={() => {setEditando(true)}}></Button>
                                </div>
                            )}
                            <div>
                                <ModalEliminar
                                    mensaje="¿Esta seguro(a) de querer eliminar la licencia de este usuario?"
                                    peticionUrl={`/api/contrato-licencias/${user.licencia}/usuarios-vinculados/${user.id}/`}
                                    nombre="Vinculo de usuario y licencia"
                                    onDispatch={() => {
                                        dispatch(listaUsuariosVinculadosLicenciaThunk({id_licencia: detalleContratoLicencia?.id}))
                                    }}
                                />
                            </div>
                        </>
                    )}
                </div>
            </div>
        </>
    )
}

export default ItemsTablaDeUsuariosVinculadosLicencias