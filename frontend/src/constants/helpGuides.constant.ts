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
        ruta: '/registros/plantillas-contrato-v2',
        guiaPath: '/guias/plantillas-contrato-lista.md',
        titulo: 'Plantillas de Contrato',
    },
    {
        viewId: 'plantillas-contrato-editor-v29',
        ruta: '/registros/plantillas-contrato-v2/:plantillaId',
        guiaPath: '/guias/plantillas-contrato-editor-v29.md',
        titulo: 'Editor de Plantillas de Contrato',
    },
];

export const resolveHelpGuide = (pathname: string): IHelpGuideEntry | undefined =>
    HELP_GUIDES.find((guia) => matchPath(guia.ruta, pathname) !== null);
