import Icon from '@/components/icon/Icon';
import Button from '@/components/ui/Button';
import type { IContratoResumenPublico } from '@/interface/contrato.interface';
import { useGetContratoResumenPublicoQuery } from '@/store/slices/contratos/contratoApi';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import ContratoPreviewModal from './components/ContratoPreviewModal';
import ResumenDatosContrato from './components/ResumenDatosContrato';

dayjs.locale('es');

const ResumenContratoPublico = () => {
    const { uuid } = useParams<{ uuid: string }>();
    const [previewOpen, setPreviewOpen] = useState(false);

    const { data: detalle, isLoading, error } = useGetContratoResumenPublicoQuery(uuid ?? '', {
        skip: !uuid,
    });

    const descargarPdf = async () => {
        if (!uuid) return;
        try {
            const { default: ApiService } = await import('@/services/ApiService');
            const response = await ApiService.fetchData<Blob>({
                url: `/api/public/contrato-resumen/${uuid}/pdf/`,
                method: 'get',
                responseType: 'blob',
                isLoginRequest: true,
            });
            const blob = response.data;
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Contrato_${detalle?.contrato?.id ?? uuid}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch {
            // silencioso — el usuario puede reintentar
        }
    };

    if (isLoading) {
        return (
            <div className='flex min-h-screen items-center justify-center bg-gray-100 dark:bg-zinc-900'>
                <div className='text-center'>
                    <div className='mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent' />
                    <p className='text-gray-600 dark:text-zinc-400'>Cargando resumen del contrato...</p>
                </div>
            </div>
        );
    }

    if (error || !detalle) {
        return (
            <div className='flex min-h-screen items-center justify-center bg-gray-100 p-4 dark:bg-zinc-900'>
                <div className='w-full max-w-md rounded-lg bg-white p-8 text-center shadow-lg dark:bg-zinc-800'>
                    <Icon icon='HeroExclamationTriangle' className='mx-auto mb-4 text-5xl text-red-500' />
                    <h2 className='mb-2 text-xl font-semibold text-red-600'>
                        No se pudo cargar el contrato
                    </h2>
                    <p className='mb-6 text-sm text-gray-600 dark:text-zinc-300'>
                        Es posible que el enlace haya expirado o no sea válido.
                    </p>
                    <Button onClick={() => window.location.assign('/')}>Ir al inicio</Button>
                </div>
            </div>
        );
    }

    if (!detalle.activo) {
        return (
            <div className='flex min-h-screen items-center justify-center bg-gray-100 p-4 dark:bg-zinc-900'>
                <div className='w-full max-w-md rounded-lg bg-white p-8 text-center shadow-lg dark:bg-zinc-800'>
                    <Icon icon='HeroLockClosed' className='mx-auto mb-4 text-5xl text-yellow-500' />
                    <h2 className='mb-2 text-xl font-semibold text-yellow-600'>Enlace inactivo</h2>
                    <p className='text-sm text-gray-600 dark:text-zinc-300'>
                        Este enlace ya no está activo. Contacta a tu proveedor para obtener uno nuevo.
                    </p>
                </div>
            </div>
        );
    }

    const { contrato, secciones_generadas, destinatario } = detalle as IContratoResumenPublico;

    return (
        <div className='min-h-screen bg-gray-100 py-10 print:bg-white print:py-0 dark:bg-zinc-900'>
            <div className='mx-auto max-w-5xl px-4 lg:px-8'>
                <div className='overflow-hidden rounded-xl bg-white shadow-lg print:rounded-none print:shadow-none dark:bg-zinc-800'>
                    <div className='space-y-5 p-6 sm:p-8'>
                        {/* Cabecera */}
                        <section className='rounded-lg border border-gray-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900'>
                            <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
                                <div className='min-w-0'>
                                    <div className='flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-zinc-500'>
                                        <Icon icon='HeroDocumentText' className='h-4 w-4' />
                                        Resumen de contrato
                                    </div>
                                    <h1 className='mt-2 text-2xl font-bold text-gray-900 dark:text-zinc-100'>
                                        {contrato.nombre}
                                    </h1>
                                    {destinatario && (
                                        <p className='mt-1 text-sm text-gray-500 dark:text-zinc-400'>
                                            Para: {destinatario.nombre} ({destinatario.email})
                                        </p>
                                    )}
                                </div>

                                <div className='flex flex-col items-start gap-3 sm:items-end'>
                                    <Button icon='HeroDocumentArrowDown' onClick={descargarPdf}>
                                        Descargar PDF
                                    </Button>
                                    <Button
                                        variant='outline'
                                        icon='HeroDocumentText'
                                        onClick={() => setPreviewOpen(true)}>
                                        Ver documento completo
                                    </Button>
                                </div>
                            </div>
                        </section>

                        {/* Resumen de datos */}
                        <ResumenDatosContrato contrato={contrato} />

                        {/* Modal documento completo */}
                        <ContratoPreviewModal
                            isOpen={previewOpen}
                            setIsOpen={setPreviewOpen}
                            contrato={contrato}
                            secciones={secciones_generadas ?? []}
                        />

                        {/* Pie */}
                        <div className='rounded-lg border border-gray-100 bg-gray-50 p-4 text-center text-xs text-gray-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-500'>
                            Resumen generado el {dayjs().format('DD [de] MMMM [de] YYYY')}. Para consultas
                            contacta directamente a tu proveedor de servicios.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResumenContratoPublico;
