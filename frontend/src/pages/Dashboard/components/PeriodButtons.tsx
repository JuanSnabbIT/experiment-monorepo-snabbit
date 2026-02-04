import Button from '@/components/ui/Button';
import classNames from 'classnames';
import { FC } from 'react';

export type PeriodType = 'day' | 'week' | 'month' | 'custom';

interface IPeriodButtonsProps {
    value: PeriodType;
    onChange: (period: PeriodType) => void;
    showCustom?: boolean;
    className?: string;
}

const periodLabels: Record<PeriodType, string> = {
    day: 'Hoy',
    week: 'Semana',
    month: 'Mes',
    custom: 'Personalizado',
};

/**
 * PeriodButtons - Selector de período rápido (Día/Semana/Mes)
 * Inspirado en el patrón de filtros del template fyr-vite
 */
const PeriodButtons: FC<IPeriodButtonsProps> = ({
    value,
    onChange,
    showCustom = true,
    className,
}) => {
    const periods: PeriodType[] = showCustom
        ? ['day', 'week', 'month', 'custom']
        : ['day', 'week', 'month'];

    return (
        <div className={classNames('flex items-center gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800', className)}>
            {periods.map((period) => (
                <Button
                    key={period}
                    size='sm'
                    variant={value === period ? 'solid' : 'default'}
                    color={value === period ? 'blue' : 'zinc'}
                    className={classNames(
                        'px-3 py-1.5 text-xs font-medium transition-all',
                        value !== period && 'bg-transparent hover:bg-zinc-200 dark:hover:bg-zinc-700',
                    )}
                    onClick={() => onChange(period)}>
                    {periodLabels[period]}
                </Button>
            ))}
        </div>
    );
};

export default PeriodButtons;
