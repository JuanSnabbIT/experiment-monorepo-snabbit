import Input from '@/components/form/Input';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal, { ModalBody, ModalHeader } from '@/components/ui/Modal';
import Tooltip from '@/components/ui/Tooltip';
import ApiService from '@/services/ApiService';
import { useAppDispatch } from '@/store';
import { ordenCompraApi } from '@/store/slices/bodega/ordenCompraApi';
import { getErrorMessage } from '@/utils/errorHandlers';
import { useState } from 'react';
import { toast } from 'react-toastify';

function SubirCotizacion({
    nombre_cotizacion,
    cotizacion,
    id_orden,
}: {
    nombre_cotizacion: string;
    cotizacion: string;
    id_orden: number;
}) {
    const dispatch = useAppDispatch();
    const [isOpen, setIsOpen] = useState<boolean>(false);

    return (
        <>
            <Tooltip text='Subir Cotización'>
                <Button
                    variant='solid'
                    icon='HeroDocumentArrowUp'
                    color='emerald'
                    onClick={() => {
                        setIsOpen(true);
                    }}></Button>
            </Tooltip>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
                <ModalHeader>
                    <Badge className='text-xl'>Subir Cotización</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className='flex flex-col gap-4'>
                        <div className='w-full text-center text-xl'>
                            {nombre_cotizacion === 'Sin Cotización'
                                ? 'Al subir la cotización podra descargarla más adelante.'
                                : 'Ya existe una cotización al cambiarla se debera volver a aprobar la orden.'}
                        </div>
                        <div className='w-full'>
                            <Badge>Cotización</Badge>
                            {nombre_cotizacion === 'Sin Cotización' ? (
                                <div className='ml-4'>{nombre_cotizacion}</div>
                            ) : (
                                <Button
                                    variant='outline'
                                    onClick={() => {
                                        window.open(cotizacion, '_blank');
                                    }}>
                                    {nombre_cotizacion.split('/')[1]}
                                </Button>
                            )}
                        </div>
                        <div className='w-full'>
                            <Badge>Subir Archivo</Badge>
                            <Input
                                name='file'
                                type='file'
                                onChange={async (e) => {
                                    if (e.target.files) {
                                        try {
                                            const form = new FormData();
                                            form.append('cotizacion', e.target.files[0]);
                                            const response = await ApiService.fetchData({
                                                url: `/api/ordenes-compra/${id_orden}/`,
                                                method: 'patch',
                                                headers: { 'Content-Type': 'multipart/form-data' },
                                                data: form,
                                            });
                                            if (response.data) {
                                                if (nombre_cotizacion === 'Sin Cotización') {
                                                    toast.success('Cotización subida', {
                                                        autoClose: 1000,
                                                    });
                                                    // dispatch(listaOrdenesCompraThunk({id_empresa}))
                                                    dispatch(
                                                        ordenCompraApi.util.invalidateTags([
                                                            'OrdenCompraList',
                                                            'MisOrdenesCompraList',
                                                        ]),
                                                    );
                                                    setIsOpen(false);
                                                } else {
                                                    const responseCambio =
                                                        await ApiService.fetchData({
                                                            url: `/api/ordenes-compra/${id_orden}/`,
                                                            method: 'patch',
                                                            headers: {
                                                                'Content-Type': 'application/json',
                                                            },
                                                            data: JSON.stringify({ estado: '-' }),
                                                        });
                                                    if (responseCambio.data) {
                                                        toast.success(
                                                            'Cotización subida y cambiada a borrador',
                                                            { autoClose: 1000 },
                                                        );
                                                        // dispatch(listaOrdenesCompraThunk({id_empresa}))
                                                        dispatch(
                                                            ordenCompraApi.util.invalidateTags([
                                                                'OrdenCompraList',
                                                                'MisOrdenesCompraList',
                                                            ]),
                                                        );
                                                        setIsOpen(false);
                                                    }
                                                }
                                            }
                                        } catch (error: unknown) {
                                            const errorMessage =
                                                getErrorMessage(error) ||
                                                'Error al subir la cotizacion';
                                            toast.error(
                                                typeof errorMessage === 'string'
                                                    ? errorMessage
                                                    : 'Error al subir la cotizacion',
                                                {
                                                    toastId: 'error-subir-cotizacion',
                                                },
                                            );
                                        }
                                    } else {
                                        toast.error('Error al subir el archivo');
                                    }
                                }}
                            />
                        </div>
                    </div>
                </ModalBody>
            </Modal>
        </>
    );
}

export default SubirCotizacion;
