import Icon from '@/components/icon/Icon';
import LoaderDots from '@/components/LoaderDots.common';
import Card, { CardBody } from '@/components/ui/Card';
import { TIcons } from '@/types/icons.type';
import classNames from 'classnames';
import { FC } from 'react';

export type MetricCardColor = 'blue' | 'emerald' | 'amber' | 'rose' | 'purple' | 'zinc' | 'sky';

interface IMetricCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon?: TIcons;
    color?: MetricCardColor;
    loading?: boolean;
    trend?: {
        value: number;
        direction: 'up' | 'down' | 'neutral';
    };
    onClick?: () => void;
    className?: string;
}

const colorClasses: Record<MetricCardColor, { bg: string; text: string; icon: string }> = {
    blue: {
        bg: 'bg-blue-500/10',
        text: 'text-blue-600 dark:text-blue-400',
        icon: 'bg-blue-500',
    },
    emerald: {
        bg: 'bg-emerald-500/10',
        text: 'text-emerald-600 dark:text-emerald-400',
        icon: 'bg-emerald-500',
    },
    amber: {
        bg: 'bg-amber-500/10',
        text: 'text-amber-600 dark:text-amber-400',
        icon: 'bg-amber-500',
    },
    rose: {
        bg: 'bg-rose-500/10',
        text: 'text-rose-600 dark:text-rose-400',
        icon: 'bg-rose-500',
    },
    purple: {
        bg: 'bg-purple-500/10',
        text: 'text-purple-600 dark:text-purple-400',
        icon: 'bg-purple-500',
    },
    zinc: {
        bg: 'bg-zinc-500/10',
        text: 'text-zinc-600 dark:text-zinc-400',
        icon: 'bg-zinc-500',
    },
    sky: {
        bg: 'bg-sky-500/10',
        text: 'text-sky-600 dark:text-sky-400',
        icon: 'bg-sky-500',
    },
};

const MetricCard: FC<IMetricCardProps> = ({
    title,
    value,
    subtitle,
    icon,
    color = 'blue',
    loading = false,
    trend,
    onClick,
    className,
}) => {
    const colors = colorClasses[color];

    return (
        <Card
            className={classNames(
                'transition-all duration-200',
                onClick && 'cursor-pointer hover:shadow-lg',
                className,
            )}
            onClick={onClick}>
            <CardBody className='flex items-center gap-4'>
                {icon && (
                    <div
                        className={classNames(
                            'flex h-12 w-12 items-center justify-center rounded-lg',
                            colors.icon,
                        )}>
                        <Icon icon={icon} className='text-2xl text-white' />
                    </div>
                )}
                <div className='flex-1'>
                    <p className='text-sm font-medium text-zinc-500 dark:text-zinc-400'>{title}</p>
                    {loading ? (
                        <LoaderDots />
                    ) : (
                        <div className='flex items-baseline gap-2'>
                            <p className={classNames('text-2xl font-bold', colors.text)}>
                                {value}
                            </p>
                            {trend && (
                                <span
                                    className={classNames(
                                        'flex items-center text-xs font-medium',
                                        trend.direction === 'up' && 'text-emerald-500',
                                        trend.direction === 'down' && 'text-rose-500',
                                        trend.direction === 'neutral' && 'text-zinc-400',
                                    )}>
                                    {trend.direction === 'up' && (
                                        <Icon icon='HeroArrowTrendingUp' className='mr-1' />
                                    )}
                                    {trend.direction === 'down' && (
                                        <Icon icon='HeroArrowTrendingDown' className='mr-1' />
                                    )}
                                    {trend.value > 0 ? '+' : ''}
                                    {trend.value}%
                                </span>
                            )}
                        </div>
                    )}
                    {subtitle && (
                        <p className='mt-1 text-xs text-zinc-400 dark:text-zinc-500'>{subtitle}</p>
                    )}
                </div>
            </CardBody>
        </Card>
    );
};

export default MetricCard;
