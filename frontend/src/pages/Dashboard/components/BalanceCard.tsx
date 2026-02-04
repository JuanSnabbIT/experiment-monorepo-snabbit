import Icon from '@/components/icon/Icon';
import LoaderDots from '@/components/LoaderDots.common';
import Card, { CardBody } from '@/components/ui/Card';
import Tooltip from '@/components/ui/Tooltip';
import { TIcons } from '@/types/icons.type';
import classNames from 'classnames';
import { FC, ReactNode } from 'react';

export type BalanceCardColor = 'blue' | 'emerald' | 'amber' | 'rose' | 'purple' | 'zinc' | 'sky';
export type BalanceStatus = 'positive' | 'negative' | 'fixed';

interface IBalanceCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: TIcons;
    color?: BalanceCardColor;
    loading?: boolean;
    // Comparación con período anterior
    comparison?: {
        value: number; // Porcentaje de cambio
        status: BalanceStatus;
        label?: string; // ej: "vs mes anterior"
    };
    tooltip?: string;
    onClick?: () => void;
    className?: string;
    children?: ReactNode;
}

const colorClasses: Record<BalanceCardColor, { iconBg: string; iconText: string }> = {
    blue: {
        iconBg: 'bg-blue-500',
        iconText: 'text-white',
    },
    emerald: {
        iconBg: 'bg-emerald-500',
        iconText: 'text-white',
    },
    amber: {
        iconBg: 'bg-amber-500',
        iconText: 'text-white',
    },
    rose: {
        iconBg: 'bg-rose-500',
        iconText: 'text-white',
    },
    purple: {
        iconBg: 'bg-purple-500',
        iconText: 'text-white',
    },
    zinc: {
        iconBg: 'bg-zinc-500',
        iconText: 'text-white',
    },
    sky: {
        iconBg: 'bg-sky-500',
        iconText: 'text-white',
    },
};

const statusColors: Record<BalanceStatus, { text: string; icon: TIcons }> = {
    positive: {
        text: 'text-emerald-500',
        icon: 'HeroArrowTrendingUp',
    },
    negative: {
        text: 'text-rose-500',
        icon: 'HeroArrowTrendingDown',
    },
    fixed: {
        text: 'text-blue-500',
        icon: 'HeroArrowsRightLeft',
    },
};

/**
 * BalanceCard - Tarjeta de métrica con diseño inspirado en template fyr-vite
 * Muestra un icono grande en círculo, valor principal y comparación con período anterior
 */
const BalanceCard: FC<IBalanceCardProps> = ({
    title,
    value,
    subtitle,
    icon,
    color = 'blue',
    loading = false,
    comparison,
    tooltip,
    onClick,
    className,
    children,
}) => {
    const colors = colorClasses[color];

    const cardContent = (
        <Card
            className={classNames(
                'h-full transition-all duration-200',
                onClick && 'cursor-pointer hover:shadow-lg hover:ring-2 hover:ring-blue-500/20',
                className,
            )}
            onClick={onClick}>
            <CardBody className='flex items-start gap-4 p-5'>
                {/* Icono circular grande */}
                <div
                    className={classNames(
                        'flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full',
                        colors.iconBg,
                    )}>
                    <Icon icon={icon} className={classNames('text-3xl', colors.iconText)} />
                </div>

                {/* Contenido */}
                <div className='flex flex-1 flex-col'>
                    <p className='text-sm font-medium text-zinc-500 dark:text-zinc-400'>{title}</p>

                    {loading ? (
                        <div className='mt-2'>
                            <LoaderDots />
                        </div>
                    ) : (
                        <>
                            {/* Valor principal */}
                            <p className='mt-1 text-3xl font-bold text-zinc-900 dark:text-white'>
                                {value}
                            </p>

                            {/* Comparación con período anterior */}
                            {comparison && (
                                <div
                                    className={classNames(
                                        'mt-2 flex items-center gap-2 rounded-lg bg-zinc-100 px-2 py-1 dark:bg-zinc-800',
                                    )}>
                                    <Icon
                                        icon={statusColors[comparison.status].icon}
                                        className={classNames(
                                            'text-lg',
                                            statusColors[comparison.status].text,
                                        )}
                                    />
                                    <span
                                        className={classNames(
                                            'text-sm font-medium',
                                            statusColors[comparison.status].text,
                                        )}>
                                        {comparison.value > 0 ? '+' : ''}
                                        {comparison.value.toFixed(1)}%
                                    </span>
                                    {comparison.label && (
                                        <span className='text-xs text-zinc-500'>
                                            {comparison.label}
                                        </span>
                                    )}
                                </div>
                            )}

                            {/* Subtítulo */}
                            {subtitle && !comparison && (
                                <p className='mt-1 text-xs text-zinc-400 dark:text-zinc-500'>
                                    {subtitle}
                                </p>
                            )}

                            {/* Contenido adicional */}
                            {children}
                        </>
                    )}
                </div>
            </CardBody>
        </Card>
    );

    if (tooltip) {
        return <Tooltip text={tooltip}>{cardContent}</Tooltip>;
    }

    return cardContent;
};

export default BalanceCard;
