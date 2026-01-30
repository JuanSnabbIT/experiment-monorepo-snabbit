import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal, {
    ModalBody,
    ModalFooter,
    ModalFooterChild,
    ModalHeader,
} from '@/components/ui/Modal';
import Tooltip from '@/components/ui/Tooltip';
import {
    useGetDetalleOrdenTrabajoQuery,
    useUpdateOrdenTrabajoMutation,
} from '@/store/slices/ordenTrabajo/ordenTrabajoApi';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getErrorMessage } from '@/utils/errorHandlers';

function FacturarOT() {
    const { id } = useParams<{ id: string }>();
    const ordenId = id ? Number(id) : undefined;
    const { data: detalleOrdenTrabajo, refetch: refetchDetalle } = useGetDetalleOrdenTrabajoQuery(
        ordenId ?? 0,
        { skip: !ordenId },
    );
    const [updateOrdenTrabajo] = useUpdateOrdenTrabajoMutation();
    const [isOpen, setIsOpen] = useState<boolean>(false);

    return (
        <>
            <Tooltip text='Facturar OT'>
                <Button
                    variant='solid'
                    icon='HeroBookmark'
                    onClick={() => {
                        setIsOpen(true);
                    }}></Button>
            </Tooltip>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
                <ModalHeader>
                    <Badge className='text-xl'>Facturar OT</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className='flex flex-col gap-4'>
                        <div>¿Esta seguro(a) de querer facturar esta OT?</div>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <ModalFooterChild></ModalFooterChild>
                    <ModalFooterChild>
                        <Button
                            color='red'
                            onClick={() => {
                                setIsOpen(false);
                            }}>
                            Cancelar
                        </Button>
                        <Button
                            variant='solid'
                            onClick={async () => {
                                try {
                                    if (!detalleOrdenTrabajo) return;
                                    await updateOrdenTrabajo({
                                        id: detalleOrdenTrabajo.id,
                                        data: { estado: 'facturada' },
                                    }).unwrap();
                                    toast.success('Orden facturada', { autoClose: 1000 });
                                    refetchDetalle();
                                    setIsOpen(false);
                                } catch (error: unknown) {
                                    toast.error(getErrorMessage(error) || 'Error al facturar la OT', {
                                        toastId: 'Error al facturar la OT',
                                    });
                                }
                            }}>
                            Facturar
                        </Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    );
}

export default FacturarOT;
