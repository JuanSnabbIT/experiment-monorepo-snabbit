import SelectReact, { TSelectOption } from "@/components/form/SelectReact"
import Badge from "@/components/ui/Badge"
import Button from "@/components/ui/Button"
import Modal, { ModalBody, ModalFooter, ModalFooterChild, ModalHeader } from "@/components/ui/Modal"
import ApiService from "@/services/ApiService"
import { detalleGuiaSalidaBodegaThunk, listaGuiaSalidaPorBodegaThunk, listaUsuariosTodaLaEmpresaThunk, useAppDispatch, useAppSelector } from "@/store"
import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react"
import SignatureCanvas from 'react-signature-canvas'
import { toast } from "react-toastify"


function AprobarGuiaSalida({id_guia, bodegaSelected, isOpen, setIsOpen, onSuccess} : {id_guia: number | undefined, bodegaSelected: string | undefined, isOpen: boolean, setIsOpen: Dispatch<SetStateAction<boolean>>, onSuccess?: () => void}) {
    const dispatch = useAppDispatch()
    const sigCanvas = useRef<SignatureCanvas | null>(null)
    const { personalizacionUsuario } = useAppSelector((state) => state.auth)
    const { listaUsuariosTodaLaEmpresa } = useAppSelector((state) => state.empresa)
    const { detalleGuiaSalidaBodega } = useAppSelector((state) => state.bodega)
    const [recibido, setRecibido] = useState<{value: string, label: string} | undefined>()
    // const [optUsuarios, setOptUsuarios] = useState<{value: string, label: string}[]>([])

    const clear = () => {
        if (sigCanvas.current) {
            sigCanvas.current.clear();
        }
    };

    useEffect(() => {
        if (isOpen && personalizacionUsuario && personalizacionUsuario.empresa) {
            dispatch(listaUsuariosTodaLaEmpresaThunk({id_empresa: personalizacionUsuario.empresa}))
        }
    }, [isOpen, personalizacionUsuario])

    useEffect(() => {
        if (isOpen && id_guia) {
            dispatch(detalleGuiaSalidaBodegaThunk({id_guia}))
        }
    }, [id_guia, isOpen])

    return (
        <>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
                <ModalHeader>
                    <Badge className="text-xl">Aprobar Guia</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className="flex flex-col gap-4">
                        {detalleGuiaSalidaBodega && (!detalleGuiaSalidaBodega.recibido_por) && (
                            <div>
                                <Badge>Recibido Por</Badge>
                                <SelectReact
                                    name="recibido_por"
                                    placeholder="Seleccione un usuario"
                                    options={listaUsuariosTodaLaEmpresa.map(user => ({value: user.id.toString(), label: user.nombre_usuario}))}
                                    onChange={(e) => {
                                        if (e) {
                                            setRecibido((e as TSelectOption))
                                        }
                                    }}
                                    value={recibido}
                                />
                            </div>
                        )}
                        <div>
                            <Badge>Firma</Badge>
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
                        <Button color="red" onClick={() => {setIsOpen(false); clear()}}>Cancelar</Button>
                        <Button variant="solid" onClick={async () => {
                            try {
                                let data = {firma_recibido_por: sigCanvas.current?.toDataURL('image/png')}
                                if (recibido) {
                                    Object.assign(data, {recibido_por: recibido.value})
                                }
                                const response = await ApiService.fetchData({url: `/api/guia-salida/${id_guia}/aprobar-guia/`, method: 'post', headers: {'Content-Type': 'application/json'}, data: JSON.stringify(data)})
                                if (response.data) {
                                    toast.success("Guia aprobada", {autoClose: 1000})
                                    clear()
                                    setIsOpen(false)
                                    dispatch(listaGuiaSalidaPorBodegaThunk({id_bodega: bodegaSelected}))
                                    onSuccess && onSuccess()
                                }
                            } catch (error: any) {
                                const msg = error?.response?.data?.detail || error?.response?.data || "Error al aprobar guía"
                                toast.error(msg)
                            }
                        }}>Aprobar</Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    )
}


export default AprobarGuiaSalida
