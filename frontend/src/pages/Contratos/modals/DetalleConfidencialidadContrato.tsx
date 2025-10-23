import Badge from "@/components/ui/Badge"
import Button from "@/components/ui/Button"
import Modal, { ModalBody, ModalHeader } from "@/components/ui/Modal"
import Tooltip from "@/components/ui/Tooltip"
import { listaFirmasConfidencialidadThunk, useAppDispatch, useAppSelector } from "@/store"
import dayjs from "dayjs"
import { useEffect, useState } from "react"
import CrearConfidencialidadContrato from "./CrearConfidencialidadContrato"
import EditarConfidencialidadContrato from "./EditarConfidencialidadContrato"
import EliminarConfidencialidadContrato from "./EliminarConfidencialidadContrato"


function DetalleConfidencialidadContrato() {
    const dispatch = useAppDispatch()
    const { detalleContratoEmpresaCliente, listaFirmasConfidencialidad } = useAppSelector((state) => state.contrato)
    const [isOpen, setIsOpen] = useState<boolean>(false)

    useEffect(() => {
        if (detalleContratoEmpresaCliente && isOpen) {
            dispatch(listaFirmasConfidencialidadThunk({id_contrato: detalleContratoEmpresaCliente.id}))
        }
    }, [detalleContratoEmpresaCliente, isOpen])

    return (
        <>
            <div className="hidden md:flex">
                <Tooltip text="Confidencialidad">
                    <Button  variant="solid" icon="DuoLockedFolder" color="zinc" onClick={() => {setIsOpen(true)}}>Confidencialidad</Button>
                </Tooltip>
            </div>
            <div className="md:hidden">
                <Tooltip text="Confidencialidad">
                    <Button variant="solid" icon="DuoLockedFolder" color="zinc" onClick={() => {setIsOpen(true)}}></Button>
                </Tooltip>
            </div>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen} isStaticBackdrop={true} isStaticBackdropAnimation={false}>
                <ModalHeader>
                    <Badge className="text-xl">Firmas de Confidencialidad <div className="ml-2"><CrearConfidencialidadContrato /></div></Badge>
                </ModalHeader>
                <ModalBody>
                    <div className="flex flex-col gap-4 overflow-auto">
                        {listaFirmasConfidencialidad.length > 0 ? (
                            listaFirmasConfidencialidad.map((firma, index) => (
                                <div className="grid grid-cols-2 gap-4 border border-blue-500 rounded-xl p-4" key={index}>
                                    <div className="col-span-full flex justify-end gap-2">
                                        <EditarConfidencialidadContrato firma={firma} />
                                        <EliminarConfidencialidadContrato firma={firma} />
                                    </div>
                                    <div className="col-span-full">
                                        <Badge>Titulo</Badge>
                                        <div className="ml-4">{firma.titulo_acuerdo}</div>
                                    </div>
                                    <div className="col-span-full">
                                        <Badge>Contenido</Badge>
                                        <div className="ml-4">{firma.contenido_acuerdo}</div>
                                    </div>
                                    <div>
                                        <Badge>Nombre Usuario</Badge>
                                        <div className="ml-4">{firma.nombre_usuario}</div>
                                    </div>
                                    <div>
                                        <Badge>Fecha de Envio</Badge>
                                        <div className="ml-4">{dayjs(firma.fecha_envio).format("DD/MM/YYYY")}</div>
                                    </div>
                                    <div>
                                        <Badge>Fecha de Firma</Badge>
                                        <div className="ml-4">{dayjs(firma.fecha_firma).format("DD/MM/YYYY")}</div>
                                    </div>
                                    <div>
                                        <Badge>Firmado</Badge>
                                        <div className="ml-4">{firma.firmado ? "Sí" : "No"}</div>
                                    </div>
                                    {firma.firmado && (
                                        <div className="col-span-full">
                                            <Badge>Firma</Badge>
                                            <div className="p-2">
                                                <img className="dark:bg-white" src={firma.archivo_firma} alt="" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div>No existen confidencialidades</div>
                        )}
                    </div>
                </ModalBody>
            </Modal>
        </>
    )
}

export default DetalleConfidencialidadContrato