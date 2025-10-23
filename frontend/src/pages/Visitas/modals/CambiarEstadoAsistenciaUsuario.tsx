import SelectReact, { TSelectOption } from "@/components/form/SelectReact";
import Textarea from "@/components/form/Textarea";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal, { ModalBody, ModalFooter, ModalFooterChild, ModalHeader } from "@/components/ui/Modal";
import Tooltip from "@/components/ui/Tooltip";
import { ESTADO_REVISION_EQUIPO } from "@/constants/visitas.constant";
import { IAsistenciaUsuario } from "@/interface/visitas.interface";
import ApiService from "@/services/ApiService";
import { detalleConVisitaThunk, listaAsistenciaUsuariosThunk, useAppDispatch } from "@/store";
import { useFormik } from "formik";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";


function CambiarEstadoAsistenciaUsuario({id_visita, info, tipo} : {id_visita: number | string | undefined, info: IAsistenciaUsuario, tipo?: string}) {
    const dispatch = useAppDispatch()
    const [isOpen, setIsOpen] = useState<boolean>(false)

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            estado_revision: "",
            observaciones_revision: ""
        },
        onSubmit: async (values) => {
            try {
                const response = await ApiService.fetchData({
                    url: `/api/visitas-soporte/${id_visita}/asistencias-usuarios/${info.id}/`,
                    method: 'patch',
                    headers: {'Content-Type': 'application/json'},
                    data: JSON.stringify({...values})
                });
                if (response.data) {
                    toast.success(`Asistencia de usuario ${ESTADO_REVISION_EQUIPO.find(rev => rev.value === formik.values.estado_revision)?.label}`, {autoClose: 1000});
                    if (tipo === "1") {
                        dispatch(listaAsistenciaUsuariosThunk({id_visita}))
                    } else {
                        dispatch(listaAsistenciaUsuariosThunk({id_visita}))
                    }
                    setIsOpen(false)
                }
            } catch (error: any) {
                toast.error(error.response.data || "Error al completar la asistencia de usuario", {toastId: "Error al completar la asistencia de usuario"});
            }
        }
    })

    useEffect(() => {
        if (isOpen) {
            formik.setValues({
                estado_revision: info.estado_revision,
                observaciones_revision: info.observaciones_revision
            })
        }
    }, [isOpen, info])

    return (
        <>
            <Tooltip text="Cambiar Estado">
                <Button color="sky" variant="solid" icon='HeroArrowPathRoundedSquare' onClick={() => {setIsOpen(true)}} />
            </Tooltip>
            <Modal size={"lg"} isOpen={isOpen} setIsOpen={setIsOpen}>
                <ModalHeader>
                    <Badge className="text-xl">Confirmación</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className="flex flex-col gap-4">
                        <div className="w-full">
                            <Badge>Estado</Badge>
                            <SelectReact
                                name="estado_revision"
                                onBlur={formik.handleBlur}
                                noOptionsMessage={(e) => (`No Existe ${e.inputValue}`)}
                                placeholder="Seleccione un estado"
                                options={ESTADO_REVISION_EQUIPO}
                                onChange={(e) => {formik.setFieldValue("estado_revision", (e as TSelectOption).value)}}
                                value={ESTADO_REVISION_EQUIPO.find(rev => rev.value === formik.values.estado_revision)}
                            />
                        </div>
                        <div className="w-full">
                            <Badge>Observaciones</Badge>
                            <Textarea
                                name="observaciones_revision"
                                onBlur={formik.handleBlur}
                                onChange={formik.handleChange}
                                value={formik.values.observaciones_revision}
                            />
                        </div>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <ModalFooterChild></ModalFooterChild>
                    <ModalFooterChild>
                        <Button color="red" onClick={() => {setIsOpen(false)}}>Cancelar</Button>
                        <Button variant="solid" onClick={async () => {formik.handleSubmit()}}>Guardar</Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    )
}

export default CambiarEstadoAsistenciaUsuario