import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, { SubheaderLeft, SubheaderRight } from '@/components/layouts/Subheader/Subheader';
import Alert from '@/components/ui/Alert';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import { useGetLicenciaQuery } from '@/store/slices/contratos/contratoApi';
import { formatCurrency } from '@/utils/currency';
import { useNavigate, useParams } from 'react-router-dom';

const getModalidadLabel = (modalidadBase: string, modalidadAnualFormaPago: string | null) => {
    if (modalidadBase === 'P1M') return 'P1M - Mensual';
    if (modalidadBase === 'P1Y') {
        return modalidadAnualFormaPago === 'PAGO_MENSUAL'
            ? 'P1Y - Pago mensual'
            : 'P1Y - Pago unico';
    }
    return 'Pago unico';
};

const DetalleLicenciaCatalogo = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();

    const { data: licencia, isLoading, isError } = useGetLicenciaQuery(id ?? '', {
        skip: !id,
    });

    if (isLoading) {
        return (
            <PageWrapper>
                <Container className='h-full w-full'>
                    <Card className='border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900'>
                        <CardBody>
                            <div className='flex min-h-[220px] flex-col items-center justify-center gap-3 text-center'>
                                <div className='h-12 w-12 animate-spin rounded-full border-2 border-zinc-300 border-t-blue-500' />
                                <div>
                                    <p className='font-medium text-zinc-700 dark:text-zinc-300'>
                                        Cargando licencia
                                    </p>
                                    <p className='text-sm text-zinc-500 dark:text-zinc-400'>
                                        Estamos obteniendo el detalle del catálogo.
                                    </p>
                                </div>
                            </div>
                        </CardBody>
                    </Card>
                </Container>
            </PageWrapper>
        );
    }

    if (isError || !licencia) {
        return (
            <PageWrapper>
                <Container className='h-full w-full'>
                    <Alert color='red'>No se pudo cargar la licencia solicitada.</Alert>
                </Container>
            </PageWrapper>
        );
    }

    return (
        <PageWrapper isProtectedRoute name='Detalle Licencia' title='Detalle Licencia'>
            <Subheader>
                <SubheaderLeft>
                    <div>
                        <div className='flex items-center gap-2'>
                            <h1 className='text-lg font-semibold text-zinc-900 dark:text-zinc-100'>
                                {licencia.nombre}
                            </h1>
                            <Badge
                                variant='solid'
                                color={licencia.activo ? 'emerald' : 'zinc'}
                                className='shadow-sm'>
                                {licencia.activo ? 'Activa' : 'Inactiva'}
                            </Badge>
                        </div>
                        <p className='text-sm text-zinc-500 dark:text-zinc-400'>
                            {getModalidadLabel(
                                licencia.modalidad_base,
                                licencia.modalidad_anual_forma_pago,
                            )}
                        </p>
                    </div>
                </SubheaderLeft>
                <SubheaderRight className='w-full md:w-auto'>
                    <div className='flex w-full flex-col gap-3 md:w-auto md:flex-row'>
                        <Button
                            icon='HeroArrowLeft'
                            variant='outline'
                            onClick={() => navigate('/registros/licencias')}>
                            Volver
                        </Button>
                    </div>
                </SubheaderRight>
            </Subheader>
            <Container className='h-full w-full'>
                <div className='grid gap-4 xl:grid-cols-3'>
                    <div className='xl:col-span-2'>
                        <Card className='border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900'>
                            <CardHeader>
                                <CardHeaderChild>
                                    <div>
                                        <h3 className='text-base font-semibold text-zinc-900 dark:text-zinc-100'>
                                            Detalle de licencia
                                        </h3>
                                        <p className='text-sm text-zinc-500 dark:text-zinc-400'>
                                            Esta vista es solo de consulta. No se permite editar la licencia desde aquí.
                                        </p>
                                    </div>
                                </CardHeaderChild>
                            </CardHeader>
                            <CardBody>
                                <div className='grid gap-4'>
                                    <div className='grid gap-4 sm:grid-cols-2'>
                                        <div>
                                            <p className='text-sm text-zinc-500 dark:text-zinc-400'>Nombre</p>
                                            <p className='mt-1 font-medium text-zinc-900 dark:text-zinc-100'>
                                                {licencia.nombre}
                                            </p>
                                        </div>
                                        <div>
                                            <p className='text-sm text-zinc-500 dark:text-zinc-400'>Número de parte</p>
                                            <p className='mt-1 font-medium text-zinc-900 dark:text-zinc-100'>
                                                {licencia.numero_parte || '—'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className='grid gap-4 sm:grid-cols-2'>
                                        <div>
                                            <p className='text-sm text-zinc-500 dark:text-zinc-400'>Proveedor</p>
                                            <p className='mt-1 font-medium text-zinc-900 dark:text-zinc-100'>
                                                {licencia.proveedor || '—'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className='text-sm text-zinc-500 dark:text-zinc-400'>Modalidad</p>
                                            <p className='mt-1 font-medium text-zinc-900 dark:text-zinc-100'>
                                                {getModalidadLabel(
                                                    licencia.modalidad_base,
                                                    licencia.modalidad_anual_forma_pago,
                                                )}
                                            </p>
                                        </div>
                                    </div>

                                    <div className='grid gap-4 sm:grid-cols-2'>
                                        <div>
                                            <p className='text-sm text-zinc-500 dark:text-zinc-400'>Moneda</p>
                                            <p className='mt-1 font-medium text-zinc-900 dark:text-zinc-100'>
                                                {licencia.moneda}
                                            </p>
                                        </div>
                                        <div>
                                            <p className='text-sm text-zinc-500 dark:text-zinc-400'>Estado</p>
                                            <Badge
                                                variant='outline'
                                                color={licencia.activo ? 'emerald' : 'zinc'}>
                                                {licencia.activo ? 'Activa' : 'Inactiva'}
                                            </Badge>
                                        </div>
                                    </div>

                                    <div className='grid gap-4 sm:grid-cols-2'>
                                        <div>
                                            <p className='text-sm text-zinc-500 dark:text-zinc-400'>Precio partner</p>
                                            <p className='mt-1 font-medium text-zinc-900 dark:text-zinc-100'>
                                                {formatCurrency(licencia.precio_partner, licencia.moneda)}
                                            </p>
                                        </div>
                                        <div>
                                            <p className='text-sm text-zinc-500 dark:text-zinc-400'>Precio venta</p>
                                            <p className='mt-1 font-medium text-zinc-900 dark:text-zinc-100'>
                                                {formatCurrency(licencia.precio_venta, licencia.moneda)}
                                            </p>
                                        </div>
                                    </div>

                                    <div className='rounded-xl border border-zinc-200 p-4 dark:border-zinc-700'>
                                        <p className='text-sm text-zinc-500 dark:text-zinc-400'>Descripción</p>
                                        <p className='mt-2 whitespace-pre-line text-sm text-zinc-700 dark:text-zinc-300'>
                                            {licencia.descripcion || 'Sin descripción'}
                                        </p>
                                    </div>
                                </div>
                            </CardBody>
                        </Card>
                    </div>

                    <div className='xl:col-span-1'>
                        <Card className='border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900'>
                            <CardHeader>
                                <CardHeaderChild>
                                    <div>
                                        <h3 className='text-base font-semibold text-zinc-900 dark:text-zinc-100'>
                                            Resumen comercial
                                        </h3>
                                        <p className='text-sm text-zinc-500 dark:text-zinc-400'>
                                            Vista rápida alineada con la jerarquía de cotizaciones.
                                        </p>
                                    </div>
                                </CardHeaderChild>
                            </CardHeader>
                            <CardBody>
                                <div className='space-y-4'>
                                    <div className='rounded-xl border border-zinc-200 p-4 dark:border-zinc-700'>
                                        <p className='text-xs font-semibold uppercase tracking-wide text-zinc-500'>
                                            Precio partner
                                        </p>
                                        <p className='mt-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100'>
                                            {formatCurrency(licencia.precio_partner, licencia.moneda)}
                                        </p>
                                    </div>
                                    <div className='rounded-xl border border-zinc-200 p-4 dark:border-zinc-700'>
                                        <p className='text-xs font-semibold uppercase tracking-wide text-zinc-500'>
                                            Precio venta
                                        </p>
                                        <p className='mt-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100'>
                                            {formatCurrency(licencia.precio_venta, licencia.moneda)}
                                        </p>
                                    </div>
                                    <div className='rounded-xl border border-zinc-200 p-4 dark:border-zinc-700'>
                                        <p className='text-xs font-semibold uppercase tracking-wide text-zinc-500'>
                                            Proveedor
                                        </p>
                                        <p className='mt-2 text-sm font-medium text-zinc-700 dark:text-zinc-300'>
                                            {licencia.proveedor || 'Sin proveedor'}
                                        </p>
                                    </div>
                                </div>
                            </CardBody>
                        </Card>
                    </div>
                </div>
            </Container>
        </PageWrapper>
    );
};

export default DetalleLicenciaCatalogo;
