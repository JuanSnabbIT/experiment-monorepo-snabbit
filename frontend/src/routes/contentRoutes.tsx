import RetroalimentacionOT from '@/pages/OrdenTrabajo/components/RetroalimentacionOT';
import RetroalimentacionOTV3 from '@/pages/OrdenTrabajoV3/components/RetroalimentacionOTV3';
import { lazy } from 'react';
import { Navigate, RouteProps, useLocation } from 'react-router-dom';
import pagesConfig, { authPages, Pages } from '../config/pages.config';

export type IRoutePersonalizadas = RouteProps & {
    authority: string[];
};

const ContratoAprobacionEmpleador = lazy(
    () => import('@/pages/RRHH/ContratoAprobacionEmpleador'),
);

const ConfirmarNuevaPass = lazy(() => import('@/pages/ResetPassword/ConfirmarNuevaPass'));
const RecuperarPassword = lazy(() => import('@/pages/ResetPassword/RecuperarPassword'));
const LoginPage = lazy(() => import('@/pages/Login.page'));
const NotFoundPage = lazy(() => import('@/pages/NotFound.page'));
const SinPermisos = lazy(() => import('@/pages/SinPermisos'));
const ProfilePage = lazy(() => import('@/pages/Profile.page'));
const Home = lazy(() => import('@/pages/Dashboard/Home'));
const ListaInvitacionesEmpresa = lazy(
    () => import('@/pages/InvitacionEmpresa/ListaInvitacionesEmpresa'),
);
const AceptarInvitacionEmpresa = lazy(() => import('@/pages/AceptarInvitacionEmpresa'));
const ListaDiasCalendarioV2 = lazy(() => import('@/pages/Calendario/ListaDiasCalendarioV2'));
const PedirVacaciones = lazy(() => import('@/pages/Calendario/PedirVacaciones'));
const PedirVacacionesUsuario = lazy(() => import('@/pages/Calendario/PedirVacacionesUsuario'));
const ListaSolicitudesVacaciones = lazy(
    () => import('@/pages/Calendario/ListaSolicitudesVacaciones'),
);
const DetalleSolicitudVacaciones = lazy(
    () => import('@/pages/Calendario/DetalleSolicitudVacaciones'),
);
const ListaMisSolicitudesVacaciones = lazy(
    () => import('@/pages/Calendario/ListaSolicitudesVacacionesUsuario'),
);
const PDFSolicitudVacaciones = lazy(() => import('@/pages/Calendario/pdf/PDFSolicitudVacaciones'));
const DashboardVacaciones = lazy(() => import('@/pages/Calendario/DashboardVacaciones'));
const ListaUsuariosEmpresa = lazy(() => import('@/pages/Empresas/ListaUsuariosEmpresa'));
const DetalleUsuarioEmpresa = lazy(() => import('@/pages/Empresas/DetalleUsuarioEmpresa'));
const ListaProveedoresEmpresa = lazy(
    () => import('@/pages/Registros/Proveedor/ListaProveedoresEmpresa'),
);
const DetalleProveedorEmpresa = lazy(
    () => import('@/pages/Registros/Proveedor/DetalleProveedorEmpresa'),
);
const ListaItemsEmpresa = lazy(() => import('@/pages/Registros/Items/ListaItemsEmpresa'));
const DetalleItemEmpresa = lazy(() => import('@/pages/Registros/Items/DetalleItemEmpresa'));
const ListaLicencias = lazy(() => import('@/pages/Registros/Licencias/ListaLicencias'));
const DetalleLicenciaCatalogo = lazy(
    () => import('@/pages/Registros/Licencias/DetalleLicenciaCatalogo'),
);
const ListaBodegas = lazy(() => import('@/pages/Bodegas/ListaBodegas'));
const ListaOrdenesCompraV2 = lazy(() => import('@/pages/Bodegas/OrdenCompra/ListaOrdenesCompraV2'));
const DetalleOrdenCompraV2 = lazy(
    () => import('@/pages/Bodegas/OrdenCompra/components/DetalleOrdenCompraV2'),
);
const DetalleFabricante = lazy(() => import('@/pages/Registros/Fabricante/DetalleFabricante'));
const DetalleCategoria = lazy(() => import('@/pages/Registros/Categoria/DetalleCategoria'));
const CompletarOrdenDeCompraV2 = lazy(
    () => import('@/pages/Bodegas/OrdenCompra/components/CompletarOrdenDeCompraV2'),
);
const ListaEmpresas = lazy(() => import('@/pages/Empresas/ListaEmpresas'));
const DetalleEmpresa = lazy(() => import('@/pages/Empresas/DetalleEmpresa'));
const ListaCategorias = lazy(() => import('@/pages/Registros/Categoria/ListaCategorias'));
const ListaFabricantes = lazy(() => import('@/pages/Registros/Fabricante/ListaFabricantes'));
// const ListaClientes = lazy(() => import('@/pages/Clientes/ListaClientes'))
const DetalleCliente = lazy(() => import('@/pages/Clientes/DetalleCliente'));
const ListaGuiaSalidaBodega = lazy(
    () => import('@/pages/Bodegas/GuiaSalida/ListaGuiaSalidaBodega'),
);
const CrearItemsGuiaSalidaBodega = lazy(
    () => import('@/pages/Bodegas/GuiaSalida/CrearItemsGuiaSalidaBodega'),
);
const DetalleGuiaSalidaBodega = lazy(
    () => import('@/pages/Bodegas/GuiaSalida/DetalleGuiaSalidaBodega'),
);
const DevolucionParcialGuiaSalidaBodega = lazy(
    () => import('@/pages/Bodegas/GuiaSalida/DevolucionParcialGuiaSalidaBodega'),
);
const ListaEquiposEmpresa = lazy(() => import('@/pages/Recursos/Equipos/ListaEquiposEmpresa'));
const DetalleEquipoEmpresa = lazy(() => import('@/pages/Recursos/Equipos/DetalleEquipoEmpresa'));
const ListaMisOrdenesDeCompra = lazy(
    () => import('@/pages/Bodegas/OrdenCompra/ListaMisOrdenesdeCompra'),
);
const AgregarItemsOrdenCompra = lazy(
    () => import('@/pages/Bodegas/OrdenCompra/components/AgregarItemsOrdenCompra'),
);
const ListaUsuarios = lazy(() => import('@/pages/Registros/Usuarios/ListaUsuarios'));
const DetalleSucursal = lazy(() => import('@/pages/Empresas/DetalleSucursal'));
const ListaRendiciones = lazy(() => import('@/pages/Rendiciones/RendicionesAdmin'));
const DetalleRendicion = lazy(() => import('@/pages/Rendiciones/components/DetalleRendicion'));
const DetalleBodega = lazy(() => import('@/pages/Bodegas/components/DetalleBodega'));
const ListaMisRendiciones = lazy(() => import('@/pages/Rendiciones/ListaMisRendiciones'));
const FacturacionesComparativa = lazy(() => import('@/pages/Facturacion/FacturacionesComparativa'));
const DetalleFactura = lazy(() => import('@/pages/Facturacion/DetalleFactura'));
const DetalleFacturaContrato = lazy(() => import('@/pages/Facturacion/DetalleFacturaContrato'));
const MatchingManualOTV3 = lazy(() => import('@/pages/Facturacion/OTV3/MatchingManualOTV3'));
const ListaPrefacturasOTV3 = lazy(() => import('@/pages/Facturacion/OTV3/ListaPrefacturasOTV3'));
const DetallePrefacturaOTV3 = lazy(() => import('@/pages/Facturacion/OTV3/DetallePrefacturaOTV3'));
const ListaPrefacturasContrato = lazy(
    () => import('@/pages/Facturacion/ListaPrefacturasContrato'),
);
// const ListaRendicionesSucursales = lazy(() => import('@/pages/Rendiciones/ListaRendicionSucursal'))
// const ListaCotizaciones = lazy(() => import('@/pages/Cotizaciones/ListaCotizaciones'))
const DetalleCotizacion = lazy(() => import('@/pages/Cotizaciones/components/DetalleCotizacion'));
const CotizacionesEmpresa = lazy(() => import('@/pages/Cotizaciones/CotizacionesEmpresa'));
const ListaOT = lazy(() => import('@/pages/OrdenTrabajo/ListaOT'));
const DetalleOT = lazy(() => import('@/pages/OrdenTrabajo/DetalleOT'));
const ListaOTV3 = lazy(() => import('@/pages/OrdenTrabajoV3/ListaOTV3'));
const DetalleOTV3 = lazy(() => import('@/pages/OrdenTrabajoV3/DetalleOTV3'));
const ListaVisitas = lazy(() => import('@/pages/Visitas/ListaVisitas'));
const DetalleVisita = lazy(() => import('@/pages/Visitas/DetalleVisita'));
// const ListaEquiposDeMisClientes = lazy(() => import('@/pages/Recursos/Equipos/ListaEquiposDeMisClientes'))
const ListaSoftware = lazy(() => import('@/pages/Recursos/Software/ListaSoftware'));
// const DetalleContratoDelCliente = lazy(() => import('@/pages/Contratos/DetalleContratoDelCliente'))
const ListaContratos = lazy(() => import('@/pages/Contratos/ListaContratos'));
const DetalleContrato = lazy(() => import('@/pages/Contratos/DetalleContrato'));
const DetalleLicencia = lazy(() => import('@/pages/Contratos/DetalleLicencia'));
const VistaPreviaFirmaContrato = lazy(
    () => import('@/pages/Contratos/VistaPreviaFirmaContrato'),
);
const PlanesYServicios = lazy(
    () => import('@/pages/Registros/PlanesYServicios'),
);
const DetallePlanServicio = lazy(
    () => import('@/pages/Registros/PlanesYServicios/DetallePlanServicio'),
);

