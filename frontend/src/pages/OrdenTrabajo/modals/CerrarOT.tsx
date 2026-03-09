import Button from '@/components/ui/Button';
import Tooltip from '@/components/ui/Tooltip';
import {
    useGetDetalleOrdenTrabajoQuery,
    useGetRendicionDetalleQuery,
    useUpdateOrdenTrabajoMutation,
} from '@/store/slices/ordenTrabajo/ordenTrabajoApi';
import { confirmAlert } from '@/utils/sweetAlert';
import { useEffect, useMemo, useState } from 'react';
// import SeguimientoEnCerrarOT from "./components/SeguimientoEnCerrarOT"
import { getErrorMessage } from '@/utils/errorHandlers';
import { useParams } from 'react-router-dom';
import { toast } from 'react-toastify';

function CerrarOT() {
    const { id } = useParams<{ id: string }>();
    const ordenId = id ? Number(id) : undefined;
    // ✅ No capturamos refetch - confiar en invalidatesTags
    const { data: detalleOrdenTrabajo } = useGetDetalleOrdenTrabajoQuery(
        ordenId ?? 0,
        { skip: !ordenId },
    );
    const [updateOrdenTrabajo] = useUpdateOrdenTrabajoMutation();
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

    const isRendicionValida = useMemo(() => {
        const normalized = rendicionEstado?.toLowerCase()?.trim();
        return normalized === '2' || normalized === '4' || 
               normalized === 'aprobada' || normalized === 'pagada';
    }, [rendicionEstado]);

    const isPrefacturaFacturada = useMemo(() => {
        const normalized = prefacturaEstado?.toLowerCase()?.trim() ?? '';
        return normalized === 'facturado';
    }, [prefacturaEstado]);

    const missingRendicionReason = useMemo(() => {
        if (!detalleOrdenTrabajo?.rendicion_asociada_id) {
            return 'La rendición correspondiente a esta OT no está aprobada o pagada.';
        }
        if (!isRendicionValida) {
            return 'La rendición correspondiente a esta OT no está aprobada o pagada.';
        }
        return null;
    }, [detalleOrdenTrabajo?.rendicion_asociada_id, isRendicionValida]);

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
                            } catch (error: unknown) {
                                const mensajeError = getErrorMessage(error);
                                toast.error(mensajeError || 'Error al cerrar la OT', {
                                    toastId: 'Error al cerrar la OT',
                                });
                            } finally {
                                setIsBusy(false);
                            }
                        }}
                    />
                </span>
            </Tooltip>
        </>
    );
}

export default CerrarOT;
