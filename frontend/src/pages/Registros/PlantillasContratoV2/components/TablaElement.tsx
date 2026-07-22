import type { TNodoTabla } from '@/interface/plantillaContratoV2.interface';
import { celdaTablaVacia, filaTablaVacia } from '@/utils/slatePlantillas';
import { confirmAlert } from '@/utils/sweetAlert';
import { ReactNode, useLayoutEffect, useRef, useState } from 'react';
import { Editor, Transforms } from 'slate';
import { ReactEditor, type RenderElementProps } from 'slate-react';

const ANCHO_MIN_COL = 40;

interface ITablaElementProps {
    attributes: RenderElementProps['attributes'];
    element: TNodoTabla;
    editor: Editor;
    isEditor: boolean;
    children: ReactNode;
    /** Offset de paginación (ver EditorDocumentoV29.tsx/renderElement) — solo
     *  tiene valor cuando esta tabla es un nodo top-level y el algoritmo de
     *  paginación decide que ahí arranca una página nueva. */
    cortePaddingTop?: number;
}

interface IMedidas {
    ancho: number;
    alto: number;
    /** top + alto de cada fila, relativo al wrap */
    filas: { top: number; alto: number }[];
    /** left + ancho de cada columna (leídos de la primera fila), relativo al wrap */
    cols: { left: number; ancho: number }[];
}

/**
 * Render de un nodo `tabla` (no-void — las celdas son editables). Se extrae a
 * un componente aparte, en vez de una rama más del renderElement del editor,
 * porque necesita hooks propios (useLayoutEffect/useState) para medir el DOM
 * y posicionar los controles de resize/agregar/eliminar por instancia de tabla.
 */
