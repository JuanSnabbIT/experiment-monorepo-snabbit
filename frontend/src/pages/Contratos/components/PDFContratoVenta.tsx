import { IContratoEmpresaCliente, ICotizacionVinculadaResumen } from '@/interface/contrato.interface';
import dayjs from 'dayjs';
import { RefObject } from 'react';

const normalizeCurrency = (currency?: string | null): 'CLP' | 'UF' | 'USD' => {
    if (currency === '1') return 'USD';
    if (currency === '2') return 'CLP';
    if (currency === '3') return 'UF';
    if (currency === 'CLP' || currency === 'UF' || currency === 'USD') return currency;
    return 'CLP';
};

const formatCurrency = (
    value?: number | string | null,
    currency: 'CLP' | 'UF' | 'USD' = 'CLP',
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

const formaPagoVentaLabel = (contrato: IContratoEmpresaCliente) =>
    contrato.resumen_comercial?.forma_pago_venta_label ||
    (contrato.forma_pago_venta === 'cuotas' ? 'Cuotas' : 'Contado');

const getCuotaHitoLabel = (hito?: string | null, descripcion?: string | null) =>
    descripcion || hito || 'Sin definir';

function PDFContratoVenta({
    contrato,
    componentRef,
}: {
    contrato: IContratoEmpresaCliente;
    componentRef: RefObject<HTMLDivElement>;
}) {
    const cuotas = contrato.resumen_comercial?.cuotas_venta_resumen ?? [];

    return (
        <div className='h-full w-full border-2 border-black md:max-w-[800px]'>
            <div className='flex flex-col gap-4 p-8' ref={componentRef}>
                <div className='flex flex-row items-center justify-between gap-4'>
                    <div className='text-center text-xl text-gray-400 md:text-2xl'>
                        {dayjs().locale('es').format('DD [de] MMMM [del] YYYY')}
                    </div>
                    <div className='max-h-[50px] max-w-[100px] md:max-h-[50px] md:max-w-[100px]'>
                        <img src='/src/assets/isabella-fischer-6ast1xZ9YJY-unsplash-thumb.jpg' />
                    </div>
                </div>

                <div className='text-center text-xl font-bold md:text-2xl'>{contrato.nombre}</div>
                <div>
                    Entre {contrato.datos_empresa.nombre}, domiciliada en{' '}
                    {contrato.datos_empresa.direccion_principal}, por una parte y el cliente
                    individualizado en la clausula primera de este contrato, se ha convenido el
                    siguiente contrato de venta.
                </div>

                <div className='text-xl font-bold md:text-2xl'>
                    1.- IDENTIFICACION DEL CLIENTE ({contrato.datos_cliente.nombre})
                </div>
                <div className='grid grid-cols-6'>
                    <div className='col-span-2 border border-black p-1'>Nombre o razon social</div>
                    <div className='col-span-4 border border-r-black border-t-black p-1'>
                        {contrato.datos_cliente.nombre}
                    </div>
                    <div className='col-span-2 border border-x-black border-b-black p-1'>R.U.T</div>
                    <div className='col-span-4 border border-r-black border-t-black p-1'>
                        {contrato.datos_cliente.rut_empresa || 'Sin RUT'}
                    </div>
                    <div className='col-span-2 border border-x-black border-b-black p-1'>Domicilio</div>
                    <div className='col-span-4 border border-r-black border-t-black p-1'>
                        {contrato.datos_cliente.direccion_principal || 'Sin direccion principal'}
                    </div>
                </div>

                <div className='text-xl font-bold md:text-2xl'>2.- DESCRIPCION</div>
                <div className='ml-4'>{contrato.observaciones || 'Sin observaciones.'}</div>

                {contrato.cotizaciones_vinculadas.length > 0 && (
                    <>
                        <div className='text-xl font-bold md:text-2xl'>3.- COTIZACIONES VINCULADAS</div>
                        {contrato.cotizaciones_vinculadas.map((cotizacion: ICotizacionVinculadaResumen) => {
                            const monedaCotizacion = normalizeCurrency(cotizacion.tipo_moneda);
                            const monedaConvertida = cotizacion.moneda_contrato || contrato.moneda_cobro;
                            return (
                                <div key={cotizacion.id} className='mb-4 ml-4'>
                                    <div className='mb-1 font-semibold'>
                                        Cotizacion #{cotizacion.numero_cotizacion || cotizacion.id} -{' '}
                                        {cotizacion.nombre || 'Sin nombre'}
                                    </div>
                                    <div className='mb-2 text-sm text-gray-600'>
                                        Moneda original: {cotizacion.tipo_moneda_label || monedaCotizacion}
                                        {' | '}
                                        Total original: {formatCurrency(cotizacion.total_estimado, monedaCotizacion)}
                                    </div>
                                    {cotizacion.total_convertido != null && (
                                        <div className='mb-1 text-sm text-gray-600'>
                                            Total convertido a {monedaConvertida}:{' '}
                                            {formatCurrency(cotizacion.total_convertido, monedaConvertida)}
                                        </div>
                                    )}
                                    {cotizacion.dolar_observado != null && (
                                        <div className='mb-1 text-sm text-gray-600'>
                                            Dolar observado: {formatCurrency(cotizacion.dolar_observado, 'CLP')}
                                        </div>
                                    )}
                                    {cotizacion.valor_uf != null && (
                                        <div className='mb-2 text-sm text-gray-600'>
                                            Valor UF: {formatCurrency(cotizacion.valor_uf, 'CLP')}
                                        </div>
                                    )}
                                    {cotizacion.tiene_items_moneda_mixta && (
                                        <div className='mb-2 text-sm text-gray-600'>
                                            Incluye items convertidos desde{' '}
                                            {(cotizacion.monedas_items || []).join(', ') || 'monedas mixtas'}.
                                        </div>
                                    )}
                                    {cotizacion.items.length > 0 && (
                                        <table className='w-full border-collapse border border-black text-sm'>
                                            <thead>
                                                <tr className='bg-gray-100'>
                                                    <th className='border border-black p-1 text-left'>Item</th>
                                                    <th className='border border-black p-1 text-right'>Cant.</th>
                                                    <th className='border border-black p-1 text-right'>P. Unit.</th>
                                                    <th className='border border-black p-1 text-right'>Total</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {cotizacion.items.map((item) => (
                                                    <tr key={item.id}>
                                                        <td className='border border-black p-1'>{item.nombre}</td>
                                                        <td className='border border-black p-1 text-right'>{item.cantidad}</td>
                                                        <td className='border border-black p-1 text-right'>
                                                            {formatCurrency(item.precio_unitario, monedaCotizacion)}
                                                        </td>
                                                        <td className='border border-black p-1 text-right'>
                                                            {formatCurrency(item.costo_total, monedaCotizacion)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            );
                        })}
                    </>
                )}

                <div className='text-xl font-bold md:text-2xl'>4.- CONDICION DE PAGO</div>
                <div className='ml-4 text-sm'>
                    Forma de pago: {formaPagoVentaLabel(contrato)}
                    {' | '}
                    Total contractual consolidado: {formatCurrency(contrato.total_contrato, contrato.moneda_cobro)}
                </div>
                {cuotas.length > 0 && (
                    <table className='ml-4 mt-3 w-full border-collapse border border-black text-sm'>
                        <thead>
                            <tr className='bg-gray-100'>
                                <th className='border border-black p-1 text-left'>Cuota</th>
                                <th className='border border-black p-1 text-right'>%</th>
                                <th className='border border-black p-1 text-left'>Hito de cobro</th>
                                <th className='border border-black p-1 text-right'>Monto</th>
                            </tr>
                        </thead>
                        <tbody>
                            {cuotas.map((cuota) => (
                                <tr key={cuota.orden}>
                                    <td className='border border-black p-1'>Cuota {cuota.orden}</td>
                                    <td className='border border-black p-1 text-right'>{cuota.porcentaje}%</td>
                                    <td className='border border-black p-1'>
                                        {getCuotaHitoLabel(
                                            cuota.hito_pago_label,
                                            cuota.hito_pago_descripcion,
                                        )}
                                    </td>
                                    <td className='border border-black p-1 text-right'>
                                        {formatCurrency(cuota.monto, contrato.moneda_cobro)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                <div className='grid h-[150px] grid-cols-2 gap-2'>
                    <div className='flex items-center justify-center'>
                        <div className='border border-x-0 border-b-0 border-t-black px-8'>
                            Firma y Timbre del Cliente
                        </div>
                    </div>
                    <div className='flex items-center justify-center'>
                        <div className='border border-x-0 border-b-0 border-t-black px-8'>
                            Firma y Timbre de la Empresa
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default PDFContratoVenta;
