import classNames from 'classnames';

const ESTADOS_CICLO = [
    { key: 'borrador', label: 'Borrador' },
    { key: 'en_aprobacion_cliente', label: 'Revision cliente' },
    { key: 'aprobado_cliente', label: 'Aprobado' },
    { key: 'en_firma', label: 'En firma' },
    { key: 'activo', label: 'Activo' },
    { key: 'finalizado', label: 'Finalizado' },
] as const;

const ESTADOS_ESPECIALES = {
    cambios_solicitados: {
        label: 'Cambios solicitados',
        description: 'El cliente devolvio el contrato para ajustes antes de reenviarlo.',
    },
    rechazado_cliente: {
        label: 'Rechazado definitivamente',
        description: 'El cliente cerro el ciclo del contrato y ya no admite nuevas iteraciones.',
    },
    suspendido: {
        label: 'Suspendido',
        description: 'El contrato estaba activo y ahora se encuentra pausado temporalmente.',
    },
} as const;

interface ICicloVidaContratoProps {
    estado: string;
}

const CicloVidaContrato = ({ estado }: ICicloVidaContratoProps) => {
    const estadoNormalizado = estado.toLowerCase();
    const estadoPrincipal =
        estadoNormalizado === 'cambios_solicitados'
            ? 'borrador'
            : estadoNormalizado === 'suspendido'
              ? 'activo'
              : estadoNormalizado;

    const estadoEspecial =
        estadoNormalizado in ESTADOS_ESPECIALES
            ? ESTADOS_ESPECIALES[estadoNormalizado as keyof typeof ESTADOS_ESPECIALES]
            : null;

    const indiceActual = ESTADOS_CICLO.findIndex((paso) => paso.key === estadoPrincipal);

    return (
        <div className='space-y-3'>
            <div className='flex flex-wrap items-center justify-center gap-1 sm:gap-2'>
                {ESTADOS_CICLO.map((paso, i) => {
                    const esActual = paso.key === estadoPrincipal;
                    const esCompletado = indiceActual >= 0 && i < indiceActual;
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
                <div className='inline-flex max-w-full items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 sm:text-sm dark:bg-amber-900/20 dark:text-amber-200'>
                    <span className='rounded-full bg-white/80 px-2 py-0.5 font-semibold dark:bg-zinc-900/40'>
                        {estadoEspecial.label}
                    </span>
                    <span>{estadoEspecial.description}</span>
                </div>
            )}
        </div>
    );
};

export default CicloVidaContrato;
