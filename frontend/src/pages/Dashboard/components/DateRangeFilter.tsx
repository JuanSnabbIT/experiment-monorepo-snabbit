import Icon from '@/components/icon/Icon';
import Button from '@/components/ui/Button';
import { setFiltroFechas, useAppDispatch, useAppSelector } from '@/store';
import classNames from 'classnames';
import { FC, useEffect, useState } from 'react';

interface IDateRangeFilterProps {
    onApply?: () => void;
    className?: string;
}

type QuickRange = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

const quickRanges: { key: QuickRange; label: string }[] = [
    { key: 'today', label: 'Hoy' },
    { key: 'week', label: 'Semana' },
    { key: 'month', label: 'Mes' },
    { key: 'quarter', label: 'Trimestre' },
    { key: 'year', label: 'Año' },
];

const getQuickRangeDates = (range: QuickRange): { fechaInicio: string; fechaFin: string } => {
    const today = new Date();
    const fechaFin = today.toISOString().split('T')[0];
    let fechaInicio: string;

    switch (range) {
        case 'today':
            fechaInicio = fechaFin;
            break;
        case 'week':
            const weekStart = new Date(today);
            weekStart.setDate(today.getDate() - 7);
            fechaInicio = weekStart.toISOString().split('T')[0];
            break;
        case 'month':
            fechaInicio = new Date(today.getFullYear(), today.getMonth(), 1)
                .toISOString()
                .split('T')[0];
            break;
        case 'quarter':
            const quarterStart = new Date(today);
            quarterStart.setMonth(today.getMonth() - 3);
            fechaInicio = quarterStart.toISOString().split('T')[0];
            break;
        case 'year':
            fechaInicio = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0];
            break;
        default:
            fechaInicio = new Date(today.getFullYear(), today.getMonth(), 1)
                .toISOString()
                .split('T')[0];
    }

    return { fechaInicio, fechaFin };
};

const DateRangeFilter: FC<IDateRangeFilterProps> = ({ onApply, className }) => {
    const dispatch = useAppDispatch();
    const { filtroFechas } = useAppSelector((state) => state.dashboard);
    const [activeRange, setActiveRange] = useState<QuickRange>('month');
    const [customStart, setCustomStart] = useState(filtroFechas.fechaInicio);
    const [customEnd, setCustomEnd] = useState(filtroFechas.fechaFin);
    const [showCustom, setShowCustom] = useState(false);

    // Detectar si el rango actual coincide con alguno predefinido
    useEffect(() => {
        const today = new Date().toISOString().split('T')[0];
        if (filtroFechas.fechaFin !== today) {
            setActiveRange('custom');
            setShowCustom(true);
        }
    }, [filtroFechas]);

    const handleQuickRange = (range: QuickRange) => {
        if (range === 'custom') {
            setShowCustom(true);
            setActiveRange('custom');
            return;
        }

        setShowCustom(false);
        setActiveRange(range);
        const dates = getQuickRangeDates(range);
        dispatch(setFiltroFechas(dates));
        setCustomStart(dates.fechaInicio);
        setCustomEnd(dates.fechaFin);
        onApply?.();
    };

    const handleApplyCustom = () => {
        dispatch(setFiltroFechas({ fechaInicio: customStart, fechaFin: customEnd }));
        onApply?.();
    };

    return (
        <div className={classNames('flex flex-wrap items-center gap-2', className)}>
            <div className='flex gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800'>
                {quickRanges.map((range) => (
                    <button
                        key={range.key}
                        onClick={() => handleQuickRange(range.key)}
                        className={classNames(
                            'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                            activeRange === range.key
                                ? 'bg-white text-blue-600 shadow-sm dark:bg-zinc-700 dark:text-blue-400'
                                : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200',
                        )}>
                        {range.label}
                    </button>
                ))}
                <button
                    onClick={() => handleQuickRange('custom')}
                    className={classNames(
                        'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                        activeRange === 'custom'
                            ? 'bg-white text-blue-600 shadow-sm dark:bg-zinc-700 dark:text-blue-400'
                            : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200',
                    )}>
                    <Icon icon='HeroCalendarDays' className='text-base' />
                </button>
            </div>

            {showCustom && (
                <div className='flex items-center gap-2'>
                    <input
                        type='date'
                        value={customStart}
                        onChange={(e) => setCustomStart(e.target.value)}
                        className='rounded-md border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800'
                    />
                    <span className='text-zinc-400'>-</span>
                    <input
                        type='date'
                        value={customEnd}
                        onChange={(e) => setCustomEnd(e.target.value)}
                        className='rounded-md border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800'
                    />
                    <Button
                        size='sm'
                        variant='solid'
                        color='blue'
                        icon='HeroArrowPath'
                        onClick={handleApplyCustom}>
                        Aplicar
                    </Button>
                </div>
            )}
        </div>
    );
};

export default DateRangeFilter;
