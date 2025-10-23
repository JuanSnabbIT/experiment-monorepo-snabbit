import Input from "@/components/form/Input"
import Textarea from "@/components/form/Textarea"
import Validation from "@/components/form/Validation"
import Badge from "@/components/ui/Badge"
import Button from "@/components/ui/Button"
import Modal, { ModalBody, ModalFooter, ModalFooterChild, ModalHeader } from "@/components/ui/Modal"
import Tooltip from "@/components/ui/Tooltip"
import ApiService from "@/services/ApiService"
import { listaDetalleTrabajoOTThunk, useAppDispatch, useAppSelector } from "@/store"
import { useFormik } from "formik"
import { useEffect, useState } from "react"
import { toast } from "react-toastify"
import * as Yup from 'yup'


function CrearDetalleTrabajoOT() {
    const dispatch = useAppDispatch()
    const { listaTrabajosFiltrados, detalleOrdenTrabajo } = useAppSelector((state) => state.ordenTrabajo)
    // const { listaContentType } = useAppSelector((state) => state.core)
    const [isOpen, setIsOpen] = useState<boolean>(false)
    // const [optionsTrabajos, setOptionsTrabajos] = useState<{label: string, options: {value: string, label: string, ct: number}[]}[]>([])

    // useEffect(() => {
    //     if (detalleOrdenTrabajo && isOpen) {
    //         dispatch(listaTrabajosFiltradasThunk({id_orden: detalleOrdenTrabajo?.id}))
    //     }
    // }, [isOpen, detalleOrdenTrabajo])

    // useEffect(() => {
    //     if (listaContentType.length === 0) {
    //         dispatch(listaContentTypeThunk())
    //     }
    // }, [listaContentType])

    // useEffect(() => {
    //     if (listaTrabajosFiltrados) {
    //         let lista: {label: string, options: {value: string, label: string, ct: number}[]}[] = []
    //         if (listaTrabajosFiltrados.cotizaciones.length > 0) {
    //             const id_cotizacion = listaContentType.find(cont => cont.model === "cotizacion")?.id
    //             if (id_cotizacion) {
    //                 lista = lista.concat({
    //                     label: "Cotizaciones",
    //                     options: listaTrabajosFiltrados.cotizaciones.map(coti => ({value: coti.id.toString(), label: `${coti.numero_cotizacion} - ${coti.nombre}`, ct: id_cotizacion}))
    //                 })
    //             }
    //         }
    //         if (listaTrabajosFiltrados.visitas_soporte.length > 0) {
    //             const id_visita = listaContentType.find(cont => cont.model === "visitasoporte")?.id
    //             if (id_visita) {
    //                 lista = lista.concat({
    //                     label: "Visitas",
    //                     options: listaTrabajosFiltrados.visitas_soporte.map(vis => ({value: vis.id.toString(), label: `${vis.id} - Empresa: ${vis.empresa_nombre} - Cliente: ${vis.cliente_nombre}`, ct: id_visita}))
    //                 })
    //             }
    //         }
    //         setOptionsTrabajos(lista)
    //     }
    // }, [listaTrabajosFiltrados])

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            nombre: "",
            // content_type: "",
            // trabajo_id: "",
            descripcion: "",
        },
        validationSchema: Yup.object().shape({
            nombre: Yup.string().required("Requerido").nonNullable("Requerido").max(100, "Maximo 100 Caracteres"),
            // content_type: Yup.string().nullable().notRequired(),
            // trabajo_id: Yup.string().nullable().notRequired(),
            descripcion: Yup.string().required("Requerido").nonNullable("Requerido")
        }),
        onSubmit: async (values) => {
            try {
                let data = {nombre: values.nombre, orden: detalleOrdenTrabajo?.id, descripcion: values.descripcion}
                // if (values.trabajo_id.length > 0 && values.content_type) {
                //     data = Object.assign(data, {content_type: values.content_type, trabajo_id: Number(values.trabajo_id)})
                // }
                const response = await ApiService.fetchData({url: `/api/ordenes-trabajo/${detalleOrdenTrabajo?.id}/detalles-trabajo/`, method: 'post', headers: {'Content-Type': 'application/json'}, data: JSON.stringify(data)})
                if (response.data) {
                    toast.success("Trabajo creado", {autoClose: 1000 });
                    formik.resetForm();
                    setIsOpen(false);
                    dispatch(listaDetalleTrabajoOTThunk({id_orden: detalleOrdenTrabajo?.id}));
                }
            } catch (error: any) {
                toast.error(error.response.data || "Error al crear el detalle de trabajo OT", { toastId: "Error crear detalle OT" });
            }
        }
    })

    useEffect(() => {
        if (!isOpen) {
            formik.resetForm()
        }
    }, [isOpen])

    return (
        <>
            <Tooltip text="Crear Trabajo">
                <Button variant="solid" icon="HeroPlus" onClick={() => {setIsOpen(true)}}></Button>
            </Tooltip>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen} isStaticBackdrop={true}>
                <ModalHeader>
                    <Badge className="text-xl">Crear Trabajo</Badge>
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
                                    onBlur={formik.handleBlur}
                                    onChange={formik.handleChange}
                                    value={formik.values.nombre}
                                />
                            </Validation>
                            <div className="text-xs">Caracteres restantes: {100 - formik.values.nombre.length}</div>
                        </div>
                        {/* <div>
                            <Badge>Añadir una cotizacion o asistencia técnica</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.trabajo_id}
                                invalidFeedback={formik.errors.trabajo_id}
                            >
                                <SelectReact
                                    noOptionsMessage={(e) => (`No existe ${e.inputValue}`)}
                                    placeholder="Eliga una cotización o asistencia técnica"
                                    name="trabajo_id"
                                    isClearable
                                    options={optionsTrabajos}
                                    onBlur={formik.handleBlur}
                                    onChange={(e) => {
                                        if (e) {
                                            formik.setFieldValue('trabajo_id', (e as {value: string, label: string, ct: number}).value)
                                            formik.setFieldValue('content_type', (e as {value: string, label: string, ct: number}).ct)
                                        } else {
                                            formik.setFieldValue('trabajo_id', "")
                                            formik.setFieldValue('content_type', "")
                                        }
                                    }}
                                />
                            </Validation>
                        </div> */}
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

export default CrearDetalleTrabajoOT