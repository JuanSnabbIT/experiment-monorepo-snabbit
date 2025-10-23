import Input from "@/components/form/Input"
import Label from "@/components/form/Label"
import Validation from "@/components/form/Validation"
import Button from "@/components/ui/Button"
import Modal, { ModalBody, ModalFooter, ModalFooterChild, ModalHeader } from "@/components/ui/Modal"
import Tooltip from "@/components/ui/Tooltip"
import ApiService from "@/services/ApiService"
import { useAppDispatch, useAppSelector } from "@/store"
import { listaInvitacionesThunk } from "@/store/slices/invitacion/invitacionSlice"
import { useFormik } from "formik"
import { useState } from "react"
import { toast } from "react-toastify"

interface EliminarInvitacionProps {
    invitacionId: string;
}

function EliminarInvitacion({ invitacionId }: EliminarInvitacionProps) {
    const dispatch = useAppDispatch()
    const [isOpen, setIsOpen] = useState<boolean>(false)

    return (
        <>
            <Tooltip text="Eliminar">
                <Button variant="solid" onClick={() => {setIsOpen(true)}} color="red" icon="HeroTrash"></Button>
            </Tooltip>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
                <ModalHeader>¿Está seguro que desea eliminar esta invitación?</ModalHeader>
                <ModalBody>
                    <div className="flex flex-col gap-4">
                        <p>Esta acción no se puede deshacer. La invitación será eliminada permanentemente.</p>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <ModalFooterChild></ModalFooterChild>
                    <ModalFooterChild>
                        <Button color='red' onClick={() => setIsOpen(false)}>Cancelar</Button>
                        <Button variant='solid' onClick={async () => {
                            try {
                                const response = await ApiService.fetchData({url: `/api/invitaciones-empresa/${invitacionId}/`, method: 'delete'})
                                if (response.status === 204) {
                                    toast.success("Invitación eliminada", {autoClose: 1000})
                                    dispatch(listaInvitacionesThunk())
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

export default EliminarInvitacion
