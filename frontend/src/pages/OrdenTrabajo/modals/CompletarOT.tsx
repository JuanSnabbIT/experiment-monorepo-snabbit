import Icon from "@/components/icon/Icon"
import Badge from "@/components/ui/Badge"
import Button from "@/components/ui/Button"
import Modal, { ModalBody, ModalFooter, ModalFooterChild, ModalHeader } from "@/components/ui/Modal"
import Tooltip from "@/components/ui/Tooltip"
import ApiService from "@/services/ApiService"
import { checkCompletibilidadOTThunk, detalleOrdenTrabajoThunk, listaDetalleTrabajoOTThunk, useAppDispatch, useAppSelector } from "@/store"
import { useEffect, useState } from "react"
import { toast } from "react-toastify"


function CompletarOT() {
    const dispatch = useAppDispatch()
    const { detalleOrdenTrabajo, checkCompletibilidadOT } = useAppSelector((state) => state.ordenTrabajo)
    const [isOpen, setIsOpen] = useState<boolean>(false)

    useEffect(() => {
        if (detalleOrdenTrabajo && isOpen) {
            dispatch(checkCompletibilidadOTThunk({id_orden: detalleOrdenTrabajo.id}))
        }
    }, [detalleOrdenTrabajo, isOpen])

    return (
        <>
            <Tooltip text='Cambiar a Completada'>
                <Button variant='solid' color='amber' icon='HeroHandThumbUp' onClick={() => {setIsOpen(true)}} />
            </Tooltip>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
                <ModalHeader>
                    <Badge className="text-xl">Cambiar a Completada</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className="flex flex-col gap-4">
                        {checkCompletibilidadOT ? (
                            <>
                                {checkCompletibilidadOT.se_puede_completar ? (
                                    <div>Al cambiar a Completada no se puede deshacer</div>
                                ) : (!checkCompletibilidadOT.se_puede_completar && checkCompletibilidadOT.razones.length > 0 ? (
                                    checkCompletibilidadOT.razones.map((raz, index) => (
                                        <div key={index} className="flex flex-wrap gap-2 items-center">
                                            <Icon icon="DuoCircle"></Icon>
                                            {raz}
                                        </div>
                                    ))
                                ) : (
                                    <div></div>
                                ))}
                            </>
                        ) : ("No se pudo obtener si la OT se puede completar")}
                    </div>
                </ModalBody>
                <ModalFooter>
                    <ModalFooterChild></ModalFooterChild>
                    <ModalFooterChild>
                        <Button color="red" onClick={() => {setIsOpen(false)}}>Cancelar</Button>
                        {checkCompletibilidadOT && checkCompletibilidadOT.se_puede_completar ? (
                            <Button variant="solid" onClick={async () => {
                                try {
                                    const response = await ApiService.fetchData({url: `/api/ordenes-trabajo/${detalleOrdenTrabajo?.id}/`, method: 'patch', headers: {'Content-Type': 'application/json'}, data: JSON.stringify({estado: "completada"})})
                                    if (response.data) {
                                        toast.success("Orden de Trabajo actualizada", {autoClose: 1000})
                                        dispatch(detalleOrdenTrabajoThunk({id_ordenTrabajo: detalleOrdenTrabajo?.id}))
                                        setIsOpen(false)
                                    }
                                } catch (error: any) {
                                    const mensajesError = Object.values(error.response.data).flat().join(" ");
                                    toast.error(mensajesError || "Error al completar la OT", {toastId: "Error al completar la OT"})
                                }
                            }}>Completar</Button>
                        ) : (<Button variant="solid" isDisable>Completar</Button>)}
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    )
}


export default CompletarOT