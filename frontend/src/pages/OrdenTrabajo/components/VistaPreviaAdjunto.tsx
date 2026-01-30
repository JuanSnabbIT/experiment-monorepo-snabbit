import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, { SubheaderLeft } from '@/components/layouts/Subheader/Subheader';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { useGetDetalleAdjuntoQuery } from '@/store/slices/ordenTrabajo/ordenTrabajoApi';
import { useNavigate, useParams } from 'react-router-dom';

function VistaPreviaAdjunto() {
    const navigate = useNavigate();
    const { id, idOrden } = useParams();
    const { data: detalleAdjunto } = useGetDetalleAdjuntoQuery(
        { ordenId: idOrden ?? '', adjuntoId: id ?? '' },
        { skip: !id || !idOrden },
    );

    return (
        <PageWrapper
            isProtectedRoute={true}
            name='Vista Previa Adjunto'
            title='Vista Previa Adjunto'>
            <Subheader>
                <SubheaderLeft>
                    <Button
                        icon='HeroArrowLeft'
                        onClick={() => {
                            navigate(-1);
                        }}></Button>
                    <Badge className='text-xl'>Vista Previa Adjunto</Badge>
                </SubheaderLeft>
            </Subheader>
            <Container className='h-full w-full'>
                <div className='h-full w-full'>
                    {detalleAdjunto && (
                        <iframe
                            src={detalleAdjunto.archivo.replaceAll('http://', 'https://')}
                            // src={detalleAdjunto.archivo}
                            className='h-full w-full'
                        />
                    )}
                </div>
            </Container>
        </PageWrapper>
    );
}

export default VistaPreviaAdjunto;
