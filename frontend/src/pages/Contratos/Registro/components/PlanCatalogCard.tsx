import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardFooter, CardFooterChild } from '@/components/ui/Card';
import { IPlanServicio } from '@/interface/contrato.interface';
import ScopeSummary from '../../components/ScopeSummary';

interface IPlanCatalogCardProps {
    plan: IPlanServicio;
    onDelete: (plan: IPlanServicio) => void;
    onEdit: (plan: IPlanServicio) => void;
}

const VISIBLE_SERVICES_COUNT = 4;

const formatNumber = (value?: string | number | null, maximumFractionDigits = 0) =>
    new Intl.NumberFormat('es-CL', {
        minimumFractionDigits: maximumFractionDigits,
        maximumFractionDigits,
    }).format(Number(value || 0));

const formatPriceLabel = (
    currency: 'CLP' | 'UF' | 'USD',
    value?: string | number | null,
) => {
    const numeric = Number(value || 0);

    if (numeric <= 0) {
        return '-';
    }

    if (currency === 'CLP') {
        return `$${formatNumber(numeric)}`;
    }

    if (currency === 'UF') {
        return `${formatNumber(numeric, 2)} UF`;
    }

    return `${formatNumber(numeric)} USD`;
};

const getPrimaryPrice = (plan: IPlanServicio) => {
    const candidates = [
        { currency: 'CLP' as const, value: plan.precio_clp },
        { currency: 'UF' as const, value: plan.precio_uf },
        { currency: 'USD' as const, value: plan.precio_usd },
    ];

    const selected = candidates.find((candidate) => Number(candidate.value || 0) > 0);

    if (!selected) {
        return null;
    }

    return {
        currency: selected.currency,
        label: formatPriceLabel(selected.currency, selected.value),
    };
};

