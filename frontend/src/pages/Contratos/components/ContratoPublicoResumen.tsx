import Badge from '@/components/ui/Badge';
import type { IContratoEmpresaCliente } from '@/interface/contrato.interface';
import dayjs from 'dayjs';
import 'dayjs/locale/es';

dayjs.locale('es');

interface IContratoPublicoResumenProps {
    contrato: IContratoEmpresaCliente;
}

const formatFechaLarga = (fecha?: string | null) => {
    if (!fecha) return 'Sin fecha';
    return dayjs(fecha).format('D [de] MMMM [de] YYYY');
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
        maximumFractionDigits: 0,
    }).format(amount);
};

const ContratoPublicoResumen = ({ contrato }: IContratoPublicoResumenProps) => {
    const logoEmpresa = contrato.datos_empresa.logo || contrato.datos_cliente.logo;
    const monedaContrato = contrato.moneda_cobro || 'USD';

    return (
        <div className='space-y-6'>
            <section className='rounded-lg border border-gray-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900'>
                <div className='flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between'>
                    <div className='flex justify-center sm:justify-start'>
                        {logoEmpresa ? (
                            <img
                                src={logoEmpresa}
                                alt={contrato.datos_empresa.nombre}
                                className='h-16 w-auto max-w-[240px] object-contain'
                            />
                        ) : (
                            <div className='flex h-16 w-[240px] items-center text-sm font-semibold text-gray-700 dark:text-zinc-200'>
                                {contrato.datos_empresa.nombre}
                            </div>
                        )}
                    </div>

                    <div className='min-w-0 flex-1'>
                        <div className='grid grid-cols-1 gap-5 sm:grid-cols-2'>
                            <div className='min-w-0'>
                                <p className='text-lg font-semibold text-gray-900 dark:text-zinc-100'>
                                    {contrato.datos_empresa.nombre}
                                </p>
                                <div className='mt-2 space-y-1.5 text-sm text-gray-600 dark:text-zinc-400'>
                                    {contrato.datos_empresa.rut_empresa && (
                                        <p>RUT: {contrato.datos_empresa.rut_empresa}</p>
                                    )}
                                    {contrato.datos_empresa.direccion_principal && (
                                        <p className='break-words'>
                                            {contrato.datos_empresa.direccion_principal}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className='min-w-0 sm:text-right'>
                                <div className='space-y-1.5 text-sm text-gray-600 dark:text-zinc-400'>
                                    {contrato.datos_empresa.telefono && (
                                        <p>Tel: {contrato.datos_empresa.telefono}</p>
                                    )}
                                    {contrato.datos_empresa.email && (
                                        <p className='break-words'>{contrato.datos_empresa.email}</p>
                                    )}
                                    {contrato.datos_empresa.sitio_web && (
                                        <p className='break-words'>
                                            {contrato.datos_empresa.sitio_web}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className='rounded-lg border border-gray-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900'>
                <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
                    <div className='min-w-0 space-y-2'>
                        <h1 className='text-2xl font-bold text-gray-900 dark:text-zinc-100'>
                            {contrato.nombre}
                        </h1>
                        <p className='text-sm leading-6 text-gray-500 dark:text-zinc-400'>
                            Contrato {contrato.tipo_label.toLowerCase()} entre{' '}
                            {contrato.datos_empresa.nombre} y {contrato.datos_cliente.nombre}.
                        </p>
                    </div>

                    <Badge variant='outline' color='blue'>
                        {contrato.estado_label}
                    </Badge>
                </div>

                <div className='mt-5 overflow-hidden rounded-md border border-gray-100 dark:border-zinc-700'>
                    <div className='grid grid-cols-1 divide-y divide-gray-100 lg:grid-cols-2 lg:divide-x lg:divide-y-0 dark:divide-zinc-700'>
                        <div className='p-4'>
                            <dl className='divide-y divide-gray-100 text-sm dark:divide-zinc-700'>
                                <div className='grid grid-cols-1 gap-1.5 py-3 sm:grid-cols-[160px,1fr] sm:gap-4'>
                                    <dt className='text-gray-500 dark:text-zinc-400'>
                                        Cliente
                                    </dt>
                                    <dd className='font-medium text-gray-900 dark:text-zinc-100'>
                                        {contrato.datos_cliente.nombre}
                                    </dd>
                                </div>

                                <div className='grid grid-cols-1 gap-1.5 py-3 sm:grid-cols-[160px,1fr] sm:gap-4'>
                                    <dt className='text-gray-500 dark:text-zinc-400'>RUT</dt>
                                    <dd className='font-medium text-gray-900 dark:text-zinc-100'>
                                        {contrato.datos_cliente.rut_empresa || 'No informado'}
                                    </dd>
                                </div>

                                <div className='grid grid-cols-1 gap-1.5 py-3 sm:grid-cols-[160px,1fr] sm:gap-4'>
                                    <dt className='text-gray-500 dark:text-zinc-400'>
                                        Prestadora
                                    </dt>
                                    <dd className='font-medium text-gray-900 dark:text-zinc-100'>
                                        {contrato.datos_empresa.nombre}
                                    </dd>
                                </div>
                            </dl>
                        </div>

                        <div className='p-4'>
                            <dl className='divide-y divide-gray-100 text-sm dark:divide-zinc-700'>
                                <div className='grid grid-cols-1 gap-1.5 py-3 sm:grid-cols-[160px,1fr] sm:gap-4'>
                                    <dt className='text-gray-500 dark:text-zinc-400'>Tipo</dt>
                                    <dd className='font-medium text-gray-900 dark:text-zinc-100'>
                                        {contrato.tipo_label}
                                    </dd>
                                </div>

                                <div className='grid grid-cols-1 gap-1.5 py-3 sm:grid-cols-[160px,1fr] sm:gap-4'>
                                    <dt className='text-gray-500 dark:text-zinc-400'>
                                        Moneda
                                    </dt>
                                    <dd className='font-medium text-gray-900 dark:text-zinc-100'>
                                        {monedaContrato}
                                    </dd>
                                </div>

                                <div className='grid grid-cols-1 gap-1.5 py-3 sm:grid-cols-[160px,1fr] sm:gap-4'>
                                    <dt className='text-gray-500 dark:text-zinc-400'>
                                        Inicio
                                    </dt>
                                    <dd className='font-medium text-gray-900 dark:text-zinc-100'>
                                        {formatFechaLarga(contrato.fecha_inicio)}
                                    </dd>
                                </div>

                                <div className='grid grid-cols-1 gap-1.5 py-3 sm:grid-cols-[160px,1fr] sm:gap-4'>
                                    <dt className='text-gray-500 dark:text-zinc-400'>
                                        Termino
                                    </dt>
                                    <dd className='font-medium text-gray-900 dark:text-zinc-100'>
                                        {contrato.fecha_fin
                                            ? formatFechaLarga(contrato.fecha_fin)
                                            : 'Vigencia indefinida'}
                                    </dd>
                                </div>
                            </dl>
                        </div>
                    </div>
                </div>

                {contrato.observaciones && (
                    <div className='mt-5 rounded-md border border-gray-100 bg-gray-50/60 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800/50'>
                        <p className='text-sm leading-6 text-gray-700 dark:text-zinc-300'>
                            <span className='font-medium text-gray-900 dark:text-zinc-100'>
                                Observaciones:
                            </span>{' '}
                            {contrato.observaciones}
                        </p>
                    </div>
                )}
            </section>

            {contrato.contrato_servicios.length > 0 && (
                <section className='rounded-lg border border-gray-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900'>
                    <div className='mb-4'>
                        <p className='text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-zinc-500'>
                            Alcance
                        </p>
                        <h2 className='text-lg font-semibold text-gray-900 dark:text-zinc-100'>
                            Servicios incluidos
                        </h2>
                    </div>
                    <div className='overflow-hidden rounded-md border border-gray-100 dark:border-zinc-700'>
                        <div className='divide-y divide-gray-100 dark:divide-zinc-700'>
                            {contrato.contrato_servicios.map((servicio) => (
                                <div
                                    key={servicio.id}
                                    className='space-y-3 px-4 py-4'>
                                    <div className='grid gap-3 sm:grid-cols-[1fr,120px,160px]'>
                                        <p className='font-medium text-gray-900 dark:text-zinc-100'>
                                            {servicio.nombre}
                                        </p>
                                        <p className='text-sm text-gray-500 sm:text-right dark:text-zinc-400'>
                                            Cantidad: {servicio.cantidad}
                                        </p>
                                        <p className='text-sm text-gray-600 sm:text-right dark:text-zinc-300'>
                                            {formatCurrency(
                                                servicio.precio_unitario,
                                                monedaContrato,
                                            )}{' '}
                                            c/u
                                        </p>
                                    </div>
                                    <div className='rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:bg-zinc-800/60 dark:text-zinc-200'>
                                        Subtotal:{' '}
                                        {formatCurrency(servicio.subtotal, monedaContrato)}
                                    </div>
                                    {'incluye' in servicio.servicio_generico &&
                                        servicio.servicio_generico.incluye && (
                                            <p className='text-sm text-gray-600 dark:text-zinc-300'>
                                                <span className='font-medium text-gray-900 dark:text-zinc-100'>
                                                    Incluye:
                                                </span>{' '}
                                                {servicio.servicio_generico.incluye}
                                            </p>
                                        )}
                                    {'no_incluye' in servicio.servicio_generico &&
                                        servicio.servicio_generico.no_incluye && (
                                            <p className='text-sm text-gray-600 dark:text-zinc-300'>
                                                <span className='font-medium text-gray-900 dark:text-zinc-100'>
                                                    No incluye:
                                                </span>{' '}
                                                {servicio.servicio_generico.no_incluye}
                                            </p>
                                        )}
                                    {'clausulas_especiales' in servicio.servicio_generico &&
                                        servicio.servicio_generico.clausulas_especiales && (
                                            <p className='text-sm text-gray-600 dark:text-zinc-300'>
                                                <span className='font-medium text-gray-900 dark:text-zinc-100'>
                                                    Clausulas:
                                                </span>{' '}
                                                {servicio.servicio_generico.clausulas_especiales}
                                            </p>
                                        )}
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {contrato.contrato_visitas.length > 0 && (
                <section className='rounded-lg border border-gray-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900'>
                    <div className='mb-4'>
                        <p className='text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-zinc-500'>
                            Operacion
                        </p>
                        <h2 className='text-lg font-semibold text-gray-900 dark:text-zinc-100'>
                            Visitas comprometidas
                        </h2>
                    </div>
                    <div className='overflow-hidden rounded-md border border-gray-100 dark:border-zinc-700'>
                        <div className='divide-y divide-gray-100 dark:divide-zinc-700'>
                            {contrato.contrato_visitas.map((visita) => (
                                <div
                                    key={visita.id}
                                    className='grid gap-3 px-4 py-3 md:grid-cols-[1fr,140px,120px]'>
                                    <p className='font-medium text-gray-900 dark:text-zinc-100'>
                                        {visita.descripcion_visita}
                                    </p>
                                    <p className='text-sm text-gray-600 dark:text-zinc-300'>
                                        {visita.frecuencia_label}
                                    </p>
                                    <p className='text-sm text-gray-500 md:text-right dark:text-zinc-400'>
                                        Cantidad: {visita.cantidad}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {contrato.contrato_licencias.length > 0 && (
                <section className='rounded-lg border border-gray-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900'>
                    <div className='mb-4'>
                        <p className='text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-zinc-500'>
                            Licencias
                        </p>
                        <h2 className='text-lg font-semibold text-gray-900 dark:text-zinc-100'>
                            Licencias contratadas
                        </h2>
                    </div>
                    <div className='overflow-hidden rounded-md border border-gray-100 dark:border-zinc-700'>
                        <div className='divide-y divide-gray-100 dark:divide-zinc-700'>
                            {contrato.contrato_licencias.map((licencia) => (
                                <div
                                    key={licencia.id}
                                    className='grid gap-3 px-4 py-3 md:grid-cols-[1fr,160px,120px]'>
                                    <div>
                                        <p className='font-medium text-gray-900 dark:text-zinc-100'>
                                            {licencia.nombre_licencia}
                                        </p>
                                        {licencia.proveedor_licencia && (
                                            <p className='text-sm text-gray-500 dark:text-zinc-400'>
                                                {licencia.proveedor_licencia}
                                            </p>
                                        )}
                                    </div>
                                    <p className='text-sm text-gray-600 dark:text-zinc-300'>
                                        {licencia.tipo_modalidad_label}
                                    </p>
                                    <p className='text-sm text-gray-500 md:text-right dark:text-zinc-400'>
                                        Cantidad: {licencia.cantidad}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {contrato.contrato_condiciones_especiales.length > 0 && (
                <section className='rounded-lg border border-gray-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900'>
                    <div className='mb-4'>
                        <p className='text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-zinc-500'>
                            Condiciones
                        </p>
                        <h2 className='text-lg font-semibold text-gray-900 dark:text-zinc-100'>
                            Condiciones especiales
                        </h2>
                    </div>
                    <div className='space-y-3 text-sm'>
                        {contrato.contrato_condiciones_especiales.map((condicion) => (
                            <div
                                key={condicion.id}
                                className='rounded-md border border-gray-100 bg-gray-50/60 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800/50'>
                                <p className='font-medium text-gray-900 dark:text-zinc-100'>
                                    {condicion.titulo_condicion}
                                </p>
                                <p className='mt-1 whitespace-pre-wrap leading-6 text-gray-600 dark:text-zinc-300'>
                                    {condicion.detalle_condicion || condicion.descripcion_condicion}
                                </p>
                                {condicion.multa_condicion > 0 && (
                                    <p className='mt-2 text-sm font-medium text-amber-700 dark:text-amber-300'>
                                        Multa por incumplimiento:{' '}
                                        {formatCurrency(
                                            condicion.multa_condicion,
                                            monedaContrato,
                                        )}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                </section>
            )}

            <section className='rounded-lg border border-gray-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900'>
                <div className='flex items-center justify-between gap-3'>
                    <div>
                        <p className='text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-zinc-500'>
                            Resumen comercial
                        </p>
                        <h2 className='text-lg font-semibold text-gray-900 dark:text-zinc-100'>
                            Total contractual referencial
                        </h2>
                        <p className='text-sm text-gray-500 dark:text-zinc-400'>
                            Moneda de la propuesta: {monedaContrato}
                        </p>
                    </div>
                    <Badge variant='outline' color='emerald'>
                        {formatCurrency(contrato.total_contrato, monedaContrato)}
                    </Badge>
                </div>
            </section>

            {contrato.firmas_confidencialidad.length > 0 && (
                <section className='rounded-lg border border-gray-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900'>
                    <div className='mb-4'>
                        <p className='text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-zinc-500'>
                            Confidencialidad
                        </p>
                        <h2 className='text-lg font-semibold text-gray-900 dark:text-zinc-100'>
                            Acuerdos asociados
                        </h2>
                    </div>
                    <div className='space-y-3 text-sm'>
                        {contrato.firmas_confidencialidad.map((acuerdo) => (
                            <div
                                key={acuerdo.id}
                                className='rounded-md border border-gray-100 bg-gray-50/60 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800/50'>
                                <p className='font-medium text-gray-900 dark:text-zinc-100'>
                                    {acuerdo.titulo_acuerdo}
                                </p>
                                <p className='mt-2 whitespace-pre-wrap leading-6 text-gray-600 dark:text-zinc-300'>
                                    {acuerdo.contenido_acuerdo}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
};

export default ContratoPublicoResumen;
