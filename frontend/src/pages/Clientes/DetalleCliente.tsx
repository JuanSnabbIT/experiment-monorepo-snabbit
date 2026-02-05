import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, { SubheaderLeft } from '@/components/layouts/Subheader/Subheader';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import { useGetDetalleClienteQuery } from '@/store/slices/empresa/empresaApi';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import TablaDeContratosDelCliente from './components/TablaDeContratosDelCliente';
import TablaDeUsuariosVinculadosLicencias from './components/TablaDeUsuariosVinculadosLicencias';
import TablaUsuariosDelCliente from './components/TablaUsuariosDelCliente';

const DetalleCliente = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { data: detalleCliente } = useGetDetalleClienteQuery(id ?? '', { skip: !id });
    const [activeComponent, setActiveComponent] = useState<string>('Usuarios');

    return (
        <PageWrapper isProtectedRoute={true} title='Detalle Cliente' name='Detalle Cliente'>
            <Subheader>
                <SubheaderLeft />
            </Subheader>
            <Container className='h-full w-full'>
                <div className='flex flex-col gap-4'>
                    <Card>
                        <CardHeader>
                            <CardHeaderChild>
                                <Badge className='text-xl'>Datos</Badge>
                            </CardHeaderChild>
                            <CardHeaderChild>
                                <Button
                                    variant='solid'
                                    color='violet'
                                    onClick={() => {
                                            navigate(
                                                `/empresa/contratos-cliente/${detalleCliente?.id}`,
                                            );
                                    }}>
                                    Ir a los contratos
                                </Button>
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
                            <div className='flex flex-row gap-4 overflow-auto'>
                                <Button
                                    {...(activeComponent === 'Usuarios'
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
                                        setActiveComponent('Usuarios');
                                    }}>
                                    Usuarios
                                </Button>
                                <Button
                                    {...(activeComponent === 'Contratos'
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
                                        setActiveComponent('Contratos');
                                    }}>
                                    Contratos
                                </Button>
                                <Button
                                    {...(activeComponent === 'Licencias'
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
                                        setActiveComponent('Licencias');
                                    }}>
                                    Licencias
                                </Button>
                            </div>
                        </CardBody>
                    </Card>

                    {activeComponent === 'Usuarios' && (
                        <TablaUsuariosDelCliente detalleCliente={detalleCliente} />
                    )}

                    {activeComponent === 'Contratos' && (
                        <TablaDeContratosDelCliente detalleCliente={detalleCliente} />
                    )}

                    {activeComponent === 'Licencias' && (
                        <TablaDeUsuariosVinculadosLicencias detalleCliente={detalleCliente} />
                    )}
                </div>
            </Container>
        </PageWrapper>
    );
};

export default DetalleCliente;
