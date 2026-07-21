import { toggleMark } from '@/components/helper/richtext.helper';
import Icon from '@/components/icon/Icon';
import type { TNodoParrafo, TNodoTexto, TSlateNode } from '@/interface/plantillaContratoV2.interface';
import { ReactNode, useEffect } from 'react';
import { Descendant, Editor, Transforms } from 'slate';
import { Editable, ReactEditor, type RenderElementProps, type RenderLeafProps, Slate } from 'slate-react';

/**
 * Marcas de texto → JSX, compartido entre el mini-editor (`renderLeaf`) y el
 * preview estático de páginas duplicadas (`EncabezadoPiePreview`) — mismo
 * criterio de marks que el cuerpo del documento, para no divergir en qué se
 * ve en pantalla vs. qué queda guardado.
 */
function marcasAJSX(leaf: TNodoTexto, children: ReactNode): ReactNode {
    if (leaf.bold) children = <strong>{children}</strong>;
    if (leaf.italic) children = <em>{children}</em>;
    if (leaf.underline) children = <u>{children}</u>;
    if (leaf.strikethrough) children = <s>{children}</s>;
    if (leaf.color) children = <span style={{ color: leaf.color }}>{children}</span>;
    if (leaf.fontSize) children = <span style={{ fontSize: leaf.fontSize }}>{children}</span>;
    return children;
}

/** Render estático (sin Slate, sin contentEditable) para las páginas
 * duplicadas — encabezado en páginas 2+, pie en todas menos la que aloja el
 * editor vivo. Nunca se edita ahí directamente. Se renderiza inline (no
 * bloque) para poder fluir junto al logo dentro del mismo `text-align`. */
export function EncabezadoPiePreview({ nodos }: { nodos: TSlateNode[] }) {
    return (
        <span className='inline-block'>
            {nodos.map((nodo, i) => {
                const p = nodo as TNodoParrafo;
                return (
                    <span key={i} style={{ display: 'block', margin: 0 }}>
                        {p.children.map((c, j) => (
                            <span key={j}>{marcasAJSX(c as TNodoTexto, (c as TNodoTexto).text)}</span>
                        ))}
                    </span>
                );
            })}
        </span>
    );
}

export type TZonaEncabezadoPie = 'header' | 'footer';

interface IEncabezadoPieEditorProps {
    editor: Editor;
    value: TSlateNode[];
    onChange: (value: TSlateNode[]) => void;
    editando: boolean;
    onAbrirEdicion: () => void;
    onCerrarEdicion: () => void;
    onQuitar: () => void;
    zonaLabel: string;
    /** Header: toggle de logo. Footer: toggle de numeración. */
    toggleSecundario?: { activo: boolean; label: string; onToggle: () => void };
    /** Solo header: a qué margen se ancla el logo — independiente del `align` del texto. */
    selectorLogoLado?: { valor: 'izquierda' | 'derecha'; onCambiar: (lado: 'izquierda' | 'derecha') => void };
    /** Solo header: placeholder de logo, renderizado en la misma fila que el texto
     * (no en el bloque completo, que también incluye la barra al editar) — así su
     * centrado vertical no se corre cuando aparece la barra contextual debajo. */
    logo?: { activo: boolean; lado: 'izquierda' | 'derecha' };
    /** Espacio reservado para que el texto no tape al logo — SOLO cuando el
     * texto se alinea hacia el mismo lado donde está el logo. Se aplica al
     * <span> del texto, nunca a la fila completa (que también contiene el
     * logo): si se aplicara ahí, empujaría a ambos por igual y no separaría
     * nada — bug real encontrado al verificar visualmente esta feature. */
    colisionPadding?: { lado: 'left' | 'right'; px: number };
}

const renderElementMini = (props: RenderElementProps) => {
    // Bloque, no inline: dentro del <span inline-block> envolvente esto arma
    // un mini-documento de 1+ líneas propias (Word permite varias líneas en
    // encabezado/pie), sin que cada línea se salga del contenedor.
    return <div {...props.attributes} style={{ margin: 0 }}>{props.children}</div>;
};

const renderLeafMini = (props: RenderLeafProps) => {
    const leaf = props.leaf as unknown as TNodoTexto;
    return <span {...props.attributes}>{marcasAJSX(leaf, props.children)}</span>;
};

/**
 * Mini-editor Slate presentacional, reusable para encabezado y pie. Sin
 * plugins de etiquetas/tablas/condicionales — solo texto con marks, no tiene
 * sentido anidar el resto del vocabulario del cuerpo acá.
 *
 * La parte editable se renderiza `inline-block` (no bloque) a propósito: el
 * padre (EditorDocumentoV29) pone el logo y este editor como hermanos dentro
 * de un contenedor con `text-align`, para que logo+texto se posicionen juntos
 * como una sola línea — mismo mecanismo que ya usaba el pie antes de este
 * cambio, ahora aplicado también al encabezado.
 *
 * El formato de texto (negrita/cursiva/alineación/color/tamaño) NO vive acá
 * — se maneja desde la toolbar principal de `EditorDocumentoV29.tsx`, que
 * enruta sus acciones al editor activo (`editorActivo`, según `zonaEditando`)
 * en vez de estar hardcodeada al editor del cuerpo. La barra propia de este
 * componente solo conserva controles que el mini-editor necesita gestionar
 * él mismo (logo, numeración, activar/cerrar), no formato de texto genérico
 * — evita tener dos toolbars distintas para la misma acción.
 *
 * Ctrl+B/I/U sí quedan acá como atajo de teclado directo (más abajo), porque
 * operan sobre `editor` (la prop, ya es el editor correcto de esta instancia)
 * sin pasar por la toolbar ni por ningún estado compartido.
 */
