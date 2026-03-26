import Icon from '@/components/icon/Icon';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal, { ModalBody, ModalFooter, ModalHeader } from '@/components/ui/Modal';
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import {
    COLORES_CATEGORIA,
    TIPO_CONTRATO,
    TIPOS_SECCION,
} from '@/constants/contrato.constant';
import {
    IMockComercial,
    IMockCondicion,
    IMockCotizacion,
    IMockLicencia,
    IMockServicio,
    IMockVisita,
    MOCK_COMERCIAL_POR_TIPO,
} from '@/constants/previewMock.constant';
import type {
    IEtiquetaPlantilla,
    IPlantillaContrato,
    ISeccionPlantilla,
} from '@/interface/plantillaContrato.interface';
import {
    closestCenter,
    DndContext,
    DragEndEvent,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
    Dispatch,
    forwardRef,
    Fragment,
    ReactNode,
    SetStateAction,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

const getTipoContratoLabel = (tipo: string) =>
    TIPO_CONTRATO.find((t) => t.value === tipo)?.label || tipo;

const getTipoSeccionLabel = (tipo: string) =>
    TIPOS_SECCION.find((t) => t.value === tipo)?.label || tipo;

const ETIQUETA_REGEX = /\[([a-z_]+)\]/g;

const BLOQUES_MOCK = ['alcance', 'operacion', 'condiciones'] as const;
type TBloqueMock = (typeof BLOQUES_MOCK)[number];

const BLOQUE_LABELS: Record<TBloqueMock, string> = {
    alcance: 'Alcance comercial',
    operacion: 'Operación / visitas',
    condiciones: 'Condiciones comerciales',
};

type PreviewSectionItem = {
    seccion: ISeccionPlantilla;
    isOverride: boolean;
};

type PreviewItem =
    | { kind: 'seccion'; item: PreviewSectionItem }
    | { kind: 'mock'; bloque: string };

const getSortableSectionId = (sectionId: number) => `sec-${sectionId}`;
const getMockId = (bloque: string) => `mock-${bloque}`;

const getPreviewItemId = (item: PreviewItem): string =>
    item.kind === 'seccion'
        ? getSortableSectionId(item.item.seccion.id)
        : getMockId(item.bloque);

/**
 * Construye la lista mixta de secciones + bloques intercalados,
 * usando `orden` de cada sección y `orden_bloque_*` de la plantilla.
 */
const buildMixedList = (
    secciones: PreviewSectionItem[],
    plantilla: IPlantillaContrato,
): PreviewItem[] => {
    const items: { orden: number; entry: PreviewItem }[] = [];

    for (const sec of secciones) {
        items.push({ orden: sec.seccion.orden, entry: { kind: 'seccion', item: sec } });
    }

    items.push({
        orden: plantilla.orden_bloque_alcance,
        entry: { kind: 'mock', bloque: 'alcance' },
    });
    items.push({
        orden: plantilla.orden_bloque_operacion,
        entry: { kind: 'mock', bloque: 'operacion' },
    });
    items.push({
        orden: plantilla.orden_bloque_condiciones,
        entry: { kind: 'mock', bloque: 'condiciones' },
    });

    items.sort((a, b) => a.orden - b.orden);
    return items.map((i) => i.entry);
};

/**
 * Serializa la lista mixta en el payload que acepta el endpoint reordenar.
 */
const serializeReorderPayload = (items: PreviewItem[]) => {
    const secciones: { id: number; orden: number }[] = [];
    const bloques: Record<string, number> = {};
    let orden = 1;

    for (const item of items) {
        if (item.kind === 'seccion') {
            secciones.push({ id: item.item.seccion.id, orden });
        } else {
            bloques[item.bloque] = orden;
        }
        orden++;
    }

    return {
        secciones,
        bloques: {
            alcance: bloques.alcance ?? 1000,
            operacion: bloques.operacion ?? 2000,
            condiciones: bloques.condiciones ?? 3000,
        },
    };
};

const PlaceholderChip = ({ label }: { label: string }) => (
    <Badge color='zinc' variant='outline' className='mx-0.5 inline-flex items-center px-2 py-0.5 text-xs'>
        {label}
    </Badge>
);

const EtiquetaChipPreview = ({
    clave,
    etiquetas,
}: {
    clave: string;
    etiquetas: IEtiquetaPlantilla[];
}) => {
    const etiqueta = etiquetas.find((e) => e.clave === clave);
    const color = etiqueta ? (COLORES_CATEGORIA[etiqueta.categoria] ?? 'zinc') : 'zinc';
    const label = etiqueta?.nombre_display ?? clave;

    return (
        <Badge color={color} variant='outline' className='mx-0.5 inline-flex items-center px-2 py-0.5 text-xs'>
            {label}
        </Badge>
    );
};

const renderContenidoConChips = (
    contenido: string,
    etiquetas: IEtiquetaPlantilla[],
) => {
    const partes: ReactNode[] = [];
    let lastIndex = 0;
    const regex = new RegExp(ETIQUETA_REGEX.source, 'g');
    let match: RegExpExecArray | null = regex.exec(contenido);

    while (match !== null) {
        if (match.index > lastIndex) {
            partes.push(contenido.slice(lastIndex, match.index));
        }
        partes.push(
            <EtiquetaChipPreview
                key={`chip-${match.index}`}
                clave={match[1]}
                etiquetas={etiquetas}
            />,
        );
        lastIndex = regex.lastIndex;
        match = regex.exec(contenido);
    }

    if (lastIndex < contenido.length) {
        partes.push(contenido.slice(lastIndex));
    }

    return partes.map((parte, i) =>
        typeof parte === 'string' ? <Fragment key={i}>{parte}</Fragment> : parte,
    );
};

interface IPreviewDocumentalPlantillaProps {
    isOpen: boolean;
    setIsOpen: Dispatch<SetStateAction<boolean>>;
    plantilla: IPlantillaContrato;
    etiquetas: IEtiquetaPlantilla[];
    mode: 'general' | 'focus-section' | 'reorder';
    focusSectionId?: number;
    sectionOverride?: {
        id: number;
        contenido_template: string;
        titulo?: string;
        tipo?: string;
    };
    onReorder?: (payload: {
        secciones: { id: number; orden: number }[];
        bloques: { alcance: number; operacion: number; condiciones: number };
    }) => void;
    isReordering?: boolean;
}

const PreviewDocumentalPlantilla = ({
    isOpen,
    setIsOpen,
    plantilla,
    etiquetas,
    mode,
    focusSectionId,
    sectionOverride,
    onReorder,
    isReordering,
}: IPreviewDocumentalPlantillaProps) => {
    const focusRef = useRef<HTMLDivElement | null>(null);
    const mockData: IMockComercial | undefined =
        MOCK_COMERCIAL_POR_TIPO[plantilla.tipo_contrato];
    const isReorderMode = mode === 'reorder';

    const seccionesConOverride = useMemo(() => {
        return plantilla.secciones.map((s) => {
            if (sectionOverride && s.id === sectionOverride.id) {
                return {
                    ...s,
                    contenido_template: sectionOverride.contenido_template,
                    titulo: sectionOverride.titulo ?? s.titulo,
                    tipo: (sectionOverride.tipo as ISeccionPlantilla['tipo']) ?? s.tipo,
                };
            }
            return s;
        });
    }, [plantilla.secciones, sectionOverride]);

    const previewSectionItems = useMemo<PreviewSectionItem[]>(
        () =>
            seccionesConOverride.map((seccion) => ({
                seccion,
                isOverride: sectionOverride?.id === seccion.id,
            })),
        [seccionesConOverride, sectionOverride?.id],
    );

    const [localReorderItems, setLocalReorderItems] = useState<PreviewItem[]>([]);

    const mixedPreviewItems = useMemo(
        () => buildMixedList(previewSectionItems, plantilla),
        [previewSectionItems, plantilla],
    );

    useEffect(() => {
        if (isOpen && isReorderMode) {
            setLocalReorderItems(buildMixedList(previewSectionItems, plantilla));
        }
    }, [isOpen, isReorderMode, previewSectionItems, plantilla]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor),
    );

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        setLocalReorderItems((prev) => {
            const oldIndex = prev.findIndex(
                (item) => getPreviewItemId(item) === String(active.id),
            );
            const newIndex = prev.findIndex(
                (item) => getPreviewItemId(item) === String(over.id),
            );
            if (oldIndex === -1 || newIndex === -1) return prev;
            return arrayMove(prev, oldIndex, newIndex);
        });
    }, []);

    const handleSaveOrder = () => {
        if (onReorder) {
            onReorder(serializeReorderPayload(localReorderItems));
        }
    };

    useEffect(() => {
        if (mode === 'focus-section' && focusRef.current && isOpen) {
            const timer = setTimeout(() => {
                focusRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 200);
            return () => clearTimeout(timer);
        }
    }, [mode, focusSectionId, isOpen]);

    const renderPreviewSection = (
        item: PreviewSectionItem,
        options?: {
            sortable?: boolean;
            focused?: boolean;
            dimmed?: boolean;
            attachFocusRef?: boolean;
        },
    ) => {
        const sectionContent =
            item.seccion.tipo === 'firmas' ? (
                <ZonaFirmaReferencia />
            ) : (
                <SeccionPreview
                    seccion={item.seccion}
                    etiquetas={etiquetas}
                    isOverride={item.isOverride}
                    isFocused={options?.focused ?? false}
                    isDimmed={options?.dimmed ?? false}
                    ref={options?.attachFocusRef ? focusRef : undefined}
                />
            );

        if (options?.sortable) {
            return (
                <SortableSeccionWrapper
                    key={item.seccion.id}
                    id={getSortableSectionId(item.seccion.id)}>
                    {sectionContent}
                </SortableSeccionWrapper>
            );
        }

        if (item.seccion.tipo === 'firmas' && options?.attachFocusRef) {
            return (
                <div key={item.seccion.id} ref={focusRef}>
                    {sectionContent}
                </div>
            );
        }

        return <Fragment key={item.seccion.id}>{sectionContent}</Fragment>;
    };

    const renderMockBlock = (bloque: string, isDimmed: boolean, showPlaceholder: boolean) => {
        if (!mockData) {
            return showPlaceholder ? (
                <BloqueMockPlaceholder key={`mock-${bloque}`} bloque={bloque} />
            ) : null;
        }

        const hasContent =
            (bloque === 'alcance' &&
                (mockData.servicios.length > 0 ||
                    mockData.licencias.length > 0 ||
                    mockData.cotizaciones.length > 0)) ||
            (bloque === 'operacion' && mockData.visitas.length > 0) ||
            (bloque === 'condiciones' && mockData.condiciones.length > 0);

        if (!hasContent && showPlaceholder) {
            return <BloqueMockPlaceholder key={`mock-${bloque}`} bloque={bloque} />;
        }

        if (!hasContent) return null;

        return (
            <BloqueMock
                key={`mock-${bloque}`}
                bloque={bloque}
                mockData={mockData}
                isDimmed={isDimmed}
            />
        );
    };

    const renderMixedPreview = (items: PreviewItem[]) =>
        items.map((item) => {
            if (item.kind === 'mock') {
                return renderMockBlock(item.bloque, mode === 'focus-section', false);
            }
            return renderPreviewSection(item.item, {
                focused:
                    mode === 'focus-section' && item.item.seccion.id === focusSectionId,
                dimmed:
                    mode === 'focus-section' && item.item.seccion.id !== focusSectionId,
                attachFocusRef: item.item.seccion.id === focusSectionId,
            });
        });

    const renderItems = () => {
        if (previewSectionItems.length === 0) {
            return (
                <div className='rounded-lg border border-dashed border-zinc-300 p-10 text-center text-zinc-400 dark:border-zinc-600'>
                    Esta plantilla no tiene secciones definidas.
                </div>
            );
        }

        if (isReorderMode) {
            const allIds = localReorderItems.map(getPreviewItemId);
            return (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}>
                    <SortableContext
                        items={allIds}
                        strategy={verticalListSortingStrategy}>
                        <div className='flex flex-col gap-3'>
                            {localReorderItems.map((reorderItem) => {
                                const itemId = getPreviewItemId(reorderItem);
                                if (reorderItem.kind === 'mock') {
                                    return (
                                        <SortableSeccionWrapper
                                            key={itemId}
                                            id={itemId}>
                                            {renderMockBlock(
                                                reorderItem.bloque,
                                                false,
                                                true,
                                            )}
                                        </SortableSeccionWrapper>
                                    );
                                }
                                return renderPreviewSection(reorderItem.item, {
                                    sortable: true,
                                });
                            })}
                        </div>
                    </SortableContext>
                </DndContext>
            );
        }

        return renderMixedPreview(mixedPreviewItems);
    };

    return (
        <Modal isOpen={isOpen} setIsOpen={setIsOpen} fullScreen isScrollable>
            <ModalHeader>
                <div className='flex items-center gap-3'>
                    <span>
                        {isReorderMode
                            ? 'Ordenar secciones'
                            : 'Vista previa documental'}
                    </span>
                    {isReorderMode && (
                        <Badge color='amber' variant='outline'>
                            Modo: Reordenar
                        </Badge>
                    )}
                </div>
            </ModalHeader>
            <ModalBody>
                <div className='mx-auto flex max-w-4xl flex-col gap-6'>
                    {isReorderMode && (
                        <div className='rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-sm text-amber-800 dark:border-amber-800/40 dark:bg-amber-950/20 dark:text-amber-200'>
                            Arrastra las secciones y los bloques demo para cambiar su
                            orden en el documento.
                        </div>
                    )}
                    <section className='rounded-lg border border-gray-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900'>
                        <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
                            <div className='min-w-0 space-y-2'>
                                <div className='flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-zinc-500'>
                                    <Icon icon='HeroEye' className='h-4 w-4' />
                                    Documento contractual (simulación)
                                </div>
                                <h1 className='break-words text-2xl font-bold text-gray-900 dark:text-zinc-100'>
                                    {plantilla.titulo}
                                </h1>
                                {plantilla.descripcion && (
                                    <p className='max-w-3xl text-sm leading-6 text-gray-500 dark:text-zinc-400'>
                                        {plantilla.descripcion}
                                    </p>
                                )}
                            </div>
                            <div className='flex flex-col items-start gap-2 sm:items-end'>
                                <Badge color='blue' variant='outline'>
                                    {getTipoContratoLabel(plantilla.tipo_contrato)}
                                </Badge>
                                <span className='text-xs text-zinc-500'>
                                    Versión {plantilla.version}
                                </span>
                            </div>
                        </div>
                        {mockData && (
                            <div className='mt-5 grid gap-3 text-sm md:grid-cols-3'>
                                <div className='rounded-md bg-gray-50 px-4 py-3 dark:bg-zinc-800'>
                                    <span className='block text-xs font-medium text-gray-500 dark:text-zinc-400'>
                                        Cliente (demo)
                                    </span>
                                    <span className='font-semibold text-gray-900 dark:text-zinc-100'>
                                        {mockData.info.cliente}
                                    </span>
                                </div>
                                <div className='rounded-md bg-gray-50 px-4 py-3 dark:bg-zinc-800'>
                                    <span className='block text-xs font-medium text-gray-500 dark:text-zinc-400'>
                                        Moneda
                                    </span>
                                    <span className='font-semibold text-gray-900 dark:text-zinc-100'>
                                        {mockData.info.moneda}
                                    </span>
                                </div>
                                <div className='rounded-md bg-gray-50 px-4 py-3 dark:bg-zinc-800'>
                                    <span className='block text-xs font-medium text-gray-500 dark:text-zinc-400'>
                                        Vigencia (demo)
                                    </span>
                                    <span className='font-semibold text-gray-900 dark:text-zinc-100'>
                                        {mockData.info.fecha_inicio} — {mockData.info.fecha_termino}
                                    </span>
                                </div>
                            </div>
                        )}
                    </section>

                    {renderItems()}
                </div>
            </ModalBody>
            <ModalFooter>
                {isReorderMode ? (
                    <div className='flex gap-2'>
                        <Button onClick={() => setIsOpen(false)}>
                            Cancelar
                        </Button>
                        <Button
                            variant='solid'
                            icon='HeroCheck'
                            onClick={handleSaveOrder}
                            isLoading={isReordering}
                            isDisable={isReordering}>
                            Guardar orden
                        </Button>
                    </div>
                ) : (
                    <Button onClick={() => setIsOpen(false)}>Cerrar</Button>
                )}
            </ModalFooter>
        </Modal>
    );
};

