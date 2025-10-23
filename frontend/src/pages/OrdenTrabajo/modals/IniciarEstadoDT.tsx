import Badge from "@/components/ui/Badge"
import Button from "@/components/ui/Button"
import Modal, { ModalBody, ModalFooter, ModalFooterChild, ModalHeader } from "@/components/ui/Modal"
import Tooltip from "@/components/ui/Tooltip"
import { IDetalleOrdenDeTrabajo } from "@/interface/ordenTrabajo.interface"
import ApiService from "@/services/ApiService"
import { listaDetalleTrabajoOTThunk, useAppDispatch, useAppSelector } from "@/store"
import { useRef, useState } from "react"
import SignatureCanvas from 'react-signature-canvas'
import { toast } from "react-toastify"


function IniciarEstadoDT({detalle} : {detalle: IDetalleOrdenDeTrabajo}) {
    const dispatch = useAppDispatch()
    const { detalleOrdenTrabajo } = useAppSelector((state) => state.ordenTrabajo)
    const [isOpen, setIsOpen] = useState<boolean>(false)
    const sigCanvas = useRef<SignatureCanvas | null>(null)

    const clear = () => {
        if (sigCanvas.current) {
            sigCanvas.current.clear();
        }
    };

    return (
        <>
            {detalle.estado === "en_proceso" && (
                <Tooltip text="En Proceso">
                    <Button variant="solid" icon="DuoPause" color="zinc" onClick={() => {
                        if (detalle.tecnico_asignado) {
                            setIsOpen(true)
                        } else {
                            toast.error("Seleccione un técnico para empezar el trabajo", {toastId: "Seleccione un técnico para empezar el trabajo"})
                        }
                    }} />
                </Tooltip>
            )}
            {detalle.estado === "pendiente" && (
                <Tooltip text="Pendiente">
                    <Button variant="solid" icon="DuoPlay" onClick={() => {
                        if (detalle.tecnico_asignado) {
                            setIsOpen(true)
                        } else {
                            toast.error("Seleccione un técnico para empezar el trabajo", {toastId: "Seleccione un técnico para empezar el trabajo"})
                        }
                    }} />
                </Tooltip>
            )}
            <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
                <ModalHeader>
                    <Badge>Iniciar Trabajo</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className="flex flex-col gap-4">
                        <div>
                            <Badge>Técnico Asignado</Badge>
                            <div className="ml-4">{detalle.nombre_tecnico}</div>
                        </div>
                        <div>
                            <div className="dark:bg-white" style={{ width: '100%', maxWidth: '600px', margin: '0 auto' }}>
                                <SignatureCanvas
                                    ref={(ref) => {sigCanvas.current = ref}}
                                    penColor="black"
                                    canvasProps={{
                                        height: 200,
                                        className: 'sigCanvas',
                                        style: { width: '100%', border: '1px solid #000' },
                                    }}
                                />
                            </div>
                            <Button className="mt-2" variant="solid" onClick={clear}>Limpiar</Button>
                        </div>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <ModalFooterChild></ModalFooterChild>
                    <ModalFooterChild>
                        <Button color="red" onClick={() => {setIsOpen(false)}}>Cancelar</Button>
                        <Button variant="solid" onClick={async () => {
                            try {
                                const response = await ApiService.fetchData({url: `/api/ordenes-trabajo/${detalleOrdenTrabajo?.id}/detalles-trabajo/${detalle.id}/iniciar-proceso/`, method: 'post', headers: {'Content-Type': 'application/json'}, data: JSON.stringify({
                                    firma_recibido_por: sigCanvas.current?.toDataURL("image/png")
                                })})
                                if (response.data) {
                                    toast.success("Insumo firmado y trabajo iniciado", {autoClose: 1000})
                                    dispatch(listaDetalleTrabajoOTThunk({id_orden: detalleOrdenTrabajo?.id}))
                                    setIsOpen(false)
                                }
                            } catch (error: any) {
                                const mensajesError = Object.values(error.response.data).flat().join(" ");
                                toast.error(mensajesError || "Error al inicar el trabajo", {toastId: "Error al inicar el trabajo"})
                            }
                        }}>Guardar</Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    )
}

export default IniciarEstadoDT