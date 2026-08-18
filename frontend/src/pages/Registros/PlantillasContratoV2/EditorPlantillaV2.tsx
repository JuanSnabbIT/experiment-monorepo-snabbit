import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { IEtiquetaPlantilla } from '@/interface/plantillaContrato.interface';
import {
    useDuplicarPlantillaV2Mutation,
    useGetDetallePlantillaV2Query,
    useGetEtiquetasCatalogoQuery,
} from '@/store/slices/contratos/plantillaContratoV2Api';
import { skipToken } from '@reduxjs/toolkit/query';
import { getErrorMessage } from '@/utils/errorHandlers';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import EditorDocumentoV29, { IEditorDocumentoV29Handle } from './components/EditorDocumentoV29';
import ModalEditarPlantillaV2 from './components/ModalEditarPlantillaV2';

const EditorPlantillaV2 = () => {
    const { plantillaId } = useParams<{ plantillaId: string }>();
    const navigate = useNavigate();

    // ─── API ──────────────────────────────────────────────────────────────────
    const {
        data: plantilla,
        isLoading,
        isError,
    } = useGetDetallePlantillaV2Query(plantillaId ?? '');
    const { data: etiquetas = [] } = useGetEtiquetasCatalogoQuery(
        plantilla?.tipo_contrato ? { tipo_contrato: plantilla.tipo_contrato } : skipToken,
    );
    const [duplicar, { isLoading: isDuplicating }] = useDuplicarPlantillaV2Mutation();

    // ─── Estado local ────────────────────────────────────────────────────────
    const [modalConfigOpen, setModalConfigOpen] = useState(false);
    const [hayUnsavedChanges, setHayUnsavedChanges] = useState(false);
    const [viewMode, setViewMode] = useState<'editor' | 'preview'>('editor');

    // Ref del documento para guardar / insertar / envolver seleccion
    const editorV29Ref = useRef<IEditorDocumentoV29Handle>(null);

    // ─── Handlers ────────────────────────────────────────────────────────────
    const handleGuardarCambios = async () => {
        await editorV29Ref.current?.guardar();
    };

    const handleDuplicar = async () => {
        if (!plantillaId) return;
        try {
            const nueva = await duplicar(Number(plantillaId)).unwrap();
            toast.success('Plantilla duplicada');
            navigate(`/registros/plantillas-contrato/${nueva.id}`);
        } catch (err: unknown) {
            toast.error(getErrorMessage(err));
        }
    };

    // Advertir al usuario antes de cerrar/recargar si hay cambios sin guardar
    useEffect(() => {
        if (!hayUnsavedChanges) return undefined;
        const handler = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = '';
        };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [hayUnsavedChanges]);

    // ─── Render de carga / error ─────────────────────────────────────────────
    if (isLoading) {
        return (
            <div className='flex h-[calc(100dvh-var(--header-height))] items-center justify-center'>
                <div className='flex flex-col items-center gap-3'>
                    <div className='h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent' />
                    <p className='text-sm text-zinc-400'>Cargando plantilla...</p>
                </div>
            </div>
        );
    }

    if (isError || !plantilla) {
        return (
            <div className='flex h-[calc(100dvh-var(--header-height))] flex-col items-center justify-center gap-4'>
                <p className='text-zinc-500'>No se pudo cargar la plantilla.</p>
                <Button
                    onClick={() => navigate('/registros/plantillas-contrato')}
                    icon='HeroArrowLeft'>
                    Volver a la lista
                </Button>
            </div>
        );
    }

    return (
        <div className='flex h-[calc(100dvh-var(--header-height))] flex-col overflow-hidden bg-white dark:bg-zinc-950'>
            {/* ═══════════════════════════════════════════════════════════════
                BARRA SUPERIOR
            ═══════════════════════════════════════════════════════════════ */}
            <header className='flex shrink-0 items-center gap-3 border-b border-zinc-200 bg-white px-5 py-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900'>
                {/* Volver */}
                <Button
                    size='sm'
                    variant='default'
                    icon='HeroArrowLeft'
                    onClick={() => navigate('/registros/plantillas-contrato')}
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
                        {hayUnsavedChanges && (
                            <Badge color='amber' variant='solid' className='text-xs'>
                                Cambios sin guardar
                            </Badge>
                        )}
                    </div>
                </div>

                {/* Acciones */}
                <div className='flex shrink-0 items-center gap-2'>
                    <Button
                        size='sm'
                        variant={viewMode === 'preview' ? 'solid' : 'default'}
                        color={viewMode === 'preview' ? 'blue' : undefined}
                        icon={viewMode === 'preview' ? 'HeroPencil' : 'HeroEye'}
                        onClick={() => setViewMode((v) => (v === 'editor' ? 'preview' : 'editor'))}>
                        {viewMode === 'preview' ? 'Editor' : 'Vista previa'}
                    </Button>
                    <Button
                        size='sm'
                        color='blue'
                        variant='solid'
                        icon='HeroCheck'
                        onClick={handleGuardarCambios}>
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
                CONTENIDO PRINCIPAL — documento único v2.9 (Slate)
            ═══════════════════════════════════════════════════════════════ */}
            <div className='flex min-h-0 flex-1 overflow-hidden'>
                <EditorDocumentoV29
                    ref={editorV29Ref}
                    plantilla={plantilla}
                    etiquetas={etiquetas as IEtiquetaPlantilla[]}
                    viewMode={viewMode}
                    onDirtyChange={setHayUnsavedChanges}
                    onSaved={() => { /* invalidado automáticamente por RTK Query */ }}
                    onStopEditar={() => { /* no-op: sin panel de secciones que cerrar */ }}
                />
            </div>

            {/* ═══════════════════════════════════════════════════════════════
                MODALES
            ═══════════════════════════════════════════════════════════════ */}
            <ModalEditarPlantillaV2
                isOpen={modalConfigOpen}
                setIsOpen={setModalConfigOpen}
                plantilla={plantilla}
            />
        </div>
    );
};

export default EditorPlantillaV2;
