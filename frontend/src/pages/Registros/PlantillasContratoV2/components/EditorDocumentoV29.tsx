import Icon from '@/components/icon/Icon';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import Modal, { ModalBody, ModalFooter, ModalHeader } from '@/components/ui/Modal';
import type { IEtiquetaPlantilla } from '@/interface/plantillaContrato.interface';
import type {
    IConfigPaginaV29,
    IFirmante,
    IPlantillaContratoV2,
    TMarksTexto,
    TNodoBloqueTransversal,
    TNodoCeldaTabla,
    TNodoCondicional,
    TNodoEtiqueta,
    TNodoFirma,
    TNodoHeading,
    TNodoParrafo,
    TNodoSaltoPagina,
    TNodoTabla,
    TNodoTexto,
    TSlateNode,
} from '@/interface/plantillaContratoV2.interface';
import { useUpdatePlantillaV2Mutation } from '@/store/slices/contratos/plantillaContratoV2Api';
import { CATEGORIA_CHIP_SOLIDO, CATEGORIA_DEFAULT } from '@/utils/categoriaEtiquetaColores';
import { getErrorMessage } from '@/utils/errorHandlers';
import {
    crearTabla,
    deserializarPlantillaASlate,
    insertarEtiqueta,
    insertarSaltoPagina,
    obtenerContenidoEncabezadoPie,
    obtenerFirmantes,
    parrafoVacio,
    withEtiquetas,
    withTablas,
} from '@/utils/slatePlantillas';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import type { BaseSelection } from 'slate';
import { createEditor, Descendant, Editor, Element, Node, Range, Text, Transforms } from 'slate';
import { HistoryEditor, withHistory } from 'slate-history';
import { Editable, ReactEditor, type RenderElementProps, type RenderLeafProps, Slate, withReact } from 'slate-react';
import EncabezadoPieEditor, { EncabezadoPiePreview, type TZonaEncabezadoPie } from './EncabezadoPieEditor';
import PanelEtiquetas from './PanelEtiquetas';
import TablaElement from './TablaElement';
import {
    calcularCortesDesdeAlturas,
    IPaginationBreak,
    PAGE_CONFIGS,
    PAGE_GAP,
    PAGE_PADDING,
} from './paginacionV29';
import usePreviewV29 from './usePreviewV29';

// ─── Constantes ───────────────────────────────────────────────────────────────

const CONDICIONES_LABELS: Record<string, string> = {
    solo_plazo_fijo:      'Solo plazo fijo',
    solo_indefinido:      'Solo indefinido',
    solo_reemplazo:       'Solo reemplazo',
    si_bono_colacion:     'Si bono colación',
    si_bono_movilizacion: 'Si bono movilización',
    si_grupo_turno:       'Si tiene grupo de turno',
    si_gratificacion:     'Si tiene gratificación',
    si_jornada_parcial:   'Si jornada parcial',
    si_banco:             'Si pago por banco',
    si_isapre:            'Si Isapre',
};

// Layouts de firma disponibles al insertar — reemplazan el <select> plano de
// roles: cada uno define cuántas líneas trae y el label default de cada una.
// 'ambos' arranca con Empleador primero (orden pedido para el layout de 2 líneas).
type TLayoutFirma = 'trabajador' | 'empleador' | 'ambos';
const FIRMA_LAYOUTS: { clave: TLayoutFirma; label: string; sub: string; defaults: string[] }[] = [
    { clave: 'trabajador', label: 'Solo firma del trabajador', sub: 'Una línea — "Trabajador"', defaults: ['Trabajador'] },
    { clave: 'empleador', label: 'Solo firma del empleador', sub: 'Una línea — "Empleador"', defaults: ['Empleador'] },
    { clave: 'ambos', label: 'Trabajador y empleador', sub: 'Dos líneas lado a lado', defaults: ['Empleador', 'Trabajador'] },
];

// Fallback para claves sin categoría reconocida (ej. etiqueta huérfana de una versión vieja de la plantilla).
const CHIP_CLASS_DEFAULT = CATEGORIA_CHIP_SOLIDO[CATEGORIA_DEFAULT];

const CONFIG_DEFAULT: IConfigPaginaV29 = {
    tamano: 'carta',
    fuente: 'Arial, sans-serif',
    encabezado: { activo: false, contenido: [{ type: 'parrafo', children: [{ text: '' }] }], logo_auto: true, logo_lado: 'izquierda' },
    pie: { activo: false, contenido: [{ type: 'parrafo', children: [{ text: '' }] }], numeracion: true },
};

// ─── Handle ───────────────────────────────────────────────────────────────────

