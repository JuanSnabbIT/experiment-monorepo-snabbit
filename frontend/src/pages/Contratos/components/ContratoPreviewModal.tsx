import Button from '@/components/ui/Button';
import Modal, { ModalBody, ModalFooter, ModalFooterChild, ModalHeader } from '@/components/ui/Modal';
import type {
    IContratoEmpresaCliente,
    ISeccionContratoGenerada,
} from '@/interface/contrato.interface';
import { Dispatch, SetStateAction } from 'react';
import ContratoDocumentoRenderer from './ContratoDocumentoRenderer';

interface IContratoPreviewModalProps {
    isOpen: boolean;
    setIsOpen: Dispatch<SetStateAction<boolean>>;
    contrato: IContratoEmpresaCliente;
    secciones: ISeccionContratoGenerada[];
    ocultarFirmas?: boolean;
    onClose?: () => void;
}

const ContratoPreviewModal = ({
    isOpen,
    setIsOpen,
    contrato,
    secciones,
    ocultarFirmas = false,
    onClose,
}: IContratoPreviewModalProps) => {
    const handleClose = () => {
        setIsOpen(false);
        onClose?.();
    };

    return (
        <Modal isOpen={isOpen} setIsOpen={setIsOpen} fullScreen isScrollable>
            <ModalHeader>Documento completo del contrato</ModalHeader>
            <ModalBody>
                <div className='mx-auto max-w-4xl py-6'>
                    <div className='rounded-lg border border-gray-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900'>
                        <ContratoDocumentoRenderer
                            secciones={secciones}
                            contrato={contrato}
                            ocultarFirmas={ocultarFirmas}
                            wrapperClassName='flex flex-col gap-6'
                        />
                    </div>
                </div>
            </ModalBody>
            <ModalFooter>
                <ModalFooterChild />
                <ModalFooterChild>
                    <Button variant='solid' onClick={handleClose}>
                        Cerrar
                    </Button>
                </ModalFooterChild>
            </ModalFooter>
        </Modal>
    );
};

export default ContratoPreviewModal;
