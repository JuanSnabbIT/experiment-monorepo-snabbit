import Badge from "@/components/ui/Badge"
import Button from "@/components/ui/Button"
import Modal, { ModalBody, ModalFooter, ModalFooterChild, ModalHeader } from "@/components/ui/Modal"
import Tooltip from "@/components/ui/Tooltip"
import { IItemEnOrdenCompra, IItemOrdenCompraEnStock } from "@/interface/bodega.interface"
import ApiService from "@/services/ApiService"
import { detalleEmpresaThunk, useAppDispatch, useAppSelector } from "@/store"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "react-toastify"


function ConfirmarRecibirOrden({itemsARecibir} : {itemsARecibir: {item_orden: IItemEnOrdenCompra, item_stock: IItemOrdenCompraEnStock | undefined }[]}) {
    const navigate = useNavigate()
    const { detalleOrdenCompra } = useAppSelector((state) => state.bodega)
    const [isOpen, setIsOpen] = useState<boolean>(false)
    const [resul, setResul] = useState<{itemsConCantidadesDesiguales: {item_orden: IItemEnOrdenCompra; item_stock: IItemOrdenCompraEnStock | undefined}[]; itemsSinBodegaYConCantidad: {item_orden: IItemEnOrdenCompra; item_stock: IItemOrdenCompraEnStock}[]; tiene_fecha: boolean}>()

    function verificarCondiciones() {
        const itemsConCantidadesDesiguales: {
            item_orden: IItemEnOrdenCompra;
            item_stock: IItemOrdenCompraEnStock | undefined;
        }[] = [];

        const itemsSinBodegaYConCantidad: {
            item_orden: IItemEnOrdenCompra;
            item_stock: IItemOrdenCompraEnStock;
        }[] = [];

        const tiene_fecha: boolean = detalleOrdenCompra && detalleOrdenCompra.fecha_compra ? true : false

        for (const { item_orden, item_stock } of itemsARecibir) {
            // Verificar si hay pares con cantidad desigual
            if (item_stock && item_orden.cantidad !== item_stock.cantidad) {
                itemsConCantidadesDesiguales.push({ item_orden, item_stock });
            }

            // Verificar si algún item_stock no tiene bodega_temporal y su cantidad es mayor a 0
            if (item_stock && item_stock.bodega_temporal === null && item_stock.cantidad > 0) {
                itemsSinBodegaYConCantidad.push({ item_orden, item_stock });
            }
        }

        return {
            itemsConCantidadesDesiguales,
            itemsSinBodegaYConCantidad,
            tiene_fecha
        };
    }

    useEffect(() => {
        if (isOpen) {
            setResul(verificarCondiciones())
        }
    }, [isOpen])

    return (
        <>
            <Tooltip text="Confirmar Recibir">
                <Button variant="solid" onClick={() => {setIsOpen(true)}}>Confirmar Recibir Items</Button>
            </Tooltip>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen} isStaticBackdrop={true}>
                <ModalHeader>
                    <Badge className="text-xl">Confirmar Recibir Items</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className="w-full flex flex-col">
                        {resul && (
                            <>
                                {resul.itemsConCantidadesDesiguales.length > 0 && (
                                    <div className="flex flex-col w-full gap-2">
                                        <div className="w-full">Desea recibir de manera parcial los siguientes items.</div>
                                        {resul.itemsConCantidadesDesiguales.map((item, index) => (
                                            <div key={index} className="flex flex-row gap-2">
                                                {/* <div className="w-full">{item.item_orden.item_empresa.nombre} {"=>"} Cantidad: {item.item_orden.cantidad} Recibida: {item.item_stock?.cantidad}</div> */}
                                                <div className="w-full">
                                                    <Badge>Item</Badge>
                                                    <div className="ml-4">{item.item_orden.item_empresa.nombre}</div>
                                                </div>
                                                <div className="w-full">
                                                    <Badge>Cantidad</Badge>
                                                    <div className="ml-4">{item.item_orden.cantidad}</div>
                                                </div>
                                                <div className="w-full">
                                                    <Badge>Cantidad Recibida</Badge>
                                                    <div className="ml-4">{item.item_stock?.cantidad}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {resul.itemsSinBodegaYConCantidad.length > 0 && (
                                    <div className="flex flex-col w-full gap-2">
                                        <div className="w-full">Estos items no tienen una bodega asignada.</div>
                                        {resul.itemsSinBodegaYConCantidad.map((item, index) => (
                                            <div key={index} className="flex flex-row gap-2">
                                                <div className="w-full">
                                                    <Badge>Item</Badge>
                                                    <div className="ml-4">{item.item_orden.item_empresa.nombre}</div>
                                                </div>
                                                <div className="w-full">
                                                    <Badge>Cantidad</Badge>
                                                    <div className="ml-4">{item.item_orden.cantidad}</div>
                                                </div>
                                                <div className="w-full">
                                                    <Badge>Cantidad Recibida</Badge>
                                                    <div className="ml-4">{item.item_stock?.cantidad}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {!resul.tiene_fecha && (
                                    <div className="flex flex-col w-full gap-2">
                                        <div className="w-full">No puede confirmar la orden si no tiene la fecha de compra.</div>
                                    </div>
                                )}
                                {resul.itemsConCantidadesDesiguales.length === 0 && resul.itemsSinBodegaYConCantidad.length === 0 && resul.tiene_fecha && (
                                    <div className="flex flex-col w-full gap-2">
                                        <div className="w-full">Al confirmar  la orden no se podra revertir.</div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </ModalBody>
                <ModalFooter>
                    <ModalFooterChild></ModalFooterChild>
                    <ModalFooterChild>
                        <Button color="red" onClick={() => {setIsOpen(false)}}>Cancelar</Button>
                        <Button 
                            isDisable={resul && !(resul.itemsSinBodegaYConCantidad.length === 0 && resul.tiene_fecha)}
                            variant="solid"
                            onClick={async () => {
                                try {
                                    let data = {}
                                    if (resul && resul.itemsConCantidadesDesiguales.length === 0) {
                                        Object.assign(data, {estado: '5'})
                                    } else {
                                        Object.assign(data, {
                                            estado: '4',
                                            items: itemsARecibir.map(value => {return {item_oc_id: value.item_orden.id, cantidad: value.item_stock?.cantidad}})
                                        })
                                    }
                                    const response = await ApiService.fetchData({url: `/api/ordenes-compra/${detalleOrdenCompra?.id}/completar_orden_compra/`, method: 'post', headers: {'Content-Type': 'application/json'}, data: JSON.stringify(data)})
                                    if (response.data) {
                                        toast.success("Orden actualizada", {autoClose: 1000})
                                        setIsOpen(false)
                                        navigate('/compras/lista-ordenes-compra/')
                                    }
                                } catch (error: any) {
                                    toast.error(error.response.data)
                                }
                            }}
                        >Guardar</Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    )
}

export default ConfirmarRecibirOrden