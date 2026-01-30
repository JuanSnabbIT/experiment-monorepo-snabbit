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
    useComprobarGuiaSalidaMutation,
    useGetDetalleGuiaSalidaQuery,
    useGetDetalleOrdenTrabajoQuery,
    useGetItemsGuiaSalidaQuery,
} from '@/store/slices/ordenTrabajo/ordenTrabajoApi';
import { confirmAlert } from '@/utils/sweetAlert';
import { Dispatch, SetStateAction, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Fragment } from 'react/jsx-runtime';
import { toast } from 'react-toastify';
import ModalConfirmarRecepcionGuia from './ModalConfirmarRecepcionGuia';

function ModalDetalleGuiaSalida({
    isOpen,
    setIsOpen,
}: {
    isOpen: boolean;
    setIsOpen: Dispatch<SetStateAction<boolean>>;
}) {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const ordenId = id ? Number(id) : undefined;
    const { detalleGuiaSalidaBodega, listaItemsEnGuiaSalidaBodega } = useAppSelector(
        (state) => state.bodega,
    );
    const { data: detalleOrdenTrabajo } = useGetDetalleOrdenTrabajoQuery(ordenId ?? 0, {
        skip: !ordenId,
    });
    const guiaId = detalleGuiaSalidaBodega?.id;
    const { data: detalleGuiaSalida } = useGetDetalleGuiaSalidaQuery(guiaId ?? 0, {
        skip: !guiaId,
    });
    const { data: listaItemsGuiaSalida = [] } = useGetItemsGuiaSalidaQuery(guiaId ?? 0, {
        skip: !guiaId,
    });
    const [comprobarGuiaSalida] = useComprobarGuiaSalidaMutation();
    const [isOpenConfirmar, setIsOpenConfirmar] = useState(false);

    const [completando, setCompletando] = useState<boolean>(false);

    const guiaActual = detalleGuiaSalida ?? detalleGuiaSalidaBodega;
    const itemsGuiaActual =
        listaItemsGuiaSalida.length > 0 ? listaItemsGuiaSalida : listaItemsEnGuiaSalidaBodega;

    const completarGuia = async () => {
        if (!guiaId) return;
        const ok = await confirmAlert({
            title: 'Completar guia de salida',
            text: 'Estas seguro de que deseas completar esta guia de salida?',
            confirmText: 'Completar',
            cancelText: 'Cancelar',
            icon: 'warning',
        });
        if (!ok) return;
        setCompletando(true);
        try {
            await comprobarGuiaSalida(guiaId).unwrap();
            toast.success('Guia completada', { autoClose: 1000 });
        } catch (error: any) {
            toast.error(error.response?.data?.detail || 'Error al completar la guia', {
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
                    {guiaActual ? (
                        <>
                            <div className='grid grid-cols-1 gap-4'>
                                <div>
                                    <Badge>Estado</Badge>
                                    <div className='ml-4'>
                                        {guiaActual?.estado_label}
                                    </div>
                                </div>
                                <div>
                                    <Badge>Creado Por</Badge>
                                    <div className='ml-4'>
                                        {guiaActual?.nombre_creado_por}
                                    </div>
                                </div>
                                <div>
                                    <Badge>Recibido Por</Badge>
                                    <div className='ml-4'>
                                        {guiaActual?.nombre_recibido_por}
                                    </div>
                                </div>
                                <div>
                                    <Badge>Motivo</Badge>
                                    <div className='ml-4'>{guiaActual?.motivo}</div>
                                </div>
                            </div>
                            <div
                                className={`grid ${guiaActual?.estado === 'R' || guiaActual?.estado === 'PR' ? 'grid-cols-4' : 'grid-cols-3'}`}>
                                <div className='col-span-1 border'>
                                    <Badge>Item</Badge>
                                </div>
                                <div className='col-span-1 border'>
                                    <Badge>Stock Original</Badge>
                                </div>
                                <div className='col-span-1 border'>
                                    <Badge>Cantidad Rebajada</Badge>
                                </div>
                                {(guiaActual?.estado === 'R' ||
                                    guiaActual?.estado === 'PR') && (
                                    <div className='col-span-1 border'>
                                        <Badge>Cantidad Devuelta</Badge>
                                    </div>
                                )}
                                {itemsGuiaActual.map((item, index) => (
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
                                                {guiaActual?.estado === 'P'
                                                    ? item.datos_stock.cantidad
                                                    : item.cantidad_original}
                                            </div>
                                        </div>
                                        <div className='col-span-1 border'>
                                            <div className='ml-4'>{item.cantidad_rebajada}</div>
                                        </div>
                                        {(guiaActual?.estado === 'R' ||
                                            guiaActual?.estado === 'PR') && (
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
                    {guiaActual &&
                    (guiaActual.estado === 'FR' ||
                        guiaActual.estado === 'ET') ? (
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

            {guiaActual && detalleOrdenTrabajo && (
                <ModalConfirmarRecepcionGuia
                    isOpen={isOpenConfirmar}
                    setIsOpen={setIsOpenConfirmar}
                    guiaId={guiaActual.id}
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
