import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, { SubheaderLeft } from '@/components/layouts/Subheader/Subheader';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import Icon from '@/components/icon/Icon';

function SinPermisos() {
    return (
        <PageWrapper isProtectedRoute={true} title='Sin Permisos'>
            <Subheader>
                <SubheaderLeft>
                    <h2 className='text-xl font-semibold'>Acceso denegado</h2>
                </SubheaderLeft>
            </Subheader>
            <Container className='flex h-full items-center justify-center'>
                <Card className='w-full max-w-2xl'>
                    <CardHeader>
                        <CardHeaderChild className='flex items-center gap-2'>
                            <Icon icon='HeroShieldExclamation' className='text-red-500' />
                            Sin permisos
                        </CardHeaderChild>
                    </CardHeader>
                    <CardBody>
                        <p className='text-zinc-600 dark:text-zinc-400'>
                            No tienes permisos para acceder a esta vista. Si crees que esto es un
                            error, solicita acceso a un administrador.
                        </p>
                    </CardBody>
                </Card>
            </Container>
        </PageWrapper>
    );
}

export default SinPermisos;