const TablaElement = ({ attributes, element, editor, isEditor, children, cortePaddingTop }: ITablaElementProps) => {
    const wrapRef = useRef<HTMLDivElement>(null);
    const [medidas, setMedidas] = useState<IMedidas | null>(null);

    // Remedir cuando cambia la cantidad de filas/columnas o sus anchos. El
    // contenido de texto dentro de una celda puede cambiar la altura de una
    // fila, pero eso ya dispara este efecto indirectamente al agregar/quitar
    // saltos de línea (cambia element.children.length de esa celda) — un caso
    // borde de fila que crece por texto largo sin cambiar de nodo no remide
    // hasta la próxima interacción estructural; aceptable para v1.
    useLayoutEffect(() => {
        if (!isEditor || !wrapRef.current) { setMedidas(null); return; }
        const table = wrapRef.current.querySelector('table');
        if (!table || table.rows.length === 0) return;
        const wrapRect = wrapRef.current.getBoundingClientRect();
        const tableRect = table.getBoundingClientRect();
        const filas = Array.from(table.rows).map((tr) => {
            const r = tr.getBoundingClientRect();
            return { top: r.top - wrapRect.top, alto: r.height };
        });
        const cols = Array.from(table.rows[0].cells).map((td) => {
            const r = td.getBoundingClientRect();
            return { left: r.left - wrapRect.left, ancho: r.width };
        });
        setMedidas({ ancho: tableRect.width, alto: tableRect.height, filas, cols });
    }, [isEditor, element.children.length, element.anchoColumnas.join(',')]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const path = () => ReactEditor.findPath(editor as ReactEditor, element as any);

    // Restaura selección + foco a un punto concreto tras mutar la tabla. Sin
    // esto, si la celda que tenía el foco se desmonta por el cambio estructural
    // (ej. una fila nueva insertada justo antes de ella corre su path), el
    // navegador mueve el foco al <div> raíz del editor completo y Slate termina
    // colapsando la selección a un punto por defecto (el final del documento) —
    // de ahí el salto visual a "la última línea de la página".
    //
    // El setTimeout(0) es necesario: ReactEditor.focus() sale sin hacer nada si
    // Slate cree que el editor YA está enfocado (IS_FOCUSED sigue en true pese a
    // que el DOM movió el foco por la mutación), y el DOM todavía no refleja la
    // fila/celda recién insertada en el mismo tick del evento — hay que esperar
    // a que React confirme el re-render antes de seleccionar/enfocar ahí.
    const reenfocar = (celdaPath: number[]) => {
        setTimeout(() => {
            try {
                const punto = Editor.start(editor, celdaPath);
                Transforms.select(editor, punto);
                ReactEditor.focus(editor);
            } catch { /* el path ya no existe (ej. se deshizo la operación) — ignorar */ }
        }, 0);
    };

    const agregarFila = (despuesDe: number) => {
        const cols = element.anchoColumnas.length;
        const tablaPath = path();
        const nuevaFilaPath = [...tablaPath, despuesDe + 1];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Transforms.insertNodes(editor, filaTablaVacia(cols) as any, { at: nuevaFilaPath });
        reenfocar([...nuevaFilaPath, 0]);
    };

    const eliminarFila = (idx: number) => {
        if (element.children.length <= 1) return; // no dejar la tabla sin filas
        const tablaPath = path();
        Transforms.removeNodes(editor, { at: [...tablaPath, idx] });
        const filaRestante = Math.min(idx, element.children.length - 2);
        reenfocar([...tablaPath, filaRestante, 0]);
    };

    // Agregar/quitar columna redistribuye anchoColumnas proporcionalmente para
    // que la suma total no cambie — con table-layout:fixed, el ancho final de
    // la tabla es el MAYOR entre el width del <table> y la suma de <col>
    // (spec CSS 2.1 §17.5.2); copiar el ancho de una columna existente para la
    // nueva hace que esa suma supere el ancho de la página y la tabla se
    // desborde (bug real encontrado al prototipar esto en un mockup).
    const agregarColumna = (despuesDe: number) => {
        const anchos = element.anchoColumnas;
        const total = anchos.reduce((a, b) => a + b, 0);
        const anchoNueva = Math.max(ANCHO_MIN_COL, Math.floor(total / (anchos.length + 1)));
        const factor = (total - anchoNueva) / total;
        const nuevosAnchos = anchos.map((w) => Math.max(ANCHO_MIN_COL, w * factor));
        nuevosAnchos.splice(despuesDe + 1, 0, anchoNueva);

        const tablaPath = path();
        Editor.withoutNormalizing(editor, () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            Transforms.setNodes(editor, { anchoColumnas: nuevosAnchos } as any, { at: tablaPath });
            element.children.forEach((_, filaIdx) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                Transforms.insertNodes(editor, celdaTablaVacia() as any, {
                    at: [...tablaPath, filaIdx, despuesDe + 1],
                });
            });
        });
        reenfocar([...tablaPath, 0, despuesDe + 1]);
    };

    const eliminarColumna = (idx: number) => {
        if (element.anchoColumnas.length <= 1) return; // no dejar la tabla sin columnas
        const anchos = element.anchoColumnas;
        const eliminado = anchos[idx];
        const restante = anchos.reduce((a, w, i) => (i === idx ? a : a + w), 0);
        const factor = (restante + eliminado) / restante;
        const nuevosAnchos = anchos.filter((_, i) => i !== idx).map((w) => w * factor);

        const tablaPath = path();
        Editor.withoutNormalizing(editor, () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            Transforms.setNodes(editor, { anchoColumnas: nuevosAnchos } as any, { at: tablaPath });
            element.children.forEach((_, filaIdx) => {
                Transforms.removeNodes(editor, { at: [...tablaPath, filaIdx, idx] });
            });
        });
        const colRestante = Math.min(idx, anchos.length - 2);
        reenfocar([...tablaPath, 0, colRestante]);
    };

    // Resize por drag: durante el arrastre solo se muta el DOM directamente
    // (ancho del <col>, sin pasar por Transforms) para que se sienta fluido —
    // recién en mouseup se commitea una sola vez a anchoColumnas, en vez de
    // una entrada de historial (undo) por cada pixel arrastrado.
    const iniciarResize = (e: React.MouseEvent, colIdx: number) => {
        e.preventDefault();
        const table = wrapRef.current?.querySelector('table');
        const wrap = wrapRef.current;
        if (!table || !wrap) return;
        const cols = table.querySelectorAll('col');
        const colA = cols[colIdx] as HTMLTableColElement;
        const colB = cols[colIdx + 1] as HTMLTableColElement;
        if (!colA || !colB) return;
        const anchoInicialA = colA.getBoundingClientRect().width;
        const anchoInicialB = colB.getBoundingClientRect().width;
        const xInicial = e.clientX;
        const resizer = e.currentTarget as HTMLElement;
        resizer.classList.add('bg-blue-400', '!opacity-60');

        const onMove = (ev: MouseEvent) => {
            const delta = ev.clientX - xInicial;
            const nuevoA = Math.max(ANCHO_MIN_COL, anchoInicialA + delta);
            const nuevoB = Math.max(ANCHO_MIN_COL, anchoInicialB - delta);
            if (nuevoA === ANCHO_MIN_COL || nuevoB === ANCHO_MIN_COL) return;
            colA.style.width = `${nuevoA}px`;
            colB.style.width = `${nuevoB}px`;
            const rect = table.rows[0].cells[colIdx].getBoundingClientRect();
            const wrapRect = wrap.getBoundingClientRect();
            resizer.style.left = `${rect.right - wrapRect.left}px`;
        };
        const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            resizer.classList.remove('bg-blue-400', '!opacity-60');
            const anchoFinalA = colA.getBoundingClientRect().width;
            const anchoFinalB = colB.getBoundingClientRect().width;
            const nuevosAnchos = element.anchoColumnas.map((w, i) => {
                if (i === colIdx) return anchoFinalA;
                if (i === colIdx + 1) return anchoFinalB;
                return w;
            });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            Transforms.setNodes(editor, { anchoColumnas: nuevosAnchos } as any, { at: path() });
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    };

    const anchoTotal = element.anchoColumnas.reduce((a, b) => a + b, 0);

    return (
        <div
            {...attributes}
            className='group/tabla relative my-4'
            style={cortePaddingTop !== undefined ? { paddingTop: cortePaddingTop } : undefined}>
            <div ref={wrapRef} className='relative' style={{ width: anchoTotal }}>
                <table className='border-collapse' style={{ tableLayout: 'fixed', width: '100%' }}>
                    <colgroup>
                        {element.anchoColumnas.map((w, i) => (
                            <col key={i} style={{ width: w }} />
                        ))}
                    </colgroup>
                    <tbody>{children}</tbody>
                </table>
            </div>

            {isEditor && medidas && (
                // Los botones +/× disparan su mutación en onClick con un setTimeout(0), NO
                // en onMouseDown: si mutan de inmediato, el botón (u otro nodo bajo el punto
                // del click) puede quedar desmontado/reubicado por el re-render ANTES de que
                // el evento "click" nativo termine de burbujear — y el guard de
                // handleDocumentClick en EditorDocumentoV29.tsx (que evita pisar clicks
                // dentro de un nodo Slate) deja de encontrar el ancestro correcto, dejando
                // pasar un salto de cursor al final de la página. Diferir la mutación al
                // siguiente tick garantiza que el DOM siga intacto mientras el click burbujea.
                <div contentEditable={false} className='pointer-events-none absolute inset-0'>
                    {/* Manijas de resize entre columnas */}
                    {medidas.cols.slice(0, -1).map((_, i) => (
                        <div
                            key={`resizer-${i}`}
                            onMouseDown={(e) => iniciarResize(e, i)}
                            className='pointer-events-auto absolute top-0 -ml-[3.5px] w-[7px] cursor-col-resize opacity-0 transition-opacity hover:bg-blue-400 hover:opacity-50 group-hover/tabla:opacity-100'
                            style={{ left: medidas.cols[i].left + medidas.cols[i].ancho, height: medidas.alto }}
                        />
                    ))}

                    {/* × por fila: a la derecha de cada fila */}
                    {medidas.filas.map((fila, rIdx) => (
                        <button
                            key={`del-fila-${rIdx}`}
                            type='button'
                            title='Eliminar fila'
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={async () => {
                                const ok = await confirmAlert({
                                    title: 'Eliminar fila',
                                    text: 'Se perderá el contenido de las celdas de esta fila.',
                                    confirmText: 'Eliminar',
                                    cancelText: 'Cancelar',
                                    icon: 'warning',
                                    confirmColor: '#dc2626',
                                });
                                if (!ok) return;
                                setTimeout(() => eliminarFila(rIdx), 0);
                            }}
                            className='pointer-events-auto absolute flex h-4 w-4 items-center justify-center rounded border border-zinc-300 bg-white text-[11px] leading-none text-zinc-400 opacity-0 shadow-sm hover:border-red-300 hover:bg-red-50 hover:text-red-500 group-hover/tabla:opacity-100'
                            style={{ left: medidas.ancho + 4, top: fila.top + fila.alto / 2 - 8 }}>
                            ×
                        </button>
                    ))}

                    {/* × por columna: debajo de cada columna */}
                    {medidas.cols.map((col, cIdx) => (
                        <button
                            key={`del-col-${cIdx}`}
                            type='button'
                            title='Eliminar columna'
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={async () => {
                                const ok = await confirmAlert({
                                    title: 'Eliminar columna',
                                    text: 'Se perderá el contenido de las celdas de esta columna.',
                                    confirmText: 'Eliminar',
                                    cancelText: 'Cancelar',
                                    icon: 'warning',
                                    confirmColor: '#dc2626',
                                });
                                if (!ok) return;
                                setTimeout(() => eliminarColumna(cIdx), 0);
                            }}
                            className='pointer-events-auto absolute flex h-4 w-4 items-center justify-center rounded border border-zinc-300 bg-white text-[11px] leading-none text-zinc-400 opacity-0 shadow-sm hover:border-red-300 hover:bg-red-50 hover:text-red-500 group-hover/tabla:opacity-100'
                            style={{ left: col.left + col.ancho / 2 - 8, top: medidas.alto + 4 }}>
                            ×
                        </button>
                    ))}

                    {/* Un solo "+" a la derecha: agrega columna al final */}
                    <button
                        type='button'
                        title='Agregar columna'
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => setTimeout(() => agregarColumna(element.anchoColumnas.length - 1), 0)}
                        className='pointer-events-auto absolute flex h-4 w-4 items-center justify-center rounded border border-blue-300 bg-white text-[11px] leading-none text-blue-500 opacity-0 shadow-sm hover:bg-blue-50 group-hover/tabla:opacity-100'
                        style={{ left: medidas.ancho + 22, top: medidas.alto / 2 - 8 }}>
                        +
                    </button>

                    {/* Un solo "+" abajo: agrega fila al final */}
                    <button
                        type='button'
                        title='Agregar fila'
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => setTimeout(() => agregarFila(element.children.length - 1), 0)}
                        className='pointer-events-auto absolute flex h-4 w-4 items-center justify-center rounded border border-blue-300 bg-white text-[11px] leading-none text-blue-500 opacity-0 shadow-sm hover:bg-blue-50 group-hover/tabla:opacity-100'
                        style={{ left: medidas.ancho / 2 - 8, top: medidas.alto + 22 }}>
                        +
                    </button>
                </div>
            )}
        </div>
    );
};

export default TablaElement;
