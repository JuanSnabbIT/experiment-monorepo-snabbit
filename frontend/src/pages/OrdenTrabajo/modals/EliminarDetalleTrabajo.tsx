import Badge from "@/components/ui/Badge"
import Button from "@/components/ui/Button"
import Modal, { ModalBody, ModalFooter, ModalFooterChild, ModalHeader } from "@/components/ui/Modal"
import Tooltip from "@/components/ui/Tooltip"
import { IDetalleOrdenDeTrabajo } from "@/interface/ordenTrabajo.interface"
import ApiService from "@/services/ApiService"
import { listaDetalleTrabajoOTThunk, useAppDispatch } from "@/store"
import { useState } from "react"
import { toast } from "react-toastify"


function EliminarDetalleTrabajo({detalle_trabajo} : {detalle_trabajo: IDetalleOrdenDeTrabajo}) {
    const dispatch = useAppDispatch()
    const [isOpen, setIsOpen] = useState<boolean>(false)

    return (
        <>
            <Tooltip text="Eliminar">
                <Button variant="solid" color="red" icon="HeroTrash" onClick={() => {setIsOpen(true)}} />
            </Tooltip>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
                <ModalHeader>
                    <Badge className="text-xl">Eliminar el Trabajo</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className="ml-4">¿Estas seguro(a) que deseas eliminar el trabajo?</div>
                    <div className="ml-4">Esta acción no se podra deshacer.</div>
                </ModalBody>
                <ModalFooter>
                    <ModalFooterChild></ModalFooterChild>
                    <ModalFooterChild>
                        <Button color="red" onClick={() => {setIsOpen(false)}}>Cancelar</Button>
                        <Button variant="solid" color="red" onClick={async () => {
                            try {
                                const response = await ApiService.fetchData({url: `/api/ordenes-trabajo/${detalle_trabajo.orden}/detalles-trabajo/${detalle_trabajo.id}/`, method: 'delete'})
                                if (response.status === 204) {
                                    toast.success("Trabajo eliminado", {toastId: "Trabajo eliminado", autoClose: 1000})
                                    setIsOpen(false)
                                    dispatch(listaDetalleTrabajoOTThunk({id_orden: detalle_trabajo.orden}))
                                }
                            } catch (error: any) {
                                const mensajesError = Object.values(error.response.data).flat().join(" ");
                                toast.error(mensajesError || "Error al eliminar el trabajo", {toastId: "Error al eliminar el trabajo"})
                            }
                        }}>Eliminar</Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    )
}

export default EliminarDetalleTrabajo