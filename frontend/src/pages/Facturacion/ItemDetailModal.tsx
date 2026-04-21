import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal, { ModalBody, ModalFooter, ModalHeader } from '@/components/ui/Modal';
import ApiService from '@/services/ApiService';
import { getErrorMessage } from '@/utils/errorHandlers';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import React, { useEffect, useState } from 'react';

interface PrefacturaItem {
    ot_id?: number;
    id?: number;
    item_id?: number;
    tipo?: string;
    cantidad?: number;
    precio_total?: number;
    precio_ajustado?: number | null;
    facturar?: boolean;
    comentario?: string;
    nombre?: string;
    guia_id?: number;
    rendicion_id?: number;
    stock_item_id?: number | null;
    compra_id?: number;
    parent_id?: number;
    orden_trabajo_id?: number;
    orden_trabajo?: number;
    item_rendicion_id?: number;
    [n: string]: any;
}

type GastoResponse = {
    categoria?: { nombre?: string } | string | null;
    nombre_categoria?: string;
    categoria_nombre?: string;
    cantidad?: number;
    cantidad_gasto?: number;
    cantidad_items?: number;
    monto_unitario?: number;
    precio_unitario?: number;
    unitario?: number;
    monto_total?: number;
    total?: number;
    monto?: number;
    detalle?: string;
    descripcion?: string;
    fecha_gasto?: string;
    fecha_compra?: string;
    fecha?: string;
};

interface Props {
    open: boolean;
    onClose: () => void;
    item: PrefacturaItem | null;
}

// Normalizar item para usar item_id consistentemente (con fallback a id legacy)
const normalizePrefacturaItem = (item: PrefacturaItem | null): PrefacturaItem | null => {
    if (!item) return null;
    return {
        ...item,
        item_id: item.item_id ?? (typeof item.id === 'number' ? item.id : undefined),
    };
};

