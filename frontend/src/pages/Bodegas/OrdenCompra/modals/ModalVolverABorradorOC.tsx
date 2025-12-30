import Badge from "@/components/ui/Badge"
import Button from "@/components/ui/Button"
import Modal, { ModalBody, ModalFooter, ModalFooterChild, ModalHeader } from "@/components/ui/Modal"
import Tooltip from "@/components/ui/Tooltip"
import ApiService from "@/services/ApiService"
import { useAppDispatch, useAppSelector } from "@/store"
import { listaMisOrdenesDeCompraThunk, listaOrdenesCompraThunk } from "@/store/slices/bodega/bodegaSlice"
import { useState } from "react"
import { toast } from "react-toastify"



function ModalVolverABorradorOC({id_orden, onSuccess} : {id_orden: string | number, onSuccess?: () => void}) {
    const dispatch = useAppDispatch()
    const { personalizacionUsuario } = useAppSelector((state) => state.auth)
    const [isOpen, setIsOpen] = useState<boolean>(false)

    return (
        <>
            <Tooltip text="Volver a estado borrador">
                <Button variant="solid" icon="HeroArrowUturnLeft" color="zinc" onClick={() => {setIsOpen(true)}}></Button>
            </Tooltip>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
                <ModalHeader>
                    <Badge>Volver a estado borrador</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className="flex gap-2 flex-col">
                        <div className="w-full">Al volver a estado borrador tendra que aprobar nuevamente la orden y podra volver a editar la orden.</div>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <ModalFooterChild></ModalFooterChild>
                    <ModalFooterChild>
                        <Button color="red" onClick={() => {setIsOpen(false)}}>Cancelar</Button>
                        <Button variant="solid" onClick={async () => {
                            try {
                                const response = await ApiService.fetchData({url: `/api/ordenes-compra/${id_orden}/`, method: 'patch', headers: {'Content-Type': 'application/json'}, data: JSON.stringify({estado: "-"})})
                                if (response.data) {
                                    toast.success('Orden devuelta al estado "Borrador"', {autoClose: 1000})
                                    dispatch(listaOrdenesCompraThunk({id_empresa: personalizacionUsuario?.empresa}))
                                if (window.location.pathname.includes('/lista-ordenes-compra')) {
                                    dispatch(listaOrdenesCompraThunk({id_empresa: personalizacionUsuario?.empresa}))
                                } else if (window.location.pathname.includes('/lista-mis-ordenes')) {
                                    dispatch(listaMisOrdenesDeCompraThunk())
                                }
                                    if (onSuccess) onSuccess()
                                    setIsOpen(false)
                                }
                            } catch (error: any) {
                                toast.error(error.response.data)
                            }
                        }}>Aceptar</Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    )
}

export default ModalVolverABorradorOC
