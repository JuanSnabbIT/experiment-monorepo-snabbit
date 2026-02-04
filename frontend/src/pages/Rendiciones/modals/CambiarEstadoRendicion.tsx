import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal, {
    ModalBody,
    ModalFooter,
    ModalFooterChild,
    ModalHeader,
} from '@/components/ui/Modal';
import Tooltip from '@/components/ui/Tooltip';
import { useUpdateRendicionMutation } from '@/store/slices/ordenTrabajo/ordenTrabajoApi';
import { useAppSelector } from '@/store';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { getErrorMessage } from '@/utils/errorHandlers';

function CambiarEstadoRendicion() {
    const { detalleRendicion } = useAppSelector((state) => state.rendicion);
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [isBusy, setIsBusy] = useState<boolean>(false);
    const [updateRendicion] = useUpdateRendicionMutation();

    return (
        <>
            <Tooltip
                text={
                    detalleRendicion?.estado === '0'
                        ? 'Pasar a "En Espera de Aprobación"'
                        : detalleRendicion?.estado === '1'
                          ? 'Aprobar / Rechazar Rendición'
                          : detalleRendicion?.estado === '2'
                            ? 'Pagar Rendición'
                            : detalleRendicion?.estado === '3'
                              ? 'Rechazada'
                              : detalleRendicion?.estado === '4'
                                ? 'Pagada'
                                : ''
                }>
                <Button
                    variant='solid'
                    color={
                        detalleRendicion?.estado === '3'
                            ? 'red'
                            : detalleRendicion?.estado === '4'
                              ? 'emerald'
                              : 'blue'
                    }
                    icon={
                        detalleRendicion?.estado === '0'
                            ? 'HeroHandRaised'
                            : detalleRendicion?.estado === '1'
                              ? 'HeroEllipsisHorizontalCircle'
                              : detalleRendicion?.estado === '2'
                                ? 'HeroCurrencyDollar'
                                : detalleRendicion?.estado === '3'
                                  ? 'HeroXMark'
                                  : detalleRendicion?.estado === '4'
                                    ? 'HeroHandThumbUp'
                                    : ''
                    }
                    isDisable={detalleRendicion?.estado === '3'}
                    onClick={() => {
                        if (detalleRendicion?.estado != '3' && detalleRendicion?.estado != '4') {
                            setIsOpen(true);
                        }
                    }}
                />
            </Tooltip>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
                <ModalHeader>
                    <Badge className='text-xl'>Cambiar Estado</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className='flex flex-col gap-4'>
                        <div>
                            {detalleRendicion?.estado === '0'
                                ? 'La rendición no se podra editar'
                                : detalleRendicion?.estado === '1'
                                  ? 'La rendición se puede aprobar o rechazar'
                                  : detalleRendicion?.estado === '2'
                                    ? 'La rendición se pagará'
                                    : ''}
                        </div>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <ModalFooterChild>
                        {detalleRendicion?.estado === '1' && (
                            <Button
                                variant='solid'
                                color='red'
                                isDisable={isBusy}
                                onClick={async () => {
                                    if (!detalleRendicion) return;
                                    setIsBusy(true);
                                    try {
                                        await updateRendicion({
                                            id: detalleRendicion.id,
                                            data: { estado: '3' },
                                        }).unwrap();
                                        toast.success('Rendición rechazada', {
                                            autoClose: 1000,
                                        });
                                        setIsOpen(false);
                                    } catch (error: unknown) {
                                        const mensajeError = getErrorMessage(error);
                                        toast.error(
                                            mensajeError || 'Error al rechazar la rendición',
                                            { toastId: 'Error al rechazar la rendición' },
                                        );
                                    } finally {
                                        setIsBusy(false);
                                    }
                                }}>
                                Rechazar
                            </Button>
                        )}
                    </ModalFooterChild>
                    <ModalFooterChild>
                        <Button
                            color='red'
                            isDisable={isBusy}
                            onClick={() => {
                                setIsOpen(false);
                            }}>
                            Cancelar
                        </Button>
                        <Button
                            variant='solid'
                            isDisable={isBusy}
                            onClick={async () => {
                                if (!detalleRendicion) return;
                                setIsBusy(true);
                                try {
                                    const nuevoEstado =
                                        detalleRendicion.estado === '0'
                                            ? '1'
                                            : detalleRendicion.estado === '1'
                                              ? '2'
                                              : detalleRendicion.estado === '2'
                                                ? '4'
                                                : '';

                                    if (!nuevoEstado) {
                                        toast.error(
                                            'No se puede cambiar el estado de esta rendición',
                                            {
                                                toastId:
                                                    'Error al cambiar el estado de la rendicion',
                                            },
                                        );
                                        return;
                                    }

                                    await updateRendicion({
                                        id: detalleRendicion.id,
                                        data: { estado: nuevoEstado },
                                    }).unwrap();
                                    setIsOpen(false);
                                } catch (error: unknown) {
                                    const mensajeError = getErrorMessage(error);
                                    toast.error(
                                        mensajeError ||
                                            'Error al cambiar el estado de la rendicion',
                                        { toastId: 'Error al cambiar el estado de la rendicion' },
                                    );
                                } finally {
                                    setIsBusy(false);
                                }
                            }}>
                            {detalleRendicion?.estado === '0'
                                ? 'En Espera de Aprobación'
                                : detalleRendicion?.estado === '1'
                                  ? 'Aprobar'
                                  : detalleRendicion?.estado === '2'
                                    ? 'Pagar'
                                    : ''}
                        </Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    );
}

export default CambiarEstadoRendicion;
