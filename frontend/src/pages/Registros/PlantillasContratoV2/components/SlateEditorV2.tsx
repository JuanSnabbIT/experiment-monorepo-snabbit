import type { IEtiquetaPlantilla } from '@/interface/plantillaContrato.interface';
import type {
    TMarksTexto,
    TNodoBloqueTransversal,
    TNodoEtiqueta,
    TNodoParrafo,
    TNodoTexto,
    TSlateNode
} from '@/interface/plantillaContratoV2.interface';
import { insertarEtiqueta, withEtiquetas } from '@/utils/slatePlantillas';
import { forwardRef, useCallback, useImperativeHandle, useMemo } from 'react';
import { createEditor, Descendant, Editor, Element, Transforms } from 'slate';
import { withHistory } from 'slate-history';
import {
    Editable,
    ReactEditor,
    RenderElementProps,
    RenderLeafProps,
    Slate,
    withReact,
} from 'slate-react';

// ─── Helper ───────────────────────────────────────────────────────────────────

const formatEtiquetaLabel = (clave: string): string =>
    clave
        .replace(/^[^.]+\./, '')
        .replace(/[_.]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

// ─── EtiquetaChip ─────────────────────────────────────────────────────────────

interface IEtiquetaChipProps extends RenderElementProps {
    element: TNodoEtiqueta;
    etiquetasMap: Map<string, IEtiquetaPlantilla>;
    editor: Editor;
}

const EtiquetaChip = ({
    attributes,
    children,
    element,
    etiquetasMap,
    editor,
}: IEtiquetaChipProps) => {
    const label =
        etiquetasMap.get(element.clave)?.nombre_display ?? formatEtiquetaLabel(element.clave);

    const handleDelete = (e: React.MouseEvent) => {
        e.preventDefault();
        const path = ReactEditor.findPath(editor as ReactEditor, element);
        Transforms.removeNodes(editor, { at: path });
    };

    return (
        <span {...attributes} contentEditable={false} className='inline-block align-baseline'>
            <span className='inline-flex items-center gap-0.5 rounded-full border border-blue-500 bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-600 dark:border-blue-400 dark:text-blue-300'>
                {label}
                <button
                    type='button'
                    className='ml-0.5 leading-none opacity-60 hover:opacity-100'
                    onMouseDown={handleDelete}
                    tabIndex={-1}>
                    ×
                </button>
            </span>
            {children}
        </span>
    );
};

// ─── Interfaz pública ─────────────────────────────────────────────────────────

export interface ISlateEditorV2Handle {
    insertarEtiquetaEnCursor: (clave: string) => void;
    toggleMark: (mark: keyof TMarksTexto) => void;
    setAlign: (align: TNodoParrafo['align']) => void;
    toggleColor: () => void;
    focus: () => void;
}

interface ISlateEditorV2Props {
    initialValue: TSlateNode[];
    onChange: (nodes: TSlateNode[]) => void;
    etiquetasMap: Map<string, IEtiquetaPlantilla>;
    placeholder?: string;
    onDragOver?: (e: React.DragEvent) => void;
    onDrop?: (e: React.DragEvent) => void;
}

// ─── Componente ───────────────────────────────────────────────────────────────

const SlateEditorV2 = forwardRef<ISlateEditorV2Handle, ISlateEditorV2Props>(
    ({ initialValue, onChange, etiquetasMap, placeholder, onDragOver, onDrop }, ref) => {
        const editor = useMemo(
            () => withEtiquetas(withHistory(withReact(createEditor()))),
            [],
        );

        const renderElement = useCallback(
            (props: RenderElementProps) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const el = props.element as any;

                if (el.type === 'etiqueta') {
                    return (
                        <EtiquetaChip
                            {...props}
                            element={el as TNodoEtiqueta}
                            etiquetasMap={etiquetasMap}
                            editor={editor}
                        />
                    );
                }
                if (el.type === 'salto_pagina') {
                    return (
                        <div
                            {...props.attributes}
                            contentEditable={false}
                            className='my-2 flex select-none items-center gap-2'>
                            <div className='h-px flex-1 border-t border-dashed border-zinc-300 dark:border-zinc-600' />
                            <span className='rounded border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800'>
                                salto de página
                            </span>
                            <div className='h-px flex-1 border-t border-dashed border-zinc-300 dark:border-zinc-600' />
                            {props.children}
                        </div>
                    );
                }
                if (el.type === 'listado') {
                    const Tag = el.formato === 'ordenado' ? 'ol' : 'ul';
                    const cls =
                        el.formato === 'ordenado' ? 'list-decimal pl-5 mb-1' : 'list-disc pl-5 mb-1';
                    return (
                        <Tag {...props.attributes} className={cls}>
                            {props.children}
                        </Tag>
                    );
                }
                if (el.type === 'item-listado') {
                    return <li {...props.attributes}>{props.children}</li>;
                }
                if (el.type === 'bloque_transversal') {
                    return (
                        <div
                            {...props.attributes}
                            contentEditable={false}
                            className='my-2 rounded border border-dashed border-zinc-300 bg-zinc-50 px-3 py-2 text-[11px] text-zinc-400 dark:border-zinc-600 dark:bg-zinc-800/40'>
                            🔒 {(el as TNodoBloqueTransversal).titulo}
                            {props.children}
                        </div>
                    );
                }
                // parrafo (default)
                return (
                    <p
                        {...props.attributes}
                        className='mb-1'
                        style={el.align ? { textAlign: el.align as 'left' | 'center' | 'right' | 'justify' } : undefined}>
                        {props.children}
                    </p>
                );
            },
            [etiquetasMap, editor],
        );

        const renderLeaf = useCallback((props: RenderLeafProps) => {
            const leaf = props.leaf as unknown as TNodoTexto;
            let { children } = props;
            if (leaf.bold) children = <strong>{children}</strong>;
            if (leaf.italic) children = <em>{children}</em>;
            if (leaf.underline) children = <u>{children}</u>;
            if (leaf.code)
                children = (
                    <code className='rounded bg-zinc-100 px-1 font-mono text-[12px] dark:bg-zinc-700'>
                        {children}
                    </code>
                );
            if (leaf.color) children = <span style={{ color: leaf.color }}>{children}</span>;
            return <span {...props.attributes}>{children}</span>;
        }, []);

        const toggleMark = useCallback(
            (mark: keyof TMarksTexto) => {
                const isActive = !!(Editor.marks(editor) as Record<string, unknown>)?.[mark];
                if (isActive) {
                    Editor.removeMark(editor, mark);
                } else {
                    Editor.addMark(editor, mark, true);
                }
            },
            [editor],
        );

        const toggleColor = useCallback(() => {
            const current = (Editor.marks(editor) as Record<string, unknown>)?.color;
            if (current) {
                Editor.removeMark(editor, 'color');
            } else {
                Editor.addMark(editor, 'color', '#2563eb');
            }
            ReactEditor.focus(editor);
        }, [editor]);

        const setAlign = useCallback(
            (align: TNodoParrafo['align']) => {
                Transforms.setNodes(
                    editor,
                    { align } as Partial<TNodoParrafo>,
                    { match: (n) => Element.isElement(n) && (n as { type: string }).type === 'parrafo' },
                );
                ReactEditor.focus(editor);
            },
            [editor],
        );

        const handleKeyDown = useCallback(
            (e: React.KeyboardEvent) => {
                if (e.ctrlKey || e.metaKey) {
                    if (e.key === 'b') {
                        e.preventDefault();
                        toggleMark('bold');
                    }
                    if (e.key === 'i') {
                        e.preventDefault();
                        toggleMark('italic');
                    }
                    if (e.key === 'u') {
                        e.preventDefault();
                        toggleMark('underline');
                    }
                }
            },
            [toggleMark],
        );

        useImperativeHandle(
            ref,
            () => ({
                insertarEtiquetaEnCursor: (clave: string) => {
                    insertarEtiqueta(editor, clave);
                    ReactEditor.focus(editor);
                },
                toggleMark,
                toggleColor,
                setAlign,
                focus: () => ReactEditor.focus(editor),
            }),
            [editor, toggleMark, toggleColor, setAlign],
        );

        return (
            <Slate
                editor={editor}
                initialValue={initialValue as unknown as Descendant[]}
                onChange={(nodes) => onChange(nodes as TSlateNode[])}>
                {/* ── Barra de herramientas ─── */}
                <div className='flex flex-wrap items-center gap-0.5 rounded-t border border-b-0 border-zinc-300 bg-zinc-50 px-2 py-1 dark:border-zinc-600 dark:bg-zinc-800'>
                    {/* Grupo: formato texto */}
                    <button
                        type='button'
                        title='Negrita (Ctrl+B)'
                        onMouseDown={(e) => { e.preventDefault(); toggleMark('bold'); }}
                        className='rounded px-2 py-0.5 text-[12px] font-bold text-zinc-700 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-700'>
                        N
                    </button>
                    <button
                        type='button'
                        title='Cursiva (Ctrl+I)'
                        onMouseDown={(e) => { e.preventDefault(); toggleMark('italic'); }}
                        className='rounded px-2 py-0.5 text-[12px] italic text-zinc-700 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-700'>
                        C
                    </button>
                    <button
                        type='button'
                        title='Subrayado (Ctrl+U)'
                        onMouseDown={(e) => { e.preventDefault(); toggleMark('underline'); }}
                        className='rounded px-2 py-0.5 text-[12px] underline text-zinc-700 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-700'>
                        S
                    </button>
                    <button
                        type='button'
                        title='Color azul'
                        onMouseDown={(e) => { e.preventDefault(); toggleColor(); }}
                        className='rounded px-2 py-0.5 text-[12px] font-bold text-blue-600 hover:bg-zinc-200 dark:text-blue-400 dark:hover:bg-zinc-700'>
                        A
                    </button>

                    <div className='mx-1.5 h-4 w-px bg-zinc-300 dark:bg-zinc-600' />

                    {/* Grupo: alineación */}
                    {([
                        { align: 'left' as const, title: 'Izquierda', path: 'M4 6h16M4 12h10M4 18h14' },
                        { align: 'center' as const, title: 'Centrar', path: 'M4 6h16M7 12h10M6 18h12' },
                        { align: 'right' as const, title: 'Derecha', path: 'M4 6h16M10 12h10M6 18h14' },
                        { align: 'justify' as const, title: 'Justificar', path: 'M4 6h16M4 12h16M4 18h16' },
                    ] as const).map(({ align, title, path }) => (
                        <button
                            key={align}
                            type='button'
                            title={title}
                            onMouseDown={(e) => { e.preventDefault(); setAlign(align); }}
                            className='rounded p-1 text-zinc-700 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-700'>
                            <svg className='h-3 w-3' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d={path} />
                            </svg>
                        </button>
                    ))}

                    <div className='ml-auto select-none text-[10px] text-zinc-400'>
                        Ctrl+Z · Ctrl+S guardar
                    </div>
                </div>
                <Editable
                    className='min-h-[120px] w-full rounded-b border border-zinc-300 bg-white/90 p-3 text-[13px] leading-relaxed text-zinc-800 outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-100 dark:border-zinc-600 dark:bg-zinc-800/40 dark:text-zinc-100'
                    renderElement={renderElement}
                    renderLeaf={renderLeaf}
                    onKeyDown={handleKeyDown}
                    onDragOver={onDragOver}
                    onDrop={onDrop}
                    placeholder={placeholder}
                    spellCheck={false}
                />
            </Slate>
        );
    },
);

SlateEditorV2.displayName = 'SlateEditorV2';

export default SlateEditorV2;
