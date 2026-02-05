import Icon from '@/components/icon/Icon';
import LoaderDots from '@/components/LoaderDots.common';
import Card, { CardBody, CardHeader, CardHeaderChild, CardTitle } from '@/components/ui/Card';
import { fetchMetricasRendicionesThunk, useAppDispatch, useAppSelector } from '@/store';
import { FC, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface IWidgetRendicionesProps {
    className?: string;
}

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

    const pendientes = data?.resumen.pendientes_aprobacion ?? 0;

    return (
        <Card className={className}>
            <CardHeader>
                <CardHeaderChild>
                    <Icon icon='HeroReceiptPercent' size='text-2xl' className='text-purple-500' />
                    <CardTitle>Rendiciones</CardTitle>
                </CardHeaderChild>
            </CardHeader>
            <CardBody
                className='cursor-pointer pt-0 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                onClick={() => navigate('/rendiciones')}>
                {loading ? (
                    <div className='flex justify-center py-4'>
                        <LoaderDots />
                    </div>
                ) : (
                    <div className='flex items-center justify-between'>
                        <div>
                            <p className='text-2xl font-bold'>{data?.resumen.total_periodo ?? 0}</p>
                            <p className='text-xs text-zinc-500'>en el período</p>
                        </div>
                        <div className='text-right'>
                            <p className='text-lg font-semibold text-amber-600'>
                                {pendientes > 0 ? pendientes : '-'}
                            </p>
                            <p className='text-xs text-zinc-500'>pend. aprobación</p>
                        </div>
                        <div className='text-right'>
                            <p className='text-sm font-medium text-blue-600'>
                                {data ? formatMoney(data.resumen.monto_pendiente_aprobacion) : '$0'}
                            </p>
                            <p className='text-xs text-zinc-500'>monto pendiente</p>
                        </div>
                    </div>
                )}
            </CardBody>
        </Card>
    );
};

export default WidgetRendiciones;
