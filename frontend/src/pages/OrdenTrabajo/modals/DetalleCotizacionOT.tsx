import { useEffect, useState } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal, { ModalBody, ModalFooter, ModalFooterChild, ModalHeader } from "@/components/ui/Modal";
import { useNavigate } from "react-router-dom";
import Tooltip from "@/components/ui/Tooltip";
import { useAppSelector } from "@/store";

function DetalleCotizacionOT({ id_detalle }: { id_detalle: number | undefined; setDetalleTrabajo: (detalle: any) => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const [detalle, setDetalle] = useState<any>(null);

    const navigate = useNavigate();
    const { detalleCotizacion } = useAppSelector((state) => state.cotizacion);

    useEffect(() => {
        if (id_detalle && detalleCotizacion) {
            const detalleEncontrado = detalleCotizacion.items.find((item: any) => item.id === id_detalle);
            setDetalle(detalleEncontrado);
            setIsOpen(true);
        }
    }, [id_detalle, detalleCotizacion]);

    if (!detalle) return null;

    return (
        
        <Modal isOpen={isOpen} setIsOpen={setIsOpen} isStaticBackdrop>
            <ModalHeader>
                <Badge className="text-xl">Detalle del Cotizacion</Badge>
            </ModalHeader>
            <ModalBody>
                <div className="flex flex-col gap-4">
                    <div className="w-full">
                        <Badge>Descripción</Badge>
                        <div className="ml-4">{detalle.descripcion}</div>
                    </div>
                    <div className="w-full">
                        <Badge>Número de Cotización</Badge>
                        <div className="ml-4">{detalleCotizacion?.numero_cotizacion}</div>
                    </div>
                    <div className="w-full">
                        <Badge>Nombre de Cotización</Badge>
                        <div className="ml-4">{detalleCotizacion?.nombre}</div>
                    </div>
                    <div className="w-full">
                        <Badge>Estado de la cotizacion</Badge>
                        <div className="ml-4">{detalleCotizacion?.estado_label}</div>
                    </div>
                    <div className="w-full">
                        <Badge>Fecha de Creación</Badge>
                        <div className="ml-4">
                            {detalleCotizacion?.fecha_creacion ? new Date(detalleCotizacion?.fecha_creacion).toLocaleDateString() : "Sin fecha"}
                        </div>
                    </div>
                    <div className="w-full">
                        <Badge>Fecha de Modificación</Badge>
                        <div className="ml-4">
                            {detalleCotizacion?.fecha_modificacion ? new Date(detalleCotizacion?.fecha_modificacion).toLocaleDateString() : "Sin fecha"}
                        </div>
                    </div>
                </div>
            </ModalBody>
            <ModalFooter>
                <ModalFooterChild />
                <ModalFooterChild>
                    <Tooltip text="Navegar a la cotización">
                        <Button variant="solid" color="violet" onClick={() => { navigate(`/cotizacion/detalle-cotizacion/${detalleCotizacion?.numero_cotizacion}`) }}>Detalle</Button>
                    </Tooltip>

                    <Button color="red" onClick={() => setIsOpen(false)}>
                        Cerrar
                    </Button>
                </ModalFooterChild>
            </ModalFooter>
        </Modal>
    );
}

export default DetalleCotizacionOT;
