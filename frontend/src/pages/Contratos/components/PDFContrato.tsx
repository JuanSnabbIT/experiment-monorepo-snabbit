import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, { SubheaderLeft, SubheaderRight } from '@/components/layouts/Subheader/Subheader';
import Button from '@/components/ui/Button';
import { useAppSelector } from '@/store';
import { getErrorMessage } from '@/utils/errorHandlers';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';

/**
 * Página de visualización de PDF de contrato.
 * Descarga el PDF generado por WeasyPrint en el backend y lo abre en una nueva pestaña.
 * Los componentes React-PDF legacy (PDFContratoVenta, PDFContratoServicios, PDFContratoLicencias)
 * han sido deprecados en favor del endpoint /api/contratos/{id}/pdf/.
 */
function PDFContrato() {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const token = useAppSelector((state) => state.auth.access);
    const [isLoading, setIsLoading] = useState(false);

    const handleOpenPDF = async () => {
        if (!id) return;
        setIsLoading(true);
        try {
            const baseUrl = process.env.VITE_API_URL ?? '';
            const response = await fetch(`${baseUrl}/api/contratos/${id}/pdf/`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
            // Liberar el objeto URL después de un delay para que el navegador pueda abrirlo
            setTimeout(() => URL.revokeObjectURL(url), 10000);
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <PageWrapper
            isProtectedRoute={false}
            name='PDF del contrato'
            title='PDF del contrato'>
            <Subheader>
                <SubheaderLeft>
                    <Button icon='HeroArrowSmallLeft' onClick={() => navigate(-1)} />
                </SubheaderLeft>
                <SubheaderRight>
                    <Button
                        icon='HeroDocumentArrowDown'
                        variant='solid'
                        isLoading={isLoading}
                        onClick={handleOpenPDF}>
                        Abrir PDF
                    </Button>
                </SubheaderRight>
            </Subheader>
            <Container className='flex h-full items-center justify-center'>
                <div className='flex flex-col items-center gap-4 py-16 text-center'>
                    <p className='text-zinc-500'>
                        Haz clic en "Abrir PDF" para descargar el documento generado por el servidor.
                    </p>
                    <Button
                        icon='HeroDocumentArrowDown'
                        variant='solid'
                        size='lg'
                        isLoading={isLoading}
                        onClick={handleOpenPDF}>
                        Abrir PDF
                    </Button>
                </div>
            </Container>
        </PageWrapper>
    );
}

export default PDFContrato;
//     // Header: se posiciona absolutamente y con "fixed", se repite en cada página generada.
//     header: {
//         display: "flex",
//         justifyContent: "space-between",
//         flexDirection: "row",
//         width: "100%",
//         height: 50,
//     },
//     // Contenido principal, se deja un margen superior para evitar superposición con el header.
//     content: {
//         marginTop: 5,
//     },
//     // Estilos para el contenido del contrato (adaptalos según el documento original)
//     paragraph: {
//         marginBottom: 10,
//         textAlign: 'justify',
//         lineHeight: 1.3,
//     },
//     title: {
//         fontSize: 14,
//         marginBottom: 10,
//         textAlign: 'center',
//         fontWeight: 'bold',
//     },
// });
