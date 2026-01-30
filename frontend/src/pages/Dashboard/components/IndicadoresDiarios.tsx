import Badge from '@/components/ui/Badge';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import { ultimosValoresIndicadoresThunk, useAppDispatch, useAppSelector } from '@/store';
import { useEffect } from 'react';
import Icon from '@/components/icon/Icon';

function IndicadoresDiarios() {
    const dispatch = useAppDispatch();
    const { ultimosValoresIndicadores } = useAppSelector((state) => state.dashboard);

    useEffect(() => {
        dispatch(ultimosValoresIndicadoresThunk());
    }, []);

    return (
        <Card className='w-full'>
            <CardHeader>
                <CardHeaderChild>
                    <Badge className='text-xl'>Indicadores Económicos</Badge>
                </CardHeaderChild>
            </CardHeader>
            <CardBody>
                <div className='flex'>
                    <div className='flex w-full items-center'>
                        <Icon icon='HeroCurrencyDollar' className='mr-2 text-xl' />
                        <Badge>Dólar observado</Badge>
                        <div className='ml-4'>${ultimosValoresIndicadores?.dolar.valor}</div>
                    </div>
                    <div className='flex w-full items-center'>
                        <Icon icon='HeroScale' className='mr-2 text-xl' />
                        <Badge>Unidad de fomento (UF)</Badge>
                        <div className='ml-4'>${ultimosValoresIndicadores?.uf.valor}</div>
                    </div>
                </div>
            </CardBody>
        </Card>
    );
}

export default IndicadoresDiarios;