export default PreviewDocumentalPlantilla;

const SortableSeccionWrapper = ({
    id,
    children,
}: {
    id: string;
    children: ReactNode;
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} className='relative'>
            <button
                type='button'
                className='absolute -left-2 top-3 z-10 cursor-grab rounded-md bg-white p-1.5 shadow-md ring-1 ring-zinc-200 transition-colors hover:bg-zinc-100 active:cursor-grabbing dark:bg-zinc-800 dark:ring-zinc-600 dark:hover:bg-zinc-700'
                {...attributes}
                {...listeners}>
                <svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='currentColor' className='text-zinc-400'>
                    <circle cx='9' cy='5' r='1.5' />
                    <circle cx='15' cy='5' r='1.5' />
                    <circle cx='9' cy='12' r='1.5' />
                    <circle cx='15' cy='12' r='1.5' />
                    <circle cx='9' cy='19' r='1.5' />
                    <circle cx='15' cy='19' r='1.5' />
                </svg>
            </button>
            {children}
        </div>
    );
};

interface ISeccionPreviewProps {
    seccion: ISeccionPlantilla;
    etiquetas: IEtiquetaPlantilla[];
    isOverride: boolean;
    isFocused: boolean;
    isDimmed: boolean;
}

const SeccionPreview = forwardRef<HTMLDivElement, ISeccionPreviewProps>(
    ({ seccion, etiquetas, isOverride, isFocused, isDimmed }, ref) => {
        let className =
            'rounded-lg border bg-white p-5 transition-all duration-300 dark:bg-zinc-900';
        if (isFocused) {
            className +=
                ' ring-2 ring-blue-400 border-blue-300 bg-blue-50/30 dark:border-blue-700 dark:bg-blue-950/20';
        } else if (isDimmed) {
            className += ' opacity-40 pointer-events-none border-gray-200 dark:border-zinc-700';
        } else {
            className += ' border-gray-200 dark:border-zinc-700';
        }

        return (
            <div ref={ref} className={className}>
                <div className='mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
                    <div className='flex items-center gap-2'>
                        <span className='text-xs font-bold text-zinc-400'>
                            {seccion.orden}.
                        </span>
                        <span className='text-sm font-semibold text-gray-900 dark:text-zinc-100'>
                            {seccion.titulo}
                        </span>
                        <Badge color='zinc' variant='outline' className='text-[10px]'>
                            {getTipoSeccionLabel(seccion.tipo)}
                        </Badge>
                        {isOverride && (
                            <Badge color='violet' variant='outline' className='text-[10px]'>
                                No guardado
                            </Badge>
                        )}
                    </div>
                </div>
                <div className='whitespace-pre-wrap text-sm leading-relaxed text-gray-700 dark:text-zinc-300'>
                    {renderContenidoConChips(seccion.contenido_template, etiquetas)}
                </div>
            </div>
        );
    },
);
SeccionPreview.displayName = 'SeccionPreview';

