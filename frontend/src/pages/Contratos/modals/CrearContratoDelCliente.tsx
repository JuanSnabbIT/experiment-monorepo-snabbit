import Input from "@/components/form/Input"
import SelectReact, { TSelectOption } from "@/components/form/SelectReact"
import Textarea from "@/components/form/Textarea"
import Validation from "@/components/form/Validation"
import Badge from "@/components/ui/Badge"
import Button from "@/components/ui/Button"
import Modal, { ModalBody, ModalFooter, ModalFooterChild, ModalHeader } from "@/components/ui/Modal"
import Tooltip from "@/components/ui/Tooltip"
import { TIPO_CONTRATO } from "@/constants/contrato.constant"
import { IContratoEmpresaCliente } from "@/interface/contrato.interface"
import ApiService from "@/services/ApiService"
import { useAppSelector } from "@/store"
import dayjs from "dayjs"
import { useFormik } from "formik"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "react-toastify"
import * as Yup from 'yup'


function CrearContratoDelCliente() {
    const navigate = useNavigate()
    const { detalleCliente } = useAppSelector((state) => state.empresa)
    const [isOpen, setIsOpen] = useState<boolean>(false)

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            nombre: "",
            fecha_inicio: "",
            fecha_fin: "",
            observaciones: "",
            tipo: ""
        },
        validationSchema: Yup.object().shape({
            nombre: Yup.string().required("Requerido").nonNullable("Requerido").max(100, "Maximo 100 Caracteres"),
            fecha_inicio: Yup.string().required("Requerido").nonNullable("Requerido"),
            fecha_fin: Yup.string().notRequired().nullable(),
            observaciones: Yup.string().notRequired().nullable(),
            tipo: Yup.string().required("Requerido").nonNullable("Requerido")
        }),
        onSubmit: async (values) => {
            try {
                const response = await ApiService.fetchData<IContratoEmpresaCliente, string>({url: `/api/contratos/`, method: 'post', headers: {'Content-Type': 'application/json'}, data: JSON.stringify({
                    ...values,
                    fecha_inicio: dayjs(values.fecha_inicio).format("YYYY-MM-DD"),
                    fecha_fin: values.fecha_fin ? dayjs(values.fecha_fin).format("YYYY-MM-DD") : undefined,
                    empresa_prestadora: detalleCliente?.prestador_servicios,
                    empresa_cliente: detalleCliente?.info_cliente.id
                })})
                if (response.data) {
                    toast.success("Contrato creado", {autoClose: 1000})
                    navigate(`/empresa/contratos-cliente/${detalleCliente?.id}`)
                }
            } catch (error: any) {
                const mensajesError = Object.values(error.response.data)
                    .flat() // Aplana los arrays en caso de que haya más de uno
                    .join(" "); // Une los mensajes en una sola cadena
                toast.error(mensajesError || "Error al crear el contrato");
            }
        }
    })

    return (
        <>
            <Tooltip text="Crear Contrato">
                <Button variant="solid" onClick={() => {setIsOpen(true)}}>Crear</Button>
            </Tooltip>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
                <ModalHeader>
                    <Badge className="text-xl">Crear Contrato</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Badge>Nombre</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.nombre}
                                invalidFeedback={formik.errors.nombre}
                            >
                                <Input
                                    name="nombre"
                                    onChange={formik.handleChange}
                                    value={formik.values.nombre}
                                    onBlur={formik.handleBlur}
                                />
                            </Validation>
                        </div>
                        <div>
                            <Badge>Tipo</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.tipo}
                                invalidFeedback={formik.errors.tipo}
                            >
                                <SelectReact
                                    name="tipo"
                                    options={TIPO_CONTRATO}
                                    value={TIPO_CONTRATO.find(con => con.value === formik.values.tipo)}
                                    onChange={(e) => {formik.setFieldValue('tipo', (e as TSelectOption).value)}}
                                    placeholder={"Seleccione un Tipo"}
                                    noOptionsMessage={(e) => (`No Existe ${e.inputValue}`)}
                                />
                            </Validation>
                        </div>
                        <div>
                            <Badge>Fecha de Inicio</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.fecha_inicio}
                                invalidFeedback={formik.errors.fecha_inicio}
                            >
                                <Input
                                    name="fecha_inicio"
                                    type="date"
                                    onChange={formik.handleChange}
                                    value={formik.values.fecha_inicio}
                                    onBlur={formik.handleBlur}
                                />
                            </Validation>
                        </div>
                        <div>
                            <Badge>Fecha de Fin</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.fecha_fin}
                                invalidFeedback={formik.errors.fecha_fin}
                            >
                                <Input
                                    name="fecha_fin"
                                    type="date"
                                    onChange={formik.handleChange}
                                    value={formik.values.fecha_fin}
                                    onBlur={formik.handleBlur}
                                />
                            </Validation>
                        </div>
                        <div className="col-span-full">
                            <Badge>Observaciones</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.observaciones}
                                invalidFeedback={formik.errors.observaciones}
                            >
                                <Textarea
                                    name="observaciones"
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                    value={formik.values.observaciones}
                                />
                            </Validation>
                        </div>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <ModalFooterChild></ModalFooterChild>
                    <ModalFooterChild>
                        <Button color="red" onClick={() => {setIsOpen(false)}}>Cancelar</Button>
                        <Button variant="solid" onClick={() => {formik.handleSubmit()}}>Crear</Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    )
}

export default CrearContratoDelCliente