import Input from "@/components/form/Input"
import Radio, { RadioGroup } from "@/components/form/Radio"
import Validation from "@/components/form/Validation"
import Badge from "@/components/ui/Badge"
import Button from "@/components/ui/Button"
import Modal, { ModalBody, ModalFooter, ModalFooterChild, ModalHeader } from "@/components/ui/Modal"
import Tooltip from "@/components/ui/Tooltip"
import { ICompra } from "@/interface/bodega.interface"
import { detalleCompraThunk, useAppDispatch, useAppSelector } from "@/store"
import { useFormik } from "formik"
import { useEffect, useState } from "react"
import { toast } from "react-toastify"
import * as Yup from "yup"
import Camera from 'react-html5-camera-photo';
import 'react-html5-camera-photo/build/css/index.css';
import ApiService from "@/services/ApiService"
import SelectReact, { TSelectOption } from "@/components/form/SelectReact"
import { OPCIONES_ARCHIVO } from "@/constants/bodegas.constant"
import Textarea from "@/components/form/Textarea"


function AgregarArchivoCompra({compra} : {compra: ICompra}) {
    const dispatch = useAppDispatch()
    const { usuarioEmpresaLogeado } = useAppSelector((state) => state.empresa)
    const [isOpen, setIsOpen] = useState<boolean>(false)

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            opcion: "",
            archivo: "",
            observaciones: ""
        },
        validationSchema: Yup.object({
            opcion: Yup.string().required("Requerido").nonNullable("Requerido"),
            observaciones: Yup.string().notRequired().nullable()
        }),
        onSubmit: async (values) => {
            try {
                const formData = new FormData()
                formData.append("opcion", values.opcion)
                formData.append("tipo", "1")
                formData.append("compra", compra.id.toString())
                formData.append("archivo", values.archivo)
                formData.append("observaciones", values.observaciones)
                if (usuarioEmpresaLogeado) {
                    formData.append("creado_por", usuarioEmpresaLogeado.id.toString())
                }
                const response = await ApiService.fetchData({url: `/api/archivos-compras/`, method: 'post', headers: {'Content-Type': 'multipart/form-data'}, data: formData})
                if (response.data) {
                    toast.success("Archivo guardado", {autoClose: 1000})
                    formik.resetForm()
                    setIsOpen(false)
                    dispatch(detalleCompraThunk({id_compra: compra.id}))
                }
            } catch (error: any) {
                toast.error(error.response.data)
            }
        }
    })

    return (
        <>
            <Tooltip text="Agregar Archivo o Imagen">
                <Button variant="solid" icon="HeroPlus" onClick={() => {setIsOpen(true)}}></Button>
            </Tooltip>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen} isStaticBackdrop={true}>
                <ModalHeader>
                    <Badge className="text-xl">Agregar Archivo o Imagen</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className="flex flex-col gap-4">
                        <div>
                            <Badge>Opcion</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.opcion}
                                invalidFeedback={formik.errors.opcion}
                            >
                                <SelectReact
                                    name="opcion"
                                    options={OPCIONES_ARCHIVO}
                                    onChange={(e) => {formik.setFieldValue("opcion", (e as TSelectOption).value)}}
                                    onBlur={formik.handleBlur}
                                    value={OPCIONES_ARCHIVO.find(ar => ar.value === formik.values.archivo)}
                                    noOptionsMessage={(e) => (`No Existe ${e.inputValue}`)}
                                    placeholder="Seleccione una opcion"
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
                                    name="archivo"
                                    id="archivo"
                                    type="file"
                                    onChange={(e) => {
                                        if (e.target.files && e.target.files.length > 0) {
                                            formik.setFieldValue("archivo", e.target.files[0]);
                                        }
                                    }}
                                    onBlur={formik.handleBlur}
                                />
                            </Validation>
                        </div>
                        <div>
                            <Badge>Observaciones</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.observaciones}
                                invalidFeedback={formik.errors.observaciones}
                            >
                                <Textarea
                                    name="observaciones"
                                    value={formik.values.observaciones}
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
                        <Button color="red" onClick={() => {setIsOpen(false)}}>Cancelar</Button>
                        <Button variant="solid" onClick={() => {formik.handleSubmit()}}>Guardar</Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    )
}

export default AgregarArchivoCompra