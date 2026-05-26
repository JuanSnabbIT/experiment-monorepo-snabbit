import { ISeccionPlantilla } from '@/interface/plantillaContrato.interface';
import { useState } from 'react';
import { toRoman } from './PanelDocumento';

interface IPanelEstructuraProps {
    secciones: ISeccionPlantilla[];
    seccionActivaId: number | null;
    onSelectSeccion: (seccion: ISeccionPlantilla) => void;
    onNuevaSeccion: () => void;
    onReordenarSecciones?: (secciones: ISeccionPlantilla[]) => void;
}

// Secciones que reciben numeracion romana en el indice (todo excepto 'titulo')
const TIPOS_NO_NUMERADOS = ['titulo'];

const PanelEstructura = ({
    secciones,
    seccionActivaId,
    onSelectSeccion,
    onNuevaSeccion,
    onReordenarSecciones,
}: IPanelEstructuraProps) => {
    // ─── Estado drag-and-drop ────────────────────────────────────────────────
    const [draggedId, setDraggedId] = useState<number | null>(null);
    const [dragOverId, setDragOverId] = useState<number | null>(null);
    const [dragPosition, setDragPosition] = useState<'before' | 'after'>('after');

    // Calcular numeracion (excluye tipo 'titulo')
    const indexables = secciones.filter((s) => !TIPOS_NO_NUMERADOS.includes(s.tipo));
    const getRomanNum = (id: number): string | null => {
        const idx = indexables.findIndex((s) => s.id === id);
        return idx >= 0 ? toRoman(idx + 1) : null;
    };

    // ─── Handlers D&D ───────────────────────────────────────────────────────
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, id: number) => {
        setDraggedId(id);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(id));
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>, id: number) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (id === draggedId) return;
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setDragOverId(id);
        setDragPosition(e.clientY < rect.top + rect.height / 2 ? 'before' : 'after');
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setDragOverId(null);
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetId: number) => {
        e.preventDefault();
        if (draggedId === null || draggedId === targetId) {
            setDraggedId(null);
            setDragOverId(null);
            return;
        }
        const newSecciones = [...secciones];
        const fromIndex = newSecciones.findIndex((s) => s.id === draggedId);
        const [draggedItem] = newSecciones.splice(fromIndex, 1);
        let toIndex = newSecciones.findIndex((s) => s.id === targetId);
        if (dragPosition === 'after') toIndex += 1;
        newSecciones.splice(toIndex, 0, draggedItem);
        onReordenarSecciones?.(newSecciones);
        setDraggedId(null);
        setDragOverId(null);
    };

    const handleDragEnd = () => {
        setDraggedId(null);
        setDragOverId(null);
    };

    return (
        <div className='flex h-full flex-col overflow-hidden border-r border-zinc-200 dark:border-zinc-700'>
            {/* ── Header ─────────────────────────────────────────────────────── */}
            <div className='flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900'>
                <span className='text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400'>
                    Estructura
                </span>
                {/* Icono de orden */}
                <svg
                    className='h-4 w-4 text-zinc-400'
                    fill='none'
                    viewBox='0 0 24 24'
                    stroke='currentColor'>
                    <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4'
                    />
                </svg>
            </div>

            {/* ── Lista de secciones ───────────────────────────────────────────── */}
            <div className='flex-1 overflow-y-auto py-1'>
                {secciones.length === 0 ? (
                    <p className='px-4 py-6 text-center text-xs text-zinc-400 dark:text-zinc-500'>
                        Sin secciones. Agrega la primera.
                    </p>
                ) : (
                    secciones.map((seccion) => {
                        const isActive = seccion.id === seccionActivaId;
                        const isDragging = seccion.id === draggedId;
                        const isOverBefore = seccion.id === dragOverId && dragPosition === 'before';
                        const isOverAfter = seccion.id === dragOverId && dragPosition === 'after';
                        const romanNum = getRomanNum(seccion.id);

                        return (
                            <div
                                key={seccion.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, seccion.id)}
                                onDragOver={(e) => handleDragOver(e, seccion.id)}
                                onDragLeave={handleDragLeave}
                                onDrop={(e) => handleDrop(e, seccion.id)}
                                onDragEnd={handleDragEnd}
                                className={[
                                    'relative',
                                    isDragging ? 'opacity-40' : '',
                                    isOverBefore
                                        ? 'border-t-2 border-blue-500 dark:border-blue-400'
                                        : 'border-t-2 border-transparent',
                                    isOverAfter
                                        ? 'border-b-2 border-blue-500 dark:border-blue-400'
                                        : 'border-b-2 border-transparent',
                                ].join(' ')}>
                                <button
                                    type='button'
                                    onClick={() => onSelectSeccion(seccion)}
                                    className={[
                                        'group flex w-full items-center border-l-[3px] px-4 py-2.5 text-left transition-colors',
                                        isActive
                                            ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-950/30'
                                            : 'border-transparent hover:bg-zinc-50 dark:hover:bg-zinc-800/60',
                                    ].join(' ')}>
                                    {/* Icono de arrastre — visible al hacer hover */}
                                    <span className='mr-1.5 shrink-0 cursor-grab opacity-0 transition-opacity group-hover:opacity-40 active:cursor-grabbing'>
                                        <svg
                                            className='h-3 w-3 text-zinc-500'
                                            fill='currentColor'
                                            viewBox='0 0 24 24'>
                                            <circle cx='9' cy='5' r='1.5' />
                                            <circle cx='9' cy='12' r='1.5' />
                                            <circle cx='9' cy='19' r='1.5' />
                                            <circle cx='15' cy='5' r='1.5' />
                                            <circle cx='15' cy='12' r='1.5' />
                                            <circle cx='15' cy='19' r='1.5' />
                                        </svg>
                                    </span>
                                {/* Numero romano */}
                                {romanNum ? (
                                    <span
                                        className={[
                                            'mr-2 shrink-0 text-[12px] font-semibold',
                                            isActive
                                                ? 'text-blue-600 dark:text-blue-400'
                                                : 'text-zinc-400 dark:text-zinc-500',
                                        ].join(' ')}>
                                        {romanNum}.
                                    </span>
                                ) : (
                                    /* Seccion titulo: icono T */
                                    <span
                                        className={[
                                            'mr-2 shrink-0 text-[11px] font-bold',
                                            isActive
                                                ? 'text-blue-600 dark:text-blue-400'
                                                : 'text-zinc-400 dark:text-zinc-500',
                                        ].join(' ')}>
                                        T
                                    </span>
                                )}

                                {/* Titulo de la seccion */}
                                <span
                                    className={[
                                        'min-w-0 flex-1 truncate text-[13px]',
                                        isActive
                                            ? 'font-semibold text-blue-700 dark:text-blue-300'
                                            : 'font-normal text-zinc-700 dark:text-zinc-300',
                                    ].join(' ')}>
                                    {seccion.titulo}
                                </span>

                                {/* Indicadores de estado */}
                                <div className='ml-1.5 flex shrink-0 flex-col items-end gap-1'>
                                    {seccion.es_obligatoria && (
                                        <span
                                            className='h-1.5 w-1.5 rounded-full bg-amber-400'
                                            title='Obligatoria'
                                        />
                                    )}
                                    {!seccion.es_editable_en_contrato && (
                                        <span
                                            className='h-1.5 w-1.5 rounded-full bg-zinc-400'
                                            title='Bloque fijo'
                                        />
                                    )}
                                </div>
                                </button>
                            </div>
                        );
                    })
                )}
            </div>

            {/* ── Footer: boton añadir clausula ───────────────────────────────── */}
            <div className='border-t border-zinc-200 p-3 dark:border-zinc-700'>
                <button
                    type='button'
                    onClick={onNuevaSeccion}
                    className='flex w-full items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-zinc-300 py-2 text-[12px] font-medium text-zinc-500 transition-colors hover:border-blue-400 hover:text-blue-600 dark:border-zinc-600 dark:text-zinc-400 dark:hover:border-blue-500 dark:hover:text-blue-400'>
                    <span className='text-[14px] font-bold leading-none'>+</span>
                    Anadir Clausula
                </button>
            </div>
        </div>
    );
};

export default PanelEstructura;
