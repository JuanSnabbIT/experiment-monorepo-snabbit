import { authPages } from '@/config/pages.config';
import store, { GUARDAR_TOKEN, LOGOUT } from '@/store';
import { persistor } from '@/store/storeSetup';
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { toast } from 'react-toastify';

// Extender la interfaz de configuración para incluir isLoginRequest y _retry
interface CustomAxiosRequestConfig<D = any> extends InternalAxiosRequestConfig<D> {
    isLoginRequest?: boolean;
    _retry?: boolean;
}

// ============================================================
// SEMÁFORO DE REFRESH - Evita race conditions con múltiples 401
// ============================================================
let isRefreshing = false;
let failedQueue: Array<{
    resolve: (token: string) => void;
    reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
    failedQueue.forEach((prom) => {
        if (token) {
            prom.resolve(token);
        } else {
            prom.reject(error);
        }
    });
    failedQueue = [];
};

/**
 * Decodifica un JWT y retorna el payload
 */
const decodeJWT = (token: string): { exp: number } | null => {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join(''),
        );
        return JSON.parse(jsonPayload);
    } catch {
        return null;
    }
};

/**
 * Verifica si un token JWT está expirado
 * @param token - El token JWT a verificar
 * @param bufferSeconds - Segundos de margen antes de considerar expirado (default: 30)
 */
export const isTokenExpired = (token: string | undefined, bufferSeconds = 30): boolean => {
    if (!token) return true;
    const decoded = decodeJWT(token);
    if (!decoded || !decoded.exp) return true;
    // exp está en segundos, Date.now() en milisegundos
    const expirationTime = decoded.exp * 1000;
    const now = Date.now();
    return now >= expirationTime - bufferSeconds * 1000;
};

/**
 * Ejecuta logout completo: limpia Redux y localStorage
 */
const executeFullLogout = () => {
    store.dispatch(LOGOUT());
    // Limpiar localStorage completamente
    persistor.purge();
};

const BaseService = axios.create({
    timeout: 60000,
    baseURL: `${process.env.VITE_API_URL}`,
});

// Interceptor de Solicitud
BaseService.interceptors.request.use(
    (config: CustomAxiosRequestConfig) => {
        if (!config.isLoginRequest) {
            const token = store.getState().auth.access;
            const isExpired = isTokenExpired(token);
            if (token) {
                config.headers = config.headers || {};
                config.headers['Authorization'] = 'Bearer ' + token;
            }
        }
        return config;
    },
    (error) => Promise.reject(error),
);

// Interceptor de Respuesta
BaseService.interceptors.response.use(
    (response) => {
        return response;
    },
    async (error: AxiosError) => {
        const originalRequest = error.config as CustomAxiosRequestConfig;

        // Solo manejar errores 401 que no sean de login y no hayan sido reintentados
        if (
            error.response &&
            error.response.status === 401 &&
            !originalRequest._retry &&
            !originalRequest.isLoginRequest
        ) {
            const accessToken = store.getState().auth.access;
            const refreshToken = store.getState().auth.refresh;
            
            
            // Si no hay tokens, el usuario simplemente no está autenticado
            // No mostrar toast ni redirigir (el router se encargará)
            if (!accessToken && !refreshToken) {
                return Promise.reject(error);
            }
            
            // Si ya hay un refresh en progreso, encolar este request
            if (isRefreshing) {
                return new Promise<string>((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then((token) => {
                        originalRequest.headers['Authorization'] = 'Bearer ' + token;
                        return BaseService(originalRequest);
                    })
                    .catch((err) => {
                        return Promise.reject(err);
                    });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            const refreshExpired = isTokenExpired(refreshToken, 0);

            // Verificar si el refresh token también está expirado
            if (refreshToken && !refreshExpired) {
                try {
                    const refreshResponse = await axios.post(
                        `${process.env.VITE_API_URL}/auth/jwt/refresh/`,
                        {
                            refresh: refreshToken,
                        },
                    );

                    const newToken = refreshResponse.data.access;
                    store.dispatch(GUARDAR_TOKEN(newToken));

                    // Procesar la cola de requests pendientes con el nuevo token
                    processQueue(null, newToken);

                    originalRequest.headers['Authorization'] = 'Bearer ' + newToken;

                    // Reintentar la solicitud original con el nuevo token
                    return BaseService(originalRequest);
                } catch (refreshError) {
                    // Procesar la cola con error
                    processQueue(refreshError, null);

                    // Manejar el fallo del refresco del token - AQUÍ sí hubo sesión que expiró
                    toast.error('Sesión Expirada', { toastId: 'session-expired' });
                    executeFullLogout();

                    // Redirigir al login
                    window.location.href = authPages.loginPage.to;
                    return Promise.reject(refreshError);
                } finally {
                    isRefreshing = false;
                }
            } else {
                // Refresh token expirado - la sesión expiró
                isRefreshing = false;
                processQueue(error, null);
                toast.error('Sesión Expirada', { toastId: 'session-expired' });
                executeFullLogout();

                // Redirigir al login
                window.location.href = authPages.loginPage.to;
                return Promise.reject(error);
            }
        }

        return Promise.reject(error);
    },
);

export default BaseService;
