import { fetchMetricasCotizacionesThunk, useAppDispatch, useAppSelector } from '@/store';
import { FC, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AlertCard from '../components/AlertCard';
import DistributionChart from '../components/DistributionChart';
import MetricCard from '../components/MetricCard';
import TrendChart from '../components/TrendChart';

interface IWidgetCotizacionesProps {
    className?: string;
}

// Mapeo de estados
const estadoLabels: Record<string, string> = {
    pendiente: 'Pendiente',
    enviada: 'Enviada',
    aceptada: 'Aceptada',
    rechazada: 'Rechazada',
    expirada: 'Expirada',
};

// Mapeo de monedas
const monedaLabels: Record<string, string> = {
    USD: 'USD',
    CLP: 'CLP',
    UF: 'UF',
};

const WidgetCotizaciones: FC<IWidgetCotizacionesProps> = ({ className }) => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { metricas, metricsLoading, filtroFechas } = useAppSelector((state) => state.dashboard);
    const loading = metricsLoading.cotizaciones;
    const data = metricas.cotizaciones;

    useEffect(() => {
        dispatch(fetchMetricasCotizacionesThunk(undefined));
    }, [dispatch, filtroFechas]);

    const formatMoney = (value: number, currency = 'CLP'): string => {
        return new Intl.NumberFormat('es-CL', {
            style: 'currency',
            currency: currency,
            maximumFractionDigits: 0,
        }).format(value);
    };

    // Items de alerta
    const alertItems: Array<{
        id: string;
        title: string;
        subtitle: string;
        onClick?: () => void;
    }> = [];

    if (data && data.resumen.proximas_expirar > 0) {
        alertItems.push({
            id: 'proximas',
            title: `${data.resumen.proximas_expirar} próximas a expirar`,
            subtitle: 'En los próximos 7 días',
            onClick: () => navigate('/cotizaciones?estado=enviada'),
        });
    }

    if (data && data.resumen.expiradas_sin_respuesta > 0) {
        alertItems.push({
            id: 'expiradas',
            title: `${data.resumen.expiradas_sin_respuesta} expiradas sin respuesta`,
            subtitle: 'Requieren seguimiento',
            onClick: () => navigate('/cotizaciones?estado=enviada'),
        });
    }

    if (data && data.resumen.con_error_tipo_cambio > 0) {
        alertItems.push({
            id: 'error_tc',
            title: `${data.resumen.con_error_tipo_cambio} con error de tipo de cambio`,
            subtitle: 'Revisar valores',
        });
    }

    return (
        <div className={className}>
            <h3 className='mb-4 flex items-center gap-2 text-lg font-semibold'>
                <span className='h-3 w-3 rounded-full bg-emerald-500'></span>
                Cotizaciones
            </h3>

            {/* Métricas principales */}
            <div className='mb-4 grid grid-cols-2 gap-3 md:grid-cols-4'>
                <MetricCard
                    title='Total Período'
                    value={data?.resumen.total_periodo ?? 0}
                    icon='HeroDocumentText'
                    color='emerald'
                    loading={loading}
                    onClick={() => navigate('/cotizaciones')}
                />
                <MetricCard
                    title='Aceptadas'
                    value={data?.por_estado?.aceptada ?? 0}
                    icon='HeroCheckCircle'
                    color='blue'
                    loading={loading}
                />
                <MetricCard
                    title='Tasa Conversión'
                    value={data ? `${data.resumen.tasa_conversion.toFixed(1)}%` : '0%'}
                    icon='HeroArrowTrendingUp'
                    color='purple'
                    loading={loading}
                    subtitle='Aceptadas vs Enviadas'
                />
                <MetricCard
                    title='Costo Items'
                    value={data ? formatMoney(data.resumen.costo_total_items) : '$0'}
                    icon='HeroBanknotes'
                    color='amber'
                    loading={loading}
                    subtitle='En el período'
                />
            </div>

            {/* Alertas y gráficos */}
            <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
                {/* Alertas */}
                {alertItems.length > 0 && (
                    <AlertCard
                        title='Atención Requerida'
                        items={alertItems}
                        icon='HeroClock'
                        severity='warning'
                        loading={loading}
                    />
                )}

                {/* Distribución por estado */}
                <DistributionChart
                    title='Por Estado'
                    data={data?.por_estado ?? {}}
                    labels={estadoLabels}
                    loading={loading}
                />

                {/* Distribución por moneda */}
                <DistributionChart
                    title='Por Moneda'
                    data={data?.por_moneda ?? {}}
                    labels={monedaLabels}
                    loading={loading}
                    colors={['#10b981', '#3b82f6', '#8b5cf6']}
                />
            </div>

            {/* Tendencia */}
            {data?.tendencia_30_dias && data.tendencia_30_dias.length > 0 && (
                <div className='mt-4'>
                    <TrendChart
                        title='Tendencia (últimos 30 días)'
                        data={data.tendencia_30_dias}
                        loading={loading}
                        yAxisLabel='Cotizaciones'
                    />
                </div>
            )}
        </div>
    );
};

export default WidgetCotizaciones;
