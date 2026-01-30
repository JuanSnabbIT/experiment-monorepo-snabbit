import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal, {
    ModalBody,
    ModalFooter,
    ModalFooterChild,
    ModalHeader,
} from '@/components/ui/Modal';
import { useConfirmarRecepcionGuiaMutation } from '@/store/slices/ordenTrabajo/ordenTrabajoApi';
import { getErrorMessage } from '@/utils/errorHandlers';
import { Dispatch, SetStateAction, useEffect, useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { toast } from 'react-toastify';

interface Props {
    guiaId: number;
    items?: { item_guia_id: number; cantidad_a_devolver: number }[];
    clienteSolicitanteId: number | null;
    clienteSolicitanteNombre: string | null | undefined;
    isOpen: boolean;
    setIsOpen: Dispatch<SetStateAction<boolean>>;
    onSuccess?: () => void;
}

function ModalConfirmarRecepcionGuia({
    guiaId,
    items = [],
    clienteSolicitanteId,
    clienteSolicitanteNombre,
    isOpen,
    setIsOpen,
    onSuccess,
}: Props) {
    const [confirmarRecepcionGuia] = useConfirmarRecepcionGuiaMutation();
    const sigCanvas = useRef<SignatureCanvas | null>(null);
    const topRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (isOpen) {
            if (topRef.current) {
                topRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    const clear = () => {
        if (sigCanvas.current) {
            sigCanvas.current.clear();
        }
    };

    const handleConfirmar = async () => {
        if (!clienteSolicitanteId) {
            toast.error('No se ha identificado el cliente solicitante', {
                toastId: 'error-solicitante',
            });
            return;
        }

        if (sigCanvas.current?.isEmpty()) {
            toast.error('Por favor firme la confirmación', { toastId: 'firma-confirmacion' });
            return;
        }

        try {
            await confirmarRecepcionGuia({
                id: guiaId,
                data: {
                    firma: sigCanvas.current?.toDataURL('image/png'),
                    confirmado_por_id: clienteSolicitanteId,
                    items,
                },
            }).unwrap();
            toast.success('Recepcion confirmada exitosamente', { autoClose: 1500 });
            clear();
            setIsOpen(false);
            onSuccess && onSuccess();
        } catch (error: any) {
            toast.error(
                error.response?.data?.detail ||
                    error.response?.data ||
                    'Error al confirmar la recepción',
                { toastId: 'error-confirmar-recepcion' },
            );
        }
    };

    return (
        <Modal
            size='md'
            isOpen={isOpen}
            setIsOpen={setIsOpen}
            isStaticBackdrop={true}
            isCentered={true}
            isScrollable={true}>
            <ModalHeader>
                <Badge className='text-xl'>Confirmar Recepción de Items</Badge>
            </ModalHeader>
            <ModalBody>
                <div className='space-y-4'>
                    <div ref={topRef} />
                    {/* Información de confirmación */}
                    <div className='rounded-lg border border-blue-200 bg-blue-50 p-4'>
                        <div className='space-y-2 text-sm font-medium leading-relaxed text-blue-900'>
                            <div>
                                Usted{' '}
                                <span className='font-bold'>
                                    {clienteSolicitanteNombre || 'Cliente Responsable'}
                                </span>
                                , ¿Confirma la recepción de los items de esta guía de salida?
                            </div>
                        </div>
                    </div>
                    <div className='space-y-2'>
                        <label className='block text-sm font-medium text-gray-700'>
                            Firma de conformidad:
                        </label>
                        <div className='flex justify-center overflow-auto rounded-lg border-2 border-gray-300 bg-white'>
                            <SignatureCanvas
                                ref={sigCanvas}
                                canvasProps={{
                                    className: 'bg-white',
                                    height: 280,
                                    width: 400,
                                }}
                            />
                        </div>
                        <Button size='sm' variant='outline' color='gray' onClick={clear}>
                            Limpiar firma
                        </Button>
                    </div>
                </div>
            </ModalBody>
            <ModalFooter>
                <ModalFooterChild>
                    <Button variant='outline' color='red' onClick={() => setIsOpen(false)}>
                        Cancelar
                    </Button>
                </ModalFooterChild>
                <ModalFooterChild>
                    <Button variant='solid' color='emerald' onClick={handleConfirmar}>
                        Confirmar Recepción
                    </Button>
                </ModalFooterChild>
            </ModalFooter>
        </Modal>
    );
}

export default ModalConfirmarRecepcionGuia;
