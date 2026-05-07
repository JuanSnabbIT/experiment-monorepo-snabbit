import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardFooter, CardFooterChild, CardHeader } from '@/components/ui/Card';
import { IPlanServicio } from '@/interface/contrato.interface';
import { formatCurrency } from '@/utils/currency';
import { useNavigate } from 'react-router-dom';

interface IPlanCardProps {
    plan: IPlanServicio;
    onDelete: (plan: IPlanServicio) => void;
    onEdit: (plan: IPlanServicio) => void;
}

const formatPriceLabel = (
    currency: 'CLP' | 'UF' | 'USD',
    value?: string | number | null,
) => {
    const numeric = Number(value || 0);

    if (numeric <= 0) {
        return '-';
    }

    return formatCurrency(numeric, currency);
};

const getPrimaryPrice = (plan: IPlanServicio) => {
    const amount = Number(plan.precio || 0);
    if (amount <= 0 || !plan.tipo_moneda) return null;
    const currency = plan.tipo_moneda as 'CLP' | 'UF' | 'USD';
    return {
        currency,
        label: formatPriceLabel(currency, amount),
    };
};

const PlanCard = ({ plan }: IPlanCardProps) => {
    const navigate = useNavigate();
    const primaryPrice = getPrimaryPrice(plan);

    return (
        <Card className='h-[560px] border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950'>
            <CardHeader className='border-b border-zinc-200 px-6 py-4 dark:border-zinc-800'>
                <div className='flex items-end justify-between gap-4 w-full'>
                    <div className='min-w-0 flex-1'>
                        <div className='text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400'>
                            Plan de servicio
                        </div>
                        <h3 className='mt-2 text-xl font-semibold text-zinc-900 dark:text-zinc-100'>
                            {plan.nombre}
                        </h3>
                        <p className='mt-1 text-sm text-zinc-600 dark:text-zinc-400'>
                            {plan.servicios.length} servicios incluidos
                        </p>
                    </div>
                    <div className='ml-auto flex-shrink-0 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-right dark:border-zinc-800 dark:bg-zinc-900'>
                        <div className='text-[10px] uppercase tracking-[0.3em] text-zinc-500 dark:text-zinc-400'>
                            Precio
                        </div>
                        <div className='mt-2 text-3xl font-semibold text-zinc-900 dark:text-zinc-100'>
                            {primaryPrice?.label ?? 'Sin precio'}
                        </div>
                        <div className='mt-1 text-sm text-zinc-500 dark:text-zinc-400'>
                            {primaryPrice?.currency ?? 'Sin moneda'}
                        </div>
                    </div>
                </div>
            </CardHeader>

            <CardBody className='flex h-full flex-col gap-4 px-6 py-4 overflow-hidden'>
                <div className='rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900'>
                    <div className='flex items-center justify-between gap-3'>
                        <div>
                            <div className='text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400'>
                                Servicios incluidos
                            </div>
                            <p className='mt-1 text-sm text-zinc-600 dark:text-zinc-300'>
                                Una vista rápida de lo que ofrece este plan.
                            </p>
                        </div>
                        <span className='rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'>
                            {plan.servicios.length} servicios
                        </span>
                    </div>

                    {plan.servicios.length > 0 ? (
                        <div className='mt-4 flex flex-col items-start gap-2 h-56 overflow-y-auto pr-2'>
                            {plan.servicios.map((service) => (
                                <Badge
                                    key={service.id}
                                    color='emerald'
                                    variant='outline'
                                    className='inline-flex max-w-full text-[11px] whitespace-normal'>
                                    {service.nombre}
                                </Badge>
                            ))}
                        </div>
                    ) : (
                        <div className='mt-4 rounded-2xl border border-dashed border-zinc-200 px-4 py-3 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400'>
                            Este plan aun no tiene servicios asociados.
                        </div>
                    )}
                </div>

                <div className='grid gap-3 sm:grid-cols-2'>
                    <div className='rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950'>
                        <div className='text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400'>
                            Visitas presenciales
                        </div>
                        <div className='mt-3 text-lg font-semibold text-zinc-900 dark:text-zinc-100'>
                            {plan.num_visitas_mensuales != null
                                ? `${plan.num_visitas_mensuales} / mes`
                                : 'No aplica'}
                        </div>
                    </div>
                    <div className='rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950'>
                        <div className='text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400'>
                            Conflictos detectados
                        </div>
                        <div className='mt-3 text-lg font-semibold text-zinc-900 dark:text-zinc-100'>
                            {plan.alcance_conflictos?.length || 0}
                        </div>
                    </div>
                </div>

            </CardBody>

            <CardFooter className='border-t border-zinc-200/80 pt-4 dark:border-zinc-800'>
                <CardFooterChild className='w-full justify-between'>
                    <Button
                        variant='solid'
                        color='violet'
                        size='sm'
                        icon='HeroEye'
                        onClick={() => navigate(`/registros/planes-y-servicios/${plan.id}`)}>
                        Ver detalle
                    </Button>
                    <Badge variant='outline' color='blue' className='text-[11px]'>
                        {plan.servicios.length} servicios
                    </Badge>
                </CardFooterChild>
            </CardFooter>
        </Card>
    );
};

export default PlanCard;
