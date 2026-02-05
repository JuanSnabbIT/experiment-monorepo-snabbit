import Icon from '@/components/icon/Icon';
import LoaderDots from '@/components/LoaderDots.common';
import Badge from '@/components/ui/Badge';
import Card, { CardBody, CardHeader, CardHeaderChild, CardTitle } from '@/components/ui/Card';
import { fetchMetricasContratosThunk, useAppDispatch, useAppSelector } from '@/store';
import { FC, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface IWidgetContratosProps {
    className?: string;
}

const WidgetContratos: FC<IWidgetContratosProps> = ({ className }) => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { metricas, metricsLoading, filtroFechas } = useAppSelector((state) => state.dashboard);
    const loading = metricsLoading.contratos;
    const data = metricas.contratos;

    useEffect(() => {
        dispatch(fetchMetricasContratosThunk(undefined));
    }, [dispatch, filtroFechas]);

    // Alertas: contratos por vencer + licencias por vencer + firmas pendientes
    const alertCount =
        (data?.contratos_por_vencer?.length ?? 0) +
        (data?.resumen.licencias_por_vencer ?? 0) +
        (data?.resumen.firmas_pendientes ?? 0);

    return (
        <Card className={className}>
            <CardHeader>
                <CardHeaderChild>
                    <Icon icon='HeroDocumentCheck' size='text-2xl' className='text-sky-500' />
                    <CardTitle>Contratos</CardTitle>
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
                onClick={() => navigate('/contratos')}>
                {loading ? (
                    <div className='flex justify-center py-4'>
                        <LoaderDots />
                    </div>
                ) : (
                    <div className='flex items-center justify-between'>
                        <div>
                            <p className='text-2xl font-bold'>
                                {data?.resumen.contratos_activos ?? 0}
                            </p>
                            <p className='text-xs text-zinc-500'>activos</p>
                        </div>
                        <div className='text-right'>
                            <p className='text-lg font-semibold text-amber-600'>
                                {data?.resumen.licencias_por_vencer ?? 0}
                            </p>
                            <p className='text-xs text-zinc-500'>lic. por vencer</p>
                        </div>
                        <div className='text-right'>
                            <p className='text-lg font-semibold text-purple-600'>
                                {data?.resumen.firmas_pendientes ?? 0}
                            </p>
                            <p className='text-xs text-zinc-500'>firmas pend.</p>
                        </div>
                    </div>
                )}
            </CardBody>
        </Card>
    );
};

export default WidgetContratos;
