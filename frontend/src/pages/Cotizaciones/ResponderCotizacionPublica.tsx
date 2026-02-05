import Checkbox from '@/components/form/Checkbox';
import Textarea from '@/components/form/Textarea';
import Icon from '@/components/icon/Icon';
import type { ICotizacionPublica } from '@/interface/cotizaciones.interface';
import ApiService from '@/services/ApiService';
import { formatCurrency } from '@/utils/currency';
import { getErrorMessage } from '@/utils/errorHandlers';
import { confirmAlert } from '@/utils/sweetAlert';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';

dayjs.locale('es');

const ResponderCotizacionPublica = () => {
    const { token } = useParams();
    const navigate = useNavigate();

    const [cotizacion, setCotizacion] = useState<ICotizacionPublica | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [downloadingPdf, setDownloadingPdf] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedItemIds, setSelectedItemIds] = useState<number[]>([]);
    const [motivoRechazo, setMotivoRechazo] = useState('');
    const [motivoRechazoOtro, setMotivoRechazoOtro] = useState('');
    const [showRechazoModal, setShowRechazoModal] = useState(false);

    // Opciones predeterminadas de rechazo
    const MOTIVOS_RECHAZO = [
        'Precio fuera de presupuesto',
        'Tiempos de entrega no convenientes',
        'Se eligió otro proveedor',
        'Proyecto cancelado o pospuesto',
        'Especificaciones no cumplen requerimientos',
        'otro',
    ];

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
    const solicitanteRespuesta = cotizacion?.solicitante_respuesta ?? null;
    const aproboRespuesta = solicitanteRespuesta?.aprobo ?? null;
    const cotizacionRespondida = cotizacion?.estado === 'aceptada' || cotizacion?.estado === 'rechazada';

    const totalCalculado = useMemo(() => {
        if (!cotizacion) return null;

        // Si puede responder, calcular total de items seleccionados
        if (puedeResponder && selectedItemIds.length > 0) {
            const selectedTotal = cotizacion.items
                .filter((item) => selectedItemIds.includes(item.id))
                .reduce((sum, item) => sum + Number(item.precio_venta_total), 0);
            return selectedTotal;
        }

        // Si la cotización ya fue respondida (aceptada/rechazada), mostrar total de items aprobados
        if (cotizacionRespondida) {
            const approvedItems = cotizacion.items.filter((item) => item.aprobado);
            if (approvedItems.length > 0) {
                const approvedTotal = approvedItems.reduce(
                    (sum, item) => sum + Number(item.precio_venta_total),
                    0,
                );
                return approvedTotal;
            }
        }

        // Por defecto, mostrar total completo
        return cotizacion.total_calculado ?? cotizacion.total_estimado;
    }, [cotizacion, selectedItemIds, puedeResponder, cotizacionRespondida]);

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

    const handleDownloadPdf = async () => {
        if (!token) return;
        setDownloadingPdf(true);
        try {
            const response = await ApiService.fetchData<Blob>({
                url: `/api/public/cotizacion/${token}/pdf/`,
                method: 'get',
                responseType: 'blob',
                isLoginRequest: true,
            });

            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Cotizacion_${cotizacion?.numero_cotizacion || 'documento'}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error: unknown) {
            toast.error('Error al descargar el PDF');
        } finally {
            setDownloadingPdf(false);
        }
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

    const handleOpenRechazoModal = () => {
        setMotivoRechazo('');
        setMotivoRechazoOtro('');
        setShowRechazoModal(true);
    };

    const handleCloseRechazoModal = () => {
        setShowRechazoModal(false);
        setMotivoRechazo('');
        setMotivoRechazoOtro('');
    };

    const handleConfirmarRechazo = async () => {
        if (!token || !cotizacion) return;

        const motivoFinal = motivoRechazo === 'otro' ? motivoRechazoOtro : motivoRechazo;

        if (!motivoFinal) {
            toast.error('Por favor selecciona un motivo de rechazo.');
            return;
        }

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
                data: JSON.stringify({ motivo: motivoFinal }),
                isLoginRequest: true,
            });
            toast.success('Cotización rechazada.');
            setShowRechazoModal(false);
            await fetchCotizacion();
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
        } finally {
            setSubmitting(false);
        }
    };

    // Obtener texto de moneda para disclaimer
    const getMonedaDisclaimer = () => {
        const tipo = cotizacion?.tipo_moneda;
        if (tipo === '1') {
            return 'Valores netos expresados en USD, conversión del dólar, observado el día de la compra +$5';
        } else if (tipo === '3') {
            return 'Valores netos expresados en UF, valor UF del día de facturación';
        }
        return 'Valores netos expresados en CLP';
    };

    // Formatear fecha estilo PDF (4 de febrero de 2026)
    const formatFechaLarga = (fecha: string) => {
        return dayjs(fecha).format('D [de] MMMM [de] YYYY');
    };

    if (loading) {
        return (
            <div className='flex min-h-screen items-center justify-center bg-gray-100 dark:bg-zinc-900'>
                <div className='text-center'>
                    <div className='mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent'></div>
                    <p className='text-gray-600 dark:text-zinc-400'>Cargando cotización...</p>
                </div>
            </div>
        );
    }

    if (error || !cotizacion) {
        return (
            <div className='flex min-h-screen items-center justify-center bg-gray-100 p-4 dark:bg-zinc-900'>
                <div className='w-full max-w-md rounded-lg bg-white p-8 text-center shadow-lg dark:bg-zinc-800'>
                    <Icon icon='HeroExclamationTriangle' className='mx-auto mb-4 text-5xl text-red-500' />
                    <h2 className='mb-2 text-xl font-semibold text-red-600'>Error</h2>
                    <p className='mb-6 text-gray-600 dark:text-zinc-300'>{error || 'No se pudo cargar la cotización.'}</p>
                    <button
                        onClick={() => navigate('/login')}
                        className='rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700'>
                        Ir al inicio de sesión
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className='min-h-screen bg-gray-100 py-10 print:bg-white print:py-0 dark:bg-zinc-900'>
            {/* Contenedor principal tipo documento - ancho mayor para FullHD */}
            <div className='mx-auto max-w-6xl px-4 lg:px-8'>
                {/* Alertas superiores - más compactas */}
                {!cotizacion.es_vigente && (
                    <div className='mb-3 flex items-center gap-2 rounded-lg bg-amber-50 px-4 py-2.5 print:hidden'>
                        <Icon icon='HeroExclamationTriangle' className='h-4 w-4 text-amber-600' />
                        <p className='text-sm text-amber-700'>
                            Esta cotización venció el {dayjs(cotizacion.fecha_vencimiento).format('DD/MM/YYYY')}.
                        </p>
                    </div>
                )}

                {/* Documento principal estilo cotización */}
                <div className='overflow-hidden rounded-xl bg-white shadow-lg print:rounded-none print:shadow-none dark:bg-zinc-800'>
                    {/* ===== CONTENIDO (CARDS INTERNAS) ===== */}
                    <div className='space-y-5 p-6 sm:p-8'>
                        {/* Membrete + logo (sin card, usa el fondo del card principal) */}
                        <div className='border-b border-gray-100 pb-5 dark:border-zinc-700'>
                            <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
                                <div className='flex justify-center sm:justify-start'>
                                    {cotizacion.empresa?.logo ? (
                                        <img
                                            src={cotizacion.empresa.logo}
                                            alt={cotizacion.empresa.nombre}
                                            className='h-16 w-auto max-w-[260px] object-contain'
                                        />
                                    ) : (
                                        <div className='h-16 w-[260px]' />
                                    )}
                                </div>

                                <div className='min-w-0 flex-1'>
                                    <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                                        <div className='min-w-0'>
                                            <p className='text-lg font-semibold text-gray-900 dark:text-zinc-100'>{cotizacion.empresa?.nombre}</p>
                                            <div className='mt-1 space-y-1 text-sm text-gray-600 dark:text-zinc-400'>
                                                {cotizacion.empresa?.rut_empresa && <p>RUT: {cotizacion.empresa.rut_empresa}</p>}
                                                {cotizacion.empresa?.direccion_principal && (
                                                    <p className='break-words'>{cotizacion.empresa.direccion_principal}</p>
                                                )}
                                            </div>
                                        </div>

                                        <div className='min-w-0 sm:text-right'>
                                            <div className='space-y-1 text-sm text-gray-600 dark:text-zinc-400'>
                                                {cotizacion.empresa?.telefono && <p>Tel: {cotizacion.empresa.telefono}</p>}
                                                {cotizacion.empresa?.email && <p className='break-words'>{cotizacion.empresa.email}</p>}
                                                {cotizacion.empresa?.sitio_web && <p className='break-words'>{cotizacion.empresa.sitio_web}</p>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Card: Cotización (datos generales + cliente/solicitante + moneda) */}
                        <div className='rounded-lg border border-gray-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900'>
                            <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
                                <div className='min-w-0'>
                                    <h1 className='text-2xl font-bold !text-gray-900 dark:!text-zinc-100'>
                                        Cotización N° {cotizacion.numero_cotizacion}
                                    </h1>
                                    {cotizacion.nombre && (
                                        <p className='mt-1 text-sm text-gray-500 dark:text-zinc-400'>{cotizacion.nombre}</p>
                                    )}
                                </div>
                            </div>

                            <div className='mt-4 overflow-hidden rounded-md border border-gray-100 dark:border-zinc-700'>
                                <div className='grid grid-cols-1 divide-y divide-gray-100 lg:grid-cols-2 lg:divide-x lg:divide-y-0 dark:divide-zinc-700'>
                                    <div className='p-4'>
                                        <dl className='divide-y divide-gray-100 text-sm dark:divide-zinc-700'>
                                            <div className='grid grid-cols-1 gap-1 py-2 sm:grid-cols-[160px,1fr] sm:gap-3'>
                                                <dt className='text-gray-500 dark:text-zinc-400'>Cliente</dt>
                                                <dd className='font-medium text-gray-900 dark:text-zinc-100'>{cotizacion.cliente?.nombre || 'No especificado'}</dd>
                                            </div>

                                            <div className='grid grid-cols-1 gap-1 py-2 sm:grid-cols-[160px,1fr] sm:gap-3'>
                                                <dt className='text-gray-500 dark:text-zinc-400'>RUT</dt>
                                                <dd className='font-medium text-gray-900 dark:text-zinc-100'>{cotizacion.cliente?.rut_empresa || '—'}</dd>
                                            </div>

                                            <div className='grid grid-cols-1 gap-1 py-2 sm:grid-cols-[160px,1fr] sm:gap-3'>
                                                <dt className='text-gray-500 dark:text-zinc-400'>Solicitante</dt>
                                                <dd className='font-medium text-gray-900 dark:text-zinc-100'>
                                                    {cotizacion.solicitante?.nombre || 'No especificado'}
                                                    {cotizacion.solicitante?.email ? (
                                                        <span className='font-normal text-gray-500 dark:text-zinc-400'> ({cotizacion.solicitante.email})</span>
                                                    ) : null}
                                                </dd>
                                            </div>
                                        </dl>
                                    </div>

                                    <div className='p-4'>
                                        <dl className='divide-y divide-gray-100 text-sm dark:divide-zinc-700'>
                                            <div className='grid grid-cols-1 gap-1 py-2 sm:grid-cols-[160px,1fr] sm:gap-3'>
                                                <dt className='text-gray-500 dark:text-zinc-400'>Moneda</dt>
                                                <dd className='font-medium text-gray-900 dark:text-zinc-100'>{cotizacion.tipo_moneda_display}</dd>
                                            </div>

                                            <div className='grid grid-cols-1 gap-1 py-2 sm:grid-cols-[160px,1fr] sm:gap-3'>
                                                <dt className='text-gray-500 dark:text-zinc-400'>Emisión</dt>
                                                <dd className='font-medium text-gray-900 dark:text-zinc-100'>{formatFechaLarga(cotizacion.fecha_creacion)}</dd>
                                            </div>

                                            <div className='grid grid-cols-1 gap-1 py-2 sm:grid-cols-[160px,1fr] sm:gap-3'>
                                                <dt className='text-gray-500 dark:text-zinc-400'>Vigencia</dt>
                                                <dd className='font-medium text-gray-900 dark:text-zinc-100'>
                                                    {cotizacion.fecha_vencimiento
                                                        ? dayjs(cotizacion.fecha_vencimiento).format('DD/MM/YYYY')
                                                        : 'Sin fecha'}
                                                </dd>
                                            </div>
                                        </dl>
                                    </div>
                                </div>
                            </div>

                            {cotizacion.descripcion && (
                                <div className='mt-4 rounded-md border border-gray-100 bg-gray-50/60 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800/50'>
                                    <p className='text-sm text-gray-700 dark:text-zinc-300'>
                                        <span className='font-medium text-gray-900 dark:text-zinc-100'>Descripción:</span> {cotizacion.descripcion}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Card: Estado / acción (solo si fue aprobada o rechazada) */}
                        {cotizacionRespondida && (
                            <div className='rounded-lg border border-gray-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900'>
                                <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
                                    <div className='flex items-center gap-2'>
                                        <Icon
                                            icon={cotizacion.estado === 'aceptada' ? 'HeroCheckCircle' : 'HeroXCircle'}
                                            className={`h-5 w-5 ${
                                                cotizacion.estado === 'aceptada' ? 'text-green-600' : 'text-red-600'
                                            }`}
                                        />
                                        <div>
                                            <p className='text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-zinc-500'>Estado</p>
                                            <p className='text-base font-semibold text-gray-900 dark:text-zinc-100'>
                                                {cotizacion.estado === 'aceptada' ? 'Aprobada' : 'Rechazada'}
                                            </p>
                                        </div>
                                    </div>

                                    <span
                                        className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold ${
                                            cotizacion.estado === 'aceptada'
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-red-100 text-red-700'
                                        }`}>
                                        {cotizacion.estado === 'aceptada' ? 'Aprobada' : 'Rechazada'}
                                    </span>
                                </div>

                                {solicitanteRespuesta && (
                                    <div className='mt-4 overflow-hidden rounded-md border border-gray-100 dark:border-zinc-700'>
                                        <dl className='divide-y divide-gray-100 text-sm dark:divide-zinc-700'>
                                            <div className='grid grid-cols-1 gap-1 px-4 py-3 sm:grid-cols-[160px,1fr] sm:gap-3'>
                                                <dt className='text-gray-500 dark:text-zinc-400'>Realizada por</dt>
                                                <dd className='font-medium text-gray-900 dark:text-zinc-100'>
                                                    {solicitanteRespuesta.nombre || 'No especificado'}
                                                    {solicitanteRespuesta.email ? (
                                                        <span className='font-normal text-gray-500 dark:text-zinc-400'> ({solicitanteRespuesta.email})</span>
                                                    ) : null}
                                                </dd>
                                            </div>

                                            {solicitanteRespuesta.fecha_respuesta && (
                                                <div className='grid grid-cols-1 gap-1 px-4 py-3 sm:grid-cols-[160px,1fr] sm:gap-3'>
                                                    <dt className='text-gray-500 dark:text-zinc-400'>Fecha de acción</dt>
                                                    <dd className='font-medium text-gray-900 dark:text-zinc-100'>
                                                        {dayjs(solicitanteRespuesta.fecha_respuesta).format('DD/MM/YYYY HH:mm')}
                                                    </dd>
                                                </div>
                                            )}

                                            {aproboRespuesta === false && (
                                                <div className='grid grid-cols-1 gap-1 px-4 py-3 sm:grid-cols-[160px,1fr] sm:gap-3'>
                                                    <dt className='text-gray-500 dark:text-zinc-400'>Motivo</dt>
                                                    <dd className='mt-1 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 sm:mt-0 dark:bg-red-950/30 dark:text-red-400'>
                                                        {solicitanteRespuesta.motivo_rechazo?.trim()
                                                            ? solicitanteRespuesta.motivo_rechazo
                                                            : 'No informado'}
                                                    </dd>
                                                </div>
                                            )}
                                        </dl>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Card: Ítems */}
                        <div className='overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-zinc-700 dark:bg-zinc-900'>
                            <div className='px-5 py-4'>
                        {/* Header de sección con botón toggle */}
                        {puedeResponder && (
                            <div className='mb-3 flex items-center justify-between'>
                                <span className='text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-zinc-500'>
                                    Selecciona los ítems a aprobar
                                </span>
                                <button
                                    onClick={toggleAll}
                                    disabled={submitting}
                                    className='text-sm text-blue-600 hover:text-blue-700 hover:underline disabled:opacity-50'>
                                    {allSelected ? 'Desmarcar todos' : 'Seleccionar todos'}
                                </button>
                            </div>
                        )}

                        <div className='overflow-x-auto'>
                            <table className='w-full text-sm'>
                                <thead>
                                    <tr className='border-b border-gray-200 bg-gray-50 dark:border-zinc-700 dark:bg-zinc-800'>
                                        {puedeResponder && (
                                            <th className='w-10 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-zinc-400'></th>
                                        )}
                                        <th className='py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-zinc-400'>
                                            Descripción
                                        </th>
                                        <th className='w-20 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-zinc-400'>
                                            Cant.
                                        </th>
                                        <th className='w-36 whitespace-nowrap py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-zinc-400'>
                                            Precio Unitario Neto
                                        </th>
                                        <th className='w-36 whitespace-nowrap py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-zinc-400'>
                                            Precio Total Neto
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className='divide-y divide-gray-100 dark:divide-zinc-700'>
                                    {currentItems.map((item) => (
                                        <tr
                                            key={item.id}
                                            className={
                                                item.aprobado && cotizacionRespondida
                                                    ? 'bg-green-50 dark:bg-green-950/20'
                                                    : selectedItemIds.includes(item.id) && puedeResponder
                                                      ? 'bg-blue-50 dark:bg-blue-950/20'
                                                      : 'hover:bg-gray-50 dark:hover:bg-zinc-800'
                                            }>
                                            {puedeResponder && (
                                                <td className='py-3 text-center'>
                                                    <Checkbox
                                                        checked={selectedItemIds.includes(item.id)}
                                                        onChange={() => toggleItem(item.id)}
                                                        disabled={submitting}
                                                    />
                                                </td>
                                            )}
                                            <td className='py-3 pr-4'>
                                                <div className='font-medium text-gray-900 dark:text-zinc-100'>{item.nombre_display}</div>
                                                {item.descripcion && (
                                                    <div className='text-xs text-gray-500 dark:text-zinc-400'>{item.descripcion}</div>
                                                )}
                                            </td>
                                            <td className='py-3 text-center text-gray-600 tabular-nums dark:text-zinc-400'>
                                                {item.cantidad}
                                            </td>
                                            <td className='py-3 text-right text-gray-600 tabular-nums dark:text-zinc-400'>
                                                {formatCurrency(item.precio_venta_unitario, cotizacion.tipo_moneda)}
                                            </td>
                                            <td className='py-3 text-right font-medium text-gray-900 tabular-nums dark:text-zinc-100'>
                                                {formatCurrency(item.precio_venta_total, cotizacion.tipo_moneda)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Paginación */}
                        {totalItems > itemsPerPage && (
                            <div className='mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-3 print:hidden dark:border-zinc-700'>
                                <div className='flex items-center gap-2 text-sm text-gray-500 dark:text-zinc-400'>
                                    <select
                                        value={itemsPerPage}
                                        onChange={(e) => setItemsPerPage(Number(e.target.value))}
                                        className='rounded border border-gray-300 px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200'>
                                        <option value={5}>5</option>
                                        <option value={10}>10</option>
                                        <option value={20}>20</option>
                                        <option value={50}>50</option>
                                    </select>
                                    <span>de {totalItems}</span>
                                </div>
                                <div className='flex items-center gap-1 text-sm'>
                                    <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className='px-2 py-1 text-gray-500 hover:text-gray-700 disabled:opacity-30 dark:text-zinc-400 dark:hover:text-zinc-200'>«</button>
                                    <button onClick={() => setCurrentPage((p) => p - 1)} disabled={currentPage === 1} className='px-2 py-1 text-gray-500 hover:text-gray-700 disabled:opacity-30 dark:text-zinc-400 dark:hover:text-zinc-200'>‹</button>
                                    <span className='px-2 text-gray-600 dark:text-zinc-400'>{currentPage}/{totalPages}</span>
                                    <button onClick={() => setCurrentPage((p) => p + 1)} disabled={currentPage === totalPages} className='px-2 py-1 text-gray-500 hover:text-gray-700 disabled:opacity-30 dark:text-zinc-400 dark:hover:text-zinc-200'>›</button>
                                    <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className='px-2 py-1 text-gray-500 hover:text-gray-700 disabled:opacity-30 dark:text-zinc-400 dark:hover:text-zinc-200'>»</button>
                                </div>
                            </div>
                        )}

                        {/* Total */}
                        <div className='mt-4 flex justify-end border-t border-gray-200 pt-4 dark:border-zinc-700'>
                            <div className='text-right'>
                                <span className='text-sm text-gray-500 dark:text-zinc-400'>Total Neto</span>
                                <p className='text-xl font-bold text-gray-900 dark:text-zinc-100'>
                                    {formatCurrency(totalCalculado, cotizacion.tipo_moneda)}
                                </p>
                            </div>
                        </div>

                        <p className='mt-3 text-[11px] italic leading-snug text-gray-400 dark:text-zinc-500'>{getMonedaDisclaimer()}</p>

                        {cotizacion.observaciones && (
                            <div className='mt-4 border-t border-gray-100 pt-3 dark:border-zinc-700'>
                                <p className='text-sm text-gray-600 dark:text-zinc-300'>
                                    <span className='font-medium text-gray-700 dark:text-zinc-200'>Observaciones:</span> {cotizacion.observaciones}
                                </p>
                            </div>
                        )}
                            </div>
                        </div>

                        {/* Mensaje final (sin card, centrado dentro del card principal) */}
                        <div className='border-t border-gray-100 pt-5 text-center dark:border-zinc-700'>
                            <p className='text-sm text-gray-600 dark:text-zinc-300'>
                                Gracias por la oportunidad de ofrecerle este presupuesto. Esperamos hacer realidad este pedido para su completa satisfacción.
                            </p>
                            <p className='mt-3 text-sm'>
                                <span className='text-gray-500 dark:text-zinc-400'>Atentamente,</span>{' '}
                                <span className='font-medium text-gray-700 dark:text-zinc-200'>{cotizacion.empresa?.nombre}</span>
                            </p>
                        </div>

                        {/* Card: Responder */}
                        {puedeResponder && (
                            <div className='rounded-lg border border-blue-200 bg-blue-50 p-5 print:hidden dark:border-blue-900 dark:bg-blue-950/30'>
                                <div className='flex flex-col items-center gap-4 sm:flex-row sm:justify-center'>
                                    <button
                                        type='button'
                                        onClick={handleAprobar}
                                        disabled={submitting || selectedItemIds.length === 0}
                                        className='flex items-center gap-2 rounded-lg bg-green-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50'>
                                        <Icon icon='HeroCheckCircle' className='h-4 w-4' />
                                        Aprobar ({selectedItemIds.length})
                                    </button>
                                    <button
                                        type='button'
                                        onClick={handleOpenRechazoModal}
                                        disabled={submitting}
                                        className='flex items-center gap-2 rounded-lg border border-red-600 bg-white px-6 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-800 dark:hover:bg-zinc-700'>
                                        <Icon icon='HeroXCircle' className='h-4 w-4' />
                                        Rechazar
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Card: Descargar PDF */}
                        <div className='rounded-lg border border-gray-200 bg-gray-50 p-4 print:hidden dark:border-zinc-700 dark:bg-zinc-800'>
                            <div className='flex flex-wrap items-center justify-between gap-2'>
                                <p className='text-sm text-gray-500 dark:text-zinc-400'>
                                    Vigencia: {cotizacion.fecha_vencimiento ? dayjs(cotizacion.fecha_vencimiento).format('DD/MM/YYYY') : 'Sin fecha'}
                                </p>
                                <button
                                    onClick={handleDownloadPdf}
                                    disabled={downloadingPdf}
                                    className='flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 hover:underline disabled:opacity-50'>
                                    {downloadingPdf ? (
                                        <>
                                            <div className='h-3.5 w-3.5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent'></div>
                                            Descargando...
                                        </>
                                    ) : (
                                        <>
                                            <Icon icon='HeroArrowDownTray' className='h-3.5 w-3.5' />
                                            Descargar PDF
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ===== MODAL DE RECHAZO ===== */}
            {showRechazoModal && (
                <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4'>
                    <div className='w-full max-w-md rounded-lg bg-white shadow-xl dark:bg-zinc-800'>
                        {/* Header del modal */}
                        <div className='flex items-center justify-between border-b border-gray-200 px-5 py-3 dark:border-zinc-700'>
                            <h3 className='font-semibold text-gray-900 dark:text-zinc-100'>Rechazar cotización</h3>
                            <button
                                onClick={handleCloseRechazoModal}
                                className='rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-200'>
                                <Icon icon='HeroXMark' className='h-5 w-5' />
                            </button>
                        </div>

                        {/* Contenido del modal */}
                        <div className='px-5 py-4'>
                            <p className='mb-3 text-sm text-gray-600 dark:text-zinc-300'>
                                Selecciona el motivo del rechazo:
                            </p>

                            <div className='space-y-2'>
                                {MOTIVOS_RECHAZO.map((motivo) => (
                                    <label
                                        key={motivo}
                                        className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-all ${
                                            motivoRechazo === motivo
                                                ? 'border-red-500 bg-red-50 dark:border-red-600 dark:bg-red-950/30'
                                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 dark:border-zinc-700 dark:hover:border-zinc-600 dark:hover:bg-zinc-700'
                                        }`}>
                                        <input
                                            type='radio'
                                            name='motivoRechazo'
                                            value={motivo}
                                            checked={motivoRechazo === motivo}
                                            onChange={(e) => setMotivoRechazo(e.target.value)}
                                            className='h-4 w-4 text-red-500 focus:ring-red-500'
                                        />
                                        <span className='text-sm text-gray-700 dark:text-zinc-200'>
                                            {motivo === 'otro' ? 'Otro motivo' : motivo}
                                        </span>
                                    </label>
                                ))}
                            </div>

                            {/* Textarea para motivo personalizado */}
                            {motivoRechazo === 'otro' && (
                                <div className='mt-3'>
                                    <Textarea
                                        rows={3}
                                        value={motivoRechazoOtro}
                                        onChange={(e) => setMotivoRechazoOtro(e.target.value)}
                                        placeholder='Describe el motivo del rechazo...'
                                        className='!rounded-lg !text-sm'
                                    />
                                </div>
                            )}
                        </div>

                        {/* Footer del modal */}
                        {/* Botones del modal */}
                        <div className='flex gap-3 border-t border-gray-200 px-5 py-3 dark:border-zinc-700'>
                            <button
                                onClick={handleCloseRechazoModal}
                                className='flex-1 rounded-lg border border-gray-300 bg-white py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700'>
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirmarRechazo}
                                disabled={submitting || !motivoRechazo || (motivoRechazo === 'otro' && !motivoRechazoOtro.trim())}
                                className='flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50'>
                                {submitting ? (
                                    <div className='h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent'></div>
                                ) : (
                                    <Icon icon='HeroXCircle' className='h-4 w-4' />
                                )}
                                Confirmar rechazo
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ResponderCotizacionPublica;