const ItemDetailModal: React.FC<Props> = ({ open, onClose, item: rawItem }) => {
    const item = normalizePrefacturaItem(rawItem);
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [itemsGuia, setItemsGuia] = useState<any[]>([]);
    const [loadingItems, setLoadingItems] = useState(false);
    const [seguimientos, setSeguimientos] = useState<any[]>([]);
    const [loadingSeguimientos, setLoadingSeguimientos] = useState(false);
    const [expandVinculados, setExpandVinculados] = useState(false);
    const [vinculados, setVinculados] = useState<any[]>([]);
    const [seriesModalOpen, setSeriesModalOpen] = useState(false);
    const [seriesModalTitle, setSeriesModalTitle] = useState('Series asociadas');
    const [seriesModalItems, setSeriesModalItems] = useState<string[]>([]);

    const handleOpenSeriesModal = (series: string[], title: string) => {
        setSeriesModalItems(series);
        setSeriesModalTitle(title);
        setSeriesModalOpen(true);
    };

    // Reset estado cuando el modal se cierra
    useEffect(() => {
        if (!open) {
            setData(null);
            setSeguimientos([]);
            setVinculados([]);
            setExpandVinculados(false);
            setError(null);
            setLoading(false);
            setLoadingSeguimientos(false);
        }
    }, [open]);

    useEffect(() => {
        let mounted = true;
        const buildFallback = () => {
            const subtotal = item?.precio_total ?? item?.precio_ajustado ?? 0;
            const cantidad = item?.cantidad ?? 1;
            const montoUnitario = cantidad ? subtotal / cantidad : subtotal;
            return {
                nombre_categoria:
                    item?.categoria_nombre ||
                    (item?.categoria && typeof item.categoria === 'object'
                        ? item.categoria.nombre
                        : item?.categoria) ||
                    'Gasto Operativo',
                descripcion: item?.descripcion,
                cantidad,
                monto_unitario: montoUnitario,
                monto_total: subtotal,
                fecha_gasto: item?.fecha_gasto || item?.fecha || item?.fecha_compra || null,
            };
        };

        const fetchGastoOperativoDetalle = async () => {
            const candidateIds = new Set<number>();
            const pushId = (value: number | string | undefined | null) => {
                if (value === null || value === undefined) return;
                const parsed = typeof value === 'number' ? value : parseInt(value, 10);
                if (Number.isInteger(parsed) && parsed > 0) {
                    candidateIds.add(parsed);
                }
            };
            pushId(item?.item_id);
            pushId(item?.parent_id);
            pushId(item?.item_rendicion_id);
            pushId(item?.id);

            if (candidateIds.size === 0) {
                return buildFallback();
            }

            const endpoints = new Set<string>();
            const addEndpoint = (url: string | null) => {
                if (url) {
                    endpoints.add(url);
                }
            };
            const ct = (item?.content_type ?? '').toLowerCase();
            const otId = item?.ot_id;
            candidateIds.forEach((candidate) => {
                if (ct === 'rendiciones.detallegastorendicion') {
                    addEndpoint(`/api/detalles-gasto/${candidate}/`);
                } else if (ct === 'ordentrabajov2.gastooperativoenot') {
                    addEndpoint(
                        otId
                            ? `/api/ordenes-de-trabajo/${otId}/gastos-operativos/${candidate}/`
                            : null,
                    );
                    addEndpoint(`/api/gastos-operativos/${candidate}/`);
                } else {
                    addEndpoint(
                        otId
                            ? `/api/ordenes-de-trabajo/${otId}/gastos-operativos/${candidate}/`
                            : null,
                    );
                    addEndpoint(`/api/gastos-operativos/${candidate}/`);
                    addEndpoint(`/api/detalles-gasto/${candidate}/`);
                }
            });

            if (endpoints.size === 0) {
                return buildFallback();
            }

            for (const url of endpoints) {
                try {
                    const resp = await ApiService.fetchData({ url, method: 'get' });
                    if (resp?.data) {
                        const gastoResp = resp.data as GastoResponse;
                        const categoria = gastoResp.categoria;
                        const categoriaNombre =
                            typeof categoria === 'object' &&
                            categoria !== null &&
                            'nombre' in categoria
                                ? categoria.nombre
                                : typeof categoria === 'string'
                                  ? categoria
                                  : null;
                        const categoryName =
                            categoriaNombre ||
                            gastoResp.nombre_categoria ||
                            gastoResp.categoria_nombre ||
                            'Gasto Operativo';
                        const cantidad =
                            gastoResp.cantidad ??
                            gastoResp.cantidad_gasto ??
                            gastoResp.cantidad_items ??
                            1;
                        const montoUnitario = Number(
                            gastoResp.monto_unitario ??
                                gastoResp.precio_unitario ??
                                gastoResp.unitario ??
                                0,
                        );
                        const montoTotal = Number(
                            gastoResp.monto_total ?? gastoResp.total ?? gastoResp.monto ?? 0,
                        );
                        return {
                            nombre_categoria: categoryName,
                            descripcion: gastoResp.detalle || gastoResp.descripcion,
                            cantidad,
                            monto_unitario: montoUnitario,
                            monto_total: montoTotal,
                            fecha_gasto:
                                gastoResp.fecha_gasto ||
                                gastoResp.fecha_compra ||
                                gastoResp.fecha ||
                                null,
                        };
                    }
                } catch (error: unknown) {
                }
            }

            return buildFallback();
        };
        const fetchDetail = async () => {
            if (!item || !open) return;
            if (loading) return;

            setError(null);
            setData(null);
            setSeguimientos([]);
            setLoading(true);
            try {
                const tipo = item.tipo;
                const itemId = item.item_id;
                if (
                    (tipo === 'servicio_ot' || tipo === 'soporte_tecnico') &&
                    item.ot_id &&
                    itemId
                ) {
                    const endpoint =
                        tipo === 'soporte_tecnico' ? 'soportes-tecnicos' : 'servicios-generales';
                    const url = `/api/ordenes-de-trabajo/${item.ot_id}/${endpoint}/${itemId}/`;
                    const resp = await ApiService.fetchData({ url, method: 'get' });
                    if (!mounted) return;
                    setData(resp.data);

                    if (tipo === 'soporte_tecnico') {
                        try {
                            const usuariosUrl = `/api/ordenes-de-trabajo/${item.ot_id}/soportes-tecnicos/${itemId}/usuarios-asignados/`;
                            const usuariosResp = await ApiService.fetchData({
                                url: usuariosUrl,
                                method: 'get',
                            });
                            if (mounted) {
                                setVinculados(
                                    Array.isArray(usuariosResp.data) ? usuariosResp.data : [],
                                );
                            }
                        } catch (error: unknown) {
                            if (mounted) setVinculados([]);
                        }
                    }

                    // Seguimientos
                    setLoadingSeguimientos(true);
                    try {
                        const segUrl = `/api/ordenes-de-trabajo/${item.ot_id}/${endpoint}/${itemId}/seguimientos/`;
                        const segResp = await ApiService.fetchData({ url: segUrl, method: 'get' });
                        if (mounted) {
                            const seguimientosFiltrados = (
                                Array.isArray(segResp.data) ? segResp.data : []
                            ).filter((seg: any) => seg.tipo !== 'actualizacion');
                            setSeguimientos(seguimientosFiltrados);
                        }
                    } catch (error: unknown) {
                    } finally {
                        if (mounted) setLoadingSeguimientos(false);
                    }
                } else if (tipo === 'guia_salida') {
                    // Determine guia id: prefer explicit parent_id/guia_id; if missing,
                    // try to resolve it by fetching the ItemsGuia record for this item
                    let guiaId: number | null =
                        (item as any).parent_id ?? (item as any).guia_id ?? null;

                    // If guia id was not provided but we have an item id, try to fetch the items-guia record
                    if (!guiaId && itemId) {
                        try {
                            const itemResp: any = await ApiService.fetchData({
                                url: `/api/items-guia/${itemId}/`,
                                method: 'get',
                            });
                            if (!mounted) return;
                            guiaId = itemResp.data?.guia?.id ?? null;
                            // If items-guia returned, keep it as part of itemsGuia (single entry) to help rendering
                            if (itemResp.data) {
                                setItemsGuia([itemResp.data]);
                            }
                        } catch (error: unknown) {
                            // Couldn't resolve via items-guia; leave guiaId null and let the later logic handle it
                        }
                    }

                    if (!guiaId) {
                        // No guia found for this item
                        if (!mounted) return;
                        setError('No se encontró la Guía asociada a este ítem');
                        setData(null);
                    } else {
                        try {
                            const resp: any = await ApiService.fetchData({
                                url: `/api/guia-salida/${guiaId}/`,
                                method: 'get',
                            });
                            if (!mounted) return;
                            setData(resp.data);
                            // Extraer items de la respuesta si existen
                            if (resp.data?.items && Array.isArray(resp.data.items)) {
                                setItemsGuia(resp.data.items);
                            }
                        } catch (error: unknown) {
                            if (!mounted) return;
                            setError(getErrorMessage(error) || 'No se pudo cargar la Guía');
                        }
                    }
                } else if (
                    (tipo === 'rendicion_gasto' || tipo === 'compra_material') &&
                    (item.rendicion_id || itemId)
                ) {
                    const rendId = item.rendicion_id ?? itemId;
                    const resp = await ApiService.fetchData({
                        url: `/api/rendiciones/${rendId}/`,
                        method: 'get',
                    });
                    if (!mounted) return;
                    setData(resp.data);
                } else if (tipo === 'compra') {
                    const compraId = item.compra_id ?? item.parent_id ?? item.item_id ?? item.id;

                    if (!compraId) {
                        setError('No se pudo determinar la compra asociada');
                        return;
                    }

                    // Fetch compra detail using compra_id/parent_id fallback
                    try {
                        const compraResp = await ApiService.fetchData({
                            url: `/api/compras/${compraId}/`,
                            method: 'get',
                        });
                        if (!mounted) return;
                        setData(compraResp.data);
                    } catch (error: unknown) {
                        setError('No se pudo cargar el detalle de la compra');
                    }
                } else if (tipo === 'gasto_operativo') {
                    const gastoDetail = await fetchGastoOperativoDetalle();
                    if (!mounted) return;
                    setData(gastoDetail);
                } else {
                    setData(null);
                }
            } catch (error: unknown) {
                if (!mounted) return;
                setError(getErrorMessage(error) || 'Error al obtener detalle');
            } finally {
                if (mounted) setLoading(false);
            }
        };

        if (open && item) fetchDetail();
        return () => {
            mounted = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, item?.item_id, item?.id, item?.tipo, item?.ot_id]); // Usar propiedades primitivas, no el objeto completo

    // Sección "Datos de Prefactura" eliminada - la información ya está visible en la tabla principal

    const renderTrabajoDetail = () => {
        if (!data) return null;
        const tipo = item?.tipo;
        if (tipo !== 'servicio_ot' && tipo !== 'soporte_tecnico') return null;

        const estadoBadgeColor = (estado: string) => {
            switch (estado) {
                case 'completado':
                case 'completada':
                    return 'emerald';
                case 'en_proceso':
                case 'asignado':
                    return 'blue';
                case 'pendiente':
                    return 'amber';
                default:
                    return 'gray';
            }
        };

        const tipoLabel = tipo === 'soporte_tecnico' ? 'Soporte Técnico' : 'Servicio General';

        return (
            <div className='space-y-4'>
                {/* Header del trabajo */}
                <div className='rounded-lg border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-4 shadow-sm'>
                    <div className='mb-3 border-b border-blue-200 pb-2'>
                        <span className='text-sm font-semibold uppercase tracking-wide text-blue-700'>
                            {tipoLabel}
                        </span>
                    </div>
                    <div className='grid grid-cols-2 gap-4'>
                        <div>
                            <Badge className='mb-1'>Solicitud</Badge>
                            <div className='ml-4 text-base font-medium text-gray-900 dark:text-gray-100'>
                                {data.nombre || 'Sin nombre'}
                            </div>
                        </div>
                        <div>
                            <Badge className='mb-1'>Estado</Badge>
                            <div className='ml-4 mt-1'>
                                <Badge
                                    variant='solid'
                                    color={estadoBadgeColor(data.estado || data.estado_label)}
                                    className='text-sm'>
                                    {data.estado_label || data.estado || 'Sin estado'}
                                </Badge>
                            </div>
                        </div>
                        <div>
                            <Badge className='mb-1'>Técnico Asignado</Badge>
                            <div className='ml-4 text-sm text-gray-700 dark:text-gray-300'>
                                {data.nombre_tecnico || data.tecnico_asignado ? (
                                    <span className='font-medium'>
                                        {data.nombre_tecnico || 'Asignado'}
                                    </span>
                                ) : (
                                    <span className='italic text-gray-400 dark:text-gray-300'>Sin Técnico</span>
                                )}
                            </div>
                        </div>
                        <div>
                            <Badge className='mb-1'>Fecha trabajo</Badge>
                            <div className='ml-4 text-sm text-gray-700 dark:text-gray-300'>
                                {data.fecha_servicio || data.fecha_trabajo ? (
                                    <span className='font-medium'>
                                        {dayjs(data.fecha_servicio || data.fecha_trabajo)
                                            .locale('es')
                                            .format('DD/MM/YYYY')}
                                    </span>
                                ) : (
                                    <span className='italic text-gray-400 dark:text-gray-300'>Sin fecha</span>
                                )}
                            </div>
                        </div>
                    </div>
                    {/* Descripción si existe */}
                    {(data.descripcion || data.descripcion_corta) && (
                        <div className='mt-3 rounded bg-white dark:bg-zinc-900 p-3 shadow-sm'>
                            <div className='mb-1 text-xs font-medium text-gray-600 dark:text-gray-400 dark:text-gray-300'>
                                📝 Descripción
                            </div>
                            <div className='text-sm text-gray-700 dark:text-gray-300'>
                                {data.descripcion || data.descripcion_corta}
                            </div>
                        </div>
                    )}
                </div>

                {/* Seguimientos */}
                <div className='rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 shadow-sm'>
                    <div className='mb-4 flex items-center gap-2 border-b border-gray-200 dark:border-zinc-700 pb-2'>
                        <span className='text-sm font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300'>
                            Seguimientos del Trabajo
                        </span>
                        <Badge color='gray' variant='outline' className='ml-auto'>
                            {seguimientos.length}
                        </Badge>
                    </div>
                    <div className='max-h-72 space-y-3 overflow-auto'>
                        {loadingSeguimientos ? (
                            <div className='flex items-center justify-center py-8'>
                                <div className='text-sm text-gray-500 dark:text-gray-400 dark:text-gray-300'>
                                    Cargando seguimientos...
                                </div>
                            </div>
                        ) : seguimientos.length > 0 ? (
                            seguimientos.map((seg, idx) => {
                                const tipoConfig: Record<
                                    string,
                                    {
                                        color: 'red' | 'blue' | 'violet' | 'zinc';
                                        bgColor: string;
                                        borderColor: string;
                                        icon: string;
                                    }
                                > = {
                                    incidencia: {
                                        color: 'red',
                                        bgColor: 'bg-red-50',
                                        borderColor: 'border-l-red-500',
                                        icon: '⚠️',
                                    },
                                    comentario_tecnico: {
                                        color: 'blue',
                                        bgColor: 'bg-blue-50',
                                        borderColor: 'border-l-blue-500',
                                        icon: '�',
                                    },
                                    comunicacion_usuario: {
                                        color: 'violet',
                                        bgColor: 'bg-violet-50',
                                        borderColor: 'border-l-violet-500',
                                        icon: '📢',
                                    },
                                    default: {
                                        color: 'zinc',
                                        bgColor: 'bg-gray-50 dark:bg-zinc-800',
                                        borderColor: 'border-l-gray-500',
                                        icon: '📝',
                                    },
                                };
                                const config =
                                    tipoConfig[seg.tipo as keyof typeof tipoConfig] ||
                                    tipoConfig.default;

                                const tipoLabelMap: Record<string, string> = {
                                    comentario_tecnico: 'Comentario Técnico',
                                    incidencia: 'Incidencia',
                                    comunicacion_usuario: 'Comunicación al Usuario',
                                    actualizacion: 'Actualización',
                                };
                                const tipoLabel = tipoLabelMap[seg.tipo] || seg.tipo;

                                return (
                                    <div
                                        key={seg.id || idx}
                                        className={`rounded border-l-4 bg-white dark:bg-zinc-900 p-3 shadow-sm transition-all hover:shadow-md ${config.borderColor}`}>
                                        <div className='mb-2 flex items-center gap-2'>
                                            <span className='text-base'>{config.icon}</span>
                                            <Badge
                                                color={config.color}
                                                variant='solid'
                                                className='text-xs font-semibold uppercase'>
                                                {tipoLabel}
                                            </Badge>
                                            {idx === 0 && (
                                                <span className='ml-auto text-xs font-semibold uppercase tracking-wide text-emerald-600'>
                                                    ✓ Más reciente
                                                </span>
                                            )}
                                        </div>
                                        <div className='text-sm text-gray-700 dark:text-gray-300'>
                                            {seg.comentario}
                                        </div>
                                        <div className='mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 dark:text-gray-300'>
                                            {seg.usuario_nombre && (
                                                <span>👤 {seg.usuario_nombre}</span>
                                            )}
                                            <span className='ml-auto'>
                                                {dayjs(seg.fecha_creacion)
                                                    .locale('es')
                                                    .format('DD/MM/YY HH:mm')}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className='py-8 text-center text-sm text-gray-500 dark:text-gray-400 dark:text-gray-300'>
                                Sin seguimientos
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const renderGuiaDetail = () => {
        if (!data) return null;
        const tipo = item?.tipo;
        if (tipo !== 'guia_salida') return null;

        const estadoBadgeColor = (estado: string) => {
            switch (estado) {
                case 'E': // Entregada
                case 'FR': // Firmada
                    return 'emerald';
                case 'P': // Pendiente
                    return 'amber';
                case 'C': // Cancelada
                    return 'red';
                default:
                    return 'gray';
            }
        };

        const estadoLabel = (estado: string) => {
            const labels: Record<string, string> = {
                P: 'Pendiente',
                E: 'Entregada',
                FR: 'Firmada',
                C: 'Cancelada',
            };
            return labels[estado] || estado;
        };

        return (
            <div className='space-y-4'>
                {/* Header de la guía */}
                <div className='rounded-lg border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-4 shadow-sm'>
                    <div className='mb-3 border-b border-amber-200 pb-2'>
                        <span className='text-sm font-semibold uppercase tracking-wide text-amber-700'>
                            GUÍA DE SALIDA
                        </span>
                    </div>
                    <div className='grid grid-cols-2 gap-4'>
                        <div>
                            <Badge className='mb-1'>Estado</Badge>
                            <div className='ml-4 mt-1'>
                                <Badge
                                    variant='solid'
                                    color={estadoBadgeColor(data.estado)}
                                    className='text-sm'>
                                    {data.estado_label || estadoLabel(data.estado)}
                                </Badge>
                            </div>
                        </div>
                        {data.nombre_creado_por && (
                            <div>
                                <Badge className='mb-1'>Creado Por</Badge>
                                <div className='ml-4 text-sm text-gray-700 dark:text-gray-300'>
                                    {data.nombre_creado_por}
                                </div>
                            </div>
                        )}
                        {data.nombre_recibido_por && (
                            <div>
                                <Badge className='mb-1'>Recibido Por</Badge>
                                <div className='ml-4 text-sm text-gray-700 dark:text-gray-300'>
                                    {data.nombre_recibido_por}
                                </div>
                            </div>
                        )}
                        {data.cliente_nombre && (
                            <div>
                                <Badge className='mb-1'>Cliente</Badge>
                                <div className='ml-4 text-sm text-gray-700 dark:text-gray-300'>
                                    {data.cliente_nombre}
                                </div>
                            </div>
                        )}
                        {data.motivo && (
                            <div className='col-span-2'>
                                <Badge className='mb-1'>Motivo</Badge>
                                <div className='ml-4 text-sm text-gray-700 dark:text-gray-300'>
                                    {data.motivo || 'Sin motivo'}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Items en la guía (renombrado a Item de la guía) */}
                <div className='rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 shadow-sm'>
                    <div className='mb-3 border-b border-gray-200 dark:border-zinc-700 pb-2'>
                        <span className='text-sm font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400 dark:text-gray-300'>
                            ITEM DE LA GUÍA
                        </span>
                    </div>
                    {itemsGuia.length === 0 ? (
                        <div className='py-8 text-center text-sm text-gray-500 dark:text-gray-400 dark:text-gray-300'>
                            Sin items en esta guía
                        </div>
                    ) : (
                        <div className='overflow-x-auto'>
                            <table className='min-w-full divide-y divide-gray-200 dark:divide-zinc-700'>
                                <thead className='bg-gray-50 dark:bg-zinc-800'>
                                    <tr>
                                        <th className='px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-300'>
                                            Item
                                        </th>
                                        <th className='px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-300'>
                                            Cantidad Original
                                        </th>
                                        <th className='px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-300'>
                                            Cantidad Rebajada
                                        </th>
                                        <th className='px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-300'>
                                            Cantidad Devuelta
                                        </th>
                                        <th className='px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-300'>
                                            Serializado
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className='divide-y divide-gray-200 dark:divide-zinc-700 bg-white dark:bg-zinc-900'>
                                    {itemsGuia.map((itemGuia: any, idx: number) => (
                                        <tr key={itemGuia.id || idx} className='hover:bg-gray-50 dark:hover:bg-zinc-800'>
                                            <td className='whitespace-nowrap px-3 py-2 text-sm text-gray-900 dark:text-gray-100'>
                                                {itemGuia.datos_stock?.datos_item?.nombre ||
                                                    `Item ${itemGuia.id}`}
                                            </td>
                                            <td className='whitespace-nowrap px-3 py-2 text-sm text-gray-700 dark:text-gray-300'>
                                                {itemGuia.cantidad_original ?? '—'}
                                            </td>
                                            <td className='whitespace-nowrap px-3 py-2 text-sm text-gray-700 dark:text-gray-300'>
                                                {itemGuia.cantidad_rebajada ?? '—'}
                                            </td>
                                            <td className='whitespace-nowrap px-3 py-2 text-sm text-gray-700 dark:text-gray-300'>
                                                {itemGuia.cantidad_devuelta ?? 0}
                                            </td>
                                            <td className='whitespace-nowrap px-3 py-2 text-sm'>
                                                {(() => {
                                                    const isSerializado =
                                                        !!itemGuia.individualizado ||
                                                        (Boolean(itemGuia.numero_serie) &&
                                                            Object.keys(itemGuia.numero_serie || {})
                                                                .length > 0) ||
                                                        (Boolean(
                                                            itemGuia.datos_stock?.numeros_series,
                                                        ) &&
                                                            itemGuia.datos_stock.numeros_series
                                                                .length > 0);
                                                    const seriesList: string[] =
                                                        itemGuia.datos_stock?.numeros_series ?? [];
                                                    return (
                                                        <div className='flex flex-col gap-2'>
                                                            <span
                                                                className={
                                                                    isSerializado
                                                                        ? 'text-sm font-medium text-gray-900 dark:text-gray-100'
                                                                        : 'text-sm text-gray-500 dark:text-gray-400 dark:text-gray-300'
                                                                }>
                                                                {isSerializado ? 'Sí' : 'No'}
                                                            </span>
                                                            {seriesList.length > 0 && (
                                                                <Button
                                                                    size='xs'
                                                                    color='violet'
                                                                    variant='outline'
                                                                    onClick={() => {
                                                                        const title = itemGuia.datos_stock?.datos_item?.nombre
                                                                            ? `Series de ${itemGuia.datos_stock.datos_item.nombre}`
                                                                            : itemGuia.id
                                                                            ? `Series de item ${itemGuia.id}`
                                                                            : 'Series asociadas';
                                                                        handleOpenSeriesModal(seriesList, title);
                                                                    }}>
                                                                    Ver series
                                                                </Button>
                                                            )}
                                                        </div>
                                                    );
                                                })()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderVinculados = () => {
        if (!data) return null;
        const tipo = item?.tipo;
        const vinculados = data.vinculados;

        // Solo para soportes técnicos que tengan usuarios vinculados
        if (tipo !== 'soporte_tecnico' || !vinculados || vinculados.length === 0) return null;

        return (
            <div className='rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 shadow-sm'>
                <div className='mb-3 flex items-center justify-between border-b border-gray-200 dark:border-zinc-700 pb-2'>
                    <span className='text-sm font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300'>
                        Usuarios Vinculados
                    </span>
                    <button
                        onClick={() => setExpandVinculados(!expandVinculados)}
                        className='flex items-center gap-1 text-violet-600 transition-colors hover:text-violet-700'>
                        <span className='text-lg'>👁️</span>
                        <Badge color='violet' variant='outline' className='text-xs'>
                            {vinculados.length}
                        </Badge>
                    </button>
                </div>

                {expandVinculados && (
                    <div className='space-y-2'>
                        {vinculados.map((usuario: any, idx: number) => (
                            <div
                                key={usuario.id || idx}
                                className='rounded border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 p-3 transition-colors hover:bg-gray-100 dark:hover:bg-zinc-800'>
                                <div className='flex items-start justify-between gap-3'>
                                    <div className='flex-1'>
                                        <div className='font-medium text-gray-900 dark:text-gray-100'>
                                            {usuario.nombre_usuario || usuario.nombre || '—'}
                                        </div>
                                        {usuario.numero_serie_equipo && (
                                            <div className='mt-1 text-xs text-gray-500 dark:text-gray-400 dark:text-gray-300'>
                                                📱 {usuario.numero_serie_equipo}
                                            </div>
                                        )}
                                        {usuario.tipo_equipo && (
                                            <div className='text-xs text-gray-500 dark:text-gray-400 dark:text-gray-300'>
                                                {usuario.tipo_equipo}
                                            </div>
                                        )}
                                    </div>
                                    <div className='text-right'>
                                        {usuario.resuelto !== undefined && (
                                            <Badge
                                                color={usuario.resuelto ? 'emerald' : 'amber'}
                                                variant='solid'
                                                className='text-xs'>
                                                {usuario.resuelto ? '✓ Resuelto' : 'Pendiente'}
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                                {usuario.trabajo_realizado && (
                                    <div className='mt-2 text-xs italic text-gray-600 dark:text-gray-400 dark:text-gray-300'>
                                        "{usuario.trabajo_realizado}"
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const renderCompraDetail = () => {
        if (!data) return null;
        const tipo = item?.tipo;
        if (tipo !== 'compra') return null;

        const itemsCompra = data.itemencompra_set || [];

        const estadoBadgeColor = (estado: string) => {
            switch (estado) {
                case '1': // Completada
                case 'C':
                    return 'emerald';
                case '-': // Pendiente
                case 'P':
                    return 'amber';
                case '0': // Cancelada
                case 'X':
                    return 'red';
                default:
                    return 'gray';
            }
        };

        const estadoLabel = (estado: string) => {
            const labels: Record<string, string> = {
                '-': 'Pendiente',
                '0': 'Cancelada',
                '1': 'Completada',
                P: 'Pendiente',
                C: 'Completada',
                X: 'Cancelada',
            };
            return labels[estado] || data.estado_label || estado;
        };

        return (
            <div className='space-y-4'>
                {/* Header de la compra */}
                <div className='rounded-lg border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-4 shadow-sm'>
                    <div className='mb-3 border-b border-violet-200 pb-2'>
                        <span className='text-sm font-semibold uppercase tracking-wide text-violet-700'>
                            DETALLE COMPRA
                        </span>
                    </div>

                    {/* Primera fila: Código, Fecha, Comprador */}
                    <div className='mb-4 grid grid-cols-2 gap-4'>
                        <div>
                            <Badge className='mb-1'>Código</Badge>
                            <div className='ml-4 text-sm font-medium text-gray-900 dark:text-gray-100'>
                                {data.codigo || '—'}
                            </div>
                        </div>
                        <div>
                            <Badge className='mb-1'>Estado</Badge>
                            <div className='ml-4 mt-1'>
                                <Badge
                                    variant='solid'
                                    color={estadoBadgeColor(data.estado)}
                                    className='text-sm'>
                                    {estadoLabel(data.estado)}
                                </Badge>
                            </div>
                        </div>
                        <div>
                            <Badge className='mb-1'>Fecha Compra</Badge>
                            <div className='ml-4 text-sm text-gray-700 dark:text-gray-300'>
                                {data.fecha_compra
                                    ? new Date(data.fecha_compra).toLocaleDateString('es-CL')
                                    : '—'}
                            </div>
                        </div>
                        <div>
                            <Badge className='mb-1'>Total</Badge>
                            <div className='ml-4 text-sm font-semibold text-violet-700'>
                                ${data.total_compra?.toLocaleString('es-CL') || '0'}
                            </div>
                        </div>
                    </div>

                    {/* Segunda fila: Comprador */}
                    {data.nombre_creado_por && (
                        <div>
                            <Badge className='mb-1'>Comprador</Badge>
                            <div className='ml-4 text-sm text-gray-700 dark:text-gray-300'>
                                {data.nombre_creado_por}
                            </div>
                        </div>
                    )}

                    {/* Tercera fila: Descripción/Observaciones */}
                    {data.observaciones && (
                        <div className='mt-3 border-t border-violet-100 pt-3'>
                            <Badge className='mb-1'>Descripción</Badge>
                            <div className='ml-4 text-sm text-gray-700 dark:text-gray-300'>{data.observaciones}</div>
                        </div>
                    )}
                </div>

                {/* Items en la compra */}
                <div className='rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 shadow-sm'>
                    <div className='mb-3 border-b border-gray-200 dark:border-zinc-700 pb-2'>
                        <span className='text-sm font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400 dark:text-gray-300'>
                            ITEM DE LA COMPRA
                        </span>
                    </div>
                    {itemsCompra.length === 0 ? (
                        <div className='py-8 text-center text-sm text-gray-500 dark:text-gray-400 dark:text-gray-300'>
                            Sin items en esta compra
                        </div>
                    ) : (
                        <div className='overflow-x-auto'>
                            <table className='min-w-full divide-y divide-gray-200 dark:divide-zinc-700'>
                                <thead className='bg-gray-50 dark:bg-zinc-800'>
                                    <tr>
                                        <th className='px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-300'>
                                            Nombre
                                        </th>
                                        <th className='px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-300'>
                                            Cantidad
                                        </th>
                                        <th className='px-3 py-2 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-300'>
                                            Precio Unitario
                                        </th>
                                        <th className='px-3 py-2 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-300'>
                                            Subtotal
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className='divide-y divide-gray-200 dark:divide-zinc-700 bg-white dark:bg-zinc-900'>
                                    {itemsCompra.map((itemCompra: any, idx: number) => {
                                        const subtotal =
                                            (itemCompra.cantidad || 0) * (itemCompra.precio || 0);
                                        return (
                                            <tr
                                                key={itemCompra.id || idx}
                                                className='hover:bg-gray-50 dark:hover:bg-zinc-800'>
                                                <td className='whitespace-nowrap px-3 py-2 text-sm text-gray-900 dark:text-gray-100'>
                                                    {itemCompra.nombre_item ||
                                                        `Item ${itemCompra.id}`}
                                                </td>
                                                <td className='whitespace-nowrap px-3 py-2 text-sm text-gray-700 dark:text-gray-300'>
                                                    {itemCompra.cantidad ?? '—'}
                                                </td>
                                                <td className='whitespace-nowrap px-3 py-2 text-right text-sm text-gray-700 dark:text-gray-300'>
                                                    $
                                                    {(itemCompra.precio ?? 0).toLocaleString(
                                                        'es-CL',
                                                    )}
                                                </td>
                                                <td className='whitespace-nowrap px-3 py-2 text-right text-sm font-medium text-gray-900 dark:text-gray-100'>
                                                    ${subtotal.toLocaleString('es-CL')}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderGastoDetail = () => {
        if (!data) return null;
        const tipo = item?.tipo;
        if (tipo !== 'gasto_operativo') return null;

        const fechaValor =
            data.fecha_gasto ||
            data.fecha_compra ||
            data.fecha ||
            item?.fecha_gasto ||
            item?.fecha_compra ||
            item?.fecha;
        const fechaFormateada = fechaValor ? new Date(fechaValor).toLocaleString('es-CL') : '—';
        const itemCategoria = item?.categoria;
        const categoriaNombre =
            data.nombre_categoria ||
            data.categoria_nombre ||
            data.descripcion_categoria ||
            data.categoria?.nombre ||
            data.categoria?.descripcion ||
            item?.nombre_categoria ||
            item?.categoria_nombre ||
            item?.descripcion ||
            (itemCategoria && typeof itemCategoria === 'object'
                ? itemCategoria.nombre
                : itemCategoria) ||
            'Gasto Operativo';

        return (
            <div className='space-y-4'>
                {/* Header del gasto operativo */}
                <div className='rounded-lg border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-4 shadow-sm'>
                    <div className='mb-3 border-b border-amber-200 pb-2'>
                        <span className='text-sm font-semibold uppercase tracking-wide text-amber-700'>
                            DETALLE GASTO OPERATIVO
                        </span>
                    </div>

                    <div className='grid grid-cols-2 gap-4'>
                        <div>
                            <Badge className='mb-1'>Categoría</Badge>
                            <div className='ml-4 text-sm font-medium text-gray-900 dark:text-gray-100'>
                                {categoriaNombre}
                            </div>
                        </div>
                        <div>
                            <Badge className='mb-1'>Fecha Gasto</Badge>
                            <div className='ml-4 text-sm text-gray-700 dark:text-gray-300'>{fechaFormateada}</div>
                        </div>
                        <div>
                            <Badge className='mb-1'>Cantidad</Badge>
                            <div className='ml-4 text-sm text-gray-700 dark:text-gray-300'>{data.cantidad || 1}</div>
                        </div>
                        <div>
                            <Badge className='mb-1'>Monto Unitario</Badge>
                            <div className='ml-4 text-sm text-gray-700 dark:text-gray-300'>
                                ${data.monto_unitario?.toLocaleString('es-CL') || '0'}
                            </div>
                        </div>
                        <div className='col-span-2'>
                            <Badge className='mb-1'>Monto Total</Badge>
                            <div className='ml-4 text-sm font-semibold text-amber-700'>
                                ${data.monto_total?.toLocaleString('es-CL') || '0'}
                            </div>
                        </div>
                    </div>

                    {/* Detalle/Descripción */}
                    {data.detalle && (
                        <div className='mt-3 border-t border-amber-100 pt-3'>
                            <Badge className='mb-1'>Detalle</Badge>
                            <div className='ml-4 text-sm text-gray-700 dark:text-gray-300'>{data.detalle}</div>
                        </div>
                    )}

                    {/* Usuario Comprador */}
                    {(data.usuario_comprador || data.nombre_creado_por) && (
                        <div className='mt-2'>
                            <Badge className='mb-1'>Comprador</Badge>
                            <div className='ml-4 text-sm text-gray-700 dark:text-gray-300'>
                                {typeof data.usuario_comprador === 'object'
                                    ? data.usuario_comprador?.nombre ||
                                      data.usuario_comprador?.usuario?.nombre
                                    : data.nombre_creado_por || '—'}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderEnriched = () => {
        if (!data) return null;
        const tipo = item?.tipo;
        if (tipo === 'servicio_ot' || tipo === 'soporte_tecnico' || tipo === 'guia_salida') {
            // Already rendered above in renderTrabajoDetail or renderGuiaDetail
            return null;
        }

        if (tipo === 'rendicion_gasto' || tipo === 'compra_material') {
            const estadoLabel = data.estado_label || data.estado || '—';
            const totalReembolso = data.total_reembolso_tecnico ?? data.total_reembolso ?? 0;
            const totalFacturable =
                data.total_facturable_cliente ??
                data.total_facturable ??
                data.total ??
                data.monto_total ??
                0;
            const totalNoFacturable = data.total_no_facturable ?? 0;
            const itemsRend = Array.isArray(data.items)
                ? data.items
                : Array.isArray(data.detalles)
                  ? data.detalles
                  : [];

            return (
                <div className='space-y-4'>
                    <div className='rounded-lg border border-blue-200 bg-blue-50 p-4'>
                        <div className='mb-2 flex items-center gap-2 border-b border-blue-200 pb-2'>
                            <span className='text-sm font-semibold uppercase tracking-wide text-blue-700'>
                                Gastos Operativos
                            </span>
                            <Badge variant='solid' color='blue' className='text-xs'>
                                {estadoLabel}
                            </Badge>
                        </div>
                        <div className='grid grid-cols-3 gap-4'>
                            <div>
                                <Badge className='mb-1'>Total Reembolso Técnico</Badge>
                                <div className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
                                    ${totalReembolso.toLocaleString('es-CL')}
                                </div>
                                <p className='text-xs text-gray-500 dark:text-gray-400 dark:text-gray-300'>
                                    Lo que paga la empresa al técnico
                                </p>
                            </div>
                            <div>
                                <Badge className='mb-1'>Total Facturable Cliente</Badge>
                                <div className='text-lg font-semibold text-green-700'>
                                    ${totalFacturable.toLocaleString('es-CL')}
                                </div>
                                <p className='text-xs text-gray-500 dark:text-gray-400 dark:text-gray-300'>Se cobrará en la factura</p>
                            </div>
                            <div>
                                <Badge className='mb-1'>Total No Facturable</Badge>
                                <div className='text-lg font-semibold text-amber-700'>
                                    ${totalNoFacturable.toLocaleString('es-CL')}
                                </div>
                                <p className='text-xs text-gray-500 dark:text-gray-400 dark:text-gray-300'>Asumido por la empresa</p>
                            </div>
                        </div>
                    </div>

                    <div className='rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 shadow-sm'>
                        <div className='mb-3 border-b border-gray-200 dark:border-zinc-700 pb-2'>
                            <span className='text-sm font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400 dark:text-gray-300'>
                                Items de la Rendición ({itemsRend.length})
                            </span>
                        </div>
                        {itemsRend.length === 0 ? (
                            <div className='py-6 text-center text-sm text-gray-500 dark:text-gray-400 dark:text-gray-300'>
                                Sin gastos registrados
                            </div>
                        ) : (
                            <div className='overflow-x-auto'>
                                <table className='min-w-full divide-y divide-gray-200 dark:divide-zinc-700'>
                                    <thead className='bg-gray-50 dark:bg-zinc-800'>
                                        <tr>
                                            <th className='px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-300'>
                                                Detalle
                                            </th>
                                            <th className='px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-300'>
                                                Categoría
                                            </th>
                                            <th className='px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-300'>
                                                Cantidad
                                            </th>
                                            <th className='px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-300'>
                                                Monto Total
                                            </th>
                                            <th className='px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-300'>
                                                Fecha
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className='divide-y divide-gray-200 dark:divide-zinc-700 bg-white dark:bg-zinc-900'>
                                        {itemsRend.map((r: any, idx: number) => {
                                            const fecha =
                                                r.fecha_gasto || r.fecha_compra || r.fecha || '';
                                            return (
                                                <tr key={r.id || idx} className='hover:bg-gray-50 dark:hover:bg-zinc-800'>
                                                    <td className='whitespace-nowrap px-3 py-2 text-sm text-gray-900 dark:text-gray-100'>
                                                        {r.detalle || r.descripcion || '—'}
                                                    </td>
                                                    <td className='whitespace-nowrap px-3 py-2 text-sm text-gray-700 dark:text-gray-300'>
                                                        {r.categoria_nombre ||
                                                            r.nombre_categoria ||
                                                            r.descripcion_categoria ||
                                                            '—'}
                                                    </td>
                                                    <td className='whitespace-nowrap px-3 py-2 text-sm text-gray-700 dark:text-gray-300'>
                                                        {r.cantidad ?? 1}
                                                    </td>
                                                    <td className='whitespace-nowrap px-3 py-2 text-sm text-gray-700 dark:text-gray-300'>
                                                        $
                                                        {(
                                                            r.monto_total ??
                                                            r.monto ??
                                                            r.monto_unitario ??
                                                            0
                                                        ).toLocaleString('es-CL')}
                                                    </td>
                                                    <td className='whitespace-nowrap px-3 py-2 text-sm text-gray-700 dark:text-gray-300'>
                                                        {fecha
                                                            ? new Date(fecha).toLocaleDateString(
                                                                  'es-CL',
                                                              )
                                                            : '—'}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            );
        }
        return null;
    };

    const getOriginUrl = (): string | null => {
        if (!item) return null;
        switch (item.tipo) {
            case 'servicio_ot':
            case 'soporte_tecnico':
                return `/orden-trabajo/detalle-orden-trabajo/${item.ot_id}`;
            case 'guia_salida':
                {
                    const guiaId =
                        item.guia_id ??
                        item.parent_id ??
                        data?.id ??
                        itemsGuia?.[0]?.guia?.id ??
                        null;
                    return guiaId ? `/bodega/detalle-guia-salida-bodega/${guiaId}` : null;
                }
            case 'rendicion_gasto':
            case 'compra_material':
                return item.rendicion_id
                    ? `/rendicion/detalle-rendicion/${item.rendicion_id}`
                    : null;
            case 'compra':
                {
                    const compraId = item.compra_id ?? item.parent_id ?? item.item_id ?? item.id;
                    return compraId ? `/compras/detalle-compra/${compraId}` : null;
                }
            case 'gasto_operativo':
                {
                    const otId =
                        item.ot_id ??
                        item.orden_trabajo_id ??
                        item.orden_trabajo ??
                        null;
                    return otId
                        ? `/orden-trabajo/detalle-orden-trabajo/${otId}?tab=gastos-operativos`
                        : null;
                }
            default:
                return null;
        }
    };

    return (
        <Modal isOpen={open} setIsOpen={onClose} isCentered={false} size='lg'>
            <ModalHeader>
                <Badge className='text-xl'>Detalle del Item</Badge>
            </ModalHeader>
            <ModalBody isScrollable>
                <div className='space-y-4'>
                    {loading ? (
                        <div className='py-8 text-center text-sm text-gray-500 dark:text-gray-400 dark:text-gray-300'>
                            Cargando detalles...
                        </div>
                    ) : error ? (
                        <div className='rounded bg-red-50 p-3 text-sm text-red-600'>
                            <strong>Error:</strong> {error}
                        </div>
                    ) : (
                        <>
                            {renderTrabajoDetail()}
                            {renderGuiaDetail()}
                            {renderCompraDetail()}
                            {renderGastoDetail()}
                            {renderVinculados()}
                            {renderEnriched()}
                        </>
                    )}
                </div>
            </ModalBody>
            <ModalFooter>
                <div className='flex w-full items-center justify-end gap-3'>
                    {getOriginUrl() && (
                        <Button
                            variant='solid'
                            color='violet'
                            icon='HeroArrowTopRightOnSquare'
                            onClick={() => window.open(getOriginUrl()!, '_blank')}>
                            Ver origen completo
                        </Button>
                    )}
                    <Button variant='solid' color='red' onClick={onClose}>
                        Cerrar
                    </Button>
                </div>
            </ModalFooter>
            <Modal isOpen={seriesModalOpen} setIsOpen={setSeriesModalOpen} size='sm'>
                <ModalHeader>{seriesModalTitle}</ModalHeader>
                <ModalBody>
                    {seriesModalItems.length === 0 ? (
                        <div className='py-6 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-300'>
                            No hay series disponibles para este item.
                        </div>
                    ) : (
                        <ul className='list-disc space-y-2 pl-5 text-sm text-gray-700 dark:text-gray-300'>
                            {seriesModalItems.map((serie, index) => (
                                <li key={`${serie}-${index}`}>{serie}</li>
                            ))}
                        </ul>
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button variant='solid' color='red' onClick={() => setSeriesModalOpen(false)}>
                        Cerrar
                    </Button>
                </ModalFooter>
            </Modal>
        </Modal>
    );
};

export default ItemDetailModal;
