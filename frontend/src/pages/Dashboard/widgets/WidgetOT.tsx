import Badge from '@/components/ui/Badge';
import { fetchMetricasOTThunk, useAppDispatch, useAppSelector } from '@/store';
import { FC, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DistributionChart from '../components/DistributionChart';
import MetricCard from '../components/MetricCard';

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

    // Calcular alertas
    const otsVencidas = data?.resumen.ots_vencidas ?? 0;
    const cierresPendientes = data
        ? (data.cierres_administrativos?.borrador || 0) +
          (data.cierres_administrativos?.por_facturar || 0)
        : 0;
    const tieneAlertas = otsVencidas > 0 || cierresPendientes > 0;

    return (
        <div className={className}>
            <div className='mb-4 flex items-center justify-between'>
                <h3 className='flex items-center gap-2 text-lg font-semibold'>
                    <span className='h-3 w-3 rounded-full bg-blue-500'></span>
                    Órdenes de Trabajo
                </h3>
                {tieneAlertas && (
                    <Badge color='red' variant='solid' className='text-xs'>
                        {otsVencidas > 0 && `${otsVencidas} vencidas`}
                        {otsVencidas > 0 && cierresPendientes > 0 && ' • '}
                        {cierresPendientes > 0 && `${cierresPendientes} cierres pend.`}
                    </Badge>
                )}
            </div>

            {/* Layout simplificado: 2 métricas + 1 gráfico */}
            <div className='grid gap-4 lg:grid-cols-3'>
                {/* Métricas compactas */}
                <div className='flex flex-col gap-3 lg:col-span-1'>
                    <MetricCard
                        title='Activas'
                        value={data?.resumen.total_activas ?? 0}
                        icon='HeroCog6Tooth'
                        color='amber'
                        loading={loading}
                        onClick={() => navigate('/ordenes-trabajo?estado=en_proceso')}
                    />
                    <MetricCard
                        title='Gastos Período'
                        value={data ? formatMoney(data.resumen.total_gastos) : '$0'}
                        icon='HeroBanknotes'
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

export default WidgetOT;
