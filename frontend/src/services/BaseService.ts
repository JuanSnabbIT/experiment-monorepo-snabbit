import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { toast } from 'react-toastify';
import { authPages } from '@/config/pages.config';
import store, { GUARDAR_TOKEN, LOGOUT } from '@/store';

// Extender la interfaz de configuración para incluir isLoginRequest y _retry
interface CustomAxiosRequestConfig<D = any> extends InternalAxiosRequestConfig<D> {
    isLoginRequest?: boolean;
    _retry?: boolean;
}

const BaseService = axios.create({
    timeout: 60000,
    baseURL: `${process.env.VITE_API_URL}`,
});

// Interceptor de Solicitud
BaseService.interceptors.request.use(
    (config: CustomAxiosRequestConfig) => {
        if (!config.isLoginRequest) {
            const token = store.getState().auth.access;
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
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as CustomAxiosRequestConfig;

        if (
            error.response &&
            error.response.status === 401 &&
            !originalRequest._retry &&
            !originalRequest.isLoginRequest // Evitar refrescar el token en solicitudes de login
        ) {
            originalRequest._retry = true;

            const refreshToken = store.getState().auth.refresh;
            if (refreshToken) {
                try {
                    const refreshResponse = await axios.post(
                        `${process.env.VITE_API_URL}/auth/jwt/refresh`,
                        {
                            refresh: refreshToken,
                        },
                    );

                    const newToken = refreshResponse.data.access;
                    store.dispatch(GUARDAR_TOKEN(newToken));

                    originalRequest.headers['Authorization'] = 'Bearer ' + newToken;

                    // Reintentar la solicitud original con el nuevo token
                    return BaseService(originalRequest);
                } catch (refreshError) {
                    // Manejar el fallo del refresco del token
                    toast.error('Sesión Expirada', { toastId: 'Error de refresco de token' });
                    store.dispatch(LOGOUT());
                    // Redirigir al login
                    window.location.href = authPages.loginPage.to;
                    return Promise.reject(refreshError);
                }
            } else {
                // No hay token de refresco disponible
                toast.error('Sesión Expirada', { toastId: 'Sin token de refresco' });
                store.dispatch(LOGOUT());
                // Redirigir al login
                window.location.href = authPages.loginPage.to;
                return Promise.reject(error);
            }
        }

        return Promise.reject(error);
    },
);

export default BaseService;
