import SelectReact, { TSelectOption } from "@/components/form/SelectReact";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal, { ModalBody, ModalFooter, ModalFooterChild, ModalHeader } from "@/components/ui/Modal";
import TablaItemsTecnico from "@/pages/Cotizaciones/components/TablaItemsTecnico";
import CrearCotizacion from "@/pages/Cotizaciones/modals/CrearCotizacion";
import CrearItemCotizacion from "@/pages/Cotizaciones/modals/CrearItemCotizacion";
import ApiService from "@/services/ApiService";
import { detalleCotizacionThunk, listaCotizacionesThunk, useAppDispatch, useAppSelector } from "@/store";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";

type EntityType = 'servicio-general' | 'detalle-trabajo';

interface VincularCotizacionProps {
    isOpen: boolean;
    setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
    entityType: EntityType;
    entityId: number;
    ordenId: number;
    entityName?: string;
    onSuccess?: () => void;
}

const VincularCotizacion = ({ 
    isOpen, 
    setIsOpen, 
    entityType, 
    entityId, 
    ordenId,
    entityName = "Servicio",
    onSuccess 
}: VincularCotizacionProps) => {
    const dispatch = useAppDispatch();
    const { listaCotizaciones, detalleCotizacion, listaItemsEnCotizacion } = useAppSelector((state) => state.cotizacion);
    const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Construct API endpoint based on entity type
    const getEntityEndpoint = () => {
        if (entityType === 'servicio-general') {
            return `/api/ordenes-de-trabajo/${ordenId}/servicios-generales/${entityId}/`;
        } else {
            return `/api/ordenes-de-trabajo/${ordenId}/detalles-trabajo/${entityId}/`;
        }
    };

    useEffect(() => {
        if (isOpen) {
            dispatch(listaCotizacionesThunk());
            setSelectedQuoteId(null);
        } else {
            setSelectedQuoteId(null);
        }
    }, [isOpen]);

    useEffect(() => {
        if (selectedQuoteId) {
            dispatch(detalleCotizacionThunk({ id_cotizacion: parseInt(selectedQuoteId) }));
        }
    }, [selectedQuoteId]);

    // Calculate total from items
    const calculateTotal = () => {
        if (!listaItemsEnCotizacion || listaItemsEnCotizacion.length === 0) {
            return 0;
        }
        return listaItemsEnCotizacion.reduce((sum, item) => {
            const itemTotal = parseFloat(item.costo_total) || (parseFloat(item.precio_unitario) * item.cantidad) || 0;
            return sum + itemTotal;
        }, 0);
    };

    const formatCurrency = (amount: number, tipoMoneda: string) => {
        const formatted = amount.toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
        if (tipoMoneda === "1") {
            return `${formatted} USD`;
        } else if (tipoMoneda === "3") {
            return `${formatted} UF`;
        } else {
            return `$${formatted}`;
        }
    };

    const handleVincular = async () => {
        if (!selectedQuoteId) {
            toast.error("Debe seleccionar una cotización");
            return;
        }

        setIsLoading(true);
        try {
            const response = await ApiService.fetchData({
                url: getEntityEndpoint(),
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify({ cotizacion: parseInt(selectedQuoteId) })
            });

            if (response.data) {
                toast.success("Cotización vinculada correctamente");
                if (onSuccess) onSuccess();
                setIsOpen(false);
            }
        } catch (error: any) {
            console.error(error);
            toast.error("Error al vincular la cotización");
        } finally {
            setIsLoading(false);
        }
    };

    const totalNeto = calculateTotal();

    return (
        <Modal isOpen={isOpen} setIsOpen={setIsOpen} size="xl" isStaticBackdrop={true}>
            <ModalHeader>
                <Badge className="text-xl">Vincular Cotización - {entityName}</Badge>
            </ModalHeader>
            <ModalBody>
                <div className="flex flex-col gap-6">
                    {/* Selection Section */}
                    <div className="grid grid-cols-12 gap-4 items-end">
                        <div className="col-span-10">
                            <Badge>Seleccionar Cotización</Badge>
                            <SelectReact
                                name="cotizacion"
                                options={listaCotizaciones.map(c => ({ 
                                    value: c.id.toString(), 
                                    label: `N°${c.numero_cotizacion} - ${c.nombre} (${c.cliente_nombre})` 
                                }))}
                                value={selectedQuoteId ? listaCotizaciones.map(c => ({ 
                                    value: c.id.toString(), 
                                    label: `N°${c.numero_cotizacion} - ${c.nombre} (${c.cliente_nombre})` 
                                })).find(opt => opt.value === selectedQuoteId) : null}
                                onChange={(option) => setSelectedQuoteId((option as TSelectOption)?.value)}
                                placeholder="Buscar cotización..."
                                isClearable
                            />
                        </div>
                        <div className="col-span-2 flex justify-end">
                            <CrearCotizacion 
                                empresa={false} 
                                onSuccess={(newQuote) => {
                                    setSelectedQuoteId(newQuote.id.toString());
                                }} 
                            />
                        </div>
                    </div>

                    {/* Details Section */}
                    {selectedQuoteId && detalleCotizacion && (
                        <div className="flex flex-col gap-4 border-t pt-4">
                            <div className="flex justify-between items-center">
                                <div className="flex gap-4">
                                    <div>
                                        <Badge>Cliente</Badge>
                                        <div className="font-semibold">{detalleCotizacion.cliente_nombre}</div>
                                    </div>
                                    <div>
                                        <Badge>Total Neto</Badge>
                                        <div className="font-semibold">
                                            {formatCurrency(totalNeto, detalleCotizacion.tipo_moneda)}
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <CrearItemCotizacion />
                                </div>
                            </div>

                            <div className="w-full overflow-auto">
                                <TablaItemsTecnico />
                            </div>
                        </div>
                    )}
                </div>
            </ModalBody>
            <ModalFooter>
                <ModalFooterChild />
                <ModalFooterChild>
                    <Button color="red" onClick={() => setIsOpen(false)}>Cancelar</Button>
                    <Button 
                        variant="solid" 
                        onClick={handleVincular} 
                        isLoading={isLoading}
                        isDisable={!selectedQuoteId}
                    >
                        Vincular
                    </Button>
                </ModalFooterChild>
            </ModalFooter>
        </Modal>
    );
};

export default VincularCotizacion;
