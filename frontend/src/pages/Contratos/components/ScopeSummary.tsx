import Badge from '@/components/ui/Badge';
import {
    IPlanAlcanceConflicto,
    IPlanAlcanceItem,
    IServicioAlcanceItem,
} from '@/interface/contrato.interface';

interface IScopeSummaryProps {
    serviceItems?: IServicioAlcanceItem[];
    planItems?: IPlanAlcanceItem[];
    conflicts?: IPlanAlcanceConflicto[];
    includeText?: string | null;
    excludeText?: string | null;
    clauseText?: string | null;
    compact?: boolean;
}

const renderLegacyBlock = (title: string, value?: string | null) => {
    if (!value) return null;
    return (
        <div className='rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/40'>
            <div className='text-[11px] font-semibold uppercase tracking-wide text-zinc-500'>
                {title}
            </div>
            <div className='mt-1 whitespace-pre-wrap text-sm leading-6 text-zinc-700 dark:text-zinc-300'>
                {value}
            </div>
        </div>
    );
};

const ScopeSummary = ({
    serviceItems = [],
    planItems = [],
    conflicts = [],
    includeText,
    excludeText,
    clauseText,
    compact = false,
}: IScopeSummaryProps) => {
    const includeItems =
        serviceItems.length > 0
            ? serviceItems.filter((item) => item.modo === 'incluye').map((item) => item.caracteristica)
            : [];
    const excludeItems =
        serviceItems.length > 0
            ? serviceItems
                  .filter((item) => item.modo === 'no_incluye')
                  .map((item) => item.caracteristica)
            : [];

    const hasStructuredScope = includeItems.length > 0 || excludeItems.length > 0 || planItems.length > 0;

    if (!hasStructuredScope && !includeText && !excludeText && !clauseText && conflicts.length === 0) {
        return <span className='text-zinc-400'>-</span>;
    }

    return (
        <div className={compact ? 'space-y-2' : 'space-y-3'}>
            {serviceItems.length > 0 && (
                <div className={compact ? 'grid gap-2' : 'grid gap-3 xl:grid-cols-2'}>
                    <ScopeGroup
                        title='Incluye'
                        color='blue'
                        items={includeItems.map((item) => item.nombre)}
                        compact={compact}
                    />
                    <ScopeGroup
                        title='No incluye'
                        color='amber'
                        items={excludeItems.map((item) => item.nombre)}
                        compact={compact}
                    />
                </div>
            )}

            {planItems.length > 0 && (
                <div className={compact ? 'grid gap-2' : 'grid gap-3 xl:grid-cols-2'}>
                    <ScopeGroup
                        title='Incluye'
                        color='blue'
                        items={planItems
                            .filter((item) => item.modo === 'incluye')
                            .map(
                                (item) =>
                                    `${item.caracteristica.nombre}${
                                        item.servicios.length > 0
                                            ? ` (${item.servicios.join(', ')})`
                                            : ''
                                    }`,
                            )}
                        compact={compact}
                    />
                    <ScopeGroup
                        title='No incluye'
                        color='amber'
                        items={planItems
                            .filter((item) => item.modo === 'no_incluye')
                            .map(
                                (item) =>
                                    `${item.caracteristica.nombre}${
                                        item.servicios.length > 0
                                            ? ` (${item.servicios.join(', ')})`
                                            : ''
                                    }`,
                            )}
                        compact={compact}
                    />
                </div>
            )}

            {conflicts.length > 0 && (
                <div
                    className={
                        compact
                            ? 'rounded-2xl border border-red-200 bg-red-50 px-3 py-2.5 dark:border-red-900/50 dark:bg-red-950/20'
                            : 'rounded-2xl border border-red-200 bg-red-50 px-3 py-3 dark:border-red-900/50 dark:bg-red-950/20'
                    }>
                    <div
                        className={
                            compact
                                ? 'text-[10px] font-semibold uppercase tracking-wide text-red-600 dark:text-red-300'
                                : 'text-[11px] font-semibold uppercase tracking-wide text-red-600 dark:text-red-300'
                        }>
                        Conflictos de alcance
                    </div>
                    <div className={compact ? 'mt-2 space-y-1.5' : 'mt-2 space-y-2'}>
                        {conflicts.map((conflict) => (
                            <div
                                key={conflict.caracteristica.id}
                                className={
                                    compact
                                        ? 'text-xs text-red-700 dark:text-red-200'
                                        : 'text-sm text-red-700 dark:text-red-200'
                                }>
                                <span className='font-semibold'>{conflict.caracteristica.nombre}</span>
                                {': '}
                                incluye en {conflict.servicios_incluye.join(', ')} y no incluye en{' '}
                                {conflict.servicios_no_incluye.join(', ')}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {!hasStructuredScope && (
                <div className={compact ? 'space-y-2' : 'space-y-3'}>
                    {renderLegacyBlock('Incluye', includeText)}
                    {renderLegacyBlock('No incluye', excludeText)}
                </div>
            )}

            {clauseText && renderLegacyBlock('Clausulas especiales', clauseText)}
        </div>
    );
};

const ScopeGroup = ({
    title,
    color,
    items,
    compact,
}: {
    title: string;
    color: 'blue' | 'amber';
    items: string[];
    compact: boolean;
}) => {
    if (items.length === 0) return null;

    return (
        <div
            className={
                compact
                    ? 'rounded-2xl border border-zinc-200 bg-white px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-950/30'
                    : 'rounded-2xl border border-zinc-200 bg-white px-3 py-3 dark:border-zinc-800 dark:bg-zinc-950/30'
            }>
            <div
                className={
                    compact
                        ? 'text-[10px] font-semibold uppercase tracking-wide text-zinc-500'
                        : 'text-[11px] font-semibold uppercase tracking-wide text-zinc-500'
                }>
                {title}
            </div>
            <div className={compact ? 'mt-2 flex flex-wrap gap-1.5' : 'mt-2 flex flex-wrap gap-2'}>
                {items.map((item) => (
                    <Badge
                        key={item}
                        color={color}
                        variant='outline'
                        className={compact ? 'text-[11px]' : undefined}>
                        {item}
                    </Badge>
                ))}
            </div>
        </div>
    );
};

export default ScopeSummary;
