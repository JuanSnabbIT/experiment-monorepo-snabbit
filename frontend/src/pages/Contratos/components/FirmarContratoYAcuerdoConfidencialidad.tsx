import Icon from '@/components/icon/Icon';
import Button from '@/components/ui/Button';
import type { IContratoPublicoFirma } from '@/interface/contrato.interface';
import ApiService from '@/services/ApiService';
import { getErrorMessage } from '@/utils/errorHandlers';
import { confirmAlert, showAlert } from '@/utils/sweetAlert';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import ContratoFirmaExperience from './ContratoFirmaExperience';

dayjs.locale('es');

const FirmarContratoYAcuerdoConfidencialidad = () => {
    const { uuid } = useParams();
    const [detalle, setDetalle] = useState<IContratoPublicoFirma | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pdfObjectUrl, setPdfObjectUrl] = useState<string | null>(null);
    const [pdfLoading, setPdfLoading] = useState(false);
    const [pdfError, setPdfError] = useState<string | null>(null);

    const pdfEndpoint = useMemo(
        () => (uuid ? `/api/public/contrato-firma/${uuid}/pdf/` : null),
        [uuid],
    );

    const fetchDetalle = useCallback(async () => {
        if (!uuid) return;
        setLoading(true);
        try {
            const response = await ApiService.fetchData<IContratoPublicoFirma>({
                url: `/api/public/contrato-firma/${uuid}/`,
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
    }, [uuid]);

    const loadPdf = useCallback(async () => {
        if (!pdfEndpoint) return;
        setPdfLoading(true);
        setPdfError(null);
        try {
            const response = await ApiService.fetchData<Blob>({
                url: pdfEndpoint,
                method: 'get',
                responseType: 'blob',
                isLoginRequest: true,
            });
            const blob = response.data;
            setPdfObjectUrl((currentUrl) => {
                if (currentUrl) {
                    window.URL.revokeObjectURL(currentUrl);
                }
                return window.URL.createObjectURL(blob);
            });
        } catch (requestError: unknown) {
            const msg = getErrorMessage(requestError);
            setPdfError(msg);
            toast.error(msg);
        } finally {
            setPdfLoading(false);
        }
    }, [pdfEndpoint]);

    useEffect(() => {
        fetchDetalle();
    }, [fetchDetalle]);

    useEffect(() => {
        return () => {
            if (pdfObjectUrl) {
                window.URL.revokeObjectURL(pdfObjectUrl);
            }
        };
    }, [pdfObjectUrl]);

    useEffect(() => {
        loadPdf();
    }, [loadPdf]);

    const descargarPdf = () => {
        if (!pdfObjectUrl) return;
        const link = document.createElement('a');
        link.href = pdfObjectUrl;
        link.download = `Contrato_${detalle?.contrato?.id ?? 'firma'}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const abrirPdf = () => {
        if (!pdfObjectUrl) return;
        window.open(pdfObjectUrl, '_blank', 'noopener,noreferrer');
    };

    const handleSubmitFirma = async (firma: string) => {
        if (!uuid || !detalle?.puede_firmar) return;

        const nombreContrato = detalle?.contrato?.nombre ?? 'este contrato';
        const confirmado = await confirmAlert({
            title: 'Â¿Confirmar firma?',
            text: `EstÃ¡s a punto de firmar "${nombreContrato}". Esta acciÃ³n queda registrada y no puede deshacerse.`,
            confirmText: 'SÃ­, firmar',
            cancelText: 'Cancelar',
            icon: 'question',
            confirmColor: '#0f766e',
        });
        if (!confirmado) return;

        setSubmitting(true);
        try {
            await ApiService.fetchData({
                url: `/api/public/contrato-firma/${uuid}/firmar/`,
                method: 'patch',
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify({
                    firma,
                    fecha_firma: dayjs().toISOString(),
                    firmado: true,
                }),
                isLoginRequest: true,
            });
            await fetchDetalle();
            await loadPdf();
            await showAlert({
                title: 'Â¡Contrato firmado!',
                text: 'Tu firma fue registrada correctamente. Puedes descargar el PDF firmado.',
                icon: 'success',
                confirmText: 'Cerrar',
            });
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
                    <div className='p-6 sm:p-8'>
                        <ContratoFirmaExperience
                            detalle={detalle}
                            mode='public'
                            pdfObjectUrl={pdfObjectUrl}
                            pdfLoading={pdfLoading}
                            pdfError={pdfError}
                            onDownloadPdf={descargarPdf}
                            onOpenPdf={abrirPdf}
                            onSubmitFirma={handleSubmitFirma}
                            isSubmitting={submitting}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FirmarContratoYAcuerdoConfidencialidad;