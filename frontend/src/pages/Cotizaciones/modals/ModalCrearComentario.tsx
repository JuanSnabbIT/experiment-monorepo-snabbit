import Textarea from "@/components/form/Textarea"
import Validation from "@/components/form/Validation"
import Badge from "@/components/ui/Badge"
import Button from "@/components/ui/Button"
import Modal, { ModalBody, ModalFooter, ModalFooterChild, ModalHeader } from "@/components/ui/Modal"
import Tooltip from "@/components/ui/Tooltip"
import ApiService from "@/services/ApiService"
import { listaComentarioCotizacionThunk, useAppDispatch, useAppSelector, usuarioEmpresaLogeadoThunk } from "@/store"
import { useFormik } from "formik"
import { useEffect, useState } from "react"
import { toast } from "react-toastify"


function ModalCrearComentario() {
    const dispatch = useAppDispatch()
    const { userMe } = useAppSelector((state) => state.auth)
    const { usuarioEmpresaLogeado } = useAppSelector((state) => state.empresa)
    const { detalleCotizacion } = useAppSelector((state) => state.cotizacion)
    const [isOpen, setIsOpen] = useState<boolean>(false)

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            comentario: ""
        },
        onSubmit: async (values) => {
            try {
                const response = await ApiService.fetchData({url: `/api/comentarios-cotizacion/`, method: 'post', headers: {'Content-Type': 'application/json'}, data: JSON.stringify({...values, cotizacion: detalleCotizacion?.id, creado_por: usuarioEmpresaLogeado?.id})})
                if (response.data) {
                    toast.success("Comentario Creado", {autoClose: 1000})
                    dispatch(listaComentarioCotizacionThunk({id_cotizacion: detalleCotizacion?.id}))
                    setIsOpen(false)
                    formik.resetForm()
                }
            } catch (error: any) {
                toast.error(error.response.data || "Error al crear el comentario")
            }
        }
    })

    useEffect(() => {
        if (!usuarioEmpresaLogeado) {
            dispatch(usuarioEmpresaLogeadoThunk({id_usuario: userMe?.pk}))
        }
    }, [])

    return (
        <>
            <Tooltip text="Crear Comentario">
                <Button variant="solid" icon="HeroPlus" onClick={() => {setIsOpen(true)}}></Button>
            </Tooltip>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
                <ModalHeader>
                    <Badge className="text-xl">Crear Comentario</Badge>
                </ModalHeader>
                <ModalBody>
                    <div>
                        <Badge>Comentario</Badge>
                        <Validation
                            isValid={formik.isValid}
                            isTouched={formik.touched.comentario}
                            invalidFeedback={formik.errors.comentario}
                        >
                            <Textarea
                                name="comentario"
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                                value={formik.values.comentario}
                            />
                        </Validation>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <ModalFooterChild></ModalFooterChild>
                    <ModalFooterChild>
                        <Button color="red" onClick={() => {setIsOpen(false); formik.resetForm()}}>Cancelar</Button>
                        <Button variant="solid" onClick={() => {formik.handleSubmit()}}>Guardar</Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    )
}

export default ModalCrearComentario