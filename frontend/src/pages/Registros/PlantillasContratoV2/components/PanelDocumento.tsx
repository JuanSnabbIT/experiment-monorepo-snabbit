import Button from '@/components/ui/Button';
import { IEtiquetaPlantilla, ISeccionPlantilla } from '@/interface/plantillaContrato.interface';
import { useUpdateSeccionPlantillaMutation } from '@/store/slices/contratos/plantillaContratoApi';
import { getErrorMessage } from '@/utils/errorHandlers';
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

/**
 * Renderiza el contenido de una seccion reemplazando [variables] con spans azules.
 * Convierte saltos de linea en <br> para respetar el formato del template.
 */
const formatEtiquetaLabel = (clave: string): string =>
    clave
        .replace(/^[^.]+\./, '')
        .replace(/[_\.]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

const renderConVariables = (
    text: string,
    etiquetasMap: Map<string, IEtiquetaPlantilla>,
): string => {
    const rawContent = text ?? '';
    const withBreaks = rawContent
        .replace(/\r\n|\r/g, '\n')
        .replace(/\n\n/g, '</p><p class="mb-2">')
        .replace(/\n/g, '<br>');

    const withVars = withBreaks.replace(/\[([^\]]+)\]/g, (_, inner) => {
        const label = etiquetasMap.get(inner)?.nombre_display ?? formatEtiquetaLabel(inner);
        return `<span class="inline-flex items-center rounded-full border border-blue-500 bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-600 dark:border-blue-500 dark:bg-blue-500/10 dark:text-blue-300">${label}</span>`;
    });

    return `<p class="mb-2">${withVars}</p>`;
};

/** Tipos que muestran un encabezado de seccion con numero romano en el documento */
const TIPOS_CON_HEADING = ['clausula', 'condiciones_generales', 'identificacion_cliente'];

