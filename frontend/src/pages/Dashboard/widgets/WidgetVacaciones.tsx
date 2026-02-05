import Icon from '@/components/icon/Icon';
import LoaderDots from '@/components/LoaderDots.common';
import Badge from '@/components/ui/Badge';
import Card, { CardBody, CardHeader, CardHeaderChild, CardTitle } from '@/components/ui/Card';
import { fetchMetricasVacacionesThunk, useAppDispatch, useAppSelector } from '@/store';
import { FC, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface IWidgetVacacionesProps {
    className?: string;
}

const WidgetVacaciones: FC<IWidgetVacacionesProps> = ({ className }) => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { metricas, metricsLoading, filtroFechas } = useAppSelector((state) => state.dashboard);
    const loading = metricsLoading.vacaciones;
    const data = metricas.vacaciones;

    useEffect(() => {
        dispatch(fetchMetricasVacacionesThunk(undefined));
    }, [dispatch, filtroFechas]);

    // Alertas: pendientes + extraordinarias + ausencias hoy
    const alertCount =
        (data?.resumen.pendientes_aprobacion ?? 0) +
        (data?.resumen.extraordinarias_pendientes ?? 0) +
        (data?.resumen.ausencias_hoy ?? 0);

    return (
        <Card className={className}>
            <CardHeader>
                <CardHeaderChild>
                    <Icon icon='HeroCalendarDays' size='text-2xl' className='text-rose-500' />
                    <CardTitle>Vacaciones</CardTitle>
                </CardHeaderChild>
                <CardHeaderChild>
                    {alertCount > 0 && (
                        <Badge color='amber' variant='solid' className='text-xs'>
                            {alertCount} pendientes
                        </Badge>
                    )}
                </CardHeaderChild>
            </CardHeader>
            <CardBody
                className='cursor-pointer pt-0 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                onClick={() => navigate('/calendario')}>
                {loading ? (
                    <div className='flex justify-center py-4'>
                        <LoaderDots />
                    </div>
                ) : (
                    <div className='flex items-center justify-between'>
                        <div>
                            <p className='text-2xl font-bold'>
                                {data?.resumen.pendientes_aprobacion ?? 0}
                            </p>
                            <p className='text-xs text-zinc-500'>pend. aprobación</p>
                        </div>
                        <div className='text-right'>
                            <p className='text-lg font-semibold text-blue-600'>
                                {data?.resumen.ausencias_hoy ?? 0}
                            </p>
                            <p className='text-xs text-zinc-500'>ausentes hoy</p>
                        </div>
                        <div className='text-right'>
                            <p className='text-lg font-semibold text-rose-600'>
                                {data?.resumen.extraordinarias_pendientes ?? 0}
                            </p>
                            <p className='text-xs text-zinc-500'>extraordinarias</p>
                        </div>
                    </div>
                )}
            </CardBody>
        </Card>
    );
};

export default WidgetVacaciones;
