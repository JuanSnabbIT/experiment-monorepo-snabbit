import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, { SubheaderLeft } from '@/components/layouts/Subheader/Subheader';
import Button, { IButtonProps } from '@/components/ui/Button';
import Card, { CardBody } from '@/components/ui/Card';
import Dropdown, { DropdownItem, DropdownMenu, DropdownToggle } from '@/components/ui/Dropdown';
import { useAppDispatch, useAppSelector } from '@/store';
import {
    detalleEquipoEmpresaThunk,
    listaUsuariosDelEquipoThunk,
} from '@/store/slices/recursos/recursosSlice';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import AlmacenamientosEnDetalleEquipo from './components/AlmacenamientosEnDetalleEquipo';
import DatosEquipoEnDetalleEquipo from './components/DatosEquipoEnDetalleEquipo';
import FotosDelEquipoEnDetalleEquipo from './components/FotosDelEquipoEnDetalleEquipo';
import MonitoresEnDetalleEquipo from './components/MonitoresEnDetalleEquipo';
import SoftwaresEnDetalleEquipo from './components/SoftwaresEnDetalleEquipo';
import UsuariosEquipoEnDetalleEquipo from './components/UsuariosEquipoEnDetalleEquipo';

function DetalleEquipoEmpresa() {
    const dispatch = useAppDispatch();
    const { id } = useParams();
    const { detalleEquipoEmpresa, listaUsuariosDelEquipo } = useAppSelector(
        (state) => state.recursos,
    );
    const [activeComponent, setActiveComponent] = useState<string>('Almacenamiento');
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

    useEffect(() => {
        if (id) {
            dispatch(detalleEquipoEmpresaThunk({ id_equipo: id }));
            dispatch(listaUsuariosDelEquipoThunk({ id_equipo: id }));
        }
    }, [id]);

    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth <= 768;
            setIsMobile(mobile);
        };

        window.addEventListener('resize', handleResize);
        handleResize();
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const defaultProps: IButtonProps = {
        size: 'sm',
        color: 'zinc',
        rounded: 'rounded-full',
        className: 'border',
    };

    const activeProps: IButtonProps = {
        ...defaultProps,
        isActive: true,
        color: 'blue',
        colorIntensity: '500',
        variant: 'solid',
    };

    return (
        <PageWrapper isProtectedRoute={true} name='Detalle Equipo' title='Detalle Equipo'>
            <Subheader>
                <SubheaderLeft>{null}</SubheaderLeft>
            </Subheader>
            <Container className='h-full w-full'>
                {detalleEquipoEmpresa && (
                    <div className='flex flex-col gap-4'>
                        {/* Datos del Equipo */}
                        <DatosEquipoEnDetalleEquipo />

                        {/* TABS */}
                        <div>
                            <Card>
                                <CardBody className='flex flex-row justify-between gap-4'>
                                    {isMobile ? (
                                        <div className='flex w-full flex-row justify-end'>
                                            <Dropdown>
                                                <DropdownToggle hasIcon={false}>
                                                    <Button
                                                        icon='HeroServer'
                                                        aria-label='Seleccionar Sección'>
                                                        {activeComponent}
                                                    </Button>
                                                </DropdownToggle>
                                                <DropdownMenu
                                                    placement='bottom-start'
                                                    className='z-50 block'>
                                                    <DropdownItem
                                                        isActive={
                                                            activeComponent === 'Almacenamiento'
                                                        }
                                                        onClick={() =>
                                                            setActiveComponent('Almacenamiento')
                                                        }>
                                                        Almacenamiento
                                                    </DropdownItem>
                                                    <DropdownItem
                                                        isActive={activeComponent === 'Softwares'}
                                                        onClick={() =>
                                                            setActiveComponent('Softwares')
                                                        }>
                                                        Softwares
                                                    </DropdownItem>
                                                    <DropdownItem
                                                        isActive={activeComponent === 'Monitores'}
                                                        onClick={() =>
                                                            setActiveComponent('Monitores')
                                                        }>
                                                        Monitores
                                                    </DropdownItem>
                                                    <DropdownItem
                                                        isActive={activeComponent === 'Usuarios'}
                                                        onClick={() =>
                                                            setActiveComponent('Usuarios')
                                                        }>
                                                        Usuarios
                                                    </DropdownItem>
                                                    <DropdownItem
                                                        isActive={activeComponent === 'Fotos'}
                                                        onClick={() => setActiveComponent('Fotos')}>
                                                        Fotos
                                                    </DropdownItem>
                                                </DropdownMenu>
                                            </Dropdown>
                                        </div>
                                    ) : (
                                        <div className='flex flex-row gap-4'>
                                            <Button
                                                {...(activeComponent === 'Almacenamiento'
                                                    ? { ...activeProps }
                                                    : { ...defaultProps })}
                                                onClick={() => {
                                                    setActiveComponent('Almacenamiento');
                                                }}>
                                                Almacenamiento
                                            </Button>
                                            <Button
                                                {...(activeComponent === 'Softwares'
                                                    ? { ...activeProps }
                                                    : { ...defaultProps })}
                                                onClick={() => {
                                                    setActiveComponent('Softwares');
                                                }}>
                                                Softwares
                                            </Button>
                                            <Button
                                                {...(activeComponent === 'Monitores'
                                                    ? { ...activeProps }
                                                    : { ...defaultProps })}
                                                onClick={() => {
                                                    setActiveComponent('Monitores');
                                                }}>
                                                Monitores
                                            </Button>
                                            <Button
                                                {...(activeComponent === 'Usuarios'
                                                    ? { ...activeProps }
                                                    : { ...defaultProps })}
                                                onClick={() => {
                                                    setActiveComponent('Usuarios');
                                                }}>
                                                Usuarios
                                            </Button>
                                            <Button
                                                {...(activeComponent === 'Fotos'
                                                    ? { ...activeProps }
                                                    : { ...defaultProps })}
                                                onClick={() => {
                                                    setActiveComponent('Fotos');
                                                }}>
                                                Fotos
                                            </Button>
                                        </div>
                                    )}
                                </CardBody>
                            </Card>
                        </div>

                        {detalleEquipoEmpresa && (
                            <div>
                                {activeComponent === 'Almacenamiento' && (
                                    <AlmacenamientosEnDetalleEquipo />
                                )}
                                {activeComponent === 'Softwares' && <SoftwaresEnDetalleEquipo />}
                                {activeComponent === 'Monitores' && <MonitoresEnDetalleEquipo />}
                                {activeComponent === 'Usuarios' && (
                                    <UsuariosEquipoEnDetalleEquipo />
                                )}
                                {activeComponent === 'Fotos' && <FotosDelEquipoEnDetalleEquipo />}
                            </div>
                        )}

                        {/* <Card>
                            <CardHeader>
                                <CardHeaderChild>
                                    <Badge>Fotos</Badge>
                                </CardHeaderChild>
                                <CardHeaderChild>
                                    <Button>Añadir Fotos</Button>
                                </CardHeaderChild>
                            </CardHeader>
                            <CardBody>
                                <></>
                            </CardBody>
                        </Card> */}
                    </div>
                )}
            </Container>
        </PageWrapper>
    );
}

