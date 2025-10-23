import Checkbox from "@/components/form/Checkbox"
import Badge from "@/components/ui/Badge"
import Button from "@/components/ui/Button"
import Modal, { ModalBody, ModalFooter, ModalFooterChild, ModalHeader } from "@/components/ui/Modal"
import Tooltip from "@/components/ui/Tooltip"
import ApiService from "@/services/ApiService"
import { listaItemsEnCotizacionThunk, listaOrdenesDeCompraCotizacionThunk, useAppDispatch, useAppSelector } from "@/store"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "react-toastify"


function CrearOCDeCotizacion() {
    const dispatch = useAppDispatch()
    const navigate = useNavigate()
    const { detalleCotizacion, listaItemsEnCotizacion, listaOrdenesDeCompraCotizacion } = useAppSelector((state) => state.cotizacion)
    const [isOpen, setIsOpen] = useState<boolean>(false)
    const [proveedores, setProveedores] = useState<{id: string, nombre: string}[]>([])
    const [proveedorSeleccionado, setProveedorSeleccionado] = useState<{id: string, nombre: string} | undefined>()

    useEffect(() => {
        if (isOpen && detalleCotizacion) {
            dispatch(listaOrdenesDeCompraCotizacionThunk({id_cotizacion: detalleCotizacion.id}))
            dispatch(listaItemsEnCotizacionThunk({id_cotizacion: detalleCotizacion.id}))
        }
    }, [isOpen, detalleCotizacion])

    useEffect(() => {
        if (listaItemsEnCotizacion.length > 0 && listaItemsEnCotizacion.filter(item => item.item_empresa).length > 0 && isOpen) {
            let lista_proveedores: {id: string, nombre: string}[] = []
            listaItemsEnCotizacion.filter(item => item.item_empresa).forEach(item => {
                if (item.proveedor_empresa && item.nombre_proveedor) {
                    if (!lista_proveedores.some(pro => pro.id === item.proveedor_empresa?.toString())) {
                        lista_proveedores = [...lista_proveedores, {id: item.proveedor_empresa?.toString(), nombre: item.nombre_proveedor}]
                    }
                }
            })
            setProveedores(lista_proveedores)
        }
    }, [listaItemsEnCotizacion, isOpen])

    return (
        <>
            <Tooltip text="Crear OC">
                <Button variant="solid" color="amber" icon="HeroShoppingCart" onClick={() => {setIsOpen(true)}}></Button>
            </Tooltip>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
                <ModalHeader>
                    <Badge className="text-xl">Crear Orden de Compra</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className="flex flex-col gap-4">
                        <div>Seleccione un proveedor para crear la orden de compra</div>
                        {proveedores.map((prov, index) => (
                            <div key={index} className="flex flex-row gap-2">
                                <Badge>{prov.nombre}</Badge>
                                {listaOrdenesDeCompraCotizacion.find(oc => oc.proveedor.toString() === prov.id) ? (
                                    <>
                                        <Tooltip text="Ir a la Orden de Compra">
                                            <Button size="xs" variant="solid" color="violet" icon="HeroEye" onClick={() => {navigate(`/compras/detalle-orden-compra/${listaOrdenesDeCompraCotizacion.find(oc => oc.proveedor.toString() === prov.id)?.id}`)}}></Button>
                                        </Tooltip>
                                    </>
                                ) : (
                                    <Checkbox
                                        name="oc"
                                        checked={proveedorSeleccionado && proveedorSeleccionado.id === prov.id}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setProveedorSeleccionado({id: prov.id, nombre: prov.nombre})
                                            } else {
                                                setProveedorSeleccionado(undefined)
                                            }
                                        }}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                </ModalBody>
                <ModalFooter>
                    <ModalFooterChild></ModalFooterChild>
                    <ModalFooterChild>
                        <Button color="red" onClick={() => {setIsOpen(false)}}>Cancelar</Button>
                        <Button variant="solid" onClick={async () => {
                            try {
                                if (proveedorSeleccionado) {
                                    const response  = await ApiService.fetchData({url: `/api/cotizaciones/${detalleCotizacion?.id}/crear-orden-compra/`, method: 'post', headers: {'Content-Type': 'application/json'}, data: JSON.stringify({proveedor_id: proveedorSeleccionado.id})})
                                    if (response.data) {
                                        toast.success("Orden creada", {autoClose: 1000})
                                        setIsOpen(false)
                                    }
                                } else {
                                    toast.error("Seleccione un proveedor", {toastId: "Seleccione un proveedor"})
                                }
                            } catch (error: any) {
                                toast.error(error.response.data.error || "Error al crear la orden de compra")
                            }
                        }}>Crear OC</Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    )
}

export default CrearOCDeCotizacion