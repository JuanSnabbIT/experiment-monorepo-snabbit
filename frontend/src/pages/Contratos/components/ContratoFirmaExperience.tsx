import Icon from '@/components/icon/Icon';
import Button from '@/components/ui/Button';
import type { IContratoPublicoFirma } from '@/interface/contrato.interface';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { ChangeEvent, useMemo, useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import ContratoPublicoResumen from './ContratoPublicoResumen';

dayjs.locale('es');

interface IContratoFirmaExperienceProps {
    detalle: IContratoPublicoFirma;
    mode: 'public' | 'preview';
    pdfObjectUrl: string | null;
    pdfLoading: boolean;
    pdfError: string | null;
    onDownloadPdf: () => void;
    onOpenPdf: () => void;
    onSubmitFirma?: (firma: string) => Promise<void> | void;
    isSubmitting?: boolean;
}

const ContratoFirmaExperience = ({
    detalle,
    mode,
    pdfObjectUrl,
    pdfLoading,
    pdfError,
    onDownloadPdf,
    onOpenPdf,
    onSubmitFirma,
    isSubmitting = false,
}: IContratoFirmaExperienceProps) => {
    const sigCanvas = useRef<SignatureCanvas | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [signatureMode, setSignatureMode] = useState<'draw' | 'upload'>('draw');
    const [uploadedSignature, setUploadedSignature] = useState<string | null>(null);

    const isPreview = mode === 'preview';
    const title = isPreview
        ? detalle.es_version_enviada
            ? 'Version enviada a firma'
            : 'Vista previa de firma'
        : 'Firma del contrato';
    const subtitle = isPreview
        ? detalle.es_version_enviada
            ? 'Esta es la version congelada que recibio el cliente para revisar y firmar.'
            : 'Asi vera el cliente el documento final al momento de firmar.'
        : 'Revisa el documento final y registra tu firma para aceptar el contrato y la confidencialidad asociada.';

    const statusLabel = useMemo(() => {
        if (detalle.firmado) return 'Firmado';
        if (detalle.es_version_enviada) return 'Enviado';
        return 'Borrador de firma';
    }, [detalle.es_version_enviada, detalle.firmado]);

    const clear = () => sigCanvas.current?.clear();

    const submitFirma = async () => {
        if (!onSubmitFirma || !detalle.puede_firmar) return;
        if (signatureMode === 'upload') {
            if (!uploadedSignature) return;
            await onSubmitFirma(uploadedSignature);
            return;
        }
        if (!sigCanvas.current || sigCanvas.current.isEmpty()) return;
        await onSubmitFirma(sigCanvas.current.toDataURL('image/png'));
    };

    const handleSignatureUpload = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const maxSize = 1024 * 1024;
        if (file.size > maxSize) {
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            const result = typeof reader.result === 'string' ? reader.result : null;
            setUploadedSignature(result);
        };
        reader.readAsDataURL(file);
    };

    return (
        <div className='space-y-6'>
            <section className='rounded-lg border border-gray-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900'>
                <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
                    <div className='min-w-0 space-y-2'>
                        <div className='flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-zinc-500'>
                            <Icon
                                icon={isPreview ? 'HeroEye' : 'HeroPencilSquare'}
                                className='h-4 w-4'
                            />
                            Documento contractual
                        </div>
                        <h1 className='break-words text-2xl font-bold text-gray-900 dark:text-zinc-100'>
                            {title}
                        </h1>
                        <p className='max-w-3xl break-words text-sm leading-6 text-gray-500 dark:text-zinc-400'>
                            {subtitle}
                        </p>
                    </div>
                    <div className='flex w-full min-w-0 flex-col items-start gap-3 sm:w-auto sm:items-end'>
                        <div className='inline-flex max-w-full items-center rounded-md bg-gray-100 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:bg-zinc-800 dark:text-zinc-200'>
                            {statusLabel}
                        </div>
                        <div className='flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end'>
                            <Button
                                icon='HeroDocumentText'
                                onClick={onOpenPdf}
                                isDisable={!pdfObjectUrl && !pdfLoading}>
                                Ver PDF
                            </Button>
                            <Button
                                icon='HeroDocumentArrowDown'
                                onClick={onDownloadPdf}
                                isDisable={!pdfObjectUrl && !pdfLoading}>
                                Descargar PDF
                            </Button>
                        </div>
                    </div>
                </div>
                <div className='mt-5 grid gap-4 text-sm text-gray-600 dark:text-zinc-300 md:grid-cols-2 xl:grid-cols-4'>
                    <div className='min-w-0 space-y-1 rounded-md bg-gray-50 px-4 py-3 dark:bg-zinc-800'>
                        <span className='block font-medium text-gray-900 dark:text-zinc-100'>
                            Empresa emisora
                        </span>
                        <span className='block break-words'>{detalle.contrato.datos_empresa.nombre}</span>
                    </div>
                    <div className='min-w-0 space-y-1 rounded-md bg-gray-50 px-4 py-3 dark:bg-zinc-800'>
                        <span className='block font-medium text-gray-900 dark:text-zinc-100'>
                            Destinatario
                        </span>
                        <span className='block break-words'>
                            {detalle.destinatario
                                ? `${detalle.destinatario.nombre} (${detalle.destinatario.email})`
                                : 'Sin destinatario definido'}
                        </span>
                    </div>
                    <div className='min-w-0 space-y-1 rounded-md bg-gray-50 px-4 py-3 dark:bg-zinc-800'>
                        <span className='block font-medium text-gray-900 dark:text-zinc-100'>
                            Fecha de emision
                        </span>
                        <span className='block break-words'>
                            {detalle.fecha_emision
                                ? dayjs(detalle.fecha_emision).format('DD/MM/YYYY HH:mm')
                                : 'No disponible'}
                        </span>
                    </div>
                    <div className='min-w-0 space-y-1 rounded-md bg-gray-50 px-4 py-3 dark:bg-zinc-800'>
                        <span className='block font-medium text-gray-900 dark:text-zinc-100'>
                            Tipo
                        </span>
                        <span className='block break-words'>{detalle.contrato.tipo_label}</span>
                    </div>
                </div>
            </section>

            {!detalle.firma_prestadora_disponible && (
                <section className='rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/20 dark:text-amber-100'>
                    La empresa prestadora aun no tiene una firma configurada. Puedes revisar la
                    version contractual, pero el envio a firma debe permanecer bloqueado hasta
                    completar esa configuracion.
                </section>
            )}

            <div className='space-y-6'>
                <section className='rounded-lg border border-gray-200 bg-white p-5 text-sm leading-6 dark:border-zinc-700 dark:bg-zinc-900'>
                    {pdfLoading ? (
                        <p className='text-gray-500 dark:text-zinc-400'>Preparando PDF...</p>
                    ) : pdfError ? (
                        <p className='text-red-600 dark:text-red-300'>{pdfError}</p>
                    ) : (
                        <p className='text-gray-600 dark:text-zinc-300'>
                            El documento se abre en una nueva ventana para mantener esta pantalla
                            enfocada en la decision y la firma.
                        </p>
                    )}
                </section>

                <div className='min-w-0 space-y-6'>
                    <ContratoPublicoResumen contrato={detalle.contrato} />

                    <section className='rounded-lg border border-gray-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900'>
                        <div className='mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
                            <div className='space-y-1.5'>
                                <p className='text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-zinc-500'>
                                    Firma del cliente
                                </p>
                                <h2 className='text-lg font-semibold text-gray-900 dark:text-zinc-100'>
                                    Aceptacion final
                                </h2>
                            </div>
                        </div>

                        {isPreview ? (
                            <div className='rounded-md border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm leading-6 text-blue-800 dark:border-blue-900/50 dark:bg-blue-950/20 dark:text-blue-200'>
                                Esta pantalla es solo de referencia interna. La firma del cliente se
                                realiza desde el enlace publico enviado al destinatario.
                            </div>
                        ) : detalle.firmado ? (
                            <div className='space-y-4'>
                                <div className='rounded-md border border-green-100 bg-green-50/70 px-4 py-4 text-sm leading-6 text-green-800 dark:border-green-900/50 dark:bg-green-950/20 dark:text-green-200'>
                                    Este contrato fue firmado el{' '}
                                    {detalle.fecha_firma
                                        ? dayjs(detalle.fecha_firma).format('DD/MM/YYYY HH:mm')
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
                                    Tu firma en imagen confirma la aceptacion del contrato y de los
                                    acuerdos de confidencialidad mostrados en esta pagina.
                                </div>
                                <div className='flex flex-wrap gap-2'>
                                    <Button
                                        variant={signatureMode === 'draw' ? 'solid' : 'outline'}
                                        onClick={() => setSignatureMode('draw')}>
                                        Dibujar firma
                                    </Button>
                                    <Button
                                        variant={signatureMode === 'upload' ? 'solid' : 'outline'}
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
                                            Usa una imagen PNG o JPG de hasta 1 MB para evitar
                                            descuadres en el documento firmado.
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
                                        <Button onClick={clear}>Limpiar</Button>
                                    ) : (
                                        <Button onClick={() => setUploadedSignature(null)}>
                                            Quitar imagen
                                        </Button>
                                    )}
                                    <Button
                                        variant='solid'
                                        icon='HeroCheck'
                                        isLoading={isSubmitting}
                                        isDisable={!detalle.puede_firmar}
                                        onClick={submitFirma}>
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
    );
};

export default ContratoFirmaExperience;
