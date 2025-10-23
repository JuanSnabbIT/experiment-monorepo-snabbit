import Badge from "@/components/ui/Badge"
import Button from "@/components/ui/Button"
import Modal, { ModalBody, ModalFooter, ModalFooterChild, ModalHeader } from "@/components/ui/Modal"
import Tooltip from "@/components/ui/Tooltip"
import ApiService from "@/services/ApiService"
import { useAppDispatch } from "@/store"
import { listaMisOrdenesDeCompraThunk, listaOrdenesCompraThunk } from "@/store/slices/bodega/bodegaSlice"
import { useState } from "react"
import { toast } from "react-toastify"


function AceptarORechazarOrdenCompra({id_orden, id_empresa} : {id_orden: string | number | undefined, id_empresa?: string | number | null}) {
    const dispatch = useAppDispatch()
    const [isOpen, setIsOpen] = useState<boolean>(false)

    return (
        <>
            <Tooltip text="Aceptar o Rechazar Orden">
                <Button variant="solid" onClick={() => {setIsOpen(true)}} color="amber" icon="HeroArrowRightCircle"></Button>
            </Tooltip>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
                <ModalHeader>
                    <Badge className="text-xl">¿Aceptar o Rechazar Orden?</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className="flex flex-col gap-2">
                        <div className="w-full">Si acepta o rechaza la orden no podra volver a modificar los datos.</div>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <ModalFooterChild></ModalFooterChild>
                    <ModalFooterChild>
                        <Button color="red" onClick={async () => {
                            try {
                                const response = await ApiService.fetchData({url: `/api/ordenes-compra/${id_orden}/`, method: 'patch', headers: {'Content-Type': 'application/json'}, data: JSON.stringify({estado: "2"})})
                                if (response.data) {
                                    if (id_empresa) {
                                        dispatch(listaOrdenesCompraThunk({id_empresa: id_empresa}))
                                    } else {
                                        dispatch(listaMisOrdenesDeCompraThunk())
                                    }
                                    toast.success("Orden rechazada", {autoClose: 1000})
                                }
                            } catch (error: any) {
                                toast.error(error.response.data)
                            }
                        }}>Rechazar Orden</Button>
                        <Button variant="solid" onClick={async () => {
                            try {
                                const response = await ApiService.fetchData({url: `/api/ordenes-compra/${id_orden}/`, method: 'patch', headers: {'Content-Type': 'application/json'}, data: JSON.stringify({estado: "1"})})
                                if (response.data) {
                                    if (id_empresa) {
                                        dispatch(listaOrdenesCompraThunk({id_empresa: id_empresa}))
                                    } else {
                                        dispatch(listaMisOrdenesDeCompraThunk())
                                    }
                                    toast.success("Orden aceptada", {autoClose: 1000})
                                }
                            } catch (error: any) {
                                toast.error(error.response.data)
                            }
                        }}>Aceptar Orden</Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    )
}

export default AceptarORechazarOrdenCompra