import Badge from '@/components/ui/Badge';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import AgregarServiciosyPlanesContrato from '../modals/AgregarServiciosyPlanesContrato';
import { ITabServiciosProps } from './contrato.types';

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

const normalizeScopeItems = (value?: string | null) =>
    (value ?? '')
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => line.replace(/^[-*•]\s*/, '').trim())
        .filter(Boolean);

const renderScopeList = (label: string, value?: string | null) => {
    const items = normalizeScopeItems(value);
    if (items.length === 0) return null;

    return (
        <div className='rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/40'>
            <div className='text-sm font-semibold text-zinc-900 dark:text-zinc-100'>
                {label}:
            </div>
            <ul className='mt-2 list-disc space-y-1.5 pl-5 text-sm leading-6 text-zinc-700 dark:text-zinc-300'>
                {items.map((item) => (
                    <li key={`${label}-${item}`}>{item}</li>
                ))}
            </ul>
        </div>
    );
};

const renderTextBlock = (label: string, value?: string | null) => {
    if (!value) return null;

    return (
        <div className='rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/40'>
            <div className='text-[11px] font-semibold uppercase tracking-wide text-zinc-500'>
                {label}
            </div>
            <div className='mt-1 whitespace-pre-wrap text-sm leading-6 text-zinc-700 dark:text-zinc-300'>
                {value}
            </div>
        </div>
    );
};

const TabServicios = ({
    detalleContratoEmpresaCliente,
    listaContentType,
    puedeEditar,
}: ITabServiciosProps) => {
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

    const totalServicios = itemsServicios.reduce(
        (sum, servicio) => sum + Number(servicio.subtotal || 0),
        0,
    );

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
                {itemsServicios.length > 0 ? (
                    <>
                        <div className='grid gap-4 xl:grid-cols-2'>
                            {itemsServicios.map((contServ) => {
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
                                const servicioGenerico = (contServ.servicio_generico ??
                                    {}) as {
                                    categoria_label?: string;
                                    incluye?: string | null;
                                    no_incluye?: string | null;
                                    clausulas_especiales?: string | null;
                                    servicios?: Array<{ id: number; nombre: string }>;
                                };
                                const subtotal = Number(contServ.subtotal || 0);

                                return (
                                    <div
                                        className='rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/30'
                                        key={contServ.id}>
                                        <div className='flex flex-wrap items-start justify-between gap-3'>
                                            <div>
                                                <Badge
                                                    color={esServicio ? 'blue' : 'emerald'}
                                                    variant='outline'>
                                                    {esServicio ? 'Servicio' : 'Plan'}
                                                </Badge>
                                                <div className='mt-3 text-lg font-semibold text-zinc-900 dark:text-zinc-50'>
                                                    {contServ.nombre}
                                                </div>
                                                {esServicio && servicioGenerico.categoria_label && (
                                                        <div className='mt-1 text-sm text-zinc-500'>
                                                            {servicioGenerico.categoria_label}
                                                        </div>
                                                    )}
                                            </div>
                                            <div className='rounded-2xl bg-zinc-50 px-4 py-3 text-right dark:bg-zinc-900/60'>
                                                <div className='text-[11px] uppercase tracking-wide text-zinc-500'>
                                                    Subtotal
                                                </div>
                                                <div className='text-base font-semibold text-zinc-900 dark:text-zinc-100'>
                                                    {formatSubtotalCurrency(
                                                        subtotal,
                                                        detalleContratoEmpresaCliente.moneda_cobro,
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className='mt-4 grid gap-3 sm:grid-cols-3'>
                                            <div className='rounded-2xl border border-zinc-200 p-3 dark:border-zinc-800'>
                                                <div className='text-[11px] uppercase tracking-wide text-zinc-500'>
                                                    Cantidad
                                                </div>
                                                <div className='mt-1 text-sm font-medium'>
                                                    {contServ.cantidad}
                                                </div>
                                            </div>
                                            <div className='rounded-2xl border border-zinc-200 p-3 dark:border-zinc-800'>
                                                <div className='text-[11px] uppercase tracking-wide text-zinc-500'>
                                                    Precio unitario
                                                </div>
                                                <div className='mt-1 text-sm font-medium'>
                                                    {formatCurrency(
                                                        Number(
                                                            'precio_unitario_contratado' in contServ
                                                                ? contServ.precio_unitario_contratado
                                                                : contServ.precio_unitario || 0,
                                                        ),
                                                        detalleContratoEmpresaCliente.moneda_cobro,
                                                    )}
                                                </div>
                                            </div>
                                            <div className='rounded-2xl border border-zinc-200 p-3 dark:border-zinc-800'>
                                                <div className='text-[11px] uppercase tracking-wide text-zinc-500'>
                                                    Referencia
                                                </div>
                                                <div className='mt-1 text-sm font-medium'>
                                                    {'catalogo_version_id' in contServ &&
                                                    contServ.catalogo_version_id
                                                        ? `#${contServ.catalogo_version_id}`
                                                        : 'object_id' in contServ
                                                          ? `#${contServ.object_id}`
                                                          : 'Sin referencia'}
                                                </div>
                                            </div>
                                        </div>

                                        {!esServicio &&
                                            Array.isArray(servicioGenerico.servicios) &&
                                            servicioGenerico.servicios.length > 0 && (
                                                <div className='mt-4'>
                                                    <div className='mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500'>
                                                        Servicios incluidos en el plan
                                                    </div>
                                                    <div className='flex flex-wrap gap-2'>
                                                        {servicioGenerico.servicios.map((servicio) => (
                                                            <Badge
                                                                key={servicio.id}
                                                                color='emerald'
                                                                variant='outline'>
                                                                {servicio.nombre}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                        <div className='mt-4 space-y-3'>
                                            {renderScopeList(
                                                'Incluye',
                                                servicioGenerico.incluye ?? null,
                                            )}
                                            {renderScopeList(
                                                'No incluye',
                                                servicioGenerico.no_incluye ?? null,
                                            )}
                                            {renderTextBlock(
                                                'Clausulas especiales',
                                                servicioGenerico.clausulas_especiales ?? null,
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className='flex justify-end border-t border-zinc-200 pt-4 dark:border-zinc-800'>
                            <div className='rounded-2xl bg-blue-50 px-4 py-3 text-right dark:bg-blue-950/20'>
                                <div className='text-[11px] uppercase tracking-wide text-blue-600 dark:text-blue-300'>
                                    Total referencial
                                </div>
                                <div className='text-lg font-semibold text-blue-700 dark:text-blue-200'>
                                    {formatSubtotalCurrency(
                                        totalServicios,
                                        detalleContratoEmpresaCliente.moneda_cobro,
                                    )}
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
