import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Badge from '@/components/ui/Badge.tsx';
import Button from '@/components/ui/Button.tsx';
import Modal, {
    ModalBody,
    ModalFooter,
    ModalFooterChild,
    ModalHeader,
} from '@/components/ui/Modal.tsx';
import Tooltip from '@/components/ui/Tooltip.tsx';
import { IItemCotizacion } from '@/interface/cotizaciones.interface.ts';
import { useAppSelector } from '@/store/index.ts';

type DetalleItemCotizacion = Pick<IItemCotizacion, 'id' | 'descripcion'>;

interface DetalleCotizacionOTProps {
    id_detalle?: number;
}

const isDetalleItemCotizacion = (item: unknown): item is DetalleItemCotizacion => {
    return (
        typeof item === 'object' &&
        item !== null &&
        'id' in item &&
        typeof (item as { id?: unknown }).id === 'number'
    );
};

const DetalleCotizacionOT = ({ id_detalle }: DetalleCotizacionOTProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [detalle, setDetalle] = useState<DetalleItemCotizacion | null>(null);

    const navigate = useNavigate();
    const { detalleCotizacion } = useAppSelector((state) => state.cotizacion);

    useEffect(() => {
        if (!id_detalle || !detalleCotizacion) {
            setDetalle(null);
            setIsOpen(false);
            return;
        }

        const rawItems: unknown[] = Array.isArray(detalleCotizacion.items)
            ? detalleCotizacion.items
            : [];
        const detalleItems: DetalleItemCotizacion[] = rawItems.filter(isDetalleItemCotizacion);
        const detalleEncontrado = detalleItems.find((item) => item.id === id_detalle) ?? null;

        setDetalle(detalleEncontrado);
        setIsOpen(Boolean(detalleEncontrado));
    }, [id_detalle, detalleCotizacion]);

    if (!detalle) return null;

    return (
        <Modal isOpen={isOpen} setIsOpen={setIsOpen} isStaticBackdrop>
            <ModalHeader>
                <Badge className='text-xl'>Detalle del Cotizacion</Badge>
            </ModalHeader>
            <ModalBody>
                <div className='flex flex-col gap-4'>
                    <div className='w-full'>
                        <Badge>Descripcion</Badge>
                        <div className='ml-4'>{detalle.descripcion}</div>
                    </div>
                    <div className='w-full'>
                        <Badge>Numero de Cotizacion</Badge>
                        <div className='ml-4'>{detalleCotizacion?.numero_cotizacion}</div>
                    </div>
                    <div className='w-full'>
                        <Badge>Nombre de Cotizacion</Badge>
                        <div className='ml-4'>{detalleCotizacion?.nombre}</div>
                    </div>
                    <div className='w-full'>
                        <Badge>Estado de la cotizacion</Badge>
                        <div className='ml-4'>{detalleCotizacion?.estado_label}</div>
                    </div>
                    <div className='w-full'>
                        <Badge>Fecha de Creacion</Badge>
                        <div className='ml-4'>
                            {detalleCotizacion?.fecha_creacion
                                ? new Date(detalleCotizacion?.fecha_creacion).toLocaleDateString()
                                : 'Sin fecha'}
                        </div>
                    </div>
                    <div className='w-full'>
                        <Badge>Fecha de Modificacion</Badge>
                        <div className='ml-4'>
                            {detalleCotizacion?.fecha_modificacion
                                ? new Date(
                                      detalleCotizacion?.fecha_modificacion,
                                  ).toLocaleDateString()
                                : 'Sin fecha'}
                        </div>
                    </div>
                </div>
            </ModalBody>
            <ModalFooter>
                <ModalFooterChild />
                <ModalFooterChild>
                    <Tooltip text='Navegar a la cotizacion'>
                        <Button
                            variant='solid'
                            color='violet'
                            onClick={() => {
                                navigate(
                                    `/cotizacion/detalle-cotizacion/${detalleCotizacion?.numero_cotizacion}`,
                                );
                            }}>
                            Detalle
                        </Button>
                    </Tooltip>

                    <Button color='red' onClick={() => setIsOpen(false)}>
                        Cerrar
                    </Button>
                </ModalFooterChild>
            </ModalFooter>
        </Modal>
    );
};

export default DetalleCotizacionOT;
