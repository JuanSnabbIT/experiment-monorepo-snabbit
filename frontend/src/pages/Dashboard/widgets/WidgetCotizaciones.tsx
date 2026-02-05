import Badge from '@/components/ui/Badge';
import { fetchMetricasCotizacionesThunk, useAppDispatch, useAppSelector } from '@/store';
import { FC, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DistributionChart from '../components/DistributionChart';
import MetricCard from '../components/MetricCard';

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

const WidgetCotizaciones: FC<IWidgetCotizacionesProps> = ({ className }) => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { metricas, metricsLoading, filtroFechas } = useAppSelector((state) => state.dashboard);
    const loading = metricsLoading.cotizaciones;
    const data = metricas.cotizaciones;

    useEffect(() => {
        dispatch(fetchMetricasCotizacionesThunk(undefined));
    }, [dispatch, filtroFechas]);

    // Calcular alertas
    const proximasExpirar = data?.resumen.proximas_expirar ?? 0;
    const expiradasSinRespuesta = data?.resumen.expiradas_sin_respuesta ?? 0;
    const tieneAlertas = proximasExpirar > 0 || expiradasSinRespuesta > 0;

    return (
        <div className={className}>
            <div className='mb-4 flex items-center justify-between'>
                <h3 className='flex items-center gap-2 text-lg font-semibold'>
                    <span className='h-3 w-3 rounded-full bg-emerald-500'></span>
                    Cotizaciones
                </h3>
                {tieneAlertas && (
                    <Badge color='amber' variant='solid' className='text-xs'>
                        {proximasExpirar > 0 && `${proximasExpirar} por expirar`}
                        {proximasExpirar > 0 && expiradasSinRespuesta > 0 && ' • '}
                        {expiradasSinRespuesta > 0 && `${expiradasSinRespuesta} expiradas`}
                    </Badge>
                )}
            </div>

            {/* Layout simplificado: 2 métricas + 1 gráfico */}
            <div className='grid gap-4 lg:grid-cols-3'>
                {/* Métricas compactas */}
                <div className='flex flex-col gap-3 lg:col-span-1'>
                    <MetricCard
                        title='Aceptadas'
                        value={data?.por_estado?.aceptada ?? 0}
                        icon='HeroCheckCircle'
                        color='emerald'
                        loading={loading}
                        onClick={() => navigate('/cotizaciones?estado=aceptada')}
                    />
                    <MetricCard
                        title='Tasa Conversión'
                        value={data ? `${data.resumen.tasa_conversion.toFixed(1)}%` : '0%'}
                        icon='HeroArrowTrendingUp'
                        color='purple'
                        loading={loading}
                    />
                </div>

                {/* Distribución por estado */}
                <div className='lg:col-span-2'>
                    <DistributionChart
                        title='Por Estado'
                        data={data?.por_estado ?? {}}
                        labels={estadoLabels}
                        loading={loading}
                    />
                </div>
            </div>
        </div>
    );
};

export default WidgetCotizaciones;
