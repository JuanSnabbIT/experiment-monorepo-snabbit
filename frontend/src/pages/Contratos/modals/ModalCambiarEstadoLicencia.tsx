import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal, {
    ModalBody,
    ModalFooter,
    ModalFooterChild,
    ModalHeader,
} from '@/components/ui/Modal';
import { ESTADOS_LICENCIA, TRANSICIONES_ESTADO_LICENCIA } from '@/constants/contrato.constant';
import { useCambiarEstadoContratoLicenciaMutation } from '@/store/slices/contratos/contratoApi';
import { getErrorMessage } from '@/utils/errorHandlers';
import { useState } from 'react';
import { toast } from 'react-toastify';

interface IModalCambiarEstadoLicenciaProps {
    isOpen: boolean;
    onClose: () => void;
    licenciaId: number;
    estadoActual: string;
    estadoActualLabel: string;
    colorEstado: 'emerald' | 'red' | 'amber' | 'zinc';
}

function ModalCambiarEstadoLicencia({
    isOpen,
    onClose,
    licenciaId,
    estadoActual,
    estadoActualLabel,
    colorEstado,
}: IModalCambiarEstadoLicenciaProps) {
    const [nuevoEstado, setNuevoEstado] = useState<string>('');
    const [cambiarEstado, { isLoading }] = useCambiarEstadoContratoLicenciaMutation();

    const transicionesValidas = TRANSICIONES_ESTADO_LICENCIA[estadoActual] ?? [];

    const handleConfirm = async () => {
        if (!nuevoEstado) return;
        try {
            await cambiarEstado({ id: licenciaId, estado: nuevoEstado }).unwrap();
            toast.success('Estado actualizado', { autoClose: 1500 });
            setNuevoEstado('');
            onClose();
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
        }
    };

    const handleClose = () => {
        setNuevoEstado('');
        onClose();
    };

    return (
        <Modal isOpen={isOpen} setIsOpen={handleClose}>
            <ModalHeader>Cambiar Estado de Licencia</ModalHeader>
            <ModalBody>
                <div className='flex flex-col gap-5'>
                    <div>
                        <p className='mb-1 text-sm text-zinc-500 dark:text-zinc-400'>
                            Estado actual
                        </p>
                        <Badge color={colorEstado}>{estadoActualLabel}</Badge>
                    </div>

                    {transicionesValidas.length === 0 ? (
                        <p className='text-sm text-zinc-500 dark:text-zinc-400'>
                            No hay transiciones disponibles desde este estado.
                        </p>
                    ) : (
                        <div>
                            <p className='mb-2 text-sm text-zinc-500 dark:text-zinc-400'>
                                Seleccionar nuevo estado
                            </p>
                            <div className='flex flex-wrap gap-2'>
                                {transicionesValidas.map((estado) => {
                                    const info = ESTADOS_LICENCIA.find((e) => e.value === estado);
                                    const selected = nuevoEstado === estado;
                                    return (
                                        <Button
                                            key={estado}
                                            variant={selected ? 'solid' : 'outline'}
                                            color={selected ? 'blue' : 'zinc'}
                                            onClick={() => setNuevoEstado(estado)}>
                                            {info?.label ?? estado}
                                        </Button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </ModalBody>
            <ModalFooter>
                <ModalFooterChild />
                <ModalFooterChild>
                    <Button color='red' onClick={handleClose}>
                        Cancelar
                    </Button>
                    <Button
                        variant='solid'
                        isDisable={!nuevoEstado || isLoading}
                        onClick={handleConfirm}>
                        {isLoading ? 'Guardando...' : 'Confirmar'}
                    </Button>
                </ModalFooterChild>
            </ModalFooter>
        </Modal>
    );
}

export default ModalCambiarEstadoLicencia;
