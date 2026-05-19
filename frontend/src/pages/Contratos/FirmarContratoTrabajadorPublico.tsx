import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import type { IContratoPublicoFirma } from '@/interface/contrato.interface';
import ApiService from '@/services/ApiService';
import {
    useFirmarContratoTrabajadorPublicoMutation,
    useGetContratoTrabajadorPublicoFirmaQuery,
} from '@/store/slices/rrhh/contratoTrabajadorApi';
import { getErrorMessage } from '@/utils/errorHandlers';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import ContratoFirmaExperience from './components/ContratoFirmaExperience';

const FirmarContratoTrabajadorPublico = () => {
    const { uuid } = useParams<{ uuid: string }>();

    const [pdfObjectUrl, setPdfObjectUrl] = useState<string | null>(null);
    const [pdfLoading, setPdfLoading] = useState(false);
    const [pdfError, setPdfError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const {
        data: detalle,
        isLoading,
        isError,
    } = useGetContratoTrabajadorPublicoFirmaQuery(uuid!, { skip: !uuid });

    const [firmarContrato] = useFirmarContratoTrabajadorPublicoMutation();

    const pdfEndpoint = useMemo(
        () => (uuid ? `/api/rrhh/public/contrato-trabajador-firma/${uuid}/pdf/` : null),
        [uuid],
    );

    useEffect(() => {
        let objectUrl: string | null = null;

        const loadPdf = async () => {
            if (!pdfEndpoint) return;
            setPdfLoading(true);
            setPdfError(null);
            try {
                const response = await ApiService.fetchData<Blob>({
                    url: pdfEndpoint,
                    method: 'get',
                    responseType: 'blob',
                });
                objectUrl = window.URL.createObjectURL(response.data);
                setPdfObjectUrl((current) => {
                    if (current) window.URL.revokeObjectURL(current);
                    return objectUrl;
                });
            } catch (err: unknown) {
                setPdfError(getErrorMessage(err));
            } finally {
                setPdfLoading(false);
            }
        };

        loadPdf();

        return () => {
            if (objectUrl) window.URL.revokeObjectURL(objectUrl);
        };
    }, [pdfEndpoint]);

    const descargarPdf = () => {
        if (!pdfObjectUrl) return;
        const link = document.createElement('a');
        link.href = pdfObjectUrl;
        link.download = `Contrato_trabajador_${uuid}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const abrirPdf = () => {
        if (!pdfObjectUrl) return;
        window.open(pdfObjectUrl, '_blank');
    };

    const handleSubmitFirma = async (firma: string) => {
        if (!uuid) return;
        setIsSubmitting(true);
        try {
            const fechaFirma = new Date().toISOString();
            await firmarContrato({
                uuid,
                data: { firma, fecha_firma: fechaFirma, firmado: true },
            }).unwrap();
            toast.success('Contrato firmado correctamente');
        } catch (err: unknown) {
            toast.error(getErrorMessage(err));
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <PageWrapper>
                <Container>
                    <div className='py-12 text-center text-gray-500'>Cargando contrato...</div>
                </Container>
            </PageWrapper>
        );
    }

    if (isError || !detalle) {
        return (
            <PageWrapper>
                <Container>
                    <div className='py-12 text-center text-red-500'>
                        No se pudo cargar el contrato. El enlace puede ser invalido o haber
                        expirado.
                    </div>
                </Container>
            </PageWrapper>
        );
    }

    // Adaptar shape al tipo esperado por ContratoFirmaExperience
    const detalleAdaptado = detalle as unknown as IContratoPublicoFirma;

    return (
        <PageWrapper>
            <Container>
                <ContratoFirmaExperience
                    detalle={detalleAdaptado}
                    mode='public'
                    pdfObjectUrl={pdfObjectUrl}
                    pdfLoading={pdfLoading}
                    pdfError={pdfError}
                    onDownloadPdf={descargarPdf}
                    onOpenPdf={abrirPdf}
                    onSubmitFirma={handleSubmitFirma}
                    isSubmitting={isSubmitting}
                />
            </Container>
        </PageWrapper>
    );
};

export default FirmarContratoTrabajadorPublico;
