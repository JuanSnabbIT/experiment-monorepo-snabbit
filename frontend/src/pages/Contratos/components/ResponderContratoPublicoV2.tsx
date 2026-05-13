import Textarea from '@/components/form/Textarea';
import Icon from '@/components/icon/Icon';
import Button from '@/components/ui/Button';
import type { IContratoPublicoAprobacion } from '@/interface/contrato.interface';
import ApiService from '@/services/ApiService';
import { getErrorMessage } from '@/utils/errorHandlers';
import { confirmAlert, confirmCritical } from '@/utils/sweetAlert';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import ContratoPreviewModal from './ContratoPreviewModal';
import ResumenDatosContrato from './ResumenDatosContrato';

dayjs.locale('es');

type TAccionActiva = 'solicitar_cambios' | 'rechazar' | null;

const ResponderContratoPublicoV2 = () => {
    const { token } = useParams();
    const [detalle, setDetalle] = useState<IContratoPublicoAprobacion | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [comentario, setComentario] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [haVistoPreview, setHaVistoPreview] = useState(false);
    const [accionActiva, setAccionActiva] = useState<TAccionActiva>(null);

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

    const handleCerrarPreview = () => {
        setHaVistoPreview(true);
    };

    const toggleAccion = (accion: Exclude<TAccionActiva, null>) => {
        setAccionActiva((prev) => (prev === accion ? null : accion));
        setComentario('');
    };

    const responder = async (accion: 'aprobar' | 'rechazar' | 'rechazar-definitivo') => {
        if (!token || !detalle?.puede_responder) return;

        if (accion !== 'aprobar' && !comentario.trim()) {
            toast.error('Debes indicar el motivo o cambio sugerido.');
            return;
        }

        if (!haVistoPreview) {
            toast.info('Debes revisar el documento completo antes de continuar.');
            setPreviewOpen(true);
            return;
        }

        const nombreContrato = detalle.contrato.nombre || `Contrato #${detalle.contrato.id}`;

        const confirmado =
            accion === 'aprobar'
                ? await confirmAlert({
                      title: 'Confirmar aprobación',
                      text: `Aprobarás el contrato "${nombreContrato}". Esta acción quedará registrada.`,
                      confirmText: 'Aprobar',
                      cancelText: 'Cancelar',
                      confirmColor: '#059669',
                  })
                : accion === 'rechazar'
                  ? await confirmAlert({
                        title: 'Solicitar cambios',
                        text: `Se notificará al equipo con tu comentario sobre "${nombreContrato}".`,
                        confirmText: 'Enviar solicitud',
                        cancelText: 'Cancelar',
                        confirmColor: '#d97706',
                    })
                  : await confirmCritical({
                        title: 'Rechazar definitivamente',
                        text: `Esta acción cerrará el proceso del contrato "${nombreContrato}" de forma permanente.`,
                        confirmText: 'Rechazar definitivamente',
                        cancelText: 'Cancelar',
                        confirmPhrase: 'RECHAZAR',
                    });

        if (!confirmado) return;

        setSubmitting(true);
        try {
            await ApiService.fetchData({
                url: `/api/public/contrato-aprobacion/${token}/${accion}/`,
                method: 'post',
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify(accion === 'aprobar' ? {} : { comentario: comentario.trim() }),
                isLoginRequest: true,
            });
            toast.success(
                accion === 'aprobar'
                    ? 'Contrato aprobado correctamente.'
                    : accion === 'rechazar'
                      ? 'Solicitud de cambios enviada correctamente.'
                      : 'Contrato rechazado definitivamente.',
            );
            await fetchDetalle();
            setAccionActiva(null);
            setComentario('');
        } catch (requestError: unknown) {
            toast.error(getErrorMessage(requestError));
        } finally {
            setSubmitting(false);
        }
    };

    // --- Loading ---
    if (loading) {
        return (
            <div className='flex min-h-screen items-center justify-center bg-gray-100 dark:bg-zinc-900'>
                <div className='text-center'>
                    <div className='mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent' />
                    <p className='text-gray-600 dark:text-zinc-400'>Cargando contrato...</p>
                </div>
            </div>
        );
    }

    // --- Error ---
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
                        {error || 'El enlace puede haber expirado o no ser válido.'}
                    </p>
                    <Button onClick={() => window.location.assign('/')}>Ir al inicio</Button>
                </div>
            </div>
        );
    }

    const { contrato } = detalle;
    const empresaPrestadora = contrato.datos_empresa?.nombre;
    const empresaCliente = contrato.datos_cliente?.nombre;

    return (
        <div className='min-h-screen bg-gray-100 py-10 print:bg-white print:py-0 dark:bg-zinc-900'>
            <div className='mx-auto max-w-6xl px-4 lg:px-8'>
                <div className='overflow-hidden rounded-xl bg-white shadow-lg print:rounded-none print:shadow-none dark:bg-zinc-800'>
                    <div className='space-y-5 p-6 sm:p-8'>

                        {/* ============================================================ */}
                        {/* SECCIÓN 1 — CABECERA                                         */}
                        {/* ============================================================ */}
                        <section className='rounded-lg border border-gray-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900'>
                            <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
                                <div className='min-w-0'>
                                    <div className='flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-zinc-500'>
                                        <Icon icon='HeroDocumentText' className='h-4 w-4' />
                                        Revisión contractual
                                        {detalle.version_envio > 1 && (
                                            <span className='ml-1 inline-flex items-center rounded bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'>
                                                Versión {detalle.version_envio}
                                            </span>
                                        )}
                                    </div>
                                    <h1 className='mt-2 text-2xl font-bold text-gray-900 dark:text-zinc-100'>
                                        {contrato.nombre || `Contrato #${contrato.id}`}
                                    </h1>
                                    <p className='mt-1 text-sm text-gray-500 dark:text-zinc-400'>
                                        Este enlace te permite revisar el documento y responder una
                                        sola vez.
                                    </p>
                                    {(empresaPrestadora || empresaCliente) && (
                                        <div className='mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm'>
                                            {empresaPrestadora && (
                                                <span className='text-gray-600 dark:text-zinc-400'>
                                                    <span className='font-medium text-gray-900 dark:text-zinc-100'>
                                                        Prestador:
                                                    </span>{' '}
                                                    {empresaPrestadora}
                                                </span>
                                            )}
                                            {empresaPrestadora && empresaCliente && (
                                                <span className='text-gray-300 dark:text-zinc-600'>
                                                    &rarr;
                                                </span>
                                            )}
                                            {empresaCliente && (
                                                <span className='text-gray-600 dark:text-zinc-400'>
                                                    <span className='font-medium text-gray-900 dark:text-zinc-100'>
                                                        Cliente:
                                                    </span>{' '}
                                                    {empresaCliente}
                                                </span>
                                            )}
                                        </div>
                                    )}
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
                                    {detalle.fecha_envio && (
                                        <div className='text-right text-xs text-gray-400 dark:text-zinc-500'>
                                            Enviado el{' '}
                                            {dayjs(detalle.fecha_envio).format('DD/MM/YYYY')}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </section>

                        {/* ============================================================ */}
                        {/* SECCIÓN 2 — RESUMEN DEL CONTRATO                             */}
                        {/* ============================================================ */}
                        <ResumenDatosContrato contrato={contrato} />

                        {/* ============================================================ */}
                        {/* SECCIÓN 3 — DOCUMENTO LEGAL                                  */}
                        {/* ============================================================ */}
                        <div className='flex justify-center'>
                            <Button
                                variant='outline'
                                icon='HeroDocumentText'
                                onClick={() => setPreviewOpen(true)}>
                                {haVistoPreview
                                    ? 'Ver documento completo de nuevo'
                                    : 'Ver documento completo'}
                            </Button>
                        </div>

                        <ContratoPreviewModal
                            isOpen={previewOpen}
                            setIsOpen={setPreviewOpen}
                            contrato={contrato}
                            secciones={detalle.secciones_generadas ?? []}
                            ocultarFirmas
                            onClose={handleCerrarPreview}
                        />

                        {/* ============================================================ */}
                        {/* SECCIÓN 4 — DECISIÓN DEL CLIENTE                             */}
                        {/* ============================================================ */}
                        <section className='rounded-lg border border-gray-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900'>
                            <div className='mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
                                <div>
                                    <p className='text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-zinc-500'>
                                        Respuesta del cliente
                                    </p>
                                    <h2 className='text-lg font-semibold text-gray-900 dark:text-zinc-100'>
                                        {detalle.ya_respondio ? 'Estado de la revisión' : 'Tu decisión'}
                                    </h2>
                                </div>

                                {detalle.ya_respondio && (
                                    <span
                                        className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold ${
                                            detalle.aprobado
                                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                                        }`}>
                                        {detalle.aprobado ? 'Aprobado' : 'Cambios solicitados / Rechazado'}
                                    </span>
                                )}
                            </div>

                            {detalle.ya_respondio ? (
                                /* ---- RESULTADO REGISTRADO ---- */
                                <div className='space-y-4'>
                                    <div
                                        className={`rounded-md border px-4 py-4 text-sm leading-6 ${
                                            detalle.aprobado
                                                ? 'border-green-100 bg-green-50/70 text-green-800 dark:border-green-900/50 dark:bg-green-950/20 dark:text-green-200'
                                                : 'border-red-100 bg-red-50/70 text-red-800 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-200'
                                        }`}>
                                        <div className='flex items-center gap-2'>
                                            <Icon
                                                icon={
                                                    detalle.aprobado
                                                        ? 'HeroCheckCircle'
                                                        : 'HeroXCircle'
                                                }
                                                className='h-5 w-5 flex-shrink-0'
                                            />
                                            <span className='font-medium'>
                                                {detalle.aprobado
                                                    ? 'Aprobaste este contrato.'
                                                    : 'Solicitaste cambios o rechazaste este contrato.'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className='overflow-hidden rounded-md border border-gray-100 dark:border-zinc-700'>
                                        <dl className='divide-y divide-gray-100 text-sm dark:divide-zinc-700'>
                                            <div className='grid grid-cols-1 gap-1 px-4 py-3 sm:grid-cols-[180px,1fr] sm:gap-3'>
                                                <dt className='text-gray-500 dark:text-zinc-400'>
                                                    Resultado
                                                </dt>
                                                <dd className='font-medium text-gray-900 dark:text-zinc-100'>
                                                    {detalle.aprobado
                                                        ? 'Contrato aprobado'
                                                        : 'Cambios solicitados / Rechazado'}
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
                                </div>
                            ) : (
                                /* ---- ACCIONES PENDIENTES ---- */
                                <div className='space-y-4'>
                                    <div className='rounded-md border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm leading-6 text-blue-800 dark:border-blue-900/50 dark:bg-blue-950/20 dark:text-blue-200'>
                                        Revisa el documento completo antes de decidir. Si necesitas
                                        ajustes, descríbelos y envía la solicitud de cambios.
                                    </div>

                                    {/* --- Aprobar --- */}
                                    <div className='rounded-md border border-gray-100 bg-gray-50/60 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800/50'>
                                        <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                                            <div>
                                                <p className='font-medium text-gray-900 dark:text-zinc-100'>
                                                    Aprobar contrato
                                                </p>
                                                <p className='mt-0.5 text-xs text-gray-500 dark:text-zinc-400'>
                                                    Confirmas estar de acuerdo con todos los términos
                                                    descritos en el documento.
                                                </p>
                                            </div>
                                            <Button
                                                variant='solid'
                                                color='emerald'
                                                icon='HeroCheck'
                                                isLoading={submitting}
                                                isDisable={!haVistoPreview || submitting}
                                                className='flex-shrink-0'
                                                onClick={() => responder('aprobar')}>
                                                Aprobar
                                            </Button>
                                        </div>
                                        {!haVistoPreview && (
                                            <p className='mt-2 flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400'>
                                                <Icon
                                                    icon='HeroEye'
                                                    className='h-3.5 w-3.5 flex-shrink-0'
                                                />
                                                Debes revisar el documento completo para poder
                                                aprobar.
                                            </p>
                                        )}
                                    </div>

                                    {/* --- Solicitar cambios --- */}
                                    <div className='rounded-md border border-gray-100 bg-gray-50/60 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800/50'>
                                        <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                                            <div>
                                                <p className='font-medium text-gray-900 dark:text-zinc-100'>
                                                    Solicitar cambios
                                                </p>
                                                <p className='mt-0.5 text-xs text-gray-500 dark:text-zinc-400'>
                                                    Envía tus observaciones al equipo para que ajusten
                                                    el contrato.
                                                </p>
                                            </div>
                                            <Button
                                                color='amber'
                                                variant='outline'
                                                icon='HeroArrowPath'
                                                className='flex-shrink-0'
                                                onClick={() => toggleAccion('solicitar_cambios')}>
                                                {accionActiva === 'solicitar_cambios'
                                                    ? 'Cancelar'
                                                    : 'Solicitar cambios'}
                                            </Button>
                                        </div>
                                        {accionActiva === 'solicitar_cambios' && (
                                            <div className='mt-3 space-y-3 border-t border-gray-100 pt-3 dark:border-zinc-700'>
                                                <Textarea
                                                    placeholder='Describe los cambios que necesitas o el motivo de tu solicitud...'
                                                    value={comentario}
                                                    onChange={(e) =>
                                                        setComentario(e.target.value)
                                                    }
                                                />
                                                <div className='flex justify-end gap-2'>
                                                    <Button
                                                        variant='outline'
                                                        onClick={() => {
                                                            setAccionActiva(null);
                                                            setComentario('');
                                                        }}>
                                                        Cancelar
                                                    </Button>
                                                    <Button
                                                        variant='solid'
                                                        color='amber'
                                                        icon='HeroArrowPath'
                                                        isLoading={submitting}
                                                        isDisable={
                                                            !comentario.trim() || submitting
                                                        }
                                                        onClick={() => responder('rechazar')}>
                                                        Enviar solicitud
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* --- Rechazar definitivamente --- */}
                                    <div className='rounded-md border border-gray-100 bg-gray-50/60 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800/50'>
                                        <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                                            <div>
                                                <p className='font-medium text-gray-900 dark:text-zinc-100'>
                                                    Rechazar definitivamente
                                                </p>
                                                <p className='mt-0.5 text-xs text-gray-500 dark:text-zinc-400'>
                                                    Cierra el proceso de forma permanente. Esta acción
                                                    no se puede deshacer.
                                                </p>
                                            </div>
                                            <Button
                                                color='red'
                                                variant='outline'
                                                icon='HeroNoSymbol'
                                                className='flex-shrink-0'
                                                onClick={() => toggleAccion('rechazar')}>
                                                {accionActiva === 'rechazar'
                                                    ? 'Cancelar'
                                                    : 'Rechazar'}
                                            </Button>
                                        </div>
                                        {accionActiva === 'rechazar' && (
                                            <div className='mt-3 space-y-3 border-t border-gray-100 pt-3 dark:border-zinc-700'>
                                                <Textarea
                                                    placeholder='Explica el motivo del rechazo definitivo...'
                                                    value={comentario}
                                                    onChange={(e) =>
                                                        setComentario(e.target.value)
                                                    }
                                                />
                                                <div className='flex justify-end gap-2'>
                                                    <Button
                                                        variant='outline'
                                                        onClick={() => {
                                                            setAccionActiva(null);
                                                            setComentario('');
                                                        }}>
                                                        Cancelar
                                                    </Button>
                                                    <Button
                                                        variant='solid'
                                                        color='red'
                                                        icon='HeroNoSymbol'
                                                        isLoading={submitting}
                                                        isDisable={
                                                            !comentario.trim() || submitting
                                                        }
                                                        onClick={() =>
                                                            responder('rechazar-definitivo')
                                                        }>
                                                        Confirmar rechazo
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {!detalle.puede_responder && (
                                        <p className='mt-2 text-sm text-gray-500 dark:text-zinc-400'>
                                            Este enlace ya registró una respuesta y no admite una
                                            nueva acción.
                                        </p>
                                    )}
                                </div>
                            )}
                        </section>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResponderContratoPublicoV2;
