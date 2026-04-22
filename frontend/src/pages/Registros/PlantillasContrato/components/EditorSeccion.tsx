import Label from '@/components/form/Label';
import Badge from '@/components/ui/Badge';
import { COLORES_CATEGORIA } from '@/constants/contrato.constant';
import { IEtiquetaPlantilla } from '@/interface/plantillaContrato.interface';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
    BaseEditor,
    createEditor,
    Descendant,
    Editor,
    Node,
    Element as SlateElement,
    Transforms
} from 'slate';
import { HistoryEditor, withHistory } from 'slate-history';
import { Editable, ReactEditor, RenderElementProps, Slate, withReact } from 'slate-react';
import SelectorEtiqueta from './SelectorEtiqueta';

// ─── Tipos Slate custom ───

type EtiquetaElement = {
    type: 'etiqueta';
    clave: string;
    children: [{ text: '' }];
};

type ParagraphElement = {
    type: 'paragraph';
    children: Descendant[];
};

type CustomElement = EtiquetaElement | ParagraphElement;

declare module 'slate' {
    interface CustomTypes {
        Editor: BaseEditor & ReactEditor & HistoryEditor;
        Element: CustomElement;
        Text: { text: string };
    }
}

// ─── Plugin Slate ───

const withEtiquetas = (editor: Editor) => {
    const { isInline, isVoid } = editor;

    editor.isInline = (element) => {
        return element.type === 'etiqueta' ? true : isInline(element);
    };

    editor.isVoid = (element) => {
        return element.type === 'etiqueta' ? true : isVoid(element);
    };

    return editor;
};

// ─── Serialización ───

const PATRON_ETIQUETA = /\[([a-z_]+)\]/g;

function deserializeTemplate(text: string): Descendant[] {
    if (!text) {
        return [{ type: 'paragraph', children: [{ text: '' }] }];
    }

    const lines = text.split('\n');
    return lines.map((line) => {
        const children: Descendant[] = [];
        let lastIndex = 0;

        const regex = new RegExp(PATRON_ETIQUETA);
        let match = regex.exec(line);

        while (match !== null) {
            if (match.index > lastIndex) {
                children.push({ text: line.slice(lastIndex, match.index) });
            }
            children.push({
                type: 'etiqueta' as const,
                clave: match[1],
                children: [{ text: '' }],
            });
            lastIndex = match.index + match[0].length;
            match = regex.exec(line);
        }

        if (lastIndex < line.length) {
            children.push({ text: line.slice(lastIndex) });
        }

        if (children.length === 0) {
            children.push({ text: '' });
        }

        return { type: 'paragraph' as const, children };
    });
}

function serializeToTemplate(nodes: Descendant[]): string {
    return nodes
        .map((node) => {
            if (SlateElement.isElement(node) && node.type === 'paragraph') {
                return node.children
                    .map((child) => {
                        if (SlateElement.isElement(child) && child.type === 'etiqueta') {
                            return `[${child.clave}]`;
                        }
                        return Node.string(child);
                    })
                    .join('');
            }
            return Node.string(node);
        })
        .join('\n');
}

// ─── Chip de etiqueta ───

interface IEtiquetaChipProps {
    attributes: RenderElementProps['attributes'];
    children: RenderElementProps['children'];
    element: EtiquetaElement;
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
    const etiqueta = etiquetasMap.get(element.clave);
    const color = etiqueta ? COLORES_CATEGORIA[etiqueta.categoria] || 'zinc' : 'zinc';
    const label = etiqueta ? etiqueta.nombre_display : element.clave;

    const handleDelete = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const path = ReactEditor.findPath(editor, element);
        Transforms.removeNodes(editor, { at: path });
    };

    return (
        <span {...attributes} contentEditable={false} className='inline-block align-baseline'>
            <Badge
                color={color}
                variant='outline'
                className='mx-0.5 inline-flex cursor-default items-center gap-1 px-2 py-0.5 text-xs'>
                {label}
                <button
                    type='button'
                    onClick={handleDelete}
                    className='ml-0.5 inline-flex items-center rounded-full p-0 leading-none hover:opacity-70'>
                    ×
                </button>
            </Badge>
            {children}
        </span>
    );
};

// ─── Props ───

