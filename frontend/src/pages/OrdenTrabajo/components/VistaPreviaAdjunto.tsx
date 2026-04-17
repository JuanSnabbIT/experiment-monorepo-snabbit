import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, { SubheaderLeft } from '@/components/layouts/Subheader/Subheader';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody } from '@/components/ui/Card';
import { useGetAdjuntosQuery } from '@/store/slices/ordenTrabajo/ordenTrabajoApi';
import { useNavigate, useParams } from 'react-router-dom';

function VistaPreviaAdjunto() {
    const navigate = useNavigate();
    const { id, idOrden } = useParams();
    const { data: listaAdjuntos = [] } = useGetAdjuntosQuery(idOrden ?? '', { skip: !id || !idOrden });
    const detalleAdjunto = listaAdjuntos.find((a: any) => String(a.id) === String(id));

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
                <Card className='h-full w-full'>
                    <CardBody className='h-full w-full'>
                        {detalleAdjunto && (
                            <iframe
                                src={detalleAdjunto.archivo.replaceAll('http://', 'https://')}
                                className='h-full w-full'
                            />
                        )}
                    </CardBody>
                </Card>
            </Container>
        </PageWrapper>
    );
}

export default VistaPreviaAdjunto;
