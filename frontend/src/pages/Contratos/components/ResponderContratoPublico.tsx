import Textarea from '@/components/form/Textarea';
import Icon from '@/components/icon/Icon';
import Button from '@/components/ui/Button';
import type { IContratoPublicoAprobacion } from '@/interface/contrato.interface';
import ApiService from '@/services/ApiService';
import { confirmAlert, confirmCritical } from '@/utils/sweetAlert';
import { getErrorMessage } from '@/utils/errorHandlers';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import ContratoPublicoResumen from './ContratoPublicoResumen';

const buildResumenContrato = (contrato: IContratoPublicoAprobacion['contrato']) => {
    const items = contrato.contrato_servicios.map(
        (item) =>
            `${item.nombre} x${item.cantidad} | $${Number(item.precio_unitario).toLocaleString()} | subtotal $${Number(item.subtotal).toLocaleString()}`,
    );
    const licencias = contrato.contrato_licencias.map(
        (item) =>
            `${item.nombre_licencia} x${item.cantidad} | $${Number(item.precio_unitario).toLocaleString()}`,
    );
    return [...items, ...licencias].join('\n') || 'Sin items asociados.';
};

dayjs.locale('es');

const ResponderContratoPublico = () => {
    const { token } = useParams();
    const [detalle, setDetalle] = useState<IContratoPublicoAprobacion | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [comentario, setComentario] = useState('');
    const [error, setError] = useState<string | null>(null);

    const fetchDetalle = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const response = await ApiService.fetchData<IContratoPublicoAprobacion>({
                url: `/api/public/contrato-aprobacion/${token}/`,
                method: 'get',
                isLoginRequest: true,
            });
            setDetalle(response.data);
            setError(null);
        } catch (requestError: unknown) {
            setError(getErrorMessage(requestError));
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchDetalle();
    }, [fetchDetalle]);

    const descargarPdf = async () => {
        if (!token) return;
        try {
            const response = await ApiService.fetchData<Blob>({
                url: `/api/public/contrato-aprobacion/${token}/pdf/`,
                method: 'get',
                responseType: 'blob',
                isLoginRequest: true,
            });
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Contrato_${detalle?.contrato?.id ?? 'aprobacion'}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (requestError: unknown) {
            toast.error(getErrorMessage(requestError));
        }
    };

    const responder = async (
        accion: 'aprobar' | 'rechazar' | 'rechazar-definitivo',
    ) => {
        if (!token || !detalle?.puede_responder) return;
        if (accion !== 'aprobar' && !comentario.trim()) {
            toast.error('Debes indicar el motivo o cambio sugerido.');
            return;
        }

        const resumen = buildResumenContrato(detalle.contrato);
        const confirmado =
            accion === 'aprobar'
                ? await confirmAlert({
                      title: 'Confirmar aprobacion',
                      text: `Revisaras y aprobaras este contrato.\n\n${resumen}`,
                      confirmText: 'Aprobar',
                      cancelText: 'Cancelar',
                      confirmColor: '#0f766e',
                  })
                : accion === 'rechazar'
                  ? await confirmAlert({
                        title: 'Solicitar cambios',
                        text: `Se enviara la solicitud de cambios con este resumen:\n\n${resumen}`,
                        confirmText: 'Solicitar cambios',
                        cancelText: 'Volver',
                        confirmColor: '#c2410c',
                    })
                  : await confirmCritical({
                        title: 'Rechazar definitivamente',
                        text: `Esta accion cerrara el ciclo del contrato.\n\n${resumen}`,
                        confirmText: 'Cerrar contrato',
                        cancelText: 'Volver',
                        confirmPhrase: 'RECHAZAR',
                    });

        if (!confirmado) return;

        setSubmitting(true);
        try {
            await ApiService.fetchData({
                url: `/api/public/contrato-aprobacion/${token}/${accion}/`,
                method: 'post',
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify(
                    accion === 'aprobar' ? {} : { comentario: comentario.trim() },
                ),
                isLoginRequest: true,
            });
            toast.success(
                accion === 'aprobar'
                    ? 'Contrato aprobado correctamente.'
                    : accion === 'rechazar'
                      ? 'Cambios solicitados enviados correctamente.'
                      : 'Contrato rechazado definitivamente.',
            );
            await fetchDetalle();
        } catch (requestError: unknown) {
            toast.error(getErrorMessage(requestError));
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className='flex min-h-screen items-center justify-center bg-gray-100 dark:bg-zinc-900'>
                <div className='text-center'>
                    <div className='mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent'></div>
                    <p className='text-gray-600 dark:text-zinc-400'>Cargando contrato...</p>
                </div>
            </div>
        );
    }

    if (error || !detalle) {
        return (
            <div className='flex min-h-screen items-center justify-center bg-gray-100 p-4 dark:bg-zinc-900'>
                <div className='w-full max-w-md rounded-lg bg-white p-8 text-center shadow-lg dark:bg-zinc-800'>
                    <Icon
                        icon='HeroExclamationTriangle'
                        className='mx-auto mb-4 text-5xl text-red-500'
                    />
                    <h2 className='mb-2 text-xl font-semibold text-red-600'>
                        No pudimos abrir el contrato
                    </h2>
                    <p className='mb-6 text-sm text-gray-600 dark:text-zinc-300'>
                        {error || 'No se pudo cargar el contrato.'}
                    </p>
                    <Button onClick={() => window.location.assign('/')}>Ir al inicio</Button>
                </div>
            </div>
        );
    }

    return (
        <div className='min-h-screen bg-gray-100 py-10 print:bg-white print:py-0 dark:bg-zinc-900'>
            <div className='mx-auto max-w-6xl px-4 lg:px-8'>
                <div className='overflow-hidden rounded-xl bg-white shadow-lg print:rounded-none print:shadow-none dark:bg-zinc-800'>
                    <div className='space-y-5 p-6 sm:p-8'>
                        <section className='rounded-lg border border-gray-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900'>
                            <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
                                <div className='min-w-0'>
                                    <div className='flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-zinc-500'>
                                        <Icon icon='HeroDocumentText' className='h-4 w-4' />
                                        Revisión contractual
                                    </div>
                                    <h1 className='mt-2 text-2xl font-bold text-gray-900 dark:text-zinc-100'>
                                        Revisión del contrato
                                    </h1>
                                    <p className='mt-1 text-sm text-gray-500 dark:text-zinc-400'>
                                        Este enlace te permite revisar el documento y responder una
                                        sola vez.
                                    </p>
                                </div>

                                <div className='flex flex-col items-start gap-3 sm:items-end'>
                                    <Button
                                        icon='HeroDocumentArrowDown'
                                        onClick={descargarPdf}>
                                        Descargar PDF
                                    </Button>
                                    <div className='rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-600 dark:bg-zinc-900 dark:text-zinc-300'>
                                        <span className='font-medium text-gray-900 dark:text-zinc-100'>
                                            Destinatario:
                                        </span>{' '}
                                        {detalle.destinatario.nombre} ({detalle.destinatario.email})
                                    </div>
                                </div>
                            </div>
                        </section>

                        <ContratoPublicoResumen contrato={detalle.contrato} />

                        <section className='rounded-lg border border-gray-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900'>
                            <div className='mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
                                <div>
                                    <p className='text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-zinc-500'>
                                        Respuesta del cliente
                                    </p>
                                    <h2 className='text-lg font-semibold text-gray-900 dark:text-zinc-100'>
                                        Estado de la revisión
                                    </h2>
                                </div>

                                {detalle.ya_respondio && (
                                    <span
                                        className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold ${
                                            detalle.aprobado
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-red-100 text-red-700'
                                        }`}>
                                        {detalle.aprobado ? 'Aprobado' : 'Cambios solicitados'}
                                    </span>
                                )}
                            </div>

                            {detalle.ya_respondio ? (
                                <div className='overflow-hidden rounded-md border border-gray-100 dark:border-zinc-700'>
                                    <dl className='divide-y divide-gray-100 text-sm dark:divide-zinc-700'>
                                        <div className='grid grid-cols-1 gap-1 px-4 py-3 sm:grid-cols-[180px,1fr] sm:gap-3'>
                                            <dt className='text-gray-500 dark:text-zinc-400'>
                                                Resultado
                                            </dt>
                                            <dd className='font-medium text-gray-900 dark:text-zinc-100'>
                                                {detalle.aprobado
                                                    ? 'Contrato aprobado'
                                                    : 'Cambios solicitados'}
                                            </dd>
                                        </div>

                                        {detalle.fecha_respuesta && (
                                            <div className='grid grid-cols-1 gap-1 px-4 py-3 sm:grid-cols-[180px,1fr] sm:gap-3'>
                                                <dt className='text-gray-500 dark:text-zinc-400'>
                                                    Fecha de respuesta
                                                </dt>
                                                <dd className='font-medium text-gray-900 dark:text-zinc-100'>
                                                    {dayjs(detalle.fecha_respuesta).format(
                                                        'DD/MM/YYYY HH:mm',
                                                    )}
                                                </dd>
                                            </div>
                                        )}

                                        {detalle.comentario_respuesta && (
                                            <div className='grid grid-cols-1 gap-1 px-4 py-3 sm:grid-cols-[180px,1fr] sm:gap-3'>
                                                <dt className='text-gray-500 dark:text-zinc-400'>
                                                    Comentario
                                                </dt>
                                                <dd className='rounded-md bg-gray-50 px-3 py-2 text-gray-700 dark:bg-zinc-800 dark:text-zinc-200'>
                                                    <span className='whitespace-pre-wrap'>
                                                        {detalle.comentario_respuesta}
                                                    </span>
                                                </dd>
                                            </div>
                                        )}
                                    </dl>
                                </div>
                            ) : (
                                <div className='space-y-4'>
                                    <div className='rounded-md border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm text-blue-800 dark:border-blue-900/50 dark:bg-blue-950/20 dark:text-blue-200'>
                                        Revisa el documento completo antes de decidir. Si necesitas
                                        ajustes, descríbelos en el comentario y envía la solicitud de
                                        cambios.
                                    </div>
                                    <Textarea
                                        placeholder='Si necesitas cambios, describe aquí el motivo o la sugerencia.'
                                        value={comentario}
                                        onChange={(event) => setComentario(event.target.value)}
                                    />
                                    <div className='flex flex-wrap gap-3'>
                                        <Button
                                            variant='solid'
                                            icon='HeroCheck'
                                            isLoading={submitting}
                                            onClick={() => responder('aprobar')}>
                                            Aprobar contrato
                                        </Button>
                                        <Button
                                            color='red'
                                            icon='HeroXMark'
                                            isLoading={submitting}
                                            onClick={() => responder('rechazar')}>
                                            Solicitar cambios
                                        </Button>
                                        <Button
                                            color='red'
                                            variant='outline'
                                            icon='HeroNoSymbol'
                                            isLoading={submitting}
                                            onClick={() => responder('rechazar-definitivo')}>
                                            Rechazar definitivamente
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {!detalle.puede_responder && (
                                <p className='mt-4 text-sm text-gray-500 dark:text-zinc-400'>
                                    Este enlace ya registró una respuesta y no admite una nueva acción.
                                </p>
                            )}
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResponderContratoPublico;
