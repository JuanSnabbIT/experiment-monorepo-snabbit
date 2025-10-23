import Checkbox from "@/components/form/Checkbox"
import Input from "@/components/form/Input"
import SelectReact, { TSelectOption } from "@/components/form/SelectReact"
import Validation from "@/components/form/Validation"
import Badge from "@/components/ui/Badge"
import ApiService from "@/services/ApiService"
import { listaSolicitantesCotizacionThunk, listaUsuariosParaSolicitanteThunk, useAppDispatch, useAppSelector } from "@/store"
import { useFormik } from "formik"
import { Dispatch, SetStateAction, useEffect, useState } from "react"
import { toast } from "react-toastify"
import * as Yup from 'yup'


function AgregarSolicitanteCotizacion({isEditing, setIsEditing, creandoSolicitante, setCreandoSolicitante} : {setIsEditing: Dispatch<SetStateAction<boolean>>, isEditing: boolean, setCreandoSolicitante: Dispatch<SetStateAction<boolean>>, creandoSolicitante: boolean}) {
    const dispatch = useAppDispatch()
    const { detalleCotizacion, listaUsuariosParaSolicitante } = useAppSelector((state) => state.cotizacion)
    const { listaContentType } = useAppSelector((state) => state.core)
    const [isUser, setIsUser] = useState<boolean>(false)

    useEffect(() => {
        if (isEditing) {
            dispatch(listaUsuariosParaSolicitanteThunk({id_cotizacion: detalleCotizacion?.id}))
        } else {
            formik.resetForm()
        }
    }, [isEditing])

    const validationSchema = Yup.object({
        usuario: isUser
            ? Yup.string().required("El usuario es requerido")
            : Yup.string().notRequired(),
        nombre: !isUser
            ? Yup.string().required("El nombre es requerido")
            : Yup.string().notRequired(),
        email: !isUser
            ? Yup.string().email("Email inválido").required("El email es requerido")
            : Yup.string().notRequired(),
    });

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            nombre: "",
            email: "",
            usuario: "",
        },
        validationSchema,
        onSubmit: async (values) => {
            try {
                let data: {} = {cotizacion: detalleCotizacion?.id}
                if (isUser) {
                    data = {...data, usuario_id: values.usuario, content_type: listaContentType.find(ct => ct.model === "usuarioempresa")?.id}
                    const response = await ApiService.fetchData({url: `/api/solicitantes-cotizacion/`, method: 'post', headers: {'Content-Type': 'application/json'}, data: JSON.stringify(data)})
                    if (response.data) {
                        toast.success("Solicitante Creado", {autoClose: 1000})
                        setIsEditing(false)
                        dispatch(listaSolicitantesCotizacionThunk({id_cotizacion: detalleCotizacion?.id}));
                    }
                } else {
                    const responseExterno = await ApiService.fetchData<{email: string, nombre: string, id: number}, string>({url: `/api/solicitantes-externos/`, method: 'post', headers: {'Content-Type': 'application/json'}, data: JSON.stringify({nombre: values.nombre, email: values.email})})
                    if (responseExterno.data) {
                        data = {...data, nombre: values.nombre, email: values.email, content_type: listaContentType.find(ct => ct.model === "solicitanteexterno")?.id, usuario_id: responseExterno.data.id}
                        const response = await ApiService.fetchData({url: `/api/solicitantes-cotizacion/`, method: 'post', headers: {'Content-Type': 'application/json'}, data: JSON.stringify(data)})
                        if (response.data) {
                            toast.success("Solicitante Creado", {autoClose: 1000})
                            setIsEditing(false)
                            dispatch(listaSolicitantesCotizacionThunk({id_cotizacion: detalleCotizacion?.id}));
                        }
                    }
                }
            } catch (error: any) {
                toast.error(error.response.data || "Error al crear solicitante de cotizacion", {toastId: "Error al crear solicitante de cotizacion"})
            }
            setCreandoSolicitante(false)
        },
    })

    useEffect(() => {
        if (creandoSolicitante) {
            formik.handleSubmit()
        }
    }, [creandoSolicitante])

    return (
        <>
            {isEditing && (
                <div className="flex flex-row gap-4 border border-blue-500 p-4 rounded-xl">
                    <div className="w-full flex items-center">
                        <Checkbox
                            name="is_user"
                            checked={isUser}
                            onChange={(e) => {setIsUser(e.target.checked)}}
                            label="¿Es Usuario?"
                        />
                    </div>
                    {isUser ? (
                        <div className="w-full">
                            <Badge>Usuario</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.usuario}
                                invalidFeedback={formik.errors.usuario}
                            >
                                <SelectReact
                                    name="usuario"
                                    noOptionsMessage={(e) => (`No Existe ${e.inputValue}`)}
                                    placeholder="Seleccione un Usuario"
                                    options={listaUsuariosParaSolicitante.map(soli => ({value: soli.id.toString(), label: soli.nombre_usuario}))}
                                    onChange={(e) => {formik.setFieldValue("usuario", (e as TSelectOption).value)}}
                                    onBlur={formik.handleBlur}
                                    value={{value: formik.values.usuario, label: listaUsuariosParaSolicitante.find(soli => soli.id.toString() === formik.values.usuario)?.nombre_usuario || ""}}
                                />
                            </Validation>
                        </div>
                    ) : (
                        <>
                            <div className="w-full">
                                <Badge>Nombre</Badge>
                                <Validation
                                    isValid={formik.isValid}
                                    isTouched={formik.touched.nombre}
                                    invalidFeedback={formik.errors.nombre}
                                >
                                    <Input
                                        name="nombre"
                                        onChange={formik.handleChange}
                                        onBlur={formik.handleBlur}
                                        value={formik.values.nombre}
                                    />
                                </Validation>
                            </div>
                            <div className="w-full">
                                <Badge>Email</Badge>
                                <Validation
                                    isValid={formik.isValid}
                                    isTouched={formik.touched.email}
                                    invalidFeedback={formik.errors.email}
                                >
                                    <Input
                                        type="email"
                                        name="email"
                                        onChange={formik.handleChange}
                                        onBlur={formik.handleBlur}
                                        value={formik.values.email}
                                    />
                                </Validation>
                            </div>
                        </>
                    )}
                </div>
            )}
        </>
    )
}

export default AgregarSolicitanteCotizacion