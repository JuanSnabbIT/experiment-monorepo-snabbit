import Badge from "@/components/ui/Badge"
import Button from "@/components/ui/Button"
import Modal, { ModalBody, ModalFooter, ModalFooterChild, ModalHeader } from "@/components/ui/Modal"
import Tooltip from "@/components/ui/Tooltip"
import ApiService from "@/services/ApiService"
import { detalleRendicionThunk, useAppDispatch, useAppSelector } from "@/store"
import { useEffect, useState } from "react"
import { toast } from "react-toastify"


function CambiarEstadoRendicion() {
    const dispatch = useAppDispatch()
    const { detalleRendicion } = useAppSelector((state) => state.rendicion)
    const [isOpen, setIsOpen] = useState<boolean>(false)

    useEffect(() => {
        if (isOpen) {
            dispatch(detalleRendicionThunk({id_rendicion: detalleRendicion?.id}))
        }
    }, [isOpen])

    return (
        <>
            <Tooltip text={detalleRendicion?.estado === "0" ? 'Pasar a "En Espera de Aprobación"' : detalleRendicion?.estado === "1" ? "Aprobar / Rechazar Rendición" : detalleRendicion?.estado === "2" ? "Pagar Rendición" : detalleRendicion?.estado === "3" ? "Rechazada" : detalleRendicion?.estado === "4" ? "Pagada" : ""}>
                <Button variant="solid" color={detalleRendicion?.estado === "3" ? "red" : detalleRendicion?.estado === "4" ? "emerald" : "blue"} icon={detalleRendicion?.estado === "0" ? "HeroHandRaised" : detalleRendicion?.estado === "1" ? "HeroEllipsisHorizontalCircle" : detalleRendicion?.estado === "2" ? "HeroCurrencyDollar" : detalleRendicion?.estado === "3" ? "HeroXMark" : detalleRendicion?.estado === "4" ? "HeroHandThumbUp" : ""} isDisable={detalleRendicion?.estado === "3"}  onClick={() => {
                    if (detalleRendicion?.estado != "3" && detalleRendicion?.estado != "4") {
                        setIsOpen(true)
                    }
                }}/>
            </Tooltip>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
                <ModalHeader>
                    <Badge className="text-xl">Cambiar Estado</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className="flex flex-col gap-4">
                        <div>{detalleRendicion?.estado ===  "0" ? "La rendición no se podra editar" : detalleRendicion?.estado === "1" ? "La rendición se puede aprobar o rechazar" : detalleRendicion?.estado === "2" ? "La rendición se pagará" : ""}</div>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <ModalFooterChild>
                        {detalleRendicion?.estado === "1" && (
                            <Button variant="solid" color="red" onClick={async () => {
                                try {
                                    const response = await ApiService.fetchData({url: `/api/rendiciones/${detalleRendicion.id}/`, method: 'patch', headers: {'Content-Type': 'application/json'}, data: JSON.stringify({estado: "3"})})
                                    if (response.data) {
                                        toast.success("Rendición rechazada", {autoClose: 1000})
                                        setIsOpen(false)
                                        dispatch(detalleRendicionThunk({id_rendicion: detalleRendicion.id}))
                                    }
                                } catch (error: any) {
                                    const mensajesError = Object.values(error.response.data).flat().join(" ");
                                    toast.error(mensajesError || "Error al rechazar la rendición", {toastId: "Error al rechazar la rendición"})
                                }
                            }}>Rechazar</Button>
                        )}
                    </ModalFooterChild>
                    <ModalFooterChild>
                        <Button color="red" onClick={() => {setIsOpen(false)}}>Cancelar</Button>
                        <Button variant="solid" onClick={async () => {
                            try {
                                const response = await ApiService.fetchData({url: `/api/rendiciones/${detalleRendicion?.id}/`, method: 'patch', headers: {'Content-Type': 'application/json'}, data: JSON.stringify({
                                    estado: detalleRendicion?.estado === "0" ? "1" : detalleRendicion?.estado === "1" ? "2" : detalleRendicion?.estado === "2" ? "4" : ""
                                })})
                                if (response.data) {
                                    setIsOpen(false)
                                    dispatch(detalleRendicionThunk({id_rendicion: detalleRendicion?.id}))
                                }
                            } catch (error: any) {
                                const mensajesError = Object.values(error.response.data).flat().join(" ");
                                toast.error(mensajesError || "Error al cambiar el estado de la rendicion", {toastId: "Error al cambiar el estado de la rendicion"})
                            }
                        }}>{detalleRendicion?.estado === "0" ? "En Espera de Aprobación" : detalleRendicion?.estado === "1" ? "Aprobar" : detalleRendicion?.estado === "2" ? "Pagar" : ""}</Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    )
}

export default CambiarEstadoRendicion