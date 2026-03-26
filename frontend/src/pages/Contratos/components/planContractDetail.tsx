import type {
    ICaracteristicaServicio,
    IContratoItemComercial,
    IContratoPlanComponenteSnapshot,
    IContratoServicio,
    IPlanServicio,
    IPlanServicioDetalle,
    IServicio,
    IServicioAlcanceItem,
} from '@/interface/contrato.interface';

export interface IPlanComponentContractDetail {
    key: string;
    servicioVersionId?: number | null;
    nombre: string;
    descripcion?: string | null;
    categoria?: string | null;
    categoriaLabel?: string | null;
    obligatorio?: boolean | null;
    cantidadDefault?: number | null;
    vecesPorMesDefault?: number | null;
    orden: number;
    caracteristicas: ICaracteristicaServicio[];
    incluye: string[];
    noIncluye: string[];
    clausulasEspeciales?: string | null;
}

type TPlanContractSource = {
    snapshot_componentes_plan?: IContratoPlanComponenteSnapshot[] | null;
    plan_version?: IPlanServicio | null;
    servicio_generico?: IContratoServicio['servicio_generico'] | Record<string, unknown> | null;
    tipo_origen?: IContratoItemComercial['tipo_origen'];
    tipo_item?: IContratoItemComercial['tipo_item'] | string;
};

const normalizeTextValue = (value?: string | null) =>
    (value ?? '')
        .split(/\r?\n/)
        .map((line) => line.trim().replace(/^[-*]\s*/, '').trim())
        .filter(Boolean);

const dedupeLines = (values: string[]) => Array.from(new Set(values.filter(Boolean)));

const normalizeCaracteristica = (
    value: Partial<ICaracteristicaServicio> | null | undefined,
    index: number,
): ICaracteristicaServicio => ({
    id: Number(value?.id ?? index + 1),
    fecha_creacion: '',
    fecha_modificacion: '',
    nombre: value?.nombre ?? '',
    descripcion: value?.descripcion ?? '',
});

const getScopeLinesFromItems = (
    items: IServicioAlcanceItem[] | null | undefined,
    mode: 'incluye' | 'no_incluye',
) =>
    (items ?? [])
        .filter((item) => item.modo === mode)
        .map((item) =>
            item.caracteristica.descripcion
                ? `${item.caracteristica.nombre}: ${item.caracteristica.descripcion}`
                : item.caracteristica.nombre,
        );

const isPlanServicio = (value: unknown): value is IPlanServicio =>
    Boolean(
        value &&
            typeof value === 'object' &&
            ('detalles_servicio' in value || 'servicios' in value),
    );

const buildComponentFromServicio = (
    servicio: IServicio | null | undefined,
    index: number,
    overrides?: Partial<IPlanComponentContractDetail>,
): IPlanComponentContractDetail | null => {
    if (!servicio) return null;

    const caracteristicas = (servicio.caracteristicas ?? []).map((caracteristica, caracteristicaIndex) =>
        normalizeCaracteristica(caracteristica, caracteristicaIndex),
    );
    const incluye = dedupeLines([
        ...normalizeTextValue(servicio.incluye),
        ...getScopeLinesFromItems(servicio.alcance_caracteristicas, 'incluye'),
    ]);
    const noIncluye = dedupeLines([
        ...normalizeTextValue(servicio.no_incluye),
        ...getScopeLinesFromItems(servicio.alcance_caracteristicas, 'no_incluye'),
    ]);

    return {
        key: overrides?.key ?? `servicio-${servicio.id ?? index}`,
        servicioVersionId: servicio.id ?? null,
        nombre: servicio.nombre ?? 'Servicio incluido',
        descripcion: servicio.descripcion ?? null,
        categoria: servicio.categoria ?? null,
        categoriaLabel: servicio.categoria_label ?? null,
        obligatorio: overrides?.obligatorio ?? null,
        cantidadDefault: overrides?.cantidadDefault ?? null,
        vecesPorMesDefault: overrides?.vecesPorMesDefault ?? servicio.veces_por_mes_default ?? null,
        orden: overrides?.orden ?? index,
        caracteristicas,
        incluye,
        noIncluye,
        clausulasEspeciales:
            overrides?.clausulasEspeciales ?? servicio.clausulas_especiales ?? null,
    };
};

const buildComponentFromSnapshot = (
    raw: IContratoPlanComponenteSnapshot,
    index: number,
): IPlanComponentContractDetail | null => {
    if (!raw?.nombre) return null;

    const caracteristicas = (raw.caracteristicas ?? []).map((caracteristica, caracteristicaIndex) =>
        normalizeCaracteristica(caracteristica, caracteristicaIndex),
    );
    const incluye = dedupeLines([
        ...normalizeTextValue(raw.incluye),
        ...normalizeTextValue(raw.alcance_caracteristicas_texto),
        ...getScopeLinesFromItems(raw.alcance_caracteristicas, 'incluye'),
    ]);
    const noIncluye = dedupeLines([
        ...normalizeTextValue(raw.no_incluye),
        ...getScopeLinesFromItems(raw.alcance_caracteristicas, 'no_incluye'),
    ]);

    return {
        key: `snapshot-${raw.servicio_version_id ?? index}-${raw.nombre}`,
        servicioVersionId: raw.servicio_version_id ?? null,
        nombre: raw.nombre,
        descripcion: raw.descripcion ?? null,
        categoria: raw.categoria ?? null,
        categoriaLabel: raw.categoria_label ?? null,
        obligatorio: raw.obligatorio ?? null,
        cantidadDefault: raw.cantidad_default ?? null,
        vecesPorMesDefault: raw.veces_por_mes_default ?? null,
        orden: Number(raw.orden ?? index),
        caracteristicas,
        incluye,
        noIncluye,
        clausulasEspeciales: raw.clausulas_especiales ?? null,
    };
};

