import Badge from '@/components/ui/Badge';
import type {
    IContratoEmpresaCliente,
    IContratoItemComercial,
    IContratoServicio,
    ICotizacionVinculadaResumen,
    ICuotaVenta,
    IEmpresaContrato,
    ISeccionContratoGenerada,
} from '@/interface/contrato.interface';
import {
    ContractTextBlock,
    ContractTextList,
    PlanIncludedServicesDetail,
    getPlanComponentDetails,
    isPlanContractSource,
} from './planContractDetail';

interface IContratoDocumentoRendererProps {
    secciones: ISeccionContratoGenerada[];
    contrato: IContratoEmpresaCliente;
    ocultarFirmas?: boolean;
    wrapperClassName?: string;
}

const MONEDA_LABEL: Record<string, string> = {
    CLP: 'Peso chileno (CLP)',
    UF: 'UF',
    USD: 'Dolar (USD)',
};

const PAGO_LABEL: Record<string, string> = {
    mensual: 'Mensual',
    anual: 'Anual',
    pago_unico: 'Pago unico',
};

const PAGO_VENTA_LABEL: Record<string, string> = {
    contado: 'Contado',
    cuotas: 'Cuotas',
};

const getCuotaHitoLabel = (cuota: ICuotaVenta) =>
    cuota.hito_pago_label || cuota.hito_pago_descripcion || 'Sin definir';

const formatFecha = (fecha: string | null | undefined): string => {
    if (!fecha) return '—';
    return new Date(fecha).toLocaleDateString('es-CL', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    });
};

const formatCurrency = (
    value?: number | string | null,
    currency: 'CLP' | 'UF' | 'USD' = 'USD',
) => {
    const amount = Number(value || 0);
    if (currency === 'UF') {
        return `${new Intl.NumberFormat('es-CL', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount)} UF`;
    }
    return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency,
        maximumFractionDigits: currency === 'USD' ? 2 : 0,
    }).format(amount);
};

const normalizeCurrency = (currency?: string | null): 'CLP' | 'UF' | 'USD' => {
    if (currency === '1') return 'USD';
    if (currency === '2') return 'CLP';
    if (currency === '3') return 'UF';
    if (currency === 'CLP' || currency === 'UF' || currency === 'USD') return currency;
    return 'CLP';
};

const getFormaPagoLabel = (contrato: IContratoEmpresaCliente) => {
    if (contrato.tipo === 'venta') {
        return (
            contrato.resumen_comercial?.forma_pago_venta_label ||
            (contrato.forma_pago_venta
                ? PAGO_VENTA_LABEL[contrato.forma_pago_venta]
                : null) ||
            'Contado'
        );
    }
    return PAGO_LABEL[contrato.forma_pago_contractual] || contrato.forma_pago_contractual || '—';
};

const CommercialItemBlock = ({
    item,
    monedaContrato,
}: {
    item: IContratoItemComercial;
    monedaContrato: 'CLP' | 'UF' | 'USD';
}) => (
    <div className='rounded-md border border-gray-100 bg-gray-50/60 px-4 py-4 dark:border-zinc-700 dark:bg-zinc-800/40'>
        <div className='grid gap-3 md:grid-cols-[1fr,120px,160px,160px]'>
            <div>
                <p className='font-medium text-gray-900 dark:text-zinc-100'>
                    {item.snapshot_nombre || item.nombre}
                </p>
                {item.snapshot_num_visitas_mensuales != null &&
                    item.snapshot_num_visitas_mensuales > 0 && (
                        <p className='mt-0.5 text-xs text-blue-600 dark:text-blue-400'>
                            Visitas presenciales/mes: {item.snapshot_num_visitas_mensuales}
                        </p>
                    )}
                {item.snapshot_descripcion && (
                    <p className='mt-1 text-sm text-gray-500 dark:text-zinc-400'>
                        {item.snapshot_descripcion}
                    </p>
                )}
            </div>
            <p className='text-sm text-gray-500 md:text-center dark:text-zinc-400'>
                Cantidad: {item.cantidad}
            </p>
            <p className='text-sm text-gray-600 md:text-right dark:text-zinc-300'>
                {formatCurrency(item.precio_unitario_contratado, monedaContrato)}
            </p>
            <p className='text-sm font-medium text-gray-900 md:text-right dark:text-zinc-100'>
                {formatCurrency(item.subtotal_en_moneda_cobro ?? item.subtotal, monedaContrato)}
            </p>
        </div>

        {item.tipo_origen === 'plan' && (
            <PlanIncludedServicesDetail
                components={getPlanComponentDetails(item)}
                compact
            />
        )}

        <div className='mt-3 space-y-3'>
            <ContractTextList title='Incluye' value={item.snapshot_incluye} />
            <ContractTextList title='No incluye' value={item.snapshot_no_incluye} />
            <ContractTextBlock title='Clausulas especiales' value={item.snapshot_clausulas} />
        </div>
    </div>
);

