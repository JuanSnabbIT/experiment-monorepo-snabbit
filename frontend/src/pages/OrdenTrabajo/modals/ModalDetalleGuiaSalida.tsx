import Icon from '@/components/icon/Icon';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal, {
    ModalBody,
    ModalFooter,
    ModalFooterChild,
    ModalHeader,
} from '@/components/ui/Modal';
import { useAppSelector } from '@/store';
import {
    detalleGuiaSalidaBodegaThunk,
    listaItemsEnGuiaSalidaBodegaThunk,
} from '@/store/slices/bodega/bodegaSlice';
import { confirmAlert } from '@/utils/sweetAlert';
import { Dispatch, SetStateAction, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Fragment } from 'react/jsx-runtime';
import { toast } from 'react-toastify';
import ApiService from '@/services/ApiService';
import { useAppDispatch } from '@/store';
import ModalConfirmarRecepcionGuia from './ModalConfirmarRecepcionGuia';

function ModalDetalleGuiaSalida({
    isOpen,
    setIsOpen,
}: {
    isOpen: boolean;
    setIsOpen: Dispatch<SetStateAction<boolean>>;
}) {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { detalleGuiaSalidaBodega, listaItemsEnGuiaSalidaBodega } = useAppSelector(
        (state) => state.bodega,
    );
    const { detalleOrdenTrabajo } = useAppSelector((state) => state.ordenTrabajo);
    const [isOpenConfirmar, setIsOpenConfirmar] = useState(false);

    const [completando, setCompletando] = useState<boolean>(false);

    const completarGuia = async () => {
        if (!detalleGuiaSalidaBodega?.id) return;
        const ok = await confirmAlert({
            title: 'Completar guía de salida',
            text: '¿Estás seguro de que deseas completar esta guía de salida?',
            confirmText: 'Completar',
            cancelText: 'Cancelar',
            icon: 'warning',
        });
        if (!ok) return;
        setCompletando(true);
        try {
            const response = await ApiService.fetchData({
                url: `/api/guia-salida/${detalleGuiaSalidaBodega.id}/comprobar-guia/`,
                method: 'post',
            });
            if (response.data) {
                toast.success('Guía completada', { autoClose: 1000 });
                dispatch(detalleGuiaSalidaBodegaThunk({ id_guia: detalleGuiaSalidaBodega.id }));
                dispatch(
                    listaItemsEnGuiaSalidaBodegaThunk({ id_guia: detalleGuiaSalidaBodega.id }),
                );
            }
        } catch (error: any) {
            toast.error(error.response?.data?.detail || 'Error al completar la guía', {
                toastId: 'Error al completar guia',
            });
        }
        setCompletando(false);
    };
    return (
        <>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
                <ModalHeader>
                    <Badge className='text-xl'>Detalle Guia de Salida</Badge>
                </ModalHeader>
                <ModalBody>
                    {detalleGuiaSalidaBodega ? (
                        <>
                            <div className='grid grid-cols-1 gap-4'>
                                <div>
                                    <Badge>Estado</Badge>
                                    <div className='ml-4'>
                                        {detalleGuiaSalidaBodega?.estado_label}
                                    </div>
                                </div>
                                <div>
                                    <Badge>Creado Por</Badge>
                                    <div className='ml-4'>
                                        {detalleGuiaSalidaBodega?.nombre_creado_por}
                                    </div>
                                </div>
                                <div>
                                    <Badge>Recibido Por</Badge>
                                    <div className='ml-4'>
                                        {detalleGuiaSalidaBodega?.nombre_recibido_por}
                                    </div>
                                </div>
                                <div>
                                    <Badge>Motivo</Badge>
                                    <div className='ml-4'>{detalleGuiaSalidaBodega?.motivo}</div>
                                </div>
                            </div>
                            <div
                                className={`grid ${detalleGuiaSalidaBodega?.estado === 'R' || detalleGuiaSalidaBodega?.estado === 'PR' ? 'grid-cols-4' : 'grid-cols-3'}`}>
                                <div className='col-span-1 border'>
                                    <Badge>Item</Badge>
                                </div>
                                <div className='col-span-1 border'>
                                    <Badge>Stock Original</Badge>
                                </div>
                                <div className='col-span-1 border'>
                                    <Badge>Cantidad Rebajada</Badge>
                                </div>
                                {(detalleGuiaSalidaBodega?.estado === 'R' ||
                                    detalleGuiaSalidaBodega?.estado === 'PR') && (
                                    <div className='col-span-1 border'>
                                        <Badge>Cantidad Devuelta</Badge>
                                    </div>
                                )}
                                {listaItemsEnGuiaSalidaBodega.map((item, index) => (
                                    <Fragment key={index}>
                                        <div className='col-span-1 border'>
                                            <div className='ml-4 flex flex-col'>
                                                <div className='w-full'>
                                                    {item.datos_stock.datos_item.nombre}
                                                </div>
                                                {/* <div className="w-full text-xs ml-2 flex gap-1"><Icon icon="DuoPenRuler" size="text-base" /> {item.datos_stock.datos_item.tamanio} {item.datos_stock.datos_item.unidad_label}</div> */}
                                                <div className='mt-2 w-full'>
                                                    <Button
                                                        size='xs'
                                                        className='!px-1'
                                                        icon='DuoBox3'
                                                        onClick={() => {
                                                            if (
                                                                item.datos_stock.datos_item
                                                                    .fabricante
                                                            )
                                                                navigate(
                                                                    `/registros/detalle-fabricante/${item.datos_stock.datos_item.fabricante}`,
                                                                );
                                                        }}>
                                                        {item.datos_stock.datos_item
                                                            .datos_fabricante?.nombre ||
                                                            'Sin Fabricante'}
                                                    </Button>
                                                </div>
                                                <div className='w-full'>
                                                    <Button
                                                        size='xs'
                                                        className='!px-1'
                                                        icon='DuoAlignJustify'
                                                        onClick={() => {
                                                            if (
                                                                item.datos_stock.datos_item
                                                                    .categoria
                                                            )
                                                                navigate(
                                                                    `/registros/detalle-categoria/${item.datos_stock.datos_item.categoria}`,
                                                                );
                                                        }}>
                                                        {item.datos_stock.datos_item.datos_categoria
                                                            ?.nombre || 'Sin Categoria'}
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                        <div className='col-span-1 border'>
                                            <div className='ml-4'>
                                                {detalleGuiaSalidaBodega?.estado === 'P'
                                                    ? item.datos_stock.cantidad
                                                    : item.cantidad_original}
                                            </div>
                                        </div>
                                        <div className='col-span-1 border'>
                                            <div className='ml-4'>{item.cantidad_rebajada}</div>
                                        </div>
                                        {(detalleGuiaSalidaBodega?.estado === 'R' ||
                                            detalleGuiaSalidaBodega?.estado === 'PR') && (
                                            <div className='col-span-1 border'>
                                                <div className='ml-4'>{item.cantidad_devuelta}</div>
                                            </div>
                                        )}
                                    </Fragment>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div> No se encontro la guia de salida.</div>
                    )}
                </ModalBody>
                <ModalFooter>
                    {detalleGuiaSalidaBodega &&
                    (detalleGuiaSalidaBodega.estado === 'FR' ||
                        detalleGuiaSalidaBodega.estado === 'ET') ? (
                        <>
                            <ModalFooterChild>
                                <Button
                                    variant='outline'
                                    color='red'
                                    onClick={() => setIsOpen(false)}>
                                    Cerrar
                                </Button>
                            </ModalFooterChild>
                            <ModalFooterChild>
                                <Button
                                    variant='outline'
                                    color='emerald'
                                    isDisable={completando}
                                    onClick={completarGuia}>
                                    Completar Guía
                                </Button>
                            </ModalFooterChild>
                            <ModalFooterChild>
                                <Button
                                    variant='solid'
                                    color='blue'
                                    onClick={() => {
                                        setIsOpen(false);
                                        setIsOpenConfirmar(true);
                                    }}>
                                    Confirmar Recepción
                                </Button>
                            </ModalFooterChild>
                        </>
                    ) : null}
                </ModalFooter>
            </Modal>

            {detalleGuiaSalidaBodega && detalleOrdenTrabajo && (
                <ModalConfirmarRecepcionGuia
                    isOpen={isOpenConfirmar}
                    setIsOpen={setIsOpenConfirmar}
                    guiaId={detalleGuiaSalidaBodega.id}
                    clienteSolicitanteId={detalleOrdenTrabajo.cliente_solicitante}
                    clienteSolicitanteNombre={detalleOrdenTrabajo.nombre_solicitante}
                    onSuccess={() => {
                        setIsOpenConfirmar(false);
                    }}
                />
            )}
        </>
    );
}

export default ModalDetalleGuiaSalida;
