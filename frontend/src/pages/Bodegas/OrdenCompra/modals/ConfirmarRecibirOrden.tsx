import Badge from "@/components/ui/Badge"
import Button from "@/components/ui/Button"
import Modal, { ModalBody, ModalFooter, ModalFooterChild, ModalHeader } from "@/components/ui/Modal"
import Tooltip from "@/components/ui/Tooltip"
import { IItemEnOrdenCompra, IItemOrdenCompraEnStock } from "@/interface/bodega.interface"
import ApiService from "@/services/ApiService"
import { useAppSelector } from "@/store"
import { getErrorMessage } from "@/utils/errorHandlers"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "react-toastify"

type ResultadoConfirmacion = {
    itemsConCantidadesDesiguales: {
        item_orden: IItemEnOrdenCompra;
        item_stock: IItemOrdenCompraEnStock | undefined;
    }[];
    itemsSinBodegaYConCantidad: {
        item_orden: IItemEnOrdenCompra;
        item_stock: IItemOrdenCompraEnStock;
    }[];
    tiene_fecha: boolean;
    tiene_cotizacion: boolean;
    tiene_bodega_unica: boolean;
    tiene_items_recibir: boolean;
    bodega_unica_id: number | null;
}

function ConfirmarRecibirOrden({itemsARecibir} : {itemsARecibir: {item_orden: IItemEnOrdenCompra, item_stock: IItemOrdenCompraEnStock | undefined }[]}) {
    const navigate = useNavigate()
    const { detalleOrdenCompra } = useAppSelector((state) => state.bodega)
    const [isOpen, setIsOpen] = useState<boolean>(false)
    const [resul, setResul] = useState<ResultadoConfirmacion>()
    const [guiaPendiente, setGuiaPendiente] = useState<{existe: boolean; guia_id: number | null} | null>(null)

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
        const tiene_cotizacion = Boolean(detalleOrdenCompra?.relacion_cotizacion)
        const bodegasRecibo = new Set<number>()
        let tiene_items_recibir = false

        for (const { item_orden, item_stock } of itemsARecibir) {
            // Verificar si hay pares con cantidad desigual
            if (item_stock && item_orden.cantidad !== item_stock.cantidad) {
                itemsConCantidadesDesiguales.push({ item_orden, item_stock });
            }

            // Verificar si algún item_stock no tiene bodega_temporal y su cantidad es mayor a 0
            if (item_stock && item_stock.bodega_temporal === null && item_stock.cantidad > 0) {
                itemsSinBodegaYConCantidad.push({ item_orden, item_stock });
            }

            if (item_stock && item_stock.cantidad > 0) {
                tiene_items_recibir = true
                if (item_stock.bodega_temporal !== null) {
                    bodegasRecibo.add(item_stock.bodega_temporal)
                }
            }
        }

        const tiene_bodega_unica = bodegasRecibo.size <= 1
        const bodega_unica_id = bodegasRecibo.size === 1 ? Array.from(bodegasRecibo)[0] : null

        return {
            itemsConCantidadesDesiguales,
            itemsSinBodegaYConCantidad,
            tiene_fecha,
            tiene_cotizacion,
            tiene_bodega_unica,
            tiene_items_recibir,
            bodega_unica_id
        };
    }

    useEffect(() => {
        if (isOpen) {
            setResul(verificarCondiciones())
        }
    }, [isOpen])

    useEffect(() => {
        const obtenerGuiaPendiente = async () => {
            if (!isOpen || !resul || !detalleOrdenCompra?.id) {
                setGuiaPendiente(null)
                return
            }

            if (!resul.tiene_cotizacion || !resul.tiene_bodega_unica || !resul.tiene_items_recibir) {
                setGuiaPendiente(null)
                return
            }

            if (!resul.bodega_unica_id) {
                setGuiaPendiente(null)
                return
            }

            try {
                const response = await ApiService.fetchData<{existe: boolean; guia_id: number | null}>({
                    url: `/api/ordenes-compra/${detalleOrdenCompra.id}/guia-pendiente/`,
                    method: 'get',
                    params: { bodega_id: resul.bodega_unica_id }
                })
                setGuiaPendiente(response.data)
            } catch (error: unknown) {
                getErrorMessage(error)
                setGuiaPendiente(null)
            }
        }

        obtenerGuiaPendiente()
    }, [isOpen, resul, detalleOrdenCompra?.id])

    const puedeConfirmar = Boolean(
        resul && resul.itemsSinBodegaYConCantidad.length === 0 && resul.tiene_fecha
    )
    const puedeCrearGuia = Boolean(
        resul &&
            resul.itemsSinBodegaYConCantidad.length === 0 &&
            resul.tiene_fecha &&
            resul.tiene_cotizacion &&
            resul.tiene_bodega_unica &&
            resul.tiene_items_recibir
    )
    const tooltipCrearGuia = !resul
        ? "Confirmar recepcion y crear guia"
        : !resul.tiene_bodega_unica
            ? "Se requiere una sola bodega de recepcion"
            : !resul.tiene_cotizacion
                ? "La orden no tiene cotizacion asociada"
                : !resul.tiene_items_recibir
                    ? "Debe ingresar al menos un item con cantidad para recibir"
                    : !resul.tiene_fecha
                        ? "No puede confirmar sin fecha de compra"
                        : resul.itemsSinBodegaYConCantidad.length > 0
                            ? "Todos los items con cantidad deben tener bodega"
                            : guiaPendiente?.existe
                                ? "Agregar a guia existente"
                                : "Confirmar recepcion y crear guia"

    const labelCrearGuia = guiaPendiente?.existe ? "Agregar a guia existente" : "Guardar y crear guia"

    const buildPayload = () => {
        if (resul && resul.itemsConCantidadesDesiguales.length === 0) {
            return { estado: "5" }
        }
        return {
            estado: "4",
            items: itemsARecibir.map((value) => ({
                item_oc_id: value.item_orden.id,
                cantidad: value.item_stock?.cantidad ?? 0,
            })),
        }
    }

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
                                {!resul.tiene_cotizacion && (
                                    <div className="flex flex-col w-full gap-2">
                                        <div className="w-full">La orden no tiene una cotizacion asociada.</div>
                                    </div>
                                )}
                                {!resul.tiene_bodega_unica && (
                                    <div className="flex flex-col w-full gap-2">
                                        <div className="w-full">Se requiere una sola bodega de recepcion.</div>
                                    </div>
                                )}
                                {!resul.tiene_items_recibir && (
                                    <div className="flex flex-col w-full gap-2">
                                        <div className="w-full">Debe ingresar al menos un item con cantidad para recibir.</div>
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
                            isDisable={!puedeConfirmar}
                            variant="solid"
                            onClick={async () => {
                                try {
                                    const data = buildPayload()
                                    const response = await ApiService.fetchData({
                                        url: `/api/ordenes-compra/${detalleOrdenCompra?.id}/completar_orden_compra/`,
                                        method: 'post',
                                        headers: {'Content-Type': 'application/json'},
                                        data: JSON.stringify(data)
                                    })
                                    if (response.data) {
                                        toast.success("Orden actualizada", {autoClose: 1000})
                                        setIsOpen(false)
                                        navigate('/compras/lista-ordenes-compra/')
                                    }
                                } catch (error: unknown) {
                                    toast.error(getErrorMessage(error))
                                }
                            }}
                        >Guardar</Button>
                        <Tooltip text={tooltipCrearGuia}>
                            <div>
                                <Button
                                    isDisable={!puedeCrearGuia}
                                    variant="solid"
                                    color="emerald"
                                    onClick={async () => {
                                        try {
                                            const data = buildPayload()
                                            const response = await ApiService.fetchData({
                                                url: `/api/ordenes-compra/${detalleOrdenCompra?.id}/completar-y-crear-guia/`,
                                                method: 'post',
                                                headers: {'Content-Type': 'application/json'},
                                                data: JSON.stringify(data)
                                            })
                                            if (response.data) {
                                                const mensajeExito = guiaPendiente?.existe
                                                    ? "Orden actualizada y guia existente"
                                                    : "Orden actualizada y guia creada"
                                                toast.success(mensajeExito, {autoClose: 1000})
                                                setIsOpen(false)
                                                navigate('/compras/lista-ordenes-compra/')
                                            }
                                        } catch (error: unknown) {
                                            toast.error(getErrorMessage(error))
                                        }
                                    }}
                                >{labelCrearGuia}</Button>
                            </div>
                        </Tooltip>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    )
}

export default ConfirmarRecibirOrden
