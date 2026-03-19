import Badge from '@/components/ui/Badge';
import Tooltip from '@/components/ui/Tooltip';
import { IContratoEmpresaCliente } from '@/interface/contrato.interface';
import dayjs from 'dayjs';
import { colorTipoContrato } from './contrato.helpers';

interface IResumenContratoProps {
    contrato: IContratoEmpresaCliente;
}

const ResumenContrato = ({ contrato }: IResumenContratoProps) => {
    const hoy = dayjs();
    const fechaFin = contrato.fecha_fin ? dayjs(contrato.fecha_fin) : null;
    const diasRestantes = fechaFin ? fechaFin.diff(hoy, 'day') : null;

    const textoVigencia = (() => {
        if (!fechaFin) return 'Indefinido';
        if (diasRestantes !== null && diasRestantes < 0) {
            return `Vencido hace ${Math.abs(diasRestantes)}d`;
        }
        return `${diasRestantes}d restantes`;
    })();

    const colorVigencia = (() => {
        if (!fechaFin || diasRestantes === null) return 'zinc';
        if (diasRestantes < 0) return 'red';
        if (diasRestantes <= 30) return 'amber';
        return 'emerald';
    })();

    const totalVinculos = contrato.vinculos_contrato.length;
    const sinEnvio = contrato.vinculos_contrato.filter((v) => !v.firma_pendiente).length;
    const conEnvio = contrato.vinculos_contrato.filter((v) => v.firma_pendiente?.enviado).length;
    const firmados = contrato.vinculos_contrato.filter((v) => v.firma_pendiente?.firmado).length;

    const totalLicencias = contrato.contrato_licencias.length;
    const licenciasActivas = contrato.contrato_licencias.filter(
        (l) => l.estado === 'activa',
    ).length;
    const cuposTotal = contrato.contrato_licencias.reduce((sum, l) => sum + l.cantidad, 0);
    const cuposUsados = contrato.contrato_licencias.reduce(
        (sum, l) => sum + (l.cantidad - l.licencias_disponibles),
        0,
    );

    const proximoVencimientoLic = contrato.contrato_licencias
        .filter((l) => l.fecha_fin && l.dias_restantes_licencia > 0)
        .sort((a, b) => a.dias_restantes_licencia - b.dias_restantes_licencia)[0];

    return (
        <div className='flex flex-wrap items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 dark:border-zinc-700 dark:bg-zinc-800/50'>
            <MetricaItem label='Tipo'>
                <Badge variant='solid' color={colorTipoContrato(contrato.tipo)}>
                    {contrato.tipo_label}
                </Badge>
            </MetricaItem>

            <Separador />

            <MetricaItem label='Vigencia'>
                <Tooltip
                    text={`${dayjs(contrato.fecha_inicio).format('DD/MM/YYYY')} -> ${fechaFin ? fechaFin.format('DD/MM/YYYY') : 'Sin fecha fin'}`}>
                    <Badge variant='outline' color={colorVigencia as 'zinc'}>
                        {textoVigencia}
                    </Badge>
                </Tooltip>
            </MetricaItem>

            <Separador />

            {totalVinculos > 0 && (
                <>
                    <MetricaItem label='Firmas'>
                        <Tooltip
                            text={`${firmados} firmadas, ${conEnvio} enviadas, ${sinEnvio} sin enviar`}>
                            <span className='text-sm font-medium'>
                                {firmados}/{totalVinculos}
                            </span>
                        </Tooltip>
                    </MetricaItem>
                    <Separador />
                </>
            )}

            {contrato.tipo === 'licencia' && totalLicencias > 0 && (
                <>
                    <MetricaItem label='Licencias'>
                        <Tooltip
                            text={`${licenciasActivas} activas de ${totalLicencias} | ${cuposUsados}/${cuposTotal} cupos usados`}>
                            <span className='text-sm font-medium'>
                                {licenciasActivas}/{totalLicencias}
                                <span className='ml-1 text-xs text-zinc-500'>
                                    ({cuposUsados}/{cuposTotal} cupos)
                                </span>
                            </span>
                        </Tooltip>
                    </MetricaItem>
                    {proximoVencimientoLic && (
                        <>
                            <Separador />
                            <MetricaItem label='Prox. venc.'>
                                <Badge
                                    variant='outline'
                                    color={
                                        proximoVencimientoLic.dias_restantes_licencia <= 30
                                            ? 'amber'
                                            : 'zinc'
                                    }>
                                    {proximoVencimientoLic.nombre_licencia} (
                                    {proximoVencimientoLic.dias_restantes_licencia}d)
                                </Badge>
                            </MetricaItem>
                        </>
                    )}
                </>
            )}

            {contrato.tipo !== 'licencia' && contrato.contrato_servicios.length > 0 && (
                <MetricaItem label='Servicios'>
                    <span className='text-sm font-medium'>
                        {contrato.contrato_servicios.length}
                    </span>
                </MetricaItem>
            )}
        </div>
    );
};

const MetricaItem = ({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) => (
    <div className='flex items-center gap-1.5'>
        <span className='text-xs text-zinc-500 dark:text-zinc-400'>{label}:</span>
        {children}
    </div>
);

const Separador = () => <div className='h-4 w-px bg-zinc-300 dark:bg-zinc-600' />;

export default ResumenContrato;