const RedirectCrearPrefacturaOTV3Legacy = () => {
    const { search } = useLocation();
    const target = `${Pages.facturacion.subPages.matchingManualOTV3.to}${search || ''}`;
    return <Navigate to={target} replace />;
};
const ListaPlantillasContrato = lazy(
    () => import('@/pages/Registros/PlantillasContrato/ListaPlantillas'),
);
const DetallePlantillaContrato = lazy(
    () => import('@/pages/Registros/PlantillasContrato/DetallePlantilla'),
);
const ListaPlantillasContratoV2 = lazy(
    () => import('@/pages/Registros/PlantillasContratoV2/ListaPlantillasV2'),
);
const EditorPlantillaContratoV2 = lazy(
    () => import('@/pages/Registros/PlantillasContratoV2/EditorPlantillaV2'),
);
const DetalleUsuarioCliente = lazy(() => import('@/pages/Clientes/DetalleUsuarioCliente'));
const PDFContrato = lazy(() => import('@/pages/Contratos/components/PDFContrato'));
const ListaCompras = lazy(() => import('@/pages/Bodegas/Compra/ListaCompra'));
const DetalleCompra = lazy(() => import('@/pages/Bodegas/Compra/DetalleCompra'));
const ListaOCsAgrupadas = lazy(
    () => import('@/pages/Bodegas/OrdenCompra/ListaOCsAgrupadas'),
);
const DetalleOCAgrupada = lazy(
    () => import('@/pages/Bodegas/OrdenCompra/DetalleOCAgrupada'),
);
const ListaTomaDeInventario = lazy(
    () => import('@/pages/Bodegas/TomaInventario/ListaTomaDeInventario'),
);
const DetalleTomaInventario = lazy(
    () => import('@/pages/Bodegas/TomaInventario/DetalleTomaInventario'),
);
const InventariarTomaInventario = lazy(
    () => import('@/pages/Bodegas/TomaInventario/components/InventariarTomaInventario'),
);
const AgregarItemsACompraDT = lazy(
    () => import('@/pages/OrdenTrabajo/components/AgregarItemsACompraDT'),
);
const VistaPreviaAdjunto = lazy(() => import('@/pages/OrdenTrabajo/components/VistaPreviaAdjunto'));
const FirmarContratoYAcuerdoConfidencialidad = lazy(
    () => import('@/pages/Contratos/components/FirmarContratoYAcuerdoConfidencialidad'),
);
const ResponderCotizacionPublica = lazy(
    () => import('@/pages/Cotizaciones/ResponderCotizacionPublica'),
);
const ResponderContratoPublicoV2 = lazy(
    () => import('@/pages/Contratos/components/ResponderContratoPublicoV2'),
);
const ResumenContratoPublico = lazy(
    () => import('@/pages/Contratos/ResumenContratoPublico'),
);
const DetalleContratoTrabajador = lazy(
    () => import('@/pages/RRHH/DetalleContratoTrabajador'),
);
const ListaContratosTrabajador = lazy(
    () => import('@/pages/RRHH/ListaContratosTrabajador'),
);
const DetalleRetroalimentacionOT = lazy(
    () => import('@/pages/OrdenTrabajo/components/DetalleRetroalimentacionOT'),
);

