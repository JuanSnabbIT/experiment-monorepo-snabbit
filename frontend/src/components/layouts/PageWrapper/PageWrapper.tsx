import { FC, ReactNode, useEffect, useRef } from 'react';
import classNames from 'classnames';
import { Navigate } from 'react-router-dom';
import { authPages } from '../../../config/pages.config';
import useDocumentTitle from '../../../hooks/useDocumentTitle';
import { obtenerPersonalizacionThunk, useAppDispatch, useAppSelector } from '@/store';
import {
    listaComunasThunk,
    listaProvinciasThunk,
    listaRegionesThunk,
} from '@/store/slices/core/coreSlice';
import useFontSize from '@/hooks/useFontSize';
import useDarkMode from '@/hooks/useDarkMode';

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
            dispatch(obtenerPersonalizacionThunk({ access }));
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
                dispatch(obtenerPersonalizacionThunk({ access }));
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

    if (isProtectedRoute && isProtectedRoute === true && !isAuthenticated) {
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
