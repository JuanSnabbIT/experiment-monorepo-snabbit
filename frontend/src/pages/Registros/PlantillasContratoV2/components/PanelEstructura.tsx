import {
    IOrdenBloqueTransversalPlantilla,
    ISeccionPlantillaV2 as ISeccionPlantilla,
} from '@/interface/plantillaContratoV2.interface';
import { useState } from 'react';
import { toRoman } from './PanelDocumento';

interface IPanelEstructuraProps {
    secciones: ISeccionPlantilla[];
    seccionActivaId: number | null;
    onSelectSeccion: (seccion: ISeccionPlantilla) => void;
    onNuevaSeccion: () => void;
    onReordenarSecciones?: (secciones: ISeccionPlantilla[]) => void;
    bloques?: IOrdenBloqueTransversalPlantilla[];
}

type TItemEstructura =
    | { kind: 'seccion'; orden: number; data: ISeccionPlantilla }
    | { kind: 'bloque'; orden: number; data: IOrdenBloqueTransversalPlantilla };

// Secciones que reciben numeracion romana en el indice (alineado con TIPOS_CON_HEADING de PanelDocumento)
const TIPOS_CON_NUMERO = ['clausula', 'condiciones_generales', 'identificacion_cliente'];

const PanelEstructura = ({
    secciones,
    seccionActivaId,
    onSelectSeccion,
    onNuevaSeccion,
    onReordenarSecciones,
    bloques = [],
}: IPanelEstructuraProps) => {
    // ─── Lista unificada: secciones + bloques ordenados por posición ────────
    const items: TItemEstructura[] = [
        ...secciones.map((s): TItemEstructura => ({ kind: 'seccion', orden: s.orden, data: s })),
        ...bloques.map((b): TItemEstructura => ({ kind: 'bloque', orden: b.posicion, data: b })),
    ].sort((a, b) => a.orden - b.orden);
    // ─── Estado drag-and-drop ────────────────────────────────────────────────
    const [draggedId, setDraggedId] = useState<number | null>(null);
    const [dragOverId, setDragOverId] = useState<number | null>(null);
    const [dragPosition, setDragPosition] = useState<'before' | 'after'>('after');

    // Calcular numeracion (solo clausula, condiciones_generales, identificacion_cliente)
    const indexables = secciones.filter((s) => TIPOS_CON_NUMERO.includes(s.tipo));
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
                <button
                    type='button'
                    onClick={onNuevaSeccion}
                    title='Añadir cláusula'
                    className='flex h-6 w-6 items-center justify-center rounded-md border border-zinc-200 text-zinc-400 transition-colors hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600 dark:border-zinc-700 dark:text-zinc-500 dark:hover:border-blue-500 dark:hover:bg-blue-950/30 dark:hover:text-blue-400'>
                    <svg className='h-3.5 w-3.5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M12 4v16m8-8H4' />
                    </svg>
                </button>
            </div>

            {/* ── Lista de secciones ───────────────────────────────────────────── */}
            <div className='min-h-0 flex-1 overflow-y-auto py-1'>
                {items.length === 0 ? (
                    <p className='px-4 py-6 text-center text-xs text-zinc-400 dark:text-zinc-500'>
                        Sin secciones. Agrega la primera.
                    </p>
                ) : (
                    items.map((item) => {
                        if (item.kind === 'bloque') {
                            const bloque = item.data;
                            return (
                                <div
                                    key={`bloque-${bloque.id}`}
                                    className='flex w-full items-center border-l-[3px] border-transparent px-4 py-2.5'>
                                    <span className='mr-2 shrink-0 text-[12px]' title='Bloque transversal'>
                                        🔒
                                    </span>
                                    <span className='min-w-0 flex-1 truncate text-[13px] italic text-zinc-400 dark:text-zinc-500'>
                                        {bloque.bloque_detalle?.titulo ?? 'Bloque transversal'}
                                    </span>
                                </div>
                            );
                        }

                        const seccion = item.data;
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
{/* Numero romano (solo clausulas/condiciones/identificacion) o icono de tipo */}
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
                    <span
                        className={[
                            'mr-2 shrink-0 text-[11px] font-bold',
                            isActive
                                ? 'text-blue-600 dark:text-blue-400'
                                : 'text-zinc-400 dark:text-zinc-500',
                        ].join(' ')}>
                        {seccion.tipo === 'salto_pagina'
                            ? '⏎'
                            : seccion.tipo === 'subtitulo'
                              ? 'T₂'
                              : seccion.tipo === 'firmas'
                                ? '✍'
                                : 'T'}
                                    </span>
                                )}

                                {/* Titulo de la seccion (salto_pagina muestra texto fijo) */}
                                <span
                                    className={[
                                        'min-w-0 flex-1 truncate text-[13px]',
                                        seccion.tipo === 'salto_pagina'
                                            ? 'italic text-zinc-400 dark:text-zinc-500'
                                            : isActive
                                              ? 'font-semibold text-blue-700 dark:text-blue-300'
                                              : 'font-normal text-zinc-700 dark:text-zinc-300',
                                    ].join(' ')}>
                                    {seccion.tipo === 'salto_pagina' ? '— Salto de página —' : seccion.titulo}
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

        </div>
    );
};

export default PanelEstructura;
