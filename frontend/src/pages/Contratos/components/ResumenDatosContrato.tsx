import Badge from '@/components/ui/Badge';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import type {
    IContratoEmpresaCliente,
    IContratoItemComercial,
    IContratoServicio,
    ICotizacionVinculadaResumen,
    ICuotaVenta,
} from '@/interface/contrato.interface';
import {
    ContractTextBlock,
    ContractTextList,
    getPlanComponentDetails,
    isPlanContractSource,
    PlanIncludedServicesDetail,
} from './planContractDetail';

interface IResumenDatosContratoProps {
    contrato: IContratoEmpresaCliente;
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
    const d = new Date(fecha);
    return d.toLocaleDateString('es-CL', {
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

const CommercialItemContent = ({
    item,
}: {
    item: IContratoItemComercial;
}) => {
    const componentesPlan = item.tipo_origen === 'plan' ? getPlanComponentDetails(item) : [];

    return (
        <div className='space-y-3'>
            <div>
                <span className='font-medium'>{item.snapshot_nombre || item.nombre}</span>
                {item.snapshot_num_visitas_mensuales != null &&
                    item.snapshot_num_visitas_mensuales > 0 && (
                        <p className='mt-0.5 text-xs text-blue-600 dark:text-blue-400'>
                            Visitas presenciales/mes: {item.snapshot_num_visitas_mensuales}
                        </p>
                    )}
                {item.snapshot_descripcion && (
                    <p className='mt-1 text-xs text-gray-500 dark:text-zinc-400'>
                        {item.snapshot_descripcion}
                    </p>
                )}
            </div>

            {item.tipo_origen === 'plan' && (
                <PlanIncludedServicesDetail
                    components={componentesPlan}
                    compact
                />
            )}

            <div className='space-y-3'>
                <ContractTextList title='Incluye' value={item.snapshot_incluye} />
                <ContractTextList title='No incluye' value={item.snapshot_no_incluye} />
                <ContractTextBlock title='Clausulas especiales' value={item.snapshot_clausulas} />
            </div>
        </div>
    );
};

const TablaItemsComerciales = ({
    items,
    moneda,
}: {
    items: IContratoItemComercial[];
    moneda: 'CLP' | 'UF' | 'USD';
}) => (
    <Table>
        <THead>
            <Tr>
                <Th>Servicio / Item</Th>
                <Th className='text-center'>Cantidad</Th>
                <Th className='text-right'>Precio unitario</Th>
                <Th className='text-right'>Subtotal</Th>
            </Tr>
        </THead>
        <TBody>
            {items.map((item) => (
                <Tr key={item.id}>
                    <Td>
                        <CommercialItemContent item={item} />
                    </Td>
                    <Td className='text-center'>{item.cantidad}</Td>
                    <Td className='text-right'>
                        {formatCurrency(item.precio_unitario_contratado, moneda)}
                    </Td>
                    <Td className='text-right font-medium'>
                        {formatCurrency(item.subtotal_en_moneda_cobro ?? item.subtotal, moneda)}
                    </Td>
                </Tr>
            ))}
        </TBody>
    </Table>
);

const LegacyServiceContent = ({
    servicio,
}: {
    servicio: IContratoServicio;
}) => {
    const componentesPlan = isPlanContractSource(servicio)
        ? getPlanComponentDetails(servicio)
        : [];

    return (
        <div className='space-y-3'>
            <div>
                <span className='font-medium'>{servicio.nombre}</span>
            </div>

            {componentesPlan.length > 0 && (
                <PlanIncludedServicesDetail components={componentesPlan} compact />
            )}

            <div className='space-y-3'>
                {'incluye' in servicio.servicio_generico && (
                    <ContractTextList
                        title='Incluye'
                        value={servicio.servicio_generico.incluye ?? null}
                    />
                )}
                {'no_incluye' in servicio.servicio_generico && (
                    <ContractTextList
                        title='No incluye'
                        value={servicio.servicio_generico.no_incluye ?? null}
                    />
                )}
                {'clausulas_especiales' in servicio.servicio_generico && (
                    <ContractTextBlock
                        title='Clausulas especiales'
                        value={servicio.servicio_generico.clausulas_especiales ?? null}
                    />
                )}
            </div>
        </div>
    );
};

const TablaServiciosLegacy = ({
    servicios,
    moneda,
}: {
    servicios: IContratoServicio[];
    moneda: 'CLP' | 'UF' | 'USD';
}) => (
    <Table>
        <THead>
            <Tr>
                <Th>Servicio</Th>
                <Th className='text-center'>Cantidad</Th>
                <Th className='text-right'>Precio unitario</Th>
                <Th className='text-right'>Subtotal</Th>
            </Tr>
        </THead>
        <TBody>
            {servicios.map((servicio) => (
                <Tr key={servicio.id}>
                    <Td>
                        <LegacyServiceContent servicio={servicio} />
                    </Td>
                    <Td className='text-center'>{servicio.cantidad}</Td>
                    <Td className='text-right'>
                        {formatCurrency(servicio.precio_unitario, moneda)}
                    </Td>
                    <Td className='text-right font-medium'>
                        {formatCurrency(servicio.subtotal, moneda)}
                    </Td>
                </Tr>
            ))}
        </TBody>
    </Table>
);

const TablaCotizacionesVenta = ({
    cotizaciones,
    monedaContrato,
}: {
    cotizaciones: ICotizacionVinculadaResumen[];
    monedaContrato: 'CLP' | 'UF' | 'USD';
}) => (
    <div className='space-y-4'>
        {cotizaciones.map((cotizacion) => {
            const monedaCotizacion = normalizeCurrency(cotizacion.tipo_moneda);
            const monedaConvertida = cotizacion.moneda_contrato || monedaContrato;
            return (
                <div
                    key={cotizacion.id}
                    className='rounded-lg border border-gray-100 bg-gray-50/60 p-4 dark:border-zinc-700 dark:bg-zinc-800/40'>
                    <div className='mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between'>
                        <div>
                            <p className='font-semibold text-gray-900 dark:text-zinc-100'>
                                Cotizacion #{cotizacion.numero_cotizacion || cotizacion.id}
                            </p>
                            <p className='text-sm text-gray-500 dark:text-zinc-400'>
                                {cotizacion.nombre || 'Sin nombre'}
                            </p>
                        </div>
                        <div className='grid gap-1 text-sm md:text-right'>
                            <p className='text-gray-500 dark:text-zinc-400'>
                                Moneda original: {cotizacion.tipo_moneda_label || monedaCotizacion}
                            </p>
                            <p className='font-medium text-gray-900 dark:text-zinc-100'>
                                Total cotizacion:{' '}
                                {formatCurrency(cotizacion.total_estimado, monedaCotizacion)}
                            </p>
                            {cotizacion.total_convertido != null && (
                                <p className='font-medium text-emerald-700 dark:text-emerald-300'>
                                    Total convertido:{' '}
                                    {formatCurrency(cotizacion.total_convertido, monedaConvertida)}
                                </p>
                            )}
                            {cotizacion.dolar_observado != null && (
                                <p className='text-xs text-gray-500 dark:text-zinc-400'>
                                    Dolar observado: {formatCurrency(cotizacion.dolar_observado, 'CLP')}
                                </p>
                            )}
                            {cotizacion.valor_uf != null && (
                                <p className='text-xs text-gray-500 dark:text-zinc-400'>
                                    Valor UF: {formatCurrency(cotizacion.valor_uf, 'CLP')}
                                </p>
                            )}
                            {cotizacion.tiene_items_moneda_mixta && (
                                <p className='text-xs text-amber-700 dark:text-amber-300'>
                                    Incluye items convertidos desde{' '}
                                    {(cotizacion.monedas_items || []).join(', ') || 'monedas mixtas'}.
                                </p>
                            )}
                        </div>
                    </div>

                    {cotizacion.items.length > 0 ? (
                        <Table>
                            <THead>
                                <Tr>
                                    <Th>Item</Th>
                                    <Th className='text-center'>Cantidad</Th>
                                    <Th className='text-right'>Precio unitario</Th>
                                    <Th className='text-right'>Total</Th>
                                </Tr>
                            </THead>
                            <TBody>
                                {cotizacion.items.map((item) => (
                                    <Tr key={item.id}>
                                        <Td className='font-medium'>{item.nombre}</Td>
                                        <Td className='text-center'>{item.cantidad}</Td>
                                        <Td className='text-right'>
                                            {formatCurrency(item.precio_unitario, monedaCotizacion)}
                                        </Td>
                                        <Td className='text-right font-medium'>
                                            {formatCurrency(item.costo_total, monedaCotizacion)}
                                        </Td>
                                    </Tr>
                                ))}
                            </TBody>
                        </Table>
                    ) : (
                        <p className='text-sm text-gray-500 dark:text-zinc-400'>
                            Esta cotizacion no tiene items visibles.
                        </p>
                    )}
                </div>
            );
        })}
    </div>
);

const ResumenCuotasVenta = ({
    cuotas,
    moneda,
}: {
    cuotas: ICuotaVenta[];
    moneda: 'CLP' | 'UF' | 'USD';
}) => (
    <Table>
        <THead>
            <Tr>
                <Th>Cuota</Th>
                <Th className='text-center'>Porcentaje</Th>
                <Th>Hito de cobro</Th>
                <Th className='text-right'>Monto</Th>
            </Tr>
        </THead>
        <TBody>
            {cuotas.map((cuota) => (
                <Tr key={cuota.orden}>
                    <Td className='font-medium'>Cuota {cuota.orden}</Td>
                    <Td className='text-center'>{cuota.porcentaje}%</Td>
                    <Td>{getCuotaHitoLabel(cuota)}</Td>
                    <Td className='text-right font-medium'>
                        {formatCurrency(cuota.monto, moneda)}
                    </Td>
                </Tr>
            ))}
        </TBody>
    </Table>
);

const ResumenDatosContrato = ({ contrato }: IResumenDatosContratoProps) => {
    const moneda = contrato.moneda_cobro || 'USD';
    const itemsComerciales = contrato.items_comerciales ?? [];
    const serviciosLegacy = contrato.contrato_servicios ?? [];
    const cotizaciones = contrato.cotizaciones_vinculadas ?? [];
    const licencias = contrato.contrato_licencias ?? [];
    const condiciones = contrato.contrato_condiciones_especiales ?? [];
    const usarItemsComerciales = itemsComerciales.length > 0;
    const resumenComercial = contrato.resumen_comercial;
    const cuotasVenta = resumenComercial?.cuotas_venta_resumen ?? [];
    const tipoContrato = contrato.tipo;

    return (
        <div className='flex flex-col gap-4'>
            <Card>
                <CardHeader>
                    <CardHeaderChild>
                        <span className='text-lg font-semibold'>Datos del contrato</span>
                    </CardHeaderChild>
                    <CardHeaderChild>
                        <Badge color='blue' variant='outline'>
                            {contrato.tipo_label}
                        </Badge>
                    </CardHeaderChild>
                </CardHeader>
                <CardBody>
                    <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                        <div className='rounded-md border border-gray-100 bg-gray-50 p-4 dark:border-zinc-700 dark:bg-zinc-800'>
                            <p className='mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-zinc-500'>
                                Empresa Prestadora
                            </p>
                            <p className='font-semibold text-gray-900 dark:text-zinc-100'>
                                {contrato.datos_empresa?.nombre || '—'}
                            </p>
                            {contrato.datos_empresa?.rut_empresa && (
                                <p className='text-sm text-gray-600 dark:text-zinc-400'>
                                    RUT: {contrato.datos_empresa.rut_empresa}
                                </p>
                            )}
                        </div>
                        <div className='rounded-md border border-gray-100 bg-gray-50 p-4 dark:border-zinc-700 dark:bg-zinc-800'>
                            <p className='mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-zinc-500'>
                                Empresa Cliente
                            </p>
                            <p className='font-semibold text-gray-900 dark:text-zinc-100'>
                                {contrato.datos_cliente?.nombre || '—'}
                            </p>
                            {contrato.datos_cliente?.rut_empresa && (
                                <p className='text-sm text-gray-600 dark:text-zinc-400'>
                                    RUT: {contrato.datos_cliente.rut_empresa}
                                </p>
                            )}
                        </div>
                    </div>
                    <div className='mt-4 grid grid-cols-2 gap-4 rounded-md border border-gray-100 bg-gray-50 p-4 md:grid-cols-4 dark:border-zinc-700 dark:bg-zinc-800'>
                        <div>
                            <p className='text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-zinc-500'>
                                Inicio
                            </p>
                            <p className='text-sm font-medium text-gray-800 dark:text-zinc-200'>
                                {formatFecha(contrato.fecha_inicio)}
                            </p>
                        </div>
                        <div>
                            <p className='text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-zinc-500'>
                                Termino
                            </p>
                            <p className='text-sm font-medium text-gray-800 dark:text-zinc-200'>
                                {formatFecha(contrato.fecha_fin)}
                            </p>
                        </div>
                        <div>
                            <p className='text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-zinc-500'>
                                Moneda
                            </p>
                            <p className='text-sm font-medium text-gray-800 dark:text-zinc-200'>
                                {MONEDA_LABEL[moneda] || moneda}
                            </p>
                        </div>
                        <div>
                            <p className='text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-zinc-500'>
                                Forma de pago
                            </p>
                            <p className='text-sm font-medium text-gray-800 dark:text-zinc-200'>
                                {getFormaPagoLabel(contrato)}
                            </p>
                        </div>
                    </div>
                </CardBody>
            </Card>

            {tipoContrato === 'servicios' && (usarItemsComerciales || serviciosLegacy.length > 0) && (
                <Card>
                    <CardHeader>
                        <CardHeaderChild>
                            <span className='text-lg font-semibold'>Servicios contratados</span>
                        </CardHeaderChild>
                        <CardHeaderChild>
                            <Badge color='blue'>
                                {usarItemsComerciales ? itemsComerciales.length : serviciosLegacy.length} servicio(s)
                            </Badge>
                        </CardHeaderChild>
                    </CardHeader>
                    <CardBody>
                        {usarItemsComerciales ? (
                            <TablaItemsComerciales items={itemsComerciales} moneda={moneda} />
                        ) : (
                            <TablaServiciosLegacy servicios={serviciosLegacy} moneda={moneda} />
                        )}
                    </CardBody>
                </Card>
            )}

            {tipoContrato === 'licencia' && licencias.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardHeaderChild>
                            <span className='text-lg font-semibold'>Licencias contratadas</span>
                        </CardHeaderChild>
                        <CardHeaderChild>
                            <Badge color='violet'>{licencias.length} licencia(s)</Badge>
                        </CardHeaderChild>
                    </CardHeader>
                    <CardBody>
                        <Table>
                            <THead>
                                <Tr>
                                    <Th>Licencia</Th>
                                    <Th>Proveedor</Th>
                                    <Th>Modalidad</Th>
                                    <Th className='text-center'>Cantidad</Th>
                                    <Th className='text-right'>Precio unitario</Th>
                                </Tr>
                            </THead>
                            <TBody>
                                {licencias.map((lic) => (
                                    <Tr key={lic.id}>
                                        <Td className='font-medium'>{lic.nombre_licencia}</Td>
                                        <Td>{lic.proveedor_licencia || '—'}</Td>
                                        <Td>{lic.tipo_modalidad_label}</Td>
                                        <Td className='text-center'>{lic.cantidad}</Td>
                                        <Td className='text-right'>
                                            {formatCurrency(lic.precio_unitario, moneda)}
                                        </Td>
                                    </Tr>
                                ))}
                            </TBody>
                        </Table>
                    </CardBody>
                </Card>
            )}

            {tipoContrato === 'venta' && cotizaciones.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardHeaderChild>
                            <span className='text-lg font-semibold'>Cotizaciones vinculadas</span>
                        </CardHeaderChild>
                        <CardHeaderChild>
                            <Badge color='emerald'>{cotizaciones.length} cotizacion(es)</Badge>
                        </CardHeaderChild>
                    </CardHeader>
                    <CardBody>
                        <TablaCotizacionesVenta cotizaciones={cotizaciones} monedaContrato={moneda} />
                        {resumenComercial?.errores_conversion &&
                            resumenComercial.errores_conversion.length > 0 && (
                                <div className='mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200'>
                                    {resumenComercial.errores_conversion.join(' ')}
                                </div>
                            )}
                    </CardBody>
                </Card>
            )}

            {tipoContrato === 'venta' && (
                <Card>
                    <CardHeader>
                        <CardHeaderChild>
                            <span className='text-lg font-semibold'>Condicion de pago</span>
                        </CardHeaderChild>
                        <CardHeaderChild>
                            <Badge color={cuotasVenta.length > 0 ? 'amber' : 'emerald'} variant='outline'>
                                {getFormaPagoLabel(contrato)}
                            </Badge>
                        </CardHeaderChild>
                    </CardHeader>
                    <CardBody>
                        <div className='space-y-3'>
                            <p className='text-sm text-gray-600 dark:text-zinc-300'>
                                Total contractual visible para aprobacion y firma:{' '}
                                <span className='font-semibold text-gray-900 dark:text-zinc-100'>
                                    {formatCurrency(contrato.total_contrato, moneda)}
                                </span>
                            </p>
                            {cuotasVenta.length > 0 ? (
                                <ResumenCuotasVenta cuotas={cuotasVenta} moneda={moneda} />
                            ) : (
                                <p className='text-sm text-gray-500 dark:text-zinc-400'>
                                    Este contrato de venta se paga al contado.
                                </p>
                            )}
                        </div>
                    </CardBody>
                </Card>
            )}

            {contrato.total_contrato != null && contrato.total_contrato > 0 && (
                <Card>
                    <CardBody>
                        <div className='flex items-center justify-between'>
                            <div>
                                <p className='text-sm text-gray-500 dark:text-zinc-400'>
                                    {tipoContrato === 'venta'
                                        ? 'Total contractual consolidado'
                                        : 'Total contractual referencial'}
                                </p>
                            </div>
                            <Badge variant='outline' color='emerald' className='text-lg'>
                                {formatCurrency(contrato.total_contrato, moneda)}
                            </Badge>
                        </div>
                    </CardBody>
                </Card>
            )}

            {condiciones.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardHeaderChild>
                            <span className='text-lg font-semibold'>Condiciones especiales</span>
                        </CardHeaderChild>
                        <CardHeaderChild>
                            <Badge color='amber'>{condiciones.length}</Badge>
                        </CardHeaderChild>
                    </CardHeader>
                    <CardBody>
                        <div className='space-y-3'>
                            {condiciones.map((condicion) => (
                                <div
                                    key={condicion.id}
                                    className='rounded-md border border-gray-100 bg-gray-50/60 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800/50'>
                                    <p className='font-medium text-gray-900 dark:text-zinc-100'>
                                        {condicion.titulo_condicion}
                                    </p>
                                    <p className='mt-1 whitespace-pre-wrap text-sm leading-6 text-gray-600 dark:text-zinc-300'>
                                        {condicion.detalle_condicion || condicion.descripcion_condicion}
                                    </p>
                                    {condicion.multa_condicion > 0 && (
                                        <p className='mt-2 text-sm font-medium text-amber-700 dark:text-amber-300'>
                                            Multa por incumplimiento:{' '}
                                            {formatCurrency(condicion.multa_condicion, moneda)}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </CardBody>
                </Card>
            )}
        </div>
    );
};

export default ResumenDatosContrato;
