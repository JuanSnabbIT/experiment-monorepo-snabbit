import { RouteProps } from 'react-router-dom';
import { authPages, Pages } from '../config/pages.config';
import DefaultHeaderTemplate from '../templates/layouts/Headers/DefaultHeader.template';

const headerRoutes: RouteProps[] = [
    { path: authPages.aceptarInvitacionEmpresa.to, element: null },
    { path: authPages.loginPage.to, element: null },
    { path: authPages.RecuperarPassword.to, element: null },
    { path: authPages.ConfirmarNuevaPass.to, element: null },
    { path: authPages.pdfContrato.to, element: null },
    { path: authPages.retroalimentacionOT.to, element: null },
    { path: authPages.retroalimentacionOTV3.to, element: null },
    { path: authPages.responderCotizacionPublica.to, element: null },
    { path: authPages.responderContratoPublico.to, element: null },
    { path: authPages.resumenContratoPublico.to, element: null },
    { path: authPages.aprobacionEmpleadorContrato.to, element: null },
    { path: '/404', element: null },

    // Inventariar Bodega
    { path: Pages.bodega.subPages.inventariarTomaInventario.to, element: null },

    // Agregar Item a la Compra DT
    { path: Pages.ordenTrabajo.subPages.agregarItemsACompraDT.to, element: null },

    // Vista Previa Adjunto
    { path: Pages.ordenTrabajo.subPages.vistaPreviaAdjunto.to, element: null },

    // Firma de Contrato
    { path: authPages.firmarContratoYAcuerdo.to, element: null },

    { path: '*', element: <DefaultHeaderTemplate /> },
];

export default headerRoutes;
