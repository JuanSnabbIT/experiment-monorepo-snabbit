import Badge from "@/components/ui/Badge"
import Button from "@/components/ui/Button"
import Modal, { ModalBody, ModalFooter, ModalFooterChild, ModalHeader } from "@/components/ui/Modal"
import Tooltip from "@/components/ui/Tooltip"
import ApiService from "@/services/ApiService"
import { useAppDispatch } from "@/store"
import { useState } from "react"
import { toast } from "react-toastify"


import { ICotizacion, IItemCotizacion, ISolicitanteCotizacion } from "@/interface/cotizaciones.interface"

function EnviarCotizacionParaAprobar({ 
    cotizacion, 
    solicitantes = [], 
    items = [],
    onEnviarChange
}: { 
    cotizacion: ICotizacion, 
    solicitantes: ISolicitanteCotizacion[], 
    items: IItemCotizacion[],
    onEnviarChange?: () => void
}) {
    const dispatch = useAppDispatch()
    const [isOpen, setIsOpen] = useState<boolean>(false)


    return (
        <>
            <Tooltip text="Enviar Cotizacion para Aprobar">
                <Button variant="solid" onClick={() => {setIsOpen(true)}} icon="DuoMail"></Button>
            </Tooltip>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
                <ModalHeader>
                    <Badge className="text-xl">Enviar Cotización para Aprobar</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className="flex flex-col gap-4">
                        <div className="w-full">La cotización se enviara a estos correos: </div>
                        <div className="w-full flex flex-col gap-4">
                            {solicitantes && solicitantes.length > 0 ? solicitantes.map((soli, index) => (
                                <div key={index} className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Badge>Email</Badge>
                                        <div className="ml-4">{soli.email_usuario}</div>
                                    </div>
                                    <div>
                                        <Badge>Nombre</Badge>
                                        <div className="ml-4">{soli.nombre_usuario}</div>
                                    </div>
                                </div>
                            )) : (
                                <Badge className="text-xl">Sin Solicitantes</Badge>
                            )}
                            {items.length === 0 && (
                                <Badge className="text-xl">Sin Items en la Cotización</Badge>
                            )}
                        </div>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <ModalFooterChild></ModalFooterChild>
                    <ModalFooterChild>
                        <Button color="red" onClick={() => {setIsOpen(false)}}>Cancelar</Button>
                        <Button variant="solid" onClick={async () => {
                            if (solicitantes.length > 0 && items.length > 0) {
                                try {
                                    const response = await ApiService.fetchData<{detail: string}>({url: `/api/cotizaciones/${cotizacion?.id}/enviar-cotizacion-solicitantes/`, method: 'post'})
                                    if (response.data) {
                                        toast.success(response.data.detail, {autoClose: 1000})
                                        if (onEnviarChange) onEnviarChange()
                                        setIsOpen(false)
                                    }
                                } catch (error: any) {
                                    toast.error(error.response.data.detail || "Error al enviar la cotización", {toastId: "Error al enviar la cotización"})
                                }
                            } else {
                                toast.error("Añada por lo menos 1 solicitante y 1 item a la cotización", {toastId: "Añada por lo menos 1 solicitante a la cotización"})
                            }
                        }}>Enviar</Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    )
}

export default EnviarCotizacionParaAprobar