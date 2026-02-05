import React, { FC, memo, useLayoutEffect, useRef, useState } from 'react';
import ReactApexChart, { Props } from 'react-apexcharts';
import colors from 'tailwindcss/colors';
import _ from 'lodash';
import useDarkMode from '../hooks/useDarkMode';

export interface IChartProps extends Props {
    width?: string | number;
    height?: string | number;
}

const Chart: FC<IChartProps> = (props) => {
    const { series, options, type, width = '100%', height = 'auto' } = props;
    const { isDarkTheme } = useDarkMode();
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

    useLayoutEffect(() => {
        const element = containerRef.current;
        if (!element || typeof ResizeObserver === 'undefined') return;

        const observer = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (!entry) return;
            const { width: nextWidth, height: nextHeight } = entry.contentRect;
            setContainerSize({
                width: Math.round(nextWidth),
                height: Math.round(nextHeight),
            });
        });

        observer.observe(element);
        return () => observer.disconnect();
    }, []);

    const numericWidth =
        typeof width === 'number' && Number.isFinite(width) ? width : containerSize.width;
    const numericHeight =
        typeof height === 'number' && Number.isFinite(height)
            ? height
            : containerSize.height > 0
              ? containerSize.height
              : 280;
    const widthReady = numericWidth > 0;

    const gridColor = isDarkTheme ? `${colors.zinc['700']}55` : `${colors.zinc['300']}55`;
    const axisColor = isDarkTheme ? `${colors.zinc['600']}80` : `${colors.zinc['400']}80`;
    const labelColor = isDarkTheme ? colors.zinc['300'] : colors.zinc['600'];

    const defaultOptions: Props['options'] = {
        chart: {
            toolbar: {
                show: false,
            },
        },
        colors: [
            colors.blue['500'],
            colors.emerald['500'],
            colors.amber['500'],
            colors.rose['500'],
            colors.purple['500'],
        ],
        dataLabels: {
            enabled: false,
        },
        grid: {
            show: true,
            borderColor: gridColor,
            strokeDashArray: 0,
            xaxis: {
                lines: {
                    show: false,
                },
            },
            yaxis: {
                lines: {
                    show: true,
                },
            },

            padding: {
                top: 0,
                right: 10,
                bottom: 0,
                left: 10,
            },
        },
        legend: {
            labels: {
                colors: labelColor,
            },
        },
        plotOptions: {
            bar: {
                borderRadius: 4,
            },
            candlestick: {
                colors: {
                    upward: `${colors.green['500']}`,
                    downward: `${colors.rose['500']}`,
                },
            },
            boxPlot: {
                colors: {
                    upper: `${colors.green['500']}`,
                    lower: `${colors.rose['500']}`,
                },
            },
        },
        stroke: {
            // show: true,
            // width: 2,
            // colors: ['transparent'],
        },

        tooltip: {
            theme: isDarkTheme ? 'dark' : 'light',
        },

        xaxis: {
            axisBorder: {
                show: true,
                color: axisColor,
            },
            axisTicks: {
                show: false,
            },
            labels: {
                style: {
                    colors: labelColor,
                },
            },
        },
        yaxis: {
            labels: {
                style: {
                    colors: labelColor,
                },
            },
            title: {
                style: {
                    color: labelColor,
                },
            },
        },
    };

    return (
        <div ref={containerRef} className='h-full w-full'>
            {widthReady && (
                <ReactApexChart
                    options={_.merge(defaultOptions, options)}
                    series={series}
                    type={type}
                    height={numericHeight}
                    width={numericWidth}
                />
            )}
        </div>
    );
};
Chart.displayName = 'Chart';

export default memo(Chart);
