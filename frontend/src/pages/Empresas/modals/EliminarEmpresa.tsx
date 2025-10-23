import Button from "@/components/ui/Button"
import Modal, { ModalBody, ModalFooter, ModalFooterChild, ModalHeader } from "@/components/ui/Modal"
import ApiService from "@/services/ApiService"
import { useAppDispatch } from "@/store"
import { useState } from "react"
import { toast } from "react-toastify"
import { listaEmpresasThunk } from "@/store/slices/empresa/empresaSlice"
import Tooltip from "@/components/ui/Tooltip"
import Badge from "@/components/ui/Badge"

interface EliminarEmpresaProps {
    empresaId: string;
}

function EliminarEmpresa({ empresaId }: EliminarEmpresaProps) {
    const dispatch = useAppDispatch()
    const [isOpen, setIsOpen] = useState<boolean>(false)

    return (
        <>
            <Tooltip text='Eliminar'>
                <Button variant="solid" onClick={() => {setIsOpen(true)}} icon="HeroMinusCircle" color="red"/>
            </Tooltip>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
                <ModalHeader>
                    <Badge className="text-xl">¿Está seguro que desea eliminar esta Empresa?</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className="flex flex-col gap-4">
                        <p>Esta acción no se puede deshacer. La empresa será eliminada permanentemente.</p>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <ModalFooterChild></ModalFooterChild>
                    <ModalFooterChild>
                        <Button color='red' onClick={() => setIsOpen(false)}>Cancelar</Button>
                        <Button variant='solid' onClick={async () => {
                            try {
                                const response = await ApiService.fetchData({url: `/api/empresas/${empresaId}/`, method: 'delete'})
                                if (response.status === 204) {
                                    toast.success("Empresa eliminada", {autoClose: 1000})
                                    dispatch(listaEmpresasThunk())
                                    setIsOpen(false)
                                }
                            } catch (error: any) {
                                toast.error(error.response.data.detail)
                            }
                        }}>Eliminar</Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    )
}

export default EliminarEmpresa
