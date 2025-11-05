import Input from "@/components/form/Input"
import Validation from "@/components/form/Validation"
import Badge from "@/components/ui/Badge"
import Button from "@/components/ui/Button"
import Modal, { ModalBody, ModalFooter, ModalFooterChild, ModalHeader } from "@/components/ui/Modal"
import Tooltip from "@/components/ui/Tooltip"
import ApiService from "@/services/ApiService"
import { useAppDispatch } from "@/store"
import { listaEmpresasThunk } from "@/store/slices/empresa/empresaSlice"
import { useFormik } from "formik"
import { useState } from "react"
import { toast } from "react-toastify"
import * as Yup from 'yup'


function CrearEmpresa() {
    const dispatch = useAppDispatch()
    const [isOpen, setIsOpen] = useState<boolean>(false)

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            nombre: "",
            rut: "",
            telefono: "",
            email: "",
            sitio_web: "",
            direccion_principal: "",
            recargo: "",
        },
        validationSchema: Yup.object().shape({
            nombre: Yup.string().required("Requerido").max(255, "Maximo 255 Caracteres"),
            rut: Yup.string().notRequired().nullable().max(100, "Maximo 100 Caracteres"),
            telefono: Yup.string().notRequired().nullable().max(20, "Maximo 20 Caracteres"),
            email: Yup.string().email("No es un email valido").notRequired().nullable(),
            sitio_web: Yup.string().nullable().notRequired(),
            direccion_principal: Yup.string().required("Requerido").max(250, "Maximo 250 Caracteres"),
            recargo: Yup.number().required("Requerido").min(0, "Debe ser mayor o igual a 0"),
        }),
        onSubmit: async (values) => {
            try {
                const response = await ApiService.fetchData({
                    url: '/api/empresas/',
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    data: JSON.stringify({
                        nombre: values.nombre,
                        sitio_web: values.sitio_web,
                        direccion_principal: values.direccion_principal,
                        rut_empresa: values.rut,
                        telefono: values.telefono,
                        email: values.email,
                        recargo: values.recargo
                    })
                });
                if (response.data) {
                    toast.success("Empresa creada", {autoClose: 1000});
                    dispatch(listaEmpresasThunk());
                    formik.resetForm();
                    setIsOpen(false);
                } else {
                    toast.error("Error al crear la empresa");
                }
            } catch (error: any) {
                toast.error("Error al crear la empresa");
            }
        }
    })

    return (
        <>
            <Tooltip text="Crear Empresa">
                <Button variant="solid" onClick={() => {setIsOpen(true)}} icon="HeroPlus" />
            </Tooltip>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
                <ModalHeader>
                    <Badge className="text-xl">Crear Empresa</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className="flex flex-col gap-4">
                        <div>
                            <Badge>Nombre</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.nombre}
                                invalidFeedback={formik.errors.nombre}
                            >
                                <Input
                                    name="nombre"
                                    id="nombre"
                                    type="text"
                                    onBlur={formik.handleBlur}
                                    onChange={formik.handleChange}
                                    value={formik.values.nombre}
                                />
                            </Validation>
                        </div>
                        <div>
                            <Badge>Rut</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.rut}
                                invalidFeedback={formik.errors.rut}
                            >
                                <Input
                                    name="rut"
                                    id="rut"
                                    type="text"
                                    onBlur={formik.handleBlur}
                                    onChange={formik.handleChange}
                                    value={formik.values.rut}
                                />
                            </Validation>
                        </div>
                        <div>
                            <Badge>Recargo</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.recargo}
                                invalidFeedback={formik.errors.recargo}
                            >
                                <Input
                                    name="recargo"
                                    id="recargo"
                                    type="text"
                                    onBlur={formik.handleBlur}
                                    onChange={formik.handleChange}
                                    value={formik.values.recargo}
                                />
                            </Validation>
                        </div>
                        <div>
                            <Badge>Telefono</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.telefono}
                                invalidFeedback={formik.errors.telefono}
                            >
                                <Input
                                    name="telefono"
                                    id="telefono"
                                    type="text"
                                    onBlur={formik.handleBlur}
                                    onChange={formik.handleChange}
                                    value={formik.values.telefono}
                                />
                            </Validation>
                        </div>
                        <div>
                            <Badge>Email</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.email}
                                invalidFeedback={formik.errors.email}
                            >
                                <Input
                                    name="email"
                                    id="email"
                                    type="text"
                                    onBlur={formik.handleBlur}
                                    onChange={formik.handleChange}
                                    value={formik.values.email}
                                />
                            </Validation>
                        </div>
                        <div>
                            <Badge>Sitio Web</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.sitio_web}
                                invalidFeedback={formik.errors.sitio_web}
                            >
                                <Input
                                    id="sitio_web"
                                    name="sitio_web"
                                    type="text"
                                    onBlur={formik.handleBlur}
                                    onChange={formik.handleChange}
                                    value={formik.values.sitio_web}
                                />
                            </Validation>
                        </div>
                        <div>
                            <Badge>Direccion Principal</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.direccion_principal}
                                invalidFeedback={formik.errors.direccion_principal}
                            >
                                <Input
                                    id="direccion_principal"
                                    name="direccion_principal"
                                    type="text"
                                    onBlur={formik.handleBlur}
                                    onChange={formik.handleChange}
                                    value={formik.values.direccion_principal}
                                />
                            </Validation>
                        </div>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <ModalFooterChild></ModalFooterChild>
                    <ModalFooterChild>
                        <Button color='red' onClick={() => {setIsOpen(false); formik.resetForm()}}>Cancelar</Button>
                        <Button variant='solid' onClick={() => {formik.handleSubmit()}}>Crear</Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    )
}

export default CrearEmpresa