const BloqueMockPlaceholder = ({ bloque }: { bloque: string }) => (
    <section className='rounded-lg border border-dashed border-blue-200 bg-blue-50/30 p-5 dark:border-blue-800 dark:bg-blue-950/10'>
        <Badge color='blue' variant='outline' className='mb-3 text-[10px]'>
            Bloque demo fijo
        </Badge>
        <div className='text-sm font-semibold text-blue-900 dark:text-blue-100'>
            {bloque === 'alcance'
                ? 'Alcance comercial'
                : bloque === 'operacion'
                  ? 'Operación / visitas'
                  : 'Condiciones comerciales'}
        </div>
        <p className='mt-2 text-sm text-blue-700 dark:text-blue-200'>
            Este tipo de contrato no tiene datos demo para este bloque, pero la zona de orden se
            mantiene disponible.
        </p>
    </section>
);

const BloqueMock = ({
    bloque,
    mockData,
    isDimmed,
}: {
    bloque: string;
    mockData: IMockComercial;
    isDimmed: boolean;
}) => {
    const dimClass = isDimmed ? ' opacity-40 pointer-events-none' : '';
    const wrapperClass = `rounded-lg border border-dashed border-blue-300 bg-blue-50/30 p-5 dark:border-blue-700 dark:bg-blue-950/20${dimClass}`;

    const labelBadge = (
        <Badge color='blue' variant='outline' className='mb-3 text-[10px]'>
            Datos comerciales (demo)
        </Badge>
    );

    if (bloque === 'alcance') {
        if (
            mockData.servicios.length === 0 &&
            mockData.licencias.length === 0 &&
            mockData.cotizaciones.length === 0
        ) {
            return null;
        }
        return (
            <div className={wrapperClass}>
                {labelBadge}
                {mockData.cotizaciones.length > 0 && (
                    <CotizacionesMock
                        cotizaciones={mockData.cotizaciones}
                        totalConsolidado={mockData.total_consolidado}
                        monedaContrato={mockData.info.moneda}
                        formaPagoVenta={mockData.forma_pago_venta}
                        cuotasVenta={mockData.cuotas_venta}
                    />
                )}
                {mockData.servicios.length > 0 && <ServiciosMock servicios={mockData.servicios} />}
                {mockData.licencias.length > 0 && <LicenciasMock licencias={mockData.licencias} />}
            </div>
        );
    }

    if (bloque === 'operacion') {
        if (mockData.visitas.length === 0) return null;
        return (
            <div className={wrapperClass}>
                {labelBadge}
                <VisitasMock visitas={mockData.visitas} />
            </div>
        );
    }

    if (bloque === 'condiciones') {
        if (mockData.condiciones.length === 0) return null;
        return (
            <div className={wrapperClass}>
                {labelBadge}
                <CondicionesMock condiciones={mockData.condiciones} />
            </div>
        );
    }

    return null;
};

