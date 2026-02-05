import { FC } from 'react';

interface AppLoaderProps {
    message?: string;
}

/**
 * Componente de carga que se muestra mientras:
 * 1. Se rehidrata el estado de Redux (PersistGate)
 * 2. Se verifica la validez de la sesión (AppInitializer)
 *
 * Evita el flicker visual donde se muestra brevemente el layout principal
 * antes de redirigir al login cuando no hay sesión activa.
 */
const AppLoader: FC<AppLoaderProps> = ({ message = 'Cargando...' }) => {
    return (
        <div className='flex h-screen w-screen items-center justify-center bg-zinc-100 dark:bg-zinc-950'>
            <div className='flex flex-col items-center gap-4'>
                {/* Spinner */}
                <div className='h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent' />
                {/* Texto */}
                <p className='text-sm text-zinc-500 dark:text-zinc-400'>{message}</p>
            </div>
        </div>
    );
};

export default AppLoader;
