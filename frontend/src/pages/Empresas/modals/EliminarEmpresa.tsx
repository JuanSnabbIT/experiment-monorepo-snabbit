import Button from '@/components/ui/Button';
import Modal, {
    ModalBody,
    ModalFooter,
    ModalFooterChild,
    ModalHeader,
} from '@/components/ui/Modal';
import { useDeleteEmpresaMutation } from '@/store/slices/empresa/empresaApi';
import { useState } from 'react';
import { toast } from 'react-toastify';
import Tooltip from '@/components/ui/Tooltip';
import Badge from '@/components/ui/Badge';

interface EliminarEmpresaProps {
    empresaId: string;
}

function EliminarEmpresa({ empresaId }: EliminarEmpresaProps) {
    const [deleteEmpresa] = useDeleteEmpresaMutation();
    const [isOpen, setIsOpen] = useState<boolean>(false);

    return (
        <>
            <Tooltip text='Eliminar'>
                <Button
                    variant='solid'
                    onClick={() => {
                        setIsOpen(true);
                    }}
                    icon='HeroMinusCircle'
                    color='red'
                />
            </Tooltip>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
                <ModalHeader>
                    <Badge className='text-xl'>¿Está seguro que desea eliminar esta Empresa?</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className='flex flex-col gap-4'>
                        <p>
                            Esta acción no se puede deshacer. La empresa será eliminada
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
                                    await deleteEmpresa(empresaId).unwrap();
                                    toast.success('Empresa eliminada', { autoClose: 1000 });
                                    setIsOpen(false);
                                } catch (error: any) {
                                    toast.error(
                                        error.response?.data?.detail ||
                                            'Error al eliminar la empresa',
                                    );
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

export default EliminarEmpresa;
