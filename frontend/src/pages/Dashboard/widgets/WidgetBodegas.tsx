import Icon from '@/components/icon/Icon';
import LoaderDots from '@/components/LoaderDots.common';
import Badge from '@/components/ui/Badge';
import Card, { CardBody, CardHeader, CardHeaderChild, CardTitle } from '@/components/ui/Card';
import { fetchMetricasBodegasThunk, useAppDispatch, useAppSelector } from '@/store';
import { FC, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface IWidgetBodegasProps {
    className?: string;
}

const WidgetBodegas: FC<IWidgetBodegasProps> = ({ className }) => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { metricas, metricsLoading, filtroFechas } = useAppSelector((state) => state.dashboard);
    const loading = metricsLoading.bodegas;
    const data = metricas.bodegas;

    useEffect(() => {
        dispatch(fetchMetricasBodegasThunk(undefined));
    }, [dispatch, filtroFechas]);

    // Contar alertas
    const alertCount =
        (data?.inventario.items_sin_stock ?? 0) +
        (data?.inventario.items_stock_bajo ?? 0) +
        (data?.guias_salida.pendientes_firma ?? 0);

    return (
        <Card className={className}>
            <CardHeader>
                <CardHeaderChild>
                    <Icon icon='HeroCube' size='text-2xl' className='text-amber-500' />
                    <CardTitle>Bodegas</CardTitle>
                </CardHeaderChild>
                <CardHeaderChild>
                    {alertCount > 0 && (
                        <Badge color='amber' variant='solid' className='text-xs'>
                            {alertCount} alertas
                        </Badge>
                    )}
                </CardHeaderChild>
            </CardHeader>
            <CardBody
                className='cursor-pointer pt-0 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                onClick={() => navigate('/bodegas/inventario')}>
                {loading ? (
                    <div className='flex justify-center py-4'>
                        <LoaderDots />
                    </div>
                ) : (
                    <div className='flex items-center justify-between'>
                        <div>
                            <p className='text-2xl font-bold'>
                                {data?.inventario.total_items_en_stock ?? 0}
                            </p>
                            <p className='text-xs text-zinc-500'>items en stock</p>
                        </div>
                        <div className='text-right'>
                            <p className='text-lg font-semibold text-blue-600'>
                                {data?.ordenes_compra.pendientes_recepcion ?? 0}
                            </p>
                            <p className='text-xs text-zinc-500'>OC pend. recep.</p>
                        </div>
                        <div className='text-right'>
                            <p className='text-lg font-semibold text-emerald-600'>
                                {data?.guias_salida.pendientes_firma ?? 0}
                            </p>
                            <p className='text-xs text-zinc-500'>guías pend.</p>
                        </div>
                    </div>
                )}
            </CardBody>
        </Card>
    );
};

export default WidgetBodegas;
