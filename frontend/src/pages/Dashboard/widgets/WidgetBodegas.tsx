import { fetchMetricasBodegasThunk, useAppDispatch, useAppSelector } from '@/store';
import { FC, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AlertCard from '../components/AlertCard';
import DistributionChart from '../components/DistributionChart';
import MetricCard from '../components/MetricCard';

interface IWidgetBodegasProps {
    className?: string;
}

// Mapeo de estados OC
const estadoOCLabels: Record<string, string> = {
    borrador: 'Borrador',
    enviada: 'Enviada',
    aprobada: 'Aprobada',
    recibida_parcial: 'Recibida Parcial',
    recibida: 'Recibida',
    cancelada: 'Cancelada',
};

// Mapeo de estados Guía
const estadoGuiaLabels: Record<string, string> = {
    pendiente: 'Pendiente',
    despachada: 'Despachada',
    entregada: 'Entregada',
    cancelada: 'Cancelada',
};

const WidgetBodegas: FC<IWidgetBodegasProps> = ({ className }) => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { metricas, metricsLoading, filtroFechas } = useAppSelector((state) => state.dashboard);
    const loading = metricsLoading.bodegas;
    const data = metricas.bodegas;

    useEffect(() => {
        dispatch(fetchMetricasBodegasThunk(undefined));
    }, [dispatch, filtroFechas]);

    // Alertas combinadas
    const alertItems: Array<{
        id: string;
        title: string;
        subtitle: string;
        onClick?: () => void;
    }> = [];

    if (data && data.inventario.items_sin_stock > 0) {
        alertItems.push({
            id: 'sin-stock',
            title: `${data.inventario.items_sin_stock} items sin stock`,
            subtitle: 'Revisar inventario',
            onClick: () => navigate('/bodegas/inventario'),
        });
    }

    if (data && data.inventario.items_stock_bajo > 0) {
        alertItems.push({
            id: 'stock-bajo',
            title: `${data.inventario.items_stock_bajo} items con stock bajo`,
            subtitle: 'Considerar reposición',
            onClick: () => navigate('/bodegas/inventario'),
        });
    }

    if (data && data.compras_rapidas.pendientes_rendicion > 0) {
        alertItems.push({
            id: 'pendientes-rendicion',
            title: `${data.compras_rapidas.pendientes_rendicion} compras sin rendir`,
            subtitle: 'Compras rápidas pendientes de rendición',
            onClick: () => navigate('/rendiciones'),
        });
    }

    if (data && data.guias_salida.pendientes_firma > 0) {
        alertItems.push({
            id: 'guias-pendientes',
            title: `${data.guias_salida.pendientes_firma} guías sin firmar`,
            subtitle: 'Pendientes de firma del cliente',
            onClick: () => navigate('/bodegas/guias'),
        });
    }

    return (
        <div className={className}>
            <h3 className='mb-4 flex items-center gap-2 text-lg font-semibold'>
                <span className='h-3 w-3 rounded-full bg-amber-500'></span>
                Bodegas e Inventario
            </h3>

            {/* Métricas principales */}
            <div className='mb-4 grid grid-cols-2 gap-3 md:grid-cols-4'>
                <MetricCard
                    title='OC en Período'
                    value={data?.ordenes_compra.total_periodo ?? 0}
                    icon='HeroShoppingCart'
                    color='amber'
                    loading={loading}
                    onClick={() => navigate('/bodegas/ordenes-compra')}
                />
                <MetricCard
                    title='Pend. Recepción'
                    value={data?.ordenes_compra.pendientes_recepcion ?? 0}
                    icon='HeroTruck'
                    color='blue'
                    loading={loading}
                />
                <MetricCard
                    title='Guías Pend. Firma'
                    value={data?.guias_salida.pendientes_firma ?? 0}
                    icon='HeroDocumentArrowUp'
                    color='emerald'
                    loading={loading}
                    onClick={() => navigate('/bodegas/guias')}
                />
                <MetricCard
                    title='Items en Stock'
                    value={data?.inventario.total_items_en_stock ?? 0}
                    icon='HeroCube'
                    color='purple'
                    loading={loading}
                />
            </div>

            {/* Alertas y gráficos */}
            <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
                {/* Alertas de inventario */}
                {alertItems.length > 0 && (
                    <AlertCard
                        title='Alertas de Inventario'
                        items={alertItems}
                        icon='HeroExclamationTriangle'
                        severity='warning'
                        loading={loading}
                        maxItems={5}
                    />
                )}

                {/* Distribución OC por estado */}
                <DistributionChart
                    title='OC por Estado'
                    data={data?.ordenes_compra.por_estado ?? {}}
                    labels={estadoOCLabels}
                    loading={loading}
                />

                {/* Distribución Guías por estado */}
                <DistributionChart
                    title='Guías por Estado'
                    data={data?.guias_salida.por_estado ?? {}}
                    labels={estadoGuiaLabels}
                    loading={loading}
                    colors={['#f59e0b', '#3b82f6', '#10b981', '#ef4444']}
                />
            </div>
        </div>
    );
};

export default WidgetBodegas;
