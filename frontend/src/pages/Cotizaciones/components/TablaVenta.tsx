import Badge from '@/components/ui/Badge';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import { formatCurrency } from '@/utils/currency';
import classNames from 'classnames';

import { ICotizacion, IItemCotizacion } from '@/interface/cotizaciones.interface';

function TablaVenta({
    items = [],
    cotizacion,
}: {
    items: IItemCotizacion[];
    cotizacion: ICotizacion | undefined;
}) {
    const monedaCotizacion: 'CLP' | 'USD' | 'UF' =
        cotizacion?.tipo_moneda === '1' ? 'USD' : cotizacion?.tipo_moneda === '3' ? 'UF' : 'CLP';

    const obtenerPrecioUnitario = (item: IItemCotizacion) => {
        return Number(item.precio_venta_neta_unitario_moneda_base || 0);
    };

    const obtenerPrecioTotal = (item: IItemCotizacion) => {
        return Number(item.precio_venta_neta_total_moneda_base || 0);
    };

    const valorUnitarioLabel =
        monedaCotizacion === 'USD'
            ? 'Valor Unit. USD'
            : monedaCotizacion === 'UF'
              ? 'Valor Unit. UF'
              : 'Valor Unit. CLP';
    const totalLabel =
        monedaCotizacion === 'USD'
            ? 'Total USD'
            : monedaCotizacion === 'UF'
              ? 'Total UF'
              : 'Total CLP';

    return (
        <Card>
            <CardHeader>
                <CardHeaderChild>
                    <Badge className='text-xl'>Cotizacion Final</Badge>
                </CardHeaderChild>
            </CardHeader>
            <CardBody className='z-0'>
                <div className='overflow-auto'>
                    <div className='flex min-w-[760px] flex-col gap-2'>
                        {cotizacion &&
                            (items.length > 0 ? (
                                <>
                                    <div className='grid grid-cols-5 gap-4'>
                                        <div className='col-span-2 text-center'>
                                            <Badge>Nombre</Badge>
                                        </div>
                                        <div className='col-span-1 text-center'>
                                            <Badge>Cantidad</Badge>
                                        </div>
                                        <div className='col-span-1 text-center'>
                                            <Badge>{valorUnitarioLabel}</Badge>
                                        </div>
                                        <div className='col-span-1 text-center'>
                                            <Badge>{totalLabel}</Badge>
                                        </div>
                                    </div>
                                    {items.map((item, index) => (
                                        <div
                                            key={index}
                                            className={classNames(
                                                'grid grid-cols-5 gap-4 rounded-xl border transition-all duration-200',
                                                'odd:bg-zinc-50 dark:odd:bg-zinc-900/40',
                                                'hover:border-blue-200 hover:bg-blue-50/50 dark:hover:border-blue-800 dark:hover:bg-blue-900/10',
                                                item.aprobado
                                                    ? 'border-l-4 border-l-emerald-500 border-zinc-200 bg-emerald-50/30 dark:border-zinc-800 dark:bg-emerald-900/10'
                                                    : 'border-l-4 border-l-transparent border-zinc-200 dark:border-zinc-800',
                                            )}>
                                            <div className='col-span-2 border-r border-zinc-200 p-4 dark:border-zinc-800'>
                                                <div className='font-medium text-zinc-900 dark:text-zinc-100'>
                                                    {item.nombre_item}
                                                </div>
                                                <div className='mt-1 text-xs text-zinc-500 dark:text-zinc-400'>
                                                    {item.descripcion}
                                                </div>
                                                <div className='mt-1 text-xs text-zinc-500 dark:text-zinc-400'>
                                                    Moneda item: {item.tipo_moneda_label || 'CLP'}
                                                </div>
                                            </div>
                                            <div className='col-span-1 flex items-center justify-center border-r border-zinc-200 p-4 text-zinc-700 dark:border-zinc-800 dark:text-zinc-300'>
                                                {item.cantidad}
                                            </div>
                                            <div className='col-span-1 flex items-center justify-center border-r border-zinc-200 p-4 font-mono text-zinc-700 dark:border-zinc-800 dark:text-zinc-300'>
                                                {formatCurrency(
                                                    obtenerPrecioUnitario(item),
                                                    monedaCotizacion,
                                                )}
                                            </div>
                                            <div className='col-span-1 flex items-center justify-center p-4 font-semibold text-zinc-900 dark:text-zinc-100'>
                                                {formatCurrency(
                                                    obtenerPrecioTotal(item),
                                                    monedaCotizacion,
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </>
                            ) : (
                                <div>Sin Items</div>
                            ))}
                    </div>
                    {cotizacion && items.length > 0 && (
                        <div className='mt-8 flex min-w-[760px] flex-wrap justify-end gap-6 text-right'>
                            <div className='min-w-[240px] rounded-2xl border border-zinc-200 bg-zinc-100 p-6 dark:border-zinc-700 dark:bg-zinc-800/50'>
                                <div className='mb-1 text-sm font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400'>
                                    Total Cotización
                                </div>
                                <div className='text-3xl font-bold text-zinc-900 dark:text-zinc-50'>
                                    {formatCurrency(
                                        items.reduce(
                                            (acc, item) => acc + obtenerPrecioTotal(item),
                                            0,
                                        ),
                                        monedaCotizacion,
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </CardBody>
        </Card>
    );
}

export default TablaVenta;
