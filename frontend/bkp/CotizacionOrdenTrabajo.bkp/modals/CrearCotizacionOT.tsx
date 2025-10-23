import Validation from "@/components/form/Validation"
import Button from "@/components/ui/Button"
import Modal, { ModalBody, ModalFooter, ModalFooterChild, ModalHeader } from "@/components/ui/Modal"
import { listaCotizacionesOTFiltradoThunk, listaCotizacionesOTThunk, useAppDispatch, useAppSelector } from "@/store"
import { useFormik } from "formik"
import { toast } from "react-toastify"
import { useEffect, useState } from "react"
import ApiService from "@/services/ApiService"
import Badge from "@/components/ui/Badge"
import SelectReact from "@/components/form/SelectReact"
import Tooltip from "@/components/ui/Tooltip"
import * as Yup from 'yup'


function CrearCotizacionOT({id_ot}: {id_ot: number | string | undefined}) {
    const dispatch = useAppDispatch()
    const { listaCotizacionesOTFiltrado } = useAppSelector((state) => state.ordenTrabajo)
    const [optionsCotizaciones, setOptionsCotizaciones] = useState<{value: string, label: string}[]>([])
    const [isOpen, setIsOpen] = useState<boolean>(false)

    useEffect(() => {
        if(isOpen) {
            dispatch(listaCotizacionesOTFiltradoThunk({id_ot: id_ot}));
        }
    }, [isOpen])

    useEffect(() => {
        if (listaCotizacionesOTFiltrado) {
            setOptionsCotizaciones(listaCotizacionesOTFiltrado.map((cot) => ({value: cot.id.toString(), label: `${cot.nombre} #${cot.numero_cotizacion}`})))
        }
    }, [listaCotizacionesOTFiltrado])

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            cotizacion: "",
        },
        validationSchema: Yup.object().shape({
            cotizacion: Yup.string().required("Requerido").nonNullable("Requerido")
        }),
        onSubmit: async (values) => {
            try {
                const response = await ApiService.fetchData({
                    url: `/api/ordenes-trabajo/${id_ot}/cotizaciones/`,
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    data: JSON.stringify(values)
                });
                if (response.data) {
                    toast.success("Cotizacion para orden de trabajdo creada", { autoClose: 1000 });
                    dispatch(listaCotizacionesOTThunk({id_ot: id_ot}));
                    formik.resetForm();
                    setIsOpen(false);
                }
            } catch (error: any) {
                toast.error(error.response.data || "Error al crear la Orden de Trabajo", {toastId: "Error al crear la OT"});
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
            <Tooltip text="Crear Cotización en Orden de Trabajo">
                <Button variant="solid" onClick={() => {setIsOpen(true)}} icon="HeroPlus"/>
            </Tooltip>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen} isStaticBackdrop={true}>
                <ModalHeader>
                    <Badge className="text-xl">Crear Cotización en Orden de Trabajo</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className="flex flex-col gap-4">
                        <div>
                            <Badge>Cotización</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.cotizacion}
                                invalidFeedback={formik.errors.cotizacion}
                            >
                                <SelectReact
                                    name="cotizacion"
                                    id="cotizacion"
                                    placeholder="Seleccione una cotizacion"
                                    noOptionsMessage={(e) => (`No existe ${e.inputValue}`)}
                                    options={optionsCotizaciones}
                                    onBlur={formik.handleBlur}
                                    value={{value: formik.values.cotizacion, label: optionsCotizaciones.find((cot) => cot.value === formik.values.cotizacion)?.label || ""}}
                                    onChange={(option: any) => formik.setFieldValue("cotizacion", option?.value)}
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

export default CrearCotizacionOT
