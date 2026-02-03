import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal, {
    ModalBody,
    ModalFooter,
    ModalFooterChild,
    ModalHeader,
} from '@/components/ui/Modal';
import Tooltip from '@/components/ui/Tooltip';
import { IGuiaSalida } from '@/interface/bodega.interface';
import { useVolverPendienteMutation } from '@/store/slices/bodega/guiaSalidaApi';
import { useState } from 'react';
import { toast } from 'react-toastify';

function VolverAPendienteGuiaSalida({
    guia_salida,
    onSuccess,
}: {
    guia_salida: IGuiaSalida;
    onSuccess?: () => void;
}) {
    const [volverPendiente] = useVolverPendienteMutation();
    const [isOpen, setIsOpen] = useState<boolean>(false);

    return (
        <>
            <Tooltip text='Volver a Pendiente'>
                <Button
                    variant='solid'
                    icon='HeroArrowUturnLeft'
                    color='zinc'
                    onClick={() => {
                        setIsOpen(true);
                    }}
                />
            </Tooltip>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
                <ModalHeader>
                    <Badge className='text-xl'>Volver a Pendiente</Badge>
                </ModalHeader>
                <ModalBody>
                    <div>¿Esta seguro(a) de regresar a un estado anterior a la Guia de Salida?</div>
                </ModalBody>
                <ModalFooter>
                    <ModalFooterChild></ModalFooterChild>
                    <ModalFooterChild>
                        <Button
                            color='zinc'
                            onClick={() => {
                                setIsOpen(false);
                            }}>
                            Cancelar
                        </Button>
                        <Button
                            variant='solid'
                            color='emerald'
                            onClick={async () => {
                                try {
                                    await volverPendiente(guia_salida.id).unwrap();
                                    toast.success('Guia devuelta a estado pendiente', {
                                        autoClose: 1000,
                                    });
                                    setIsOpen(false);
                                    // RTK Query cache invalidates automatically
                                    onSuccess && onSuccess();
                                } catch (error: any) {
                                    const mensajesError = error.data
                                        ? Object.values(error.data).flat().join(' ')
                                        : 'Error al regresar a pendiente';
                                    toast.error(mensajesError, {
                                        toastId: 'Error al regresar a pendiente la guia de salida',
                                    });
                                }
                            }}>
                            Aceptar
                        </Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    );
}

export default VolverAPendienteGuiaSalida;
