import Button from '@/components/ui/Button';
import { TIPOS_SECCION } from '@/constants/contrato.constant';
import { IEtiquetaPlantilla } from '@/interface/plantillaContrato.interface';
import { ISeccionPlantillaV2 as ISeccionPlantilla } from '@/interface/plantillaContratoV2.interface';
import { useUpdateSeccionV2Mutation } from '@/store/slices/contratos/plantillaContratoV2Api';
import { getErrorMessage } from '@/utils/errorHandlers';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';

interface IPanelEditorSeccionProps {
    seccion: ISeccionPlantilla;
    plantillaId: string;
    etiquetas: IEtiquetaPlantilla[];
    isEditing: boolean;
    onToggleEditar: () => void;
    onSaved: () => void;
    onInsertarEtiqueta: (clave: string) => void; // callback para que el padre sepa que tag insertar
    refTextarea: React.RefObject<HTMLTextAreaElement>;
}

const getTipoLabel = (tipo: string) =>
    TIPOS_SECCION.find((s) => s.value === tipo)?.label ?? tipo;

const formatEtiquetaLabel = (clave: string): string =>
    clave
        .replace(/^[^.]+\./, '')
        .replace(/[_\.]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

const renderWithChips = (
    value: string,
    etiquetasMap: Map<string, IEtiquetaPlantilla>,
) => value.replace(/\[([^\]]+)\]/g, (_, inner) => {
        const label = etiquetasMap.get(inner)?.nombre_display ?? formatEtiquetaLabel(inner);
        return `<span class="inline-flex items-center rounded-full border-2 border-blue-500 bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-500 dark:border-blue-500 dark:bg-blue-500/10 dark:text-blue-300">${label}</span>`;
    });

