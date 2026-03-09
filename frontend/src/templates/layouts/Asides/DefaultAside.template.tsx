import { useEffect } from 'react';
import Aside, { AsideBody } from '../../../components/layouts/Aside/Aside';
import Nav, {
    NavButton,
    NavCollapse,
    NavItem,
    NavSeparator,
    NavTitle,
    NavUser,
} from '../../../components/layouts/Navigation/Nav';
import AsideHeadPart from './_parts/AsideHead.part';
import AsideFooterPart from './_parts/AsideFooter.part';
import { Pages } from '@/config/pages.config';
import { listaBodegasThunk, useAppDispatch, useAppSelector } from '@/store';
import { detalleEmpresaThunk, listaMisClientesThunk } from '@/store/slices/empresa/empresaSlice';
import AuthorityCheckNav from '@/components/layouts/AuthorityCheckNav/AuthorityCheckNav';
import CrearClienteEnMenu from '@/pages/Clientes/modals/CrearClienteEnMenu';

const DefaultAsideTemplate = () => {
    const dispatch = useAppDispatch();
    const { listaGrupos, isAuthenticated } = useAppSelector((state) => state.auth);
    const { listaMisClientes } = useAppSelector((state) => state.empresa);
    const { listaBodegas } = useAppSelector((state) => state.bodega);
    const { personalizacionUsuario } = useAppSelector((state) => state.auth);


    useEffect(() => {
        if (personalizacionUsuario && personalizacionUsuario.sucursal_principal) {
            dispatch(
                detalleEmpresaThunk({ id_empresa: personalizacionUsuario.sucursal_principal }),
            );
            dispatch(listaBodegasThunk());
        }
        if (personalizacionUsuario && personalizacionUsuario.empresa) {
            dispatch(listaMisClientesThunk({ id_empresa: personalizacionUsuario.empresa }));
        }
    }, [dispatch, personalizacionUsuario?.sucursal_principal]);

    // NO renderizar el menú si el usuario no está autenticado
    if (!isAuthenticated) {
        return null;
    }

    return (
        <Aside>
            <AsideHeadPart />
            <AsideBody>
                <Nav>
                    {/* NAVCOLLAPSE EMPRESA */}
                    <AuthorityCheckNav
                        authority={Pages.empresa.authority}
                        userAuthority={listaGrupos?.grupos}>
                        <NavCollapse
                            text={Pages.empresa.text}
                            icon={Pages.empresa.icon}
                            to={Pages.empresa.to}>
                            <AuthorityCheckNav
                                authority={Pages.empresa.subPages.listaEmpresas.authority}
                                userAuthority={listaGrupos?.grupos}>
                                <NavItem
                                    text={Pages.empresa.subPages.listaEmpresas.text}
                                    to={Pages.empresa.subPages.listaEmpresas.to}
                                    icon={Pages.empresa.subPages.listaEmpresas.icon}
                                    id={Pages.empresa.subPages.listaEmpresas.id}></NavItem>
                            </AuthorityCheckNav>
                            <AuthorityCheckNav
                                authority={Pages.empresa.subPages.listaUsuariosEmpresa.authority}
                                userAuthority={listaGrupos?.grupos}>
                                <NavItem
                                    text={Pages.empresa.subPages.listaUsuariosEmpresa.text}
                                    to={Pages.empresa.subPages.listaUsuariosEmpresa.to}
                                    icon={Pages.empresa.subPages.listaUsuariosEmpresa.icon}
                                    id={Pages.empresa.subPages.listaUsuariosEmpresa.id}></NavItem>
                            </AuthorityCheckNav>

                            <AuthorityCheckNav
                                authority={Pages.empresa.subPages.detalleCliente.authority}
                                userAuthority={listaGrupos?.grupos}>
                                <NavCollapse
                                    text={Pages.empresa.subPages.detalleCliente.text}
                                    icon={Pages.empresa.subPages.detalleCliente.icon}
                                    to='/empresa/clientes'>
                                    <CrearClienteEnMenu />
                                    {listaMisClientes.length > 0 ? (
                                        listaMisClientes.map((cli, index) => (
                                            <NavItem
                                                text={cli.info_cliente.nombre}
                                                to={`/empresa/detalle-cliente/${cli.id}`}
                                                icon={Pages.empresa.subPages.detalleCliente.icon}
                                                id={index.toString()}
                                                key={index}></NavItem>
                                        ))
                                    ) : (
                                        <NavItem text='Sin Clientes' icon='HeroXMark'></NavItem>
                                    )}
                                </NavCollapse>
                            </AuthorityCheckNav>


                        </NavCollapse>
                    </AuthorityCheckNav>

                    <NavSeparator />
                    <NavTitle>Gestión Operativa</NavTitle>

                    {/* Registros */}
                    <AuthorityCheckNav
                        authority={Pages.registros.authority}
                        userAuthority={listaGrupos?.grupos}>
                        <NavCollapse
                            text={Pages.registros.text}
                            icon={Pages.registros.icon}
                            to={Pages.registros.to}>
                            <AuthorityCheckNav
                                authority={Pages.registros.subPages.listaCategorias.authority}
                                userAuthority={listaGrupos?.grupos}>
                                <NavItem
                                    text={Pages.registros.subPages.listaCategorias.text}
                                    to={Pages.registros.subPages.listaCategorias.to}
                                    icon={Pages.registros.subPages.listaCategorias.icon}
                                    id={Pages.registros.subPages.listaCategorias.id}></NavItem>
                            </AuthorityCheckNav>
                            <AuthorityCheckNav
                                authority={Pages.registros.subPages.listaFabricantes.authority}
                                userAuthority={listaGrupos?.grupos}>
                                <NavItem
                                    text={Pages.registros.subPages.listaFabricantes.text}
                                    to={Pages.registros.subPages.listaFabricantes.to}
                                    icon={Pages.registros.subPages.listaFabricantes.icon}
                                    id={Pages.registros.subPages.listaFabricantes.id}></NavItem>
                            </AuthorityCheckNav>
                            <AuthorityCheckNav
                                authority={
                                    Pages.registros.subPages.listaProveedoresEmpresa.authority
                                }
                                userAuthority={listaGrupos?.grupos}>
                                <NavItem
                                    text={Pages.registros.subPages.listaProveedoresEmpresa.text}
                                    to={Pages.registros.subPages.listaProveedoresEmpresa.to}
                                    icon={Pages.registros.subPages.listaProveedoresEmpresa.icon}
                                    id={
                                        Pages.registros.subPages.listaProveedoresEmpresa.id
                                    }></NavItem>
                            </AuthorityCheckNav>
                            <AuthorityCheckNav
                                authority={Pages.registros.subPages.listaItemsEmpresa.authority}
                                userAuthority={listaGrupos?.grupos}>
                                <NavItem
                                    text={Pages.registros.subPages.listaItemsEmpresa.text}
                                    to={Pages.registros.subPages.listaItemsEmpresa.to}
                                    icon={Pages.registros.subPages.listaItemsEmpresa.icon}
                                    id={Pages.registros.subPages.listaItemsEmpresa.id}></NavItem>
                            </AuthorityCheckNav>
                            <AuthorityCheckNav
                                authority={Pages.registros.subPages.listaUsuarios.authority}
                                userAuthority={listaGrupos?.grupos}>
                                <NavItem
                                    text={Pages.registros.subPages.listaUsuarios.text}
                                    to={Pages.registros.subPages.listaUsuarios.to}
                                    icon={Pages.registros.subPages.listaUsuarios.icon}
                                    id={Pages.registros.subPages.listaUsuarios.id}></NavItem>
                            </AuthorityCheckNav>
                        </NavCollapse>
                    </AuthorityCheckNav>

                    {/* Recursos */}
                    <AuthorityCheckNav
                        authority={Pages.recursos.authority}
                        userAuthority={listaGrupos?.grupos}>
                        <NavCollapse
                            text={Pages.recursos.text}
                            icon={Pages.recursos.icon}
                            to={Pages.recursos.to}>
                            <AuthorityCheckNav
                                authority={Pages.recursos.subPages.listaEquiposEmpresa.authority}
                                userAuthority={listaGrupos?.grupos}>
                                <NavItem
                                    text={Pages.recursos.subPages.listaEquiposEmpresa.text}
                                    to={Pages.recursos.subPages.listaEquiposEmpresa.to}
                                    icon={Pages.recursos.subPages.listaEquiposEmpresa.icon}
                                    id={Pages.recursos.subPages.listaEquiposEmpresa.id}></NavItem>
                            </AuthorityCheckNav>
                            <AuthorityCheckNav
                                authority={Pages.recursos.subPages.listaSoftware.authority}
                                userAuthority={listaGrupos?.grupos}>
                                <NavItem
                                    text={Pages.recursos.subPages.listaSoftware.text}
                                    to={Pages.recursos.subPages.listaSoftware.to}
                                    icon={Pages.recursos.subPages.listaSoftware.icon}
                                    id={Pages.recursos.subPages.listaSoftware.id}></NavItem>
                            </AuthorityCheckNav>
                        </NavCollapse>
                    </AuthorityCheckNav>

                    {/* Bodegas */}
                    <AuthorityCheckNav
                        authority={Pages.bodega.authority}
                        userAuthority={listaGrupos?.grupos}>
                        <NavCollapse
                            text={Pages.bodega.text}
                            icon={Pages.bodega.icon}
                            to={Pages.bodega.to}>
                            <AuthorityCheckNav
                                authority={Pages.bodega.subPages.listaBodegas.authority}
                                userAuthority={listaGrupos?.grupos}>
                                <NavItem
                                    text={Pages.bodega.subPages.listaBodegas.text}
                                    to={Pages.bodega.subPages.listaBodegas.to}
                                    icon={Pages.bodega.subPages.listaBodegas.icon}
                                    id={Pages.bodega.subPages.listaBodegas.id}></NavItem>
                            </AuthorityCheckNav>
                            <AuthorityCheckNav
                                authority={Pages.bodega.subPages.listaGuiaSalida.authority}
                                userAuthority={listaGrupos?.grupos}>
                                <NavItem
                                    text={Pages.bodega.subPages.listaGuiaSalida.text}
                                    to={Pages.bodega.subPages.listaGuiaSalida.to}
                                    icon={Pages.bodega.subPages.listaGuiaSalida.icon}
                                    id={Pages.bodega.subPages.listaGuiaSalida.id}></NavItem>
                            </AuthorityCheckNav>
                            <AuthorityCheckNav
                                authority={Pages.bodega.subPages.listaTomaInventario.authority}
                                userAuthority={listaGrupos?.grupos}>
                                <NavItem
                                    text={Pages.bodega.subPages.listaTomaInventario.text}
                                    to={Pages.bodega.subPages.listaTomaInventario.to}
                                    icon={Pages.bodega.subPages.listaTomaInventario.icon}
                                    id={Pages.bodega.subPages.listaTomaInventario.id}></NavItem>
                            </AuthorityCheckNav>
                            {listaBodegas.length > 0 && (
                                <NavCollapse text='Bodegas' icon='HeroDocument' to='/bodega/detalle-bodega'>
                                    {listaBodegas.map((bodega, index) => (
                                        <NavItem
                                            key={index}
                                            text={bodega.nombre}
                                            icon='HeroDocument'
                                            to={`/bodega/detalle-bodega/${bodega.id}`}
                                            id={bodega.id.toString()}></NavItem>
                                    ))}
                                </NavCollapse>
                            )}
                        </NavCollapse>
                    </AuthorityCheckNav>

                    <NavSeparator />
                    <NavTitle>Ventas & Compras</NavTitle>

                    {/* Cotizaciones */}
                    <AuthorityCheckNav
                        authority={Pages.cotizacion.authority}
                        userAuthority={listaGrupos?.grupos}>
                        <NavCollapse
                            text={Pages.cotizacion.text}
                            icon={Pages.cotizacion.icon}
                            to={Pages.cotizacion.to}>
                            <AuthorityCheckNav
                                authority={
                                    Pages.cotizacion.subPages.listaCotizacionesEmpresa.authority
                                }
                                userAuthority={listaGrupos?.grupos}>
                                <NavItem
                                    text={Pages.cotizacion.subPages.listaCotizacionesEmpresa.text}
                                    to={Pages.cotizacion.subPages.listaCotizacionesEmpresa.to}
                                    icon={Pages.cotizacion.subPages.listaCotizacionesEmpresa.icon}
                                    id={
                                        Pages.cotizacion.subPages.listaCotizacionesEmpresa.id
                                    }></NavItem>
                            </AuthorityCheckNav>
                        </NavCollapse>
                    </AuthorityCheckNav>

                    {/* Compras */}
                    <AuthorityCheckNav
                        authority={Pages.compras.authority}
                        userAuthority={listaGrupos?.grupos}>
                        <NavCollapse
                            text={Pages.compras.text}
                            icon={Pages.compras.icon}
                            to={Pages.compras.to}>
                            <AuthorityCheckNav
                                authority={Pages.compras.subPages.listaOrdenesCompra.authority}
                                userAuthority={listaGrupos?.grupos}>
                                <NavItem
                                    text={Pages.compras.subPages.listaOrdenesCompra.text}
                                    to={Pages.compras.subPages.listaOrdenesCompra.to}
                                    icon={Pages.compras.subPages.listaOrdenesCompra.icon}
                                    id={Pages.compras.subPages.listaOrdenesCompra.id}></NavItem>
                            </AuthorityCheckNav>
                            <AuthorityCheckNav
                                authority={Pages.compras.subPages.listaMisOrdenesDeCompra.authority}
                                userAuthority={listaGrupos?.grupos}>
                                <NavItem
                                    text={Pages.compras.subPages.listaMisOrdenesDeCompra.text}
                                    to={Pages.compras.subPages.listaMisOrdenesDeCompra.to}
                                    icon={Pages.compras.subPages.listaMisOrdenesDeCompra.icon}
                                    id={
                                        Pages.compras.subPages.listaMisOrdenesDeCompra.id
                                    }></NavItem>
                            </AuthorityCheckNav>
                            <AuthorityCheckNav
                                authority={Pages.compras.subPages.listaCompra.authority}
                                userAuthority={listaGrupos?.grupos}>
                                <NavItem
                                    text={Pages.compras.subPages.listaCompra.text}
                                    to={Pages.compras.subPages.listaCompra.to}
                                    icon={Pages.compras.subPages.listaCompra.icon}
                                    id={Pages.compras.subPages.listaCompra.id}></NavItem>
                            </AuthorityCheckNav>
                        </NavCollapse>
                    </AuthorityCheckNav>

                    {/* Asesorías */}
                    <AuthorityCheckNav
                        authority={Pages.ordenTrabajo.authority}
                        userAuthority={listaGrupos?.grupos}>
                        <NavCollapse
                            text={Pages.ordenTrabajo.text}
                            icon={Pages.ordenTrabajo.icon}
                            to={Pages.ordenTrabajo.to}>
                            <AuthorityCheckNav
                                authority={
                                    Pages.ordenTrabajo.subPages.listaOrdenesTrabajo.authority
                                }
                                userAuthority={listaGrupos?.grupos}>
                                <NavItem
                                    text={Pages.ordenTrabajo.subPages.listaOrdenesTrabajo.text}
                                    to={Pages.ordenTrabajo.subPages.listaOrdenesTrabajo.to}
                                    icon={Pages.ordenTrabajo.subPages.listaOrdenesTrabajo.icon}
                                    id={
                                        Pages.ordenTrabajo.subPages.listaOrdenesTrabajo.id
                                    }></NavItem>
                            </AuthorityCheckNav>
                            <AuthorityCheckNav
                                authority={
                                    Pages.ordenTrabajo.subPages.listaVisitasSoporte.authority
                                }
                                userAuthority={listaGrupos?.grupos}>
                                <NavItem
                                    text={Pages.ordenTrabajo.subPages.listaVisitasSoporte.text}
                                    to={Pages.ordenTrabajo.subPages.listaVisitasSoporte.to}
                                    icon={Pages.ordenTrabajo.subPages.listaVisitasSoporte.icon}
                                    id={
                                        Pages.ordenTrabajo.subPages.listaVisitasSoporte.id
                                    }></NavItem>
                            </AuthorityCheckNav>
                        </NavCollapse>
                    </AuthorityCheckNav>

                    <NavSeparator />
                    <NavTitle>Gestión Financiera</NavTitle>

                    {/* Rendiciones */}
                    <AuthorityCheckNav
                        authority={Pages.rendiciones.authority}
                        userAuthority={listaGrupos?.grupos}>
                        <NavCollapse
                            text={Pages.rendiciones.text}
                            icon={Pages.rendiciones.icon}
                            to={Pages.rendiciones.to}>
                            <AuthorityCheckNav
                                authority={Pages.rendiciones.subPages.listaRendiciones.authority}
                                userAuthority={listaGrupos?.grupos}>
                                <NavItem
                                    text={Pages.rendiciones.subPages.listaRendiciones.text}
                                    to={Pages.rendiciones.subPages.listaRendiciones.to}
                                    icon={Pages.rendiciones.subPages.listaRendiciones.icon}
                                    id={Pages.rendiciones.subPages.listaRendiciones.id}></NavItem>
                            </AuthorityCheckNav>
                            <AuthorityCheckNav
                                authority={Pages.rendiciones.subPages.listaMisRendiciones.authority}
                                userAuthority={listaGrupos?.grupos}>
                                <NavItem
                                    text={Pages.rendiciones.subPages.listaMisRendiciones.text}
                                    to={Pages.rendiciones.subPages.listaMisRendiciones.to}
                                    icon={Pages.rendiciones.subPages.listaMisRendiciones.icon}
                                    id={
                                        Pages.rendiciones.subPages.listaMisRendiciones.id
                                    }></NavItem>
                            </AuthorityCheckNav>
                        </NavCollapse>
                    </AuthorityCheckNav>

                    {/* Facturaciones */}
                    <AuthorityCheckNav
                        authority={Pages.facturacion.authority}
                        userAuthority={listaGrupos?.grupos}>
                        <NavCollapse
                            text={Pages.facturacion.text}
                            icon={Pages.facturacion.icon}
                            to={Pages.facturacion.to}>
                            <AuthorityCheckNav
                                authority={Pages.facturacion.subPages.listaFacturas.authority}
                                userAuthority={listaGrupos?.grupos}>
                                <NavItem
                                    text={Pages.facturacion.subPages.listaFacturas.text}
                                    to={Pages.facturacion.subPages.listaFacturas.to}
                                    icon={Pages.facturacion.subPages.listaFacturas.icon}
                                    id={Pages.facturacion.subPages.listaFacturas.id}></NavItem>
                            </AuthorityCheckNav>
                            <AuthorityCheckNav
                                authority={Pages.facturacion.subPages.facturasContrato.authority}
                                userAuthority={listaGrupos?.grupos}>
                                <NavItem
                                    text={Pages.facturacion.subPages.facturasContrato.text}
                                    to={Pages.facturacion.subPages.facturasContrato.to}
                                    icon={Pages.facturacion.subPages.facturasContrato.icon}
                                    id={Pages.facturacion.subPages.facturasContrato.id}></NavItem>
                            </AuthorityCheckNav>
                        </NavCollapse>
                    </AuthorityCheckNav>

                    <NavSeparator />
                    <NavTitle>Recursos Humanos</NavTitle>

                    {/* Vacaciones */}
                    <AuthorityCheckNav
                        authority={Pages.vacaciones.authority}
                        userAuthority={listaGrupos?.grupos}>
                        <NavCollapse
                            text={Pages.vacaciones.text}
                            icon={Pages.vacaciones.icon}
                            to={Pages.vacaciones.to}>
                            <AuthorityCheckNav
                                authority={
                                    Pages.vacaciones.subPages.listaMisSolicitudesVacaciones
                                        .authority
                                }
                                userAuthority={listaGrupos?.grupos}>
                                <NavItem
                                    text={
                                        Pages.vacaciones.subPages.listaMisSolicitudesVacaciones.text
                                    }
                                    to={Pages.vacaciones.subPages.listaMisSolicitudesVacaciones.to}
                                    icon={
                                        Pages.vacaciones.subPages.listaMisSolicitudesVacaciones.icon
                                    }
                                    id={
                                        Pages.vacaciones.subPages.listaMisSolicitudesVacaciones.id
                                    }></NavItem>
                            </AuthorityCheckNav>
                            <AuthorityCheckNav
                                authority={Pages.vacaciones.subPages.pedirVacaciones.authority}
                                userAuthority={listaGrupos?.grupos}>
                                <NavItem
                                    text={Pages.vacaciones.subPages.pedirVacaciones.text}
                                    to={Pages.vacaciones.subPages.pedirVacaciones.to}
                                    icon={Pages.vacaciones.subPages.pedirVacaciones.icon}
                                    id={Pages.vacaciones.subPages.pedirVacaciones.id}></NavItem>
                            </AuthorityCheckNav>
                            <AuthorityCheckNav
                                authority={
                                    Pages.vacaciones.subPages.pedirVacacionesUsuario.authority
                                }
                                userAuthority={listaGrupos?.grupos}>
                                <NavItem
                                    text={Pages.vacaciones.subPages.pedirVacacionesUsuario.text}
                                    to={Pages.vacaciones.subPages.pedirVacacionesUsuario.to}
                                    icon={Pages.vacaciones.subPages.pedirVacacionesUsuario.icon}
                                    id={
                                        Pages.vacaciones.subPages.pedirVacacionesUsuario.id
                                    }></NavItem>
                            </AuthorityCheckNav>
                            <AuthorityCheckNav
                                authority={
                                    Pages.vacaciones.subPages.listaSolicitudesVacaciones.authority
                                }
                                userAuthority={listaGrupos?.grupos}>
                                <NavItem
                                    text={Pages.vacaciones.subPages.listaSolicitudesVacaciones.text}
                                    to={Pages.vacaciones.subPages.listaSolicitudesVacaciones.to}
                                    icon={Pages.vacaciones.subPages.listaSolicitudesVacaciones.icon}
                                    id={
                                        Pages.vacaciones.subPages.listaSolicitudesVacaciones.id
                                    }></NavItem>
                            </AuthorityCheckNav>
                            <AuthorityCheckNav
                                authority={Pages.vacaciones.subPages.dashboardVacaciones.authority}
                                userAuthority={listaGrupos?.grupos}>
                                <NavItem
                                    text={Pages.vacaciones.subPages.dashboardVacaciones.text}
                                    to={Pages.vacaciones.subPages.dashboardVacaciones.to}
                                    icon={Pages.vacaciones.subPages.dashboardVacaciones.icon}
                                    id={Pages.vacaciones.subPages.dashboardVacaciones.id}></NavItem>
                            </AuthorityCheckNav>
                        </NavCollapse>
                    </AuthorityCheckNav>

                    {/* <NavCollapse  text={"Empresas"} icon={'HeroDocument'} to={'/empresas'}>
						{listaEmpresas.map(empresa => (
							<NavItem text={empresa.nombre} to={`/empresas/${empresa.id}`} icon={"HeroDocument"} id={empresa.id.toString()}></NavItem>
						))}
					</NavCollapse> */}
                    {/* <NavItem text={Pages.listaMisOrdenesDeCompra.text} to={Pages.listaMisOrdenesDeCompra.to} icon={Pages.listaMisOrdenesDeCompra.icon} id={Pages.listaMisOrdenesDeCompra.id}></NavItem> */}
                    {/* <NavItem {...appPages.salesAppPages.subPages.salesDashboardPage} />
					<NavItem {...appPages.aiAppPages.subPages.aiDashboardPage}>
						<Badge
							variant='outline'
							color='amber'
							className='border-transparent leading-none'>
							NEW
						</Badge>
					</NavItem>
					<NavItem {...appPages.crmAppPages.subPages.crmDashboardPage}>
						<NavButton
							title='New Customer'
							icon='HeroPlusCircle'
							onClick={() => {
								navigate(`../${appPages.crmAppPages.subPages.customerPage.to}/new`);
							}}
						/>
					</NavItem>
					<NavItem {...appPages.projectAppPages.subPages.projectDashboardPage}>
						<Badge
							variant='outline'
							color='emerald'
							className='border-transparent leading-none'>
							6
						</Badge>
					</NavItem>

					<NavTitle>Apps</NavTitle>
					<NavCollapse
						text={appPages.salesAppPages.text}
						to={appPages.salesAppPages.to}
						icon={appPages.salesAppPages.icon}>
						<NavItem {...appPages.salesAppPages.subPages.salesDashboardPage} />
						<NavCollapse
							text={appPages.salesAppPages.subPages.productPage.text}
							to={appPages.salesAppPages.subPages.productPage.to}
							icon={appPages.salesAppPages.subPages.productPage.icon}>
							<NavItem
								{...appPages.salesAppPages.subPages.productPage.subPages.listPage}
							/>
							<NavItem
								{...appPages.salesAppPages.subPages.productPage.subPages.editPage}
							/>
						</NavCollapse>
						<NavCollapse
							text={appPages.salesAppPages.subPages.categoryPage.text}
							to={appPages.salesAppPages.subPages.categoryPage.to}
							icon={appPages.salesAppPages.subPages.categoryPage.icon}>
							<NavItem
								{...appPages.salesAppPages.subPages.categoryPage.subPages.listPage}
							/>
							<NavItem
								{...appPages.salesAppPages.subPages.categoryPage.subPages.editPage}
							/>
						</NavCollapse>
					</NavCollapse>

					<NavCollapse
						text={appPages.aiAppPages.text}
						to={appPages.aiAppPages.to}
						icon={appPages.aiAppPages.icon}>
						<NavItem {...appPages.aiAppPages.subPages.aiDashboardPage} />
						<NavCollapse
							text={appPages.aiAppPages.subPages.chatPages.text}
							to={appPages.aiAppPages.subPages.chatPages.to}
							icon={appPages.aiAppPages.subPages.chatPages.icon}>
							<NavItem {...appPages.aiAppPages.subPages.chatPages.subPages.photoPage}>
								<Badge
									variant='outline'
									color='amber'
									className='border-transparent leading-none'>
									22
								</Badge>
							</NavItem>
							<NavItem {...appPages.aiAppPages.subPages.chatPages.subPages.videoPage}>
								<Badge
									variant='outline'
									color='violet'
									className='!border-transparent leading-none'>
									8
								</Badge>
							</NavItem>
							<NavItem {...appPages.aiAppPages.subPages.chatPages.subPages.audioPage}>
								<Badge
									variant='outline'
									color='blue'
									className='!border-transparent leading-none'>
									13
								</Badge>
							</NavItem>
							<NavItem {...appPages.aiAppPages.subPages.chatPages.subPages.codePage}>
								<Badge
									variant='outline'
									color='emerald'
									className='!border-transparent leading-none'>
									3
								</Badge>
							</NavItem>
						</NavCollapse>
					</NavCollapse>

					<NavCollapse
						text={appPages.crmAppPages.text}
						to={appPages.crmAppPages.to}
						icon={appPages.crmAppPages.icon}>
						<NavItem {...appPages.crmAppPages.subPages.crmDashboardPage} />
						<NavCollapse
							text={appPages.crmAppPages.subPages.customerPage.text}
							to={appPages.crmAppPages.subPages.customerPage.to}
							icon={appPages.crmAppPages.subPages.customerPage.icon}>
							<NavItem
								{...appPages.crmAppPages.subPages.customerPage.subPages.listPage}
							/>
							<NavItem
								{...appPages.crmAppPages.subPages.customerPage.subPages.editPage}
							/>
						</NavCollapse>
						<NavCollapse
							text={appPages.crmAppPages.subPages.rolePage.text}
							to={appPages.crmAppPages.subPages.rolePage.to}
							icon={appPages.crmAppPages.subPages.rolePage.icon}>
							<NavItem
								{...appPages.crmAppPages.subPages.rolePage.subPages.listPage}
							/>
							<NavItem
								{...appPages.crmAppPages.subPages.rolePage.subPages.editPage}
							/>
						</NavCollapse>
					</NavCollapse>
					<NavCollapse
						text={appPages.projectAppPages.text}
						to={appPages.projectAppPages.to}
						icon={appPages.projectAppPages.icon}>
						<NavItem {...appPages.projectAppPages.subPages.projectDashboardPage}>
							<NavButton
								title='New Project'
								icon='HeroPlusCircle'
								onClick={() => {
									navigate(
										`../${appPages.projectAppPages.subPages.projectBoardPageLink.to}/new`,
									);
								}}
							/>
						</NavItem>
						<NavItem {...appPages.projectAppPages.subPages.projectBoardPage}>
							<Badge
								variant='outline'
								color='emerald'
								className='border-transparent leading-none'>
								6
							</Badge>
						</NavItem>
					</NavCollapse>
					<NavItem
						text={appPages.mailAppPages.text}
						to={appPages.mailAppPages.subPages.inboxPages.to}
						icon={appPages.mailAppPages.icon}>
						<Badge
							variant='outline'
							color='emerald'
							className='border-transparent leading-none'>
							3
						</Badge>
						<NavButton
							icon='HeroPlusCircle'
							title='New Mail'
							onClick={() => {
								navigate(`../${appPages.mailAppPages.subPages.newMailPages.to}`);
							}}
						/>
					</NavItem>
					<NavItem
						text={appPages.educationAppPages.text}
						to={appPages.educationAppPages.to}
						icon={appPages.educationAppPages.icon}>
						<Badge variant='outline' className='border-transparent leading-none'>
							Soon
						</Badge>
					</NavItem>
					<NavItem
						text={appPages.reservationAppPages.text}
						to={appPages.reservationAppPages.to}
						icon={appPages.reservationAppPages.icon}>
						<Badge variant='outline' className='border-transparent leading-none'>
							Soon
						</Badge>
					</NavItem>

					<NavSeparator />

					<NavTitle>Components & Templates</NavTitle>
					<NavCollapse
						text={componentsPages.uiPages.text}
						to={componentsPages.uiPages.to}
						icon={componentsPages.uiPages.icon}>
						<NavItem {...componentsPages.uiPages.subPages.alertPage} />
						<NavItem {...componentsPages.uiPages.subPages.badgePage} />
						<NavItem {...componentsPages.uiPages.subPages.buttonPage} />
						<NavItem {...componentsPages.uiPages.subPages.buttonGroupPage} />
						<NavItem {...componentsPages.uiPages.subPages.cardPage} />
						<NavItem {...componentsPages.uiPages.subPages.collapsePage} />
						<NavItem {...componentsPages.uiPages.subPages.dropdownPage} />
						<NavItem {...componentsPages.uiPages.subPages.modalPage} />
						<NavItem {...componentsPages.uiPages.subPages.offcanvasPage} />
						<NavItem {...componentsPages.uiPages.subPages.progressPage} />
						<NavItem {...componentsPages.uiPages.subPages.tablePage}>
							<NavButton
								title='Open Npm page'
								icon='CustomNpm'
								onClick={() => {
									window.open(
										'https://www.npmjs.com/package/@tanstack/react-table',
										'_blank',
									);
								}}
							/>
						</NavItem>
						<NavItem {...componentsPages.uiPages.subPages.tooltipPage} />
					</NavCollapse>
					<NavCollapse
						text={componentsPages.formPages.text}
						to={componentsPages.formPages.to}
						icon={componentsPages.formPages.icon}>
						<NavItem {...componentsPages.formPages.subPages.fieldWrapPage} />
						<NavItem {...componentsPages.formPages.subPages.checkboxPage} />
						<NavItem {...componentsPages.formPages.subPages.checkboxGroupPage} />
						<NavItem {...componentsPages.formPages.subPages.inputPage} />
						<NavItem {...componentsPages.formPages.subPages.labelPage} />
						<NavItem {...componentsPages.formPages.subPages.radioPage} />
						<NavItem {...componentsPages.formPages.subPages.richTextPage}>
							<NavButton
								title='Open Npm page'
								icon='CustomNpm'
								onClick={() => {
									window.open(
										'https://www.npmjs.com/package/slate-react',
										'_blank',
									);
								}}
							/>
						</NavItem>
						<NavItem {...componentsPages.formPages.subPages.selectPage} />
						<NavItem {...componentsPages.formPages.subPages.selectReactPage}>
							<NavButton
								title='Open Npm page'
								icon='CustomNpm'
								onClick={() => {
									window.open(
										'https://www.npmjs.com/package/react-select',
										'_blank',
									);
								}}
							/>
						</NavItem>
						<NavItem {...componentsPages.formPages.subPages.textareaPage} />
						<NavItem {...componentsPages.formPages.subPages.validationPage}>
							<Badge variant='outline'>Formik</Badge>
						</NavItem>
					</NavCollapse>
					<NavCollapse
						text={componentsPages.integratedPages.text}
						to={componentsPages.integratedPages.to}
						icon={componentsPages.integratedPages.icon}>
						<NavItem {...componentsPages.integratedPages.subPages.reactDateRangePage} />
						<NavItem {...componentsPages.integratedPages.subPages.fullCalendarPage} />
						<NavItem {...componentsPages.integratedPages.subPages.apexChartsPage} />
						<NavItem
							{...componentsPages.integratedPages.subPages.reactSimpleMapsPage}
						/>
						<NavItem {...componentsPages.integratedPages.subPages.waveSurferPage} />
						<NavItem {...componentsPages.formPages.subPages.richTextPage} />
						<NavItem {...componentsPages.formPages.subPages.selectReactPage} />
					</NavCollapse>

					<NavCollapse
						text={componentsPages.iconsPage.text}
						to={componentsPages.iconsPage.to}
						icon={componentsPages.iconsPage.icon}>
						<NavItem {...componentsPages.iconsPage} />
						<NavItem {...componentsPages.iconsPage.subPages.heroiconsPage}>
							<Badge
								variant='outline'
								color='violet'
								className='!border-transparent leading-none'>
								292
							</Badge>
						</NavItem>
						<NavItem {...componentsPages.iconsPage.subPages.duotoneIconsPage}>
							<Badge
								variant='outline'
								color='violet'
								className='!border-transparent leading-none'>
								640
							</Badge>
						</NavItem>
					</NavCollapse>

					<NavSeparator />
					<NavTitle>Members</NavTitle>
					<NavUser
						text={`${usersDb[0].firstName} ${usersDb[0].lastName}`}
						image={usersDb[0].image?.thumb}
						to={`${appPages.chatAppPages.to}/${usersDb[0].username}`}
					/>
					<NavUser
						text={`${usersDb[1].firstName} ${usersDb[1].lastName}`}
						image={usersDb[1].image?.thumb}
						to={`${appPages.chatAppPages.to}/${usersDb[1].username}`}>
						<NavButton
							title='New Message'
							icon='HeroChatBubbleLeftEllipsis'
							iconColor='emerald'
							onClick={() => {}}
						/>
					</NavUser>
					<NavUser
						text={`${usersDb[2].firstName} ${usersDb[2].lastName}`}
						image={usersDb[2].image?.thumb}
						to={`${appPages.chatAppPages.to}/${usersDb[2].username}`}
					/>
					<NavUser
						text={`${usersDb[3].firstName} ${usersDb[3].lastName}`}
						image={usersDb[3].image?.thumb}
						to={`${appPages.chatAppPages.to}/${usersDb[3].username}`}>
						<NavButton
							title='New Message'
							icon='HeroChatBubbleLeftEllipsis'
							iconColor='emerald'
							onClick={() => {}}
						/>
					</NavUser>
					<NavUser
						text={`${usersDb[4].firstName} ${usersDb[4].lastName}`}
						image={usersDb[4].image?.thumb}
						to={`${appPages.chatAppPages.to}/${usersDb[4].username}`}>
						<NavButton
							title='New Message'
							icon='HeroChatBubbleLeftEllipsis'
							iconColor='emerald'
							onClick={() => {}}
						/>
					</NavUser> */}
                </Nav>
            </AsideBody>
            <AsideFooterPart />
        </Aside>
    );
};

export default DefaultAsideTemplate;
