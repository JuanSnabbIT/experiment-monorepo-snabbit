import classNames from 'classnames';

const ESTADOS_CICLO = [
    { key: 'borrador', label: 'Borrador' },
    { key: 'activo', label: 'Activo' },
    { key: 'finalizado', label: 'Finalizado' },
] as const;

interface ICicloVidaContratoProps {
    estado: string;
}

/**
 * Stepper horizontal que muestra el ciclo de vida del contrato:
 * borrador → activo → finalizado
 *
 * Si el estado es "suspendido", se muestra como un badge especial
 * entre activo y finalizado.
 */
const CicloVidaContrato = ({ estado }: ICicloVidaContratoProps) => {
    const estadoNormalizado = estado.toLowerCase();
    const esSuspendido = estadoNormalizado === 'suspendido';

    const indiceActual = esSuspendido
        ? 1 // suspendido se muestra como derivación de activo
        : ESTADOS_CICLO.findIndex((e) => e.key === estadoNormalizado);

    return (
        <div className='flex items-center gap-1'>
            {ESTADOS_CICLO.map((paso, i) => {
                const esActual = !esSuspendido && paso.key === estadoNormalizado;
                const esCompletado = i < indiceActual || (esSuspendido && i < 1);
                const esFuturo = !esActual && !esCompletado;

                return (
                    <div key={paso.key} className='flex items-center gap-1'>
                        {i > 0 && (
                            <div
                                className={classNames(
                                    'h-0.5 w-4 sm:w-6',
                                    esCompletado || esActual
                                        ? 'bg-blue-500'
                                        : 'bg-zinc-300 dark:bg-zinc-600',
                                )}
                            />
                        )}
                        <div
                            className={classNames(
                                'flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap',
                                {
                                    'bg-blue-500 text-white': esActual,
                                    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300':
                                        esCompletado,
                                    'bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500':
                                        esFuturo,
                                },
                            )}>
                            {esCompletado && (
                                <svg
                                    className='h-3 w-3'
                                    fill='none'
                                    viewBox='0 0 24 24'
                                    strokeWidth={2.5}
                                    stroke='currentColor'>
                                    <path
                                        strokeLinecap='round'
                                        strokeLinejoin='round'
                                        d='M4.5 12.75l6 6 9-13.5'
                                    />
                                </svg>
                            )}
                            {paso.label}
                        </div>
                    </div>
                );
            })}
            {esSuspendido && (
                <>
                    <div className='h-0.5 w-4 bg-amber-400 sm:w-6' />
                    <div className='flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium whitespace-nowrap text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'>
                        Suspendido
                    </div>
                </>
            )}
        </div>
    );
};

export default CicloVidaContrato;