const ServiciosMock = ({ servicios }: { servicios: IMockServicio[] }) => (
    <div className='space-y-4'>
        <h3 className='text-sm font-semibold text-gray-900 dark:text-zinc-100'>
            Servicios Contratados
        </h3>
        {servicios.map((s, i) => (
            <div
                key={i}
                className='rounded-md border border-gray-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900'>
                <div className='mb-2 flex items-start justify-between'>
                    <span className='font-medium text-gray-900 dark:text-zinc-100'>
                        {i + 1}. {s.nombre}
                    </span>
                    <span className='flex items-center gap-1 text-sm text-gray-700 dark:text-zinc-300'>
                        <PlaceholderChip label='Cantidad' />
                        <span>×</span>
                        <PlaceholderChip label='Precio unitario' />
                    </span>
                </div>
                <div className='grid gap-2 text-xs md:grid-cols-2'>
                    {s.incluye.length > 0 && (
                        <div>
                            <span className='font-medium text-emerald-600'>Incluye:</span>
                            <ul className='ml-4 mt-1 list-disc text-gray-600 dark:text-zinc-400'>
                                {s.incluye.map((item, j) => (
                                    <li key={j}>{item}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {s.no_incluye.length > 0 && (
                        <div>
                            <span className='font-medium text-red-600'>No incluye:</span>
                            <ul className='ml-4 mt-1 list-disc text-gray-600 dark:text-zinc-400'>
                                {s.no_incluye.map((item, j) => (
                                    <li key={j}>{item}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
                {s.clausulas && (
                    <p className='mt-2 text-xs italic text-gray-500 dark:text-zinc-400'>
                        {s.clausulas}
                    </p>
                )}
            </div>
        ))}
    </div>
);

const LicenciasMock = ({ licencias }: { licencias: IMockLicencia[] }) => (
    <div className='mt-4 space-y-2'>
        <h3 className='text-sm font-semibold text-gray-900 dark:text-zinc-100'>Licencias</h3>
        <Table>
            <THead>
                <Tr>
                    <Th>Producto</Th>
                    <Th>Modalidad</Th>
                    <Th>Cantidad</Th>
                    <Th>Precio Unit.</Th>
                </Tr>
            </THead>
            <TBody>
                {licencias.map((lic, i) => (
                    <Tr key={i}>
                        <Td>{lic.nombre}</Td>
                        <Td>{lic.modalidad}</Td>
                        <Td><PlaceholderChip label='Cantidad' /></Td>
                        <Td><PlaceholderChip label='Precio unit.' /></Td>
                    </Tr>
                ))}
            </TBody>
        </Table>
    </div>
);

const CotizacionesMock = ({
    cotizaciones,
    totalConsolidado,
    monedaContrato,
    formaPagoVenta,
    cuotasVenta,
}: {
    cotizaciones: IMockCotizacion[];
    totalConsolidado: number;
    monedaContrato: string;
    formaPagoVenta?: 'contado' | 'cuotas';
    cuotasVenta?: Array<{
        orden: number;
        porcentaje: number;
        monto: number;
        hito_pago_descripcion?: string;
        hito_pago_label?: string;
    }>;
}) => (
    <div className='space-y-4'>
        <div className='flex items-center justify-between gap-3'>
            <h3 className='text-sm font-semibold text-gray-900 dark:text-zinc-100'>
                Cotizaciones Vinculadas
            </h3>
            <Badge color='emerald' variant='outline' className='text-[10px]'>
                Total consolidado: {monedaContrato} {totalConsolidado}
            </Badge>
        </div>
        {cotizaciones.map((cotizacion, index) => (
            <div
                key={`${cotizacion.numero}-${index}`}
                className='rounded-md border border-gray-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900'>
                <div className='mb-3 flex items-start justify-between gap-3'>
                    <div>
                        <div className='font-medium text-gray-900 dark:text-zinc-100'>
                            Cotizacion #{cotizacion.numero}
                        </div>
                        <p className='text-xs text-gray-500 dark:text-zinc-400'>
                            {cotizacion.nombre}
                        </p>
                    </div>
                    <div className='text-right text-xs text-gray-600 dark:text-zinc-300'>
                        <div>Moneda: {cotizacion.moneda}</div>
                        <div>Total original: {cotizacion.moneda} {cotizacion.total}</div>
                        {cotizacion.total_convertido != null && (
                            <div>
                                Total convertido: {cotizacion.moneda_contrato || monedaContrato}{' '}
                                {cotizacion.total_convertido}
                            </div>
                        )}
                        {cotizacion.dolar_observado != null && (
                            <div>Dolar observado: {cotizacion.dolar_observado}</div>
                        )}
                        {cotizacion.valor_uf != null && <div>Valor UF: {cotizacion.valor_uf}</div>}
                    </div>
                </div>
                <Table>
                    <THead>
                        <Tr>
                            <Th>Item</Th>
                            <Th>Cantidad</Th>
                            <Th>Precio Unit.</Th>
                            <Th>Total</Th>
                        </Tr>
                    </THead>
                    <TBody>
                        {cotizacion.items.map((item, itemIndex) => (
                            <Tr key={`${cotizacion.numero}-${itemIndex}`}>
                                <Td>{item.nombre}</Td>
                                <Td>
                                    <PlaceholderChip label={String(item.cantidad)} />
                                </Td>
                                <Td>
                                    <PlaceholderChip label={`${cotizacion.moneda} ${item.precio_unitario}`} />
                                </Td>
                                <Td>
                                    <PlaceholderChip label={`${cotizacion.moneda} ${item.total}`} />
                                </Td>
                            </Tr>
                        ))}
                    </TBody>
                </Table>
            </div>
        ))}
        <div className='rounded-md border border-gray-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900'>
            <div className='flex items-center justify-between gap-3'>
                <div>
                    <div className='text-sm font-semibold text-gray-900 dark:text-zinc-100'>
                        Condicion de pago demo
                    </div>
                    <div className='text-xs text-gray-500 dark:text-zinc-400'>
                        {formaPagoVenta === 'cuotas' ? 'Cuotas' : 'Contado'}
                    </div>
                </div>
                <Badge color={formaPagoVenta === 'cuotas' ? 'amber' : 'emerald'} variant='outline' className='text-[10px]'>
                    {formaPagoVenta === 'cuotas' ? 'Cuotas' : 'Contado'}
                </Badge>
            </div>
            {formaPagoVenta === 'cuotas' && (cuotasVenta?.length ?? 0) > 0 && (
                <Table className='mt-3'>
                    <THead>
                        <Tr>
                            <Th>Cuota</Th>
                            <Th>Porcentaje</Th>
                            <Th>Hito de cobro</Th>
                            <Th>Monto</Th>
                        </Tr>
                    </THead>
                    <TBody>
                        {cuotasVenta?.map((cuota) => (
                            <Tr key={cuota.orden}>
                                <Td>Cuota {cuota.orden}</Td>
                                <Td>{cuota.porcentaje}%</Td>
                                <Td>{cuota.hito_pago_label || cuota.hito_pago_descripcion || 'Sin definir'}</Td>
                                <Td>
                                    <PlaceholderChip label={`${monedaContrato} ${cuota.monto}`} />
                                </Td>
                            </Tr>
                        ))}
                    </TBody>
                </Table>
            )}
        </div>
    </div>
);

const VisitasMock = ({ visitas }: { visitas: IMockVisita[] }) => (
    <div className='space-y-2'>
        <h3 className='text-sm font-semibold text-gray-900 dark:text-zinc-100'>
            Visitas Programadas
        </h3>
        <Table>
            <THead>
                <Tr>
                    <Th>Descripción</Th>
                    <Th>Frecuencia</Th>
                    <Th>Cantidad</Th>
                </Tr>
            </THead>
            <TBody>
                {visitas.map((v, i) => (
                    <Tr key={i}>
                        <Td>{v.descripcion}</Td>
                        <Td>{v.frecuencia}</Td>
                        <Td><PlaceholderChip label='Cantidad' /></Td>
                    </Tr>
                ))}
            </TBody>
        </Table>
    </div>
);

const CondicionesMock = ({ condiciones }: { condiciones: IMockCondicion[] }) => (
    <div className='space-y-3'>
        <h3 className='text-sm font-semibold text-gray-900 dark:text-zinc-100'>
            Condiciones Especiales
        </h3>
        {condiciones.map((c, i) => (
            <div
                key={i}
                className='rounded-md border border-gray-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900'>
                <span className='font-medium text-gray-900 dark:text-zinc-100'>{c.titulo}</span>
                <p className='mt-1 whitespace-pre-wrap text-xs leading-relaxed text-gray-600 dark:text-zinc-400'>
                    {c.detalle}
                </p>
                {c.multa != null && (
                    <p className='mt-2 text-xs font-medium text-red-600'>
                        Multa por incumplimiento: <PlaceholderChip label='Monto multa' />
                    </p>
                )}
            </div>
        ))}
    </div>
);

const ZonaFirmaReferencia = () => (
    <section className='rounded-lg border border-dashed border-gray-300 bg-gray-50/60 p-6 dark:border-zinc-600 dark:bg-zinc-800/40'>
        <div className='mb-4 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-zinc-500'>
            <Icon icon='HeroPencilSquare' className='h-4 w-4' />
            Zona de firma (solo referencia visual)
        </div>
        <div className='grid gap-8 md:grid-cols-2'>
            <div className='flex flex-col items-center gap-3'>
                <div className='h-20 w-full rounded border border-dashed border-gray-300 dark:border-zinc-600' />
                <div className='h-px w-48 bg-gray-400 dark:bg-zinc-500' />
                <span className='text-xs text-gray-500 dark:text-zinc-400'>
                    Representante Empresa Prestadora
                </span>
            </div>
            <div className='flex flex-col items-center gap-3'>
                <div className='h-20 w-full rounded border border-dashed border-gray-300 dark:border-zinc-600' />
                <div className='h-px w-48 bg-gray-400 dark:bg-zinc-500' />
                <span className='text-xs text-gray-500 dark:text-zinc-400'>
                    Representante Cliente
                </span>
            </div>
        </div>
    </section>
);
