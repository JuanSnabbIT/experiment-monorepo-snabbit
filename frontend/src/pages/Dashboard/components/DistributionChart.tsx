import Chart from '@/components/Chart';
import LoaderDots from '@/components/LoaderDots.common';
import Badge from '@/components/ui/Badge';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import classNames from 'classnames';
import { FC } from 'react';
import useDarkMode from '@/hooks/useDarkMode';

interface IDistributionChartProps {
    title: string;
    data: Record<string, number>;
    loading?: boolean;
    type?: 'donut' | 'pie';
    height?: number;
    labels?: Record<string, string>; // Mapeo de keys a labels legibles
    colors?: string[];
    showLegend?: boolean;
    className?: string;
}

const defaultColors = [
    '#3b82f6', // blue-500
    '#10b981', // emerald-500
    '#f59e0b', // amber-500
    '#ef4444', // rose-500
    '#8b5cf6', // purple-500
    '#06b6d4', // cyan-500
    '#ec4899', // pink-500
    '#84cc16', // lime-500
];

const DistributionChart: FC<IDistributionChartProps> = ({
    title,
    data,
    loading = false,
    type = 'donut',
    height = 280,
    labels = {},
    colors = defaultColors,
    showLegend = true,
    className,
}) => {
    const { isDarkTheme } = useDarkMode();
    const entries = Object.entries(data).filter(([, value]) => value > 0);
    const chartLabels = entries.map(([key]) => labels[key] || key);
    const chartSeries = entries.map(([, value]) => value);
    const total = chartSeries.reduce((acc, val) => acc + val, 0);

    return (
        <Card className={classNames('h-full', className)}>
            <CardHeader>
                <CardHeaderChild>
                    <Badge className='text-lg'>{title}</Badge>
                </CardHeaderChild>
                {total > 0 && (
                    <CardHeaderChild>
                        <span className='text-sm text-zinc-500 dark:text-zinc-400'>
                            Total: {total}
                        </span>
                    </CardHeaderChild>
                )}
            </CardHeader>
            <CardBody className='flex items-center justify-center'>
                {loading ? (
                    <LoaderDots />
                ) : total === 0 ? (
                    <p className='text-zinc-400'>Sin datos disponibles</p>
                ) : (
                    <Chart
                        type={type}
                        series={chartSeries}
                        height={height}
                        options={{
                            labels: chartLabels,
                            colors: colors.slice(0, entries.length),
                            legend: {
                                show: showLegend,
                                position: 'bottom',
                                labels: {
                                    colors: isDarkTheme ? '#d4d4d8' : '#71717a',
                                },
                            },
                            plotOptions: {
                                pie: {
                                    donut: {
                                        size: type === 'donut' ? '65%' : '0%',
                                        labels: {
                                            show: type === 'donut',
                                            total: {
                                                show: true,
                                                label: 'Total',
                                                color: '#71717a',
                                            },
                                        },
                                    },
                                },
                            },
                            dataLabels: {
                                enabled: true,
                                formatter: (val: number) => `${val.toFixed(0)}%`,
                            },
                            tooltip: {
                                theme: isDarkTheme ? 'dark' : 'light',
                                y: {
                                    formatter: (val: number) => `${val} registros`,
                                },
                            },
                        }}
                    />
                )}
            </CardBody>
        </Card>
    );
};

export default DistributionChart;
