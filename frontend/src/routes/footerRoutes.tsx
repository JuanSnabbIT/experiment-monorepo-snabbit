import { RouteProps } from 'react-router-dom';
import { authPages, Pages } from '../config/pages.config';
import DefaultFooterTemplate from '../templates/layouts/Footers/DefaultFooter.template';

const footerRoutes: RouteProps[] = [
    { path: authPages.loginPage.to, element: null },
    { path: authPages.aceptarInvitacionEmpresa.to, element: null },
    { path: authPages.RecuperarPassword.to, element: null },
    { path: authPages.ConfirmarNuevaPass.to, element: null },
    { path: authPages.pdfContrato.to, element: null },
    { path: authPages.retroalimentacionOT.to, element: null },
    { path: authPages.retroalimentacionOTV3.to, element: null },
    { path: authPages.responderCotizacionPublica.to, element: null },
    { path: authPages.responderContratoPublico.to, element: null },

    // Inventariar Bodega
    { path: Pages.bodega.subPages.inventariarTomaInventario.to, element: null },

    // Agregar Item a la Compra DT
    { path: Pages.ordenTrabajo.subPages.agregarItemsACompraDT.to, element: null },

    // Vista Previa Adjunto
    { path: Pages.ordenTrabajo.subPages.vistaPreviaAdjunto.to, element: null },

    // Firma de Contrato
    { path: authPages.firmarContratoYAcuerdo.to, element: null },

    { path: '/404', element: null },
    { path: '*', element: <DefaultFooterTemplate /> },
];

export default footerRoutes;
