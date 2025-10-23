import SelectReact, { TSelectOption } from "@/components/form/SelectReact"
import Textarea from "@/components/form/Textarea"
import Validation from "@/components/form/Validation"
import Badge from "@/components/ui/Badge"
import Button from "@/components/ui/Button"
import Modal, { ModalBody, ModalFooter, ModalFooterChild, ModalHeader } from "@/components/ui/Modal"
import ApiService from "@/services/ApiService"
import { listaDetalleTrabajoOTThunk, listaGuiasSalidasDisponiblesThunk, useAppDispatch, useAppSelector, usuarioEmpresaLogeadoThunk } from "@/store"
import { useFormik } from "formik"
import { Dispatch, SetStateAction, useEffect, useState } from "react"
import { toast } from "react-toastify"
import * as Yup from 'yup'


function AgregarInsumoADT({isOpen, setIsOpen, detalleSeleccionado, setDetalleSeleccionado} : {isOpen: boolean, setIsOpen: Dispatch<SetStateAction<boolean>>, detalleSeleccionado: number | null, setDetalleSeleccionado: Dispatch<SetStateAction<number | null>>}) {
    const dispatch = useAppDispatch()
    const { detalleOrdenTrabajo } = useAppSelector((state) => state.ordenTrabajo)
    const { listaGuiasSalidasDisponibles } = useAppSelector((state) => state.bodega)
    const { usuarioEmpresaLogeado } = useAppSelector((state) => state.empresa)
    const { userMe } = useAppSelector((state) => state.auth)
    const [optionsGuia, setOptionsGuia] = useState<{value: string, label: string}[]>([])

    useEffect(() => {
        if (isOpen && detalleOrdenTrabajo) {
            dispatch(listaGuiasSalidasDisponiblesThunk({id_empresa: detalleOrdenTrabajo.empresa}))
        }
    }, [isOpen, detalleOrdenTrabajo])

    useEffect(() => {
        if (!usuarioEmpresaLogeado && userMe) {
            dispatch(usuarioEmpresaLogeadoThunk({id_usuario: userMe.pk}))
        }
    }, [usuarioEmpresaLogeado, userMe])

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            insumo: "",
            comentario: ""
        },
        validationSchema: Yup.object().shape({
            insumo: Yup.string().required("Requerido").nonNullable("Requerido"),
            comentario: Yup.string().notRequired().nullable()
        }),
        onSubmit: async (values) => {
            try {
                const response = await ApiService.fetchData({url: `/api/ordenes-trabajo/${detalleOrdenTrabajo?.id}/detalles-trabajo/${detalleSeleccionado}/asignar-insumo/`, method: 'post', headers: {'Content-Type': 'application/json'}, data: JSON.stringify({insumo: values.insumo})})
                if (response.data) {
                    const seguimientoResponse = await ApiService.fetchData({
                        url: `/api/ordenes-trabajo/${detalleOrdenTrabajo?.id}/detalles-trabajo/${detalleSeleccionado}/seguimientos/`,
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        data: {
                            detalle_trabajo: detalleSeleccionado,
                            usuario: usuarioEmpresaLogeado?.id,
                            tipo: "actualizacion",
                            comentario: values.comentario,
                        },
                    });
                    if (seguimientoResponse.data) {
                        toast.success("Insumo asignado", {autoClose: 1000})
                        setIsOpen(false)
                        dispatch(listaDetalleTrabajoOTThunk({id_orden: detalleOrdenTrabajo?.id}))
                    }
                }
            } catch (error: any) {
                const mensajesError = Object.values(error.response.data).flat().join(" ");
                toast.error(mensajesError, {toastId: "Error al agregar insumo al trabajo"})
            }
        }
    })

    useEffect(() => {
        if (listaGuiasSalidasDisponibles.length > 0 && isOpen) {
            setOptionsGuia(listaGuiasSalidasDisponibles.map(guia => ({value: guia.id.toString(), label: `N°${guia.id} - ${guia.motivo}`})))
        }
    }, [listaGuiasSalidasDisponibles, isOpen])

    useEffect(() => {
        if (!isOpen) {
            setDetalleSeleccionado(null)
        }
    }, [isOpen])

    return (
        <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
            <ModalHeader>
                <Badge className="text-xl">Agregar Insumo</Badge>
            </ModalHeader>
            <ModalBody>
                <div className="flex flex-col gap-4">
                    <div>
                        <Badge>Guia de Salida</Badge>
                        <Validation
                            isValid={formik.isValid}
                            isTouched={formik.touched.insumo}
                            invalidFeedback={formik.errors.insumo}
                        >
                            <SelectReact
                                name="insumo"
                                options={optionsGuia}
                                onBlur={formik.handleBlur}
                                noOptionsMessage={(e) => (`No Existe ${e.inputValue}`)}
                                placeholder="Seleccione un Insumo"
                                onChange={(e) => {
                                    if (e) {
                                        formik.setFieldValue("insumo", (e as TSelectOption).value)
                                    } else {
                                        formik.setFieldValue("insumo", "")
                                    }
                                }}
                                value={optionsGuia.find(guia => guia.value === formik.values.insumo)}
                            />
                        </Validation>
                    </div>
                    <div>
                        <Badge>Comentario del Seguimiento</Badge>
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
                </div>
            </ModalBody>
            <ModalFooter>
                <ModalFooterChild></ModalFooterChild>
                <ModalFooterChild>
                    <Button color="red" onClick={() => {setIsOpen(false)}}>Cancelar</Button>
                    <Button variant="solid" onClick={() => {formik.handleSubmit()}}>Agregar</Button>
                </ModalFooterChild>
            </ModalFooter>
        </Modal>
    )
}

export default AgregarInsumoADT