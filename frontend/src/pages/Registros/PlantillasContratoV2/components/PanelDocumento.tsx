import Button from '@/components/ui/Button';
import { IEtiquetaPlantilla } from '@/interface/plantillaContrato.interface'; // V1 compat — mismo shape
import {
    IOrdenBloqueTransversalPlantilla,
    ISeccionPlantillaV2 as ISeccionPlantilla,
    TMarksTexto,
    TNodoEtiqueta,
    TSlateNode,
} from '@/interface/plantillaContratoV2.interface';
import { useUpdateSeccionV2Mutation } from '@/store/slices/contratos/plantillaContratoV2Api';
import { getErrorMessage } from '@/utils/errorHandlers';
import {
    deserializarPlantillaASlate,
    parrafoVacio,
    serializarSlateAPlantilla,
} from '@/utils/slatePlantillas';
import {
    forwardRef,
    useCallback,
    useEffect,
    useImperativeHandle,
    useMemo,
    useRef,
    useState,
} from 'react';
import { toast } from 'react-toastify';
import SlateEditorV2, { ISlateEditorV2Handle } from './SlateEditorV2';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface IPanelDocumentoHandle {
    guardar: () => Promise<void>;
    wrapSelection: (abre: string, cierra: string) => void;
    insertarTexto: (texto: string) => void;
}

