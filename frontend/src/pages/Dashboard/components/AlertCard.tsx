import Icon from '@/components/icon/Icon';
import LoaderDots from '@/components/LoaderDots.common';
import Badge from '@/components/ui/Badge';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import { TIcons } from '@/types/icons.type';
import classNames from 'classnames';
import { FC } from 'react';

export type AlertSeverity = 'info' | 'warning' | 'danger' | 'success';

interface IAlertItem {
    id: string | number;
    title: string;
    subtitle?: string;
    link?: string;
    onClick?: () => void;
}

interface IAlertCardProps {
    title: string;
    items: IAlertItem[];
    icon?: TIcons;
    severity?: AlertSeverity;
    loading?: boolean;
    emptyMessage?: string;
    maxItems?: number;
    showCount?: boolean;
    className?: string;
}

const severityConfig: Record<
    AlertSeverity,
    { bg: string; border: string; icon: string; badge: string }
> = {
    info: {
        bg: 'bg-blue-500/5',
        border: 'border-l-4 border-l-blue-500',
        icon: 'text-blue-500',
        badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    },
    warning: {
        bg: 'bg-amber-500/5',
        border: 'border-l-4 border-l-amber-500',
        icon: 'text-amber-500',
        badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    },
    danger: {
        bg: 'bg-rose-500/5',
        border: 'border-l-4 border-l-rose-500',
        icon: 'text-rose-500',
        badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
    },
    success: {
        bg: 'bg-emerald-500/5',
        border: 'border-l-4 border-l-emerald-500',
        icon: 'text-emerald-500',
        badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    },
};

const AlertCard: FC<IAlertCardProps> = ({
    title,
    items,
    icon = 'HeroExclamationCircle',
    severity = 'info',
    loading = false,
    emptyMessage = 'Sin alertas',
    maxItems = 5,
    showCount = true,
    className,
}) => {
    const config = severityConfig[severity];
    const displayItems = items.slice(0, maxItems);
    const hasMore = items.length > maxItems;

    return (
        <Card className={classNames(config.border, className)}>
            <CardHeader>
                <CardHeaderChild>
                    <Icon icon={icon} className={classNames('mr-2 text-xl', config.icon)} />
                    <span className='font-semibold'>{title}</span>
                </CardHeaderChild>
                {showCount && items.length > 0 && (
                    <CardHeaderChild>
                        <Badge className={config.badge}>{items.length}</Badge>
                    </CardHeaderChild>
                )}
            </CardHeader>
            <CardBody className='pt-0'>
                {loading ? (
                    <div className='flex justify-center py-4'>
                        <LoaderDots />
                    </div>
                ) : items.length === 0 ? (
                    <p className='py-2 text-center text-sm text-zinc-400'>{emptyMessage}</p>
                ) : (
                    <div className='space-y-2'>
                        {displayItems.map((item) => (
                            <div
                                key={item.id}
                                className={classNames(
                                    'rounded-lg p-2 transition-colors',
                                    config.bg,
                                    item.onClick && 'cursor-pointer hover:opacity-80',
                                )}
                                onClick={item.onClick}>
                                <p className='text-sm font-medium'>{item.title}</p>
                                {item.subtitle && (
                                    <p className='text-xs text-zinc-500'>{item.subtitle}</p>
                                )}
                            </div>
                        ))}
                        {hasMore && (
                            <p className='pt-2 text-center text-xs text-zinc-400'>
                                +{items.length - maxItems} más
                            </p>
                        )}
                    </div>
                )}
            </CardBody>
        </Card>
    );
};

export default AlertCard;
