import { isTokenExpired } from '@/services/BaseService';
import { useAppDispatch, useAppSelector } from '@/store/hook';
import { GUARDAR_TOKEN, LOGOUT, SET_SESSION_VERIFIED } from '@/store/slices/auth/authSlice';
import { persistor } from '@/store/storeSetup';
import axios from 'axios';
import { FC, ReactNode, useEffect, useRef, useState } from 'react';

interface AppInitializerProps {
    children: ReactNode;
    loadingComponent: ReactNode;
}

/**
 * Componente que verifica la validez de la sesión antes de renderizar la app.
 *
 * Flujo:
 * 1. Si no hay tokens → marca sesión como verificada y renderiza (irá al login)
 * 2. Si hay tokens pero están expirados → logout y renderiza
 * 3. Si hay tokens válidos → verifica con el backend y luego renderiza
 */
const AppInitializer: FC<AppInitializerProps> = ({ children, loadingComponent }) => {
    const dispatch = useAppDispatch();
    const { access, refresh, _sessionVerified, isAuthenticated } = useAppSelector(
        (state) => state.auth,
    );
    const [isVerifying, setIsVerifying] = useState(true);
    // Ref para evitar múltiples ejecuciones
    const hasVerified = useRef(false);

    console.log('[AppInitializer] Render - isVerifying:', isVerifying, 'hasVerified:', hasVerified.current, '_sessionVerified:', _sessionVerified, 'isAuthenticated:', isAuthenticated, 'hasAccess:', !!access);

    useEffect(() => {
        const verifySession = async () => {
            console.log('[AppInitializer] verifySession START - hasVerified:', hasVerified.current, '_sessionVerified:', _sessionVerified);
            
            // Evitar múltiples ejecuciones
            if (hasVerified.current) {
                console.log('[AppInitializer] Ya se verificó previamente, saliendo');
                return;
            }

            // Si la sesión ya fue verificada previamente (ej: login reciente), no re-verificar
            if (_sessionVerified) {
                console.log('[AppInitializer] _sessionVerified=true, no re-verificar');
                setIsVerifying(false);
                hasVerified.current = true;
                return;
            }

            hasVerified.current = true;

            // Si no hay tokens guardados, no hay sesión que verificar
            if (!access && !refresh) {
                console.log('[AppInitializer] No hay tokens, marcando como verificado');
                dispatch(SET_SESSION_VERIFIED(true));
                setIsVerifying(false);
                return;
            }

            console.log('[AppInitializer] Verificando tokens - access expirado:', isTokenExpired(access, 30), 'refresh expirado:', isTokenExpired(refresh, 0));

            // Si el refresh token está expirado, la sesión es inválida
            if (isTokenExpired(refresh, 0)) {
                console.log('[AppInitializer] Refresh token expirado, cerrando sesión');
                dispatch(LOGOUT());
                persistor.purge();
                dispatch(SET_SESSION_VERIFIED(true));
                setIsVerifying(false);
                return;
            }

            // Si el access token está expirado pero el refresh no, intentar renovar
            if (isTokenExpired(access, 30)) {
                console.log('[AppInitializer] Access token expirado, intentando refresh...');
                try {
                    const response = await axios.post(
                        `${process.env.VITE_API_URL}/auth/jwt/refresh/`,
                        { refresh },
                    );

                    // Guardar el nuevo token en Redux
                    if (response.data.access) {
                        console.log('[AppInitializer] Refresh exitoso, nuevo token obtenido');
                        dispatch(GUARDAR_TOKEN(response.data.access));
                        dispatch(SET_SESSION_VERIFIED(true));
                        setIsVerifying(false);
                        return;
                    }
                } catch (err) {
                    // El refresh falló, cerrar sesión
                    console.log('[AppInitializer] Refresh falló:', err);
                    dispatch(LOGOUT());
                    persistor.purge();
                    dispatch(SET_SESSION_VERIFIED(true));
                    setIsVerifying(false);
                    return;
                }
            }

            // El access token parece válido, verificar con el backend
            console.log('[AppInitializer] Token parece válido, verificando con backend...');
            try {
                await axios.get(`${process.env.VITE_API_URL}/auth/users/me/`, {
                    headers: { Authorization: `Bearer ${access}` },
                });
                // Token válido
                console.log('[AppInitializer] Token válido confirmado por backend');
                dispatch(SET_SESSION_VERIFIED(true));
            } catch (err) {
                // Token inválido o expirado
                console.log('[AppInitializer] Backend rechazó el token:', err);
                dispatch(LOGOUT());
                persistor.purge();
                dispatch(SET_SESSION_VERIFIED(true));
            } finally {
                setIsVerifying(false);
            }
        };

        verifySession();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Solo ejecutar al montar

    // Mientras se verifica la sesión, mostrar el componente de carga
    if (isVerifying) {
        console.log('[AppInitializer] Mostrando loadingComponent');
        return <>{loadingComponent}</>;
    }

    console.log('[AppInitializer] Renderizando children');
    return <>{children}</>;
};

export default AppInitializer;