/** Tipos que se renderizan solo como parrafo sin encabezado visible en el documento */
const TIPOS_PARRAFO = ['encabezado', 'libre'];

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
        },
        ref,
    ) => {
        // Estado local de contenido por seccion (para edicion sin perder cambios)
        const [localContent, setLocalContent] = useState<Record<number, string>>({});
        const [updateSeccion, { isLoading: isSaving }] = useUpdateSeccionPlantillaMutation();

        // Ref del textarea activo (para insertar etiquetas en cursor)
        const taRef = useRef<HTMLTextAreaElement>(null);
        // Refs a cada bloque en el documento (para scroll automatico)
        const seccionRefs = useRef<Record<number, HTMLDivElement | null>>({});

        // ── Sincronizar contenido local cuando llegan datos de la API ─────────
        useEffect(() => {
            setLocalContent((prev) => {
                const next: Record<number, string> = {};
                secciones.forEach((s) => {
                    // Solo actualizar si no hay cambios locales pendientes
                    next[s.id] = s.id in prev ? prev[s.id] : (s.contenido_template ?? '');
                });
                return next;
            });
        }, [secciones]);

        // Cuando se desactiva el modo edicion, revertir el contenido local al guardado
        const prevEditingRef = useRef(isEditing);
        useEffect(() => {
            if (prevEditingRef.current && !isEditing && seccionActivaId) {
                const seccion = secciones.find((s) => s.id === seccionActivaId);
                if (seccion) {
                    setLocalContent((prev) => ({
                        ...prev,
                        [seccionActivaId]: seccion.contenido_template ?? '',
                    }));
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

        // ── Insertar texto en la posicion del cursor del textarea ─────────────
        const insertarTexto = useCallback(
            (texto: string) => {
                const ta = taRef.current;
                if (!ta || !seccionActivaId) return;
                const current = localContent[seccionActivaId] ?? '';
                const pos = ta.selectionStart ?? current.length;
                const nuevo = current.slice(0, pos) + texto + current.slice(pos);
                setLocalContent((prev) => ({ ...prev, [seccionActivaId]: nuevo }));
                setTimeout(() => {
                    ta.selectionStart = pos + texto.length;
                    ta.selectionEnd = pos + texto.length;
                    ta.focus();
                }, 0);
            },
            [localContent, seccionActivaId],
        );

        // ── Envolver seleccion con etiquetas HTML/formato ─────────────────────
        const wrapSelection = useCallback(
            (abre: string, cierra: string) => {
                const ta = taRef.current;
                if (!ta || !seccionActivaId) return;
                const { selectionStart: start, selectionEnd: end } = ta;
                const current = localContent[seccionActivaId] ?? '';
                const selected = current.slice(start, end);
                const nuevo =
                    current.slice(0, start) + abre + selected + cierra + current.slice(end);
                setLocalContent((prev) => ({ ...prev, [seccionActivaId]: nuevo }));
                setTimeout(() => {
                    ta.selectionStart = start + abre.length;
                    ta.selectionEnd = end + abre.length;
                    ta.focus();
                }, 0);
            },
            [localContent, seccionActivaId],
        );

        // ── Guardar seccion activa ─────────────────────────────────────────────
        const handleGuardar = useCallback(async () => {
            if (!seccionActivaId) return;
            const seccion = secciones.find((s) => s.id === seccionActivaId);
            if (!seccion) return;
            try {
                await updateSeccion({
                    plantillaId,
                    seccionId: seccion.id,
                    data: {
                        contenido_template: localContent[seccionActivaId] ?? '',
                        titulo: seccion.titulo,
                    },
                }).unwrap();
                toast.success('Seccion guardada');
                onSaved();
                onStopEditar();
            } catch (err: unknown) {
                toast.error(getErrorMessage(err));
            }
        }, [seccionActivaId, secciones, localContent, plantillaId, updateSeccion, onSaved, onStopEditar]);

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

        // ── Drag & drop de etiquetas sobre el textarea ────────────────────────
        const handleDragOver = useCallback((e: React.DragEvent) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
        }, []);

        const handleDrop = useCallback(
            (e: React.DragEvent) => {
                e.preventDefault();
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

        // ── Render ─────────────────────────────────────────────────────────────
        return (
            <div className='flex h-full flex-col overflow-hidden bg-[#e0e0e0] dark:bg-zinc-700'>
                <div className='flex-1 overflow-y-auto'>
                    <div className='px-8 py-10'>
                        {/* ── Pagina tipo A4 ─────────────────────────────────────────────── */}
                        <div className='mx-auto max-w-[760px] rounded-[2px] bg-white px-[80px] pb-[80px] pt-[60px] shadow-[0_8px_48px_rgba(0,0,0,0.18)]'>
                            {/* ── Titulo del documento ──────────────────────────────────────── */}
                            <div className='mb-8 text-center'>
                                <p className='text-[15px] font-bold uppercase leading-snug tracking-wide text-zinc-900'>
                                    {tituloSeccion
                                        ? (localContent[tituloSeccion.id] ||
                                              tituloSeccion.contenido_template ||
                                              tituloPagina)
                                        : tituloPagina}
                                </p>
                            </div>

                            {/* ── Secciones del documento ───────────────────────────────────── */}
                            {contentSecciones.map((seccion) => {
                                const isActive = seccion.id === seccionActivaId;
                                const isEditingThis = isActive && isEditing;
                                const content =
                                    localContent[seccion.id] ?? seccion.contenido_template ?? '';
                                const clausulaNum = getClausulaNum(seccion.id);

                                return (
                                    <div
                                        key={seccion.id}
                                        ref={(el) => {
                                            seccionRefs.current[seccion.id] = el;
                                        }}
                                        role='button'
                                        tabIndex={0}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !isActive) onSelectSeccion(seccion);
                                        }}
                                        className={[
                                            'relative rounded-[3px] transition-all duration-150',
                                            isActive
                                                ? 'outline outline-2 outline-blue-400 outline-offset-1'
                                                : 'cursor-pointer hover:bg-blue-50/50',
                                        ].join(' ')}
                                        onClick={() => !isActive && onSelectSeccion(seccion)}>
                                        {/* ── Encabezado de seccion (solo clausulas) ─────── */}
                                        {TIPOS_CON_HEADING.includes(seccion.tipo) && (
                                            <p
                                                className={[
                                                    'mb-2 text-[14px] font-bold uppercase tracking-wide text-zinc-900',
                                                    seccion.tipo === 'subtitulo'
                                                        ? 'text-[13px] font-semibold normal-case'
                                                        : '',
                                                    clausulaNum !== null ? 'mt-7' : 'mt-4',
                                                ].join(' ')}>
                                                {clausulaNum !== null
                                                    ? `${toRoman(clausulaNum)}. `
                                                    : ''}
                                                {seccion.titulo.toUpperCase()}
                                            </p>
                                        )}

                                        {/* ── Subtitulo ─────────────────────────────────────── */}
                                        {seccion.tipo === 'subtitulo' && (
                                            <p className='mb-2 mt-5 text-[13px] font-semibold text-zinc-800'>
                                                {seccion.titulo}
                                            </p>
                                        )}

                                        {/* ── Firmas ────────────────────────────────────────── */}
                                        {seccion.tipo === 'firmas' && (
                                            <p className='mb-2 mt-8 text-[13px] font-bold uppercase tracking-widest text-zinc-700'>
                                                {seccion.titulo}
                                            </p>
                                        )}

                                        {/* ── Contenido de la seccion ──────────────────────── */}
                                        <div
                                            className={['py-1', isActive ? 'px-2' : 'px-0'].join(
                                                ' ',
                                            )}
                                            onDragOver={isEditingThis ? handleDragOver : undefined}
                                            onDrop={isEditingThis ? handleDrop : undefined}>
                                            {isEditingThis ? (
                                                /* ── Modo edicion: textarea inline ─────────── */
                                                <>
                                                    <textarea
                                                        ref={taRef}
                                                        value={content}
                                                        onChange={(e) =>
                                                            setLocalContent((prev) => ({
                                                                ...prev,
                                                                [seccion.id]: e.target.value,
                                                            }))
                                                        }
                                                        spellCheck={false}
                                                        className='min-h-[140px] w-full resize-y rounded border border-blue-300 bg-blue-50/20 p-3 font-[inherit] text-[13px] leading-relaxed text-zinc-800 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100'
                                                        placeholder='Escribe el contenido aqui. Arrastra etiquetas desde el panel derecho o usa los botones de formato.'
                                                    />
                                                    <div className='mt-2 mb-1 flex items-center justify-between gap-2'>
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
                                            ) : (
                                                /* ── Modo preview: renderizado con variables ── */
                                                <div
                                                    className={[
                                                        'text-[13px] leading-relaxed',
                                                        TIPOS_PARRAFO.includes(seccion.tipo)
                                                            ? 'text-zinc-800'
                                                            : 'text-zinc-700',
                                                    ].join(' ')}
                                                    style={{
                                                        fontFamily: 'Times New Roman, Times, serif',
                                                        textAlign: 'justify',
                                                        textIndent: '20px',
                                                    }}
                                                    // eslint-disable-next-line react/no-danger
                                                    dangerouslySetInnerHTML={{
                                                        __html: renderConVariables(content, etiquetasMap),
                                                    }}
                                                />
                                            )}
                                        </div>

                                        {/* ── Boton Editar (flotante cuando la seccion esta activa) ── */}
                                        {isActive && !isEditingThis && (
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
