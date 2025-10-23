import Badge from "@/components/ui/Badge"
import Button from "@/components/ui/Button"
import Modal, { ModalBody, ModalFooter, ModalFooterChild, ModalHeader } from "@/components/ui/Modal"
import Tooltip from "@/components/ui/Tooltip"
import { IGuiaSalida } from "@/interface/bodega.interface"
import ApiService from "@/services/ApiService"
import { listaGuiaSalidaPorBodegaThunk, useAppDispatch } from "@/store"
import { useState } from "react"
import { toast } from "react-toastify"


function VolverAPendienteGuiaSalida({guia_salida} : {guia_salida: IGuiaSalida}) {
    const dispatch = useAppDispatch()
    const [isOpen, setIsOpen] = useState<boolean>(false)

    return (
        <>
            <Tooltip text="Volver a Pendiente">
                <Button variant="solid" icon="HeroArrowUturnLeft" color="zinc" onClick={() => {setIsOpen(true)}} />
            </Tooltip>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
                <ModalHeader>
                    <Badge className="text-xl">Volver a Pendiente</Badge>
                </ModalHeader>
                <ModalBody>
                    <div>¿Esta seguro(a) de regresar a un estado anterior a la Guia de Salida?</div>
                </ModalBody>
                <ModalFooter>
                    <ModalFooterChild></ModalFooterChild>
                    <ModalFooterChild>
                        <Button icon="red" onClick={() => {setIsOpen(false)}}>Cancelar</Button>
                        <Button variant="solid" onClick={async () => {
                            try {
                                // const response = await ApiService.fetchData({url: `/api/guia-salida/${guia_salida.id}/`, method: 'patch', headers: {'Content-Type': 'application/json'}, data: JSON.stringify({estado: "P"})})
                                const response = await ApiService.fetchData({url: `/api/guia-salida/${guia_salida.id}/volver-pendiente/`, method: 'post'})
                                if (response.data) {
                                    toast.success("Guia devuelta a estado pendiente", {autoClose: 1000})
                                    dispatch(listaGuiaSalidaPorBodegaThunk({id_bodega: guia_salida.bodega}))
                                    setIsOpen(false)
                                }
                            } catch (error: any) {
                                const mensajesError = Object.values(error.response.data)
                                    .flat() // Aplana los arrays en caso de que haya más de uno
                                    .join(" "); // Une los mensajes en una sola cadena
                                toast.error(mensajesError, {toastId: "Error al regresar a pendiente la guia de salida"})
                            }
                        }}>Aceptar</Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    )
}

export default VolverAPendienteGuiaSalida