const LegacyServiceBlock = ({
    service,
    monedaContrato,
}: {
    service: IContratoServicio;
    monedaContrato: 'CLP' | 'UF' | 'USD';
}) => {
    const componentesPlan = isPlanContractSource(service)
        ? getPlanComponentDetails(service)
        : [];

    return (
        <div className='rounded-md border border-gray-100 bg-gray-50/60 px-4 py-4 dark:border-zinc-700 dark:bg-zinc-800/40'>
            <div className='grid gap-3 md:grid-cols-[1fr,120px,160px,160px]'>
                <p className='font-medium text-gray-900 dark:text-zinc-100'>{service.nombre}</p>
                <p className='text-sm text-gray-500 md:text-center dark:text-zinc-400'>
                    Cantidad: {service.cantidad}
                </p>
                <p className='text-sm text-gray-600 md:text-right dark:text-zinc-300'>
                    {formatCurrency(service.precio_unitario, monedaContrato)}
                </p>
                <p className='text-sm font-medium text-gray-900 md:text-right dark:text-zinc-100'>
                    {formatCurrency(service.subtotal_en_moneda_cobro ?? service.subtotal, monedaContrato)}
                </p>
            </div>

            {componentesPlan.length > 0 && (
                <PlanIncludedServicesDetail components={componentesPlan} compact />
            )}

            <div className='mt-3 space-y-3'>
                {'incluye' in service.servicio_generico && (
                    <ContractTextList
                        title='Incluye'
                        value={service.servicio_generico.incluye ?? null}
                    />
                )}
                {'no_incluye' in service.servicio_generico && (
                    <ContractTextList
                        title='No incluye'
                        value={service.servicio_generico.no_incluye ?? null}
                    />
                )}
                {'clausulas_especiales' in service.servicio_generico && (
                    <ContractTextBlock
                        title='Clausulas especiales'
                        value={service.servicio_generico.clausulas_especiales ?? null}
                    />
                )}
            </div>
        </div>
    );
};

