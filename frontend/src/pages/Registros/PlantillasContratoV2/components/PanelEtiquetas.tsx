import { IEtiquetaPlantilla } from '@/interface/plantillaContrato.interface';
import { useEffect, useMemo, useState } from 'react';

interface IPanelEtiquetasProps {
    etiquetas: IEtiquetaPlantilla[];
    onInsertarEtiqueta: (clave: string) => void;
    onWrapSelection?: (abre: string, cierra: string) => void;
    editingEnabled: boolean;
}

const CATEGORIA_LABELS: Record<string, string> = {
    cliente: 'Cliente',
    proveedor: 'Proveedor',
    contrato: 'Contrato',
    servicio: 'Servicio',
    economico: 'Economico',
    custom: 'Personalizada',
};

// Iconos SVG para las herramientas de formato
const IconoTabla = () => (
    <svg className='h-4 w-4 opacity-60' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
        <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={1.5}
            d='M3 10h18M3 6h18M3 14h18M3 18h18M8 6v12M16 6v12'
        />
    </svg>
);

const IconoPagina = () => (
    <svg className='h-4 w-4 opacity-60' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
        <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={1.5}
            d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
        />
    </svg>
);

// Iconos alineacion (representacion simplificada)
const ICONOS_ALINEACION = [
    {
        align: 'left',
        title: 'Alinear izquierda',
        path: 'M4 6h16M4 12h10M4 18h14',
    },
    {
        align: 'center',
        title: 'Centrar',
        path: 'M4 6h16M7 12h10M6 18h12',
    },
    {
        align: 'right',
        title: 'Alinear derecha',
        path: 'M4 6h16M10 12h10M6 18h14',
    },
    {
        align: 'justify',
        title: 'Justificar',
        path: 'M4 6h16M4 12h16M4 18h16',
    },
];