export interface IEditorDocumentoV29Handle {
    guardar: () => Promise<void>;
    insertarEtiqueta: (clave: string) => void;
    wrapSelection: (abre: string, cierra: string) => void;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface IEditorDocumentoV29Props {
    plantilla: IPlantillaContratoV2;
    etiquetas: IEtiquetaPlantilla[];
    viewMode: 'editor' | 'preview';
    onDirtyChange: (dirty: boolean) => void;
    onSaved: () => void;
    onStopEditar: () => void;
}

// ─── Helper: formato etiqueta ─────────────────────────────────────────────────

const formatEtiquetaLabel = (clave: string, mapa: Map<string, IEtiquetaPlantilla>): string => {
    const found = mapa.get(clave);
    if (found) return found.nombre_display;
    return clave.replace(/^[^.]+\./, '').replace(/[_.]/g, ' ').trim();
};

// ─── Componente ───────────────────────────────────────────────────────────────

const EditorDocumentoV29 = forwardRef<IEditorDocumentoV29Handle, IEditorDocumentoV29Props>(
    ({ plantilla, etiquetas, viewMode, onDirtyChange, onSaved }, ref) => {
        // ── Estado ───────────────────────────────────────────────────────────
        const originalRef = useRef<string>(JSON.stringify(plantilla.contenido_documento_v29 ?? []));
        const [value, setValue] = useState<TSlateNode[]>(() =>
            deserializarPlantillaASlate(plantilla.contenido_documento_v29),
        );
        const [configPagina, setConfigPagina] = useState<IConfigPaginaV29>(
            plantilla.config_pagina_v29 ?? CONFIG_DEFAULT,
        );
        const [condicionesSimuladas, setCondicionesSimuladas] = useState<Record<string, boolean>>({});
        const [modalFirmaOpen, setModalFirmaOpen] = useState(false);
        const [insertDropdownOpen, setInsertDropdownOpen] = useState(false);
        // ── Selector de grilla estilo Word para insertar tablas ────────────────
        const [tablaMenuOpen, setTablaMenuOpen] = useState(false);
        const [tablaGridHover, setTablaGridHover] = useState({ cols: 0, rows: 0 });
        // ── Modal de firma: layout elegido + líneas editables (orden = orden visual) ──
        const [layoutFirma, setLayoutFirma] = useState<TLayoutFirma>('trabajador');
        const [firmantesModal, setFirmantesModal] = useState<string[]>(['Trabajador']);
        const dragFirmanteIdxRef = useRef<number | null>(null);
        // ── Condicional inline: selección + tooltip flotante ──────────────────
        const [selectionRect, setSelectionRect] = useState<DOMRect | null>(null);
        const [tipoMenuOpen, setTipoMenuOpen] = useState(false);
        // ── Encabezado / pie: cuál está en modo edición (uno a la vez) ─────────
        const [zonaEditando, setZonaEditando] = useState<TZonaEncabezadoPie | null>(null);

        // ── Refs para closures ────────────────────────────────────────────────
        const lastSelectionRef = useRef<BaseSelection>(null);
        const colorInputRef = useRef<HTMLInputElement>(null);
        const encabezadoRef = useRef<HTMLDivElement>(null);
        const pieRef = useRef<HTMLDivElement>(null);
        const documentContainerRef = useRef<HTMLDivElement>(null);
        // Un div por nodo top-level en modo preview (mide altura para paginación,
        // igual que ReactEditor.toDOMNode hace en modo editor — ver calcularCortes).
        const previewBlockRefs = useRef<(HTMLDivElement | null)[]>([]);

        // ── Vista previa v2.9 (HTML real del backend, sin persistir) ──────────
        const {
            bloques: previewBloques,
            encabezadoHtml: previewEncabezadoHtml,
            pieHtml: previewPieHtml,
            isFetching: previewFetching,
            error: previewError,
        } = usePreviewV29(plantilla.id, viewMode === 'preview', value, configPagina, condicionesSimuladas);

        // ── Editor Slate ─────────────────────────────────────────────────────
        const editor = useMemo(
            () => withTablas(withEtiquetas(withHistory(withReact(createEditor())))),
            [],
        );
        // Mini-editores independientes para encabezado y pie — sin los plugins
        // de tablas/etiquetas/condicionales, no tiene sentido anidar ese
        // vocabulario ahí. Cada uno es una instancia Slate propia (primer caso
        // en todo el frontend de dos editores Slate conviviendo en un mismo
        // componente — confirmado sin precedente antes de este cambio).
        const editorHeader = useMemo(() => withHistory(withReact(createEditor())), []);
        const editorFooter = useMemo(() => withHistory(withReact(createEditor())), []);
        // La toolbar principal actúa sobre el editor que esté "activo": el del
        // cuerpo por default, o el mini-editor de encabezado/pie mientras se
        // esté editando esa zona. Nunca hay dos zonas editándose a la vez
        // (zonaEditando es un único valor), así que un solo editor activo
        // alcanza — no hace falta un mapa de selección por editor.
        const editorActivo: Editor & HistoryEditor = zonaEditando === 'header' ? editorHeader : zonaEditando === 'footer' ? editorFooter : editor;

        // ── Mapa de etiquetas ─────────────────────────────────────────────────
        const etiquetasMap = useMemo(
            () => new Map(etiquetas.map((e) => [e.clave, e])),
            [etiquetas],
        );

        // ── Detección de cambios sin guardar ──────────────────────────────────
        useEffect(() => {
            const isDirty = JSON.stringify(value) !== originalRef.current;
            onDirtyChange(isDirty);
        }, [value, onDirtyChange]);

        // ── Mutación RTK ──────────────────────────────────────────────────────
        const [updatePlantilla] = useUpdatePlantillaV2Mutation();

        const handleGuardar = useCallback(async () => {
            try {
                await updatePlantilla({
                    id: plantilla.id,
                    contenido_documento_v29: value,
                    config_pagina_v29: configPagina,
                }).unwrap();
                originalRef.current = JSON.stringify(value);
                onDirtyChange(false);
                onSaved();
                toast.success('Documento guardado');
            } catch (err) {
                toast.error(getErrorMessage(err));
            }
        }, [plantilla.id, value, configPagina, updatePlantilla, onDirtyChange, onSaved]);

        // ── Encabezado / pie: activar+editar, abrir edición, quitar ───────────
        // El botón de la toolbar ya no es un simple on/off ciego: si la zona
        // está apagada la activa Y entra directo a edición (evita depender del
        // doble-click, que queda solo como atajo adicional); si ya está
        // activa, la abre para editar. Desactivar del todo vive en "Quitar
        // encabezado/pie" dentro de la barra contextual — ver EncabezadoPieEditor.
        const clickHF = useCallback((zona: TZonaEncabezadoPie) => {
            setConfigPagina((p) => {
                const zonaCfg = zona === 'header' ? p.encabezado : p.pie;
                if (zonaCfg.activo) return p; // ya activa: solo abrir edición, sin tocar config
                return zona === 'header'
                    ? { ...p, encabezado: { ...p.encabezado, activo: true } }
                    : { ...p, pie: { ...p.pie, activo: true } };
            });
            setZonaEditando(zona);
        }, []);

        const quitarZona = useCallback((zona: TZonaEncabezadoPie) => {
            setConfigPagina((p) => (
                zona === 'header'
                    ? { ...p, encabezado: { ...p.encabezado, activo: false } }
                    : { ...p, pie: { ...p.pie, activo: false } }
            ));
            setZonaEditando(null);
        }, []);

        const onChangeContenidoHeader = useCallback((nodes: TSlateNode[]) => {
            setConfigPagina((p) => ({ ...p, encabezado: { ...p.encabezado, contenido: nodes } }));
        }, []);
        const onChangeContenidoFooter = useCallback((nodes: TSlateNode[]) => {
            setConfigPagina((p) => ({ ...p, pie: { ...p.pie, contenido: nodes } }));
        }, []);

        // ── Layout de página: medición real de encabezado/pie ────────────────
        const [pageLayout, setPageLayout] = useState({ headerHeight: 0, footerHeight: 0 });

        useEffect(() => {
            const alturaConMargen = (el: HTMLElement | null): number => {
                if (!el) return 0;
                const st = getComputedStyle(el);
                // getBoundingClientRect().height (float), no el.offsetHeight (entero,
                // redondeado) — mezclar un entero con los demás términos en punto flotante
                // (marginTop/marginBottom vía parseFloat) acumulaba un desfasaje de hasta
                // ~1px por medición que, sumado entre encabezado y pie, corría el inicio
                // del contenido en páginas siguientes a la primera.
                return el.getBoundingClientRect().height + (parseFloat(st.marginTop) || 0) + (parseFloat(st.marginBottom) || 0);
            };
            const medir = () => {
                setPageLayout({
                    headerHeight: configPagina.encabezado.activo ? alturaConMargen(encabezadoRef.current) : 0,
                    footerHeight: configPagina.pie.activo ? alturaConMargen(pieRef.current) : 0,
                });
            };
            medir();
            const ro = new ResizeObserver(medir);
            if (encabezadoRef.current) ro.observe(encabezadoRef.current);
            if (pieRef.current) ro.observe(pieRef.current);
            return () => ro.disconnect();
            // viewMode y previewBloques: el div con encabezadoRef/pieRef se desmonta y
            // remonta al entrar a preview (mientras se muestra "Generando vista
            // previa…", ver el guard más abajo, y de nuevo cuando llega HTML nuevo) —
            // el ResizeObserver de una pasada anterior queda observando un nodo ya
            // desconectado del DOM y nunca se entera de que apareció uno nuevo. Sin
            // reconectar acá, pageLayout quedaba pegado en {0,0} para siempre después
            // de la primera vez que se entraba a Vista previa, y la paginación
            // calculaba el alto útil de página sin descontar encabezado/pie —
            // exactamente lo que producía el texto invadiendo esas zonas.
        }, [
            configPagina.encabezado.activo,
            configPagina.pie.activo,
            configPagina.encabezado.texto,
            configPagina.pie.texto,
            configPagina.fuente,
            viewMode,
            previewBloques,
        ]);

        const pageCfg = PAGE_CONFIGS[configPagina.tamano] ?? PAGE_CONFIGS.carta;
        const bodyHeight = Math.max(
            100,
            pageCfg.heightPx - PAGE_PADDING * 2 - pageLayout.headerHeight - pageLayout.footerHeight,
        );

        // ── Cálculo de cortes de página: offset exacto, sin mutar el árbol ────
        const calcularCortes = useCallback((): IPaginationBreak[] => {
            const nodes = editor.children as TSlateNode[];
            const zonaSeparador = PAGE_PADDING + pageLayout.footerHeight + PAGE_GAP + PAGE_PADDING + pageLayout.headerHeight;

            // Modo preview: no hay <Editable> montado (ver más abajo), así que no
            // existe DOM Slate que medir con ReactEditor.toDOMNode — se mide el div
            // plano que renderiza el HTML del backend para ese mismo índice.
            //
            // Sin `previewBloques` todavía (primer fetch en curso, aún no resolvió el
            // debounce) no hay nada real que medir — devolver cortes vacíos en vez de
            // reusar los últimos `cortes` calculados en modo editor (con fuente/tamaños
            // de Slate, no del HTML del backend): aplicar esos offsets viejos a un
            // documento que todavía no se paginó con datos reales es lo que producía la
            // superposición de texto y encabezados fuera de lugar la primera vez que se
            // entraba a Vista previa. El área del documento muestra un loading mientras
            // tanto (ver el render más abajo), así que esto nunca llega a pintarse.
            if (viewMode === 'preview') {
                if (!previewBloques) return [];
                const alturasPreview = nodes.map((node, i) => {
                    if (node.type === 'salto_pagina') return { height: 0, esSaltoPagina: true };
                    const dom = previewBlockRefs.current[i];
                    return { height: dom?.getBoundingClientRect().height ?? 0, esSaltoPagina: false };
                });
                return calcularCortesDesdeAlturas(alturasPreview, bodyHeight, zonaSeparador);
            }

            const alturas = nodes.map((node) => {
                if (node.type === 'salto_pagina') {
                    return { height: 0, esSaltoPagina: true };
                }
                try {
                    const dom = ReactEditor.toDOMNode(editor, node as any);
                    const st = getComputedStyle(dom);
                    // El offset de paginación se aplica como paddingTop (ver renderElement),
                    // no marginTop: márgenes verticales adyacentes colapsan al máximo en CSS
                    // (no se suman), así que un marginTop grande inyectado sobre un bloque
                    // colapsaría con el marginBottom del bloque anterior y el offset real
                    // aplicado quedaría más corto que el calculado — exactamente el bug que
                    // hacía que el texto de la página 2 en adelante invadiera el encabezado.
                    // padding nunca colapsa, así que offsetHeight ya lo incluye tal cual.
                    //
                    // El descuento se lee del paddingTop actual en el DOM (no de una ref con
                    // el offset "aplicado en la pasada anterior"): si el descuento viene de una
                    // ref, queda desincronizado cuando esta función se ejecuta de nuevo antes de
                    // que React haya terminado de pintar el padding de la pasada anterior — el
                    // offset "previo" ya no coincide con lo que el DOM realmente tiene en ese
                    // instante, y el descuento sale mal (incluso negativo). Leer paddingTop
                    // directo siempre está sincronizado con el DOM que se está midiendo.
                    const paddingTopActual = parseFloat(st.paddingTop) || 0;
                    // marginTop natural (ej. mt-4/mt-3/mt-2 de un heading) sigue sumando tal
                    // cual — el padding inyectado no lo toca, así que no necesita descuento.
                    // getBoundingClientRect().height (float), no offsetHeight (entero) — mismo
                    // motivo que en alturaConMargen: mezclar precisión entera y flotante entre
                    // encabezado/pie/nodos acumula un desfasaje visible página tras página.
                    const height = dom.getBoundingClientRect().height - paddingTopActual + (parseFloat(st.marginTop) || 0) + (parseFloat(st.marginBottom) || 0);
                    return { height, esSaltoPagina: false };
                } catch {
                    return { height: 0, esSaltoPagina: false };
                }
            });

            return calcularCortesDesdeAlturas(alturas, bodyHeight, zonaSeparador);
        }, [editor, bodyHeight, pageLayout.headerHeight, pageLayout.footerHeight, viewMode, previewBloques]);

        const [cortes, setCortes] = useState<IPaginationBreak[]>([]);
        // useLayoutEffect (no setTimeout): recalcula sincrónicamente, antes de que el
        // navegador pinte el frame. Con un debounce asíncrono queda una ventana visible
        // (~120ms) donde el contenido ya se insertó (ej. al pegar un texto grande) pero
        // los cortes aún reflejan el documento anterior — se ve texto sin paginar o
        // superpuesto con los encabezados/pies de páginas que aún no correspondían.
        // previewBloques en las deps: en modo preview el contenido medido (los divs
        // de previewBlockRefs) cambia cuando llega HTML nuevo del backend, no cuando
        // cambia `value` — sin esto los cortes quedarían pegados a la versión anterior.
        useLayoutEffect(() => {
            setCortes(calcularCortes());
        }, [value, bodyHeight, pageLayout, calcularCortes, previewBloques]);

        // ── Ctrl+S ────────────────────────────────────────────────────────────
        useEffect(() => {
            const handler = (e: KeyboardEvent) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                    e.preventDefault();
                    if (viewMode === 'editor') void handleGuardar();
                }
            };
            window.addEventListener('keydown', handler);
            return () => window.removeEventListener('keydown', handler);
        }, [viewMode, handleGuardar]);

        // ── Marks / formato ───────────────────────────────────────────────────
        const toggleMark = useCallback(
            (mark: keyof TMarksTexto) => {
                const isActive = !!(Editor.marks(editorActivo) as Record<string, unknown>)?.[mark];
                if (isActive) Editor.removeMark(editorActivo, mark);
                else Editor.addMark(editorActivo, mark, true);
            },
            [editorActivo],
        );

        const setAlign = useCallback(
            (align: TNodoParrafo['align']) => {
                // Restaurar selección si el editor perdió el foco antes del click
                if (!editorActivo.selection && lastSelectionRef.current) {
                    Transforms.select(editorActivo, lastSelectionRef.current);
                }
                Transforms.setNodes(
                    editorActivo,
                    { align } as Partial<TNodoParrafo>,
                    {
                        match: (n) =>
                            Element.isElement(n) &&
                            ((n as { type: string }).type === 'parrafo' ||
                                (n as { type: string }).type === 'heading'),
                    },
                );
                ReactEditor.focus(editorActivo);
            },
            [editorActivo],
        );

        const convertirBloque = useCallback(
            (tipo: string) => {
                if (tipo === 'parrafo') {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    Transforms.setNodes(editor, { type: 'parrafo' } as any, {
                        match: (n) => Element.isElement(n) && Editor.isBlock(editor, n),
                    });
                } else {
                    const level = parseInt(tipo.replace('heading-', ''), 10) as 1 | 2 | 3;
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    Transforms.setNodes(editor, { type: 'heading', level } as any, {
                        match: (n) => Element.isElement(n) && Editor.isBlock(editor, n),
                    });
                }
                ReactEditor.focus(editor);
            },
            [editor],
        );

        const toggleList = useCallback(
            (formato: 'ordenado' | 'desordenado') => {
                const [match] = Editor.nodes(editor, {
                    match: (n) =>
                        Element.isElement(n) && (n as { type: string }).type === 'listado',
                });
                if (match) {
                    Transforms.unwrapNodes(editor, {
                        match: (n) =>
                            Element.isElement(n) && (n as { type: string }).type === 'listado',
                        split: true,
                    });
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    Transforms.setNodes(editor, { type: 'parrafo' } as any);
                } else {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    Transforms.setNodes(editor, { type: 'item-listado' } as any);
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    Transforms.wrapNodes(editor, { type: 'listado', formato, children: [] } as any);
                }
                ReactEditor.focus(editor);
            },
            [editor],
        );

        const handleColorChange = useCallback(
            (color: string) => {
                if (lastSelectionRef.current) Transforms.select(editorActivo, lastSelectionRef.current);
                ReactEditor.focus(editorActivo);
                Editor.addMark(editorActivo, 'color', color);
            },
            [editorActivo],
        );

