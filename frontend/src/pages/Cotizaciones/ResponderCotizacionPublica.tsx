import Checkbox from '@/components/form/Checkbox';
import Textarea from '@/components/form/Textarea';
import Icon from '@/components/icon/Icon';
import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, { SubheaderLeft, SubheaderRight } from '@/components/layouts/Subheader/Subheader';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import Table, { TBody, THead, Td, Th, Tr } from '@/components/ui/Table';
import type { ICotizacionPublica } from '@/interface/cotizaciones.interface';
import ApiService from '@/services/ApiService';
import { formatCurrency } from '@/utils/currency';
import { getErrorMessage } from '@/utils/errorHandlers';
import { confirmAlert } from '@/utils/sweetAlert';
import dayjs from 'dayjs';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';

const ResponderCotizacionPublica = () => {
    const { token } = useParams();
    const navigate = useNavigate();

    const [cotizacion, setCotizacion] = useState<ICotizacionPublica | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedItemIds, setSelectedItemIds] = useState<number[]>([]);
    const [motivoRechazo, setMotivoRechazo] = useState('');
    
    // Paginación
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const fetchCotizacion = useCallback(async () => {
        if (!token) {
            setError('Token inválido.');
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await ApiService.fetchData<ICotizacionPublica>({
                url: `/api/public/cotizacion/${token}/`,
                method: 'get',
                isLoginRequest: true,
            });
            setCotizacion(response.data);
        } catch (error: unknown) {
            setError(getErrorMessage(error));
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchCotizacion();
    }, [fetchCotizacion]);

    useEffect(() => {
        if (cotizacion?.items?.length) {
            setSelectedItemIds(cotizacion.items.map((item) => item.id));
        } else {
            setSelectedItemIds([]);
        }
    }, [cotizacion]);

    const puedeResponder = cotizacion?.solicitante?.puede_responder ?? false;
    const yaRespondio = cotizacion?.solicitante?.ya_respondio ?? false;
    const aprobo = cotizacion?.solicitante?.aprobo ?? null;

    const totalCalculado = useMemo(() => {
        if (!cotizacion) return null;
        
        // Si puede responder, calcular total de items seleccionados
        if (puedeResponder && selectedItemIds.length > 0) {
            const selectedTotal = cotizacion.items
                .filter(item => selectedItemIds.includes(item.id))
                .reduce((sum, item) => sum + Number(item.precio_venta_total), 0);
            return selectedTotal;
        }
        
        // Si ya respondió, mostrar total de items aprobados
        if (yaRespondio) {
            const approvedItems = cotizacion.items.filter(item => item.aprobado);
            if (approvedItems.length > 0) {
                const approvedTotal = approvedItems.reduce(
                    (sum, item) => sum + Number(item.precio_venta_total), 
                    0
                );
                return approvedTotal;
            }
        }
        
        // Por defecto, mostrar total completo
        return cotizacion.total_calculado ?? cotizacion.total_estimado;
    }, [cotizacion, selectedItemIds, puedeResponder, yaRespondio]);

    // Cálculos de paginación
    const totalItems = cotizacion?.items?.length || 0;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentItems = cotizacion?.items?.slice(startIndex, endIndex) || [];

    // Resetear página cuando cambia itemsPerPage
    useEffect(() => {
        setCurrentPage(1);
    }, [itemsPerPage]);

    const allSelected = cotizacion?.items?.length
        ? selectedItemIds.length === cotizacion.items.length
        : false;

    const toggleItem = (itemId: number) => {
        setSelectedItemIds((prev) =>
            prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId],
        );
    };

    const toggleAll = () => {
        if (!cotizacion?.items?.length) return;
        if (allSelected) {
            setSelectedItemIds([]);
            return;
        }
        setSelectedItemIds(cotizacion.items.map((item) => item.id));
    };

    const handleAprobar = async () => {
        if (!token || !cotizacion) return;
        if (selectedItemIds.length === 0) {
            toast.error('Selecciona al menos un ítem para aprobar.');
            return;
        }

        const confirmed = await confirmAlert({
            title: 'Aprobar cotización',
            text: '¿Confirmas la aprobación de los ítems seleccionados?',
            confirmText: 'Aprobar',
        });
        if (!confirmed) return;

        setSubmitting(true);
        try {
            await ApiService.fetchData({
                url: `/api/public/cotizacion/${token}/aprobar/`,
                method: 'post',
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify({ item_ids: selectedItemIds }),
                isLoginRequest: true,
            });
            toast.success('Cotización aprobada.');
            await fetchCotizacion();
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
        } finally {
            setSubmitting(false);
        }
    };

    const handleRechazar = async () => {
        if (!token || !cotizacion) return;

        const confirmed = await confirmAlert({
            title: 'Rechazar cotización',
            text: '¿Confirmas el rechazo de esta cotización?',
            confirmText: 'Rechazar',
        });
        if (!confirmed) return;

        setSubmitting(true);
        try {
            await ApiService.fetchData({
                url: `/api/public/cotizacion/${token}/rechazar/`,
                method: 'post',
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify({ motivo: motivoRechazo }),
                isLoginRequest: true,
            });
            toast.success('Cotización rechazada.');
            await fetchCotizacion();
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <PageWrapper isProtectedRoute={false} title='Responder cotización' name='Cotización'>
                <Subheader>
                    <SubheaderLeft>
                        <Badge className='text-xl'>Cargando...</Badge>
                    </SubheaderLeft>
                </Subheader>
                <Container>
                    <div className='flex items-center justify-center p-8'>
                        <div className='text-lg text-zinc-500'>Cargando cotización...</div>
                    </div>
                </Container>
            </PageWrapper>
        );
    }

    if (error || !cotizacion) {
        return (
            <PageWrapper isProtectedRoute={false} title='Responder cotización' name='Cotización'>
                <Subheader>
                    <SubheaderLeft>
                        <Badge className='text-xl' color='red'>
                            Error
                        </Badge>
                    </SubheaderLeft>
                </Subheader>
                <Container>
                    <Card>
                        <CardBody>
                            <div className='flex flex-col items-center gap-4 py-8'>
                                <Icon icon='HeroExclamationTriangle' className='text-4xl text-red-500' />
                                <div className='text-center text-lg text-red-500'>
                                    {error || 'No se pudo cargar la cotización.'}
                                </div>
                                <Button variant='solid' onClick={() => navigate('/login')}>
                                    Ir al inicio de sesión
                                </Button>
                            </div>
                        </CardBody>
                    </Card>
                </Container>
            </PageWrapper>
        );
    }

    return (
        <PageWrapper isProtectedRoute={false} title='Responder cotización' name='Cotización'>
            <Subheader>
                <SubheaderLeft>
                    <Badge className='text-xl'>Cotización #{cotizacion.numero_cotizacion}</Badge>
                    <Badge color='zinc'>{cotizacion.estado_display}</Badge>
                </SubheaderLeft>
            </Subheader>
            <Container>
                <div className='flex flex-col gap-4'>
                    {/* ALERTA DE VIGENCIA */}
                    {!cotizacion.es_vigente && (
                        <Card>
                            <CardBody>
                                <div className='flex items-center gap-3 rounded bg-amber-50 p-3 dark:bg-amber-950/20'>
                                    <Icon
                                        icon='HeroExclamationTriangle'
                                        className='text-lg text-amber-600'
                                    />
                                    <div className='text-sm text-amber-800 dark:text-amber-300'>
                                        Esta cotización venció el{' '}
                                        {dayjs(cotizacion.fecha_vencimiento).format('DD/MM/YYYY')}.
                                        Puedes verla, pero no responderla.
                                    </div>
                                </div>
                            </CardBody>
                        </Card>
                    )}

                    {yaRespondio && (
                        <Card>
                            <CardBody>
                                <div className='flex items-center gap-3 rounded bg-emerald-50 p-3 dark:bg-emerald-950/20'>
                                    <Icon icon='HeroCheckCircle' className='text-lg text-emerald-600' />
                                    <div className='text-sm text-emerald-800 dark:text-emerald-300'>
                                        {aprobo === true && 'Aprobaste esta cotización.'}
                                        {aprobo === false && 'Rechazaste esta cotización.'}
                                    </div>
                                </div>
                            </CardBody>
                        </Card>
                    )}

                    {/* INFORMACIÓN PRINCIPAL */}
                    <Card>
                        <CardHeader>
                            <CardHeaderChild>
                                <div className='flex items-center gap-4'>
                                    {cotizacion.empresa?.logo && (
                                        <img
                                            src={cotizacion.empresa.logo}
                                            alt={cotizacion.empresa.nombre}
                                            className='h-14 w-14 rounded-lg object-contain'
                                        />
                                    )}
                                    <div className='flex flex-col gap-1'>
                                        <span className='text-xl font-semibold'>
                                            {cotizacion.empresa?.nombre}
                                        </span>
                                        {cotizacion.empresa?.rut_empresa && (
                                            <span className='text-xs text-zinc-500'>
                                                {cotizacion.empresa.rut_empresa}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </CardHeaderChild>
                        </CardHeader>
                        <CardBody>
                            <div className='grid gap-4 md:grid-cols-4'>
                                <div>
                                    <div className='text-xs font-semibold uppercase text-zinc-500'>
                                        Cliente
                                    </div>
                                    <div className='mt-1 font-medium'>
                                        {cotizacion.cliente?.nombre}
                                    </div>
                                    {cotizacion.cliente?.rut_empresa && (
                                        <div className='text-xs text-zinc-500'>
                                            {cotizacion.cliente.rut_empresa}
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <div className='text-xs font-semibold uppercase text-zinc-500'>
                                        Fecha Creación
                                    </div>
                                    <div className='mt-1 font-medium'>
                                        {dayjs(cotizacion.fecha_creacion).format('DD/MM/YYYY')}
                                    </div>
                                </div>
                                <div>
                                    <div className='text-xs font-semibold uppercase text-zinc-500'>
                                        Vencimiento
                                    </div>
                                    <div className='mt-1 font-medium'>
                                        {cotizacion.fecha_vencimiento
                                            ? dayjs(cotizacion.fecha_vencimiento).format(
                                                  'DD/MM/YYYY',
                                              )
                                            : 'Sin fecha'}
                                    </div>
                                    {!cotizacion.es_vigente && (
                                        <Badge variant='solid' color='red' className='mt-1 text-xs'>
                                            Vencida
                                        </Badge>
                                    )}
                                </div>
                                <div>
                                    <div className='text-xs font-semibold uppercase text-zinc-500'>
                                        Moneda
                                    </div>
                                    <div className='mt-1 font-medium'>
                                        {cotizacion.tipo_moneda_display}
                                    </div>
                                </div>
                            </div>

                            <div className='mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-700'>
                                <div className='grid gap-4 md:grid-cols-2'>
                                    <div>
                                        <div className='text-xs font-semibold uppercase text-zinc-500'>
                                            Solicitante
                                        </div>
                                        <div className='mt-1 font-medium'>
                                            {cotizacion.solicitante?.nombre}
                                        </div>
                                        <div className='text-xs text-zinc-500'>
                                            {cotizacion.solicitante?.email}
                                        </div>
                                    </div>
                                    <div>
                                        <div className='text-xs font-semibold uppercase text-zinc-500'>
                                            Estado de Respuesta
                                        </div>
                                        <div className='mt-1'>
                                            {yaRespondio ? (
                                                <Badge
                                                    variant='solid'
                                                    color={aprobo ? 'emerald' : 'red'}>
                                                    {aprobo ? 'Aprobada' : 'Rechazada'}
                                                </Badge>
                                            ) : (
                                                <Badge variant='solid' color='amber'>
                                                    Pendiente
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {cotizacion.descripcion && (
                                <div className='mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-700'>
                                    <div className='text-xs font-semibold uppercase text-zinc-500'>
                                        Descripción
                                    </div>
                                    <div className='mt-1'>{cotizacion.descripcion}</div>
                                </div>
                            )}
                            {cotizacion.observaciones && (
                                <div className='mt-3 border-t border-zinc-200 pt-3 dark:border-zinc-700'>
                                    <div className='text-xs font-semibold uppercase text-zinc-500'>
                                        Observaciones
                                    </div>
                                    <div className='mt-1'>{cotizacion.observaciones}</div>
                                </div>
                            )}
                        </CardBody>
                    </Card>

                    {/* TABLA DE ÍTEMS - ELEMENTO CENTRAL */}
                    <Card>
                        <CardHeader>
                            <CardHeaderChild>
                                <Badge className='text-lg'>Ítems de la cotización</Badge>
                            </CardHeaderChild>
                            {puedeResponder && (
                                <Button
                                    variant='outline'
                                    size='sm'
                                    onClick={toggleAll}
                                    isDisable={submitting}>
                                    {allSelected ? 'Desmarcar todos' : 'Seleccionar todos'}
                                </Button>
                            )}
                        </CardHeader>
                        <CardBody>
                            <div className='overflow-x-auto'>
                                <Table>
                                    <THead>
                                        <Tr>
                                            <Th className='w-12 text-center'>
                                                {puedeResponder ? '✔' : 'Estado'}
                                            </Th>
                                            <Th>Ítem</Th>
                                            <Th className='text-right'>Cantidad</Th>
                                            <Th className='text-right'>Precio unitario</Th>
                                            <Th className='text-right'>Total</Th>
                                        </Tr>
                                    </THead>
                                    <TBody>
                                        {currentItems.map((item) => (
                                            <Tr
                                                key={item.id}
                                                className={
                                                    item.aprobado
                                                        ? 'bg-emerald-50 dark:bg-emerald-950/20'
                                                        : ''
                                                }>
                                                <Td className='text-center'>
                                                    {puedeResponder ? (
                                                        <Checkbox
                                                            checked={selectedItemIds.includes(
                                                                item.id,
                                                            )}
                                                            onChange={() => toggleItem(item.id)}
                                                        />
                                                    ) : item.aprobado ? (
                                                        <Badge variant='solid' color='emerald'>
                                                            ✓
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant='outline' color='zinc'>
                                                            —
                                                        </Badge>
                                                    )}
                                                </Td>
                                                <Td>
                                                    <div className='font-medium'>
                                                        {item.nombre_display}
                                                    </div>
                                                    {item.descripcion && (
                                                        <div className='text-sm text-zinc-500'>
                                                            {item.descripcion}
                                                        </div>
                                                    )}
                                                </Td>
                                                <Td className='text-right'>{item.cantidad}</Td>
                                                <Td className='text-right'>
                                                    {formatCurrency(
                                                        item.precio_venta_unitario,
                                                        cotizacion.tipo_moneda,
                                                    )}
                                                </Td>
                                                <Td className='text-right font-semibold'>
                                                    {formatCurrency(
                                                        item.precio_venta_total,
                                                        cotizacion.tipo_moneda,
                                                    )}
                                                </Td>
                                            </Tr>
                                        ))}
                                    </TBody>
                                </Table>
                            </div>

                            {/* CONTROLES DE PAGINACIÓN */}
                            {totalItems > 0 && (
                                <div className='mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-zinc-200 pt-4 dark:border-zinc-700'>
                                    {/* Selector de items por página */}
                                    <div className='flex items-center gap-2'>
                                        <label className='text-sm text-zinc-600 dark:text-zinc-400'>
                                            Mostrar
                                        </label>
                                        <select
                                            value={itemsPerPage}
                                            onChange={(e) => setItemsPerPage(Number(e.target.value))}
                                            className='rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800'>
                                            <option value={5}>5</option>
                                            <option value={10}>10</option>
                                            <option value={20}>20</option>
                                            <option value={30}>30</option>
                                        </select>
                                        <span className='text-sm text-zinc-600 dark:text-zinc-400'>
                                            de {totalItems} ítems
                                        </span>
                                    </div>

                                    {/* Controles de navegación */}
                                    <div className='flex items-center gap-2'>
                                        <Button
                                            variant='outline'
                                            size='sm'
                                            onClick={() => setCurrentPage(1)}
                                            isDisable={currentPage === 1}
                                            icon='HeroChevronDoubleLeft'
                                        />
                                        <Button
                                            variant='outline'
                                            size='sm'
                                            onClick={() => setCurrentPage((prev) => prev - 1)}
                                            isDisable={currentPage === 1}
                                            icon='HeroChevronLeft'
                                        />
                                        <span className='text-sm text-zinc-600 dark:text-zinc-400'>
                                            Página <strong>{currentPage}</strong> de{' '}
                                            <strong>{totalPages}</strong>
                                        </span>
                                        <Button
                                            variant='outline'
                                            size='sm'
                                            onClick={() => setCurrentPage((prev) => prev + 1)}
                                            isDisable={currentPage === totalPages}
                                            icon='HeroChevronRight'
                                        />
                                        <Button
                                            variant='outline'
                                            size='sm'
                                            onClick={() => setCurrentPage(totalPages)}
                                            isDisable={currentPage === totalPages}
                                            icon='HeroChevronDoubleRight'
                                        />
                                    </div>
                                </div>
                            )}

                            <div className='mt-6 flex justify-end border-t border-zinc-200 pt-4 dark:border-zinc-700'>
                                <div className='text-right'>
                                    <div className='text-sm text-zinc-500'>Total Cotización</div>
                                    <div className='text-2xl font-bold'>
                                        {formatCurrency(totalCalculado, cotizacion.tipo_moneda)}
                                    </div>
                                </div>
                            </div>
                        </CardBody>
                    </Card>

                    {/* SECCIÓN DE RESPUESTA - COMPACTA */}
                    {puedeResponder && (
                        <Card>
                            <CardHeader>
                                <CardHeaderChild>
                                    <Badge className='text-base'>Responder</Badge>
                                </CardHeaderChild>
                            </CardHeader>
                            <CardBody>
                                <div className='grid gap-4 md:grid-cols-[1fr_auto]'>
                                    <div>
                                        <label className='mb-1.5 block text-xs font-semibold uppercase text-zinc-500'>
                                            Motivo de rechazo (opcional)
                                        </label>
                                        <Textarea
                                            rows={3}
                                            value={motivoRechazo}
                                            onChange={(event) =>
                                                setMotivoRechazo(event.target.value)
                                            }
                                            placeholder='Escribe un motivo si deseas rechazar...'
                                            disabled={submitting}
                                            className='!text-sm'
                                        />
                                    </div>
                                    <div className='flex flex-col justify-end gap-2 min-w-[160px]'>
                                        <button
                                            type='button'
                                            onClick={handleAprobar}
                                            disabled={submitting}
                                            className='flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap'>
                                            <Icon icon='HeroCheckCircle' className='h-4 w-4' />
                                            Aprobar
                                        </button>
                                        <button
                                            type='button'
                                            onClick={handleRechazar}
                                            disabled={submitting}
                                            className='flex items-center justify-center gap-1.5 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap'>
                                            <Icon icon='HeroXCircle' className='h-4 w-4' />
                                            Rechazar
                                        </button>
                                    </div>
                                </div>
                            </CardBody>
                        </Card>
                    )}
                </div>
            </Container>
        </PageWrapper>
    );
};

export default ResponderCotizacionPublica;
