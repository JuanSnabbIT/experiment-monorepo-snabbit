import Badge from "@/components/ui/Badge"
import Button from "@/components/ui/Button"
import Modal, { ModalBody, ModalFooter, ModalFooterChild, ModalHeader } from "@/components/ui/Modal"
import Tooltip from "@/components/ui/Tooltip"
import { ICompra } from "@/interface/bodega.interface"
import ApiService from "@/services/ApiService"
import { listaComprasThunk, useAppDispatch } from "@/store"
import { useEffect, useState } from "react"
import { toast } from "react-toastify"


function EliminarCompra({compra} : {compra: ICompra}) {
    const dispatch = useAppDispatch()
    const [isOpen, setIsOpen] = useState<boolean>(false)

    return (
        <>
            <Tooltip text="Eliminar Compra">
                <Button variant="solid" color="red" icon="HeroTrash" onClick={() => {setIsOpen(true)}} />
            </Tooltip>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
                <ModalHeader>
                    <Badge className="text-xl">Eliminar la Compra</Badge>
                </ModalHeader>
                <ModalBody>
                    <div>¿Seguro que quieres elimnar la compra?</div>
                </ModalBody>
                <ModalFooter>
                    <ModalFooterChild></ModalFooterChild>
                    <ModalFooterChild>
                        <Button color="red" onClick={() => {setIsOpen(false)}}>Cancelar</Button>
                        <Button variant="solid" color="red" onClick={async () => {
                            try {
                                const response = await ApiService.fetchData({url: `/api/compras/${compra.id}/`, method: 'delete'})
                                if (response.status === 204) {
                                    toast.success("Compra eliminada", {autoClose: 1000})
                                    dispatch(listaComprasThunk())
                                }
                            } catch (error: any) {
                                toast.error(error.response.data || "Error al eliminar la compra", {toastId: "Error al eliminar la compra"})
                            }
                        }}>Eliminar</Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    )
}

export default EliminarCompra