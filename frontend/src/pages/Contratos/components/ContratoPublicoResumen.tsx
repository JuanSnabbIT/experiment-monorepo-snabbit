import Badge from '@/components/ui/Badge';
import type { IContratoEmpresaCliente } from '@/interface/contrato.interface';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import ResumenDatosContrato from './ResumenDatosContrato';

dayjs.locale('es');

interface IContratoPublicoResumenProps {
    contrato: IContratoEmpresaCliente;
}

const formatFechaLarga = (fecha?: string | null) => {
    if (!fecha) return 'Sin fecha';
    return dayjs(fecha).format('D [de] MMMM [de] YYYY');
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
                        <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
                            <div className='min-w-0 space-y-2'>
                                <h1 className='text-2xl font-bold text-gray-900 dark:text-zinc-100'>
                                    {contrato.nombre}
                                </h1>
                                <p className='text-sm leading-6 text-gray-500 dark:text-zinc-400'>
                                    Contrato {contrato.tipo_label.toLowerCase()} entre{' '}
                                    {contrato.datos_empresa.nombre} y {contrato.datos_cliente.nombre}.
                                </p>
                                <p className='text-sm text-gray-500 dark:text-zinc-400'>
                                    Inicio: {formatFechaLarga(contrato.fecha_inicio)} | Moneda:{' '}
                                    {monedaContrato}
                                </p>
                            </div>

                            <Badge variant='outline' color='blue'>
                                {contrato.estado_label}
                            </Badge>
                        </div>
                    </div>
                </div>
            </section>

            <ResumenDatosContrato contrato={contrato} />
        </div>
    );
};

export default ContratoPublicoResumen;