const PanelEtiquetas = ({
    etiquetas,
    onInsertarEtiqueta,
    onWrapSelection,
    editingEnabled,
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

    useEffect(() => {
        setOpenCategorias((prev) => {
            const next: Record<string, boolean> = {};
            let changed = Object.keys(prev).length !== categoryKeys.length;

            categoryKeys.forEach((cat) => {
                const value = cat in prev ? prev[cat] : true;
                next[cat] = value;
                if (!changed && prev[cat] !== value) changed = true;
            });

            return changed ? next : prev;
        });
    }, [categoryKeys]);

    const btnBase = [
        'flex items-center justify-center rounded border text-xs font-medium transition-colors',
        'focus:outline-none focus:ring-1 focus:ring-blue-300',
    ].join(' ');

    const btnEnabled =
        'border-zinc-200 bg-white text-zinc-700 hover:border-blue-300 hover:bg-blue-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-blue-500 dark:hover:bg-blue-950/20';
    const btnDisabled =
        'cursor-not-allowed border-zinc-100 bg-zinc-50 text-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-600';

    return (
        <div className='flex h-full flex-col overflow-hidden border-l border-zinc-200 dark:border-zinc-700'>
            {/* ── Header ─────────────────────────────────────────────────────── */}
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

            {/* ── Lista de etiquetas por categoria ────────────────────────────── */}
            <div className='flex-1 overflow-y-auto p-3'>
                {Object.entries(grouped).map(([categoria, items]) => {
                    const isOpen = openCategorias[categoria] ?? true;
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
                                <span>{CATEGORIA_LABELS[categoria] ?? categoria}</span>
                                <span className='flex items-center gap-1 text-[11px] text-zinc-400'>
                                    {items.length}
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
                                <div className='mt-2 space-y-1'>
                                    {items.map((et) => (
                                        <div
                                            key={et.id}
                                            draggable={editingEnabled}
                                            onDragStart={(e) => {
                                                if (!editingEnabled) return;
                                                e.dataTransfer.setData('text/plain', `[${et.clave}]`);
                                                e.dataTransfer.effectAllowed = 'copy';
                                            }}
                                            className={[
                                                'flex items-center justify-between rounded-lg border px-3 py-2 text-xs transition-all',
                                                editingEnabled
                                                    ? 'cursor-grab border-zinc-200 bg-white text-zinc-700 hover:border-blue-300 hover:bg-blue-50 active:cursor-grabbing dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-blue-500'
                                                    : 'border-zinc-100 bg-zinc-50 text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-600',
                                            ].join(' ')}>
                                            <span className='min-w-0 truncate font-mono text-[11px]'>
                                                [{et.clave}]
                                            </span>
                                            <button
                                                type='button'
                                                disabled={!editingEnabled}
                                                onClick={() =>
                                                    editingEnabled && onInsertarEtiqueta(et.clave)
                                                }
                                                title={`Insertar ${et.nombre_display}`}
                                                className={[
                                                    'ml-2 flex h-5 w-5 shrink-0 items-center justify-center rounded text-[13px] font-bold transition-colors',
                                                    editingEnabled
                                                        ? 'bg-zinc-100 text-zinc-500 hover:bg-blue-100 hover:text-blue-600 dark:bg-zinc-700 dark:text-zinc-400 dark:hover:bg-blue-900 dark:hover:text-blue-300'
                                                        : 'cursor-not-allowed bg-zinc-100 text-zinc-300 dark:bg-zinc-800 dark:text-zinc-600',
                                                ].join(' ')}>
                                                +
                                            </button>
                                        </div>
                                    ))}
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

            {/* ── Separador ───────────────────────────────────────────────────── */}
            <div className='mx-3 border-t border-zinc-200 dark:border-zinc-700' />

            {/* ── Herramientas de edicion ──────────────────────────────────────── */}
            <div className='shrink-0 p-3'>
                <p className='mb-2.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400'>
                    <span className='h-1.5 w-1.5 rounded-full bg-blue-500' />
                    Herramientas de edicion
                </p>

                {/* Fila 1: Formato de texto B I U A */}
                <div className='mb-2 flex gap-1.5'>
                    {[
                        { label: 'B', abre: '<strong>', cierra: '</strong>', title: 'Negrita', cls: 'font-bold' },
                        { label: 'I', abre: '<em>', cierra: '</em>', title: 'Cursiva', cls: 'italic' },
                        { label: 'U', abre: '<u>', cierra: '</u>', title: 'Subrayado', cls: 'underline' },
                        { label: 'A', abre: '<span style="color:#2563eb">', cierra: '</span>', title: 'Color texto', cls: 'text-blue-600' },
                    ].map(({ label, abre, cierra, title, cls }) => (
                        <button
                            key={label}
                            type='button'
                            disabled={!editingEnabled}
                            onClick={() =>
                                editingEnabled && onWrapSelection?.(abre, cierra)
                            }
                            title={title}
                            className={[
                                btnBase,
                                'h-8 w-8',
                                cls,
                                editingEnabled ? btnEnabled : btnDisabled,
                            ].join(' ')}>
                            {label}
                        </button>
                    ))}
                </div>

                {/* Fila 2: Fuente y tamano */}
                <div className='mb-2 flex gap-1.5'>
                    <select
                        disabled={!editingEnabled}
                        className={[
                            'flex-1 rounded border px-2 py-1.5 text-[11px]',
                            editingEnabled
                                ? 'border-zinc-200 bg-white text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300'
                                : 'cursor-not-allowed border-zinc-100 bg-zinc-50 text-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-600',
                        ].join(' ')}>
                        <option>Inter (Normal)</option>
                        <option>Arial</option>
                        <option>Times New Roman</option>
                    </select>
                    <select
                        disabled={!editingEnabled}
                        className={[
                            'w-16 rounded border px-2 py-1.5 text-[11px]',
                            editingEnabled
                                ? 'border-zinc-200 bg-white text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300'
                                : 'cursor-not-allowed border-zinc-100 bg-zinc-50 text-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-600',
                        ].join(' ')}>
                        <option>12px</option>
                        <option>14px</option>
                        <option>16px</option>
                        <option>18px</option>
                    </select>
                </div>

                {/* Fila 3: Alineacion */}
                <div className='mb-2 flex gap-1.5'>
                    {ICONOS_ALINEACION.map(({ align, title, path }) => (
                        <button
                            key={align}
                            type='button'
                            disabled={!editingEnabled}
                            onClick={() =>
                                editingEnabled &&
                                onWrapSelection?.(
                                    `<p style="text-align:${align}">`,
                                    '</p>',
                                )
                            }
                            title={title}
                            className={[
                                btnBase,
                                'h-8 flex-1',
                                editingEnabled ? btnEnabled : btnDisabled,
                            ].join(' ')}>
                            <svg
                                className='h-3.5 w-3.5'
                                fill='none'
                                viewBox='0 0 24 24'
                                stroke='currentColor'>
                                <path
                                    strokeLinecap='round'
                                    strokeLinejoin='round'
                                    strokeWidth={2}
                                    d={path}
                                />
                            </svg>
                        </button>
                    ))}
                </div>

                {/* Insertar Tabla */}
                <div className='space-y-1.5'>
                    <button
                        type='button'
                        disabled={!editingEnabled}
                        onClick={() =>
                            editingEnabled &&
                            onInsertarEtiqueta(
                                '\n| Columna 1 | Columna 2 | Columna 3 |\n|---|---|---|\n| Dato 1 | Dato 2 | Dato 3 |\n',
                            )
                        }
                        className={[
                            'flex w-full items-center justify-between rounded border px-3 py-2 text-[12px] transition-colors',
                            editingEnabled
                                ? 'border-zinc-200 bg-white text-zinc-700 hover:border-blue-300 hover:bg-blue-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300'
                                : 'cursor-not-allowed border-zinc-100 bg-zinc-50 text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-600',
                        ].join(' ')}>
                        <span>Insertar Tabla</span>
                        <IconoTabla />
                    </button>

                    <button
                        type='button'
                        disabled={!editingEnabled}
                        onClick={() =>
                            editingEnabled && onInsertarEtiqueta('\n[salto_pagina]\n')
                        }
                        className={[
                            'flex w-full items-center justify-between rounded border px-3 py-2 text-[12px] transition-colors',
                            editingEnabled
                                ? 'border-zinc-200 bg-white text-zinc-700 hover:border-blue-300 hover:bg-blue-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300'
                                : 'cursor-not-allowed border-zinc-100 bg-zinc-50 text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-600',
                        ].join(' ')}>
                        <span>Salto de pagina</span>
                        <IconoPagina />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PanelEtiquetas;
