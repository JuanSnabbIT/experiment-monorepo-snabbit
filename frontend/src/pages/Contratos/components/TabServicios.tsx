import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import { IContratoItemComercial } from '@/interface/contrato.interface';
import { useState } from 'react';
import AgregarServiciosyPlanesContrato from '../modals/AgregarServiciosyPlanesContrato';
import { ITabServiciosProps } from './contrato.types';
import type { IPlanComponentContractDetail } from './planContractDetail';
import {
    PlanIncludedServicesDetail,
    PlanServiceDetailModal,
    getPlanComponentDetails,
    isPlanContractSource
} from './planContractDetail';

const formatCurrency = (value: number, currency: 'CLP' | 'UF' | 'USD' = 'CLP') => {
    if (currency === 'UF') {
        return `${new Intl.NumberFormat('es-CL', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(value)} UF`;
    }

    return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency,
        maximumFractionDigits: 0,
    }).format(value);
};

const formatSubtotalCurrency = (
    value: number,
    currency: 'CLP' | 'UF' | 'USD' = 'CLP',
) => {
    const amount = Number(value || 0);

    if (currency === 'UF') {
        return `${new Intl.NumberFormat('es-CL', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount)} UF`;
    }

    if (currency === 'USD') {
        return `$${new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount)} USD`;
    }

    return `$${new Intl.NumberFormat('es-CL', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount)} CLP`;
};

// Formato limpio para precios de plan: "279.000 CLP", "83,26 UF" (sin $ prefijo)
const formatPrecio = (value: number, currency: 'CLP' | 'UF' | 'USD' = 'CLP') => {
    const amount = Number(value || 0);

    if (currency === 'UF') {
        return `${new Intl.NumberFormat('es-CL', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount)} UF`;
    }

    if (currency === 'USD') {
        return `${new Intl.NumberFormat('es-CL', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount)} USD`;
    }

    return `${new Intl.NumberFormat('es-CL', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount)} CLP`;
};

