import Button from '@/components/ui/Button';
import Modal, { ModalBody, ModalFooter, ModalHeader } from '@/components/ui/Modal';
import type { ICheckAvanceOTV3 } from '@/interface/ordenTrabajoV3.interface';
import type { Dispatch, SetStateAction } from 'react';

interface IProps {
    isOpen: boolean;
    setIsOpen: Dispatch<SetStateAction<boolean>>;
    avance: ICheckAvanceOTV3 | null;
    onConfirmar: () => void;
    isLoading?: boolean;
}

const CheckBloqueadoresOTV3 = ({ isOpen, setIsOpen, avance, onConfirmar, isLoading }: IProps) => {
    const tieneBloqueadores = avance && avance.bloqueadores.length > 0;

    return (
        <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
            <ModalHeader>
                {tieneBloqueadores ? 'Hay elementos pendientes' : 'Confirmar avance de estado'}
            </ModalHeader>
            <ModalBody className='space-y-4'>
                {avance?.bloqueadores && avance.bloqueadores.length > 0 && (
                    <div>
                        <p className='mb-2 font-semibold text-red-600 dark:text-red-400'>
                            Bloqueadores (deben resolverse antes de continuar):
                        </p>
                        <ul className='space-y-2'>
                            {avance.bloqueadores.map((b, i) => (
                                <li
                                    key={i}
                                    className='rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300'>
                                    <div className='flex items-start gap-2'>
                                        <span className='mt-0.5 text-red-500'>✗</span>
                                        <div>
                                            <p>{b.mensaje}</p>
                                            {b.detalle && b.detalle.length > 0 && (
                                                <ul className='mt-1 list-inside list-disc text-xs opacity-80'>
                                                    {b.detalle.map((d, di) => (
                                                        <li key={di}>{d}</li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {avance && avance.bloqueadores.length === 0 && (
                    <p className='text-sm text-gray-600 dark:text-gray-400'>
                        Todo listo para continuar. Confirma el cambio de estado.
                    </p>
                )}

                {avance?.puede_avanzar !== false && avance?.proximo_estado && (
                    <div className='rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-300'>
                        Proximo estado:{' '}
                        <span className='font-semibold capitalize'>
                            {avance.proximo_estado.replace(/_/g, ' ')}
                        </span>
                    </div>
                )}
            </ModalBody>
            <ModalFooter>
                <Button onClick={() => setIsOpen(false)} isDisable={isLoading}>
                    Cerrar
                </Button>
                {avance?.puede_avanzar && (
                    <Button
                        variant='solid'
                        color='blue'
                        onClick={onConfirmar}
                        isLoading={isLoading}>
                        Confirmar cambio
                    </Button>
                )}
            </ModalFooter>
        </Modal>
    );
};

export default CheckBloqueadoresOTV3;
