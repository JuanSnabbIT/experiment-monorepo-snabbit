import Badge from "@/components/ui/Badge"
import Button from "@/components/ui/Button"
import Modal, { ModalBody, ModalFooter, ModalFooterChild, ModalHeader } from "@/components/ui/Modal"
import Tooltip from "@/components/ui/Tooltip"
import ApiService from "@/services/ApiService"
import { useAppDispatch, useAppSelector } from "@/store"
import { detalleOrdenCompraThunk, listaOrdenesCompraThunk } from "@/store/slices/bodega/bodegaSlice"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "react-toastify"


function TerminarBorradorOC({id_orden} : {id_orden: string | number | undefined}) {
    const dispatch = useAppDispatch()
    const navigate = useNavigate()
    const { personalizacionUsuario } = useAppSelector((state) => state.auth)
    const [isOpen, setIsOpen] = useState<boolean>(false)

    useEffect(() => {
        if (id_orden && isOpen) {
            dispatch(detalleOrdenCompraThunk({id_orden}))
        }
    }, [id_orden, isOpen])

    return (
        <>
            <Tooltip text="Terminar Borrador">
                <Button variant="solid" color="amber" onClick={() => {setIsOpen(true)}}>Terminar Borrador</Button>
            </Tooltip>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
                <ModalHeader>
                    <Badge className="text-xl">Terminar Borrador</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className="flex flex-col gap-2 text-center">
                        <div className="w-full text-xl">¿Seguro que quiere terminar el borrador?</div>
                        <div className="w-full text-lg">No podra modificar los datos de la orden mas adelante.</div>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <ModalFooterChild></ModalFooterChild>
                    <ModalFooterChild>
                        <Button color="red" onClick={() => {setIsOpen(false)}}>Cancelar</Button>
                        <Button variant="solid" onClick={async () => {
                            try {
                                const response = await ApiService.fetchData({url: `/api/ordenes-compra/${id_orden}/`, method: 'patch', headers: {'Content-Type': 'application/json'}, data: JSON.stringify({estado: "0"})})
                                if (response.data) {
                                    toast.success("Orden de compra terminada.", {autoClose: 1000})
                                    dispatch(listaOrdenesCompraThunk({id_empresa: personalizacionUsuario?.empresa}))
                                    navigate('/compras/lista-ordenes-compra', {replace: true})
                                }
                            } catch (error: any) {
                                toast.error(error.response.data)
                            }
                        }}>Terminar</Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    )
}

export default TerminarBorradorOC