        // ── Insertar etiqueta (desde panel derecho) ───────────────────────────
        const handleInsertarEtiqueta = useCallback(
            (clave: string) => {
                ReactEditor.focus(editor);
                if (lastSelectionRef.current) Transforms.select(editor, lastSelectionRef.current);
                insertarEtiqueta(editor, clave);
            },
            [editor],
        );

        // ── wrapSelection (compat con v2 para Ctrl+B etc desde PanelDocumento) ─
        const handleWrapSelection = useCallback(
            (abre: string) => {
                if (abre.includes('b') || abre.includes('strong')) toggleMark('bold');
                else if (abre.includes('i') || abre.includes('em')) toggleMark('italic');
                else if (abre.includes('u')) toggleMark('underline');
                ReactEditor.focus(editor);
            },
            [toggleMark, editor],
        );

        // ── Modal de firma: elegir layout, editar líneas, reordenar ───────────
        const abrirModalFirma = useCallback(() => {
            const layout = FIRMA_LAYOUTS[0];
            setLayoutFirma(layout.clave);
            setFirmantesModal(layout.defaults);
            setModalFirmaOpen(true);
        }, []);

        const elegirLayoutFirma = useCallback((clave: TLayoutFirma) => {
            setLayoutFirma(clave);
            setFirmantesModal(FIRMA_LAYOUTS.find((l) => l.clave === clave)!.defaults);
        }, []);

        const editarFirmanteModal = useCallback((idx: number, texto: string) => {
            setFirmantesModal((prev) => prev.map((t, i) => (i === idx ? texto : t)));
        }, []);

        // Drag & drop entre las líneas del modal: soltar una línea sobre otra
        // intercambia su posición en el array — ese orden es el orden visual final.
        const onDragStartFirmante = useCallback((idx: number) => {
            dragFirmanteIdxRef.current = idx;
        }, []);
        const onDropFirmante = useCallback((idx: number) => {
            const origen = dragFirmanteIdxRef.current;
            dragFirmanteIdxRef.current = null;
            if (origen === null || origen === idx) return;
            setFirmantesModal((prev) => {
                const next = [...prev];
                const [movido] = next.splice(origen, 1);
                next.splice(idx, 0, movido);
                return next;
            });
        }, []);

        // ── Insertar bloque firma ─────────────────────────────────────────────
        const insertarFirma = useCallback(() => {
            const firmantes: IFirmante[] = firmantesModal.map((rol) => ({ rol: rol || '—' }));
            const nodo: TNodoFirma = {
                type: 'firma',
                firmantes,
                void: true,
                children: [{ text: '' }],
            };
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            Transforms.insertNodes(editor, nodo as any, { mode: 'highest' });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            Transforms.insertNodes(editor, parrafoVacio() as any);
            ReactEditor.focus(editor);
            setModalFirmaOpen(false);
        }, [editor, firmantesModal]);

        // ── Insertar tabla (grilla estilo Word: cols x rows elegidos por hover) ─
        const insertarTablaDesdeGrid = useCallback(
            (cols: number, rows: number) => {
                // Ancho de contenido real de la página (ancho de hoja menos el margen
                // izquierdo/derecho de 80px cada uno — ver el padding del contenedor de
                // contenido más abajo), no un valor adivinado: si no, la tabla nace más
                // angosta que el resto del documento en vez de ocupar todo el ancho.
                const anchoUtil = pageCfg.widthPx - 160;
                const nodo = crearTabla(cols, rows, anchoUtil);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                Transforms.insertNodes(editor, nodo as any, { mode: 'highest' });
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                Transforms.insertNodes(editor, parrafoVacio() as any);
                ReactEditor.focus(editor);
                setTablaMenuOpen(false);
                setInsertDropdownOpen(false);
                setTablaGridHover({ cols: 0, rows: 0 });
            },
            [editor, pageCfg],
        );

