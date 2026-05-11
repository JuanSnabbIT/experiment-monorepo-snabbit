import Alert from '@/components/ui/Alert';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import Tooltip from '@/components/ui/Tooltip';
import { IContratoItemComercial } from '@/interface/contrato.interface';
import { useState } from 'react';
import AgregarServiciosyPlanesContrato from '../modals/AgregarServiciosyPlanesContrato';
import { ITabServiciosProps } from './contrato.types';
import type { IPlanComponentContractDetail } from './planContractDetail';
import {
    PlanIncludedServicesDetail,
    PlanServiceDetailModal,
    getPlanComponentDetails,
    isPlanContractSource,
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
    const periodoSufijo = formaPago === 'anual' ? '/a├▒o' : formaPago === 'mensual' ? '/mes' : '';
    const periodoLabel = formaPago === 'anual' ? 'anual' : formaPago === 'mensual' ? 'mensual' : '├║nico';

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
                    {puedeEditar && (
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
                                // itemOwnMoneda: moneda propia del ├¡tem (para precio unitario)
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
                                                            Plan de servicio
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

                                        {esPlan && (() => {
                                            const planItem = contServ as IContratoItemComercial;
                                            const planPrice = Number(planItem.precio_unitario_contratado || 0);
                                            const planPriceAnual = planItem.precio_unitario_anual_contratado
                                                ? Number(planItem.precio_unitario_anual_contratado)
                                                : null;
                                            // Equivalente anual por unidad en moneda propia del item
                                            // = subtotal (ya es total_anual del backend) / cantidad
                                            const planUnitAnualEquiv =
                                                planPrice > 0 && Number(planItem.cantidad || 1) > 0
                                                    ? Number(planItem.subtotal || 0) / Number(planItem.cantidad || 1)
                                                    : 0;
                                            const visitasIncluidas =
                                                planItem.snapshot_num_visitas_mensuales ?? planItem.num_visitas_mensuales;
                                            const planDetalle = componentesPlan[0] ?? null;

                                            // Totales ya calculados por el backend seg├║n forma_pago_contractual:
                                            // subtotal               = total en moneda propia del item
                                            // subtotal_en_moneda_cobro = total convertido a moneda del contrato
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
                                                                                {itemOwnMoneda} / a├▒o
                                                                            </div>
                                                                            <div className='mt-2 border-t border-zinc-200 pt-2 text-xs text-zinc-400 dark:border-zinc-700 dark:text-zinc-500'>
                                                                                {planPrice > 0 ? `${formatSubtotalCurrency(planPrice, itemOwnMoneda)} /mes` : 'ÔÇö'}
                                                                            </div>
                                                                        </>
                                                                    ) : (
                                                                        // Contrato anual SIN precio de descuento ÔÇö factura mensual ├ù 12
                                                                        <>
                                                                            <div className='text-[10px] uppercase tracking-[0.3em] text-zinc-500 dark:text-zinc-400'>
                                                                                Precio mensual
                                                                            </div>
                                                                            <div className='mt-2 text-3xl font-semibold text-zinc-900 dark:text-zinc-100'>
                                                                                {planPrice > 0 ? formatSubtotalCurrency(planPrice, itemOwnMoneda) : 'Sin precio'}
                                                                            </div>
                                                                            <div className='mt-1 text-sm text-zinc-500 dark:text-zinc-400'>
                                                                                {planPrice > 0 ? itemOwnMoneda : 'ÔÇö'}
                                                                            </div>
                                                                            {planUnitAnualEquiv > 0 && (
                                                                                <div className='mt-2 border-t border-zinc-200 pt-2 dark:border-zinc-700'>
                                                                                    <div className='text-[10px] text-zinc-400 dark:text-zinc-500'>
                                                                                        Facturado anualmente
                                                                                    </div>
                                                                                    <div className='mt-1 text-sm font-semibold text-zinc-700 dark:text-zinc-200'>
                                                                                        {formatSubtotalCurrency(planUnitAnualEquiv, itemOwnMoneda)} /a├▒o
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </>
                                                                    )
                                                                ) : (
                                                                    // Contrato mensual o pago ├║nico
                                                                    <>
                                                                        <div className='text-[10px] uppercase tracking-[0.3em] text-zinc-500 dark:text-zinc-400'>
                                                                            {formaPago === 'pago_unico' ? 'Precio ├║nico' : 'Precio mensual'}
                                                                        </div>
                                                                        <div className='mt-2 text-3xl font-semibold text-zinc-900 dark:text-zinc-100'>
                                                                            {planPrice > 0 ? formatSubtotalCurrency(planPrice, itemOwnMoneda) : 'Sin precio'}
                                                                        </div>
                                                                        <div className='mt-1 text-sm text-zinc-500 dark:text-zinc-400'>
                                                                            {planPrice > 0 ? itemOwnMoneda : 'ÔÇö'}
                                                                        </div>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Body */}
                                                        <div className='flex flex-col gap-4 px-6 py-4'>
                                                            {/* Servicios incluidos */}
                                                            <div className='rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900'>
                                                                <div className='flex items-center justify-between gap-3'>
                                                                    <div>
                                                                        <div className='text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400'>
                                                                            Servicios incluidos
                                                                        </div>
                                                                        <p className='mt-1 text-sm text-zinc-600 dark:text-zinc-300'>
                                                                            Una vista r├ípida de lo que ofrece este plan.
                                                                        </p>
                                                                    </div>
                                                                    <span className='rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'>
                                                                        {componentesPlan.length} servicios
                                                                    </span>
                                                                </div>
                                                                {componentesPlan.length > 0 ? (
                                                                    <div className='mt-4 flex max-h-56 flex-col items-start gap-2 overflow-y-auto pr-2'>
                                                                        {componentesPlan.map((component) => (
                                                                            <Badge
                                                                                key={component.key}
                                                                                color='emerald'
                                                                                variant='outline'
                                                                                className='inline-flex max-w-full whitespace-normal text-[11px]'>
                                                                                {component.nombre}
                                                                            </Badge>
                                                                        ))}
                                                                    </div>
                                                                ) : (
                                                                    <div className='mt-4 rounded-2xl border border-dashed border-zinc-200 px-4 py-3 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400'>
                                                                        Este plan a├║n no tiene servicios asociados.
                                                                    </div>
                                                                )}
                                                            </div>

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

                                                            {/* Footer */}
                                                            <div className='flex items-center justify-between border-t border-zinc-200 pt-4 dark:border-zinc-800'>
                                                                <Button
                                                                    variant='solid'
                                                                    color='violet'
                                                                    size='sm'
                                                                    icon='HeroEye'
                                                                    onClick={() => {
                                                                        if (planDetalle) {
                                                                            setSelectedDetail(planDetalle);
                                                                        }
                                                                    }}
                                                                    isDisable={!planDetalle}>
                                                                    Ver detalle
                                                                </Button>

                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* DERECHA: resumen financiero */}
                                                    <Card className='h-fit rounded-3xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950'>
                                                        <CardHeader className='border-b border-zinc-100 px-5 py-3 dark:border-zinc-800'>
                                                            <CardHeaderChild>
                                                                <span className='text-sm font-semibold text-zinc-900 dark:text-zinc-100'>
                                                                    Resumen de cobro
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
                                                                        {formaPago === 'anual' && planPriceAnual && planPriceAnual > 0
                                                                            ? `${formatSubtotalCurrency(planPriceAnual, itemOwnMoneda)} /a├▒o c/u`
                                                                            : planPrice > 0
                                                                              ? `${formatSubtotalCurrency(planPrice, itemOwnMoneda)} /mes c/u`
                                                                              : 'ÔÇö'}
                                                                    </p>
                                                                </div>
                                                                <div className='flex-shrink-0 text-right'>
                                                                    <p className='text-xs text-zinc-400 dark:text-zinc-500'>
                                                                        ├ù{contServ.cantidad || 1}
                                                                    </p>
                                                                    <p className='text-sm font-semibold text-zinc-900 dark:text-zinc-100'>
                                                                        {formatSubtotalCurrency(
                                                                            planTotal,
                                                                            detalleContratoEmpresaCliente.moneda_cobro,
                                                                        )}
                                                                    </p>
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
                                                                                                : 'ÔÇö'}
                                                                                        </p>
                                                                                    </div>
                                                                                    <div className='flex-shrink-0 text-right'>
                                                                                        <p className='text-xs text-zinc-400 dark:text-zinc-500'>
                                                                                            ├ù{addon.cantidad || 1}
                                                                                        </p>
                                                                                        <p className='text-sm font-semibold text-zinc-900 dark:text-zinc-100'>
                                                                                            {formatSubtotalCurrency(
                                                                                                addonTotal,
                                                                                                detalleContratoEmpresaCliente.moneda_cobro,
                                                                                            )}
                                                                                        </p>
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
                                                </div>
                                            );
                                        })()}

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
