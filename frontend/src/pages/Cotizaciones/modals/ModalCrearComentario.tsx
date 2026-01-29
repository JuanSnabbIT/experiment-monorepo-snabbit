import SelectReact from "@/components/form/SelectReact"
import Textarea from "@/components/form/Textarea"
import Validation from "@/components/form/Validation"
import Badge from "@/components/ui/Badge"
import Button from "@/components/ui/Button"
import Modal, { ModalBody, ModalFooter, ModalFooterChild, ModalHeader } from "@/components/ui/Modal"
import Tooltip from "@/components/ui/Tooltip"
import { TIPO_SEGUIMIENTO_COTIZACION } from "@/constants/cotizacion.constant"
import ApiService from "@/services/ApiService"
import { useAppDispatch, useAppSelector, usuarioEmpresaLogeadoThunk } from "@/store"
import { getErrorMessage } from "@/utils/errorHandlers"
import { useFormik } from "formik"
import { useEffect, useState } from "react"
import { toast } from "react-toastify"


function ModalCrearComentario({
	cotizacionId,
	onComentarioChange,
}: {
	cotizacionId: number | undefined;
	onComentarioChange?: () => void;
}) {
	const dispatch = useAppDispatch();
	const { userMe } = useAppSelector((state) => state.auth);
	const { usuarioEmpresaLogeado } = useAppSelector((state) => state.empresa);
    const [isOpen, setIsOpen] = useState<boolean>(false)

    const tipoOptions = TIPO_SEGUIMIENTO_COTIZACION.filter(
        (tipo) => tipo.value !== 'actualizacion',
    )

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            comentario: "",
            tipo: "comentario",
        },
        onSubmit: async (values) => {
            try {
                const response = await ApiService.fetchData({
                    url: `/api/cotizaciones/${cotizacionId}/seguimientos/`,
                    method: 'post',
                    headers: {'Content-Type': 'application/json'},
                    data: JSON.stringify({
                        comentario: values.comentario,
                        tipo: values.tipo,
                        cotizacion: cotizacionId,
                        usuario: usuarioEmpresaLogeado?.id,
                    }),
                })
                if (response.data) {
                    toast.success("Comentario Creado", {autoClose: 1000})
                    if (onComentarioChange) onComentarioChange()
                    setIsOpen(false)
                    formik.resetForm()
                }
            } catch (error: unknown) {
                toast.error(getErrorMessage(error) || "Error al crear el comentario")
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
                    <div className="mt-4">
                        <Badge>Tipo</Badge>
                        <Validation
                            isValid={formik.isValid}
                            isTouched={formik.touched.tipo}
                            invalidFeedback={formik.errors.tipo}
                        >
                            <SelectReact
                                name="tipo"
                                id="tipo"
                                placeholder="Seleccione un tipo"
                                options={tipoOptions}
                                value={tipoOptions.find(
                                    (option) => option.value === formik.values.tipo,
                                )}
                                onChange={(option: any) => {
                                    formik.setFieldValue("tipo", option?.value)
                                }}
                                onBlur={formik.handleBlur}
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
