import useDarkMode from '@/hooks/useDarkMode';
import useFontSize from '@/hooks/useFontSize';
import { obtenerPersonalizacionThunk, useAppDispatch, useAppSelector } from '@/store';
import {
    listaComunasThunk,
    listaProvinciasThunk,
    listaRegionesThunk,
} from '@/store/slices/core/coreSlice';
import classNames from 'classnames';
import { FC, ReactNode, useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { authPages } from '../../../config/pages.config';
import useDocumentTitle from '../../../hooks/useDocumentTitle';

interface IPageWrapperProps {
    children: ReactNode;
    className?: string;
    isProtectedRoute?: boolean;
    title?: string;
    name?: string;
}

const PageWrapper: FC<IPageWrapperProps> = (props) => {
    const dispatch = useAppDispatch();
    const { fontSize, setFontSize } = useFontSize();
    const { darkModeStatus, setDarkModeStatus } = useDarkMode();
    const { children, className, isProtectedRoute, title, name, ...rest } = props;
    const { isAuthenticated, access, personalizacionUsuario, userMe } = useAppSelector(
        (state) => state.auth,
    );
    const { listaComunas, listaProvincias, listaRegiones } = useAppSelector((state) => state.core);
    // useRef nos permite almacenar un valor mutable que persiste entre renderizados.
    const yaSeEjecuto = useRef(false);

    useDocumentTitle({ title, name });

    useEffect(() => {
        if (isProtectedRoute && isAuthenticated && !yaSeEjecuto.current) {
            // Ejecutamos la función solo si se cumple la condición y no se ha ejecutado antes.
            dispatch(obtenerPersonalizacionThunk());
            yaSeEjecuto.current = true;
        }
    }, []); // Se ejecuta cada vez que 'condicion' cambie

    useEffect(() => {
        if (isProtectedRoute && isAuthenticated) {
            if (
                listaComunas.length === 0 ||
                listaProvincias.length === 0 ||
                listaRegiones.length === 0
            ) {
                dispatch(listaRegionesThunk());
                dispatch(listaProvinciasThunk());
                dispatch(listaComunasThunk());
            }
            if (personalizacionUsuario === undefined && userMe) {
                dispatch(obtenerPersonalizacionThunk());
            }
        }
    }, [isAuthenticated, access, isProtectedRoute, userMe]);

    useEffect(() => {
        if (personalizacionUsuario) {
            if (personalizacionUsuario.font_size !== fontSize) {
                setFontSize(personalizacionUsuario.font_size);
            }
            if (personalizacionUsuario.tema) {
                const tema =
                    personalizacionUsuario.tema === '1'
                        ? 'light'
                        : personalizacionUsuario.tema === '2'
                          ? 'dark'
                          : personalizacionUsuario.tema === '3'
                            ? 'system'
                            : 'system';
                setDarkModeStatus(tema);
            }
        }
    }, [personalizacionUsuario]);

    console.log('[PageWrapper] Evaluando ruta - isProtectedRoute:', isProtectedRoute, 'isAuthenticated:', isAuthenticated, 'name:', name);

    if (isProtectedRoute && isProtectedRoute === true && !isAuthenticated) {
        console.log('[PageWrapper] REDIRIGIENDO A LOGIN - ruta protegida sin autenticación');
        return <Navigate to={authPages.loginPage.to} />;
    }

    return (
        <main
            data-component-name='PageWrapper'
            className={classNames('flex shrink-0 grow flex-col', className)}
            {...rest}>
            {children}
        </main>
    );
};

export default PageWrapper;
