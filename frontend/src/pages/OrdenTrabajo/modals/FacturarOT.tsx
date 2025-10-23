import Badge from "@/components/ui/Badge"
import Button from "@/components/ui/Button"
import Modal, { ModalBody, ModalFooter, ModalFooterChild, ModalHeader } from "@/components/ui/Modal"
import Tooltip from "@/components/ui/Tooltip"
import ApiService from "@/services/ApiService"
import { detalleOrdenTrabajoThunk, useAppDispatch, useAppSelector } from "@/store"
import { useState } from "react"
import { toast } from "react-toastify"


function FacturarOT() {
    const dispatch = useAppDispatch()
    const { detalleOrdenTrabajo } = useAppSelector((state) => state.ordenTrabajo)
    const [isOpen, setIsOpen] = useState<boolean>(false)

    return (
        <>
            <Tooltip text="Facturar OT">
                <Button variant="solid" icon="HeroBookmark" onClick={() => {setIsOpen(true)}}></Button>
            </Tooltip>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
                <ModalHeader>
                    <Badge className="text-xl">Facturar OT</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className="flex flex-col gap-4">
                        <div>¿Esta seguro(a) de querer facturar esta OT?</div>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <ModalFooterChild></ModalFooterChild>
                    <ModalFooterChild>
                        <Button color="red" onClick={() => {setIsOpen(false)}}>Cancelar</Button>
                        <Button variant="solid" onClick={async () => {
                            try {
                                const response = await ApiService.fetchData({url: `/api/ordenes-trabajo/${detalleOrdenTrabajo?.id}/`, method: 'patch', headers: {'Content-Type': 'application/json'}, data: JSON.stringify({estado: "facturada"})})
                                if (response.data) {
                                    toast.success("Orden facturada", {autoClose: 1000})
                                    dispatch(detalleOrdenTrabajoThunk({id_ordenTrabajo: detalleOrdenTrabajo?.id}))
                                    setIsOpen(false)
                                }
                            } catch (error: any) {
                                const mensajesError = Object.values(error.response.data).flat().join(" ");
                                toast.error(mensajesError || "Error al facturar la OT", {toastId: "Error al facturar la OT"})
                            }
                        }}>Facturar</Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    )
}

export default FacturarOT