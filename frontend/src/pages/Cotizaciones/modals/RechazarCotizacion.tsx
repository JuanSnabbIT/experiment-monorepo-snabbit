import Badge from "@/components/ui/Badge"
import Button from "@/components/ui/Button"
import Modal, { ModalBody, ModalFooter, ModalFooterChild, ModalHeader } from "@/components/ui/Modal"
import Tooltip from "@/components/ui/Tooltip"
import ApiService from "@/services/ApiService"
import { useAppDispatch } from "@/store"
import { useState } from "react"
import { toast } from "react-toastify"


function RechazarCotizacion({ cotizacionId, onRechazarChange }: { cotizacionId: number | undefined, onRechazarChange?: () => void }) {
    const dispatch = useAppDispatch()
    const [isOpen, setIsOpen] = useState<boolean>(false)

    return (
        <>
            <Tooltip text="Rechazar Cotización">
                <Button variant="solid" color="red" icon="HeroHandThumbDown" onClick={() => {setIsOpen(true)}}></Button>
            </Tooltip>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
                <ModalHeader>
                    <Badge className="text-xl">Rechazar Cotización</Badge>
                </ModalHeader>
                <ModalBody>
                    <div>¿Seguro que desea rechazar la cotización?</div>
                </ModalBody>
                <ModalFooter>
                    <ModalFooterChild></ModalFooterChild>
                    <ModalFooterChild>
                        <Button color="red" onClick={() => {setIsOpen(false)}}>Cancelar</Button>
                        <Button variant="solid" color="red" onClick={async () => {
                            try {
                                const response = await ApiService.fetchData({url: `/api/cotizaciones/${cotizacionId}/`, method: 'patch', headers: {'Content-Type': 'application/json'}, data: JSON.stringify({estado: "rechazada"})})
                                if (response.data) {
                                    toast.success("Cotización Rechazada", {autoClose: 1000})
                                    if (onRechazarChange) onRechazarChange()
                                }
                            } catch (error: any) {
                                toast.error(error.response.data || "Error al rechazar la cotización")
                            }
                        }}>Rechazar Cotización</Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    )
}

export default RechazarCotizacion