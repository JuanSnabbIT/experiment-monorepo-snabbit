import Icon from "@/components/icon/Icon"
import Badge from "@/components/ui/Badge"
import Button from "@/components/ui/Button"
import Modal, { ModalBody, ModalHeader } from "@/components/ui/Modal"
import { useAppSelector } from "@/store"
import { Dispatch, SetStateAction, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Fragment } from "react/jsx-runtime"


function ModalDetalleGuiaSalida({isOpen, setIsOpen} : {isOpen: boolean, setIsOpen: Dispatch<SetStateAction<boolean>>}) {
    const navigate = useNavigate()
    const { detalleGuiaSalidaBodega, listaItemsEnGuiaSalidaBodega } = useAppSelector((state) => state.bodega)

    return (
        <>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
                <ModalHeader>
                    <Badge className="text-xl">Detalle Guia de Salida</Badge>
                </ModalHeader>
                <ModalBody>
                    {detalleGuiaSalidaBodega ? (
                        <>
                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <Badge>Estado</Badge>
                                    <div className="ml-4">{detalleGuiaSalidaBodega?.estado_label}</div>
                                </div>
                                <div>
                                    <Badge>Creado Por</Badge>
                                    <div className="ml-4">{detalleGuiaSalidaBodega?.nombre_creado_por}</div>
                                </div>
                                <div>
                                    <Badge>Recibido Por</Badge>
                                    <div className="ml-4">{detalleGuiaSalidaBodega?.nombre_recibido_por}</div>
                                </div>
                                <div>
                                    <Badge>Motivo</Badge>
                                    <div className="ml-4">{detalleGuiaSalidaBodega?.motivo}</div>
                                </div>
                            </div>
                            <div className={`grid ${(detalleGuiaSalidaBodega?.estado === "R" || detalleGuiaSalidaBodega?.estado === "PR") ? "grid-cols-4" : "grid-cols-3"}`}>
                                <div className="col-span-1 border">
                                    <Badge>Item</Badge>
                                </div>
                                <div className="col-span-1 border">
                                    <Badge>Stock Original</Badge>
                                </div>
                                <div className="col-span-1 border">
                                    <Badge>Cantidad Rebajada</Badge>
                                </div>
                                {(detalleGuiaSalidaBodega?.estado === "R" || detalleGuiaSalidaBodega?.estado === "PR") && (
                                    <div className="col-span-1 border">
                                        <Badge>Cantidad Devuelta</Badge>
                                    </div>
                                )}
                                {listaItemsEnGuiaSalidaBodega.map((item, index) => (
                                    <Fragment key={index}>
                                        <div className="col-span-1 border">
                                            <div className="flex flex-col ml-4">
                                                <div className="w-full">{item.datos_stock.datos_item.nombre}</div>
                                                {/* <div className="w-full text-xs ml-2 flex gap-1"><Icon icon="DuoPenRuler" size="text-base" /> {item.datos_stock.datos_item.tamanio} {item.datos_stock.datos_item.unidad_label}</div> */}
                                                <div className="w-full mt-2">
                                                    <Button size="xs" className="!px-1" icon="DuoBox3" onClick={() => { if (item.datos_stock.datos_item.fabricante) navigate(`/registros/detalle-fabricante/${item.datos_stock.datos_item.fabricante}`) }}>{item.datos_stock.datos_item.datos_fabricante?.nombre || "Sin Fabricante"}</Button>
                                                </div>
                                                <div className="w-full">
                                                    <Button size="xs" className="!px-1" icon="DuoAlignJustify" onClick={() => { if (item.datos_stock.datos_item.categoria) navigate(`/registros/detalle-categoria/${item.datos_stock.datos_item.categoria}`) }}>{item.datos_stock.datos_item.datos_categoria?.nombre || "Sin Categoria"}</Button>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="col-span-1 border">
                                            <div className="ml-4">{detalleGuiaSalidaBodega?.estado === "P" ? item.datos_stock.cantidad : item.cantidad_original}</div>
                                        </div>
                                        <div className="col-span-1 border">
                                            <div className="ml-4">{item.cantidad_rebajada}</div>
                                        </div>
                                        {(detalleGuiaSalidaBodega?.estado === "R" || detalleGuiaSalidaBodega?.estado === "PR") && (
                                            <div className="col-span-1 border">
                                                <div className="ml-4">{item.cantidad_devuelta}</div>
                                            </div>
                                        )}
                                    </Fragment>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div> No se encontro la guia de salida.</div>
                    )}
                </ModalBody>
            </Modal>
        </>
    )
}

export default ModalDetalleGuiaSalida