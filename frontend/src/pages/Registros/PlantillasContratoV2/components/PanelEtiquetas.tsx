import { IEtiquetaPlantilla } from '@/interface/plantillaContrato.interface'; // V1 compat — mismo shape
import { CATEGORIA_CHIP_SOLIDO, CATEGORIA_DEFAULT, CATEGORIA_DOT_CLASS } from '@/utils/categoriaEtiquetaColores';
import { useEffect, useMemo, useState } from 'react';

interface IPanelEtiquetasProps {
    etiquetas: IEtiquetaPlantilla[];
    onInsertarEtiqueta: (clave: string) => void;
    onWrapSelection?: (abre: string, cierra: string) => void;
    editingEnabled: boolean;
    /** false cuando un contenedor externo (ej. el selector de pestañas de EditorDocumentoV29) ya muestra su propio encabezado. */
    mostrarHeaderPropio?: boolean;
}

const CATEGORIA_LABELS: Record<string, string> = {
    cliente: 'Cliente',
    proveedor: 'Proveedor',
    contrato: 'Contrato',
    servicio: 'Servicio',
    economico: 'Económico',
    trabajador: 'Datos del Trabajador',
    empleador: 'Empleador',
    licencia: 'Licencia',
    custom: 'Personalizada',
};

const PanelEtiquetas = ({
    etiquetas,
    onInsertarEtiqueta,
    editingEnabled,
    mostrarHeaderPropio = true,
}: IPanelEtiquetasProps) => {
    // Agrupar por categoria
    const grouped = useMemo(
        () =>
            etiquetas.reduce<Record<string, IEtiquetaPlantilla[]>>((acc, et) => {
                const cat = et.categoria ?? 'custom';
                if (!acc[cat]) acc[cat] = [];
                acc[cat].push(et);
                return acc;
            }, {}),
        [etiquetas],
    );

    const categoryKeys = useMemo(() => Object.keys(grouped), [grouped]);
    const [openCategorias, setOpenCategorias] = useState<Record<string, boolean>>({});
    const [busqueda, setBusqueda] = useState('');

    // Expandir categorias automaticamente mientras se busca
    useEffect(() => {
        if (busqueda) {
            setOpenCategorias(() => {
                const next: Record<string, boolean> = {};
                categoryKeys.forEach((cat) => { next[cat] = true; });
                return next;
            });
        }
    }, [busqueda, categoryKeys]);

    useEffect(() => {
        setOpenCategorias((prev) => {
            const next: Record<string, boolean> = {};
            let changed = Object.keys(prev).length !== categoryKeys.length;
            categoryKeys.forEach((cat) => {
                const value = cat in prev ? prev[cat] : false;
                next[cat] = value;
                if (!changed && prev[cat] !== value) changed = true;
            });
            return changed ? next : prev;
        });
    }, [categoryKeys]);

    return (
        <div className={`flex h-full flex-col overflow-hidden ${mostrarHeaderPropio ? 'border-l border-zinc-200 dark:border-zinc-700' : ''}`}>
            {/* ── Header ─────────────────────────────────────────────────────── */}
            {mostrarHeaderPropio && (
                <div className='flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900'>
                    <span className='text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400'>
                        Etiquetas disponibles
                    </span>
                    <svg
                        className='h-4 w-4 text-zinc-400'
                        fill='none'
                        viewBox='0 0 24 24'
                        stroke='currentColor'>
                        <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth={2}
                            d='M19 9l-7 7-7-7'
                        />
                    </svg>
                </div>
            )}

            {/* ── Buscador ────────────────────────────────────────────────────── */}
            <div className='shrink-0 border-b border-zinc-200 px-3 py-2 dark:border-zinc-700'>
                <input
                    type='text'
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder='Buscar etiqueta...'
                    className='w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-700 outline-none placeholder:text-zinc-400 focus:border-blue-400 focus:ring-1 focus:ring-blue-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:placeholder:text-zinc-600 dark:focus:border-blue-500'
                />
            </div>

            {/* ── Lista de etiquetas por categoria ────────────────────────────── */}
            <div className='min-h-0 flex-1 overflow-y-auto p-3'>
                {Object.entries(grouped).map(([categoria, items]) => {
                    const filteredItems = busqueda
                        ? items.filter(
                              (et) =>
                                  et.nombre_display.toLowerCase().includes(busqueda.toLowerCase()) ||
                                  et.clave.toLowerCase().includes(busqueda.toLowerCase()),
                          )
                        : items;
                    if (filteredItems.length === 0) return null;
                    const isOpen = openCategorias[categoria] ?? false;
                    return (
                        <div key={categoria} className='mb-4'>
                            <button
                                type='button'
                                onClick={() =>
                                    setOpenCategorias((prev) => ({
                                        ...prev,
                                        [categoria]: !isOpen,
                                    }))
                                }
                                className='flex w-full items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 transition-colors hover:border-blue-300 hover:bg-blue-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:border-blue-500 dark:hover:bg-zinc-950'>
                                <span className='flex items-center gap-2'>
                                    <span
                                        className={`h-2 w-2 shrink-0 rounded-full ${CATEGORIA_DOT_CLASS[categoria] ?? CATEGORIA_DOT_CLASS[CATEGORIA_DEFAULT]}`}
                                    />
                                    {CATEGORIA_LABELS[categoria] ?? categoria}
                                </span>
                                <span className='flex items-center gap-1 text-[11px] text-zinc-400'>
                                    {filteredItems.length}
                                    <svg
                                        className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                                        viewBox='0 0 24 24'
                                        fill='none'
                                        stroke='currentColor'
                                        strokeWidth='2'
                                        strokeLinecap='round'
                                        strokeLinejoin='round'>
                                        <polyline points='6 9 12 15 18 9' />
                                    </svg>
                                </span>
                            </button>
                            {isOpen && (
                                <div className='mt-2 flex flex-col items-start gap-1.5'>
                                    {filteredItems.map((et) => {
                                        const chipSolido = CATEGORIA_CHIP_SOLIDO[categoria] ?? CATEGORIA_CHIP_SOLIDO[CATEGORIA_DEFAULT];
                                        return (
                                            <div
                                                key={et.id}
                                                draggable={editingEnabled}
                                                onDragStart={(e) => {
                                                    if (!editingEnabled) return;
                                                    e.dataTransfer.setData('text/plain', `[${et.clave}]`);
                                                    e.dataTransfer.effectAllowed = 'copy';
                                                }}
                                                className={[
                                                    'inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold transition-all',
                                                    editingEnabled
                                                        ? `cursor-grab active:cursor-grabbing ${chipSolido}`
                                                        : 'cursor-not-allowed border-zinc-100 bg-zinc-50 text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-600',
                                                ].join(' ')}>
                                                [{et.clave}]
                                                <button
                                                    type='button'
                                                    disabled={!editingEnabled}
                                                    onClick={() =>
                                                        editingEnabled && onInsertarEtiqueta(et.clave)
                                                    }
                                                    title={`Insertar ${et.nombre_display}`}
                                                    className='ml-0.5 leading-none opacity-60 hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-40'>
                                                    +
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}

                {etiquetas.length === 0 && (
                    <p className='py-6 text-center text-xs text-zinc-400 dark:text-zinc-500'>
                        No hay etiquetas configuradas.
                    </p>
                )}

                {!editingEnabled && etiquetas.length > 0 && (
                    <p className='mt-1 rounded-lg border border-zinc-100 bg-zinc-50 p-3 text-center text-[11px] leading-snug text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900'>
                        Haz clic en "Editar" sobre un bloque para habilitar las etiquetas.
                    </p>
                )}
            </div>
        </div>
    );
};

export default PanelEtiquetas;
