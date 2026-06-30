import Chart from '@/components/Chart';
import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, { SubheaderLeft } from '@/components/layouts/Subheader/Subheader';
import Badge from '@/components/ui/Badge';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import { useGetSolicitudesVacacionesQuery } from '@/store/slices/vacaciones/vacacionesApi';
import dayjs from 'dayjs';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

function DashboardVacaciones() {
    const navigate = useNavigate();
    const { data: listaSolicitudesVacaciones = [] } = useGetSolicitudesVacacionesQuery();

    // ── KPIs ────────────────────────────────────────────────────────────────
    const kpis = useMemo(() => {
        const hoy = dayjs().startOf('day');
        const en30dias = hoy.add(30, 'day');

        return {
            pendientes: listaSolicitudesVacaciones.filter((s) => s.estado === '1').length,
            aprobadaMes: listaSolicitudesVacaciones.filter(
                (s) => s.estado === '2' && dayjs(s.fecha_solicitud).month() === hoy.month() && dayjs(s.fecha_solicitud).year() === hoy.year(),
            ).length,
            ausentesHoy: listaSolicitudesVacaciones.filter((s) => {
                if (s.estado !== '2') return false;
                const ini = dayjs(s.fecha_inicio).startOf('day');
                const fin = dayjs(s.fecha_fin).startOf('day');
                return (hoy.isSame(ini) || hoy.isAfter(ini)) && (hoy.isSame(fin) || hoy.isBefore(fin));
            }).length,
            proximas: listaSolicitudesVacaciones.filter((s) => {
                if (s.estado !== '2') return false;
                const ini = dayjs(s.fecha_inicio).startOf('day');
                return ini.isAfter(hoy) && ini.isBefore(en30dias);
            }).length,
        };
    }, [listaSolicitudesVacaciones]);

    // ── Gráficos ─────────────────────────────────────────────────────────────
    const statusCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        listaSolicitudesVacaciones.forEach((sol) => {
            counts[sol.estado_label] = (counts[sol.estado_label] || 0) + 1;
        });
        return counts;
    }, [listaSolicitudesVacaciones]);

    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    const solicitudesPorMes = useMemo(() => {
        const data = Array(12).fill(0);
        listaSolicitudesVacaciones.forEach((sol) => {
            const mes = dayjs(sol.fecha_solicitud).month();
            data[mes] += 1;
        });
        return data;
    }, [listaSolicitudesVacaciones]);

    const seriesEstado = Object.values(statusCounts);
    const optionsEstado = { labels: Object.keys(statusCounts), legend: { position: 'bottom' as const } };
    const seriesMeses = [{ name: 'Solicitudes', data: solicitudesPorMes }];
    const optionsMeses = { xaxis: { categories: meses }, yaxis: { title: { text: 'Solicitudes' } } };

    return (
        <PageWrapper
            isProtectedRoute={true}
            title='Dashboard Vacaciones'
            name='Dashboard Vacaciones'>
            <Subheader>
                <SubheaderLeft>{null}</SubheaderLeft>
            </Subheader>
            <Container>
                {/* ── KPIs ── */}
                <div className='mb-4 grid grid-cols-2 gap-3 md:grid-cols-4'>
                    <button
                        type='button'
                        className='text-left'
                        onClick={() => navigate('/vacaciones/lista-solicitudes-vacaciones')}>
                        <Card className='h-full transition-all hover:ring-2 hover:ring-amber-400'>
                            <CardBody className='flex items-center gap-3 py-3'>
                                <div>
                                    <p className='text-xs text-zinc-500'>Pendientes de aprobar</p>
                                    <p className={`text-2xl font-bold ${kpis.pendientes > 0 ? 'text-amber-500' : 'text-zinc-700'}`}>
                                        {kpis.pendientes}
                                    </p>
                                </div>
                            </CardBody>
                        </Card>
                    </button>
                    <Card>
                        <CardBody className='flex items-center gap-3 py-3'>
                            <div>
                                <p className='text-xs text-zinc-500'>Aprobadas este mes</p>
                                <p className='text-2xl font-bold text-emerald-600'>{kpis.aprobadaMes}</p>
                            </div>
                        </CardBody>
                    </Card>
                    <Card>
                        <CardBody className='flex items-center gap-3 py-3'>
                            <div>
                                <p className='text-xs text-zinc-500'>Ausentes hoy</p>
                                <p className='text-2xl font-bold text-blue-600'>{kpis.ausentesHoy}</p>
                            </div>
                        </CardBody>
                    </Card>
                    <Card>
                        <CardBody className='flex items-center gap-3 py-3'>
                            <div>
                                <p className='text-xs text-zinc-500'>Próximas (30 días)</p>
                                <p className='text-2xl font-bold text-violet-600'>{kpis.proximas}</p>
                            </div>
                        </CardBody>
                    </Card>
                </div>

                {/* ── Gráficos ── */}
                <div className='grid gap-4 md:grid-cols-2'>
                    <Card>
                        <CardHeader>
                            <CardHeaderChild>
                                <Badge className='text-xl'>Solicitudes por Estado</Badge>
                            </CardHeaderChild>
                        </CardHeader>
                        <CardBody>
                            <Chart type='pie' series={seriesEstado} options={optionsEstado} height={300} />
                        </CardBody>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardHeaderChild>
                                <Badge className='text-xl'>Solicitudes por Mes</Badge>
                            </CardHeaderChild>
                        </CardHeader>
                        <CardBody>
                            <Chart type='bar' series={seriesMeses} options={optionsMeses} height={300} />
                        </CardBody>
                    </Card>
                </div>
            </Container>
        </PageWrapper>
    );
}

export default DashboardVacaciones;
