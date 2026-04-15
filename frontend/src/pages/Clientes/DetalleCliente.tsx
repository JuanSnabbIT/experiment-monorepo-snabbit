import Breadcrumb from '@/components/layouts/Breadcrumb/Breadcrumb';
import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, { SubheaderLeft } from '@/components/layouts/Subheader/Subheader';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import { useGetDetalleClienteQuery } from '@/store/slices/empresa/empresaApi';
import { useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import TablaDeContratosDelCliente from './components/TablaDeContratosDelCliente';
import TablaDeUsuariosVinculadosLicencias from './components/TablaDeUsuariosVinculadosLicencias';
import TablaUsuariosDelCliente from './components/TablaUsuariosDelCliente';

const CLIENT_TABS = {
    usuarios: 'Usuarios',
    contratos: 'Contratos',
    asignaciones: 'Asignaciones de licencias',
} as const;

type TClientTab = keyof typeof CLIENT_TABS;

const DetalleCliente = () => {
    const { id } = useParams();
    const { data: detalleCliente } = useGetDetalleClienteQuery(id ?? '', { skip: !id });
    const [searchParams, setSearchParams] = useSearchParams();

    const activeTab = useMemo<TClientTab>(() => {
        const tab = searchParams.get('tab');
        if (tab === 'usuarios' || tab === 'contratos' || tab === 'asignaciones') {
            return tab;
        }
        return 'usuarios';
    }, [searchParams]);

    const setActiveTab = (tab: TClientTab) => {
        const nextParams = new URLSearchParams(searchParams);
        nextParams.set('tab', tab);
        setSearchParams(nextParams, { replace: true });
    };

    return (
        <PageWrapper isProtectedRoute={true} title='Detalle Cliente' name='Detalle Cliente'>
            <Subheader>
                <SubheaderLeft>{null}</SubheaderLeft>
            </Subheader>
            <Container className='h-full w-full'>
                <div className='flex flex-col gap-4'>
                    <Breadcrumb
                        path='Clientes'
                        currentPage={detalleCliente?.info_cliente.nombre || 'Detalle cliente'}
                    />
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
                                {detalleCliente?.info_cliente.nombre}
                            </div>
                                </div>
                                <div>
                                    <Badge>Dirección Principal</Badge>
                                    <div className='ml-4'>
                                        {detalleCliente?.info_cliente.direccion_principal}
                                    </div>
                                </div>
                                <div>
                                    <Badge>Sitio Web</Badge>
                                    <div className='ml-4'>
                                        {detalleCliente?.info_cliente.sitio_web || 'Sin Sitio Web'}
                                    </div>
                                </div>
                            </div>
                            <div className='grid grid-cols-2 gap-4 rounded-xl border border-blue-500 p-4'>
                                <div>
                                    <Badge>PPM</Badge>
                                    <div className='ml-4'>{detalleCliente?.info_cliente.ppm}%</div>
                                </div>
                                <div>
                                    <Badge>Recargo</Badge>
                                    <div className='ml-4'>
                                        {detalleCliente?.info_cliente.recargo}%
                                    </div>
                                </div>
                            </div>
                        </CardBody>
                    </Card>
                    <Card>
                        <CardBody>
                            <div className='mb-3'>
                                <div className='text-sm font-medium text-zinc-700 dark:text-zinc-300'>
                                    Navegacion del cliente
                                </div>
                            </div>
                            <div className='flex flex-row gap-4 overflow-auto'>
                                <Button
                                    {...(activeTab === 'usuarios'
                                        ? {
                                              size: 'sm',
                                              rounded: 'rounded-full',
                                              className: 'border',
                                              isActive: true,
                                              color: 'blue',
                                              colorIntensity: '500',
                                              variant: 'solid',
                                          }
                                        : {
                                              size: 'sm',
                                              color: 'zinc',
                                              rounded: 'rounded-full',
                                              className: 'border',
                                          })}
                                    onClick={() => {
                                        setActiveTab('usuarios');
                                    }}>
                                    {CLIENT_TABS.usuarios}
                                </Button>
                                <Button
                                    {...(activeTab === 'contratos'
                                        ? {
                                              size: 'sm',
                                              rounded: 'rounded-full',
                                              className: 'border',
                                              isActive: true,
                                              color: 'blue',
                                              colorIntensity: '500',
                                              variant: 'solid',
                                          }
                                        : {
                                              size: 'sm',
                                              color: 'zinc',
                                              rounded: 'rounded-full',
                                              className: 'border',
                                          })}
                                    onClick={() => {
                                        setActiveTab('contratos');
                                    }}>
                                    {CLIENT_TABS.contratos}
                                </Button>
                                <Button
                                    {...(activeTab === 'asignaciones'
                                        ? {
                                              size: 'sm',
                                              rounded: 'rounded-full',
                                              className: 'border',
                                              isActive: true,
                                              color: 'blue',
                                              colorIntensity: '500',
                                              variant: 'solid',
                                          }
                                        : {
                                              size: 'sm',
                                              color: 'zinc',
                                              rounded: 'rounded-full',
                                              className: 'border',
                                          })}
                                    onClick={() => {
                                        setActiveTab('asignaciones');
                                    }}>
                                    {CLIENT_TABS.asignaciones}
                                </Button>
                            </div>
                        </CardBody>
                    </Card>

                    {activeTab === 'usuarios' && (
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
                </div>
            </Container>
        </PageWrapper>
    );
};

export default DetalleCliente;
