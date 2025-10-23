import Input from "@/components/form/Input"
import SelectReact, { TSelectOption } from "@/components/form/SelectReact"
import Textarea from "@/components/form/Textarea"
import Validation from "@/components/form/Validation"
import Badge from "@/components/ui/Badge"
import Button from "@/components/ui/Button"
import Modal, { ModalBody, ModalFooter, ModalFooterChild, ModalHeader } from "@/components/ui/Modal"
import Tooltip from "@/components/ui/Tooltip"
import ApiService from "@/services/ApiService"
import { listaAdjuntosThunk, useAppDispatch, useAppSelector } from "@/store"
import { useFormik } from "formik"
import { useState } from "react"
import { toast } from "react-toastify"
import * as Yup from 'yup'


const TIPO_ADJUNTO: TSelectOption[] = [
    { value: 'contrato', label: 'Contrato' },
    // { value: 'imagen', label: 'Imagen' },
    { value: 'informe', label: 'Informe' }
]

function CrearAdjunto() {
    const dispatch = useAppDispatch()
    const { detalleOrdenTrabajo } = useAppSelector((state) => state.ordenTrabajo)
    const [isOpen, setIsOpen] = useState<boolean>(false)

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            descripcion: "",
            tipo: "",
            archivo: null
        },
        validationSchema: Yup.object().shape({
            descripcion: Yup.string().required("Requerido").nonNullable("Requerido"),
            tipo: Yup.string().required("Requerido").nonNullable("Requerido"),
            archivo: Yup.mixed().required("Requerido").nonNullable("Requerido")
        }),
        onSubmit: async (values) => {
            const formData = new FormData()
            formData.append('descripcion', values.descripcion)
            formData.append('tipo', values.tipo)
            if (values.archivo) {
                formData.append('archivo', values.archivo)
            }
            formData.append('orden', detalleOrdenTrabajo?.id?.toString() || "")

            try {
                const response = await ApiService.fetchData({
                    url: `/api/ordenes-trabajo/${detalleOrdenTrabajo?.id}/adjuntos/`,
                    method: 'post',
                    headers: { 'Content-Type': 'multipart/form-data' },
                    data: formData
                })
                if (response.data) {
                    toast.success("Adjunto creado", { autoClose: 1000 })
                    formik.resetForm()
                    setIsOpen(false)
                    dispatch(listaAdjuntosThunk({ ordenId: detalleOrdenTrabajo?.id }))
                }
            } catch (error: any) {
                toast.error(error.response.data || "Error al crear el adjunto", { toastId: "Error al crear el adjunto" })
            }
        }
    })

    return (
        <>
            <Tooltip text="Crear Adjunto de Orden de Trabajo">
                <Button variant="solid" icon="HeroPlus" onClick={() => { setIsOpen(true) }}></Button>
            </Tooltip>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
                <ModalHeader>
                    <Badge className="text-xl">Crear Adjunto de Orden de Trabajo</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className="flex flex-col gap-4">
                        <div>
                            <Badge>Descripción</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.descripcion}
                                invalidFeedback={formik.errors.descripcion}
                            >
                                <Textarea
                                    name="descripcion"
                                    onBlur={formik.handleBlur}
                                    onChange={formik.handleChange}
                                    value={formik.values.descripcion}
                                />
                            </Validation>
                        </div>
                        <div>
                            <Badge>Tipo de Adjunto</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.tipo}
                                invalidFeedback={formik.errors.tipo}
                            >
                                <SelectReact
                                    name="tipo"
                                    noOptionsMessage={(e) => `No existe el tipo ${e.inputValue}`}
                                    options={TIPO_ADJUNTO}
                                    onBlur={formik.handleBlur}
                                    onChange={(e) => { formik.setFieldValue('tipo', (e as TSelectOption).value) }}
                                    value={{ value: formik.values.tipo, label: TIPO_ADJUNTO.find(option => option.value === formik.values.tipo)?.label || "" }}
                                />
                            </Validation>
                        </div>
                        <div>
                            <Badge>Archivo</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.archivo}
                                invalidFeedback={formik.errors.archivo}
                            >
                                <Input
                                    type="file"
                                    name="archivo"
                                    onBlur={formik.handleBlur}
                                    onChange={(event) => {
                                        const files = event.currentTarget.files;
                                        if (files && files[0]) {
                                            formik.setFieldValue('archivo', files[0]);
                                        }
                                    }}
                                />
                            </Validation>
                        </div>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <ModalFooterChild></ModalFooterChild>
                    <ModalFooterChild>
                        <Button color="red" onClick={() => { setIsOpen(false) }}>Cancelar</Button>
                        <Button variant="solid" onClick={() => { formik.handleSubmit() }}>Guardar</Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    )
}

export default CrearAdjunto
