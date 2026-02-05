import Chart from '@/components/Chart';
import LoaderDots from '@/components/LoaderDots.common';
import Badge from '@/components/ui/Badge';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import classNames from 'classnames';
import { FC } from 'react';
import useDarkMode from '@/hooks/useDarkMode';

interface ITrendDataPoint {
    fecha: string;
    total: number;
}

interface ITrendChartProps {
    title: string;
    data: ITrendDataPoint[];
    loading?: boolean;
    height?: number;
    color?: string;
    showArea?: boolean;
    yAxisLabel?: string;
    className?: string;
}

const TrendChart: FC<ITrendChartProps> = ({
    title,
    data,
    loading = false,
    height = 250,
    color = '#3b82f6',
    showArea = true,
    yAxisLabel,
    className,
}) => {
    const { isDarkTheme } = useDarkMode();
    const categories = data.map((d) => {
        const date = new Date(d.fecha);
        return date.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
    });
    const seriesData = data.map((d) => d.total);
    const total = seriesData.reduce((acc, val) => acc + val, 0);
    const avg = seriesData.length > 0 ? Math.round(total / seriesData.length) : 0;

    return (
        <Card className={classNames('h-full', className)}>
            <CardHeader>
                <CardHeaderChild>
                    <Badge className='text-lg'>{title}</Badge>
                </CardHeaderChild>
                <CardHeaderChild>
                    <span className='text-xs text-zinc-500 dark:text-zinc-400'>
                        Total: {total} | Promedio: {avg}/día
                    </span>
                </CardHeaderChild>
            </CardHeader>
            <CardBody>
                {loading ? (
                    <div className='flex h-full items-center justify-center'>
                        <LoaderDots />
                    </div>
                ) : data.length === 0 ? (
                    <p className='py-8 text-center text-zinc-400'>Sin datos de tendencia</p>
                ) : (
                    <Chart
                        type={showArea ? 'area' : 'line'}
                        height={height}
                        series={[
                            {
                                name: yAxisLabel || 'Cantidad',
                                data: seriesData,
                            },
                        ]}
                        options={{
                            colors: [color],
                            fill: {
                                type: showArea ? 'gradient' : 'solid',
                                gradient: {
                                    shadeIntensity: 1,
                                    opacityFrom: 0.4,
                                    opacityTo: 0.1,
                                    stops: [0, 100],
                                },
                            },
                            stroke: {
                                curve: 'smooth',
                                width: 2,
                            },
                            xaxis: {
                                categories,
                                labels: {
                                    rotate: -45,
                                    rotateAlways: data.length > 15,
                                    style: {
                                        fontSize: '10px',
                                    },
                                },
                            },
                            yaxis: {
                                title: {
                                    text: yAxisLabel,
                                },
                                min: 0,
                            },
                            tooltip: {
                                theme: isDarkTheme ? 'dark' : 'light',
                                x: {
                                    format: 'dd MMM',
                                },
                            },
                            markers: {
                                size: 3,
                                hover: {
                                    size: 5,
                                },
                            },
                        }}
                    />
                )}
            </CardBody>
        </Card>
    );
};

export default TrendChart;
