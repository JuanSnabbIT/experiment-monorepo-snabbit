import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { IEtiquetaPlantilla, ISeccionPlantilla } from '@/interface/plantillaContrato.interface';
import {
    useDuplicarPlantillaMutation,
    useGetDetallePlantillaQuery,
    useGetEtiquetasPlantillaQuery,
    useReordenarSeccionesPlantillaMutation,
} from '@/store/slices/contratos/plantillaContratoApi';
import { getErrorMessage } from '@/utils/errorHandlers';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import ModalCrearSeccionPlantilla from '../PlantillasContrato/components/ModalCrearSeccionPlantilla';
import ModalEditarPlantilla from '../PlantillasContrato/components/ModalEditarPlantilla';
import PanelDocumento, { IPanelDocumentoHandle } from './components/PanelDocumento';
import PanelEstructura from './components/PanelEstructura';
import PanelEtiquetas from './components/PanelEtiquetas';

const EditorPlantillaV2 = () => {
    const { plantillaId } = useParams<{ plantillaId: string }>();
    const navigate = useNavigate();

    // ─── API ──────────────────────────────────────────────────────────────────
    const {
        data: plantilla,
        isLoading,
        isError,
        refetch,
    } = useGetDetallePlantillaQuery(plantillaId ?? '');
    const { data: etiquetas = [] } = useGetEtiquetasPlantillaQuery();
    const [duplicar, { isLoading: isDuplicating }] = useDuplicarPlantillaMutation();
    const [reordenarSecciones] = useReordenarSeccionesPlantillaMutation();

    // ─── Estado local ────────────────────────────────────────────────────────
    const [seccionActivaId, setSeccionActivaId] = useState<number | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [modalConfigOpen, setModalConfigOpen] = useState(false);
    const [modalNuevaSeccionOpen, setModalNuevaSeccionOpen] = useState(false);
    // Orden optimista de secciones (se actualiza al hacer drag-and-drop)
    const [seccionesLocales, setSeccionesLocales] = useState<ISeccionPlantilla[]>([]);

    // Ref del documento para guardar / insertar / envolver seleccion
    const panelDocumentoRef = useRef<IPanelDocumentoHandle>(null);

    // ─── Handlers ────────────────────────────────────────────────────────────
    const handleSeleccionarSeccion = useCallback((seccion: ISeccionPlantilla) => {
        setSeccionActivaId(seccion.id);
        setIsEditing(false);
    }, []);

    const handleInsertarEtiqueta = useCallback((clave: string) => {
        panelDocumentoRef.current?.insertarTexto(`[${clave}]`);
    }, []);

    const handleWrapSelection = useCallback((abre: string, cierra: string) => {
        panelDocumentoRef.current?.wrapSelection(abre, cierra);
    }, []);

    const handleGuardarCambios = async () => {
        await panelDocumentoRef.current?.guardar();
    };

    const handleDuplicar = async () => {
        if (!plantillaId) return;
        try {
            const nueva = await duplicar(plantillaId).unwrap();
            toast.success('Plantilla duplicada');
            navigate(`/registros/plantillas-contrato-v2/${nueva.id}`);
        } catch (err: unknown) {
            toast.error(getErrorMessage(err));
        }
    };

    const handleSeccionCreada = (seccion: ISeccionPlantilla) => {
        setSeccionActivaId(seccion.id);
        setIsEditing(false);
        refetch();
    };

    const handleReordenarSecciones = async (nuevasSecciones: ISeccionPlantilla[]) => {
        if (!plantillaId) return;
        const previo = seccionesLocales;
        // Actualización optimista inmediata
        setSeccionesLocales(nuevasSecciones);
        try {
            await reordenarSecciones({
                plantillaId,
                secciones: nuevasSecciones.map((s, i) => ({ id: s.id, orden: i + 1 })),
            }).unwrap();
        } catch (err: unknown) {
            // Revertir si falla
            setSeccionesLocales(previo);
            toast.error(getErrorMessage(err));
        }
    };

    // ─── Ordenar secciones ───────────────────────────────────────────────────
    // Usa estado local para actualizaciones optimistas; se sincroniza con la API
    const secciones = seccionesLocales;

    // Seleccionar primera seccion al cargar
    useEffect(() => {
        if (plantilla && !seccionActivaId && secciones.length > 0) {
            setSeccionActivaId(secciones[0].id);
        }
    }, [plantilla, secciones, seccionActivaId]);

    // Sincronizar secciones locales cuando llegan de la API
    useEffect(() => {
        if (plantilla?.secciones) {
            setSeccionesLocales(
                [...plantilla.secciones].sort((a, b) => a.orden - b.orden),
            );
        }
    }, [plantilla?.secciones]);

    // ─── Render de carga / error ─────────────────────────────────────────────
    if (isLoading) {
        return (
            <div className='flex h-screen items-center justify-center'>
                <div className='flex flex-col items-center gap-3'>
                    <div className='h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent' />
                    <p className='text-sm text-zinc-400'>Cargando plantilla...</p>
                </div>
            </div>
        );
    }

    if (isError || !plantilla) {
        return (
            <div className='flex h-screen flex-col items-center justify-center gap-4'>
                <p className='text-zinc-500'>No se pudo cargar la plantilla.</p>
                <Button
                    onClick={() => navigate('/registros/plantillas-contrato-v2')}
                    icon='HeroArrowLeft'>
                    Volver a la lista
                </Button>
            </div>
        );
    }

    return (
        <div className='flex h-screen flex-col overflow-hidden bg-white dark:bg-zinc-950'>
            {/* ═══════════════════════════════════════════════════════════════
                BARRA SUPERIOR
            ═══════════════════════════════════════════════════════════════ */}
            <header className='flex shrink-0 items-center gap-3 border-b border-zinc-200 bg-white px-5 py-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900'>
                {/* Volver */}
                <Button
                    size='sm'
                    variant='default'
                    icon='HeroArrowLeft'
                    onClick={() => navigate('/registros/plantillas-contrato-v2')}
                />

                <div className='h-5 w-px bg-zinc-200 dark:bg-zinc-700' />

                {/* Icono de documento + titulo */}
                <div className='flex flex-1 items-center gap-2.5 overflow-hidden'>
                    <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white'>
                        <svg
                            className='h-4 w-4'
                            fill='none'
                            viewBox='0 0 24 24'
                            stroke='currentColor'>
                            <path
                                strokeLinecap='round'
                                strokeLinejoin='round'
                                strokeWidth={2}
                                d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
                            />
                        </svg>
                    </div>
                    <div className='min-w-0 overflow-hidden'>
                        <p className='truncate text-[11px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500'>
                            Editor
                        </p>
                        <h1 className='truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100'>
                            {plantilla.titulo}
                        </h1>
                    </div>
                    <div className='flex shrink-0 items-center gap-1.5'>
                        <Badge color='zinc' variant='outline' className='text-xs'>
                            Borrador v{plantilla.version ?? '1'}
                        </Badge>
                        {plantilla.activa && (
                            <Badge color='emerald' variant='solid' className='text-xs'>
                                Activa
                            </Badge>
                        )}
                        {plantilla.es_default && (
                            <Badge color='amber' variant='outline' className='text-xs'>
                                Default
                            </Badge>
                        )}
                    </div>
                </div>

                {/* Acciones */}
                <div className='flex shrink-0 items-center gap-2'>
                    <Button size='sm' variant='default' icon='HeroEye'>
                        Vista previa
                    </Button>
                    <Button
                        size='sm'
                        color='blue'
                        variant='solid'
                        icon='HeroCheck'
                        onClick={handleGuardarCambios}
                        isDisable={!isEditing}>
                        Guardar cambios
                    </Button>
                    {/* Menu de opciones */}
                    <button
                        type='button'
                        className='flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800'
                        onClick={() => setModalConfigOpen(true)}
                        title='Mas opciones'>
                        <svg className='h-4 w-4' fill='currentColor' viewBox='0 0 24 24'>
                            <circle cx='5' cy='12' r='1.5' />
                            <circle cx='12' cy='12' r='1.5' />
                            <circle cx='19' cy='12' r='1.5' />
                        </svg>
                    </button>
                    <Button
                        size='sm'
                        variant='default'
                        icon='HeroDocumentDuplicate'
                        isLoading={isDuplicating}
                        onClick={handleDuplicar}>
                        Duplicar
                    </Button>
                </div>
            </header>

            {/* ═══════════════════════════════════════════════════════════════
                CONTENIDO PRINCIPAL — 3 paneles
            ═══════════════════════════════════════════════════════════════ */}
            <div className='flex flex-1 overflow-hidden'>
                {/* ── Panel izquierdo: Estructura (260px fijo) ── */}
                <aside className='w-[260px] shrink-0 overflow-hidden'>
                    <PanelEstructura
                        secciones={secciones}
                        seccionActivaId={seccionActivaId}
                        onSelectSeccion={handleSeleccionarSeccion}
                        onNuevaSeccion={() => setModalNuevaSeccionOpen(true)}
                        onReordenarSecciones={handleReordenarSecciones}
                    />
                </aside>

                {/* ── Panel central: Documento completo ── */}
                <main className='flex min-w-0 flex-1 flex-col overflow-hidden'>
                    <PanelDocumento
                        ref={panelDocumentoRef}
                        secciones={secciones}
                        seccionActivaId={seccionActivaId}
                        isEditing={isEditing}
                        plantillaId={plantillaId ?? ''}
                        tituloPagina={plantilla.titulo}
                        etiquetas={etiquetas as IEtiquetaPlantilla[]}
                        onSelectSeccion={handleSeleccionarSeccion}
                        onStartEditar={() => setIsEditing(true)}
                        onStopEditar={() => setIsEditing(false)}
                        onSaved={refetch}
                    />
                </main>

                {/* ── Panel derecho: Etiquetas (260px fijo) ── */}
                <aside className='w-[260px] shrink-0 overflow-hidden'>
                    <PanelEtiquetas
                        etiquetas={etiquetas as IEtiquetaPlantilla[]}
                        onInsertarEtiqueta={handleInsertarEtiqueta}
                        onWrapSelection={handleWrapSelection}
                        editingEnabled={isEditing}
                    />
                </aside>
            </div>

            {/* ═══════════════════════════════════════════════════════════════
                MODALES
            ═══════════════════════════════════════════════════════════════ */}
            <ModalEditarPlantilla
                isOpen={modalConfigOpen}
                setIsOpen={setModalConfigOpen}
                plantilla={plantilla}
            />

            <ModalCrearSeccionPlantilla
                isOpen={modalNuevaSeccionOpen}
                setIsOpen={setModalNuevaSeccionOpen}
                plantillaId={plantillaId ?? ''}
                etiquetas={etiquetas as IEtiquetaPlantilla[]}
                nextOrder={(secciones.at(-1)?.orden ?? 0) + 1}
                onCreated={handleSeccionCreada}
            />
        </div>
    );
};

export default EditorPlantillaV2;