const TabServicios = ({
    detalleContratoEmpresaCliente,
    listaContentType,
    puedeEditar,
}: ITabServiciosProps) => {
    const [selectedDetail, setSelectedDetail] = useState<IPlanComponentContractDetail | null>(
        null,
    );

    if (
        detalleContratoEmpresaCliente.tipo !== 'servicios' &&
        detalleContratoEmpresaCliente.tipo !== 'licencia'
    ) {
        return null;
    }

    const itemsServicios =
        detalleContratoEmpresaCliente.items_comerciales?.length > 0
            ? detalleContratoEmpresaCliente.items_comerciales
            : detalleContratoEmpresaCliente.contrato_servicios;

    // Separar addons del plan principal (solo aplica a items_comerciales)
    const addonItems = itemsServicios.filter(
        (item) => 'es_addon' in item && (item as { es_addon: boolean }).es_addon,
    );
    const mainItems = itemsServicios.filter(
        (item) => !('es_addon' in item) || !(item as { es_addon: boolean }).es_addon,
    );

    const totalServicios = itemsServicios.reduce(
        (sum, servicio) =>
            sum + Number(servicio.subtotal_en_moneda_cobro ?? servicio.subtotal ?? 0),
        0,
    );

    const formaPago = detalleContratoEmpresaCliente.forma_pago_contractual;
    const periodoSufijo = formaPago === 'anual' ? '/año' : formaPago === 'mensual' ? '/mes' : '';
    const periodoLabel = formaPago === 'anual' ? 'anual' : formaPago === 'mensual' ? 'mensual' : 'único';

    const buildDetailFromItem = (
        contServ: (typeof itemsServicios)[number],
    ): IPlanComponentContractDetail => {
        const sg = (contServ.servicio_generico ?? {}) as {
            incluye?: string | null;
            no_incluye?: string | null;
            clausulas_especiales?: string | null;
            descripcion?: string | null;
            categoria_label?: string | null;
        };
        const parseLines = (text?: string | null) =>
            (text ?? '')
                .split(/\r?\n/)
                .map((l) => l.trim().replace(/^[-*]\s*/, '').trim())
                .filter(Boolean);
        return {
            key: `item-${contServ.id}`,
            nombre: contServ.nombre,
            descripcion: sg.descripcion ?? null,
            categoriaLabel: sg.categoria_label ?? null,
            obligatorio: null,
            cantidadDefault: null,
            vecesPorMesDefault: null,
            orden: 0,
            caracteristicas: [],
            incluye: parseLines(sg.incluye),
            noIncluye: parseLines(sg.no_incluye),
            clausulasEspeciales: sg.clausulas_especiales ?? null,
        };
    };

    return (
        <Card>
            <CardHeader className='border border-x-0 border-t-0 border-b-black'>
                <CardHeaderChild>
                    <div>
                        <div className='text-xl font-bold text-blue-500'>
                            Servicios y Planes Contratados
                        </div>
                        <div className='mt-1 text-xs text-zinc-500'>
                            Revisa alcance, exclusiones y clausulas comerciales antes de aprobar o
                            firmar.
                        </div>
                    </div>
                </CardHeaderChild>
                <CardHeaderChild>
                    {puedeEditar && detalleContratoEmpresaCliente.tipo !== 'licencia' && (
                        <AgregarServiciosyPlanesContrato
                            contrato={detalleContratoEmpresaCliente}
                            isDisabled={!puedeEditar}
                        />
                    )}
                </CardHeaderChild>
            </CardHeader>
            <CardBody className='space-y-4 py-4'>
                <PlanServiceDetailModal
                    component={selectedDetail}
                    isOpen={!!selectedDetail}
                    setIsOpen={(v) => {
                        if (!v) setSelectedDetail(null);
                    }}
                />
                {mainItems.length > 0 ? (
                    <>
                        <div className='grid gap-4 xl:grid-cols-2'>
                            {mainItems.map((contServ) => {
                                const legacyItem = contServ as { content_type?: number };
                                const esServicio =
                                    'tipo_item' in contServ
                                        ? contServ.tipo_item === 'servicio'
                                        : legacyItem.content_type !== undefined
                                          ? listaContentType.some(
                                                (ct) =>
                                                    ct.model === 'servicio' &&
                                                    ct.id === legacyItem.content_type,
                                            )
                                          : false;

                                const usesConvertedSubtotal =
                                    contServ.subtotal_en_moneda_cobro != null;
                                const subtotal = Number(
                                    contServ.subtotal_en_moneda_cobro ?? contServ.subtotal ?? 0,
                                );
                                // itemOwnMoneda: moneda propia del ítem (para precio unitario)
                                const itemOwnMoneda: 'CLP' | 'UF' | 'USD' =
                                    'moneda' in contServ && contServ.moneda
                                        ? (contServ.moneda as 'CLP' | 'UF' | 'USD')
                                        : detalleContratoEmpresaCliente.moneda_cobro;
                                // itemMoneda: moneda para el subtotal (convertido = moneda_cobro)
                                const itemMoneda: 'CLP' | 'UF' | 'USD' = usesConvertedSubtotal
                                    ? detalleContratoEmpresaCliente.moneda_cobro
                                    : itemOwnMoneda;
                                const esPlan = !esServicio && isPlanContractSource(contServ);
                                const componentesPlan = esPlan
                                    ? getPlanComponentDetails(contServ)
                                    : [];
                                const sg = (contServ.servicio_generico ?? {}) as {
                                    categoria_label?: string;
                                    incluye?: string | null;
                                    no_incluye?: string | null;
                                    clausulas_especiales?: string | null;
                                    descripcion?: string | null;
                                };
                                const hasTopLevelDetail =
                                    !esPlan &&
                                    Boolean(
                                        sg.incluye ||
                                            sg.no_incluye ||
                                            sg.clausulas_especiales ||
                                            sg.descripcion,
                                    );

                                const planItem = esPlan ? (contServ as IContratoItemComercial) : null;
                                const planPrice = Number(planItem?.precio_unitario_contratado || 0);
                                const descuentoAnual = planItem?.descuento_anual_porcentaje
                                    ? Number(planItem.descuento_anual_porcentaje)
                                    : null;
                                const planPriceAnual =
                                    descuentoAnual && planPrice > 0
                                        ? planPrice * 12 * (1 - descuentoAnual / 100)
                                        : null;
                                const planUnitAnualEquiv =
                                    planPrice > 0 && Number(planItem?.cantidad || 1) > 0
                                        ? Number(planItem?.subtotal || 0) / Number(planItem?.cantidad || 1)
                                        : 0;
                                const planQuantityMultiplier =
                                    formaPago === 'anual' ? 12 : contServ.cantidad || 1;
                                const visitasIncluidas =
                                    planItem?.snapshot_num_visitas_mensuales ??
                                    planItem?.num_visitas_mensuales ??
                                    null;
                                const planTotal = Number(
                                    contServ.subtotal_en_moneda_cobro ?? contServ.subtotal ?? 0,
                                );
                                const addonsTotalAnual = addonItems.reduce(
                                    (sum, addon) =>
                                        sum + Number(addon.subtotal_en_moneda_cobro ?? addon.subtotal ?? 0),
                                    0,
                                );
                                const grandTotal = planTotal + addonsTotalAnual;

                                return (
                                    <div
                                        className={`rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/30${esPlan ? ' xl:col-span-2' : ''}`}
                                        key={contServ.id}>
                                        {/* Encabezado: badge + nombre + (ojo) + subtotal */}
                                        <div className='flex flex-wrap items-start justify-between gap-3'>
                                            <div className='min-w-0 flex-1'>
                                                <div className='mt-2 flex items-center gap-1.5'>
                                                    {esPlan ? (
                                                        <span className='rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-semibold text-violet-700 dark:bg-violet-900/30 dark:text-violet-300'>
                                                            Planes y Servicio
                                                        </span>
                                                    ) : (
                                                        <>
                                                            <div className='text-lg font-semibold text-zinc-900 dark:text-zinc-50'>
                                                                {contServ.nombre}
                                                            </div>
                                                            {hasTopLevelDetail && (
                                                                <Button
                                                                    color='zinc'
                                                                    variant='plain'
                                                                    icon='HeroEye'
                                                                    size='sm'
                                                                    onClick={() =>
                                                                        setSelectedDetail(
                                                                            buildDetailFromItem(contServ),
                                                                        )
                                                                    }
                                                                />
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                                {esServicio && sg.categoria_label && (
                                                    <div className='mt-1 text-sm text-zinc-500'>
                                                        {sg.categoria_label}
                                                    </div>
                                                )}
                                            </div>
                                            {/* Para items de plan el total se muestra en el Resumen de cobro interior */}
                                            {!esPlan && (
                                                <div className='rounded-2xl bg-zinc-50 px-4 py-3 text-right dark:bg-zinc-900/60'>
                                                    <div className='text-[11px] uppercase tracking-wide text-zinc-500'>
                                                        {periodoLabel === 'anual' ? 'Total anual' : `Subtotal ${periodoLabel}`}
                                                    </div>
                                                    <div className='text-base font-semibold text-zinc-900 dark:text-zinc-100'>
                                                        {formatSubtotalCurrency(subtotal, itemMoneda)}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {esPlan && (
                                                <div className='mt-5 grid gap-4 xl:grid-cols-2'>
                                                    {/* IZQUIERDA: plan card (PlanCard-style) */}
                                                    <div className='overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950'>
                                                        {/* Header */}
                                                        <div className='flex items-end justify-between gap-4 border-b border-zinc-200 px-6 py-4 dark:border-zinc-800'>
                                                            <div className='min-w-0 flex-1'>
                                                                <div className='text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400'>
                                                                    Plan de servicio
                                                                </div>
                                                                <h3 className='mt-2 text-xl font-semibold text-zinc-900 dark:text-zinc-100'>
                                                                    {contServ.nombre}
                                                                </h3>
                                                                <p className='mt-1 text-sm text-zinc-600 dark:text-zinc-400'>
                                                                    {componentesPlan.length} servicios incluidos
                                                                </p>
                                                            </div>
                                                            <div className='ml-auto flex-shrink-0 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-right dark:border-zinc-800 dark:bg-zinc-900'>
                                                                {formaPago === 'anual' ? (
                                                                    planPriceAnual && planPriceAnual > 0 ? (
                                                                        // Contrato anual CON precio de descuento configurado
                                                                        <>
                                                                            <div className='text-[10px] uppercase tracking-[0.3em] text-emerald-600 dark:text-emerald-400'>
                                                                                Precio anual
                                                                            </div>
                                                                            <div className='mt-2 text-3xl font-semibold text-emerald-700 dark:text-emerald-400'>
                                                                                {formatSubtotalCurrency(planPriceAnual, itemOwnMoneda)}
                                                                            </div>
                                                                            <div className='mt-1 text-sm text-zinc-500 dark:text-zinc-400'>
                                                                                {itemOwnMoneda} / año
                                                                            </div>
                                                                            <div className='mt-2 border-t border-zinc-200 pt-2 text-xs text-zinc-400 dark:border-zinc-700 dark:text-zinc-500'>
                                                                                {planPrice > 0 ? `${formatSubtotalCurrency(planPrice, itemOwnMoneda)} /mes` : '—'}
                                                                            </div>
                                                                        </>
                                                                    ) : (
                                                                        // Contrato anual SIN precio de descuento — factura mensual → 12
                                                                        <>
                                                                            <div className='text-[10px] uppercase tracking-[0.3em] text-zinc-500 dark:text-zinc-400'>
                                                                                Precio mensual
                                                                            </div>
                                                                            <div className='mt-2 text-3xl font-semibold text-zinc-900 dark:text-zinc-100'>
                                                                                {planPrice > 0 ? formatSubtotalCurrency(planPrice, itemOwnMoneda) : 'Sin precio'}
                                                                            </div>
                                                                            <div className='mt-1 text-sm text-zinc-500 dark:text-zinc-400'>
                                                                                {planPrice > 0 ? `${itemOwnMoneda} / mes` : '—'}
                                                                            </div>
                                                                        </>
                                                                    )
                                                                ) : (
                                                                    // Contrato mensual o pago único
                                                                    <>
                                                                        <div className='text-[10px] uppercase tracking-[0.3em] text-zinc-500 dark:text-zinc-400'>
                                                                            {formaPago === 'pago_unico' ? 'Precio único' : 'Precio mensual'}
                                                                        </div>
                                                                        <div className='mt-2 text-3xl font-semibold text-zinc-900 dark:text-zinc-100'>
                                                                            {planPrice > 0 ? formatSubtotalCurrency(planPrice, itemOwnMoneda) : 'Sin precio'}
                                                                        </div>
                                                                        <div className='mt-1 text-sm text-zinc-500 dark:text-zinc-400'>
                                                                            {planPrice > 0 ? (formaPago === 'pago_unico' ? itemOwnMoneda : `${itemOwnMoneda} / mes`) : '—'}
                                                                        </div>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Body */}
                                                        <div className='flex flex-col gap-4 px-6 py-4'>
                                                            {/* Servicios incluidos */}
                                                            {componentesPlan.length > 0 ? (
                                                                <PlanIncludedServicesDetail
                                                                    components={componentesPlan}
                                                                    title='Servicios incluidos'
                                                                    compact
                                                                />
                                                            ) : (
                                                                <div className='rounded-2xl border border-dashed border-zinc-200 px-4 py-3 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400'>
                                                                    Este plan aún no tiene servicios asociados.
                                                                </div>
                                                            )}

                                                            {/* Visitas presenciales */}
                                                            <div className='rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950'>
                                                                <div className='text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400'>
                                                                    Visitas presenciales
                                                                </div>
                                                                <div className='mt-3 text-lg font-semibold text-zinc-900 dark:text-zinc-100'>
                                                                    {visitasIncluidas != null
                                                                        ? `${visitasIncluidas} / mes`
                                                                        : 'No aplica'}
                                                                </div>
                                                            </div>

                                                        </div>
                                                    </div>

                                                    {/* DERECHA: resumen financiero */}
                                                    <Card className='h-fit rounded-3xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950'>
                                                        <CardHeader className='border-b border-zinc-100 px-5 py-3 dark:border-zinc-800'>
                                                            <CardHeaderChild>
                                                                <span className='text-sm font-semibold text-zinc-900 dark:text-zinc-100'>
                                                                    Detalle de cobro
                                                                </span>
                                                            </CardHeaderChild>
                                                        </CardHeader>
                                                        <CardBody className='divide-y divide-zinc-100 px-5 py-0 dark:divide-zinc-800'>
                                                            {/* Fila del plan */}
                                                            <div className='flex items-start justify-between gap-3 py-3'>
                                                                <div className='min-w-0 flex-1'>
                                                                    <p className='text-sm font-medium text-zinc-800 dark:text-zinc-200'>
                                                                        Plan: {contServ.nombre}
                                                                    </p>
                                                                    <p className='mt-0.5 text-xs text-zinc-500 dark:text-zinc-400'>
                                                                        {planPrice > 0
                                                                            ? `${formatSubtotalCurrency(planPrice, itemOwnMoneda)} /mes c/u`
                                                                            : '—'}
                                                                    </p>
                                                                    {planItem?.detalle_cobro?.estado_conversion === 'convertido' && (
                                                                        <p className='mt-0.5 text-xs text-blue-500 dark:text-blue-400'>
                                                                            {planItem.detalle_cobro.moneda_item} → {planItem.detalle_cobro.moneda_cobro}
                                                                            {planItem.detalle_cobro.dolar_observado != null && planItem.detalle_cobro.moneda_item === 'USD' && (
                                                                                <> · 1 USD = {formatSubtotalCurrency(planItem.detalle_cobro.dolar_observado, 'CLP')}</>
                                                                            )}
                                                                            {planItem.detalle_cobro.valor_uf != null && planItem.detalle_cobro.moneda_item === 'UF' && (
                                                                                <> · 1 UF = {formatSubtotalCurrency(planItem.detalle_cobro.valor_uf, 'CLP')}</>
                                                                            )}
                                                                        </p>
                                                                    )}
                                                                    {planItem?.detalle_cobro?.estado_conversion === 'sin_tipo_cambio' && (
                                                                        <p className='mt-0.5 text-xs text-amber-500 dark:text-amber-400'>
                                                                            Sin tipo de cambio disponible
                                                                        </p>
                                                                    )}
                                                                </div>
                                                                <div className='flex-shrink-0 text-right'>
                                                                    <p className='text-xs text-zinc-400 dark:text-zinc-500'>
                                                                        ×{planQuantityMultiplier}
                                                                    </p>
                                                                    {planItem?.detalle_cobro?.estado_conversion === 'sin_tipo_cambio' ? (
                                                                        <p className='text-sm font-semibold text-amber-500 dark:text-amber-400'>—</p>
                                                                    ) : (
                                                                        <p className='text-sm font-semibold text-zinc-900 dark:text-zinc-100'>
                                                                            {formatSubtotalCurrency(
                                                                                planTotal,
                                                                                detalleContratoEmpresaCliente.moneda_cobro,
                                                                            )}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Addons */}
                                                            {addonItems.length > 0 && (
                                                                <div className='py-3'>
                                                                    <p className='mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500'>
                                                                        Addons:
                                                                    </p>
                                                                    <div className='space-y-3'>
                                                                        {addonItems.map((addon) => {
                                                                            const addonItem = addon as IContratoItemComercial;
                                                                            const addonOwnMoneda: 'CLP' | 'UF' | 'USD' =
                                                                                'moneda' in addon && addon.moneda
                                                                                    ? (addon.moneda as 'CLP' | 'UF' | 'USD')
                                                                                    : detalleContratoEmpresaCliente.moneda_cobro;
                                                                            const addonPrecio = Number(
                                                                                'precio_unitario_contratado' in addon
                                                                                    ? addon.precio_unitario_contratado
                                                                                    : addon.precio_unitario || 0,
                                                                            );
                                                                            const addonTotal = Number(addon.subtotal_en_moneda_cobro ?? addon.subtotal ?? 0);
                                                                            return (
                                                                                <div
                                                                                    key={addon.id}
                                                                                    className='flex items-start justify-between gap-3'>
                                                                                    <div className='min-w-0 flex-1'>
                                                                                        <p className='text-sm text-zinc-800 dark:text-zinc-200'>
                                                                                            {addon.nombre}
                                                                                        </p>
                                                                                        <p className='mt-0.5 text-xs text-zinc-500 dark:text-zinc-400'>
                                                                                            {addonPrecio > 0
                                                                                                ? `${formatSubtotalCurrency(addonPrecio, addonOwnMoneda)} /mes c/u`
                                                                                                : '—'}
                                                                                        </p>
                                                                                        {addonItem.detalle_cobro?.estado_conversion === 'convertido' && (
                                                                                            <p className='mt-0.5 text-xs text-blue-500 dark:text-blue-400'>
                                                                                                {addonItem.detalle_cobro.moneda_item} → {addonItem.detalle_cobro.moneda_cobro}
                                                                                                {addonItem.detalle_cobro.dolar_observado != null && addonItem.detalle_cobro.moneda_item === 'USD' && (
                                                                                                    <> · 1 USD = {formatSubtotalCurrency(addonItem.detalle_cobro.dolar_observado, 'CLP')}</>
                                                                                                )}
                                                                                                {addonItem.detalle_cobro.valor_uf != null && addonItem.detalle_cobro.moneda_item === 'UF' && (
                                                                                                    <> · 1 UF = {formatSubtotalCurrency(addonItem.detalle_cobro.valor_uf, 'CLP')}</>
                                                                                                )}
                                                                                            </p>
                                                                                        )}
                                                                                        {addonItem.detalle_cobro?.estado_conversion === 'sin_tipo_cambio' && (
                                                                                            <p className='mt-0.5 text-xs text-amber-500 dark:text-amber-400'>
                                                                                                Sin tipo de cambio disponible
                                                                                            </p>
                                                                                        )}
                                                                                    </div>
                                                                                    <div className='flex-shrink-0 text-right'>
                                                                                        <p className='text-xs text-zinc-400 dark:text-zinc-500'>
                                                                                            ×{addon.cantidad || 1}
                                                                                        </p>
                                                                                        {addonItem.detalle_cobro?.estado_conversion === 'sin_tipo_cambio' ? (
                                                                                            <p className='text-sm font-semibold text-amber-500 dark:text-amber-400'>—</p>
                                                                                        ) : (
                                                                                            <p className='text-sm font-semibold text-zinc-900 dark:text-zinc-100'>
                                                                                                {formatSubtotalCurrency(
                                                                                                    addonTotal,
                                                                                                    detalleContratoEmpresaCliente.moneda_cobro,
                                                                                                )}
                                                                                            </p>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Total */}
                                                            <div className='flex items-center justify-between py-3'>
                                                                <span className='text-sm text-zinc-500 dark:text-zinc-400'>
                                                                    Total cobro:
                                                                </span>
                                                                <span className='text-base font-semibold text-zinc-900 dark:text-zinc-100'>
                                                                    {formatSubtotalCurrency(
                                                                        grandTotal,
                                                                        detalleContratoEmpresaCliente.moneda_cobro,
                                                                    )}
                                                                </span>
                                                            </div>
                                                        </CardBody>
                                                    </Card>

                                                    {addonItems.length > 0 && (
                                                        <div className='mt-6 xl:col-span-1 rounded-3xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950/30'>
                                                            <div className='flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 px-6 py-4 dark:border-zinc-800'>
                                                                <div>
                                                                    <div className='text-sm font-semibold text-zinc-900 dark:text-zinc-100'>
                                                                        Servicios adicionales al contrato
                                                                    </div>
                                                                </div>
                                                                <span className='rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700 dark:bg-violet-900/30 dark:text-violet-300'>
                                                                    {addonItems.length} servicios
                                                                </span>
                                                            </div>
                                                            <div className='space-y-3 p-6'>
                                                                {addonItems.map((addon) => {
                                                                    const addonOwnMoneda: 'CLP' | 'UF' | 'USD' =
                                                                        'moneda' in addon && addon.moneda
                                                                            ? (addon.moneda as 'CLP' | 'UF' | 'USD')
                                                                            : detalleContratoEmpresaCliente.moneda_cobro;
                                                                    const addonTotal = Number(
                                                                        addon.subtotal_en_moneda_cobro ?? addon.subtotal ?? 0,
                                                                    );
                                                                    return (
                                                                        <div
                                                                            key={addon.id}
                                                                            className='flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950/30'>
                                                                            <div className='min-w-0 flex-1'>
                                                                                <p className='text-sm font-semibold text-zinc-900 dark:text-zinc-100'>
                                                                                    {addon.nombre}
                                                                                </p>
                                                                                <p className='mt-1 text-xs text-zinc-500 dark:text-zinc-400'>
                                                                                    {addonOwnMoneda} · {addon.cantidad || 1} unidad{addon.cantidad === 1 ? '' : 'es'}
                                                                                </p>
                                                                            </div>
                                                                            <div className='flex items-center gap-3'>
                                                                                <div className='text-right'>
                                                                                    <p className='text-sm font-semibold text-zinc-900 dark:text-zinc-100'>
                                                                                        {formatSubtotalCurrency(addonTotal, detalleContratoEmpresaCliente.moneda_cobro)}
                                                                                    </p>
                                                                                    <p className='text-xs text-zinc-500 dark:text-zinc-400'>
                                                                                        Subtotal
                                                                                    </p>
                                                                                </div>
                                                                                <Button
                                                                                    color='violet'
                                                                                    variant='solid'
                                                                                    icon='HeroEye'
                                                                                    size='sm'
                                                                                    onClick={() => setSelectedDetail(buildDetailFromItem(addon))}
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}

                                                </div>
                                        )}

                                    </div>
                                );
                            })}
                        </div>


                        <div className='flex justify-end border-t border-zinc-200 pt-4 dark:border-zinc-800'>
                            <div className='rounded-2xl bg-blue-50 px-4 py-3 text-right dark:bg-blue-950/20'>
                                <div className='text-[11px] uppercase tracking-wide text-blue-600 dark:text-blue-300'>
                                    Total referencial {periodoLabel}
                                </div>
                                <div className='text-lg font-semibold text-blue-700 dark:text-blue-200'>
                                    {formatSubtotalCurrency(
                                        totalServicios,
                                        detalleContratoEmpresaCliente.moneda_cobro,
                                    )}
                                    {periodoSufijo}
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className='rounded-2xl border border-dashed border-zinc-300 px-4 py-6 text-sm text-zinc-500 dark:border-zinc-700'>
                        Sin servicios o planes asociados al contrato.
                    </div>
                )}
            </CardBody>
        </Card>
    );
};

export default TabServicios;
