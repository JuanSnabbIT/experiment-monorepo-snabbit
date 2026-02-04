import Icon from '@/components/icon/Icon';
import LoaderDots from '@/components/LoaderDots.common';
import Badge from '@/components/ui/Badge';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import { fetchIndicadoresBackendThunk, useAppDispatch, useAppSelector } from '@/store';
import { FC, useEffect } from 'react';

interface IWidgetIndicadoresProps {
    className?: string;
}

const WidgetIndicadores: FC<IWidgetIndicadoresProps> = ({ className }) => {
    const dispatch = useAppDispatch();
    const { indicadores, metricsLoading, metricsError } = useAppSelector(
        (state) => state.dashboard,
    );

    useEffect(() => {
        dispatch(fetchIndicadoresBackendThunk(undefined));
    }, [dispatch]);

    const formatCurrency = (value: number | undefined): string => {
        if (value === undefined) return '-';
        return new Intl.NumberFormat('es-CL', {
            style: 'currency',
            currency: 'CLP',
            minimumFractionDigits: 2,
        }).format(value);
    };

    const formatDate = (dateStr: string | undefined): string => {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleDateString('es-CL', {
            day: '2-digit',
            month: 'short',
        });
    };

    return (
        <Card className={className}>
            <CardHeader>
                <CardHeaderChild>
                    <Icon icon='HeroBanknotes' className='mr-2 text-xl text-emerald-500' />
                    <Badge className='text-lg'>Indicadores Económicos</Badge>
                </CardHeaderChild>
                {indicadores?.fecha_consulta && (
                    <CardHeaderChild>
                        <span className='text-xs text-zinc-400'>
                            Actualizado: {formatDate(indicadores.fecha_consulta)}
                        </span>
                    </CardHeaderChild>
                )}
            </CardHeader>
            <CardBody>
                {metricsLoading.indicadores ? (
                    <div className='flex justify-center py-4'>
                        <LoaderDots />
                    </div>
                ) : metricsError.indicadores ? (
                    <p className='py-4 text-center text-sm text-rose-500'>
                        {metricsError.indicadores}
                    </p>
                ) : (
                    <div className='grid grid-cols-2 gap-4'>
                        {/* Dólar */}
                        <div className='rounded-lg bg-blue-500/10 p-4'>
                            <div className='flex items-center gap-2'>
                                <Icon
                                    icon='HeroCurrencyDollar'
                                    className='text-2xl text-blue-500'
                                />
                                <span className='text-sm font-medium text-zinc-500'>
                                    Dólar Observado
                                </span>
                            </div>
                            <p className='mt-2 text-2xl font-bold text-blue-600 dark:text-blue-400'>
                                {indicadores?.dolar
                                    ? formatCurrency(indicadores.dolar.valor)
                                    : '-'}
                            </p>
                            {indicadores?.dolar?.fecha_referencia && (
                                <p className='text-xs text-zinc-400'>
                                    al {formatDate(indicadores.dolar.fecha_referencia)}
                                </p>
                            )}
                        </div>

                        {/* UF */}
                        <div className='rounded-lg bg-emerald-500/10 p-4'>
                            <div className='flex items-center gap-2'>
                                <Icon icon='HeroScale' className='text-2xl text-emerald-500' />
                                <span className='text-sm font-medium text-zinc-500'>UF</span>
                            </div>
                            <p className='mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400'>
                                {indicadores?.uf ? formatCurrency(indicadores.uf.valor) : '-'}
                            </p>
                            {indicadores?.uf?.fecha_referencia && (
                                <p className='text-xs text-zinc-400'>
                                    al {formatDate(indicadores.uf.fecha_referencia)}
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {indicadores?.errores && indicadores.errores.length > 0 && (
                    <div className='mt-3 rounded-lg bg-amber-500/10 p-2'>
                        <p className='text-xs text-amber-600'>
                            <Icon icon='HeroExclamationTriangle' className='mr-1 inline' />
                            {indicadores.errores.join(', ')}
                        </p>
                    </div>
                )}
            </CardBody>
        </Card>
    );
};

export default WidgetIndicadores;
