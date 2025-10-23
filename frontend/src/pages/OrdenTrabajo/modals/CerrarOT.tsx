import Badge from "@/components/ui/Badge"
import Button from "@/components/ui/Button"
import Modal, { ModalBody, ModalFooter, ModalFooterChild, ModalHeader } from "@/components/ui/Modal"
import Tooltip from "@/components/ui/Tooltip"
import { detalleOrdenTrabajoThunk, useAppDispatch, useAppSelector } from "@/store"
import { useState } from "react"
// import SeguimientoEnCerrarOT from "./components/SeguimientoEnCerrarOT"
import { toast } from "react-toastify"
import ApiService from "@/services/ApiService"


function CerrarOT() {
    const dispatch = useAppDispatch()
    const { detalleOrdenTrabajo } = useAppSelector((state) => state.ordenTrabajo)
    const [isOpen, setIsOpen] = useState<boolean>(false)

    return (
        <>
            <Tooltip text="Cerrar Orden">
                <Button variant="solid" color='red' icon='HeroHandRaised' onClick={() => {setIsOpen(true)}} />
            </Tooltip>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen} isStaticBackdrop={true}>
                <ModalHeader>
                    <Badge className="text-xl">Cerrar la Orden de Trabajo</Badge>
                </ModalHeader>
                <ModalBody>
                    {/* {listaDetallesSeguimientosOT && listaDetallesSeguimientosOT.detalles.length > 0 ? listaDetallesSeguimientosOT.detalles.map((detalle, index) => (
                        <div key={index} className="flex flex-col gap-4">
                            {detalle.seguimientos.length > 0 && detalle.seguimientos.map((seguimiento, index) => (
                                <Fragment key={index}>
                                    <SeguimientoEnCerrarOT seguimiento={seguimiento} id_orden={detalleOrdenTrabajo?.id} id_detalle={detalle.detalle_id} />
                                </Fragment>
                            ))}
                            {detalle.visita && (
                                <div className="w-full">
                                    {detalle.visita.asistencias.length > 0 && detalle.visita.asistencias.map((asistencia, index) => (
                                        <div className="w-full" key={index}>asistencia {asistencia.id}</div>
                                    ))}
                                    {detalle.visita.entregas.length > 0 && detalle.visita.entregas.map((entrega, index) => (
                                        <div className="w-full" key={index}>entrega {entrega.id}</div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )) : (
                        <div>Sin Detalles en la OT</div>
                    )} */}
                    <div>¿Esta seguro(a) de querer cerrar la OT?</div>
                </ModalBody>
                <ModalFooter>
                    <ModalFooterChild></ModalFooterChild>
                    <ModalFooterChild>
                        <Button color="red" onClick={() => {setIsOpen(false)}}>Cancelar</Button>
                        <Button variant="solid" color="red" onClick={async () => {
                            try {
                                const response = await ApiService.fetchData({url: `/api/ordenes-trabajo/${detalleOrdenTrabajo?.id}/`, method: "patch", headers: {'Content-Type': 'application/json'}, data: JSON.stringify({estado: "cerrada"})})
                                if (response.data) {
                                    toast.success("Orden cerrada", {autoClose: 1000})
                                    dispatch(detalleOrdenTrabajoThunk({id_ordenTrabajo: detalleOrdenTrabajo?.id}))
                                    setIsOpen(false)
                                }
                            } catch (error: any) {
                                const mensajesError = Object.values(error.response.data).flat().join(" ");
                                toast.error(mensajesError || "Error al cerrar la OT", {toastId: "Error al cerrar la OT"})
                            }
                        }}>Cerrar la OT</Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    )
}

export default CerrarOT