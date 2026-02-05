import Icon from '@/components/icon/Icon';
import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, { SubheaderLeft, SubheaderRight } from '@/components/layouts/Subheader/Subheader';
import {
    fetchIndicadoresBackendThunk,
    setFiltroFechas,
    useAppDispatch,
    useAppSelector,
} from '@/store';
import { useEffect, useMemo, useState } from 'react';
import BalanceCard from './components/BalanceCard';
import DateRangeFilter from './components/DateRangeFilter';
import PeriodButtons, { PeriodType } from './components/PeriodButtons';
import TimelineActividad from './components/TimelineActividad';
import EditarDashboardPreferences from './modal/EditarDashboardPreferences';
import {
    WidgetBodegas,
    WidgetContratos,
    WidgetCotizaciones,
    WidgetOT,
    WidgetRendiciones,
    WidgetVacaciones,
} from './widgets';

// Helper para calcular fechas según período
const getDateRangeForPeriod = (period: PeriodType): { fechaInicio: string; fechaFin: string } => {
    const today = new Date();
    const fechaFin = today.toISOString().split('T')[0];
    let fechaInicio: string;

    switch (period) {
        case 'day':
            fechaInicio = fechaFin;
            break;
        case 'week':
            const weekStart = new Date(today);
            weekStart.setDate(today.getDate() - 7);
            fechaInicio = weekStart.toISOString().split('T')[0];
            break;
        case 'month':
        default:
            fechaInicio = new Date(today.getFullYear(), today.getMonth(), 1)
                .toISOString()
                .split('T')[0];
            break;
    }

    return { fechaInicio, fechaFin };
};