const PanelEditorSeccion = ({
    seccion,
    plantillaId,
    etiquetas: _etiquetas,
    isEditing,
    onToggleEditar,
    onSaved,
    refTextarea,
}: IPanelEditorSeccionProps) => {
    const [contenido, setContenido] = useState(seccion.contenido_template ?? '');
    const [titulo, setTitulo] = useState(seccion.titulo ?? '');
    const [isDirty, setIsDirty] = useState(false);
    const [updateSeccion, { isLoading: isSaving }] = useUpdateSeccionV2Mutation();

    const etiquetasMap = useMemo(() => {
        const map = new Map<string, IEtiquetaPlantilla>();
        _etiquetas.forEach((et) => map.set(et.clave, et));
        return map;
    }, [_etiquetas]);

    // Sincronizar cuando cambia la seccion activa
    useEffect(() => {
        setContenido(seccion.contenido_template ?? '');
        setTitulo(seccion.titulo ?? '');
        setIsDirty(false);
    }, [seccion.id, seccion.contenido_template, seccion.titulo]);

    const handleGuardar = useCallback(async () => {
        try {
            await updateSeccion({
                plantillaId: Number(plantillaId),
                seccionId: seccion.id,
                data: { contenido_template: contenido, titulo },
            }).unwrap();
            toast.success('Seccion guardada');
            setIsDirty(false);
            onSaved();
        } catch (err: unknown) {
            toast.error(getErrorMessage(err));
        }
    }, [contenido, titulo, plantillaId, seccion.id, updateSeccion, onSaved]);

    // Ctrl+S para guardar
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                if (isDirty) handleGuardar();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isDirty, handleGuardar]);

    // ─── Helpers de formato ──────────────────────────────────────────────────
    const wrapSelection = (tagAbre: string, tagCierra: string) => {
        const ta = refTextarea.current;
        if (!ta) return;
        const { selectionStart: start, selectionEnd: end } = ta;
        const selected = contenido.slice(start, end);
        const nuevo = contenido.slice(0, start) + tagAbre + selected + tagCierra + contenido.slice(end);
        setContenido(nuevo);
        setIsDirty(true);
        setTimeout(() => {
            ta.selectionStart = start + tagAbre.length;
            ta.selectionEnd = end + tagAbre.length;
            ta.focus();
        }, 0);
    };

    const insertarEnCursor = useCallback(
        (texto: string) => {
            const ta = refTextarea.current;
            if (!ta) return;
            const pos = ta.selectionStart ?? contenido.length;
            const nuevo = contenido.slice(0, pos) + texto + contenido.slice(pos);
            setContenido(nuevo);
            setIsDirty(true);
            setTimeout(() => {
                ta.selectionStart = pos + texto.length;
                ta.selectionEnd = pos + texto.length;
                ta.focus();
            }, 0);
        },
        [contenido, refTextarea],
    );

    // Exponer insertarEnCursor a traves de ref del textarea para que el padre pueda llamarlo
    // (el padre pasa refTextarea; usamos un ref de funcion de insercion)
    const insertarRef = useRef(insertarEnCursor);
    useEffect(() => {
        insertarRef.current = insertarEnCursor;
    });

    // El padre llama onInsertarEtiqueta -> necesitamos que ese callback llame a insertarEnCursor
    // Pero el prop onInsertarEtiqueta viene del padre que coordina todo desde EditorPlantillaV2.
    // Aqui solo exponemos el metodo via el textarea ref con un custom attribute.
    // En vez de complejidad, simplemente guardamos el handler en el ref del textarea.
    useEffect(() => {
        if (refTextarea.current) {
            // @ts-expect-error custom handler
            refTextarea.current.__insertarEtiqueta = insertarEnCursor;
        }
    }, [insertarEnCursor, refTextarea]);

    const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
    }, []);

    const handleDropEtiqueta = useCallback(
        (event: React.DragEvent<HTMLDivElement>) => {
            event.preventDefault();
            const texto = event.dataTransfer.getData('text/plain');
            if (!texto) return;
            const ta = refTextarea.current;
            if (!ta) return;
            const pos = ta.selectionStart ?? contenido.length;
            const nuevo = contenido.slice(0, pos) + texto + contenido.slice(pos);
            setContenido(nuevo);
            setIsDirty(true);
            setTimeout(() => {
                ta.selectionStart = pos + texto.length;
                ta.selectionEnd = pos + texto.length;
                ta.focus();
            }, 0);
        },
        [contenido, refTextarea],
    );

    const toggleEditar = onToggleEditar;

    return (
        <div className='flex h-full flex-col'>
            <div className='flex items-start justify-between gap-4 border-b border-zinc-200 bg-zinc-50 px-4 py-4 dark:border-zinc-700 dark:bg-zinc-800/40'>
                <div className='min-w-0'>
                    <p className='text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400'>
                        Sección seleccionada
                    </p>
                    <h2 className='text-lg font-semibold text-zinc-900 dark:text-zinc-100'>
                        {seccion.titulo}
                    </h2>
                    <p className='mt-1 text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400'>
                        {getTipoLabel(seccion.tipo)} · {seccion.es_editable_en_contrato ? 'Editable' : 'Fijo'}
                    </p>
                </div>
                <Button
                    size='sm'
                    variant='default'
                    icon={isEditing ? 'HeroEye' : 'HeroPencil'}
                    onClick={seccion.es_editable_en_contrato ? toggleEditar : undefined}
                    disabled={!seccion.es_editable_en_contrato}
                    title={
                        seccion.es_editable_en_contrato
                            ? isEditing
                                ? 'Volver a vista previa'
                                : 'Editar sección'
                            : 'Esta sección no es editable'
                    }>
                    {seccion.es_editable_en_contrato ? (isEditing ? 'Ver preview' : 'Editar') : 'No editable'}
                </Button>
            </div>

            <div className='flex flex-1 flex-col gap-4 overflow-y-auto p-5'>
                <div className='rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-950'>
                    <div className='space-y-4'>
                        {isEditing && (
                            <div
                                className='space-y-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900'
                                onDragOver={handleDragOver}
                                onDrop={handleDropEtiqueta}>
                                <div className='flex items-center justify-between'>
                                    <div>
                                        <p className='text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400'>
                                            Editor activo
                                        </p>
                                        <p className='text-sm font-semibold text-zinc-900 dark:text-zinc-100'>
                                            Arrastra etiquetas aquí para insertarlas en el texto
                                        </p>
                                    </div>
                                    <span className='rounded-full border-2 border-blue-500 bg-blue-500/10 px-2 py-1 text-[10px] font-semibold text-blue-500 dark:border-blue-500 dark:bg-blue-500/10 dark:text-blue-300'>
                                        Etiquetas desbloqueadas
                                    </span>
                                </div>
                                <textarea
                                    ref={refTextarea}
                                    value={contenido}
                                    onChange={(e) => {
                                        setContenido(e.target.value);
                                        setIsDirty(true);
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.ctrlKey || e.metaKey) {
                                            if (e.key === 'b') { e.preventDefault(); wrapSelection('<strong>', '</strong>'); }
                                            if (e.key === 'i') { e.preventDefault(); wrapSelection('<em>', '</em>'); }
                                            if (e.key === 'u') { e.preventDefault(); wrapSelection('<u>', '</u>'); }
                                        }
                                    }}
                                    spellCheck={false}
                                    className='min-h-[260px] w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm leading-relaxed text-zinc-900 shadow-inner outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:focus:border-blue-600 dark:focus:ring-blue-900/30'
                                    placeholder='Edita el texto de la sección aquí...'
                                />
                                <div className='rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-950'>
                                    <p className='text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400'>
                                        Texto con chips
                                    </p>
                                    <div
                                        className='mt-3 prose prose-sm max-w-none text-zinc-800 dark:prose-invert dark:text-zinc-200'
                                        // eslint-disable-next-line react/no-danger
                                        dangerouslySetInnerHTML={{ __html: renderWithChips(contenido, etiquetasMap) }}
                                    />
                                </div>
                            </div>
                        )}

                        <div className='rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900'>
                            <div className='flex items-center justify-between'>
                                <div>
                                    <p className='text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400'>
                                        Vista previa
                                    </p>
                                    <p className='text-sm font-semibold text-zinc-900 dark:text-zinc-100'>
                                        {isEditing ? 'Previsualización en vivo' : 'Vista previa del bloque'}
                                    </p>
                                </div>
                                {isEditing && (
                                    <span className='rounded-full border-2 border-blue-500 bg-blue-500/10 px-2 py-1 text-[10px] font-semibold text-blue-500 dark:border-blue-500 dark:bg-blue-500/10 dark:text-blue-300'>
                                        Edición activa
                                    </span>
                                )}
                            </div>
                            <div
                                className='mt-4 prose prose-sm max-w-none text-zinc-800 dark:prose-invert dark:text-zinc-200'
                                style={{
                                    fontFamily: 'Times New Roman, Times, serif',
                                    textAlign: 'justify',
                                    textIndent: '20px',
                                }}
                                // eslint-disable-next-line react/no-danger
                                dangerouslySetInnerHTML={{ __html: renderWithChips(contenido, etiquetasMap) }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PanelEditorSeccion;
