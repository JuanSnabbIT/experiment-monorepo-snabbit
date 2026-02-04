import { fetchMetricasContratosThunk, useAppDispatch, useAppSelector } from '@/store';
import { FC, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AlertCard from '../components/AlertCard';
import DistributionChart from '../components/DistributionChart';
import MetricCard from '../components/MetricCard';

interface IWidgetContratosProps {
    className?: string;
}

// Mapeo de estados
const estadoLabels: Record<string, string> = {
    borrador: 'Borrador',
    enviado: 'Enviado',
    firmado: 'Firmado',
    activo: 'Activo',
    vencido: 'Vencido',
    cancelado: 'Cancelado',
};

const WidgetContratos: FC<IWidgetContratosProps> = ({ className }) => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { metricas, metricsLoading, filtroFechas } = useAppSelector((state) => state.dashboard);
    const loading = metricsLoading.contratos;
    const data = metricas.contratos;

    useEffect(() => {
        dispatch(fetchMetricasContratosThunk(undefined));
    }, [dispatch, filtroFechas]);

    const formatDate = (dateStr: string | null): string => {
        if (!dateStr) return 'Sin fecha';
        return new Date(dateStr).toLocaleDateString('es-CL', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    };

    // Contratos por vencer
    const contratosPorVencer = (data?.contratos_por_vencer ?? []).map((contrato) => ({
        id: String(contrato.id),
        title: contrato.nombre,
        subtitle: `${contrato.cliente} - Vence ${formatDate(contrato.fecha_fin)}${contrato.dias_restantes !== null ? ` (${contrato.dias_restantes} días)` : ''}`,
        onClick: () => navigate(`/contratos/${contrato.id}`),
    }));

    // Licencias por vencer
    const licenciasPorVencer = (data?.licencias_por_vencer ?? []).map((lic) => ({
        id: `lic-${lic.id}`,
        title: lic.nombre,
        subtitle: `${lic.contrato} - Expira ${formatDate(lic.fecha_vencimiento)}`,
        onClick: () => navigate('/recursos'),
    }));

    return (
        <div className={className}>
            <h3 className='mb-4 flex items-center gap-2 text-lg font-semibold'>
                <span className='h-3 w-3 rounded-full bg-sky-500'></span>
                Contratos
            </h3>

            {/* Métricas principales */}
            <div className='mb-4 grid grid-cols-2 gap-3 md:grid-cols-4'>
                <MetricCard
                    title='Total Contratos'
                    value={data?.resumen.total_contratos ?? 0}
                    icon='HeroDocumentCheck'
                    color='sky'
                    loading={loading}
                    onClick={() => navigate('/contratos')}
                />
                <MetricCard
                    title='Activos'
                    value={data?.resumen.contratos_activos ?? 0}
                    icon='HeroCheckBadge'
                    color='emerald'
                    loading={loading}
                />
                <MetricCard
                    title='Lic. por Vencer'
                    value={data?.resumen.licencias_por_vencer ?? 0}
                    icon='HeroClock'
                    color='amber'
                    loading={loading}
                />
                <MetricCard
                    title='Firmas Pendientes'
                    value={data?.resumen.firmas_pendientes ?? 0}
                    icon='HeroPencilSquare'
                    color='purple'
                    loading={loading}
                />
            </div>

            {/* Alertas y gráficos */}
            <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
                {/* Contratos por vencer */}
                {contratosPorVencer.length > 0 && (
                    <AlertCard
                        title='Contratos por Vencer'
                        items={contratosPorVencer}
                        icon='HeroCalendarDays'
                        severity='warning'
                        loading={loading}
                        emptyMessage='Sin contratos próximos a vencer'
                    />
                )}

                {/* Licencias por vencer */}
                {licenciasPorVencer.length > 0 && (
                    <AlertCard
                        title='Licencias por Vencer'
                        items={licenciasPorVencer}
                        icon='HeroKey'
                        severity='info'
                        loading={loading}
                        emptyMessage='Sin licencias próximas a vencer'
                    />
                )}

                {/* Distribución por estado */}
                <DistributionChart
                    title='Por Estado'
                    data={data?.por_estado ?? {}}
                    labels={estadoLabels}
                    loading={loading}
                />
            </div>
        </div>
    );
};

export default WidgetContratos;
