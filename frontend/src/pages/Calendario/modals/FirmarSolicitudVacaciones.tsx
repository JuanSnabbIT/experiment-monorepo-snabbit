import Badge from "@/components/ui/Badge"
import Button from "@/components/ui/Button"
import Modal, { ModalBody, ModalFooter, ModalFooterChild, ModalHeader } from "@/components/ui/Modal"
import Tooltip from "@/components/ui/Tooltip"
import ApiService from "@/services/ApiService"
import { useAppDispatch, useAppSelector } from "@/store"
import { listaMisSolicitudesVacacionesThunk } from "@/store/slices/calendario/calendarioSlice"
import { useRef, useState } from "react"
import SignatureCanvas from 'react-signature-canvas'
import { toast } from "react-toastify"


function FirmarSolicitudVacaciones({solicitud_id} : {solicitud_id : number}) {
    const dispatch = useAppDispatch()
    const [isOpen, setIsOpen] = useState<boolean>(false)
    const sigCanvas = useRef<SignatureCanvas | null>(null)

    const clear = () => {
        if (sigCanvas.current) {
            sigCanvas.current.clear();
        }
    };

    return (
        <>
            <Tooltip text="Firmar Solicitud">
                <Button variant="solid" icon="HeroPencil" onClick={() => {setIsOpen(true)}}></Button>
            </Tooltip>
            <Modal
                isOpen={isOpen}
                setIsOpen={setIsOpen}
            >
                <ModalHeader>Firmar Solicitud</ModalHeader>
                <ModalBody>
                    <Badge className="text-lg">Firma</Badge>
                    <div style={{ width: '100%', maxWidth: '600px', margin: '0 auto' }}>
                        <div className="bg-white">
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
                </ModalBody>
                <ModalFooter>
                    <ModalFooterChild />
                    <ModalFooterChild>
                        <Button color="red" onClick={() => setIsOpen(false)}>
							Cancelar
						</Button>
						<Button variant="solid" onClick={async () => {
                            try {
                                const response = await ApiService.fetchData({url: `/api/solicitudes-vacaciones/${solicitud_id}/`, method: 'patch', headers: {'Content-Type': 'application/json'}, data: JSON.stringify({firma_usuario: sigCanvas.current?.toDataURL('image/png')})})
                                if (response.data) {
                                    toast.success("Solicitud Firmada", {autoClose: 1000})
                                    dispatch(listaMisSolicitudesVacacionesThunk())
                                }
                            } catch (error: any) {
                                toast.error(error.response.data)
                            }
                        }}>
							Guardar
						</Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    )
}

export default FirmarSolicitudVacaciones