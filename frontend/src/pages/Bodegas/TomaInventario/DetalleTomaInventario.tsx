import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, { SubheaderLeft, SubheaderRight } from '@/components/layouts/Subheader/Subheader';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import Tooltip from '@/components/ui/Tooltip';
import { detalleTomaInventarioThunk, useAppDispatch, useAppSelector } from '@/store';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import TablaEstadosEnTomaDeInventario from './components/TablaEstadosEnTomaDeInventario';
import TablaItemsEnTomaDeInventario from './components/TablaItemsEnTomaDeInventario';

function DetalleTomaInventario() {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { id } = useParams();
    const { detalleTomaInventario } = useAppSelector((state) => state.bodega);
    const [activeComponent, setActiveComponent] = useState<string>('Items');

    useEffect(() => {
        if (id) {
            dispatch(detalleTomaInventarioThunk({ id_toma: id }));
        }
    }, [id]);

    return (
        <PageWrapper
            isProtectedRoute={true}
            name='Detalle Toma de Inventario'
            title='Detalle Toma de Inventario'>
            <Subheader>
                <SubheaderLeft>{null}</SubheaderLeft>
                <SubheaderRight>
                    <Tooltip text='Inventariar'>
                        <Button
                            variant='solid'
                            color='sky'
                            icon='DuoIncomingBox'
                            onClick={() => {
                                navigate(`/bodega/inventariar-toma-inventario/${id}`);
                            }}></Button>
                    </Tooltip>
                </SubheaderRight>
            </Subheader>
            <Container className='h-full w-full'>
                <div className='flex flex-col gap-4'>
                    {detalleTomaInventario && (
                        <>
                            <Card>
                                <CardHeader>
                                    <CardHeaderChild>
                                        <Badge className='text-xl'>Datos</Badge>
                                    </CardHeaderChild>
                                </CardHeader>
                                <CardBody>
                                    <div className='grid grid-cols-4 gap-4'>
                                        <div>
                                            <Badge>Bodegas</Badge>
                                            <div className='ml-4'>
                                                {detalleTomaInventario.datos_bodegas.length > 0
                                                    ? detalleTomaInventario.datos_bodegas
                                                          .map((bode) => bode.nombre)
                                                          .join(', ')
                                                    : 'Sin Bodegas'}
                                            </div>
                                        </div>
                                        <div>
                                            <Badge>Creado Por</Badge>
                                            <div className='ml-4'>
                                                {detalleTomaInventario.nombre_creado_por}
                                            </div>
                                        </div>
                                        <div>
                                            <Badge>Fecha Inicio</Badge>
                                            <div className='ml-4'>
                                                {detalleTomaInventario.fecha_inicio
                                                    ? dayjs(detalleTomaInventario.fecha_inicio)
                                                          .locale('es')
                                                          .format('DD/MM/YYYY HH:mm:ss')
                                                    : 'Sin Fecha de Inicio'}
                                            </div>
                                        </div>
                                        <div>
                                            <Badge>Fecha de Termino</Badge>
                                            <div className='ml-4'>
                                                {detalleTomaInventario.fecha_termino
                                                    ? dayjs(detalleTomaInventario.fecha_termino)
                                                          .locale('es')
                                                          .format('DD/MM/YYYY HH:mm:ss')
                                                    : 'Sin Fecha de Termino'}
                                            </div>
                                        </div>
                                        <div className='col-span-full'>
                                            <Badge>Motivo</Badge>
                                            <div className='ml-4'>
                                                {detalleTomaInventario.motivo}
                                            </div>
                                        </div>
                                    </div>
                                </CardBody>
                            </Card>

                            <Card>
                                <CardBody>
                                    <div className='flex flex-row gap-4 overflow-auto'>
                                        <Button
                                            {...(activeComponent === 'Items'
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
                                                setActiveComponent('Items');
                                            }}>
                                            Items
                                        </Button>
                                        <Button
                                            {...(activeComponent === 'Estados'
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
                                                setActiveComponent('Estados');
                                            }}>
                                            Estados
                                        </Button>
                                    </div>
                                </CardBody>
                            </Card>

                            {activeComponent === 'Items' && <TablaItemsEnTomaDeInventario />}

                            {activeComponent === 'Estados' && <TablaEstadosEnTomaDeInventario />}
                        </>
                    )}
                </div>
            </Container>
        </PageWrapper>
    );
}

export default DetalleTomaInventario;