const PlanCatalogCard = ({ plan, onDelete, onEdit }: IPlanCatalogCardProps) => {
    const primaryPrice = getPrimaryPrice(plan);
    const visibleServices = plan.servicios.slice(0, VISIBLE_SERVICES_COUNT);
    const hiddenServicesCount = Math.max(plan.servicios.length - VISIBLE_SERVICES_COUNT, 0);
    const scopeCount = (plan.alcance_heredado?.length || 0) + (plan.alcance_conflictos?.length || 0);

    return (
        <Card className='h-full border border-zinc-200 shadow-sm dark:border-zinc-800'>
            <CardBody className='flex h-full flex-col gap-5'>
                <div className='space-y-3'>
                    <div className='flex items-start justify-between gap-3'>
                        <div className='min-w-0'>
                            <div className='text-[11px] font-semibold uppercase tracking-wide text-zinc-500'>
                                Plan de servicio
                            </div>
                            <h3 className='mt-1 text-xl font-semibold text-zinc-900 dark:text-zinc-100'>
                                {plan.nombre}
                            </h3>
                        </div>
                        <div className='flex shrink-0 flex-wrap justify-end gap-2'>
                            <Badge variant='outline' color='blue' className='text-[11px]'>
                                {plan.servicios.length} servicios
                            </Badge>
                            {plan.num_visitas_mensuales != null ? (
                                <Badge variant='outline' color='amber' className='text-[11px]'>
                                    {plan.num_visitas_mensuales} visitas/mes
                                </Badge>
                            ) : (
                                <Badge variant='outline' color='zinc' className='text-[11px]'>
                                    Sin visitas
                                </Badge>
                            )}
                        </div>
                    </div>
                    <p className='text-sm leading-6 text-zinc-500 dark:text-zinc-400'>
                        {plan.descripcion?.trim() || 'Sin descripcion general para este plan.'}
                    </p>
                </div>

                <div className='rounded-2xl border border-blue-200 bg-blue-50/80 p-4 dark:border-blue-900/60 dark:bg-blue-950/20'>
                    <div className='text-[11px] font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300'>
                        Precio del plan
                    </div>
                    {primaryPrice ? (
                        <>
                            <div className='mt-2 text-3xl font-semibold text-zinc-900 dark:text-zinc-50'>
                                {primaryPrice.label}
                            </div>
                            <div className='mt-1 text-xs text-zinc-500 dark:text-zinc-400'>
                                Moneda principal: {primaryPrice.currency}
                            </div>
                        </>
                    ) : (
                        <div className='mt-2 text-lg font-medium text-zinc-600 dark:text-zinc-300'>
                            Sin precio definido
                        </div>
                    )}

                    <div className='mt-4 space-y-2'>
                        <PriceRow label='CLP' value={formatPriceLabel('CLP', plan.precio_clp)} />
                        <PriceRow label='UF' value={formatPriceLabel('UF', plan.precio_uf)} />
                        <PriceRow label='USD' value={formatPriceLabel('USD', plan.precio_usd)} />
                    </div>
                </div>

                <div className='rounded-2xl bg-zinc-50 px-4 py-3 dark:bg-zinc-800/60'>
                    <div className='text-[11px] font-semibold uppercase tracking-wide text-zinc-500'>
                        Precio sugerido
                    </div>
                    <div className='mt-1 text-sm font-medium text-zinc-800 dark:text-zinc-100'>
                        {Number(plan.precio_sugerido_clp || 0) > 0
                            ? `$${formatNumber(plan.precio_sugerido_clp)} CLP`
                            : 'Sin sugerencia automatica'}
                    </div>
                </div>

                <section className='space-y-3'>
                    <div className='flex items-center justify-between gap-2'>
                        <div className='text-[11px] font-semibold uppercase tracking-wide text-zinc-500'>
                            Servicios incluidos
                        </div>
                        <span className='text-xs text-zinc-500'>
                            {plan.servicios.length} total
                        </span>
                    </div>

                    {plan.servicios.length > 0 ? (
                        <div className='flex flex-wrap gap-2'>
                            {visibleServices.map((service) => (
                                <Badge
                                    key={service.id}
                                    color='emerald'
                                    variant='outline'
                                    className='text-[11px]'>
                                    {service.nombre}
                                </Badge>
                            ))}
                            {hiddenServicesCount > 0 && (
                                <Badge color='zinc' variant='outline' className='text-[11px]'>
                                    +{hiddenServicesCount} mas
                                </Badge>
                            )}
                        </div>
                    ) : (
                        <div className='rounded-2xl border border-dashed border-zinc-200 px-4 py-3 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400'>
                            Este plan aun no tiene servicios asociados.
                        </div>
                    )}
                </section>

                <section className='space-y-3'>
                    <div className='flex items-center justify-between gap-2'>
                        <div className='text-[11px] font-semibold uppercase tracking-wide text-zinc-500'>
                            Alcance heredado
                        </div>
                        {scopeCount > 0 && (
                            <Badge variant='outline' color='blue' className='text-[11px]'>
                                {scopeCount} bloques
                            </Badge>
                        )}
                    </div>
                    <div className='rounded-2xl border border-zinc-200 p-3 dark:border-zinc-800'>
                        <ScopeSummary
                            planItems={plan.alcance_heredado}
                            conflicts={plan.alcance_conflictos}
                            includeText={plan.incluye}
                            excludeText={plan.no_incluye}
                            clauseText={plan.clausulas_especiales}
                            compact
                        />
                    </div>
                </section>

                <div className='mt-auto rounded-2xl bg-zinc-50 px-4 py-3 dark:bg-zinc-800/60'>
                    <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                        <MetricBlock
                            label='Visitas presenciales'
                            value={
                                plan.num_visitas_mensuales != null
                                    ? `${plan.num_visitas_mensuales} por mes`
                                    : 'No aplica'
                            }
                        />
                        <MetricBlock
                            label='Conflictos detectados'
                            value={`${plan.alcance_conflictos?.length || 0}`}
                        />
                    </div>
                </div>
            </CardBody>

            <CardFooter className='border-t border-zinc-200/80 pt-4 dark:border-zinc-800'>
                <CardFooterChild className='w-full justify-between sm:justify-end'>
                    <Button
                        variant='solid'
                        color='blue'
                        icon='HeroPencil'
                        size='sm'
                        onClick={() => onEdit(plan)}>
                        Editar
                    </Button>
                    <Button
                        variant='outline'
                        color='red'
                        icon='HeroTrash'
                        size='sm'
                        onClick={() => onDelete(plan)}>
                        Eliminar
                    </Button>
                </CardFooterChild>
            </CardFooter>
        </Card>
    );
};

const PriceRow = ({ label, value }: { label: string; value: string }) => (
    <div className='flex items-center justify-between gap-3 rounded-xl bg-white/80 px-3 py-2 text-sm dark:bg-zinc-900/60'>
        <span className='text-zinc-500 dark:text-zinc-400'>{label}</span>
        <span className='font-medium text-zinc-900 dark:text-zinc-100'>{value}</span>
    </div>
);

const MetricBlock = ({ label, value }: { label: string; value: string }) => (
    <div className='space-y-1'>
        <div className='text-[11px] font-semibold uppercase tracking-wide text-zinc-500'>
            {label}
        </div>
        <div className='text-sm font-medium text-zinc-800 dark:text-zinc-100'>{value}</div>
    </div>
);

export default PlanCatalogCard;
