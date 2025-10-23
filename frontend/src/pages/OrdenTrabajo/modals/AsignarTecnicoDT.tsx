import SelectReact, { TSelectOption } from "@/components/form/SelectReact";
import Textarea from "@/components/form/Textarea";
import Validation from "@/components/form/Validation";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal, { ModalBody, ModalFooter, ModalFooterChild, ModalHeader } from "@/components/ui/Modal";
import Tooltip from "@/components/ui/Tooltip";
import ApiService from "@/services/ApiService";
import { listaDetalleTrabajoOTThunk, listaTecnicosThunk, useAppDispatch, useAppSelector, usuarioEmpresaLogeadoThunk } from "@/store";
import { useFormik } from "formik";
import { Dispatch, SetStateAction, useEffect } from "react";
import { toast } from "react-toastify";
import * as Yup from 'yup'


function AsignarTecnicoDT({detalle, isOpen, setIsOpen, setDetalleSeleccionado} : {isOpen: boolean, setIsOpen: Dispatch<SetStateAction<boolean>>, detalle: number | null, setDetalleSeleccionado: Dispatch<SetStateAction<number | null>>}) {
    const dispatch = useAppDispatch()
    const { usuarioEmpresaLogeado } = useAppSelector((state) => state.empresa);
    const { detalleOrdenTrabajo, listaTecnicos } = useAppSelector((state) => state.ordenTrabajo)
    const { userMe } = useAppSelector((state) => state.auth)

    useEffect(() => {
        if ((!usuarioEmpresaLogeado) && isOpen && userMe) {
            dispatch(usuarioEmpresaLogeadoThunk({id_usuario: userMe.pk}))
        }
    }, [usuarioEmpresaLogeado, isOpen, userMe])

    useEffect(() => {
        if (isOpen) {
            dispatch(listaTecnicosThunk({id_empresa: detalleOrdenTrabajo?.empresa}))
        }
    }, [isOpen])

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            tipo_seguimiento: 'actualizacion',
            comentario: 'Técnico agregado',
            tecnico_asignado: ""
        },
        validationSchema: Yup.object().shape({
            tecnico_asignado: Yup.string().required("Requerido").nonNullable("Requerido")
        }),
        onSubmit: async (values) => {
            try {
                const response = await ApiService.fetchData({url: `/api/ordenes-trabajo/${detalleOrdenTrabajo?.id}/detalles-trabajo/${detalle}/`, method: 'patch', headers: {'Content-Type': 'application/json'}, data: JSON.stringify({tecnico_asignado: values.tecnico_asignado})})
                if (response.data) {
                    const seguimientoResponse = await ApiService.fetchData({
                        url: `/api/ordenes-trabajo/${detalleOrdenTrabajo?.id}/detalles-trabajo/${detalle}/seguimientos/`,
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        data: JSON.stringify({
                            detalle_trabajo: detalle,
                            usuario: usuarioEmpresaLogeado?.id,
                            tipo: values.tipo_seguimiento,
                            comentario: values.comentario,
                        }),
                    });
                    if (seguimientoResponse.data) {
                        toast.success("Técnico asignado", {autoClose: 1000})
                        formik.resetForm()
                        dispatch(listaDetalleTrabajoOTThunk({ id_orden: detalleOrdenTrabajo?.id }));
                        setIsOpen(false)
                        setDetalleSeleccionado(null)
                    }
                }
            } catch (error: any) {
                toast.error(error.response.data || "Error al asignar el tecnico", {toastId: "Error al asignar el tecnico"})
            }
        }
    })

    useEffect(() => {
        if (!isOpen) {
            formik.resetForm()
        }
    }, [isOpen])

    return (
        <Modal isOpen={isOpen} setIsOpen={setIsOpen} isStaticBackdrop={true}>
            <ModalHeader>
                <Badge className="text-xl">Asignar Técnico</Badge>
            </ModalHeader>
            <ModalBody>
                <div className="flex flex-col gap-4">
                    <div className="w-full">
                        <Badge>Técnico</Badge>
                        {listaTecnicos.length > 0 && (
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.tecnico_asignado}
                                invalidFeedback={formik.errors.tecnico_asignado}
                            >
                                <SelectReact
                                    name="tecnico_asignado"
                                    noOptionsMessage={(e) => (`No Existe ${e.inputValue}`)}
                                    placeholder="Seleccione un Técnico"
                                    options={listaTecnicos.map(user => ({value: user.id.toString(), label: user.nombre_usuario}))}
                                    onChange={(e) => {formik.setFieldValue("tecnico_asignado", (e as TSelectOption).value)}}
                                    onBlur={formik.handleBlur}
                                    value={{value: formik.values.tecnico_asignado, label: listaTecnicos.find(us => us.id.toString() === formik.values.tecnico_asignado)?.nombre_usuario || ""}}
                                />
                            </Validation>
                        )}
                    </div>
                    {/* <div className="w-full">
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
                    </div> */}
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
    )
}

export default AsignarTecnicoDT