const buildComponentFromPlanDetail = (
    detalle: IPlanServicioDetalle,
    index: number,
): IPlanComponentContractDetail | null =>
    buildComponentFromServicio(detalle.servicio_version, index, {
        key: `detalle-${detalle.id}`,
        obligatorio: detalle.obligatorio,
        cantidadDefault: detalle.cantidad_default,
        vecesPorMesDefault: detalle.veces_por_mes_default,
        orden: detalle.orden ?? index,
    });

export const isPlanContractSource = (source: TPlanContractSource) =>
    source.tipo_origen === 'plan' ||
    source.tipo_item === 'plan' ||
    isPlanServicio(source.plan_version) ||
    isPlanServicio(source.servicio_generico);

export const getPlanComponentDetails = (
    source: TPlanContractSource,
): IPlanComponentContractDetail[] => {
    const snapshotComponents = (source.snapshot_componentes_plan ?? [])
        .map((component, index) => buildComponentFromSnapshot(component, index))
        .filter(Boolean) as IPlanComponentContractDetail[];

    if (snapshotComponents.length > 0) {
        return snapshotComponents.sort((a, b) => a.orden - b.orden);
    }

    const planVersion = source.plan_version
        ? source.plan_version
        : isPlanServicio(source.servicio_generico)
          ? source.servicio_generico
          : null;

    if (planVersion?.detalles_servicio?.length) {
        return planVersion.detalles_servicio
            .map((detalle, index) => buildComponentFromPlanDetail(detalle, index))
            .filter(Boolean)
            .sort((a, b) => a!.orden - b!.orden) as IPlanComponentContractDetail[];
    }

    if (planVersion?.servicios?.length) {
        return planVersion.servicios
            .map((servicio, index) => buildComponentFromServicio(servicio, index))
            .filter(Boolean) as IPlanComponentContractDetail[];
    }

    return [];
};

export const ContractTextList = ({
    title,
    value,
    className,
    itemClassName,
}: {
    title: string;
    value?: string | null | string[];
    className?: string;
    itemClassName?: string;
}) => {
    const items = Array.isArray(value) ? dedupeLines(value) : normalizeTextValue(value);
    if (items.length === 0) return null;

    return (
        <div
            className={
                className ??
                'rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/40'
            }>
            <div className='text-sm font-semibold text-zinc-900 dark:text-zinc-100'>
                {title}:
            </div>
            <ul className='mt-2 list-disc space-y-1.5 pl-5 text-sm leading-6 text-zinc-700 dark:text-zinc-300'>
                {items.map((item) => (
                    <li key={`${title}-${item}`} className={itemClassName}>
                        {item}
                    </li>
                ))}
            </ul>
        </div>
    );
};

export const ContractTextBlock = ({
    title,
    value,
    className,
    bodyClassName,
}: {
    title: string;
    value?: string | null;
    className?: string;
    bodyClassName?: string;
}) => {
    if (!value) return null;

    return (
        <div
            className={
                className ??
                'rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/40'
            }>
            <div className='text-[11px] font-semibold uppercase tracking-wide text-zinc-500'>
                {title}
            </div>
            <div
                className={
                    bodyClassName ??
                    'mt-1 whitespace-pre-wrap text-sm leading-6 text-zinc-700 dark:text-zinc-300'
                }>
                {value}
            </div>
        </div>
    );
};

export const PlanIncludedServicesDetail = ({
    components,
    title = 'Servicios incluidos en el plan',
    compact = false,
}: {
    components: IPlanComponentContractDetail[];
    title?: string;
    compact?: boolean;
}) => {
    if (components.length === 0) return null;

    const cardClassName = compact
        ? 'rounded-2xl border border-zinc-200 bg-white px-3 py-3 dark:border-zinc-800 dark:bg-zinc-950/20'
        : 'rounded-2xl border border-zinc-200 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-950/20';

    return (
        <div className='mt-4 space-y-3'>
            <div className='text-[11px] font-semibold uppercase tracking-wide text-zinc-500'>
                {title}
            </div>
            <div className='space-y-3'>
                {components.map((component) => (
                    <div className={cardClassName} key={component.key}>
                        <div className='text-sm font-semibold text-zinc-900 dark:text-zinc-100'>
                            {component.nombre}
                        </div>

                        {component.descripcion && (
                            <p className='mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300'>
                                {component.descripcion}
                            </p>
                        )}

                        <div className='mt-3 space-y-3'>
                            <ContractTextList title='Incluye' value={component.incluye} />
                            <ContractTextList title='No incluye' value={component.noIncluye} />
                            <ContractTextBlock
                                title='Clausulas especiales'
                                value={component.clausulasEspeciales}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
