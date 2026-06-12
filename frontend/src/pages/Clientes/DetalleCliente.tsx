import Breadcrumb from '@/components/layouts/Breadcrumb/Breadcrumb';
import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Alert from '@/components/ui/Alert';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import { useGetDetalleClienteQuery, useGetTrabajadoresClienteQuery } from '@/store/slices/empresa/empresaApi';
import { getErrorMessage } from '@/utils/errorHandlers';
import { useEffect, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import TablaContratosLaboralesCliente from './components/TablaContratosLaboralesCliente';
import TablaDeContratosDelCliente from './components/TablaDeContratosDelCliente';
import TablaDeUsuariosVinculadosLicencias from './components/TablaDeUsuariosVinculadosLicencias';
import TablaUsuariosDelCliente from './components/TablaUsuariosDelCliente';

const CLIENT_TABS = {
    trabajadores: 'Trabajadores',
    contratos: 'Contratos',
    asignaciones: 'Asignaciones de licencias',
    contratosLaborales: 'Contratos laborales',
} as const;

type TClientTab = keyof typeof CLIENT_TABS;

const DetalleCliente = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const {
        data: detalleCliente,
        isLoading: loadingCliente,
        isError: errorCliente,
        error: errorClienteData,
    } = useGetDetalleClienteQuery(id ?? '', { skip: !id });

    useEffect(() => {
        if (!errorCliente) return;
        const status = (errorClienteData as { status?: number })?.status;
        if (status === 404) {
            toast.warning('El cliente no fue encontrado. Es posible que haya sido eliminado.');
            navigate('/empresa/empresas', { replace: true });
        }
    }, [errorCliente, errorClienteData, navigate]);

    const empresaClienteId = detalleCliente?.info_cliente?.id;
    const { data: trabajadores = [] } = useGetTrabajadoresClienteQuery(
        empresaClienteId ?? '',
        { skip: !empresaClienteId },
    );
    const cantidadPendientes = trabajadores.filter((t) => t.tipo === 'pendiente').length;
    const [searchParams, setSearchParams] = useSearchParams();

    const activeTab = useMemo<TClientTab>(() => {
        const tab = searchParams.get('tab');
        if (tab === 'contratos-laborales') return 'contratosLaborales';
        if (
            tab === 'trabajadores' ||
            tab === 'contratos' ||
            tab === 'asignaciones' ||
            tab === 'contratosLaborales'
        ) {
            return tab;
        }
        return 'trabajadores';
    }, [searchParams]);

    const setActiveTab = (tab: TClientTab) => {
        const nextParams = new URLSearchParams(searchParams);
        nextParams.set('tab', tab);
        setSearchParams(nextParams, { replace: true });
    };

    const tabProps = (tab: TClientTab) =>
        activeTab === tab
            ? {
                  size: 'sm' as const,
                  rounded: 'rounded-full' as const,
                  className: 'border',
                  isActive: true,
                  color: 'blue' as const,
                  colorIntensity: '500' as const,
                  variant: 'solid' as const,
              }
            : {
                  size: 'sm' as const,
                  color: 'zinc' as const,
                  rounded: 'rounded-full' as const,
                  className: 'border',
              };

    return (
        <PageWrapper isProtectedRoute={true} title='Detalle Cliente' name='Detalle Cliente'>
            <Container className='h-full w-full'>
                <div className='flex flex-col gap-4'>
                    <Breadcrumb
                        path='Clientes'
                        currentPage={detalleCliente?.info_cliente.nombre || 'Detalle cliente'}
                    />

                    {errorCliente && (
                        <Alert color='red'>
                            {getErrorMessage(errorClienteData)}
                        </Alert>
                    )}

                    {loadingCliente && (
                        <Card>
                            <CardBody>
                                <p className='text-sm text-zinc-500'>Cargando datos del cliente...</p>
                            </CardBody>
                        </Card>
                    )}

                    {!loadingCliente && !errorCliente && detalleCliente && (
                        <>
                            <Card>
                                <CardHeader>
                                    <CardHeaderChild>
                                        <Badge className='text-xl'>Datos</Badge>
                                    </CardHeaderChild>
                                </CardHeader>
                                <CardBody className='flex flex-col gap-4'>
                                    <div className='grid grid-cols-3 gap-4 rounded-xl border border-blue-500 p-4'>
                                        <div>
                                            <Badge>Nombre</Badge>
                                            <div className='ml-4'>
                                                {detalleCliente.info_cliente.nombre}
                                            </div>
                                        </div>
                                        <div>
                                            <Badge>Dirección Principal</Badge>
                                            <div className='ml-4'>
                                                {detalleCliente.info_cliente.direccion_principal}
                                            </div>
                                        </div>
                                        <div>
                                            <Badge>Sitio Web</Badge>
                                            <div className='ml-4'>
                                                {detalleCliente.info_cliente.sitio_web || 'Sin Sitio Web'}
                                            </div>
                                        </div>
                                    </div>
                                    <div className='grid grid-cols-2 gap-4 rounded-xl border border-blue-500 p-4'>
                                        <div>
                                            <Badge>PPM</Badge>
                                            <div className='ml-4'>{detalleCliente.info_cliente.ppm}%</div>
                                        </div>
                                        <div>
                                            <Badge>Recargo</Badge>
                                            <div className='ml-4'>
                                                {detalleCliente.info_cliente.recargo}%
                                            </div>
                                        </div>
                                    </div>
                                </CardBody>
                            </Card>

                            <Card>
                                <CardBody>
                                    <div className='mb-3'>
                                        <div className='text-sm font-medium text-zinc-700 dark:text-zinc-300'>
                                            Navegación del cliente
                                        </div>
                                    </div>
                                    <div className='flex flex-row gap-4 overflow-auto'>
                                        <Button {...tabProps('trabajadores')} onClick={() => setActiveTab('trabajadores')}>
                                            <span className='flex items-center gap-2'>
                                                {CLIENT_TABS.trabajadores}
                                                {cantidadPendientes > 0 && (
                                                    <Badge color='amber' className='text-xs'>
                                                        {cantidadPendientes}
                                                    </Badge>
                                                )}
                                            </span>
                                        </Button>
                                        <Button {...tabProps('contratos')} onClick={() => setActiveTab('contratos')}>
                                            {CLIENT_TABS.contratos}
                                        </Button>
                                        <Button {...tabProps('asignaciones')} onClick={() => setActiveTab('asignaciones')}>
                                            {CLIENT_TABS.asignaciones}
                                        </Button>
                                        <Button {...tabProps('contratosLaborales')} onClick={() => setActiveTab('contratosLaborales')}>
                                            {CLIENT_TABS.contratosLaborales}
                                        </Button>
                                    </div>
                                </CardBody>
                            </Card>

                            {activeTab === 'trabajadores' && (
                                <TablaUsuariosDelCliente detalleCliente={detalleCliente} />
                            )}
                            {activeTab === 'contratos' && (
                                <TablaDeContratosDelCliente detalleCliente={detalleCliente} />
                            )}
                            {activeTab === 'asignaciones' && (
                                <TablaDeUsuariosVinculadosLicencias
                                    detalleCliente={detalleCliente}
                                    onIrAContratos={() => setActiveTab('contratos')}
                                />
                            )}
                            {activeTab === 'contratosLaborales' && (
                                <TablaContratosLaboralesCliente detalleCliente={detalleCliente} />
                            )}
                        </>
                    )}
                </div>
            </Container>
        </PageWrapper>
    );
};

export default DetalleCliente;