interface IPanelDocumentoProps {
    secciones: ISeccionPlantilla[];
    seccionActivaId: number | null;
    isEditing: boolean;
    plantillaId: string;
    tituloPagina: string;
    etiquetas: IEtiquetaPlantilla[];
    onSelectSeccion: (seccion: ISeccionPlantilla) => void;
    onStartEditar: () => void;
    onStopEditar: () => void;
    onSaved: () => void;
    onDirtyChange?: (dirty: boolean) => void;
    bloques?: IOrdenBloqueTransversalPlantilla[];
    viewMode?: 'editor' | 'preview';
    plantillaTipoContrato?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const NUMERALES_ROMANOS: Record<number, string> = {
    1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V',
    6: 'VI', 7: 'VII', 8: 'VIII', 9: 'IX', 10: 'X',
    11: 'XI', 12: 'XII', 13: 'XIII', 14: 'XIV', 15: 'XV',
    16: 'XVI', 17: 'XVII', 18: 'XVIII', 19: 'XIX', 20: 'XX',
};

export const toRoman = (n: number): string => {
    if (n in NUMERALES_ROMANOS) return NUMERALES_ROMANOS[n];
    const vals = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
    const syms = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I'];
    let result = '';
    let num = n;
    for (let i = 0; i < vals.length; i++) {
        while (num >= vals[i]) {
            result += syms[i];
            num -= vals[i];
        }
    }
    return result;
};

const formatEtiquetaLabel = (clave: string): string =>
    clave
        .replace(/^[^.]+\./, '')
        .replace(/[_.]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

/**
 * Convierte nodos Slate a HTML para el modo preview del documento.
 * Preserva marcas (bold, italic, underline), etiquetas con chips y listas.
 * En modo 'preview', las etiquetas se renderizan como texto plano [clave]
 * para emular la apariencia del PDF generado.
 */
const renderSlateNodesToHTML = (
    nodes: TSlateNode[],
    etiquetasMap: Map<string, IEtiquetaPlantilla>,
    mode: 'editor' | 'preview' = 'editor',
): string => {
    type LeafNode = { text: string } & TMarksTexto;

    const leafToHTML = (leaf: LeafNode): string => {
        let html = leaf.text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        if (leaf.bold) html = `<strong>${html}</strong>`;
        if (leaf.italic) html = `<em>${html}</em>`;
        if (leaf.underline) html = `<u>${html}</u>`;
        if (leaf.code)
            html = `<code style="background:#f4f4f5;padding:0 4px;border-radius:3px;font-size:11px;font-family:monospace">${html}</code>`;
        if (leaf.color) html = `<span style="color:${leaf.color}">${html}</span>`;
        return html;
    };

    const etiquetaHTML = (clave: string): string => {
        if (mode === 'preview') {
            // En preview: texto plano itálico gris, igual a como aparece en el PDF sin datos reales
            return `<span style="color:#9ca3af;font-style:italic">[${clave}]</span>`;
        }
        const label = etiquetasMap.get(clave)?.nombre_display ?? formatEtiquetaLabel(clave);
        return `<span class="inline-flex items-center rounded-full border border-blue-500 bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-600 dark:border-blue-400 dark:text-blue-300">${label}</span>`;
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const childrenToHTML = (children: any[]): string =>
        children
            .map((child) => {
                if (child.type === 'etiqueta') return etiquetaHTML((child as TNodoEtiqueta).clave);
                return leafToHTML(child as LeafNode);
            })
            .join('');

    const nodeToHTML = (node: TSlateNode): string => {
        if (node.type === 'parrafo') {
            const align = (node as { type: string; align?: string }).align;
            const textAlign = align ?? 'justify';
            const inner = childrenToHTML(node.children);
            return `<p class="mb-2" style="text-align:${textAlign};text-indent:${textAlign === 'justify' ? '20px' : '0'}">${inner}</p>`;
        }
        if (node.type === 'listado') {
            const Tag = node.formato === 'ordenado' ? 'ol' : 'ul';
            const cls =
                node.formato === 'ordenado'
                    ? 'list-decimal pl-5 mb-2'
                    : 'list-disc pl-5 mb-2';
            const items = node.children
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .map((item: any) => `<li>${childrenToHTML(item.children)}</li>`)
                .join('');
            return `<${Tag} class="${cls}">${items}</${Tag}>`;
        }
        if (node.type === 'etiqueta') {
            return etiquetaHTML(node.clave);
        }
        if (node.type === 'salto_pagina') {
            return `<div style="page-break-after:always;border-top:1px dashed #d4d4d8;margin:12px 0;text-align:center"><span style="font-size:10px;color:#a1a1aa;background:#fff;padding:0 8px">salto de p&aacute;gina</span></div>`;
        }
        if (node.type === 'bloque_transversal') {
            return `<div class="my-2 rounded border border-dashed border-zinc-300 bg-zinc-50 px-3 py-2 text-[11px] text-zinc-400">&#128274; ${node.titulo}</div>`;
        }
        return '';
    };

    return nodes.map(nodeToHTML).join('');
};

// Mapeo de etiquetas HTML a marcas Slate (para compatibilidad con PanelEtiquetas)
const HTML_TAG_TO_MARK: Record<string, keyof TMarksTexto> = {
    '<strong>': 'bold',
    '<em>': 'italic',
    '<u>': 'underline',
    '<code>': 'code',
};

/** Tipos que muestran un encabezado de seccion con numero romano en el documento */
const TIPOS_CON_HEADING = ['clausula', 'condiciones_generales', 'identificacion_cliente'];

/** Tipos que se renderizan solo como parrafo sin encabezado visible en el documento */
const TIPOS_PARRAFO = ['encabezado', 'libre'];

/** Verifica si un array de nodos Slate no tiene contenido de texto visible */
const isSlateEmpty = (nodes: TSlateNode[]): boolean => {
    if (!nodes || nodes.length === 0) return true;
    return nodes.every((n) =>
        'children' in n
            ? (n as { children: { text?: string }[] }).children.every(
                  (c) => !c.text || c.text.trim() === '',
              )
            : true,
    );
};

// ─── Componente ───────────────────────────────────────────────────────────────

const PanelDocumento = forwardRef<IPanelDocumentoHandle, IPanelDocumentoProps>(
    (
        {
            secciones,
            seccionActivaId,
            isEditing,
            plantillaId,
            tituloPagina,
            etiquetas,
            onSelectSeccion,
            onStartEditar,
            onStopEditar,
            onSaved,
            onDirtyChange,
            bloques = [],
            viewMode = 'editor',
            plantillaTipoContrato,
        },
        ref,
    ) => {
        // Contenido Slate por seccion (sustituye al anterior localContent: Record<number, string>)
        const [localSlateContent, setLocalSlateContent] = useState<Record<number, TSlateNode[]>>(
            {},
        );
        const [updateSeccion, { isLoading: isSaving }] = useUpdateSeccionV2Mutation();
        const [editingTituloId, setEditingTituloId] = useState<number | null>(null);
        const [draftTitulo, setDraftTitulo] = useState('');

        // Ref al editor Slate activo (solo presente cuando isEditing = true)
        const slateEditorRef = useRef<ISlateEditorV2Handle>(null);
        // Refs a cada bloque en el documento (para scroll automatico)
        const seccionRefs = useRef<Record<number, HTMLDivElement | null>>({});
        // Flag: evita revertir localSlateContent cuando se detiene la edicion por guardado exitoso
        const justSavedRef = useRef(false);

        // ── Inicializar contenido Slate desde la API ──────────────────────────
        useEffect(() => {
            setLocalSlateContent((prev) => {
                const next: Record<number, TSlateNode[]> = {};
                secciones.forEach((s) => {
                    if (s.id in prev) {
                        next[s.id] = prev[s.id];
                    } else {
                        // Deserializar desde JSON estructurado o texto legacy
                        const source =
                            s.contenido_template_estructurado?.length
                                ? s.contenido_template_estructurado
                                : (s.contenido_template ?? '');
                        next[s.id] = deserializarPlantillaASlate(source);
                    }
                });
                return next;
            });
        }, [secciones]);

        // ── Detectar cambios sin guardar ──────────────────────────────────────
        useEffect(() => {
            if (!seccionActivaId || !isEditing) {
                onDirtyChange?.(false);
                return;
            }
            const seccion = secciones.find((s) => s.id === seccionActivaId);
            const original = seccion?.contenido_template ?? '';
            const { legacyText } = serializarSlateAPlantilla(
                localSlateContent[seccionActivaId] ?? [parrafoVacio()],
            );
            onDirtyChange?.(legacyText.trim() !== original.trim());
        }, [localSlateContent, seccionActivaId, secciones, isEditing, onDirtyChange]);

        // Cuando se desactiva el modo edicion, revertir el contenido local al guardado
        // (solo si se cancelo, no si se guardo exitosamente)
        const prevEditingRef = useRef(isEditing);
        useEffect(() => {
            if (prevEditingRef.current && !isEditing && seccionActivaId) {
                if (justSavedRef.current) {
                    // Se detuvo la edicion por guardado: mantener localSlateContent actualizado
                    justSavedRef.current = false;
                } else {
                    // Se cancelo la edicion: revertir al contenido guardado en BD
                    const seccion = secciones.find((s) => s.id === seccionActivaId);
                    if (seccion) {
                        const source =
                            seccion.contenido_template_estructurado?.length
                                ? seccion.contenido_template_estructurado
                                : (seccion.contenido_template ?? '');
                        setLocalSlateContent((prev) => ({
                            ...prev,
                            [seccionActivaId]: deserializarPlantillaASlate(source),
                        }));
                    }
                }
            }
            prevEditingRef.current = isEditing;
        }, [isEditing, seccionActivaId, secciones]);

        // ── Scroll automatico a la seccion activa ────────────────────────────
        useEffect(() => {
            if (seccionActivaId !== null) {
                const el = seccionRefs.current[seccionActivaId];
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            }
        }, [seccionActivaId]);

        // ── Insertar etiqueta en el editor Slate activo ───────────────────────
        const insertarTexto = useCallback(
            (texto: string) => {
                if (!slateEditorRef.current) return;
                // El texto puede venir como "[clave]" desde PanelEtiquetas o drag-drop
                const match = texto.match(/^\[([^\]]+)\]$/);
                if (match) {
                    slateEditorRef.current.insertarEtiquetaEnCursor(match[1]);
                }
            },
            [],
        );

        // ── Envolver seleccion: mapea HTML tags legacy a marcas Slate ─────────
        const wrapSelection = useCallback(
            (abre: string, _cierra: string) => {
                if (!slateEditorRef.current) return;
                const mark = HTML_TAG_TO_MARK[abre];
                if (mark) {
                    slateEditorRef.current.toggleMark(mark);
                }
            },
            [],
        );

        // ── Guardar seccion activa ─────────────────────────────────────────────
        const handleGuardar = useCallback(async () => {
            if (!seccionActivaId) return;
            const seccion = secciones.find((s) => s.id === seccionActivaId);
            if (!seccion) return;
            const nodes = localSlateContent[seccionActivaId] ?? [parrafoVacio()];
            const { json, legacyText } = serializarSlateAPlantilla(nodes);
            try {
                await updateSeccion({
                    plantillaId: Number(plantillaId),
                    seccionId: seccion.id,
                    data: {
                        contenido_template: legacyText,
                        contenido_template_estructurado: JSON.parse(json) as TSlateNode[],
                        titulo: seccion.titulo,
                    },
                }).unwrap();
                toast.success('Seccion guardada');
                // Marcar que la parada de edicion es por guardado exitoso
                justSavedRef.current = true;
                onSaved();
                onStopEditar();
            } catch (err: unknown) {
                toast.error(getErrorMessage(err));
            }
        }, [
            seccionActivaId,
            secciones,
            localSlateContent,
            plantillaId,
            updateSeccion,
            onSaved,
            onStopEditar,
        ]);

        const handleSaveTitulo = useCallback(
            async (seccion: ISeccionPlantilla) => {
                const trimmed = draftTitulo.trim();
                if (trimmed === seccion.titulo) {
                    setEditingTituloId(null);
                    return;
                }
                try {
                    await updateSeccion({
                        plantillaId: Number(plantillaId),
                        seccionId: seccion.id,
                        data: { titulo: trimmed },
                    }).unwrap();
                    setEditingTituloId(null);
                } catch (err: unknown) {
                    toast.error(getErrorMessage(err));
                }
            },
            [draftTitulo, plantillaId, updateSeccion],
        );

        const handleToggleNumero = useCallback(
            async (seccion: ISeccionPlantilla) => {
                try {
                    await updateSeccion({
                        plantillaId: Number(plantillaId),
                        seccionId: seccion.id,
                        data: { mostrar_numero: !seccion.mostrar_numero },
                    }).unwrap();
                } catch (err: unknown) {
                    toast.error(getErrorMessage(err));
                }
            },
            [plantillaId, updateSeccion],
        );

        // Ctrl+S para guardar
        useEffect(() => {
            const handler = (e: KeyboardEvent) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                    e.preventDefault();
                    if (isEditing) void handleGuardar();
                }
            };
            window.addEventListener('keydown', handler);
            return () => window.removeEventListener('keydown', handler);
        }, [isEditing, handleGuardar]);

        // ── Exponer metodos via ref ────────────────────────────────────────────
        useImperativeHandle(
            ref,
            () => ({ guardar: handleGuardar, wrapSelection, insertarTexto }),
            [handleGuardar, wrapSelection, insertarTexto],
        );

        const etiquetasMap = useMemo(() => {
            const map = new Map<string, IEtiquetaPlantilla>();
            etiquetas.forEach((et) => map.set(et.clave, et));
            return map;
        }, [etiquetas]);

        // ── Drag & drop de etiquetas ──────────────────────────────────────────
        const handleDragOver = useCallback((e: React.DragEvent) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
        }, []);

