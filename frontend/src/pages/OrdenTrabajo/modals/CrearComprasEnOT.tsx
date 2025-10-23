import SelectReact, { TSelectOption } from "@/components/form/SelectReact"
import Textarea from "@/components/form/Textarea"
import Validation from "@/components/form/Validation"
import Badge from "@/components/ui/Badge"
import Button from "@/components/ui/Button"
import Modal, { ModalBody, ModalFooter, ModalFooterChild, ModalHeader } from "@/components/ui/Modal"
import Tooltip from "@/components/ui/Tooltip"
import { TIPO_COMPRA } from "@/constants/bodegas.constant"
import { IDetalleOrdenDeTrabajo } from "@/interface/ordenTrabajo.interface"
import ApiService from "@/services/ApiService"
import { listaBodegasThunk, listaDetalleTrabajoOTThunk, listaProveedoresEmpresaThunk, useAppDispatch, useAppSelector, usuarioEmpresaLogeadoThunk } from "@/store"
import { useFormik } from "formik"
import { useEffect, useState } from "react"
import { toast } from "react-toastify"
import * as Yup from 'yup'


function CrearComprasEnOT({detalleTrabajo} : {detalleTrabajo: IDetalleOrdenDeTrabajo}) {
    const dispatch = useAppDispatch()
    const { usuarioEmpresaLogeado } = useAppSelector((state) => state.empresa)
    const { detalleOrdenTrabajo } = useAppSelector((state) => state.ordenTrabajo)
    const { listaProveedoresEmpresa } = useAppSelector((state) => state.item)
    const { listaBodegas } = useAppSelector((state) => state.bodega)
    const { personalizacionUsuario, userMe } = useAppSelector((state) => state.auth)
    const [isOpen, setIsOpen] = useState<boolean>(false)

    useEffect(() => {
        if (isOpen && detalleOrdenTrabajo) {
            dispatch(listaBodegasThunk())
            dispatch(listaProveedoresEmpresaThunk({id_empresa: detalleOrdenTrabajo.empresa}))
        }
        if (isOpen && !usuarioEmpresaLogeado) {
            dispatch(usuarioEmpresaLogeadoThunk({id_usuario: userMe?.pk}))
        }
        if (!isOpen) {
            formik.resetForm()
        }
    }, [isOpen, detalleOrdenTrabajo])

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            tipo: "",
            proveedor: "",
            observaciones: "",
            bodega_temporal: ""
        },
        validationSchema: Yup.object().shape({
            tipo: Yup.string().nonNullable("Requerido").required("Requerido"),
            proveedor: Yup.string().nonNullable("Requerido").required("Requerido"),
            observaciones: Yup.string().nullable().notRequired(),
            bodega_temporal: Yup.string().nonNullable("Requerido").required("Requerido"),
        }),
        onSubmit: async (values) => {
            try {
                const response = await ApiService.fetchData({url: `/api/ordenes-trabajo/${detalleOrdenTrabajo?.id}/detalles-trabajo/${detalleTrabajo.id}/crear-compra/`, method: 'post', headers: {'Content-Type': 'application/json'}, data: JSON.stringify({
                    ...values,
                    sucursal: personalizacionUsuario?.sucursal_principal,
                    creado_por: usuarioEmpresaLogeado?.id
                })})
                if (response.data) {
                    dispatch(listaDetalleTrabajoOTThunk({id_orden: detalleOrdenTrabajo?.id}))
                    setIsOpen(false)
                    toast.success("Compra creada", {autoClose: 1000})
                }
            } catch (error: any) {
                toast.error(error.response.data || "Error al crear la compra", {toastId: "Error al crear la compra"})
            }
        }
    })

    return (
        <>
            <Tooltip text="Agregar Compra">
                <Button variant="solid" color="lime" icon="HeroCurrencyDollar" onClick={() => {setIsOpen(true)}}></Button>
            </Tooltip>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
                <ModalHeader>
                    <Badge className="text-xl">Agregar Compra</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className="flex flex-col gap-4">
                        <div>
                            <Badge>Tipo</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.tipo}
                                invalidFeedback={formik.errors.tipo}
                            >
                                <SelectReact
                                    name="tipo"
                                    options={TIPO_COMPRA}
                                    value={{value: formik.values.tipo, label: TIPO_COMPRA.find(tipo => tipo.value === formik.values.tipo)?.label || ""}}
                                    onChange={(e) => {formik.setFieldValue('tipo', (e as TSelectOption).value)}}
                                    onBlur={formik.handleBlur}
                                />
                            </Validation>
                        </div>
                        <div>
                            <Badge>Proveedor</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.proveedor}
                                invalidFeedback={formik.errors.proveedor}
                            >
                                <SelectReact
                                    name="proveedor"
                                    options={listaProveedoresEmpresa.map(prov => ({value: prov.id.toString(), label: prov.nombre}))}
                                    onChange={(e) => {formik.setFieldValue('proveedor', (e as TSelectOption).value)}}
                                    noOptionsMessage={(e) => (`No Existe ${e.inputValue}`)}
                                    value={{value: formik.values.proveedor, label: listaProveedoresEmpresa.find(prov => prov.id.toString() === formik.values.proveedor)?.nombre || ""}}
                                    onBlur={formik.handleBlur}
                                />
                            </Validation>
                        </div>
                        <div>
                            <Badge>Bodega Temporal</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.bodega_temporal}
                                invalidFeedback={formik.errors.bodega_temporal}
                            >
                                <SelectReact
                                    name="bodega_temporal"
                                    noOptionsMessage={(e) => (`No Existe ${e.inputValue}`)}
                                    options={listaBodegas.map(bode => ({value: bode.id.toString(), label: bode.nombre}))}
                                    value={{value: formik.values.bodega_temporal, label: listaBodegas.find(bode => bode.id.toString() === formik.values.bodega_temporal)?.nombre || ""}}
                                    onChange={(e) => {formik.setFieldValue("bodega_temporal", (e as TSelectOption).value)}}
                                    onBlur={formik.handleBlur}
                                />
                            </Validation>
                        </div>
                        <div>
                            <Badge>¿Que se Compra?</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.observaciones}
                                invalidFeedback={formik.errors.observaciones}
                            >
                                <Textarea
                                    name="observaciones"
                                    onChange={formik.handleChange}
                                    value={formik.values.observaciones}
                                    onBlur={formik.handleBlur}
                                />
                            </Validation>
                        </div>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <ModalFooterChild></ModalFooterChild>
                    <ModalFooterChild>
                        <Button color="red" onClick={() => {setIsOpen(false)}}>Cerrar</Button>
                        <Button variant="solid" onClick={() => {formik.handleSubmit()}}>Agregar</Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    )
}

export default CrearComprasEnOT