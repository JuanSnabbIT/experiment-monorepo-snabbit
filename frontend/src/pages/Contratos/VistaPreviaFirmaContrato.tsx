import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, {
    SubheaderLeft,
    SubheaderRight,
} from '@/components/layouts/Subheader/Subheader';
import Button from '@/components/ui/Button';
import { Pages } from '@/config/pages.config';
import { useGetPreviewFirmaContratoQuery } from '@/store/slices/contratos/contratoApi';
import ApiService from '@/services/ApiService';
import { getErrorMessage } from '@/utils/errorHandlers';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ContratoFirmaExperience from './components/ContratoFirmaExperience';

const VistaPreviaFirmaContrato = () => {
    const navigate = useNavigate();
    const { contratoId } = useParams<{ contratoId: string }>();
    const [pdfObjectUrl, setPdfObjectUrl] = useState<string | null>(null);
    const [pdfLoading, setPdfLoading] = useState(false);
    const [pdfError, setPdfError] = useState<string | null>(null);

    const { data: detalle, isLoading, isError, error } = useGetPreviewFirmaContratoQuery(
        contratoId!,
        {
            skip: !contratoId,
        },
    );

    const pdfEndpoint = useMemo(
        () => (contratoId ? `/api/contratos/${contratoId}/preview-firma/pdf/` : null),
        [contratoId],
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
                setPdfObjectUrl((currentUrl) => {
                    if (currentUrl) {
                        window.URL.revokeObjectURL(currentUrl);
                    }
                    return objectUrl;
                });
            } catch (requestError: unknown) {
                setPdfError(getErrorMessage(requestError));
            } finally {
                setPdfLoading(false);
            }
        };

        loadPdf();

        return () => {
            if (objectUrl) {
                window.URL.revokeObjectURL(objectUrl);
            }
        };
    }, [pdfEndpoint]);

    const descargarPdf = () => {
        if (!pdfObjectUrl) return;
        const link = document.createElement('a');
        link.href = pdfObjectUrl;
        link.download = `Contrato_preview_${detalle?.contrato?.id ?? contratoId}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const abrirPdf = () => {
        if (!pdfObjectUrl) return;
        window.open(pdfObjectUrl, '_blank', 'noopener,noreferrer');
    };

    if (!contratoId) {
        return (
            <PageWrapper>
                <Container>
                    <div className='py-10 text-sm text-red-500'>Contrato no valido.</div>
                </Container>
            </PageWrapper>
        );
    }

    if (isLoading) {
        return (
            <PageWrapper isProtectedRoute title='Vista previa de firma'>
                <Container>
                    <div className='py-10 text-center text-sm text-zinc-500'>
                        Cargando vista previa...
                    </div>
                </Container>
            </PageWrapper>
        );
    }

    if (isError || !detalle) {
        return (
            <PageWrapper isProtectedRoute title='Vista previa de firma'>
                <Container>
                    <div className='py-10 text-sm text-red-500'>
                        {getErrorMessage(error) || 'No se pudo cargar la vista previa.'}
                    </div>
                </Container>
            </PageWrapper>
        );
    }

    return (
        <PageWrapper isProtectedRoute title='Vista previa de firma'>
            <Subheader>
                <SubheaderLeft>
                    <Button icon='HeroArrowLeft' onClick={() => navigate(-1)}>
                        Volver
                    </Button>
                </SubheaderLeft>
                <SubheaderRight>
                    {detalle.es_version_enviada && (
                        <Button
                            icon='HeroArrowTopRightOnSquare'
                            onClick={() =>
                                navigate(
                                    Pages.empresa.subPages.detalleContrato.to
                                        .replace(':clienteId', `${detalle.contrato.empresa_cliente}`)
                                        .replace(':contratoId', `${detalle.contrato.id}`),
                                )
                            }>
                            Ir al contrato
                        </Button>
                    )}
                </SubheaderRight>
            </Subheader>
            <Container className='py-4'>
                <ContratoFirmaExperience
                    detalle={detalle}
                    mode='preview'
                    pdfObjectUrl={pdfObjectUrl}
                    pdfLoading={pdfLoading}
                    pdfError={pdfError}
                    onDownloadPdf={descargarPdf}
                    onOpenPdf={abrirPdf}
                />
            </Container>
        </PageWrapper>
    );
};

export default VistaPreviaFirmaContrato;
