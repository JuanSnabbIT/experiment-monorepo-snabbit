import Icon from '@/components/icon/Icon';
import Button from '@/components/ui/Button';
import type { IContratoPublicoFirma } from '@/interface/contrato.interface';
import ApiService from '@/services/ApiService';
import { getErrorMessage } from '@/utils/errorHandlers';
import { confirmAlert, showAlert } from '@/utils/sweetAlert';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import SignatureCanvas from 'react-signature-canvas';
import { toast } from 'react-toastify';
import ContratoPreviewModal from './ContratoPreviewModal';
import ResumenDatosContrato from './ResumenDatosContrato';

dayjs.locale('es');

const FirmarContratoYAcuerdoConfidencialidad = () => {
    const { uuid } = useParams();
    const [detalle, setDetalle] = useState<IContratoPublicoFirma | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pdfObjectUrl, setPdfObjectUrl] = useState<string | null>(null);
    const [pdfLoading, setPdfLoading] = useState(false);

    const sigCanvas = useRef<SignatureCanvas | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [signatureMode, setSignatureMode] = useState<'draw' | 'upload'>('draw');
    const [uploadedSignature, setUploadedSignature] = useState<string | null>(null);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [haVistoPreview, setHaVistoPreview] = useState(false);

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
            toast.error(getErrorMessage(requestError));
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

    const handleSignatureUpload = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const maxSize = 1024 * 1024;
        if (file.size > maxSize) return;
        const reader = new FileReader();
        reader.onload = () => {
            const result = typeof reader.result === 'string' ? reader.result : null;
            setUploadedSignature(result);
        };
        reader.readAsDataURL(file);
    };

    const handleClosePreview = () => {
        setHaVistoPreview(true);
    };

    const verificarPreviewAntes = async (): Promise<boolean> => {
        if (haVistoPreview) return true;
        const result = await confirmAlert({
            title: 'No has revisado el documento completo',
            text: 'Te recomendamos revisar el documento completo antes de firmar. ¿Deseas verlo ahora?',
            confirmText: 'Ver documento',
            cancelText: 'Continuar sin ver',
            icon: 'info',
        });
        if (result) {
            setPreviewOpen(true);
            return false;
        }
        return true;
    };

    const firmarContrato = async () => {
        if (!uuid || !detalle?.puede_firmar) return;

        const puedeProceeder = await verificarPreviewAntes();
        if (!puedeProceeder) return;

        let firma: string | null = null;
        if (signatureMode === 'upload') {
            if (!uploadedSignature) return;
            firma = uploadedSignature;
        } else {
            if (!sigCanvas.current || sigCanvas.current.isEmpty()) return;
            firma = sigCanvas.current.toDataURL('image/png');
        }

        const nombreContrato = detalle?.contrato?.nombre ?? 'este contrato';
        const confirmado = await confirmAlert({
            title: '¿Confirmar firma?',
            text: `Estás a punto de firmar "${nombreContrato}". Esta acción queda registrada y no puede deshacerse.`,
            confirmText: 'Sí, firmar',
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
                title: '¡Contrato firmado!',
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
                    <div className='space-y-5 p-6 sm:p-8'>
                        {/* Sección 1: Cabecera */}
                        <section className='rounded-lg border border-gray-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900'>
                            <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
                                <div className='min-w-0'>
                                    <div className='flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-zinc-500'>
                                        <Icon icon='HeroPencilSquare' className='h-4 w-4' />
                                        Firma contractual
                                    </div>
                                    <h1 className='mt-2 text-2xl font-bold text-gray-900 dark:text-zinc-100'>
                                        Firma del contrato
                                    </h1>
                                    <p className='mt-1 text-sm text-gray-500 dark:text-zinc-400'>
                                        Revisa el documento y registra tu firma para aceptar el
                                        contrato.
                                    </p>
                                </div>

                                <div className='flex flex-col items-start gap-3 sm:items-end'>
                                    <Button
                                        icon='HeroDocumentArrowDown'
                                        onClick={descargarPdf}
                                        isDisable={!pdfObjectUrl && !pdfLoading}>
                                        Descargar PDF
                                    </Button>
                                    {detalle.destinatario && (
                                        <div className='rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-600 dark:bg-zinc-900 dark:text-zinc-300'>
                                            <span className='font-medium text-gray-900 dark:text-zinc-100'>
                                                Destinatario:
                                            </span>{' '}
                                            {detalle.destinatario.nombre} (
                                            {detalle.destinatario.email})
                                        </div>
                                    )}
                                </div>
                            </div>
                        </section>

                        {/* Sección 2: Resumen de datos del contrato */}
                        <ResumenDatosContrato contrato={detalle.contrato} />

                        <div className='flex justify-center'>
                            <Button
                                variant='outline'
                                icon='HeroDocumentText'
                                onClick={() => setPreviewOpen(true)}>
                                Ver documento completo
                            </Button>
                        </div>

                        <ContratoPreviewModal
                            isOpen={previewOpen}
                            setIsOpen={setPreviewOpen}
                            contrato={detalle.contrato}
                            secciones={detalle.secciones_generadas ?? []}
                            onClose={handleClosePreview}
                        />

                        {/* Sección 3: Firma */}
                        <section className='rounded-lg border border-gray-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900'>
                            <div className='mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
                                <div>
                                    <p className='text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-zinc-500'>
                                        Firma del cliente
                                    </p>
                                    <h2 className='text-lg font-semibold text-gray-900 dark:text-zinc-100'>
                                        Aceptación final
                                    </h2>
                                </div>

                                {detalle.firmado && (
                                    <span className='inline-flex items-center rounded-md bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700'>
                                        Firmado
                                    </span>
                                )}
                            </div>

                            {detalle.firmado ? (
                                <div className='space-y-4'>
                                    <div className='rounded-md border border-green-100 bg-green-50/70 px-4 py-4 text-sm leading-6 text-green-800 dark:border-green-900/50 dark:bg-green-950/20 dark:text-green-200'>
                                        Este contrato fue firmado el{' '}
                                        {detalle.fecha_firma
                                            ? dayjs(detalle.fecha_firma).format(
                                                  'DD/MM/YYYY HH:mm',
                                              )
                                            : 'sin fecha registrada'}
                                        .
                                    </div>
                                    {detalle.firma && (
                                        <div className='overflow-hidden rounded-md border border-gray-100 bg-gray-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/60'>
                                            <p className='mb-3 text-sm font-medium text-gray-900 dark:text-zinc-100'>
                                                Firma registrada
                                            </p>
                                            <img
                                                src={detalle.firma}
                                                alt='Firma registrada'
                                                className='max-h-28 w-auto object-contain'
                                            />
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className='space-y-4'>
                                    <div className='rounded-md border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm leading-6 text-blue-800 dark:border-blue-900/50 dark:bg-blue-950/20 dark:text-blue-200'>
                                        Tu firma en imagen confirma la aceptación del contrato y
                                        de los acuerdos de confidencialidad.
                                    </div>
                                    <div className='flex flex-wrap gap-2'>
                                        <Button
                                            variant={
                                                signatureMode === 'draw' ? 'solid' : 'outline'
                                            }
                                            onClick={() => setSignatureMode('draw')}>
                                            Dibujar firma
                                        </Button>
                                        <Button
                                            variant={
                                                signatureMode === 'upload' ? 'solid' : 'outline'
                                            }
                                            onClick={() => setSignatureMode('upload')}>
                                            Subir imagen
                                        </Button>
                                    </div>
                                    {signatureMode === 'draw' ? (
                                        <div className='overflow-hidden rounded-md border border-gray-200 bg-white dark:border-zinc-700'>
                                            <SignatureCanvas
                                                ref={(ref) => {
                                                    sigCanvas.current = ref;
                                                }}
                                                penColor='black'
                                                canvasProps={{
                                                    height: 220,
                                                    className: 'w-full bg-white',
                                                }}
                                            />
                                        </div>
                                    ) : (
                                        <div className='space-y-3 rounded-md border border-dashed border-gray-300 bg-gray-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/40'>
                                            <input
                                                ref={fileInputRef}
                                                type='file'
                                                accept='image/png,image/jpeg'
                                                className='hidden'
                                                onChange={handleSignatureUpload}
                                            />
                                            <Button
                                                icon='HeroArrowUpTray'
                                                onClick={() => fileInputRef.current?.click()}>
                                                Seleccionar imagen
                                            </Button>
                                            <p className='text-xs text-gray-500 dark:text-zinc-400'>
                                                Usa una imagen PNG o JPG de hasta 1 MB.
                                            </p>
                                            {uploadedSignature && (
                                                <div className='rounded-md border border-gray-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900'>
                                                    <img
                                                        src={uploadedSignature}
                                                        alt='Firma cargada'
                                                        className='max-h-28 w-auto object-contain'
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    <div className='flex flex-wrap gap-3'>
                                        {signatureMode === 'draw' ? (
                                            <Button
                                                onClick={() => sigCanvas.current?.clear()}>
                                                Limpiar
                                            </Button>
                                        ) : (
                                            <Button
                                                onClick={() => setUploadedSignature(null)}>
                                                Quitar imagen
                                            </Button>
                                        )}
                                        <Button
                                            variant='solid'
                                            icon='HeroCheck'
                                            isLoading={submitting}
                                            isDisable={!detalle.puede_firmar}
                                            onClick={firmarContrato}>
                                            Firmar contrato
                                        </Button>
                                    </div>
                                    {!detalle.puede_firmar && (
                                        <p className='text-sm text-gray-500 dark:text-zinc-400'>
                                            Este enlace ya no admite una firma nueva.
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

export default FirmarContratoYAcuerdoConfidencialidad;
