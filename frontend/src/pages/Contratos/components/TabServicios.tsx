import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
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

                                return (
                                    <div
                                        className='rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/30'
                                        key={contServ.id}>
                                        {/* Encabezado: badge + nombre + (ojo) + subtotal */}
                                        <div className='flex flex-wrap items-start justify-between gap-3'>
                                            <div className='min-w-0 flex-1'>
                                                <div className='flex flex-wrap items-center gap-1.5'>
                                                    <Badge
                                                        color={esServicio ? 'blue' : 'emerald'}
                                                        variant='outline'>
                                                        {esServicio ? 'Servicio' : 'Plan'}
                                                    </Badge>
                                                    {usesConvertedSubtotal &&
                                                        itemOwnMoneda !== itemMoneda && (
                                                            <Badge
                                                                color='amber'
                                                                variant='outline'>
                                                                {itemOwnMoneda} → {itemMoneda}
                                                            </Badge>
                                                        )}
                                                </div>
                                                <div className='mt-2 flex items-center gap-1.5'>
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
                                                </div>
                                                {esServicio && sg.categoria_label && (
                                                    <div className='mt-1 text-sm text-zinc-500'>
                                                        {sg.categoria_label}
                                                    </div>
                                                )}
                                            </div>
                                            <div className='rounded-2xl bg-zinc-50 px-4 py-3 text-right dark:bg-zinc-900/60'>
                                                <div className='text-[11px] uppercase tracking-wide text-zinc-500'>
                                                    {periodoLabel === 'anual' ? 'Total anual' : `Subtotal ${periodoLabel}`}
                                                </div>
                                                <div className='text-base font-semibold text-zinc-900 dark:text-zinc-100'>
                                                    {formatSubtotalCurrency(subtotal, itemMoneda)}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Cantidad / Precio unitario / Referencia */}
                                        <dl className='mt-4 grid gap-3 sm:grid-cols-3 text-sm'>
                                            <div className='rounded-2xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/40'>
                                                <dt className='text-[11px] uppercase tracking-wide text-zinc-500'>
                                                    Cantidad
                                                </dt>
                                                <dd className='mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100'>
                                                    {contServ.cantidad}
                                                </dd>
                                            </div>

                                            <div className='rounded-2xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/40'>
                                                <dt className='text-[11px] uppercase tracking-wide text-zinc-500'>
                                                    Precio unitario
                                                </dt>
                                                <dd className='mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100'>
                                                    {formatCurrency(
                                                        Number(
                                                            'precio_unitario_contratado' in contServ
                                                                ? contServ.precio_unitario_contratado
                                                                : contServ.precio_unitario || 0,
                                                        ),
                                                        itemOwnMoneda,
                                                    )}
                                                    {formaPago === 'anual' && (
                                                        <span className='ml-0.5 text-[10px] font-normal text-zinc-400'>
                                                            /mes
                                                        </span>
                                                    )}
                                                </dd>
                                                {usesConvertedSubtotal &&
                                                    itemOwnMoneda !== itemMoneda && (
                                                        <dd className='mt-0.5 text-[10px] text-zinc-400'>
                                                            precio en {itemOwnMoneda}
                                                        </dd>
                                                    )}
                                            </div>

                                            <div className='rounded-2xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/40'>
                                                <dt className='text-[11px] uppercase tracking-wide text-zinc-500'>
                                                    Referencia
                                                </dt>
                                                <dd className='mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100'>
                                                    {'catalogo_version_id' in contServ &&
                                                    contServ.catalogo_version_id
                                                        ? `#${contServ.catalogo_version_id}`
                                                        : 'object_id' in contServ
                                                          ? `#${contServ.object_id}`
                                                          : 'Sin referencia'}
                                                </dd>
                                            </div>
                                        </dl>

                                        {/* Plan: servicios incluidos compactos con ojo */}
                                        {esPlan && (
                                            <PlanIncludedServicesDetail
                                                components={componentesPlan}
                                            />
                                        )}

                                    </div>
                                );
                            })}
                        </div>
                        {addonItems.length > 0 && (
                            <Card className='rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/30'>
                                <CardHeader className='border-b border-zinc-200 pb-3 dark:border-zinc-800'>
                                    <div className='text-sm font-semibold text-zinc-900 dark:text-zinc-100'>
                                        Servicios agregados ({addonItems.length})
                                    </div>
                                </CardHeader>
                                <CardBody className='space-y-3 py-4'>
                                    <div className='divide-y divide-zinc-100 rounded-3xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800'>
                                        {addonItems.map((addon) => {
                                            const addonUsesConverted =
                                                'subtotal_en_moneda_cobro' in addon &&
                                                addon.subtotal_en_moneda_cobro != null;
                                            const addonMoneda: 'CLP' | 'UF' | 'USD' =
                                                addonUsesConverted
                                                    ? detalleContratoEmpresaCliente.moneda_cobro
                                                    : 'moneda' in addon && addon.moneda
                                                      ? (addon.moneda as 'CLP' | 'UF' | 'USD')
                                                      : detalleContratoEmpresaCliente.moneda_cobro;
                                            const addonSubtotal = Number(
                                                addonUsesConverted
                                                    ? (addon as { subtotal_en_moneda_cobro: number }).subtotal_en_moneda_cobro
                                                    : addon.subtotal || 0,
                                            );
                                            const addonSg = (addon.servicio_generico ?? {}) as {
                                                incluye?: string | null;
                                                no_incluye?: string | null;
                                                clausulas_especiales?: string | null;
                                                descripcion?: string | null;
                                            };
                                            const hasAddonDetail = Boolean(
                                                addonSg.incluye ||
                                                    addonSg.no_incluye ||
                                                    addonSg.clausulas_especiales ||
                                                    addonSg.descripcion,
                                            );
                                            return (
                                                <div
                                                    key={addon.id}
                                                    className='flex items-center justify-between px-3 py-3 first:rounded-t-3xl last:rounded-b-3xl hover:bg-zinc-50 dark:hover:bg-zinc-900/40'>
                                                    <div className='min-w-0'>
                                                        <p className='text-sm font-medium text-zinc-900 dark:text-zinc-100'>
                                                            {addon.nombre}
                                                        </p>
                                                        <p className='mt-1 text-xs text-zinc-500 dark:text-zinc-400'>
                                                            {addon.cantidad ?? 1} × {formatCurrency(
                                                                Number(
                                                                    'precio_unitario_contratado' in addon
                                                                        ? addon.precio_unitario_contratado
                                                                        : addon.precio_unitario || 0,
                                                                ),
                                                                addonMoneda,
                                                            )}
                                                        </p>
                                                        {addonUsesConverted &&
                                                            'moneda' in addon &&
                                                            addon.moneda &&
                                                            addon.moneda !== addonMoneda && (
                                                                <p className='mt-0.5 text-xs text-zinc-400'>
                                                                    ≈ {formatSubtotalCurrency(
                                                                        Number(addon.subtotal ?? 0),
                                                                        addon.moneda as 'CLP' | 'UF' | 'USD',
                                                                    )}
                                                                </p>
                                                            )}
                                                    </div>
                                                    <div className='text-right'>
                                                        <p className='text-sm font-semibold text-zinc-900 dark:text-zinc-100'>
                                                            {formatSubtotalCurrency(addonSubtotal, addonMoneda)}
                                                        </p>
                                                        {formaPago === 'anual' && (
                                                            <p className='mt-0.5 text-xs text-zinc-400'>
                                                                Total anual: {formatSubtotalCurrency(addonSubtotal * 12, addonMoneda)}
                                                            </p>
                                                        )}
                                                    </div>
                                                    {hasAddonDetail && (
                                                        <Button
                                                            color='zinc'
                                                            variant='plain'
                                                            icon='HeroEye'
                                                            size='sm'
                                                            onClick={() =>
                                                                setSelectedDetail(
                                                                    buildDetailFromItem(addon),
                                                                )
                                                            }
                                                        />
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </CardBody>
                            </Card>
                        )}

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
