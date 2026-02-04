import { fetchMetricasOTThunk, useAppDispatch, useAppSelector } from '@/store';
import { FC, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AlertCard from '../components/AlertCard';
import DistributionChart from '../components/DistributionChart';
import MetricCard from '../components/MetricCard';
import TrendChart from '../components/TrendChart';

interface IWidgetOTProps {
    className?: string;
}

// Mapeo de estados a labels legibles
const estadoLabels: Record<string, string> = {
    pendiente: 'Pendiente',
    en_proceso: 'En Proceso',
    completada: 'Completada',
    cerrada: 'Cerrada',
    facturada: 'Facturada',
    cancelada: 'Cancelada',
};

// Mapeo de prioridades a labels
const prioridadLabels: Record<string, string> = {
    baja: 'Baja',
    media: 'Media',
    alta: 'Alta',
    urgente: 'Urgente',
};

const WidgetOT: FC<IWidgetOTProps> = ({ className }) => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { metricas, metricsLoading, filtroFechas } = useAppSelector((state) => state.dashboard);
    const loading = metricsLoading.ot;
    const data = metricas.ot;

    useEffect(() => {
        dispatch(fetchMetricasOTThunk(undefined));
    }, [dispatch, filtroFechas]);

    const formatMoney = (value: number): string => {
        return new Intl.NumberFormat('es-CL', {
            style: 'currency',
            currency: 'CLP',
            maximumFractionDigits: 0,
        }).format(value);
    };

    // Items de alerta para OTs vencidas
    const alertItems =
        data && data.resumen.ots_vencidas > 0
            ? [
                  {
                      id: 'vencidas',
                      title: `${data.resumen.ots_vencidas} OTs vencidas`,
                      subtitle: 'Requieren atención inmediata',
                      onClick: () => navigate('/ordenes-trabajo?estado=vencida'),
                  },
              ]
            : [];

    // Agregar cierres administrativos pendientes (suma de borrador + en_revision)
    const cierresPendientes = data
        ? (data.cierres_administrativos?.borrador || 0) +
          (data.cierres_administrativos?.en_revision || 0)
        : 0;
    if (cierresPendientes > 0) {
        alertItems.push({
            id: 'cierres',
            title: `${cierresPendientes} cierres pendientes`,
            subtitle: 'Esperando cierre administrativo',
            onClick: () => navigate('/ordenes-trabajo?estado=completada'),
        });
    }

    return (
        <div className={className}>
            <h3 className='mb-4 flex items-center gap-2 text-lg font-semibold'>
                <span className='h-3 w-3 rounded-full bg-blue-500'></span>
                Órdenes de Trabajo
            </h3>

            {/* Métricas principales */}
            <div className='mb-4 grid grid-cols-2 gap-3 md:grid-cols-4'>
                <MetricCard
                    title='Total OTs'
                    value={data?.resumen.total_periodo ?? 0}
                    icon='HeroClipboardDocumentList'
                    color='blue'
                    loading={loading}
                    onClick={() => navigate('/ordenes-trabajo')}
                />
                <MetricCard
                    title='Activas'
                    value={data?.resumen.total_activas ?? 0}
                    icon='HeroCog6Tooth'
                    color='amber'
                    loading={loading}
                    onClick={() => navigate('/ordenes-trabajo?estado=en_proceso')}
                />
                <MetricCard
                    title='Completadas'
                    value={data?.resumen.completadas_periodo ?? 0}
                    icon='HeroCheckCircle'
                    color='emerald'
                    loading={loading}
                />
                <MetricCard
                    title='Gastos Totales'
                    value={data ? formatMoney(data.resumen.total_gastos) : '$0'}
                    icon='HeroBanknotes'
                    color='purple'
                    loading={loading}
                    subtitle='En OTs del período'
                />
            </div>

            {/* Alertas y gráficos */}
            <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
                {/* Alertas */}
                {alertItems.length > 0 && (
                    <AlertCard
                        title='Atención Requerida'
                        items={alertItems}
                        icon='HeroExclamationTriangle'
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

                {/* Distribución por prioridad */}
                <DistributionChart
                    title='Por Prioridad'
                    data={data?.por_prioridad ?? {}}
                    labels={prioridadLabels}
                    loading={loading}
                    colors={['#84cc16', '#3b82f6', '#f59e0b', '#ef4444']}
                />
            </div>

            {/* Tendencia */}
            {data?.tendencia_30_dias && data.tendencia_30_dias.length > 0 && (
                <div className='mt-4'>
                    <TrendChart
                        title='Tendencia (últimos 30 días)'
                        data={data.tendencia_30_dias}
                        loading={loading}
                        yAxisLabel='OTs creadas'
                    />
                </div>
            )}
        </div>
    );
};

export default WidgetOT;
