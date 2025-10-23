import Input from "@/components/form/Input"
import SelectReact, { TSelectOption } from "@/components/form/SelectReact"
import Validation from "@/components/form/Validation"
import Badge from "@/components/ui/Badge"
import Button from "@/components/ui/Button"
import Modal, { ModalBody, ModalFooter, ModalFooterChild, ModalHeader } from "@/components/ui/Modal"
import Tooltip from "@/components/ui/Tooltip"
import ApiService from "@/services/ApiService"
import { detalleItemEmpresaThunk, listaBodegasPorEmpresaThunk, useAppDispatch, useAppSelector } from "@/store"
import { useFormik } from "formik"
import { useEffect, useState } from "react"
import { toast } from "react-toastify"
import * as Yup from "yup"


function CrearMovimientoStockInicial() {
    const dispatch = useAppDispatch()
    const { detalleItemEmpresa } = useAppSelector((state) => state.item)
    const { listaBodegasPorEmpresa } = useAppSelector((state) => state.bodega)
    const [isOpen, setIsOpen] = useState<boolean>(false)

    useEffect(() => {
        if (isOpen && detalleItemEmpresa) {
            dispatch(listaBodegasPorEmpresaThunk({id_empresa: detalleItemEmpresa.empresa}))
        }
    }, [isOpen, detalleItemEmpresa])

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            cantidad: 0,
            bodega: "",
        },
        validationSchema: Yup.object().shape({
            cantidad: Yup.number().required("Requerido").nonNullable("Requerido").min(0, "Minimo 1"),
            bodega: Yup.string().required("Requerido").nonNullable("Requerido")
        }),
        onSubmit: async (values) => {
            try {
                const response = await ApiService.fetchData({url: `/api/movimientos-stock/crear-inicial/`, method: 'post', headers: {'Content-Type': 'application/json'}, data: JSON.stringify({
                    ...values,
                    item: detalleItemEmpresa?.id,
                })})
                if (response.data) {
                    toast.success("Stock creado", {autoClose: 1000})
                    dispatch(detalleItemEmpresaThunk({id_empresa: detalleItemEmpresa?.empresa, id_item: detalleItemEmpresa?.id}))
                    setIsOpen(false)
                }
            } catch (error: any) {
                const mensajesError = Object.values(error.response.data)
                    .flat() // Aplana los arrays en caso de que haya más de uno
                    .join(" "); // Une los mensajes en una sola cadena
                toast.error(mensajesError || "Error al crear el movimiento stock inicial", {toastId: "Error al crear el movimiento stock inicial"})
            }
        }
    })

    return (
        <>
            <Tooltip text="Crear Movimiento Stock Inicial">
                <Button variant="solid" icon="HeroPlus" onClick={() => {setIsOpen(true)}} />
            </Tooltip>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
                <ModalHeader>
                    <Badge className="text-xl">Crear Movimiento Stock Inicial</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className="flex flex-col gap-4">
                        <div>
                            <Badge>Cantidad</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.cantidad}
                                invalidFeedback={formik.errors.cantidad}
                            >
                                <Input
                                    name="cantidad"
                                    type="number"
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                    value={formik.values.cantidad}
                                />
                            </Validation>
                        </div>
                        <div>
                            <Badge>Bodega</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.bodega}
                                invalidFeedback={formik.errors.bodega}
                            >
                                <SelectReact
                                    name="bodega"
                                    options={listaBodegasPorEmpresa.map(bode => ({value: bode.id.toString(), label: bode.nombre}))}
                                    onChange={(e) => {formik.setFieldValue("bodega", (e as TSelectOption).value)}}
                                    onBlur={formik.handleBlur}
                                    value={{value: formik.values.bodega, label: listaBodegasPorEmpresa.find(bode => bode.id.toString() === formik.values.bodega)?.nombre || ""}}
                                />
                            </Validation>
                        </div>
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
        </>
    )
}

export default CrearMovimientoStockInicial