export default DetalleEquipoEmpresa;

// {isEditingAsignados ? (
//     <Card className="w-full">
//         <CardHeader>
//             <CardHeaderChild>
//                 <Badge>Usuarios del Equipo</Badge>
//             </CardHeaderChild>
//         </CardHeader>
//     </Card>
// ) : (
//     <Card className="w-full">
//         <CardHeader>
//             <CardHeaderChild>
//                 <Badge className="text-xl">Usuarios del Equipo</Badge>
//             </CardHeaderChild>
//         </CardHeader>
//         <CardBody>
//             <div className="w-full">
//                 {listaUsuariosDelEquipo && listaUsuariosDelEquipo.length > 0 ? (
//                     <Swiper
//                         slidesPerView={1}
//                         spaceBetween={10}
//                         direction="horizontal"
//                         modules={[Scrollbar]}
//                         loop={false}
//                         className="swiper-container"
//                     >
//                         {[...listaUsuariosDelEquipo]
//                             .sort((a, b) => new Date(a.fecha_asignacion).getTime() - new Date(b.fecha_asignacion).getTime())
//                             .map((user, index) => (
//                                 <SwiperSlide key={index}>
//                                     <div
//                                         className="p-4 rounded-lg flex flex-col items-start space-y-2"
//                                         style={{
//                                             backgroundColor: index % 2 === 0 ? '#007bff' : '#ff6347',
//                                             height: '200px',
//                                             border: '1px solid #e5e7eb',
//                                         }}>
//                                         <div className="text-lg font-semibold text-gray-700 dark:text-gray-300">{user.nombre_usuario}</div>
//                                         <div className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-300"><strong>Tipo de Equipo:</strong> {user.datos_equipo.tipo_equipo_label}</div>
//                                         <div className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-300"><strong>Marca:</strong> {user.datos_equipo.marca_label}</div>
//                                         <div className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-300"><strong>Tipo de Procesador:</strong> {user.datos_equipo.tipo_procesador_label}</div>
//                                         <div className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-300"><strong>Fecha de Asignación:</strong> {dayjs(user.fecha_asignacion).format('DD/MM/YYYY')}</div>
//                                         <div className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-300"><strong>Fecha de Devolución:</strong> {user.fecha_devolucion ? dayjs(user.fecha_devolucion).format('DD/MM/YYYY') : 'N/A'}</div>
//                                         <div className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-300"><strong>Observaciones:</strong> {user.observaciones}</div>
//                                     </div>
//                                 </SwiperSlide>
//                             ))}
//                     </Swiper>
//                 ) : (
//                     <div className="text-center text-gray-500 dark:text-gray-400 dark:text-gray-300">No hay usuarios asignados</div>
//                 )}
//             </div>
//             {/* {detalleEquipoEmpresa.asignado_a && typeof(detalleEquipoEmpresa.datos_asignado_a) != "string" ? (
//                 <>
//                     <div className="w-full p-2">
//                         <Badge>Nombre</Badge>
//                         <div className="ml-4">{detalleEquipoEmpresa.datos_asignado_a.nombre}</div>
//                     </div>
//                     <div className="w-full p-2">
//                         <Badge>Rut</Badge>
//                         <div className="ml-4">{detalleEquipoEmpresa.datos_asignado_a.rut || "Sin Rut"}</div>
//                     </div>
//                     <div className="w-full p-2">
//                         <Badge>Cargo</Badge>
//                         <div className="ml-4">{detalleEquipoEmpresa.datos_asignado_a.cargo || "Sin Cargo"}</div>
//                     </div>
//                     <div className="w-full p-2">
//                         <Badge>Estado</Badge>
//                         <div className="ml-4">{detalleEquipoEmpresa.datos_asignado_a.estado}</div>
//                     </div>
//                 </>
//             ) : (
//                 <div className="w-full p-2">
//                     <Badge>Sin Asignar</Badge>
//                 </div>
//             )} */}
//         </CardBody>
//     </Card>
// )}