const contentRoutes: IRoutePersonalizadas[] = [
    {
        path: authPages.loginPage.to,
        element: <LoginPage />,
        authority: authPages.loginPage.autority,
    },
    {
        path: authPages.profilePage.to,
        element: <ProfilePage />,
        authority: authPages.profilePage.autority,
    },
    {
        path: authPages.aceptarInvitacionEmpresa.to,
        element: <AceptarInvitacionEmpresa />,
        authority: authPages.aceptarInvitacionEmpresa.authority,
    },
    {
        path: authPages.RecuperarPassword.to,
        element: <RecuperarPassword />,
        authority: authPages.RecuperarPassword.authority,
    },
    {
        path: authPages.ConfirmarNuevaPass.to,
        element: <ConfirmarNuevaPass />,
        authority: authPages.ConfirmarNuevaPass.authority,
    },
    {
        path: authPages.pdfContrato.to,
        element: <PDFContrato />,
        authority: authPages.pdfContrato.authority,
    },
    {
        path: authPages.responderContratoPublico.to,
        element: <ResponderContratoPublicoV2 />,
        authority: authPages.responderContratoPublico.authority,
    },
    {
        path: authPages.firmarContratoYAcuerdo.to,
        element: <FirmarContratoYAcuerdoConfidencialidad />,
        authority: authPages.firmarContratoYAcuerdo.authority,
    },
    {
        path: authPages.resumenContratoPublico.to,
        element: <ResumenContratoPublico />,
        authority: authPages.resumenContratoPublico.authority,
    },
    {
        path: authPages.responderCotizacionPublica.to,
        element: <ResponderCotizacionPublica />,
        authority: authPages.responderCotizacionPublica.authority,
    },

    {
        path: pagesConfig.listaInvitacionesEmpresas.to,
        element: <ListaInvitacionesEmpresa />,
        authority: pagesConfig.listaInvitacionesEmpresas.authority,
    },
    {
        path: pagesConfig.listaDiasCalendario.to,
        element: <ListaDiasCalendarioV2 />,
        authority: pagesConfig.listaDiasCalendario.authority,
    },
    {
        path: pagesConfig.empresa.subPages.previewFirmaContrato.to,
        element: <VistaPreviaFirmaContrato />,
        authority: pagesConfig.empresa.subPages.previewFirmaContrato.authority,
    },
    {
        path: Pages.compras.subPages.completarOrdenCompra.to,
        element: <CompletarOrdenDeCompraV2 />,
        authority: Pages.compras.subPages.completarOrdenCompra.authority,
    },
    {
        path: Pages.bodega.subPages.listaGuiaSalida.to,
        element: <ListaGuiaSalidaBodega />,
        authority: Pages.bodega.subPages.listaGuiaSalida.authority,
    },
    {
        path: Pages.recursos.subPages.listaEquiposEmpresa.to,
        element: <ListaEquiposEmpresa />,
        authority: Pages.recursos.subPages.listaEquiposEmpresa.authority,
    },
    {
        path: pagesConfig.detalleEquipoEmpresa.to,
        element: <DetalleEquipoEmpresa />,
        authority: pagesConfig.detalleEquipoEmpresa.authority,
    },
    {
        path: Pages.compras.subPages.agregarItemsOrdenCompra.to,
        element: <AgregarItemsOrdenCompra />,
        authority: Pages.compras.subPages.agregarItemsOrdenCompra.authority,
    },
    {
        path: pagesConfig.detalleSucursal.to,
        element: <DetalleSucursal />,
        authority: pagesConfig.detalleSucursal.authority,
    },
    // { path: Pages.recursos.subPages.listaEquiposDeMisClientes.to, element: <ListaEquiposDeMisClientes />, authority: Pages.recursos.subPages.listaEquiposDeMisClientes.authority },
    {
        path: Pages.recursos.subPages.listaSoftware.to,
        element: <ListaSoftware />,
        authority: Pages.recursos.subPages.listaSoftware.authority,
    },

    // bodega
    {
        path: Pages.bodega.subPages.listaBodegas.to,
        element: <ListaBodegas />,
        authority: Pages.bodega.subPages.listaBodegas.authority,
    },
    {
        path: Pages.bodega.subPages.detalleBodega.to,
        element: <DetalleBodega />,
        authority: Pages.bodega.subPages.detalleBodega.authority,
    },
    {
        path: Pages.bodega.subPages.detalleGuiaSalidaBodega.to,
        element: <DetalleGuiaSalidaBodega />,
        authority: Pages.bodega.subPages.detalleGuiaSalidaBodega.authority,
    },
    {
        path: Pages.bodega.subPages.devolucionParcialGuiaSalidaBodega.to,
        element: <DevolucionParcialGuiaSalidaBodega />,
        authority: Pages.bodega.subPages.devolucionParcialGuiaSalidaBodega.authority,
    },
    {
        path: Pages.bodega.subPages.crearItemsGuiaSalidaBodega.to,
        element: <CrearItemsGuiaSalidaBodega />,
        authority: Pages.bodega.subPages.crearItemsGuiaSalidaBodega.authority,
    },
    {
        path: Pages.bodega.subPages.listaTomaInventario.to,
        element: <ListaTomaDeInventario />,
        authority: Pages.bodega.subPages.listaTomaInventario.authority,
    },
    {
        path: Pages.bodega.subPages.detalleTomaInventario.to,
        element: <DetalleTomaInventario />,
        authority: Pages.bodega.subPages.detalleTomaInventario.authority,
    },
    {
        path: Pages.bodega.subPages.inventariarTomaInventario.to,
        element: <InventariarTomaInventario />,
        authority: Pages.bodega.subPages.inventariarTomaInventario.authority,
    },

    // registro
    {
        path: Pages.registros.subPages.listaUsuarios.to,
        element: <ListaUsuarios />,
        authority: Pages.registros.subPages.listaUsuarios.authority,
    },
    {
        path: Pages.registros.subPages.listaProveedoresEmpresa.to,
        element: <ListaProveedoresEmpresa />,
        authority: Pages.registros.subPages.listaProveedoresEmpresa.authority,
    },
    {
        path: Pages.registros.subPages.detalleProveedorEmpresa.to,
        element: <DetalleProveedorEmpresa />,
        authority: Pages.registros.subPages.detalleProveedorEmpresa.authority,
    },
    {
        path: Pages.registros.subPages.listaCategorias.to,
        element: <ListaCategorias />,
        authority: Pages.registros.subPages.listaCategorias.authority,
    },
    {
        path: Pages.registros.subPages.listaFabricantes.to,
        element: <ListaFabricantes />,
        authority: Pages.registros.subPages.listaFabricantes.authority,
    },
    {
        path: Pages.registros.subPages.listaItemsEmpresa.to,
        element: <ListaItemsEmpresa />,
        authority: Pages.registros.subPages.listaItemsEmpresa.authority,
    },
    {
        path: Pages.registros.subPages.listaLicencias.to,
        element: <ListaLicencias />,
        authority: Pages.registros.subPages.listaLicencias.authority,
    },
    {
        path: Pages.registros.subPages.detalleLicencia.to,
        element: <DetalleLicenciaCatalogo />,
        authority: Pages.registros.subPages.detalleLicencia.authority,
    },
    {
        path: Pages.registros.subPages.detalleFabricante.to,
        element: <DetalleFabricante />,
        authority: Pages.registros.subPages.detalleFabricante.authority,
    },
    {
        path: Pages.registros.subPages.detalleCategoria.to,
        element: <DetalleCategoria />,
        authority: Pages.registros.subPages.detalleCategoria.authority,
    },
    {
        path: Pages.registros.subPages.detalleItemEmpresa.to,
        element: <DetalleItemEmpresa />,
        authority: Pages.registros.subPages.detalleItemEmpresa.authority,
    },
    {
        path: Pages.registros.subPages.listaPlanesYServicios.to,
        element: <PlanesYServicios />,
        authority: Pages.registros.subPages.listaPlanesYServicios.authority,
    },
    {
        path: Pages.registros.subPages.detallePlanServicio.to,
        element: <DetallePlanServicio />,
        authority: Pages.registros.subPages.detallePlanServicio.authority,
    },
    {
        path: Pages.registros.subPages.listaPlantillasContrato.to,
        element: <ListaPlantillasContrato />,
        authority: Pages.registros.subPages.listaPlantillasContrato.authority,
    },
    {
        path: Pages.registros.subPages.detallePlantillaContrato.to,
        element: <DetallePlantillaContrato />,
        authority: Pages.registros.subPages.detallePlantillaContrato.authority,
    },
    {
        path: Pages.registros.subPages.listaPlantillasContratoV2.to,
        element: <ListaPlantillasContratoV2 />,
        authority: Pages.registros.subPages.listaPlantillasContratoV2.authority,
    },
    {
        path: Pages.registros.subPages.editorPlantillaContratoV2.to,
        element: <EditorPlantillaContratoV2 />,
        authority: Pages.registros.subPages.editorPlantillaContratoV2.authority,
    },

    // empresas
    {
        path: Pages.empresa.subPages.listaUsuariosEmpresa.to,
        element: <ListaUsuariosEmpresa />,
        authority: Pages.empresa.subPages.listaUsuariosEmpresa.authority,
    },
    {
        path: Pages.empresa.subPages.detalleUsuarioEmpresa.to,
        element: <DetalleUsuarioEmpresa />,
        authority: Pages.empresa.subPages.detalleUsuarioEmpresa.authority,
    },
    {
        path: Pages.empresa.subPages.detalleCliente.to,
        element: <DetalleCliente />,
        authority: Pages.empresa.subPages.detalleCliente.authority,
    },
    // { path: Pages.empresa.subPages.listaClientes.to, element: <ListaClientes />, authority: Pages.empresa.subPages.listaClientes.authority },
    {
        path: Pages.empresa.subPages.listaEmpresas.to,
        element: <ListaEmpresas />,
        authority: Pages.empresa.subPages.listaEmpresas.authority,
    },
    {
        path: Pages.empresa.subPages.detalleEmpresa.to,
        element: <DetalleEmpresa />,
        authority: Pages.empresa.subPages.detalleEmpresa.authority,
    },

    // vacaciones
    {
        path: Pages.vacaciones.subPages.pedirVacaciones.to,
        element: <PedirVacaciones />,
        authority: Pages.vacaciones.subPages.pedirVacaciones.authority,
    },
    {
        path: Pages.vacaciones.subPages.pedirVacacionesUsuario.to,
        element: <PedirVacacionesUsuario />,
        authority: Pages.vacaciones.subPages.pedirVacacionesUsuario.authority,
    },
    {
        path: Pages.vacaciones.subPages.listaSolicitudesVacaciones.to,
        element: <ListaSolicitudesVacaciones />,
        authority: Pages.vacaciones.subPages.listaSolicitudesVacaciones.authority,
    },
    {
        path: Pages.vacaciones.subPages.dashboardVacaciones.to,
        element: <DashboardVacaciones />,
        authority: Pages.vacaciones.subPages.dashboardVacaciones.authority,
    },
    {
        path: Pages.vacaciones.subPages.detalleSolicitudVacaciones.to,
        element: <DetalleSolicitudVacaciones />,
        authority: Pages.vacaciones.subPages.detalleSolicitudVacaciones.authority,
    },
    {
        path: Pages.vacaciones.subPages.listaMisSolicitudesVacaciones.to,
        element: <ListaMisSolicitudesVacaciones />,
        authority: Pages.vacaciones.subPages.listaMisSolicitudesVacaciones.authority,
    },
    {
        path: Pages.vacaciones.subPages.pdfSolicitudVacaciones.to,
        element: <PDFSolicitudVacaciones />,
        authority: Pages.vacaciones.subPages.pdfSolicitudVacaciones.authority,
    },

    // ordenes de compras
    {
        path: Pages.compras.subPages.listaOrdenesCompra.to,
        element: <ListaOrdenesCompraV2 />,
        authority: Pages.compras.subPages.listaOrdenesCompra.authority,
    },
    {
        path: Pages.compras.subPages.detalleOrdenCompra.to,
        element: <DetalleOrdenCompraV2 />,
        authority: Pages.compras.subPages.detalleOrdenCompra.authority,
    },
    {
        path: Pages.compras.subPages.listaMisOrdenesDeCompra.to,
        element: <ListaMisOrdenesDeCompra />,
        authority: Pages.compras.subPages.listaMisOrdenesDeCompra.authority,
    },

    // Rendiciones
    {
        path: Pages.rendiciones.subPages.listaRendiciones.to,
        element: <ListaRendiciones />,
        authority: Pages.rendiciones.subPages.listaRendiciones.authority,
    },
    {
        path: Pages.rendiciones.subPages.detalleRendicion.to,
        element: <DetalleRendicion />,
        authority: Pages.rendiciones.subPages.detalleRendicion.authority,
    },
    {
        path: Pages.rendiciones.subPages.listaMisRendiciones.to,
        element: <ListaMisRendiciones />,
        authority: Pages.rendiciones.subPages.listaMisRendiciones.authority,
    },
    {
        path: Pages.facturacion.subPages.listaFacturas.to,
        element: <Navigate to={Pages.facturacion.subPages.facturasContrato.to} replace />,
        authority: Pages.facturacion.subPages.listaFacturas.authority,
    },
    {
        path: Pages.facturacion.subPages.crearFactura.to,
        element: <FacturacionesComparativa />,
        authority: Pages.facturacion.subPages.crearFactura.authority,
    },
    {
        path: Pages.facturacion.subPages.detalleFactura.to,
        element: <DetalleFactura />,
        authority: Pages.facturacion.subPages.detalleFactura.authority,
    },
    {
        path: Pages.facturacion.subPages.facturasContrato.to,
        element: <ListaPrefacturasContrato />,
        authority: Pages.facturacion.subPages.facturasContrato.authority,
    },
    {
        path: Pages.facturacion.subPages.detalleFacturaContrato.to,
        element: <DetalleFacturaContrato />,
        authority: Pages.facturacion.subPages.detalleFacturaContrato.authority,
    },
    {
        path: Pages.facturacion.subPages.prefacturasOTV3.to,
        element: <ListaPrefacturasOTV3 />,
        authority: Pages.facturacion.subPages.prefacturasOTV3.authority,
    },
    {
        path: Pages.facturacion.subPages.crearPrefacturaOTV3.to,
        element: <RedirectCrearPrefacturaOTV3Legacy />,
        authority: Pages.facturacion.subPages.crearPrefacturaOTV3.authority,
    },
    {
        path: Pages.facturacion.subPages.matchingManualOTV3.to,
        element: <MatchingManualOTV3 />,
        authority: Pages.facturacion.subPages.matchingManualOTV3.authority,
    },
    {
        path: Pages.facturacion.subPages.detallePrefacturaOTV3.to,
        element: <DetallePrefacturaOTV3 />,
        authority: Pages.facturacion.subPages.detallePrefacturaOTV3.authority,
    },
    // { path: Pages.empresa.subPages.listaRendicionesSucursal.to, element: <ListaRendicionesSucursales />, authority: Pages.empresa.subPages.listaRendicionesSucursal.authority },

    // Cotizaciones
    // { path: Pages.cotizacion.subPages.listaCotizaciones.to, element: <ListaCotizaciones />, authority: Pages.cotizacion.subPages.listaCotizaciones.authority },
    {
        path: Pages.cotizacion.subPages.detalleCotizacion.to,
        element: <DetalleCotizacion />,
        authority: Pages.cotizacion.subPages.detalleCotizacion.authority,
    },
    {
        path: Pages.cotizacion.subPages.listaCotizacionesEmpresa.to,
        element: <CotizacionesEmpresa />,
        authority: Pages.cotizacion.subPages.listaCotizacionesEmpresa.authority,
    },

    // Orden Trabajo
    {
        path: Pages.ordenTrabajo.subPages.listaOrdenesTrabajo.to,
        element: <ListaOT />,
        authority: Pages.ordenTrabajo.subPages.listaOrdenesTrabajo.authority,
    },
    {
        path: Pages.ordenTrabajo.subPages.detalleOrdenTrabajo.to,
        element: <DetalleOT />,
        authority: Pages.ordenTrabajo.subPages.detalleOrdenTrabajo.authority,
    },
    {
        path: Pages.ordenTrabajo.subPages.agregarItemsACompraDT.to,
        element: <AgregarItemsACompraDT />,
        authority: Pages.ordenTrabajo.subPages.agregarItemsACompraDT.authority,
    },
    {
        path: Pages.ordenTrabajo.subPages.vistaPreviaAdjunto.to,
        element: <VistaPreviaAdjunto />,
        authority: Pages.ordenTrabajo.subPages.vistaPreviaAdjunto.authority,
    },
    {
        path: authPages.retroalimentacionOT.to,
        element: <RetroalimentacionOT />,
        authority: authPages.retroalimentacionOT.authority,
    },
    {
        path: authPages.retroalimentacionOTV3.to,
        element: <RetroalimentacionOTV3 />,
        authority: authPages.retroalimentacionOTV3.authority,
    },
    {
        path: Pages.ordenTrabajo.subPages.detalleRetroalimentacionOT.to,
        element: <DetalleRetroalimentacionOT />,
        authority: Pages.ordenTrabajo.subPages.detalleRetroalimentacionOT.authority,
    },

    // Orden Trabajo V3
    {
        path: Pages.ordenTrabajoV3.subPages.listaOrdenesTrabajoV3.to,
        element: <ListaOTV3 />,
        authority: Pages.ordenTrabajoV3.subPages.listaOrdenesTrabajoV3.authority,
    },
    {
        path: Pages.ordenTrabajoV3.subPages.detalleOrdenTrabajoV3.to,
        element: <DetalleOTV3 />,
        authority: Pages.ordenTrabajoV3.subPages.detalleOrdenTrabajoV3.authority,
    },

    // Visitas
    {
        path: Pages.ordenTrabajo.subPages.listaVisitasSoporte.to,
        element: <ListaVisitas />,
        authority: Pages.ordenTrabajo.subPages.listaVisitasSoporte.authority,
    },
    {
        path: Pages.ordenTrabajo.subPages.detalleVisitaSoporte.to,
        element: <DetalleVisita />,
        authority: Pages.ordenTrabajo.subPages.detalleVisitaSoporte.authority,
    },

    // Contratos
    // {path: Pages.detalleContratoDelCliente.to, element: <DetalleContratoDelCliente />, authority: Pages.detalleContratoDelCliente.authority},
    {
        path: Pages.empresa.subPages.listaContratos.to,
        element: <ListaContratos />,
        authority: Pages.empresa.subPages.listaContratos.authority,
    },
    {
        path: Pages.empresa.subPages.detalleContrato.to,
        element: <DetalleContrato />,
        authority: Pages.empresa.subPages.detalleContrato.authority,
    },
    {
        path: Pages.rrhh.subPages.listaContratosTrabajador.to,
        element: <ListaContratosTrabajador />,
        authority: Pages.rrhh.subPages.listaContratosTrabajador.authority,
    },
    {
        path: Pages.rrhh.subPages.detalleContratoTrabajador.to,
        element: <DetalleContratoTrabajador />,
        authority: Pages.rrhh.subPages.detalleContratoTrabajador.authority,
    },
    {
        path: Pages.empresa.subPages.detalleLicencia.to,
        element: <DetalleLicencia />,
        authority: Pages.empresa.subPages.detalleLicencia.authority,
    },
    {
        path: Pages.empresa.subPages.detalleUsuarioCliente.to,
        element: <DetalleUsuarioCliente />,
        authority: Pages.empresa.subPages.detalleUsuarioCliente.authority,
    },
    {
        path: authPages.firmarContratoYAcuerdo.to,
        element: <FirmarContratoYAcuerdoConfidencialidad />,
        authority: authPages.firmarContratoYAcuerdo.authority,
    },

    // Compras
    {
        path: Pages.compras.subPages.listaCompra.to,
        element: <ListaCompras />,
        authority: Pages.compras.subPages.listaCompra.authority,
    },
    {
        path: Pages.compras.subPages.detalleCompra.to,
        element: <DetalleCompra />,
        authority: Pages.compras.subPages.detalleCompra.authority,
    },
    {
        path: Pages.compras.subPages.listaOCsAgrupadas.to,
        element: <ListaOCsAgrupadas />,
        authority: Pages.compras.subPages.listaOCsAgrupadas.authority,
    },
    {
        path: Pages.compras.subPages.detalleOCAgrupada.to,
        element: <DetalleOCAgrupada />,
        authority: Pages.compras.subPages.detalleOCAgrupada.authority,
    },

    { path: '/', element: <Home />, authority: [] },
    { path: '/sin-permisos', element: <SinPermisos />, authority: [] },
    { path: '/404', element: <NotFoundPage />, authority: [] },

    {
        path: authPages.aprobacionEmpleadorContrato.to,
        element: <ContratoAprobacionEmpleador />,
        authority: authPages.aprobacionEmpleadorContrato.authority,
    },
];

export default contentRoutes;
