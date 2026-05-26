import classNames from 'classnames';

const ESTADOS_CICLO = [
    { key: 'borrador', label: 'Borrador' },
    { key: 'pendiente_aceptacion', label: 'Pendiente' },
    { key: 'vigente', label: 'Vigente' },
] as const;

const ESTADOS_ESPECIALES: Record<string, { label: string; description: string; color: string }> = {
    terminado: {
        label: 'Terminado',
        description: 'El contrato ha finalizado su vigencia.',
        color: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300',
    },
    anulado: {
        label: 'Anulado',
        description: 'El contrato fue anulado y ya no tiene efecto.',
        color: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300',
    },
};

interface ICicloVidaContratoLaboralProps {
    estado: string;
}

const CicloVidaContratoLaboral = ({ estado }: ICicloVidaContratoLaboralProps) => {
    const estadoNormalizado = estado.toLowerCase();
    const estadoEspecial = ESTADOS_ESPECIALES[estadoNormalizado] ?? null;
    const indiceActual = ESTADOS_CICLO.findIndex((paso) => paso.key === estadoNormalizado);

    return (
        <div className='space-y-3'>
            <div className='flex flex-wrap items-center justify-center gap-1 sm:gap-2'>
                {ESTADOS_CICLO.map((paso, i) => {
                    const esActual = !estadoEspecial && paso.key === estadoNormalizado;
                    const esCompletado =
                        !estadoEspecial && indiceActual >= 0 && i < indiceActual;
                    const esFuturo = !esActual && !esCompletado;

                    return (
                        <div key={paso.key} className='flex items-center gap-1 sm:gap-2'>
                            {i > 0 && (
                                <div
                                    className={classNames(
                                        'hidden h-0.5 w-4 sm:block sm:w-6',
                                        esCompletado || esActual
                                            ? 'bg-blue-500'
                                            : 'bg-zinc-300 dark:bg-zinc-600',
                                    )}
                                />
                            )}
                            <div
                                className={classNames(
                                    'flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap',
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
            </div>

            {estadoEspecial && (
                <div
                    className={classNames(
                        'inline-flex max-w-full items-center gap-2 rounded-lg px-3 py-2 text-xs sm:text-sm',
                        estadoEspecial.color,
                    )}>
                    <span className='rounded-full bg-white/80 px-2 py-0.5 font-semibold dark:bg-zinc-900/40'>
                        {estadoEspecial.label}
                    </span>
                    <span>{estadoEspecial.description}</span>
                </div>
            )}
        </div>
    );
};

export default CicloVidaContratoLaboral;
