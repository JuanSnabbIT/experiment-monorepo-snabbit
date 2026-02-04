import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal, {
    ModalBody,
    ModalFooter,
    ModalFooterChild,
    ModalHeader,
} from '@/components/ui/Modal';
import Tooltip from '@/components/ui/Tooltip';
import {
    useGetDetalleOrdenTrabajoQuery,
    useGetRendicionDetalleQuery,
    useUpdateOrdenTrabajoMutation,
} from '@/store/slices/ordenTrabajo/ordenTrabajoApi';
import { useEffect, useMemo, useState } from 'react';
import { confirmAlert } from '@/utils/sweetAlert';
// import SeguimientoEnCerrarOT from "./components/SeguimientoEnCerrarOT"
import { toast } from 'react-toastify';
import { getErrorMessage } from '@/utils/errorHandlers';
import { useParams } from 'react-router-dom';

function CerrarOT() {
    const { id } = useParams<{ id: string }>();
    const ordenId = id ? Number(id) : undefined;
    // ✅ No capturamos refetch - confiar en invalidatesTags
    const { data: detalleOrdenTrabajo } = useGetDetalleOrdenTrabajoQuery(
        ordenId ?? 0,
        { skip: !ordenId },
    );
    const [updateOrdenTrabajo] = useUpdateOrdenTrabajoMutation();
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [isBusy, setIsBusy] = useState<boolean>(false);
    const [rendicionEstado, setRendicionEstado] = useState<string | null>(null);
    const [prefacturaEstado, setPrefacturaEstado] = useState<string | null>(
        detalleOrdenTrabajo?.cierre_administrativo?.estado_cierre ?? null,
    );
    const { data: rendicionDetalle } = useGetRendicionDetalleQuery(
        detalleOrdenTrabajo?.rendicion_asociada_id ?? 0,
        { skip: !detalleOrdenTrabajo?.rendicion_asociada_id },
    );

    useEffect(() => {
        setPrefacturaEstado(detalleOrdenTrabajo?.cierre_administrativo?.estado_cierre ?? null);
    }, [detalleOrdenTrabajo?.cierre_administrativo]);

    useEffect(() => {
        if (!detalleOrdenTrabajo?.rendicion_asociada_id) {
            setRendicionEstado(null);
            return;
        }
        setRendicionEstado(rendicionDetalle?.estado ?? rendicionDetalle?.estado_label ?? null);
    }, [detalleOrdenTrabajo?.rendicion_asociada_id, rendicionDetalle]);

    const isRendicionRendida = useMemo(() => {
        const normalized = rendicionEstado?.toLowerCase()?.trim();
        return normalized === 'rendida' || normalized === '4';
    }, [rendicionEstado]);

    const isPrefacturaFacturada = useMemo(() => {
        const normalized = prefacturaEstado?.toLowerCase()?.trim() ?? '';
        return normalized.includes('factur');
    }, [prefacturaEstado]);

    const missingRendicionReason = useMemo(() => {
        if (!detalleOrdenTrabajo?.rendicion_asociada_id) {
            return 'La rendición correspondiente a esta OT no está rendida.';
        }
        if (!isRendicionRendida) {
            return 'La rendición correspondiente a esta OT no está rendida.';
        }
        return null;
    }, [detalleOrdenTrabajo?.rendicion_asociada_id, isRendicionRendida]);

    const missingPrefacturaReason = useMemo(() => {
        if (!detalleOrdenTrabajo?.cierre_administrativo) {
            return 'La facturación correspondiente a esta OT no está facturada.';
        }
        if (!isPrefacturaFacturada) {
            return 'La facturación correspondiente a esta OT no está facturada.';
        }
        return null;
    }, [detalleOrdenTrabajo?.cierre_administrativo, isPrefacturaFacturada]);

    const getMissingReasons = useMemo(() => {
        return [missingRendicionReason, missingPrefacturaReason].filter(
            (reason): reason is string => Boolean(reason),
        );
    }, [missingPrefacturaReason, missingRendicionReason]);

    const tooltipText = getMissingReasons.length
        ? getMissingReasons.join('\n')
        : 'Cerrar la orden de trabajo';
    const canCloseOrden = getMissingReasons.length === 0;

    return (
        <>
            <Tooltip text={tooltipText}>
                <span>
                    <Button
                        variant='solid'
                        color='red'
                        icon='HeroHandRaised'
                        isDisable={!canCloseOrden}
                        onClick={() => {
                            if (!canCloseOrden) return;
                            setIsOpen(true);
                        }}
                    />
                </span>
            </Tooltip>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen} isStaticBackdrop={true}>
                <ModalHeader>
                    <Badge className='text-xl'>Cerrar la Orden de Trabajo</Badge>
                </ModalHeader>
                <ModalBody>
                    {/* {listaDetallesSeguimientosOT && listaDetallesSeguimientosOT.detalles.length > 0 ? listaDetallesSeguimientosOT.detalles.map((detalle, index) => (
                        <div key={index} className="flex flex-col gap-4">
                            {detalle.seguimientos.length > 0 && detalle.seguimientos.map((seguimiento, index) => (
                                <Fragment key={index}>
                                    <SeguimientoEnCerrarOT seguimiento={seguimiento} id_orden={detalleOrdenTrabajo?.id} id_detalle={detalle.detalle_id} />
                                </Fragment>
                            ))}
                            {detalle.visita && (
                                <div className="w-full">
                                    {detalle.visita.asistencias.length > 0 && detalle.visita.asistencias.map((asistencia, index) => (
                                        <div className="w-full" key={index}>asistencia {asistencia.id}</div>
                                    ))}
                                    {detalle.visita.entregas.length > 0 && detalle.visita.entregas.map((entrega, index) => (
                                        <div className="w-full" key={index}>entrega {entrega.id}</div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )) : (
                        <div>Sin Detalles en la OT</div>
                    )} */}
                    <div>¿Esta seguro(a) de querer cerrar la OT?</div>
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
                        <Tooltip text={tooltipText}>
                            <span>
                                <Button
                                    variant='solid'
                                    color='red'
                                    isDisable={isBusy || !canCloseOrden}
                                    onClick={async () => {
                                        if (!detalleOrdenTrabajo || !canCloseOrden) return;
                                        setIsBusy(true);
                                        try {
                                            const confirmed = await confirmAlert({
                                                title: 'Cerrar OT',
                                                text: '¿Confirmas cerrar la orden de trabajo y marcarla como Validada y Cerrada?',
                                                confirmText: 'Cerrar OT',
                                                cancelText: 'Cancelar',
                                                icon: 'warning',
                                                confirmColor: '#dc2626',
                                            });
                                            if (!confirmed) {
                                                setIsBusy(false);
                                                return;
                                            }

                                            await updateOrdenTrabajo({
                                                id: detalleOrdenTrabajo.id,
                                                data: { estado: 'cerrada' },
                                            }).unwrap();
                                            toast.success('Orden cerrada', { autoClose: 1000 });
                                            // ✅ NO llamar refetchDetalle() - RTK Query invalidará automáticamente
                                            setIsOpen(false);
                                        } catch (error: unknown) {
                                            const mensajeError = getErrorMessage(error);
                                            toast.error(mensajeError || 'Error al cerrar la OT', {
                                                toastId: 'Error al cerrar la OT',
                                            });
                                        } finally {
                                            setIsBusy(false);
                                        }
                                    }}>
                                    Cerrar la OT
                                </Button>
                            </span>
                        </Tooltip>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    );
}

export default CerrarOT;
