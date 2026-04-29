/* eslint-disable no-restricted-globals, no-undef */
// Service Worker para Firebase Cloud Messaging (FCM).
// Se registra automaticamente en el dominio raiz para recibir push en background.
//
// IMPORTANTE: Las claves de Firebase aqui no son secretas (son publicas en
// cualquier app web). Solo se usan para identificar el proyecto FCM.
// Reemplaza los valores con los de tu proyecto Firebase antes de desplegar.

importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js');

// CONFIGURACION FIREBASE - reemplazar con valores reales del proyecto.
// Estos valores deben coincidir con VITE_FIREBASE_* en frontend/.env
firebase.initializeApp({
    apiKey: 'AIzaSyA73SpvlP8Mat7qVQOFdG7kkLvJmNvjo7o',
    authDomain: 'erp-snabbit.firebaseapp.com',
    projectId: 'erp-snabbit',
    storageBucket: 'erp-snabbit.firebasestorage.app',
    messagingSenderId: '649313476700',
    appId: '1:649313476700:web:d47742aafac5e1b43c8699',
});

const messaging = firebase.messaging();

// Background message handler: muestra notificacion del SO y al hacer click,
// abre/foca la URL indicada en data.url_destino.
messaging.onBackgroundMessage((payload) => {
    const titulo = payload?.notification?.title || 'Notificacion';
    const opciones = {
        body: payload?.notification?.body || '',
        icon: '/favicon.ico',
        data: payload?.data || {},
    };
    self.registration.showNotification(titulo, opciones);
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const url = event.notification?.data?.url_destino || '/';
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if (client.url.includes(url) && 'focus' in client) {
                    return client.focus();
                }
            }
            if (self.clients.openWindow) {
                return self.clients.openWindow(url);
            }
            return undefined;
        }),
    );
});
