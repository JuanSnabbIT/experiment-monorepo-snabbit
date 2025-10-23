import Checkbox from "@/components/form/Checkbox"
import Input from "@/components/form/Input"
import SelectReact, { TSelectOption } from "@/components/form/SelectReact"
import Badge from "@/components/ui/Badge"
import Button from "@/components/ui/Button"
import Modal, { ModalBody, ModalFooter, ModalFooterChild, ModalHeader } from "@/components/ui/Modal"
import Tooltip from "@/components/ui/Tooltip"
import ApiService from "@/services/ApiService"
import { detalleCotizacionThunk, listaSolicitantesCotizacionThunk, useAppDispatch, useAppSelector } from "@/store"
import dayjs from "dayjs"
import { useFormik } from "formik"
import { Fragment, useEffect, useState } from "react"
import { toast } from "react-toastify"


function AprobarCotizacion() {
    const dispatch = useAppDispatch()
    const { detalleCotizacion, listaSolicitantesCotizacion, listaItemsEnCotizacion } = useAppSelector((state) => state.cotizacion)
    const [isOpen, setIsOpen] = useState<boolean>(false)
    const [isAllItems, setIsAllItems] = useState<boolean>(false)
    const [itemsSeleccionado, setItemsSeleccionado] = useState<string[]>([])

    useEffect(() => {
        if (isOpen) {
            dispatch(listaSolicitantesCotizacionThunk({id_cotizacion: detalleCotizacion?.id}))
        }
    }, [isOpen])

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            solicitante: "",
            fecha_aprobacion: "",
        },
        onSubmit: async (values) => {
            try {
                let data: any = {solicitante_id: values.solicitante, fecha_aprobacion: dayjs(values.fecha_aprobacion).format('YYYY-MM-DD')}
                if (isAllItems) {
                    data = {...data, item_ids: listaItemsEnCotizacion.map(item => item.id.toString())}
                } else {
                    data = {...data, items_ids: itemsSeleccionado}
                }
                const response = await ApiService.fetchData({url: `/api/cotizaciones/${detalleCotizacion?.id}/aprobar-cotizacion/`, method: 'post', headers: {'Content-Type': 'application/json'}, data: JSON.stringify(data)})
                if (response.data) {
                    toast.success("Cotización Aprobada", {autoClose: 1000})
                    dispatch(detalleCotizacionThunk({id_cotizacion: detalleCotizacion?.id}))
                    setIsOpen(false)
                }
            } catch (error: any) {
                toast.error(error.response.data.detail || "Error al aprobar la cotizacion", {toastId: "Error al aprobar la cotizacion"})
            }
        }
    })

    return (
        <>
            <Tooltip text="Aprobar Cotizacion">
                <Button variant="solid" color="emerald" onClick={() => {setIsOpen(true)}} icon="HeroHandThumbUp" />
            </Tooltip>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen} isStaticBackdrop isStaticBackdropAnimation>
                <ModalHeader>
                    <Badge className="text-xl">Aprobar Cotización</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className="flex flex-col gap-4">
                        <div>
                            <Badge>Solicitante</Badge>
                            <SelectReact
                                name="solicitante"
                                options={listaSolicitantesCotizacion.map(soli => ({value: soli.id.toString(), label: soli.nombre_usuario}))}
                                noOptionsMessage={(e) => (`No Existe ${e.inputValue}`)}
                                placeholder="Seleccione un Solicitante"
                                value={{value: formik.values.solicitante, label: listaSolicitantesCotizacion.find(soli => soli.id.toString() === formik.values.solicitante)?.nombre_usuario || ""}}
                                onBlur={formik.handleBlur}
                                onChange={(e) => {formik.setFieldValue("solicitante", (e as TSelectOption).value)}}
                            />
                        </div>
                        <div>
                            <Badge>Fecha de Aprobación</Badge>
                            <Input
                                type="date"
                                name="fecha_aprobacion"
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                                value={formik.values.fecha_aprobacion}
                            />
                        </div>
                        {listaItemsEnCotizacion.length > 0 && (
                            <div className="flex flex-col gap-4">
                                <div className="flex flex-row gap-4">
                                    <Badge className="text-xl">Aprobar Items</Badge>
                                    <Checkbox
                                        name="aprobar"
                                        label="¿Aprobar todos los items?"
                                        onChange={(e) => {
                                            setIsAllItems(e.target.checked)
                                            if (e.target.checked) {
                                                setItemsSeleccionado(listaItemsEnCotizacion.map(it => it.id.toString()))
                                            } else {
                                                setItemsSeleccionado([])
                                            }
                                        }}
                                        checked={isAllItems}
                                    />
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    {listaItemsEnCotizacion.map((item, index) => (
                                        <Fragment key={index}>
                                            <div>
                                                <Badge>
                                                    Nombre
                                                    {!item.item_empresa && (
                                                        <Tooltip text="Sin relacion a la empresa">
                                                            <Button size="xs" icon="HeroInformationCircle"></Button>
                                                        </Tooltip>
                                                    )}
                                                </Badge>
                                                <div className="ml-4">{item.nombre_item}</div>
                                            </div>
                                            <div>
                                                <Badge>Cantidad</Badge>
                                                <div className="ml-4">{item.cantidad}</div>
                                            </div>
                                            <div>
                                                <Checkbox
                                                    name="item_seleccionado"
                                                    onChange={(e) => {
                                                        if (!e.target.checked) {
                                                            setItemsSeleccionado(prevLista => prevLista.filter(val => val !== item.id.toString()));
                                                        } else {
                                                            setItemsSeleccionado(prevLista => [...prevLista, item.id.toString()]);
                                                        }
                                                    }}
                                                    checked={itemsSeleccionado.includes(item.id.toString())}
                                                />
                                            </div>
                                        </Fragment>
                                    ))}
                                </div>
                            </div>
                        )}
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

export default AprobarCotizacion