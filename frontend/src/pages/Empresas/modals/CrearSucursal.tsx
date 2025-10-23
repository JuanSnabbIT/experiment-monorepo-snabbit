import Input from "@/components/form/Input"
import Validation from "@/components/form/Validation"
import Badge from "@/components/ui/Badge"
import Button from "@/components/ui/Button"
import Modal, { ModalBody, ModalFooter, ModalFooterChild, ModalHeader } from "@/components/ui/Modal"
import Tooltip from "@/components/ui/Tooltip"
import ApiService from "@/services/ApiService"
import { useAppDispatch } from "@/store"
import { listaEmpresasThunk, listaMisSucursalesThunk } from "@/store/slices/empresa/empresaSlice"
import { useFormik } from "formik"
import { useState } from "react"
import { toast } from "react-toastify"
import * as Yup from 'yup';


const validationSchema = Yup.object({
    nombre: Yup.string().required('Nombre requerido'),
    direccion: Yup.string().required('Direccion requerida'),
    telefono: Yup.string().required('Telefono requerido'),
    email: Yup.string().email('Email invalido').required('Email requerido'),
})

function CrearSucursal({empresaId} : {empresaId: number | string | undefined}) {
    const dispatch = useAppDispatch()
    const [isOpen, setIsOpen] = useState<boolean>(false)

    const formik = useFormik({
        enableReinitialize: true,
        validationSchema,
        initialValues: {
            nombre: "",
            direccion: "",
            telefono: "",
            email: "",
        },
        onSubmit: async (values) => {
            try {
                const response = await ApiService.fetchData({
                    url: `/api/empresas/${empresaId}/sucursales-empresa/`,
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    data: JSON.stringify({
                        empresa: empresaId,
                        nombre: values.nombre,
                        direccion: values.direccion,
                        telefono: values.telefono,
                        email: values.email,
                    })
                });
                if (response.data) {
                    toast.success("Sucursal Creada", { autoClose: 1000 });
                    dispatch(listaEmpresasThunk());
                    dispatch(listaMisSucursalesThunk({ id_empresa: empresaId }));
                    formik.resetForm();
                    setIsOpen(false);
                } else {
                    toast.error("Error al crear la sucursal");
                }
            } catch (error: any) {
                toast.error("Error al crear la sucursal");
            }
        }
    })

    return (
        <>
            <Tooltip text="Crear Sucursal">
                <Button variant="solid" onClick={() => {setIsOpen(true)}} icon="HeroPlus"/>
            </Tooltip>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
                <ModalHeader>
                    <Badge className="text-xl">Crear Sucursal</Badge>
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
                            <Badge>Telefono</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.telefono}
                                invalidFeedback={formik.errors.telefono}
                            >
                                <Input
                                    id="telefono"
                                    name="telefono"
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
                                    id="email"
                                    name="email"
                                    type="email"
                                    onBlur={formik.handleBlur}
                                    onChange={formik.handleChange}
                                    value={formik.values.email}
                                />
                            </Validation>
                        </div>
                        <div>
                            <Badge>Direccion</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.direccion}
                                invalidFeedback={formik.errors.direccion}
                            >
                                <Input
                                    id="direccion"
                                    name="direccion"
                                    type="text"
                                    onBlur={formik.handleBlur}
                                    onChange={formik.handleChange}
                                    value={formik.values.direccion}
                                />
                            </Validation>
                        </div>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <ModalFooterChild></ModalFooterChild>
                    <ModalFooterChild>
                        <Button color='red' onClick={() => {setIsOpen(false); formik.resetForm()}}>Cancelar</Button>
                        <Button variant='solid' onClick={() => { formik.handleSubmit() }}>Crear</Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    )
}

export default CrearSucursal