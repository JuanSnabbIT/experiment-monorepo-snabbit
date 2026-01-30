import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal, {
    ModalBody,
    ModalFooter,
    ModalFooterChild,
    ModalHeader,
} from '@/components/ui/Modal';
import Tooltip from '@/components/ui/Tooltip';
import ApiService from '@/services/ApiService';
import { useAppDispatch } from '@/store';
import { useState } from 'react';
import { toast } from 'react-toastify';

import {
    ICotizacion,
    IItemCotizacion,
    ISolicitanteCotizacion,
} from '@/interface/cotizaciones.interface';

function EnviarCotizacionParaAprobar({
    cotizacion,
    solicitantes = [],
    items = [],
    onEnviarChange,
}: {
    cotizacion: ICotizacion;
    solicitantes: ISolicitanteCotizacion[];
    items: IItemCotizacion[];
    onEnviarChange?: () => void;
}) {
    const dispatch = useAppDispatch();
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isTakingLong, setIsTakingLong] = useState<boolean>(false);

    return (
        <>
            <Tooltip text='Enviar Cotizacion para Aprobar'>
                <Button
                    variant='solid'
                    onClick={() => {
                        setIsOpen(true);
                        setIsTakingLong(false);
                    }}
                    icon='DuoMail'></Button>
            </Tooltip>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
                <ModalHeader>
                    <Badge className='text-xl'>Enviar Cotización para Aprobar</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className='flex flex-col gap-4'>
                        <div className='w-full'>La cotización se enviara a estos correos: </div>
                        <div className='flex w-full flex-col gap-4'>
                            {solicitantes && solicitantes.length > 0 ? (
                                solicitantes.map((soli, index) => (
                                    <div key={index} className='grid grid-cols-2 gap-4'>
                                        <div>
                                            <Badge>Email</Badge>
                                            <div className='ml-4'>{soli.email_usuario}</div>
                                        </div>
                                        <div>
                                            <Badge>Nombre</Badge>
                                            <div className='ml-4'>{soli.nombre_usuario}</div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <Badge className='text-xl'>Sin Solicitantes</Badge>
                            )}
                            {items.length === 0 && (
                                <Badge className='text-xl'>Sin Items en la Cotización</Badge>
                            )}
                        </div>
                        {isTakingLong && (
                            <div className='mt-4 animate-pulse rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 shadow-sm'>
                                <div className='mb-1 font-semibold'>Nota informativa:</div>
                                El proceso de envío está tomando más tiempo de lo habitual debido a
                                la generación de los documentos adjuntos. Si lo prefiere, puede
                                cerrar esta ventana; la operación continuará en segundo plano y
                                recibirá la notificación correspondiente una vez finalizada.
                            </div>
                        )}
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
                            isDisable={isLoading}
                            onClick={async () => {
                                if (solicitantes.length > 0 && items.length > 0) {
                                    setIsLoading(true);
                                    setIsTakingLong(false);

                                    const timer = setTimeout(() => {
                                        setIsTakingLong(true);
                                    }, 5000);

                                    try {
                                        const response = await ApiService.fetchData<{
                                            detail: string;
                                        }>({
                                            url: `/api/cotizaciones/${cotizacion?.id}/enviar-cotizacion-solicitantes/`,
                                            method: 'post',
                                            timeout: 90000, // Aumentar timeout local a 90s
                                        });
                                        if (response.data) {
                                            toast.success(response.data.detail, {
                                                autoClose: 1000,
                                            });
                                            if (onEnviarChange) onEnviarChange();
                                            setIsOpen(false);
                                        }
                                    } catch (error: any) {
                                        console.error(
                                            'Error al enviar la cotización',
                                            error?.response?.data || error,
                                        );
                                        if (error?.code === 'ECONNABORTED') {
                                            toast.info(
                                                'El proceso de envío ha sido delegado al servidor. Recibirá una notificación al finalizar.',
                                                { autoClose: 3000 },
                                            );
                                            setIsOpen(false);
                                        } else {
                                            const errorMessage =
                                                error.response?.data?.detail ||
                                                error.message ||
                                                'Error al enviar la cotización';
                                            toast.error(errorMessage, {
                                                toastId: 'error-enviar-cotizacion',
                                            });
                                        }
                                    } finally {
                                        clearTimeout(timer);
                                        setIsLoading(false);
                                        setIsTakingLong(false);
                                    }
                                } else {
                                    toast.error(
                                        'Añada por lo menos 1 solicitante y 1 item a la cotización',
                                        {
                                            toastId:
                                                'Añada por lo menos 1 solicitante a la cotización',
                                        },
                                    );
                                }
                            }}>
                            {isLoading ? 'Enviando...' : 'Enviar'}
                        </Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    );
}

export default EnviarCotizacionParaAprobar;
