import React, { FC, ReactNode, useState } from 'react';
import classNames from 'classnames';
import useAsideStatus from '../../../hooks/useAsideStatus';
import themeConfig from '../../../config/theme.config';
import { useSwipeable } from 'react-swipeable';

interface IWrapperProps {
    children: ReactNode;
    className?: string;
}
const Wrapper: FC<IWrapperProps> = (props) => {
    const { children, className, ...rest } = props;
    const { asideStatus } = useAsideStatus();
    const [isPulling, setIsPulling] = useState(false);
    const [pullDistance, setPullDistance] = useState(0);
    const [startAtTop, setStartAtTop] = useState(false);

    const resetPull = () => {
        setIsPulling(false);
        setPullDistance(0);
        setStartAtTop(false);
    };

    // Capturar el toque inicial para determinar si comienza en la parte superior
    const handleTouchStart = (e: React.TouchEvent) => {
        if (window.scrollY === 0 && e.touches[0].clientY <= window.innerHeight / 2) {
            setStartAtTop(true);
        } else {
            setStartAtTop(false);
        }
    };

    const handlers = useSwipeable({
        onSwiping: (eventData) => {
            const { dir, deltaY } = eventData;

            // Solo activar si el usuario está en la parte superior de la página
            if (startAtTop && dir === 'Down') {
                setIsPulling(true);
                setPullDistance(Math.min(deltaY, 100)); // Limitar la distancia a 100px
            }
        },
        onSwipedDown: () => {
            // Si el gesto supera 50px, recargar
            if (pullDistance > 70 && startAtTop) {
                window.location.reload(); // Recargar la página
            }
            resetPull(); // Restablecer el estado
        },
        onSwiped: resetPull, // Restablecer en otros gestos
        delta: 10, // Umbral mínimo para detectar el gesto
        preventScrollOnSwipe: false, // Permitir scroll cuando no estamos al inicio
    });

    return (
        <section
            data-component-name='Wrapper'
            className={classNames('flex flex-auto flex-col', themeConfig.transition, className, {
                'ltr:peer-[]:md:pl-[20rem] rtl:peer-[]:md:pr-[20rem]': asideStatus,
                // Mobile Design
                'ltr:peer-[]:md:pl-[6.225em] rtl:peer-[]:md:pr-[6.225em]': !asideStatus,
            })}
            {...rest}
            onTouchStart={handleTouchStart}
            {...handlers}>
            {/* Icono Spinner animado solo si está tirando */}
            {isPulling && window.scrollY === 0 && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: '50%',
                        transform: `translateX(-50%) translateY(${pullDistance / 2}px)`,
                        opacity: isPulling ? 1 : 0,
                        transition: 'opacity 0.2s, transform 0.2s',
                        zIndex: 1000,
                    }}>
                    <div className='flex items-center justify-center rounded-full bg-zinc-200 p-2 dark:bg-zinc-800'>
                        <div className='h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent'></div>
                    </div>
                </div>
            )}
            {children}
        </section>
    );
};

export default Wrapper;