const SaleQuotesSection = ({
    cotizaciones,
    monedaContrato,
    cuotas,
    formaPago,
}: {
    cotizaciones: ICotizacionVinculadaResumen[];
    monedaContrato: 'CLP' | 'UF' | 'USD';
    cuotas: ICuotaVenta[];
    formaPago: string;
}) => (
    <section className='rounded-lg border border-gray-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900'>
        <div className='mb-4'>
            <p className='text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-zinc-500'>
                Alcance comercial
            </p>
            <h2 className='text-lg font-semibold text-gray-900 dark:text-zinc-100'>
                Cotizaciones vinculadas
            </h2>
        </div>
        <div className='space-y-4'>
            {cotizaciones.map((cotizacion) => {
                const monedaCotizacion = normalizeCurrency(cotizacion.tipo_moneda);
                return (
                    <div
                        key={cotizacion.id}
                        className='rounded-md border border-gray-100 bg-gray-50/60 px-4 py-4 dark:border-zinc-700 dark:bg-zinc-800/40'>
                        {cotizacion.nombre && (
                            <div className='mb-4'>
                                <p className='font-medium text-gray-900 dark:text-zinc-100'>
                                    {cotizacion.nombre}
                                </p>
                            </div>
                        )}
                        <div className='overflow-hidden rounded-md border border-gray-100 dark:border-zinc-700'>
                            <div className='divide-y divide-gray-100 dark:divide-zinc-700'>
                                {cotizacion.items.map((item) => (
                                    <div
                                        key={item.id}
                                        className='grid gap-3 px-4 py-3 md:grid-cols-[1fr,120px,160px,160px]'>
                                        <p className='font-medium text-gray-900 dark:text-zinc-100'>
                                            {item.nombre}
                                        </p>
                                        <p className='text-sm text-gray-500 md:text-center dark:text-zinc-400'>
                                            Cantidad: {item.cantidad}
                                        </p>
                                        <p className='text-sm text-gray-600 md:text-right dark:text-zinc-300'>
                                            {formatCurrency(item.precio_unitario, monedaCotizacion)}
                                        </p>
                                        <p className='text-sm font-medium text-gray-900 md:text-right dark:text-zinc-100'>
                                            {formatCurrency(item.costo_total, monedaCotizacion)}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
        <div className='mt-5 rounded-md border border-gray-100 bg-gray-50 px-4 py-4 dark:border-zinc-700 dark:bg-zinc-800/50'>
            <div className='flex items-center justify-between gap-3'>
                <div>
                    <p className='text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-zinc-500'>
                        Condicion de pago
                    </p>
                    <p className='text-sm font-medium text-gray-900 dark:text-zinc-100'>{formaPago}</p>
                </div>
                <Badge color={cuotas.length > 0 ? 'amber' : 'emerald'} variant='outline'>
                    {formaPago}
                </Badge>
            </div>
            {cuotas.length > 0 && (
                <div className='mt-4 overflow-hidden rounded-md border border-gray-100 dark:border-zinc-700'>
                    <div className='grid grid-cols-[120px,1fr,1.4fr,1fr] bg-gray-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:bg-zinc-800 dark:text-zinc-400'>
                        <span>Cuota</span>
                        <span className='text-center'>Porcentaje</span>
                        <span>Hito de cobro</span>
                        <span className='text-right'>Monto</span>
                    </div>
                    <div className='divide-y divide-gray-100 dark:divide-zinc-700'>
                        {cuotas.map((cuota) => (
                            <div
                                key={cuota.orden}
                                className='grid grid-cols-[120px,1fr,1.4fr,1fr] px-4 py-3 text-sm text-gray-700 dark:text-zinc-300'>
                                <span className='font-medium'>Cuota {cuota.orden}</span>
                                <span className='text-center'>{cuota.porcentaje}%</span>
                                <span>{getCuotaHitoLabel(cuota)}</span>
                                <span className='text-right font-medium'>
                                    {formatCurrency(cuota.monto, monedaContrato)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    </section>
);

const CommercialItemsSection = ({
    items,
    services,
    monedaContrato,
}: {
    items: IContratoItemComercial[];
    services: IContratoServicio[];
    monedaContrato: 'CLP' | 'UF' | 'USD';
}) => {
    if (items.length === 0 && services.length === 0) return null;

    return (
        <section className='rounded-lg border border-gray-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900'>
            <div className='mb-4'>
                <p className='text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-zinc-500'>
                    Alcance
                </p>
                <h2 className='text-lg font-semibold text-gray-900 dark:text-zinc-100'>
                    Servicios incluidos
                </h2>
            </div>
            <div className='space-y-4'>
                {items.length > 0
                    ? items.map((item) => (
                          <CommercialItemBlock
                              key={item.id}
                              item={item}
                              monedaContrato={monedaContrato}
                          />
                      ))
                    : services.map((service) => (
                          <LegacyServiceBlock
                              key={service.id}
                              service={service}
                              monedaContrato={monedaContrato}
                          />
                      ))}
            </div>
        </section>
    );
};

export const ClientIdentificationSection = ({ cliente }: { cliente: IEmpresaContrato }) => {
    const rep = cliente.representantes_legales?.[0] ?? null;
    const rows: { label: string; value: string }[] = [
        { label: 'Nombre o Raz\u00f3n Social', value: cliente.nombre || '\u2014' },
        { label: 'R.U.T', value: cliente.rut_empresa || '' },
        { label: 'Domicilio', value: cliente.direccion_principal || '' },
        { label: 'Giro o actividad', value: '' },
        { label: 'Representante legal', value: rep?.nombre_usuario ?? '' },
        { label: 'R.U.T', value: rep?.papeleta?.rut ?? '' },
        { label: 'E-mail', value: rep?.email_usuario ?? '' },
    ];

    return (
        <section className='rounded-lg border border-gray-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900'>
            <div className='mb-4'>
                <p className='text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-zinc-500'>
                    Identificaci&oacute;n
                </p>
                <h2 className='text-lg font-semibold text-gray-900 dark:text-zinc-100'>
                    1.- Identificaci&oacute;n de &quot;EL CLIENTE&quot;
                </h2>
            </div>
            <div className='overflow-hidden rounded-md border border-gray-200 dark:border-zinc-700'>
                {rows.map((row, i) => (
                    <div
                        key={i}
                        className={`grid grid-cols-[200px,1fr] text-sm${
                            i > 0 ? ' border-t border-gray-200 dark:border-zinc-700' : ''
                        }`}>
                        <div className='border-r border-gray-200 px-3 py-2 font-medium text-gray-600 dark:border-zinc-700 dark:text-zinc-400'>
                            {row.label}
                        </div>
                        <div className='px-3 py-2 text-gray-900 dark:text-zinc-100'>
                            {row.value || (
                                <span className='italic text-gray-400 dark:text-zinc-600'>&mdash;</span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
};

function ContratoDocumentoRenderer({
    secciones,
    contrato,
    ocultarFirmas = false,
    wrapperClassName,
}: IContratoDocumentoRendererProps) {
    // Plantilla v2.9 (documento único Slate + WeasyPrint): no hay `secciones`
    // que iterar (una plantilla v2.9 no tiene SeccionPlantilla) — el HTML
    // completo ya viene resuelto del backend (mismo motor que genera el PDF
    // real), firmas incluidas. Sin esta rama, un contrato v2.9 se mostraba
    // en blanco en la vista pública (aprobación/firma/resumen), porque el
    // resto de este componente solo sabe iterar `secciones`.
    if (contrato.documento_v29_html) {
        return (
            <div className={wrapperClassName ?? 'mx-auto flex max-w-4xl flex-col gap-6'}>
                <section className='rounded-lg border border-gray-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900'>
                    <div className='mb-4 text-center'>
                        <h1 className='text-2xl font-bold text-gray-900 dark:text-zinc-100'>
                            {contrato.nombre || 'Contrato'}
                        </h1>
                        <p className='mt-1 text-sm text-gray-500 dark:text-zinc-400'>{contrato.tipo_label}</p>
                    </div>
                    <div
                        className='v29-preview-html'
                        // eslint-disable-next-line react/no-danger
                        dangerouslySetInnerHTML={{ __html: contrato.documento_v29_html }}
                    />
                </section>
            </div>
        );
    }

    const empresaPrestadora = contrato.datos_empresa;
    const empresaCliente = contrato.datos_cliente;
    const monedaContrato = contrato.moneda_cobro || 'USD';
    const cotizaciones = contrato.cotizaciones_vinculadas ?? [];
    const cuotasVenta = contrato.resumen_comercial?.cuotas_venta_resumen ?? [];
    const acuerdos = contrato.firmas_confidencialidad ?? [];
    const condiciones = contrato.contrato_condiciones_especiales ?? [];
    const licencias = contrato.contrato_licencias ?? [];
    // Los tipos bloque_* y firmas se renderizan por separado con datos reales del contrato.
    // Se excluyen del loop principal para evitar stubs vacíos (contenido_renderizado = '').
    const TIPOS_SEPARADOS = new Set([
        'firmas',
        'bloque_servicios',
        'bloque_licencias',
        'bloque_condiciones_especiales',
        'bloque_resumen_comercial',
        'bloque_acuerdos',
    ]);
    const seccionesContenido = secciones.filter((s) => !TIPOS_SEPARADOS.has(s.tipo ?? ''));
    const seccionesFirmas = secciones.filter((s) => s.tipo === 'firmas');

    return (
        <div className={wrapperClassName ?? 'mx-auto flex max-w-4xl flex-col gap-6'}>
            <section className='rounded-lg border border-gray-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900'>
                <div className='mb-4 text-center'>
                    <h1 className='text-2xl font-bold text-gray-900 dark:text-zinc-100'>
                        {contrato.nombre || 'Contrato'}
                    </h1>
                    <p className='mt-1 text-sm text-gray-500 dark:text-zinc-400'>{contrato.tipo_label}</p>
                </div>
                <div className='mt-6 grid grid-cols-1 gap-4 md:grid-cols-2'>
                    <div className='rounded-md border border-gray-100 bg-gray-50 p-4 dark:border-zinc-700 dark:bg-zinc-800'>
                        <p className='mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-zinc-500'>
                            Empresa Prestadora
                        </p>
                        <p className='font-semibold text-gray-900 dark:text-zinc-100'>{empresaPrestadora?.nombre || '—'}</p>
                        {empresaPrestadora?.rut_empresa && <p className='text-sm text-gray-600 dark:text-zinc-400'>RUT: {empresaPrestadora.rut_empresa}</p>}
                    </div>
                    <div className='rounded-md border border-gray-100 bg-gray-50 p-4 dark:border-zinc-700 dark:bg-zinc-800'>
                        <p className='mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-zinc-500'>
                            Empresa Cliente
                        </p>
                        <p className='font-semibold text-gray-900 dark:text-zinc-100'>{empresaCliente?.nombre || '—'}</p>
                        {empresaCliente?.rut_empresa && <p className='text-sm text-gray-600 dark:text-zinc-400'>RUT: {empresaCliente.rut_empresa}</p>}
                    </div>
                </div>
                <div className='mt-4 grid grid-cols-2 gap-4 rounded-md border border-gray-100 bg-gray-50 p-4 md:grid-cols-4 dark:border-zinc-700 dark:bg-zinc-800'>
                    <div>
                        <p className='text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-zinc-500'>Inicio</p>
                        <p className='text-sm font-medium text-gray-800 dark:text-zinc-200'>{formatFecha(contrato.fecha_inicio)}</p>
                    </div>
                    <div>
                        <p className='text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-zinc-500'>Termino</p>
                        <p className='text-sm font-medium text-gray-800 dark:text-zinc-200'>{formatFecha(contrato.fecha_fin)}</p>
                    </div>
                    <div>
                        <p className='text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-zinc-500'>Moneda contractual</p>
                        <p className='text-sm font-medium text-gray-800 dark:text-zinc-200'>{MONEDA_LABEL[monedaContrato] || monedaContrato}</p>
                    </div>
                    <div>
                        <p className='text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-zinc-500'>Forma de pago</p>
                        <p className='text-sm font-medium text-gray-800 dark:text-zinc-200'>{getFormaPagoLabel(contrato)}</p>
                    </div>
                </div>
            </section>

            <ClientIdentificationSection cliente={empresaCliente} />

            {seccionesContenido.map((seccion) => (
                <section
                    key={seccion.id}
                    className='rounded-lg border border-gray-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900'>
                    {seccion.titulo && <h3 className='mb-3 text-base font-semibold text-gray-900 dark:text-zinc-100'>{seccion.titulo}</h3>}
                    <div
                        className='prose prose-sm max-w-none text-justify text-gray-700 dark:prose-invert dark:text-zinc-300'
                        dangerouslySetInnerHTML={{ __html: seccion.contenido_renderizado }}
                    />
                </section>
            ))}

            {contrato.tipo === 'venta' ? (
                cotizaciones.length > 0 && (
                    <SaleQuotesSection
                        cotizaciones={cotizaciones}
                        monedaContrato={monedaContrato}
                        cuotas={cuotasVenta}
                        formaPago={getFormaPagoLabel(contrato)}
                    />
                )
            ) : (
                <CommercialItemsSection
                    items={contrato.items_comerciales ?? []}
                    services={contrato.contrato_servicios ?? []}
                    monedaContrato={monedaContrato}
                />
            )}

            {licencias.length > 0 && (
                <section className='rounded-lg border border-gray-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900'>
                    <div className='mb-4'>
                        <p className='text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-zinc-500'>Licencias</p>
                        <h2 className='text-lg font-semibold text-gray-900 dark:text-zinc-100'>Licencias contratadas</h2>
                    </div>
                    <div className='space-y-2'>
                        {licencias.map((licencia) => (
                            <div key={licencia.id} className='rounded-md border border-gray-100 bg-gray-50/60 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800/50'>
                                <p className='font-medium text-gray-900 dark:text-zinc-100'>{licencia.nombre_licencia}</p>
                                <p className='text-sm text-gray-500 dark:text-zinc-400'>{licencia.modalidad_snapshot_label}</p>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {condiciones.length > 0 && (
                <section className='rounded-lg border border-gray-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900'>
                    <div className='mb-4'>
                        <p className='text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-zinc-500'>Condiciones</p>
                        <h2 className='text-lg font-semibold text-gray-900 dark:text-zinc-100'>Condiciones especiales</h2>
                    </div>
                    <div className='space-y-3'>
                        {condiciones.map((condicion) => (
                            <div key={condicion.id} className='rounded-md border border-gray-100 bg-gray-50/60 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800/50'>
                                <p className='font-medium text-gray-900 dark:text-zinc-100'>{condicion.titulo_condicion}</p>
                                <p className='mt-1 whitespace-pre-wrap text-sm leading-6 text-gray-600 dark:text-zinc-300'>
                                    {condicion.detalle_condicion || condicion.descripcion_condicion}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {contrato.total_contrato != null && contrato.total_contrato > 0 && (
                <section className='rounded-lg border border-gray-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900'>
                    <div className='flex items-center justify-between gap-3'>
                        <div>
                            <p className='text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-zinc-500'>Resumen comercial</p>
                            <h2 className='text-lg font-semibold text-gray-900 dark:text-zinc-100'>
                                {contrato.tipo === 'venta' ? 'Total contractual consolidado' : 'Total contractual referencial'}
                            </h2>
                        </div>
                        <Badge variant='outline' color='emerald'>
                            {formatCurrency(contrato.total_contrato, monedaContrato)}
                        </Badge>
                    </div>
                </section>
            )}

            {acuerdos.length > 0 && (
                <section className='rounded-lg border border-gray-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900'>
                    <div className='mb-4'>
                        <p className='text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-zinc-500'>Confidencialidad</p>
                        <h2 className='text-lg font-semibold text-gray-900 dark:text-zinc-100'>Acuerdos asociados</h2>
                    </div>
                    <div className='space-y-3'>
                        {acuerdos.map((acuerdo) => (
                            <div key={acuerdo.id} className='rounded-md border border-gray-100 bg-gray-50/60 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800/50'>
                                <p className='font-medium text-gray-900 dark:text-zinc-100'>{acuerdo.titulo_acuerdo}</p>
                                <p className='mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-600 dark:text-zinc-300'>{acuerdo.contenido_acuerdo}</p>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {!ocultarFirmas &&
                seccionesFirmas.map((seccion) => (
                    <section
                        key={seccion.id}
                        className='rounded-lg border border-gray-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900'>
                        <h2 className='mb-6 text-center text-base font-semibold uppercase tracking-wide text-gray-700 dark:text-zinc-400'>Firmas</h2>
                        <div className='grid grid-cols-2 gap-8 text-center'>
                            <div>
                                <div className='mx-auto mb-2 h-16 w-48 border-b border-gray-400 dark:border-zinc-600' />
                                <p className='text-sm font-medium text-gray-800 dark:text-zinc-200'>Empresa Prestadora</p>
                                <p className='text-xs text-gray-500 dark:text-zinc-500'>{empresaPrestadora?.nombre || ''}</p>
                            </div>
                            <div>
                                <div className='mx-auto mb-2 h-16 w-48 border-b border-gray-400 dark:border-zinc-600' />
                                <p className='text-sm font-medium text-gray-800 dark:text-zinc-200'>Empresa Cliente</p>
                                <p className='text-xs text-gray-500 dark:text-zinc-500'>{empresaCliente?.nombre || ''}</p>
                            </div>
                        </div>
                    </section>
                ))}

            {secciones.length === 0 && (
                <section className='rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-400 dark:border-zinc-600 dark:text-zinc-500'>
                    Este contrato no tiene secciones generadas desde una plantilla.
                </section>
            )}
        </div>
    );
}

export default ContratoDocumentoRenderer;
