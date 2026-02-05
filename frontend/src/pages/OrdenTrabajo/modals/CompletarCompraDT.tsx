import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal, {
    ModalBody,
    ModalFooter,
    ModalFooterChild,
    ModalHeader,
} from '@/components/ui/Modal';
import Tooltip from '@/components/ui/Tooltip';
import { getErrorMessage } from '@/utils/errorHandlers';
import {
    useCompletarCompraDetalleTrabajoMutation,
    useGetDetalleCompraQuery,
    useGetDetalleOrdenTrabajoQuery,
    useGetDetalleTrabajoQuery,
    useGetItemsCompraDetalleQuery,
} from '@/store/slices/ordenTrabajo/ordenTrabajoApi';
import { useRef, useState } from 'react';
import { toast } from 'react-toastify';
import SignatureCanvas from 'react-signature-canvas';
import { useNavigate, useParams } from 'react-router-dom';

function CompletarCompraDT({}) {
    const navigate = useNavigate();
    const { idOrden, idDetalle } = useParams<{ idOrden: string; idDetalle: string }>();
    const ordenId = idOrden ? Number(idOrden) : undefined;
    const detalleId = idDetalle ? Number(idDetalle) : undefined;
    const { data: detalleOrdenTrabajo } = useGetDetalleOrdenTrabajoQuery(ordenId ?? 0, {
        skip: !ordenId,
    });
    const { data: detalleDelDetalleTrabajo } = useGetDetalleTrabajoQuery(
        { ordenId: ordenId ?? 0, detalleId: detalleId ?? 0 },
        { skip: !ordenId || !detalleId },
    );
    const { data: detalleCompra } = useGetDetalleCompraQuery(
        detalleDelDetalleTrabajo?.trabajo_id ?? 0,
        { skip: !detalleDelDetalleTrabajo?.trabajo_id },
    );
    const { data: listaItemsCompra = [] } = useGetItemsCompraDetalleQuery(
        detalleCompra?.id ?? 0,
        { skip: !detalleCompra?.id },
    );
    const [completarCompra] = useCompletarCompraDetalleTrabajoMutation();
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const sigCanvas = useRef<SignatureCanvas | null>(null);

    const clear = () => {
        if (sigCanvas.current) {
            sigCanvas.current.clear();
        }
    };

    return (
        <>
            <Tooltip text='Completar Compra'>
                <Button
                    variant='solid'
                    color='emerald'
                    icon='HeroCheck'
                    onClick={() => {
                        setIsOpen(true);
                    }}></Button>
            </Tooltip>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
                <ModalHeader>
                    <Badge className='text-xl'>Completar Compra</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className='flex flex-col gap-4'>
                        <div className='ml-4'>Estas seguro(a) de querer completar la compra?</div>
                        <div className=''>
                            <Badge>Firma</Badge>
                            <div
                                className='signature-surface'
                                style={{ width: '100%', maxWidth: '600px', margin: '0 auto' }}>
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
                    </div>
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
                            color='emerald'
                            isDisable={listaItemsCompra.some(
                                (item) => item.cantidad <= 0 || item.precio <= 0,
                            )}
                            onClick={async () => {
                                try {
                                    if (!detalleOrdenTrabajo || !detalleDelDetalleTrabajo) return;
                                    await completarCompra({
                                        ordenId: detalleOrdenTrabajo.id,
                                        detalleId: detalleDelDetalleTrabajo.id,
                                        data: {
                                            firma: sigCanvas.current?.toDataURL('image/png'),
                                        },
                                    }).unwrap();
                                    setIsOpen(false);
                                    navigate(
                                        `/orden-trabajo/detalle-orden-trabajo/${detalleDelDetalleTrabajo.id}`,
                                    );
                                    toast.success('Compra completada', { autoClose: 1000 });
                                } catch (error: unknown) {
                                    toast.error(
                                        getErrorMessage(error) || 'Error al completar la compra',
                                        { toastId: 'Error al completar la compra' },
                                    );
                                }
                            }}>
                            Completar
                        </Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    );
}

export default CompletarCompraDT;
