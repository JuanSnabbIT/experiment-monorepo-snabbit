import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal, { ModalBody, ModalFooter, ModalHeader } from '@/components/ui/Modal';
import type { IContratoHistorialEvento } from '@/interface/contrato.interface';
import dayjs from 'dayjs';
import type { Dispatch, SetStateAction } from 'react';

interface IModalDetalleHistorialProps {
    evento: IContratoHistorialEvento | null;
    isOpen: boolean;
    setIsOpen: Dispatch<SetStateAction<boolean>>;
}

const origenLabel = (origen: string): string => {
    const map: Record<string, string> = {
        contrato: 'Contrato',
        servicio: 'Servicios',
        condicion: 'Condiciones especiales',
        confidencialidad: 'Acuerdo de confidencialidad',
        aprobacion: 'Aprobación del cliente',
        firma: 'Firma del contrato',
    };
    return map[origen] ?? origen;
};

const ModalDetalleHistorial = ({
    evento,
    isOpen,
    setIsOpen,
}: IModalDetalleHistorialProps) => {
    if (!evento) return null;

    return (
        <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
            <ModalHeader>Detalle del evento</ModalHeader>
            <ModalBody>
                <div className='space-y-3'>
                    <div className='flex items-center gap-2'>
                        <Badge variant='outline' color='blue'>
                            {evento.tipo}
                        </Badge>
                        <span className='text-sm text-zinc-500'>
                            {origenLabel(evento.origen)}
                        </span>
                    </div>

                    <div>
                        <p className='text-xs font-medium uppercase text-zinc-400'>Detalle</p>
                        <p className='text-sm text-zinc-800 dark:text-zinc-200'>
                            {evento.detalle || '—'}
                        </p>
                    </div>

                    {evento.cambios && (
                        <div>
                            <p className='text-xs font-medium uppercase text-zinc-400'>
                                Información adicional
                            </p>
                            <p className='whitespace-pre-wrap text-sm text-zinc-800 dark:text-zinc-200'>
                                {evento.cambios}
                            </p>
                        </div>
                    )}

                    <div className='grid grid-cols-2 gap-3'>
                        <div>
                            <p className='text-xs font-medium uppercase text-zinc-400'>Fecha</p>
                            <p className='text-sm text-zinc-800 dark:text-zinc-200'>
                                {evento.fecha
                                    ? dayjs(evento.fecha).format('DD/MM/YYYY HH:mm')
                                    : '—'}
                            </p>
                        </div>
                        <div>
                            <p className='text-xs font-medium uppercase text-zinc-400'>Usuario</p>
                            <p className='text-sm text-zinc-800 dark:text-zinc-200'>
                                {evento.usuario || 'Sistema'}
                            </p>
                        </div>
                    </div>
                </div>
            </ModalBody>
            <ModalFooter>
                <Button onClick={() => setIsOpen(false)}>Cerrar</Button>
            </ModalFooter>
        </Modal>
    );
};

export default ModalDetalleHistorial;
