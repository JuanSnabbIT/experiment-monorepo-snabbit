import Icon from '@/components/icon/Icon';
import LoaderDots from '@/components/LoaderDots.common';
import Badge from '@/components/ui/Badge';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import { fetchMetricasVacacionesThunk, useAppDispatch, useAppSelector } from '@/store';
import { FC, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AlertCard from '../components/AlertCard';
import DistributionChart from '../components/DistributionChart';
import MetricCard from '../components/MetricCard';

interface IWidgetVacacionesProps {
    className?: string;
}

// Mapeo de estados
const estadoLabels: Record<string, string> = {
    pendiente: 'Pendiente',
    aprobada: 'Aprobada',
    rechazada: 'Rechazada',
    cancelada: 'Cancelada',
};

const WidgetVacaciones: FC<IWidgetVacacionesProps> = ({ className }) => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { metricas, metricsLoading, filtroFechas } = useAppSelector((state) => state.dashboard);
    const loading = metricsLoading.vacaciones;
    const data = metricas.vacaciones;

    useEffect(() => {
        dispatch(fetchMetricasVacacionesThunk(undefined));
    }, [dispatch, filtroFechas]);

    const formatDate = (dateStr: string): string => {
        return new Date(dateStr).toLocaleDateString('es-CL', {
            day: '2-digit',
            month: 'short',
        });
    };

    // Vacaciones próximas
    const vacacionesProximas = (data?.vacaciones_proximas ?? []).map((vac) => ({
        id: String(vac.id),
        title: vac.nombre,
        subtitle: `${formatDate(vac.fecha_inicio)} - ${formatDate(vac.fecha_fin)}${vac.dias_para_inicio !== null ? ` (en ${vac.dias_para_inicio} días)` : ''}`,
        onClick: () => navigate('/calendario'),
    }));

    // Ausencias de hoy
    const ausenciasHoyItems = (data?.ausencias_hoy ?? []).map((ausencia) => ({
        id: String(ausencia.id),
        title: ausencia.nombre,
        subtitle: `Regresa: ${formatDate(ausencia.regresa)}`,
    }));

    return (
        <div className={className}>
            <h3 className='mb-4 flex items-center gap-2 text-lg font-semibold'>
                <span className='h-3 w-3 rounded-full bg-rose-500'></span>
                Vacaciones y Ausencias
            </h3>

            {/* Métricas principales */}
            <div className='mb-4 grid grid-cols-2 gap-3 md:grid-cols-4'>
                <MetricCard
                    title='Pendientes'
                    value={data?.resumen.pendientes_aprobacion ?? 0}
                    icon='HeroClock'
                    color='amber'
                    loading={loading}
                    onClick={() => navigate('/calendario')}
                />
                <MetricCard
                    title='Ext. Pendientes'
                    value={data?.resumen.extraordinarias_pendientes ?? 0}
                    icon='HeroExclamationCircle'
                    color='rose'
                    loading={loading}
                    subtitle='Extraordinarias'
                />
                <MetricCard
                    title='Ausentes Hoy'
                    value={data?.resumen.ausencias_hoy ?? 0}
                    icon='HeroUserMinus'
                    color='blue'
                    loading={loading}
                />
                <MetricCard
                    title='Por Estado'
                    value={Object.values(data?.por_estado ?? {}).reduce((a, b) => a + b, 0)}
                    icon='HeroCalendarDays'
                    color='emerald'
                    loading={loading}
                    subtitle='Total registradas'
                />
            </div>

            {/* Alertas y gráficos */}
            <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
                {/* Vacaciones próximas */}
                {vacacionesProximas.length > 0 && (
                    <AlertCard
                        title='Vacaciones Próximas'
                        items={vacacionesProximas}
                        icon='HeroCalendarDays'
                        severity='info'
                        loading={loading}
                        emptyMessage='Sin vacaciones programadas'
                    />
                )}

                {/* Ausencias de hoy */}
                {ausenciasHoyItems.length > 0 && (
                    <AlertCard
                        title='Ausentes Hoy'
                        items={ausenciasHoyItems}
                        icon='HeroUserMinus'
                        severity='warning'
                        loading={loading}
                    />
                )}

                {/* Próximos feriados */}
                <Card>
                    <CardHeader>
                        <CardHeaderChild>
                            <Icon icon='HeroStar' className='mr-2 text-amber-500' />
                            <Badge className='text-lg'>Próximos Feriados</Badge>
                        </CardHeaderChild>
                    </CardHeader>
                    <CardBody className='pt-0'>
                        {loading ? (
                            <div className='flex justify-center py-4'>
                                <LoaderDots />
                            </div>
                        ) : !data?.proximos_feriados || data.proximos_feriados.length === 0 ? (
                            <p className='py-4 text-center text-sm text-zinc-400'>
                                Sin feriados próximos
                            </p>
                        ) : (
                            <div className='space-y-2'>
                                {data.proximos_feriados.map((feriado, idx) => (
                                    <div
                                        key={idx}
                                        className={`flex items-center justify-between rounded-lg p-2 ${
                                            feriado.es_irrenunciable
                                                ? 'bg-rose-500/10'
                                                : 'bg-amber-500/10'
                                        }`}>
                                        <div className='flex items-center gap-2'>
                                            <span className='text-sm font-medium'>
                                                {feriado.nombre}
                                            </span>
                                            {feriado.es_irrenunciable && (
                                                <Badge color='red' variant='outline' className='text-xs'>
                                                    Irrenunciable
                                                </Badge>
                                            )}
                                        </div>
                                        <span className='text-xs text-zinc-500'>
                                            {formatDate(feriado.fecha)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardBody>
                </Card>

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

export default WidgetVacaciones;