const EncabezadoPieEditor = ({
    editor,
    value,
    onChange,
    editando,
    onAbrirEdicion,
    onCerrarEdicion,
    onQuitar,
    zonaLabel,
    toggleSecundario,
    selectorLogoLado,
    logo,
    colisionPadding,
}: IEncabezadoPieEditorProps) => {
    // Al entrar en modo edición, enfocar el mini-editor y ubicar el cursor al
    // final del texto — sin esto, el `<Editable>` queda con `selection: null`
    // hasta que el usuario clickea manualmente adentro, y en ese estado los
    // botones de la toolbar principal (que operan sobre `editorActivo`) no
    // tienen dónde aplicar el mark: el click en "Negrita" no hace nada y
    // parece roto (bug real encontrado al reproducir el reporte del usuario).
    useEffect(() => {
        if (!editando) return;
        ReactEditor.focus(editor);
        Transforms.select(editor, Editor.end(editor, []));
    }, [editando, editor]);

    return (
        <Slate
            editor={editor}
            initialValue={value as unknown as Descendant[]}
            onChange={(nodes) => onChange(nodes as TSlateNode[])}>
            <div className='relative min-h-[20px]'>
                {logo?.activo && (
                    <span
                        className='absolute top-1/2 -translate-y-1/2 italic text-zinc-400'
                        contentEditable={false}
                        style={logo.lado === 'derecha' ? { right: 0 } : { left: 0 }}>
                        [logo empresa]
                    </span>
                )}
                <span
                    className={`inline-block align-middle ${editando ? 'min-w-[240px]' : 'min-w-[2ch]'}`}
                    style={{
                        paddingLeft: colisionPadding?.lado === 'left' ? colisionPadding.px : undefined,
                        paddingRight: colisionPadding?.lado === 'right' ? colisionPadding.px : undefined,
                    }}
                    onDoubleClick={() => { if (!editando) onAbrirEdicion(); }}>
                    <Editable
                        renderElement={renderElementMini}
                        renderLeaf={renderLeafMini}
                        readOnly={!editando}
                        placeholder={editando ? 'Agregar texto...' : undefined}
                        onKeyDown={(e) => {
                            if (e.key === 'Escape') { e.preventDefault(); onCerrarEdicion(); return; }
                            if (e.ctrlKey || e.metaKey) {
                                if (e.key === 'b') { e.preventDefault(); toggleMark(editor, 'bold'); }
                                if (e.key === 'i') { e.preventDefault(); toggleMark(editor, 'italic'); }
                                if (e.key === 'u') { e.preventDefault(); toggleMark(editor, 'underline'); }
                            }
                        }}
                        className='outline-none'
                    />
                </span>
            </div>

            {editando && (
                <div
                    contentEditable={false}
                    onMouseDown={(e) => e.stopPropagation()}
                    className='mt-2 flex flex-wrap items-center gap-1.5 rounded border border-zinc-200 bg-zinc-50 px-2 py-1.5 dark:border-zinc-700 dark:bg-zinc-800'>
                    {selectorLogoLado && (
                        <>
                            <div className='flex items-center gap-0.5'>
                                <button
                                    type='button'
                                    title='Logo pegado al margen izquierdo'
                                    onMouseDown={(e) => { e.preventDefault(); selectorLogoLado.onCambiar('izquierda'); }}
                                    className={`flex h-7 w-7 items-center justify-center rounded ${
                                        selectorLogoLado.valor === 'izquierda'
                                            ? 'border border-blue-400 bg-blue-50 text-blue-500 dark:bg-blue-900/20'
                                            : 'border border-transparent text-zinc-600 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-700'
                                    }`}>
                                    <Icon icon='DuoLayoutLeftPanel1' />
                                </button>
                                <button
                                    type='button'
                                    title='Logo pegado al margen derecho'
                                    onMouseDown={(e) => { e.preventDefault(); selectorLogoLado.onCambiar('derecha'); }}
                                    className={`flex h-7 w-7 items-center justify-center rounded ${
                                        selectorLogoLado.valor === 'derecha'
                                            ? 'border border-blue-400 bg-blue-50 text-blue-500 dark:bg-blue-900/20'
                                            : 'border border-transparent text-zinc-600 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-700'
                                    }`}>
                                    <Icon icon='DuoLayoutRightPanel1' />
                                </button>
                            </div>
                            <div className='mx-1 h-4 w-px bg-zinc-300 dark:bg-zinc-600' />
                        </>
                    )}

                    {toggleSecundario && (
                        <>
                            <label className='flex items-center gap-1.5 text-[11px] text-zinc-600 dark:text-zinc-300'>
                                <input
                                    type='checkbox'
                                    checked={toggleSecundario.activo}
                                    onChange={toggleSecundario.onToggle}
                                    className='h-3 w-3'
                                />
                                {toggleSecundario.label}
                            </label>
                        </>
                    )}

                    <button
                        type='button'
                        onMouseDown={(e) => { e.preventDefault(); onQuitar(); }}
                        className='ml-auto rounded px-2 py-1 text-[11px] font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'>
                        Desactivar {zonaLabel}
                    </button>
                    <button
                        type='button'
                        onMouseDown={(e) => { e.preventDefault(); onCerrarEdicion(); }}
                        className='rounded bg-zinc-900 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900'>
                        Cerrar {zonaLabel}
                    </button>
                </div>
            )}
        </Slate>
    );
};

export default EncabezadoPieEditor;
