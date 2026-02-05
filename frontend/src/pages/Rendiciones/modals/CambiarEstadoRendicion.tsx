import Button from '@/components/ui/Button';
import Tooltip from '@/components/ui/Tooltip';
import {
    useAprobarRendicionMutation,
    useGetRendicionQuery,
    usePagarRendicionMutation,
    useRechazarRendicionMutation,
    useUpdateRendicionMutation,
} from '@/store';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { getErrorMessage } from '@/utils/errorHandlers';
import Swal from 'sweetalert2';

function CambiarEstadoRendicion() {
    const { id } = useParams();
    const rendicionId = id ?? '';
    const { data: detalleRendicion } = useGetRendicionQuery(rendicionId, { skip: !id });
    const [isBusy, setIsBusy] = useState<boolean>(false);
    const [updateRendicion] = useUpdateRendicionMutation();
    const [aprobarRendicion] = useAprobarRendicionMutation();
    const [rechazarRendicion] = useRechazarRendicionMutation();
    const [pagarRendicion] = usePagarRendicionMutation();

    const handleEnviarAAprobacion = async () => {
        const { isConfirmed } = await Swal.fire({
            title: '¿Enviar a Aprobación?',
            text: 'Una vez enviada, no podrás editar la rendición.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sí, enviar',
            cancelButtonText: 'Cancelar',
        });

        if (isConfirmed && detalleRendicion) {
            setIsBusy(true);
            try {
                await updateRendicion({
                    id: detalleRendicion.id,
                    data: { estado: '1' },
                }).unwrap();

                Swal.fire({
                    title: '¡Éxito!',
                    text: 'Rendición enviada a aprobación',
                    icon: 'success',
                    timer: 2000,
                });
            } catch (error: unknown) {
                const mensajeError = getErrorMessage(error);
                Swal.fire({
                    title: 'Error',
                    text: mensajeError || 'Error al enviar la rendición',
                    icon: 'error',
                });
            } finally {
                setIsBusy(false);
            }
        }
    };

    const handleRechazar = async () => {
        const { value: motivo, isDismissed } = await Swal.fire({
            title: 'Rechazar Rendición',
            input: 'textarea',
            inputLabel: 'Motivo de Rechazo',
            inputPlaceholder: 'Ingresa el motivo del rechazo (mínimo 10 caracteres)...',
            inputAttributes: {
                'aria-label': 'Motivo de rechazo',
                minlength: '10',
            },
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Rechazar',
            cancelButtonText: 'Cancelar',
            preConfirm: (value: string) => {
                if (!value || value.trim().length < 10) {
                    Swal.showValidationMessage('El motivo debe tener al menos 10 caracteres');
                    return false;
                }
                return value;
            },
        });

        if (motivo && !isDismissed && detalleRendicion) {
            setIsBusy(true);
            try {
                await rechazarRendicion({
                    id: detalleRendicion.id,
                    motivo_rechazo: motivo,
                }).unwrap();

                Swal.fire({
                    title: '¡Rendición Rechazada!',
                    text: 'La rendición ha sido rechazada correctamente',
                    icon: 'success',
                    timer: 2000,
                });
            } catch (error: unknown) {
                const mensajeError = getErrorMessage(error);
                Swal.fire({
                    title: 'Error',
                    text: mensajeError || 'Error al rechazar la rendición',
                    icon: 'error',
                });
            } finally {
                setIsBusy(false);
            }
        }
    };

    const handleAprobar = async () => {
        const { isConfirmed } = await Swal.fire({
            title: '¿Aprobar Rendición?',
            text: 'Después podrá procederse al pago.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#10b981',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sí, aprobar',
            cancelButtonText: 'Cancelar',
        });

        if (isConfirmed && detalleRendicion) {
            setIsBusy(true);
            try {
                await aprobarRendicion({ id: detalleRendicion.id }).unwrap();

                Swal.fire({
                    title: '¡Aprobada!',
                    text: 'Rendición aprobada correctamente',
                    icon: 'success',
                    timer: 2000,
                });
            } catch (error: unknown) {
                const mensajeError = getErrorMessage(error);
                Swal.fire({
                    title: 'Error',
                    text: mensajeError || 'Error al aprobar la rendición',
                    icon: 'error',
                });
            } finally {
                setIsBusy(false);
            }
        }
    };

    const handlePagar = async () => {
        const { isConfirmed } = await Swal.fire({
            title: '¿Marcar como Pagada?',
            text: 'Confirma que la rendición ha sido pagada.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#8b5cf6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sí, marcar pagada',
            cancelButtonText: 'Cancelar',
        });

        if (isConfirmed && detalleRendicion) {
            setIsBusy(true);
            try {
                await pagarRendicion({ id: detalleRendicion.id }).unwrap();

                Swal.fire({
                    title: '¡Pagada!',
                    text: 'Rendición marcada como pagada',
                    icon: 'success',
                    timer: 2000,
                });
            } catch (error: unknown) {
                const mensajeError = getErrorMessage(error);
                Swal.fire({
                    title: 'Error',
                    text: mensajeError || 'Error al pagar la rendición',
                    icon: 'error',
                });
            } finally {
                setIsBusy(false);
            }
        }
    };

    const handleEstadoChange = async () => {
        if (detalleRendicion?.estado === '0') {
            await handleEnviarAAprobacion();
        } else if (detalleRendicion?.estado === '1') {
            const { value: action } = await Swal.fire({
                title: 'Cambiar Estado de Rendición',
                icon: 'info',
                showDenyButton: true,
                showCancelButton: true,
                confirmButtonText: 'Aprobar',
                denyButtonText: 'Rechazar',
                cancelButtonText: 'Cancelar',
                confirmButtonColor: '#10b981',
                denyButtonColor: '#ef4444',
            });

            if (action === true) {
                await handleAprobar();
            } else if (action === false) {
                await handleRechazar();
            }
        } else if (detalleRendicion?.estado === '2') {
            await handlePagar();
        }
    };

    return (
        <>
            <Tooltip
                text={
                    detalleRendicion?.estado === '0'
                        ? 'Pasar a "En Espera de Aprobación"'
                        : detalleRendicion?.estado === '1'
                          ? 'Aprobar / Rechazar Rendición'
                          : detalleRendicion?.estado === '2'
                            ? 'Pagar Rendición'
                            : detalleRendicion?.estado === '3'
                              ? 'Rechazada'
                              : detalleRendicion?.estado === '4'
                                ? 'Pagada'
                                : ''
                }>
                <Button
                    variant='solid'
                    color={
                        detalleRendicion?.estado === '3'
                            ? 'red'
                            : detalleRendicion?.estado === '4'
                              ? 'emerald'
                              : 'blue'
                    }
                    icon={
                        detalleRendicion?.estado === '0'
                            ? 'HeroHandRaised'
                            : detalleRendicion?.estado === '1'
                              ? 'HeroEllipsisHorizontalCircle'
                              : detalleRendicion?.estado === '2'
                                ? 'HeroCurrencyDollar'
                                : detalleRendicion?.estado === '3'
                                  ? 'HeroXMark'
                                  : detalleRendicion?.estado === '4'
                                    ? 'HeroHandThumbUp'
                                    : ''
                    }
                    isDisable={
                        isBusy ||
                        detalleRendicion?.estado === '3' ||
                        detalleRendicion?.estado === '4'
                    }
                    onClick={() => handleEstadoChange()}
                />
            </Tooltip>
        </>
    );
}

export default CambiarEstadoRendicion;

