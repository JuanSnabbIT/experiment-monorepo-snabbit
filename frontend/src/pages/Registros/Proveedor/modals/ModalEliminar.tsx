import Button, { TButtonSize } from '@/components/ui/Button';
import Modal, {
    ModalBody,
    ModalFooter,
    ModalFooterChild,
    ModalHeader,
} from '@/components/ui/Modal';
import { useState } from 'react';
import { toast } from 'react-toastify';
import ApiService from '@/services/ApiService';
import Badge from '@/components/ui/Badge';
import Tooltip from '@/components/ui/Tooltip';

interface ModalEliminarProps {
    mensaje: string;
    peticionUrl: string;
    onDispatch: () => void;
    nombre?: string;
    method?: string;
    values?: any;
    children?: React.ReactNode;
    footerContent?: React.ReactNode;
    buttonSize?: TButtonSize;
}

const ModalEliminar = ({
    mensaje,
    peticionUrl,
    onDispatch,
    nombre,
    method,
    values,
    children,
    buttonSize = 'default',
}: ModalEliminarProps) => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleDelete = async () => {
        try {
            await ApiService.fetchData({
                url: peticionUrl,
                method: method || 'delete',
                data: values,
            });
            onDispatch();
            toast.success(`${nombre ? `${nombre} e` : 'E'}liminado correctamente`, {
                autoClose: 1000,
            });
            setIsModalOpen(false);
        } catch (error) {
            toast.error(`Error eliminando ${nombre} : ${error}`);
        }
    };

    return (
        <>
            <Tooltip text='Eliminar'>
                <Button
                    icon='HeroTrash'
                    color='red'
                    variant='solid'
                    size={buttonSize}
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsModalOpen(true);
                    }}
                />
            </Tooltip>
            <Modal size={'lg'} isOpen={isModalOpen} setIsOpen={setIsModalOpen}>
                <ModalHeader>
                    <Badge className='text-2xl'>Confirmar Eliminación {nombre}</Badge>{' '}
                </ModalHeader>
                <ModalBody>
                    <p className='text-cente'>{mensaje}</p>
                    {children}
                </ModalBody>
                <ModalFooter>
                    <ModalFooterChild></ModalFooterChild>
                    <ModalFooterChild>
                        <Button color='red' onClick={() => setIsModalOpen(false)}>
                            Cancelar
                        </Button>
                        <Button variant='solid' onClick={handleDelete}>
                            Eliminar
                        </Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    );
};

export default ModalEliminar;
