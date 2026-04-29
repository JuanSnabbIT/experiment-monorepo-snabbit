// Bell de notificaciones in-app conectado al backend.
// Muestra contador de no-leidas, lista de notificaciones recientes y permite
// marcar como leidas (individual / todas) y navegar a la URL de destino.

import classNames from 'classnames';
import { onMessage } from 'firebase/messaging';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../../../components/icon/Icon';
import Button from '../../../../components/ui/Button';
import Dropdown, { DropdownMenu, DropdownToggle } from '../../../../components/ui/Dropdown';
import { getMessagingInstance } from '../../../../config/firebase.config';
import { useAppDispatch } from '../../../../store/hook';
import notificacionesApi, {
    INotificacion,
    useGetNoLeidasCountQuery,
    useGetNotificacionesQuery,
    useMarcarLeidaMutation,
    useMarcarTodasLeidasMutation,
} from '../../../../store/slices/notificaciones/notificacionesApi';

const formatearTiempo = (iso: string): string => {
    const fecha = new Date(iso);
    const diffMs = Date.now() - fecha.getTime();
    const min = Math.floor(diffMs / 60000);
    if (min < 1) return 'ahora';
    if (min < 60) return `${min}m`;
    const horas = Math.floor(min / 60);
    if (horas < 24) return `${horas}h`;
    const dias = Math.floor(horas / 24);
    if (dias < 7) return `${dias}d`;
    return fecha.toLocaleDateString();
};

const NotificationPartial = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();

    const { data: noLeidasData } = useGetNoLeidasCountQuery(undefined, {
        pollingInterval: 30000,
    });
    const { data: notificaciones = [] } = useGetNotificacionesQuery(undefined, {
        pollingInterval: 30000,
    });
    const [marcarLeida] = useMarcarLeidaMutation();
    const [marcarTodasLeidas] = useMarcarTodasLeidasMutation();

    // Cuando llega un push estando la pestaña enfocada, FCM NO muestra
    // la notificacion del SO automaticamente (solo lo hace en background via
    // el service worker). Aqui hacemos dos cosas:
    //   1) Invalidar cache RTK para refrescar bell + badge inmediatamente.
    //   2) Mostrar la notificacion del SO manualmente via showNotification()
    //      del service worker, replicando el comportamiento background.
    useEffect(() => {
        let unsub: (() => void) | undefined;
        getMessagingInstance().then((messaging) => {
            if (!messaging) return;
            unsub = onMessage(messaging, async (payload) => {
                dispatch(
                    notificacionesApi.util.invalidateTags([
                        'Notificaciones',
                        'NotificacionesNoLeidas',
                    ]),
                );

                // Mostrar notificacion del SO solo si el usuario otorgo permiso.
                if (
                    typeof window === 'undefined' ||
                    !('Notification' in window) ||
                    Notification.permission !== 'granted'
                ) {
                    return;
                }

                const titulo = payload?.notification?.title || 'Notificacion';
                const cuerpo = payload?.notification?.body || '';
                const data = payload?.data || {};

                try {
                    const reg = await navigator.serviceWorker.getRegistration(
                        '/firebase-messaging-sw.js',
                    );
                    if (reg) {
                        await reg.showNotification(titulo, {
                            body: cuerpo,
                            icon: '/favicon.ico',
                            data,
                            tag: `fcm-${data?.tipo || 'general'}-${Date.now()}`,
                        });
                    } else if ('Notification' in window) {
                        // Fallback si el SW no esta disponible.
                        // eslint-disable-next-line no-new
                        new Notification(titulo, { body: cuerpo, icon: '/favicon.ico' });
                    }
                } catch {
                    /* silencioso: la notificacion in-app ya esta cubierta */
                }
            });
        });
        return () => unsub?.();
    }, [dispatch]);

    const total = noLeidasData?.no_leidas ?? 0;

    const handleClick = async (n: INotificacion) => {
        if (!n.leida) {
            try {
                await marcarLeida(n.id).unwrap();
            } catch {
                /* silencioso */
            }
        }
        if (n.url_destino) {
            navigate(n.url_destino);
        }
    };

    const handleMarcarTodas = async () => {
        try {
            await marcarTodasLeidas().unwrap();
        } catch {
            /* silencioso */
        }
    };

    const recientes = notificaciones.slice(0, 10);

    return (
        <div className='relative'>
            <Dropdown>
                <DropdownToggle hasIcon={false}>
                    <Button icon='HeroBell' aria-label='Notificaciones' />
                </DropdownToggle>
                <DropdownMenu placement='bottom-end' className='flex min-w-[24rem] flex-col p-0'>
                    <div className='flex items-center justify-between border-b border-zinc-500/20 p-3'>
                        <span className='font-semibold'>Notificaciones</span>
                        {total > 0 && (
                            <button
                                type='button'
                                onClick={handleMarcarTodas}
                                className='text-xs text-blue-500 hover:underline'>
                                Marcar todas como leidas
                            </button>
                        )}
                    </div>
                    <div className='max-h-[28rem] divide-y divide-dashed divide-zinc-500/30 overflow-y-auto'>
                        {recientes.length === 0 ? (
                            <div className='p-6 text-center text-sm text-zinc-500'>
                                Sin notificaciones
                            </div>
                        ) : (
                            recientes.map((n) => (
                                <button
                                    key={n.id}
                                    type='button'
                                    onClick={() => handleClick(n)}
                                    className={classNames(
                                        'flex w-full items-start gap-3 p-3 text-left hover:bg-zinc-500/10',
                                        { 'bg-blue-500/5': !n.leida },
                                    )}>
                                    <div className='flex-shrink-0 pt-1'>
                                        <Icon
                                            icon={n.leida ? 'HeroBell' : 'HeroBellAlert'}
                                            className={classNames({
                                                'text-blue-500': !n.leida,
                                                'text-zinc-400': n.leida,
                                            })}
                                        />
                                    </div>
                                    <div className='grow'>
                                        <div className='flex items-center justify-between gap-2'>
                                            <span
                                                className={classNames('text-sm', {
                                                    'font-semibold': !n.leida,
                                                })}>
                                                {n.titulo}
                                            </span>
                                            <span className='flex-shrink-0 text-xs text-zinc-500'>
                                                {formatearTiempo(n.fecha_creacion)}
                                            </span>
                                        </div>
                                        {n.cuerpo && (
                                            <div className='mt-1 text-xs text-zinc-500'>
                                                {n.cuerpo}
                                            </div>
                                        )}
                                    </div>
                                    {!n.leida && (
                                        <span className='mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-blue-500' />
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                </DropdownMenu>
            </Dropdown>
            {total > 0 && (
                <span className='pointer-events-none absolute -end-1 -top-1 flex min-w-[1.1rem] justify-center'>
                    <span className='inline-flex h-[1.1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[0.65rem] font-bold text-white'>
                        {total > 99 ? '99+' : total}
                    </span>
                </span>
            )}
        </div>
    );
};

export default NotificationPartial;