        const handleDrop = useCallback(
            (e: React.DragEvent) => {
                e.preventDefault();
                e.stopPropagation();
                const texto = e.dataTransfer.getData('text/plain');
                if (texto) insertarTexto(texto);
            },
            [insertarTexto],
        );

        // ── Calcular numero romano para clausulas ─────────────────────────────
        const seccionesConHeading = secciones.filter((s) =>
            TIPOS_CON_HEADING.includes(s.tipo),
        );
        const getClausulaNum = (id: number): number | null => {
            const idx = seccionesConHeading.findIndex((s) => s.id === id);
            return idx >= 0 ? idx + 1 : null;
        };

        // Separar seccion titulo del resto
        const tituloSeccion = secciones.find((s) => s.tipo === 'titulo');
        const contentSecciones = secciones.filter((s) => s.tipo !== 'titulo');

        // Texto del titulo serializado desde nodos Slate
        const tituloTexto = tituloSeccion
            ? serializarSlateAPlantilla(
                  localSlateContent[tituloSeccion.id] ?? [parrafoVacio()],
              ).legacyText.trim() || tituloSeccion.contenido_template || tituloPagina
            : tituloPagina;

        const tipoContratoLabels: Record<string, string> = {
            trabajador: 'Contrato Laboral',
            servicios: 'Servicios',
            licencia: 'Licenciamiento',
            venta: 'Venta',
            finiquito: 'Finiquito de Contrato',
        };
        const tipoLabel = plantillaTipoContrato
            ? (tipoContratoLabels[plantillaTipoContrato] ?? plantillaTipoContrato)
            : 'Contrato';

