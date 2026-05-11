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


    useEffect(() => {
        const verifySession = async () => {
            
            // Evitar múltiples ejecuciones
            if (hasVerified.current) {
                return;
            }

            // Si la sesión ya fue verificada previamente (ej: login reciente), no re-verificar
            if (_sessionVerified) {
                setIsVerifying(false);
                hasVerified.current = true;
                return;
            }

            hasVerified.current = true;

            // Si no hay tokens guardados, no hay sesión que verificar
            if (!access && !refresh) {
                dispatch(SET_SESSION_VERIFIED(true));
                setIsVerifying(false);
                return;
            }


            // Si el refresh token está expirado, la sesión es inválida
            if (isTokenExpired(refresh, 0)) {
                dispatch(LOGOUT());
                persistor.purge();
                dispatch(SET_SESSION_VERIFIED(true));
                setIsVerifying(false);
                return;
            }

            // Si el access token está expirado pero el refresh no, intentar renovar
            if (isTokenExpired(access, 30)) {
                try {
                    const response = await axios.post(
                        `${import.meta.env.VITE_API_URL}/auth/jwt/refresh/`,
                        { refresh },
                    );

                    // Guardar el nuevo token en Redux
                    if (response.data.access) {
                        dispatch(GUARDAR_TOKEN(response.data.access));
                        dispatch(SET_SESSION_VERIFIED(true));
                        setIsVerifying(false);
                        return;
                    }
                } catch (err) {
                    // El refresh falló, cerrar sesión
                    dispatch(LOGOUT());
                    persistor.purge();
                    dispatch(SET_SESSION_VERIFIED(true));
                    setIsVerifying(false);
                    return;
                }
            }

            // El access token parece válido, verificar con el backend
            try {
                await axios.get(`${import.meta.env.VITE_API_URL}/auth/users/me/`, {
                    headers: { Authorization: `Bearer ${access}` },
                });
                // Token válido
                dispatch(SET_SESSION_VERIFIED(true));
            } catch (err) {
                // Token inválido o expirado
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
        return <>{loadingComponent}</>;
    }

    return <>{children}</>;
};

export default AppInitializer;
