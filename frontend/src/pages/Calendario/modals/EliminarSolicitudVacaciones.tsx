import Button from '@/components/ui/Button';
import Modal, {
    ModalBody,
    ModalFooter,
    ModalFooterChild,
    ModalHeader,
} from '@/components/ui/Modal';
import Tooltip from '@/components/ui/Tooltip';
import { useEliminarSolicitudVacacionesMutation } from '@/store/slices/vacaciones/vacacionesApi';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { getErrorMessage } from '@/utils/errorHandlers';

function EliminarSolicitudVacaciones({ id_solicitud }: { id_solicitud: number }) {
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [eliminarSolicitud] = useEliminarSolicitudVacacionesMutation();

    return (
        <>
            <Tooltip text='Eliminar'>
                <Button
                    variant='solid'
                    onClick={() => setIsOpen(true)}
                    icon='HeroMinusCircle'
                    color='red'
                />
            </Tooltip>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
                <ModalHeader>¿Estas Seguro(a) de Eliminar la Solicitud?</ModalHeader>
                <ModalBody>
                    <div className='flex flex-col gap-4'>
                        <p>
                            Esta acción no se puede deshacer. La solicitud será eliminada
                            permanentemente.
                        </p>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <ModalFooterChild></ModalFooterChild>
                    <ModalFooterChild>
                        <Button color='red' onClick={() => setIsOpen(false)}>
                            Cancelar
                        </Button>
                        <Button
                            variant='solid'
                            onClick={async () => {
                                try {
                                    await eliminarSolicitud({ id: id_solicitud }).unwrap();
                                    toast.success('Solicitud Eliminada', { autoClose: 1000 });
                                    setIsOpen(false);
                                } catch (error: unknown) {
                                    toast.error(getErrorMessage(error));
                                }
                            }}>
                            Eliminar
                        </Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    );
}

export default EliminarSolicitudVacaciones;
