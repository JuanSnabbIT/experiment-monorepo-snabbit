import Button from "@/components/ui/Button"
import Modal, { ModalBody, ModalFooter, ModalFooterChild, ModalHeader } from "@/components/ui/Modal"
import Tooltip from "@/components/ui/Tooltip"
import ApiService from "@/services/ApiService"
import { useAppDispatch } from "@/store"
import { listaSolicitudesVacacionesThunk } from "@/store/slices/calendario/calendarioSlice"
import { useState } from "react"
import { toast } from "react-toastify"


function EliminarSolicitudVacaciones({ id_solicitud } : { id_solicitud: number}) {
    const [isOpen, setIsOpen] = useState<boolean>(false)
    const dispatch = useAppDispatch()

    return (
        <>
            <Tooltip text='Eliminar'>
                <Button variant="solid" onClick={() => {setIsOpen(true)}} icon="HeroMinusCircle" color="red" />
            </Tooltip>
            <Modal
                isOpen={isOpen}
                setIsOpen={setIsOpen}
            >
                <ModalHeader>¿Estas Seguro(a) de Eliminar la Solicitud?</ModalHeader>
                <ModalBody>
                    <div className="flex flex-col gap-4">
                        <p>Esta acción no se puede deshacer. La solicitud será eliminada permanentemente.</p>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <ModalFooterChild></ModalFooterChild>
                    <ModalFooterChild>
                        <Button color='red' onClick={() => setIsOpen(false)}>Cancelar</Button>
                        <Button variant='solid' onClick={ async () => {
                            try {
                                const response = await ApiService.fetchData({url: `/api/solicitudes-vacaciones/${id_solicitud}/`, method: 'delete'})
                                if (response.status === 204) {
                                    toast.success("Solicitud Eliminada", {autoClose: 1000})
                                    dispatch(listaSolicitudesVacacionesThunk())
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

export default EliminarSolicitudVacaciones