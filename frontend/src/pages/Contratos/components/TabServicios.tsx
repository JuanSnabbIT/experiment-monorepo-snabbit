import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import 'swiper/css';
import 'swiper/css/pagination';
import { Navigation, Pagination } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';
import AgregarServiciosyPlanesContrato from '../modals/AgregarServiciosyPlanesContrato';
import { ITabServiciosProps } from './contrato.types';

const TabServicios = ({ detalleContratoEmpresaCliente, listaContentType }: ITabServiciosProps) => {
    if (
        detalleContratoEmpresaCliente.tipo !== 'servicios' &&
        detalleContratoEmpresaCliente.tipo !== 'licencia'
    ) {
        return null;
    }

    return (
        <Card>
            <CardHeader className='border border-x-0 border-t-0 border-b-black'>
                <CardHeaderChild>
                    <div className='text-xl font-bold text-blue-500'>
                        Servicios y Planes Contratados
                    </div>
                </CardHeaderChild>
                <CardHeaderChild>
                    <AgregarServiciosyPlanesContrato contrato={detalleContratoEmpresaCliente} />
                </CardHeaderChild>
            </CardHeader>
            <CardBody className='py-4'>
                <Swiper
                    modules={[Navigation, Pagination]}
                    slidesPerView='auto'
                    navigation
                    pagination={{ dynamicBullets: true }}
                    className='!max-w-none'>
                    {detalleContratoEmpresaCliente.contrato_servicios.length > 0 ? (
                        detalleContratoEmpresaCliente.contrato_servicios.map((contServ, index) => (
                            <SwiperSlide key={index} className='!w-full !shrink-0 pr-4 md:!w-1/2'>
                                {listaContentType.some(
                                    (ct) =>
                                        ct.model === 'servicio' &&
                                        ct.id === contServ.content_type,
                                ) ? (
                                    <div className='h-auto rounded-xl border border-blue-500'>
                                        <div className='flex flex-col gap-2 p-4'>
                                            <div className='font-bold text-blue-500'>
                                                Servicio: {contServ.nombre}
                                            </div>
                                            <div className='font-bold'>
                                                Categoría:{' '}
                                                <span className='font-normal'>
                                                    {'categoria_label' in contServ.servicio_generico &&
                                                        contServ.servicio_generico.categoria_label}
                                                </span>
                                            </div>
                                            <div className='font-bold'>
                                                Cantidad:{' '}
                                                <span className='font-normal'>
                                                    {contServ.cantidad}
                                                </span>
                                            </div>
                                            <div className='font-bold'>
                                                Precio Unitario:{' '}
                                                <span className='font-normal'>
                                                    ${Number(contServ.precio_unitario).toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                        <div className='flex items-center justify-between border border-b-0 border-l-0 border-r-0 border-t-black p-4'>
                                            <div>ID Servicio: {contServ.id}</div>
                                            <Button variant='outline'>Detalles</Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className='h-auto rounded-xl border border-emerald-500'>
                                        <div className='flex flex-col gap-2 p-4'>
                                            <div className='font-bold text-emerald-500'>
                                                Plan: {contServ.nombre}
                                            </div>
                                            <div className='font-bold'>
                                                Servicios Incluidos:{' '}
                                                <span className='font-normal'>
                                                    {'servicios' in contServ.servicio_generico &&
                                                    contServ.servicio_generico.servicios.length > 0
                                                        ? contServ.servicio_generico.servicios.map(
                                                              (ser, i, array) =>
                                                                  i + 1 === array.length
                                                                      ? ser.nombre
                                                                      : `${ser.nombre}, `,
                                                          )
                                                        : 'Sin Servicios'}
                                                </span>
                                            </div>
                                            <div className='font-bold'>
                                                Cantidad:{' '}
                                                <span className='font-normal'>
                                                    {contServ.cantidad}
                                                </span>
                                            </div>
                                            <div className='font-bold'>
                                                Precio Unitario:{' '}
                                                <span className='font-normal'>
                                                    ${Number(contServ.precio_unitario).toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                        <div className='flex items-center justify-between border border-b-0 border-l-0 border-r-0 border-t-black p-4'>
                                            <div>ID Plan: {contServ.id}</div>
                                            <Button variant='outline'>Detalles</Button>
                                        </div>
                                    </div>
                                )}
                            </SwiperSlide>
                        ))
                    ) : (
                        <SwiperSlide>Sin Servicios</SwiperSlide>
                    )}
                </Swiper>
            </CardBody>
        </Card>
    );
};

export default TabServicios;
