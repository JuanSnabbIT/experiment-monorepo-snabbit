import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal, {
    ModalBody,
    ModalFooter,
    ModalFooterChild,
    ModalHeader,
} from '@/components/ui/Modal';
import Tooltip from '@/components/ui/Tooltip';
import { IFirmaConfidencialidad } from '@/interface/contrato.interface';
import ApiService from '@/services/ApiService';
import { listaFirmasConfidencialidadThunk, useAppDispatch, useAppSelector } from '@/store';
import { useState } from 'react';
import { toast } from 'react-toastify';

function EliminarConfidencialidadContrato({ firma }: { firma: IFirmaConfidencialidad }) {
    const dispatch = useAppDispatch();
    const { detalleContratoEmpresaCliente } = useAppSelector((state) => state.contrato);
    const [isOpen, setIsOpen] = useState<boolean>(false);

    return (
        <>
            <Tooltip text='Eliminar Firma de Confidencialidad'>
                <Button
                    variant='solid'
                    color='red'
                    icon='HeroTrash'
                    onClick={() => {
                        setIsOpen(true);
                    }}></Button>
            </Tooltip>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
                <ModalHeader>
                    <Badge className='text-xl'>
                        ¿Esta seguro(a) que desea de eliminar esta firma?
                    </Badge>
                </ModalHeader>
                <ModalBody>
                    <div>Esta accion no se puede deshacer</div>
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
                            color='red'
                            onClick={async () => {
                                try {
                                    const response = await ApiService.fetchData({
                                        url: `/api/contratos/${detalleContratoEmpresaCliente?.id}/firmas/${firma.id}/`,
                                        method: 'delete',
                                    });
                                    if (response.status === 204) {
                                        dispatch(
                                            listaFirmasConfidencialidadThunk({
                                                id_contrato: detalleContratoEmpresaCliente?.id,
                                            }),
                                        );
                                        setIsOpen(false);
                                    }
                                } catch (error: any) {
                                    toast.error(
                                        error.resposne.data || 'Error al eliminar la firma',
                                        { toastId: 'Error al eliminar la firma' },
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

export default EliminarConfidencialidadContrato;
