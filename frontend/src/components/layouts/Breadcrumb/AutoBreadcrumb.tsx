import { Pages } from '@/config/pages.config';
import { FC, HTMLAttributes, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import Breadcrumb from './Breadcrumb';

/**
 * Secciones del menú lateral con sus rutas asociadas
 */
const menuSections: Record<string, { section: string; routes: string[] }> = {
    // Empresa
    empresa: {
        section: 'Empresa',
        routes: ['/empresa'],
    },
    // Gestión Operativa
    registros: {
        section: 'Gestión Operativa / Registros',
        routes: ['/registros'],
    },
    recursos: {
        section: 'Gestión Operativa / Recursos',
        routes: ['/recursos'],
    },
    bodegas: {
        section: 'Gestión Operativa / Bodegas',
        routes: ['/bodegas'],
    },
    'ordenes-trabajo': {
        section: 'Gestión Operativa',
        routes: ['/ordenes-trabajo'],
    },
    visitas: {
        section: 'Gestión Operativa',
        routes: ['/visitas'],
    },
    // Ventas & Compras
    cotizaciones: {
        section: 'Ventas & Compras',
        routes: ['/cotizaciones'],
    },
    compras: {
        section: 'Ventas & Compras',
        routes: ['/compras'],
    },
    // Asesorías
    contratos: {
        section: 'Asesorías',
        routes: ['/contratos'],
    },
    // Finanzas
    rendiciones: {
        section: 'Finanzas',
        routes: ['/rendiciones'],
    },
    facturaciones: {
        section: 'Finanzas',
        routes: ['/facturaciones'],
    },
    // Calendario
    calendario: {
        section: 'Calendario',
        routes: ['/calendario'],
    },
};

/**
 * Busca información de la página en pages.config basado en la ruta
 */
const findPageInfo = (
    pathname: string,
): { section: string; parentText: string; pageText: string } | null => {
    // Normalizar pathname (remover trailing slash)
    const normalizedPath = pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;

    // Buscar en Pages
    for (const [key, page] of Object.entries(Pages)) {
        const pageData = page as {
            to: string;
            text: string;
            subPages?: Record<string, { to: string; text: string }>;
        };

        // Verificar si es una página padre
        if (pageData.to === normalizedPath) {
            const sectionInfo = menuSections[key];
            return {
                section: sectionInfo?.section || '',
                parentText: '',
                pageText: pageData.text,
            };
        }

        // Buscar en subPages
        if (pageData.subPages) {
            for (const [, subPage] of Object.entries(pageData.subPages)) {
                // Convertir rutas con parámetros a regex
                const routePattern = subPage.to.replace(/:[^/]+/g, '[^/]+');
                const regex = new RegExp(`^${routePattern}$`);

                if (regex.test(normalizedPath)) {
                    const sectionInfo = menuSections[key];
                    return {
                        section: sectionInfo?.section || '',
                        parentText: pageData.text,
                        pageText: subPage.text,
                    };
                }
            }
        }
    }

    return null;
};

/**
 * Obtiene el nombre legible del primer segmento de la URL
 */
const getFirstSegmentName = (pathname: string): string => {
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length === 0) return 'Dashboard';

    const firstSegment = segments[0].toLowerCase();
    const sectionInfo = menuSections[firstSegment];

    if (sectionInfo) {
        return sectionInfo.section;
    }

    // Capitalizar como fallback
    return firstSegment
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

interface IAutoBreadcrumbProps extends HTMLAttributes<HTMLDivElement> {
    /** Override del path (opcional) */
    overridePath?: string;
    /** Override de la página actual (opcional) */
    overrideCurrentPage?: string;
}

/**
 * Breadcrumb automático que extrae la ruta de la URL actual
 * usando la configuración de pages.config.ts
 */
const AutoBreadcrumb: FC<IAutoBreadcrumbProps> = (props) => {
    const { overridePath, overrideCurrentPage, ...rest } = props;
    const location = useLocation();

    const { path, currentPage } = useMemo(() => {
        // Si hay overrides completos, usarlos
        if (overridePath !== undefined && overrideCurrentPage !== undefined) {
            return { path: overridePath, currentPage: overrideCurrentPage };
        }

        const pathname = location.pathname;

        // Caso especial: Dashboard / Inicio
        if (pathname === '/' || pathname === '/dashboard') {
            return {
                path: overridePath || 'Páginas',
                currentPage: overrideCurrentPage || 'Dashboard',
            };
        }

        // Buscar en la configuración de páginas
        const pageInfo = findPageInfo(pathname);

        if (pageInfo) {
            // Construir el path: Sección + Padre (si existe)
            let pathParts = [];
            if (pageInfo.section) {
                pathParts.push(pageInfo.section);
            }
            if (pageInfo.parentText && !pageInfo.section.includes(pageInfo.parentText)) {
                pathParts.push(pageInfo.parentText);
            }

            return {
                path: overridePath || pathParts.join(' / '),
                currentPage: overrideCurrentPage || pageInfo.pageText,
            };
        }

        // Fallback: usar el primer segmento como sección
        const sectionName = getFirstSegmentName(pathname);
        const segments = pathname.split('/').filter(Boolean);
        const lastSegment = segments[segments.length - 1] || 'Dashboard';
        const pageName = lastSegment
            .split('-')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');

        return {
            path: overridePath || sectionName,
            currentPage: overrideCurrentPage || pageName,
        };
    }, [location.pathname, overridePath, overrideCurrentPage]);

    return <Breadcrumb path={path} currentPage={currentPage} {...rest} />;
};

export default AutoBreadcrumb;