        // Lista unificada de secciones + bloques para el documento
        type TDocItem =
            | { kind: 'seccion'; orden: number; data: ISeccionPlantilla }
            | { kind: 'bloque'; orden: number; data: IOrdenBloqueTransversalPlantilla };

        const docItems: TDocItem[] = [
            ...contentSecciones.map(
                (s): TDocItem => ({ kind: 'seccion', orden: s.orden, data: s }),
            ),
            ...bloques.map(
                (b): TDocItem => ({ kind: 'bloque', orden: b.posicion, data: b }),
            ),
        ].sort((a, b) => a.orden - b.orden);

        // ── Render ─────────────────────────────────────────────────────────────
        return (
            <div className='flex h-full flex-col overflow-hidden bg-[#e0e0e0] dark:bg-zinc-700'>
                <div className='flex-1 overflow-y-auto'>
                    <div className='px-8 py-10'>
                        {/* ── Pagina tipo A4 ─────────────────────────────────────────────── */}
                        <div className='mx-auto max-w-[760px] rounded-[2px] bg-white px-[80px] pb-[80px] pt-[60px] shadow-[0_8px_48px_rgba(0,0,0,0.18)]'>
                            {/* ── Titulo del documento ──────────────────────────────────────── */}
                            {viewMode === 'preview' ? (
                                /* ── Modo preview: header fiel al PDF ── */
                                <div
                                    className='mb-6'
                                    style={{ fontFamily: 'Times New Roman, Times, serif' }}>
                                    {/* Logo placeholder */}
                                    <div className='mb-4 flex items-start'>
                                        <div className='flex h-[34px] w-[108px] items-center justify-center rounded border border-dashed border-zinc-300 bg-zinc-50'>
                                            <span className='text-[9px] text-zinc-400'>
                                                Logo empresa
                                            </span>
                                        </div>
                                    </div>
                                    {/* Título y subtítulo */}
                                    <div className='mb-4 text-center'>
                                        <p className='text-[14px] font-bold uppercase leading-snug tracking-wide text-zinc-900'>
                                            {tituloTexto}
                                        </p>
                                        <p className='mt-0.5 text-[11px] text-zinc-600'>
                                            {tipoLabel}
                                        </p>
                                    </div>
                                    {/* Tabla partes */}
                                    <table
                                        className='mb-3 w-full border-collapse text-[10px]'
                                        style={{ borderColor: '#cccccc' }}>
                                        <thead>
                                            <tr>
                                                <th
                                                    className='border px-3 py-1.5 text-left text-[10px] font-bold'
                                                    style={{
                                                        background: '#f0f4f8',
                                                        borderColor: '#cccccc',
                                                        width: '50%',
                                                    }}>
                                                    EMPLEADOR
                                                </th>
                                                <th
                                                    className='border px-3 py-1.5 text-left text-[10px] font-bold'
                                                    style={{
                                                        background: '#f0f4f8',
                                                        borderColor: '#cccccc',
                                                        width: '50%',
                                                    }}>
                                                    TRABAJADOR
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {[
                                                [
                                                    { label: 'Nombre', val: '[nombre_empresa]' },
                                                    { label: 'Nombre', val: '[nombre_trabajador]' },
                                                ],
                                                [
                                                    { label: 'RUT', val: '[rut_empresa]' },
                                                    { label: 'RUT', val: '[rut_trabajador]' },
                                                ],
                                                [
                                                    {
                                                        label: 'Domicilio',
                                                        val: '[domicilio_empresa]',
                                                    },
                                                    {
                                                        label: 'Domicilio',
                                                        val: '[domicilio_trabajador]',
                                                    },
                                                ],
                                                [
                                                    {
                                                        label: 'Representante',
                                                        val: '[representante_legal]',
                                                    },
                                                    { label: 'Email', val: '[email_trabajador]' },
                                                ],
                                            ].map((fila, i) => (
                                                <tr key={i}>
                                                    {fila.map((celda, j) => (
                                                        <td
                                                            key={j}
                                                            className='border px-3 py-1'
                                                            style={{ borderColor: '#cccccc' }}>
                                                            <span className='block text-[8px] text-zinc-400'>
                                                                {celda.label}
                                                            </span>
                                                            <span
                                                                style={{
                                                                    color: '#9ca3af',
                                                                    fontStyle: 'italic',
                                                                }}>
                                                                {celda.val}
                                                            </span>
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {/* Tabla vigencia */}
                                    <table
                                        className='mb-6 w-full border-collapse text-[10px]'
                                        style={{ borderColor: '#cccccc' }}>
                                        <thead>
                                            <tr>
                                                {['Inicio', 'Término', 'Tipo'].map((h) => (
                                                    <th
                                                        key={h}
                                                        className='border px-3 py-1.5 text-left text-[10px] font-bold'
                                                        style={{
                                                            background: '#f0f4f8',
                                                            borderColor: '#cccccc',
                                                        }}>
                                                        {h}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                {[
                                                    '[fecha_inicio]',
                                                    '[fecha_termino]',
                                                    '[tipo_contrato_label]',
                                                ].map((val) => (
                                                    <td
                                                        key={val}
                                                        className='border px-3 py-1'
                                                        style={{
                                                            borderColor: '#cccccc',
                                                            color: '#9ca3af',
                                                            fontStyle: 'italic',
                                                        }}>
                                                        {val}
                                                    </td>
                                                ))}
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            ) : tituloSeccion ? (
                                /* ── Modo editor: título clicable ── */
                                <div
                                    className={[
                                        'mb-8 rounded-[3px] text-center transition-all duration-150',
                                        tituloSeccion.id === seccionActivaId
                                            ? 'outline outline-2 outline-blue-400 outline-offset-2 py-1'
                                            : 'cursor-pointer hover:bg-blue-50/50',
                                    ].join(' ')}
                                    role='button'
                                    tabIndex={0}
                                    title='Haz clic para editar el título del documento'
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && tituloSeccion.id !== seccionActivaId)
                                            onSelectSeccion(tituloSeccion);
                                    }}
                                    onClick={() =>
                                        tituloSeccion.id !== seccionActivaId &&
                                        onSelectSeccion(tituloSeccion)
                                    }>
                                    <p className='text-[15px] font-bold uppercase leading-snug tracking-wide text-zinc-900'>
                                        {tituloTexto}
                                    </p>
                                </div>
                            ) : (
                                <div className='mb-8 text-center'>
                                    <p className='text-[15px] font-bold uppercase leading-snug tracking-wide text-zinc-900'>
                                        {tituloTexto}
                                    </p>
                                </div>
                            )}

                            {/* ── Secciones del documento ───────────────────────────────────── */}
                            {docItems.map((item) => {
                                if (item.kind === 'bloque') {
                                    const bloque = item.data;
                                    return (
                                        <div
                                            key={`bloque-${bloque.id}`}
                                            className='my-4 rounded border border-dashed border-zinc-300 bg-zinc-50 px-6 py-4 dark:border-zinc-600 dark:bg-zinc-800/40'>
                                            <p className='mb-1 text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500'>
                                                {bloque.bloque_detalle?.titulo ?? 'Bloque transversal'}
                                            </p>
                                            <p className='text-[12px] italic text-zinc-400 dark:text-zinc-500'>
                                                Se generara automaticamente al emitir el contrato.
                                            </p>
                                        </div>
                                    );
                                }

                                const seccion = item.data;
                                const isActive = seccion.id === seccionActivaId;
                                const isEditingThis = isActive && isEditing;
                                const slateNodes =
                                    localSlateContent[seccion.id] ?? [parrafoVacio()];
                                const clausulaNum = getClausulaNum(seccion.id);

                                // ── Salto de p\u00e1gina: render especial sin editor ───────
                                if (seccion.tipo === 'salto_pagina') {
                                    return (
                                        <div
                                            key={seccion.id}
                                            ref={(el) => {
                                                seccionRefs.current[seccion.id] = el;
                                            }}
                                            role='button'
                                            tabIndex={0}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !isActive)
                                                    onSelectSeccion(seccion);
                                            }}
                                            onClick={() => !isActive && onSelectSeccion(seccion)}
                                            style={{ pageBreakAfter: 'always' }}
                                            className={[
                                                'my-6 flex items-center gap-3 select-none rounded-[3px] transition-all duration-150',
                                                isActive
                                                    ? 'outline outline-2 outline-blue-400 outline-offset-1'
                                                    : 'cursor-pointer hover:bg-blue-50/50',
                                            ].join(' ')}>
                                            <div className='h-px flex-1 border-t-2 border-dashed border-zinc-300 dark:border-zinc-600' />
                                            <span className='shrink-0 text-[10px] uppercase tracking-widest text-zinc-400 dark:text-zinc-500'>
                                                Salto de p\u00e1gina
                                            </span>
                                            <div className='h-px flex-1 border-t-2 border-dashed border-zinc-300 dark:border-zinc-600' />
                                        </div>
                                    );
                                }

                                return (
                                    <div
                                        key={seccion.id}
                                        ref={(el) => {
                                            seccionRefs.current[seccion.id] = el;
                                        }}
                                        {...(viewMode === 'editor' && {
                                            role: 'button',
                                            tabIndex: 0,
                                            onKeyDown: (e: React.KeyboardEvent) => {
                                                if (e.key === 'Enter' && !isActive)
                                                    onSelectSeccion(seccion);
                                            },
                                            onClick: () => !isActive && onSelectSeccion(seccion),
                                        })}
                                        className={[
                                            'relative rounded-[3px] transition-all duration-150',
                                            viewMode === 'editor'
                                                ? isActive
                                                    ? 'outline outline-2 outline-blue-400 outline-offset-1 bg-blue-50/30 dark:bg-blue-950/10'
                                                    : 'cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/30'
                                                : '',
                                        ].join(' ')}>
                                        {/* ── Encabezado de seccion (solo clausulas) ─────── */}
                                        {TIPOS_CON_HEADING.includes(seccion.tipo) && (
                                            <div
                                                className={[
                                                    'mb-2 flex items-start gap-1',
                                                    clausulaNum !== null ? 'mt-7' : 'mt-4',
                                                ].join(' ')}>
                                                {clausulaNum !== null && (
                                                    <span
                                                        className={[
                                                            'shrink-0 text-[14px] font-bold uppercase tracking-wide text-zinc-900',
                                                            !seccion.mostrar_numero ? 'opacity-30' : '',
                                                        ].join(' ')}>
                                                        {seccion.mostrar_numero
                                                            ? `${toRoman(clausulaNum)}.`
                                                            : '—'}
                                                    </span>
                                                )}
                                                {editingTituloId === seccion.id ? (
                                                    <input
                                                        className='mb-2 w-full border-b border-blue-400 bg-transparent text-[14px] font-bold uppercase tracking-wide text-zinc-900 outline-none'
                                                        value={draftTitulo}
                                                        onChange={(e) => setDraftTitulo(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter')
                                                                void handleSaveTitulo(seccion);
                                                            if (e.key === 'Escape')
                                                                setEditingTituloId(null);
                                                        }}
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                ) : (
                                                    <p className='flex-1 text-[14px] font-bold uppercase tracking-wide text-zinc-900'>
                                                        {seccion.titulo.toUpperCase()}
                                                    </p>
                                                )}
                                                {viewMode === 'editor' &&
                                                    isActive &&
                                                    !isEditingThis &&
                                                    editingTituloId !== seccion.id && (
                                                        <div className='ml-auto flex shrink-0 items-center gap-1'>
                                                            <button
                                                                type='button'
                                                                title={
                                                                    seccion.mostrar_numero
                                                                        ? 'Ocultar numeración'
                                                                        : 'Mostrar numeración'
                                                                }
                                                                className='rounded p-0.5 text-[11px] text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700'
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    void handleToggleNumero(seccion);
                                                                }}>
                                                                {seccion.mostrar_numero ? '#' : '○'}
                                                            </button>
                                                            <button
                                                                type='button'
                                                                title='Editar título'
                                                                className='rounded p-0.5 text-[11px] text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700'
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setDraftTitulo(seccion.titulo);
                                                                    setEditingTituloId(seccion.id);
                                                                }}>
                                                                ✏
                                                            </button>
                                                        </div>
                                                    )}
                                            </div>
                                        )}

                                        {/* ── Subtitulo ─────────────────────────────────────── */}
                                        {seccion.tipo === 'subtitulo' && (
                                            <div className='mb-2 mt-5 flex items-center gap-1'>
                                                {editingTituloId === seccion.id ? (
                                                    <input
                                                        className='w-full border-b border-blue-400 bg-transparent text-[13px] font-semibold text-zinc-800 outline-none'
                                                        value={draftTitulo}
                                                        onChange={(e) => setDraftTitulo(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter')
                                                                void handleSaveTitulo(seccion);
                                                            if (e.key === 'Escape')
                                                                setEditingTituloId(null);
                                                        }}
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                ) : (
                                                    <p className='flex-1 text-[13px] font-semibold text-zinc-800'>
                                                        {seccion.titulo}
                                                    </p>
                                                )}
                                                {isActive &&
                                                    !isEditingThis &&
                                                    editingTituloId !== seccion.id && (
                                                        <button
                                                            type='button'
                                                            title='Editar título'
                                                            className='shrink-0 rounded p-0.5 text-[11px] text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700'
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setDraftTitulo(seccion.titulo);
                                                                setEditingTituloId(seccion.id);
                                                            }}>
                                                            ✏
                                                        </button>
                                                    )}
                                            </div>
                                        )}

                                        {/* ── Firmas ────────────────────────────────────────── */}
                                        {seccion.tipo === 'firmas' && viewMode === 'preview' ? (
                                            <div
                                                className='mt-10'
                                                style={{
                                                    fontFamily: 'Times New Roman, Times, serif',
                                                }}>
                                                <table className='w-full border-collapse text-[10px]'>
                                                    <tbody>
                                                        <tr>
                                                            <td
                                                                className='w-1/2 px-4 pb-2 pt-10 text-center align-bottom'
                                                                style={{ paddingBottom: 4 }}>
                                                                <div className='mx-auto mb-1 h-[36px] w-[160px] border-b border-zinc-400' />
                                                            </td>
                                                            <td
                                                                className='w-1/2 px-4 pb-2 pt-10 text-center align-bottom'
                                                                style={{ paddingBottom: 4 }}>
                                                                <div className='mx-auto mb-1 h-[36px] w-[160px] border-b border-zinc-400' />
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td className='px-4 py-1 text-center'>
                                                                <p className='font-semibold'>
                                                                    Firma del Empleador
                                                                </p>
                                                                <p
                                                                    style={{
                                                                        color: '#9ca3af',
                                                                        fontStyle: 'italic',
                                                                    }}>
                                                                    [nombre_empresa]
                                                                </p>
                                                            </td>
                                                            <td className='px-4 py-1 text-center'>
                                                                <p className='font-semibold'>
                                                                    Firma del Trabajador
                                                                </p>
                                                                <p
                                                                    style={{
                                                                        color: '#9ca3af',
                                                                        fontStyle: 'italic',
                                                                    }}>
                                                                    [nombre_trabajador]
                                                                </p>
                                                            </td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : seccion.tipo === 'firmas' ? (
                                            <p className='mb-2 mt-8 text-[13px] font-bold uppercase tracking-widest text-zinc-700'>
                                                {seccion.titulo}
                                            </p>
                                        ) : null}

                                        {/* ── Contenido de la seccion ──────────────────────── */}
                                        {(seccion.tipo !== 'subtitulo' || isEditingThis) && (
                                            <div
                                                className={[
                                                    'py-1',
                                                    isActive ? 'px-2' : 'px-0',
                                                ].join(' ')}
                                                onDragOver={isEditingThis ? handleDragOver : undefined}
                                                onDrop={isEditingThis ? handleDrop : undefined}>
                                                {isEditingThis ? (
                                                    /* ── Modo edicion: editor Slate ──────────────── */
                                                    <>
                                                        <SlateEditorV2
                                                            ref={slateEditorRef}
                                                            initialValue={slateNodes}
                                                            onChange={(nodes) =>
                                                                setLocalSlateContent((prev) => ({
                                                                    ...prev,
                                                                    [seccion.id]: nodes,
                                                                }))
                                                            }
                                                            etiquetasMap={etiquetasMap}
                                                            placeholder='Escribe el contenido aqui. Arrastra etiquetas desde el panel derecho.'
                                                            onDragOver={handleDragOver}
                                                            onDrop={handleDrop}
                                                        />
                                                        <div className='mb-1 mt-2 flex items-center justify-between gap-2'>
                                                            <span className='text-[11px] text-zinc-400'>
                                                                Arrastra etiquetas &bull; Ctrl+S para guardar
                                                            </span>
                                                            <div className='flex gap-2'>
                                                                <Button
                                                                    size='sm'
                                                                    variant='default'
                                                                    icon='HeroXMark'
                                                                    onClick={onStopEditar}>
                                                                    Cancelar
                                                                </Button>
                                                                <Button
                                                                    size='sm'
                                                                    color='blue'
                                                                    variant='solid'
                                                                    icon='HeroCheck'
                                                                    isLoading={isSaving}
                                                                    onClick={() => void handleGuardar()}>
                                                                    Guardar
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </>
                                                ) : isSlateEmpty(slateNodes) &&
                                                  [
                                                      'clausula',
                                                      'condiciones_generales',
                                                      'libre',
                                                      'encabezado',
                                                  ].includes(seccion.tipo) ? (
                                                    /* ── Placeholder: seccion vacia ── */
                                                    <p className='py-2 italic text-[12px] text-zinc-400'>
                                                        Sin contenido &mdash; clic para editar
                                                    </p>
                                                ) : (
                                                    /* ── Modo vista: HTML desde nodos Slate ── */
                                                    <div
                                                        className={[
                                                            'leading-relaxed',
                                                            viewMode === 'preview'
                                                                ? 'text-[11px]'
                                                                : 'text-[13px]',
                                                            TIPOS_PARRAFO.includes(seccion.tipo)
                                                                ? 'text-zinc-800'
                                                                : 'text-zinc-700',
                                                        ].join(' ')}
                                                        style={{
                                                            fontFamily: 'Times New Roman, Times, serif',
                                                        }}
                                                        // eslint-disable-next-line react/no-danger
                                                        dangerouslySetInnerHTML={{
                                                            __html: renderSlateNodesToHTML(
                                                                slateNodes,
                                                                etiquetasMap,
                                                                viewMode,
                                                            ),
                                                        }}
                                                    />
                                                )}
                                            </div>
                                        )}

                                        {/* ── Boton Editar (solo en modo editor) ── */}
                                        {viewMode === 'editor' && isActive && !isEditingThis && (
                                            <div className='absolute right-2 top-2'>
                                                {seccion.es_editable_en_contrato ? (
                                                    <Button
                                                        size='sm'
                                                        color='blue'
                                                        variant='solid'
                                                        icon='HeroPencil'
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onStartEditar();
                                                        }}>
                                                        Editar
                                                    </Button>
                                                ) : (
                                                    <span className='rounded border border-zinc-200 bg-zinc-100 px-2 py-1 text-[11px] text-zinc-400'>
                                                        Seccion fija
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        );
    },
);

PanelDocumento.displayName = 'PanelDocumento';

export default PanelDocumento;