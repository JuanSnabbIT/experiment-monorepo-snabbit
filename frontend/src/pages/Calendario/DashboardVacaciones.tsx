import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, { SubheaderLeft } from '@/components/layouts/Subheader/Subheader';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Chart from '@/components/Chart';
import { listaSolicitudesVacacionesThunk, useAppDispatch, useAppSelector } from '@/store';
import dayjs from 'dayjs';
import { useEffect, useMemo } from 'react';

function DashboardVacaciones() {
    const dispatch = useAppDispatch();
    const { listaSolicitudesVacaciones } = useAppSelector((state) => state.calendario);

    useEffect(() => {
        dispatch(listaSolicitudesVacacionesThunk());
    }, []);

    const statusCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        listaSolicitudesVacaciones.forEach((sol) => {
            counts[sol.estado_label] = (counts[sol.estado_label] || 0) + 1;
        });
        return counts;
    }, [listaSolicitudesVacaciones]);

    const meses = [
        'Ene',
        'Feb',
        'Mar',
        'Abr',
        'May',
        'Jun',
        'Jul',
        'Ago',
        'Sep',
        'Oct',
        'Nov',
        'Dic',
    ];

    const solicitudesPorMes = useMemo(() => {
        const data = Array(12).fill(0);
        listaSolicitudesVacaciones.forEach((sol) => {
            const mes = dayjs(sol.fecha_solicitud).month();
            data[mes] += 1;
        });
        return data;
    }, [listaSolicitudesVacaciones]);

    const seriesEstado = Object.values(statusCounts);
    const optionsEstado = {
        labels: Object.keys(statusCounts),
        legend: { position: 'bottom' as const },
    };

    const seriesMeses = [{ name: 'Solicitudes', data: solicitudesPorMes }];
    const optionsMeses = {
        xaxis: { categories: meses },
        yaxis: { title: { text: 'Solicitudes' } },
    };

    return (
        <PageWrapper
            isProtectedRoute={true}
            title='Dashboard Vacaciones'
            name='Dashboard Vacaciones'>
            <Subheader>
                <SubheaderLeft>
                    <Badge className='text-xl'>Dashboard Vacaciones</Badge>
                </SubheaderLeft>
            </Subheader>
            <Container>
                <div className='grid gap-4 md:grid-cols-2'>
                    <Card>
                        <CardHeader>
                            <CardHeaderChild>
                                <Badge className='text-xl'>Solicitudes por Estado</Badge>
                            </CardHeaderChild>
                        </CardHeader>
                        <CardBody>
                            <Chart
                                type='pie'
                                series={seriesEstado}
                                options={optionsEstado}
                                height={300}
                            />
                        </CardBody>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardHeaderChild>
                                <Badge className='text-xl'>Solicitudes por Mes</Badge>
                            </CardHeaderChild>
                        </CardHeader>
                        <CardBody>
                            <Chart
                                type='bar'
                                series={seriesMeses}
                                options={optionsMeses}
                                height={300}
                            />
                        </CardBody>
                    </Card>
                </div>
            </Container>
        </PageWrapper>
    );
}

export default DashboardVacaciones;