        // ── Eliminar nodo por path ────────────────────────────────────────────
        const eliminarNodo = useCallback(
            (element: TSlateNode) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const path = ReactEditor.findPath(editor as ReactEditor, element as any);
                Transforms.removeNodes(editor, { at: path });
            },
            [editor],
        );

        // ── renderElement ─────────────────────────────────────────────────────
        // Solo se invoca en modo editor: <Editable> no se monta en modo preview
        // (ver más abajo), así que no necesita ramas alternativas por viewMode.
        const renderElement = useCallback(
            (props: RenderElementProps) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const el = props.element as any as TSlateNode & { type: string };

                if (el.type === 'etiqueta') {
                    const etq = el as TNodoEtiqueta;
                    const label = formatEtiquetaLabel(etq.clave, etiquetasMap);
                    const categoria = etiquetasMap.get(etq.clave)?.categoria;
                    const chipClasses = (categoria && CATEGORIA_CHIP_SOLIDO[categoria]) || CHIP_CLASS_DEFAULT;
                    return (
                        <span
                            {...props.attributes}
                            contentEditable={false}
                            className='inline-block align-baseline'>
                            <span className={`inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${chipClasses}`}>
                                {label}
                                <button
                                    type='button'
                                    className='ml-0.5 leading-none opacity-60 hover:opacity-100'
                                    onMouseDown={(e) => { e.preventDefault(); eliminarNodo(etq); }}
                                    tabIndex={-1}>
                                    ×
                                </button>
                            </span>
                            {props.children}
                        </span>
                    );
                }

                if (el.type === 'salto_pagina') {
                    const sp = el as TNodoSaltoPagina;
                    // El corte real lo produce el marginTop inyectado en el bloque siguiente
                    // (ver calcularCortes) — este nodo solo marca el punto para el usuario.
                    return (
                        <div
                            {...props.attributes}
                            contentEditable={false}
                            className='group/manual relative my-1 flex h-4 select-none items-center justify-center'>
                            <div className='h-px w-full bg-zinc-300 dark:bg-zinc-600' />
                            <span className='absolute bg-white px-2 text-[9px] font-semibold uppercase tracking-widest text-zinc-400 dark:bg-zinc-900 dark:text-zinc-500'>
                                Salto de página
                            </span>
                            <button
                                type='button'
                                className='pointer-events-auto absolute right-2 hidden rounded bg-zinc-200 px-1 text-[10px] text-zinc-500 hover:bg-red-200 hover:text-red-600 group-hover/manual:flex dark:bg-zinc-700 dark:hover:bg-red-900 dark:hover:text-red-400'
                                onMouseDown={(e) => { e.preventDefault(); eliminarNodo(sp); }}>
                                ×
                            </button>
                            {props.children}
                        </div>
                    );
                }

                if (el.type === 'listado') {
                    const Tag = (el as { formato: string }).formato === 'ordenado' ? 'ol' : 'ul';
                    const cls = (el as { formato: string }).formato === 'ordenado'
                        ? 'list-decimal pl-6 mb-2'
                        : 'list-disc pl-6 mb-2';
                    return <Tag {...props.attributes} className={cls}>{props.children}</Tag>;
                }

                if ((el.type as string) === 'item-listado') {
                    return <li {...props.attributes}>{props.children}</li>;
                }

                if ((el.type as string) === 'tabla') {
                    return (
                        <TablaElement
                            attributes={props.attributes}
                            element={el as unknown as TNodoTabla}
                            editor={editor}
                            isEditor>
                            {props.children}
                        </TablaElement>
                    );
                }

                if ((el.type as string) === 'fila_tabla') {
                    return <tr {...props.attributes}>{props.children}</tr>;
                }

                if ((el.type as string) === 'celda_tabla') {
                    return (
                        <td
                            {...props.attributes}
                            className='border border-zinc-300 p-1.5 align-top text-[12.5px] focus-within:bg-blue-50'>
                            {props.children}
                        </td>
                    );
                }

                if (el.type === 'bloque_transversal') {
                    const bt = el as TNodoBloqueTransversal;
                    return (
                        <div
                            {...props.attributes}
                            contentEditable={false}
                            className='my-2 rounded border border-dashed border-zinc-300 bg-zinc-50 px-3 py-2 text-[11px] text-zinc-400'>
                            🔒 {bt.titulo}
                            {props.children}
                        </div>
                    );
                }

                if (el.type === 'condicional') {
                    const cond = el as TNodoCondicional;
                    const label = CONDICIONES_LABELS[cond.condition] ?? cond.condition;
                    return (
                        <div
                            {...props.attributes}
                            className='group relative my-2 rounded-r border-l-4 border-orange-400 bg-orange-50/30 pl-3 pr-2 pt-1 pb-2'>
                            <div
                                contentEditable={false}
                                className='mb-1 flex select-none items-center justify-between'>
                                <span className='rounded bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-600'>
                                    condicional: {label}
                                </span>
                                <button
                                    type='button'
                                    className='ml-2 hidden rounded px-1 text-[10px] text-zinc-400 hover:bg-red-100 hover:text-red-500 group-hover:flex'
                                    onMouseDown={(e) => { e.preventDefault(); eliminarNodo(cond); }}>
                                    ×
                                </button>
                            </div>
                            {props.children}
                        </div>
                    );
                }

                if (el.type === 'firma') {
                    const firma = el as TNodoFirma;
                    const firmantes = obtenerFirmantes(firma);
                    return (
                        <div
                            {...props.attributes}
                            contentEditable={false}
                            className='group relative my-4 flex justify-center gap-8 rounded border border-dashed border-zinc-300 bg-zinc-50 px-4 py-3'>
                            <span className='absolute -top-2.5 left-3 rounded bg-zinc-200 px-2 py-0.5 text-[10px] font-semibold text-zinc-500'>
                                Firma: {firmantes.map((f) => f.rol).join(' + ')}
                            </span>
                            {firmantes.map((f, i) => (
                                <div key={i} className='flex flex-col items-center gap-1'>
                                    <div className='w-40 border-t border-zinc-400' />
                                    <span className='text-[11px] text-zinc-600'>{f.rol}</span>
                                </div>
                            ))}
                            <button
                                type='button'
                                className='absolute right-1 top-1 hidden rounded px-1 text-[10px] text-zinc-400 hover:bg-red-100 hover:text-red-500 group-hover:flex'
                                onMouseDown={(e) => { e.preventDefault(); eliminarNodo(firma); }}>
                                ×
                            </button>
                            {props.children}
                        </div>
                    );
                }

                // Offset de paginación: si este nodo top-level es un punto de corte, un
                // paddingTop lo empuja al inicio del área de contenido de la página
                // siguiente. Es paddingTop y no marginTop a propósito: los márgenes
                // verticales adyacentes colapsan al máximo en CSS (no se suman), así que
                // un marginTop grande acá colapsaría con el marginBottom del bloque
                // anterior y el offset real terminaba siendo más corto que el calculado
                // — el texto de la página 2 en adelante quedaba invadiendo el encabezado.
                // padding nunca colapsa con márgenes de otros nodos.
                let cortePaddingTop: number | undefined;
                try {
                    const path = ReactEditor.findPath(editor as ReactEditor, el as any);
                    if (path.length === 1) {
                        cortePaddingTop = cortes.find((c) => c.index === path[0])?.offsetPx;
                    }
                } catch { /* ok */ }

                if (el.type === 'heading') {
                    const h = el as TNodoHeading;
                    const Tag = `h${h.level}` as 'h1' | 'h2' | 'h3';
                    const cls = {
                        1: 'text-xl font-bold mt-4 mb-2',
                        2: 'text-base font-bold uppercase tracking-wide mt-3 mb-1',
                        3: 'text-sm font-bold mt-2 mb-1',
                    }[h.level];
                    return (
                        <Tag
                            {...props.attributes}
                            className={cls}
                            style={{
                                ...(h.align ? { textAlign: h.align } : undefined),
                                ...(cortePaddingTop !== undefined ? { paddingTop: cortePaddingTop } : undefined),
                            }}>
                            {props.children}
                        </Tag>
                    );
                }

                // parrafo (default)
                const parrafo = el as TNodoParrafo;
                return (
                    <p
                        {...props.attributes}
                        className='mb-1 leading-relaxed'
                        style={{
                            ...(parrafo.align ? { textAlign: parrafo.align } : undefined),
                            ...(cortePaddingTop !== undefined ? { paddingTop: cortePaddingTop } : undefined),
                        }}>
                        {props.children}
                    </p>
                );
            },
            [etiquetasMap, eliminarNodo, configPagina, editor, cortes],
        );

        // Selector de pestaña del panel derecho en modo editor (Etiquetas / Índice).
        const [panelDerechoTab, setPanelDerechoTab] = useState<'etiquetas' | 'indice'>('etiquetas');
        // Path (como string) del condicional inline resaltado en el Índice tras
        // clickear su texto en el documento o su punto de margen.
        const [indiceResaltadoKey, setIndiceResaltadoKey] = useState<string | null>(null);

        // Click en el texto resaltado del documento o en su punto de margen → abre
        // (o cambia a) el tab Índice y resalta ahí la fila correspondiente, donde
        // vive el botón real de eliminar (el × del tooltip flotante del margen era
        // demasiado chico para clickear con comodidad).
        const irAIndiceCondicional = useCallback((path: number[]) => {
            setPanelDerechoTab('indice');
            const key = path.join('.');
            setIndiceResaltadoKey(key);
            setTimeout(() => {
                setIndiceResaltadoKey((actual) => (actual === key ? null : actual));
            }, 2000);
        }, []);

        // ── renderLeaf ────────────────────────────────────────────────────────
        const renderLeaf = useCallback((props: RenderLeafProps) => {
            const leaf = props.leaf as unknown as TNodoTexto;
            let { children } = props;
            if (leaf.bold) children = <strong>{children}</strong>;
            if (leaf.italic) children = <em>{children}</em>;
            if (leaf.underline) children = <u>{children}</u>;
            if (leaf.strikethrough) children = <s>{children}</s>;
            if (leaf.code)
                children = (
                    <code className='rounded bg-zinc-100 px-1 font-mono text-[12px]'>
                        {children}
                    </code>
                );
            if (leaf.color) children = <span style={{ color: leaf.color }}>{children}</span>;
            if (leaf.fontSize) children = <span style={{ fontSize: leaf.fontSize }}>{children}</span>;
            if (leaf.condicional) {
                children = (
                    <span
                        className='cursor-pointer rounded-sm border-b-2 border-orange-400 bg-orange-100 px-0.5 dark:border-orange-500 dark:bg-orange-900/30'
                        onMouseDown={() => {
                            // Sin preventDefault: el cursor se ubica normalmente, y además
                            // enfocamos esta fila en el tab Índice para poder eliminarla ahí.
                            try {
                                const path = ReactEditor.findPath(editor as ReactEditor, props.leaf as any);
                                irAIndiceCondicional(path);
                            } catch { /* ignorar */ }
                        }}>
                        {children}
                    </span>
                );
            }
            return <span {...props.attributes}>{children}</span>;
        }, [editor, irAIndiceCondicional]);

        // ── Keyboard shortcuts ────────────────────────────────────────────────
        const handleKeyDown = useCallback(
            (e: React.KeyboardEvent) => {
                if (e.ctrlKey || e.metaKey) {
                    if (e.key === 'b') { e.preventDefault(); toggleMark('bold'); }
                    if (e.key === 'i') { e.preventDefault(); toggleMark('italic'); }
                    if (e.key === 'u') { e.preventDefault(); toggleMark('underline'); }
                    return;
                }
                if (e.key === 'Tab') {
                    // Navegación de celdas estilo Word/Excel — sale del <celda_tabla>
                    // hacia la siguiente/anterior. Fuera de una tabla, Tab no se toca:
                    // sigue el comportamiento nativo del navegador (foco a otro control).
                    const celdaMatch = Editor.above(editor, {
                        match: (n) => Element.isElement(n) && (n as { type: string }).type === 'celda_tabla',
                    });
                    if (celdaMatch) {
                        e.preventDefault();
                        const [, celdaPath] = celdaMatch;
                        const filaPath = celdaPath.slice(0, -1);
                        const tablaPath = celdaPath.slice(0, -2);
                        const cIdx = celdaPath[celdaPath.length - 1];
                        const rIdx = filaPath[filaPath.length - 1];
                        const tabla = Node.get(editor, tablaPath) as unknown as TNodoTabla;
                        const numCols = tabla.children[rIdx].children.length;
                        const numFilas = tabla.children.length;

                        let destino: number[] | null = null;
                        if (!e.shiftKey && cIdx < numCols - 1) destino = [...tablaPath, rIdx, cIdx + 1];
                        else if (!e.shiftKey && rIdx < numFilas - 1) destino = [...tablaPath, rIdx + 1, 0];
                        else if (e.shiftKey && cIdx > 0) destino = [...tablaPath, rIdx, cIdx - 1];
                        else if (e.shiftKey && rIdx > 0) destino = [...tablaPath, rIdx - 1, tabla.children[rIdx - 1].children.length - 1];
                        if (destino) {
                            Transforms.select(editor, {
                                anchor: Editor.start(editor, destino),
                                focus: Editor.end(editor, destino),
                            });
                        }
                    }
                    return;
                }
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    // Si estamos en un heading, el bloque nuevo debe ser párrafo
                    const [headingMatch] = Editor.nodes(editor, {
                        match: (n) => Element.isElement(n) && (n as { type: string }).type === 'heading',
                        mode: 'highest',
                    });
                    if (headingMatch) {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        Transforms.insertNodes(editor, parrafoVacio() as any);
                    } else {
                        editor.insertBreak();
                    }
                }
            },
            [editor, toggleMark],
        );

        // ── Drop de etiqueta arrastrada desde el panel lateral ────────────────
        // PanelEtiquetas.tsx solo pone el texto "[clave]" en el dataTransfer (sin
        // MIME propio), así que sin este handler Slate usa su inserción de texto
        // plano por defecto — el resultado es un string suelto en el documento,
        // no el nodo void con chip coloreado que produce el botón "+".
        const handleDrop = useCallback(
            (e: React.DragEvent<HTMLDivElement>) => {
                const texto = e.dataTransfer.getData('text/plain');
                const match = /^\[([\w.]+)\]$/.exec(texto);
                if (!match) return; // no es una etiqueta arrastrada — comportamiento nativo
                e.preventDefault();
                try {
                    const range = ReactEditor.findEventRange(editor as ReactEditor, e);
                    Transforms.select(editor, range);
                } catch { /* si no se puede ubicar el punto exacto, se inserta en la selección actual */ }
                insertarEtiqueta(editor, match[1]);
            },
            [editor],
        );

        // ── Click en zona vacía de la página → cursor al final de esa página ──
        // Si el click no cayó sobre un bloque de texto real (ej. el espacio en
        // blanco debajo del último párrafo de la página), posiciona el cursor al
        // final del último bloque de ESA página específica, en vez de no hacer
        // nada. Clicks sobre header/footer o la franja gris entre páginas se
        // ignoran; clicks sobre una línea de texto usan el comportamiento nativo.
        const handleDocumentClick = useCallback(
            (e: React.MouseEvent<HTMLDivElement>) => {
                if (viewMode !== 'editor') return;
                // document.elementFromPoint (no e.target): si el mousedown que originó
                // este click ya disparó una mutación de Slate (ej. los botones +/× de una
                // tabla, que insertan/eliminan filas o columnas en su propio onMouseDown),
                // React puede haber desmontado el nodo que era e.target antes de que el
                // click llegue a bubblear — closest() sobre un nodo ya desconectado del
                // DOM no encuentra ancestros y este guard fallaba en silencio, dejando
                // pasar el salto de cursor al final de la página. Consultar el DOM actual
                // en las coordenadas del click no tiene ese problema.
                const elEnElPunto = document.elementFromPoint(e.clientX, e.clientY);
                if (elEnElPunto?.closest('[data-slate-node="element"]')) return;
                // Si el usuario venía arrastrando una selección de texto real y el mouseup
                // cayó fuera del bloque (overshoot al final de una línea corta), el click
                // resultante llega igual hasta este contenedor — sin este guard, pisaba la
                // selección recién hecha y saltaba el cursor al final de la página.
                const domSelection = window.getSelection();
                if (domSelection && !domSelection.isCollapsed) return;

                const container = documentContainerRef.current;
                if (!container) return;
                const rect = container.getBoundingClientRect();
                const relativeY = e.clientY - rect.top;

                const pageStride = pageCfg.heightPx + PAGE_GAP;
                const numPages = cortes.length + 1;
                const pageIndex = Math.max(0, Math.min(Math.floor(relativeY / pageStride), numPages - 1));
                const yEnPagina = relativeY - pageIndex * pageStride;

                const zonaHeaderFin = PAGE_PADDING + pageLayout.headerHeight;
                const zonaFooterInicio = pageCfg.heightPx - PAGE_PADDING - pageLayout.footerHeight;
                // Solo actuar dentro del área de contenido de la página (ni header, ni
                // footer, ni la franja gris entre tarjetas).
                if (yEnPagina < zonaHeaderFin || yEnPagina > zonaFooterInicio) return;

                const nodes = editor.children as TSlateNode[];
                const finDePagina = pageIndex < cortes.length ? cortes[pageIndex].index : nodes.length;

                let idx = finDePagina - 1;
                while (idx >= 0 && nodes[idx]?.type === 'salto_pagina') idx--;
                if (idx < 0) return;

                try {
                    const punto = Editor.end(editor, [idx]);
                    Transforms.select(editor, punto);
                    ReactEditor.focus(editor);
                } catch { /* posición inválida — ignorar */ }
            },
            [editor, viewMode, cortes, pageCfg, pageLayout.headerHeight, pageLayout.footerHeight],
        );

        // ── Outline: condicionales en el documento ────────────────────────────
        // Bloques viejos (nodo de tipo 'condicional', compatibilidad con documentos
        // guardados antes de este cambio) — ya no se pueden crear nuevos, solo mostrar.
        const condicionales = useMemo(
            () =>
                value.filter(
                    (n): n is TNodoCondicional => (n as { type: string }).type === 'condicional',
                ),
            [value],
        );

        // Condicionales nuevos: marca inline sobre fragmentos de texto (mecanismo actual).
        //
        // useState + useLayoutEffect, NO useMemo: un useMemo corre durante el render
        // del componente PADRE, antes de que <Slate> (hijo) alcance a sincronizar
        // editor.children con el `value` inicial cargado desde la plantilla — al
        // abrir una plantilla que YA tiene condicionales guardados, Editor.nodes()
        // se ejecutaba sobre un editor todavía con los children por defecto (vacíos),
        // encontraba cero condicionales, y como `value` no cambia hasta que el
        // usuario edita algo, el memo quedaba congelado en ese resultado vacío para
        // siempre — de ahí que los puntos de margen y el Índice aparecieran vacíos
        // solo al ABRIR una plantilla existente, nunca al crear uno en la sesión
        // actual (ahí sí hay una edición que dispara el recálculo). useLayoutEffect
        // corre después del commit, cuando editor.children ya está sincronizado.
        const [condicionalesInline, setCondicionalesInline] = useState<
            { nodo: TNodoTexto & { condicional: string }; path: number[] }[]
        >([]);

        useLayoutEffect(() => {
            const items: { nodo: TNodoTexto & { condicional: string }; path: number[] }[] = [];
            try {
                for (const [nodo, path] of Editor.nodes(editor, {
                    at: [],
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    match: (n) => Text.isText(n) && !!(n as any).condicional,
                })) {
                    items.push({ nodo: nodo as unknown as TNodoTexto & { condicional: string }, path: path as number[] });
                }
            } catch { /* editor aún sin children montados */ }
            setCondicionalesInline(items);
        }, [editor, value]);

        // Posición (top, en px relativos a documentContainerRef) de cada tarjeta de
        // margen — una por condicional inline. Se recalcula con useLayoutEffect (no
        // setTimeout) para no reintroducir el mismo bug de "flash" ya resuelto para
        // la paginación: si se mide de forma asíncrona, hay un frame donde la tarjeta
        // aparece en la posición vieja antes de saltar a la nueva.
        const [tarjetasMargen, setTarjetasMargen] = useState<{ nodo: TNodoTexto & { condicional: string }; path: number[]; top: number; left: number }[]>([]);

        useLayoutEffect(() => {
            if (viewMode !== 'editor') { setTarjetasMargen([]); return; }
            const container = documentContainerRef.current;
            if (!container) return;
            const containerRect = container.getBoundingClientRect();
            const crudas: { nodo: TNodoTexto & { condicional: string }; path: number[]; top: number }[] = [];
            for (const { nodo, path } of condicionalesInline) {
                try {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const dom = ReactEditor.toDOMNode(editor, nodo as any);
                    const rect = dom.getBoundingClientRect();
                    const top = rect.top - containerRect.top + rect.height / 2 - 14;
                    crudas.push({ nodo, path, top });
                } catch { /* nodo no montado aún — se recalculará en el próximo cambio */ }
            }
            // Si dos o más condicionales caen en la misma línea, sus puntos quedarían
            // exactamente superpuestos (mismo top) y el de más abajo en el DOM tapa a
            // los demás, dejándolos inaccesibles por hover/click. Se escalonan
            // horizontalmente los que comparten altura (dentro de una tolerancia de
            // una línea de texto) para que todos queden visibles y clickeables.
            const UMBRAL_MISMA_LINEA = 8;
            const siguiente: typeof tarjetasMargen = crudas.map((item, i) => {
                let ocupado = 0;
                for (let j = 0; j < i; j++) {
                    if (Math.abs(crudas[j].top - item.top) < UMBRAL_MISMA_LINEA) ocupado++;
                }
                return { ...item, left: -22 - ocupado * 13 };
            });
            setTarjetasMargen(siguiente);
        }, [editor, condicionalesInline, viewMode]);

        // Click en un ítem del Índice → hace scroll hasta ese bloque condicional en el documento.
        const irACondicional = useCallback(
            (nodo: TNodoCondicional) => {
                try {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const dom = ReactEditor.toDOMNode(editor, nodo as any);
                    dom.scrollIntoView({ behavior: 'smooth', block: 'center' });
                } catch { /* nodo no montado aún — ignorar */ }
            },
            [editor],
        );

        // ── Condicional inline (marca de texto) ───────────────────────────────
        // Click en una tarjeta de margen o en el Índice → scroll + resalte
        // temporal (vía estilo inline, no clase Tailwind, para no depender del
        // safelist) sobre el fragmento de texto condicional correspondiente.
        const focarCondicionalInline = useCallback(
            (nodo: unknown) => {
                try {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const dom = ReactEditor.toDOMNode(editor, nodo as any) as HTMLElement;
                    dom.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    const prevShadow = dom.style.boxShadow;
                    const prevBg = dom.style.backgroundColor;
                    dom.style.boxShadow = '0 0 0 2px #fb923c';
                    dom.style.backgroundColor = '#fed7aa';
                    setTimeout(() => {
                        dom.style.boxShadow = prevShadow;
                        dom.style.backgroundColor = prevBg;
                    }, 1400);
                } catch { /* nodo no montado aún — ignorar */ }
            },
            [editor],
        );

        // Slate dispara onChange también en cambios de selección pura (sin
        // tocar contenido). Lo aprovechamos para mostrar el tooltip flotante
        // cuando hay una selección no colapsada con texto real.
        const handleSlateChange = useCallback(
            (nodes: Descendant[]) => {
                setValue(nodes as TSlateNode[]);
                const sel = editor.selection;
                if (sel && !Range.isCollapsed(sel) && Editor.string(editor, sel).trim().length > 0) {
                    try {
                        const domRange = ReactEditor.toDOMRange(editor, sel);
                        setSelectionRect(domRange.getBoundingClientRect());
                    } catch { setSelectionRect(null); }
                } else {
                    setSelectionRect(null);
                    setTipoMenuOpen(false);
                }
            },
            [editor],
        );

        // Click en "Convertir en condicional" del tooltip flotante → abre el menú de tipos.
        const abrirMenuTipoCondicional = useCallback(() => {
            lastSelectionRef.current = editor.selection;
            setTipoMenuOpen(true);
        }, [editor]);

        // Click en un tipo del menú → aplica la marca sobre la selección guardada.
        const aplicarCondicionalInline = useCallback(
            (clave: string) => {
                if (lastSelectionRef.current) Transforms.select(editor, lastSelectionRef.current);
                Editor.addMark(editor, 'condicional', clave);
                // Colapsar la selección al final: si queda seleccionada, el highlight
                // azul nativo del navegador tapa visualmente el resaltado naranja recién aplicado.
                Transforms.collapse(editor, { edge: 'end' });
                setTipoMenuOpen(false);
                setSelectionRect(null);
                ReactEditor.focus(editor);
            },
            [editor],
        );

        // Quitar la marca condicional de un fragmento (el texto queda plano, no se borra).
        const quitarCondicionalInline = useCallback(
            (path: number[]) => {
                Transforms.unsetNodes(editor, 'condicional', { at: path, match: Text.isText });
            },
            [editor],
        );

        // ── useImperativeHandle ───────────────────────────────────────────────
        useImperativeHandle(
            ref,
            () => ({
                guardar: handleGuardar,
                insertarEtiqueta: handleInsertarEtiqueta,
                wrapSelection: handleWrapSelection,
            }),
            [handleGuardar, handleInsertarEtiqueta, handleWrapSelection],
        );

        // ─────────────────────────────────────────────────────────────────────
        return (
            <>
                <div className='flex min-h-0 flex-1 overflow-hidden'>
                    {/* ── Panel central: Editor ──────────────────────────────── */}
                    <div className='flex min-w-0 flex-1 flex-col overflow-hidden bg-zinc-100 dark:bg-zinc-800'>
                        {/* Toolbar — sticky para que no se pierda de vista al hacer scroll
                            dentro del área del documento (o si el contenedor externo llega a
                            desbordar la altura del viewport). */}
                        {viewMode === 'editor' && (
                            <div className='sticky top-0 z-10 flex shrink-0 flex-wrap items-center gap-0.5 border-b border-zinc-200 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900'>
                                {/* Tamaño de página: único formato soportado (Carta) — sin selector */}
                                <span
                                    title='Tamaño de página'
                                    className='rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[11px] text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400'>
                                    Carta
                                </span>
                                <select
                                    value={configPagina.fuente}
                                    onChange={(e) =>
                                        setConfigPagina((p) => ({ ...p, fuente: e.target.value }))
                                    }
                                    className='rounded border border-zinc-200 bg-zinc-50 px-1 py-0.5 text-[11px] text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'>
                                    <option value='Arial, sans-serif'>Arial</option>
                                    <option value='Times New Roman, serif'>Times New Roman</option>
                                    <option value='Georgia, serif'>Georgia</option>
                                    <option value='Courier New, monospace'>Courier New</option>
                                </select>

                                {/* Tipo de bloque — no aplica a encabezado/pie (solo saben renderizar párrafos) */}
                                <select
                                    disabled={zonaEditando !== null}
                                    title={zonaEditando !== null ? 'No disponible al editar encabezado/pie' : undefined}
                                    value={(() => {
                                        try {
                                            const [match] = Editor.nodes(editor, {
                                                match: (n) => Element.isElement(n) && Editor.isBlock(editor, n),
                                                mode: 'highest',
                                            });
                                            if (!match) return 'parrafo';
                                            const node = match[0] as { type: string; level?: number };
                                            if (node.type === 'heading') return `heading-${node.level ?? 1}`;
                                        } catch { /* sin selección */ }
                                        return 'parrafo';
                                    })()}
                                    onMouseDown={() => { lastSelectionRef.current = editor.selection; }}
                                    onChange={(e) => {
                                        if (lastSelectionRef.current) Transforms.select(editor, lastSelectionRef.current);
                                        convertirBloque(e.target.value);
                                    }}
                                    className='rounded border border-zinc-200 bg-zinc-50 px-1 py-0.5 text-[11px] text-zinc-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'>
                                    <option value='parrafo'>Párrafo</option>
                                    <option value='heading-1'>Título 1</option>
                                    <option value='heading-2'>Título 2</option>
                                    <option value='heading-3'>Título 3</option>
                                </select>

                                <div className='mx-1 h-4 w-px bg-zinc-200 dark:bg-zinc-700' />

                                {/* Marks */}
                                {(
                                    [
                                        { mark: 'bold' as const, icon: 'DuoBold' as const, title: 'Negrita (Ctrl+B)' },
                                        { mark: 'italic' as const, icon: 'DuoItalic' as const, title: 'Cursiva (Ctrl+I)' },
                                        { mark: 'underline' as const, icon: 'DuoUnderline' as const, title: 'Subrayado (Ctrl+U)' },
                                        { mark: 'strikethrough' as const, icon: 'DuoStrikethrough' as const, title: 'Tachado' },
                                    ] as const
                                ).map(({ mark, icon, title }) => (
                                    <button
                                        key={mark}
                                        type='button'
                                        title={title}
                                        onMouseDown={(e) => { e.preventDefault(); toggleMark(mark); }}
                                        className='rounded p-1 text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700'>
                                        <Icon icon={icon} className='h-3 w-3' />
                                    </button>
                                ))}

                                {/* Tamaño de fuente */}
                                <select
                                    onMouseDown={() => { lastSelectionRef.current = editorActivo.selection; }}
                                    onChange={(e) => {
                                        if (!e.target.value) return;
                                        if (lastSelectionRef.current) {
                                            Transforms.select(editorActivo, lastSelectionRef.current);
                                        }
                                        Editor.addMark(editorActivo, 'fontSize', e.target.value);
                                        e.target.value = '';
                                        ReactEditor.focus(editorActivo);
                                    }}
                                    className='rounded border border-zinc-200 bg-zinc-50 px-1 py-0.5 text-[11px] text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'>
                                    <option value=''>Tam.</option>
                                    {['8pt','9pt','10pt','11pt','12pt','14pt','16pt','18pt','22pt'].map((s) => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>

                                {/* Color */}
                                <div className='relative'>
                                    <input
                                        ref={colorInputRef}
                                        type='color'
                                        defaultValue='#2563eb'
                                        onChange={(e) => handleColorChange(e.target.value)}
                                        onMouseDown={() => { lastSelectionRef.current = editorActivo.selection; }}
                                        className='sr-only'
                                        tabIndex={-1}
                                    />
                                    <button
                                        type='button'
                                        title='Color de texto'
                                        onMouseDown={(e) => { e.preventDefault(); lastSelectionRef.current = editorActivo.selection; colorInputRef.current?.click(); }}
                                        className='rounded px-2 py-0.5 text-[12px] font-bold text-blue-600 hover:bg-zinc-100 dark:text-blue-400 dark:hover:bg-zinc-700'>
                                        A
                                    </button>
                                </div>

                                <div className='mx-1 h-4 w-px bg-zinc-200 dark:bg-zinc-700' />

                                {/* Alineación */}
                                {(
                                    [
                                        { align: 'left' as const, path: 'M4 6h16M4 12h10M4 18h14', title: 'Izquierda' },
                                        { align: 'center' as const, path: 'M4 6h16M7 12h10M6 18h12', title: 'Centrar' },
                                        { align: 'right' as const, path: 'M4 6h16M10 12h10M6 18h14', title: 'Derecha' },
                                        { align: 'justify' as const, path: 'M4 6h16M4 12h16M4 18h16', title: 'Justificado' },
                                    ] as const
                                ).map(({ align, path, title }) => (
                                    <button
                                        key={align}
                                        type='button'
                                        title={title}
                                        onMouseDown={(e) => { e.preventDefault(); setAlign(align); }}
                                        className='rounded p-1 text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700'>
                                        <svg className='h-3 w-3' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                                            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d={path} />
                                        </svg>
                                    </button>
                                ))}

                                <div className='mx-1 h-4 w-px bg-zinc-200 dark:bg-zinc-700' />

                                {/* Listas */}
                                <button
                                    type='button'
                                    title={zonaEditando !== null ? 'No disponible al editar encabezado/pie' : 'Lista desordenada'}
                                    disabled={zonaEditando !== null}
                                    onMouseDown={(e) => { e.preventDefault(); toggleList('desordenado'); }}
                                    className='rounded p-1 text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent dark:text-zinc-300 dark:hover:bg-zinc-700'>
                                    <svg className='h-3 w-3' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M4 6h16M4 12h16M4 18h16' />
                                    </svg>
                                </button>
                                <button
                                    type='button'
                                    title={zonaEditando !== null ? 'No disponible al editar encabezado/pie' : 'Lista ordenada'}
                                    disabled={zonaEditando !== null}
                                    onMouseDown={(e) => { e.preventDefault(); toggleList('ordenado'); }}
                                    className='rounded p-1 text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent dark:text-zinc-300 dark:hover:bg-zinc-700'>
                                    <svg className='h-3 w-3' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01' />
                                    </svg>
                                </button>

                                <div className='mx-1 h-4 w-px bg-zinc-200 dark:bg-zinc-700' />

                                {/* Undo / Redo */}
                                <button
                                    type='button'
                                    title='Deshacer (Ctrl+Z)'
                                    onMouseDown={(e) => { e.preventDefault(); editorActivo.undo(); }}
                                    className='rounded p-1 text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700'>
                                    <svg className='h-3 w-3' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6' />
                                    </svg>
                                </button>
                                <button
                                    type='button'
                                    title='Rehacer (Ctrl+Y)'
                                    onMouseDown={(e) => { e.preventDefault(); editorActivo.redo(); }}
                                    className='rounded p-1 text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700'>
                                    <svg className='h-3 w-3' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M21 10H11a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6' />
                                    </svg>
                                </button>

                                <div className='mx-1 h-4 w-px bg-zinc-200 dark:bg-zinc-700' />

                                {/* Insertar dropdown — tabla/firma/salto de página no aplican a encabezado/pie */}
                                <div className='relative'>
                                    <button
                                        type='button'
                                        disabled={zonaEditando !== null}
                                        title={zonaEditando !== null ? 'No disponible al editar encabezado/pie' : undefined}
                                        onMouseDown={(e) => { e.preventDefault(); setInsertDropdownOpen((v) => !v); }}
                                        className='flex items-center gap-1 rounded border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'>
                                        Insertar
                                        <svg className='h-2.5 w-2.5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                                            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 9l-7 7-7-7' />
                                        </svg>
                                    </button>
                                    {insertDropdownOpen && (
                                        <div className='absolute left-0 top-full z-50 mt-1 w-44 rounded border border-zinc-200 bg-white shadow-md dark:border-zinc-700 dark:bg-zinc-900'>
                                            <button
                                                type='button'
                                                className='flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800'
                                                onMouseDown={(e) => { e.preventDefault(); setInsertDropdownOpen(false); abrirModalFirma(); }}>
                                                <span className='h-2 w-2 rounded-sm bg-zinc-400' />
                                                Bloque de firma
                                            </button>
                                            <button
                                                type='button'
                                                className='relative flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[12px] text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800'
                                                onMouseEnter={() => setTablaMenuOpen(true)}
                                                onMouseDown={(e) => { e.preventDefault(); setTablaMenuOpen(true); }}>
                                                <span className='flex items-center gap-2'>
                                                    <span className='h-2.5 w-2.5 rounded-[1px] border border-zinc-400' />
                                                    Tabla
                                                </span>
                                                <svg className='h-2.5 w-2.5 text-zinc-400' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                                                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5l7 7-7 7' />
                                                </svg>

                                                {tablaMenuOpen && (
                                                    <div
                                                        onMouseDown={(e) => e.stopPropagation()}
                                                        className='absolute left-full top-[-3px] ml-1 w-56 rounded-lg border border-zinc-200 bg-white p-2.5 shadow-lg dark:border-zinc-700 dark:bg-zinc-900'>
                                                        <div className='mb-2 h-3.5 text-center text-[11px] font-semibold text-zinc-500 dark:text-zinc-400'>
                                                            {tablaGridHover.cols > 0
                                                                ? `${tablaGridHover.cols} × ${tablaGridHover.rows}`
                                                                : 'Elegí el tamaño'}
                                                        </div>
                                                        <div
                                                            onMouseLeave={() => setTablaGridHover({ cols: 0, rows: 0 })}
                                                            style={{
                                                                display: 'grid',
                                                                gridTemplateColumns: 'repeat(8, 18px)',
                                                                gridTemplateRows: 'repeat(6, 18px)',
                                                                gap: 2,
                                                            }}>
                                                            {Array.from({ length: 6 }).map((_, r) =>
                                                                Array.from({ length: 8 }).map((_, c) => (
                                                                    <div
                                                                        key={`${r}-${c}`}
                                                                        onMouseEnter={() => setTablaGridHover({ cols: c + 1, rows: r + 1 })}
                                                                        onMouseDown={(e) => {
                                                                            e.preventDefault();
                                                                            insertarTablaDesdeGrid(c + 1, r + 1);
                                                                        }}
                                                                        className={`h-[18px] w-[18px] rounded-sm border ${
                                                                            r < tablaGridHover.rows && c < tablaGridHover.cols
                                                                                ? 'border-blue-500 bg-blue-100'
                                                                                : 'border-zinc-300 bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800'
                                                                        }`}
                                                                    />
                                                                )),
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </button>
                                            <button
                                                type='button'
                                                className='flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800'
                                                onMouseDown={(e) => {
                                                    e.preventDefault();
                                                    setInsertDropdownOpen(false);
                                                    insertarSaltoPagina(editor);
                                                    ReactEditor.focus(editor);
                                                }}>
                                                <span className='h-px w-3 border-t-2 border-dashed border-zinc-400' />
                                                Salto de página
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Encabezado / pie: activa+edita si estaba apagado, abre edición si ya
                                    estaba activo — desactivar del todo vive en "Quitar" dentro de la
                                    barra contextual (ver EncabezadoPieEditor). */}
                                <div className='ml-auto flex items-center gap-1'>
                                    <button
                                        type='button'
                                        title='Encabezado — click para activar/editar'
                                        onMouseDown={(e) => { e.preventDefault(); clickHF('header'); }}
                                        className={`rounded border px-2 py-0.5 text-[10px] font-semibold ${
                                            configPagina.encabezado.activo
                                                ? 'border-blue-400 bg-blue-50 text-blue-600'
                                                : 'border-zinc-200 text-zinc-500 hover:bg-zinc-50'
                                        }`}>
                                        Encabezado
                                    </button>
                                    <button
                                        type='button'
                                        title='Pie de página — click para activar/editar'
                                        onMouseDown={(e) => { e.preventDefault(); clickHF('footer'); }}
                                        className={`rounded border px-2 py-0.5 text-[10px] font-semibold ${
                                            configPagina.pie.activo
                                                ? 'border-blue-400 bg-blue-50 text-blue-600'
                                                : 'border-zinc-200 text-zinc-500 hover:bg-zinc-50'
                                        }`}>
                                        Pie de página
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Aviso no bloqueante: la vista previa sigue mostrando el último HTML
                            válido recibido (stale-while-revalidate) — el error solo informa que
                            el último intento de refrescarla falló. */}
                        {viewMode === 'preview' && previewError && (
                            <Alert
                                icon='HeroExclamationTriangle'
                                color='amber'
                                variant='outline'
                                className='mx-2 mt-2 text-xs'>
                                No se pudo actualizar la vista previa: {previewError}
                            </Alert>
                        )}
                        {/* Refresco no bloqueante: ya hay un preview válido en pantalla (el de
                            "primer ingreso" lo maneja el guard más abajo) — solo un indicador
                            chico, sin tapar el contenido actual mientras llega el nuevo. */}
                        {viewMode === 'preview' && previewFetching && previewBloques && (
                            <p className='mx-2 mt-1 text-[11px] italic text-zinc-400'>Actualizando vista previa…</p>
                        )}

                        {/* Área del documento */}
                        <div className='min-h-0 flex-1 overflow-y-auto bg-zinc-200 py-8 dark:bg-zinc-700'>
                            <Slate
                                editor={editor}
                                initialValue={value as unknown as Descendant[]}
                                onChange={handleSlateChange}>

                                {(() => {
                                    // Primer ingreso a Vista previa: todavía no llegó el primer HTML
                                    // real del backend (debounce + red en curso). No renderizar el
                                    // armazón de páginas todavía — `cortes` en este instante puede seguir
                                    // reflejando la última medición hecha en modo editor (fuente/tamaños
                                    // de Slate, no del HTML resuelto), y aplicar esos offsets a bloques
                                    // sin contenido real es lo que producía texto superpuesto y
                                    // encabezados fuera de lugar. Loading limpio hasta tener datos reales.
                                    if (viewMode === 'preview' && !previewBloques) {
                                        return (
                                            <div className='flex justify-center py-24 text-sm text-zinc-400'>
                                                Generando vista previa…
                                            </div>
                                        );
                                    }

                                    // Cada corte (automático u originado por un salto manual) marca
                                    // el inicio de una página nueva — su cantidad + 1 es el total de páginas.
                                    const numPages = cortes.length + 1;
                                    const contenidoHeaderActual = obtenerContenidoEncabezadoPie(configPagina.encabezado);
                                    const alignHeaderActual = (contenidoHeaderActual[0] as TNodoParrafo | undefined)?.align ?? 'center';
                                    // El logo vive fuera del flujo (absolute, anclado a un margen) para que
                                    // el centrado del texto se calcule siempre sobre el ancho total del
                                    // encabezado, sin corrimiento según de qué lado esté el logo. El padding
                                    // anti-colisión solo aplica cuando el texto se alinea hacia el MISMO lado
                                    // que el logo — en 'center' y en el lado opuesto es siempre 0.
                                    const logoLadoActual = configPagina.encabezado.logo_lado ?? 'izquierda';
                                    const colisionHeaderIzq = configPagina.encabezado.logo_auto && logoLadoActual === 'izquierda' && alignHeaderActual === 'left';
                                    const colisionHeaderDer = configPagina.encabezado.logo_auto && logoLadoActual === 'derecha' && alignHeaderActual === 'right';
                                    const contenidoFooterActual = obtenerContenidoEncabezadoPie(configPagina.pie);
                                    const alignFooterActual = (contenidoFooterActual[0] as TNodoParrafo | undefined)?.align
                                        ?? ({ izquierda: 'left', centro: 'center', derecha: 'right' } as const)[configPagina.pie.posicion ?? 'centro'];
                                    return (
                                        /* Área de documento con tarjetas de página de tamaño fijo.
                                         * Cada tarjeta ocupa exactamente pageCfg.heightPx.
                                         * El corte entre páginas lo produce el marginTop inyectado
                                         * en renderElement (ver calcularCortes) — el gap visual entre
                                         * tarjetas es siempre PAGE_GAP (20px).
                                         */
                                        <div
                                            ref={documentContainerRef}
                                            onClick={handleDocumentClick}
                                            className={`relative mx-auto ${viewMode === 'preview' ? 'v29-preview-html' : ''}`}
                                            style={{
                                                width: `${pageCfg.widthPx}px`,
                                                minHeight: `${numPages * pageCfg.heightPx + (numPages - 1) * PAGE_GAP}px`,
                                            }}>

                                            {/* Indicadores de margen: un punto de color por condicional
                                                inline, pegado al borde izquierdo de la hoja (el espacio
                                                real disponible ahí es ~80px — no alcanza para una tarjeta
                                                completa). Click → enfoca esa fila en el tab Índice, donde
                                                está el botón real de eliminar. */}
                                            {tarjetasMargen.map(({ nodo, path, top, left }, i) => (
                                                <button
                                                    key={i}
                                                    type='button'
                                                    contentEditable={false}
                                                    onClick={() => irAIndiceCondicional(path)}
                                                    title={CONDICIONES_LABELS[nodo.condicional] ?? nodo.condicional}
                                                    className='h-4 w-4 rounded-full border-2 border-white bg-orange-400 shadow transition-colors hover:bg-orange-500 dark:border-zinc-900'
                                                    style={{ position: 'absolute', top: `${top}px`, left: `${left}px` }}
                                                />
                                            ))}

                                            {/* Fondos absolutos: una tarjeta blanca por página */}
                                            {Array.from({ length: numPages }, (_, i) => (
                                                <div
                                                    key={i}
                                                    className='absolute left-0 right-0 rounded bg-white dark:bg-zinc-900'
                                                    style={{
                                                        top: `${i * (pageCfg.heightPx + PAGE_GAP)}px`,
                                                        height: `${pageCfg.heightPx}px`,
                                                        boxShadow: '0 1px 4px rgba(0,0,0,.08), 0 4px 16px rgba(0,0,0,.08)',
                                                    }}
                                                />
                                            ))}

                                            {/* Encabezado repetido: páginas 2..N (la página 1 usa el
                                                encabezado real del flujo, más abajo, que sirve además
                                                para medir su altura vía encabezadoRef). Solo preview
                                                estático — nunca se edita desde una página duplicada. */}
                                            {configPagina.encabezado.activo && Array.from(
                                                { length: Math.max(0, numPages - 1) },
                                                (_, idx) => {
                                                    const i = idx + 1;
                                                    return (
                                                        <div
                                                            key={`enc-${i}`}
                                                            contentEditable={false}
                                                            className='absolute min-h-[20px] px-[80px] border-b border-zinc-200 pb-3 text-[11px] text-zinc-500 dark:border-zinc-700'
                                                            style={{
                                                                top: `${i * (pageCfg.heightPx + PAGE_GAP) + PAGE_PADDING}px`,
                                                                left: 0,
                                                                right: 0,
                                                                // Encima del contenido del cuerpo (zIndex:1 más abajo) — en
                                                                // documentos largos, el texto del cuerpo se extiende hasta
                                                                // esta franja y sin esto le robaba los clicks al encabezado
                                                                // duplicado (bug real reportado con el pie de página).
                                                                zIndex: 2,
                                                                fontFamily: configPagina.fuente,
                                                            }}>
                                                            {configPagina.encabezado.logo_auto && (
                                                                <span
                                                                    className='absolute top-1/2 -translate-y-1/2 italic text-zinc-400'
                                                                    style={logoLadoActual === 'derecha' ? { right: 0 } : { left: 0 }}>
                                                                    [logo empresa]
                                                                </span>
                                                            )}
                                                            <div
                                                                style={{
                                                                    textAlign: alignHeaderActual,
                                                                    paddingLeft: colisionHeaderIzq ? 100 : undefined,
                                                                    paddingRight: colisionHeaderDer ? 100 : undefined,
                                                                }}>
                                                                {viewMode === 'preview' ? (
                                                                    // eslint-disable-next-line react/no-danger
                                                                    <div dangerouslySetInnerHTML={{ __html: previewEncabezadoHtml }} />
                                                                ) : (
                                                                    <EncabezadoPiePreview nodos={contenidoHeaderActual} />
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                },
                                            )}

                                            {/* Pie repetido: TODAS las páginas (0..numPages-1). La página 0
                                                aloja el editor vivo (pieRef mide su altura ahí) — antes vivía
                                                en la ÚLTIMA página, pero ese índice cambia cada vez que la
                                                paginación recalcula, y mover el editor Slate de posición en
                                                cada recálculo es un riesgo de perder foco/selección sin
                                                necesidad: la página 0 siempre existe y es estable. El resto
                                                de páginas son solo preview estático. */}
                                            {configPagina.pie.activo && Array.from(
                                                { length: numPages },
                                                (_, i) => {
                                                    const esVivo = i === 0;
                                                    return (
                                                        <div
                                                            key={`pie-${i}`}
                                                            ref={esVivo ? pieRef : undefined}
                                                            contentEditable={esVivo ? undefined : false}
                                                            className='absolute px-[80px] border-t border-zinc-200 pt-3 text-[11px] text-zinc-500 dark:border-zinc-700'
                                                            style={{
                                                                top: `${i * (pageCfg.heightPx + PAGE_GAP) + pageCfg.heightPx - PAGE_PADDING - pageLayout.footerHeight}px`,
                                                                left: 0,
                                                                right: 0,
                                                                // Encima del contenido del cuerpo (zIndex:1 más abajo) — en
                                                                // documentos largos, el texto del cuerpo llega hasta el pie
                                                                // y sin esto le robaba los clicks al checkbox de
                                                                // numeración (bug real reportado por el usuario).
                                                                zIndex: 2,
                                                                fontFamily: configPagina.fuente,
                                                                textAlign: alignFooterActual,
                                                            }}>
                                                            {viewMode === 'preview' ? (
                                                                // eslint-disable-next-line react/no-danger
                                                                <div dangerouslySetInnerHTML={{ __html: previewPieHtml }} />
                                                            ) : esVivo ? (
                                                                <EncabezadoPieEditor
                                                                    editor={editorFooter}
                                                                    value={contenidoFooterActual}
                                                                    onChange={onChangeContenidoFooter}
                                                                    editando={zonaEditando === 'footer'}
                                                                    onAbrirEdicion={() => setZonaEditando('footer')}
                                                                    onCerrarEdicion={() => setZonaEditando(null)}
                                                                    onQuitar={() => quitarZona('footer')}
                                                                    zonaLabel='pie de página'
                                                                    toggleSecundario={{
                                                                        activo: configPagina.pie.numeracion,
                                                                        label: 'Numeración de página',
                                                                        onToggle: () => setConfigPagina((p) => ({ ...p, pie: { ...p.pie, numeracion: !p.pie.numeracion } })),
                                                                    }}
                                                                />
                                                            ) : (
                                                                <EncabezadoPiePreview nodos={contenidoFooterActual} />
                                                            )}
                                                            {configPagina.pie.numeracion && (
                                                                <span className='ml-2 italic text-zinc-400'>· Pág. {i + 1}</span>
                                                            )}
                                                        </div>
                                                    );
                                                },
                                            )}

                                            {/* Contenido superpuesto a los fondos */}
                                            <div
                                                className='relative'
                                                style={{
                                                    zIndex: 1,
                                                    padding: `${PAGE_PADDING}px 80px 0`,
                                                    fontFamily: configPagina.fuente,
                                                }}>

                                                {/* Encabezado de primera página: editor vivo en modo editor;
                                                    en preview usa el mismo HTML resuelto por el backend que
                                                    las páginas 2..N (no tiene sentido editar en modo preview). */}
                                                {configPagina.encabezado.activo && (
                                                    <div
                                                        ref={encabezadoRef}
                                                        className='mb-4 border-b border-zinc-200 pb-3 text-[11px] text-zinc-500 dark:border-zinc-700'>
                                                        <div style={{ textAlign: alignHeaderActual }}>
                                                            {viewMode === 'preview' ? (
                                                                // eslint-disable-next-line react/no-danger
                                                                <div dangerouslySetInnerHTML={{ __html: previewEncabezadoHtml }} />
                                                            ) : (
                                                                <EncabezadoPieEditor
                                                                    editor={editorHeader}
                                                                    value={contenidoHeaderActual}
                                                                    onChange={onChangeContenidoHeader}
                                                                    editando={zonaEditando === 'header'}
                                                                    onAbrirEdicion={() => setZonaEditando('header')}
                                                                    onCerrarEdicion={() => setZonaEditando(null)}
                                                                    onQuitar={() => quitarZona('header')}
                                                                    zonaLabel='encabezado'
                                                                    logo={{ activo: configPagina.encabezado.logo_auto, lado: logoLadoActual }}
                                                                    colisionPadding={
                                                                        colisionHeaderIzq ? { lado: 'left', px: 100 }
                                                                            : colisionHeaderDer ? { lado: 'right', px: 100 }
                                                                                : undefined
                                                                    }
                                                                    toggleSecundario={{
                                                                        activo: configPagina.encabezado.logo_auto,
                                                                        label: 'Logo',
                                                                        onToggle: () => setConfigPagina((p) => ({ ...p, encabezado: { ...p.encabezado, logo_auto: !p.encabezado.logo_auto } })),
                                                                    }}
                                                                    selectorLogoLado={{
                                                                        valor: logoLadoActual,
                                                                        onCambiar: (lado) => setConfigPagina((p) => ({ ...p, encabezado: { ...p.encabezado, logo_lado: lado } })),
                                                                    }}
                                                                />
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {viewMode === 'preview' ? (
                                                    /* Cuerpo en modo preview: HTML real del backend, un div plano
                                                       por nodo top-level — nunca se mezcla dangerouslySetInnerHTML
                                                       dentro del árbol que <Editable> controla (rompería el mapeo
                                                       DOM↔modelo de Slate), así que en este modo <Editable> ni
                                                       siquiera se monta. */
                                                    <div className='min-h-[120px] text-[13px] leading-relaxed text-zinc-800 dark:text-zinc-200' style={{ fontFamily: configPagina.fuente }}>
                                                        {value.map((_, i) => (
                                                            <div key={i} style={{ paddingTop: cortes.find((c) => c.index === i)?.offsetPx }}>
                                                                <div
                                                                    ref={(el) => { previewBlockRefs.current[i] = el; }}
                                                                    // eslint-disable-next-line react/no-danger
                                                                    dangerouslySetInnerHTML={{ __html: previewBloques?.[i] ?? '' }}
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    /* Editor Slate — atenuado y de solo lectura mientras se edita
                                                       encabezado/pie (igual que Word), y un click ahí cierra esa
                                                       edición en vez de intentar escribir en el cuerpo. */
                                                    <Editable
                                                        renderElement={renderElement}
                                                        renderLeaf={renderLeaf}
                                                        onKeyDown={handleKeyDown}
                                                        onBlur={() => { lastSelectionRef.current = editor.selection; }}
                                                        onClick={() => {
                                                            setInsertDropdownOpen(false);
                                                            if (zonaEditando) setZonaEditando(null);
                                                        }}
                                                        onDragOver={(e) => e.preventDefault()}
                                                        onDrop={handleDrop}
                                                        readOnly={zonaEditando !== null}
                                                        placeholder='Empieza a escribir el contrato...'
                                                        spellCheck={false}
                                                        className={`min-h-[120px] text-[13px] leading-relaxed text-zinc-800 outline-none transition-opacity dark:text-zinc-200 ${
                                                            zonaEditando ? 'opacity-40' : ''
                                                        }`}
                                                        style={{ fontFamily: configPagina.fuente }}
                                                    />
                                                )}

                                            </div>
                                        </div>
                                    );
                                })()}
                            </Slate>
                        </div>
                    </div>

                    {/* ── Panel derecho: Etiquetas / Índice / Simulador ─────── */}
                    <aside className='flex w-[260px] shrink-0 flex-col overflow-hidden border-l border-zinc-200 dark:border-zinc-700'>
                        {viewMode === 'editor' ? (
                            <>
                                <div className='flex shrink-0 border-b border-zinc-200 dark:border-zinc-700'>
                                    <button
                                        type='button'
                                        onClick={() => setPanelDerechoTab('etiquetas')}
                                        className={`flex-1 border-b-2 px-2 py-2.5 text-[11px] font-bold uppercase tracking-wider transition-colors ${
                                            panelDerechoTab === 'etiquetas'
                                                ? 'border-blue-400 bg-white text-blue-600 dark:bg-zinc-900'
                                                : 'border-transparent bg-zinc-50 text-zinc-500 hover:bg-zinc-100 dark:bg-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900'
                                        }`}>
                                        Etiquetas
                                    </button>
                                    <button
                                        type='button'
                                        onClick={() => setPanelDerechoTab('indice')}
                                        className={`flex-1 border-b-2 px-2 py-2.5 text-[11px] font-bold uppercase tracking-wider transition-colors ${
                                            panelDerechoTab === 'indice'
                                                ? 'border-blue-400 bg-white text-blue-600 dark:bg-zinc-900'
                                                : 'border-transparent bg-zinc-50 text-zinc-500 hover:bg-zinc-100 dark:bg-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900'
                                        }`}>
                                        Índice
                                    </button>
                                </div>

                                {panelDerechoTab === 'etiquetas' ? (
                                    <PanelEtiquetas
                                        etiquetas={etiquetas}
                                        onInsertarEtiqueta={handleInsertarEtiqueta}
                                        editingEnabled
                                        mostrarHeaderPropio={false}
                                    />
                                ) : (
                                    <div className='min-h-0 flex-1 overflow-y-auto p-3'>
                                        {condicionales.length === 0 && condicionalesInline.length === 0 ? (
                                            <p className='text-center text-[11px] text-zinc-400'>
                                                Sin bloques condicionales
                                            </p>
                                        ) : (
                                            <div className='space-y-1'>
                                                {condicionales.map((c, i) => (
                                                    <div
                                                        key={`bloque-${i}`}
                                                        role='button'
                                                        tabIndex={0}
                                                        onClick={() => irACondicional(c)}
                                                        onKeyDown={(e) => e.key === 'Enter' && irACondicional(c)}
                                                        className='cursor-pointer truncate rounded bg-orange-50 px-2 py-1 text-[11px] text-orange-600 transition-colors hover:bg-orange-100 dark:bg-orange-900/20 dark:hover:bg-orange-900/40'>
                                                        {CONDICIONES_LABELS[c.condition] ?? c.condition}
                                                    </div>
                                                ))}
                                                {condicionalesInline.map(({ nodo, path }, i) => {
                                                    const resaltado = indiceResaltadoKey === path.join('.');
                                                    return (
                                                        <div
                                                            key={`inline-${i}`}
                                                            role='button'
                                                            tabIndex={0}
                                                            onClick={() => focarCondicionalInline(nodo)}
                                                            onKeyDown={(e) => e.key === 'Enter' && focarCondicionalInline(nodo)}
                                                            className={`flex cursor-pointer items-center justify-between gap-2 truncate rounded px-2 py-1 text-[11px] text-orange-600 transition-colors dark:text-orange-400 ${
                                                                resaltado
                                                                    ? 'bg-orange-200 dark:bg-orange-800/50'
                                                                    : 'bg-orange-50 hover:bg-orange-100 dark:bg-orange-900/20 dark:hover:bg-orange-900/40'
                                                            }`}>
                                                            <span className='truncate'>
                                                                {CONDICIONES_LABELS[nodo.condicional] ?? nodo.condicional}
                                                            </span>
                                                            <button
                                                                type='button'
                                                                title='Quitar condicional'
                                                                onClick={(e) => { e.stopPropagation(); quitarCondicionalInline(path); }}
                                                                className='shrink-0 rounded px-1.5 text-zinc-400 hover:bg-orange-200 hover:text-orange-700 dark:hover:bg-orange-900'>
                                                                ×
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        ) : (
                            <>
                                <div className='shrink-0 border-b border-zinc-200 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900'>
                                    <span className='text-[10px] font-bold uppercase tracking-wider text-zinc-500'>
                                        Simulador
                                    </span>
                                </div>
                                <div className='min-h-0 flex-1 overflow-y-auto p-3'>
                                    <div className='space-y-2'>
                                        <p className='mb-2 text-[10px] text-zinc-500'>
                                            Activar condiciones para simular vista:
                                        </p>
                                        {Object.entries(CONDICIONES_LABELS).map(([key, label]) => (
                                            <label key={key} className='flex cursor-pointer items-center gap-2 text-[11px] text-zinc-600'>
                                                <input
                                                    type='checkbox'
                                                    checked={condicionesSimuladas[key] ?? false}
                                                    onChange={(e) =>
                                                        setCondicionesSimuladas((prev) => ({
                                                            ...prev,
                                                            [key]: e.target.checked,
                                                        }))
                                                    }
                                                    className='rounded'
                                                />
                                                {label}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </aside>
                </div>

                {/* ── Click fuera cierra el dropdown de Insertar ─────────────── */}
                {insertDropdownOpen && (
                    <div
                        className='fixed inset-0 z-40'
                        onMouseDown={() => { setInsertDropdownOpen(false); setTablaMenuOpen(false); }}
                    />
                )}

                {/* ── Tooltip flotante: convertir selección en condicional ────── */}
                {selectionRect && viewMode === 'editor' && (
                    <div
                        contentEditable={false}
                        style={{
                            position: 'fixed',
                            left: selectionRect.left,
                            top: selectionRect.top - 40,
                            zIndex: 45,
                        }}>
                        <button
                            type='button'
                            onMouseDown={(e) => { e.preventDefault(); abrirMenuTipoCondicional(); }}
                            className='flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-zinc-900 px-3 py-1.5 text-[11px] font-medium text-white shadow-lg hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white'>
                            <span className='h-1.5 w-1.5 rounded-full bg-orange-400' />
                            Convertir en condicional
                        </button>

                        {tipoMenuOpen && (
                            <div className='mt-1 max-h-64 w-52 overflow-y-auto rounded-lg border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900'>
                                {Object.entries(CONDICIONES_LABELS).map(([clave, label]) => (
                                    <button
                                        key={clave}
                                        type='button'
                                        onMouseDown={(e) => { e.preventDefault(); aplicarCondicionalInline(clave); }}
                                        className='block w-full rounded px-2.5 py-1.5 text-left text-[11.5px] text-zinc-700 hover:bg-orange-50 hover:text-orange-600 dark:text-zinc-300 dark:hover:bg-orange-900/20'>
                                        {label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ── Modal: Crear bloque de firma ──────────────────────────── */}
                <Modal isOpen={modalFirmaOpen} setIsOpen={setModalFirmaOpen} isCentered>
                    <ModalHeader>Insertar bloque de firma</ModalHeader>
                    <ModalBody>
                        <div className='space-y-4'>
                            <div>
                                <span className='mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-zinc-500'>
                                    Layout
                                </span>
                                <div className='flex gap-2'>
                                    {FIRMA_LAYOUTS.map((l) => (
                                        <button
                                            key={l.clave}
                                            type='button'
                                            onClick={() => elegirLayoutFirma(l.clave)}
                                            className={`flex-1 rounded-lg border px-2 py-2.5 text-center transition-colors ${
                                                layoutFirma === l.clave
                                                    ? 'border-blue-400 bg-blue-50'
                                                    : 'border-zinc-200 bg-zinc-50 hover:border-zinc-300'
                                            }`}>
                                            <div className='mb-1.5 flex h-6 items-center justify-center gap-1'>
                                                {l.defaults.map((_, i) => (
                                                    <span
                                                        key={i}
                                                        className={`h-0 w-5 border-t-2 ${layoutFirma === l.clave ? 'border-blue-500' : 'border-zinc-400'}`}
                                                    />
                                                ))}
                                            </div>
                                            <span className={`text-[10.5px] font-semibold leading-snug ${layoutFirma === l.clave ? 'text-blue-600' : 'text-zinc-600'}`}>
                                                {l.label}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <span className='mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-zinc-500'>
                                    Texto bajo cada línea
                                </span>
                                <div className='flex flex-col gap-1'>
                                    {firmantesModal.map((texto, i) => (
                                        <div
                                            key={i}
                                            draggable={firmantesModal.length > 1}
                                            onDragStart={() => onDragStartFirmante(i)}
                                            onDragOver={(e) => e.preventDefault()}
                                            onDrop={() => onDropFirmante(i)}
                                            className={`flex items-center gap-2 rounded-lg p-1 ${firmantesModal.length > 1 ? 'cursor-grab active:cursor-grabbing' : ''}`}>
                                            <span
                                                title={firmantesModal.length > 1 ? 'Arrastrar para reordenar' : undefined}
                                                className={`select-none text-sm leading-none ${firmantesModal.length > 1 ? 'text-zinc-400' : 'text-zinc-200'}`}>
                                                ⠿
                                            </span>
                                            <input
                                                type='text'
                                                value={texto}
                                                onChange={(e) => editarFirmanteModal(i, e.target.value)}
                                                className='w-full rounded border border-zinc-200 px-2.5 py-1.5 text-[12.5px] outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200'
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className='flex justify-center gap-8 rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-4 py-4'>
                                {firmantesModal.map((texto, i) => (
                                    <div key={i} className='flex flex-col items-center gap-1'>
                                        <div className='w-24 border-t border-zinc-500' />
                                        <span className='text-[10px] text-zinc-500'>{texto || '—'}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </ModalBody>
                    <ModalFooter>
                        <Button
                            color='zinc'
                            variant='outline'
                            onClick={() => setModalFirmaOpen(false)}>
                            Cancelar
                        </Button>
                        <Button color='blue' onClick={insertarFirma}>
                            Insertar
                        </Button>
                    </ModalFooter>
                </Modal>
            </>
        );
    },
);

EditorDocumentoV29.displayName = 'EditorDocumentoV29';

export default EditorDocumentoV29;