function Home() {
    const dispatch = useAppDispatch();
    const { personalizacionUsuario, isAuthenticated } = useAppSelector((state) => state.auth);
    const { metricas, indicadores, metricsLoading } = useAppSelector(
        (state) => state.dashboard,
    );

    const [activePeriod, setActivePeriod] = useState<PeriodType>('month');

    // Configuración de widgets habilitados desde preferencias del usuario
    const widgetConfig = useMemo(() => {
        const prefs = personalizacionUsuario?.dashboard_preferences;
        return {
            indicadores: prefs?.indicadores_economicos ?? true,
            ot: prefs?.ot ?? true,
            cotizaciones: prefs?.cotizaciones ?? true,
            rendiciones: prefs?.rendiciones ?? true,
            bodegas: prefs?.actualizaciones_oc ?? true,
            contratos: prefs?.contratos ?? true,
            vacaciones: prefs?.vacaciones ?? true,
            actividad: prefs?.ultimos_eventos ?? true,
        };
    }, [personalizacionUsuario]);

    // Cargar indicadores al montar - solo si está autenticado
    useEffect(() => {
        if (isAuthenticated) {
            dispatch(fetchIndicadoresBackendThunk(undefined));
        }
    }, [dispatch, isAuthenticated]);

    // Handler para cambio de período
    const handlePeriodChange = (period: PeriodType) => {
        setActivePeriod(period);
        if (period !== 'custom') {
            const dates = getDateRangeForPeriod(period);
            dispatch(setFiltroFechas(dates));
        }
    };

    // Formatear valor de moneda
    const formatCurrency = (value: number | undefined): string => {
        if (value === undefined) return '-';
        return new Intl.NumberFormat('es-CL', {
            style: 'currency',
            currency: 'CLP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    };

    // Formatear número compacto
    const formatCompact = (value: number | undefined): string => {
        if (value === undefined) return '-';
        return value.toLocaleString('es-CL');
    };

    return (
        <PageWrapper isProtectedRoute={true} title='Dashboard' name='Dashboard'>
            <Subheader>
                <SubheaderLeft>
                    <PeriodButtons
                        value={activePeriod}
                        onChange={handlePeriodChange}
                        showCustom={true}
                    />
                    {activePeriod === 'custom' && <DateRangeFilter />}
                </SubheaderLeft>
                <SubheaderRight>
                    <EditarDashboardPreferences />
                </SubheaderRight>
            </Subheader>

            <Container className='w-full space-y-6 pb-8'>
                {/* Fila superior: Balance Cards con métricas clave */}
                <div className='grid grid-cols-12 gap-4'>
                    {/* OT Activas */}
                    <div className='col-span-12 sm:col-span-6 lg:col-span-3'>
                        <BalanceCard
                            title='OT Activas'
                            value={formatCompact(metricas.ot?.resumen.total_activas)}
                            icon='HeroWrenchScrewdriver'
                            color='blue'
                            loading={metricsLoading.ot}
                            tooltip='Órdenes de trabajo actualmente en proceso'
                            comparison={
                                metricas.ot?.resumen.total_periodo
                                    ? {
                                          value:
                                              metricas.ot.resumen.total_periodo > 0
                                                  ? ((metricas.ot.resumen.total_activas /
                                                        metricas.ot.resumen.total_periodo) *
                                                        100 -
                                                        50) *
                                                    2
                                                  : 0,
                                          status:
                                              metricas.ot.resumen.ots_vencidas > 0
                                                  ? 'negative'
                                                  : 'positive',
                                          label:
                                              metricas.ot.resumen.ots_vencidas > 0
                                                  ? `${metricas.ot.resumen.ots_vencidas} vencidas`
                                                  : 'Sin vencidas',
                                      }
                                    : undefined
                            }
                            onClick={() => {
                                window.location.href = '/ordenes-trabajo';
                            }}
                        />
                    </div>

                    {/* Cotizaciones Período */}
                    <div className='col-span-12 sm:col-span-6 lg:col-span-3'>
                        <BalanceCard
                            title='Cotizaciones Período'
                            value={formatCompact(metricas.cotizaciones?.resumen.total_periodo)}
                            icon='HeroDocumentText'
                            color='emerald'
                            loading={metricsLoading.cotizaciones}
                            tooltip='Cotizaciones creadas en el período seleccionado'
                            comparison={
                                metricas.cotizaciones?.resumen.tasa_conversion !== undefined
                                    ? {
                                          value: metricas.cotizaciones.resumen.tasa_conversion,
                                          status:
                                              metricas.cotizaciones.resumen.tasa_conversion > 30
                                                  ? 'positive'
                                                  : metricas.cotizaciones.resumen.tasa_conversion >
                                                          15
                                                    ? 'fixed'
                                                    : 'negative',
                                          label: 'tasa conversión',
                                      }
                                    : undefined
                            }
                            onClick={() => {
                                window.location.href = '/cotizaciones';
                            }}
                        />
                    </div>

                    {/* Rendiciones por Aprobar */}
                    <div className='col-span-12 sm:col-span-6 lg:col-span-3'>
                        <BalanceCard
                            title='Pend. Aprobación'
                            value={formatCompact(
                                metricas.rendiciones?.resumen.pendientes_aprobacion,
                            )}
                            icon='HeroReceiptPercent'
                            color='amber'
                            loading={metricsLoading.rendiciones}
                            tooltip='Rendiciones de gastos pendientes de aprobación'
                            subtitle={
                                metricas.rendiciones?.resumen.monto_pendiente_aprobacion
                                    ? formatCurrency(
                                          metricas.rendiciones.resumen.monto_pendiente_aprobacion,
                                      )
                                    : undefined
                            }
                            onClick={() => {
                                window.location.href = '/rendiciones';
                            }}
                        />
                    </div>

                    {/* Indicadores Económicos - Dólar */}
                    {widgetConfig.indicadores && (
                        <div className='col-span-12 sm:col-span-6 lg:col-span-3'>
                            <BalanceCard
                                title='Dólar Observado'
                                value={
                                    indicadores?.dolar
                                        ? formatCurrency(indicadores.dolar.valor)
                                        : '-'
                                }
                                icon='HeroCurrencyDollar'
                                color='sky'
                                loading={metricsLoading.indicadores}
                                tooltip='Valor del dólar observado - Banco Central'>
                                {indicadores?.uf && (
                                    <div className='mt-2 flex items-center gap-2 text-xs text-zinc-500'>
                                        <Icon icon='HeroScale' className='text-emerald-500' />
                                        <span>UF: {formatCurrency(indicadores.uf.valor)}</span>
                                    </div>
                                )}
                            </BalanceCard>
                        </div>
                    )}
                </div>

                {/* Layout principal: 8:4 - Widgets principales + Sidebar */}
                <div className='grid grid-cols-12 gap-6'>
                    {/* Columna principal (8 cols) */}
                    <div className='col-span-12 space-y-6 lg:col-span-8'>
                        {/* Widget OT */}
                        {widgetConfig.ot && (
                            <section className='rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900'>
                                <WidgetOT />
                            </section>
                        )}

                        {/* Widget Cotizaciones */}
                        {widgetConfig.cotizaciones && (
                            <section className='rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900'>
                                <WidgetCotizaciones />
                            </section>
                        )}
                    </div>

                    {/* Sidebar (4 cols) - Mini cards + Timeline */}
                    <div className='col-span-12 flex flex-col gap-4 lg:col-span-4'>
                        {/* Mini-cards secundarias */}
                        {widgetConfig.rendiciones && <WidgetRendiciones />}
                        {widgetConfig.bodegas && <WidgetBodegas />}
                        {widgetConfig.contratos && <WidgetContratos />}
                        {widgetConfig.vacaciones && <WidgetVacaciones />}

                        {/* Timeline de actividad */}
                        {widgetConfig.actividad && <TimelineActividad limite={6} />}
                    </div>
                </div>
            </Container>
        </PageWrapper>
    );
}

export default Home;
