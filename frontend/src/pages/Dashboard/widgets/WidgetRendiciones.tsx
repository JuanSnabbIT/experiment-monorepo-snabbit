import LoaderDots from '@/components/LoaderDots.common';
import Badge from '@/components/ui/Badge';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import { fetchMetricasRendicionesThunk, useAppDispatch, useAppSelector } from '@/store';
import { FC, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DistributionChart from '../components/DistributionChart';
import MetricCard from '../components/MetricCard';

interface IWidgetRendicionesProps {
    className?: string;
}

// Mapeo de estados
const estadoLabels: Record<string, string> = {
    borrador: 'Borrador',
    enviada: 'Enviada',
    aprobada: 'Aprobada',
    rechazada: 'Rechazada',
    pagada: 'Pagada',
};

const WidgetRendiciones: FC<IWidgetRendicionesProps> = ({ className }) => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { metricas, metricsLoading, filtroFechas } = useAppSelector((state) => state.dashboard);
    const loading = metricsLoading.rendiciones;
    const data = metricas.rendiciones;

    useEffect(() => {
        dispatch(fetchMetricasRendicionesThunk(undefined));
    }, [dispatch, filtroFechas]);

    const formatMoney = (value: number): string => {
        return new Intl.NumberFormat('es-CL', {
            style: 'currency',
            currency: 'CLP',
            maximumFractionDigits: 0,
        }).format(value);
    };

    return (
        <div className={className}>
            <h3 className='mb-4 flex items-center gap-2 text-lg font-semibold'>
                <span className='h-3 w-3 rounded-full bg-purple-500'></span>
                Rendiciones de Gastos
            </h3>

            {/* Métricas principales */}
            <div className='mb-4 grid grid-cols-2 gap-3 md:grid-cols-4'>
                <MetricCard
                    title='Total Período'
                    value={data?.resumen.total_periodo ?? 0}
                    icon='HeroReceiptPercent'
                    color='purple'
                    loading={loading}
                    onClick={() => navigate('/rendiciones')}
                />
                <MetricCard
                    title='Pend. Aprobación'
                    value={data?.resumen.pendientes_aprobacion ?? 0}
                    icon='HeroClock'
                    color='amber'
                    loading={loading}
                />
                <MetricCard
                    title='Monto Pend. Aprob.'
                    value={data ? formatMoney(data.resumen.monto_pendiente_aprobacion) : '$0'}
                    icon='HeroClipboardDocumentCheck'
                    color='blue'
                    loading={loading}
                    subtitle='Monto total'
                />
                <MetricCard
                    title='Pend. Pago'
                    value={data ? formatMoney(data.resumen.monto_pendiente_pago) : '$0'}
                    icon='HeroBanknotes'
                    color='rose'
                    loading={loading}
                    subtitle='Aprobadas sin pagar'
                />
            </div>

            {/* Gráficos y listas */}
            <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
                {/* Distribución por estado */}
                <DistributionChart
                    title='Por Estado'
                    data={data?.por_estado ?? {}}
                    labels={estadoLabels}
                    loading={loading}
                />

                {/* Top usuarios */}
                <Card>
                    <CardHeader>
                        <CardHeaderChild>
                            <Badge className='text-lg'>Top Usuarios</Badge>
                        </CardHeaderChild>
                    </CardHeader>
                    <CardBody className='pt-0'>
                        {loading ? (
                            <div className='flex justify-center py-4'>
                                <LoaderDots />
                            </div>
                        ) : !data?.top_usuarios || data.top_usuarios.length === 0 ? (
                            <p className='py-4 text-center text-sm text-zinc-400'>
                                Sin datos disponibles
                            </p>
                        ) : (
                            <div className='space-y-2'>
                                {data.top_usuarios.slice(0, 5).map((usuario, idx) => (
                                    <div
                                        key={usuario.id}
                                        className='flex items-center justify-between rounded-lg bg-zinc-100 p-2 dark:bg-zinc-800'>
                                        <div className='flex items-center gap-2'>
                                            <span className='flex h-6 w-6 items-center justify-center rounded-full bg-purple-500 text-xs font-bold text-white'>
                                                {idx + 1}
                                            </span>
                                            <span className='text-sm font-medium'>
                                                {usuario.nombre}
                                            </span>
                                        </div>
                                        <div className='text-right'>
                                            <p className='text-sm font-bold'>{usuario.total}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardBody>
                </Card>

                {/* Top clientes */}
                <Card>
                    <CardHeader>
                        <CardHeaderChild>
                            <Badge className='text-lg'>Por Cliente</Badge>
                        </CardHeaderChild>
                    </CardHeader>
                    <CardBody className='pt-0'>
                        {loading ? (
                            <div className='flex justify-center py-4'>
                                <LoaderDots />
                            </div>
                        ) : !data?.top_clientes || data.top_clientes.length === 0 ? (
                            <p className='py-4 text-center text-sm text-zinc-400'>
                                Sin datos disponibles
                            </p>
                        ) : (
                            <div className='space-y-2'>
                                {data.top_clientes.slice(0, 5).map((cliente) => (
                                    <div
                                        key={cliente.id}
                                        className='flex items-center justify-between rounded-lg bg-zinc-100 p-2 dark:bg-zinc-800'>
                                        <span className='truncate text-sm font-medium'>
                                            {cliente.nombre}
                                        </span>
                                        <div className='text-right'>
                                            <p className='text-sm font-bold'>{cliente.total}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardBody>
                </Card>
            </div>
        </div>
    );
};

export default WidgetRendiciones;
