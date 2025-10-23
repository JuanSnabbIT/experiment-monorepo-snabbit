import Checkbox from "@/components/form/Checkbox"
import FieldWrap from "@/components/form/FieldWrap"
import Input from "@/components/form/Input"
import SelectReact, { TSelectOption } from "@/components/form/SelectReact"
import Validation from "@/components/form/Validation"
import Badge from "@/components/ui/Badge"
import Button from "@/components/ui/Button"
import Modal, { ModalBody, ModalFooter, ModalFooterChild, ModalHeader } from "@/components/ui/Modal"
import Tooltip from "@/components/ui/Tooltip"
import { ICotizacion } from "@/interface/cotizaciones.interface"
import ApiService from "@/services/ApiService"
import { detalleCotizacionThunk, listaUsuariosEmpresaYClienteThunk, useAppDispatch, useAppSelector } from "@/store"
import { FormikErrors, useFormik } from "formik"
import { useEffect, useState } from "react"
import { MultiValue } from "react-select"
import { toast } from "react-toastify"
import * as Yup from 'yup'


interface InputItem {
    value: string;
}

function EnviarCotizacion({cotizacion} : {cotizacion: ICotizacion}) {
    const dispatch = useAppDispatch()
    const { listaUsuariosEmpresaYCliente } = useAppSelector((state) => state.empresa)
    const [isOpen, setIsOpen] = useState<boolean>(false)
    const [listaUsuarios, setListaUsuarios] = useState<{value: string, label: string}[]>([])
    const [isUser, setIsUser] = useState<boolean>(true)

    useEffect(() => {
        if (!isOpen) {
            formik.resetForm()
        } else {
            dispatch(listaUsuariosEmpresaYClienteThunk({ids_empresa: [cotizacion.cliente, cotizacion.empresa]}))
        }
    }, [isOpen])

    useEffect(() => {
        if (listaUsuariosEmpresaYCliente.length > 0) {
            setListaUsuarios(listaUsuariosEmpresaYCliente.map((user) => {return {value: user.id.toString(), label: user.nombre_usuario}}))
        }
    }, [listaUsuariosEmpresaYCliente])

    const validationSchema = Yup.object().shape({
        usuarios_empresa: Yup.array().notRequired().nullable().of(
            Yup.object({
                value: Yup.string(),
            })
        ),
        copias: Yup.array().notRequired().nullable().of(
            Yup.object({
                value: isUser 
                    ? Yup.string().notRequired().nullable()
                    : Yup.string().email("No es un correo valido").required("Requerido").nonNullable("Requerido") 
            })
        ),
    })

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            usuarios_empresa: [{value: ""}],
            copias: [{ value: "" }],
        },
        validationSchema,
        onSubmit: async (values) => {
            try {
                let data = {}
                if (isUser) {
                    data = {usuarios_empresa: values.usuarios_empresa.map((user) => user.value)}
                } else {
                    data = {copias: values.copias.map((cop) => cop.value)}
                }
                const response = await ApiService.fetchData({url: `/api/cotizaciones/${cotizacion.id}/enviar-cotizacion/`, method: 'post', headers: {'Content-Type': 'application/json'}, data: JSON.stringify(data)})
                if (response.data) {
                    toast.success("Cotización enviada", {autoClose: 1000})
                    setIsOpen(false)
                    dispatch(detalleCotizacionThunk({id_cotizacion: cotizacion.id}))
                }
            } catch (error: any) {
                toast.error(error.response.data || "Error al enviar cotización")
            }
        }
    })

    return (
        <>
            <Tooltip text="Enviar Cotización">
                <Button variant="solid" color="emerald" icon="HeroEnvelopeOpen" onClick={() => {setIsOpen(true)}}></Button>
            </Tooltip>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen} isStaticBackdrop={true}>
                <ModalHeader>
                    <Badge className="text-xl">Enviar Cotización</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className="flex flex-col gap-4">
                        <div>
                            <Badge className="text-xl">Usuarios del Sistema</Badge>
                            <Checkbox
                                name="isUser"
                                className="ml-4"
                                onChange={(e) => {setIsUser(e.target.checked)}}
                                checked={isUser}
                                label={isUser ? "Si" : "No"}
                            />
                        </div>
                        {isUser ? (
                            <div>
                                <Badge>Usuarios</Badge>
                                <Validation
                                    isValid={formik.isValid}
                                    isTouched={Array.isArray(formik.touched.usuarios_empresa) && formik.touched.usuarios_empresa.length > 0}
                                    invalidFeedback={
                                        Array.isArray(formik.errors.usuarios_empresa)
                                            ? formik.errors.usuarios_empresa.map(err => (typeof err === 'string' ? err : '')).join('. ')
                                            : typeof formik.errors.usuarios_empresa === 'string'
                                            ? formik.errors.usuarios_empresa
                                            : undefined
                                    }
                                >
                                    <SelectReact
                                        name="usuarios_empresa"
                                        isMulti={true}
                                        options={listaUsuarios}
                                        placeholder="Seleccione usuarios"
                                        noOptionsMessage={(e) => `No existe ${e.inputValue}`}
                                        onBlur={formik.handleBlur}
                                        onChange={(e) => {formik.setFieldValue("usuarios_empresa", (e as MultiValue<TSelectOption>).map((value => {return {value: value.value}})))}}
                                    />
                                </Validation>
                            </div>
                        ) : (
                            <div>
                                <Badge>Copias</Badge>
                                {formik.values.copias.map((input, index) => (
                                    <Validation
                                        isValid={formik.isValid}
                                        isTouched={formik.touched.copias && formik.touched.copias[index] && formik.touched.copias[index].value}
                                        invalidFeedback={
                                            formik.errors.copias && 
                                            Array.isArray(formik.errors.copias) && 
                                            formik.errors.copias[index] && 
                                            typeof formik.errors.copias[index] === "object" && 
                                            // @ts-ignore
                                            "value" in formik.errors.copias[index] ? 
                                            (formik.errors.copias[index] as FormikErrors<InputItem>).value : ""}
                                        key={index}
                                    >
                                        <FieldWrap lastSuffix={
                                            <Button color="red" variant="solid" size="sm" icon="HeroTrash" onClick={() => {
                                                const updatedInputs = formik.values.copias.filter((_, i) => i !== index); formik.setFieldValue("copias", updatedInputs)
                                            }}></Button>
                                        }>
                                            <Input
                                                type="text"
                                                name={`copias[${index}].value`}
                                                value={input.value}
                                                onChange={formik.handleChange}
                                                onBlur={formik.handleBlur}
                                                placeholder={`Copias ${index + 1}`}
                                            />
                                        </FieldWrap>
                                    </Validation>
                                ))}
                                <Button className="mt-2" variant="solid" onClick={() => {formik.setFieldValue("copias", [...formik.values.copias, { value: "" }])}}>Añadir usuarios para el envio</Button>
                            </div>
                        )}
                    </div>
                </ModalBody>
                <ModalFooter>
                    <ModalFooterChild></ModalFooterChild>
                    <ModalFooterChild>
                        <Button color="red" isDisable={formik.isSubmitting} onClick={() => {setIsOpen(false)}}>Cancelar</Button>
                        <Button variant="solid" isDisable={formik.isSubmitting} onClick={() => {formik.handleSubmit()}}>Enviar</Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    )
}

export default EnviarCotizacion