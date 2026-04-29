// Configuracion de Firebase Cloud Messaging (FCM) para notificaciones push web.
// Las claves se leen desde variables de entorno VITE_FIREBASE_*. Ver dev/docs
// o instrucciones del agente para detalles de configuracion en .env.

import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getMessaging, isSupported, type Messaging } from 'firebase/messaging';

const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY as string,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN as string,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID as string,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET as string,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
    appId: process.env.VITE_FIREBASE_APP_ID as string,
};

export const VAPID_KEY = (process.env.VITE_FIREBASE_VAPID_KEY as string) || '';

let firebaseApp: FirebaseApp | null = null;
let messagingInstance: Messaging | null = null;

export const getFirebaseApp = (): FirebaseApp | null => {
    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
        // Firebase no configurado; el FCM queda deshabilitado silenciosamente.
        return null;
    }
    if (!firebaseApp) {
        firebaseApp = initializeApp(firebaseConfig);
    }
    return firebaseApp;
};

/**
 * Devuelve la instancia de Messaging si el navegador la soporta y Firebase
 * esta configurado. En servidor (SSR) o navegadores sin soporte, devuelve null.
 */
export const getMessagingInstance = async (): Promise<Messaging | null> => {
    try {
        const supported = await isSupported();
        if (!supported) return null;
        const app = getFirebaseApp();
        if (!app) return null;
        if (!messagingInstance) {
            messagingInstance = getMessaging(app);
        }
        return messagingInstance;
    } catch {
        return null;
    }
};

export const isFirebaseConfigured = (): boolean =>
    Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && VAPID_KEY);
