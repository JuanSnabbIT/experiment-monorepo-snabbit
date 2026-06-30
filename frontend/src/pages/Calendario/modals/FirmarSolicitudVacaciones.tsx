import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal, {
    ModalBody,
    ModalFooter,
    ModalFooterChild,
    ModalHeader,
} from '@/components/ui/Modal';
import Tooltip from '@/components/ui/Tooltip';
import { useFirmarSolicitudVacacionesMutation } from '@/store/slices/vacaciones/vacacionesApi';
import { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { toast } from 'react-toastify';
import { getErrorMessage } from '@/utils/errorHandlers';

function FirmarSolicitudVacaciones({ solicitud_id }: { solicitud_id: number }) {
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const sigCanvas = useRef<SignatureCanvas | null>(null);
    const [firmarSolicitud] = useFirmarSolicitudVacacionesMutation();

    const clear = () => {
        if (sigCanvas.current) {
            sigCanvas.current.clear();
        }
    };

    return (
        <>
            <Tooltip text='Firmar Solicitud'>
                <Button
                    variant='solid'
                    icon='HeroPencil'
                    onClick={() => setIsOpen(true)}
                />
            </Tooltip>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
                <ModalHeader>Firmar Solicitud</ModalHeader>
                <ModalBody>
                    <Badge className='text-lg'>Firma</Badge>
                    <div style={{ width: '100%', maxWidth: '600px', margin: '0 auto' }}>
                        <div className='bg-white dark:bg-zinc-900'>
                            <SignatureCanvas
                                ref={(ref) => {
                                    sigCanvas.current = ref;
                                }}
                                penColor='black'
                                canvasProps={{
                                    height: 200,
                                    className: 'signature-canvas',
                                }}
                            />
                        </div>
                        <Button className='mt-2' variant='solid' onClick={clear}>
                            Limpiar
                        </Button>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <ModalFooterChild />
                    <ModalFooterChild>
                        <Button color='red' onClick={() => setIsOpen(false)}>
                            Cancelar
                        </Button>
                        <Button
                            variant='solid'
                            onClick={async () => {
                                try {
                                    const firma = sigCanvas.current?.toDataURL('image/png') ?? '';
                                    await firmarSolicitud({ id: solicitud_id, firma_usuario: firma }).unwrap();
                                    toast.success('Solicitud Firmada', { autoClose: 1000 });
                                    setIsOpen(false);
                                } catch (error: unknown) {
                                    toast.error(getErrorMessage(error));
                                }
                            }}>
                            Guardar
                        </Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    );
}

export default FirmarSolicitudVacaciones;
