// Hook para registrar el token FCM del navegador en el backend.
// Solicita permiso de notificaciones, obtiene el token via VAPID y lo
// envia a /api/fcm-tokens/registrar/. Se invoca despues del login.

import { getMessagingInstance, isFirebaseConfigured, VAPID_KEY } from '@/config/firebase.config';
import ApiService from '@/services/ApiService';
import { getErrorMessage } from '@/utils/errorHandlers';
import { getToken, onMessage } from 'firebase/messaging';
import { useCallback } from 'react';
import { toast } from 'react-toastify';

const SW_PATH = '/firebase-messaging-sw.js';

interface IFCMRegistroResponse {
    id: number;
    token: string;
    activo: boolean;
}

/**
 * Hook que devuelve dos funciones:
 *  - registrarToken: pide permiso, obtiene token y lo persiste en backend.
 *  - escucharForeground: muestra toast cuando llega un push estando la app abierta.
 */
const useFCMToken = () => {
    const registrarToken = useCallback(async (): Promise<string | null> => {
        if (!isFirebaseConfigured()) {
            // eslint-disable-next-line no-console
            console.warn('[FCM] Firebase no configurado (faltan VITE_FIREBASE_*).');
            return null;
        }
        if (typeof window === 'undefined' || !('Notification' in window)) {
            return null;
        }
        try {
            const permiso = await Notification.requestPermission();
            // eslint-disable-next-line no-console
            console.info('[FCM] Notification.permission:', permiso);
            if (permiso !== 'granted') {
                return null;
            }
            const messaging = await getMessagingInstance();
            if (!messaging) return null;

            // Registrar service worker en scope global para que reciba pushes
            // independientemente de la ruta actual del usuario.
            const registration = await navigator.serviceWorker.register(SW_PATH, {
                scope: '/',
            });
            // eslint-disable-next-line no-console
            console.info('[FCM] SW registrado, scope:', registration.scope);

            if (!VAPID_KEY) {
                // eslint-disable-next-line no-console
                console.warn('[FCM] VITE_FIREBASE_VAPID_KEY vacio: getToken puede fallar.');
            }

            const token = await getToken(messaging, {
                vapidKey: VAPID_KEY,
                serviceWorkerRegistration: registration,
            });
            if (!token) {
                // eslint-disable-next-line no-console
                console.warn('[FCM] getToken() retorno vacio.');
                return null;
            }
            // eslint-disable-next-line no-console
            console.info('[FCM] Token obtenido:', `${token.slice(0, 16)}...`);

            const userAgent = navigator.userAgent || '';
            await ApiService.fetchData<IFCMRegistroResponse>({
                url: '/api/fcm-tokens/registrar/',
                method: 'post',
                data: { token, user_agent: userAgent },
            });
            // eslint-disable-next-line no-console
            console.info('[FCM] Token registrado en backend.');
            return token;
        } catch (error) {
            // Silencioso para el usuario, pero log visible para debug.
            // eslint-disable-next-line no-console
            console.warn('[FCM] Error registrando token:', getErrorMessage(error));
            return null;
        }
    }, []);

    const escucharForeground = useCallback(async () => {
        const messaging = await getMessagingInstance();
        if (!messaging) return () => {};
        const unsub = onMessage(messaging, (payload) => {
            const titulo = payload?.notification?.title || 'Notificacion';
            const cuerpo = payload?.notification?.body || '';
            toast.info(`${titulo}${cuerpo ? `: ${cuerpo}` : ''}`);
        });
        return unsub;
    }, []);

    return { registrarToken, escucharForeground };
};

export default useFCMToken;
