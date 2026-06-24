import classNames from 'classnames';

// Todos los pasos en orden. terminado, anulado y descartado son estados finales alternativos.
const ESTADOS_CICLO = [
    { key: 'borrador', label: 'Borrador' },
    { key: 'pendiente_aprobacion', label: 'Pend. aprobacion' },
    { key: 'vigente', label: 'Vigente' },
    { key: 'vencido', label: 'Vencido' },
    { key: 'terminado', label: 'Terminado' },
    { key: 'anulado', label: 'Anulado' },
    { key: 'descartado', label: 'Descartado' },
] as const;

// Orden lineal principal: borrador -> pendiente_aprobacion -> vigente -> vencido -> terminado
// anulado: solo desde vigente (acto grave)
// descartado: desde borrador o pendiente_aprobacion (rechazo administrativo)
const ORDEN_PRINCIPAL = ['borrador', 'pendiente_aprobacion', 'vigente', 'vencido', 'terminado'];

interface ICicloVidaContratoLaboralProps {
    estado: string;
    rechazado?: boolean;
}

const CheckIcon = () => (
    <svg className='h-3 w-3' fill='none' viewBox='0 0 24 24' strokeWidth={2.5} stroke='currentColor'>
        <path strokeLinecap='round' strokeLinejoin='round' d='M4.5 12.75l6 6 9-13.5' />
    </svg>
);

const XIcon = () => (
    <svg className='h-3 w-3' fill='none' viewBox='0 0 24 24' strokeWidth={2.5} stroke='currentColor'>
        <path strokeLinecap='round' strokeLinejoin='round' d='M6 18 18 6M6 6l12 12' />
    </svg>
);

const CicloVidaContratoLaboral = ({ estado, rechazado = false }: ICicloVidaContratoLaboralProps) => {
    const est = estado.toLowerCase();
    const esAnulado = est === 'anulado';
    const esDescartado = est === 'descartado';
    const esVencido = est === 'vencido';
    const esAnuladoPorRechazo = esAnulado && rechazado;

    // Para el stepper, el indice del paso activo en el orden principal
    const indiceEnOrden = ORDEN_PRINCIPAL.indexOf(est);

    // Anulado, Descartado y Vencido solo aparecen cuando el contrato está en ese estado
    const pasosMostrar = ESTADOS_CICLO.filter((paso) => {
        if (paso.key === 'anulado') return esAnulado;
        if (paso.key === 'descartado') return esDescartado;
        if (paso.key === 'vencido') return esVencido;
        return true;
    });

    return (
        <div className='flex flex-wrap items-center justify-center gap-1 sm:gap-2'>
            {pasosMostrar.map((paso, i) => {
                const esMismoEstado = paso.key === est;

                let esActivo = false;
                let esCompletado = false;
                let esFuturo = false;
                let esError = false;

                if (esAnuladoPorRechazo) {
                    // Anulado por rechazo del empleador: vigente y terminado nunca se alcanzaron
                    if (paso.key === 'anulado') {
                        esActivo = true;
                    } else if (paso.key === 'vigente' || paso.key === 'terminado') {
                        esError = true;
                    } else if (paso.key === 'descartado') {
                        esFuturo = true;
                    } else {
                        esCompletado = true;
                    }
                } else if (esAnulado) {
                    // Anulado manualmente desde vigente
                    if (paso.key === 'anulado') {
                        esActivo = true;
                    } else if (paso.key === 'terminado' || paso.key === 'descartado') {
                        esFuturo = true;
                    } else {
                        esCompletado = true;
                    }
                } else if (esDescartado) {
                    // Descartado administrativamente desde borrador/pendiente
                    if (paso.key === 'descartado') {
                        esActivo = true;
                    } else if (paso.key === 'borrador' || paso.key === 'pendiente_aprobacion') {
                        esCompletado = true;
                    } else {
                        esFuturo = true;
                    }
                } else {
                    const indicePaso = ORDEN_PRINCIPAL.indexOf(paso.key);
                    if (paso.key === 'anulado' || paso.key === 'descartado') {
                        esFuturo = true;
                    } else if (esMismoEstado) {
                        esActivo = true;
                    } else if (indicePaso !== -1 && indiceEnOrden !== -1 && indicePaso < indiceEnOrden) {
                        esCompletado = true;
                    } else {
                        esFuturo = true;
                    }
                }

                // Color de la linea conectora antes de este paso
                const lineaAnteriorCompletada = (() => {
                    if (i === 0) return false;
                    const pasoAnterior = pasosMostrar[i - 1];
                    if (esAnulado) {
                        return pasoAnterior.key !== 'terminado' && pasoAnterior.key !== 'descartado';
                    }
                    if (esDescartado) {
                        // Solo la linea borrador→pendiente esta completada
                        return pasoAnterior.key === 'borrador';
                    }
                    const indiceAnterior = ORDEN_PRINCIPAL.indexOf(pasoAnterior.key);
                    if (pasoAnterior.key === 'anulado' || pasoAnterior.key === 'descartado') return false;
                    return indiceAnterior !== -1 && indiceEnOrden !== -1 && indiceAnterior < indiceEnOrden;
                })();

                // Linea roja cuando el rechazo la conecta con un paso no alcanzado
                const esLineaError =
                    esAnuladoPorRechazo &&
                    (paso.key === 'vigente' || paso.key === 'terminado' || paso.key === 'anulado');

                return (
                    <div key={paso.key} className='flex items-center gap-1 sm:gap-2'>
                        {i > 0 && (
                            <div
                                className={classNames(
                                    'hidden h-0.5 w-4 sm:block sm:w-6',
                                    {
                                        'bg-red-500': esLineaError,
                                        'bg-blue-500': !esLineaError && lineaAnteriorCompletada,
                                        'bg-zinc-300 dark:bg-zinc-600': !esLineaError && !lineaAnteriorCompletada,
                                    },
                                )}
                            />
                        )}
                        <div
                            className={classNames(
                                'flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap',
                                {
                                    'bg-blue-500 text-white ring-2 ring-blue-300 dark:ring-blue-700':
                                        esActivo && !esAnuladoPorRechazo && !esDescartado && !esVencido,
                                    'bg-red-500 text-white ring-2 ring-red-300 dark:ring-red-700':
                                        esActivo && (esAnuladoPorRechazo || esVencido),
                                    'bg-zinc-400 text-white ring-2 ring-zinc-300 dark:ring-zinc-600':
                                        esActivo && esDescartado,
                                    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300': esCompletado,
                                    'bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500': esFuturo,
                                    'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400': esError,
                                },
                            )}>
                            {esCompletado && <CheckIcon />}
                            {esError && <XIcon />}
                            {paso.label}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default CicloVidaContratoLaboral;