interface IEditorSeccionProps {
    value: string;
    onChange: (value: string) => void;
    etiquetas: IEtiquetaPlantilla[];
    label?: string;
    rows?: number;
    id?: string;
}

const EditorSeccion = ({
    value,
    onChange,
    etiquetas,
    label = 'Contenido',
    id = 'editor-seccion',
}: IEditorSeccionProps) => {
    const editorRef = useRef<Editor | null>(null);
    if (!editorRef.current) {
        editorRef.current = withEtiquetas(withHistory(withReact(createEditor())));
    }
    const editor = editorRef.current;

    const etiquetasMap = useMemo(() => {
        const map = new Map<string, IEtiquetaPlantilla>();
        etiquetas.forEach((e) => map.set(e.clave, e));
        return map;
    }, [etiquetas]);

    const initialValue = useMemo(() => deserializeTemplate(value), [value]);

    // Track the last value set internally to distinguish from external updates
    const lastInternalValue = useRef(value);

    useEffect(() => {
        if (value !== lastInternalValue.current) {
            lastInternalValue.current = value;
            const newNodes = deserializeTemplate(value);
            // Replace all editor content with the new external value
            editor.children = newNodes;
            Editor.normalize(editor, { force: true });
        }
    }, [value, editor]);

    const handleChange = useCallback(
        (newValue: Descendant[]) => {
            const serialized = serializeToTemplate(newValue);
            lastInternalValue.current = serialized;
            onChange(serialized);
        },
        [onChange],
    );

    const insertarEtiqueta = useCallback(
        (clave: string) => {
            const etiquetaNode: EtiquetaElement = {
                type: 'etiqueta',
                clave,
                children: [{ text: '' }],
            };
            // Si no hay selección activa enfocar al final
            if (!editor.selection) {
                Transforms.select(editor, Editor.end(editor, []));
            }
            Transforms.insertNodes(editor, etiquetaNode);
            // Mover cursor después del chip
            Transforms.move(editor, { distance: 1 });
            ReactEditor.focus(editor);
        },
        [editor],
    );

    const handleKeyDown = useCallback(
        (event: React.KeyboardEvent) => {
            // Bloquear escritura manual de corchetes
            if (event.key === '[' || event.key === ']') {
                event.preventDefault();
                return;
            }
        },
        [],
    );

    const handlePaste = useCallback(
        (event: React.ClipboardEvent) => {
            // Sanitizar paste: insertar como texto plano sin parsear [clave]
            event.preventDefault();
            const text = event.clipboardData.getData('text/plain');
            // Remover corchetes del texto pegado
            const sanitized = text.replace(/[[\]]/g, '');
            Editor.insertText(editor, sanitized);
        },
        [editor],
    );

    const renderElement = useCallback(
        (props: RenderElementProps) => {
            if (props.element.type === 'etiqueta') {
                return (
                    <EtiquetaChip
                        {...props}
                        element={props.element as EtiquetaElement}
                        etiquetasMap={etiquetasMap}
                        editor={editor}
                    />
                );
            }
            return <p {...props.attributes}>{props.children}</p>;
        },
        [etiquetasMap, editor],
    );

    const contarEtiquetas = value.match(/\[[a-z_]+\]/g)?.length || 0;

    return (
        <div className='flex flex-col gap-2'>
            <div className='flex items-center justify-between'>
                <Label htmlFor={id}>{label}</Label>
                <div className='flex items-center gap-2'>
                    {contarEtiquetas > 0 && (
                        <span className='text-xs text-zinc-400'>
                            {contarEtiquetas} etiqueta{contarEtiquetas !== 1 ? 's' : ''} en uso
                        </span>
                    )}
                    <SelectorEtiqueta etiquetas={etiquetas} onSelect={insertarEtiqueta} />
                </div>
            </div>
            <div className='rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400'>
                Inserta etiquetas desde el selector. Se mostrarán como chips en el texto.
            </div>
            <Slate editor={editor} initialValue={initialValue} onChange={handleChange}>
                <Editable
                    id={id}
                    renderElement={renderElement}
                    onKeyDown={handleKeyDown}
                    onPaste={handlePaste}
                    placeholder='Escribe el contenido de la sección...'
                    className='min-h-[12rem] rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100'
                    spellCheck
                />
            </Slate>
        </div>
    );
};

export default EditorSeccion;
