import { matchPath } from 'react-router-dom';

export interface IHelpGuideEntry {
    viewId: string;
    ruta: string;
    guiaPath: string;
    titulo: string;
}

export const HELP_GUIDES: IHelpGuideEntry[] = [
    {
        viewId: 'plantillas-contrato-lista',
        ruta: '/registros/plantillas-contrato',
        guiaPath: '/guias/plantillas-contrato-lista.md',
        titulo: 'Plantillas de Contrato',
    },
    {
        viewId: 'plantillas-contrato-editor-v29',
        ruta: '/registros/plantillas-contrato/:plantillaId',
        guiaPath: '/guias/plantillas-contrato-editor-v29.md',
        titulo: 'Editor de Plantillas de Contrato',
    },
    {
        viewId: 'rrhh-contrato-trabajador-detalle',
        ruta: '/rrhh/contratos/:contratoId',
        guiaPath: '/guias/rrhh-contrato-trabajador-detalle.md',
        titulo: 'Contrato de Trabajador',
    },
    {
        viewId: 'rrhh-configuracion',
        ruta: '/rrhh/configuracion',
        guiaPath: '/guias/rrhh-configuracion.md',
        titulo: 'Configuración RRHH',
    },
];

export const resolveHelpGuide = (pathname: string): IHelpGuideEntry | undefined =>
    HELP_GUIDES.find((guia) => matchPath(guia.ruta, pathname) !== null);
