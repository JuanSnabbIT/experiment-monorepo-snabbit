import Badge from "@/components/ui/Badge"
import Button from "@/components/ui/Button"
import Modal, { ModalBody, ModalFooter, ModalFooterChild, ModalHeader } from "@/components/ui/Modal"
import ApiService from "@/services/ApiService"
import { useAppDispatch, useAppSelector } from "@/store"
import { detalleOrdenCompraThunk } from "@/store/slices/bodega/bodegaSlice"
import { useState } from "react"
import { toast } from "react-toastify"


function EliminarItemOrdenCompra({id_item} : {id_item: number}) {
    const dispatch = useAppDispatch()
    const [isOpen, setIsOpen] = useState<boolean>(false)
    const { detalleOrdenCompra } = useAppSelector((state) => state.bodega)

    return (
        <>
            <Button className="m-2" variant="solid" color="red" onClick={() => {setIsOpen(true)}}>Eliminar</Button>
            <Modal
                isOpen={isOpen}
                setIsOpen={setIsOpen}
            >
                <ModalHeader>
                    <Badge>¿Esta Seguro de Eliminar este Item?</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className="flex">
                        <div className="w-full">Esta accion no se puede deshacer.</div>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <ModalFooterChild></ModalFooterChild>
                    <ModalFooterChild>
                        <Button color="red" onClick={() => {setIsOpen(false)}}>Cancelar</Button>
                        <Button variant="solid" color="red" onClick={async () => {
                            try {
                                const response = await ApiService.fetchData({url: `/api/ordenes-compra/${detalleOrdenCompra?.id}/items-en-orden-compra/${id_item}/`, method: 'delete'})
                                if (response.status === 204) {
                                    toast.success("Item Eliminado", {autoClose: 1000})
                                    dispatch(detalleOrdenCompraThunk({id_orden: detalleOrdenCompra?.id}))
                                    setIsOpen(false)
                                }
                            } catch (error: any) {
                                toast.error(error.response.data)
                            }
                        }}>Eliminar</Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    )
}

export default EliminarItemOrdenCompra