import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader } from '@/components/ui/Card';
import { listaMovimientosStockThunk, useAppDispatch, useAppSelector } from '@/store';
import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { IChartOptions } from '@/interface/chart.interface';
import Chart from '@/components/Chart';
import { IMovimientoStock } from '@/interface/bodega.interface';

/** Punto que acepta el movimiento original */
type IDataPoint = {
    x: number;
    y: number;
    meta: IMovimientoStock; // ⬅️ nuevo
};

const COLOR_TIPO: Record<IMovimientoStock['tipo_movimiento'], string> = {
    DEVOLUCION: '#7c3aed', // violet
    ENTRADA: '#059669', // emerald
    SALIDA: '#d97706', // ambar
    AJUSTE: '#52525b', // zinc
    INICIAL: '#0284c7', // sky
};

function GraficoMovimientosStockEnItem({
    setMovSeleccionado,
    setActiveComponent,
}: {
    setMovSeleccionado: Dispatch<SetStateAction<IMovimientoStock | undefined>>;
    setActiveComponent: Dispatch<SetStateAction<string>>;
}) {
    const dispatch = useAppDispatch();
    const { detalleItemEmpresa } = useAppSelector((state) => state.item);
    const { listaMovimientosStock } = useAppSelector((state) => state.bodega);
    const [datosGrafico, setDatosGrafico] = useState<IChartOptions | undefined>();

    useEffect(() => {
        if (detalleItemEmpresa) {
            dispatch(
                listaMovimientosStockThunk({
                    id_empresa: detalleItemEmpresa.empresa,
                    id_item: detalleItemEmpresa.id,
                }),
            );
        }
    }, [detalleItemEmpresa]);

    // useEffect(() => {
    //     if (!listaMovimientosStock.length) return

    //     /** 1. Agrupar por stock_item */
    //     const agrupados = listaMovimientosStock.reduce<Record<number, { x: number; y: number }[]>>((acc, mov) => {
    //         const key = mov.stock_item
    //         const punto = {
    //             x: new Date(mov.fecha_creacion).getTime(), // eje X
    //             y: mov.cantidad,                           // eje Y
    //         }
    //         acc[key] = acc[key] ? [...acc[key], punto] : [punto]
    //         return acc
    //     }, {})

    //     /** 2. Generar series y ordenarlas por fecha */
    //     const series: IChartOptions['series'] = Object.entries(agrupados).map(
    //         ([stockItem, data]) => ({
    //             name: `Stock #${stockItem}`,
    //             type: 'line',
    //             data: data.sort((a, b) => a.x - b.x),
    //         }),
    //     )

    //     /** 3. Configurar opciones */
    //     const opciones: IChartOptions = {
    //         options: {
    //             chart: { type: 'line', zoom: { enabled: false } },
    //             xaxis: { type: 'datetime', title: { text: 'Fecha' }, tooltip: { enabled: false} },
    //             yaxis: { title: { text: 'Cantidad' } },
    //             tooltip: { x: { format: 'dd/MM/yy HH:mm:ss' }},
    //             dataLabels: { enabled: true },
    //             stroke: { curve: 'smooth' },
    //         },
    //         series,
    //     }
    //     setDatosGrafico(opciones)
    // }, [listaMovimientosStock])

    /* 2. Preparar gráfico al recibir movimientos */
    useEffect(() => {
        if (!listaMovimientosStock.length) return;

        /* Agrupar por stock_item */
        const agrupados = listaMovimientosStock.reduce<Record<number, IDataPoint[]>>((acc, mov) => {
            const key = mov.stock_item;
            const saldo = mov.saldo_acumulado ?? mov.cantidad;
            const punto: IDataPoint = {
                x: new Date(mov.fecha_creacion).getTime(),
                y: saldo,
                meta: mov, // ⬅️ guardar el movimiento completo
            };
            acc[key] = acc[key] ? [...acc[key], punto] : [punto];
            return acc;
        }, {});

        /* Series ordenadas */
        const series: IChartOptions['series'] = Object.entries(agrupados).map(
            ([stockItem, data]) => ({
                name: `Stock #${stockItem}`,

                type: 'line',
                data: data.sort((a, b) => a.x - b.x),
            }),
        );

        /**
         * Crea un array de funciones (una por serie) que ApexCharts
         * invocará para cada data-label de esa serie.
         */
        const getLabelColorFns = (series: IChartOptions['series']) =>
            // @ts-ignore
            series.map((_serie, serieIdx) => (opts: any) => {
                const punto = opts.w.config.series[serieIdx].data[
                    opts.dataPointIndex
                ] as IDataPoint;
                return COLOR_TIPO[punto.meta.tipo_movimiento] ?? '#cbd5e1'; // gris por defecto
            });

        /* Tooltip HTML */
        const opciones: IChartOptions = {
            options: {
                chart: {
                    type: 'line',
                    toolbar: { show: true },
                    events: {
                        /* clic en marcador o data-label */
                        dataPointSelection: (
                            _event,
                            _chartContext,
                            { seriesIndex, dataPointIndex, w }, // ← usa “w”
                        ) => {
                            // Si hacen clic fuera de un punto, ApexCharts devuelve -1
                            if (seriesIndex < 0 || dataPointIndex < 0) return;

                            // Aquí sí existe la serie
                            const punto = w.config.series[seriesIndex].data[
                                dataPointIndex
                            ] as IDataPoint;
                            setMovSeleccionado(punto.meta);
                            setActiveComponent('Movimientos del Stock');
                        },
                        // —o bien—
                        // markerClick: (_e, _ctx, { seriesIndex, dataPointIndex, config }) => { … }
                    },
                },
                xaxis: { type: 'datetime', title: { text: 'Fecha' }, tooltip: { enabled: false } },
                yaxis: { title: { text: 'Cantidad en stock' } },
                markers: { size: 8 },
                stroke: { curve: 'smooth' },
                dataLabels: {
                    enabled: true,
                    style: {
                        /** un array de funciones, una por serie */
                        colors: getLabelColorFns(series),
                    },
                },
                tooltip: {
                    shared: false,
                    intersect: true, // o followCursor:true
                    custom: ({ seriesIndex, dataPointIndex, w }) => {
                        const punto = w.config.series[seriesIndex].data[
                            dataPointIndex
                        ] as IDataPoint;

                        const {
                            id,
                            tipo_movimiento,
                            descripcion,
                            cantidad,
                            fecha_creacion,
                            nombre_usuario,
                            stock_item,
                        } = punto.meta;
                        const saldo = punto.meta.saldo_acumulado ?? cantidad;

                        /*  ⬇️ string HTML puro: usa class, no className  */
                        return `
                            <div class="p-3 rounded-lg shadow-lg bg-black text-sm">
                                <div class="font-semibold text-indigo-400">Stock #${stock_item}</div>
                                <div><span class="font-medium">Fecha:</span> ${new Date(fecha_creacion).toLocaleString()}</div>
                                <div><span class="font-medium">Cantidad en stock:</span> ${saldo}</div>
                                <div><span class="font-medium">Movimiento:</span> ${cantidad}</div>
                                <div><span class="font-medium">Tipo:</span> ${tipo_movimiento}</div>
                                <div><span class="font-medium">Descripción:</span> ${descripcion ?? '-'}</div>
                                <div class="text-xs text-gray-400">Movimiento ID ${id}</div>
                                <div class="text-xs text-gray-400">Usuario ${nombre_usuario}</div>
                            </div>`;
                    },
                },
            },
            series,
        };

        setDatosGrafico(opciones);
    }, [listaMovimientosStock]);

    return (
        <Card>
            <CardHeader>
                <Badge className='text-xl'>Historico del Stock</Badge>
            </CardHeader>
            <CardBody>
                {datosGrafico ? (
                    <div className='overflow-auto'>
                        <Chart
                            series={datosGrafico.series}
                            options={datosGrafico.options}
                            type={datosGrafico.options.chart?.type}
                            height={250}
                        />
                    </div>
                ) : (
                    <div>No hay datos</div>
                )}
            </CardBody>
        </Card>
    );
}

export default GraficoMovimientosStockEnItem;
